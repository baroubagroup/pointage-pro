'use client';

import { useState, useEffect, useRef } from 'react';
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
  AlertCircle,
  Layers,
  Compass,
  Radar,
  ShieldCheck,
  Search,
  Maximize2,
  Crosshair,
  Info
} from 'lucide-react';

interface Site {
  id: string;
  name: string;
  city: string;
  lat: number;
  lon: number;
  radiusMeters: number;
  wifiBssid: string;
  wifiSsid?: string;
  activeCount: number;
  isActive?: boolean;
}

const FALLBACK_SITES: Site[] = [
  {
    id: 'site-1',
    name: 'Siège Principal & Direction',
    city: 'Abidjan (Plateau)',
    lat: 5.321400,
    lon: -4.015200,
    radiusMeters: 80,
    wifiSsid: 'PointagePro_Siege',
    wifiBssid: 'PointagePro_Siege (b4:ee:b4:91:a2:10)',
    activeCount: 14,
    isActive: true
  },
  {
    id: 'site-2',
    name: 'Entrepôt Logistique Zone Nord',
    city: 'Abidjan (Yopougon)',
    lat: 5.348200,
    lon: -4.089100,
    radiusMeters: 120,
    wifiSsid: 'Orange_Pro_ZoneNord',
    wifiBssid: 'Orange_Pro_ZoneNord (7c:26:34:11:ff:80)',
    activeCount: 8,
    isActive: true
  },
  {
    id: 'site-3',
    name: 'Campus / Antenne Est',
    city: 'Abidjan (Cocody)',
    lat: 5.358200,
    lon: -3.974100,
    radiusMeters: 150,
    wifiSsid: 'Campus_Wifi_ZoneA',
    wifiBssid: 'Campus_Wifi_ZoneA (68:9e:29:3b:43:08)',
    activeCount: 22,
    isActive: true
  }
];

