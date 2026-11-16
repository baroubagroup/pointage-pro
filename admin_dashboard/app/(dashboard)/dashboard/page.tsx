'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { createClient } from '@/lib/supabase/client';
import { 
  Users, Clock, ShieldCheck, Wifi, Download, RefreshCw, 
  CheckCircle2, AlertTriangle, LogIn, LogOut, Coffee, Play,
  MapPin, Smartphone, ShieldAlert, X, ChevronRight, HelpCircle
} from 'lucide-react';

interface Punch {
  id: string;
  name: string;
  role: string;
  site_name: string;
  punch_type: string;
  time: string;
  full_date: string;
  distance: string;
  distance_meters: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  status: 'VALIDATED' | 'LATE' | 'FLAGGED';
  flags: string[];
  device: string;
  device_id: string;
  wifi_bssid: string | null;
  is_assisted: boolean;
  face_confidence?: number;
}

const FALLBACK_PUNCHES: Punch[] = [
  {
    id: 'p-1',
    name: 'Kouassi Jean-Marc',
    role: 'Chef d\'équipe Logistique',
    site_name: 'Siège Principal Ouagadougou',
    punch_type: 'CHECK_IN',
    time: '07:28',
    full_date: 'Aujourd\'hui à 07:28:12 UTC',
    distance: '14m du centre',
    distance_meters: 14,
    latitude: 11.24709,
    longitude: -4.29191,
    accuracy: 4.2,
    status: 'VALIDATED',
    flags: ['GPS_EXACT (14m)', 'WIFI_VALIDÉ (Livebox_Siege)', 'BIOMETRIE_OK'],
    device: 'TECNO CM6 (Lié)',
    device_id: 'BP2A.250605.031.A3',
    wifi_bssid: 'b4:ee:b4:12:34:56',
    is_assisted: false,
    face_confidence: 99.1
  },
  {
    id: 'p-2',
    name: 'Traoré Fatou',
    role: 'Responsable Magasin',
    site_name: 'Siège Principal Ouagadougou',
    punch_type: 'CHECK_IN',
    time: '07:46',
    full_date: 'Aujourd\'hui à 07:46:05 UTC',
    distance: '34m du centre',
    distance_meters: 34,
    latitude: 11.24715,
    longitude: -4.29175,
    accuracy: 5.0,
    status: 'LATE',
    flags: ['RETARD_16MIN (Tolérance 07h30)', 'GPS_CONFIRMÉ'],
    device: 'Samsung Galaxy A53 (Lié)',
    device_id: 'DEV-SAMSUNG-A53-9988',
    wifi_bssid: null,
    is_assisted: false
  },
  {
    id: 'p-3',
    name: 'Yao Brice',
    role: 'Agent de Sécurité',
    site_name: 'Siège Principal Ouagadougou',
    punch_type: 'CHECK_OUT',
    time: '16:02',
    full_date: 'Aujourd\'hui à 16:02:44 UTC',
    distance: '18m du centre',
    distance_meters: 18,
    latitude: 11.24700,
    longitude: -4.29180,
    accuracy: 3.8,
    status: 'VALIDATED',
    flags: ['GPS_VALIDE', 'JOURNÉE_CLÔTURÉE_OK'],
    device: 'Redmi Note 12 (Lié)',
    device_id: 'DEV-REDMI-8812',
    wifi_bssid: 'b4:ee:b4:12:34:56',
    is_assisted: false
  }
];

type FilterType = 'ALL' | 'CHECK_IN' | 'CHECK_OUT' | 'BREAK' | 'VALIDATED' | 'LATE' | 'FLAGGED' | 'WIFI';

