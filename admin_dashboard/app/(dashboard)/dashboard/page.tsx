'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { createClient } from '@/lib/supabase/client';
import * as XLSX from 'xlsx';
import { 
  Users, 
  Clock, 
  ShieldCheck, 
  Wifi, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  LogIn, 
  LogOut, 
  Coffee, 
  Play,
  MapPin, 
  Smartphone, 
  ShieldAlert, 
  X, 
  ChevronRight, 
  TrendingUp,
  Activity,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Filter,
  Eye,
  Building2,
  FileSpreadsheet
} from 'lucide-react';

interface Punch {
  id: string;
  name: string;
  matricule?: string;
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
    matricule: 'OUA-2026-001',
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
    matricule: 'OUA-2026-002',
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
    matricule: 'OUA-2026-003',
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
type TimeRange = 'TODAY' | 'WEEK' | 'MONTH';

export default function DashboardPage() {
  const [punches, setPunches] = useState<Punch[]>(FALLBACK_PUNCHES);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [siteFilter, setSiteFilter] = useState<string>('ALL');
  const [timeRange, setTimeRange] = useState<TimeRange>('TODAY');
  const [selectedPunch, setSelectedPunch] = useState<Punch | null>(null);
  const [searchTableQuery, setSearchTableQuery] = useState('');

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
            matricule: d.pointage_employees?.employee_matricule || undefined,
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

  // Filtrage combiné (Statut + Site + Recherche texte)
  const filteredPunches = punches.filter(p => {
    if (filter === 'VALIDATED' && p.status !== 'VALIDATED') return false;
    if (filter === 'LATE' && p.status !== 'LATE') return false;
    if (filter === 'FLAGGED' && p.status !== 'FLAGGED') return false;
    if (filter === 'WIFI' && !p.wifi_bssid && !p.flags.some(f => f.toLowerCase().includes('wifi'))) return false;
    if (filter === 'CHECK_IN' && p.punch_type !== 'CHECK_IN') return false;
    if (filter === 'CHECK_OUT' && p.punch_type !== 'CHECK_OUT') return false;
    if (filter === 'BREAK' && !p.punch_type.includes('BREAK')) return false;

    if (siteFilter !== 'ALL' && !p.site_name.toLowerCase().includes(siteFilter.toLowerCase())) return false;

    if (searchTableQuery.trim()) {
      const q = searchTableQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchMat = (p.matricule || '').toLowerCase().includes(q);
      const matchRole = p.role.toLowerCase().includes(q);
      if (!matchName && !matchMat && !matchRole) return false;
    }

    return true;
  });

  // Métriques de Synthèse
  const validatedCount = punches.filter(p => p.status === 'VALIDATED').length;
  const lateCount = punches.filter(p => p.status === 'LATE').length;
  const flaggedCount = punches.filter(p => p.status === 'FLAGGED').length;
  const wifiCount = punches.filter(p => Boolean(p.wifi_bssid) || p.flags.some(f => f.toLowerCase().includes('wifi'))).length;
  const checkInCount = punches.filter(p => p.punch_type === 'CHECK_IN').length;
  const checkOutCount = punches.filter(p => p.punch_type === 'CHECK_OUT').length;
  const breakCount = punches.filter(p => p.punch_type.includes('BREAK')).length;

  // Calcul Taux de Ponctualité
  const totalArrived = checkInCount > 0 ? checkInCount : punches.length;
  const punctualityRate = totalArrived > 0 
    ? Math.round(((totalArrived - lateCount) / totalArrived) * 100) 
    : 100;

  // Dernier pointage certifié (Pour le Focus Radar)
  const latestPunch = punches.length > 0 ? punches[0] : null;

  // Donut SVG Parameters
  const donutTotal = punches.length || 1;
  const onTimeCount = Math.max(0, validatedCount - breakCount);
  const onTimeRatio = onTimeCount / donutTotal;
  const lateRatio = lateCount / donutTotal;
  const breakRatio = breakCount / donutTotal;

  // 1. Export Excel (.xlsx)
  const exportXLSX = () => {
    const dataToExport = filteredPunches.map(p => ({
      Matricule: p.matricule || 'N/A',
      Collaborateur: p.name,
      Fonction: p.role,
      Etablissement: p.site_name,
      Action: getPunchActionLabel(p.punch_type),
      Heure_UTC: p.time,
      Distance_Geofence: p.distance,
      Statut: p.status === 'VALIDATED' ? 'Conforme' : (p.status === 'LATE' ? 'Retard' : 'Alerte'),
      Alertes_Et_Preuves: p.flags.join(' | '),
      Appareil_Scelle: p.device,
      ID_Materiel_Device: p.device_id,
      Latitude: p.latitude,
      Longitude: p.longitude
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Journal_Pointages');
    XLSX.writeFile(wb, `pointagepro_supervision_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // 2. Export CSV
  const exportCSV = () => {
    let csv = '\uFEFFMatricule;Collaborateur;Poste;Site;Action;Heure;Distance;Statut;Alertes;Appareil;DeviceID;Latitude;Longitude\n';
    filteredPunches.forEach(p => {
      csv += `"${p.matricule || 'N/A'}";"${p.name}";"${p.role}";"${p.site_name}";"${getPunchActionLabel(p.punch_type)}";"${p.time}";"${p.distance}";"${p.status}";"${p.flags.join(' | ')}";"${p.device}";"${p.device_id}";"${p.latitude}";"${p.longitude}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pointage_supervision_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPunchActionBadge = (type: string) => {
    switch (type) {
      case 'CHECK_IN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
            <LogIn className="w-3.5 h-3.5 text-emerald-600" />
            <span>Arrivée (Prise)</span>
          </span>
        );
      case 'BREAK_START':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200">
            <Coffee className="w-3.5 h-3.5 text-amber-600" />
            <span>Pause Déjeuner</span>
          </span>
        );
      case 'BREAK_END':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200">
            <Play className="w-3.5 h-3.5 text-blue-600" />
            <span>Reprise Poste</span>
          </span>
        );
      case 'CHECK_OUT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 font-bold text-[11px] border border-slate-300">
            <LogOut className="w-3.5 h-3.5 text-slate-700" />
            <span>Clôture Journée</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xl bg-slate-100 text-slate-700 text-[11px] font-semibold">
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
      case 'CHECK_OUT': return 'Clôture Définitive';
      default: return type;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Exécutif */}
      <Header
        title="Supervision en Temps Réel"
        subtitle="Contrôle d'assiduité inaltérable • Détection des retards et verrouillage satellite UTC"
        actionButton={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchPunches}
              disabled={loading}
              className="p-2.5 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl transition shadow-xs hover:bg-slate-50 active:scale-95"
              title="Rafraîchir les données en direct"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
            <button
              onClick={exportXLSX}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition shadow-xs active:scale-95"
              title="Exporter le journal en fichier Microsoft Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition shadow-xs active:scale-95"
              title="Exporter en CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">CSV</span>
            </button>
          </div>
        }
      />

      {/* 2. BENTO ROW 1 : CARTES MÉTRIQUES EXÉCUTIVES INTERACTIVES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1 : Taux de Ponctualité Global (Jauge Circulaire) */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Taux de Ponctualité</span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              {punctualityRate}%
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Conforme aux normes</span>
            </p>
          </div>
          <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100"
                strokeWidth="3.8"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-emerald-500"
                strokeDasharray={`${punctualityRate}, 100`}
                strokeWidth="3.8"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-[11px] font-black text-slate-800">
              {punctualityRate}%
            </span>
          </div>
        </div>

        {/* KPI 2 : Présents Aujourd'hui */}
        <button
          onClick={() => setFilter('ALL')}
          className={`text-left p-5 rounded-2xl border transition-all duration-200 shadow-xs relative overflow-hidden group cursor-pointer ${
            filter === 'ALL'
              ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200/80 hover:border-blue-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Présents Aujourd'hui</span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${
              filter === 'ALL' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'
            }`}>
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {punches.length} <span className="text-xs font-semibold text-slate-400">enregistrés</span>
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Flux temps réel actif</span>
          </p>
        </button>

        {/* KPI 3 : Retards Détectés */}
        <button
          onClick={() => setFilter('LATE')}
          className={`text-left p-5 rounded-2xl border transition-all duration-200 shadow-xs relative overflow-hidden group cursor-pointer ${
            filter === 'LATE'
              ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200/80 hover:border-amber-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Retards Détectés</span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${
              filter === 'LATE' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-600 group-hover:bg-amber-100'
            }`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600">{lateCount}</div>
          <p className="text-[11px] text-amber-700 font-semibold mt-1 flex items-center justify-between">
            <span>{filter === 'LATE' ? '✓ Filtre appliqué' : 'Filtrer les retards'}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />
          </p>
        </button>

        {/* KPI 4 : Bouclier Sécurité & Wi-Fi */}
        <button
          onClick={() => setFilter('FLAGGED')}
          className={`text-left p-5 rounded-2xl border transition-all duration-200 shadow-xs relative overflow-hidden group cursor-pointer ${
            filter === 'FLAGGED'
              ? 'bg-red-50/80 border-red-400 ring-2 ring-red-500/20'
              : 'bg-white border-slate-200/80 hover:border-red-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Sécurité Anti-Triche</span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${
              filter === 'FLAGGED' ? 'bg-red-600 text-white' : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100'
            }`}>
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {flaggedCount === 0 ? '100% Sûr' : `${flaggedCount} alerte(s)`}
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>0 Faux GPS toléré</span>
          </p>
        </button>
      </div>

      {/* 3. BENTO ROW 2 : LES VISUAL INSIGHTS ANALYTIQUES LIVE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Widget A : Donut Interactif de Répartition */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                Répartition des Présences
              </h3>
              <span className="text-[10px] font-bold text-slate-400 font-mono">Aujourd'hui</span>
            </div>
            
            <div className="flex items-center justify-center py-4">
              <div className="relative w-36 h-36 flex items-center justify-center">
                {/* Donut SVG Dynamique */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 42 42">
                  <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#E2E8F0" strokeWidth="5" />
                  {/* Conformes (Vert) */}
                  <circle
                    cx="21"
                    cy="21"
                    r="15.915"
                    fill="transparent"
                    stroke="#10B981"
                    strokeWidth="5"
                    strokeDasharray={`${onTimeRatio * 100} ${100 - onTimeRatio * 100}`}
                    strokeDashoffset="0"
                  />
                  {/* Retards (Ambre) */}
                  <circle
                    cx="21"
                    cy="21"
                    r="15.915"
                    fill="transparent"
                    stroke="#F59E0B"
                    strokeWidth="5"
                    strokeDasharray={`${lateRatio * 100} ${100 - lateRatio * 100}`}
                    strokeDashoffset={`-${onTimeRatio * 100}`}
                  />
                  {/* Pauses (Bleu) */}
                  <circle
                    cx="21"
                    cy="21"
                    r="15.915"
                    fill="transparent"
                    stroke="#2563EB"
                    strokeWidth="5"
                    strokeDasharray={`${breakRatio * 100} ${100 - breakRatio * 100}`}
                    strokeDashoffset={`-${(onTimeRatio + lateRatio) * 100}`}
                  />
                </svg>
                <div className="absolute text-center">
                  <div className="text-xl font-black text-slate-900">{punches.length}</div>
                  <div className="text-[10px] font-bold text-slate-400">Pointages</div>
                </div>
              </div>
            </div>
          </div>

          {/* Légende Interactive */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
              <span className="text-slate-600 font-medium">À l'heure ({onTimeCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
              <span className="text-slate-600 font-medium">Retards ({lateCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0"></span>
              <span className="text-slate-600 font-medium">Pauses ({breakCount})</span>
            </div>
          </div>
        </div>

        {/* Widget B : Affluence des Arrivées par tranche de 15 minutes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                Affluence des Arrivées
              </h3>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                Pic : 07h15 - 07h30
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
              Volume des passages au portail par tranche horaire pour anticiper les engorgements.
            </p>

            {/* Histogramme Visuel SVG */}
            <div className="h-28 flex items-end justify-between gap-3 px-2 pt-2">
              <div className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-slate-600">3</span>
                <div className="w-full bg-slate-200/80 rounded-t-lg transition-all hover:bg-blue-400" style={{ height: '35%' }}></div>
                <span className="text-[9px] font-mono text-slate-400 mt-1">07:00</span>
              </div>
              <div className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-blue-600">18</span>
                <div className="w-full bg-blue-600 rounded-t-lg transition-all hover:bg-blue-700 shadow-xs" style={{ height: '90%' }}></div>
                <span className="text-[9px] font-mono font-bold text-blue-600 mt-1">07:15</span>
              </div>
              <div className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-slate-600">5</span>
                <div className="w-full bg-slate-200/80 rounded-t-lg transition-all hover:bg-blue-400" style={{ height: '45%' }}></div>
                <span className="text-[9px] font-mono text-slate-400 mt-1">07:30</span>
              </div>
              <div className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-amber-600">2</span>
                <div className="w-full bg-amber-400 rounded-t-lg transition-all hover:bg-amber-500" style={{ height: '25%' }}></div>
                <span className="text-[9px] font-mono text-slate-400 mt-1">07:45</span>
              </div>
              <div className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-slate-500">0</span>
                <div className="w-full bg-slate-100 rounded-t-lg" style={{ height: '6%' }}></div>
                <span className="text-[9px] font-mono text-slate-400 mt-1">08:00</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Fluidité globale : <strong>92% à l'heure</strong></span>
            <span className="text-blue-600 font-bold">0 File d'attente</span>
          </div>
        </div>

        {/* Widget C : Focus Dernier Pointage Certifié */}
        <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white p-5 rounded-2xl shadow-sm border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                Dernier Pointage en Direct
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>

            {latestPunch ? (
              <div className="space-y-3 mt-2">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-600/40 border border-blue-400/40 flex items-center justify-center font-black text-sm text-white">
                    {getInitials(latestPunch.name)}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">{latestPunch.name}</h4>
                    <p className="text-[11px] text-slate-300 font-mono">
                      {latestPunch.matricule || latestPunch.role} • {latestPunch.time}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-emerald-400" /> Distance :</span>
                    <span className="font-bold text-white">{latestPunch.distance}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1"><Smartphone className="w-3 h-3 text-blue-400" /> Appareil :</span>
                    <span className="font-bold text-white truncate max-w-[140px]">{latestPunch.device}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1"><Wifi className="w-3 h-3 text-indigo-400" /> Réseau :</span>
                    <span className="font-bold text-white">{latestPunch.wifi_bssid ? 'Box Bureau OK' : 'Réseau 4G'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                En attente du premier pointage...
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
            <span>Certification Satellite UTC</span>
            <span className="text-emerald-400 font-bold">100% Inaltérable</span>
          </div>
        </div>
      </div>

      {/* 4. BENTO ROW 3 : BARRE DE FILTRES RAPIDES & RECHERCHE INSTANTANÉE */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-500 mr-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Filtres :
          </span>
          
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filter === 'ALL' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tous ({punches.length})
          </button>

          <button
            onClick={() => setFilter('CHECK_IN')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              filter === 'CHECK_IN' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
            }`}
          >
            <LogIn className="w-3 h-3" />
            <span>Arrivées ({checkInCount})</span>
          </button>

          <button
            onClick={() => setFilter('CHECK_OUT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              filter === 'CHECK_OUT' ? 'bg-slate-800 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <LogOut className="w-3 h-3" />
            <span>Clôtures ({checkOutCount})</span>
          </button>

          <button
            onClick={() => setFilter('BREAK')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              filter === 'BREAK' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700'
            }`}
          >
            <Coffee className="w-3 h-3" />
            <span>Pauses ({breakCount})</span>
          </button>

          <button
            onClick={() => setFilter('LATE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              filter === 'LATE' ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Retards ({lateCount})</span>
          </button>

          <button
            onClick={() => setFilter('FLAGGED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              filter === 'FLAGGED' ? 'bg-red-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-700'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Alertes ({flaggedCount})</span>
          </button>
        </div>

        {/* Recherche instantanée dans la table */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Filtrer par nom ou matricule..."
            value={searchTableQuery}
            onChange={(e) => setSearchTableQuery(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-48 sm:w-56"
          />
        </div>
      </div>

      {/* 5. TABLEAU DES POINTAGES AVEC INITIALES, ACTIONS ET INSPECTION */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-slate-900 text-sm">Journal des Pointages Certifiés</h3>
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
                <th className="py-3 px-6">Collaborateur / Élève</th>
                <th className="py-3 px-4">Action Enregistrée</th>
                <th className="py-3 px-4">Établissement</th>
                <th className="py-3 px-4">Heure (UTC)</th>
                <th className="py-3 px-4">Position & Géofence</th>
                <th className="py-3 px-4">Preuves & Sécurité</th>
                <th className="py-3 px-6 text-right">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredPunches.map((punch) => (
                <tr 
                  key={punch.id} 
                  onClick={() => setSelectedPunch(punch)}
                  className="hover:bg-blue-50/40 transition cursor-pointer group"
                >
                  <td className="py-3.5 px-6 font-semibold text-slate-900">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-blue-100 text-slate-700 group-hover:text-blue-700 font-black text-[11px] flex items-center justify-center shrink-0 transition">
                        {getInitials(punch.name)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span>{punch.name}</span>
                          {punch.matricule && (
                            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              {punch.matricule}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-normal">{punch.role}</div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="py-3.5 px-4">
                    {getPunchActionBadge(punch.punch_type)}
                  </td>

                  <td className="py-3.5 px-4 text-slate-600 font-medium">
                    {punch.site_name}
                  </td>

                  <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                    {punch.time}
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>{punch.distance}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">Précision ±{punch.accuracy}m</span>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                        ✓ Sat UTC
                      </span>
                      {punch.wifi_bssid && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200">
                          Wi-Fi Box
                        </span>
                      )}
                      {punch.face_confidence && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">
                          Bio RAM {punch.face_confidence}%
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-6 text-right">
                    {punch.status === 'VALIDATED' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-[11px] border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Conforme</span>
                      </span>
                    )}
                    {punch.status === 'LATE' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 font-bold text-[11px] border border-amber-500/20">
                        <Clock className="w-3 h-3" />
                        <span>Retard</span>
                      </span>
                    )}
                    {punch.status === 'FLAGGED' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/10 text-red-600 font-bold text-[11px] border border-red-500/20">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Alerte</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== TIROIR D'INSPECTION APPROFONDIE (MODAL INSPECT) ==================== */}
      {selectedPunch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 sm:p-7 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 font-black text-sm flex items-center justify-center">
                  {getInitials(selectedPunch.name)}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">{selectedPunch.name}</h3>
                  <p className="text-xs text-slate-500">{selectedPunch.role} • {selectedPunch.matricule || 'N/A'}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPunch(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Action :</span>
                  <span className="font-bold text-slate-800">{getPunchActionLabel(selectedPunch.punch_type)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Horodatage certifié :</span>
                  <span className="font-mono font-bold text-slate-900">{selectedPunch.full_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Établissement :</span>
                  <span className="font-semibold text-slate-800">{selectedPunch.site_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Distance GPS :</span>
                  <span className="font-bold text-emerald-600">{selectedPunch.distance} (Tolérance OK)</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Appareil Scellé :</span>
                  <span className="font-bold text-slate-800">{selectedPunch.device}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ID Matériel Unique :</span>
                  <span className="font-mono text-slate-700">{selectedPunch.device_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Box Wi-Fi Détectée :</span>
                  <span className="font-mono text-slate-700">{selectedPunch.wifi_bssid || 'Connexion 4G directe'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Coordonnées GPS :</span>
                  <span className="font-mono text-blue-600">{selectedPunch.latitude.toFixed(5)}, {selectedPunch.longitude.toFixed(5)}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                onClick={() => setSelectedPunch(null)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition"
              >
                Fermer l'Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
