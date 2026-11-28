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
  Zap
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
  const [activeTab, setActiveTab] = useState<'cockpit' | 'justifs' | 'equipe' | 'securite'>('cockpit');
  const [filterType, setFilterType] = useState<'ALL' | 'PRESENT' | 'LATE' | 'ALERT'>('ALL');
  const [searchEmployeeQuery, setSearchEmployeeQuery] = useState('');
  const [currentTime, setCurrentTime] = useState('09:41');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Menu Sandwich Dirigeant (à l'intérieur du smartphone)
  const [isSandwichOpen, setIsSandwichOpen] = useState(false);

  // Modales interactives
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastText, setBroadcastText] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [showPhoneQrModal, setShowPhoneQrModal] = useState(false);
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
  const [dbEstablishment, setDbEstablishment] = useState<any>(null);
  const [dbJustifications, setDbJustifications] = useState<any[]>([]);
  const [dbPunches, setDbPunches] = useState<any[]>([]);

  // Détection écran réel mobile pour basculer en plein écran fluide sans doubles bordures
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

  // Chargement des données réelles depuis Supabase
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

      // 1. Entreprise active
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

      // 2. Établissement actif
      let estQuery = supabase.from('pointage_establishments').select('*').eq('is_active', true);
      if (targetOrgId) {
        estQuery = estQuery.eq('org_id', targetOrgId);
      }
      const { data: estData } = await estQuery.limit(1);
      if (estData && estData.length > 0) {
        setDbEstablishment(estData[0]);
      }

      // 3. Employés réels de l'entreprise
      let empQuery = supabase.from('pointage_employees').select('*').eq('is_active', true);
      if (targetOrgId) {
        empQuery = empQuery.eq('org_id', targetOrgId);
      }
      const { data: empsData } = await empQuery.order('full_name');
      if (empsData && empsData.length > 0) {
        setDbEmployees(empsData);
      }

      // 4. Justifications réelles avec relation employé
      const { data: justData } = await supabase
        .from('pointage_justifications')
        .select('*, pointage_employees(full_name, employee_matricule, phone)')
        .order('created_at', { ascending: false })
        .limit(20);

      if (justData && justData.length > 0) {
        setDbJustifications(justData);
      }

      // 5. Pointages réels
      let logsQuery = supabase
        .from('pointage_logs')
        .select('*, pointage_employees(full_name, employee_matricule, role), pointage_establishments(name)')
        .order('recorded_at_utc', { ascending: false })
        .limit(50);
      if (targetOrgId) {
        logsQuery = logsQuery.eq('org_id', targetOrgId);
      }
      const { data: logsData } = await logsQuery;
      if (logsData && logsData.length > 0) {
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

  // Transformation des pointages DB en format d'affichage mobile épuré
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
      if (p.status === 'FLAGGED' || dist > (dbEstablishment?.radius_meters || 80)) {
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
        site: p.pointage_establishments?.name || dbEstablishment?.name || 'Siège Principal',
        distance: `${dist}m`,
        status,
        avatarColor: avatarColors[idx % avatarColors.length],
        device: p.device_model || 'Smartphone Déclaré',
        wifiUsed: p.wifi_bssid ? (dbEstablishment?.wifi_ssid || 'SAKO') : undefined
      };
    });
  }, [dbPunches, dbEstablishment]);

  // Transformation des justifications DB
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

  // Arbitrage réel en direct dans Supabase
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

  // Envoi réel WhatsApp au collaborateur
  const handleOpenWhatsApp = (emp: any) => {
    const rawPhone = emp.phone || '';
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    const siteName = dbEstablishment?.name || 'Siège Principal';
    const message = encodeURIComponent(
      `Bonjour ${emp.full_name},\n\nVotre accès mobile à PointagePro (${orgName}) est configuré pour le site "${siteName}".\n\n` +
      `🔑 Code Entreprise : *${orgCode}*\n` +
      `🆔 Votre Matricule : *${emp.employee_matricule || 'N/A'}*\n\n` +
      `Téléchargez l'application et commencez à pointer :\n` +
      `${typeof window !== 'undefined' ? window.location.origin : ''}/apk`
    );
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${message}`, '_blank');
    triggerToast(`Lien magique WhatsApp ouvert pour ${emp.full_name}`);
  };

  // Diffusion d'un message d'urgence push
  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;
    setShowBroadcastModal(false);
    triggerToast(`📢 Message diffusé instantanément à tous les employés sur smartphone !`);
    setIslandMessage(`📢 Push : "${broadcastText.slice(0, 20)}..."`);
    setShowDynamicIslandAlert(true);
    setBroadcastText('');
    setTimeout(() => setShowDynamicIslandAlert(false), 4000);
  };

  // Simulation d'un nouveau pointage physique réel WGS84 dans Supabase
  const handleSimulateNewPunch = async () => {
    try {
      const supabase = createClient();
      const targetOrgId = orgId || '53055b65-de5a-40af-9f1c-d27bd83e7c68';
      
      const emps = dbEmployees.length > 0 ? dbEmployees : [
        { id: '79b7aef2-544e-4a70-ac6a-39ce3db1e57c', full_name: 'TRAORE Amadou', employee_matricule: 'MAT-2026-001' }
      ];
      const randomEmp = emps[Math.floor(Math.random() * emps.length)];
      const siteId = dbEstablishment?.id || '729f0aca-bc81-4ee4-84d9-1c179b6f0f93';
      const baseLat = dbEstablishment?.latitude || 11.247051;
      const baseLon = dbEstablishment?.longitude || -4.291915;

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
          wifi_bssid: dbEstablishment?.wifi_bssids?.[0] || '6a:9e:29:2b:43:08',
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      
      {/* 1. BARRE DE COMMANDE SUPÉRIEURE (Masquée automatiquement sur petit écran de smartphone pour plein écran pur) */}
      <header className={`border-b border-slate-800 bg-slate-900/95 backdrop-blur-md px-4 py-2.5 sticky top-0 z-50 ${isMobileScreen ? 'hidden' : 'block'}`}>
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20 font-black">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm text-white tracking-tight">
                  PointagePro Dirigeant • Application Mobile Gérant
                </h1>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Supabase Live
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Design épuré • Expérience fluide sans surcharge • Connecté à {orgName}
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
              className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
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
              Cockpit Web
            </Link>
          </div>
        </div>
      </header>

      {/* 2. ZONE CENTRALE : CHÂSSIS SMARTPHONE */}
      <main className="flex-1 flex items-center justify-center p-0 sm:p-6 bg-gradient-to-b from-[#060911] to-[#0A0F1D]">
        
        {/* Toast Flottant */}
        {toastMsg && (
          <div className="fixed top-16 z-50 bg-blue-600 text-white px-4 py-2.5 rounded-2xl shadow-2xl font-bold text-xs flex items-center gap-2 border border-blue-400 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* CADRE DU TÉLÉPHONE (Sur smartphone réel, prend 100% sans bordures superflues) */}
        <div 
          className={`transition-all duration-300 ${
            deviceFrame === 'fullscreen' || isMobileScreen
              ? 'w-full max-w-md h-screen sm:h-[92vh] rounded-none sm:rounded-3xl border-0 sm:border border-slate-800' 
              : deviceFrame === 'iphone'
                ? 'w-[390px] h-[820px] rounded-[50px] ring-[12px] ring-slate-800/90 shadow-[0_25px_70px_rgba(0,0,0,0.85)] border-[4px] border-slate-700'
                : 'w-[400px] h-[820px] rounded-[36px] ring-[12px] ring-slate-800 shadow-[0_25px_70px_rgba(0,0,0,0.85)] border-[3px] border-slate-700'
          } bg-slate-950 flex flex-col overflow-hidden relative`}
        >

          {/* DYNAMIC ISLAND / HAUT-PARLEUR (Sur iPhone uniquement) */}
          {deviceFrame === 'iphone' && !isMobileScreen && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 transition-all duration-300">
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

          {/* PERFORATION CAMÉRA (Sur Galaxy) */}
          {deviceFrame === 'android' && !isMobileScreen && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40">
              <div className="w-3 h-3 rounded-full bg-black ring-1 ring-slate-800 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
              </div>
            </div>
          )}

          {/* BARRE D'ÉTAT SYSTÈME NATIVE (Status Bar) */}
          <div className="pt-2.5 px-6 pb-1.5 flex items-center justify-between text-xs font-semibold text-slate-300 z-30 shrink-0">
            <span className="font-bold tracking-tight text-[11px]">{currentTime}</span>
            <div className="flex items-center space-x-2 text-slate-300">
              <Signal className="w-3 h-3" />
              <div className="flex items-center text-[10px] font-bold text-emerald-400">
                <Wifi className="w-3 h-3 mr-0.5" />
                <span className="truncate max-w-[80px]">{dbEstablishment?.wifi_ssid || 'SAKO'}</span>
              </div>
              <BatteryMedium className="w-4 h-4 text-emerald-400" />
            </div>
          </div>

          {/* EN-TÊTE ÉPURÉ DE L'APPLICATION GÉRANT AVEC MENU SANDWICH */}
          <div className="px-4 py-2.5 border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-md flex items-center justify-between shrink-0 z-20">
            
            {/* Gauche : Bouton Menu Sandwich + Logo Entreprise */}
            <div className="flex items-center space-x-2.5">
              <button
                type="button"
                onClick={() => setIsSandwichOpen(true)}
                className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition active:scale-95 cursor-pointer border border-slate-700/60"
                title="Ouvrir le menu de direction"
                aria-label="Menu principal"
              >
                <Menu className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-md shadow-blue-500/20">
                  {orgName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-xs text-white leading-tight truncate max-w-[140px]">{orgName}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono block">Espace Dirigeant</span>
                </div>
              </div>
            </div>

            {/* Droite : Bouton Diffusion Push + Notification Bell */}
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => setShowBroadcastModal(true)}
                title="Diffuser une annonce push aux salariés"
                className="w-7 h-7 rounded-xl bg-slate-800/80 text-blue-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('justifs')}
                title="Retards et alertes en attente"
                className="w-7 h-7 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white flex items-center justify-center transition relative cursor-pointer"
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

          {/* TIROIR COULISSANT DU MENU SANDWICH DE DIRECTION (DANS LE SMARTPHONE) */}
          {isSandwichOpen && (
            <div className="absolute inset-0 z-50 flex animate-fadeIn">
              {/* Fond assombri */}
              <div 
                className="absolute inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
                onClick={() => setIsSandwichOpen(false)}
              />

              {/* Tiroir venant de la gauche */}
              <div className="relative w-4/5 max-w-[280px] bg-slate-900 border-r border-slate-800 h-full flex flex-col justify-between p-4 z-10 shadow-2xl">
                <div className="space-y-4">
                  
                  {/* Header Tiroir */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xs">
                        {orgName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-xs text-white truncate max-w-[140px]">{orgName}</h3>
                        <span className="text-[10px] font-mono text-emerald-400">Dirigeant</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsSandwichOpen(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Code Organisation avec Copie Facile */}
                  <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800/80">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Code Entreprise</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            navigator.clipboard.writeText(orgCode);
                            triggerToast("Code entreprise copié !");
                          }
                        }}
                        className="text-[10px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copier</span>
                      </button>
                    </div>
                    <span className="font-mono text-xs font-black text-amber-400 block truncate">{orgCode}</span>
                  </div>

                  {/* Navigation de Direction */}
                  <div className="space-y-1 text-xs">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 px-2 block mb-1">
                      Gestion & Sites
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('cockpit');
                        setIsSandwichOpen(false);
                      }}
                      className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl font-bold transition text-left cursor-pointer ${
                        activeTab === 'cockpit' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Activity className="w-4 h-4 text-emerald-400" />
                      <span>Cockpit Exécutif</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('justifs');
                        setIsSandwichOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-bold transition text-left cursor-pointer ${
                        activeTab === 'justifs' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <CheckCircle2 className="w-4 h-4 text-amber-400" />
                        <span>Retards & Absences</span>
                      </div>
                      {pendingCount > 0 && (
                        <span className="text-[9px] bg-rose-500 text-white font-black px-1.5 py-0.5 rounded-full">
                          {pendingCount}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('equipe');
                        setIsSandwichOpen(false);
                      }}
                      className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl font-bold transition text-left cursor-pointer ${
                        activeTab === 'equipe' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Users className="w-4 h-4 text-blue-400" />
                      <span>Personnel ({dbEmployees.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('securite');
                        setIsSandwichOpen(false);
                      }}
                      className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl font-bold transition text-left cursor-pointer ${
                        activeTab === 'securite' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <MapPin className="w-4 h-4 text-rose-400" />
                      <span>Site : {dbEstablishment?.name || 'Siège'}</span>
                    </button>
                  </div>

                  {/* Actions Rapides Exécutives */}
                  <div className="pt-2 border-t border-slate-800 space-y-1">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 px-2 block mb-1">
                      Outils Gérant
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSandwichOpen(false);
                        setShowBroadcastModal(true);
                      }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800 text-xs font-bold transition text-left cursor-pointer"
                    >
                      <Send className="w-4 h-4 text-amber-400" />
                      <span>Diffuser une Annonce Push</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSandwichOpen(false);
                        triggerToast("Export des heures RH téléchargé.");
                      }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800 text-xs font-bold transition text-left cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      <span>Export des Heures RH</span>
                    </button>
                  </div>

                </div>

                {/* Footer Tiroir : Déconnexion & Sécurité */}
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      WGS84 ±1m Actif
                    </span>
                    <span className="font-mono">v2.4</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSandwichOpen(false);
                      triggerToast("Session fermée en sécurité.");
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 text-xs font-bold transition text-left cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Déconnexion Gérant</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CONTENU PRINCIPAL DÉROULANT DE L'APPLICATION (Épuré & Non saturé) */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5 scrollbar-none">
            
            {/* ===================== ONGLET 1 : COCKPIT GÉRANT ÉPURÉ ===================== */}
            {activeTab === 'cockpit' && (
              <div className="space-y-3.5 animate-fadeIn">
                
                {/* 1. Carte Hero Épurée : Taux d'Assiduité & Effectif Présent */}
                <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-800/80 border border-slate-800/90 rounded-3xl p-4 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
                  
                  {/* Ligne Haute : Établissement & Statut */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-400" />
                      <span>{dbEstablishment?.name || 'Siège Principal'}</span>
                    </span>
                    <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      En direct
                    </span>
                  </div>

                  {/* Cœur de la carte : Jauge d'assiduité + Chiffres Aérés */}
                  <div className="flex items-center justify-between gap-4 py-1">
                    
                    {/* Ring circulaire moderne */}
                    <div className="flex items-center space-x-3">
                      <div className="relative w-16 h-16 flex items-center justify-center">
                        <svg className="w-16 h-16 -rotate-90">
                          <circle
                            cx="32"
                            cy="32"
                            r="26"
                            className="text-slate-800 stroke-current"
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
                          <span className="text-sm font-black text-white leading-none">{attendanceRate}%</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-black text-white block">Taux Présence</span>
                        <span className="text-[11px] text-slate-400">
                          {presentCount} sur {totalEmployees} sur site
                        </span>
                      </div>
                    </div>

                    {/* 3 Cartes Métriques Clés bien espacées */}
                    <div className="flex items-center space-x-2">
                      <div className="bg-slate-950/70 border border-slate-800/80 px-2.5 py-2 rounded-2xl text-center min-w-[54px]">
                        <span className="text-base font-black text-emerald-400 leading-none block">{presentCount}</span>
                        <span className="text-[9px] text-slate-400 font-bold block mt-0.5">À l&apos;heure</span>
                      </div>
                      <div className="bg-slate-950/70 border border-slate-800/80 px-2.5 py-2 rounded-2xl text-center min-w-[54px]">
                        <span className="text-base font-black text-amber-400 leading-none block">{lateCount}</span>
                        <span className="text-[9px] text-slate-400 font-bold block mt-0.5">Retard</span>
                      </div>
                      <div className="bg-slate-950/70 border border-slate-800/80 px-2.5 py-2 rounded-2xl text-center min-w-[54px]">
                        <span className="text-base font-black text-rose-400 leading-none block">{alertCount}</span>
                        <span className="text-[9px] text-slate-400 font-bold block mt-0.5">Alerte</span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* 2. Boutons d'Action Rapide de Direction */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBroadcastModal(true)}
                    className="p-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl flex flex-col items-center justify-center text-center transition active:scale-95 cursor-pointer shadow-xs"
                  >
                    <Send className="w-4 h-4 text-blue-400 mb-1" />
                    <span className="text-[10px] font-bold text-slate-200">Alerte Push</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowQrModal(true)}
                    className="p-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl flex flex-col items-center justify-center text-center transition active:scale-95 cursor-pointer shadow-xs"
                  >
                    <QrCode className="w-4 h-4 text-emerald-400 mb-1" />
                    <span className="text-[10px] font-bold text-slate-200">Enrôlement</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerToast("Rapport RH PDF généré.")}
                    className="p-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl flex flex-col items-center justify-center text-center transition active:scale-95 cursor-pointer shadow-xs"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-amber-400 mb-1" />
                    <span className="text-[10px] font-bold text-slate-200">Rapport RH</span>
                  </button>
                </div>

                {/* 3. Filtre Segmenté et En-tête du Flux */}
                <div className="flex items-center justify-between px-0.5 pt-1">
                  <span className="text-xs font-extrabold text-white">Pointages du Jour ({filteredPunches.length})</span>
                  
                  {/* Sélecteur de filtre compact */}
                  <div className="flex bg-slate-900 p-0.5 rounded-xl border border-slate-800 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setFilterType('ALL')}
                      className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                        filterType === 'ALL' ? 'bg-blue-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Tous
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('PRESENT')}
                      className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                        filterType === 'PRESENT' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      À l&apos;heure
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('LATE')}
                      className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                        filterType === 'LATE' ? 'bg-amber-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Retards
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('ALERT')}
                      className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                        filterType === 'ALERT' ? 'bg-rose-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Alertes
                    </button>
                  </div>
                </div>

                {/* 4. Liste Épurée des Cartes de Pointages */}
                <div className="space-y-2">
                  {loadingDb ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Chargement des pointages réels...
                    </div>
                  ) : filteredPunches.length === 0 ? (
                    <div className="p-6 text-center bg-slate-900/60 rounded-3xl border border-slate-800 text-xs text-slate-400 space-y-1">
                      <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto" />
                      <p className="font-bold text-white text-xs">Aucun pointage dans cette vue</p>
                      <p className="text-[11px] text-slate-400">Cliquez sur &quot;Simuler Arrivée&quot; pour tester en direct.</p>
                    </div>
                  ) : (
                    filteredPunches.map((p) => {
                      const isValid = p.status === 'VALIDATED';
                      const isLate = p.status === 'LATE';
                      const isAlert = p.status === 'ALERT';

                      return (
                        <div 
                          key={p.id}
                          className={`p-3.5 rounded-2xl border transition ${
                            isAlert 
                              ? 'bg-rose-950/20 border-rose-800/60 text-rose-100' 
                              : isLate 
                                ? 'bg-amber-950/20 border-amber-800/60 text-amber-100'
                                : 'bg-slate-900/80 border-slate-800 text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${p.avatarColor} flex items-center justify-center text-white font-black text-xs shrink-0 shadow-sm`}>
                                {p.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                              </div>
                              <div>
                                <span className="font-extrabold text-xs text-white leading-tight block">{p.name}</span>
                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
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
                              <span className="text-xs font-black font-mono text-white block">{p.time}</span>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                                isValid ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                isLate ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              }`}>
                                {isValid ? 'À l\'heure' : isLate ? 'Retard' : 'Hors-Zone'}
                              </span>
                            </div>
                          </div>

                          {/* Footer de la carte : Mobile et Box Wi-Fi */}
                          <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                            <span className="truncate max-w-[160px]">📱 {p.device}</span>
                            {p.wifiUsed && (
                              <span className="text-emerald-400 font-bold flex items-center gap-1">
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

            {/* ===================== ONGLET 2 : ARBITRAGE FLASH DES JUSTIFICATIONS ===================== */}
            {activeTab === 'justifs' && (
              <div className="space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between px-0.5">
                  <div>
                    <h2 className="text-xs font-extrabold text-white">Retards & Justifications</h2>
                    <p className="text-[10px] text-slate-400">Arbitrage en 1 clic synchronisé sur Supabase</p>
                  </div>
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {pendingCount} en attente
                  </span>
                </div>

                {justifications.length === 0 ? (
                  <div className="p-8 text-center bg-slate-900/60 rounded-3xl border border-slate-800 text-xs text-slate-400 space-y-1.5">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                    <p className="font-bold text-white text-xs">Aucun retard à arbitrer</p>
                    <p className="text-[11px] text-slate-400">Toutes les demandes ont été traitées.</p>
                  </div>
                ) : (
                  justifications.map((j) => {
                    const isPending = j.status === 'PENDING';
                    const isApproved = j.status === 'APPROVED';
                    const isRejected = j.status === 'REJECTED';

                    return (
                      <div key={j.id} className="p-4 bg-slate-900/90 border border-slate-800 rounded-3xl space-y-3 shadow-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-extrabold text-xs text-white block">{j.name}</span>
                            <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              <span>Signalé à {j.time} • {j.category}</span>
                            </span>
                          </div>
                          <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase ${
                            isPending ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                            isApproved ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                            'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {isPending ? 'En attente' : isApproved ? 'Excusé' : 'Refusé'}
                          </span>
                        </div>

                        <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 text-[11px] text-slate-300 leading-relaxed italic">
                          &quot;{j.reason}&quot;
                        </div>

                        {/* Boutons d'Arbitrage Épurés */}
                        {isPending ? (
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleApproveJustif(j.id, j.name)}
                              className="py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                              <span>Valider</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectJustif(j.id, j.name)}
                              className="py-2 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                              <span>Refuser</span>
                            </button>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 text-center font-bold py-1 bg-slate-950/60 rounded-xl">
                            {isApproved ? '✓ Retard validé & excusé' : '✕ Retard non excusé'}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ===================== ONGLET 3 : ÉQUIPES & ENRÔLEMENT WHATSAPP ===================== */}
            {activeTab === 'equipe' && (
              <div className="space-y-3 animate-fadeIn">
                
                {/* Barre de recherche collaborateurs */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchEmployeeQuery}
                    onChange={(e) => setSearchEmployeeQuery(e.target.value)}
                    placeholder="Rechercher par nom, matricule ou téléphone..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[11px] font-extrabold text-white">Collaborateurs ({filteredEmployees.length})</span>
                  <button
                    type="button"
                    onClick={() => setShowQrModal(true)}
                    className="text-[10px] font-bold text-blue-400 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <QrCode className="w-3 h-3" />
                    <span>Lier un téléphone</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {filteredEmployees.map((emp) => (
                    <div key={emp.id} className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between hover:border-slate-700 transition">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xs shrink-0">
                          {emp.full_name ? emp.full_name[0] : 'E'}
                        </div>
                        <div>
                          <span className="font-extrabold text-xs text-white block">{emp.full_name}</span>
                          <span className="text-[10px] text-slate-400">
                            {emp.employee_matricule || 'Sans matricule'} • {emp.phone || 'Non renseigné'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenWhatsApp(emp)}
                        className="p-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-xl transition border border-emerald-500/30 cursor-pointer active:scale-95"
                        title="Envoyer le code entreprise par WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ===================== ONGLET 4 : SITES & SÉCURITÉ GÉOFENCING ===================== */}
            {activeTab === 'securite' && (
              <div className="space-y-3 animate-fadeIn text-xs">
                <div className="px-0.5">
                  <h2 className="font-extrabold text-white text-xs">Périmètre & Sécurité du Site</h2>
                  <p className="text-[10px] text-slate-400">Paramètres de contrôle satellite WGS84</p>
                </div>

                <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 space-y-3.5 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block text-xs">Établissement Principal</span>
                      <span className="text-[10px] text-slate-400">
                        {dbEstablishment?.name || 'Siège Principal'} ({dbEstablishment?.city || 'Bobo-Dioulasso'})
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                      Rayon {dbEstablishment?.radius_meters || 80}m
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-800">
                    <div>
                      <span className="font-bold text-white block text-xs">Coordonnées GPS WGS84</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {dbEstablishment?.latitude || 11.247051}°, {dbEstablishment?.longitude || -4.291915}°
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                      ±1 mètre
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-800">
                    <div>
                      <span className="font-bold text-white block text-xs">Box Wi-Fi Référence</span>
                      <span className="text-[10px] text-slate-400">
                        SSID : {dbEstablishment?.wifi_ssid || 'SAKO'}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                      Certifié
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-800">
                    <div>
                      <span className="font-bold text-white block text-xs">Protection Anti-Triche GPS</span>
                      <span className="text-[10px] text-slate-400">Refus automatique des fausses localisations</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                      Actif
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-800">
                    <div>
                      <span className="font-bold text-white block text-xs">Liaison 1 Téléphone / Salarié</span>
                      <span className="text-[10px] text-slate-400">Empêche de pointer pour un collègue</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                      Actif
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-[11px] text-blue-200">
                  🔒 Configuration synchronisée en direct avec votre tableau de bord gérant web.
                </div>
              </div>
            )}

          </div>

          {/* BARRE DE NAVIGATION INFÉRIEURE WHATSAPP STYLE (4 Onglets Épurés) */}
          <div className="border-t border-slate-800/80 bg-slate-900/95 backdrop-blur-md px-3 py-2 flex items-center justify-around shrink-0 z-30">
            
            <button
              type="button"
              onClick={() => setActiveTab('cockpit')}
              className={`flex flex-col items-center py-1 px-3 rounded-2xl transition cursor-pointer ${
                activeTab === 'cockpit' ? 'text-blue-400 font-extrabold scale-105' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Cockpit</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('justifs')}
              className={`flex flex-col items-center py-1 px-3 rounded-2xl transition cursor-pointer relative ${
                activeTab === 'justifs' ? 'text-blue-400 font-extrabold scale-105' : 'text-slate-400 hover:text-white'
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

            <button
              type="button"
              onClick={() => setActiveTab('equipe')}
              className={`flex flex-col items-center py-1 px-3 rounded-2xl transition cursor-pointer ${
                activeTab === 'equipe' ? 'text-blue-400 font-extrabold scale-105' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Équipe</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('securite')}
              className={`flex flex-col items-center py-1 px-3 rounded-2xl transition cursor-pointer ${
                activeTab === 'securite' ? 'text-blue-400 font-extrabold scale-105' : 'text-slate-400 hover:text-white'
              }`}
            >
              <MapPin className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Sites</span>
            </button>

          </div>

          {/* INDICATEUR D'ACCUEIL (Home Bar iOS / Android) */}
          <div className="h-3.5 bg-slate-950 flex items-center justify-center shrink-0">
            <div className="w-24 h-1 bg-slate-700/80 rounded-full" />
          </div>

          {/* MODALE 1 : DIFFUSION PUSH NOTIFICATION */}
          {showBroadcastModal && (
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 animate-fadeIn">
              <div className="bg-slate-900 border border-slate-700 w-full rounded-3xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-white flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-blue-400" />
                    Diffuser une Annonce d&apos;Urgence
                  </span>
                  <button 
                    type="button"
                    onClick={() => setShowBroadcastModal(false)}
                    className="text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Notification instantanée sur l&apos;application des collaborateurs de {orgName}.
                </p>
                <textarea
                  rows={3}
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                  placeholder="Ex: Réunion générale d'urgence dans la salle de conférence à 14h00..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSendBroadcast}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white rounded-xl transition cursor-pointer active:scale-95"
                >
                  Envoyer la Notification Push
                </button>
              </div>
            </div>
          )}

          {/* MODALE 2 : SCANNER D'ENRÔLEMENT */}
          {showQrModal && (
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 animate-fadeIn">
              <div className="bg-slate-900 border border-slate-700 w-full rounded-3xl p-4 space-y-3 text-center">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-white">Scanner Caméra Enrôlement</span>
                  <button 
                    type="button"
                    onClick={() => setShowQrModal(false)}
                    className="text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <div className="w-44 h-44 mx-auto bg-slate-950 border-2 border-dashed border-blue-500 rounded-2xl flex flex-col items-center justify-center p-3 relative overflow-hidden">
                  <div className="w-full h-0.5 bg-blue-500 animate-pulse absolute top-1/2 -translate-y-1/2 left-0 shadow-lg shadow-blue-500" />
                  <QrCode className="w-14 h-14 text-slate-700" />
                  <span className="text-[10px] text-slate-400 mt-2 font-bold">Visez le QR code du salarié</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowQrModal(false);
                    triggerToast("✓ Smartphone associé avec succès !");
                  }}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white rounded-xl transition cursor-pointer"
                >
                  Simuler Scan Réussi
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* MODALE EXTERNE : SCANNER AVEC UN SMARTPHONE RÉEL */}
      {showPhoneQrModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 text-center max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-white text-sm">Ouvrir sur Mon Smartphone</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPhoneQrModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-white rounded-2xl inline-flex items-center justify-center shadow-lg mx-auto">
              <RealQrCode 
                value={getPublicUrl('/maquette-gerant')} 
                size={180} 
              />
            </div>

            <div className="space-y-1">
              <span className="font-bold text-white text-xs block">Scannez ce QR Code avec l&apos;appareil photo</span>
              <span className="text-[11px] text-emerald-400 font-bold block bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                📶 Connecté au Wi-Fi &quot;{dbEstablishment?.wifi_ssid || 'SAKO'}&quot;
              </span>
            </div>

            <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-left">
              <span className="font-mono text-[11px] text-blue-400 truncate flex-1 select-all font-bold">
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
                className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition cursor-pointer"
                title="Copier l'URL"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowPhoneQrModal(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
