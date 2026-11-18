'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { 
  Download, 
  Smartphone, 
  ShieldCheck, 
  ArrowRight, 
  HelpCircle, 
  CheckCircle2, 
  Sparkles 
} from 'lucide-react';

export default function ApkDownloadPage() {
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [orgName, setOrgName] = useState('PointagePro');
  const [orgLogo, setOrgLogo] = useState<string | null>(null);

  const CDN_APK_URL = 'https://ylrnxuphtaoazlhlmnsd.supabase.co/storage/v1/object/public/apk_downloads/pointage-pro-v9.apk';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const localName = localStorage.getItem('pointage_org_name');
      if (localName) setOrgName(localName);
      const localLogo = localStorage.getItem('pointage_org_logo');
      if (localLogo) setOrgLogo(localLogo);
    }
    const fetchOrg = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.from('pointage_organizations').select('name, security_config').limit(1).single();
        if (data?.name) setOrgName(data.name);
        if (data?.security_config?.org_logo) setOrgLogo(data.security_config.org_logo);
      } catch {}
    };
    fetchOrg();

    // Déclenchement automatique 500ms après l'ouverture de la page
    const timer = setTimeout(() => {
      handleDownload();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleDownload = () => {
    setDownloadStarted(true);
    const link = document.createElement('a');
    link.href = CDN_APK_URL;
    link.setAttribute('download', 'pointage-pro.apk');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#F4F7FD] text-slate-800 flex flex-col items-center justify-between p-4 sm:p-6 font-sans">
      
      {/* En-tête officiel */}
      <header className="w-full max-w-lg flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
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
            <p className="text-[11px] text-slate-500">Téléchargement APK Officiel</p>
          </div>
        </div>

        <Link
          href="/dashboard"
          className="text-xs bg-white hover:bg-slate-50 text-slate-700 font-bold px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs transition flex items-center gap-1.5"
        >
          <span>Portail Gérant</span>
          <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
        </Link>
      </header>

      {/* Carte Bento Principale */}
      <main className="w-full max-w-lg my-auto py-6">
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 space-y-6">
          
          {/* Badge & Titre d'Accueil */}
          <div className="text-center space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Build Android APK Officiel • v9.0.0
            </span>
            
            <h2 className="text-2xl font-black text-slate-900 tracking-tight pt-1">
              Application Mobile PointagePro
            </h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Horodatage satellite inaltérable, géofencing WGS84, sécurité biométrique et activation sans mot de passe pour <strong>{orgName}</strong>.
            </p>
          </div>

          {/* Bouton de Téléchargement Primaire */}
          <div className="space-y-3">
            <button
              onClick={handleDownload}
              className="w-full group relative flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-extrabold py-4 px-6 rounded-2xl shadow-lg shadow-emerald-500/25 transition cursor-pointer text-sm"
            >
              <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
              <span>Télécharger le Fichier APK (.apk)</span>
            </button>

            {downloadStarted && (
              <p className="text-xs text-center text-emerald-700 font-bold flex items-center justify-center gap-1.5 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Téléchargement lancé ! Vérifiez vos notifications.</span>
              </p>
            )}

            {/* Liens Miroir */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-center pt-1">
              <a
                href={CDN_APK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 font-bold underline underline-offset-4 transition"
              >
                Miroir Cloud CDN Direct
              </a>
            </div>
          </div>

          {/* Guide d'installation pas-à-pas Android */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2.5">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              Guide d'installation rapide Android :
            </h3>
            <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside pl-1 leading-relaxed">
              <li>Appuyez sur le bouton vert ci-dessus pour télécharger <strong className="text-slate-800 font-mono">pointage-pro.apk</strong>.</li>
              <li>Ouvrez le fichier téléchargé depuis la barre de notification ou le dossier <strong className="text-slate-800">Téléchargements</strong>.</li>
              <li>Si Android affiche <em>« Source inconnue »</em>, appuyez sur <strong className="text-slate-800">Paramètres</strong> et cochez <strong className="text-emerald-700">« Autoriser cette source »</strong>.</li>
              <li>Appuyez sur <strong className="text-slate-800">Installer</strong>, ouvrez l'application et scannez votre QR Code d'activation !</li>
            </ol>
          </div>

        </div>
      </main>

      {/* Footer Sécurité */}
      <footer className="w-full max-w-lg text-center py-3 text-xs text-slate-400 flex items-center justify-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <span>PointagePro Enterprise • Certifié Satellite WGS84 & TLS 1.3</span>
      </footer>

    </div>
  );
}
