'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { RealQrCode } from '@/components/real-qr-code';
import * as XLSX from 'xlsx';
import {
  Smartphone,
  Users,
  MapPin,
  ShieldCheck,
  Clock,
  Bell,
  CheckCircle2,
  QrCode,
  Send,
  Search,
  ChevronRight,
  ChevronLeft,
  Wifi,
  BatteryMedium,
  Signal,
  Activity,
  Check,
  X,
  Radio,
  FileSpreadsheet,
  Building2,
  Sparkles,
  MessageCircle,
  Maximize2,
  Copy,
  Menu,
  LogOut,
  Plus,
  CalendarDays,
  Unlink,
  Navigation,
  Download,
  Printer,
  Coffee,
  Trash2,
  Edit3,
  Fingerprint,
  Link2
} from 'lucide-react';

const DynamicSiteGeofenceMap = dynamic(
  () => import('@/components/site-geofence-map').then((mod) => mod.SiteGeofenceMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-52 rounded-2xl bg-slate-100 flex items-center justify-center border border-slate-200 text-[11px] text-slate-500">
        Chargement de la vue satellite...
      </div>
    )
  }
);

interface WifiEntry {
  ssid: string;
  bssid?: string;
  source: 'detected' | 'manual';
}

interface DisplayPunch {
  id: string;
  name: string;
  matricule: string;
  time: string;
  type: string;
  site: string;
  distance: string;
  status: 'VALIDATED' | 'LATE' | 'ALERT';
  avatarColor: string;
  device: string;
  wifiUsed?: string;
}

interface DisplayJustif {
  id: string;
  name: string;
  time: string;
  delayMinutes: number;
  reason: string;
  category: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

interface DayDetail {
  dateKey: string;
  dateLabel: string;
  firstTime: string;
  lastTime: string | null;
  lateMinutes: number;
  workedMinutes: number;
  status: 'ON_TIME' | 'LATE' | 'ALERT' | 'SINGLE';
  siteName: string;
}

interface EmployeeHrSummary {
  employee: any;
  presentDays: number;
  lateDays: number;
  totalLateMinutes: number;
  totalWorkedMinutes: number;
  punctualityRate: number;
  days: DayDetail[];
}

const DAY_LABELS = [
  { id: 1, short: 'L', full: 'Lun' },
  { id: 2, short: 'M', full: 'Mar' },
  { id: 3, short: 'M', full: 'Mer' },
  { id: 4, short: 'J', full: 'Jeu' },
  { id: 5, short: 'V', full: 'Ven' },
  { id: 6, short: 'S', full: 'Sam' },
  { id: 7, short: 'D', full: 'Dim' }
];

function toDateInputString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDateDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return toDateInputString(d);
}

