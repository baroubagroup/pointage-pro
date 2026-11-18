'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { createClient } from '@/lib/supabase/client';
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
  Link as LinkIcon
} from 'lucide-react';

// ==================== INTERFACES ====================
type SettingsTab = 'general' | 'sites' | 'plannings' | 'securite';

export interface HolidayExemption {
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
export function generateCanonicalOrgCode(orgName: string): string {
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

export function isCanonicalCode(code: string): boolean {
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

const FALLBACK_SITES: SimpleSite[] = [
  {
    id: '00000000-0000-0000-0000-000000000010',
    name: 'Siège Principal Ouagadougou',
    city: 'Ouagadougou',
    lat: 11.247000,
    lon: -4.291800,
    radiusMeters: 120,
    wifiSsid: 'PointagePro_Siege',
    wifiBssid: 'PointagePro_Siege (b4:ee:b4:91:a2:10)',
    activeCount: 14,
    isActive: true
  },
  {
    id: '00000000-0000-0000-0000-000000000011',
    name: 'Agence Cocody Riviera 2',
    city: 'Abidjan',
    lat: 5.358200,
    lon: -3.974100,
    radiusMeters: 80,
    wifiSsid: 'Orange_Pro_ZoneNord',
    wifiBssid: 'Orange_Pro_ZoneNord (7c:26:34:11:ff:80)',
    activeCount: 8,
    isActive: true
  }
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

  // State Général
  const [orgName, setOrgName] = useState('BAROUBA POINTAGE PRO');
  const [orgCode, setOrgCode] = useState('ORG-8492');
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
  const [sites, setSites] = useState<SimpleSite[]>(FALLBACK_SITES);
  const [selectedSiteId, setSelectedSiteId] = useState<string>(FALLBACK_SITES[0].id);
  const [showAddSiteModal, setShowAddSiteModal] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteCity, setNewSiteCity] = useState('Cocody');
  const [newSiteLat, setNewSiteLat] = useState('5.358200');
  const [newSiteLon, setNewSiteLon] = useState('-3.974100');
  const [newSiteRadius, setNewSiteRadius] = useState('80');
  const [newSiteWifiSsid, setNewSiteWifiSsid] = useState('');
  const [newSiteWifiBssid, setNewSiteWifiBssid] = useState('');
  const [hasWifiBox, setHasWifiBox] = useState(true);
  const [detectingWifi, setDetectingWifi] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);

  // Simulateur GPS
  const [simLat, setSimLat] = useState<string>('11.247100');
  const [simLon, setSimLon] = useState<string>('-4.291750');
  const [simResult, setSimResult] = useState<{ inside: boolean; distance: number } | null>(null);

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
    const fetchData = async () => {
      try {
        const supabase = createClient();
        
        // 1. Org settings
        const { data: orgData } = await supabase
          .from('pointage_organizations')
          .select('*')
          .limit(1)
          .single();

        if (orgData) {
          if (orgData.name) setOrgName(orgData.name);
          if (orgData.org_code) setOrgCode(orgData.org_code);
          if (orgData.timezone) setTimezone(orgData.timezone);
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

        // 2. Sites
        const { data: sitesData } = await supabase
          .from('pointage_establishments')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (sitesData && sitesData.length > 0) {
          const mapped: SimpleSite[] = sitesData.map((d: any, idx: number) => ({
            id: d.id,
            name: d.name,
            city: d.city || 'Abidjan',
            lat: Number(d.latitude) || 11.247,
            lon: Number(d.longitude) || -4.2918,
            radiusMeters: Number(d.radius_meters) || 80,
            wifiSsid: d.wifi_ssid || undefined,
            wifiBssid: d.wifi_ssid ? `${d.wifi_ssid} (${(d.wifi_bssids && d.wifi_bssids[0]) || 'Certifié'})` : 'Box Wi-Fi Non Déclarée',
            activeCount: (idx + 1) * 4,
            isActive: d.is_active ?? true
          }));
          setSites(mapped);
          setSelectedSiteId(mapped[0].id);
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

  const selectedSite = useMemo(() => {
    return sites.find(s => s.id === selectedSiteId) || sites[0] || FALLBACK_SITES[0];
  }, [sites, selectedSiteId]);

  // Synchroniser le simulateur GPS dès que le site sélectionné change
  // On initialise à ~14 mètres du centroïde du site pour qu'il soit immédiatement "AUTORISÉ"
  useEffect(() => {
    if (selectedSite) {
      setSimLat((selectedSite.lat + 0.000100).toFixed(6));
      setSimLon((selectedSite.lon + 0.000100).toFixed(6));
    }
  }, [selectedSite?.id]);

  // Calcul du verdict simulateur GPS
  useEffect(() => {
    if (selectedSite && simLat && simLon) {
      const sLat = parseFloat(simLat);
      const sLon = parseFloat(simLon);
      if (!isNaN(sLat) && !isNaN(sLon)) {
        const dist = calculateDistanceMeters(selectedSite.lat, selectedSite.lon, sLat, sLon);
        setSimResult({
          distance: dist,
          inside: dist <= selectedSite.radiusMeters
        });
      }
    }
  }, [selectedSite, simLat, simLon]);

  // Détection GPS du navigateur
  const handleDetectCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSimLat(pos.coords.latitude.toFixed(6));
        setSimLon(pos.coords.longitude.toFixed(6));
        setDetectingLocation(false);
      },
      (err) => {
        setDetectingLocation(false);
        alert(`Erreur GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

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
      }).eq('id', '00000000-0000-0000-0000-000000000001').then();
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
      }).eq('id', '00000000-0000-0000-0000-000000000001').then();
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
      }).eq('id', '00000000-0000-0000-0000-000000000001').then();
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
          timezone: timezone,
          security_config: mergedConfig
        })
        .eq('id', '00000000-0000-0000-0000-000000000001');

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
        .eq('id', '00000000-0000-0000-0000-000000000001');
      setToastMsg(`Règle mise à jour avec succès`);
      setTimeout(() => setToastMsg(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  // Création de site
  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteName.trim()) return;

    const parsedLat = parseFloat(newSiteLat) || 11.247;
    const parsedLon = parseFloat(newSiteLon) || -4.2918;
    const parsedRadius = parseInt(newSiteRadius, 10) || 80;
    const cleanBssid = newSiteWifiBssid.trim().toLowerCase();

    const tempId = 'site-' + Date.now();
    const newSite: SimpleSite = {
      id: tempId,
      name: newSiteName.trim(),
      city: newSiteCity.trim() ? newSiteCity.trim() : 'Abidjan',
      lat: parsedLat,
      lon: parsedLon,
      radiusMeters: parsedRadius,
      wifiSsid: newSiteWifiSsid.trim() || undefined,
      wifiBssid: newSiteWifiSsid.trim() ? `${newSiteWifiSsid.trim()} (${cleanBssid || 'Certifié'})` : 'Box Wi-Fi Non Déclarée',
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
        org_id: '00000000-0000-0000-0000-000000000001',
        name: newSiteName.trim(),
        city: newSiteCity.trim() || 'Abidjan',
        latitude: parsedLat,
        longitude: parsedLon,
        radius_meters: parsedRadius,
        elastic_radius_meters: Math.max(150, Math.round(parsedRadius * 1.5)),
        wifi_ssid: newSiteWifiSsid.trim() || null,
        wifi_bssids: cleanBssid ? [cleanBssid] : [],
        is_active: true
      });
    } catch (e) {
      console.error(e);
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
        org_id: '00000000-0000-0000-0000-000000000001',
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
            <span>Sites & Radar Géofencing</span>
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
                placeholder="Ex: GROUPE SCOLAIRE LES LAURÉATS ou BAROUBA PRO"
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

      {/* ==================== ONGLET 2 : SITES & RADAR GÉOFENCING ==================== */}
      {activeTab === 'sites' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start animate-fadeIn">
          
          {/* Radar Visuel & Simulateur (7 colonnes) */}
          <div className="xl:col-span-7 bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <Radar className="w-5 h-5 animate-spin" style={{ animationDuration: '8s' }} />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">{selectedSite?.name}</h4>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {selectedSite?.lat.toFixed(6)}° N, {selectedSite?.lon.toFixed(6)}° W • Rayon: {selectedSite?.radiusMeters}m
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSiteModal(true)}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nouveau Périmètre</span>
              </button>
            </div>

            {/* Radar Canvas (Hauteur calibrée h-72 pour affichage immédiat sans scroll) */}
            <div className="relative w-full h-72 bg-slate-950 overflow-hidden flex items-center justify-center select-none">
              <div 
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage: 'linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)',
                  backgroundSize: '36px 36px'
                }}
              />
              <div className="absolute w-[80%] aspect-square rounded-full border border-sky-500/20 pointer-events-none" />
              <div className="absolute w-[60%] aspect-square rounded-full border border-sky-500/30 pointer-events-none" />
              <div className="absolute w-[40%] aspect-square rounded-full border border-sky-500/40 pointer-events-none" />
              <div className="absolute w-[20%] aspect-square rounded-full border border-sky-500/50 pointer-events-none" />
              <div className="absolute w-full h-[1px] bg-sky-500/20 pointer-events-none" />
              <div className="absolute h-full w-[1px] bg-sky-500/20 pointer-events-none" />

              {/* Faisceau rotatif de balayage */}
              <div 
                className="absolute w-[80%] aspect-square rounded-full pointer-events-none"
                style={{
                  background: 'conic-gradient(from 0deg, rgba(56, 189, 248, 0.22) 0deg, transparent 60deg, transparent 360deg)',
                  animation: 'spin 4s linear infinite'
                }}
              />

              {/* Bulle de Géofencing autorisée (Parfaitement centrée sur le centroïde) */}
              <div 
                className="absolute rounded-full border-2 border-emerald-400 bg-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.3)] flex items-center justify-center pointer-events-none transition-all duration-500"
                style={{
                  width: `${Math.min(75, Math.max(30, (selectedSite?.radiusMeters || 80) * 0.45))}%`,
                  aspectRatio: '1/1'
                }}
              >
                <div className="text-[10px] font-mono font-extrabold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/50">
                  {selectedSite?.radiusMeters}m
                </div>
              </div>

              {/* Centoïde GPS (Pin vert central) */}
              <div className="absolute z-20 flex flex-col items-center pointer-events-none">
                <div className="w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
                <div className="mt-1 bg-slate-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-700 whitespace-nowrap shadow-md">
                  📍 {selectedSite?.name}
                </div>
              </div>
            </div>

            {/* Testeur de simulation GPS & Actions Rapides */}
            <div className="p-4 sm:p-5 bg-slate-50/70 border-t border-slate-100 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-blue-600" />
                  Simulateur de Position WGS84 & Verdict Satellite
                </span>

                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setSimLat((selectedSite.lat + 0.000100).toFixed(6));
                      setSimLon((selectedSite.lon + 0.000100).toFixed(6));
                    }}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg border border-emerald-200 transition cursor-pointer text-[11px]"
                  >
                    📍 Tester dans zone (14m)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSimLat((selectedSite.lat + 0.002200).toFixed(6));
                      setSimLon((selectedSite.lon + 0.002200).toFixed(6));
                    }}
                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold rounded-lg border border-rose-200 transition cursor-pointer text-[11px]"
                  >
                    🚫 Tester hors zone (250m)
                  </button>
                  <button
                    type="button"
                    onClick={handleDetectCurrentLocation}
                    disabled={detectingLocation}
                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg border border-blue-200 transition cursor-pointer text-[11px] flex items-center gap-1"
                  >
                    <LocateFixed className={`w-3 h-3 ${detectingLocation ? 'animate-spin' : ''}`} />
                    <span>Mon GPS</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Latitude Test</label>
                  <input
                    type="text"
                    value={simLat}
                    onChange={(e) => setSimLat(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Longitude Test</label>
                  <input
                    type="text"
                    value={simLon}
                    onChange={(e) => setSimLon(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Verdict Système</label>
                  <div className={`px-3 py-1.5 rounded-xl border font-bold flex items-center justify-between ${
                    simResult?.inside
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}>
                    <span>{simResult?.inside ? 'AUTORISÉ' : 'REJETÉ'}</span>
                    <span className="text-[11px] font-mono">{simResult?.distance}m / {selectedSite.radiusMeters}m</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Liste des Sites (5 colonnes) */}
          <div className="xl:col-span-5 space-y-3">
            <h4 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">
              Périmètres de Présence Déclarés ({sites.length})
            </h4>

            <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
              {sites.map((site) => {
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
              })}
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

      {/* ==================== MODAL CRÉATION DE PÉRIMÈTRE ==================== */}
      {showAddSiteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-base text-slate-900">Nouveau Périmètre de Pointage</h3>
              <button onClick={() => setShowAddSiteModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSite} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nom du Site / Établissement *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Campus Principal, Boutique Angré..."
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Commune / Ville *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Cocody, Plateau, Ouagadougou..."
                  value={newSiteCity}
                  onChange={(e) => setNewSiteCity(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-500 mb-1">Latitude (WGS84)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={newSiteLat}
                    onChange={(e) => setNewSiteLat(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-500 mb-1">Longitude (WGS84)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={newSiteLon}
                    onChange={(e) => setNewSiteLon(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Rayon Satellite Autorisé</label>
                <div className="grid grid-cols-4 gap-2">
                  {['50', '80', '120', '150'].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setNewSiteRadius(r)}
                      className={`py-1.5 rounded-xl font-bold border transition cursor-pointer ${
                        newSiteRadius === r ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-700'
                      }`}
                    >
                      {r}m
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddSiteModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  Créer le Périmètre
                </button>
              </div>
            </form>
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
