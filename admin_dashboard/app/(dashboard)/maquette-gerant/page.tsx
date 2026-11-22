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
  Share2
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
  // Mode de cadrage
  const [deviceFrame, setDeviceFrame] = useState<'iphone' | 'android' | 'fullscreen'>('iphone');
  const [activeTab, setActiveTab] = useState<'cockpit' | 'justifs' | 'equipe' | 'securite'>('cockpit');
  const [filterType, setFilterType] = useState<'ALL' | 'PRESENT' | 'LATE' | 'ALERT'>('ALL');
  const [currentTime, setCurrentTime] = useState('09:41');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modales interactives dans la maquette
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastText, setBroadcastText] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [showPhoneQrModal, setShowPhoneQrModal] = useState(false);
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

  // Transformation des pointages DB en format d'affichage mobile
  const punches: DisplayPunch[] = useMemo(() => {
    if (dbPunches.length === 0) {
      return [];
    }

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
      const timeStr = punchDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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
        distance: `${dist} mètre${dist > 1 ? 's' : ''}`,
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
      
      // Extraction catégorie entre crochets si présente
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
      triggerToast(`✓ Retard de ${name} validé et excusé dans la base.`);
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
      `🔑 Code Organisation : *${orgCode}*\n` +
      `🆔 Votre Matricule : *${emp.employee_matricule || 'N/A'}*\n\n` +
      `Téléchargez l'application mobile et commencez à pointer par satellite :\n` +
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
    setIslandMessage(`📢 Push diffusé : "${broadcastText.slice(0, 20)}..."`);
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

      // Jitter WGS84 réaliste (1 à 8 mètres)
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
        setIslandMessage(`🟢 Nouveau pointage : ${randomEmp.full_name} (${dist}m)`);
        setShowDynamicIslandAlert(true);
        triggerToast(`Pointage réel enregistré dans Supabase (${dist}m) !`);
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

  const pendingCount = justifications.filter(j => j.status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* 1. BARRE DE COMMANDE & CONTRÔLES DE LA MAQUETTE */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 py-3 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20 font-black">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                  Application Gérant Mobile • Vue Dirigeant
                </h1>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Supabase Live
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pilotage en temps réel connecté à {orgName} ({orgCode})
              </p>
            </div>
          </div>

          {/* Sélecteur de cadre & Actions de test */}
          <div className="flex items-center space-x-2">
            
            {/* Bouton Simulation d'arrivée en direct */}
            <button
              type="button"
              onClick={handleSimulateNewPunch}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5 cursor-pointer"
              title="Génère un vrai pointage WGS84 dans Supabase"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Simuler Pointage Live</span>
            </button>

            {/* QR Code pour tester sur vrai smartphone */}
            <button
              type="button"
              onClick={() => setShowPhoneQrModal(true)}
              className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              title="Ouvrir sur votre vrai smartphone"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Ouvrir sur Mobile</span>
            </button>

            {/* Sélecteur Appareil */}
            <div className="bg-slate-800 p-0.5 rounded-xl border border-slate-700 flex items-center text-xs">
              <button
                type="button"
                onClick={() => setDeviceFrame('iphone')}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  deviceFrame === 'iphone' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                iPhone 16 Pro
              </button>
              <button
                type="button"
                onClick={() => setDeviceFrame('android')}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  deviceFrame === 'android' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Galaxy S24
              </button>
              <button
                type="button"
                onClick={() => setDeviceFrame('fullscreen')}
                className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                  deviceFrame === 'fullscreen' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
                title="Mode Plein Écran Mobile Direct"
              >
                <Maximize2 className="w-3.5 h-3.5" />
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
      <main className="flex-1 flex items-center justify-center p-2 sm:p-6 bg-gradient-to-b from-[#070A12] to-[#0D1322]">
        
        {/* Toast Flottant de la Maquette */}
        {toastMsg && (
          <div className="fixed top-20 z-50 bg-blue-600 text-white px-4 py-2 rounded-2xl shadow-2xl font-bold text-xs flex items-center gap-2 border border-blue-400 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* CADRE DU TÉLÉPHONE */}
        <div 
          className={`transition-all duration-300 ${
            deviceFrame === 'fullscreen' 
              ? 'w-full max-w-md h-[92vh] rounded-none sm:rounded-3xl' 
              : deviceFrame === 'iphone'
                ? 'w-[390px] h-[820px] rounded-[52px] ring-[14px] ring-slate-800/90 shadow-[0_25px_70px_rgba(0,0,0,0.8)] border-[4px] border-slate-700'
                : 'w-[400px] h-[820px] rounded-[38px] ring-[12px] ring-slate-800 shadow-[0_25px_70px_rgba(0,0,0,0.8)] border-[3px] border-slate-700'
          } bg-slate-950 flex flex-col overflow-hidden relative select-none`}
        >

          {/* DYNAMIC ISLAND / HAUT-PARLEUR (Sur iPhone) */}
          {deviceFrame === 'iphone' && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 transition-all duration-300">
              <div className={`bg-black text-white rounded-full flex items-center justify-between px-3 py-1 transition-all ${
                showDynamicIslandAlert 
                  ? 'w-[280px] h-9 ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-500/20' 
                  : 'w-[120px] h-7'
              }`}>
                {showDynamicIslandAlert ? (
                  <div className="w-full flex items-center justify-between text-[11px] font-bold px-1 animate-fadeIn">
                    <span className="truncate text-emerald-400">{islandMessage}</span>
                    <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
                  </div>
                ) : (
                  <>
                    <div className="w-3 h-3 rounded-full bg-slate-900 border border-slate-800" />
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                  </>
                )}
              </div>
            </div>
          )}

          {/* PERFORATION CAMÉRA (Sur Galaxy) */}
          {deviceFrame === 'android' && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40">
              <div className="w-3.5 h-3.5 rounded-full bg-black ring-1 ring-slate-800 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
              </div>
            </div>
          )}

          {/* BARRE D'ÉTAT SYSTÈME (Status Bar) */}
          <div className="pt-3 px-6 pb-2 flex items-center justify-between text-xs font-semibold text-slate-300 z-30 shrink-0">
            <span className="font-bold tracking-tight text-[11px]">{currentTime}</span>
            <div className="flex items-center space-x-2 text-slate-300">
              <Signal className="w-3 h-3" />
              <div className="flex items-center text-[10px] font-bold text-emerald-400">
                <Wifi className="w-3 h-3 mr-0.5" />
                <span>{dbEstablishment?.wifi_ssid || 'SAKO'}</span>
              </div>
              <BatteryMedium className="w-4 h-4 text-emerald-400" />
            </div>
          </div>

          {/* EN-TÊTE DE L'APPLICATION GÉRANT */}
          <div className="px-4 py-2 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-md shadow-blue-500/20">
                {orgName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="font-extrabold text-xs text-white leading-tight truncate max-w-[150px]">{orgName}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono block">Code: {orgCode.slice(0, 11)}...</span>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => setShowBroadcastModal(true)}
                title="Diffuser une annonce push"
                className="w-7 h-7 rounded-xl bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-blue-400" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('justifs')}
                title="Alertes & Justifications"
                className="w-7 h-7 rounded-xl bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition relative cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* CONTENU DÉROULANT DE L'APPLICATION MOBILE */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-none">
            
            {/* ===================== ONGLET 1 : COCKPIT GÉRANT ===================== */}
            {activeTab === 'cockpit' && (
              <div className="space-y-4 animate-fadeIn">
                
                {/* 1. Carte Hero : Taux d'Assiduité Global en Temps Réel */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800/90 border border-slate-700/80 rounded-3xl p-4 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Activity className="w-3 h-3 text-emerald-400" />
                      Effectif & Télémétrie Live
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      {dbEmployees.length > 0 ? `${Math.round((punches.filter(p => p.status === 'VALIDATED').length / Math.max(dbEmployees.length, 1)) * 100)}% Assiduité` : '100% Assiduité'}
                    </span>
                  </div>

                  {/* 4 Compteurs Clés */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-slate-950/60 p-2 rounded-2xl border border-slate-800">
                      <span className="text-lg font-black text-emerald-400 leading-none">
                        {punches.filter(p => p.status === 'VALIDATED').length}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold block mt-1">Présents</span>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-2xl border border-slate-800">
                      <span className="text-lg font-black text-amber-400 leading-none">
                        {punches.filter(p => p.status === 'LATE').length}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold block mt-1">Retards</span>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-2xl border border-slate-800">
                      <span className="text-lg font-black text-rose-400 leading-none">
                        {punches.filter(p => p.status === 'ALERT').length}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold block mt-1">Alertes</span>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-2xl border border-slate-800">
                      <span className="text-lg font-black text-blue-400 leading-none">
                        {dbEmployees.length}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold block mt-1">Effectif</span>
                    </div>
                  </div>
                </div>

                {/* 2. Boutons d'Action Rapide Gérant */}
                <div>
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 block mb-2 px-1">
                    Actions Rapides
                  </span>
                  <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none text-xs">
                    <button
                      type="button"
                      onClick={() => setShowQrModal(true)}
                      className="px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl flex items-center space-x-2 text-slate-200 shrink-0 font-bold active:scale-95 transition cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5 text-blue-400" />
                      <span>Scanner Enrôlement</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBroadcastModal(true)}
                      className="px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl flex items-center space-x-2 text-slate-200 shrink-0 font-bold active:scale-95 transition cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5 text-amber-400" />
                      <span>Alerte Push</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerToast("Rapport RH PDF prêt pour téléchargement")}
                      className="px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl flex items-center space-x-2 text-slate-200 shrink-0 font-bold active:scale-95 transition cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Export Heures</span>
                    </button>
                  </div>
                </div>

                {/* 3. Filtre Segmenté du Flux */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-white">Flux des Pointages ({filteredPunches.length})</span>
                  <div className="flex bg-slate-900 p-0.5 rounded-xl border border-slate-800 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setFilterType('ALL')}
                      className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${filterType === 'ALL' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                    >
                      Tous
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('LATE')}
                      className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${filterType === 'LATE' ? 'bg-amber-600 text-white' : 'text-slate-400'}`}
                    >
                      Retards
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('ALERT')}
                      className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${filterType === 'ALERT' ? 'bg-rose-600 text-white' : 'text-slate-400'}`}
                    >
                      Alertes
                    </button>
                  </div>
                </div>

                {/* 4. Liste des Cartes de Pointages */}
                <div className="space-y-2">
                  {loadingDb ? (
                    <div className="p-6 text-center text-slate-500 text-xs">
                      Chargement des pointages réels...
                    </div>
                  ) : filteredPunches.length === 0 ? (
                    <div className="p-6 text-center bg-slate-900/50 rounded-2xl border border-slate-800 text-xs text-slate-400 space-y-1">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                      <p className="font-bold text-white">Aucun pointage dans cette vue</p>
                      <p className="text-[11px] text-slate-500">Cliquez sur &quot;Simuler Pointage Live&quot; ci-dessus pour tester.</p>
                    </div>
                  ) : (
                    filteredPunches.map((p) => {
                      const isValid = p.status === 'VALIDATED';
                      const isLate = p.status === 'LATE';
                      const isAlert = p.status === 'ALERT';

                      return (
                        <div 
                          key={p.id}
                          className={`p-3 rounded-2xl border transition ${
                            isAlert 
                              ? 'bg-rose-950/20 border-rose-800/60 text-rose-100' 
                              : isLate 
                                ? 'bg-amber-950/20 border-amber-800/60 text-amber-100'
                                : 'bg-slate-900/70 border-slate-800 text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2.5">
                              <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${p.avatarColor} flex items-center justify-center text-white font-extrabold text-xs shrink-0 shadow-sm`}>
                                {p.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-xs text-white leading-tight">{p.name}</span>
                                  <span className="text-[9px] font-mono text-slate-400">{p.matricule}</span>
                                </div>
                                <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-2.5 h-2.5 text-slate-400" />
                                  <span>{p.site} • ({p.distance})</span>
                                </p>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-xs font-black font-mono text-white block">{p.time}</span>
                              <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md inline-block mt-0.5 ${
                                isValid ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                isLate ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              }`}>
                                {isValid ? 'Validé' : isLate ? 'Retard' : 'Hors-Zone'}
                              </span>
                            </div>
                          </div>

                          {/* Télémétrie appareil & Wi-Fi */}
                          <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                            <span className="truncate max-w-[180px]">📱 {p.device}</span>
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

            {/* ===================== ONGLET 2 : JUSTIFICATIONS FLASH ===================== */}
            {activeTab === 'justifs' && (
              <div className="space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <h2 className="text-xs font-extrabold text-white">Arbitrage des Retards</h2>
                    <p className="text-[10px] text-slate-400">Validation ou rejet direct dans Supabase</p>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {pendingCount} en attente
                  </span>
                </div>

                {justifications.length === 0 ? (
                  <div className="p-6 text-center bg-slate-900/50 rounded-2xl border border-slate-800 text-xs text-slate-400 space-y-1">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                    <p className="font-bold text-white">Aucun retard à arbitrer</p>
                    <p className="text-[11px] text-slate-500">Toutes les justifications ont été traitées.</p>
                  </div>
                ) : (
                  justifications.map((j) => {
                    const isPending = j.status === 'PENDING';
                    const isApproved = j.status === 'APPROVED';
                    const isRejected = j.status === 'REJECTED';

                    return (
                      <div key={j.id} className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2.5">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-bold text-xs text-white block">{j.name}</span>
                            <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              <span>Signalé à {j.time} • {j.category}</span>
                            </span>
                          </div>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            isPending ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                            isApproved ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                            'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {isPending ? 'En attente' : isApproved ? 'Excusé' : 'Non justifié'}
                          </span>
                        </div>

                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-[11px] text-slate-300 italic">
                          &quot;{j.reason}&quot;
                        </div>

                        {/* Boutons d'Arbitrage Flash */}
                        {isPending ? (
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleApproveJustif(j.id, j.name)}
                              className="py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Valider</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectJustif(j.id, j.name)}
                              className="py-1.5 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Refuser</span>
                            </button>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 text-center font-bold py-1">
                            {isApproved ? '✓ Décision enregistrée : Retard excusé' : '✕ Décision enregistrée : Retard non justifié'}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ===================== ONGLET 3 : ÉQUIPES & ENRÔLEMENT ===================== */}
            {activeTab === 'equipe' && (
              <div className="space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <h2 className="text-xs font-extrabold text-white">Personnel ({dbEmployees.length})</h2>
                    <p className="text-[10px] text-slate-400">Liens WhatsApp & liaison des téléphones</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowQrModal(true)}
                    className="text-[11px] font-bold text-blue-400 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Lier un mobile</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {dbEmployees.map((emp) => (
                    <div key={emp.id} className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xs">
                          {emp.full_name ? emp.full_name[0] : 'E'}
                        </div>
                        <div>
                          <span className="font-bold text-xs text-white block">{emp.full_name}</span>
                          <span className="text-[10px] text-slate-400">
                            {emp.employee_matricule || 'Sans matricule'} • {emp.phone || 'Sans téléphone'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenWhatsApp(emp)}
                        className="p-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-xl transition border border-emerald-500/30 cursor-pointer"
                        title="Envoyer lien d'activation WhatsApp avec le code entreprise"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ===================== ONGLET 4 : SÉCURITÉ & RÉGLAGES GÉRANT ===================== */}
            {activeTab === 'securite' && (
              <div className="space-y-3 animate-fadeIn text-xs">
                <div className="px-1">
                  <h2 className="font-extrabold text-white text-xs">Sécurité & Anti-Fraude Satellite</h2>
                  <p className="text-[10px] text-slate-400">Politiques actives sur les mobiles des employés</p>
                </div>

                <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block">Établissement Actif</span>
                      <span className="text-[10px] text-slate-400">
                        {dbEstablishment?.name || 'Siège Principal'} ({dbEstablishment?.city || 'Bobo-Dioulasso'})
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                      Rayon {dbEstablishment?.radius_meters || 80}m
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <div>
                      <span className="font-bold text-white block">Coordonnées WGS84</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {dbEstablishment?.latitude || 11.247051}°, {dbEstablishment?.longitude || -4.291915}°
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                      ±1m
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <div>
                      <span className="font-bold text-white block">Signature Box Wi-Fi</span>
                      <span className="text-[10px] text-slate-400">
                        Réseau : {dbEstablishment?.wifi_ssid || 'SAKO'} ({dbEstablishment?.wifi_bssids?.[0] || '6a:9e:29:2b:43:08'})
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                      Certifié
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <div>
                      <span className="font-bold text-white block">Blocage Mock GPS</span>
                      <span className="text-[10px] text-slate-400">Refus automatique des fausses localisations</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                      Actif
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <div>
                      <span className="font-bold text-white block">Liaison 1 Téléphone / Employé</span>
                      <span className="text-[10px] text-slate-400">Empêche de pointer pour un collègue</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                      Actif
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-[11px] text-amber-200">
                  🔒 Toutes les modifications apportées ici sont synchronisées en direct avec le panneau de contrôle web.
                </div>
              </div>
            )}

          </div>

          {/* BARRE DE NAVIGATION INFÉRIEURE (Bottom Nav) */}
          <div className="border-t border-slate-800/80 bg-slate-900/90 backdrop-blur-md px-2 py-2 flex items-center justify-around shrink-0 z-30">
            
            <button
              type="button"
              onClick={() => setActiveTab('cockpit')}
              className={`flex flex-col items-center py-1 px-3 rounded-2xl transition cursor-pointer ${
                activeTab === 'cockpit' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Cockpit</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('justifs')}
              className={`flex flex-col items-center py-1 px-3 rounded-2xl transition cursor-pointer relative ${
                activeTab === 'justifs' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-white'
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
                activeTab === 'equipe' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Équipe</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('securite')}
              className={`flex flex-col items-center py-1 px-3 rounded-2xl transition cursor-pointer ${
                activeTab === 'securite' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Sécurité</span>
            </button>

          </div>

          {/* INDICATEUR D'ACCUEIL MOBILE (Home Indicator iOS / Android) */}
          <div className="h-4 bg-slate-950 flex items-center justify-center shrink-0">
            <div className="w-28 h-1 bg-slate-700 rounded-full" />
          </div>

          {/* MODALE INTERACTIVE 1 : DIFFUSION PUSH NOTIFICATION */}
          {showBroadcastModal && (
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 animate-fadeIn">
              <div className="bg-slate-900 border border-slate-700 w-full rounded-3xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-white flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-blue-400" />
                    Diffuser un Message d&apos;Urgence
                  </span>
                  <button 
                    type="button"
                    onClick={() => setShowBroadcastModal(false)}
                    className="text-slate-400 hover:text-white text-xs px-2 py-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Cette notification fera sonner instantanément le smartphone de tous vos collaborateurs.
                </p>
                <textarea
                  rows={3}
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                  placeholder="Ex: Réunion générale d'urgence dans la salle de conférence à 14h00..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleSendBroadcast}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white rounded-xl transition cursor-pointer"
                >
                  Envoyer la Notification Push
                </button>
              </div>
            </div>
          )}

          {/* MODALE INTERACTIVE 2 : SCANNER QR MOBILE D'ENRÔLEMENT */}
          {showQrModal && (
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 animate-fadeIn">
              <div className="bg-slate-900 border border-slate-700 w-full rounded-3xl p-4 space-y-3 text-center">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-white">Scanner Caméra Enrôlement</span>
                  <button 
                    type="button"
                    onClick={() => setShowQrModal(false)}
                    className="text-slate-400 hover:text-white text-xs px-2 py-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <div className="w-48 h-48 mx-auto bg-slate-950 border-2 border-dashed border-blue-500 rounded-2xl flex flex-col items-center justify-center p-3 relative overflow-hidden">
                  <div className="w-full h-0.5 bg-blue-500 animate-pulse absolute top-1/2 -translate-y-1/2 left-0 shadow-lg shadow-blue-500" />
                  <QrCode className="w-16 h-16 text-slate-700" />
                  <span className="text-[10px] text-slate-400 mt-2 font-bold">Visez le QR code du salarié</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowQrModal(false);
                    triggerToast("✓ Smartphone du salarié associé avec succès !");
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

      {/* MODALE : TESTER SUR VRAI SMARTPHONE (QR CODE EXTERNE) */}
      {showPhoneQrModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 text-center max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-white text-sm">Ouvrir sur Smartphone</h3>
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
              <span className="font-bold text-white text-xs block">Scannez ce QR Code avec votre téléphone</span>
              <span className="text-[11px] text-emerald-400 font-bold block bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                📶 Connecté au Wi-Fi &quot;{dbEstablishment?.wifi_ssid || 'SAKO'}&quot;
              </span>
            </div>

            <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800 text-left">
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
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition cursor-pointer"
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
