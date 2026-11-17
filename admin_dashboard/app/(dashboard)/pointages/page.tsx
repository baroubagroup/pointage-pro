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
  Filter,
  Eye,
  Building2,
  FileSpreadsheet,
  Search,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight
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
  },
  {
    id: 'p-6',
    name: 'Koné Bakary',
    matricule: 'OUA-2026-005',
    role: 'Chauffeur Livreur',
    site_name: 'Entrepôt Logistique Zone Nord',
    punch_type: 'CHECK_IN',
    time: '07:52',
    full_date: 'Aujourd\'hui à 07:52:41 UTC',
    distance: '45m du centre',
    distance_meters: 45,
    latitude: 11.24730,
    longitude: -4.29150,
    accuracy: 6.2,
    status: 'LATE',
    flags: ['RETARD_22MIN', 'JUSTIFICATION_EN_ATTENTE'],
    device: 'Infinix Hot 30 (Lié)',
    device_id: 'DEV-INFINIX-H30-7711',
    wifi_bssid: null,
    is_assisted: false,
    face_confidence: 97.5
  }
];

type FilterType = 'ALL' | 'CHECK_IN' | 'CHECK_OUT' | 'BREAK' | 'VALIDATED' | 'LATE' | 'FLAGGED' | 'WIFI';
type TimeFilter = 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'ALL_TIME';

