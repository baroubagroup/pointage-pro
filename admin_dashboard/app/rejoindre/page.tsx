'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  Smartphone,
  Download,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  UserPlus,
  Clock
} from 'lucide-react';

const APK_CDN_URL = 'https://ylrnxuphtaoazlhlmnsd.supabase.co/storage/v1/object/public/apk_downloads/pointage-pro-v9.apk';

function RejoindreContent() {
  const searchParams = useSearchParams();
  const initialToken = searchParams.get('token') || '';
  const org = searchParams.get('org') || 'ORG-8492';
  const initialMat = searchParams.get('mat') || '';
  const nameParam = searchParams.get('name') || '';

  const [token, setToken] = useState(initialToken);
  const [mat, setMat] = useState(initialMat);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedMat, setCopiedMat] = useState(false);
  const [deepLinkTriggered, setDeepLinkTriggered] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  const [orgLogo, setOrgLogo] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>(nameParam || 'PointagePro');
  const [admissionPolicy, setAdmissionPolicy] = useState<'STRICT' | 'MODERATE' | 'OPEN'>('STRICT');
  const [orgLoadError, setOrgLoadError] = useState<string | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);

  // Formulaire auto-enrôlement (quand on scanne le Kit Flash sans token personnel)
  const [selfName, setSelfName] = useState('');
  const [selfPhone, setSelfPhone] = useState('');
  const [selfMat, setSelfMat] = useState(initialMat);
  const [selfSecret, setSelfSecret] = useState('');
  const [submittingSelf, setSubmittingSelf] = useState(false);
  const [selfError, setSelfError] = useState<string | null>(null);
  const [selfSuccessMsg, setSelfSuccessMsg] = useState<string | null>(null);
  const [selfPendingApproval, setSelfPendingApproval] = useState(false);

  useEffect(() => {
    let active = true;
    const loadOrg = async () => {
      setLoadingOrg(true);
      try {
        const res = await fetch(`/api/enroll/self?org=${encodeURIComponent(org)}`);
        const data = await res.json();
        if (!active) return;
        if (data?.success && data.org) {
          setOrgName(data.org.name || nameParam || 'PointagePro');
          setOrgLogo(data.org.org_logo || null);
          setAdmissionPolicy(data.org.admission_policy || 'STRICT');
          setOrgLoadError(null);
        } else {
          setOrgLoadError(data?.error || 'Code établissement invalide ou désactivé.');
        }
      } catch {
        if (typeof window !== 'undefined') {
          const localLogo = localStorage.getItem('pointage_org_logo');
          if (localLogo) setOrgLogo(localLogo);
          const localName = localStorage.getItem('pointage_org_name');
          if (localName) setOrgName(localName);
        }
      } finally {
        if (active) setLoadingOrg(false);
      }
    };
    loadOrg();
    return () => {
      active = false;
    };
  }, [org, nameParam]);

  const androidIntentUrl = `intent://join?token=${encodeURIComponent(token)}&org=${encodeURIComponent(org)}&mat=${encodeURIComponent(mat)}#Intent;scheme=pointagepro;package=com.barouba.pointage_mobile;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end`;
  const customSchemeUrl = `pointagepro://join?token=${encodeURIComponent(token)}&org=${encodeURIComponent(org)}&mat=${encodeURIComponent(mat)}`;

  const handleLaunchApp = () => {
    setDeepLinkTriggered(true);
    const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
    window.location.href = isAndroid ? androidIntentUrl : customSchemeUrl;
    setTimeout(() => {
      setShowInstallPrompt(true);
    }, 2200);
  };

  const copyToClipboard = (text: string, type: 'token' | 'mat') => {
    navigator.clipboard.writeText(text);
    if (type === 'token') {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } else {
      setCopiedMat(true);
      setTimeout(() => setCopiedMat(false), 2000);
    }
  };

  const handleSelfEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSelfError(null);
    setSelfSuccessMsg(null);
    setSelfPendingApproval(false);
    setSubmittingSelf(true);

    try {
      const res = await fetch('/api/enroll/self', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_code: org,
          full_name: selfName,
          matricule: selfMat,
          phone: selfPhone,
          secret: selfSecret
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setSelfError(data?.error || 'Impossible de valider votre enrôlement.');
        return;
      }

      if (data.token) setToken(data.token);
      if (data.matricule) setMat(data.matricule);
      setSelfSuccessMsg(data.message);
      setSelfPendingApproval(data.status === 'PENDING_APPROVAL');
    } catch {
      setSelfError('Erreur réseau lors de la vérification serveur.');
    } finally {
      setSubmittingSelf(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FD] text-slate-800 flex flex-col items-center justify-between p-4 sm:p-6 font-sans">
      {/* En-tête officiel */}
      <header className="w-full max-w-md flex items-center justify-between py-4">
        <div className="flex items-center gap-2.5">
          {orgLogo ? (
            <img
              src={orgLogo}
              alt={orgName}
              className="w-10 h-10 rounded-2xl object-cover shadow-md border border-slate-200 bg-white"
            />
          ) : (
            <div className="w-10 h-10 rounded-2xl bg-[#1D4ED8] flex items-center justify-center font-black text-white text-lg shadow-md">
              {orgName.slice(0, 1) || 'P'}
            </div>
          )}
          <div>
            <h1 className="text-base font-extrabold text-slate-900 leading-tight">{orgName}</h1>
            <p className="text-[11px] text-slate-500">Portail d&apos;Activation Mobile</p>
          </div>
        </div>
        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Certifié WGS84</span>
        </span>
      </header>

      {/* Contenu Principal */}
      <main className="w-full max-w-md my-auto py-4">
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 space-y-6">
          {/* Badge & Titre */}
          <div className="text-center space-y-2">
            {orgLogo ? (
              <img
                src={orgLogo}
                alt={orgName}
                className="w-16 h-16 rounded-2xl object-cover mx-auto shadow-md border border-slate-200 bg-white"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#1D4ED8] border border-blue-100 flex items-center justify-center mx-auto shadow-inner">
                <Sparkles className="w-7 h-7" />
              </div>
            )}
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Activation de votre Compte
            </h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              Espace d&apos;enrôlement officiel de <strong>{orgName}</strong>.
            </p>
          </div>

          {orgLoadError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
              <div className="font-extrabold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Lien ou Code Invalide / Désactivé</span>
              </div>
              <p className="text-[11px] leading-snug">{orgLoadError}</p>
            </div>
          )}

          {/* Fiche Identifiants */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Identifiants d&apos;Enrôlement
              </span>
              <span className="text-[10px] font-bold text-[#1D4ED8] bg-blue-100/70 px-2 py-0.5 rounded-full">
                {loadingOrg
                  ? 'Vérification...'
                  : admissionPolicy === 'STRICT'
                    ? 'Mode Strict'
                    : admissionPolicy === 'MODERATE'
                      ? 'Approbation Manuelle'
                      : 'Mode Ouvert'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-semibold block">Code Établissement</span>
                <span className="font-mono font-black text-[#1D4ED8] text-xs break-all">{org}</span>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 font-semibold block">Votre Matricule</span>
                  <span className="font-mono font-black text-slate-800 text-xs truncate block">
                    {mat || 'À renseigner'}
                  </span>
                </div>
                {mat && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(mat, 'mat')}
                    className="p-1 text-slate-400 hover:text-slate-700 transition cursor-pointer shrink-0"
                    title="Copier le matricule"
                  >
                    {copiedMat ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>

            {token && (
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-blue-700 font-bold block">Jeton Unique d&apos;Activation</span>
                  <span className="font-mono font-black text-blue-900 text-base tracking-wider">{token}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(token, 'token')}
                  className="px-3 py-1.5 bg-[#1D4ED8] hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedToken ? 'Copié !' : 'Copier'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Formulaire interactif si arrivé via Kit Flash (sans token individuel) */}
          {!orgLoadError && !token && (
            <form onSubmit={handleSelfEnroll} className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900">
                <UserPlus className="w-4 h-4 text-[#1D4ED8]" />
                <span>
                  {admissionPolicy === 'STRICT'
                    ? 'Vérifier mon Matricule RH'
                    : admissionPolicy === 'MODERATE'
                      ? 'Demander mon Accès (Approbation RH)'
                      : 'Inscription Rapide (Accès Immédiat)'}
                </span>
              </div>

              {admissionPolicy !== 'STRICT' && (
                <>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Nom & Prénoms *</label>
                    <input
                      type="text"
                      required
                      value={selfName}
                      onChange={(e) => setSelfName(e.target.value)}
                      placeholder="Ex: OUEDRAOGO Moussa"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Téléphone WhatsApp</label>
                    <input
                      type="tel"
                      value={selfPhone}
                      onChange={(e) => setSelfPhone(e.target.value)}
                      placeholder="+226 70 00 00 00"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  {admissionPolicy === 'STRICT' ? 'Votre Matricule Officiel *' : 'Matricule (optionnel)'}
                </label>
                <input
                  type="text"
                  required={admissionPolicy === 'STRICT'}
                  value={selfMat}
                  onChange={(e) => setSelfMat(e.target.value.toUpperCase())}
                  placeholder="Ex: MAT-2026-001"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                />
              </div>

              {admissionPolicy === 'STRICT' && (
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    Code Secret / 4 derniers chiffres tél. (si requis)
                  </label>
                  <input
                    type="text"
                    value={selfSecret}
                    onChange={(e) => setSelfSecret(e.target.value)}
                    placeholder="Optionnel selon fiche RH"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                  />
                </div>
              )}

              {selfError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] font-bold text-rose-700">
                  {selfError}
                </div>
              )}

              <button
                type="submit"
                disabled={submittingSelf}
                className="w-full py-2.5 bg-[#1D4ED8] hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-60 shadow-sm"
              >
                {submittingSelf
                  ? 'Vérification en cours...'
                  : admissionPolicy === 'STRICT'
                    ? 'Valider mon Matricule'
                    : admissionPolicy === 'MODERATE'
                      ? 'Envoyer ma Demande'
                      : 'Activer mon Accès Immédiat'}
              </button>
            </form>
          )}

          {selfSuccessMsg && (
            <div
              className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
                selfPendingApproval
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              <div className="font-extrabold flex items-center gap-1.5">
                {selfPendingApproval ? <Clock className="w-4 h-4 text-amber-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                <span>{selfPendingApproval ? 'En attente d’approbation' : 'Profil prêt !'}</span>
              </div>
              <p className="text-[11px] leading-snug">{selfSuccessMsg}</p>
            </div>
          )}

          {/* Boutons d'Action Principaux */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleLaunchApp}
              className="w-full group relative flex items-center justify-center gap-2.5 bg-[#1D4ED8] hover:bg-blue-700 active:scale-[0.98] text-white font-extrabold py-4 px-5 rounded-2xl shadow-lg shadow-blue-500/25 transition cursor-pointer text-sm"
            >
              <Smartphone className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Ouvrir dans l&apos;Application PointagePro</span>
            </button>

            {deepLinkTriggered && !showInstallPrompt && (
              <p className="text-[11px] text-center text-[#1D4ED8] font-semibold animate-fadeIn">
                Lancement de l&apos;application en cours...
              </p>
            )}

            {showInstallPrompt && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-2 animate-fadeIn">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>L&apos;application ne s&apos;est pas ouverte ?</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-snug">
                  Installez d&apos;abord l&apos;application PointagePro via le bouton ci-dessous.
                </p>
              </div>
            )}

            <a
              href={APK_CDN_URL}
              download="pointage-pro.apk"
              className="w-full flex items-center justify-center gap-2.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white font-bold py-3.5 px-5 rounded-2xl transition text-xs cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Télécharger l&apos;App Android (.APK)</span>
            </a>
          </div>
        </div>
      </main>

      <footer className="text-center py-3 text-xs text-slate-400 font-medium">
        PointagePro • Plateforme Sécurisée de Présence par Satellite WGS84
      </footer>
    </div>
  );
}

export default function RejoindrePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F4F7FD] flex items-center justify-center text-slate-400">Chargement...</div>}>
      <RejoindreContent />
    </Suspense>
  );
}
