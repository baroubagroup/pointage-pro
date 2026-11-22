'use client';

import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share, PlusSquare, CheckCircle2, ChevronRight } from 'lucide-react';

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // 1. Détection si l'application est déjà lancée en mode PWA standalone
    if (typeof window !== 'undefined') {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);

      // Détection iOS
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
      setIsIos(isAppleDevice);

      // 2. Écouteur standard Android Chrome PWA
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }
  }, []);

  if (isStandalone || dismissed) {
    return null;
  }

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choice: any) => {
        if (choice.outcome === 'accepted') {
          setIsStandalone(true);
        }
        setDeferredPrompt(null);
      });
    } else {
      // Afficher le guide visuel explicite
      setShowModal(true);
    }
  };

  return (
    <>
      {/* Bannière Flottante Mobile PWA */}
      <div className="md:hidden relative z-30 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white px-3.5 py-2.5 shadow-md flex items-center justify-between animate-fadeIn border-b border-blue-500/30">
        <div className="flex items-center space-x-2.5 min-w-0" onClick={handleInstallClick}>
          <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shrink-0">
            <Download className="w-4 h-4 text-white animate-bounce" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black truncate">Installer l'Application Gérant</div>
            <div className="text-[10px] text-blue-100 truncate">Accès direct plein écran sur votre smartphone</div>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0 ml-2">
          <button
            onClick={handleInstallClick}
            className="px-2.5 py-1 bg-white text-blue-700 font-extrabold text-[11px] rounded-lg shadow-sm hover:bg-blue-50 transition active:scale-95"
          >
            Installer
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-white/70 hover:text-white rounded-lg transition"
            title="Masquer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Modal Guide d'installation pas-à-pas (iOS & Android) */}
      {showModal && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm">
                  PP
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Installer PointagePro</h3>
                  <p className="text-[10px] text-slate-400">Application PWA Dirigeant</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIos ? (
              // Instructions iOS Safari
              <div className="space-y-3 text-xs">
                <p className="text-slate-300">
                  Pour installer l'application sur votre <strong>iPhone / iPad</strong> :
                </p>
                <div className="space-y-2.5 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <div className="flex items-start space-x-3">
                    <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <p className="text-slate-300">
                      Appuyez sur le bouton <strong>Partager</strong> <Share className="w-3.5 h-3.5 inline mx-1 text-blue-400" /> en bas au centre de Safari.
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <p className="text-slate-300">
                      Faites défiler le menu et appuyez sur <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-emerald-400" /> <strong>« Sur l'écran d'accueil »</strong>.
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <p className="text-slate-300">
                      Appuyez sur <strong>« Ajouter »</strong> en haut à droite.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              // Instructions Android Chrome
              <div className="space-y-3 text-xs">
                <p className="text-slate-300">
                  Pour installer l'application sur votre smartphone <strong>Android</strong> :
                </p>
                <div className="space-y-2.5 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <div className="flex items-start space-x-3">
                    <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <p className="text-slate-300">
                      Appuyez sur le menu de Chrome (les <strong>trois petits points ⋮</strong> en haut à droite).
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <p className="text-slate-300">
                      Sélectionnez <strong>« Installer l'application »</strong> (ou <em>« Ajouter à l'écran d'accueil »</em>).
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <p className="text-slate-300">
                      Validez en appuyant sur <strong>Installer</strong>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowModal(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition shadow-md"
            >
              J'ai compris
            </button>
          </div>
        </div>
      )}
    </>
  );
}
