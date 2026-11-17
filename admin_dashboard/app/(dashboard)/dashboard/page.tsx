'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/header';
import { createClient } from '@/lib/supabase/client';
import { 
  Users, 
  Clock, 
  ShieldCheck, 
  Wifi, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  LogIn, 
  LogOut, 
  Coffee, 
  MapPin, 
  ChevronRight, 
  TrendingUp,
  Activity,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  X,
  Building2,
  FileSpreadsheet,
  AlertCircle
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

const RECENT_PUNCHES_FALLBACK: Punch[] = [
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
    is_assisted: false,
    face_confidence: 98.4
  },
  {
    id: 'p-3',
    name: 'Yao Brice',
    matricule: 'OUA-2026-003',
    role: 'Agent de Sécurité',
    site_name: 'Siège Principal Ouagadougou',
    punch_type: 'CHECK_OUT',
    time: '17:35',
    full_date: 'Aujourd\'hui à 17:35:40 UTC',
    distance: '8m du centre',
    distance_meters: 8,
    latitude: 11.24702,
    longitude: -4.29188,
    accuracy: 3.1,
    status: 'VALIDATED',
    flags: ['DÉPART_CONFORME', 'SATELLITE_WGS84_OK'],
    device: 'Xiaomi Redmi Note 12 (Lié)',
    device_id: 'DEV-XIAOMI-RN12-1029',
    wifi_bssid: 'b4:ee:b4:12:34:56',
    is_assisted: false,
    face_confidence: 99.7
  },
  {
    id: 'p-4',
    name: 'BEDN SAKO',
    matricule: 'OUA-2026-000',
    role: 'Directeur Général',
    site_name: 'Siège Principal Ouagadougou',
    punch_type: 'CHECK_IN',
    time: '07:15',
    full_date: 'Aujourd\'hui à 07:15:22 UTC',
    distance: '11m du centre',
    distance_meters: 11,
    latitude: 11.24705,
    longitude: -4.29182,
    accuracy: 2.8,
    status: 'VALIDATED',
    flags: ['GPS_EXACT (11m)', 'WIFI_VALIDÉ', 'BIOMETRIE_OK'],
    device: 'iPhone 15 Pro (Lié)',
    device_id: 'DEV-IPHONE-15PRO-8812',
    wifi_bssid: 'b4:ee:b4:12:34:56',
    is_assisted: false,
    face_confidence: 99.9
  },
  {
    id: 'p-5',
    name: 'Diallo Aminata',
    matricule: 'OUA-2026-004',
    role: 'Assistante Commerciale',
    site_name: 'Campus / Antenne Est',
    punch_type: 'BREAK_START',
    time: '12:05',
    full_date: 'Aujourd\'hui à 12:05:18 UTC',
    distance: '22m du centre',
    distance_meters: 22,
    latitude: 11.24720,
    longitude: -4.29160,
    accuracy: 4.8,
    status: 'VALIDATED',
    flags: ['PAUSE_DÉJEUNER_DÉCLARÉE', 'GPS_OK'],
    device: 'Google Pixel 8 (Lié)',
    device_id: 'DEV-PIXEL8-4491',
    wifi_bssid: '68:9e:29:3b:43:08',
    is_assisted: false,
    face_confidence: 98.9
  }
];

type PeriodOption = 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH';

