'use client';

import { useState } from 'react';
import { Header } from '@/components/header';
import { Mail, Copy, Check, CheckCircle2, X } from 'lucide-react';

export default function AProposPage() {
  const [copiedContactEmail, setCopiedContactEmail] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('contact@baroubagroup.com');
    setCopiedContactEmail(true);
    setToastMsg("Adresse contact@baroubagroup.com copiée dans le presse-papiers !");
    setTimeout(() => setCopiedContactEmail(false), 3000);
  };

  return (
    <div className="space-y-6">
      <Header
        title="À propos"
        subtitle="Éditeur officiel, conception logicielle & gouvernance de la plateforme"
      />

      {/* Toast de confirmation */}
      {toastMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-semibold animate-fadeIn shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-emerald-600 hover:text-emerald-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Carte Maîtresse : Éditeur Officiel BAROUBA GROUP */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-950 via-slate-900 to-black border border-amber-500/30 p-6 sm:p-8 text-white shadow-2xl shadow-amber-950/20 max-w-4xl mx-auto">
        {/* Halos lumineux d'ambiance or & obsidian */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-0 w-64 h-64 bg-amber-600/10 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 left-0 w-48 h-48 bg-amber-400/5 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto space-y-4 sm:space-y-5">
          {/* Badge pays & savoir-faire */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-semibold backdrop-blur-md shadow-xs">
            <span>🇧🇫</span>
            <span>Conçu & Édité au Burkina Faso • Architecture & Ingénierie Logicielle</span>
          </div>

          {/* Logo officiel avec contours blancs préservés et couronne dorée */}
          <div className="relative group">
            <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-600 to-amber-500 opacity-75 blur-md group-hover:opacity-100 transition duration-500" />
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden p-1 bg-gradient-to-br from-amber-300 via-amber-600 to-slate-950 shadow-2xl ring-4 ring-amber-500/30">
              <img
                src="/barouba-group-logo.png"
                alt="BAROUBA GROUP Logo Officiel"
                className="w-full h-full object-cover rounded-full bg-black"
              />
            </div>
          </div>

          {/* Titre & Signature de marque */}
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2.5">
              BAROUBA GROUP
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400 animate-pulse" />
            </h1>
            <p className="text-[11px] sm:text-xs font-bold text-amber-300 tracking-wider uppercase">
              Éditeur Officiel & Architecte Numérique
            </p>
          </div>

          {/* Déclaration officielle de l'éditeur (Texte verbatim) */}
          <div className="w-full p-4 sm:p-5 rounded-2xl bg-white/5 border border-amber-500/20 backdrop-blur-md shadow-inner text-slate-100 text-xs sm:text-sm leading-relaxed text-center font-normal">
            <p className="leading-relaxed">
              « Cette solution est fièrement conçue et éditée au Burkina Faso par <strong className="text-amber-300 font-extrabold">BAROUBA GROUP</strong>. Au service de la performance des entreprises, nous bâtissons des architectures numériques robustes, conformes aux standards internationaux de sécurité et de scalabilité. »
            </p>
          </div>

          {/* Actions & Coordonnées directes */}
          <div className="w-full pt-1 flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3">
            <a
              href="mailto:contact@baroubagroup.com?subject=Demande%20d'information%20-%20PointagePro%20Enterprise"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/25 transition duration-200 cursor-pointer active:scale-95"
            >
              <Mail className="w-4 h-4 text-slate-950" />
              <span>Service client & Contact : contact@baroubagroup.com</span>
            </a>

            <button
              type="button"
              onClick={handleCopyEmail}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-amber-500/30 text-xs font-semibold transition duration-200 cursor-pointer active:scale-95 shadow-sm"
            >
              {copiedContactEmail ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300 font-bold">Email copié !</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-amber-400" />
                  <span>Copier l'adresse</span>
                </>
              )}
            </button>
          </div>

          {/* Ligne Copyright officielle verbatim */}
          <div className="pt-4 border-t border-white/10 w-full flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
            <div className="flex items-center gap-2">
              <span className="text-slate-200 font-bold">© BAROUBA GROUP. Tous droits réservés.</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-amber-300/80 font-medium">
              <span>Propriété Intellectuelle Déposée</span>
              <span>•</span>
              <span>Version Enterprise 2026.11</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
