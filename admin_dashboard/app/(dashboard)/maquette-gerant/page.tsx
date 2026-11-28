'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { RealQrCode } from '@/components/real-qr-code';
import { 
  Smartphone, 
  Users, 
  MapPin, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  Bell, 
  CheckCircle2, 
  XCircle, 
  QrCode, 
  Send, 
  RotateCw, 
  Search, 
  ChevronRight, 
  Wifi, 
  BatteryMedium, 
  Signal, 
  Calendar, 
  AlertTriangle, 
  ArrowUpRight, 
  ExternalLink, 
  SlidersHorizontal,
  Activity,
  Check,
  X,
  Radio,
  FileSpreadsheet,
  Building2,
  Sparkles,
  PhoneCall,
  MessageCircle,
  Eye,
  Maximize2,
  Minimize2,
  Copy,
  Share2,
  Menu,
  ChevronDown,
  Layers,
  LogOut,
  Zap,
  Plus,
  CalendarDays,
  Unlink,
  Navigation,
  Download,
  Trash2,
  Sliders,
  Filter,
  CheckCheck
} from 'lucide-react';

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

export default function MaquetteGerantPage() {
  // Mode de cadrage & Détection mobile
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
  const [showPhoneQrModal, setShowPhoneQrModal] = useState(false);

  // Formulaires
  const [broadcastText, setBroadcastText] = useState('');
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpPhone, setNewEmpPhone] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('Collaborateur');
  const [newEmpSiteId, setNewEmpSiteId] = useState('');
  const [newEmpScheduleId, setNewEmpScheduleId] = useState('');

  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteCity, setNewSiteCity] = useState('Bobo-Dioulasso');
  const [newSiteRadius, setNewSiteRadius] = useState<number>(80);
  const [newSiteLat, setNewSiteLat] = useState<string>('11.247051');
  const [newSiteLon, setNewSiteLon] = useState<string>('-4.291915');
  const [newSiteWifiSsid, setNewSiteWifiSsid] = useState<string>('SAKO');
  const [isCalibratingGps, setIsCalibratingGps] = useState(false);

  const [newSchedName, setNewSchedName] = useState('');
  const [newSchedMorningStart, setNewSchedMorningStart] = useState('08:00');
  const [newSchedAfternoonEnd, setNewSchedAfternoonEnd] = useState('17:00');
  const [newSchedTolerance, setNewSchedTolerance] = useState<number>(15);
  const [newSchedDays, setNewSchedDays] = useState<number[]>([1, 2, 3, 4, 5]);

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

  // Toggles de sécurité
  const [secMockGpsBlocked, setSecMockGpsBlocked] = useState(true);
  const [secDeviceBindingStrict, setSecDeviceBindingStrict] = useState(true);
  const [secWifiMandatory, setSecWifiMandatory] = useState(false);

  // Détection écran mobile réel
  useEffect(() => {
    const checkScreen = () => {
      const isMobile = window.innerWidth < 768;
      setIsMobileScreen(isMobile);
      if (isMobile) {
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
      const { data: orgData } = await orgQuery.single();

      let targetOrgId = storedOrgId;
      if (orgData) {
        targetOrgId = orgData.id;
        setOrgId(orgData.id);
        setOrgName(orgData.name);
        setOrgCode(orgData.org_code);
      }

      // B. Établissements réels (Tous les sites)
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

      // C. Plannings réels (Schedules)
      let schedQuery = supabase.from('pointage_schedules').select('*');
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

      // D. Employés réels de l'entreprise
      let empQuery = supabase
        .from('pointage_employees')
        .select('*, pointage_establishments(name), pointage_schedules(name, morning_start, afternoon_end)')
        .eq('is_active', true);
      if (targetOrgId) {
        empQuery = empQuery.eq('org_id', targetOrgId);
      }
      const { data: empsData } = await empQuery.order('full_name');
      if (empsData) {
        setDbEmployees(empsData);
      }

      // E. Justifications réelles
      const { data: justData } = await supabase
        .from('pointage_justifications')
        .select('*, pointage_employees(full_name, employee_matricule, phone)')
        .order('created_at', { ascending: false })
        .limit(20);
      if (justData) {
        setDbJustifications(justData);
      }

      // F. Pointages réels
      let logsQuery = supabase
        .from('pointage_logs')
        .select('*, pointage_employees(full_name, employee_matricule, role), pointage_establishments(name)')
        .order('recorded_at_utc', { ascending: false })
        .limit(50);
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

  const activeEstablishment = dbEstablishments[0] || null;

  // 2. Transformation des pointages DB
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
        wifiUsed: p.wifi_bssid ? (activeEstablishment?.wifi_ssid || 'SAKO') : undefined
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

  // ==================== ACTIONS GÉRANT COMPLÈTES (PARITÉ WEB 100%) ====================

  // A. Créer un nouvel employé dans Supabase
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
        .select('*, pointage_establishments(name), pointage_schedules(name)')
        .single();

      if (error) throw error;

      if (newEmp) {
        setDbEmployees(prev => [newEmp, ...prev]);
        setShowAddEmployeeModal(false);
        setNewEmpName('');
        setNewEmpPhone('');
        triggerToast(`✓ Collaborateur ${newEmp.full_name} créé avec matricule ${matricule} !`);
      }
    } catch (err: any) {
      triggerToast(`Erreur création: ${err.message}`);
    }
  };

  // B. Créer un nouveau site / établissement dans Supabase
  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteName.trim()) {
      triggerToast("Veuillez donner un nom au site.");
      return;
    }
    try {
      const supabase = createClient();
      const targetOrgId = orgId || '53055b65-de5a-40af-9f1c-d27bd83e7c68';

      const { data: newSite, error } = await supabase
        .from('pointage_establishments')
        .insert({
          org_id: targetOrgId,
          name: newSiteName.trim(),
          city: newSiteCity.trim() || 'Principal',
          latitude: parseFloat(newSiteLat) || 11.247051,
          longitude: parseFloat(newSiteLon) || -4.291915,
          radius_meters: newSiteRadius,
          wifi_ssid: newSiteWifiSsid.trim() || 'SAKO',
          wifi_bssids: ['6a:9e:29:2b:43:08'],
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      if (newSite) {
        setDbEstablishments(prev => [...prev, newSite]);
        setShowAddSiteModal(false);
        setNewSiteName('');
        triggerToast(`✓ Site "${newSite.name}" (${newSite.radius_meters}m) créé avec succès !`);
      }
    } catch (err: any) {
      triggerToast(`Erreur site: ${err.message}`);
    }
  };

  // C. Calibrer la position GPS en direct avec le smartphone du dirigeant
  const handleCalibrateGpsFromDevice = () => {
    if (!navigator.geolocation) {
      triggerToast("La géolocalisation n'est pas supportée par ce navigateur.");
      return;
    }
    setIsCalibratingGps(true);
    triggerToast("Connexion aux satellites GNSS en cours...");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsCalibratingGps(false);
        const lat = pos.coords.latitude.toFixed(6);
        const lon = pos.coords.longitude.toFixed(6);
        const acc = Math.round(pos.coords.accuracy);
        setNewSiteLat(lat);
        setNewSiteLon(lon);
        triggerToast(`✓ GPS calé avec précision satellite ±${acc}m (${lat}, ${lon}) !`);
      },
      (err) => {
        setIsCalibratingGps(false);
        triggerToast(`Erreur GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // D. Créer un couloir horaire / planning dans Supabase
  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchedName.trim()) {
      triggerToast("Veuillez nommer le couloir horaire.");
      return;
    }
    try {
      const supabase = createClient();
      const targetOrgId = orgId || '53055b65-de5a-40af-9f1c-d27bd83e7c68';

      const { data: newSched, error } = await supabase
        .from('pointage_schedules')
        .insert({
          org_id: targetOrgId,
          name: newSchedName.trim(),
          category: 'Standard',
          working_days: newSchedDays,
          morning_start: newSchedMorningStart,
          morning_end: '12:30',
          afternoon_start: '13:30',
          afternoon_end: newSchedAfternoonEnd,
          tolerance_minutes: newSchedTolerance,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      if (newSched) {
        setDbSchedules(prev => [...prev, newSched]);
        setShowAddScheduleModal(false);
        setNewSchedName('');
        triggerToast(`✓ Couloir horaire "${newSched.name}" créé (${newSched.morning_start} - ${newSched.afternoon_end}) !`);
      }
    } catch (err: any) {
      triggerToast(`Erreur planning: ${err.message}`);
    }
  };

  // E. Délier l'appareil d'un salarié (Reset téléphone)
  const handleUnbindEmployee = async (empId: string, name: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('pointage_employees')
        .update({ bound_device_id: null, device_model: null, is_enrolled: false })
        .eq('id', empId);

      if (error) throw error;

      setDbEmployees(prev => prev.map(e => e.id === empId ? { ...e, bound_device_id: null, device_model: null, is_enrolled: false } : e));
      triggerToast(`✓ Téléphone de ${name} délié. Il peut désormais lier un nouvel appareil.`);
    } catch (err: any) {
      triggerToast(`Erreur: ${err.message}`);
    }
  };

  // F. Arbitrage justifications
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
      triggerToast(`✕ Justification de ${name} rejetée.`);
      setIslandMessage(`✕ Retard non excusé : ${name}`);
      setShowDynamicIslandAlert(true);
      setTimeout(() => setShowDynamicIslandAlert(false), 3000);
    } catch (e: any) {
      triggerToast(`Erreur: ${e.message}`);
    }
  };

  // G. WhatsApp invitation magique
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

  // H. Diffusion notification push
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

  // I. Simulation pointage réel
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
          wifi_bssid: activeEstablishment?.wifi_bssids?.[0] || '6a:9e:29:2b:43:08',
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
      
      {/* 1. BARRE DE COMMANDE SUPÉRIEURE (Sur grand écran, pour contrôler la maquette) */}
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

          {/* Contrôles du Simulateur */}
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

            {/* Sélecteur Appareil */}
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
        
        {/* Toast Flottant Lumineux */}
        {toastMsg && (
          <div className="fixed top-16 z-[70] bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl font-bold text-xs flex items-center gap-2 border border-slate-700 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* CADRE DU TÉLÉPHONE (SUR FOND BLANC LUMINEUX PREMIUM) */}
        <div 
          className={`transition-all duration-300 ${
            deviceFrame === 'fullscreen' || isMobileScreen
              ? 'w-full max-w-md h-screen sm:h-[92vh] rounded-none sm:rounded-3xl border-0 sm:border border-slate-200 shadow-2xl' 
              : deviceFrame === 'iphone'
                ? 'w-[395px] h-[825px] rounded-[50px] ring-[12px] ring-slate-800 shadow-[0_25px_70px_rgba(0,0,0,0.85)] border-[4px] border-slate-700'
                : 'w-[400px] h-[825px] rounded-[36px] ring-[12px] ring-slate-800 shadow-[0_25px_70px_rgba(0,0,0,0.85)] border-[3px] border-slate-700'
          } bg-[#F8FAFC] text-slate-900 flex flex-col overflow-hidden relative shadow-2xl`}
        >

          {/* DYNAMIC ISLAND (Sur iPhone uniquement) */}
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

          {/* BARRE D'ÉTAT SYSTÈME NATIVE (Style iOS / Android en fond clair) */}
          <div className="pt-2.5 px-6 pb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700 z-30 shrink-0 bg-white/80 backdrop-blur-md">
            <span className="font-extrabold tracking-tight text-[11px] text-slate-900">{currentTime}</span>
            <div className="flex items-center space-x-2 text-slate-700">
              <Signal className="w-3 h-3" />
              <div className="flex items-center text-[10px] font-extrabold text-blue-600">
                <Wifi className="w-3 h-3 mr-0.5" />
                <span className="truncate max-w-[80px]">{activeEstablishment?.wifi_ssid || 'SAKO'}</span>
              </div>
              <BatteryMedium className="w-4 h-4 text-emerald-600" />
            </div>
          </div>

          {/* EN-TÊTE ÉPURÉ PREMIUM LUMINEUX AVEC MENU SANDWICH */}
          <div className="px-4 py-2.5 border-b border-slate-200/80 bg-white/95 backdrop-blur-md flex items-center justify-between shrink-0 z-20 shadow-xs">
            
            {/* Gauche : Bouton Menu Sandwich (☰) + Identité Entreprise */}
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

            {/* Droite : Bouton Diffusion Push + Notifications */}
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

          {/* TIROIR COULISSANT DU MENU SANDWICH DE DIRECTION (FOND CLAIR HAUT DE GAMME) */}
          {isSandwichOpen && (
            <div className="absolute inset-0 z-50 flex animate-fadeIn">
              <div 
                className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity"
                onClick={() => setIsSandwichOpen(false)}
              />

              <div className="relative w-4/5 max-w-[290px] bg-white border-r border-slate-200 h-full flex flex-col justify-between p-4 z-10 shadow-2xl">
                <div className="space-y-4 overflow-y-auto pr-1">
                  
                  {/* Header Tiroir */}
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

                  {/* Code Entreprise avec Copie 1 Clic */}
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

                  {/* Modules Complets du Système */}
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

                  {/* Outils Avancés Exécutifs */}
                  <div className="pt-2 border-t border-slate-100 space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2 block mb-1">
                      Outils & Rapports
                    </span>
                    <button
                      type="button"
                      onClick={() => { setIsSandwichOpen(false); setShowRelevesDrawer(true); }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 text-xs font-bold transition text-left cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>Relevés & Heures Travaillées</span>
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
                      onClick={() => { setIsSandwichOpen(false); setShowBroadcastModal(true); }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 text-xs font-bold transition text-left cursor-pointer"
                    >
                      <Send className="w-4 h-4 text-amber-600" />
                      <span>Diffuser une Alerte Push</span>
                    </button>
                  </div>

                </div>

                {/* Footer Tiroir : Déconnexion & Sécurité */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
                    <span className="flex items-center gap-1 text-emerald-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      WGS84 ±1m Satellite Actif
                    </span>
                    <span className="font-mono text-slate-400">v3.0 Premium</span>
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

          {/* CONTENU PRINCIPAL DE L'APPLICATION (ÉPURÉ, LUMINEUX & COMPLET) */}
          <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-4 scrollbar-none bg-[#F8FAFC]">
            
            {/* ===================== ONGLET 1 : COCKPIT GÉRANT ===================== */}
            {activeTab === 'cockpit' && (
              <div className="space-y-4 animate-fadeIn">
                
                {/* 1. Carte Hero Épurée Lumineuse : Taux d'Assiduité */}
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

                {/* 2. Boutons d'Action Rapide de Direction */}
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
                    onClick={() => setShowAddSiteModal(true)}
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
                    onClick={() => setShowRelevesDrawer(true)}
                    className="p-2.5 bg-white border border-slate-200/80 hover:border-indigo-300 rounded-2xl flex flex-col items-center justify-center text-center transition active:scale-95 cursor-pointer shadow-xs"
                  >
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-1">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-800">Relevés RH</span>
                  </button>
                </div>

                {/* 3. Filtre Segmenté et En-tête du Flux */}
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

                {/* 4. Liste Épurée des Cartes de Pointages */}
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
                    onClick={() => setShowAddSiteModal(true)}
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
                          <span className="font-bold text-slate-900">{site.wifi_ssid || 'SAKO'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setNewSiteLat(String(site.latitude));
                            setNewSiteLon(String(site.longitude));
                            setNewSiteName(site.name);
                            setNewSiteRadius(site.radius_meters || 80);
                            triggerToast(`Coordonnées du site "${site.name}" chargées pour calibrage.`);
                          }}
                          className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Navigation className="w-3 h-3 text-blue-600" />
                          <span>Vérifier Position</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => triggerToast(`Rayon de ${site.name} : ${site.radius_meters}m certifié.`)}
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 font-bold text-[11px] rounded-xl border border-blue-100 cursor-pointer"
                        >
                          ±1m
                        </button>
                      </div>
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

                {/* Barre de recherche */}
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

                        {/* Téléphone & Appareil */}
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                          <span className="truncate max-w-[160px]">
                            📞 {emp.phone || 'Non renseigné'}
                          </span>
                          <span className="text-[10px] font-medium text-slate-600">
                            📱 {emp.device_model || 'Aucun appareil'}
                          </span>
                        </div>

                        {/* Actions Collaborateur : WhatsApp, QR Code, Reset Appareil */}
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
                    <p className="text-[10px] text-slate-500">Heures de service, tolérances et shifts</p>
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

                <div className="space-y-3">
                  {dbSchedules.map((sched) => (
                    <div key={sched.id} className="p-4 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                            <Clock className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-xs text-slate-900">{sched.name}</h3>
                            <span className="text-[10px] text-slate-500">Tolérance retard : +{sched.tolerance_minutes || 15} min</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {sched.category || 'Standard'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-center">
                        <div>
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Arrivée Matin</span>
                          <span className="text-sm font-black text-slate-900 font-mono">{sched.morning_start || '08:00'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Départ Soir</span>
                          <span className="text-sm font-black text-slate-900 font-mono">{sched.afternoon_end || '17:00'}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                        <span className="font-medium">Jours actifs : Lun - Ven</span>
                        <span className="text-emerald-700 font-bold">✓ Couloir strict actif</span>
                      </div>
                    </div>
                  ))}
                </div>
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
                    const isRejected = j.status === 'REJECTED';

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

                        {/* Boutons d'Arbitrage Flash */}
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

          {/* BARRE DE NAVIGATION INFÉRIEURE WHATSAPP STYLE (5 ONGLETS LUMINEUX) */}
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

          {/* HOME BAR INDICATOR */}
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

          {/* MODALE 2 : CRÉER UN SITE AVEC CALIBRAGE GPS DIRECT */}
          {showAddSiteModal && (
            <div className="absolute inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 animate-fadeIn">
              <div className="bg-white border border-slate-200 w-full rounded-3xl p-4 space-y-3.5 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <span className="font-extrabold text-xs text-slate-900">Créer un Site & Géofencing</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setShowAddSiteModal(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateSite} className="space-y-3">
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
                      </select>
                    </div>
                  </div>

                  {/* Bouton Magique : Calibrer GPS par Smartphone */}
                  <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl space-y-2">
                    <span className="text-[10px] font-bold text-blue-900 block">Coordonnées Satellite WGS84 :</span>
                    <button
                      type="button"
                      onClick={handleCalibrateGpsFromDevice}
                      disabled={isCalibratingGps}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>{isCalibratingGps ? 'Calcul GNSS en cours...' : '📍 Caler ma Position GPS Actuelle'}</span>
                    </button>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-600">
                      <span>Lat: {newSiteLat}</span>
                      <span>Lon: {newSiteLon}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">Nom Réseau Wi-Fi du Bureau (SSID)</label>
                    <input
                      type="text"
                      value={newSiteWifiSsid}
                      onChange={(e) => setNewSiteWifiSsid(e.target.value)}
                      placeholder="Ex: SAKO_5G"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer mt-2"
                  >
                    Valider & Enregistrer le Site
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* MODALE 3 : CRÉER UN COULOIR HORAIRE */}
          {showAddScheduleModal && (
            <div className="absolute inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 animate-fadeIn">
              <div className="bg-white border border-slate-200 w-full rounded-3xl p-4 space-y-3.5 shadow-2xl max-h-[90vh] overflow-y-auto">
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
                    <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">Intitulé du Planning</label>
                    <input
                      type="text"
                      required
                      value={newSchedName}
                      onChange={(e) => setNewSchedName(e.target.value)}
                      placeholder="Ex: Équipe Matin Chantier"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">Heure Arrivée</label>
                      <input
                        type="time"
                        value={newSchedMorningStart}
                        onChange={(e) => setNewSchedMorningStart(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">Heure Départ</label>
                      <input
                        type="time"
                        value={newSchedAfternoonEnd}
                        onChange={(e) => setNewSchedAfternoonEnd(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">Tolérance Retard (minutes)</label>
                    <input
                      type="number"
                      value={newSchedTolerance}
                      onChange={(e) => setNewSchedTolerance(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer mt-2"
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

          {/* TIROIR MODAL 6 : RELEVÉS RH & HEURES TRAVAILLÉES */}
          {showRelevesDrawer && (
            <div className="absolute inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 animate-fadeIn">
              <div className="bg-white border border-slate-200 w-full rounded-3xl p-4 space-y-3.5 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span className="font-extrabold text-xs text-slate-900">Relevés & Synthèse RH du Mois</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setShowRelevesDrawer(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-2">
                  {dbEmployees.map((emp) => (
                    <div key={emp.id} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900 block">{emp.full_name}</span>
                        <span className="text-[10px] text-slate-500">{emp.employee_matricule}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-emerald-700 block">38h 45min</span>
                        <span className="text-[10px] text-amber-700 font-bold">15m retard</span>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    triggerToast("Téléchargement du rapport RH Excel/PDF lancé sur votre téléphone !");
                  }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger Rapport Complet (Excel / PDF)</span>
                </button>
              </div>
            </div>
          )}

          {/* TIROIR MODAL 7 : SÉCURITÉ ANTI-TRICHE */}
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

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <span className="font-bold text-slate-900 block">Blocage Mock GPS</span>
                      <span className="text-[10px] text-slate-500">Refus des fausses localisations</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSecMockGpsBlocked(p => !p);
                        triggerToast(`Anti-Mock GPS : ${!secMockGpsBlocked ? 'Activé' : 'Désactivé'}`);
                      }}
                      className={`w-11 h-6 rounded-full transition p-1 cursor-pointer ${secMockGpsBlocked ? 'bg-blue-600' : 'bg-slate-300'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${secMockGpsBlocked ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <span className="font-bold text-slate-900 block">Liaison 1 Téléphone / Salarié</span>
                      <span className="text-[10px] text-slate-500">Empêche de pointer pour autrui</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSecDeviceBindingStrict(p => !p);
                        triggerToast(`Liaison stricte : ${!secDeviceBindingStrict ? 'Activée' : 'Désactivée'}`);
                      }}
                      className={`w-11 h-6 rounded-full transition p-1 cursor-pointer ${secDeviceBindingStrict ? 'bg-blue-600' : 'bg-slate-300'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${secDeviceBindingStrict ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <span className="font-bold text-slate-900 block">Wi-Fi Obligatoire en Box</span>
                      <span className="text-[10px] text-slate-500">Exige la présence du Wi-Fi du site</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSecWifiMandatory(p => !p);
                        triggerToast(`Wi-Fi obligatoire : ${!secWifiMandatory ? 'Activé' : 'Désactivé'}`);
                      }}
                      className={`w-11 h-6 rounded-full transition p-1 cursor-pointer ${secWifiMandatory ? 'bg-blue-600' : 'bg-slate-300'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${secWifiMandatory ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowSecurityDrawer(false);
                    triggerToast("✓ Politiques de sécurité synchronisées sur Supabase.");
                  }}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Appliquer les Règles de Sécurité
                </button>
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
                📶 Connecté au Wi-Fi &quot;{activeEstablishment?.wifi_ssid || 'SAKO'}&quot;
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