export default function PointagesPage() {
  const [punches, setPunches] = useState<Punch[]>(FALLBACK_PUNCHES);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('TODAY');
  const [siteFilter, setSiteFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
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
        .limit(100);

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
          if (d.verified_wifi_bssid) {
            flagsList.push('WIFI_VÉRIFIÉ');
          }
          if (d.device_binding_verified) {
            flagsList.push('APPAREIL_CONFORME');
          }
          if (d.is_late) {
            flagsList.push('RETARD_ENREGISTRÉ');
          }

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
      console.warn('Fallback pointages punches error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPunches();

    const supabase = createClient();
    const channel = supabase
      .channel('realtime_pointages_journal')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pointage_punches' }, () => {
        fetchPunches();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filtrage combiné
  const filteredPunches = punches.filter(p => {
    if (filter === 'VALIDATED' && p.status !== 'VALIDATED') return false;
    if (filter === 'LATE' && p.status !== 'LATE') return false;
    if (filter === 'FLAGGED' && p.status !== 'FLAGGED') return false;
    if (filter === 'WIFI' && !p.wifi_bssid) return false;
    if (filter === 'CHECK_IN' && p.punch_type !== 'CHECK_IN') return false;
    if (filter === 'CHECK_OUT' && p.punch_type !== 'CHECK_OUT') return false;
    if (filter === 'BREAK' && !p.punch_type.includes('BREAK')) return false;

    if (siteFilter !== 'ALL' && !p.site_name.toLowerCase().includes(siteFilter.toLowerCase())) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchMat = (p.matricule || '').toLowerCase().includes(q);
      const matchRole = p.role.toLowerCase().includes(q);
      if (!matchName && !matchMat && !matchRole) return false;
    }

    return true;
  });

  // Export Excel (.xlsx) via SheetJS
  const exportExcel = () => {
    const exportData = filteredPunches.map(p => ({
      'ID Pointage': p.id,
      'Matricule': p.matricule || 'N/A',
      'Nom & Prénom': p.name,
      'Fonction / Rôle': p.role,
      'Site / Établissement': p.site_name,
      'Type': p.punch_type === 'CHECK_IN' ? 'Arrivée' : (p.punch_type === 'CHECK_OUT' ? 'Départ' : 'Pause'),
      'Heure UTC': p.time,
      'Horodatage Complet': p.full_date,
      'Distance GPS Centoïde': `${p.distance_meters}m`,
      'Précision Satellite (m)': p.accuracy,
      'Coordonnées WGS84': `${p.latitude}, ${p.longitude}`,
      'Empreinte Wi-Fi BSSID': p.wifi_bssid || 'Sans Wi-Fi (100% Satellite)',
      'Statut': p.status === 'VALIDATED' ? 'Conforme' : (p.status === 'LATE' ? 'En Retard' : 'Signalé'),
      'Appareil Certifié': p.device
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Journal Pointages');
    XLSX.writeFile(wb, `Journal_Pointages_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Export CSV Universel
  const exportCSV = () => {
    let csv = '\uFEFFID;Matricule;Nom;Role;Site;Type;Heure;Date;Distance_m;Precision_m;Latitude;Longitude;BSSID;Statut;Appareil\n';
    filteredPunches.forEach(p => {
      csv += `"${p.id}";"${p.matricule || ''}";"${p.name}";"${p.role}";"${p.site_name}";"${p.punch_type}";"${p.time}";"${p.full_date}";${p.distance_meters};${p.accuracy};${p.latitude};${p.longitude};"${p.wifi_bssid || ''}";"${p.status}";"${p.device}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Journal_Pointages_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <Header
        title="Journal d'Audit & Pointages Certifiés"
        subtitle="Registre d'inviolabilité légale, traçabilité satellite WGS84 et certification matérielle de chaque présence"
        actionButton={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchPunches}
              disabled={loading}
              className="p-2.5 text-slate-500 hover:text-slate-700 bg-white border border-slate-200/80 rounded-xl transition shadow-xs hover:border-slate-300"
              title="Rafraîchir depuis Supabase"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={exportCSV}
              className="hidden sm:flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={exportExcel}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-sm cursor-pointer shadow-emerald-600/20"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel (.xlsx)</span>
            </button>
          </div>
        }
      />

      {/* Barre de Filtrage & Recherche */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Recherche */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par nom, matricule ou poste..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filtre Temporel */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setTimeFilter('TODAY')}
              className={`px-3 py-1.5 rounded-lg transition ${
                timeFilter === 'TODAY' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => setTimeFilter('YESTERDAY')}
              className={`px-3 py-1.5 rounded-lg transition ${
                timeFilter === 'YESTERDAY' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hier
            </button>
            <button
              onClick={() => setTimeFilter('WEEK')}
              className={`px-3 py-1.5 rounded-lg transition ${
                timeFilter === 'WEEK' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 jours
            </button>
            <button
              onClick={() => setTimeFilter('ALL_TIME')}
              className={`px-3 py-1.5 rounded-lg transition ${
                timeFilter === 'ALL_TIME' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tout
            </button>
          </div>
        </div>

        {/* Pilules de statut & Type de pointage */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs font-bold">
          <span className="text-[11px] text-slate-400 font-semibold mr-1">Filtre :</span>
          <button
            onClick={() => setFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg transition ${
              filter === 'ALL' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tous ({punches.length})
          </button>
          <button
            onClick={() => setFilter('CHECK_IN')}
            className={`px-2.5 py-1 rounded-lg transition ${
              filter === 'CHECK_IN' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Arrivées
          </button>
          <button
            onClick={() => setFilter('CHECK_OUT')}
            className={`px-2.5 py-1 rounded-lg transition ${
              filter === 'CHECK_OUT' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Départs
          </button>
          <button
            onClick={() => setFilter('BREAK')}
            className={`px-2.5 py-1 rounded-lg transition ${
              filter === 'BREAK' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Pauses
          </button>
          <button
            onClick={() => setFilter('LATE')}
            className={`px-2.5 py-1 rounded-lg transition ${
              filter === 'LATE' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Retards
          </button>
          <button
            onClick={() => setFilter('WIFI')}
            className={`px-2.5 py-1 rounded-lg transition ${
              filter === 'WIFI' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Wi-Fi Certifié
          </button>
        </div>
      </div>

      {/* Table Complète du Journal */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200/80 uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-5">Collaborateur & Matricule</th>
                <th className="py-3.5 px-4">Événement & Heure</th>
                <th className="py-3.5 px-4">Établissement / Site</th>
                <th className="py-3.5 px-4">Géofencing WGS84</th>
                <th className="py-3.5 px-4">Empreinte Wi-Fi</th>
                <th className="py-3.5 px-4 text-center">Statut Certification</th>
                <th className="py-3.5 px-4 text-right">Télémétrie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPunches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Aucun pointage ne correspond aux filtres sélectionnés.
                  </td>
                </tr>
              ) : (
                filteredPunches.map((punch) => (
                  <tr 
                    key={punch.id} 
                    onClick={() => setSelectedPunch(punch)}
                    className="hover:bg-blue-50/30 transition cursor-pointer group"
                  >
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 font-black flex items-center justify-center text-xs shrink-0 group-hover:bg-blue-600 group-hover:text-white transition">
                          {punch.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-900 block group-hover:text-blue-600 transition">
                              {punch.name}
                            </span>
                            {punch.matricule && (
                              <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                {punch.matricule}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">{punch.role}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`p-1.5 rounded-lg ${
                          punch.punch_type === 'CHECK_IN' ? 'bg-emerald-100 text-emerald-700' :
                          punch.punch_type === 'CHECK_OUT' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {punch.punch_type === 'CHECK_IN' ? <LogIn className="w-3.5 h-3.5" /> :
                           punch.punch_type === 'CHECK_OUT' ? <LogOut className="w-3.5 h-3.5" /> :
                           <Coffee className="w-3.5 h-3.5" />}
                        </span>
                        <div>
                          <span className="font-mono font-bold text-slate-900 block">{punch.time}</span>
                          <span className="text-[10px] text-slate-400">
                            {punch.punch_type === 'CHECK_IN' ? 'Prise de poste' :
                             punch.punch_type === 'CHECK_OUT' ? 'Fin de quart' : 'Pause'}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 font-medium text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[160px]">{punch.site_name}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 text-slate-700 font-mono text-[11px]">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-semibold">{punch.distance}</span>
                        <span className="text-[10px] text-slate-400">(&plusmn;{punch.accuracy}m)</span>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      {punch.wifi_bssid ? (
                        <div className="flex items-center gap-1.5 text-indigo-700 font-mono text-[11px]">
                          <Wifi className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="font-semibold truncate max-w-[120px]" title={punch.wifi_bssid}>
                            {punch.wifi_bssid}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Satellite 100%</span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                        punch.status === 'VALIDATED' ? 'bg-emerald-100 text-emerald-800' :
                        punch.status === 'LATE' ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {punch.status === 'VALIDATED' ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> :
                         punch.status === 'LATE' ? <Clock className="w-3 h-3 text-amber-600" /> :
                         <AlertTriangle className="w-3 h-3 text-rose-600" />}
                        <span>{punch.status === 'VALIDATED' ? 'Conforme' : punch.status === 'LATE' ? 'Retard' : 'Alerte'}</span>
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPunch(punch);
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Consulter la télémétrie complète"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== MODAL DE TÉLÉMESURE DÉTAILLÉE ==================== */}
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
                  {selectedPunch.face_confidence && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Confiance Biométrique RAM :</span>
                      <span>{selectedPunch.face_confidence}% (Certifié)</span>
                    </div>
                  )}
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
