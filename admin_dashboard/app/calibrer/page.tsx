'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Navigation, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  Compass, 
  Satellite, 
  RefreshCw, 
  ShieldCheck, 
  Building2, 
  ExternalLink,
  Smartphone,
  Radio,
  Layers,
  ArrowRight
} from 'lucide-react';

interface Establishment {
  id: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
}

export default function CalibrerTerrainPage() {
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [loadingSites, setLoadingSites] = useState(true);

  // Échantillonnage Satellite GNSS en temps réel
  const [gpsActive, setGpsActive] = useState(false);
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLon, setCurrentLon] = useState<number | null>(null);
  const [currentAccuracy, setCurrentAccuracy] = useState<number | null>(null);
  const [bestAccuracy, setBestAccuracy] = useState<number | null>(null);
  const [samplesCount, setSamplesCount] = useState<number>(0);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const watchIdRef = useRef<number | null>(null);

  // Charger les sites de l'organisation active
  useEffect(() => {
    const fetchSites = async () => {
      try {
        const supabase = createClient();
        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const orgIdFromUrl = urlParams?.get('orgId');
        const siteIdFromUrl = urlParams?.get('siteId');

        let query = supabase
          .from('pointage_establishments')
          .select('id, name, city, latitude, longitude, radius_meters')
          .eq('is_active', true);

        if (orgIdFromUrl) {
          query = query.eq('org_id', orgIdFromUrl);
        }

        const { data, error } = await query.order('name');
        if (data && data.length > 0) {
          setEstablishments(data);
          if (siteIdFromUrl && data.some(s => s.id === siteIdFromUrl)) {
            setSelectedSiteId(siteIdFromUrl);
          } else {
            setSelectedSiteId(data[0].id);
          }
        }
      } catch (err) {
        console.warn('Erreur chargement sites calibrage:', err);
      } finally {
        setLoadingSites(false);
      }
    };

    fetchSites();
  }, []);

  // Démarrer l'échantillonnage GNSS haute précision
  const startGpsAcquisition = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsError("La puce GPS n'est pas accessible sur cet appareil.");
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    setGpsActive(true);
    setGpsError(null);
    setSaveSuccess(false);
    setSamplesCount(0);
    setBestAccuracy(null);

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const acc = Math.round(pos.coords.accuracy * 10) / 10;
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        setCurrentLat(lat);
        setCurrentLon(lon);
        setCurrentAccuracy(acc);
        setSamplesCount(prev => prev + 1);

        setBestAccuracy(prev => (prev === null || acc < prev ? acc : prev));
      },
      (err) => {
        setGpsActive(false);
        setGpsError(`Erreur satellite (${err.code}): ${err.message}. Assurez-vous d'activer la Localisation Haute Précision sur votre smartphone.`);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );

    watchIdRef.current = id;
  };

  useEffect(() => {
    // Démarrer automatiquement dès l'ouverture sur mobile
    startGpsAcquisition();
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Enregistrer les coordonnées physiques certifiées dans la base Supabase
  const handleSaveCoordinates = async () => {
    if (!currentLat || !currentLon || !selectedSiteId) return;

    setSaving(true);
    setGpsError(null);
    try {
      const supabase = createClient();
      const cleanLat = Number(currentLat.toFixed(6));
      const cleanLon = Number(currentLon.toFixed(6));

      const { error } = await supabase
        .from('pointage_establishments')
        .update({
          latitude: cleanLat,
          longitude: cleanLon,
        })
        .eq('id', selectedSiteId);

      if (error) throw error;

      setSaveSuccess(true);
      // Mettre à jour l'état local
      setEstablishments(prev => prev.map(s => s.id === selectedSiteId ? { ...s, latitude: cleanLat, longitude: cleanLon } : s));

      // Émettre un signal local si le gérant a aussi la page ouverte
      if (typeof window !== 'undefined') {
        localStorage.setItem('pointage_site_calibrated', JSON.stringify({
          siteId: selectedSiteId,
          lat: cleanLat,
          lon: cleanLon,
          accuracy: currentAccuracy,
          time: Date.now()
        }));
      }
    } catch (err: any) {
      setGpsError(err?.message || "Impossible d'enregistrer les coordonnées dans la base centrale.");
    } finally {
      setSaving(false);
    }
  };

  const selectedSite = establishments.find(s => s.id === selectedSiteId);
  const isHighPrecision = currentAccuracy !== null && currentAccuracy <= 5;
  const isMediumPrecision = currentAccuracy !== null && currentAccuracy > 5 && currentAccuracy <= 20;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans p-4 sm:p-6 max-w-lg mx-auto">
      
      {/* En-tête */}
      <header className="text-center py-4 space-y-2 border-b border-slate-800">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-extrabold uppercase tracking-wider">
          <Satellite className="w-3.5 h-3.5 animate-pulse" />
          <span>PointagePro • Calibrage Terrain GNSS</span>
        </div>
        <h1 className="text-xl font-black text-white tracking-tight">
          Calage Satellite Haute Précision
        </h1>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          Tenez-vous debout devant le portail ou le bureau de votre entreprise pour verrouiller les coordonnées WGS84 officielles.
        </p>
      </header>

      {/* Contenu principal */}
      <main className="flex-1 py-5 space-y-4">
        
        {/* 1. Sélection de l'Établissement à caler */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2">
          <label className="block text-xs font-bold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Établissement cible</span>
            </span>
            {selectedSite && (
              <span className="text-[10px] text-slate-500 font-mono">
                Actuel : {selectedSite.latitude.toFixed(4)}, {selectedSite.longitude.toFixed(4)}
              </span>
            )}
          </label>

          {loadingSites ? (
            <div className="text-xs text-slate-400 py-2">Chargement des sites...</div>
          ) : establishments.length > 0 ? (
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-bold focus:border-blue-500"
            >
              {establishments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.city})
                </option>
              ))}
            </select>
          ) : (
            <div className="text-xs text-amber-400 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/30">
              Aucun établissement trouvé. Connectez-vous d'abord à votre espace gérant.
            </div>
          )}
        </div>

        {/* 2. HUD du Signal Satellite Réel */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Radio className={`w-3.5 h-3.5 ${gpsActive ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
              Récepteur GNSS Smartphone
            </span>
            <button
              type="button"
              onClick={startGpsAcquisition}
              className="text-[11px] font-bold text-blue-400 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Rééchantillonner</span>
            </button>
          </div>

          {/* Indicateur circulaire de Précision */}
          <div className="flex flex-col items-center justify-center py-2">
            <div className={`w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center transition-all ${
              isHighPrecision ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_25px_rgba(16,185,129,0.3)]' :
              isMediumPrecision ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_25px_rgba(245,158,11,0.2)]' :
              'border-blue-500 bg-blue-500/10'
            }`}>
              <span className="text-2xl font-black text-white leading-none">
                {currentAccuracy !== null ? `±${currentAccuracy}m` : '--'}
              </span>
              <span className="text-[9px] font-extrabold uppercase tracking-wider mt-1 text-slate-300">
                Précision
              </span>
            </div>

            <div className="mt-3 text-center">
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full inline-block ${
                isHighPrecision ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                isMediumPrecision ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              }`}>
                {isHighPrecision ? '✓ Précision Satellite Optimale' :
                 isMediumPrecision ? 'Signal stabilisé • Ajustement en cours' :
                 'Acquisition des signaux satellites...'}
              </span>
              <p className="text-[10px] text-slate-500 mt-1">
                {samplesCount} mesures captées • Meilleure précision : {bestAccuracy !== null ? `±${bestAccuracy}m` : '--'}
              </p>
            </div>
          </div>

          {/* Coordonnées WGS84 affichées */}
          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 grid grid-cols-2 gap-3 text-center font-mono">
            <div>
              <span className="text-[10px] text-slate-500 block">Latitude WGS84</span>
              <span className="text-sm font-bold text-white">
                {currentLat !== null ? currentLat.toFixed(6) : '--'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Longitude WGS84</span>
              <span className="text-sm font-bold text-white">
                {currentLon !== null ? currentLon.toFixed(6) : '--'}
              </span>
            </div>
          </div>

          {gpsError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{gpsError}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold">
                ✓ Emplacement officiel du site synchronisé avec succès dans la base centrale !
              </span>
            </div>
          )}

          {/* Bouton d'Action Maître : Verrouillage */}
          <button
            type="button"
            onClick={handleSaveCoordinates}
            disabled={saving || !currentLat || !currentLon || !selectedSiteId}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-extrabold text-sm rounded-2xl transition shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>
              {saving ? 'Synchronisation Cloud...' : '🎯 Verrouiller cette Position Officielle'}
            </span>
          </button>
        </div>

        {/* Lien de vérification Google Maps */}
        {currentLat && currentLon && (
          <div className="text-center">
            <a
              href={`https://www.google.com/maps?q=${currentLat},${currentLon}&t=k`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:underline font-bold"
            >
              <span>Vérifier mon pointage sur Google Maps Satellite</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

      </main>

      {/* Pied de page */}
      <footer className="text-center py-3 text-[10px] text-slate-500 border-t border-slate-800/80">
        Système de Positionnement Géodésique WGS84 • PointagePro Enterprise
      </footer>

    </div>
  );
}
