'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
  Minimize2
} from 'lucide-react';

interface MockPunch {
  id: string;
  name: string;
  matricule: string;
  time: string;
  type: 'IN' | 'OUT';
  site: string;
  distance: string;
  status: 'VALIDATED' | 'LATE' | 'ALERT';
  avatarColor: string;
  device: string;
  wifiUsed?: string;
}

interface MockJustif {
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
  const [showDynamicIslandAlert, setShowDynamicIslandAlert] = useState(false);
  const [islandMessage, setIslandMessage] = useState('🟢 Tous les sites opérationnels');

  // Données de l'organisation
  const [orgName, setOrgName] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('pointage_org_name') || 'NAFA BUSINESS' : 'NAFA BUSINESS'));
  const [orgCode, setOrgCode] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('pointage_org_code') || 'ORG-NB-2026-3653TB' : 'ORG-NB-2026-3653TB'));

  // Justifications simulées avec actions réelles d'approbation
  const [justifications, setJustifications] = useState<MockJustif[]>([
    {
      id: 'j-1',
      name: 'KABORE Ibrahim',
      time: '08:02',
      delayMinutes: 17,
      category: 'Transport / Embouteillage',
      reason: 'Ralentissement au rond-point de Kuinima suite à un camion en panne.',
      status: 'PENDING'
    },
    {
      id: 'j-2',
      name: 'OUEDRAOGO Awa',
      time: '08:14',
      delayMinutes: 29,
      category: 'Rendez-vous Client',
      reason: 'Passage direct à la banque pour retrait de bordereaux avant ouverture.',
      status: 'PENDING'
    }
  ]);

  // Flux des pointages en temps réel
  const [punches, setPunches] = useState<MockPunch[]>([
    {
      id: 'p-1',
      name: 'TRAORE Amadou',
      matricule: 'EMP-001',
      time: '07:28:14',
      type: 'IN',
      site: 'Siège Bobo-Dioulasso',
      distance: '3 mètres',
      status: 'VALIDATED',
      avatarColor: 'from-blue-600 to-indigo-600',
      device: 'Samsung A53 (Sécurisé)',
      wifiUsed: 'SAKO'
    },
    {
      id: 'p-2',
      name: 'SAWADOGO Fatou',
      matricule: 'EMP-002',
      time: '07:35:42',
      type: 'IN',
      site: 'Siège Bobo-Dioulasso',
      distance: '6 mètres',
      status: 'VALIDATED',
      avatarColor: 'from-emerald-600 to-teal-600',
      device: 'Tecno Camon 20',
      wifiUsed: 'SAKO'
    },
    {
      id: 'p-3',
      name: 'BEDN SAKO',
      matricule: 'EMP-000',
      time: '07:40:05',
      type: 'IN',
      site: 'Direction Générale',
      distance: '1 mètre',
      status: 'VALIDATED',
      avatarColor: 'from-amber-600 to-yellow-600',
      device: 'Google Pixel 7',
      wifiUsed: 'SAKO'
    },
    {
      id: 'p-4',
      name: 'KABORE Ibrahim',
      matricule: 'EMP-003',
      time: '08:02:19',
      type: 'IN',
      site: 'Siège Bobo-Dioulasso',
      distance: '12 mètres',
      status: 'LATE',
      avatarColor: 'from-orange-600 to-amber-700',
      device: 'Infinix Note 30'
    },
    {
      id: 'p-5',
      name: 'OUEDRAOGO Awa',
      matricule: 'EMP-004',
      time: '08:14:50',
      type: 'IN',
      site: 'Hors-Périmètre (214m)',
      distance: '214 mètres',
      status: 'ALERT',
      avatarColor: 'from-rose-600 to-red-700',
      device: 'Redmi Note 12'
    }
  ]);

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
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleApproveJustif = (id: string, name: string) => {
    setJustifications(prev => prev.map(j => j.id === id ? { ...j, status: 'APPROVED' } : j));
    triggerToast(`✓ Retard de ${name} validé et excusé.`);
    setIslandMessage(`✓ ${name} excusé`);
    setShowDynamicIslandAlert(true);
    setTimeout(() => setShowDynamicIslandAlert(false), 3000);
  };

  const handleRejectJustif = (id: string, name: string) => {
    setJustifications(prev => prev.map(j => j.id === id ? { ...j, status: 'REJECTED' } : j));
    triggerToast(`✕ Justification de ${name} refusée.`);
    setIslandMessage(`✕ Retard non justifié : ${name}`);
    setShowDynamicIslandAlert(true);
    setTimeout(() => setShowDynamicIslandAlert(false), 3000);
  };

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

  const handleSimulateNewPunch = () => {
    const newP: MockPunch = {
      id: `p-${Date.now()}`,
      name: 'NOUVEAU POINTAGE DIRECT',
      matricule: 'EMP-005',
      time: new Date().toLocaleTimeString('fr-FR'),
      type: 'IN',
      site: 'Siège Bobo-Dioulasso',
      distance: '2 mètres',
      status: 'VALIDATED',
      avatarColor: 'from-violet-600 to-purple-700',
      device: 'Smartphone Test',
      wifiUsed: 'SAKO'
    };
    setPunches(prev => [newP, ...prev]);
    setIslandMessage(`🟢 Nouveau pointage : EMP-005 sur site`);
    setShowDynamicIslandAlert(true);
    triggerToast(`Nouveau pointage WGS84 reçu à l'instant !`);
    setTimeout(() => setShowDynamicIslandAlert(false), 3500);
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
      
      {/* 1. BARRE DE COMMANDE & CONTROLES DE LA MAQUETTE (Visible sur Grand Écran) */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 py-3 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20 font-black">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                  Maquette Interactive • Application Gérant Mobile
                </h1>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Preview HD
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Simulation haute fidélité de l'application smartphone dédiée aux dirigeants & gérants
              </p>
            </div>
          </div>

          {/* Sélecteur de cadre & Actions de test */}
          <div className="flex items-center space-x-2">
            
            {/* Bouton Simulation d'arrivée */}
            <button
              type="button"
              onClick={handleSimulateNewPunch}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Simuler Pointage Live</span>
            </button>

            {/* Sélecteur Appareil */}
            <div className="bg-slate-800 p-0.5 rounded-xl border border-slate-700 flex items-center text-xs">
              <button
                type="button"
                onClick={() => setDeviceFrame('iphone')}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  deviceFrame === 'iphone' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                iPhone 16 Pro
              </button>
              <button
                type="button"
                onClick={() => setDeviceFrame('android')}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  deviceFrame === 'android' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Galaxy S24
              </button>
              <button
                type="button"
                onClick={() => setDeviceFrame('fullscreen')}
                className={`px-2 py-1 rounded-lg font-bold transition ${
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
              ← Retour Cockpit
            </Link>
          </div>
        </div>
      </header>

      {/* 2. ZONE CENTRALE : CHÂSSIS SMARTPHONE RÉALISTE */}
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
                <span>SAKO</span>
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
                className="w-7 h-7 rounded-xl bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition"
              >
                <Send className="w-3.5 h-3.5 text-blue-400" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('justifs')}
                title="Alertes & Justifications"
                className="w-7 h-7 rounded-xl bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition relative"
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
                      88% Assiduité
                    </span>
                  </div>

                  {/* 4 Compteurs Clés */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-slate-950/60 p-2 rounded-2xl border border-slate-800">
                      <span className="text-lg font-black text-emerald-400 leading-none">5</span>
                      <span className="text-[9px] text-slate-400 font-bold block mt-1">Présents</span>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-2xl border border-slate-800">
                      <span className="text-lg font-black text-amber-400 leading-none">1</span>
                      <span className="text-[9px] text-slate-400 font-bold block mt-1">Retard</span>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-2xl border border-slate-800">
                      <span className="text-lg font-black text-rose-400 leading-none">1</span>
                      <span className="text-[9px] text-slate-400 font-bold block mt-1">Alerte</span>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-2xl border border-slate-800">
                      <span className="text-lg font-black text-blue-400 leading-none">0</span>
                      <span className="text-[9px] text-slate-400 font-bold block mt-1">Mission</span>
                    </div>
                  </div>
                </div>

                {/* 2. Boutons d'Action Rapide Gérant (Horizontaux) */}
                <div>
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 block mb-2 px-1">
                    Actions Rapides
                  </span>
                  <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none text-xs">
                    <button
                      type="button"
                      onClick={() => setShowQrModal(true)}
                      className="px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl flex items-center space-x-2 text-slate-200 shrink-0 font-bold active:scale-95 transition"
                    >
                      <QrCode className="w-3.5 h-3.5 text-blue-400" />
                      <span>Scanner Enrôlement</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBroadcastModal(true)}
                      className="px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl flex items-center space-x-2 text-slate-200 shrink-0 font-bold active:scale-95 transition"
                    >
                      <Send className="w-3.5 h-3.5 text-amber-400" />
                      <span>Alerte Push</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerToast("Rapport RH PDF prêt pour téléchargement")}
                      className="px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl flex items-center space-x-2 text-slate-200 shrink-0 font-bold active:scale-95 transition"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Export Heures</span>
                    </button>
                  </div>
                </div>

                {/* 3. Filtre Segmenté du Flux */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-white">Flux des Pointages</span>
                  <div className="flex bg-slate-900 p-0.5 rounded-xl border border-slate-800 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setFilterType('ALL')}
                      className={`px-2 py-0.5 rounded-lg transition ${filterType === 'ALL' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                    >
                      Tous ({punches.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('LATE')}
                      className={`px-2 py-0.5 rounded-lg transition ${filterType === 'LATE' ? 'bg-amber-600 text-white' : 'text-slate-400'}`}
                    >
                      Retards
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('ALERT')}
                      className={`px-2 py-0.5 rounded-lg transition ${filterType === 'ALERT' ? 'bg-rose-600 text-white' : 'text-slate-400'}`}
                    >
                      Alertes
                    </button>
                  </div>
                </div>

                {/* 4. Liste des Cartes de Pointages en Temps Réel */}
                <div className="space-y-2">
                  {filteredPunches.map((p) => {
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
                  })}
                </div>

              </div>
            )}

            {/* ===================== ONGLET 2 : JUSTIFICATIONS FLASH ===================== */}
            {activeTab === 'justifs' && (
              <div className="space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <h2 className="text-xs font-extrabold text-white">Arbitrage des Retards</h2>
                    <p className="text-[10px] text-slate-400">Validation ou rejet direct en 1 clic</p>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {pendingCount} en attente
                  </span>
                </div>

                {justifications.map((j) => {
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
                            <span>Retard de {j.delayMinutes} min (Arrivée à {j.time})</span>
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
                        "{j.reason}"
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
                          {isApproved ? '✓ Décision : Retard excusé' : '✕ Décision : Sanctionné / Non justifié'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ===================== ONGLET 3 : ÉQUIPES & ENRÔLEMENT ===================== */}
            {activeTab === 'equipe' && (
              <div className="space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <h2 className="text-xs font-extrabold text-white">Personnel ({punches.length})</h2>
                    <p className="text-[10px] text-slate-400">Liens magiques & liaison téléphones</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowQrModal(true)}
                    className="text-[11px] font-bold text-blue-400 flex items-center gap-1 hover:underline"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Lier un mobile</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {punches.map((emp) => (
                    <div key={emp.id} className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${emp.avatarColor} flex items-center justify-center text-white font-black text-xs`}>
                          {emp.name[0]}
                        </div>
                        <div>
                          <span className="font-bold text-xs text-white block">{emp.name}</span>
                          <span className="text-[10px] text-slate-400">{emp.matricule} • {emp.device}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => triggerToast(`Lien WhatsApp envoyé à ${emp.name}`)}
                        className="p-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-xl transition border border-emerald-500/30"
                        title="Envoyer lien d'activation WhatsApp"
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
                      <span className="font-bold text-white block">Blocage Mock GPS</span>
                      <span className="text-[10px] text-slate-400">Refus des fausses localisations</span>
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

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <div>
                      <span className="font-bold text-white block">Vérification Box Wi-Fi</span>
                      <span className="text-[10px] text-slate-400">Réseau : SAKO</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                      Certifié
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
                    Diffuser un Message d'Urgence
                  </span>
                  <button 
                    type="button"
                    onClick={() => setShowBroadcastModal(false)}
                    className="text-slate-400 hover:text-white text-xs px-2 py-1"
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
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white rounded-xl transition"
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
                    className="text-slate-400 hover:text-white text-xs px-2 py-1"
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
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white rounded-xl transition"
                >
                  Simuler Scan Réussi
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

    </div>
  );
}