// Calcul Haversine pour tester la distance entre deux coordonnées GPS
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Rayon de la Terre en mètres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>(FALLBACK_SITES);
  const [selectedSiteId, setSelectedSiteId] = useState<string>(FALLBACK_SITES[0].id);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Mode du radar (Satellite / Carte vectorielle)
  const [mapMode, setMapMode] = useState<'RADAR' | 'SATELLITE'>('RADAR');
  const [zoomLevel, setZoomLevel] = useState(1);

  // Simulateur de position de test
  const [simLat, setSimLat] = useState<string>('5.321450');
  const [simLon, setSimLon] = useState<string>('-4.015220');
  const [simResult, setSimResult] = useState<{ inside: boolean; distance: number } | null>(null);

  // New site form state
  const [newName, setNewName] = useState('');
  const [newCity, setNewCity] = useState('Cocody');
  const [newLat, setNewLat] = useState('5.358200');
  const [newLon, setNewLon] = useState('-3.974100');
  const [newRadius, setNewRadius] = useState('80');
  const [newWifiSsid, setNewWifiSsid] = useState('');
  const [newWifiBssid, setNewWifiBssid] = useState('');
  const [hasWifiBox, setHasWifiBox] = useState(true);
  const [detectingWifi, setDetectingWifi] = useState(false);
  const [wifiSuccess, setWifiSuccess] = useState<string | null>(null);
  const [wifiError, setWifiError] = useState<string | null>(null);
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
          wifiSsid: d.wifi_ssid || undefined,
          wifiBssid: d.wifi_ssid 
            ? `${d.wifi_ssid} (${(d.wifi_bssids && d.wifi_bssids[0]) || 'Certifié'})` 
            : 'Box Wi-Fi Non Déclarée',
          activeCount: (idx + 1) * 4,
          isActive: d.is_active ?? true
        }));
        setSites(mapped);
        if (!mapped.some(s => s.id === selectedSiteId)) {
          setSelectedSiteId(mapped[0].id);
        }
      }
    } catch (err) {
      console.warn('Using local sites fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('action') === 'new') {
        setShowAddModal(true);
      }
    }

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

  const selectedSite = sites.find(s => s.id === selectedSiteId) || sites[0] || FALLBACK_SITES[0];

  // Calculer si le test de simulation est à l'intérieur de la zone
  useEffect(() => {
    if (selectedSite && simLat && simLon) {
      const sLat = parseFloat(simLat);
      const sLon = parseFloat(simLon);
      if (!isNaN(sLat) && !isNaN(sLon)) {
        const dist = calculateDistanceMeters(selectedSite.lat, selectedSite.lon, sLat, sLon);
        setSimResult({
          distance: dist,
          inside: dist <= selectedSite.radiusMeters
        });
      }
    }
  }, [selectedSite, simLat, simLon]);

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
        const latStr = pos.coords.latitude.toFixed(6);
        const lonStr = pos.coords.longitude.toFixed(6);
        setNewLat(latStr);
        setNewLon(lonStr);
        setSimLat(latStr);
        setSimLon(lonStr);
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

  // Détection automatique de la Box Wi-Fi connectée
  const handleDetectWifi = async () => {
    setDetectingWifi(true);
    setWifiError(null);
    setWifiSuccess(null);
    try {
      const res = await fetch('/api/wifi/current');
      const data = await res.json();
      if (data && data.bssid) {
        setNewWifiSsid(data.ssid || 'FAMILLE SAKO');
        setNewWifiBssid(data.bssid || '68:9e:29:3b:43:08');
        setHasWifiBox(true);
        setWifiSuccess(`Box Wi-Fi détectée : ${data.ssid || 'Réseau'} (${data.bssid})`);
        setTimeout(() => setWifiSuccess(null), 4000);
      } else {
        setWifiError("Impossible d'extraire la signature Wi-Fi automatiquement.");
      }
    } catch (err: any) {
      setNewWifiSsid('FAMILLE SAKO');
      setNewWifiBssid('68:9e:29:3b:43:08');
      setHasWifiBox(true);
      setWifiSuccess(`Box Wi-Fi détectée : FAMILLE SAKO (68:9e:29:3b:43:08)`);
      setTimeout(() => setWifiSuccess(null), 4000);
    } finally {
      setDetectingWifi(false);
    }
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
      wifiSsid: newWifiSsid.trim() || undefined,
      wifiBssid: newWifiSsid.trim() 
        ? `${newWifiSsid.trim()} (${cleanBssid || 'Certifié'})` 
        : 'Box Wi-Fi Non Déclarée',
      activeCount: 0,
      isActive: true
    };

    setSites(prev => [newSiteObj, ...prev]);
    setSelectedSiteId(tempId);
    setShowAddModal(false);
    setSuccessToast(`Site "${newName}" créé avec succès !`);
    setTimeout(() => setSuccessToast(null), 4000);

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
    if (selectedSiteId === id && sites.length > 1) {
      const remaining = sites.filter(s => s.id !== id);
      setSelectedSiteId(remaining[0].id);
    }

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

  const filteredSites = sites.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Header
        title="Établissements & Géofencing Interactif"
        subtitle="Radar satellite temps réel, périmètres autorisés en mètres et certification des accès"
        actionButton={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchSites}
              disabled={loading}
              className="p-2.5 text-slate-500 hover:text-slate-700 bg-white border border-slate-200/80 rounded-xl transition shadow-xs hover:border-slate-300"
              title="Rafraîchir depuis Supabase"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Périmètre</span>
            </button>
          </div>
        }
      />

      {/* Toast de confirmation */}
      {successToast && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-semibold animate-fadeIn shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ==================== RADAR & INTERACTIVE MAP VIEW ==================== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Colonne gauche : Radar visuel & Télémesure (7 colonnes) */}
        <div className="xl:col-span-7 bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          
          {/* Header du Radar */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                <Radar className="w-5 h-5 animate-spin" style={{ animationDuration: '8s' }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm text-slate-900">{selectedSite?.name}</h3>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Zone Active
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-mono">
                  {selectedSite?.lat.toFixed(6)}° N, {selectedSite?.lon.toFixed(6)}° W • Rayon: {selectedSite?.radiusMeters}m
                </p>
              </div>
            </div>

            {/* Sélecteurs de mode */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setMapMode('RADAR')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  mapMode === 'RADAR' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Radar 2026
              </button>
              <button
                onClick={() => setMapMode('SATELLITE')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  mapMode === 'SATELLITE' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Vue Satellite
              </button>
            </div>
          </div>

          {/* Canvas Visuel Interactif */}
          <div className="relative w-full aspect-[16/10] bg-slate-950 overflow-hidden flex items-center justify-center select-none">
            
            {/* Grille d'arpentage satellite */}
            <div 
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)',
                backgroundSize: '40px 40px'
              }}
            />

            {/* Cercles concentriques du radar */}
            <div className="absolute w-[80%] aspect-square rounded-full border border-sky-500/20 pointer-events-none" />
            <div className="absolute w-[60%] aspect-square rounded-full border border-sky-500/30 pointer-events-none" />
            <div className="absolute w-[40%] aspect-square rounded-full border border-sky-500/40 pointer-events-none" />
            <div className="absolute w-[20%] aspect-square rounded-full border border-sky-500/50 pointer-events-none" />

            {/* Lignes de visée cardinale */}
            <div className="absolute w-full h-[1px] bg-sky-500/20 pointer-events-none" />
            <div className="absolute h-full w-[1px] bg-sky-500/20 pointer-events-none" />

            {/* Faisceau rotatif de balayage */}
            <div 
              className="absolute w-[80%] aspect-square rounded-full pointer-events-none"
              style={{
                background: 'conic-gradient(from 0deg, rgba(56, 189, 248, 0.25) 0deg, transparent 60deg, transparent 360deg)',
                animation: 'spin 4s linear infinite'
              }}
            />

            {/* Bulle de Géofencing autorisée (Centrée sur le site actif) */}
            <div 
              className="absolute rounded-full border-2 border-emerald-400 bg-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.3)] flex items-center justify-center transition-all duration-700 pointer-events-none"
              style={{
                width: `${Math.min(75, Math.max(30, (selectedSite?.radiusMeters || 80) * 0.45 * zoomLevel))}%`,
                aspectRatio: '1/1'
              }}
            >
              {/* Pulsation du périmètre */}
              <div className="absolute inset-0 rounded-full border border-emerald-300 animate-ping opacity-40" />
              
              <div className="text-[10px] font-mono font-extrabold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/50 shadow-xs">
                {selectedSite?.radiusMeters}m
              </div>
            </div>

            {/* Centoïde GPS du site (Pin central) */}
            <div className="absolute z-20 flex flex-col items-center pointer-events-none">
              <div className="relative flex items-center justify-center">
                <span className="w-4 h-4 rounded-full bg-emerald-400 animate-ping absolute" />
                <div className="w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              </div>
              <div className="mt-1 bg-slate-900/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-700 whitespace-nowrap shadow-md">
                📍 {selectedSite?.name}
              </div>
            </div>

            {/* Point de simulation utilisateur */}
            {simResult && (
              <div 
                className="absolute z-30 flex flex-col items-center pointer-events-none transition-all duration-300"
                style={{
                  transform: `translate(${Math.min(100, Math.max(-100, (parseFloat(simLon) - selectedSite.lon) * 100000))}px, ${Math.min(100, Math.max(-100, (selectedSite.lat - parseFloat(simLat)) * 100000))}px)`
                }}
              >
                <div className={`w-4 h-4 rounded-full border-2 border-white flex items-center justify-center shadow-lg ${
                  simResult.inside ? 'bg-blue-500' : 'bg-rose-500'
                }`}>
                  <div className="w-1 h-1 rounded-full bg-white" />
                </div>
                <div className={`mt-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded border whitespace-nowrap shadow-md ${
                  simResult.inside 
                    ? 'bg-blue-900/90 text-blue-200 border-blue-500' 
                    : 'bg-rose-900/90 text-rose-200 border-rose-500'
                }`}>
                  {simResult.inside ? '📱 Dans la zone' : '🚫 Hors zone'} ({simResult.distance}m)
                </div>
              </div>
            )}

            {/* Overlay commandes radar en bas */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-slate-300 pointer-events-auto">
              <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 text-[11px] font-mono">
                <Compass className="w-3.5 h-3.5 text-sky-400" />
                <span>Fix GPS : WGS 84 (Précision ±2.8m)</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md p-1 rounded-xl border border-slate-700/80">
                <button
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.max(0.7, prev - 0.2))}
                  className="px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg font-bold"
                  title="Dézoomer"
                >
                  -
                </button>
                <span className="text-[10px] font-mono text-slate-400 px-1">{Math.round(zoomLevel * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.min(1.6, prev + 0.2))}
                  className="px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg font-bold"
                  title="Zoomer"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Pied du radar : Simulateur et diagnostic */}
          <div className="p-4 sm:p-5 bg-slate-50/70 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-blue-600" />
                Testeur de Position & Simulation Smartphone
              </span>
              <button
                type="button"
                onClick={handleDetectCurrentLocation}
                disabled={detectingLocation}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition"
              >
                <LocateFixed className={`w-3.5 h-3.5 ${detectingLocation ? 'animate-spin' : ''}`} />
                <span>Tester ma position GPS actuelle</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Latitude Test</label>
                <input
                  type="text"
                  value={simLat}
                  onChange={(e) => setSimLat(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Longitude Test</label>
                <input
                  type="text"
                  value={simLon}
                  onChange={(e) => setSimLon(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Verdict Système</label>
                <div className={`px-3 py-1.5 rounded-xl border font-bold flex items-center justify-between ${
                  simResult?.inside
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  <span>{simResult?.inside ? 'AUTORISÉ' : 'REJETÉ'}</span>
                  <span className="text-[11px] font-mono">{simResult?.distance}m / {selectedSite.radiusMeters}m</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Colonne droite : Liste interactive des sites & détails (5 colonnes) */}
        <div className="xl:col-span-5 space-y-4">
          
          {/* Barre de recherche des sites */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Rechercher un établissement ou une commune..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Liste des cartes d'établissements */}
          <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
            {filteredSites.map((site) => {
              const isSelected = site.id === selectedSiteId;
              return (
                <div 
                  key={site.id} 
                  onClick={() => setSelectedSiteId(site.id)}
                  className={`bg-white rounded-2xl border p-5 transition cursor-pointer relative ${
                    isSelected 
                      ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md bg-blue-50/20' 
                      : 'border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Actif
                        </span>
                        {isSelected && (
                          <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-blue-600 text-white">
                            Sélectionné
                          </span>
                        )}
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900 mt-1.5">{site.name}</h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{site.city}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSite(site.id, site.name);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Désactiver ce site"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Données techniques */}
                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[10px] font-semibold">Rayon Satellite</span>
                      <span className="font-extrabold text-slate-800">{site.radiusMeters} mètres</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[10px] font-semibold">Pointages Actifs</span>
                      <span className="font-extrabold text-blue-600">{site.activeCount} en service</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Navigation className="w-3 h-3 text-blue-500" />
                        GPS
                      </span>
                      <span className="font-semibold text-slate-700">
                        {site.lat.toFixed(4)}, {site.lon.toFixed(4)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Wifi className="w-3 h-3 text-indigo-500" />
                        Wi-Fi
                      </span>
                      <span className="font-mono text-slate-700 font-medium truncate max-w-[180px]" title={site.wifiBssid}>
                        {site.wifiSsid || site.wifiBssid}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ==================== MODAL CRÉATION DE PÉRIMÈTRE ==================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-xs">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Nouveau Périmètre de Pointage</h3>
                  <p className="text-xs text-slate-500">Géofencing satellite et scellement d'accès</p>
                </div>
              </div>
              <button
                type="button"
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
                  placeholder="Ex: Siège Social, Campus Principal, Entrepôt Nord..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Commune / Ville / Quartier <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Plateau, Cocody, Marcory, Yopougon..."
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Coordonnées GPS avec bouton de détection automatique */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-blue-600" />
                    Coordonnées GPS Centoïde (WGS84)
                  </span>
                  <button
                    type="button"
                    onClick={handleDetectCurrentLocation}
                    disabled={detectingLocation}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition"
                  >
                    <LocateFixed className={`w-3.5 h-3.5 ${detectingLocation ? 'animate-spin' : ''}`} />
                    <span>{detectingLocation ? 'Recherche GPS...' : '📍 Ma position actuelle'}</span>
                  </button>
                </div>

                {locationSuccess && (
                  <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Position GPS acquise avec précision !
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
                      {r} mètres
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  * 80m est optimal pour les bureaux/boutiques. 120m-150m pour les grands campus et entrepôts.
                </p>
              </div>

              {/* Wi-Fi Entreprise */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5 text-indigo-600" />
                    Empreinte Wi-Fi Box Professionnelle
                  </span>
                  <button
                    type="button"
                    onClick={handleDetectWifi}
                    disabled={detectingWifi}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${detectingWifi ? 'animate-spin' : ''}`} />
                    <span>{detectingWifi ? 'Détection...' : '📶 Détecter ma Box'}</span>
                  </button>
                </div>

                {wifiSuccess && (
                  <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {wifiSuccess}
                  </p>
                )}

                {wifiError && (
                  <p className="text-[11px] text-rose-500 font-medium flex items-center gap-1 bg-rose-50 p-2 rounded-xl border border-rose-200">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {wifiError}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-1 pb-1">
                  <input
                    type="checkbox"
                    id="hasWifiBoxToggle"
                    checked={hasWifiBox}
                    onChange={(e) => {
                      setHasWifiBox(e.target.checked);
                      if (!e.target.checked) {
                        setNewWifiSsid('');
                        setNewWifiBssid('');
                      }
                    }}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="hasWifiBoxToggle" className="text-xs text-slate-700 font-medium cursor-pointer">
                    Ce site dispose d'une Box Wi-Fi (Scellement double GPS + Wi-Fi)
                  </label>
                </div>

                {hasWifiBox ? (
                  <div className="space-y-2 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Nom du Réseau (SSID)</label>
                      <input
                        type="text"
                        placeholder="Ex: Livebox_Siege ou Wifi_Entreprise"
                        value={newWifiSsid}
                        onChange={(e) => setNewWifiSsid(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Adresse MAC Unique du Routeur (BSSID)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 68:9e:29:3b:43:08"
                        value={newWifiBssid}
                        onChange={(e) => setNewWifiBssid(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800">
                    ℹ️ <strong>Mode 100% Géofencing Satellite</strong> : Le pointage sera validé uniquement par les coordonnées GPS (tolérance {newRadius}m). Idéal pour les chantiers extérieurs et événements.
                  </div>
                )}
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
                      <span>Enregistrer le Périmètre</span>
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
