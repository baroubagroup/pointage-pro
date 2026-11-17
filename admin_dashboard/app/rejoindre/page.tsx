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
  ExternalLink,
  Sparkles,
  ArrowRight
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

  const deepLink = `pointagepro://join?token=${token}&org=${org}&mat=${encodeURIComponent(mat)}`;

  // Tenter l'ouverture automatique de l'app si ouverte sur smartphone
  const handleLaunchApp = () => {
    setDeepLinkTriggered(true);
    window.location.href = deepLink;
    setTimeout(() => {
      setDeepLinkTriggered(false);
    }, 3000);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-4 sm:p-6 font-sans">
      
      {/* En-tête */}
      <header className="w-full max-w-md flex items-center justify-between py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-black text-white text-base shadow-md shadow-blue-500/20">
            P
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white leading-tight">PointagePro</h1>
            <p className="text-[11px] text-slate-400">Portail d'Activation Mobile</p>
          </div>
        </div>
        <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" />
          <span>Certifié WGS84</span>
        </span>
      </header>

      {/* Contenu Principal */}
      <main className="w-full max-w-md my-auto py-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl space-y-6">
          
          {/* Badge & Titre d'Accueil */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/25">
              <Sparkles className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">
              Activation de votre Compte
            </h2>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Votre accès au système de pointage de présence a été préparé par votre établissement.
            </p>
          </div>

          {/* Fiche Récapitulative des Identifiants */}
          <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/60 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Vos Identifiants d'Enrôlement
            </span>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Établissement</span>
                <span className="font-mono font-black text-blue-400 text-sm">{org}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">Matricule</span>
                  <span className="font-mono font-black text-slate-200 text-sm truncate max-w-[100px] block">
                    {mat || 'Attribué'}
                  </span>
                </div>
                {mat && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(mat, 'mat')}
                    className="p-1 text-slate-400 hover:text-white transition"
                    title="Copier le matricule"
                  >
                    {copiedMat ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>

            {token && (
              <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-blue-300 font-bold block">Jeton Unique d'Activation</span>
                  <span className="font-mono font-black text-amber-400 text-base tracking-wider">{token}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(token, 'token')}
                  className="px-2.5 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedToken ? 'Copié' : 'Copier'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Boutons d'Action Principaux */}
          <div className="space-y-3">
            {/* Action 1 : Ouvrir l'App si déjà installée */}
            <button
              type="button"
              onClick={handleLaunchApp}
              className="w-full group relative flex items-center justify-center gap-2.5 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-98 text-white font-bold py-3.5 px-5 rounded-2xl shadow-lg shadow-blue-500/25 transition cursor-pointer text-sm"
            >
              <Smartphone className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Ouvrir dans l'Application PointagePro</span>
            </button>

            {deepLinkTriggered && (
              <p className="text-[11px] text-center text-blue-400 animate-fadeIn">
                Tentative d'ouverture de l'application... Si rien ne se passe, téléchargez l'APK ci-dessous.
              </p>
            )}

            {/* Action 2 : Télécharger l'application APK */}
            <a
              href={APK_CDN_URL}
              download="pointage-pro.apk"
              className="w-full flex items-center justify-center gap-2.5 bg-slate-800 hover:bg-slate-700 active:scale-98 text-slate-200 border border-slate-700 font-bold py-3.5 px-5 rounded-2xl transition text-xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Télécharger l'App Android (.APK)</span>
            </a>
          </div>

          {/* Guide pas-à-pas */}
          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-1.5">
            <span className="font-bold text-slate-300 block">Comment activer votre profil ?</span>
            <p>1. Téléchargez et installez l'application PointagePro.</p>
            <p>2. Ouvrez l'application et choisissez <em>« Rejoindre mon Organisation »</em>.</p>
            <p>3. Renseignez votre Code Établissement (<strong>{org}</strong>) et votre Matricule (<strong>{mat || 'votre matricule'}</strong>).</p>
            <p>4. Validez votre empreinte digitale locale pour sécuriser vos pointages.</p>
          </div>

        </div>
      </main>

      {/* Pied de page */}
      <footer className="text-center py-3 text-[11px] text-slate-600">
        PointagePro • Système de Présence Certifiée Multi-Tenant
      </footer>

    </div>
  );
}

export default function RejoindrePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Chargement...</div>}>
      <RejoindreContent />
    </Suspense>
  );
}
