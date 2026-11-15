'use client';

import { Header } from '@/components/header';
import { ShieldCheck, ShieldAlert, Cpu, Radio, Clock, Smartphone, CheckCircle2 } from 'lucide-react';

export default function SecurityPage() {
  const securityRules = [
    {
      title: 'Détection Faux GPS & Mock Locations (Android)',
      status: 'ACTIF & STRICT',
      icon: Radio,
      desc: 'Toute application d\'usurpation de position GPS (Fake GPS, Fly GPS) active sur le smartphone est détectée et entraîne le rejet instantané du pointage.',
      rejectionsCount: 0
    },
    {
      title: 'Vérification Horodatage Satellite UTC Inviolable',
      status: 'ACTIF & SYNCHRONISÉ',
      icon: Clock,
      desc: 'L\'heure de pointage est certifiée par les serveurs satellites UTC. Modifier l\'horloge manuelle du smartphone n\'a aucun impact.',
      rejectionsCount: 0
    },
    {
      title: 'Liaison Matérielle Unique (Hardware Device ID)',
      status: 'ACTIF (1 Smartphone = 1 Employé)',
      icon: Smartphone,
      desc: 'Chaque compte employé est scellé cryptographiquement à un seul appareil mobile lors du 1er pointage. Empêche le pointage de complaisance.',
      rejectionsCount: 0
    },
    {
      title: 'Double Confirmation Réseau Wi-Fi Professionnel (BSSID)',
      status: 'ACTIF',
      icon: Cpu,
      desc: 'Validation de l\'adresse MAC unique de la box Internet de l\'entreprise en complément des coordonnées géographiques.',
      rejectionsCount: 0
    }
  ];

  return (
    <div className="space-y-6">
      <Header
        title="Matrice de Sécurité & Anti-Triche"
        subtitle="Invariants cryptographiques et protocoles de protection contre la fraude au pointage"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {securityRules.map((rule, idx) => {
          const Icon = rule.icon;
          return (
            <div key={idx} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  {rule.status}
                </span>
              </div>

              <div>
                <h3 className="font-extrabold text-sm text-slate-900 mb-1">{rule.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{rule.desc}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400">Tentatives frauduleuses interceptées :</span>
                <span className="font-mono font-bold text-slate-800">{rule.rejectionsCount} incident</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
