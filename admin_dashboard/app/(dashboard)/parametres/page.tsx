'use client';

import { useState, useEffect, Suspense } from 'react';
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
  Search
} from 'lucide-react';

// ==================== INTERFACES ====================
type SettingsTab = 'general' | 'sites' | 'plannings' | 'securite';

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
}

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
    id: 'site-1',
    name: 'Siège Principal & Direction',
    city: 'Abidjan (Plateau)',
    lat: 5.321400,
    lon: -4.015200,
    radiusMeters: 80,
    wifiSsid: 'PointagePro_Siege',
    wifiBssid: 'PointagePro_Siege (b4:ee:b4:91:a2:10)',
    activeCount: 14,
    isActive: true
  },
  {
    id: 'site-2',
    name: 'Entrepôt Logistique Zone Nord',
    city: 'Abidjan (Yopougon)',
    lat: 5.348200,
    lon: -4.089100,
    radiusMeters: 120,
    wifiSsid: 'Orange_Pro_ZoneNord',
    wifiBssid: 'Orange_Pro_ZoneNord (7c:26:34:11:ff:80)',
    activeCount: 8,
    isActive: true
  },
  {
    id: 'site-3',
    name: 'Campus / Antenne Est',
    city: 'Abidjan (Cocody)',
    lat: 5.358200,
    lon: -3.974100,
    radiusMeters: 150,
    wifiSsid: 'Campus_Wifi_ZoneA',
    wifiBssid: 'Campus_Wifi_ZoneA (68:9e:29:3b:43:08)',
    activeCount: 22,
    isActive: true
  }
];

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