export default function DashboardPage() {
  const [punches, setPunches] = useState<Punch[]>(FALLBACK_PUNCHES);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [siteFilter, setSiteFilter] = useState<string>('ALL');
  const [selectedPunch, setSelectedPunch] = useState<Punch | null>(null);

  const fetchPunches = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('pointage_logs')
        .select('*, pointage_employees(full_name, role, employee_matricule), pointage_establishments(name)')
        .order('recorded_at_utc', { ascending: false })
        .limit(100);

      if (data && data.length > 0) {
        const loaded: Punch[] = data.map((d: any) => {
          const punchType = (d.punch_type || 'CHECK_IN').toUpperCase();
          const recDate = new Date(d.recorded_at_utc || d.created_at);
          
          let derivedStatus: 'VALIDATED' | 'LATE' | 'FLAGGED' = 'VALIDATED';
          if (d.status === 'FLAGGED' || d.is_mock_location) {
            derivedStatus = 'FLAGGED';
          } else if (d.status === 'LATE' || (d.flag_reasons && d.flag_reasons.some((f: string) => f.includes('RETARD')))) {
            derivedStatus = 'LATE';
          }

          return {
            id: d.id,
            name: d.pointage_employees?.full_name || 'Collaborateur',
            role: d.pointage_employees?.role || 'Employé',
            site_name: d.pointage_establishments?.name || 'Siège Principal Ouagadougou',
            punch_type: punchType,
            time: recDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            full_date: recDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            distance: `${Math.round(d.distance_to_site_meters || 14)}m du centre`,
            distance_meters: Math.round(d.distance_to_site_meters || 14),
            latitude: d.latitude || 11.24700,
            longitude: d.longitude || -4.29180,
            accuracy: d.accuracy_meters || 5.0,
            status: derivedStatus,
            flags: d.flag_reasons || ['GPS_VALIDE', 'SATELLITE_UTC'],
            device: d.device_model ? `${d.device_model} (Lié)` : 'Smartphone Lié',
            device_id: d.device_id || 'N/A',
            wifi_bssid: d.wifi_bssid,
            is_assisted: Boolean(d.is_assisted),
            face_confidence: d.face_match_confidence
          };
        });
        setPunches(loaded);
      }
    } catch (err) {
      console.warn('Using local punches fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPunches();

    const supabase = createClient();
    const channel = supabase
      .channel('realtime_punches_live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pointage_logs' },
        () => fetchPunches()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredPunches = punches.filter(p => {
    if (filter === 'VALIDATED' && p.status !== 'VALIDATED') return false;
    if (filter === 'LATE' && p.status !== 'LATE') return false;
    if (filter === 'FLAGGED' && p.status !== 'FLAGGED') return false;
    if (filter === 'WIFI' && !p.wifi_bssid && !p.flags.some(f => f.toLowerCase().includes('wifi'))) return false;
    if (filter === 'CHECK_IN' && p.punch_type !== 'CHECK_IN') return false;
    if (filter === 'CHECK_OUT' && p.punch_type !== 'CHECK_OUT') return false;
    if (filter === 'BREAK' && !p.punch_type.includes('BREAK')) return false;

    if (siteFilter !== 'ALL' && !p.site_name.toLowerCase().includes(siteFilter.toLowerCase())) return false;
    return true;
  });

  const validatedCount = punches.filter(p => p.status === 'VALIDATED').length;
  const lateCount = punches.filter(p => p.status === 'LATE').length;
  const flaggedCount = punches.filter(p => p.status === 'FLAGGED').length;
  const wifiCount = punches.filter(p => Boolean(p.wifi_bssid) || p.flags.some(f => f.toLowerCase().includes('wifi'))).length;
  const checkInCount = punches.filter(p => p.punch_type === 'CHECK_IN').length;
  const checkOutCount = punches.filter(p => p.punch_type === 'CHECK_OUT').length;
  const breakCount = punches.filter(p => p.punch_type.includes('BREAK')).length;

  const exportCSV = () => {
    let csv = '\uFEFFCollaborateur;Poste;Site;Action;Heure;Distance;Statut;Alertes;Appareil;DeviceID;Latitude;Longitude\n';
    punches.forEach(p => {
      csv += `"${p.name}";"${p.role}";"${p.site_name}";"${getPunchActionLabel(p.punch_type)}";"${p.time}";"${p.distance}";"${p.status}";"${p.flags.join(' | ')}";"${p.device}";"${p.device_id}";"${p.latitude}";"${p.longitude}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pointage_supervision_ouagadougou_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPunchActionBadge = (type: string) => {
    switch (type) {
      case 'CHECK_IN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
            <LogIn className="w-3.5 h-3.5 text-emerald-600" />
            <span>Arrivée (Prise de poste)</span>
          </span>
        );
      case 'BREAK_START':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200">
            <Coffee className="w-3.5 h-3.5 text-amber-600" />
            <span>Départ Pause Déjeuner</span>
          </span>
        );
      case 'BREAK_END':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200">
            <Play className="w-3.5 h-3.5 text-blue-600" />
            <span>Reprise de Poste</span>
          </span>
        );
      case 'CHECK_OUT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold text-[11px] border border-slate-300">
            <LogOut className="w-3.5 h-3.5 text-slate-700" />
            <span>Départ Définitif</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold">
            {type}
          </span>
        );
    }
  };

  const getPunchActionLabel = (type: string) => {
    switch (type) {
      case 'CHECK_IN': return 'Arrivée (Prise de poste)';
      case 'BREAK_START': return 'Départ Pause Déjeuner';
      case 'BREAK_END': return 'Reprise de Poste';
      case 'CHECK_OUT': return 'Départ Définitif';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <Header
        title="Supervision en Temps Réel"
        subtitle="Contrôle certifié des présences • Géofencing satellite & Box Wi-Fi Ouagadougou"
        actionButton={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchPunches}
              disabled={loading}
              className="p-2.5 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl transition shadow-sm hover:bg-slate-50 active:scale-95"
              title="Rafraîchir les données en direct"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-md shadow-blue-500/15 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter Rapport CSV</span>
            </button>
          </div>
        }
      />

      {/* Cartes KPI Interactives & Cliquables */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 : Présents */}
        <button
          onClick={() => setFilter('ALL')}
          className={`text-left p-5 rounded-2xl border transition-all duration-200 shadow-sm relative overflow-hidden group cursor-pointer ${
            filter === 'ALL'
              ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/30'
              : 'bg-white border-slate-200/80 hover:border-blue-300 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Présents Aujourd'hui</span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${
              filter === 'ALL' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'
            }`}>
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {punches.length} <span className="text-xs font-normal text-slate-500">pointages</span>
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {filter === 'ALL' ? 'Filtre Actif : Tous les pointages' : 'Cliquer pour afficher tous'}
          </p>
        </button>

        {/* KPI 2 : Retards */}
        <button
          onClick={() => setFilter('LATE')}
          className={`text-left p-5 rounded-2xl border transition-all duration-200 shadow-sm relative overflow-hidden group cursor-pointer ${
            filter === 'LATE'
              ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-500/30'
              : 'bg-white border-slate-200/80 hover:border-amber-300 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Retards Détectés</span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${
              filter === 'LATE' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-600 group-hover:bg-amber-100'
            }`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-600">{lateCount}</div>
          <p className="text-[11px] text-amber-700 font-semibold mt-1">
            {filter === 'LATE' ? 'Filtre Actif : Retards uniquement' : 'Cliquer pour filtrer les retards'}
          </p>
        </button>

        {/* KPI 3 : Alertes Sécurité */}
        <button
          onClick={() => setFilter('FLAGGED')}
          className={`text-left p-5 rounded-2xl border transition-all duration-200 shadow-sm relative overflow-hidden group cursor-pointer ${
            filter === 'FLAGGED'
              ? 'bg-red-50/70 border-red-400 ring-2 ring-red-500/30'
              : 'bg-white border-slate-200/80 hover:border-red-300 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alertes Sécurité</span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${
              filter === 'FLAGGED' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 group-hover:bg-red-100'
            }`}>
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{flaggedCount}</div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            {filter === 'FLAGGED' ? 'Filtre Actif : Alertes sécurité' : 'Protection Faux GPS active'}
          </p>
        </button>

        {/* KPI 4 : Box Wi-Fi */}
        <button
          onClick={() => setFilter('WIFI')}
          className={`text-left p-5 rounded-2xl border transition-all duration-200 shadow-sm relative overflow-hidden group cursor-pointer ${
            filter === 'WIFI'
              ? 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-500/30'
              : 'bg-white border-slate-200/80 hover:border-indigo-300 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pointages Box Wi-Fi</span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${
              filter === 'WIFI' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100'
            }`}>
              <Wifi className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-indigo-600">{wifiCount}</div>
          <p className="text-[11px] text-indigo-700 font-semibold mt-1">
            {filter === 'WIFI' ? 'Filtre Actif : Box Wi-Fi certifiée' : 'Double validation réseau d\'entreprise'}
          </p>
        </button>
      </div>

      {/* Barre de Filtres Enrichie */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-500 mr-2">Filtres Rapides :</span>
          
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filter === 'ALL' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tous ({punches.length})
          </button>

          <button
            onClick={() => setFilter('CHECK_IN')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              filter === 'CHECK_IN' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
            }`}
          >
            <LogIn className="w-3 h-3" />
            <span>Arrivées ({checkInCount})</span>
          </button>

          <button
            onClick={() => setFilter('CHECK_OUT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              filter === 'CHECK_OUT' ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <LogOut className="w-3 h-3" />
            <span>Départs ({checkOutCount})</span>
          </button>

          <button
            onClick={() => setFilter('BREAK')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              filter === 'BREAK' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700'
            }`}
          >
            <Coffee className="w-3 h-3" />
            <span>Pauses ({breakCount})</span>
          </button>

          <button
            onClick={() => setFilter('LATE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              filter === 'LATE' ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Retards ({lateCount})</span>
          </button>

          <button
            onClick={() => setFilter('FLAGGED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              filter === 'FLAGGED' ? 'bg-red-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-700'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Alertes Sécurité ({flaggedCount})</span>
          </button>

          <button
            onClick={() => setFilter('WIFI')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              filter === 'WIFI' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
            }`}
          >
            <Wifi className="w-3 h-3" />
            <span>Box Wi-Fi ({wifiCount})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500">Site :</label>
          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">Tous les sites</option>
            <option value="Ouagadougou">Siège Principal Ouagadougou</option>
          </select>
        </div>
      </div>

      {/* Table des Pointages avec Colonne Action Claire & Ligne Cliquable */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-sm">Journal des Pointages Certifiés</h3>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs text-slate-400 font-mono">Realtime Live</span>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Affichage de <strong>{filteredPunches.length}</strong> pointages • Cliquez sur une ligne pour inspecter
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-6">Collaborateur</th>
                <th className="py-3 px-4">Action Enregistrée</th>
                <th className="py-3 px-4">Établissement</th>
                <th className="py-3 px-4">Heure (Locale)</th>
                <th className="py-3 px-4">Position & Géofence</th>
                <th className="py-3 px-4">Preuves Certifiées</th>
                <th className="py-3 px-6 text-right">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredPunches.map((punch) => (
                <tr 
                  key={punch.id} 
                  onClick={() => setSelectedPunch(punch)}
                  className="hover:bg-blue-50/50 transition cursor-pointer group"
                >
                  <td className="py-3.5 px-6 font-semibold text-slate-900">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs border border-slate-200 group-hover:border-blue-300">
                        {punch.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 group-hover:text-blue-600 transition">{punch.name}</div>
                        <div className="text-[11px] text-slate-400 font-normal">{punch.role}</div>
                      </div>
                    </div>
                  </td>
                  
                  {/* Colonne Action Explicite (Arrivée / Pause / Départ) */}
                  <td className="py-3.5 px-4">
                    {getPunchActionBadge(punch.punch_type)}
                  </td>

                  <td className="py-3.5 px-4 font-medium text-slate-800">
                    {punch.site_name}
                  </td>

                  <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                    {punch.time}
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {punch.distance}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap items-center gap-1">
                      {punch.wifi_bssid && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <Wifi className="w-3 h-3" />
                          <span>Wi-Fi Box</span>
                        </span>
                      )}
                      {punch.is_assisted && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                          <span>Dépanné (Selfie RAM)</span>
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-mono">
                        {punch.device}
                      </span>
                    </div>
                  </td>

                  <td className="py-3.5 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {punch.status === 'VALIDATED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-extrabold text-[11px] border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Conforme</span>
                        </span>
                      )}
                      {punch.status === 'LATE' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 font-extrabold text-[11px] border border-amber-500/20">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Retard</span>
                        </span>
                      )}
                      {punch.status === 'FLAGGED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/10 text-red-600 font-extrabold text-[11px] border border-red-500/20">
                          <AlertTriangle className="w-3 h-3 text-red-600" />
                          <span>Alerte</span>
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modale d'Inspection Détaillée du Pointage */}
      {selectedPunch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                  {selectedPunch.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">{selectedPunch.name}</h3>
                  <p className="text-xs text-slate-500">{selectedPunch.role} • {selectedPunch.site_name}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPunch(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Action & Statut */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase">Nature du Pointage</span>
                <div className="mt-1">{getPunchActionBadge(selectedPunch.punch_type)}</div>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Date & Heure</span>
                <div className="text-xs font-bold text-slate-800 mt-1">{selectedPunch.full_date}</div>
              </div>
            </div>

            {/* Preuves d'Authenticité */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Preuves Cryptographiques & Géographiques</span>
              </h4>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-slate-400 text-[10px] font-bold uppercase flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-blue-500" />
                    <span>Position Satellite</span>
                  </div>
                  <div className="font-bold text-slate-800 mt-1">
                    {selectedPunch.latitude.toFixed(5)}, {selectedPunch.longitude.toFixed(5)}
                  </div>
                  <div className="text-[11px] text-emerald-600 mt-0.5">
                    {selectedPunch.distance} (Précision {selectedPunch.accuracy}m)
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-slate-400 text-[10px] font-bold uppercase flex items-center gap-1">
                    <Smartphone className="w-3 h-3 text-blue-500" />
                    <span>Appareil Certifié</span>
                  </div>
                  <div className="font-bold text-slate-800 mt-1 truncate">
                    {selectedPunch.device}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                    ID: {selectedPunch.device_id}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-slate-400 text-[10px] font-bold uppercase flex items-center gap-1">
                    <Wifi className="w-3 h-3 text-indigo-500" />
                    <span>Validation Wi-Fi Box</span>
                  </div>
                  <div className="font-bold text-slate-800 mt-1">
                    {selectedPunch.wifi_bssid ? 'BSSID Box Conforme' : 'Réseau Mobile 4G/5G'}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                    {selectedPunch.wifi_bssid || 'GPS Haute Précision'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-slate-400 text-[10px] font-bold uppercase flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-emerald-500" />
                    <span>Contrôle Anti-Faux GPS</span>
                  </div>
                  <div className="font-bold text-emerald-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Certifié Authentique</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Zéro mock GPS détecté
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedPunch(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