function parseHHMMToMinutes(hhmm?: string | null): number | null {
  if (!hhmm) return null;
  const parts = hhmm.split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function formatMinutesAsHours(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(m / 60);
  const mins = m % 60;
  return `${hours}h ${String(mins).padStart(2, '0')}m`;
}

function formatLateMinutes(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  if (m === 0) return '0 min';
  if (m < 60) return `${m} min`;
  const hours = Math.floor(m / 60);
  const mins = m % 60;
  return `${hours}h ${String(mins).padStart(2, '0')}m`;
}

export default function MaquetteGerantPage() {
  // Mode de cadrage & Détection mobile réelle
  const [deviceFrame, setDeviceFrame] = useState<'iphone' | 'android' | 'fullscreen'>('iphone');
  const [isMobileScreen, setIsMobileScreen] = useState(false);

  // 5 Onglets principaux de navigation mobile
  const [activeTab, setActiveTab] = useState<'cockpit' | 'sites' | 'equipe' | 'plannings' | 'justifs'>('cockpit');

  // Filtres
  const [filterType, setFilterType] = useState<'ALL' | 'PRESENT' | 'LATE' | 'ALERT'>('ALL');
  const [searchEmployeeQuery, setSearchEmployeeQuery] = useState('');
  const [currentTime, setCurrentTime] = useState('09:41');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Menu Sandwich Dirigeant
  const [isSandwichOpen, setIsSandwichOpen] = useState(false);

  // Modales d'actions complètes (Parité 100% avec le Web)
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showAddSiteModal, setShowAddSiteModal] = useState(false);
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState<any | null>(null);
  const [showRelevesDrawer, setShowRelevesDrawer] = useState(false);
  const [showSecurityDrawer, setShowSecurityDrawer] = useState(false);
  const [showAuditDrawer, setShowAuditDrawer] = useState(false);
  const [showPhoneQrModal, setShowPhoneQrModal] = useState(false);

  // Journal d'Audit Inviolable
  const [auditEntries, setAuditEntries] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditChainIntact, setAuditChainIntact] = useState<boolean>(true);
  const [auditStorageMode, setAuditStorageMode] = useState<'supabase_immutable' | 'local_ledger'>('local_ledger');
  const [auditNeedsSql, setAuditNeedsSql] = useState<boolean>(false);
  const [auditFilter, setAuditFilter] = useState<'ALL' | 'AUTH' | 'SITES_SEC' | 'OPS'>('ALL');

  // Formulaires Employé
  const [broadcastText, setBroadcastText] = useState('');
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpPhone, setNewEmpPhone] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('Collaborateur');
  const [newEmpSiteId, setNewEmpSiteId] = useState('');
  const [newEmpScheduleId, setNewEmpScheduleId] = useState('');

  // Formulaire Site & Géofencing (2 modes GPS + Vue Satellite + Multi-Wi-Fi)
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [confirmDeleteSiteId, setConfirmDeleteSiteId] = useState<string | null>(null);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteCity, setNewSiteCity] = useState('Bobo-Dioulasso');
  const [newSiteRadius, setNewSiteRadius] = useState<number>(80);
  const [gpsMode, setGpsMode] = useState<'current' | 'custom'>('current');
  const [newSiteLat, setNewSiteLat] = useState<string>('11.247051');
  const [newSiteLon, setNewSiteLon] = useState<string>('-4.291915');
  const [gpsAccuracyMeters, setGpsAccuracyMeters] = useState<number | null>(null);
  const [gpsStatusNote, setGpsStatusNote] = useState<string | null>(null);
  const [mapResolvedAddress, setMapResolvedAddress] = useState<string | null>(null);
  const [mapsLinkInput, setMapsLinkInput] = useState<string>('');
  const [isResolvingMapsLink, setIsResolvingMapsLink] = useState(false);
  const gpsWatchRef = useRef<number | null>(null);

  const [newSiteHasWifi, setNewSiteHasWifi] = useState<boolean>(true);
  const [siteWifiList, setSiteWifiList] = useState<WifiEntry[]>([]);
  const [wifiAddMode, setWifiAddMode] = useState<'detect' | 'manual'>('detect');
  const [manualWifiSsid, setManualWifiSsid] = useState<string>('');
  const [manualWifiBssid, setManualWifiBssid] = useState<string>('');
  const [isCalibratingGps, setIsCalibratingGps] = useState(false);
  const [isDetectingWifi, setIsDetectingWifi] = useState(false);
  const [wifiDetectNote, setWifiDetectNote] = useState<string | null>(null);

  // Formulaire Couloir Horaire (Arrivée/Départ activables + Pause optionnelle + Jours)
  const [newSchedName, setNewSchedName] = useState('');
  const [schedTrackArrival, setSchedTrackArrival] = useState<boolean>(true);
  const [newSchedMorningStart, setNewSchedMorningStart] = useState('08:00');
  const [schedTrackDeparture, setSchedTrackDeparture] = useState<boolean>(true);
  const [newSchedAfternoonEnd, setNewSchedAfternoonEnd] = useState('17:00');
  const [schedHasBreak, setSchedHasBreak] = useState<boolean>(false);
  const [newSchedBreakStart, setNewSchedBreakStart] = useState('12:00');
  const [newSchedBreakEnd, setNewSchedBreakEnd] = useState('13:30');
  const [newSchedTolerance, setNewSchedTolerance] = useState<number>(15);
  const [newSchedDays, setNewSchedDays] = useState<number[]>([1, 2, 3, 4, 5]);

  // Relevés & Synthèse RH (7 jours, 1 mois, ou plage libre Du/Au)
  const [hrPreset, setHrPreset] = useState<'7d' | '30d' | 'custom'>('30d');
  const [hrStartDate, setHrStartDate] = useState<string>(() => getDateDaysAgo(29));
  const [hrEndDate, setHrEndDate] = useState<string>(() => toDateInputString(new Date()));
  const [hrLogs, setHrLogs] = useState<any[]>([]);
  const [hrLoading, setHrLoading] = useState(false);
  const [selectedHrEmployeeId, setSelectedHrEmployeeId] = useState<string | null>(null);
  const [hrDetailFilter, setHrDetailFilter] = useState<'ALL' | 'LATE'>('ALL');

  const [localNetworkIp, setLocalNetworkIp] = useState<string>('192.168.11.103');
  const [showDynamicIslandAlert, setShowDynamicIslandAlert] = useState(false);
  const [islandMessage, setIslandMessage] = useState('🟢 Tous les sites opérationnels');

  // Données de l'organisation
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState('NAFA BUSINESS');
  const [orgCode, setOrgCode] = useState('ORG-NB-2026-3653TB');

  // Données réelles chargées depuis Supabase
  const [loadingDb, setLoadingDb] = useState(true);
  const [dbEmployees, setDbEmployees] = useState<any[]>([]);
  const [dbEstablishments, setDbEstablishments] = useState<any[]>([]);
  const [dbSchedules, setDbSchedules] = useState<any[]>([]);
  const [dbJustifications, setDbJustifications] = useState<any[]>([]);
  const [dbPunches, setDbPunches] = useState<any[]>([]);

  // Politique de sécurité réelle synchronisée avec pointage_organizations.security_config
  const [orgSecurityConfigRaw, setOrgSecurityConfigRaw] = useState<Record<string, any>>({});
  const [secBiometricsRequired, setSecBiometricsRequired] = useState(true);
  const [secMockGpsBlocked, setSecMockGpsBlocked] = useState(true);
  const [secDeviceBindingStrict, setSecDeviceBindingStrict] = useState(true);
  const [secWifiMandatory, setSecWifiMandatory] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);

  // Détection écran mobile réel
  useEffect(() => {
    const checkScreen = () => {
      const isMob = /iphone|ipad|ipod|android/i.test(navigator.userAgent) || window.innerWidth < 768;
      setIsMobileScreen(isMob);
      if (window.innerWidth < 768) {
        setDeviceFrame('fullscreen');
      }
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  const getPublicUrl = (path: string) => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      if (!origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        return `${origin}${path}`;
      }
      return `http://${localNetworkIp || '192.168.11.103'}:3000${path}`;
    }
    return `http://192.168.11.103:3000${path}`;
  };

  // Horloge dynamique
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${h}:${m}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // 1. Chargement des données réelles depuis Supabase
  const loadLiveSupabaseData = async () => {
    setLoadingDb(true);
    try {
      fetch('/api/network/info')
        .then(r => r.json())
        .then(d => { if (d && d.localIp) setLocalNetworkIp(d.localIp); })
        .catch(() => {});

      const supabase = createClient();
      const storedOrgId = typeof window !== 'undefined' ? localStorage.getItem('pointage_org_id') : null;
      const storedOrgCode = typeof window !== 'undefined' ? localStorage.getItem('pointage_org_code') : null;

      // A. Organisation active
      let orgQuery = supabase.from('pointage_organizations').select('*');
      if (storedOrgId) {
        orgQuery = orgQuery.eq('id', storedOrgId);
      } else if (storedOrgCode) {
        orgQuery = orgQuery.eq('org_code', storedOrgCode);
      } else {
        orgQuery = orgQuery.order('created_at', { ascending: false }).limit(1);
      }
      const { data: orgData } = await orgQuery.maybeSingle();

      let targetOrgId = storedOrgId;
      if (orgData) {
        targetOrgId = orgData.id;
        setOrgId(orgData.id);
        setOrgName(orgData.name);
        setOrgCode(orgData.org_code);
        if (orgData.security_config && typeof orgData.security_config === 'object') {
          const sc = orgData.security_config;
          setOrgSecurityConfigRaw(sc);
          setSecBiometricsRequired(sc.require_biometrics !== false);
          setSecMockGpsBlocked(sc.hard_block_mock_gps !== false);
          setSecDeviceBindingStrict(sc.require_device_binding !== false);
          setSecWifiMandatory(sc.require_wifi_bssid === true);
        }
      }

      // B. Établissements réels
      let estQuery = supabase.from('pointage_establishments').select('*').eq('is_active', true);
      if (targetOrgId) {
        estQuery = estQuery.eq('org_id', targetOrgId);
      }
      const { data: estData } = await estQuery.order('created_at');
      if (estData) {
        setDbEstablishments(estData);
        if (estData.length > 0 && !newEmpSiteId) {
          setNewEmpSiteId(estData[0].id);
        }
      }

      // C. Plannings réels
      let schedQuery = supabase.from('pointage_schedules').select('*').eq('is_active', true);
      if (targetOrgId) {
        schedQuery = schedQuery.eq('org_id', targetOrgId);
      }
      const { data: schedData } = await schedQuery.order('created_at');
      if (schedData) {
        setDbSchedules(schedData);
        if (schedData.length > 0 && !newEmpScheduleId) {
          setNewEmpScheduleId(schedData[0].id);
        }
      }

      // D. Employés réels
      let empQuery = supabase
        .from('pointage_employees')
        .select('*, pointage_establishments(name), pointage_schedules(name, morning_start, afternoon_end, tolerance_minutes)')
        .eq('is_active', true);
      if (targetOrgId) {
        empQuery = empQuery.eq('org_id', targetOrgId);
      }
      const { data: empsData } = await empQuery.order('full_name');
      if (empsData) {
        setDbEmployees(empsData);
      }

      // E. Justifications réelles (filtrées par organisation)
      let justQuery = supabase
        .from('pointage_justifications')
        .select('*, pointage_employees(full_name, employee_matricule, phone)')
        .order('created_at', { ascending: false })
        .limit(30);
      if (targetOrgId) {
        justQuery = justQuery.eq('org_id', targetOrgId);
      }
      const { data: justData } = await justQuery;
      if (justData) {
        setDbJustifications(justData);
      }

      // F. Pointages récents pour le cockpit
      let logsQuery = supabase
        .from('pointage_logs')
        .select('*, pointage_employees(full_name, employee_matricule, role), pointage_establishments(name)')
        .order('recorded_at_utc', { ascending: false })
        .limit(80);
      if (targetOrgId) {
        logsQuery = logsQuery.eq('org_id', targetOrgId);
      }
      const { data: logsData } = await logsQuery;
      if (logsData) {
        setDbPunches(logsData);
      }
    } catch (err) {
      console.warn('Erreur chargement Supabase mobile:', err);
    } finally {
      setLoadingDb(false);
    }
  };

  useEffect(() => {
    loadLiveSupabaseData();
  }, []);

  // Chargement spécifique des logs pour la plage de dates des Relevés RH
  const fetchHrLogsForRange = async (startStr: string, endStr: string) => {
    setHrLoading(true);
    try {
      const supabase = createClient();
      const targetOrgId = orgId || (typeof window !== 'undefined' ? localStorage.getItem('pointage_org_id') : null);
      const startIso = `${startStr}T00:00:00.000Z`;
      const endIso = `${endStr}T23:59:59.999Z`;

      let query = supabase
        .from('pointage_logs')
        .select('*, pointage_establishments(name)')
        .gte('recorded_at_utc', startIso)
        .lte('recorded_at_utc', endIso)
        .order('recorded_at_utc', { ascending: false });

      if (targetOrgId) {
        query = query.eq('org_id', targetOrgId);
      }
      const { data } = await query;
      if (data) {
        setHrLogs(data);
      }
    } catch (err) {
      console.warn('Erreur chargement logs RH:', err);
    } finally {
      setHrLoading(false);
    }
  };

  useEffect(() => {
    if (showRelevesDrawer) {
      fetchHrLogsForRange(hrStartDate, hrEndDate);
    }
  }, [showRelevesDrawer, hrStartDate, hrEndDate, orgId]);

  const applyHrPreset = (preset: '7d' | '30d' | 'custom') => {
    setHrPreset(preset);
    const today = toDateInputString(new Date());
    if (preset === '7d') {
      setHrStartDate(getDateDaysAgo(6));
      setHrEndDate(today);
    } else if (preset === '30d') {
      setHrStartDate(getDateDaysAgo(29));
      setHrEndDate(today);
    }
  };

  const activeEstablishment = dbEstablishments[0] || null;

  // 2. Transformation des pointages DB pour le flux Cockpit
  const punches: DisplayPunch[] = useMemo(() => {
    if (dbPunches.length === 0) return [];

    const avatarColors = [
      'from-blue-600 to-indigo-600',
      'from-emerald-600 to-teal-600',
      'from-amber-600 to-yellow-600',
      'from-orange-600 to-amber-700',
      'from-rose-600 to-red-700',
      'from-purple-600 to-violet-700'
    ];

    return dbPunches.map((p, idx) => {
      const punchDate = new Date(p.recorded_at_utc || p.created_at);
      const timeStr = punchDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const empName = p.pointage_employees?.full_name || 'Collaborateur';
      const matricule = p.pointage_employees?.employee_matricule || `MAT-${String(idx + 1).padStart(3, '0')}`;
      const dist = Math.round(p.distance_to_site_meters || 0);

      let status: 'VALIDATED' | 'LATE' | 'ALERT' = 'VALIDATED';
      if (p.status === 'FLAGGED' || dist > (activeEstablishment?.radius_meters || 80)) {
        status = 'ALERT';
      } else if (p.status === 'LATE' || (Array.isArray(p.flag_reasons) && p.flag_reasons.some((f: string) => f.includes('RETARD')))) {
        status = 'LATE';
      }

      return {
        id: p.id,
        name: empName,
        matricule,
        time: timeStr,
        type: p.punch_type || 'CHECK_IN',
        site: p.pointage_establishments?.name || activeEstablishment?.name || 'Siège Principal',
        distance: `${dist}m`,
        status,
        avatarColor: avatarColors[idx % avatarColors.length],
        device: p.device_model || 'Smartphone Déclaré',
        wifiUsed: p.wifi_bssid ? (activeEstablishment?.wifi_ssid || 'Wi-Fi Bureau') : undefined
      };
    });
  }, [dbPunches, activeEstablishment]);

  // 3. Transformation des justifications DB
  const justifications: DisplayJustif[] = useMemo(() => {
    if (dbJustifications.length === 0) return [];

    return dbJustifications.map((j) => {
      const created = new Date(j.created_at);
      const timeStr = created.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const rawReason = j.reason_text || 'Retard signalé';

      let category = 'Justification RH';
      let reason = rawReason;
      const catMatch = rawReason.match(/^\[(.*?)\]\s*(.*)$/);
      if (catMatch) {
        category = catMatch[1];
        reason = catMatch[2] || catMatch[1];
      }

      return {
        id: j.id,
        name: j.pointage_employees?.full_name || 'Collaborateur',
        time: timeStr,
        delayMinutes: 20,
        category,
        reason,
        status: j.status || 'PENDING'
      };
    });
  }, [dbJustifications]);

  // 4. Calcul RH Réel par Collaborateur sur la plage de dates sélectionnée
  const hrSummaries: EmployeeHrSummary[] = useMemo(() => {
    return dbEmployees.map((emp) => {
      const sched = dbSchedules.find(s => s.id === emp.schedule_id) || dbSchedules[0] || null;
      const schedCategory = sched?.category || 'Continu';
      const expectedStartMin = parseHHMMToMinutes(sched?.morning_start) ?? 8 * 60;
      const toleranceMin = sched?.tolerance_minutes ?? 15;

      // Durée de pause prévue si présente
      const lStart = parseHHMMToMinutes(sched?.lunch_start);
      const lEnd = parseHHMMToMinutes(sched?.lunch_end);
      const breakDurationMin = (lStart !== null && lEnd !== null && lEnd > lStart) ? (lEnd - lStart) : 0;

      const empLogs = hrLogs.filter(l => l.employee_id === emp.id);

      // Grouper par date locale (YYYY-MM-DD)
      const byDay: Record<string, any[]> = {};
      for (const log of empLogs) {
        const dt = new Date(log.recorded_at_utc || log.created_at);
        const dayKey = toDateInputString(dt);
        if (!byDay[dayKey]) byDay[dayKey] = [];
        byDay[dayKey].push(log);
      }

      const dayDetails: DayDetail[] = Object.keys(byDay)
        .sort((a, b) => b.localeCompare(a)) // Plus récent en premier
        .map((dayKey) => {
          const dayLogs = byDay[dayKey].sort((a, b) =>
            new Date(a.recorded_at_utc || a.created_at).getTime() -
            new Date(b.recorded_at_utc || b.created_at).getTime()
          );

          const firstLog = dayLogs[0];
          const lastLog = dayLogs.length > 1 ? dayLogs[dayLogs.length - 1] : null;

          const firstDt = new Date(firstLog.recorded_at_utc || firstLog.created_at);
          const firstTime = firstDt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          const firstMin = firstDt.getHours() * 60 + firstDt.getMinutes();

          let lastTime: string | null = null;
          let workedMinutes = 0;

          if (lastLog) {
            const lastDt = new Date(lastLog.recorded_at_utc || lastLog.created_at);
            lastTime = lastDt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            const lastMin = lastDt.getHours() * 60 + lastDt.getMinutes();
            if (lastMin > firstMin) {
              const rawDur = lastMin - firstMin;
              workedMinutes = rawDur > 240 && breakDurationMin > 0
                ? Math.max(0, rawDur - breakDurationMin)
                : rawDur;
            }
          }

          // Calcul du retard réel ce jour-là
          let lateMinutes = 0;
          if (schedCategory !== 'Départ seul') {
            const diffFromStart = firstMin - expectedStartMin;
            const isExplicitLate = dayLogs.some(l =>
              l.status === 'LATE' ||
              (Array.isArray(l.flag_reasons) && l.flag_reasons.some((r: string) => r.includes('RETARD') || r.includes('LATE')))
            );
            if (diffFromStart > toleranceMin) {
              lateMinutes = diffFromStart;
            } else if (isExplicitLate) {
              lateMinutes = diffFromStart > 0 ? diffFromStart : 15;
            }
          }

          const hasAlert = dayLogs.some(l => l.status === 'FLAGGED');
          let status: DayDetail['status'] = 'ON_TIME';
          if (hasAlert) status = 'ALERT';
          else if (lateMinutes > 0) status = 'LATE';
          else if (!lastLog) status = 'SINGLE';

          const dateLabel = firstDt.toLocaleDateString('fr-FR', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          });

          return {
            dateKey: dayKey,
            dateLabel,
            firstTime,
            lastTime,
            lateMinutes,
            workedMinutes,
            status,
            siteName: firstLog.pointage_establishments?.name || emp.pointage_establishments?.name || 'Siège'
          };
        });

      const presentDays = dayDetails.length;
      const lateDays = dayDetails.filter(d => d.lateMinutes > 0).length;
      const totalLateMinutes = dayDetails.reduce((acc, d) => acc + d.lateMinutes, 0);
      const totalWorkedMinutes = dayDetails.reduce((acc, d) => acc + d.workedMinutes, 0);
      const punctualityRate = presentDays > 0
        ? Math.round(((presentDays - lateDays) / presentDays) * 100)
        : 100;

      return {
        employee: emp,
        presentDays,
        lateDays,
        totalLateMinutes,
        totalWorkedMinutes,
        punctualityRate,
        days: dayDetails
      };
    });
  }, [dbEmployees, dbSchedules, hrLogs]);

  const selectedHrSummary = useMemo(() => {
    if (!selectedHrEmployeeId) return null;
    return hrSummaries.find(s => s.employee.id === selectedHrEmployeeId) || null;
  }, [hrSummaries, selectedHrEmployeeId]);

  // ==================== ACTIONS GÉRANT COMPLÈTES ====================

  // A. Créer un nouvel employé
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim()) {
      triggerToast("Veuillez saisir le nom complet.");
      return;
    }
    try {
      const supabase = createClient();
      const targetOrgId = orgId || '53055b65-de5a-40af-9f1c-d27bd83e7c68';
      const year = new Date().getFullYear();
      const randNum = String(Math.floor(Math.random() * 900) + 100);
      const matricule = `MAT-${year}-${randNum}`;

      const { data: newEmp, error } = await supabase
        .from('pointage_employees')
        .insert({
          org_id: targetOrgId,
          full_name: newEmpName.trim(),
          employee_matricule: matricule,
          phone: newEmpPhone.trim() || null,
          role: newEmpRole,
          default_establishment_id: newEmpSiteId || (activeEstablishment?.id || null),
          schedule_id: newEmpScheduleId || (dbSchedules[0]?.id || null),
          is_active: true
        })
        .select('*, pointage_establishments(name), pointage_schedules(name, morning_start, afternoon_end, tolerance_minutes)')
        .single();

      if (error) throw error;

      if (newEmp) {
        setDbEmployees(prev => [newEmp, ...prev]);
        setShowAddEmployeeModal(false);
        setNewEmpName('');
        setNewEmpPhone('');
        triggerToast(`✓ Collaborateur ${newEmp.full_name} créé (${matricule}) !`);
      }
    } catch (err: any) {
      triggerToast(`Erreur création: ${err.message}`);
    }
  };

  // B. Détection automatique & Ajout Multi-Wi-Fi pour un site
  const handleDetectSiteWifi = async () => {
    if (isMobileScreen) {
      setWifiAddMode('manual');
      setWifiDetectNote(
        "Sur navigateur web mobile, Chrome/Safari bloque la lecture du Wi-Fi par confidentialité : utilisez l'onglet « Ajouter manuellement » juste à côté. Dans l'APK natif Android/iOS, la détection SSID + MAC est 100% automatique."
      );
      return;
    }

    setIsDetectingWifi(true);
    setWifiDetectNote(null);
    try {
      const res = await fetch('/api/wifi/current?refresh=true');
      const data = await res.json();
      if (data && data.success && (data.ssid || data.bssid)) {
        const detectedSsid = (data.ssid || 'Wi-Fi_Bureau').trim();
        const detectedBssid = data.bssid ? String(data.bssid).toLowerCase().trim() : undefined;

        setSiteWifiList(prev => {
          const exists = prev.some(
            w => w.ssid.toLowerCase() === detectedSsid.toLowerCase() && (w.bssid || '') === (detectedBssid || '')
          );
          if (exists) return prev;
          return [...prev, { ssid: detectedSsid, bssid: detectedBssid, source: 'detected' }];
        });

        setWifiDetectNote(
          `✓ Réseau ajouté : ${detectedSsid}${detectedBssid ? ` (${detectedBssid})` : ''}`
        );
        triggerToast(`✓ Box Wi-Fi "${detectedSsid}" ajoutée au site !`);
      } else {
        setWifiDetectNote("Aucun réseau Wi-Fi actif détecté sur cette interface. Passez en mode « Manuel » pour l'ajouter sans vous déconnecter.");
      }
    } catch {
      setWifiDetectNote("Détection locale indisponible. Utilisez « Ajouter manuellement ».");
    } finally {
      setIsDetectingWifi(false);
    }
  };

  const handleAddManualWifi = () => {
    const cleanSsid = manualWifiSsid.trim();
    const cleanBssid = manualWifiBssid.trim().toLowerCase();
    if (!cleanSsid) {
      triggerToast("Saisissez d'abord le nom du réseau Wi-Fi (SSID).");
      return;
    }
    if (cleanBssid && !/^([0-9a-f]{2}[:-]){5}[0-9a-f]{2}$/i.test(cleanBssid)) {
      triggerToast("Format d'adresse MAC / BSSID invalide (ex: 6a:9e:29:2b:43:08).");
      return;
    }
    const normalizedBssid = cleanBssid ? cleanBssid.replace(/-/g, ':') : undefined;
    setSiteWifiList(prev => {
      const exists = prev.some(w => w.ssid.toLowerCase() === cleanSsid.toLowerCase());
      if (exists) {
        return prev.map(w => w.ssid.toLowerCase() === cleanSsid.toLowerCase()
          ? { ...w, bssid: normalizedBssid || w.bssid }
          : w
        );
      }
      return [...prev, { ssid: cleanSsid, bssid: normalizedBssid, source: 'manual' }];
    });
    setManualWifiSsid('');
    setManualWifiBssid('');
    setWifiDetectNote(`✓ "${cleanSsid}" ajouté sans vous déconnecter de votre Wi-Fi actuel.`);
    triggerToast(`✓ Wi-Fi "${cleanSsid}" ajouté à la liste du site !`);
  };

  const handleRemoveWifiEntry = (index: number) => {
    setSiteWifiList(prev => prev.filter((_, i) => i !== index));
  };

  // Journal d'Audit Inviolable (lecture & enregistrement SHA-256 côté serveur)
  const recordAuditEvent = (
    event_type: string,
    severity: 'INFO' | 'WARNING' | 'CRITICAL',
    details: Record<string, any> = {}
  ) => {
    const targetOrgId = orgId || (typeof window !== 'undefined' ? localStorage.getItem('pointage_org_id') : null);
    const mgrName = typeof window !== 'undefined' ? localStorage.getItem('pointage_manager_name') : null;
    const mgrEmail = typeof window !== 'undefined' ? localStorage.getItem('pointage_manager_email') : null;

    fetch('/api/audit/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        org_id: targetOrgId,
        org_code: orgCode,
        event_type,
        severity,
        actor_name: mgrName || 'Gérant Mobile',
        actor_identifier: mgrEmail || orgCode,
        details
      })
    }).catch(() => {});
  };

  const loadAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const targetOrgId = orgId || (typeof window !== 'undefined' ? localStorage.getItem('pointage_org_id') : null);
      const url = targetOrgId ? `/api/audit/log?org_id=${encodeURIComponent(targetOrgId)}` : '/api/audit/log';
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.success) {
        setAuditEntries(data.entries || []);
        setAuditChainIntact(data.chainIntact !== false);
        setAuditStorageMode(data.storage === 'supabase_immutable' ? 'supabase_immutable' : 'local_ledger');
        setAuditNeedsSql(!!data.needsSqlMigration);
      }
    } catch {
      triggerToast("Impossible de charger le journal d'audit.");
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (showAuditDrawer) {
      loadAuditLogs();
    }
  }, [showAuditDrawer, orgId]);

  // Ouvrir modale création / édition de site
  const openSiteModal = (siteToEdit?: any) => {
    setWifiDetectNote(null);
    setGpsStatusNote(null);
    setGpsAccuracyMeters(null);
    setMapResolvedAddress(null);
    setMapsLinkInput('');
    setWifiAddMode('detect');
    setManualWifiSsid('');
    setManualWifiBssid('');

    if (siteToEdit) {
      setEditingSiteId(siteToEdit.id);
      setNewSiteName(siteToEdit.name || '');
      setNewSiteCity(siteToEdit.city || 'Bobo-Dioulasso');
      setNewSiteRadius(siteToEdit.radius_meters || 80);
      setNewSiteLat(String(siteToEdit.latitude ?? '11.247051'));
      setNewSiteLon(String(siteToEdit.longitude ?? '-4.291915'));
      setGpsMode('custom');

      const ssids = siteToEdit.wifi_ssid
        ? String(siteToEdit.wifi_ssid).split(',').map((s: string) => s.trim()).filter(Boolean)
        : [];
      const bssids = Array.isArray(siteToEdit.wifi_bssids) ? siteToEdit.wifi_bssids : [];
      const combined: WifiEntry[] = ssids.map((s: string, idx: number) => ({
        ssid: s,
        bssid: bssids[idx] || undefined,
        source: 'detected'
      }));
      setNewSiteHasWifi(combined.length > 0);
      setSiteWifiList(combined);
    } else {
      setEditingSiteId(null);
      setNewSiteName('');
      setNewSiteCity('Bobo-Dioulasso');
      setNewSiteRadius(80);
      setNewSiteLat('11.247051');
      setNewSiteLon('-4.291915');
      setGpsMode('current');
      setNewSiteHasWifi(true);
      setSiteWifiList([]);
    }
    setShowAddSiteModal(true);
  };

  // C. Créer ou modifier un site dans Supabase
  const handleSaveSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteName.trim()) {
      triggerToast("Veuillez donner un nom au site.");
      return;
    }
    try {
      const supabase = createClient();
      const targetOrgId = orgId || '53055b65-de5a-40af-9f1c-d27bd83e7c68';

      const cleanSsid = newSiteHasWifi && siteWifiList.length > 0
        ? siteWifiList.map(w => w.ssid).join(', ')
        : null;
      const cleanBssids = newSiteHasWifi && siteWifiList.length > 0
        ? siteWifiList.map(w => w.bssid).filter((b): b is string => !!b)
        : [];

      if (editingSiteId) {
        const { data: updated, error } = await supabase
          .from('pointage_establishments')
          .update({
            name: newSiteName.trim(),
            city: newSiteCity.trim() || 'Principal',
            latitude: parseFloat(newSiteLat) || 11.247051,
            longitude: parseFloat(newSiteLon) || -4.291915,
            radius_meters: newSiteRadius,
            wifi_ssid: cleanSsid,
            wifi_bssids: cleanBssids
          })
          .eq('id', editingSiteId)
          .select()
          .single();

        if (error) throw error;
        if (updated) {
          setDbEstablishments(prev => prev.map(s => s.id === editingSiteId ? updated : s));
          setShowAddSiteModal(false);
          recordAuditEvent('SITE_UPDATED', 'INFO', {
            site_name: updated.name,
            radius_meters: updated.radius_meters,
            wifi_ssid: cleanSsid || 'Aucun'
          });
          triggerToast(`✓ Site "${updated.name}" mis à jour !`);
        }
      } else {
        const { data: newSite, error } = await supabase
          .from('pointage_establishments')
          .insert({
            org_id: targetOrgId,
            name: newSiteName.trim(),
            city: newSiteCity.trim() || 'Principal',
            latitude: parseFloat(newSiteLat) || 11.247051,
            longitude: parseFloat(newSiteLon) || -4.291915,
            radius_meters: newSiteRadius,
            wifi_ssid: cleanSsid,
            wifi_bssids: cleanBssids,
            is_active: true
          })
          .select()
          .single();

        if (error) throw error;
        if (newSite) {
          setDbEstablishments(prev => [...prev, newSite]);
          setShowAddSiteModal(false);
          setNewSiteName('');
          recordAuditEvent('SITE_CREATED', 'INFO', {
            site_name: newSite.name,
            city: newSite.city,
            radius_meters: newSite.radius_meters
          });
          triggerToast(`✓ Site "${newSite.name}" (${newSite.radius_meters}m) créé avec succès !`);
        }
      }
    } catch (err: any) {
      triggerToast(`Erreur site: ${err.message}`);
    }
  };

  // C2. Supprimer (désactiver) un site existant
  const handleDeleteSite = async (site: any) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('pointage_establishments')
        .update({ is_active: false })
        .eq('id', site.id);

      if (error) throw error;

      setDbEstablishments(prev => prev.filter(s => s.id !== site.id));
      setConfirmDeleteSiteId(null);
      recordAuditEvent('SITE_DELETED', 'WARNING', {
        site_name: site.name,
        city: site.city
      });
      triggerToast(`🗑️ Site "${site.name}" supprimé.`);
    } catch (err: any) {
      triggerToast(`Erreur suppression site : ${err.message}`);
    }
  };

  // D. Calibrer la position GPS actuelle par affinement progressif + retour visuel honnête
  const stopGpsWatch = () => {
    if (gpsWatchRef.current !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(gpsWatchRef.current);
      gpsWatchRef.current = null;
    }
    setIsCalibratingGps(false);
  };

  const handleCalibrateGpsFromDevice = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      triggerToast("La géolocalisation n'est pas supportée par ce navigateur.");
      return;
    }
    stopGpsWatch();
    setIsCalibratingGps(true);
    setGpsStatusNote("Acquisition satellite en cours...");

    let bestAccuracy = Infinity;
    let settled = false;

    const finalize = (finalAcc: number) => {
      if (settled) return;
      settled = true;
      stopGpsWatch();
      if (finalAcc < Infinity) {
        if (finalAcc <= 15) {
          setGpsStatusNote(`✓ Position satellite haute précision verrouillée (±${finalAcc}m). Vérifiez le marqueur sur la carte ci-dessous.`);
        } else if (finalAcc <= 45) {
          setGpsStatusNote(`Position captée (±${finalAcc}m). Ajustez si besoin le marqueur sur votre bâtiment sur la carte.`);
        } else {
          setGpsStatusNote(
            isMobileScreen
              ? `Signal intérieur atténué (±${finalAcc}m). Touchez votre toit sur la carte satellite ci-dessous pour une précision à 1m.`
              : `Précision réseau PC approximative (±${finalAcc}m, sans puce GPS). Cliquez directement sur votre bâtiment sur la carte ci-dessous.`
          );
        }
      } else {
        setGpsStatusNote("Signal GPS indisponible. Passez sur « Position personnalisée » ou cliquez directement sur la carte.");
      }
    };

    const timer = setTimeout(() => finalize(bestAccuracy), 7000);

    gpsWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const acc = Math.round(pos.coords.accuracy);
        if (acc < bestAccuracy) {
          bestAccuracy = acc;
          setGpsAccuracyMeters(acc);
          setNewSiteLat(pos.coords.latitude.toFixed(6));
          setNewSiteLon(pos.coords.longitude.toFixed(6));
        }
        if (acc <= 12) {
          clearTimeout(timer);
          finalize(acc);
        }
      },
      (err) => {
        clearTimeout(timer);
        if (bestAccuracy === Infinity) {
          setIsCalibratingGps(false);
          setGpsStatusNote(`Erreur GPS : ${err.message}. Vous pouvez cliquer directement sur la carte satellite.`);
        } else {
          finalize(bestAccuracy);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // D2. Extraction de coordonnées depuis un lien Google Maps ou saisie brute
  const handleExtractMapsLink = async () => {
    const raw = mapsLinkInput.trim();
    if (!raw) {
      triggerToast("Collez un lien Google Maps ou des coordonnées (ex: 11.2470, -4.2919).");
      return;
    }

    // 1. Coordonnées brutes "11.247051, -4.291915"
    const rawCoords = raw.match(/(-?\d+\.\d+)\s*[,;\s]\s*(-?\d+\.\d+)/);
    if (rawCoords && !raw.startsWith('http')) {
      const lat = parseFloat(rawCoords[1]);
      const lon = parseFloat(rawCoords[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
        setNewSiteLat(lat.toFixed(6));
        setNewSiteLon(lon.toFixed(6));
        setGpsAccuracyMeters(1);
        setGpsStatusNote("✓ Coordonnées extraites et centrées sur la carte satellite.");
        triggerToast("✓ Coordonnées appliquées sur la carte !");
        return;
      }
    }

    // 2. Lien Google Maps complet ou lien court (maps.app.goo.gl)
    setIsResolvingMapsLink(true);
    setGpsStatusNote("Analyse du lien Google Maps...");
    try {
      const res = await fetch(`/api/maps/resolve?url=${encodeURIComponent(raw)}`);
      const data = await res.json();
      if (data && data.success && typeof data.lat === 'number' && typeof data.lon === 'number') {
        setNewSiteLat(Number(data.lat).toFixed(6));
        setNewSiteLon(Number(data.lon).toFixed(6));
        setGpsAccuracyMeters(1);
        setGpsStatusNote(`✓ Coordonnées extraites du lien Google Maps (${data.lat}, ${data.lon}).`);
        triggerToast("✓ Position Google Maps centrée sur la carte !");
      } else {
        setGpsStatusNote(data?.error || "Impossible d'extraire les coordonnées. Saisissez Lat/Lon ou cliquez sur la carte.");
      }
    } catch {
      setGpsStatusNote("Erreur de connexion lors de la lecture du lien court.");
    } finally {
      setIsResolvingMapsLink(false);
    }
  };

  // D3. Sauvegarde réelle des règles anti-triche dans Supabase
  const handleSaveSecurityPolicy = async (closeAfter = true) => {
    const targetOrgId = orgId || (typeof window !== 'undefined' ? localStorage.getItem('pointage_org_id') : null);
    const updatedConfig = {
      ...orgSecurityConfigRaw,
      require_biometrics: secBiometricsRequired,
      hard_block_mock_gps: secMockGpsBlocked,
      require_device_binding: secDeviceBindingStrict,
      require_wifi_bssid: secWifiMandatory
    };
    setOrgSecurityConfigRaw(updatedConfig);

    if (!targetOrgId) {
      if (closeAfter) setShowSecurityDrawer(false);
      triggerToast("✓ Règles mises à jour localement.");
      return;
    }

    setSavingSecurity(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('pointage_organizations')
        .update({ security_config: updatedConfig })
        .eq('id', targetOrgId);

      if (error) throw error;
      recordAuditEvent('SECURITY_POLICY_UPDATED', 'WARNING', {
        require_biometrics: secBiometricsRequired,
        hard_block_mock_gps: secMockGpsBlocked,
        require_device_binding: secDeviceBindingStrict,
        require_wifi_bssid: secWifiMandatory
      });
      if (closeAfter) setShowSecurityDrawer(false);
      triggerToast("✓ Règles anti-triche appliquées en direct sur tous les téléphones !");
    } catch (err: any) {
      triggerToast(`Erreur sauvegarde sécurité : ${err.message}`);
    } finally {
      setSavingSecurity(false);
    }
  };

  // Calcul net journalier pour la modale Couloir Horaire
  const scheduleDailyPreview = useMemo(() => {
    if (!schedTrackArrival && schedTrackDeparture) {
      return `Départ seul contrôlé à ${newSchedAfternoonEnd}`;
    }
    if (schedTrackArrival && !schedTrackDeparture) {
      return `Arrivée seule contrôlée à ${newSchedMorningStart} (+${newSchedTolerance}m tol.)`;
    }
    const arrM = parseHHMMToMinutes(newSchedMorningStart);
    const depM = parseHHMMToMinutes(newSchedAfternoonEnd);
    if (arrM === null || depM === null || depM <= arrM) {
      return 'Plage horaire personnalisée';
    }
    let netMin = depM - arrM;
    if (schedHasBreak) {
      const bStart = parseHHMMToMinutes(newSchedBreakStart);
      const bEnd = parseHHMMToMinutes(newSchedBreakEnd);
      if (bStart !== null && bEnd !== null && bEnd > bStart) {
        netMin = Math.max(0, netMin - (bEnd - bStart));
      }
    }
    return `Temps de travail effectif : ${formatMinutesAsHours(netMin)} / jour`;
  }, [
    schedTrackArrival,
    schedTrackDeparture,
    newSchedMorningStart,
    newSchedAfternoonEnd,
    schedHasBreak,
    newSchedBreakStart,
    newSchedBreakEnd,
    newSchedTolerance
  ]);

  const toggleSchedDay = (dayId: number) => {
    setNewSchedDays(prev =>
      prev.includes(dayId)
        ? (prev.length > 1 ? prev.filter(d => d !== dayId) : prev)
        : [...prev, dayId].sort((a, b) => a - b)
    );
  };

  // E. Créer un couloir horaire flexible (Arrivée/Départ activables + Pause optionnelle)
  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchedName.trim()) {
      triggerToast("Veuillez nommer le couloir horaire.");
      return;
    }
    try {
      const supabase = createClient();
      const targetOrgId = orgId || '53055b65-de5a-40af-9f1c-d27bd83e7c68';

      let category = 'Continu';
      let morningStart = newSchedMorningStart;
      let morningEnd = newSchedAfternoonEnd;
      let lunchStart = newSchedMorningStart;
      let lunchEnd = newSchedMorningStart;
      let afternoonStart = newSchedMorningStart;
      let afternoonEnd = newSchedAfternoonEnd;
      let dailyNetMinutes = 480;

      if (schedTrackArrival && !schedTrackDeparture) {
        category = 'Arrivée seule';
        morningEnd = newSchedMorningStart;
        afternoonStart = newSchedMorningStart;
        afternoonEnd = newSchedMorningStart;
        dailyNetMinutes = 0;
      } else if (!schedTrackArrival && schedTrackDeparture) {
        category = 'Départ seul';
        morningStart = newSchedAfternoonEnd;
        morningEnd = newSchedAfternoonEnd;
        lunchStart = newSchedAfternoonEnd;
        lunchEnd = newSchedAfternoonEnd;
        afternoonStart = newSchedAfternoonEnd;
        dailyNetMinutes = 0;
      } else if (schedHasBreak) {
        category = 'Avec pause';
        morningEnd = newSchedBreakStart;
        lunchStart = newSchedBreakStart;
        lunchEnd = newSchedBreakEnd;
        afternoonStart = newSchedBreakEnd;
        const arrM = parseHHMMToMinutes(morningStart) ?? 480;
        const depM = parseHHMMToMinutes(afternoonEnd) ?? 1020;
        const bStart = parseHHMMToMinutes(lunchStart) ?? 720;
        const bEnd = parseHHMMToMinutes(lunchEnd) ?? 810;
        dailyNetMinutes = Math.max(0, (depM - arrM) - Math.max(0, bEnd - bStart));
      } else {
        const arrM = parseHHMMToMinutes(morningStart) ?? 480;
        const depM = parseHHMMToMinutes(afternoonEnd) ?? 1020;
        dailyNetMinutes = Math.max(0, depM - arrM);
      }

      const weeklyHours = Math.round(((dailyNetMinutes * newSchedDays.length) / 60) * 10) / 10;

      const { data: newSched, error } = await supabase
        .from('pointage_schedules')
        .insert({
          org_id: targetOrgId,
          name: newSchedName.trim(),
          category,
          working_days: newSchedDays,
          morning_start: morningStart,
          morning_end: morningEnd,
          lunch_start: lunchStart,
          lunch_end: lunchEnd,
          afternoon_start: afternoonStart,
          afternoon_end: afternoonEnd,
          tolerance_minutes: schedTrackArrival ? newSchedTolerance : 0,
          weekly_hours: weeklyHours,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      if (newSched) {
        setDbSchedules(prev => [...prev, newSched]);
        setShowAddScheduleModal(false);
        setNewSchedName('');
        recordAuditEvent('SCHEDULE_CREATED', 'INFO', { schedule_name: newSched.name, category });
        triggerToast(`✓ Couloir "${newSched.name}" (${category}) créé !`);
      }
    } catch (err: any) {
      triggerToast(`Erreur planning: ${err.message}`);
    }
  };

  const handleDeleteSchedule = async (schedId: string, name: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('pointage_schedules')
        .update({ is_active: false })
        .eq('id', schedId);
      if (error) throw error;
      setDbSchedules(prev => prev.filter(s => s.id !== schedId));
      recordAuditEvent('SCHEDULE_DELETED', 'WARNING', { schedule_name: name });
      triggerToast(`Couloir "${name}" supprimé.`);
    } catch (err: any) {
      triggerToast(`Erreur: ${err.message}`);
    }
  };

  // F. Délier l'appareil d'un salarié
  const handleUnbindEmployee = async (empId: string, name: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('pointage_employees')
        .update({ bound_device_id: null, device_model: null, is_enrolled: false })
        .eq('id', empId);

      if (error) throw error;

      setDbEmployees(prev => prev.map(e => e.id === empId ? { ...e, bound_device_id: null, device_model: null, is_enrolled: false } : e));
      recordAuditEvent('DEVICE_UNBOUND', 'WARNING', { employee_name: name });
      triggerToast(`✓ Téléphone de ${name} délié.`);
    } catch (err: any) {
      triggerToast(`Erreur: ${err.message}`);
    }
  };

  // G. Arbitrage justifications
  const handleApproveJustif = async (id: string, name: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('pointage_justifications')
        .update({
          status: 'APPROVED',
          reviewed_at: new Date().toISOString(),
          reviewed_by: 'Gérance Mobile PointagePro'
        })
        .eq('id', id);

      if (error) throw error;

      setDbJustifications(prev => prev.map(j => j.id === id ? { ...j, status: 'APPROVED' } : j));
      recordAuditEvent('JUSTIF_APPROVED', 'INFO', { employee_name: name });
      triggerToast(`✓ Retard de ${name} validé et excusé.`);
      setIslandMessage(`✓ ${name} excusé`);
      setShowDynamicIslandAlert(true);
      setTimeout(() => setShowDynamicIslandAlert(false), 3000);
    } catch (e: any) {
      triggerToast(`Erreur: ${e.message}`);
    }
  };

  const handleRejectJustif = async (id: string, name: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('pointage_justifications')
        .update({
          status: 'REJECTED',
          reviewed_at: new Date().toISOString(),
          reviewed_by: 'Gérance Mobile PointagePro'
        })
        .eq('id', id);

      if (error) throw error;

      setDbJustifications(prev => prev.map(j => j.id === id ? { ...j, status: 'REJECTED' } : j));
      recordAuditEvent('JUSTIF_REJECTED', 'INFO', { employee_name: name });
      triggerToast(`✕ Justification de ${name} rejetée.`);
      setIslandMessage(`✕ Retard non excusé : ${name}`);
      setShowDynamicIslandAlert(true);
      setTimeout(() => setShowDynamicIslandAlert(false), 3000);
    } catch (e: any) {
      triggerToast(`Erreur: ${e.message}`);
    }
  };

  // H. Export réel Excel (.xlsx) global ou individuel
  const handleExportExcel = (singleSummary?: EmployeeHrSummary) => {
    try {
      const targetList = singleSummary ? [singleSummary] : hrSummaries;
      if (targetList.length === 0) {
        triggerToast("Aucune donnée collaborateur à exporter sur cette plage.");
        return;
      }

      const wb = XLSX.utils.book_new();

      // Onglet 1 : Synthèse par employé
      const summaryRows = targetList.map((s) => ({
        'Entreprise': orgName,
        'Période': `${hrStartDate} au ${hrEndDate}`,
        'Matricule': s.employee.employee_matricule || 'N/A',
        'Nom Complet': s.employee.full_name,
        'Rôle': s.employee.role || 'Collaborateur',
        'Site': s.employee.pointage_establishments?.name || 'Siège',
        'Jours Présents': s.presentDays,
        'Jours en Retard': s.lateDays,
        'Cumul Retards (min)': s.totalLateMinutes,
        'Cumul Retards (HhMm)': formatLateMinutes(s.totalLateMinutes),
        'Heures Travaillées': formatMinutesAsHours(s.totalWorkedMinutes),
        'Ponctualité (%)': `${s.punctualityRate}%`
      }));
      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Synthèse RH');

      // Onglet 2 : Détail journalier & jours de retard
      const detailRows: any[] = [];
      for (const s of targetList) {
        if (s.days.length === 0) {
          detailRows.push({
            'Nom Complet': s.employee.full_name,
            'Matricule': s.employee.employee_matricule || 'N/A',
            'Date': 'Aucun pointage sur la période',
            'Arrivée': '--',
            'Départ': '--',
            'Statut': 'Absent / Non pointé',
            'Retard (min)': 0,
            'Durée Travaillée': '0h 00m',
            'Site': s.employee.pointage_establishments?.name || 'Siège'
          });
        } else {
          for (const d of s.days) {
            detailRows.push({
              'Nom Complet': s.employee.full_name,
              'Matricule': s.employee.employee_matricule || 'N/A',
              'Date': d.dateKey,
              'Jour': d.dateLabel,
              'Arrivée': d.firstTime,
              'Départ': d.lastTime || 'Non pointé',
              'Statut': d.lateMinutes > 0 ? 'EN RETARD' : d.status === 'ALERT' ? 'ALERTE ZONE' : 'À L\'HEURE',
              'Retard (min)': d.lateMinutes,
              'Durée Travaillée': d.workedMinutes > 0 ? formatMinutesAsHours(d.workedMinutes) : 'Journée en cours',
              'Site': d.siteName
            });
          }
        }
      }
      const wsDetails = XLSX.utils.json_to_sheet(detailRows);
      XLSX.utils.book_append_sheet(wb, wsDetails, 'Détail Journalier');

      const safeOrg = orgName.replace(/[^a-z0-9]/gi, '_');
      const fileName = singleSummary
        ? `Fiche_RH_${singleSummary.employee.full_name.replace(/[^a-z0-9]/gi, '_')}_${hrStartDate}_${hrEndDate}.xlsx`
        : `Releve_RH_${safeOrg}_${hrStartDate}_au_${hrEndDate}.xlsx`;

      XLSX.writeFile(wb, fileName);
      triggerToast(`✓ Fichier Excel "${fileName}" téléchargé !`);
    } catch (err: any) {
      triggerToast(`Erreur export Excel: ${err.message}`);
    }
  };

  // Export imprimable / PDF propre dans un nouvel onglet
  const handleExportPdfPrint = (singleSummary?: EmployeeHrSummary) => {
    const targetList = singleSummary ? [singleSummary] : hrSummaries;
    const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Relevé RH - ${orgName}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #0f172a; padding: 28px; }
    h1 { font-size: 20px; margin: 0 0 4px; color: #1e3a8a; }
    .meta { font-size: 12px; color: #475569; margin-bottom: 18px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
    th { background: #f1f5f9; font-weight: bold; }
    .late { color: #b45309; font-weight: bold; }
    .ok { color: #047857; font-weight: bold; }
    h2 { font-size: 15px; margin-top: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
  </style>
</head>
<body>
  <h1>${orgName} — Relevé & Synthèse RH</h1>
  <div class="meta">Période : du <strong>${hrStartDate}</strong> au <strong>${hrEndDate}</strong> • Code : ${orgCode}</div>
  <table>
    <thead>
      <tr>
        <th>Collaborateur</th>
        <th>Matricule</th>
        <th>Jours Présents</th>
        <th>Jours en Retard</th>
        <th>Cumul Retards</th>
        <th>Heures Travaillées</th>
        <th>Ponctualité</th>
      </tr>
    </thead>
    <tbody>
      ${targetList.map(s => `
        <tr>
          <td><strong>${s.employee.full_name}</strong></td>
          <td>${s.employee.employee_matricule || 'N/A'}</td>
          <td>${s.presentDays} j</td>
          <td class="${s.lateDays > 0 ? 'late' : 'ok'}">${s.lateDays} j</td>
          <td class="${s.totalLateMinutes > 0 ? 'late' : 'ok'}">${formatLateMinutes(s.totalLateMinutes)}</td>
          <td>${formatMinutesAsHours(s.totalWorkedMinutes)}</td>
          <td>${s.punctualityRate}%</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  ${targetList.map(s => `
    <h2>Détail : ${s.employee.full_name} (${s.employee.employee_matricule || 'N/A'})</h2>
    <table>
      <thead>
        <tr><th>Date</th><th>Arrivée</th><th>Départ</th><th>Statut</th><th>Retard</th><th>Durée</th><th>Site</th></tr>
      </thead>
      <tbody>
        ${s.days.length === 0
          ? '<tr><td colspan="7">Aucun pointage enregistré sur cette période.</td></tr>'
          : s.days.map(d => `
            <tr>
              <td>${d.dateLabel}</td>
              <td>${d.firstTime}</td>
              <td>${d.lastTime || '--:--'}</td>
              <td class="${d.lateMinutes > 0 ? 'late' : 'ok'}">${d.lateMinutes > 0 ? 'EN RETARD' : 'À L\'HEURE'}</td>
              <td>${d.lateMinutes > 0 ? `+${d.lateMinutes} min` : '0 min'}</td>
              <td>${d.workedMinutes > 0 ? formatMinutesAsHours(d.workedMinutes) : 'En cours'}</td>
              <td>${d.siteName}</td>
            </tr>
          `).join('')}
      </tbody>
    </table>
  `).join('')}
  <script>window.onload = () => window.print();</script>
</body>
</html>`;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(htmlContent);
      win.document.close();
      triggerToast("Fiche PDF prête pour impression / sauvegarde !");
    } else {
      triggerToast("Autorisez l'ouverture de la fenêtre pour exporter en PDF.");
    }
  };

  // I. WhatsApp invitation magique
  const handleOpenWhatsApp = (emp: any) => {
    const rawPhone = emp.phone || '';
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    const siteName = emp.pointage_establishments?.name || activeEstablishment?.name || 'Siège Principal';
    const message = encodeURIComponent(
      `Bonjour ${emp.full_name},\n\nVotre accès mobile à PointagePro (${orgName}) est configuré pour le site "${siteName}".\n\n` +
      `🔑 Code Entreprise : *${orgCode}*\n` +
      `🆔 Votre Matricule : *${emp.employee_matricule || 'N/A'}*\n\n` +
      `Téléchargez l'application officielle et commencez à pointer :\n` +
      `${typeof window !== 'undefined' ? window.location.origin : ''}/apk`
    );
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${message}`, '_blank');
    triggerToast(`Lien magique WhatsApp ouvert pour ${emp.full_name}`);
  };

  // J. Diffusion notification push
  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;
    setShowBroadcastModal(false);
    triggerToast(`📢 Message diffusé instantanément à tous les smartphones des employés !`);
    setIslandMessage(`📢 Push : "${broadcastText.slice(0, 20)}..."`);
    setShowDynamicIslandAlert(true);
    setBroadcastText('');
    setTimeout(() => setShowDynamicIslandAlert(false), 4000);
  };

  // K. Simulation pointage réel
  const handleSimulateNewPunch = async () => {
    try {
      const supabase = createClient();
      const targetOrgId = orgId || '53055b65-de5a-40af-9f1c-d27bd83e7c68';

      const emps = dbEmployees.length > 0 ? dbEmployees : [
        { id: '79b7aef2-544e-4a70-ac6a-39ce3db1e57c', full_name: 'TRAORE Amadou', employee_matricule: 'MAT-2026-001' }
      ];
      const randomEmp = emps[Math.floor(Math.random() * emps.length)];
      const siteId = activeEstablishment?.id || '729f0aca-bc81-4ee4-84d9-1c179b6f0f93';
      const baseLat = activeEstablishment?.latitude || 11.247051;
      const baseLon = activeEstablishment?.longitude || -4.291915;

      const jitterLat = (Math.random() - 0.5) * 0.00006;
      const jitterLon = (Math.random() - 0.5) * 0.00006;
      const lat = Number((baseLat + jitterLat).toFixed(6));
      const lon = Number((baseLon + jitterLon).toFixed(6));
      const dist = Math.round(Math.hypot(jitterLat * 111000, jitterLon * 111000) * 10) / 10;

      const { data: newLog, error } = await supabase
        .from('pointage_logs')
        .insert({
          org_id: targetOrgId,
          employee_id: randomEmp.id,
          establishment_id: siteId,
          punch_type: 'CHECK_IN',
          recorded_at_utc: new Date().toISOString(),
          latitude: lat,
          longitude: lon,
          accuracy_meters: 1.9,
          distance_to_site_meters: dist,
          device_model: randomEmp.device_model || 'Smartphone Déclaré',
          wifi_bssid: activeEstablishment?.wifi_bssids?.[0] || null,
          status: 'VALIDATED',
          flag_reasons: ['WGS84_OPTIMAL', 'SIMULATION_DIRECTE_MOBILE']
        })
        .select('*, pointage_employees(full_name, employee_matricule), pointage_establishments(name)')
        .single();

      if (error) throw error;

      if (newLog) {
        setDbPunches(prev => [newLog, ...prev]);
        setIslandMessage(`🟢 ${randomEmp.full_name} (${dist}m)`);
        setShowDynamicIslandAlert(true);
        triggerToast(`Pointage réel enregistré (${dist}m) !`);
        setTimeout(() => setShowDynamicIslandAlert(false), 3500);
      }
    } catch (e: any) {
      triggerToast(`Erreur simulation: ${e.message}`);
    }
  };

  const filteredPunches = punches.filter(p => {
    if (filterType === 'PRESENT') return p.status === 'VALIDATED';
    if (filterType === 'LATE') return p.status === 'LATE';
    if (filterType === 'ALERT') return p.status === 'ALERT';
    return true;
  });

  const filteredEmployees = dbEmployees.filter(emp => {
    if (!searchEmployeeQuery.trim()) return true;
    const q = searchEmployeeQuery.toLowerCase();
    return (
      (emp.full_name && emp.full_name.toLowerCase().includes(q)) ||
      (emp.employee_matricule && emp.employee_matricule.toLowerCase().includes(q)) ||
      (emp.phone && emp.phone.includes(q))
    );
  });

  const pendingCount = justifications.filter(j => j.status === 'PENDING').length;
  const presentCount = punches.filter(p => p.status === 'VALIDATED').length;
  const lateCount = punches.filter(p => p.status === 'LATE').length;
  const alertCount = punches.filter(p => p.status === 'ALERT').length;
  const totalEmployees = Math.max(dbEmployees.length, presentCount + lateCount);
  const attendanceRate = totalEmployees > 0 ? Math.min(100, Math.round((presentCount / totalEmployees) * 100)) : 100;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-900 flex flex-col font-sans select-none">

      {/* 1. BARRE DE COMMANDE SUPÉRIEURE */}
      <header className={`border-b border-slate-800 bg-slate-950/90 text-white px-4 py-2.5 sticky top-0 z-50 ${isMobileScreen ? 'hidden' : 'block'}`}>
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 font-black">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm text-white tracking-tight">
                  PointagePro Dirigeant • Application Mobile Gérant
                </h1>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Parité Web 100%
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Design Premium Lumineux
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Toutes les fonctions du portail web pilotables à 100% sur smartphone • {orgName}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleSimulateNewPunch}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5 cursor-pointer"
              title="Génère un vrai pointage physique dans Supabase"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simuler Arrivée</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPhoneQrModal(true)}
              className="px-3 py-1.5 bg-blue-600/30 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              title="Scanner pour tester directement sur votre smartphone"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tester sur Mon Mobile</span>
            </button>

            <div className="bg-slate-800 p-0.5 rounded-xl border border-slate-700 flex items-center text-xs">
              <button
                type="button"
                onClick={() => setDeviceFrame('iphone')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  deviceFrame === 'iphone' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                iPhone 16
              </button>
              <button
                type="button"
                onClick={() => setDeviceFrame('android')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  deviceFrame === 'android' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Galaxy S24
              </button>
              <button
                type="button"
                onClick={() => setDeviceFrame('fullscreen')}
                className={`p-1 rounded-lg font-bold transition cursor-pointer ${
                  deviceFrame === 'fullscreen' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
                title="Mode Plein Écran Direct"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            <Link
              href="/dashboard"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition border border-slate-700"
            >
              ← Cockpit Web
            </Link>
          </div>
        </div>
      </header>

      {/* 2. ZONE CENTRALE : CHÂSSIS SMARTPHONE */}
      <main className="flex-1 flex items-center justify-center p-0 sm:p-6 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">

        {toastMsg && (
          <div className="fixed top-16 z-[70] bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl font-bold text-xs flex items-center gap-2 border border-slate-700 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* CADRE DU TÉLÉPHONE */}
        <div
          className={`transition-all duration-300 ${
            deviceFrame === 'fullscreen' || isMobileScreen
              ? 'w-full max-w-md h-screen sm:h-[92vh] rounded-none sm:rounded-3xl border-0 sm:border border-slate-200 shadow-2xl'
              : deviceFrame === 'iphone'
                ? 'w-[395px] h-[825px] rounded-[50px] ring-[12px] ring-slate-800 shadow-[0_25px_70px_rgba(0,0,0,0.85)] border-[4px] border-slate-700'
                : 'w-[400px] h-[825px] rounded-[36px] ring-[12px] ring-slate-800 shadow-[0_25px_70px_rgba(0,0,0,0.85)] border-[3px] border-slate-700'
          } bg-[#F8FAFC] text-slate-900 flex flex-col overflow-hidden relative shadow-2xl`}
        >

          {/* DYNAMIC ISLAND */}
          {deviceFrame === 'iphone' && !isMobileScreen && (
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-40 transition-all duration-300">
              <div className={`bg-black text-white rounded-full flex items-center justify-between px-3 py-1 transition-all ${
                showDynamicIslandAlert
                  ? 'w-[270px] h-8 ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-500/20'
                  : 'w-[110px] h-6'
              }`}>
                {showDynamicIslandAlert ? (
                  <div className="w-full flex items-center justify-between text-[11px] font-bold px-1 animate-fadeIn">
                    <span className="truncate text-emerald-400">{islandMessage}</span>
                    <Radio className="w-3 h-3 text-emerald-400 animate-pulse shrink-0" />
                  </div>
                ) : (
                  <>
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800" />
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  </>
                )}
              </div>
            </div>
          )}

          {/* BARRE D'ÉTAT SYSTÈME */}
          <div className="pt-2.5 px-6 pb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700 z-30 shrink-0 bg-white/80 backdrop-blur-md">
            <span className="font-extrabold tracking-tight text-[11px] text-slate-900">{currentTime}</span>
            <div className="flex items-center space-x-2 text-slate-700">
              <Signal className="w-3 h-3" />
              <div className="flex items-center text-[10px] font-extrabold text-blue-600">
                <Wifi className="w-3 h-3 mr-0.5" />
                <span className="truncate max-w-[80px]">{activeEstablishment?.wifi_ssid || 'Réseau'}</span>
              </div>
              <BatteryMedium className="w-4 h-4 text-emerald-600" />
            </div>
          </div>

          {/* EN-TÊTE ÉPURÉ AVEC MENU SANDWICH */}
          <div className="px-4 py-2.5 border-b border-slate-200/80 bg-white/95 backdrop-blur-md flex items-center justify-between shrink-0 z-20 shadow-xs">
            <div className="flex items-center space-x-2.5">
              <button
                type="button"
                onClick={() => setIsSandwichOpen(true)}
                className="w-9 h-9 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition active:scale-95 cursor-pointer border border-slate-200"
                title="Menu complet de direction"
                aria-label="Menu principal"
              >
                <Menu className="w-4 h-4 text-slate-800" />
              </button>

              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-sm shadow-blue-500/20">
                  {orgName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-xs text-slate-900 leading-tight truncate max-w-[130px]">{orgName}</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 block">Espace Dirigeant</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => setShowBroadcastModal(true)}
                title="Diffuser une annonce push aux salariés"
                className="w-8 h-8 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition cursor-pointer border border-blue-100 active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('justifs')}
                title="Retards et alertes en attente"
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition relative cursor-pointer border border-slate-200"
              >
                <Bell className="w-3.5 h-3.5" />
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center animate-pulse">
                    {pendingCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* TIROIR COULISSANT MENU SANDWICH */}
          {isSandwichOpen && (
            <div className="absolute inset-0 z-50 flex animate-fadeIn">
              <div
                className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity"
                onClick={() => setIsSandwichOpen(false)}
              />

              <div className="relative w-4/5 max-w-[290px] bg-white border-r border-slate-200 h-full flex flex-col justify-between p-4 z-10 shadow-2xl">
                <div className="space-y-4 overflow-y-auto pr-1">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-xs shadow-md shadow-blue-500/20">
                        {orgName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-xs text-slate-900 truncate max-w-[140px]">{orgName}</h3>
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Compte Direction
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsSandwichOpen(false)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="bg-blue-50/70 p-3 rounded-2xl border border-blue-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700">Code Entreprise</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            navigator.clipboard.writeText(orgCode);
                            triggerToast("Code entreprise copié !");
                          }
                        }}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copier</span>
                      </button>
                    </div>
                    <span className="font-mono text-xs font-black text-slate-900 block truncate">{orgCode}</span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2 block mb-1">
                      Modules Opérationnels
                    </span>

                    <button
                      type="button"
                      onClick={() => { setActiveTab('cockpit'); setIsSandwichOpen(false); }}
                      className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl font-bold transition text-left cursor-pointer ${
                        activeTab === 'cockpit' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Activity className="w-4 h-4 text-emerald-500" />
                      <span>Cockpit Supervision</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setActiveTab('sites'); setIsSandwichOpen(false); }}
                      className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl font-bold transition text-left cursor-pointer ${
                        activeTab === 'sites' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Building2 className="w-4 h-4 text-blue-500" />
                      <span>Sites & Géofencing ({dbEstablishments.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setActiveTab('equipe'); setIsSandwichOpen(false); }}
                      className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl font-bold transition text-left cursor-pointer ${
                        activeTab === 'equipe' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Users className="w-4 h-4 text-indigo-500" />
                      <span>Personnel & Enrôlement ({dbEmployees.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setActiveTab('plannings'); setIsSandwichOpen(false); }}
                      className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl font-bold transition text-left cursor-pointer ${
                        activeTab === 'plannings' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <CalendarDays className="w-4 h-4 text-amber-500" />
                      <span>Couloirs Horaires ({dbSchedules.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setActiveTab('justifs'); setIsSandwichOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-bold transition text-left cursor-pointer ${
                        activeTab === 'justifs' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <CheckCircle2 className="w-4 h-4 text-rose-500" />
                        <span>Retards & Arbitrage</span>
                      </div>
                      {pendingCount > 0 && (
                        <span className="text-[9px] bg-rose-500 text-white font-black px-1.5 py-0.5 rounded-full">
                          {pendingCount}
                        </span>
                      )}
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-100 space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2 block mb-1">
                      Outils & Rapports
                    </span>
                    <button
                      type="button"
                      onClick={() => { setIsSandwichOpen(false); setSelectedHrEmployeeId(null); setShowRelevesDrawer(true); }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 text-xs font-bold transition text-left cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>Relevés & Synthèse RH</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsSandwichOpen(false); setShowSecurityDrawer(true); }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 text-xs font-bold transition text-left cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      <span>Sécurité & Règles Anti-Triche</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsSandwichOpen(false); setShowAuditDrawer(true); }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 text-xs font-bold transition text-left cursor-pointer"
                    >
                      <Radio className="w-4 h-4 text-purple-600" />
                      <span>Journal d&apos;Audit Inviolable</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsSandwichOpen(false); setShowBroadcastModal(true); }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 text-xs font-bold transition text-left cursor-pointer"
                    >
                      <Send className="w-4 h-4 text-amber-600" />
                      <span>Diffuser une Alerte Push</span>
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
                    <span className="flex items-center gap-1 text-emerald-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      WGS84 ±1m Satellite Actif
                    </span>
                    <span className="font-mono text-slate-400">v3.1 Premium</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSandwichOpen(false);
                      triggerToast("Session fermée en sécurité.");
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold transition text-left cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Déconnexion Gérant</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CONTENU PRINCIPAL DE L'APPLICATION */}
          <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-4 scrollbar-none bg-[#F8FAFC]">

            {/* ===================== ONGLET 1 : COCKPIT GÉRANT ===================== */}
            {activeTab === 'cockpit' && (
              <div className="space-y-4 animate-fadeIn">

                <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>{activeEstablishment?.name || 'Siège Principal'}</span>
                    </span>
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Télémétrie Live
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 py-1">
                    <div className="flex items-center space-x-3">
                      <div className="relative w-16 h-16 flex items-center justify-center">
                        <svg className="w-16 h-16 -rotate-90">
                          <circle
                            cx="32"
                            cy="32"
                            r="26"
                            className="text-slate-100 stroke-current"
                            strokeWidth="5"
                            fill="transparent"
                          />
                          <circle
                            cx="32"
                            cy="32"
                            r="26"
                            className="text-emerald-500 stroke-current transition-all duration-1000 ease-out"
                            strokeWidth="5"
                            strokeDasharray={163.36}
                            strokeDashoffset={163.36 - (163.36 * attendanceRate) / 100}
                            strokeLinecap="round"
                            fill="transparent"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="text-sm font-black text-slate-900 leading-none">{attendanceRate}%</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-black text-slate-900 block">Taux Présence</span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {presentCount} sur {totalEmployees} sur site
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="bg-emerald-50/70 border border-emerald-100 px-2.5 py-2 rounded-2xl text-center min-w-[54px]">
                        <span className="text-base font-black text-emerald-700 leading-none block">{presentCount}</span>
                        <span className="text-[9px] text-emerald-600 font-bold block mt-0.5">Présents</span>
                      </div>
                      <div className="bg-amber-50/70 border border-amber-100 px-2.5 py-2 rounded-2xl text-center min-w-[54px]">
                        <span className="text-base font-black text-amber-700 leading-none block">{lateCount}</span>
                        <span className="text-[9px] text-amber-600 font-bold block mt-0.5">Retards</span>
                      </div>
                      <div className="bg-rose-50/70 border border-rose-100 px-2.5 py-2 rounded-2xl text-center min-w-[54px]">
                        <span className="text-base font-black text-rose-700 leading-none block">{alertCount}</span>
                        <span className="text-[9px] text-rose-600 font-bold block mt-0.5">Alertes</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions rapides */}
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddEmployeeModal(true)}
                    className="p-2.5 bg-white border border-slate-200/80 hover:border-blue-300 rounded-2xl flex flex-col items-center justify-center text-center transition active:scale-95 cursor-pointer shadow-xs"
                  >
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1">
                      <Users className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-800">+ Employé</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openSiteModal()}
                    className="p-2.5 bg-white border border-slate-200/80 hover:border-emerald-300 rounded-2xl flex flex-col items-center justify-center text-center transition active:scale-95 cursor-pointer shadow-xs"
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-800">+ Site</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowBroadcastModal(true)}
                    className="p-2.5 bg-white border border-slate-200/80 hover:border-amber-300 rounded-2xl flex flex-col items-center justify-center text-center transition active:scale-95 cursor-pointer shadow-xs"
                  >
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-1">
                      <Send className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-800">Alerte Push</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setSelectedHrEmployeeId(null); setShowRelevesDrawer(true); }}
                    className="p-2.5 bg-white border border-slate-200/80 hover:border-indigo-300 rounded-2xl flex flex-col items-center justify-center text-center transition active:scale-95 cursor-pointer shadow-xs"
                  >
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-1">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-800">Relevés RH</span>
                  </button>
                </div>

                {/* Filtres pointages */}
                <div className="flex items-center justify-between px-0.5 pt-1">
                  <span className="text-xs font-extrabold text-slate-900">Pointages du Jour ({filteredPunches.length})</span>

                  <div className="flex bg-slate-200/80 p-0.5 rounded-xl text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setFilterType('ALL')}
                      className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                        filterType === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Tous
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('PRESENT')}
                      className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                        filterType === 'PRESENT' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      À l&apos;heure
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('LATE')}
                      className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                        filterType === 'LATE' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Retards
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('ALERT')}
                      className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                        filterType === 'ALERT' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Alertes
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {loadingDb ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Chargement des pointages réels...
                    </div>
                  ) : filteredPunches.length === 0 ? (
                    <div className="p-6 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-500 space-y-1">
                      <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto" />
                      <p className="font-bold text-slate-900 text-xs">Aucun pointage dans cette vue</p>
                      <p className="text-[11px] text-slate-500">Cliquez sur &quot;Simuler Arrivée&quot; pour tester en direct.</p>
                    </div>
                  ) : (
                    filteredPunches.map((p) => {
                      const isValid = p.status === 'VALIDATED';
                      const isLate = p.status === 'LATE';
                      const isAlert = p.status === 'ALERT';

                      return (
                        <div
                          key={p.id}
                          className={`p-3.5 rounded-2xl border transition bg-white shadow-xs ${
                            isAlert
                              ? 'border-rose-200 bg-rose-50/20'
                              : isLate
                                ? 'border-amber-200 bg-amber-50/20'
                                : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${p.avatarColor} flex items-center justify-center text-white font-black text-xs shrink-0 shadow-sm`}>
                                {p.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                              </div>
                              <div>
                                <span className="font-extrabold text-xs text-slate-900 leading-tight block">{p.name}</span>
                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 font-medium">
                                  <span className="font-mono">{p.matricule}</span>
                                  <span>•</span>
                                  <span className="flex items-center gap-0.5">
                                    <MapPin className="w-2.5 h-2.5 text-slate-400" />
                                    {p.distance}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-xs font-black font-mono text-slate-900 block">{p.time}</span>
                              <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                                isValid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                isLate ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {isValid ? 'À l\'heure' : isLate ? 'Retard' : 'Hors-Zone'}
                              </span>
                            </div>
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                            <span className="truncate max-w-[160px]">📱 {p.device}</span>
                            {p.wifiUsed && (
                              <span className="text-emerald-700 font-bold flex items-center gap-1">
                                <Wifi className="w-2.5 h-2.5" />
                                <span>Box {p.wifiUsed}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            )}

            {/* ===================== ONGLET 2 : SITES & GÉOFENCING COMPLET ===================== */}
            {activeTab === 'sites' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between px-0.5">
                  <div>
                    <h2 className="text-xs font-black text-slate-900">Sites & Géofencing ({dbEstablishments.length})</h2>
                    <p className="text-[10px] text-slate-500">Périmètres satellite WGS84 et box Wi-Fi</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openSiteModal()}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm cursor-pointer active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Créer Site</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {dbEstablishments.map((site) => (
                    <div key={site.id} className="p-4 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-xs text-slate-900">{site.name}</h3>
                            <span className="text-[10px] text-slate-500">{site.city || 'Principal'} • Rayon {site.radius_meters || 80}m</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Actif
                        </span>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-[11px] space-y-1">
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-blue-600" />
                            GPS WGS84 :
                          </span>
                          <span className="font-mono font-bold text-slate-900">
                            {Number(site.latitude).toFixed(6)}°, {Number(site.longitude).toFixed(6)}°
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="flex items-center gap-1">
                            <Wifi className="w-3 h-3 text-emerald-600" />
                            Box Wi-Fi :
                          </span>
                          <span className="font-bold text-slate-900">
                            {site.wifi_ssid ? site.wifi_ssid : 'Aucun Wi-Fi requis'}
                          </span>
                        </div>
                      </div>

                      {confirmDeleteSiteId === site.id ? (
                        <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-2xl flex items-center justify-between gap-2 text-[11px]">
                          <span className="font-bold text-rose-800">Supprimer ce site ?</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDeleteSite(site)}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg cursor-pointer"
                            >
                              Confirmer
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteSiteId(null)}
                              className="px-2 py-1 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => openSiteModal(site)}
                            className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3 text-blue-600" />
                            <span>Modifier / Calibrer</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteSiteId(site.id)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] rounded-xl border border-rose-200 transition flex items-center justify-center gap-1 cursor-pointer"
                            title="Supprimer ce site"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Supprimer</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ===================== ONGLET 3 : PERSONNEL & ENRÔLEMENT RH ===================== */}
            {activeTab === 'equipe' && (
              <div className="space-y-3.5 animate-fadeIn">

                <div className="flex items-center justify-between px-0.5">
                  <div>
                    <h2 className="text-xs font-black text-slate-900">Collaborateurs ({filteredEmployees.length})</h2>
                    <p className="text-[10px] text-slate-500">Ajout, QR codes et liaison de smartphones</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddEmployeeModal(true)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm cursor-pointer active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter Salarié</span>
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchEmployeeQuery}
                    onChange={(e) => setSearchEmployeeQuery(e.target.value)}
                    placeholder="Rechercher par nom, matricule ou téléphone..."
                    className="w-full bg-white border border-slate-200 rounded-2xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-xs"
                  />
                </div>

                <div className="space-y-2.5">
                  {filteredEmployees.map((emp) => {
                    const isBound = !!emp.bound_device_id || !!emp.device_model;

                    return (
                      <div key={emp.id} className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xs shrink-0 shadow-sm">
                              {emp.full_name ? emp.full_name[0] : 'E'}
                            </div>
                            <div>
                              <span className="font-extrabold text-xs text-slate-900 block leading-tight">{emp.full_name}</span>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                                <span className="font-mono font-bold">{emp.employee_matricule || 'N/A'}</span>
                                <span>•</span>
                                <span>{emp.role || 'Collaborateur'}</span>
                              </div>
                            </div>
                          </div>

                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            isBound
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {isBound ? 'Téléphone Lié' : 'À Enrôler'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                          <span className="truncate max-w-[160px]">
                            📞 {emp.phone || 'Non renseigné'}
                          </span>
                          <span className="text-[10px] font-medium text-slate-600">
                            📱 {emp.device_model || 'Aucun appareil'}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleOpenWhatsApp(emp)}
                            className="py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] rounded-xl border border-emerald-100 transition flex items-center justify-center gap-1 cursor-pointer"
                            title="Envoyer code d'activation WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowQrModal(emp)}
                            className="py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] rounded-xl border border-blue-100 transition flex items-center justify-center gap-1 cursor-pointer"
                            title="Afficher QR code d'enrôlement"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>QR Code</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUnbindEmployee(emp.id, emp.full_name)}
                            className="py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-bold text-[11px] rounded-xl border border-slate-200 transition flex items-center justify-center gap-1 cursor-pointer"
                            title="Délier smartphone pour autoriser un nouveau téléphone"
                          >
                            <Unlink className="w-3 h-3" />
                            <span>Délier</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ===================== ONGLET 4 : PLANNINGS & COULOIRS HORAIRES ===================== */}
            {activeTab === 'plannings' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between px-0.5">
                  <div>
                    <h2 className="text-xs font-black text-slate-900">Couloirs Horaires ({dbSchedules.length})</h2>
                    <p className="text-[10px] text-slate-500">Arrivée, départ, pauses et jours de service</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddScheduleModal(true)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm cursor-pointer active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Créer Couloir</span>
                  </button>
                </div>

                {dbSchedules.length === 0 ? (
                  <div className="p-7 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-500 space-y-2 shadow-xs">
                    <Clock className="w-8 h-8 text-amber-500 mx-auto" />
                    <p className="font-extrabold text-slate-900">Aucun couloir horaire configuré</p>
                    <p className="text-[11px] text-slate-500">
                      Créez vos horaires flexibles (avec ou sans pause, arrivée seule ou départ seul).
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dbSchedules.map((sched) => {
                      const isArrivalOnly = sched.category === 'Arrivée seule';
                      const isDepartureOnly = sched.category === 'Départ seul';
                      const hasBreak = sched.lunch_start && sched.lunch_end && sched.lunch_start !== sched.lunch_end;
                      const activeDaysList: number[] = Array.isArray(sched.working_days) ? sched.working_days : [1, 2, 3, 4, 5];
                      const activeDaysText = DAY_LABELS
                        .filter(d => activeDaysList.includes(d.id))
                        .map(d => d.full)
                        .join(', ');

                      return (
                        <div key={sched.id} className="p-4 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                                <Clock className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="font-extrabold text-xs text-slate-900">{sched.name}</h3>
                                <span className="text-[10px] text-slate-500">
                                  {isDepartureOnly
                                    ? 'Contrôle au départ uniquement'
                                    : `Tolérance retard : +${sched.tolerance_minutes ?? 15} min`}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                {sched.category || 'Standard'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteSchedule(sched.id, sched.name)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                title="Supprimer ce couloir"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className={`grid ${hasBreak ? 'grid-cols-3' : 'grid-cols-2'} gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-center`}>
                            <div>
                              <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Arrivée</span>
                              <span className={`text-xs font-black font-mono ${isDepartureOnly ? 'text-slate-400' : 'text-slate-900'}`}>
                                {isDepartureOnly ? 'Libre' : (sched.morning_start || '08:00')}
                              </span>
                            </div>

                            {hasBreak && (
                              <div className="border-x border-slate-200 px-1">
                                <span className="text-[9px] font-extrabold text-amber-600 uppercase block">Pause</span>
                                <span className="text-[11px] font-black font-mono text-amber-700">
                                  {sched.lunch_start}-{sched.lunch_end}
                                </span>
                              </div>
                            )}

                            <div>
                              <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Départ</span>
                              <span className={`text-xs font-black font-mono ${isArrivalOnly ? 'text-slate-400' : 'text-slate-900'}`}>
                                {isArrivalOnly ? 'Libre' : (sched.afternoon_end || '17:00')}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                            <span className="font-medium truncate max-w-[200px]">Jours : {activeDaysText || 'Lun - Ven'}</span>
                            <span className="text-emerald-700 font-bold">
                              {sched.weekly_hours ? `${sched.weekly_hours}h / sem` : '✓ Actif'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ===================== ONGLET 5 : ARBITRAGE DES JUSTIFICATIONS ===================== */}
            {activeTab === 'justifs' && (
              <div className="space-y-3.5 animate-fadeIn">
                <div className="flex items-center justify-between px-0.5">
                  <div>
                    <h2 className="text-xs font-black text-slate-900">Arbitrage des Retards</h2>
                    <p className="text-[10px] text-slate-500">Validation ou rejet direct avec impact sur la paie</p>
                  </div>
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    {pendingCount} en attente
                  </span>
                </div>

                {justifications.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-500 space-y-1.5 shadow-xs">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="font-bold text-slate-900 text-xs">Aucun retard à arbitrer</p>
                    <p className="text-[11px] text-slate-500">Toutes les demandes ont été traitées.</p>
                  </div>
                ) : (
                  justifications.map((j) => {
                    const isPending = j.status === 'PENDING';
                    const isApproved = j.status === 'APPROVED';

                    return (
                      <div key={j.id} className="p-4 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-xs">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-extrabold text-xs text-slate-900 block">{j.name}</span>
                            <span className="text-[10px] text-amber-700 font-bold flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              <span>Signalé à {j.time} • {j.category}</span>
                            </span>
                          </div>
                          <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase ${
                            isPending ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            isApproved ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {isPending ? 'En attente' : isApproved ? 'Excusé' : 'Refusé'}
                          </span>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-[11px] text-slate-700 leading-relaxed italic">
                          &quot;{j.reason}&quot;
                        </div>

                        {isPending ? (
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleApproveJustif(j.id, j.name)}
                              className="py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                              <span>Valider & Excuser</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectJustif(j.id, j.name)}
                              className="py-2.5 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                              <span>Refuser</span>
                            </button>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-500 text-center font-bold py-1 bg-slate-50 rounded-xl">
                            {isApproved ? '✓ Retard validé & excusé' : '✕ Retard non excusé'}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

          </div>

          {/* BARRE DE NAVIGATION INFÉRIEURE WHATSAPP STYLE */}
          <div className="border-t border-slate-200/80 bg-white/95 backdrop-blur-md px-2 py-1.5 flex items-center justify-around shrink-0 z-30 shadow-lg">
            <button
              type="button"
              onClick={() => setActiveTab('cockpit')}
              className={`flex flex-col items-center py-1 px-2.5 rounded-2xl transition cursor-pointer ${
                activeTab === 'cockpit' ? 'text-blue-600 font-extrabold scale-105' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <Activity className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Cockpit</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sites')}
              className={`flex flex-col items-center py-1 px-2.5 rounded-2xl transition cursor-pointer ${
                activeTab === 'sites' ? 'text-blue-600 font-extrabold scale-105' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <Building2 className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Sites</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('equipe')}
              className={`flex flex-col items-center py-1 px-2.5 rounded-2xl transition cursor-pointer ${
                activeTab === 'equipe' ? 'text-blue-600 font-extrabold scale-105' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <Users className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Personnel</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('plannings')}
              className={`flex flex-col items-center py-1 px-2.5 rounded-2xl transition cursor-pointer ${
                activeTab === 'plannings' ? 'text-blue-600 font-extrabold scale-105' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <CalendarDays className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Couloirs</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('justifs')}
              className={`flex flex-col items-center py-1 px-2.5 rounded-2xl transition cursor-pointer relative ${
                activeTab === 'justifs' ? 'text-blue-600 font-extrabold scale-105' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <div className="relative">
                <CheckCircle2 className="w-4 h-4 mb-0.5" />
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </div>
              <span className="text-[10px]">Arbitrage</span>
            </button>
          </div>

          <div className="h-3.5 bg-white flex items-center justify-center shrink-0">
            <div className="w-24 h-1 bg-slate-300 rounded-full" />
          </div>

          {/* ===================== MODALES ET TIROIRS DU GÉRANT ===================== */}

          {/* MODALE 1 : CRÉER UN EMPLOYÉ */}
          {showAddEmployeeModal && (
            <div className="absolute inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 animate-fadeIn">
              <div className="bg-white border border-slate-200 w-full rounded-3xl p-4 space-y-3.5 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <span className="font-extrabold text-xs text-slate-900">Ajouter un Collaborateur</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddEmployeeModal(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateEmployee} className="space-y-3">
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">Nom & Prénoms</label>
                    <input
                      type="text"
                      required
                      value={newEmpName}
                      onChange={(e) => setNewEmpName(e.target.value)}
                      placeholder="Ex: OUEDRAOGO Moussa"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">Numéro Téléphone (WhatsApp)</label>
                    <input
                      type="tel"
                      value={newEmpPhone}
                      onChange={(e) => setNewEmpPhone(e.target.value)}
                      placeholder="+226 70 00 00 00"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">Rôle</label>
                      <select
                        value={newEmpRole}
                        onChange={(e) => setNewEmpRole(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                      >
                        <option value="Collaborateur">Collaborateur</option>
                        <option value="Superviseur">Superviseur</option>
                        <option value="Cadre">Cadre</option>
                        <option value="Technicien">Technicien</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">Site Assigné</label>
                      <select
                        value={newEmpSiteId}
                        onChange={(e) => setNewEmpSiteId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                      >
                        {dbEstablishments.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {dbSchedules.length > 0 && (
                    <div>
                      <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">Couloir Horaire Assigné</label>
                      <select
                        value={newEmpScheduleId}
                        onChange={(e) => setNewEmpScheduleId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                      >
                        {dbSchedules.map(sc => (
                          <option key={sc.id} value={sc.id}>{sc.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer mt-2"
                  >
                    Enregistrer l&apos;Employé dans Supabase
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* MODALE 2 : CRÉER / CALIBRER UN SITE AVEC DÉTECTION AUTO DU WI-FI */}
          {showAddSiteModal && (
            <div className="absolute inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 animate-fadeIn">
              <div className="bg-white border border-slate-200 w-full rounded-3xl p-4 space-y-3.5 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <span className="font-extrabold text-xs text-slate-900">
                      {editingSiteId ? 'Calibrer & Modifier le Site' : 'Créer un Site & Géofencing'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddSiteModal(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveSite} className="space-y-3">
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">Nom de l&apos;Établissement / Site</label>
                    <input
                      type="text"
                      required
                      value={newSiteName}
                      onChange={(e) => setNewSiteName(e.target.value)}
                      placeholder="Ex: Agence Ouaga 2000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">Ville</label>
                      <input
                        type="text"
                        value={newSiteCity}
                        onChange={(e) => setNewSiteCity(e.target.value)}
                        placeholder="Bobo-Dioulasso"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">Rayon (mètres)</label>
                      <select
                        value={newSiteRadius}
                        onChange={(e) => setNewSiteRadius(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-900"
                      >
                        <option value={30}>30 mètres</option>
                        <option value={50}>50 mètres</option>
                        <option value={80}>80 mètres (Recommandé)</option>
                        <option value={100}>100 mètres</option>
                        <option value={150}>150 mètres</option>
                        <option value={250}>250 mètres</option>
                      </select>
                    </div>
                  </div>

                  {/* Localisation GPS : 2 Cartes de Choix + Vue Satellite Visuelle */}
                  <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase text-blue-900">Position GPS du Site</span>
                      {gpsAccuracyMeters !== null && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          gpsAccuracyMeters <= 15
                            ? 'bg-emerald-100 text-emerald-800'
                            : gpsAccuracyMeters <= 40
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                        }`}>
                          Précision ±{gpsAccuracyMeters}m
                        </span>
                      )}
                    </div>

                    {/* 2 Cartes Exclusives */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setGpsMode('current')}
                        className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                          gpsMode === 'current'
                            ? 'bg-white border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                            : 'bg-white/60 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-900">
                          <Navigation className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>Ma position</span>
                        </div>
                        <span className="text-[9px] text-slate-500 block mt-0.5">Calage GPS direct</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setGpsMode('custom')}
                        className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                          gpsMode === 'custom'
                            ? 'bg-white border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                            : 'bg-white/60 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-900">
                          <Link2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>Personnalisée</span>
                        </div>
                        <span className="text-[9px] text-slate-500 block mt-0.5">Lien Maps ou Lat/Lon</span>
                      </button>
                    </div>

                    {/* Contenu de la Carte Choisie */}
                    {gpsMode === 'current' ? (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={handleCalibrateGpsFromDevice}
                          disabled={isCalibratingGps}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>{isCalibratingGps ? 'Affinement satellite en cours...' : '📍 Caler ma Position GPS Actuelle'}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 bg-white p-2.5 rounded-xl border border-blue-100">
                        <div>
                          <label className="text-[9px] font-extrabold uppercase text-slate-500 block mb-1">
                            Coller un Lien Google Maps (ou Lat, Lon)
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={mapsLinkInput}
                              onChange={(e) => setMapsLinkInput(e.target.value)}
                              placeholder="https://maps.app.goo.gl/... ou 11.24, -4.29"
                              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-900 focus:outline-none focus:border-blue-500"
                            />
                            <button
                              type="button"
                              onClick={handleExtractMapsLink}
                              disabled={isResolvingMapsLink}
                              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] rounded-lg transition cursor-pointer shrink-0 disabled:opacity-60"
                            >
                              {isResolvingMapsLink ? '...' : 'Extraire'}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">Latitude</label>
                            <input
                              type="text"
                              value={newSiteLat}
                              onChange={(e) => setNewSiteLat(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-mono text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">Longitude</label>
                            <input
                              type="text"
                              value={newSiteLon}
                              onChange={(e) => setNewSiteLon(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-mono text-slate-900"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {gpsStatusNote && (
                      <p className="text-[10px] text-slate-700 bg-white/90 border border-blue-200 rounded-xl p-2 leading-relaxed">
                        {gpsStatusNote}
                      </p>
                    )}

                    {/* Aperçu Carte Satellite Interactive Gratuite (Épurée, 0 texte par-dessus la zone) */}
                    <div className="space-y-1.5">
                      <DynamicSiteGeofenceMap
                        name={newSiteName || 'Site'}
                        city={newSiteCity || 'Site'}
                        lat={parseFloat(newSiteLat) || 11.247051}
                        lon={parseFloat(newSiteLon) || -4.291915}
                        radiusMeters={newSiteRadius}
                        mode="picker"
                        defaultStyle="googleHybrid"
                        heightClassName="h-56"
                        compact={true}
                        onAddressChange={(addr) => setMapResolvedAddress(addr)}
                        onCoordinatesChange={(lat, lon) => {
                          setNewSiteLat(lat.toFixed(6));
                          setNewSiteLon(lon.toFixed(6));
                          setGpsAccuracyMeters(1);
                          setGpsStatusNote("✓ Repère ajusté visuellement sur la vue satellite (précision 1m).");
                        }}
                      />
                      <div className="flex items-center justify-between text-[10px] px-1 text-slate-600 gap-2">
                        <span className="truncate font-medium">
                          {mapResolvedAddress ? `📍 ${mapResolvedAddress}` : 'Touchez la carte pour déplacer le point'}
                        </span>
                        <span className="font-mono text-slate-500 shrink-0">
                          {Number(newSiteLat || 0).toFixed(5)}, {Number(newSiteLon || 0).toFixed(5)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Multi-Wi-Fi : Détection Auto + Ajout Manuel (sans se déconnecter) */}
                  <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-[10px] font-extrabold uppercase text-slate-700">
                          Réseaux Wi-Fi Autorisés ({siteWifiList.length})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewSiteHasWifi(prev => !prev)}
                        className={`w-10 h-5 rounded-full transition p-0.5 cursor-pointer ${newSiteHasWifi ? 'bg-emerald-600' : 'bg-slate-300'}`}
                        title="Activer ou désactiver le contrôle Wi-Fi sur ce site"
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${newSiteHasWifi ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    {newSiteHasWifi ? (
                      <div className="space-y-2.5">
                        {/* Liste des box Wi-Fi déjà ajoutées pour ce site */}
                        {siteWifiList.length > 0 && (
                          <div className="space-y-1.5">
                            {siteWifiList.map((w, idx) => (
                              <div
                                key={`${w.ssid}-${idx}`}
                                className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-xl border border-emerald-200 text-[11px]"
                              >
                                <div className="min-w-0 pr-2">
                                  <span className="font-extrabold text-slate-900 block truncate">{w.ssid}</span>
                                  <span className="text-[9px] font-mono text-emerald-700 block">
                                    {w.bssid ? `MAC : ${w.bssid}` : 'Nom seul (MAC non renseignée)'}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveWifiEntry(idx)}
                                  className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer shrink-0"
                                  title="Retirer ce Wi-Fi"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Choix du mode d'ajout Wi-Fi */}
                        <div className="grid grid-cols-2 gap-1.5 bg-white/80 p-1 rounded-xl border border-emerald-100 text-[10px] font-bold">
                          <button
                            type="button"
                            onClick={() => setWifiAddMode('detect')}
                            className={`py-1.5 rounded-lg transition cursor-pointer ${
                              wifiAddMode === 'detect' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            📡 Détecter actuel
                          </button>
                          <button
                            type="button"
                            onClick={() => setWifiAddMode('manual')}
                            className={`py-1.5 rounded-lg transition cursor-pointer ${
                              wifiAddMode === 'manual' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            ✍️ Saisie manuelle
                          </button>
                        </div>

                        {wifiAddMode === 'detect' ? (
                          <button
                            type="button"
                            onClick={handleDetectSiteWifi}
                            disabled={isDetectingWifi}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
                          >
                            <Wifi className="w-3.5 h-3.5" />
                            <span>{isDetectingWifi ? 'Scan Wi-Fi...' : '+ Détecter & Ajouter mon Wi-Fi actuel'}</span>
                          </button>
                        ) : (
                          <div className="space-y-2 bg-white p-2.5 rounded-xl border border-emerald-200/80">
                            <div>
                              <label className="text-[9px] font-extrabold uppercase text-slate-500 block mb-0.5">
                                Nom du réseau (SSID) *
                              </label>
                              <input
                                type="text"
                                value={manualWifiSsid}
                                onChange={(e) => setManualWifiSsid(e.target.value)}
                                placeholder="Ex: Box_Labo, SAKO_5G, Famille_SAKO..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-extrabold uppercase text-slate-500 block mb-0.5">
                                Adresse MAC / BSSID (recommandée anti-fraude)
                              </label>
                              <input
                                type="text"
                                value={manualWifiBssid}
                                onChange={(e) => setManualWifiBssid(e.target.value)}
                                placeholder="Ex: 6a:9e:29:2b:43:08 (optionnel)"
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                              />
                              <span className="text-[9px] text-slate-500 block mt-0.5 leading-tight">
                                Sans MAC, le nom suffit, mais l&apos;adresse MAC empêche tout faux partage de connexion.
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={handleAddManualWifi}
                              className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg transition cursor-pointer"
                            >
                              + Ajouter ce réseau à la liste
                            </button>
                          </div>
                        )}

                        {wifiDetectNote && (
                          <p className="text-[10px] text-slate-700 bg-white/90 border border-emerald-200/80 rounded-xl p-2 leading-relaxed">
                            {wifiDetectNote}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-500">
                        Site extérieur / sans Wi-Fi : le pointage se basera uniquement sur la position GPS.
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer mt-2"
                  >
                    {editingSiteId ? 'Enregistrer les Modifications' : 'Valider & Enregistrer le Site'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* MODALE 3 : COULOIR HORAIRE FLEXIBLE (ARRIVÉE/DÉPART ACTIVABLES + PAUSE OPTIONNELLE) */}
          {showAddScheduleModal && (
            <div className="absolute inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 animate-fadeIn">
              <div className="bg-white border border-slate-200 w-full rounded-3xl p-4 space-y-3 shadow-2xl max-h-[92vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                    <span className="font-extrabold text-xs text-slate-900">Nouveau Couloir Horaire</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddScheduleModal(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateSchedule} className="space-y-3">
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">Intitulé du Planning / Événement</label>
                    <input
                      type="text"
                      required
                      value={newSchedName}
                      onChange={(e) => setNewSchedName(e.target.value)}
                      placeholder="Ex: Bureau Standard, Équipe Chantier, Conférence..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Heure d'Arrivée (Activable / Désactivable) */}
                  <div className={`p-3 rounded-2xl border transition ${schedTrackArrival ? 'bg-slate-50 border-slate-200' : 'bg-slate-100/60 border-slate-200/60'}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-extrabold text-slate-800">Contrôler l&apos;Heure d&apos;Arrivée</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (schedTrackArrival && !schedTrackDeparture) {
                            triggerToast("Gardez au moins l'arrivée ou le départ activé.");
                            return;
                          }
                          setSchedTrackArrival(p => !p);
                        }}
                        className={`w-10 h-5 rounded-full transition p-0.5 cursor-pointer ${schedTrackArrival ? 'bg-emerald-600' : 'bg-slate-300'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${schedTrackArrival ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                    {schedTrackArrival ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold uppercase text-slate-500 block mb-0.5">Arrivée prévue</label>
                          <input
                            type="time"
                            value={newSchedMorningStart}
                            onChange={(e) => setNewSchedMorningStart(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase text-slate-500 block mb-0.5">Tolérance (min)</label>
                          <input
                            type="number"
                            min={0}
                            max={120}
                            value={newSchedTolerance}
                            onChange={(e) => setNewSchedTolerance(Number(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900"
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500 italic block">
                        Arrivée libre : le système vérifie uniquement le départ.
                      </span>
                    )}
                  </div>

                  {/* Option Pause Déjeuner / Coupure */}
                  {schedTrackArrival && schedTrackDeparture && (
                    <div className={`p-3 rounded-2xl border transition ${schedHasBreak ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Coffee className="w-3.5 h-3.5 text-amber-600" />
                          <span className="text-[11px] font-extrabold text-slate-800">Ajouter une Plage de Pause</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSchedHasBreak(p => !p)}
                          className={`w-10 h-5 rounded-full transition p-0.5 cursor-pointer ${schedHasBreak ? 'bg-amber-600' : 'bg-slate-300'}`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform ${schedHasBreak ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      {schedHasBreak && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div>
                            <label className="text-[9px] font-bold uppercase text-amber-800 block mb-0.5">Début pause</label>
                            <input
                              type="time"
                              value={newSchedBreakStart}
                              onChange={(e) => setNewSchedBreakStart(e.target.value)}
                              className="w-full bg-white border border-amber-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold uppercase text-amber-800 block mb-0.5">Reprise</label>
                            <input
                              type="time"
                              value={newSchedBreakEnd}
                              onChange={(e) => setNewSchedBreakEnd(e.target.value)}
                              className="w-full bg-white border border-amber-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-mono"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Heure de Départ (Activable / Désactivable) */}
                  <div className={`p-3 rounded-2xl border transition ${schedTrackDeparture ? 'bg-slate-50 border-slate-200' : 'bg-slate-100/60 border-slate-200/60'}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-extrabold text-slate-800">Contrôler l&apos;Heure de Départ</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (schedTrackDeparture && !schedTrackArrival) {
                            triggerToast("Gardez au moins l'arrivée ou le départ activé.");
                            return;
                          }
                          setSchedTrackDeparture(p => !p);
                        }}
                        className={`w-10 h-5 rounded-full transition p-0.5 cursor-pointer ${schedTrackDeparture ? 'bg-blue-600' : 'bg-slate-300'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${schedTrackDeparture ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                    {schedTrackDeparture ? (
                      <div>
                        <label className="text-[9px] font-bold uppercase text-slate-500 block mb-0.5">Départ prévu</label>
                        <input
                          type="time"
                          value={newSchedAfternoonEnd}
                          onChange={(e) => setNewSchedAfternoonEnd(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-mono"
                        />
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500 italic block">
                        Départ libre : utile pour un événement ou un pointage à l&apos;entrée uniquement.
                      </span>
                    )}
                  </div>

                  {/* Jours Actifs */}
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1.5">Jours Concernés</label>
                    <div className="grid grid-cols-7 gap-1">
                      {DAY_LABELS.map((d) => {
                        const active = newSchedDays.includes(d.id);
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => toggleSchedDay(d.id)}
                            className={`py-1.5 rounded-xl text-[11px] font-extrabold transition cursor-pointer ${
                              active
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {d.short}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Résumé automatique */}
                  <div className="text-[11px] font-bold text-blue-800 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-center">
                    {scheduleDailyPreview}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer"
                  >
                    Activer ce Couloir Horaire
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* MODALE 4 : QR CODE D'ENRÔLEMENT SALARIÉ */}
          {showQrModal && (
            <div className="absolute inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
              <div className="bg-white border border-slate-200 w-full max-w-xs rounded-3xl p-5 space-y-4 text-center shadow-2xl">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-extrabold text-xs text-slate-900">Enrôlement Mobile Salarié</span>
                  <button
                    type="button"
                    onClick={() => setShowQrModal(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-3 bg-white rounded-2xl border-2 border-dashed border-blue-500 inline-flex mx-auto shadow-md">
                  <RealQrCode
                    value={`${getPublicUrl('/apk')}?org=${orgCode}&mat=${showQrModal.employee_matricule}`}
                    size={170}
                  />
                </div>

                <div>
                  <span className="font-extrabold text-sm text-slate-900 block">{showQrModal.full_name}</span>
                  <span className="text-[11px] font-mono text-blue-600 font-bold block">{showQrModal.employee_matricule}</span>
                  <p className="text-[10px] text-slate-500 mt-1">
                    L&apos;employé doit viser ce QR code avec son application mobile pour lier son téléphone.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    handleOpenWhatsApp(showQrModal);
                    setShowQrModal(null);
                  }}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Envoyer également par WhatsApp
                </button>
              </div>
            </div>
          )}

          {/* MODALE 5 : DIFFUSION PUSH NOTIFICATION */}
          {showBroadcastModal && (
            <div className="absolute inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 animate-fadeIn">
              <div className="bg-white border border-slate-200 w-full rounded-3xl p-4 space-y-3 shadow-2xl">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-blue-600" />
                    Diffuser une Annonce d&apos;Urgence
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowBroadcastModal(false)}
                    className="text-slate-400 hover:text-slate-700 text-xs p-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  Cette notification fera sonner instantanément le smartphone de tous les collaborateurs de {orgName}.
                </p>
                <textarea
                  rows={3}
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                  placeholder="Ex: Réunion générale d'urgence dans la salle de conférence à 14h00..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSendBroadcast}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white rounded-xl transition cursor-pointer active:scale-95 shadow-md shadow-blue-500/20"
                >
                  Envoyer la Notification Push
                </button>
              </div>
            </div>
          )}

          {/* TIROIR MODAL 6 : RELEVÉS & SYNTHÈSE RH DÉTAILLÉS (PLAGE LIBRE + FICHE CLIQUABLE + EXPORT EXCEL/PDF) */}
          {showRelevesDrawer && (
            <div className="absolute inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-2 sm:p-3 animate-fadeIn">
              <div className="bg-white border border-slate-200 w-full rounded-3xl p-4 space-y-3 shadow-2xl h-[92%] flex flex-col">

                {/* En-tête */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
                  {selectedHrSummary ? (
                    <button
                      type="button"
                      onClick={() => { setSelectedHrEmployeeId(null); setHrDetailFilter('ALL'); }}
                      className="flex items-center gap-1.5 text-xs font-extrabold text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Retour Synthèse</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span className="font-extrabold text-xs text-slate-900">Relevés & Synthèse RH</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowRelevesDrawer(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* VUE 1 : SYNTHÈSE GLOBALE AVEC CHOIX DE PLAGE DE DATES */}
                {!selectedHrSummary ? (
                  <>
                    {/* Raccourcis de Période épurés : 7 jours, 1 mois, Personnalisé */}
                    <div className="space-y-2 shrink-0">
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: '7d', label: '7 jours' },
                          { id: '30d', label: '1 mois' },
                          { id: 'custom', label: 'Personnalisé' }
                        ].map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => applyHrPreset(p.id as any)}
                            className={`py-1.5 rounded-xl text-[10px] font-extrabold transition cursor-pointer ${
                              hrPreset === p.id
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>

                      {/* Sélecteurs de dates exactes */}
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200/80">
                        <div>
                          <label className="text-[9px] font-extrabold uppercase text-slate-400 block mb-0.5">Du</label>
                          <input
                            type="date"
                            value={hrStartDate}
                            onChange={(e) => { setHrPreset('custom'); setHrStartDate(e.target.value); }}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-900 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-extrabold uppercase text-slate-400 block mb-0.5">Au</label>
                          <input
                            type="date"
                            value={hrEndDate}
                            onChange={(e) => { setHrPreset('custom'); setHrEndDate(e.target.value); }}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-900 font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Liste Cliquable des Employés avec Vraies Stats */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                      {hrLoading ? (
                        <div className="p-8 text-center text-xs text-slate-500">
                          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          Calcul des statistiques sur la période...
                        </div>
                      ) : hrSummaries.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-500">
                          Aucun employé trouvé dans cette organisation.
                        </div>
                      ) : (
                        hrSummaries.map((s) => (
                          <button
                            key={s.employee.id}
                            type="button"
                            onClick={() => setSelectedHrEmployeeId(s.employee.id)}
                            className="w-full text-left p-3 bg-slate-50 hover:bg-blue-50/60 border border-slate-200/80 hover:border-blue-300 rounded-2xl flex items-center justify-between text-xs transition active:scale-[0.99] cursor-pointer group"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-extrabold text-slate-900 block truncate group-hover:text-blue-700">
                                {s.employee.full_name}
                              </span>
                              <span className="text-[10px] text-slate-500 block">
                                {s.employee.employee_matricule || 'N/A'} • {s.presentDays} j. présent{s.presentDays > 1 ? 's' : ''}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="text-right">
                                <span className="font-mono font-extrabold text-emerald-700 block">
                                  {formatMinutesAsHours(s.totalWorkedMinutes)}
                                </span>
                                {s.lateDays > 0 ? (
                                  <span className="text-[10px] text-amber-700 font-bold block">
                                    {s.lateDays} j. retard ({formatLateMinutes(s.totalLateMinutes)})
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-emerald-600 font-bold block">
                                    ✓ 0 retard
                                  </span>
                                )}
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                            </div>
                          </button>
                        ))
                      )}
                    </div>

                    {/* Boutons d'Export Réels */}
                    <div className="grid grid-cols-3 gap-2 pt-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleExportExcel()}
                        className="col-span-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer active:scale-95"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Exporter Excel (.xlsx)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportPdfPrint()}
                        className="py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                        title="Imprimer ou enregistrer en PDF"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </button>
                    </div>
                  </>
                ) : (
                  /* VUE 2 : FICHE DÉTAILLÉE D'UN COLLABORATEUR */
                  <>
                    <div className="shrink-0 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-black text-sm text-slate-900">{selectedHrSummary.employee.full_name}</h3>
                          <span className="text-[10px] text-slate-500 block">
                            {selectedHrSummary.employee.employee_matricule || 'N/A'} • Du {hrStartDate} au {hrEndDate}
                          </span>
                        </div>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          selectedHrSummary.lateDays === 0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {selectedHrSummary.punctualityRate}% Ponctuel
                        </span>
                      </div>

                      {/* 4 KPIs individuels */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-emerald-50/70 border border-emerald-100 p-2.5 rounded-2xl">
                          <span className="text-[9px] font-extrabold uppercase text-emerald-700 block">Heures Travaillées</span>
                          <span className="text-sm font-black font-mono text-slate-900">
                            {formatMinutesAsHours(selectedHrSummary.totalWorkedMinutes)}
                          </span>
                        </div>
                        <div className="bg-blue-50/70 border border-blue-100 p-2.5 rounded-2xl">
                          <span className="text-[9px] font-extrabold uppercase text-blue-700 block">Jours Présents</span>
                          <span className="text-sm font-black font-mono text-slate-900">
                            {selectedHrSummary.presentDays} jour{selectedHrSummary.presentDays > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="bg-amber-50/70 border border-amber-100 p-2.5 rounded-2xl">
                          <span className="text-[9px] font-extrabold uppercase text-amber-700 block">Jours de Retard</span>
                          <span className="text-sm font-black font-mono text-amber-800">
                            {selectedHrSummary.lateDays} jour{selectedHrSummary.lateDays > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="bg-rose-50/70 border border-rose-100 p-2.5 rounded-2xl">
                          <span className="text-[9px] font-extrabold uppercase text-rose-700 block">Cumul Retards</span>
                          <span className="text-sm font-black font-mono text-rose-800">
                            {formatLateMinutes(selectedHrSummary.totalLateMinutes)}
                          </span>
                        </div>
                      </div>

                      {/* Filtre Tous les jours / Retards uniquement */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] font-extrabold text-slate-800">Détail par Jour</span>
                        <div className="flex bg-slate-100 p-0.5 rounded-xl text-[10px] font-bold">
                          <button
                            type="button"
                            onClick={() => setHrDetailFilter('ALL')}
                            className={`px-2 py-0.5 rounded-lg cursor-pointer ${
                              hrDetailFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                            }`}
                          >
                            Tous ({selectedHrSummary.days.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setHrDetailFilter('LATE')}
                            className={`px-2 py-0.5 rounded-lg cursor-pointer ${
                              hrDetailFilter === 'LATE' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-500'
                            }`}
                          >
                            Retards ({selectedHrSummary.lateDays})
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Liste des jours détaillés */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                      {selectedHrSummary.days.filter(d => hrDetailFilter === 'ALL' || d.lateMinutes > 0).length === 0 ? (
                        <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-500">
                          {hrDetailFilter === 'LATE'
                            ? 'Aucun retard enregistré sur cette période !'
                            : 'Aucun pointage enregistré sur cette plage de dates.'}
                        </div>
                      ) : (
                        selectedHrSummary.days
                          .filter(d => hrDetailFilter === 'ALL' || d.lateMinutes > 0)
                          .map((day) => (
                            <div
                              key={day.dateKey}
                              className={`p-3 rounded-2xl border text-xs space-y-1 ${
                                day.lateMinutes > 0
                                  ? 'bg-amber-50/40 border-amber-200'
                                  : 'bg-slate-50 border-slate-200/70'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-slate-900 capitalize">{day.dateLabel}</span>
                                {day.lateMinutes > 0 ? (
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                    ⏰ Retard +{formatLateMinutes(day.lateMinutes)}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                    ✓ À l&apos;heure
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-slate-600">
                                <span className="font-mono">
                                  {day.firstTime} → {day.lastTime || 'En cours'}
                                </span>
                                <span className="font-bold text-slate-800">
                                  {day.workedMinutes > 0 ? formatMinutesAsHours(day.workedMinutes) : '1 seul pointage'}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 block">📍 {day.siteName}</span>
                            </div>
                          ))
                      )}
                    </div>

                    {/* Export individuel */}
                    <div className="grid grid-cols-3 gap-2 pt-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleExportExcel(selectedHrSummary)}
                        className="col-span-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Exporter sa Fiche Excel</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportPdfPrint(selectedHrSummary)}
                        className="py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* TIROIR MODAL 7 : SÉCURITÉ ANTI-TRICHE CONNECTÉE À SUPABASE */}
          {showSecurityDrawer && (
            <div className="absolute inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 animate-fadeIn">
              <div className="bg-white border border-slate-200 w-full rounded-3xl p-4 space-y-3.5 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span className="font-extrabold text-xs text-slate-900">Règles Anti-Triche & Sécurité</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSecurityDrawer(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-2.5 text-xs">
                  {/* 1. Biométrie / Code PIN au Pointage (Nouveau, synchronisé avec APK Employé) */}
                  <div className="flex items-center justify-between p-3 bg-blue-50/70 rounded-2xl border border-blue-100 gap-2">
                    <div className="flex items-start gap-2">
                      <Fingerprint className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-900 block">Biométrie / Code PIN au pointage</span>
                        <span className="text-[10px] text-slate-600 block leading-snug">
                          Exige Empreinte / Face ID (prioritaires) ou Code PIN du téléphone à chaque scan.
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSecBiometricsRequired(p => !p)}
                      className={`w-11 h-6 rounded-full transition p-1 cursor-pointer shrink-0 ${secBiometricsRequired ? 'bg-blue-600' : 'bg-slate-300'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${secBiometricsRequired ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* 2. Blocage Mock GPS */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 gap-2">
                    <div>
                      <span className="font-bold text-slate-900 block">Blocage Mock GPS</span>
                      <span className="text-[10px] text-slate-500">Refus des fausses localisations</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSecMockGpsBlocked(p => !p)}
                      className={`w-11 h-6 rounded-full transition p-1 cursor-pointer shrink-0 ${secMockGpsBlocked ? 'bg-blue-600' : 'bg-slate-300'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${secMockGpsBlocked ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* 3. Liaison 1 Téléphone / Salarié */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 gap-2">
                    <div>
                      <span className="font-bold text-slate-900 block">Liaison 1 Téléphone / Salarié</span>
                      <span className="text-[10px] text-slate-500">Empêche de pointer pour autrui</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSecDeviceBindingStrict(p => !p)}
                      className={`w-11 h-6 rounded-full transition p-1 cursor-pointer shrink-0 ${secDeviceBindingStrict ? 'bg-blue-600' : 'bg-slate-300'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${secDeviceBindingStrict ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* 4. Wi-Fi Obligatoire en Box */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 gap-2">
                    <div>
                      <span className="font-bold text-slate-900 block">Wi-Fi Obligatoire en Box</span>
                      <span className="text-[10px] text-slate-500">Exige la présence d&apos;un Wi-Fi autorisé</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSecWifiMandatory(p => !p)}
                      className={`w-11 h-6 rounded-full transition p-1 cursor-pointer shrink-0 ${secWifiMandatory ? 'bg-blue-600' : 'bg-slate-300'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${secWifiMandatory ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={savingSecurity}
                  onClick={() => handleSaveSecurityPolicy(true)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-60 shadow-sm"
                >
                  {savingSecurity ? 'Enregistrement en cours...' : 'Appliquer les Règles de Sécurité'}
                </button>

                <button
                  type="button"
                  onClick={() => { setShowSecurityDrawer(false); setShowAuditDrawer(true); }}
                  className="w-full py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-[11px] rounded-xl border border-purple-200 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>Consulter le Journal d&apos;Audit Inviolable</span>
                </button>
              </div>
            </div>
          )}

          {/* TIROIR MODAL 8 : JOURNAL D'AUDIT INVIOLABLE (APPEND-ONLY + SHA-256) */}
          {showAuditDrawer && (
            <div className="absolute inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-2 sm:p-3 animate-fadeIn">
              <div className="bg-white border border-slate-200 w-full rounded-3xl p-4 space-y-3 shadow-2xl h-[92%] flex flex-col">

                {/* En-tête */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-purple-600" />
                    <div>
                      <span className="font-extrabold text-xs text-slate-900 block">Journal d&apos;Audit Inviolable</span>
                      <span className="text-[9px] text-slate-500 block">Lecture seule • Chaînage SHA-256 anti-falsification</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAuditDrawer(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Bandeau d'intégrité cryptographique & mode de stockage */}
                <div className="space-y-1.5 shrink-0">
                  <div className={`p-2.5 rounded-2xl border flex items-center justify-between text-[11px] ${
                    auditChainIntact
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}>
                    <span className="font-extrabold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      {auditChainIntact
                        ? `Intégrité SHA-256 vérifiée (${auditEntries.length} entrée${auditEntries.length > 1 ? 's' : ''})`
                        : '⚠️ Alerte : rupture dans la chaîne cryptographique !'}
                    </span>
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/80 border border-current/20">
                      {auditStorageMode === 'supabase_immutable' ? 'Cloud SQL' : 'Serveur Local'}
                    </span>
                  </div>

                  {auditNeedsSql && (
                    <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-[10px] text-amber-900 flex items-center justify-between gap-2">
                      <span className="leading-snug">
                        Table cloud non activée : exécutez <code className="font-mono font-bold">audit_logs_immutable.sql</code> dans Supabase pour verrouiller le cloud PostgreSQL.
                      </span>
                    </div>
                  )}

                  {/* Filtres par catégorie */}
                  <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl text-[10px] font-bold">
                    {[
                      { id: 'ALL', label: 'Tous' },
                      { id: 'AUTH', label: 'Connexions' },
                      { id: 'SITES_SEC', label: 'Sites/Séc.' },
                      { id: 'OPS', label: 'RH' }
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setAuditFilter(f.id as any)}
                        className={`py-1 rounded-lg transition cursor-pointer ${
                          auditFilter === f.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Liste immuable des événements */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                  {auditLoading ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                      <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Vérification de la chaîne d&apos;audit...
                    </div>
                  ) : auditEntries.filter((ev) => {
                      if (auditFilter === 'ALL') return true;
                      if (auditFilter === 'AUTH') return ev.event_type?.startsWith('LOGIN_');
                      if (auditFilter === 'SITES_SEC') return ev.event_type?.startsWith('SITE_') || ev.event_type?.startsWith('SECURITY_');
                      return !ev.event_type?.startsWith('LOGIN_') && !ev.event_type?.startsWith('SITE_') && !ev.event_type?.startsWith('SECURITY_');
                    }).length === 0 ? (
                    <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-500 space-y-1">
                      <Radio className="w-6 h-6 text-purple-500 mx-auto" />
                      <p className="font-bold text-slate-800">Aucun événement enregistré pour ce filtre</p>
                      <p className="text-[10px]">
                        Toutes les tentatives de connexion (réussies ou refusées) et modifications critiques apparaîtront ici de manière immuable.
                      </p>
                    </div>
                  ) : (
                    auditEntries
                      .filter((ev) => {
                        if (auditFilter === 'ALL') return true;
                        if (auditFilter === 'AUTH') return ev.event_type?.startsWith('LOGIN_');
                        if (auditFilter === 'SITES_SEC') return ev.event_type?.startsWith('SITE_') || ev.event_type?.startsWith('SECURITY_');
                        return !ev.event_type?.startsWith('LOGIN_') && !ev.event_type?.startsWith('SITE_') && !ev.event_type?.startsWith('SECURITY_');
                      })
                      .map((ev) => {
                        const isCrit = ev.severity === 'CRITICAL';
                        const isWarn = ev.severity === 'WARNING';
                        const dt = new Date(ev.created_at);
                        const dtStr = dt.toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        });
                        const detailsSummary = ev.details && typeof ev.details === 'object'
                          ? Object.entries(ev.details).map(([k, v]) => `${k}: ${v}`).join(' • ')
                          : '';

                        return (
                          <div
                            key={ev.id}
                            className={`p-3 rounded-2xl border text-[11px] space-y-1.5 ${
                              isCrit
                                ? 'bg-rose-50/70 border-rose-200'
                                : isWarn
                                  ? 'bg-amber-50/60 border-amber-200'
                                  : 'bg-slate-50 border-slate-200/80'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                                isCrit
                                  ? 'bg-rose-100 text-rose-800'
                                  : isWarn
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-blue-100 text-blue-800'
                              }`}>
                                {ev.event_type}
                              </span>
                              <span className="font-mono text-[10px] text-slate-500 shrink-0">{dtStr}</span>
                            </div>

                            <div className="text-slate-800 font-bold">
                              👤 {ev.actor_name || 'Inconnu'} {ev.actor_identifier ? `(${ev.actor_identifier})` : ''}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-slate-600">
                              <span>🌐 IP : <strong className="font-mono text-slate-800">{ev.ip_address || 'Non transmise'}</strong></span>
                              <span>💻 {ev.user_agent || 'Agent non transmis'}</span>
                            </div>

                            {detailsSummary && (
                              <div className="text-[10px] text-slate-700 bg-white/80 rounded-lg px-2 py-1 border border-slate-200/60 break-words">
                                {detailsSummary}
                              </div>
                            )}

                            <div className="text-[9px] font-mono text-slate-400 truncate">
                              🔒 Sceau SHA-256 : #{String(ev.entry_hash || '').slice(0, 16)}...
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>

                {/* Pied : Export Excel officiel du journal d'audit */}
                <div className="grid grid-cols-2 gap-2 pt-1 shrink-0">
                  <button
                    type="button"
                    onClick={loadAuditLogs}
                    className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    ↻ Actualiser
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (auditEntries.length === 0) {
                        triggerToast("Aucune entrée d'audit à exporter.");
                        return;
                      }
                      const wb = XLSX.utils.book_new();
                      const rows = auditEntries.map(ev => ({
                        'Horodatage UTC': ev.created_at,
                        'Événement': ev.event_type,
                        'Sévérité': ev.severity,
                        'Acteur': ev.actor_name || 'Inconnu',
                        'Identifiant': ev.actor_identifier || '',
                        'Adresse IP': ev.ip_address || 'Non transmise',
                        'Terminal': ev.user_agent || '',
                        'Détails': JSON.stringify(ev.details || {}),
                        'Hash SHA-256': ev.entry_hash,
                        'Hash Précédent': ev.prev_hash
                      }));
                      const ws = XLSX.utils.json_to_sheet(rows);
                      XLSX.utils.book_append_sheet(wb, ws, 'Audit_Inviolable');
                      XLSX.writeFile(wb, `Audit_Securite_${orgCode}_${toDateInputString(new Date())}.xlsx`);
                      triggerToast("✓ Journal d'audit Excel téléchargé !");
                    }}
                    className="py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exporter Audit</span>
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      </main>

      {/* MODALE EXTERNE : SCANNER AVEC UN SMARTPHONE RÉEL */}
      {showPhoneQrModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 space-y-4 text-center max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">Ouvrir sur Mon Smartphone</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPhoneQrModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-white rounded-2xl border-2 border-dashed border-blue-500 inline-flex items-center justify-center shadow-md mx-auto">
              <RealQrCode
                value={getPublicUrl('/maquette-gerant')}
                size={180}
              />
            </div>

            <div className="space-y-1">
              <span className="font-bold text-slate-900 text-xs block">Scannez ce QR Code avec l&apos;appareil photo</span>
              <span className="text-[11px] text-blue-700 font-bold block bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                📶 Ouvrir sur le réseau local ({localNetworkIp})
              </span>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-left">
              <span className="font-mono text-[11px] text-blue-600 truncate flex-1 select-all font-bold">
                {getPublicUrl('/maquette-gerant')}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    navigator.clipboard.writeText(getPublicUrl('/maquette-gerant'));
                    triggerToast("Lien copié dans le presse-papier !");
                  }
                }}
                className="p-1.5 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition cursor-pointer"
                title="Copier l'URL"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowPhoneQrModal(false)}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
