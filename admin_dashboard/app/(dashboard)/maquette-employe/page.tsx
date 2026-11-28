'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  Smartphone,
  Fingerprint,
  Activity,
  FileCheck2,
  User,
  MapPin,
  Wifi,
  Clock,
  Bell,
  ShieldCheck,
  CheckCircle2,
  Coffee,
  LogOut,
  Users,
  QrCode,
  Sparkles,
  CalendarDays,
  ChevronRight,
  Send,
  AlertTriangle,
  Maximize2,
  X,
  RefreshCw,
  HelpCircle,
  Lock,
  Scan
} from 'lucide-react';

type EmpTab = 'pointage' | 'activite' | 'demandes' | 'profil';
type WorkPhase = 'notArrived' | 'working' | 'onBreak' | 'completed';

export default function MaquetteEmployePage() {
  const [deviceFrame, setDeviceFrame] = useState<'phone' | 'fullscreen'>('phone');
  const [screenMode, setScreenMode] = useState<'app' | 'enrollment'>('app');
  const [activeTab, setActiveTab] = useState<EmpTab>('pointage');
  const [enrollTab, setEnrollTab] = useState<'scan' | 'org' | 'reverse'>('org');

  // Données réelles Supabase pour aperçu fidèle
  const [orgName, setOrgName] = useState('NAFA BUSINESS');
  const [orgCode, setOrgCode] = useState('ORG-NTMHH-NB');
  const [orgLogo, setOrgLogo] = useState<string | null>(null);
  const [admissionPolicy, setAdmissionPolicy] = useState<'STRICT' | 'MODERATE' | 'OPEN'>('STRICT');
  const [holidays, setHolidays] = useState<any[]>([]);
  const [latestBroadcast, setLatestBroadcast] = useState<any | null>(null);

  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [punches, setPunches] = useState<any[]>([]);
  const [justifications, setJustifications] = useState<any[]>([]);

  // État interactif du simulateur employé
  const [workPhase, setWorkPhase] = useState<WorkPhase>('notArrived');
  const [dayTimeline, setDayTimeline] = useState<{
    checkIn?: string;
    breakStart?: string;
    breakEnd?: string;
    checkOut?: string;
  }>({});
  const [isInZone, setIsInZone] = useState(true);
  const [distanceMeters, setDistanceMeters] = useState(14);
  const [wifiConnected, setWifiConnected] = useState(true);
  const [nowClock, setNowClock] = useState(() =>
    new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  // Modales interactives
  const [showJustifModal, setShowJustifModal] = useState(false);
  const [justifCategory, setJustifCategory] = useState('Transport / Embouteillage');
  const [justifText, setJustifText] = useState('');
  const [showColleagueModal, setShowColleagueModal] = useState(false);
  const [showAnnouncementsModal, setShowAnnouncementsModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Champs aperçu enrôlement sans date de naissance
  const [demoOrgInput, setDemoOrgInput] = useState('ORG-NTMHH-NB');
  const [demoNameInput, setDemoNameInput] = useState('');
  const [demoMatInput, setDemoMatInput] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    const id = setInterval(() => {
      setNowClock(
        new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const loadPreviewData = async () => {
      try {
        const supabase = createClient();
        const storedOrgId =
          typeof window !== 'undefined' ? localStorage.getItem('pointage_org_id') : null;
        const targetOrgId = storedOrgId || '53055b65-de5a-40af-9f1c-d27bd83e7c68';

        const { data: org } = await supabase
          .from('pointage_organizations')
          .select('id, name, org_code, security_config')
          .eq('id', targetOrgId)
          .maybeSingle();

        if (org) {
          setOrgName(org.name || 'PointagePro');
          setOrgCode(org.org_code || 'ORG-PRO');
          setDemoOrgInput(org.org_code || 'ORG-PRO');
          const sc = (org.security_config || {}) as Record<string, any>;
          if (sc.org_logo) setOrgLogo(sc.org_logo);
          if (sc.admission_policy) setAdmissionPolicy(sc.admission_policy);
          if (Array.isArray(sc.holidays)) setHolidays(sc.holidays);
          if (sc.latest_broadcast) setLatestBroadcast(sc.latest_broadcast);
        }

        const { data: emps } = await supabase
          .from('pointage_employees')
          .select('id, full_name, employee_matricule, role, is_enrolled, device_model, face_update_count, default_establishment_id, pointage_establishments(name)')
          .eq('org_id', targetOrgId)
          .eq('is_active', true)
          .order('full_name')
          .limit(20);

        if (emps && emps.length > 0) {
          setEmployees(emps);
          setSelectedEmpId(emps[0].id);
        }

        const { data: logs } = await supabase
          .from('pointage_logs')
          .select('id, punch_type, recorded_at, distance_to_site_meters, status, employee_id')
          .eq('org_id', targetOrgId)
          .order('recorded_at', { ascending: false })
          .limit(15);
        if (logs) setPunches(logs);

        const empIds = (emps || []).map((e: any) => e.id);
        if (empIds.length > 0) {
          const { data: justs } = await supabase
            .from('pointage_justifications')
            .select('id, reason_text, status, created_at, employee_id')
            .in('employee_id', empIds)
            .order('created_at', { ascending: false })
            .limit(12);
          if (justs) setJustifications(justs);
        }
      } catch {
        // Fallback silencieux si hors-ligne
      }
    };
    loadPreviewData();
  }, []);

  const currentEmp = useMemo(() => {
    return (
      employees.find((e) => e.id === selectedEmpId) || {
        id: 'demo',
        full_name: 'TRAORE Amadou',
        employee_matricule: 'MAT-2026-001',
        role: 'Collaborateur',
        device_model: 'Android Sécurisé',
        face_update_count: 1,
        pointage_establishments: { name: 'Siège Principal' }
      }
    );
  }, [employees, selectedEmpId]);

  const initials = useMemo(() => {
    const parts = String(currentEmp.full_name || 'CP').trim().split(/\s+/);
    return parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }, [currentEmp.full_name]);

  const handleSimulatePunch = () => {
    if (!isInZone) {
      showToast('⚠️ Hors zone GPS : rapprochez-vous du site ou justifiez votre absence.');
      return;
    }
    const hhmm = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (workPhase === 'notArrived') {
      setWorkPhase('working');
      setDayTimeline((p) => ({ ...p, checkIn: hhmm }));
      showToast(`✅ Arrivée enregistrée à ${hhmm} (GPS + Wi-Fi certifiés)`);
    } else if (workPhase === 'working') {
      setWorkPhase('onBreak');
      setDayTimeline((p) => ({ ...p, breakStart: hhmm }));
      showToast(`☕ Départ en pause enregistré à ${hhmm}`);
    } else if (workPhase === 'onBreak') {
      setWorkPhase('completed');
      setDayTimeline((p) => ({ ...p, breakEnd: hhmm, checkOut: undefined }));
      showToast(`⚡ Reprise enregistrée à ${hhmm}`);
    } else {
      setWorkPhase('notArrived');
      setDayTimeline({});
      showToast('🔄 Simulation journée réinitialisée');
    }
  };

  const handleCloseDay = () => {
    const hhmm = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    setWorkPhase('completed');
    setDayTimeline((p) => ({ ...p, checkOut: hhmm }));
    showToast(`🏁 Fin de journée certifiée à ${hhmm}`);
  };

  const handleCreateDemoJustif = (e: React.FormEvent) => {
    e.preventDefault();
    if (!justifText.trim()) return;
    setJustifications((prev) => [
      {
        id: `demo-${Date.now()}`,
        reason_text: `[${justifCategory}] ${justifText.trim()}`,
        status: 'PENDING',
        created_at: new Date().toISOString()
      },
      ...prev
    ]);
    setJustifText('');
    setShowJustifModal(false);
    setActiveTab('demandes');
    showToast('📩 Justification transmise à votre Gérant (visible dans Arbitrage)');
  };

  const progressPct =
    workPhase === 'notArrived' ? 0 : workPhase === 'working' ? 45 : workPhase === 'onBreak' ? 65 : 100;

  return (
    <div className="min-h-screen bg-[#F4F7FD] text-slate-900 p-4 sm:p-6 flex flex-col items-center gap-5">
      {/* Barre de Contrôle Maquette (Parité visuelle avec /maquette-gerant) */}
      <div className="w-full max-w-5xl bg-white border border-slate-200/90 rounded-3xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#1D4ED8] text-white flex items-center justify-center shadow-sm">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-sm sm:text-base text-slate-900">
                Proposition Maquette — App Employé Mobile
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#1D4ED8] border border-blue-200 text-[10px] font-extrabold">
                Harmonie 100% App Gérant
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Même charte Royal Blue #1D4ED8, pilule de navigation unifiée, timeline 4 temps et onglet Demandes en direct.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setScreenMode('app')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                screenMode === 'app' ? 'bg-[#1D4ED8] text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              Espace Employé
            </button>
            <button
              type="button"
              onClick={() => setScreenMode('enrollment')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                screenMode === 'enrollment' ? 'bg-[#1D4ED8] text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              Connexion / Enrôlement
            </button>
          </div>

          <button
            type="button"
            onClick={() => setDeviceFrame((f) => (f === 'phone' ? 'fullscreen' : 'phone'))}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>{deviceFrame === 'phone' ? 'Élargir' : 'Vue iPhone'}</span>
          </button>

          <Link
            href="/maquette-gerant"
            className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1D4ED8] border border-blue-200 text-[11px] font-extrabold"
          >
            Comparer avec Maquette Gérant →
          </Link>
        </div>
      </div>

      {/* Contrôles de test rapide de la maquette */}
      <div className="w-full max-w-5xl bg-white/80 border border-slate-200 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">
            Simulateur Réel :
          </span>
          {employees.length > 0 && (
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.employee_matricule || 'SANS MAT.'})
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => {
              const next = !isInZone;
              setIsInZone(next);
              setDistanceMeters(next ? 14 : 265);
            }}
            className={`px-2.5 py-1 rounded-lg font-bold border cursor-pointer ${
              isInZone
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            {isInZone ? '📍 GPS Dans la zone (14m)' : '📍 Simuler Hors Zone (265m)'}
          </button>
          <button
            type="button"
            onClick={() => setWifiConnected((w) => !w)}
            className={`px-2.5 py-1 rounded-lg font-bold border cursor-pointer ${
              wifiConnected
                ? 'bg-blue-50 text-[#1D4ED8] border-blue-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {wifiConnected ? '📶 Wi-Fi Bureau OK' : '📶 Hors Wi-Fi'}
          </button>
        </div>
        <span className="text-slate-500 font-medium">
          Organisation connectée : <strong className="text-slate-800">{orgName}</strong> ({orgCode})
        </span>
      </div>

      {/* CADRE SMARTPHONE */}
      <div
        className={`relative bg-[#F8FAFC] border-[8px] border-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.22)] flex flex-col overflow-hidden transition-all duration-300 ${
          deviceFrame === 'phone'
            ? 'w-full max-w-[392px] h-[790px] rounded-[46px]'
            : 'w-full max-w-[460px] min-h-[820px] rounded-[34px]'
        }`}
      >
        {/* Dynamic Toast */}
        {toast && (
          <div className="absolute top-12 left-4 right-4 z-50 bg-slate-900 text-white text-[11px] font-bold px-3.5 py-2.5 rounded-2xl shadow-xl text-center animate-fadeIn">
            {toast}
          </div>
        )}

        {screenMode === 'enrollment' ? (
          /* ===================== VUE CONNEXION / ENRÔLEMENT SIMPLIFIÉ ===================== */
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F4F7FD]">
            {/* Hero Bleu Royal identique Maquette Gérant */}
            <div className="bg-linear-to-br from-[#1D4ED8] via-[#2563EB] to-[#3B82F6] rounded-3xl p-5 text-white text-center space-y-2 shadow-lg shadow-blue-500/25">
              <div className="w-12 h-12 rounded-2xl bg-white text-[#1D4ED8] mx-auto flex items-center justify-center shadow-sm">
                <Fingerprint className="w-7 h-7" />
              </div>
              <h2 className="font-black text-lg tracking-tight">PointagePro Collaborateur</h2>
              <p className="text-[11px] text-blue-100">
                Connexion rapide et sécurisée (sans date de naissance)
              </p>
            </div>

            {/* 3 onglets segmentés */}
            <div className="bg-white p-1 rounded-2xl border border-slate-200 grid grid-cols-3 gap-1 text-[10px] font-extrabold">
              {[
                { id: 'scan', label: 'Scanner QR' },
                { id: 'org', label: 'Établissement' },
                { id: 'reverse', label: 'Mode Inverse' }
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setEnrollTab(t.id as any)}
                  className={`py-2 rounded-xl transition cursor-pointer ${
                    enrollTab === t.id ? 'bg-[#1D4ED8] text-white shadow-xs' : 'text-slate-500'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {enrollTab === 'org' && (
              <div className="bg-white rounded-3xl p-4 border border-slate-200 space-y-3 shadow-xs">
                <div>
                  <span className="font-black text-sm text-slate-900 block">Rejoindre mon Établissement</span>
                  <span className="text-[11px] text-slate-500">
                    Politique détectée automatiquement depuis le code entreprise
                  </span>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">
                    Code Établissement *
                  </label>
                  <input
                    value={demoOrgInput}
                    onChange={(e) => setDemoOrgInput(e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono font-black text-slate-900"
                  />
                </div>

                {/* Choix test des 3 modes */}
                <div className="flex items-center gap-1 text-[9px] font-bold">
                  {(['STRICT', 'MODERATE', 'OPEN'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setAdmissionPolicy(p)}
                      className={`flex-1 py-1 rounded-lg border cursor-pointer ${
                        admissionPolicy === p
                          ? 'bg-blue-50 border-[#1D4ED8] text-[#1D4ED8]'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      {p === 'STRICT' ? 'Strict' : p === 'MODERATE' ? 'Approbation' : 'Ouvert'}
                    </button>
                  ))}
                </div>

                <div
                  className={`p-2.5 rounded-xl border text-[10.5px] font-bold ${
                    admissionPolicy === 'OPEN'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : admissionPolicy === 'MODERATE'
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-blue-50 border-blue-200 text-[#1D4ED8]'
                  }`}
                >
                  {admissionPolicy === 'OPEN'
                    ? `${orgName} • Mode Ouvert : accès immédiat sans matricule requis`
                    : admissionPolicy === 'MODERATE'
                      ? `${orgName} • Approbation Gérant : matricule facultatif`
                      : `${orgName} • Mode Strict : matricule officiel requis`}
                </div>

                {admissionPolicy !== 'STRICT' && (
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">
                      Votre Nom & Prénoms
                    </label>
                    <input
                      value={demoNameInput}
                      onChange={(e) => setDemoNameInput(e.target.value)}
                      placeholder="Ex: OUEDRAOGO Moussa"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">
                    {admissionPolicy === 'STRICT'
                      ? 'Votre Matricule Officiel *'
                      : 'Matricule (Facultatif si non fourni)'}
                  </label>
                  <input
                    value={demoMatInput}
                    onChange={(e) => setDemoMatInput(e.target.value.toUpperCase())}
                    placeholder={
                      admissionPolicy === 'STRICT'
                        ? 'Ex: MAT-2026-001'
                        : 'Laissez vide si vous n’avez pas de matricule'
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setScreenMode('app');
                    showToast('✅ Connexion simulée avec succès !');
                  }}
                  className="w-full py-3 bg-[#1D4ED8] hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  {admissionPolicy === 'OPEN'
                    ? 'Rejoindre Maintenant'
                    : admissionPolicy === 'MODERATE'
                      ? 'Envoyer ma Demande au Gérant'
                      : 'Vérifier & Lier ce Smartphone'}
                </button>
              </div>
            )}

            {enrollTab === 'scan' && (
              <div className="bg-white rounded-3xl p-5 border border-slate-200 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1D4ED8] mx-auto flex items-center justify-center">
                  <QrCode className="w-6 h-6" />
                </div>
                <p className="font-black text-sm text-slate-900">Scanner QR Code ou Affiche A4</p>
                <p className="text-[11px] text-slate-500">
                  Décode automatiquement les QR codes personnels (PPRO-...) ET les QR d&apos;établissement (?org=...).
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEnrollTab('org');
                    showToast('📷 QR Code Établissement décodé -> Onglet Établissement pré-rempli');
                  }}
                  className="w-full py-2.5 bg-[#1D4ED8] text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Simuler Scan QR Code
                </button>
              </div>
            )}

            {enrollTab === 'reverse' && (
              <div className="bg-white rounded-3xl p-5 border border-slate-200 text-center space-y-3">
                <p className="font-black text-sm text-slate-900">Présenter ce QR au Gérant</p>
                <p className="text-[11px] text-slate-500">
                  Le Gérant scanne votre téléphone depuis Personnel → Scanner Smartphone et votre session s&apos;ouvre en 4 secondes.
                </p>
                <div className="w-36 h-36 mx-auto rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center">
                  <Scan className="w-12 h-12 text-[#1D4ED8]" />
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ===================== APPLICATION EMPLOYÉ HARMONISÉE ===================== */
          <>
            {/* HEADER BLEU ROYAL UNIFIÉ (Même signature visuelle que Maquette Gérant) */}
            <header className="bg-[#1D4ED8] text-white px-4 pt-4 pb-3.5 shrink-0 shadow-md">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  {orgLogo ? (
                    <img
                      src={orgLogo}
                      alt={orgName}
                      className="w-9 h-9 rounded-2xl object-cover bg-white border border-white/30 shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center font-black text-xs shrink-0">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-xs truncate">{currentEmp.full_name}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    </div>
                    <span className="text-[10px] text-blue-100 block truncate">
                      {orgName} • {currentEmp.employee_matricule || 'Agent'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAnnouncementsModal(true)}
                  className="relative w-9 h-9 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center transition cursor-pointer shrink-0"
                  title="Annonces de la Direction"
                >
                  <Bell className="w-4 h-4 text-white" />
                  {latestBroadcast && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-[#1D4ED8]" />
                  )}
                </button>
              </div>
            </header>

            {/* CORPS PRINCIPAL */}
            <div className="flex-1 overflow-y-auto px-3.5 py-3.5 space-y-3 pb-24">
              {/* Bannière Alerte Push Direction si active */}
              {latestBroadcast && activeTab === 'pointage' && (
                <button
                  type="button"
                  onClick={() => setShowAnnouncementsModal(true)}
                  className="w-full text-left p-2.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-2 shadow-2xs cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                      <Bell className="w-3.5 h-3.5" />
                    </span>
                    <div className="min-w-0">
                      <span className="text-[10px] font-black text-amber-900 block">Annonce Direction</span>
                      <span className="text-[11px] text-amber-800 truncate block">{latestBroadcast.message}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-600 shrink-0" />
                </button>
              )}

              {/* ONGLET 1 : POINTAGE */}
              {activeTab === 'pointage' && (
                <div className="space-y-3 animate-fadeIn">
                  {/* Hero Statut + Horloge + Géofence unifiés */}
                  <div className="bg-linear-to-br from-[#1D4ED8] via-[#2563EB] to-[#3B82F6] rounded-[26px] p-4 text-white shadow-lg shadow-blue-500/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-blue-100 font-bold block">
                          Horloge Certifiée
                        </span>
                        <span className="font-mono font-black text-2xl tracking-tight">{nowClock}</span>
                      </div>
                      <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/25 flex flex-col items-center justify-center">
                        <span className="font-black text-sm">{progressPct}%</span>
                        <span className="text-[8px] uppercase text-blue-100">Shift</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                      <span
                        className={`px-2.5 py-1 rounded-full flex items-center gap-1 ${
                          isInZone ? 'bg-emerald-500/25 text-emerald-100' : 'bg-rose-500/35 text-rose-100'
                        }`}
                      >
                        <MapPin className="w-3 h-3" />
                        {isInZone ? `Dans la zone (${distanceMeters}m)` : `Hors zone (${distanceMeters}m)`}
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-white/15 text-blue-50 flex items-center gap-1">
                        <Wifi className="w-3 h-3" />
                        {wifiConnected ? 'Wi-Fi Site OK' : 'GPS seul'}
                      </span>
                    </div>
                  </div>

                  {/* Carte Action Héroïque du Pouce */}
                  <div className="bg-white border border-slate-200/90 rounded-[26px] p-4 shadow-xs flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleSimulatePunch}
                      className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg shrink-0 transition active:scale-95 cursor-pointer ${
                        workPhase === 'notArrived'
                          ? 'bg-emerald-600 shadow-emerald-500/30'
                          : workPhase === 'working'
                            ? 'bg-[#1D4ED8] shadow-blue-500/30'
                            : workPhase === 'onBreak'
                              ? 'bg-indigo-600 shadow-indigo-500/30'
                              : 'bg-slate-600 shadow-slate-500/25'
                      }`}
                    >
                      <Fingerprint className="w-7 h-7" />
                    </button>

                    <div className="flex-1 min-w-0">
                      <span className="font-black text-sm text-slate-900 block">
                        {workPhase === 'notArrived'
                          ? 'Pointer mon Arrivée'
                          : workPhase === 'working'
                            ? 'Départ Pause Déjeuner'
                            : workPhase === 'onBreak'
                              ? 'Reprise de Poste'
                              : 'Journée en cours / Clôturer'}
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Site : {currentEmp.pointage_establishments?.name || 'Siège Principal'} • 07h30 - 17h30
                      </span>
                    </div>

                    {workPhase !== 'notArrived' && !dayTimeline.checkOut && (
                      <button
                        type="button"
                        onClick={handleCloseDay}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-extrabold cursor-pointer shrink-0"
                      >
                        Sortie
                      </button>
                    )}
                  </div>

                  {/* NOUVEAUTÉ PROPOSITION : Timeline 4 Temps du Jour */}
                  <div className="bg-white border border-slate-200/90 rounded-3xl p-3.5 space-y-2.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-slate-900 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#1D4ED8]" />
                        Ma Journée en Direct (4 Temps)
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">Aujourd&apos;hui</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 text-center">
                      {[
                        { label: 'Arrivée', val: dayTimeline.checkIn },
                        { label: 'Pause', val: dayTimeline.breakStart },
                        { label: 'Reprise', val: dayTimeline.breakEnd },
                        { label: 'Départ', val: dayTimeline.checkOut }
                      ].map((slot) => (
                        <div
                          key={slot.label}
                          className={`p-2 rounded-2xl border ${
                            slot.val
                              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                              : 'bg-slate-50 border-slate-100 text-slate-400'
                          }`}
                        >
                          <span className="text-[9px] font-bold uppercase block">{slot.label}</span>
                          <span className="font-mono font-black text-xs mt-0.5 block">
                            {slot.val || '--:--'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* NOUVEAUTÉ PROPOSITION : Raccourcis Rapides (Alignés Cockpit Gérant) */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setShowJustifModal(true)}
                      className="p-3 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 text-left space-y-1 shadow-2xs cursor-pointer transition"
                    >
                      <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                        <FileCheck2 className="w-4 h-4" />
                      </div>
                      <span className="font-extrabold text-xs text-slate-900 block">Justifier</span>
                      <span className="text-[10px] text-slate-500 block">Retard ou absence</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowColleagueModal(true)}
                      className="p-3 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 text-left space-y-1 shadow-2xs cursor-pointer transition"
                    >
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                      <span className="font-extrabold text-xs text-slate-900 block">Aider Collègue</span>
                      <span className="text-[10px] text-slate-500 block">Pointage assisté</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ONGLET 2 : ACTIVITÉ */}
              {activeTab === 'activite' && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white border border-slate-200 rounded-2xl p-3">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Ponctualité</span>
                      <span className="font-black text-base text-emerald-600">98%</span>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-3">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Semaine</span>
                      <span className="font-black text-base text-[#1D4ED8]">38.5h</span>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-3">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Retards</span>
                      <span className="font-black text-base text-amber-600">0 min</span>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-3xl p-3.5 space-y-2 shadow-xs">
                    <span className="font-black text-xs text-slate-900 block">
                      Derniers Pointages Certifiés ({punches.length})
                    </span>
                    {punches.length === 0 ? (
                      <p className="text-[11px] text-slate-400 py-4 text-center">
                        Aucun pointage enregistré récemment sur ce compte.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {punches.slice(0, 6).map((p) => (
                          <div
                            key={p.id}
                            className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-[11px]"
                          >
                            <div>
                              <span className="font-extrabold text-slate-800 block">{p.punch_type}</span>
                              <span className="text-[10px] text-slate-500">
                                {new Date(p.recorded_at).toLocaleString('fr-FR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                              {p.distance_to_site_meters ?? 0}m
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ONGLET 3 : DEMANDES / JUSTIFICATIFS (NOUVEAUTÉ PROPOSITION) */}
              {activeTab === 'demandes' && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-black text-sm text-slate-900 block">Mes Demandes & Justificatifs</span>
                      <span className="text-[10px] text-slate-500">
                        Suivi en temps réel des réponses de votre Gérant
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowJustifModal(true)}
                      className="px-3 py-1.5 rounded-xl bg-[#1D4ED8] text-white font-bold text-[11px] cursor-pointer"
                    >
                      + Nouveau
                    </button>
                  </div>

                  <div className="space-y-2">
                    {justifications.length === 0 ? (
                      <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center text-[11px] text-slate-500">
                        Aucune demande envoyée pour l&apos;instant.
                      </div>
                    ) : (
                      justifications.map((j) => (
                        <div
                          key={j.id}
                          className="bg-white border border-slate-200 rounded-2xl p-3 space-y-1.5 shadow-2xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(j.created_at).toLocaleDateString('fr-FR')}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                                j.status === 'APPROVED'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : j.status === 'REJECTED'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {j.status === 'APPROVED'
                                ? 'Approuvé'
                                : j.status === 'REJECTED'
                                  ? 'Refusé'
                                  : 'En attente'}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-800">{j.reason_text}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ONGLET 4 : PROFIL & SÉCURITÉ */}
              {activeTab === 'profil' && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="bg-white border border-slate-200 rounded-3xl p-4 space-y-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#1D4ED8] text-white font-black flex items-center justify-center">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <span className="font-black text-sm text-slate-900 block truncate">
                          {currentEmp.full_name}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          {currentEmp.employee_matricule || 'SANS MATRICULE'} • {orgName}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Smartphone Lié</span>
                        <span className="font-bold text-slate-800 truncate block">
                          {currentEmp.device_model || 'Android Sécurisé'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Biométrie Face</span>
                        <span className="font-bold text-emerald-700 block">
                          {currentEmp.face_update_count || 0}/2 utilisations
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Jours fériés entreprise synchronisés */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-4 space-y-2 shadow-xs">
                    <span className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                      <CalendarDays className="w-4 h-4 text-[#1D4ED8]" />
                      Jours Fériés & Exemptions ({holidays.length})
                    </span>
                    {holidays.length === 0 ? (
                      <p className="text-[11px] text-slate-500">Aucun jour férié configuré prochainement.</p>
                    ) : (
                      <div className="space-y-1">
                        {holidays.slice(0, 4).map((h: any) => (
                          <div
                            key={h.id || h.date}
                            className="flex items-center justify-between text-[11px] bg-slate-50 px-2.5 py-1.5 rounded-xl"
                          >
                            <span className="font-bold text-slate-800">{h.name}</span>
                            <span className="font-mono text-slate-500 text-[10px]">{h.date}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setScreenMode('enrollment')}
                    className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Tester Écran Connexion / Enrôlement</span>
                  </button>
                </div>
              )}
            </div>

            {/* BARRE DE NAVIGATION FLOTTANTE BLEUE UNIE À BORDS ARRONDIS (100% IDENTIQUE MAQUETTE GÉRANT) */}
            <div className="px-3 pt-1.5 pb-2 bg-[#F8FAFC] shrink-0 z-30">
              <div className="bg-[#1D4ED8] border-2 border-[#60A5FA]/70 rounded-[26px] px-1.5 py-1.5 flex items-center justify-between gap-0.5 shadow-[0_10px_28px_rgba(29,78,216,0.35)]">
                {([
                  { id: 'pointage', label: 'Pointage', Icon: Fingerprint, badge: 0 },
                  { id: 'activite', label: 'Activité', Icon: Activity, badge: 0 },
                  {
                    id: 'demandes',
                    label: 'Demandes',
                    Icon: FileCheck2,
                    badge: justifications.filter((j) => j.status === 'PENDING').length
                  },
                  { id: 'profil', label: 'Profil', Icon: User, badge: 0 }
                ] as const).map(({ id, label, Icon, badge }) => {
                  const isActive = activeTab === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setActiveTab(id)}
                      className={`flex-1 min-w-0 flex flex-col items-center py-1.5 px-1.5 rounded-2xl cursor-pointer relative transition-all duration-300 active:scale-90 ${
                        isActive
                          ? 'bg-white text-[#1D4ED8] shadow-[0_4px_12px_rgba(15,23,42,0.18)] -translate-y-0.5'
                          : 'text-white/85 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="text-[9.5px] font-extrabold mt-0.5 truncate">{label}</span>
                      {badge > 0 && (
                        <span className="absolute top-1 right-2 bg-amber-400 text-slate-950 font-black text-[8px] px-1 rounded-full">
                          {badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* MODALE JUSTIFICATION */}
        {showJustifModal && (
          <div className="absolute inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end">
            <form
              onSubmit={handleCreateDemoJustif}
              className="bg-white w-full rounded-t-[28px] p-4 space-y-3 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <span className="font-black text-xs text-slate-900">Justifier un Retard / Absence</span>
                <button
                  type="button"
                  onClick={() => setShowJustifModal(false)}
                  className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <select
                value={justifCategory}
                onChange={(e) => setJustifCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
              >
                <option>Transport / Embouteillage</option>
                <option>Rendez-vous Médical</option>
                <option>Mission Externe</option>
                <option>Autre Motif</option>
              </select>
              <textarea
                rows={3}
                value={justifText}
                onChange={(e) => setJustifText(e.target.value)}
                placeholder="Expliquez brièvement le motif à votre responsable..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-[#1D4ED8] text-white font-extrabold text-xs rounded-xl cursor-pointer"
              >
                Envoyer pour Arbitrage Gérant
              </button>
            </form>
          </div>
        )}

        {/* MODALE AIDE COLLÈGUE */}
        {showColleagueModal && (
          <div className="absolute inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end">
            <div className="bg-white w-full rounded-t-[28px] p-4 space-y-3 shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="font-black text-xs text-slate-900">Assistance Collègue (Selfie Vérifié)</span>
                <button
                  type="button"
                  onClick={() => setShowColleagueModal(false)}
                  className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Permet d&apos;aider un collaborateur dont le téléphone est déchargé en capturant sa vérification faciale.
              </p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {employees.slice(0, 5).map((col) => (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => {
                      setShowColleagueModal(false);
                      showToast(`📸 Assistance simulée prête pour ${col.full_name}`);
                    }}
                    className="w-full p-2.5 rounded-2xl bg-slate-50 hover:bg-blue-50 border border-slate-100 flex items-center justify-between text-xs font-bold cursor-pointer"
                  >
                    <span>{col.full_name}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODALE CENTRE ANNONCES DIRECTION (FCM) */}
        {showAnnouncementsModal && (
          <div className="absolute inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end">
            <div className="bg-white w-full rounded-t-[28px] p-4 space-y-3 shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-[#1D4ED8]" />
                  Annonces de la Direction (FCM Push)
                </span>
                <button
                  type="button"
                  onClick={() => setShowAnnouncementsModal(false)}
                  className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {latestBroadcast ? (
                <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 space-y-1">
                  <span className="text-[10px] font-extrabold text-[#1D4ED8] block">
                    De : {latestBroadcast.sender || 'Direction'}
                  </span>
                  <p className="text-xs font-semibold text-slate-800">{latestBroadcast.message}</p>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 py-3 text-center">
                  Aucune annonce active pour le moment. Les messages push envoyés par le Gérant apparaîtront ici même téléphone verrouillé.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
