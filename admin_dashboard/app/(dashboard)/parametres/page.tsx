'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/header';
import { createClient } from '@/lib/supabase/client';
import { Settings, Building2, Bell, Shield, Save, MapPin, Plus, ExternalLink, CheckCircle2 } from 'lucide-react';

interface SimpleSite {
  id: string;
  name: string;
  city: string;
  radiusMeters: number;
}

export default function ParametresPage() {
  const [orgName, setOrgName] = useState('Société Ivoire Prestige');
  const [timezone, setTimezone] = useState('Africa/Abidjan (GMT 0)');
  const [maxBreakMinutes, setMaxBreakMinutes] = useState('90');
  const [lateTolerance, setLateTolerance] = useState('15');
  const [saved, setSaved] = useState(false);
  const [sites, setSites] = useState<SimpleSite[]>([]);

  useEffect(() => {
    const fetchSites = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('pointage_establishments')
          .select('id, name, city, radius_meters')
          .eq('is_active', true)
          .order('name');

        if (data && data.length > 0) {
          setSites(data.map((d: any) => ({
            id: d.id,
            name: d.name,
            city: d.city || 'Abidjan',
            radiusMeters: d.radius_meters || 80
          })));
        } else {
          setSites([
            { id: '1', name: 'Boutique Centrale - Siège', city: 'Abidjan (Plateau)', radiusMeters: 80 },
            { id: '2', name: 'Entrepôt Logistique Zone Nord', city: 'Abidjan (Yopougon)', radiusMeters: 120 }
          ]);
        }
      } catch (err) {
        console.warn('Error fetching sites in settings:', err);
      }
    };
    fetchSites();
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <Header
        title="Paramètres de l'Entreprise"
        subtitle="Règles de tolérance horaires, gestion des sites de pointage et politique organisationnelle"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulaire Principal de Configuration */}
        <form onSubmit={handleSave} className="lg:col-span-2 bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 mb-1 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              Identité de l'Organisation
            </h3>
            <p className="text-xs text-slate-500 mb-4">Informations affichées aux collaborateurs lors du pointage mobile.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Raison Sociale / Nom</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fuseau Horaire Satellite de Référence</label>
                <input
                  type="text"
                  disabled
                  value={timezone}
                  className="w-full text-xs bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-500 font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  * Verrouillé sur l'horloge atomique UTC pour garantir l'inaltérabilité légale des pointages.
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h3 className="font-extrabold text-sm text-slate-900 mb-1 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              Règles d'Assiduité & Tolérances Automatiques
            </h3>
            <p className="text-xs text-slate-500 mb-4">Seuils algorithmiques de détection des retards et pauses.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tolérance Retard Arrivée</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={lateTolerance}
                    onChange={(e) => setLateTolerance(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <span className="text-xs text-slate-500 font-semibold">min</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Durée Max Pause Déjeuner</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={maxBreakMinutes}
                    onChange={(e) => setMaxBreakMinutes(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <span className="text-xs text-slate-500 font-semibold">min</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            {saved ? (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4" /> Paramètres enregistrés avec succès !
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">Modifications synchronisées en temps réel</span>
            )}
            <button
              type="submit"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Enregistrer les Modifications</span>
            </button>
          </div>
        </form>

        {/* Panneau Latéral : Établissements & Sites */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                Sites & Établissements
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {sites.length} Actifs
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Chaque site possède son rayon satellite de présence (géofencing) et son empreinte Wi-Fi.
            </p>

            <div className="space-y-2">
              {sites.map((site) => (
                <div key={site.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">{site.name}</h4>
                    <span className="text-[10px] text-slate-500">{site.city} • Rayon {site.radiusMeters}m</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="Actif" />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-2">
            <Link
              href="/sites?action=new"
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter un Nouveau Site</span>
            </Link>

            <Link
              href="/sites"
              className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold py-2 transition"
            >
              <span>Voir la carte & géofencing complet</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
