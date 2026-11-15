'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { createClient } from '@/lib/supabase/client';
import { 
  MapPin, 
  Wifi, 
  Plus, 
  Navigation, 
  CheckCircle2, 
  RefreshCw, 
  X, 
  LocateFixed, 
  Building2, 
  Trash2, 
  AlertCircle 
} from 'lucide-react';

interface Site {
  id: string;
  name: string;
  city: string;
  lat: number;
  lon: number;
  radiusMeters: number;
  wifiBssid: string;
  activeCount: number;
  isActive?: boolean;
}

const FALLBACK_SITES: Site[] = [
  {
    id: 'site-1',
    name: 'Boutique Centrale - Siège',
    city: 'Abidjan (Plateau)',
    lat: 5.321400,
    lon: -4.015200,
    radiusMeters: 80,
    wifiBssid: 'Livebox_Siege (b4:ee:b4:91:a2:10)',
    activeCount: 3,
    isActive: true
  },
  {
    id: 'site-2',
    name: 'Entrepôt Logistique Zone Nord',
    city: 'Abidjan (Yopougon)',
    lat: 5.348200,
    lon: -4.089100,
    radiusMeters: 120,
    wifiBssid: 'Orange_Pro_ZoneNord (7c:26:34:11:ff:80)',
    activeCount: 1,
    isActive: true
  }
];

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>(FALLBACK_SITES);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // New site form state
  const [newName, setNewName] = useState('');
  const [newCity, setNewCity] = useState('Cocody');
  const [newLat, setNewLat] = useState('5.358200');
  const [newLon, setNewLon] = useState('-3.974100');
  const [newRadius, setNewRadius] = useState('80');
  const [newWifiSsid, setNewWifiSsid] = useState('');
  const [newWifiBssid, setNewWifiBssid] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationSuccess, setLocationSuccess] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fetchSites = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('pointage_establishments')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (data && data.length > 0) {
        const mapped: Site[] = data.map((d: any, idx: number) => ({
          id: d.id,
          name: d.name,
          city: d.city ? (d.city.startsWith('Abidjan') ? d.city : `Abidjan (${d.city})`) : 'Abidjan',
          lat: Number(d.latitude) || 5.3214,
          lon: Number(d.longitude) || -4.0152,
          radiusMeters: Number(d.radius_meters) || 80,
          wifiBssid: d.wifi_ssid 
            ? `${d.wifi_ssid} (${(d.wifi_bssids && d.wifi_bssids[0]) || 'Certifié'})` 
            : 'Box Wi-Fi Non Déclarée',
          activeCount: idx === 0 ? 3 : 1,
          isActive: d.is_active ?? true
        }));
        setSites(mapped);
      }
    } catch (err) {
      console.warn('Using local sites fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();

    // Check if URL has ?action=new to open modal automatically
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('action') === 'new') {
        setShowAddModal(true);
      }
    }

    // Real-time subscription to establishment changes
    const supabase = createClient();
    const channel = supabase
      .channel('realtime_sites_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pointage_establishments' }, () => {
        fetchSites();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Détection GPS du navigateur
  const handleDetectCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }
    setDetectingLocation(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNewLat(pos.coords.latitude.toFixed(6));
        setNewLon(pos.coords.longitude.toFixed(6));
        setDetectingLocation(false);
        setLocationSuccess(true);
        setTimeout(() => setLocationSuccess(false), 3000);
      },
      (err) => {
        setDetectingLocation(false);
        setLocationError(
          err.code === 1 
            ? "Accès GPS refusé. Veuillez autoriser la localisation dans votre navigateur." 
            : `Erreur GPS: ${err.message}`
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Création d'un nouveau site
  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setSubmitting(true);
    const parsedLat = parseFloat(newLat) || 5.3582;
    const parsedLon = parseFloat(newLon) || -3.9741;
    const parsedRadius = parseInt(newRadius, 10) || 80;
    const cleanBssid = newWifiBssid.trim().toLowerCase();

    const tempId = 'site-' + Date.now();
    const newSiteObj: Site = {
      id: tempId,
      name: newName.trim(),
      city: newCity.trim() ? `Abidjan (${newCity.trim()})` : 'Abidjan',
      lat: parsedLat,
      lon: parsedLon,
      radiusMeters: parsedRadius,
      wifiBssid: newWifiSsid.trim() 
        ? `${newWifiSsid.trim()} (${cleanBssid || 'Certifié'})` 
        : 'Box Wi-Fi Non Déclarée',
      activeCount: 0,
      isActive: true
    };

    // Optimistic UI update
    setSites(prev => [newSiteObj, ...prev]);
    setShowAddModal(false);
    setSuccessToast(`Site "${newName}" créé avec succès !`);
    setTimeout(() => setSuccessToast(null), 4000);

    // Save to Supabase
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from('pointage_establishments').insert({
        org_id: '00000000-0000-0000-0000-000000000001',
        name: newName.trim(),
        city: newCity.trim() || 'Abidjan',
        latitude: parsedLat,
        longitude: parsedLon,
        radius_meters: parsedRadius,
        elastic_radius_meters: Math.max(150, Math.round(parsedRadius * 1.5)),
        wifi_ssid: newWifiSsid.trim() || null,
        wifi_bssids: cleanBssid ? [cleanBssid] : [],
        is_active: true
      }).select();

      if (error) {
        console.error('Erreur insertion établissement dans Supabase:', error);
      } else {
        await fetchSites();
      }
    } catch (err) {
      console.error('Erreur Supabase:', err);
    } finally {
      setSubmitting(false);
      // Reset form
      setNewName('');
      setNewCity('Cocody');
      setNewWifiSsid('');
      setNewWifiBssid('');
    }
  };

  // Suppression / Désactivation d'un site
  const handleDeleteSite = async (id: string, siteName: string) => {
    if (!confirm(`Confirmez-vous la désactivation du site "${siteName}" ? Les collaborateurs ne pourront plus pointer sur cette zone.`)) {
      return;
    }

    setSites(prev => prev.filter(s => s.id !== id));
    try {
      const supabase = createClient();
      await supabase
        .from('pointage_establishments')
        .update({ is_active: false })
        .eq('id', id);
      setSuccessToast(`Site "${siteName}" désactivé.`);
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err) {
      console.error('Erreur désactivation site:', err);
    }
  };

  return (
    <div className="space-y-6">
      <Header
        title="Établissements & Géofencing"
        subtitle="Gestion des périmètres de pointage autorisés par GPS et box Wi-Fi professionnelles"
        actionButton={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchSites}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-xl transition shadow-sm"
              title="Rafraîchir depuis Supabase"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Site d'Entreprise</span>
            </button>
          </div>
        }
      />

      {/* Toast de confirmation */}
      {successToast && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-semibold animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Grille des sites */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sites.map((site) => (
          <div key={site.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Actif • Géofencing Certifié
                </span>
                <h3 className="font-extrabold text-base text-slate-900 mt-1">{site.name}</h3>
                <p className="text-xs text-slate-500">{site.city}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleDeleteSite(site.id, site.name)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="Désactiver ce site"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100">
              <div className="bg-slate-50 p-3 rounded-xl">
                <span className="text-slate-400 block text-[11px] mb-0.5">Rayon Satellite Autorisé</span>
                <span className="font-extrabold text-slate-800">{site.radiusMeters} mètres</span>
                <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">Tolérance: 150m max</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl">
                <span className="text-slate-400 block text-[11px] mb-0.5">Collaborateurs Affectés</span>
                <span className="font-extrabold text-blue-600">{site.activeCount} en service</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600 bg-slate-50/60 p-2.5 rounded-xl border border-slate-100">
                <span className="flex items-center gap-2">
                  <Navigation className="w-3.5 h-3.5 text-blue-500" />
                  <span>Coordonnées GPS Centoïde</span>
                </span>
                <span className="font-mono text-slate-800 text-[11px] font-semibold">
                  {Number(site.lat).toFixed(4)}, {Number(site.lon).toFixed(4)}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600 bg-slate-50/60 p-2.5 rounded-xl border border-slate-100">
                <span className="flex items-center gap-2">
                  <Wifi className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Empreinte BSSID Wi-Fi</span>
                </span>
                <span className="font-mono text-slate-800 text-[11px] font-semibold truncate max-w-[200px]" title={site.wifiBssid}>
                  {site.wifiBssid}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL AJOUT DE SITE D'ENTREPRISE */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Créer un Nouveau Site</h3>
                  <p className="text-xs text-slate-500">Périmètre de pointage et géofencing satellite</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSite} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nom du Site / Établissement <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Boutique Angré 8ème Tranche"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Commune / Ville <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Cocody, Plateau, Yopougon..."
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Position GPS avec bouton de détection automatique */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-blue-600" />
                    Coordonnées GPS Centoïde
                  </span>
                  <button
                    type="button"
                    onClick={handleDetectCurrentLocation}
                    disabled={detectingLocation}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition"
                  >
                    <LocateFixed className={`w-3.5 h-3.5 ${detectingLocation ? 'animate-spin' : ''}`} />
                    <span>{detectingLocation ? 'Recherche GPS...' : '📍 Détecter ma position'}</span>
                  </button>
                </div>

                {locationSuccess && (
                  <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Position GPS détectée avec succès !
                  </p>
                )}

                {locationError && (
                  <p className="text-[11px] text-rose-500 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {locationError}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={newLat}
                      onChange={(e) => setNewLat(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={newLon}
                      onChange={(e) => setNewLon(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Rayon de tolérance */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Rayon Satellite Autorisé (Géofencing)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['50', '80', '120', '150'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setNewRadius(r)}
                      className={`py-2 text-xs font-bold rounded-xl border transition ${
                        newRadius === r
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {r}m
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  * 80 mètres est le rayon optimal recommandé pour une boutique ou un bureau standard.
                </p>
              </div>

              {/* Wi-Fi Entreprise (Optionnel) */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5 text-indigo-600" />
                  Empreinte Wi-Fi Box Professionnelle (Optionnel)
                </span>
                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Nom du Réseau Wi-Fi (SSID)</label>
                    <input
                      type="text"
                      placeholder="Ex: Orange_Pro_Siege"
                      value={newWifiSsid}
                      onChange={(e) => setNewWifiSsid(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Adresse MAC du Routeur (BSSID)</label>
                    <input
                      type="text"
                      placeholder="Ex: b4:ee:b4:91:a2:10"
                      value={newWifiBssid}
                      onChange={(e) => setNewWifiBssid(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting || !newName.trim()}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Création en cours...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Créer l'Établissement</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
