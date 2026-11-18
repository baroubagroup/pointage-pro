'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  CheckCircle2, 
  Smartphone, 
  Download, 
  Copy, 
  Check, 
  ShieldCheck, 
  Sparkles,
  ArrowRight,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

const APK_CDN_URL = 'https://ylrnxuphtaoazlhlmnsd.supabase.co/storage/v1/object/public/apk_downloads/pointage-pro-v9.apk';

function RejoindreContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const org = searchParams.get('org') || 'ORG-8492';
  const mat = searchParams.get('mat') || '';

  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedMat, setCopiedMat] = useState(false);
  const [deepLinkTriggered, setDeepLinkTriggered] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [orgLogo, setOrgLogo] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>('PointagePro');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const localLogo = localStorage.getItem('pointage_org_logo');
      if (localLogo) setOrgLogo(localLogo);
      const localName = localStorage.getItem('pointage_org_name');
      if (localName) setOrgName(localName);
    }
  }, []);

  // 1. Android Intent URI (Standard officiel Chrome Android)
  const androidIntentUrl = `intent://join?token=${token}&org=${org}&mat=${encodeURIComponent(mat)}#Intent;scheme=pointagepro;package=com.example.pointage_mobile;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end`;

  // 2. Custom Scheme direct
  const customSchemeUrl = `pointagepro://join?token=${token}&org=${org}&mat=${encodeURIComponent(mat)}`;

  // Tenter l'ouverture de l'application
  const handleLaunchApp = () => {
    setDeepLinkTriggered(true);

    const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

    if (isAndroid) {
      window.location.href = androidIntentUrl;
    } else {
      window.location.href = customSchemeUrl;
    }

    // Si après 2.2 secondes la page est toujours au premier plan, l'app n'est probablement pas installée
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
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-white text-lg shadow-md shadow-blue-500/20">
              {orgName.slice(0, 1) || 'P'}
            </div>
          )}
          <div>
            <h1 className="text-base font-extrabold text-slate-900 leading-tight">{orgName}</h1>
            <p className="text-[11px] text-slate-500">Portail d'Activation Mobile</p>
          </div>
        </div>
        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Certifié WGS84</span>
        </span>
      </header>

      {/* Contenu Principal - Carte Bento Lumineuse */}
      <main className="w-full max-w-md my-auto py-4">
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 space-y-6">
          
          {/* Badge & Titre d'Accueil */}
          <div className="text-center space-y-2">
            {orgLogo ? (
              <img
                src={orgLogo}
                alt={orgName}
                className="w-16 h-16 rounded-2xl object-cover mx-auto shadow-md border border-slate-200 bg-white"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mx-auto shadow-inner">
                <Sparkles className="w-7 h-7" />
              </div>
            )}
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Activation de votre Compte
            </h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              Votre accès au système de pointage officiel de <strong>{orgName}</strong> a été préparé par votre établissement.
            </p>
          </div>

          {/* Fiche Récapitulative des Identifiants (Thème Clair) */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Vos Identifiants d'Enrôlement
              </span>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full">
                Prêt à l'emploi
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-semibold block">Code Établissement</span>
                <span className="font-mono font-black text-blue-600 text-sm">{org}</span>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block">Votre Matricule</span>
                  <span className="font-mono font-black text-slate-800 text-sm truncate max-w-[100px] block">
                    {mat || 'Attribué'}
                  </span>
                </div>
                {mat && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(mat, 'mat')}
                    className="p-1 text-slate-400 hover:text-slate-700 transition cursor-pointer"
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
                  <span className="text-[10px] text-blue-700 font-bold block">Jeton Unique d'Activation</span>
                  <span className="font-mono font-black text-blue-900 text-base tracking-wider">{token}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(token, 'token')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedToken ? 'Copié !' : 'Copier'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Boutons d'Action Principaux */}
          <div className="space-y-3">
            {/* Action 1 : Ouvrir l'Appli */}
            <button
              type="button"
              onClick={handleLaunchApp}
              className="w-full group relative flex items-center justify-center gap-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-extrabold py-4 px-5 rounded-2xl shadow-lg shadow-blue-500/25 transition cursor-pointer text-sm"
            >
              <Smartphone className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Ouvrir dans l'Application PointagePro</span>
            </button>

            {deepLinkTriggered && !showInstallPrompt && (
              <p className="text-[11px] text-center text-blue-600 font-semibold animate-fadeIn">
                Lancement de l'application en cours...
              </p>
            )}

            {/* Assistance si l'application ne s'ouvre pas */}
            {showInstallPrompt && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-2 animate-fadeIn">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>L'application ne s'est pas ouverte ?</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-snug">
                  L'application PointagePro doit d'abord être installée sur votre smartphone. Cliquez sur le bouton ci-dessous pour installer l'APK officielle.
                </p>
              </div>
            )}

            {/* Action 2 : Télécharger l'application APK */}
            <a
              href={APK_CDN_URL}
              download="pointage-pro.apk"
              className="w-full flex items-center justify-center gap-2.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white font-bold py-3.5 px-5 rounded-2xl transition text-xs cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Télécharger l'App Android (.APK)</span>
            </a>
          </div>

          {/* Guide pas-à-pas illustré */}
          <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-2">
            <span className="font-extrabold text-slate-800 block text-[11px] uppercase tracking-wider">
              Procédure d'Activation en 3 Étapes
            </span>
            <div className="space-y-1.5 text-[11px]">
              <p className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                <span>Installez l'application via le bouton <strong>Télécharger l'App Android</strong> ci-dessus.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                <span>Revenez ici et cliquez sur <strong>Ouvrir dans l'Application</strong> (vos identifiants se pré-rempliront automatiquement).</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                <span>Posez votre empreinte digitale pour sécuriser votre smartphone !</span>
              </p>
            </div>
          </div>

        </div>
      </main>

      {/* Pied de page */}
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
