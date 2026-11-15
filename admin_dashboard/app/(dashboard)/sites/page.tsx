'use client';

import { useState } from 'react';
import { Header } from '@/components/header';
import { MapPin, Wifi, Plus, Navigation, CheckCircle2 } from 'lucide-react';

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

const INITIAL_SITES: Site[] = [
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
  const [sites, setSites] = useState<Site[]>(INITIAL_SITES);

  return (
    <div className="space-y-6">
      <Header
        title="Établissements & Géofencing"
        subtitle="Gestion des périmètres de pointage autorisés par GPS et box Wi-Fi professionnelles"
        actionButton={
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-sm">
            <Plus className="w-3.5 h-3.5" />
            <span>Nouveau Site d'Entreprise</span>
          </button>
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

            {/* Détails Techniques Géofencing */}
            <div className="space-y-2.5 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-blue-600" />
                  Coordonnées GPS Satellite :
                </span>
                <span className="font-mono font-bold text-slate-800">
                  {site.lat.toFixed(6)}, {site.lon.toFixed(6)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Rayon de Détection Géofencing :</span>
                <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {site.radiusMeters} mètres
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5 text-indigo-600" />
                  Empreinte Wi-Fi Box :
                </span>
                <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                  {site.wifiBssid}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-400 font-medium">Collaborateurs rattachés :</span>
              <span className="font-bold text-slate-700">{site.activeCount} employés</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
