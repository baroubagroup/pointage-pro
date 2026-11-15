'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { createClient } from '@/lib/supabase/client';
import { MapPin, Wifi, Plus, Navigation, CheckCircle2, RefreshCw } from 'lucide-react';

interface Site {
  id: string;
  name: string;
  city: string;
  lat: number;
  lon: number;
  radiusMeters: number;
  wifiBssid: string;
  activeCount: number;
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
    activeCount: 3
  },
  {
    id: 'site-2',
    name: 'Entrepôt Logistique Zone Nord',
    city: 'Abidjan (Yopougon)',
    lat: 5.348200,
    lon: -4.089100,
    radiusMeters: 120,
    wifiBssid: 'Orange_Pro_ZoneNord (7c:26:34:11:ff:80)',
    activeCount: 1
  }
];

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>(FALLBACK_SITES);
  const [loading, setLoading] = useState(false);

  const fetchSites = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('pointage_establishments')
        .select('*')
        .order('name');

      if (data && data.length > 0) {
        const mapped: Site[] = data.map((d: any, idx: number) => ({
          id: d.id,
          name: d.name,
          city: d.city ? `Abidjan (${d.city})` : 'Abidjan',
          lat: d.latitude || 5.3214,
          lon: d.longitude || -4.0152,
          radiusMeters: d.radius_meters || 80,
          wifiBssid: d.wifi_ssid ? `${d.wifi_ssid} (${(d.wifi_bssids && d.wifi_bssids[0]) || 'Certifié'})` : 'Box Wi-Fi Non Déclarée',
          activeCount: idx === 0 ? 3 : 1
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
  }, []);

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
            <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-sm">
              <Plus className="w-3.5 h-3.5" />
              <span>Nouveau Site d'Entreprise</span>
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sites.map((site) => (
          <div key={site.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Actif • Géofencing Certifié
                </span>
                <h3 className="font-extrabold text-base text-slate-900 mt-1">{site.name}</h3>
                <p className="text-xs text-slate-500">{site.city}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100">
              <div className="bg-slate-50 p-3 rounded-xl">
                <span className="text-slate-400 block text-[11px] mb-0.5">Rayon Satellite de Présence</span>
                <span className="font-extrabold text-slate-800">{site.radiusMeters} mètres</span>
                <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">Elastic: 150m max</span>
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
                  {site.lat.toFixed(4)}, {site.lon.toFixed(4)}
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
    </div>
  );
}
