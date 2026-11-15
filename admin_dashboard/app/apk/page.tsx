'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function ApkDownloadPage() {
  const [downloadStarted, setDownloadStarted] = useState(false);
  const CDN_APK_URL = 'https://ylrnxuphtaoazlhlmnsd.supabase.co/storage/v1/object/public/apk_downloads/pointage-pro-v2.apk';

  React.useEffect(() => {
    // Déclenchement automatique 500ms après l'ouverture de la page
    const timer = setTimeout(() => {
      handleDownload();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleDownload = () => {
    setDownloadStarted(true);
    // Déclenchement direct du téléchargement
    const link = document.createElement('a');
    link.href = CDN_APK_URL;
    link.setAttribute('download', 'pointage-pro.apk');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-4 sm:p-6 font-sans">
      {/* En-tête minimaliste */}
      <header className="w-full max-w-lg flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white leading-tight">PointagePro</h1>
            <p className="text-xs text-slate-400">Application Mobile de Pointage</p>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition"
        >
          Portail Gérant &rarr;
        </Link>
      </header>

      {/* Carte Principale de Téléchargement */}
      <main className="w-full max-w-lg my-auto py-6">
        <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Effet visuel d'arrière-plan */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Badge officiel */}
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Build Officiel Android APK • v1.0.0
            </span>
          </div>

          {/* Icône & Titre */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/25 mb-4">
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993s-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993s-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4116 13.8533 8.0833 12 8.0833s-3.5902.3283-5.1368.8664L4.8409 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.152 4.1481 10.974 10.974 0 00-2.3259 4.8873h19.2094c-.456-1.8492-1.328-3.5358-2.6047-4.8873M2 16.25c0 .324.0324.64.0864.949h19.8272c.054-.309.0864-.625.0864-.949 0-4.04-2.73-7.44-6.5-8.41.4.67.65 1.45.65 2.29 0 2.48-2.02 4.5-4.5 4.5s-4.5-2.02-4.5-4.5c0-.84.25-1.62.65-2.29-3.77.97-6.5 4.37-6.5 8.41" />
              </svg>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Application Collaborateur</h2>
            <p className="text-slate-400 text-sm mt-1 max-w-sm mx-auto">
              Pointage 1-clic avec horloge satellite inaltérable, contrôle anti-faux GPS et activation sécurisée sans mot de passe.
            </p>
          </div>

          {/* Bouton de Téléchargement Primaire */}
          <div className="space-y-3 mb-8">
            <button
              onClick={handleDownload}
              className="w-full group relative flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-emerald-500/25 transition-all text-base cursor-pointer"
            >
              <svg className="w-6 h-6 group-hover:-translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Télécharger le Fichier APK (.apk)</span>
            </button>

            {downloadStarted && (
              <p className="text-xs text-center text-emerald-400 flex items-center justify-center gap-1.5 animate-fadeIn">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Téléchargement lancé ! Regardez vos notifications.
              </p>
            )}

            {/* Lien direct alternatif */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-center">
              <a
                href="/pointage-pro.apk"
                download="pointage-pro.apk"
                className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-4 transition"
              >
                Lien direct : /pointage-pro.apk
              </a>
              <span className="hidden sm:inline text-slate-600">•</span>
              <a
                href={CDN_APK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-400 hover:text-emerald-300 underline underline-offset-4 transition"
              >
                Miroir Cloud CDN (Direct)
              </a>
            </div>
          </div>

          {/* Guide d'installation rapide Android */}
          <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800/80">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Comment installer sur votre téléphone :
            </h3>
            <ol className="text-xs text-slate-400 space-y-2.5 list-decimal list-inside pl-1">
              <li className="leading-relaxed">
                Appuyez sur le bouton vert ci-dessus pour télécharger <span className="text-slate-200 font-mono">pointage-pro.apk</span>.
              </li>
              <li className="leading-relaxed">
                Ouvrez le fichier téléchargé depuis la barre de notification ou l'application <span className="text-slate-200">Fichiers / Téléchargements</span>.
              </li>
              <li className="leading-relaxed">
                Si Android affiche <span className="text-amber-400 font-medium">"Source inconnue"</span>, appuyez sur <span className="text-slate-200 font-medium">Paramètres</span> et cochez <span className="text-emerald-400 font-medium">"Autoriser cette source"</span>.
              </li>
              <li className="leading-relaxed">
                Appuyez sur <span className="text-slate-200 font-medium">Installer</span>, puis lancez l'application et scannez votre QR Code d'activation !
              </li>
            </ol>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-lg text-center py-4 text-xs text-slate-500">
        PointagePro Enterprise • Sécurisé par Supabase PostGIS & Satellite UTC
      </footer>
    </div>
  );
}
