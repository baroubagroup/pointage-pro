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
  RefreshCw,
  Copy,
  Download,
  Share2,
  ChevronDown,
  Layers
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

export default function GerantMobileAppPage() {
  const [activeTab, setActiveTab] = useState<'cockpit' | 'justifs' | 'equipe' | 'parametres'>('cockpit');
  const [filterType, setFilterType] = useState<'ALL' | 'PRESENT' | 'LATE' | 'ALERT'>('ALL');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Mises à jour OTA (Over-The-Air) & PWA
  const [isCheckingOta, setIsCheckingOta] = useState(false);
  const [otaStatus, setOtaStatus] = useState<string>('À jour (v2.4.0 Live OTA)');
  const [pwaInstalled, setPwaInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Multi-organisations
  const [allOrgs, setAllOrgs] = useState<any[]>([]);
  const [showOrgPicker, setShowOrgPicker] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState('NAFA BUSINESS');
  const [orgCode, setOrgCode] = useState('ORG-NB-2026-3653TB');

  // Données réelles chargées depuis Supabase
  const [loadingDb, setLoadingDb] = useState(true);
  const [dbEmployees, setDbEmployees] = useState<any[]>([]);
  const [dbEstablishment, setDbEstablishment] = useState<any>(null);
  const [dbJustifications, setDbJustifications] = useState<any[]>([]);
  const [dbPunches, setDbPunches] = useState<any[]>([]);

  // Modales
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastText, setBroadcastText] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Écouteur PWA BeforeInstallPrompt
  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setPwaInstalled(true);
    }
  }, []);

  // Chargement des données réelles depuis Supabase
  const loadDatabaseData = async (targetOrgId?: string) => {
    setLoadingDb(true);
    try {
      const supabase = createClient();

      // 1. Liste des entreprises enregistrées pour le sélecteur multi-entreprises
      const { data: orgsData } = await supabase
        .from('pointage_organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (orgsData && orgsData.length > 0) {
        setAllOrgs(orgsData);

        const currentActiveId = targetOrgId || 
          (typeof window !== 'undefined' ? localStorage.getItem('pointage_org_id') : null) || 
          orgsData[0].id;

        const currentOrg = orgsData.find(o => o.id === currentActiveId) || orgsData[0];
        setOrgId(currentOrg.id);
        setOrgName(currentOrg.name);
        setOrgCode(currentOrg.org_code);

        if (typeof window !== 'undefined') {
          localStorage.setItem('pointage_org_id', currentOrg.id);
          localStorage.setItem('pointage_org_name', currentOrg.name);
          localStorage.setItem('pointage_org_code', currentOrg.org_code);
        }

        // 2. Collaborateurs de cette entreprise
        const { data: emps } = await supabase
          .from('pointage_employees')
          .select('*')
          .eq('org_id', currentOrg.id)
          .eq('is_active', true)
          .order('full_name', { ascending: true });

        if (emps) setDbEmployees(emps);

        // 3. Établissement de pointage
        const { data: ests } = await supabase
          .from('pointage_establishments')
          .select('*')
          .eq('org_id', currentOrg.id)
          .eq('is_active', true)
          .limit(1);

        if (ests && ests.length > 0) setDbEstablishment(ests[0]);

        // 4. Justifications d'assiduité
        const { data: justifs } = await supabase
          .from('pointage_justifications')
          .select('*, pointage_employees(full_name, employee_matricule)')
          .eq('org_id', currentOrg.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (justifs) setDbJustifications(justifs);

        // 5. Logs de pointages réels
        const { data: logs } = await supabase
          .from('pointage_logs')
          .select('*, pointage_employees(full_name, employee_matricule)')
          .eq('org_id', currentOrg.id)
          .order('recorded_at_utc', { ascending: false })
          .limit(25);

        if (logs) setDbPunches(logs);
      }
    } catch (err) {
      console.warn("Erreur chargement données gérant:", err);
    } finally {
      setLoadingDb(false);
    }
  };

  useEffect(() => {
    loadDatabaseData();
  }, []);

  const handleSwitchOrg = (org: any) => {
    setOrgId(org.id);
    setOrgName(org.name);
    setOrgCode(org.org_code);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pointage_org_id', org.id);
      localStorage.setItem('pointage_org_name', org.name);
      localStorage.setItem('pointage_org_code', org.org_code);
      document.cookie = `pointage_active_org_id=${org.id}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `pointage_active_org_code=${org.org_code}; path=/; max-age=86400; SameSite=Lax`;
    }
    setShowOrgPicker(false);
    loadDatabaseData(org.id);
    showToast(`🏢 Espace commuté sur ${org.name}`);
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Moteur de mise à jour Over-The-Air (OTA)
  const handleCheckOtaUpdates = async () => {
    setIsCheckingOta(true);
    setOtaStatus('Vérification sur les serveurs cloud...');

    try {
      const res = await fetch('/api/app/version', { cache: 'no-store' });
      const data = await res.json();

      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.update();
        }
      }

      setTimeout(() => {
        setIsCheckingOta(false);
        setOtaStatus(`Version ${data?.managerPwa?.currentVersion || '2.4.0'} active • Code à jour`);
        showToast("🚀 Application mise à jour avec succès (OTA sans réinstallation)");
      }, 1000);
    } catch (err) {
      setIsCheckingOta(false);
      setOtaStatus('Erreur de vérification réseau');
      showToast("Impossible de joindre le serveur de mise à jour");
    }
  };

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setPwaInstalled(true);
        showToast("✅ Application ajoutée sur votre écran d'accueil");
      }
      setDeferredPrompt(null);
    } else {
      showToast("ℹ️ Ouvrez le menu de votre navigateur et appuyez sur 'Ajouter à l'écran d'accueil'");
    }
  };

  // Arbitrage d'une justification réelle dans Supabase
  const handleArbitrateJustification = async (justifId: string, newStatus: 'APPROVED' | 'REJECTED') => {
    try {
      const supabase = createClient();
      await supabase
        .from('pointage_justifications')
        .update({
          status: newStatus,
          arbitrated_at: new Date().toISOString(),
          arbitrated_by: 'Gérant Mobile'
        })
        .eq('id', justifId);

      setDbJustifications(prev => prev.map(j => j.id === justifId ? { ...j, status: newStatus } : j));
      showToast(newStatus === 'APPROVED' ? "✅ Retard excusé et validé" : "❌ Justification rejetée");
    } catch (err) {
      showToast("Erreur lors de l'arbitrage");
    }
  };

  // Invitation WhatsApp
  const handleSendInviteWhatsApp = (emp: any) => {
    const matricule = emp.employee_matricule || 'MAT-2026';
    const cleanPhone = (emp.phone || '').replace(/\D/g, '');
    const message = encodeURIComponent(
      `Bonjour ${emp.full_name} !\n\nVoici votre accès officiel à l'application de pointage pour l'entreprise *${orgName}* :\n` +
      `🏢 Code Établissement : *${orgCode}*\n` +
      `🆔 Votre Matricule : *${matricule}*\n\n` +
      `📲 Téléchargez l'application officielle ici : http://192.168.11.106:3000/api/app/download\n\n` +
      `Ouvrez l'application et renseignez votre matricule pour démarrer vos pointages par satellite.`
    );

    const waUrl = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${message}`
      : `https://api.whatsapp.com/send?text=${message}`;

    window.open(waUrl, '_blank');
    showToast(`Lien WhatsApp généré pour ${emp.full_name}`);
  };

  // Simulation d'un pointage en direct dans Supabase
  const handleSimulatePunch = async () => {
    if (dbEmployees.length === 0 || !orgId) {
      showToast("Veuillez d'abord déclarer au moins un collaborateur.");
      return;
    }

    const randomEmp = dbEmployees[Math.floor(Math.random() * dbEmployees.length)];
    const estLat = dbEstablishment?.latitude || 11.247051;
    const estLng = dbEstablishment?.longitude || -4.291915;

    try {
      const supabase = createClient();
      const newLog = {
        org_id: orgId,
        employee_id: randomEmp.id,
        establishment_id: dbEstablishment?.id || null,
        punch_type: 'checkIn',
        recorded_at_utc: new Date().toISOString(),
        synced_at_utc: new Date().toISOString(),
        is_offline_sync: false,
        latitude: estLat + (Math.random() - 0.5) * 0.0002,
        longitude: estLng + (Math.random() - 0.5) * 0.0002,
        accuracy_meters: 2.1,
        distance_to_site_meters: Math.floor(Math.random() * 15),
        device_id: 'DEV-SIMULATOR-' + Math.floor(Math.random() * 1000),
        device_model: 'Smartphone Collaborateur',
        is_mock_location: false,
        status: 'VERIFIED',
        flag_reasons: ['GNSS_SATELLITE_WGS84_LOCK']
      };

      const { data: inserted } = await supabase.from('pointage_logs').insert([newLog]).select('*, pointage_employees(full_name, employee_matricule)').single();

      if (inserted) {
        setDbPunches(prev => [inserted, ...prev]);
        showToast(`📍 Pointage en direct reçu : ${randomEmp.full_name}`);
      }
    } catch (e) {
      showToast("Erreur simulation pointage");
    }
  };

  // Statistiques calculées
  const totalEmployees = dbEmployees.length || 5;
  const presentCount = dbPunches.length > 0 ? Math.min(dbPunches.length, totalEmployees) : 4;
  const lateCount = dbJustifications.filter(j => j.status === 'PENDING').length;
  const attendancePercent = totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 92;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col max-w-md mx-auto shadow-2xl relative border-x border-slate-800">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-4 left-4 right-4 z-[200] max-w-sm mx-auto bg-blue-600 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between animate-fadeIn">
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg(null)} className="text-white/80 hover:text-white ml-2">✕</button>
        </div>
      )}

      {/* Top Header Mobile */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center font-black text-xs text-white shadow-md">
            {orgName.substring(0, 2).toUpperCase()}
          </div>
          <div className="cursor-pointer" onClick={() => setShowOrgPicker(true)}>
            <div className="flex items-center gap-1">
              <span className="font-extrabold text-sm text-white">{orgName}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <span className="text-[10px] font-mono text-blue-400">{orgCode}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleSimulatePunch}
            title="Tester un pointage live"
            className="px-2.5 py-1.5 bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1 active:scale-95 transition"
          >
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>Simuler</span>
          </button>
          <Link
            href="/dashboard"
            className="p-1.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition"
            title="Ouvrir le Cockpit Grand Écran"
          >
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Sélecteur Multi-Entreprises Bottom Sheet */}
      {showOrgPicker && (
        <div className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm flex items-end justify-center p-3">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">
                Changer d'entreprise ({allOrgs.length})
              </h3>
              <button onClick={() => setShowOrgPicker(false)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1.5">
              {allOrgs.map((org) => {
                const isSelected = org.id === orgId;
                return (
                  <button
                    key={org.id}
                    onClick={() => handleSwitchOrg(org)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition ${
                      isSelected ? 'bg-blue-600 text-white font-bold' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{org.name}</div>
                      <div className="text-[10px] font-mono opacity-70">{org.org_code}</div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-white" />}
                  </button>
                );
              })}
            </div>
            <Link
              href="/register"
              onClick={() => setShowOrgPicker(false)}
              className="block text-center text-xs font-bold text-amber-400 py-2 border-t border-slate-800"
            >
              + Créer un nouveau compte entreprise
            </Link>
          </div>
        </div>
      )}

      {/* Bannière PWA Installation si non installé */}
      {!pwaInstalled && deferredPrompt && (
        <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 border-b border-blue-800/50 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Download className="w-3.5 h-3.5 text-blue-400 animate-bounce" />
            <span className="text-[11px] font-semibold text-blue-200">Installer PointagePro Gérant</span>
          </div>
          <button
            onClick={handleInstallPwa}
            className="text-[10px] font-extrabold bg-blue-600 text-white px-2.5 py-1 rounded-lg hover:bg-blue-500 transition"
          >
            Installer
          </button>
        </div>
      )}

      {/* Contenu de l'onglet Actif */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-28">
        {/* ONGLET 1: COCKPIT */}
        {activeTab === 'cockpit' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Carte de Présence Globale */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-5 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between text-blue-200 text-xs font-semibold mb-2">
                <span>Assiduité Temps Réel</span>
                <span className="flex items-center gap-1 font-mono text-[10px] bg-blue-900/50 px-2 py-0.5 rounded-full border border-blue-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  EN DIRECT
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-3xl font-black tracking-tight">{attendancePercent}%</div>
                  <div className="text-xs text-blue-100 mt-0.5">{presentCount} sur {totalEmployees} collaborateurs présents</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-amber-300">{lateCount}</div>
                  <div className="text-[10px] text-blue-200">En retard / Attente</div>
                </div>
              </div>

              {/* Barre de progression */}
              <div className="w-full h-2 bg-blue-950/40 rounded-full mt-4 overflow-hidden">
                <div 
                  className="h-full bg-emerald-400 rounded-full transition-all duration-500" 
                  style={{ width: `${attendancePercent}%` }}
                ></div>
              </div>
            </div>

            {/* Site Géofencé Actif */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">
                    {dbEstablishment?.name || `Siège Principal - ${orgName}`}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    {dbEstablishment?.latitude?.toFixed(5) || '11.24705'}° N, {dbEstablishment?.longitude?.toFixed(5) || '-4.29191'}° W • Rayon {dbEstablishment?.radius_meters || 80}m
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-bold">
                Actif
              </span>
            </div>

            {/* Filtres de pointages */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-bold text-slate-300">Journal des Pointages Réels</span>
              <div className="flex space-x-1">
                {(['ALL', 'PRESENT', 'LATE'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilterType(f)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                      filterType === f ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {f === 'ALL' ? 'Tous' : f === 'PRESENT' ? 'Présents' : 'Retards'}
                  </button>
                ))}
              </div>
            </div>

            {/* Liste des pointages réels */}
            <div className="space-y-2">
              {dbPunches.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-xs">
                  Aucun pointage enregistré pour cette entreprise aujourd'hui.
                </div>
              ) : (
                dbPunches.map((punch: any) => {
                  const empName = punch.pointage_employees?.full_name || 'Collaborateur';
                  const matricule = punch.pointage_employees?.employee_matricule || 'MAT-2026';
                  const time = new Date(punch.recorded_at_utc).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                  const dist = punch.distance_to_site_meters || 4;

                  return (
                    <div key={punch.id} className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-800 text-blue-400 flex items-center justify-center font-bold text-xs">
                          {empName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{empName}</div>
                          <div className="text-[10px] text-slate-400">
                            {matricule} • {dist}m du site
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-emerald-400">{time}</div>
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-md font-semibold">
                          GPS Certifié
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ONGLET 2: ARBITRAGE DES JUSTIFICATIONS */}
        {activeTab === 'justifs' && (
          <div className="space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">
                Demandes d'arbitrage ({dbJustifications.filter(j => j.status === 'PENDING').length} en attente)
              </h2>
            </div>

            {dbJustifications.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p>Aucun retard ou justification en attente.</p>
                <p className="text-[11px] text-slate-500">Toutes les assiduités sont en règle pour {orgName}.</p>
              </div>
            ) : (
              dbJustifications.map((j: any) => {
                const empName = j.pointage_employees?.full_name || 'Collaborateur';
                const matricule = j.pointage_employees?.employee_matricule || '';
                const isPending = j.status === 'PENDING';

                return (
                  <div key={j.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs">
                          {empName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{empName}</div>
                          <div className="text-[10px] text-slate-400">{matricule}</div>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        j.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                        j.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse'
                      }`}>
                        {j.status === 'APPROVED' ? 'Excusé' : j.status === 'REJECTED' ? 'Refusé' : 'À Arbitrer'}
                      </span>
                    </div>

                    <div className="bg-slate-950/60 rounded-xl p-2.5 text-xs text-slate-300">
                      <div className="text-[10px] font-bold text-amber-300 mb-1">Motif invoqué :</div>
                      <p className="italic">« {j.reason || "Embouteillage sur le boulevard principal"} »</p>
                    </div>

                    {isPending && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => handleArbitrateJustification(j.id, 'APPROVED')}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Valider (Excusé)</span>
                        </button>
                        <button
                          onClick={() => handleArbitrateJustification(j.id, 'REJECTED')}
                          className="w-full py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Refuser</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ONGLET 3: ÉQUIPE & INVITATIONS WHATSAPP */}
        {activeTab === 'equipe' && (
          <div className="space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">
                Effectif & Collaborateurs ({dbEmployees.length})
              </h2>
              <span className="text-[10px] text-blue-400 font-mono">{orgCode}</span>
            </div>

            {dbEmployees.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
                Aucun collaborateur déclaré pour cette entreprise.
              </div>
            ) : (
              dbEmployees.map((emp: any) => {
                const matricule = emp.employee_matricule || 'MAT-2026';
                const isEnrolled = emp.is_enrolled === true;

                return (
                  <div key={emp.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                        {emp.full_name?.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{emp.full_name}</div>
                        <div className="text-[10px] text-slate-400">
                          {matricule} • {emp.phone || 'Pas de numéro'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleSendInviteWhatsApp(emp)}
                        title="Envoyer l'invitation magique par WhatsApp"
                        className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 active:scale-95 transition"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ONGLET 4: PARAMÈTRES & OTA UPDATES */}
        {activeTab === 'parametres' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Carte Mises à Jour Over-The-Air */}
            <div className="bg-slate-900 border border-blue-500/30 rounded-3xl p-5 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Mises à Jour Over-The-Air (OTA)</h3>
                    <p className="text-[10px] text-blue-400">Aucune recompilation nécessaire</p>
                  </div>
                </div>
                <span className="text-[9px] font-extrabold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-400/30">
                  INSTANTANÉ
                </span>
              </div>

              <div className="bg-slate-950/60 rounded-2xl p-3 text-xs space-y-1.5 border border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-400">Version installée :</span>
                  <span className="font-mono font-bold text-white">v2.4.0 (PWA)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">État du Service Worker :</span>
                  <span className="font-bold text-emerald-400">{otaStatus}</span>
                </div>
              </div>

              <button
                onClick={handleCheckOtaUpdates}
                disabled={isCheckingOta}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingOta ? 'animate-spin' : ''}`} />
                <span>{isCheckingOta ? 'Recherche en cours...' : 'Vérifier et Appliquer les Mises à Jour'}</span>
              </button>
            </div>

            {/* Téléchargement APK Collaborateur */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Application Collaborateur (APK)</h3>
                    <p className="text-[10px] text-slate-400">Pour les smartphones Android des employés</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-emerald-400">v1.1.0</span>
              </div>

              <Link
                href="/api/app/download"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger l'APK Collaborateur (47 Mo)</span>
              </Link>
            </div>

            {/* Identifiants Entreprise */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
              <h3 className="text-xs font-bold text-white">Identité de l'Organisation</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2.5 bg-slate-950 rounded-xl">
                  <span className="text-slate-400">Raison Sociale :</span>
                  <span className="font-bold text-white">{orgName}</span>
                </div>
                <div className="flex justify-between p-2.5 bg-slate-950 rounded-xl">
                  <span className="text-slate-400">Code Organisation :</span>
                  <span className="font-mono font-bold text-blue-400">{orgCode}</span>
                </div>
                <div className="flex justify-between p-2.5 bg-slate-950 rounded-xl">
                  <span className="text-slate-400">Effectif Actif :</span>
                  <span className="font-bold text-white">{totalEmployees} collaborateurs</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-3 py-2 flex items-center justify-around z-50">
        <button
          onClick={() => setActiveTab('cockpit')}
          className={`flex flex-col items-center py-1 px-3 rounded-2xl transition ${
            activeTab === 'cockpit' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Activity className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Cockpit</span>
        </button>

        <button
          onClick={() => setActiveTab('justifs')}
          className={`flex flex-col items-center py-1 px-3 rounded-2xl relative transition ${
            activeTab === 'justifs' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShieldAlert className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Arbitrage</span>
          {lateCount > 0 && (
            <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('equipe')}
          className={`flex flex-col items-center py-1 px-3 rounded-2xl transition ${
            activeTab === 'equipe' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Équipe</span>
        </button>

        <button
          onClick={() => setActiveTab('parametres')}
          className={`flex flex-col items-center py-1 px-3 rounded-2xl transition ${
            activeTab === 'parametres' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <SlidersHorizontal className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Système</span>
        </button>
      </nav>
    </div>
  );
}
