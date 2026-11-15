'use client';

import { useState } from 'react';
import { Header } from '@/components/header';
import { Settings, Building2, Bell, Shield, Save } from 'lucide-react';

export default function ParametresPage() {
  const [orgName, setOrgName] = useState('Société Ivoire Prestige');
  const [timezone, setTimezone] = useState('Africa/Abidjan (GMT 0)');
  const [maxBreakMinutes, setMaxBreakMinutes] = useState('90');
  const [lateTolerance, setLateTolerance] = useState('15');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <Header
        title="Paramètres de l'Entreprise"
        subtitle="Règles de tolérance horaires, fuseau horaire et politique organisationnelle"
      />

      <form onSubmit={handleSave} className="max-w-2xl bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
        <div>
          <h3 className="font-extrabold text-sm text-slate-900 mb-1 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            Identité de l'Établissement
          </h3>
          <p className="text-xs text-slate-500 mb-4">Informations affichées aux collaborateurs lors du pointage.</p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Raison Sociale / Nom</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Fuseau Horaire de Référence</label>
              <input
                type="text"
                disabled
                value={timezone}
                className="w-full text-xs bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-500 font-mono"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <h3 className="font-extrabold text-sm text-slate-900 mb-1 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            Règles d'Assiduité & Tolérances
          </h3>
          <p className="text-xs text-slate-500 mb-4">Seuils automatiques de détection des retards et pauses.</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tolérance Retard Arrivée</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={lateTolerance}
                  onChange={(e) => setLateTolerance(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-500 font-semibold">min</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          {saved ? (
            <span className="text-xs font-bold text-emerald-600">✓ Paramètres enregistrés avec succès !</span>
          ) : (
            <span></span>
          )}
          <button
            type="submit"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Enregistrer les Modifications</span>
          </button>
        </div>
      </form>
    </div>
  );
}
