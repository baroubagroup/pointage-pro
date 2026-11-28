'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { createClient } from '@/lib/supabase/client';
import { RealQrCode } from '@/components/real-qr-code';
import { 
  Building2, 
  Shield, 
  Save, 
  MapPin, 
  Plus, 
  CheckCircle2, 
  Radio, 
  Smartphone, 
  Wifi, 
  Eye, 
  Fingerprint, 
  Clock, 
  FileCheck2,
  AlertCircle,
  GraduationCap,
  Briefcase,
  Ticket,
  Sparkles,
  CalendarDays,
  Trash2,
  Users,
  Compass,
  Radar,
  Crosshair,
  LocateFixed,
  RefreshCw,
  X,
  Layers,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  Check,
  Search,
  Sun,
  Coffee,
  Moon,
  AlertTriangle,
  QrCode,
  Printer,
  Share2,
  MessageSquare,
  Copy,
  Mail,
  Download,
  Lock,
  Globe,
  PhoneCall,
  HelpCircle,
  Info,
  ExternalLink,
  FileText,
  CheckCheck,
  CalendarCheck,
  CalendarX,
  Upload,
  Image as ImageIcon,
  KeyRound,
  Link as LinkIcon,
  Navigation
} from 'lucide-react';

// ==================== INTERFACES ====================
type SettingsTab = 'general' | 'sites' | 'plannings' | 'securite';

interface HolidayExemption {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  category: 'FERIE_LEGAL' | 'CONGE_ENTREPRISE' | 'EVENEMENT_SPECIAL' | 'PEDAGOGIQUE';
  is_paid: boolean;
  applies_to_all: boolean;
  schedule_id?: string;
  notes?: string;
  created_at: string;
}

interface SimpleSite {
  id: string;
  name: string;
  city: string;
  lat: number;
  lon: number;
  radiusMeters: number;
  wifiBssid: string;
  wifiSsid?: string;
  activeCount: number;
  isActive?: boolean;
}

interface Schedule {
  id: string;
  name: string;
  category: string;
  working_days: number[];
  morning_start: string;
  morning_end: string;
  lunch_start: string;
  lunch_end: string;
  afternoon_start: string;
  afternoon_end: string;
  tolerance_minutes: number;
  weekly_hours: number;
  assignedCount?: number;
  is_active: boolean;
}

interface SecurityConfig {
  require_wifi_bssid: boolean;
  hard_block_mock_gps: boolean;
  require_device_binding: boolean;
  require_face_on_colleague_assist: boolean;
  require_biometrics: boolean;
  block_early_arrival: boolean;
  auto_prompt_delay_justification: boolean;
  allow_offline: boolean;
  grace_delay_minutes: number;
  max_break_minutes: number;
  sector_profile?: 'ENTERPRISE' | 'SCHOOL' | 'EVENT';
  admission_policy?: 'STRICT' | 'MODERATE' | 'OPEN';
  timezone?: string;
  currency?: string;
  support_contact?: string;
  org_logo?: string;
  holidays?: HolidayExemption[];
}

// Générateur canonique de code d'organisation anti-collision et anti-devinette
function generateCanonicalOrgCode(orgName: string): string {
  const words = (orgName || 'POINTAGE')
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => !['DE', 'DU', 'DES', 'LE', 'LA', 'LES', 'ET', 'AU', 'AUX', 'OF', 'THE', 'AND', 'SARL', 'SA', 'SAS', 'ONG'].includes(w.toUpperCase()));
  
  let initials = '';
  if (words.length === 0) {
    initials = 'PRO';
  } else if (words.length === 1) {
    initials = words[0].slice(0, 3).toUpperCase();
  } else {
    initials = words.map(w => w[0]).join('').slice(0, 4).toUpperCase();
  }
  if (initials.length < 2) initials = (initials + 'PRO').slice(0, 3);

  // 5 caractères haute entropie avec 32 symboles sans ambiguïté visuelle (ni 0/O, ni 1/I/L)
  const charset = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  let entropy = '';
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const bytes = new Uint8Array(5);
    window.crypto.getRandomValues(bytes);
    for (let i = 0; i < 5; i++) {
      entropy += charset[bytes[i] % charset.length];
    }
  } else {
    for (let i = 0; i < 5; i++) {
      entropy += charset[Math.floor(Math.random() * charset.length)];
    }
  }

  return `ORG-${entropy}-${initials}`;
}

function isCanonicalCode(code: string): boolean {
  if (!code) return false;
  return /^ORG-[2-9A-HJ-NP-Z0-9]{4,6}-[A-Z0-9]{2,5}$/i.test(code.trim());
}

// Presets de jours fériés officiels
const DEFAULT_HOLIDAY_PRESETS: Omit<HolidayExemption, 'id' | 'created_at'>[] = [
  {
    date: '2026-01-01',
    name: "Jour de l'An",
    category: 'FERIE_LEGAL',
    is_paid: true,
    applies_to_all: true,
    notes: 'Jour férié légal chômé payé'
  },
  {
    date: '2026-05-01',
    name: 'Fête du Travail',
    category: 'FERIE_LEGAL',
    is_paid: true,
    applies_to_all: true,
    notes: 'Célébration internationale des travailleurs'
  },
  {
    date: '2026-08-07',
    name: "Fête Nationale de l'Indépendance",
    category: 'FERIE_LEGAL',
    is_paid: true,
    applies_to_all: true,
    notes: 'Fête nationale chômée payée'
  },
  {
    date: '2026-11-01',
    name: 'Toussaint',
    category: 'FERIE_LEGAL',
    is_paid: true,
    applies_to_all: true,
    notes: 'Fête de la Toussaint'
  },
  {
    date: '2026-12-25',
    name: 'Noël',
    category: 'FERIE_LEGAL',
    is_paid: true,
    applies_to_all: true,
    notes: 'Fête de Noël'
  }
];

const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  require_wifi_bssid: false,
  hard_block_mock_gps: true,
  require_device_binding: true,
  require_face_on_colleague_assist: true,
  require_biometrics: true,
  block_early_arrival: true,
  auto_prompt_delay_justification: true,
  allow_offline: true,
  grace_delay_minutes: 15,
  max_break_minutes: 90,
  sector_profile: 'ENTERPRISE',
};

const DAY_LABELS = [
  { day: 1, label: 'Lun', full: 'Lundi' },
  { day: 2, label: 'Mar', full: 'Mardi' },
  { day: 3, label: 'Mer', full: 'Mercredi' },
  { day: 4, label: 'Jeu', full: 'Jeudi' },
  { day: 5, label: 'Ven', full: 'Vendredi' },
  { day: 6, label: 'Sam', full: 'Samedi' },
  { day: 7, label: 'Dim', full: 'Dimanche' },
];

// Calcul Haversine en mètres
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Convertit HH:mm en minutes depuis minuit
function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Chargement dynamique côté client de la carte Leaflet / OpenStreetMap (sans SSR)
const DynamicSiteGeofenceMap = dynamic(
  () => import('@/components/site-geofence-map').then((mod) => mod.SiteGeofenceMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-80 sm:h-96 rounded-2xl bg-slate-100 flex items-center justify-center border border-slate-200">
        <div className="flex flex-col items-center gap-2 text-slate-400">
          <MapPin className="w-6 h-6 animate-bounce text-blue-500" />
          <span className="text-xs font-semibold">Chargement de la carte interactive...</span>
        </div>
      </div>
    ),
  }
);

function ParametresContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Tab actif
  const tabFromUrl = (searchParams.get('tab') as SettingsTab) || 'general';
  const [activeTab, setActiveTab] = useState<SettingsTab>(tabFromUrl);

  // Synchronisation automatique et immédiate quand l'utilisateur clique dans la sidebar
  useEffect(() => {
    if (tabFromUrl && ['general', 'sites', 'plannings', 'securite'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    router.push(`/parametres?tab=${tab}`, { scroll: false });
  };

  // State Général & Isolation Multi-Entreprises
  const [currentOrgId, setCurrentOrgId] = useState<string>(() => (typeof window !== 'undefined' ? localStorage.getItem('pointage_org_id') || '' : ''));
  const [orgName, setOrgName] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('pointage_org_name') || '' : ''));
  const [orgCode, setOrgCode] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('pointage_org_code') || '' : ''));
  const [orgLogo, setOrgLogo] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [showPosterModal, setShowPosterModal] = useState(false);
  const [timezone, setTimezone] = useState('Africa/Abidjan (GMT 0)');
  const [sectorProfile, setSectorProfile] = useState<'ENTERPRISE' | 'SCHOOL' | 'EVENT'>('ENTERPRISE');
  const [admissionPolicy, setAdmissionPolicy] = useState<'STRICT' | 'MODERATE' | 'OPEN'>('STRICT');
  const [currency, setCurrency] = useState('FCFA (XOF)');
  const [supportContact, setSupportContact] = useState('+225 07 00 00 00 00');
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig>(DEFAULT_SECURITY_CONFIG);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // URL dynamique d'enrôlement officiel sur le domaine courant
  const liveJoinUrl = useMemo(() => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/rejoindre?org=${encodeURIComponent(orgCode)}&name=${encodeURIComponent(orgName)}`;
    }
    return `http://localhost:3000/rejoindre?org=${encodeURIComponent(orgCode)}&name=${encodeURIComponent(orgName)}`;
  }, [orgCode, orgName]);

  const handleCopyLiveJoinUrl = () => {
    navigator.clipboard.writeText(liveJoinUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // State Plannings & Jours Fériés / Congés
  const [planningsSubTab, setPlanningsSubTab] = useState<'schedules' | 'holidays'>('schedules');
  const [holidays, setHolidays] = useState<HolidayExemption[]>([]);
  const [showAddHolidayModal, setShowAddHolidayModal] = useState(false);
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayCategory, setNewHolidayCategory] = useState<'FERIE_LEGAL' | 'CONGE_ENTREPRISE' | 'EVENEMENT_SPECIAL' | 'PEDAGOGIQUE'>('FERIE_LEGAL');
  const [newHolidayPaid, setNewHolidayPaid] = useState(true);
  const [newHolidayNeutralize, setNewHolidayNeutralize] = useState(true);
  const [newHolidayNotes, setNewHolidayNotes] = useState('');

  // Helper copie message WhatsApp officiel avec lien d'enrôlement direct
  const handleCopyWhatsAppMessage = () => {
    const terminology = sectorProfile === 'SCHOOL' ? 'élèves / parents d\'élèves' : 'collaborateurs / agents';
    const text = `📢 *PointagePro - Guide de Connexion Officiel*\n🏛️ *${orgName}*\n\nBonjour chers ${terminology},\nPour valider vos présences et pointages certifiés directement depuis votre smartphone :\n\n🔗 *Lien Direct d'Enrôlement Mobile :*\n${liveJoinUrl}\n\nOu suivez ces 3 étapes simples :\n1️⃣ Ouvrez l'application *PointagePro* (ou cliquez sur le lien ci-dessus).\n2️⃣ Saisissez votre Code Établissement Officiel : *${orgCode}*\n3️⃣ Renseignez votre Matricule personnel et activez votre sécurité locale (Empreinte / FaceID).\n\n🔒 Pointages certifiés par satellite WGS84 et réseau certifié.\n📞 Assistance & Support : ${supportContact}`;
    navigator.clipboard.writeText(text);
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 2500);
  };

  // Helper téléchargement du QR code HD basé sur le lien d'onboarding réel
  const handleDownloadQrCode = () => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=15&data=${encodeURIComponent(liveJoinUrl)}`;
    window.open(qrUrl, '_blank');
  };

  // State Sites & Radar
  const [sites, setSites] = useState<SimpleSite[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [showAddSiteModal, setShowAddSiteModal] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteCity, setNewSiteCity] = useState('');
  const [newSiteLat, setNewSiteLat] = useState('');
  const [newSiteLon, setNewSiteLon] = useState('');
  const [newSiteRadius, setNewSiteRadius] = useState('80');
  const [newSiteWifiSsid, setNewSiteWifiSsid] = useState('');
  const [newSiteWifiBssid, setNewSiteWifiBssid] = useState('');
  const [hasWifiBox, setHasWifiBox] = useState(false);
  const [detectingModalGps, setDetectingModalGps] = useState(false);
  const gpsWatchIdRef = useRef<number | null>(null);
  const [modalGpsSuccess, setModalGpsSuccess] = useState<string | null>(null);
  const [modalGpsError, setModalGpsError] = useState<string | null>(null);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [showPhoneCalibModal, setShowPhoneCalibModal] = useState(false);
  const [localNetworkIp, setLocalNetworkIp] = useState<string>('192.168.11.106');

  const getPublicUrl = (path: string) => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      if (!origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        return `${origin}${path}`;
      }
      return `http://${localNetworkIp || '192.168.11.106'}:3000${path}`;
    }
    return `http://192.168.11.106:3000${path}`;
  };
  const [detectingModalWifi, setDetectingModalWifi] = useState(false);
  const [modalWifiSuccess, setModalWifiSuccess] = useState<string | null>(null);
  const [modalWifiError, setModalWifiError] = useState<string | null>(null);
  const [detectingSiteCardWifi, setDetectingSiteCardWifi] = useState(false);

  // State Plannings
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [newSchedName, setNewSchedName] = useState('');
  const [newSchedCategory, setNewSchedCategory] = useState<'Fractionné' | 'Continu' | 'Personnalisé'>('Fractionné');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [morningStart, setMorningStart] = useState('07:30');
  const [morningEnd, setMorningEnd] = useState('12:00');
  const [lunchStart, setLunchStart] = useState('12:00');
  const [lunchEnd, setLunchEnd] = useState('13:30');
  const [afternoonStart, setAfternoonStart] = useState('13:30');
  const [afternoonEnd, setAfternoonEnd] = useState('17:30');
  const [toleranceMinutes, setToleranceMinutes] = useState(15);
  const [submittingSchedule, setSubmittingSchedule] = useState(false);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Charger les données initiales
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isMob = /iphone|ipad|ipod|android/i.test(navigator.userAgent) || window.innerWidth < 768;
      setIsMobileDevice(isMob);
    }

    const fetchData = async () => {
      try {
        fetch('/api/network/info')
          .then(r => r.json())
          .then(d => { if (d && d.localIp) setLocalNetworkIp(d.localIp); })
          .catch(() => {});

        const supabase = createClient();
        const activeOrgId = typeof window !== 'undefined' ? localStorage.getItem('pointage_org_id') : null;
        const activeOrgCode = typeof window !== 'undefined' ? localStorage.getItem('pointage_org_code') : null;

        // 1. Org settings isolés pour cette entreprise
        let orgQuery = supabase.from('pointage_organizations').select('*');
        if (activeOrgId) {
          orgQuery = orgQuery.eq('id', activeOrgId);
        } else if (activeOrgCode && activeOrgCode !== 'ORG-8492') {
          orgQuery = orgQuery.eq('org_code', activeOrgCode);
        } else {
          orgQuery = orgQuery.order('created_at', { ascending: false }).limit(1);
        }

        const { data: orgData } = await orgQuery.single();

        let resolvedOrgId = activeOrgId || currentOrgId;
        if (orgData) {
          resolvedOrgId = orgData.id;
          setCurrentOrgId(orgData.id);
          if (orgData.name) setOrgName(orgData.name);
          if (orgData.org_code) setOrgCode(orgData.org_code);
          if (typeof window !== 'undefined') {
            localStorage.setItem('pointage_org_id', orgData.id);
            localStorage.setItem('pointage_org_name', orgData.name);
            localStorage.setItem('pointage_org_code', orgData.org_code);
          }
          if (orgData.security_config) {
            setSecurityConfig(prev => ({ ...prev, ...orgData.security_config }));
            if (orgData.security_config.sector_profile) {
              setSectorProfile(orgData.security_config.sector_profile);
            }
            if (orgData.security_config.admission_policy) {
              setAdmissionPolicy(orgData.security_config.admission_policy);
            }
            if (orgData.security_config.currency) {
              setCurrency(orgData.security_config.currency);
            }
            if (orgData.security_config.support_contact) {
              setSupportContact(orgData.security_config.support_contact);
            }
            if (orgData.security_config.org_logo) {
              setOrgLogo(orgData.security_config.org_logo);
            }
            if (Array.isArray(orgData.security_config.holidays)) {
              setHolidays(orgData.security_config.holidays);
            }
          }
        }

        // Compléter avec le cache local pour réactivité maximale
        if (typeof window !== 'undefined') {
          const localLogo = localStorage.getItem('pointage_org_logo');
          if (localLogo) setOrgLogo(localLogo);
          const localCode = localStorage.getItem('pointage_org_code');
          if (localCode) setOrgCode(localCode);
          const localHolidays = localStorage.getItem('pointage_holidays');
          if (localHolidays) {
            try {
              const parsed = JSON.parse(localHolidays);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setHolidays(prev => prev.length > 0 ? prev : parsed);
              }
            } catch {}
          }
        }

        // 2. Sites géofencés de CETTE organisation uniquement
        let sitesQuery = supabase
          .from('pointage_establishments')
          .select('*')
          .eq('is_active', true);
        if (resolvedOrgId) {
          sitesQuery = sitesQuery.eq('org_id', resolvedOrgId);
        }
        const { data: sitesData } = await sitesQuery.order('name');

        let empEstabsQuery = supabase
          .from('pointage_employees')
          .select('default_establishment_id');
        if (resolvedOrgId) {
          empEstabsQuery = empEstabsQuery.eq('org_id', resolvedOrgId);
        }
        const { data: empEstabs } = await empEstabsQuery;

        const estabCountMap: Record<string, number> = {};
        empEstabs?.forEach((emp: any) => {
          if (emp.default_establishment_id) {
            estabCountMap[emp.default_establishment_id] = (estabCountMap[emp.default_establishment_id] || 0) + 1;
          }
        });

        if (sitesData && sitesData.length > 0) {
          const mapped: SimpleSite[] = sitesData.map((d: any) => ({
            id: d.id,
            name: d.name,
            city: d.city || 'Siège Social',
            lat: Number(d.latitude) || 11.247,
            lon: Number(d.longitude) || -4.2918,
            radiusMeters: Number(d.radius_meters) || 80,
            wifiSsid: d.wifi_ssid || undefined,
            wifiBssid: d.wifi_ssid ? `${d.wifi_ssid} (${(d.wifi_bssids && d.wifi_bssids[0]) || 'Certifié'})` : 'Box Wi-Fi Non Déclarée',
            activeCount: estabCountMap[d.id] || 0,
            isActive: d.is_active ?? true
          }));
          setSites(mapped);
          setSelectedSiteId(mapped[0].id);
        } else {
          setSites([]);
        }

        // 3. Schedules
        const { data: schedData } = await supabase
          .from('pointage_schedules')
          .select('*')
          .order('created_at', { ascending: true });

        const { data: empData } = await supabase
          .from('pointage_employees')
          .select('schedule_id');

        const countMap: Record<string, number> = {};
        empData?.forEach((emp: any) => {
          if (emp.schedule_id) countMap[emp.schedule_id] = (countMap[emp.schedule_id] || 0) + 1;
        });

        if (schedData && schedData.length > 0) {
          const mapped = schedData.map((s: any) => ({
            ...s,
            morning_start: (s.morning_start || '07:30').slice(0, 5),
            morning_end: (s.morning_end || '12:00').slice(0, 5),
            lunch_start: (s.lunch_start || '12:00').slice(0, 5),
            lunch_end: (s.lunch_end || '13:30').slice(0, 5),
            afternoon_start: (s.afternoon_start || '13:30').slice(0, 5),
            afternoon_end: (s.afternoon_end || '17:30').slice(0, 5),
            assignedCount: countMap[s.id] || 0
          }));
          setSchedules(mapped);
        }
      } catch (e) {
        console.warn('Parametres initial load fallback:', e);
      }
    };

    fetchData();
  }, []);

  // Écouteur de calibrage en direct depuis un smartphone sur le terrain
  useEffect(() => {
    const handleStorageCalib = (e: StorageEvent) => {
      if (e.key === 'pointage_site_calibrated' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.lat && parsed.lon) {
            setNewSiteLat(String(parsed.lat));
            setNewSiteLon(String(parsed.lon));
            setModalGpsSuccess(`🎯 Coordonnées verrouillées en direct depuis votre smartphone (±${parsed.accuracy || 2}m) !`);
            setModalGpsError(null);
            setShowPhoneCalibModal(false);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageCalib);
    return () => window.removeEventListener('storage', handleStorageCalib);
  }, []);

  const selectedSite = useMemo(() => {
    return sites.find(s => s.id === selectedSiteId) || sites[0] || null;
  }, [sites, selectedSiteId]);

  // Handlers pour Code Canonique Haute Entropie
  const handleGenerateSecureCode = () => {
    const newCode = generateCanonicalOrgCode(orgName);
    setOrgCode(newCode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pointage_org_code', newCode);
      window.dispatchEvent(new Event('pointage_org_updated'));
    }
    setToastMsg(`Code Canonique Sécurisé généré : ${newCode}`);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Handlers pour Logo & Image de Marque
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Le fichier est trop volumineux (maximum 2 Mo).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setOrgLogo(base64);
      if (typeof window !== 'undefined') {
        localStorage.setItem('pointage_org_logo', base64);
        window.dispatchEvent(new Event('pointage_org_updated'));
      }
      setToastMsg('Logo officiel chargé avec succès ! Pensez à enregistrer.');
      setTimeout(() => setToastMsg(null), 3000);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setOrgLogo(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pointage_org_logo');
      window.dispatchEvent(new Event('pointage_org_updated'));
    }
    setToastMsg('Logo retiré. Retour au monogramme par défaut.');
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Handlers pour Jours Fériés & Congés Exceptionnels
  const getTomorrowDateStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const handleQuickExemptTomorrow = () => {
    setNewHolidayDate(getTomorrowDateStr());
    setNewHolidayName('Jour Férié / Fermeture Exceptionnelle');
    setNewHolidayCategory('FERIE_LEGAL');
    setNewHolidayPaid(true);
    setNewHolidayNeutralize(true);
    setShowAddHolidayModal(true);
  };

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayDate || !newHolidayName.trim()) {
      alert("Veuillez renseigner une date et un motif.");
      return;
    }
    const newExemption: HolidayExemption = {
      id: 'hol-' + Date.now(),
      date: newHolidayDate,
      name: newHolidayName.trim(),
      category: newHolidayCategory,
      is_paid: newHolidayPaid,
      applies_to_all: true,
      notes: newHolidayNotes.trim() || undefined,
      created_at: new Date().toISOString()
    };
    const updated = [newExemption, ...holidays.filter(h => h.date !== newHolidayDate)].sort((a, b) => a.date.localeCompare(b.date));
    setHolidays(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pointage_holidays', JSON.stringify(updated));
      window.dispatchEvent(new Event('pointage_holidays_updated'));
    }
    try {
      const supabase = createClient();
      supabase.from('pointage_organizations').update({
        security_config: { ...securityConfig, holidays: updated, org_logo: orgLogo || undefined }
      }).eq('id', currentOrgId).then();
    } catch {}

    setShowAddHolidayModal(false);
    setNewHolidayName('');
    setNewHolidayNotes('');
    setToastMsg(`Exemption RH pour le ${newHolidayDate} enregistrée : absences neutralisées.`);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleDeleteHoliday = (id: string) => {
    const updated = holidays.filter(h => h.id !== id);
    setHolidays(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pointage_holidays', JSON.stringify(updated));
      window.dispatchEvent(new Event('pointage_holidays_updated'));
    }
    try {
      const supabase = createClient();
      supabase.from('pointage_organizations').update({
        security_config: { ...securityConfig, holidays: updated, org_logo: orgLogo || undefined }
      }).eq('id', currentOrgId).then();
    } catch {}
    setToastMsg('Exemption supprimée.');
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleLoadDefaultHolidays = () => {
    const created: HolidayExemption[] = DEFAULT_HOLIDAY_PRESETS.map((p, i) => ({
      ...p,
      id: 'preset-' + i + '-' + Date.now(),
      created_at: new Date().toISOString()
    }));
    const map = new Map<string, HolidayExemption>();
    created.forEach(h => map.set(h.date, h));
    holidays.forEach(h => map.set(h.date, h));
    const merged = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
    setHolidays(merged);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pointage_holidays', JSON.stringify(merged));
      window.dispatchEvent(new Event('pointage_holidays_updated'));
    }
    try {
      const supabase = createClient();
      supabase.from('pointage_organizations').update({
        security_config: { ...securityConfig, holidays: merged, org_logo: orgLogo || undefined }
      }).eq('id', currentOrgId).then();
    } catch {}
    setToastMsg(`${DEFAULT_HOLIDAY_PRESETS.length} jours fériés officiels importés !`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Sauvegarde des paramètres généraux & sécurité
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const mergedConfig: SecurityConfig = {
      ...securityConfig,
      sector_profile: sectorProfile,
      admission_policy: admissionPolicy,
      timezone: timezone,
      currency: currency,
      support_contact: supportContact,
      org_logo: orgLogo || undefined,
      holidays: holidays
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('pointage_security_config', JSON.stringify(mergedConfig));
      localStorage.setItem('pointage_org_name', orgName);
      localStorage.setItem('pointage_org_code', orgCode.toUpperCase().trim());
      localStorage.setItem('pointage_sector_profile', sectorProfile);
      localStorage.setItem('pointage_org_logo', orgLogo || '');
      localStorage.setItem('pointage_holidays', JSON.stringify(holidays));
      window.dispatchEvent(new Event('pointage_org_updated'));
      window.dispatchEvent(new Event('pointage_holidays_updated'));
    }

    try {
      const supabase = createClient();
      await supabase
        .from('pointage_organizations')
        .update({
          name: orgName,
          org_code: orgCode.toUpperCase().trim(),
          security_config: mergedConfig
        })
        .eq('id', currentOrgId);

      setSaved(true);
      setToastMsg('Paramètres d\'organisation, logo et clé multi-tenant enregistrés avec succès !');
      setTimeout(() => setSaved(false), 3500);
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err) {
      console.error('Erreur sauvegarde générale:', err);
      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } finally {
      setSaving(false);
    }
  };

  // Toggle règles de sécurité
  const handleToggleSecurity = async (key: keyof SecurityConfig) => {
    const updated = {
      ...securityConfig,
      [key]: !securityConfig[key]
    };
    setSecurityConfig(updated);

    if (typeof window !== 'undefined') {
      localStorage.setItem('pointage_security_config', JSON.stringify(updated));
    }

    try {
      const supabase = createClient();
      await supabase
        .from('pointage_organizations')
        .update({ security_config: updated })
        .eq('id', currentOrgId);
      setToastMsg(`Règle mise à jour avec succès`);
      setTimeout(() => setToastMsg(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  // Ouverture du modal de création de périmètre avec réinitialisation complète
  const handleOpenAddSiteModal = () => {
    stopGpsWatch();
    setNewSiteName('');
    setNewSiteCity('');
    setNewSiteLat('');
    setNewSiteLon('');
    setNewSiteRadius('80');
    setNewSiteWifiSsid('');
    setNewSiteWifiBssid('');
    setHasWifiBox(false);
    setModalGpsSuccess(null);
    setModalGpsError(null);
    setModalWifiSuccess(null);
    setModalWifiError(null);
    setShowAddSiteModal(true);
  };

  // Détection automatique 1-clic du Wi-Fi pour le modal de création
  const handleDetectModalWifi = async () => {
    setDetectingModalWifi(true);
    setModalWifiError(null);
    setModalWifiSuccess(null);
    try {
      const res = await fetch('/api/wifi/current?refresh=true');
      const data = await res.json();
      if (data && data.success && (data.ssid || data.bssid)) {
        setNewSiteWifiSsid(data.ssid || '');
        setNewSiteWifiBssid(data.bssid || '');
        setHasWifiBox(true);
        setModalWifiSuccess(`Box Wi-Fi détectée : "${data.ssid || 'Réseau'}" (${data.bssid || 'MAC certifiée'})`);
      } else {
        setModalWifiError(data?.error || "Impossible d'identifier automatiquement le réseau Wi-Fi local.");
      }
    } catch (err: any) {
      setModalWifiError(err?.message || "Erreur de communication avec le détecteur Wi-Fi.");
    } finally {
      setDetectingModalWifi(false);
    }
  };

  // Détection et association automatique du Wi-Fi sur le site sélectionné
  const handleDetectSelectedSiteWifi = async () => {
    if (!selectedSiteId) return;
    setDetectingSiteCardWifi(true);
    try {
      const res = await fetch('/api/wifi/current?refresh=true');
      const data = await res.json();
      if (data && data.success && (data.ssid || data.bssid)) {
        const ssid = data.ssid || 'Wi-Fi_Bureau';
        const bssid = data.bssid || '';
        setSites(prev => prev.map(s => {
          if (s.id === selectedSiteId) {
            return {
              ...s,
              wifiSsid: ssid,
              wifiBssid: `${ssid} (${bssid})`
            };
          }
          return s;
        }));
        setToastMsg(`Box Wi-Fi "${ssid}" associée au site avec succès !`);
        setTimeout(() => setToastMsg(null), 3500);

        // Mise à jour Supabase
        const supabase = createClient();
        await supabase.from('pointage_establishments').update({
          wifi_ssid: ssid,
          wifi_bssids: [bssid]
        }).eq('id', selectedSiteId);
      } else {
        alert("Impossible de détecter automatiquement le Wi-Fi local.");
      }
    } catch (e: any) {
      alert("Erreur lors de la détection du Wi-Fi : " + e.message);
    } finally {
      setDetectingSiteCardWifi(false);
    }
  };

  const stopGpsWatch = () => {
    if (gpsWatchIdRef.current !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(gpsWatchIdRef.current);
      gpsWatchIdRef.current = null;
    }
    setDetectingModalGps(false);
  };

  // Détection de position GPS par affinement continu multi-échantillons (style WhatsApp)
  const handleDetectModalGps = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setModalGpsError("La géolocalisation n'est pas supportée par ce terminal.");
      return;
    }
    stopGpsWatch();
    setDetectingModalGps(true);
    setModalGpsSuccess("Synchronisation satellite en cours... Affinement progressif...");
    setModalGpsError(null);

    let bestAcc = Infinity;

    // Timeout de sécurité au bout de 12 secondes
    const timeoutTimer = setTimeout(() => {
      stopGpsWatch();
      if (bestAcc < Infinity) {
        if (bestAcc <= 10) {
          setModalGpsSuccess(`🎯 Position satellite haute précision verrouillée (±${bestAcc}m)`);
        } else if (bestAcc <= 40) {
          setModalGpsSuccess(`Signal GPS stabilisé (±${bestAcc}m). Vous pouvez ajuster au mètre près sur la vue satellite ci-dessous.`);
        } else {
          if (isMobileDevice) {
            setModalGpsSuccess(`Position GPS captée (±${bestAcc}m). Les murs peuvent atténuer le signal satellite : ajustez le repère directement sur votre bureau sur la vue satellite aérienne.`);
          } else {
            setModalGpsError(`Précision réseau PC approximative (±${bestAcc}m). Les ordinateurs n'ont pas de puce satellite GNSS. Ajustez le repère directement sur votre bureau sur la carte ci-dessous pour une précision au mètre près.`);
          }
        }
      } else {
        setModalGpsError("Délai d'acquisition GPS dépassé. Veuillez pointer directement sur la carte satellite ci-dessous.");
      }
    }, 12000);

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const acc = Math.round(pos.coords.accuracy);

        if (acc <= bestAcc || bestAcc === Infinity) {
          bestAcc = acc;
          const lat = pos.coords.latitude.toFixed(6);
          const lon = pos.coords.longitude.toFixed(6);
          setNewSiteLat(lat);
          setNewSiteLon(lon);

          // Si on atteint la précision satellite maximale (<= 5 mètres), verrouillage instantané
          if (acc <= 5) {
            clearTimeout(timeoutTimer);
            stopGpsWatch();
            setModalGpsSuccess(`Précision satellite optimale atteinte (±${acc}m) - Fix WGS84 verrouillé !`);
          } else if (acc <= 15) {
            setModalGpsSuccess(`Affinement satellite en cours : ±${acc}m (Verrouillage imminent)...`);
          } else if (acc <= 50) {
            setModalGpsSuccess(`Signal capté (±${acc}m)... Recherche de satellites supplémentaires pour descendre à ±5m...`);
          } else {
            setModalGpsSuccess(`Échantillonnage préliminaire (±${acc}m)... Affinement en cours...`);
          }
        }
      },
      (err) => {
        clearTimeout(timeoutTimer);
        stopGpsWatch();
        setModalGpsError(`Signal GPS indisponible (${err.message}). Ajustez votre bureau sur la carte ci-dessous.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    gpsWatchIdRef.current = watchId;
  };

  // Copier les coordonnées du site principal comme base
  const handleUseHqCoords = () => {
    const hq = sites[0];
    if (hq) {
      setNewSiteLat(hq.lat.toFixed(6));
      setNewSiteLon(hq.lon.toFixed(6));
      if (!newSiteCity.trim()) setNewSiteCity(hq.city);
      setModalGpsSuccess(`Coordonnées du site de référence (${hq.name}) appliquées`);
      setModalGpsError(null);
    } else {
      setNewSiteLat('11.180600');
      setNewSiteLon('-4.294900');
      if (!newSiteCity.trim()) setNewSiteCity('Bobo-Dioulasso');
      setModalGpsSuccess('Coordonnées initiales (Bobo-Dioulasso) appliquées');
      setModalGpsError(null);
    }
  };

  // Coller des coordonnées WGS84 ou un lien Google Maps depuis le presse-papier
  const handlePasteCoordinates = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        setModalGpsError("Presse-papier vide. Copiez d'abord des coordonnées ou un lien Google Maps.");
        return;
      }
      const raw = text.trim();
      const urlMatch = raw.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || raw.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (urlMatch) {
        setNewSiteLat(parseFloat(urlMatch[1]).toFixed(6));
        setNewSiteLon(parseFloat(urlMatch[2]).toFixed(6));
        setModalGpsSuccess("Coordonnées extraites du lien Google Maps avec succès !");
        setModalGpsError(null);
        return;
      }
      const coordMatch = raw.match(/^(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)$/);
      if (coordMatch) {
        setNewSiteLat(parseFloat(coordMatch[1]).toFixed(6));
        setNewSiteLon(parseFloat(coordMatch[2]).toFixed(6));
        setModalGpsSuccess("Coordonnées WGS84 collées avec succès !");
        setModalGpsError(null);
        return;
      }
      setModalGpsError("Format non reconnu. Exemple attendu : 11.180612, -4.294910 ou lien Google Maps.");
    } catch {
      const manual = prompt("Collez ici vos coordonnées WGS84 ou le lien Google Maps :");
      if (manual) {
        const raw = manual.trim();
        const urlMatch = raw.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || raw.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (urlMatch) {
          setNewSiteLat(parseFloat(urlMatch[1]).toFixed(6));
          setNewSiteLon(parseFloat(urlMatch[2]).toFixed(6));
          setModalGpsSuccess("Coordonnées extraites avec succès !");
          setModalGpsError(null);
          return;
        }
        const coordMatch = raw.match(/^(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)$/);
        if (coordMatch) {
          setNewSiteLat(parseFloat(coordMatch[1]).toFixed(6));
          setNewSiteLon(parseFloat(coordMatch[2]).toFixed(6));
          setModalGpsSuccess("Coordonnées WGS84 appliquées !");
          setModalGpsError(null);
          return;
        }
      }
    }
  };

  // Création de site avec validation et conversion des virgules
  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteName.trim()) return;

    // Normalisation virgule -> point décimal WGS84
    const cleanLatStr = newSiteLat.toString().replace(',', '.').trim();
    const cleanLonStr = newSiteLon.toString().replace(',', '.').trim();
    const parsedLat = parseFloat(cleanLatStr);
    const parsedLon = parseFloat(cleanLonStr);

    if (isNaN(parsedLat) || isNaN(parsedLon)) {
      setModalGpsError("Veuillez renseigner des coordonnées GPS décimales valides (ex: 11.247000).");
      return;
    }

    const parsedRadius = parseInt(newSiteRadius, 10) || 80;
    const cleanBssid = hasWifiBox ? newSiteWifiBssid.trim().toLowerCase() : '';
    const cleanSsid = hasWifiBox ? newSiteWifiSsid.trim() : '';

    const tempId = 'site-' + Date.now();
    const newSite: SimpleSite = {
      id: tempId,
      name: newSiteName.trim(),
      city: newSiteCity.trim() || 'Principal',
      lat: parsedLat,
      lon: parsedLon,
      radiusMeters: parsedRadius,
      wifiSsid: cleanSsid || undefined,
      wifiBssid: cleanSsid ? `${cleanSsid} (${cleanBssid || 'Certifié'})` : 'Box Wi-Fi Non Déclarée',
      activeCount: 0,
      isActive: true
    };

    setSites(prev => [newSite, ...prev]);
    setSelectedSiteId(tempId);
    setShowAddSiteModal(false);
    setToastMsg(`Périmètre "${newSiteName}" créé avec succès !`);
    setTimeout(() => setToastMsg(null), 3500);

    try {
      const supabase = createClient();
      await supabase.from('pointage_establishments').insert({
        org_id: currentOrgId,
        name: newSiteName.trim(),
        city: newSiteCity.trim() || 'Principal',
        latitude: parsedLat,
        longitude: parsedLon,
        radius_meters: parsedRadius,
        elastic_radius_meters: Math.max(150, Math.round(parsedRadius * 1.5)),
        wifi_ssid: cleanSsid || null,
        wifi_bssids: cleanBssid ? [cleanBssid] : [],
        is_active: true
      });
    } catch (e) {
      console.error('Erreur insertion établissement:', e);
    }
  };

  // Suppression de site
  const handleDeleteSite = async (id: string, name: string) => {
    if (!confirm(`Confirmer la désactivation du site "${name}" ?`)) return;
    setSites(prev => prev.filter(s => s.id !== id));
    if (selectedSiteId === id && sites.length > 1) {
      setSelectedSiteId(sites.filter(s => s.id !== id)[0].id);
    }
    try {
      const supabase = createClient();
      await supabase.from('pointage_establishments').update({ is_active: false }).eq('id', id);
    } catch (e) {
      console.error(e);
    }
  };

  // Calcul dynamique des heures de travail prévues pour le nouveau planning
  const calculatedDailyHours = useMemo(() => {
    if (newSchedCategory === 'Continu') {
      const startMin = timeToMinutes(morningStart);
      const endMin = timeToMinutes(afternoonEnd);
      const diff = Math.max(0, endMin - startMin);
      return Math.round((diff / 60) * 10) / 10;
    } else {
      // Fractionné
      const morningMinutes = Math.max(0, timeToMinutes(morningEnd) - timeToMinutes(morningStart));
      const afternoonMinutes = Math.max(0, timeToMinutes(afternoonEnd) - timeToMinutes(lunchEnd));
      return Math.round(((morningMinutes + afternoonMinutes) / 60) * 10) / 10;
    }
  }, [newSchedCategory, morningStart, morningEnd, lunchEnd, afternoonEnd]);

  const calculatedWeeklyHours = Math.round(calculatedDailyHours * selectedDays.length * 10) / 10;

  // Création planning
  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchedName.trim()) return;

    setSubmittingSchedule(true);
    try {
      const supabase = createClient();
      const actualLunchStart = newSchedCategory === 'Continu' ? morningStart : lunchStart;
      const actualLunchEnd = newSchedCategory === 'Continu' ? morningStart : lunchEnd;
      const actualMorningEnd = newSchedCategory === 'Continu' ? afternoonEnd : morningEnd;
      const actualAfternoonStart = newSchedCategory === 'Continu' ? morningStart : lunchEnd;

      const { data, error } = await supabase.from('pointage_schedules').insert({
        org_id: currentOrgId,
        name: newSchedName.trim(),
        category: newSchedCategory,
        working_days: selectedDays,
        morning_start: morningStart,
        morning_end: actualMorningEnd,
        lunch_start: actualLunchStart,
        lunch_end: actualLunchEnd,
        afternoon_start: actualAfternoonStart,
        afternoon_end: afternoonEnd,
        tolerance_minutes: toleranceMinutes,
        weekly_hours: calculatedWeeklyHours,
        is_active: true
      }).select().single();

      if (data) {
        setSchedules(prev => [...prev, { ...data, assignedCount: 0 }]);
        setShowAddScheduleModal(false);
        setNewSchedName('');
        setToastMsg(`Planning "${newSchedName}" créé avec succès !`);
        setTimeout(() => setToastMsg(null), 3500);
      }
    } catch (e: any) {
      console.error(e);
      setToastMsg(`Erreur lors de la création : ${e.message}`);
    } finally {
      setSubmittingSchedule(false);
    }
  };

  return (
    <div className="space-y-6">
      <Header
        title="Centre de Configuration & Paramètres"
        subtitle="Environnement unifié de gouvernance : identité, géofencing satellite, horaires et matrice anti-triche"
      />

      {/* Toast de confirmation */}
      {toastMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-semibold animate-fadeIn shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ==================== BARRE D'ONGLETS IMMERSIVE ==================== */}
      <div className="bg-white p-2 rounded-3xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          
          <button
            onClick={() => handleTabChange('general')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition flex-1 sm:flex-none justify-center cursor-pointer ${
              activeTab === 'general'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Organisation & Métier</span>
          </button>

          <button
            onClick={() => handleTabChange('sites')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition flex-1 sm:flex-none justify-center cursor-pointer ${
              activeTab === 'sites'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Sites & Géofencing Satellite</span>
          </button>

          <button
            onClick={() => handleTabChange('plannings')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition flex-1 sm:flex-none justify-center cursor-pointer ${
              activeTab === 'plannings'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Plannings & Horaires</span>
          </button>

          <button
            onClick={() => handleTabChange('securite')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition flex-1 sm:flex-none justify-center cursor-pointer ${
              activeTab === 'securite'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Sécurité & Anti-Triche</span>
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-slate-400 text-xs font-mono pr-3">
          <Compass className="w-3.5 h-3.5 text-blue-500" />
          <span>WGS84 Invariant</span>
        </div>
      </div>

      {/* ==================== ONGLET 1 : ORGANISATION & MÉTIER ==================== */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveGeneral} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-8 animate-fadeIn">
          
          {/* Cas d'usage métier */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  Secteur d'Activité & Profil Métier
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Adapte dynamiquement la terminologie, les flux d'absences et les rapports à votre réalité opérationnelle.
                </p>
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 shrink-0">
                Adaptation Automatique
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div
                onClick={() => setSectorProfile('ENTERPRISE')}
                className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                  sectorProfile === 'ENTERPRISE'
                    ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  {sectorProfile === 'ENTERPRISE' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Entreprise / PME / Chantier</h4>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                    Gestion par Collaborateurs, Départements, Heures supplémentaires & Agences
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    <span className="text-[9px] bg-slate-100 font-semibold px-2 py-0.5 rounded-md text-slate-600">Collaborateurs</span>
                    <span className="text-[9px] bg-slate-100 font-semibold px-2 py-0.5 rounded-md text-slate-600">Départements</span>
                    <span className="text-[9px] bg-slate-100 font-semibold px-2 py-0.5 rounded-md text-slate-600">Heures RH</span>
                  </div>
                </div>
              </div>

              <div
                onClick={() => setSectorProfile('SCHOOL')}
                className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                  sectorProfile === 'SCHOOL'
                    ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  {sectorProfile === 'SCHOOL' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Établissement Scolaire (500+ Élèves)</h4>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                    Élèves, Classes, Campus & Justifications parentales d'absence
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    <span className="text-[9px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-md">Élèves</span>
                    <span className="text-[9px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-md">Classes</span>
                    <span className="text-[9px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-md">Billets de Retard</span>
                  </div>
                </div>
              </div>

              <div
                onClick={() => setSectorProfile('EVENT')}
                className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                  sectorProfile === 'EVENT'
                    ? 'border-purple-600 bg-purple-50/40 ring-2 ring-purple-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                    <Ticket className="w-4 h-4" />
                  </div>
                  {sectorProfile === 'EVENT' && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Événementiel & Salons</h4>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                    Participants, Badges d'accès, Pavillons & Portiques WGS84
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    <span className="text-[9px] bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded-md">Participants</span>
                    <span className="text-[9px] bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded-md">Badges</span>
                    <span className="text-[9px] bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded-md">Flux Portiques</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 1 : Identité de l'Organisation & Image de Marque */}
          <div className="pt-6 border-t border-slate-100 space-y-5">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                Identité de l'Organisation & Image de Marque
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Renseignez la dénomination officielle et personnalisez le logo/blason affiché sur la barre latérale, les feuilles d'émargement et l'application mobile.
              </p>
            </div>

            {/* Nom Officiel - Pleine Largeur */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nom Officiel de l'Organisation / Établissement
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Ex: GROUPE SCOLAIRE LES LAURÉATS ou SAHEL BTP"
                className="w-full text-sm bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded-2xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 font-bold transition shadow-2xs"
              />
            </div>

            {/* Import Logo Fichier Direct Exclusif */}
            <div className="p-4 sm:p-5 bg-slate-50/70 border border-slate-200/80 rounded-3xl flex flex-col sm:flex-row items-center gap-5">
              {/* Aperçu Visuel */}
              <div className="relative shrink-0">
                {orgLogo ? (
                  <img
                    src={orgLogo}
                    alt="Logo Officiel"
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-500/40 shadow-md bg-white"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-2xl shadow-md shadow-blue-500/20">
                    {orgName.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'P'}
                  </div>
                )}
                <span className="absolute -bottom-2 -right-2 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-slate-900 text-white rounded-md shadow-xs">
                  {orgLogo ? 'Personnalisé' : 'Monogramme'}
                </span>
              </div>

              {/* Import Fichier Unique (Pas d'URL) */}
              <div className="flex-1 w-full space-y-2 text-xs">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">
                    Importer le Blason / Logo de l'Établissement
                  </h4>
                  <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">
                    Sélectionnez votre logo directement depuis votre appareil (PNG, JPG, SVG, WebP • maximum 2 Mo). L'image s'intègre instantanément sans aucune configuration serveur.
                  </p>
                </div>

                <div className="pt-1 flex flex-wrap items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-sm shadow-blue-600/20 active:scale-[0.98]">
                    <Upload className="w-4 h-4" />
                    <span>Choisir un fichier image</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      onChange={handleLogoFileUpload}
                      className="hidden"
                    />
                  </label>

                  {orgLogo && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-red-50 text-red-600 font-semibold border border-red-200 rounded-xl transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Retirer le logo</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2 : CODE CANONIQUE & KIT D'ENRÔLEMENT MASSIF (500+ UTILISATEURS) */}
          <div className="pt-6 border-t border-slate-100 space-y-6">
            
            {/* En-tête de section prestigieux */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-100/90 px-2.5 py-0.5 rounded-full inline-block">
                    Sécurité Multi-Tenant & Diffusion Massive
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    500+ Utilisateurs
                  </span>
                </div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2 mt-1">
                  <KeyRound className="w-5 h-5 text-blue-600" />
                  Code Canonique & Kit d'Enrôlement Flash
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  La clé cryptographique unique de votre organisation et les supports officiels de diffusion (Affiche A4, QR Code, Annonce WhatsApp, Lien Web) pour connecter vos effectifs sans aucune friction.
                </p>
              </div>
            </div>

            {/* BLOC 1 : LE CODE CANONIQUE HAUTE ENTROPIE (Pleine Largeur, Spacieux, Sans Écrasement) */}
            <div className="p-5 sm:p-6 bg-slate-50/70 border-2 border-slate-200/90 rounded-3xl space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                    Code Établissement Unique (Clé Multi-Tenant d'Enrôlement)
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Identifiant cryptographique partagé à vos collaborateurs ou élèves pour rattacher leur téléphone à votre établissement.
                  </p>
                </div>
                <span className="hidden sm:inline-flex text-[10px] text-blue-700 font-extrabold bg-blue-100/70 border border-blue-200 px-2.5 py-1 rounded-full">
                  Distribué aux 500+ utilisateurs
                </span>
              </div>

              {/* Champ & Boutons d'action - Parfaitement proportionnés sans flex squash */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={orgCode}
                    onChange={(e) => setOrgCode(e.target.value.toUpperCase().trim())}
                    placeholder="ORG-XXXXX-INIT"
                    className="w-full text-base sm:text-lg font-mono font-black tracking-widest text-blue-700 bg-white border-2 border-slate-300 focus:border-blue-600 rounded-2xl px-4 py-3.5 text-center sm:text-left shadow-inner uppercase transition focus:outline-none focus:ring-4 focus:ring-blue-500/10 select-all"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleGenerateSecureCode}
                    title="Générer un format canonique aléatoire haute entropie"
                    className="flex-1 sm:flex-none px-4 py-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer border border-indigo-200 shadow-2xs hover:shadow-xs active:scale-[0.98]"
                  >
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>⚡ Générer Code Sécurisé</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(orgCode);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="flex-1 sm:flex-none px-5 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/25 active:scale-[0.98]"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-4 h-4 text-white" />
                        <span>Copié !</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-white" />
                        <span>Copier le Code</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Évaluation Cryptographique Anti-Collision & Anti-Devinette */}
              {isCanonicalCode(orgCode) ? (
                <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-2xl flex items-start gap-3 text-xs text-emerald-950">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold text-emerald-800 block text-xs">
                      Format Canonique Anti-Collision Conforme (Haute Entropie)
                    </span>
                    <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
                      Entropie cryptographique 32 symboles (33,5 Millions de combinaisons) et initiales d'établissement. Clé unique garantie sans doublon et protégée contre toute tentative de devinette par des tiers.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-950">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-extrabold text-amber-800 block text-xs">
                      Code Personnalisé Détecté
                    </span>
                    <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                      Ce code ne respecte pas le standard canonique haute entropie. Pour éliminer tout risque de collision multi-tenant avec un autre établissement et empêcher les devinettes, cliquez sur <strong>« ⚡ Générer Code Sécurisé »</strong>.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* BLOC 2 : KIT D'ENRÔLEMENT FLASH & SUPPORTS DE DIFFUSION (AFFICHE A4, QR CODE LIVE, WHATSAPP, LIEN WEB) */}
            <div className="p-6 bg-linear-to-br from-blue-50/80 via-indigo-50/50 to-slate-50 border-2 border-blue-200/90 rounded-3xl space-y-5 shadow-xs">
              
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-blue-600" />
                    Kit d'Enrôlement Flash pour Smartphones (Diffusion Massive)
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Scannable directement avec l'appareil photo ordinaire (iPhone / Android) ou partageable en un clic sur vos canaux officiels.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                  <button
                    type="button"
                    onClick={() => setShowPosterModal(true)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/25 cursor-pointer transition active:scale-[0.98]"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Affiche A4 Imprimable</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyWhatsAppMessage}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/25 cursor-pointer transition active:scale-[0.98]"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>{copiedWhatsApp ? '✓ Annonce Copiée !' : 'Annonce WhatsApp'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.open(liveJoinUrl, '_blank')}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 cursor-pointer transition shadow-2xs"
                    title="Tester la page d'onboarding mobile dans un nouvel onglet"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                    <span>Tester le Portail (/rejoindre)</span>
                  </button>
                </div>
              </div>

              {/* Contenu Interactif : QR Code Live + Lien URL direct + Guide 3 Étapes */}
              <div className="bg-white p-5 rounded-2xl border border-blue-100 flex flex-col md:flex-row items-center gap-6 shadow-xs">
                
                {/* Visualisation QR Code Haute Résolution */}
                <div className="relative shrink-0 p-3 bg-white rounded-2xl border-2 border-slate-200 shadow-sm flex flex-col items-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(liveJoinUrl)}`}
                    alt="QR Code d'enrôlement établissement"
                    className="w-36 h-36 object-contain"
                  />
                  <span className="text-[11px] font-mono font-black text-blue-700 mt-2 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg tracking-wider">
                    {orgCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleDownloadQrCode}
                    className="mt-2 text-[10px] font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1 cursor-pointer transition"
                  >
                    <Download className="w-3 h-3" />
                    <span>Télécharger PNG HD</span>
                  </button>
                </div>

                {/* Détails & Canaux de Déploiement */}
                <div className="flex-1 w-full space-y-3.5 text-xs">
                  
                  {/* Lien Web Direct d'Activation */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Lien Web Direct d'Enrôlement (Caméra & Navigateur Mobile)
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={liveJoinUrl}
                        className="flex-1 text-[11px] font-mono font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 select-all"
                      />
                      <button
                        type="button"
                        onClick={handleCopyLiveJoinUrl}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg transition shrink-0 cursor-pointer flex items-center gap-1"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-blue-700" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? 'Copié !' : 'Copier'}</span>
                      </button>
                    </div>
                  </div>

                  {/* 3 Méthodes de Déploiement Massif */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px]">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                      <span className="font-extrabold text-blue-700 block">1. Affiche Babillard</span>
                      <p className="text-slate-500 leading-snug">Imprimez l'affiche officielle A4 pour le hall, les portes de service ou les salles.</p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                      <span className="font-extrabold text-emerald-700 block">2. Groupes WhatsApp</span>
                      <p className="text-slate-500 leading-snug">Diffusez le message prêt à l'emploi aux délégués et responsables d'équipe.</p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                      <span className="font-extrabold text-indigo-700 block">3. Scan 2 Secondes</span>
                      <p className="text-slate-500 leading-snug">L'appareil photo de l'utilisateur ouvre le portail et lie son smartphone sans erreur.</p>
                    </div>
                  </div>

                </div>

              </div>

            </div>

          </div>

          {/* ==================== MATRICE DE POLITIQUE D'ADMISSION ==================== */}
          <div className="pt-6 border-t border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-600" />
                  Politique d'Admission & Filtrage des Nouveaux Inscrits
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Règle d'autorisation appliquée lorsqu'un smartphone tente de s'associer à votre établissement.
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                Gouvernance
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div
                onClick={() => setAdmissionPolicy('STRICT')}
                className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                  admissionPolicy === 'STRICT'
                    ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    🛡️
                  </div>
                  {admissionPolicy === 'STRICT' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Mode Strict (Recommandé)</h4>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                    Seuls les matricules existant dans votre fichier importé sont autorisés. Tout intrus est bloqué net.
                  </p>
                </div>
              </div>

              <div
                onClick={() => setAdmissionPolicy('MODERATE')}
                className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                  admissionPolicy === 'MODERATE'
                    ? 'border-amber-600 bg-amber-50/40 ring-2 ring-amber-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                    ⚖️
                  </div>
                  {admissionPolicy === 'MODERATE' && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Approbation Manuelle</h4>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                    L'enrôlement est libre, mais le compte reste inactif jusqu'à ce que la direction valide le smartphone.
                  </p>
                </div>
              </div>

              <div
                onClick={() => setAdmissionPolicy('OPEN')}
                className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                  admissionPolicy === 'OPEN'
                    ? 'border-purple-600 bg-purple-50/40 ring-2 ring-purple-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                    ⚡
                  </div>
                  {admissionPolicy === 'OPEN' && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Mode Ouvert (Salons)</h4>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                    Idéal pour les événements éphémères : liaison immédiate sans vérification préalable de matricule.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ==================== PARAMÈTRES RÉGIONAUX & SUPPORT ==================== */}
          <div className="pt-6 border-t border-slate-100 space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600" />
              Paramètres Régionaux & Ligne d'Assistance
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fuseau Horaire de Référence
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Africa/Abidjan (GMT 0)">Africa/Abidjan (GMT 0 - Côte d'Ivoire)</option>
                  <option value="Africa/Ouagadougou (GMT 0)">Africa/Ouagadougou (GMT 0 - Burkina Faso)</option>
                  <option value="Africa/Dakar (GMT 0)">Africa/Dakar (GMT 0 - Sénégal)</option>
                  <option value="Africa/Bamako (GMT 0)">Africa/Bamako (GMT 0 - Mali)</option>
                  <option value="Africa/Douala (GMT +1)">Africa/Douala (GMT +1 - Cameroun)</option>
                  <option value="Africa/Lagos (GMT +1)">Africa/Lagos (GMT +1 - Nigeria)</option>
                  <option value="Africa/Kinshasa (GMT +1)">Africa/Kinshasa (GMT +1 - RDC)</option>
                  <option value="Europe/Paris (GMT +1 / +2)">Europe/Paris (GMT +1 / +2 - France)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Devise des Relevés Salariaux
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="FCFA (XOF)">FCFA (XOF - Afrique de l'Ouest)</option>
                  <option value="FCFA (XAF)">FCFA (XAF - Afrique Centrale)</option>
                  <option value="EUR (€)">EUR (€ - Euro)</option>
                  <option value="USD ($)">USD ($ - Dollar US)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contact Support (Affiché sur Mobile)
                </label>
                <input
                  type="text"
                  value={supportContact}
                  onChange={(e) => setSupportContact(e.target.value)}
                  placeholder="+225 07 00 00 00 00"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Bouton de sauvegarde */}
          <div className="pt-5 border-t border-slate-100 flex items-center justify-between">
            {saved ? (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4" /> Paramètres d'organisation et clé multi-tenant enregistrés !
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">
                Les modifications sont propagées immédiatement aux smartphones des {sectorProfile === 'SCHOOL' ? 'élèves' : 'collaborateurs'}.
              </span>
            )}
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Sauvegarde...' : 'Enregistrer la Configuration'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ==================== ONGLET 2 : SITES & GÉOFENCING SATELLITE ==================== */}
      {activeTab === 'sites' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-16 animate-fadeIn">
          
          {/* Véritable Carte Interactive (Vue Google Maps / Rues / Satellite Réel) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Header de la carte */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold shadow-xs">
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-sm text-slate-900">{selectedSite?.name}</h4>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {selectedSite?.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {selectedSite?.city} • {selectedSite?.lat.toFixed(6)}° N, {selectedSite?.lon.toFixed(6)}° W
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleOpenAddSiteModal}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nouveau Périmètre</span>
              </button>
            </div>

            {/* CARTE GÉOGRAPHIQUE RÉELLE (Plan / Satellite 100% Gratuit & Interactif) */}
            <div className="p-4 sm:p-5">
              <DynamicSiteGeofenceMap
                name={selectedSite?.name || 'Site'}
                city={selectedSite?.city || ''}
                lat={selectedSite?.lat || 11.247}
                lon={selectedSite?.lon || -4.2918}
                radiusMeters={selectedSite?.radiusMeters || 80}
                wifiSsid={selectedSite?.wifiSsid}
              />
            </div>

            {/* Synthèse Métier & Paramètres d'Établissement */}
            <div className="p-4 sm:p-5 pt-0 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/70">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Rayon Satellite WGS84</span>
                  <span className="text-sm font-black text-slate-900 block mt-0.5">{selectedSite?.radiusMeters} mètres</span>
                  <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">Périmètre tracé sur la carte</span>
                </div>

                <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/70 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Box Wi-Fi Réseau</span>
                      <button
                        type="button"
                        onClick={handleDetectSelectedSiteWifi}
                        disabled={detectingSiteCardWifi}
                        title="Détecter et associer automatiquement le Wi-Fi actuel à ce site"
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50 transition"
                      >
                        <Radio className={`w-3 h-3 ${detectingSiteCardWifi ? 'animate-spin' : ''}`} />
                        <span>{detectingSiteCardWifi ? 'Scan...' : 'Auto-Détecter'}</span>
                      </button>
                    </div>
                    <span className="text-xs font-bold text-slate-900 truncate block mt-0.5" title={selectedSite?.wifiSsid || 'Sans Wi-Fi'}>
                      {selectedSite?.wifiSsid || 'Non déclarée'}
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate mt-0.5 font-mono">
                      {selectedSite?.wifiBssid || 'Anti-fraude satellite seul'}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/70">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Effectif Rattaché</span>
                  <span className="text-sm font-black text-blue-600 block mt-0.5">{selectedSite?.activeCount} collaborateurs</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Pointages autorisés ici</span>
                </div>
              </div>

              {/* Pied de carte avec lien Google Maps externe */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                  <Navigation className="w-3.5 h-3.5 text-blue-600" />
                  <span>Cartographie OpenStreetMap & Carto Voyager (Plan & Vue Aérienne Gratuits)</span>
                </span>

                <a
                  href={`https://www.google.com/maps?q=${selectedSite?.lat},${selectedSite?.lon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-slate-600 hover:text-blue-600 flex items-center gap-1 transition"
                >
                  <span>Ouvrir dans Google Maps</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </div>
            </div>
          </div>

          {/* Liste des Sites (5 colonnes sur desktop/laptop) */}
          <div className="lg:col-span-5 space-y-3">
            <h4 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">
              Périmètres de Présence Déclarés ({sites.length})
            </h4>

            <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
              {sites.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                  <MapPin className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-800">Aucun périmètre configuré</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                    Définissez les coordonnées GPS et le rayon de détection satellite pour cette entreprise.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenAddSiteModal}
                    className="mt-4 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                  >
                    + Configurer mon 1er site
                  </button>
                </div>
              ) : (
                sites.map((site) => {
                const isSelected = site.id === selectedSiteId;
                return (
                  <div
                    key={site.id}
                    onClick={() => setSelectedSiteId(site.id)}
                    className={`bg-white rounded-2xl border p-4 transition cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md bg-blue-50/20'
                        : 'border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            Actif
                          </span>
                          {isSelected && (
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                              Sélectionné
                            </span>
                          )}
                        </div>
                        <h4 className="font-extrabold text-sm text-slate-900 mt-1">{site.name}</h4>
                        <p className="text-xs text-slate-500">{site.city}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSite(site.id, site.name);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                      <div className="bg-slate-50 p-2 rounded-xl">
                        <span className="text-slate-400 block text-[10px]">Rayon Satellite</span>
                        <span className="font-extrabold text-slate-800">{site.radiusMeters}m</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl">
                        <span className="text-slate-400 block text-[10px]">Wi-Fi Box</span>
                        <span className="font-bold text-slate-700 truncate block text-[11px]">{site.wifiSsid || 'Sans Wi-Fi'}</span>
                      </div>
                    </div>
                  </div>
                );
              }))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== ONGLET 3 : PLANNINGS & HORAIRES ==================== */}
      {activeTab === 'plannings' && (
        <div className="space-y-6 animate-fadeIn">
          {/* En-tête avec Sélecteur de Sous-Onglets (Grilles vs Fériés) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-blue-600" />
                <span>Plannings, Horaires & Exemptions RH</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configurez les rythmes de travail hebdomadaires et le calendrier des fermetures / jours fériés non pénalisants
              </p>
            </div>

            {/* Sélecteur de sous-onglets */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => setPlanningsSubTab('schedules')}
                className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                  planningsSubTab === 'schedules'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Grilles Hebdomadaires ({schedules.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setPlanningsSubTab('holidays')}
                className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                  planningsSubTab === 'holidays'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Jours Fériés & Congés ({holidays.length})</span>
              </button>
            </div>
          </div>

          {/* ================= SOUS-ONGLET 1 : GRILLES HORAIRES ================= */}
          {planningsSubTab === 'schedules' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                    Régimes Horaires Définis ({schedules.length})
                  </h4>
                  <p className="text-xs text-slate-500">Créneaux d'activité par profil de collaborateur ou classe</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddScheduleModal(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nouveau Planning</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {schedules.map((sched) => (
                  <div key={sched.id} className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          {sched.category} • {sched.weekly_hours}h / semaine
                        </span>
                        <h4 className="font-black text-base text-slate-900 mt-1.5">{sched.name}</h4>
                      </div>
                      <span className="text-xs font-bold text-slate-500 font-mono flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                        {sched.assignedCount ?? 0} affectés
                      </span>
                    </div>

                    {/* Jours travaillés */}
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">Jours d'activité :</span>
                      <div className="flex items-center gap-1.5">
                        {DAY_LABELS.map(d => {
                          const isWorking = (sched.working_days || []).includes(d.day);
                          return (
                            <span
                              key={d.day}
                              className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                                isWorking ? 'bg-emerald-600 text-white font-extrabold' : 'bg-slate-100 text-slate-400 line-through'
                              }`}
                            >
                              {d.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Plages horaires */}
                    <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-slate-100">
                      <div className="bg-slate-50 p-2.5 rounded-xl">
                        <span className="text-slate-400 block text-[10px]">Matin</span>
                        <span className="font-mono font-bold text-slate-800">{sched.morning_start} - {sched.morning_end}</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl">
                        <span className="text-slate-400 block text-[10px]">Pause Déjeuner</span>
                        <span className="font-mono font-bold text-slate-800">{sched.lunch_start} - {sched.lunch_end}</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl">
                        <span className="text-slate-400 block text-[10px]">Après-midi</span>
                        <span className="font-mono font-bold text-slate-800">{sched.afternoon_start} - {sched.afternoon_end}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= SOUS-ONGLET 2 : JOURS FÉRIÉS & CONGÉS ================= */}
          {planningsSubTab === 'holidays' && (
            <div className="space-y-6">
              
              {/* Bannière Déclaration Rapide "Demain" & Actions */}
              <div className="p-5 sm:p-6 bg-linear-to-r from-emerald-50 via-teal-50/50 to-blue-50 border border-emerald-200/90 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
                    <CalendarCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full inline-block mb-1">
                      Gestion d'Exemptions RH
                    </span>
                    <h4 className="font-black text-sm text-slate-900">
                      Neutralisation Automatique des Absences
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed max-w-xl">
                      Les jours déclarés comme fériés ou fermetures d'entreprise sont exclus des pénalités d'absence : le personnel ne sera pas pénalisé sur son taux d'assiduité ni sur ses heures de paie.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto">
                  <button
                    type="button"
                    onClick={handleQuickExemptTomorrow}
                    className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm shadow-emerald-600/20 cursor-pointer"
                  >
                    <span>📅 Neutraliser Demain en 1 Clic</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewHolidayDate(getTomorrowDateStr());
                      setNewHolidayName('');
                      setNewHolidayNotes('');
                      setShowAddHolidayModal(true);
                    }}
                    className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl transition border border-slate-200 shadow-2xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-blue-600" />
                    <span>+ Déclarer une Date</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadDefaultHolidays}
                    title="Charger les 5 jours fériés légaux de référence 2026"
                    className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition border border-slate-200 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Fériés Légaux 2026</span>
                  </button>
                </div>
              </div>

              {/* Statistiques Rapides */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Jours Exemptés</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900 font-mono">{holidays.length}</span>
                    <span className="text-xs text-slate-500 font-medium">dates déclarées</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Régime de Paie</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-emerald-600 font-mono">100%</span>
                    <span className="text-xs text-slate-500 font-medium">Chômé payé certifié</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Gouvernance RH</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-sm font-black text-blue-600 flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      <span>Conforme Droit Travail</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Liste des Jours Fériés & Exemptions */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Calendrier des Fermetures & Jours Non Travaillés ({holidays.length})</span>
                </h4>

                {holidays.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-3xl border border-dashed border-slate-300 space-y-3">
                    <CalendarX className="w-10 h-10 text-slate-300 mx-auto" />
                    <h5 className="font-bold text-sm text-slate-800">Aucun jour férié ou congé exceptionnel déclaré</h5>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Déclarez les jours où l'entreprise est fermée ou les jours fériés légaux pour que les pointages ne soient pas comptabilisés en absences injustifiées.
                    </p>
                    <div className="pt-2 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={handleQuickExemptTomorrow}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                      >
                        Neutraliser Demain
                      </button>
                      <button
                        type="button"
                        onClick={handleLoadDefaultHolidays}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                      >
                        Charger les Fériés 2026
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {holidays.map((h) => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      const tomorrowStr = getTomorrowDateStr();
                      const isTomorrow = h.date === tomorrowStr;
                      const isToday = h.date === todayStr;
                      const isPast = h.date < todayStr;

                      // Date formatée en français
                      const dateObj = new Date(h.date + 'T00:00:00');
                      const dayNum = dateObj.getDate();
                      const monthName = dateObj.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase();
                      const dayName = dateObj.toLocaleDateString('fr-FR', { weekday: 'long' });

                      return (
                        <div
                          key={h.id}
                          className={`bg-white rounded-3xl border p-5 space-y-3 shadow-xs transition hover:shadow-md ${
                            isTomorrow
                              ? 'border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/20'
                              : isToday
                              ? 'border-rose-400 ring-2 ring-rose-400/20 bg-rose-50/20'
                              : 'border-slate-200/90'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              {/* Pastille Date Élégante */}
                              <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 font-mono shadow-xs ${
                                isTomorrow
                                  ? 'bg-amber-500 text-white'
                                  : isToday
                                  ? 'bg-rose-600 text-white'
                                  : isPast
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-blue-600 text-white'
                              }`}>
                                <span className="text-[10px] uppercase font-bold leading-none">{monthName}</span>
                                <span className="text-base font-black leading-tight">{dayNum}</span>
                              </div>

                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {isTomorrow && (
                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 animate-pulse">
                                      Demain !
                                    </span>
                                  )}
                                  {isToday && (
                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                                      Aujourd'hui
                                    </span>
                                  )}
                                  {isPast && (
                                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                      Passé
                                    </span>
                                  )}
                                  <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    {h.category === 'FERIE_LEGAL'
                                      ? 'Férié Légal'
                                      : h.category === 'CONGE_ENTREPRISE'
                                      ? 'Fermeture Entreprise'
                                      : h.category === 'PEDAGOGIQUE'
                                      ? 'Journée Pédagogique'
                                      : 'Événement Spécial'}
                                  </span>
                                </div>
                                <h5 className="font-extrabold text-sm text-slate-900 mt-1 capitalize leading-snug">
                                  {h.name}
                                </h5>
                                <span className="text-[11px] text-slate-400 capitalize block">
                                  {dayName} {h.date}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteHoliday(h.id)}
                              title="Supprimer cette exemption"
                              className="text-slate-400 hover:text-red-600 p-1.5 rounded-xl hover:bg-red-50 transition cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Absence neutralisée</span>
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              {h.is_paid ? 'Chômé payé' : 'Non rémunéré'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      )}

      {/* ==================== ONGLET 4 : SÉCURITÉ & ANTI-TRICHE ==================== */}
      {activeTab === 'securite' && (
        <div className="space-y-6 animate-fadeIn">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900">Matrice de Sécurité & Contrôles Anti-Triche</h3>
            <p className="text-xs text-slate-500">Activez ou désactivez les vérifications exigées en temps réel lors de chaque pointage</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Règle Mock GPS */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Radio className="w-5 h-5" />
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={securityConfig.hard_block_mock_gps}
                    onChange={() => handleToggleSecurity('hard_block_mock_gps')}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-900">Bouclier Anti-Faux GPS (Mock Locations)</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Détecte et rejette immédiatement toute tentative de pointage avec une application tierce d'usurpation GPS (Fake GPS Android).
                </p>
              </div>
            </div>

            {/* Règle Wi-Fi BSSID */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Wifi className="w-5 h-5" />
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={securityConfig.require_wifi_bssid}
                    onChange={() => handleToggleSecurity('require_wifi_bssid')}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-900">Validation Wi-Fi Box Obligatoire</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Exige l'adresse MAC unique de la box Wi-Fi de l'établissement. (Désactivez pour autoriser les chantiers sans Wi-Fi).
                </p>
              </div>
            </div>

            {/* Règle Device Binding */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={securityConfig.require_device_binding}
                    onChange={() => handleToggleSecurity('require_device_binding')}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-900">Liaison Matérielle Unique (1 Smartphone = 1 Compte)</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Scelle l'appareil mobile au compte utilisateur. Empêche le prêt de smartphone ou le pointage de complaisance.
                </p>
              </div>
            </div>

            {/* Règle Biométrie Native */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={securityConfig.require_biometrics}
                    onChange={() => handleToggleSecurity('require_biometrics')}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-900">Biométrie Matérielle du Smartphone (Touch ID / Face ID)</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Exige l'empreinte digitale ou la reconnaissance faciale matérielle du téléphone avant de valider le pointage.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL CRÉATION DE PÉRIMÈTRE (BENTO ENTERPRISE) ==================== */}
      {showAddSiteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full flex flex-col max-h-[92vh] border border-slate-100 overflow-hidden">
            
            {/* Header du modal - Fixé en haut, toujours visible */}
            <div className="px-5 py-4 sm:px-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">Nouveau Périmètre de Pointage</h3>
                  <p className="text-xs text-slate-500">Zone géographique WGS84 autorisée pour les pointages mobiles</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddSiteModal(false)} 
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulaire avec scroll interne fluide */}
            <form onSubmit={handleCreateSite} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 sm:px-6 overflow-y-auto space-y-3.5 text-xs flex-1">
                
                {/* Ligne 1 : Nom du site & Commune côte à côte */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Nom du Site / Périmètre <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Siège Social, Campus..."
                      value={newSiteName}
                      onChange={(e) => setNewSiteName(e.target.value)}
                      className="w-full bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Commune / Ville <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Ouagadougou, Abidjan..."
                      value={newSiteCity}
                      onChange={(e) => setNewSiteCity(e.target.value)}
                      className="w-full bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                {/* Bloc Coordonnées GPS avec Détection 1-clic */}
                <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-blue-600" />
                      <span>Coordonnées Satellites WGS84 <span className="text-rose-500">*</span></span>
                    </span>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {isMobileDevice ? (
                        <button
                          type="button"
                          onClick={handleDetectModalGps}
                          disabled={detectingModalGps}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-lg transition text-xs flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50 whitespace-nowrap"
                        >
                          <Navigation className={`w-3.5 h-3.5 ${detectingModalGps ? 'animate-spin' : ''}`} />
                          <span>{detectingModalGps ? 'Fix GNSS en cours...' : '📍 Ma Position GPS Téléphone'}</span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setShowPhoneCalibModal(true)}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-lg transition text-[11px] flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap"
                          >
                            <Smartphone className="w-3.5 h-3.5" />
                            <span>📱 Caler par Smartphone (±2m)</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleDetectModalGps}
                            disabled={detectingModalGps}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 active:scale-95 text-blue-700 font-bold rounded-lg border border-blue-200 transition text-[11px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                            title="Position approximative calculée par le réseau/navigateur PC"
                          >
                            <LocateFixed className={`w-3.5 h-3.5 ${detectingModalGps ? 'animate-spin' : ''}`} />
                            <span>{detectingModalGps ? 'Recherche...' : 'Position PC'}</span>
                          </button>
                        </>
                      )}
                      {sites.length > 0 && (
                        <button
                          type="button"
                          onClick={handleUseHqCoords}
                          title="Copier les coordonnées du site principal"
                          className="px-2 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-200 transition text-[11px] flex items-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          <Building2 className="w-3 h-3 text-slate-500" />
                          <span>Siège</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {modalGpsSuccess && (
                    <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 animate-fadeIn">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{modalGpsSuccess}</span>
                    </div>
                  )}

                  {modalGpsError && (
                    <div className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 animate-fadeIn">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>{modalGpsError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-0.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Latitude</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        required
                        placeholder="Ex: 11.247000"
                        value={newSiteLat}
                        onChange={(e) => setNewSiteLat(e.target.value.replace(',', '.'))}
                        className="w-full bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-3 py-1.5 font-mono text-xs text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Longitude</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        required
                        placeholder="Ex: -4.291800"
                        value={newSiteLon}
                        onChange={(e) => setNewSiteLon(e.target.value.replace(',', '.'))}
                        className="w-full bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-3 py-1.5 font-mono text-xs text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  {/* Calage Visuel Satellite Haute Précision (~1m) */}
                  <div className="pt-2 border-t border-slate-200/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
                        <span>Calage Visuel au Mètre Près (Plan & Satellite Aérien)</span>
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                        Précision physique ~1m
                      </span>
                    </div>

                    <div className="rounded-2xl overflow-hidden border border-slate-200">
                      <DynamicSiteGeofenceMap
                        name={newSiteName || 'Nouveau Site'}
                        city={newSiteCity || 'Établissement'}
                        lat={parseFloat(newSiteLat) || (sites[0]?.lat ?? 11.1806)}
                        lon={parseFloat(newSiteLon) || (sites[0]?.lon ?? -4.2949)}
                        radiusMeters={parseInt(newSiteRadius, 10) || 80}
                        mode="picker"
                        defaultStyle="satellite"
                        heightClassName="h-56 sm:h-64"
                        onCoordinatesChange={(pickedLat, pickedLon) => {
                          setNewSiteLat(pickedLat.toFixed(6));
                          setNewSiteLon(pickedLon.toFixed(6));
                          setModalGpsSuccess('🎯 Position verrouillée au mètre près sur le bâtiment !');
                          setModalGpsError(null);
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 block italic">
                      💡 Cliquez ou glissez le repère directement sur le toit ou le portail de votre bureau pour caler la position à 1 mètre près.
                    </span>
                  </div>
                </div>

                {/* Rayon Satellite */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-bold text-slate-800 text-xs">Rayon Satellite Autorisé</label>
                    <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                      Tolérance : {newSiteRadius} mètres
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      { val: '50', label: '50m', sub: 'Strict' },
                      { val: '80', label: '80m', sub: 'Standard' },
                      { val: '120', label: '120m', sub: 'Large' },
                      { val: '150', label: '150m', sub: 'Campus' },
                      { val: '200', label: '200m', sub: 'Vaste' },
                    ].map((r) => (
                      <button
                        key={r.val}
                        type="button"
                        onClick={() => setNewSiteRadius(r.val)}
                        className={`py-1.5 px-1 rounded-xl text-center border transition cursor-pointer ${
                          newSiteRadius === r.val
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <div className="font-extrabold text-xs">{r.label}</div>
                        <div className={`text-[9px] ${newSiteRadius === r.val ? 'text-blue-100' : 'text-slate-400'}`}>
                          {r.sub}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Box Wi-Fi / Borne Réseau Optionnelle */}
                <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={hasWifiBox}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setHasWifiBox(checked);
                          // Ne jamais forcer la détection du PC distant si l'utilisateur est sur smartphone
                          if (checked && !isMobileDevice && !newSiteWifiSsid) {
                            handleDetectModalWifi();
                          }
                        }}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Wifi className="w-3.5 h-3.5 text-blue-600" />
                          <span>Associer une Box Wi-Fi d'établissement (Optionnel)</span>
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          Validation sous dalle béton & renfort anti-fraude GPS
                        </span>
                      </div>
                    </label>

                    {!isMobileDevice && (
                      <button
                        type="button"
                        onClick={handleDetectModalWifi}
                        disabled={detectingModalWifi}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-lg transition text-[11px] flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 whitespace-nowrap"
                        title="Scanner le réseau Wi-Fi physique connecté à ce PC"
                      >
                        <Radio className={`w-3.5 h-3.5 ${detectingModalWifi ? 'animate-spin' : ''}`} />
                        <span>{detectingModalWifi ? 'Scan Wi-Fi...' : 'Scanner le Wi-Fi de ce PC'}</span>
                      </button>
                    )}
                  </div>

                  {isMobileDevice && hasWifiBox && (
                    <div className="text-[10px] text-blue-800 bg-blue-50/80 border border-blue-200/60 p-2.5 rounded-xl space-y-1">
                      <span className="font-bold flex items-center gap-1.5">
                        <Wifi className="w-3 h-3 text-blue-600" />
                        <span>Nom du réseau Wi-Fi de ce lieu :</span>
                      </span>
                      <p className="text-[10px] text-slate-600 leading-relaxed">
                        Saisissez le nom de la Box (SSID, ex: <em>Orange_Fibre</em>, <em>MonBureau</em>). Le smartphone de vos employés validera automatiquement leur présence dès qu'ils s'y connecteront.
                      </p>
                    </div>
                  )}

                  {modalWifiSuccess && (
                    <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 animate-fadeIn">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{modalWifiSuccess}</span>
                    </div>
                  )}

                  {modalWifiError && (
                    <div className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 animate-fadeIn">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>{modalWifiError}</span>
                    </div>
                  )}

                  {hasWifiBox && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 animate-fadeIn">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-slate-600">Nom du Réseau Wi-Fi (SSID)</label>
                          {newSiteWifiSsid && (
                            <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">Renseigné</span>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="Ex: Orange_Pro_Siege ou Wifi_Bureau"
                          value={newSiteWifiSsid}
                          onChange={(e) => {
                            setNewSiteWifiSsid(e.target.value);
                            setModalWifiSuccess(null);
                            setModalWifiError(null);
                          }}
                          className="w-full bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-semibold transition"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-slate-600">Adresse MAC / BSSID (Optionnel)</label>
                          {newSiteWifiBssid && (
                            <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded font-mono">Certifiée</span>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="Ex: 6a:9e:29:2b:43:08 (Laisser vide si inconnu)"
                          value={newSiteWifiBssid}
                          onChange={(e) => setNewSiteWifiBssid(e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-800 font-bold transition"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer du modal - Fixé en bas, toujours visible */}
              <div className="px-5 py-3 sm:px-6 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
                <div>
                  {(!newSiteName.trim() || !newSiteCity.trim() || !newSiteLat.trim() || !newSiteLon.trim()) ? (
                    <span className="text-[11px] font-medium text-amber-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Renseignez le nom, la ville et les coordonnées</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 animate-fadeIn">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Prêt à enregistrer</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddSiteModal(false)}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs transition cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={!newSiteName.trim() || !newSiteCity.trim() || !newSiteLat || !newSiteLon}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Créer le Périmètre</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Calage Satellite par Smartphone (±2m) */}
      {showPhoneCalibModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Calage Satellite par Smartphone</h3>
                  <p className="text-xs text-slate-500">Précision GNSS pure au mètre près (±1 à 3m)</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPhoneCalibModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200/60 text-blue-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Pourquoi utiliser votre smartphone ?</span>
                </div>
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  Contrairement aux ordinateurs qui estiment leur position via les box Wi-Fi et adresses IP (±150m), un smartphone dispose d&apos;une vraie puce <strong>GNSS multi-constellations</strong> (GPS, Galileo, Glonass) assurant une précision physique à ±2 mètres.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center text-center space-y-3">
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center">
                  <RealQrCode 
                    value={getPublicUrl('/calibrer')}
                    size={170}
                  />
                </div>
                <div className="space-y-1">
                  <span className="font-bold text-slate-900 text-xs block">Scannez ce QR Code avec votre téléphone</span>
                  <span className="text-[11px] text-emerald-700 font-bold block bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                    📶 Connectez votre téléphone au Wi-Fi &quot;{selectedSite?.wifiSsid || 'SAKO'}&quot;
                  </span>
                </div>
                <div className="w-full flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 text-left">
                  <span className="font-mono text-[11px] text-blue-600 truncate flex-1 select-all font-bold">
                    {getPublicUrl('/calibrer')}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        navigator.clipboard.writeText(getPublicUrl('/calibrer'));
                        setToastMsg("Lien du calibreur copié !");
                        setTimeout(() => setToastMsg(null), 3000);
                      }
                    }}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition cursor-pointer"
                    title="Copier le lien"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-[11px] text-slate-600 bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100">
                <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                  <Radar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Procédure sur le terrain (1 minute) :</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-700">
                  <li>Placez-vous devant le portail ou l&apos;entrée du site.</li>
                  <li>Ouvrez la page sur votre téléphone et activez le GPS.</li>
                  <li>Dès que le voyant passe au vert (±1 à 3m), appuyez sur <strong>&quot;Verrouiller ce Site&quot;</strong>.</li>
                  <li>Les coordonnées WGS84 se synchronisent automatiquement ici en temps réel.</li>
                </ol>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <a
                  href="/calibrer"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition flex items-center gap-1.5 text-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Tester sur ce PC</span>
                </a>
                <button
                  type="button"
                  onClick={() => setShowPhoneCalibModal(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition text-xs cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL AVANCÉ CRÉATION DE PLANNING (IMAGE 2 REHAUSSÉE) ==================== */}
      {showAddScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto">
            
            {/* Header du modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">Nouveau Régime de Planning</h3>
                  <p className="text-xs text-slate-500">Configurez les plages de travail, pause déjeuner et tolérances</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddScheduleModal(false)} 
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="space-y-5 text-xs">
              
              {/* Intitulé */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Intitulé Officiel du Planning <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Équipe Bureaux (Lun-Ven 40h), Équipe Magasin (6j/7), Terminale A..."
                  value={newSchedName}
                  onChange={(e) => setNewSchedName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Régime / Catégorie */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Type de Régime Horaire</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewSchedCategory('Fractionné')}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                      newSchedCategory === 'Fractionné'
                        ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Coffee className={`w-4 h-4 mb-1.5 ${newSchedCategory === 'Fractionné' ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="font-bold text-slate-900 block">Fractionné</span>
                    <span className="text-[10px] text-slate-400">Matin + Pause Déjeuner</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewSchedCategory('Continu')}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                      newSchedCategory === 'Continu'
                        ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Clock className={`w-4 h-4 mb-1.5 ${newSchedCategory === 'Continu' ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="font-bold text-slate-900 block">Continu</span>
                    <span className="text-[10px] text-slate-400">Journée sans coupure</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewSchedCategory('Personnalisé')}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                      newSchedCategory === 'Personnalisé'
                        ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Moon className={`w-4 h-4 mb-1.5 ${newSchedCategory === 'Personnalisé' ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="font-bold text-slate-900 block">Posté / Nuit</span>
                    <span className="text-[10px] text-slate-400">2x8, 3x8 ou garde</span>
                  </button>
                </div>
              </div>

              {/* Jours d'activité avec presets rapides */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-slate-700">Jours d'Activité Prévus</label>
                  <div className="flex items-center gap-1.5 text-[10px] text-blue-600 font-bold">
                    <button
                      type="button"
                      onClick={() => setSelectedDays([1, 2, 3, 4, 5])}
                      className="hover:underline cursor-pointer"
                    >
                      Lun-Ven
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedDays([1, 2, 3, 4, 5, 6])}
                      className="hover:underline cursor-pointer"
                    >
                      Lun-Sam
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedDays([1, 2, 3, 4, 5, 6, 7])}
                      className="hover:underline cursor-pointer"
                    >
                      7j/7
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {DAY_LABELS.map(d => {
                    const isSelected = selectedDays.includes(d.day);
                    return (
                      <button
                        key={d.day}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            if (selectedDays.length > 1) setSelectedDays(selectedDays.filter(x => x !== d.day));
                          } else {
                            setSelectedDays([...selectedDays, d.day].sort());
                          }
                        }}
                        className={`flex-1 py-2 rounded-xl font-bold transition cursor-pointer text-xs ${
                          isSelected ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Plages Horaires selon la catégorie */}
              {newSchedCategory === 'Fractionné' ? (
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    Plages Horaires Fractionnées (Matinée + Déjeuner + Après-midi)
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Prise de Poste (Matin)</label>
                      <input
                        type="time"
                        value={morningStart}
                        onChange={(e) => setMorningStart(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Début Pause Déjeuner</label>
                      <input
                        type="time"
                        value={morningEnd}
                        onChange={(e) => {
                          setMorningEnd(e.target.value);
                          setLunchStart(e.target.value);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Reprise Après-midi (Fin Pause)</label>
                      <input
                        type="time"
                        value={lunchEnd}
                        onChange={(e) => {
                          setLunchEnd(e.target.value);
                          setAfternoonStart(e.target.value);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Fin de Journée (Départ)</label>
                      <input
                        type="time"
                        value={afternoonEnd}
                        onChange={(e) => setAfternoonEnd(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Heure de Début de Quart</label>
                    <input
                      type="time"
                      value={morningStart}
                      onChange={(e) => setMorningStart(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Heure de Fin de Quart</label>
                    <input
                      type="time"
                      value={afternoonEnd}
                      onChange={(e) => setAfternoonEnd(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-800"
                    />
                  </div>
                </div>
              )}

              {/* Tolérance au retard */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Marge de Tolérance au Retard
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 5, 10, 15, 30].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setToleranceMinutes(m)}
                      className={`py-1.5 rounded-xl font-bold border transition cursor-pointer text-xs ${
                        toleranceMinutes === m ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {m === 0 ? '0 min (Strict)' : `${m} min`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Synthèse calculée en temps réel */}
              <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-200/80 flex items-center justify-between text-xs">
                <div>
                  <span className="font-extrabold text-blue-900 block">
                    {calculatedDailyHours}h de travail / jour • {selectedDays.length} jours prévus
                  </span>
                  <span className="text-[11px] text-blue-700">
                    Tolérance de {toleranceMinutes} min appliquée avant déclenchement d'une alerte
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-blue-700 font-mono block">
                    {calculatedWeeklyHours}h
                  </span>
                  <span className="text-[10px] text-blue-500 uppercase font-bold">/ semaine</span>
                </div>
              </div>

              {/* Actions du formulaire */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddScheduleModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold cursor-pointer transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submittingSchedule || !newSchedName.trim()}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold px-5 py-2.5 shadow-md shadow-blue-500/20 cursor-pointer transition"
                >
                  {submittingSchedule ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Création...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Créer le Planning</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL DÉCLARATION D'EXEMPTION RH / JOUR FÉRIÉ ==================== */}
      {showAddHolidayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6">
            
            {/* Header du modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">Déclarer un Jour Férié ou Chômé</h3>
                  <p className="text-xs text-slate-500">Neutralise automatiquement les absences pour toute l'organisation</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddHolidayModal(false)} 
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddHoliday} className="space-y-4 text-xs">
              
              {/* Raccourcis de sélection rapide de date */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Sélection Rapide de la Date
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setNewHolidayDate(getTomorrowDateStr())}
                    className={`flex-1 py-2 px-3 rounded-xl font-bold border transition cursor-pointer text-center text-xs ${
                      newHolidayDate === getTomorrowDateStr()
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    Demain
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewHolidayDate(new Date().toISOString().split('T')[0])}
                    className={`flex-1 py-2 px-3 rounded-xl font-bold border transition cursor-pointer text-center text-xs ${
                      newHolidayDate === new Date().toISOString().split('T')[0]
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    Aujourd'hui
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 2);
                      setNewHolidayDate(d.toISOString().split('T')[0]);
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl font-bold border transition cursor-pointer text-center text-xs ${
                      newHolidayDate && newHolidayDate !== getTomorrowDateStr() && newHolidayDate !== new Date().toISOString().split('T')[0]
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    Après-demain
                  </button>
                </div>
              </div>

              {/* Champ Date officiel */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Date Exacte Non Travaillée <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={newHolidayDate}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-900 font-bold"
                />
              </div>

              {/* Libellé / Motif */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Intitulé / Motif de la Fermeture <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Fête Nationale, Pont de l'Ascension, Journée Pédagogique, Inventaire..."
                  value={newHolidayName}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold"
                />
              </div>

              {/* Catégorie */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Type d'Exemption
                </label>
                <select
                  value={newHolidayCategory}
                  onChange={(e) => setNewHolidayCategory(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold cursor-pointer"
                >
                  <option value="FERIE_LEGAL">Férié Légal Officiel (Chômé Payé)</option>
                  <option value="CONGE_ENTREPRISE">Fermeture Exceptionnelle d'Entreprise</option>
                  <option value="PEDAGOGIQUE">Journée Pédagogique / Fermeture Campus</option>
                  <option value="EVENEMENT_SPECIAL">Événement d'Entreprise / Assemblée Générale</option>
                </select>
              </div>

              {/* Options de Neutralisation */}
              <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200/80 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-emerald-950">
                  <input
                    type="checkbox"
                    checked={newHolidayNeutralize}
                    onChange={(e) => setNewHolidayNeutralize(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Neutraliser les pénalités d'absence pour tout le personnel</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-emerald-950">
                  <input
                    type="checkbox"
                    checked={newHolidayPaid}
                    onChange={(e) => setNewHolidayPaid(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Journée chômée payée (maintenir les heures contractuelles au relevé)</span>
                </label>
              </div>

              {/* Justification administrative facultative */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Notes / Réf. Administrative (Optionnel)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Référence du décret ministériel ou note de service de la Direction..."
                  value={newHolidayNotes}
                  onChange={(e) => setNewHolidayNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 resize-none"
                />
              </div>

              {/* Boutons d'action */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddHolidayModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold cursor-pointer transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!newHolidayDate || !newHolidayName.trim()}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold px-5 py-2.5 shadow-md shadow-emerald-600/20 cursor-pointer transition"
                >
                  <Check className="w-4 h-4" />
                  <span>Enregistrer l'Exemption RH</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL AFFICHE OFFICIELLE D'ENRÔLEMENT A4 ==================== */}
      {showPosterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden my-8">
            
            {/* Barre d'action supérieure (masquée à l'impression) */}
            <div className="no-print px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold">Aperçu Affiche d'Enrôlement A4</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/20"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer l'Affiche</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPosterModal(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Corps du document A4 Officiel */}
            <div className="print-card p-8 sm:p-12 bg-white text-slate-900 space-y-8 border-8 border-slate-100 rounded-2xl m-4 sm:m-6">
              
              {/* En-tête institutionnel */}
              <div className="text-center space-y-2 border-b-2 border-slate-900/10 pb-6">
                {orgLogo && (
                  <img
                    src={orgLogo}
                    alt={orgName}
                    className="w-16 h-16 rounded-2xl object-cover mx-auto mb-2 border border-slate-200 shadow-xs"
                  />
                )}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-black uppercase tracking-widest">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{sectorProfile === 'SCHOOL' ? 'Établissement Scolaire' : sectorProfile === 'EVENT' ? 'Événement Certifié' : 'Organisation Entreprise'}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
                  {orgName}
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Dispositif Officiel de Pointage & Gestion de Présence Décentralisée • PointagePro
                </p>
              </div>

              {/* Titre d'instruction */}
              <div className="text-center space-y-1">
                <h2 className="text-lg font-extrabold text-blue-900">
                  📱 Connectez votre Smartphone en 3 Secondes
                </h2>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Scannez le QR Code ci-dessous avec votre appareil photo ou l'application PointagePro pour lier votre téléphone.
                </p>
              </div>

              {/* Cadre Central avec QR Code Géant */}
              <div className="bg-slate-50 border-2 border-dashed border-blue-300 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center space-y-4 text-center">
                <div className="bg-white p-4 rounded-2xl shadow-md border border-slate-200 inline-block">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=10&data=${encodeURIComponent(liveJoinUrl)}`}
                    alt="QR Code Enrôlement"
                    className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Code Établissement Officiel
                  </span>
                  <span className="font-mono font-black text-2xl sm:text-3xl text-blue-700 bg-white px-5 py-2 rounded-2xl border border-blue-200 inline-block tracking-widest shadow-2xs">
                    {orgCode}
                  </span>
                  <p className="text-[11px] font-mono text-slate-500 max-w-sm mx-auto pt-1 break-all">
                    {liveJoinUrl}
                  </p>
                </div>
              </div>

              {/* Les 3 Étapes Pas-à-Pas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">1</span>
                  <h4 className="font-bold text-xs text-slate-900">Scannez le QR Code</h4>
                  <p className="text-[11px] text-slate-500">Pointez l'appareil photo ordinaire de votre smartphone sur le code ci-dessus.</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">2</span>
                  <h4 className="font-bold text-xs text-slate-900">Ouvrez le Portail</h4>
                  <p className="text-[11px] text-slate-500">La page d'enrôlement s'ouvre avec votre code {orgCode} pré-rempli.</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">3</span>
                  <h4 className="font-bold text-xs text-slate-900">Validez votre Profil</h4>
                  <p className="text-[11px] text-slate-500">Indiquez votre matricule personnel et activez la biométrie locale.</p>
                </div>
              </div>

              {/* Pied de page et cachet */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div>
                  <span className="font-bold block text-slate-800">Support & Assistance :</span>
                  <span>{supportContact}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-mono">Affichage officiel</span>
                  <span className="font-bold text-slate-700">La Direction</span>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}

// Suspense wrapper for useSearchParams
export default function ParametresPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Chargement des paramètres...</div>}>
      <ParametresContent />
    </Suspense>
  );
}
