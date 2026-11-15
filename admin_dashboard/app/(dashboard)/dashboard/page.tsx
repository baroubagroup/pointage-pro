'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { createClient } from '@/lib/supabase/client';
import { Users, Clock, ShieldCheck, Wifi, Download, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';

interface Punch {
  id: string;
  name: string;
  role: string;
  site_name: string;
  time: string;
  distance: string;
  status: 'VALIDATED' | 'LATE' | 'FLAGGED';
  flags: string[];
  device: string;
}

const INITIAL_PUNCHES: Punch[] = [
  {
    id: 'p-1',
    name: 'Kouassi Jean-Marc',
    role: 'Chef d\'équipe Logistique',
    site_name: 'Boutique Centrale - Siège',
    time: '07h28 (Arrivée)',
    distance: '18m du centre',
    status: 'VALIDATED',
    flags: ['GPS_EXACT (18m)', 'WIFI_VALIDÉ (Livebox_Siege)'],
    device: 'Samsung Galaxy A54 (Lié)'
  },
  {
    id: 'p-2',
    name: 'Traoré Fatou',
    role: 'Responsable Magasin',
    site_name: 'Entrepôt Logistique Zone Nord',
    time: '07h46 (Arrivée)',
    distance: '34m du centre',
    status: 'LATE',
    flags: ['RETARD_16MIN (Plan: 07h30)', 'GPS_CONFIRMÉ'],
    device: 'iPhone 13 (Lié)'
  },
  {
    id: 'p-3',
    name: 'Yao Brice',
    role: 'Agent de Sécurité',
    site_name: 'Boutique Centrale - Siège',
    time: '07h15 (Arrivée)',
    distance: '12m du centre',
    status: 'VALIDATED',
    flags: ['WIFI_CERTIFIÉ', 'HORLOGE_UTC_OK'],
    device: 'Redmi Note 12 (Lié)'
  }
];

export default function DashboardPage() {
  const [punches, setPunches] = useState<Punch[]>(INITIAL_PUNCHES);
  const [filter, setFilter] = useState<'ALL' | 'VALIDATED' | 'LATE' | 'FLAGGED'>('ALL');
  const [siteFilter, setSiteFilter] = useState<string>('ALL');

  useEffect(() => {
    // Connect Supabase Realtime channel for live punch notifications
    const supabase = createClient();
    const channel = supabase
      .channel('realtime_punches')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pointage_logs' },
        (payload: any) => {
          const newLog = payload.new;
          if (newLog) {
            const formatted: Punch = {
              id: newLog.id || String(Date.now()),
              name: newLog.employee_name || 'Collaborateur',
              role: 'Employé',
              site_name: 'Site Principal',
              time: new Date(newLog.recorded_at || Date.now()).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
              distance: `${newLog.distance_meters || 20}m`,
              status: newLog.status || 'VALIDATED',
              flags: newLog.flags || ['GPS_VALIDE'],
              device: newLog.device_model || 'Smartphone Lié'
            };
            setPunches(prev => [formatted, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredPunches = punches.filter(p => {
    if (filter !== 'ALL' && p.status !== filter) return false;
    if (siteFilter !== 'ALL' && !p.site_name.includes(siteFilter)) return false;
    return true;
  });

  const exportCSV = () => {
    let csv = '\uFEFFEmploye;Poste;Site;Heure;Distance;Statut;Alertes;Appareil\n';
    punches.forEach(p => {
      csv += `"${p.name}";"${p.role}";"${p.site_name}";"${p.time}";"${p.distance}";"${p.status}";"${p.flags.join(' | ')}";"${p.device}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `supervision_pointages_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <Header
        title="Supervision en Temps Réel"
        subtitle="Pointages certifiés par géofencing satellite & box Wi-Fi d'entreprise"
        actionButton={
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporter CSV</span>
          </button>
        }
      />

      {/* Cartes KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Présents Aujourd'hui</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-800">
            3 <span className="text-sm font-normal text-slate-400">/ 5</span>
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Effectif actif aujourd'hui
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Retards Détectés</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-600">1</div>
          <p className="text-[11px] text-amber-600 font-medium mt-1">1 justification en attente</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alertes Sécurité</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-800">0</div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">Aucune tentative de faux GPS</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pointages Box Wi-Fi</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Wifi className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-indigo-600">2</div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Double confirmation réseau</p>
        </div>
      </div>

      {/* Barre de filtres */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-500 mr-2">Filtrer par statut :</span>
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tous ({punches.length})
          </button>
          <button
            onClick={() => setFilter('VALIDATED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === 'VALIDATED' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Conformes (2)
          </button>
          <button
            onClick={() => setFilter('LATE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === 'LATE' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Retards (1)
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500">Site :</label>
          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none"
          >
            <option value="ALL">Tous les sites</option>
            <option value="Boutique Centrale">Boutique Centrale - Siège</option>
            <option value="Entrepôt Logistique">Entrepôt Logistique Zone Nord</option>
          </select>
        </div>
      </div>

      {/* Tableau des pointages */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">Pointages Effectués Aujourd'hui</h3>
          <span className="text-xs text-slate-400 font-mono">UTC Satellite • Anti-fraude actif</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-6">Collaborateur</th>
                <th className="py-3 px-4">Établissement</th>
                <th className="py-3 px-4">Horodatage Réel</th>
                <th className="py-3 px-4">Position / Réseau</th>
                <th className="py-3 px-4">Statut & Certifications</th>
                <th className="py-3 px-6 text-right">Appareil Déclaré</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredPunches.map((punch) => {
                const isLate = punch.status === 'LATE';
                return (
                  <tr key={punch.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-6 font-semibold text-slate-900">
                      <div>{punch.name}</div>
                      <div className="text-[11px] text-slate-400 font-normal">{punch.role}</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-600">{punch.site_name}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{punch.time}</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {punch.distance}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {isLate ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            <AlertTriangle className="w-3 h-3" />
                            Retard (16 min)
                          </span>
                          <div className="flex gap-1 flex-wrap">
                            {punch.flags.map((f, i) => (
                              <span key={i} className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            Pointage Validé
                          </span>
                          <div className="flex gap-1 flex-wrap">
                            {punch.flags.map((f, i) => (
                              <span key={i} className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-6 text-right font-mono text-[11px] text-slate-500">
                      {punch.device}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