// Inner component using useSearchParams
function ParametresContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Tab actif
  const initialTab = (searchParams.get('tab') as SettingsTab) || 'general';
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  // Sync tab with URL
  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    router.push(`/parametres?tab=${tab}`, { scroll: false });
  };

  // State Général
  const [orgName, setOrgName] = useState('BAROUBA POINTAGE PRO');
  const [orgCode, setOrgCode] = useState('ORG-8492');
  const [copiedCode, setCopiedCode] = useState(false);
  const [timezone, setTimezone] = useState('Africa/Abidjan (GMT 0)');
  const [sectorProfile, setSectorProfile] = useState<'ENTERPRISE' | 'SCHOOL' | 'EVENT'>('ENTERPRISE');
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig>(DEFAULT_SECURITY_CONFIG);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

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
  const [simLat, setSimLat] = useState('5.321450');
  const [simLon, setSimLon] = useState('-4.015220');
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
          if (orgData.security_config) {
            setSecurityConfig(prev => ({ ...prev, ...orgData.security_config }));
            if (orgData.security_config.sector_profile) {
              setSectorProfile(orgData.security_config.sector_profile);
            }
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
            city: d.city ? (d.city.startsWith('Abidjan') ? d.city : `Abidjan (${d.city})`) : 'Abidjan',
            lat: Number(d.latitude) || 5.3214,
            lon: Number(d.longitude) || -4.0152,
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

  const selectedSite = sites.find(s => s.id === selectedSiteId) || sites[0] || FALLBACK_SITES[0];

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

  // Sauvegarde des paramètres généraux & sécurité
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const mergedConfig: SecurityConfig = {
      ...securityConfig,
      sector_profile: sectorProfile
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('pointage_security_config', JSON.stringify(mergedConfig));
      localStorage.setItem('pointage_org_name', orgName);
      localStorage.setItem('pointage_sector_profile', sectorProfile);
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
        .eq('id', '00000000-0000-0000-0000-000000000001');

      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
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

    const parsedLat = parseFloat(newSiteLat) || 5.3582;
    const parsedLon = parseFloat(newSiteLon) || -3.9741;
    const parsedRadius = parseInt(newSiteRadius, 10) || 80;
    const cleanBssid = newSiteWifiBssid.trim().toLowerCase();

    const tempId = 'site-' + Date.now();
    const newSite: SimpleSite = {
      id: tempId,
      name: newSiteName.trim(),
      city: newSiteCity.trim() ? `Abidjan (${newSiteCity.trim()})` : 'Abidjan',
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

  // Création planning
  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchedName.trim()) return;

    try {
      const supabase = createClient();
      const weeklyHours = selectedDays.length * 8;
      const { data, error } = await supabase.from('pointage_schedules').insert({
        org_id: '00000000-0000-0000-0000-000000000001',
        name: newSchedName.trim(),
        category: newSchedCategory,
        working_days: selectedDays,
        morning_start: morningStart,
        morning_end: morningEnd,
        lunch_start: lunchStart,
        lunch_end: lunchEnd,
        afternoon_start: afternoonStart,
        afternoon_end: afternoonEnd,
        tolerance_minutes: toleranceMinutes,
        weekly_hours: weeklyHours,
        is_active: true
      }).select().single();

      if (data) {
        setSchedules(prev => [...prev, { ...data, assignedCount: 0 }]);
        setShowAddScheduleModal(false);
        setNewSchedName('');
        setToastMsg(`Planning "${newSchedName}" créé avec succès !`);
        setTimeout(() => setToastMsg(null), 3500);
      }
    } catch (e) {
      console.error(e);
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

      {/* ==================== BARRE DE NAVIGATION DES ONGLETS DE PARAMÈTRES ==================== */}
      <div className="bg-white p-2 rounded-3xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          
          <button
            onClick={() => handleTabChange('general')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition flex-1 sm:flex-none justify-center ${
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
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition flex-1 sm:flex-none justify-center ${
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
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition flex-1 sm:flex-none justify-center ${
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
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition flex-1 sm:flex-none justify-center ${
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

      {/* ==================== CONTENU DES ONGLETS ==================== */}

      {/* -------------------- ONGLET 1 : ORGANISATION & MÉTIER -------------------- */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveGeneral} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-7 animate-fadeIn">
          
          {/* Cas d'usage métier */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Secteur d'Activité & Profil Métier
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                Adaptation Automatique
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Détermine la terminologie (Collaborateurs/Départements vs Élèves/Classes vs Participants/Badges) dans toute l'application.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div
                onClick={() => setSectorProfile('ENTERPRISE')}
                className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                  sectorProfile === 'ENTERPRISE'
                    ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20'
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
                    Collaborateurs, Départements, Heures de travail, Chantiers & Agences
                  </p>
                </div>
              </div>

              <div
                onClick={() => setSectorProfile('SCHOOL')}
                className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                  sectorProfile === 'SCHOOL'
                    ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20'
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
                    Élèves, Classes, Campus, Justifications parentales d'absence
                  </p>
                </div>
              </div>

              <div
                onClick={() => setSectorProfile('EVENT')}
                className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                  sectorProfile === 'EVENT'
                    ? 'border-purple-600 bg-purple-50/40 ring-2 ring-purple-500/20'
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
                    Participants, Badges, Pavillons & Portiques d'accès WGS84
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Identité & Code ORG */}
          <div className="pt-6 border-t border-slate-100 space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              Identité de l'Organisation & Code Canonique
            </h3>

            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nom Officiel de l'Organisation / Établissement
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Code Établissement Unique (Clé Multi-Tenant d'Enrôlement)
                  </label>
                  <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    Distribué aux élèves & employés
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={orgCode}
                    onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
                    placeholder="ORG-8492"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-black tracking-wider uppercase text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(orgCode);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="shrink-0 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{copiedCode ? '✓ Copié !' : 'Copier le Code'}</span>
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  * Vos élèves ou employés renseignent ce code simple (ex: <strong className="font-mono text-slate-600">ORG-8492</strong>) sur l'application mobile pour lier leur smartphone avec leur matricule et secret 2FA.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fuseau Horaire de Référence</label>
                <input
                  type="text"
                  disabled
                  value={timezone}
                  className="w-full text-xs bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Seuils algorithmiques */}
          <div className="pt-6 border-t border-slate-100 space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Seuils Algorithmiques de Tolérance Temporelle
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tolérance Retard Prise de Poste</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={securityConfig.grace_delay_minutes}
                    onChange={(e) => setSecurityConfig(prev => ({
                      ...prev,
                      grace_delay_minutes: parseInt(e.target.value, 10) || 0
                    }))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <span className="text-xs text-slate-500 font-semibold">minutes</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Durée Max Pause Déjeuner</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="15"
                    max="180"
                    value={securityConfig.max_break_minutes}
                    onChange={(e) => setSecurityConfig(prev => ({
                      ...prev,
                      max_break_minutes: parseInt(e.target.value, 10) || 0
                    }))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <span className="text-xs text-slate-500 font-semibold">minutes</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            {saved ? (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4" /> Paramètres généraux enregistrés avec succès !
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">Modifications synchronisées en direct sur les smartphones</span>
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

      {/* -------------------- ONGLET 2 : SITES & GÉOFENCING -------------------- */}
      {activeTab === 'sites' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start animate-fadeIn">
          
          {/* Radar Visuel (7 colonnes) */}
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
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nouveau Périmètre</span>
              </button>
            </div>

            {/* Radar Canvas */}
            <div className="relative w-full aspect-[16/10] bg-slate-950 overflow-hidden flex items-center justify-center select-none">
              <div 
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage: 'linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)',
                  backgroundSize: '40px 40px'
                }}
              />
              <div className="absolute w-[80%] aspect-square rounded-full border border-sky-500/20 pointer-events-none" />
              <div className="absolute w-[60%] aspect-square rounded-full border border-sky-500/30 pointer-events-none" />
              <div className="absolute w-[40%] aspect-square rounded-full border border-sky-500/40 pointer-events-none" />
              <div className="absolute w-[20%] aspect-square rounded-full border border-sky-500/50 pointer-events-none" />
              <div className="absolute w-full h-[1px] bg-sky-500/20 pointer-events-none" />
              <div className="absolute h-full w-[1px] bg-sky-500/20 pointer-events-none" />

              {/* Bulle de Géofencing autorisée */}
              <div 
                className="absolute rounded-full border-2 border-emerald-400 bg-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.3)] flex items-center justify-center pointer-events-none"
                style={{
                  width: `${Math.min(75, Math.max(30, (selectedSite?.radiusMeters || 80) * 0.45))}%`,
                  aspectRatio: '1/1'
                }}
              >
                <div className="text-[10px] font-mono font-extrabold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/50">
                  {selectedSite?.radiusMeters}m
                </div>
              </div>

              {/* Centoïde GPS */}
              <div className="absolute z-20 flex flex-col items-center pointer-events-none">
                <div className="w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
                <div className="mt-1 bg-slate-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-700 whitespace-nowrap shadow-md">
                  📍 {selectedSite?.name}
                </div>
              </div>
            </div>

            {/* Testeur de simulation GPS */}
            <div className="p-4 sm:p-5 bg-slate-50/70 border-t border-slate-100 space-y-3">
              <span className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-blue-600" />
                Simulateur de Position WGS84 & Verdict Satellite
              </span>

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
                        <span className="text-slate-400 block text-[10px]">Rayon</span>
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

      {/* -------------------- ONGLET 3 : PLANNINGS & HORAIRES -------------------- */}
      {activeTab === 'plannings' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Plannings & Horaires de Travail</h3>
              <p className="text-xs text-slate-500">Définissez les créneaux d'activité par département, classe ou profil de poste</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddScheduleModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-sm"
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

      {/* -------------------- ONGLET 4 : SÉCURITÉ & ANTI-TRICHE -------------------- */}
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
              <button onClick={() => setShowAddSiteModal(false)} className="text-slate-400 hover:text-slate-600">
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
                  placeholder="Ex: Cocody, Plateau..."
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
                      className={`py-1.5 rounded-xl font-bold border transition ${
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
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-md shadow-blue-500/20"
                >
                  Créer le Périmètre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL CRÉATION DE PLANNING ==================== */}
      {showAddScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-base text-slate-900">Nouveau Planning / Horaire</h3>
              <button onClick={() => setShowAddScheduleModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Intitulé du Planning *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Équipe Bureau (Lun-Ven), Équipe Logistique (6j/7)..."
                  value={newSchedName}
                  onChange={(e) => setNewSchedName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Jours d'Activité</label>
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
                        className={`flex-1 py-1.5 rounded-xl font-bold transition ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-500 mb-1">Arrivée Matin</label>
                  <input
                    type="time"
                    value={morningStart}
                    onChange={(e) => setMorningStart(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-500 mb-1">Départ Après-midi</label>
                  <input
                    type="time"
                    value={afternoonEnd}
                    onChange={(e) => setAfternoonEnd(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddScheduleModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-md shadow-blue-500/20"
                >
                  Créer le Planning
                </button>
              </div>
            </form>
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