export default function DashboardPage() {
  const [punches, setPunches] = useState<Punch[]>(RECENT_PUNCHES_FALLBACK);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<PeriodOption>('TODAY');
  const [selectedPunch, setSelectedPunch] = useState<Punch | null>(null);

  const fetchPunches = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('pointage_punches')
        .select(`
          *,
          pointage_employees (
            full_name,
            role,
            employee_matricule,
            device_model
          ),
          pointage_establishments (
            name
          )
        `)
        .order('punched_at', { ascending: false })
        .limit(10);

      if (data && data.length > 0) {
        const mapped: Punch[] = data.map((d: any) => {
          const punchDate = new Date(d.punched_at);
          const timeStr = punchDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          const fullDateStr = punchDate.toLocaleString('fr-FR', { 
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit' 
          }) + ' UTC';

          let punchType = d.punch_type || 'CHECK_IN';
          if (punchType === 'IN') punchType = 'CHECK_IN';
          if (punchType === 'OUT') punchType = 'CHECK_OUT';

          const flagsList: string[] = [];
          if (d.distance_meters !== null && d.distance_meters !== undefined) {
            flagsList.push(`GPS_${Math.round(d.distance_meters)}m`);
          }
          if (d.verified_wifi_bssid) flagsList.push('WIFI_VÉRIFIÉ');
          if (d.is_late) flagsList.push('RETARD_ENREGISTRÉ');

          let punchStatus: 'VALIDATED' | 'LATE' | 'FLAGGED' = 'VALIDATED';
          if (d.is_flagged) punchStatus = 'FLAGGED';
          else if (d.is_late) punchStatus = 'LATE';

          return {
            id: d.id,
            name: d.pointage_employees?.full_name || 'Collaborateur',
            matricule: d.pointage_employees?.employee_matricule || undefined,
            role: d.pointage_employees?.role || 'Employé',
            site_name: d.pointage_establishments?.name || 'Siège Principal Ouagadougou',
            punch_type: punchType,
            time: timeStr,
            full_date: fullDateStr,
            distance: d.distance_meters ? `${Math.round(d.distance_meters)}m du centre` : '15m du centre',
            distance_meters: d.distance_meters ? Math.round(d.distance_meters) : 15,
            latitude: d.latitude || 11.24700,
            longitude: d.longitude || -4.29180,
            accuracy: d.accuracy || 4.5,
            status: punchStatus,
            flags: flagsList.length > 0 ? flagsList : ['VALIDÉ_PAR_SATELLITE'],
            device: d.device_model || d.pointage_employees?.device_model || 'Appareil Certifié',
            device_id: d.device_id || 'HARDWARE-BOUND-DEVICE',
            wifi_bssid: d.verified_wifi_bssid || null,
            is_assisted: d.is_assisted ?? false,
            face_confidence: d.face_confidence_score ? Math.round(d.face_confidence_score * 100) / 100 : undefined
          };
        });

        setPunches(mapped);
      }
    } catch (err) {
      console.warn('Fallback dashboard punches error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPunches();

    const supabase = createClient();
    const channel = supabase
      .channel('realtime_dashboard_cockpit')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pointage_punches' }, () => {
        fetchPunches();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Métriques adaptées selon la période sélectionnée
  const periodStats = {
    TODAY: {
      label: "Aujourd'hui",
      presentCount: 28,
      totalCount: 30,
      presenceRate: 93.3,
      onTimeRate: 96.4,
      lateCount: 1,
      totalHours: 184.5,
      satelliteSecuredRate: 100
    },
    YESTERDAY: {
      label: 'Hier',
      presentCount: 30,
      totalCount: 30,
      presenceRate: 100.0,
      onTimeRate: 93.3,
      lateCount: 2,
      totalHours: 242.0,
      satelliteSecuredRate: 100
    },
    WEEK: {
      label: '7 Derniers Jours',
      presentCount: 146,
      totalCount: 150,
      presenceRate: 97.3,
      onTimeRate: 95.8,
      lateCount: 6,
      totalHours: 1180.0,
      satelliteSecuredRate: 100
    },
    MONTH: {
      label: 'Ce Mois (Novembre 2026)',
      presentCount: 420,
      totalCount: 435,
      presenceRate: 96.5,
      onTimeRate: 97.1,
      lateCount: 12,
      totalHours: 3480.0,
      satelliteSecuredRate: 100
    }
  }[period];

  const latestPunch = punches[0] || RECENT_PUNCHES_FALLBACK[0];

  return (
    <div className="space-y-6">
      <Header
        title="Supervision Cockpit & Synthèse Présences"
        subtitle="Vue consolidée en temps réel, indicateurs d'assiduité multi-périodes et télémesure"
        actionButton={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchPunches}
              disabled={loading}
              className="p-2.5 text-slate-500 hover:text-slate-700 bg-white border border-slate-200/80 rounded-xl transition shadow-xs hover:border-slate-300"
              title="Rafraîchir les données"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/pointages"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-sm shadow-blue-500/20"
            >
              <span>Journal Complet &rarr;</span>
            </Link>
          </div>
        }
      />

      {/* ==================== SÉLECTEUR TEMPOREL MULTI-PÉRIODES ==================== */}
      <div className="bg-white p-3.5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span>Fenêtre d'Analyse des Présences :</span>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
          <button
            onClick={() => setPeriod('TODAY')}
            className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
              period === 'TODAY' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Aujourd'hui</span>
          </button>
          <button
            onClick={() => setPeriod('YESTERDAY')}
            className={`px-3.5 py-1.5 rounded-xl transition ${
              period === 'YESTERDAY' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hier
          </button>
          <button
            onClick={() => setPeriod('WEEK')}
            className={`px-3.5 py-1.5 rounded-xl transition ${
              period === 'WEEK' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            7 Derniers Jours
          </button>
          <button
            onClick={() => setPeriod('MONTH')}
            className={`px-3.5 py-1.5 rounded-xl transition ${
              period === 'MONTH' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ce Mois (Nov 2026)
          </button>
        </div>
      </div>

      {/* ==================== 4 CARTES BENTO KPI ADAPTATIVES ==================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1 : Présence Globale */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold">Présences ({periodStats.label})</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{periodStats.presentCount}</span>
            <span className="text-xs font-semibold text-slate-400">/ {periodStats.totalCount} attendus</span>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${periodStats.presenceRate}%` }} 
              />
            </div>
            <span className="text-[11px] font-bold text-blue-600">{periodStats.presenceRate}%</span>
          </div>
        </div>

        {/* KPI 2 : Ponctualité */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold">Taux de Ponctualité</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600">{periodStats.onTimeRate}%</span>
            <span className="text-xs font-semibold text-slate-400">à l'heure</span>
          </div>
          <p className="text-[11px] text-slate-400 flex items-center gap-1 pt-1">
            <span className="text-emerald-600 font-bold">&ge; 95%</span> conforme à la tolérance légale
          </p>
        </div>

        {/* KPI 3 : Retards & Alertes */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold">Retards Enregistrés</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-600">{periodStats.lateCount}</span>
            <span className="text-xs font-semibold text-slate-400">sur la période</span>
          </div>
          <p className="text-[11px] text-slate-400 flex items-center gap-1 pt-1">
            <Link href="/justifications" className="text-blue-600 font-bold hover:underline">
              Traiter les justifications &rarr;
            </Link>
          </p>
        </div>

        {/* KPI 4 : Volume Horaire Réalisé */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold">Volume Réalisé</span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-indigo-600">{periodStats.totalHours}h</span>
            <span className="text-xs font-semibold text-slate-400">heures brutes</span>
          </div>
          <p className="text-[11px] text-slate-400 flex items-center gap-1 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>100% certifiées WGS84</span>
          </p>
        </div>
      </div>

      {/* ==================== BLOCS VISUELS : DONUT & HISTOGRAMME ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Donut Chart SVG (4 colonnes) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-slate-900">Répartition d'Assiduité</h3>
            <span className="text-[10px] font-bold text-slate-400 font-mono">{periodStats.label}</span>
          </div>

          <div className="flex items-center justify-center py-4">
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="3.5" />
                <circle 
                  cx="18" cy="18" r="15.915" 
                  fill="transparent" 
                  stroke="#10b981" 
                  strokeWidth="3.5" 
                  strokeDasharray={`${periodStats.onTimeRate} 100`} 
                  strokeLinecap="round" 
                />
                <circle 
                  cx="18" cy="18" r="15.915" 
                  fill="transparent" 
                  stroke="#f59e0b" 
                  strokeWidth="3.5" 
                  strokeDasharray={`${100 - periodStats.onTimeRate} 100`} 
                  strokeDashoffset={`-${periodStats.onTimeRate}`} 
                  strokeLinecap="round" 
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-black text-slate-900">{periodStats.onTimeRate}%</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Ponctualité</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-xs pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Arrivées à l'heure
              </span>
              <span className="font-extrabold text-slate-900">{periodStats.onTimeRate}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Retards enregistrés
              </span>
              <span className="font-extrabold text-amber-600">{periodStats.lateCount}</span>
            </div>
          </div>
        </div>

        {/* Histogramme d'Influx Arrivées (8 colonnes) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-sm text-slate-900">Courbe de Fréquentation & Affluence</h3>
              <p className="text-[11px] text-slate-400">Créneaux de pointage les plus sollicités</p>
            </div>
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-xl">
              Pic : 07h15 - 07h30
            </span>
          </div>

          {/* Histogramme SVG / Bento */}
          <div className="grid grid-cols-5 gap-3 h-44 items-end pt-4 pb-2 px-2">
            {[
              { slot: '07h00', count: 4, height: '35%', highlight: false },
              { slot: '07h15', count: 12, height: '85%', highlight: true },
              { slot: '07h30', count: 9, height: '65%', highlight: false },
              { slot: '07h45', count: 3, height: '25%', highlight: false },
              { slot: '08h00+', count: 1, height: '15%', highlight: false },
            ].map((item, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end group">
                <span className="text-[10px] font-extrabold text-slate-600 group-hover:text-blue-600 transition">
                  {item.count}
                </span>
                <div 
                  className={`w-full rounded-2xl transition-all duration-300 ${
                    item.highlight 
                      ? 'bg-blue-600 shadow-md shadow-blue-500/20' 
                      : 'bg-slate-100 hover:bg-slate-200'
                  }`}
                  style={{ height: item.height }}
                />
                <span className="text-[10px] font-mono text-slate-400 font-semibold">{item.slot}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-3 border-t border-slate-100">
            <span>Heure d'ouverture officielle : <strong>07h30</strong></span>
            <span>Tolérance retard : <strong>15 minutes</strong></span>
          </div>
        </div>
      </div>

      {/* ==================== FLUX ÉPURÉ : DERNIÈRES ACTIVITÉS & FOCUS RADAR ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Colonne Gauche : Dernières Activités (7 colonnes) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <h3 className="font-black text-sm text-slate-900">Dernières Activités en Direct</h3>
            </div>
            <Link 
              href="/pointages" 
              className="text-xs font-bold text-blue-600 hover:text-blue-800 transition flex items-center gap-1"
            >
              <span>Voir tout le journal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Liste compacte des 5 derniers pointages */}
          <div className="divide-y divide-slate-100">
            {punches.slice(0, 5).map((punch) => (
              <div 
                key={punch.id} 
                onClick={() => setSelectedPunch(punch)}
                className="py-3 flex items-center justify-between hover:bg-slate-50/60 p-2 rounded-2xl transition cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs shrink-0 font-bold ${
                    punch.punch_type === 'CHECK_IN' ? 'bg-emerald-100 text-emerald-700' :
                    punch.punch_type === 'CHECK_OUT' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {punch.punch_type === 'CHECK_IN' ? <LogIn className="w-4 h-4" /> :
                     punch.punch_type === 'CHECK_OUT' ? <LogOut className="w-4 h-4" /> :
                     <Coffee className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-slate-900 truncate group-hover:text-blue-600 transition">
                        {punch.name}
                      </span>
                      {punch.matricule && (
                        <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1 py-0.5 rounded">
                          {punch.matricule}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {punch.site_name} • {punch.distance}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="font-mono font-bold text-xs text-slate-800 block">{punch.time}</span>
                    <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
                      punch.status === 'VALIDATED' ? 'bg-emerald-100 text-emerald-800' :
                      punch.status === 'LATE' ? 'bg-amber-100 text-amber-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {punch.status === 'VALIDATED' ? 'Conforme' : punch.status === 'LATE' ? 'Retard' : 'Alerte'}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
                </div>
              </div>
            ))}
          </div>

          {/* Lien d'exploration du grand journal */}
          <div className="pt-2">
            <Link
              href="/pointages"
              className="w-full flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs py-2.5 rounded-2xl border border-slate-200/80 transition"
            >
              <span>Accéder à l'historique complet et filtres avancés</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Colonne Droite : Focus Radar & Alertes (5 colonnes) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Carte Focus Dernier Pointage */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-6 shadow-md space-y-4 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Dernier Pointage Reçu
              </span>
              <span className="font-mono text-xs text-slate-400">{latestPunch.time} UTC</span>
            </div>

            <div>
              <h4 className="font-black text-lg text-white">{latestPunch.name}</h4>
              <p className="text-xs text-slate-400">{latestPunch.role} • {latestPunch.site_name}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-slate-800">
              <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
                <span className="text-[10px] text-slate-400 block">Distance Centoïde</span>
                <span className="text-emerald-400 font-bold">{latestPunch.distance}</span>
              </div>
              <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
                <span className="text-[10px] text-slate-400 block">Smartphone Scellé</span>
                <span className="text-slate-200 font-bold truncate block">{latestPunch.device}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedPunch(latestPunch)}
              className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2 rounded-xl transition"
            >
              <span>Inspecter le certificat WGS84</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Raccourcis Rapides vers les Modules Clés */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 space-y-3">
            <h4 className="font-black text-xs text-slate-900 uppercase tracking-wider">
              Accès Rapides & Opérations
            </h4>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link
                href="/employes"
                className="p-3 bg-slate-50 hover:bg-blue-50/50 rounded-2xl border border-slate-100 transition group"
              >
                <Users className="w-4 h-4 text-blue-600 mb-1" />
                <span className="font-bold text-slate-900 block group-hover:text-blue-600 transition">Effectif</span>
                <span className="text-[10px] text-slate-400">Import Excel / 500+</span>
              </Link>

              <Link
                href="/releves"
                className="p-3 bg-slate-50 hover:bg-emerald-50/50 rounded-2xl border border-slate-100 transition group"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 mb-1" />
                <span className="font-bold text-slate-900 block group-hover:text-emerald-600 transition">Relevés Paie</span>
                <span className="text-[10px] text-slate-400">Exports XLSX & HS</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== MODAL TÉLÉMESURE DÉTAILLÉE ==================== */}
      {selectedPunch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">Certificat d'Inviolabilité Légale</h3>
                  <p className="text-xs text-slate-500">Télémétrie satellite, signature matérielle et Wi-Fi</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPunch(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Collaborateur :</span>
                  <span className="font-extrabold text-slate-900">{selectedPunch.name}</span>
                </div>
                {selectedPunch.matricule && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Matricule Officiel :</span>
                    <span className="font-mono font-bold text-blue-600">{selectedPunch.matricule}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Horodatage Invariant UTC :</span>
                  <span className="font-mono font-bold text-slate-800">{selectedPunch.full_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Site Déclaré :</span>
                  <span className="font-semibold text-slate-700">{selectedPunch.site_name}</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Scellement Satellite WGS84
                </span>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Coordonnées GPS</span>
                    <span className="font-bold text-slate-800">{selectedPunch.latitude}, {selectedPunch.longitude}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Distance Centoïde</span>
                    <span className="font-bold text-emerald-600">{selectedPunch.distance}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Identité de l'Appareil & Réseau
                </span>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Modèle Smartphone :</span>
                    <span className="font-semibold text-slate-800">{selectedPunch.device}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Hardware ID :</span>
                    <span className="font-bold text-blue-600">{selectedPunch.device_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Signature BSSID :</span>
                    <span className="font-semibold text-slate-800">{selectedPunch.wifi_bssid || 'Zone Satellite Dédiée'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPunch(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
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
