'use client';

import { useState } from 'react';
import { Header } from '@/components/header';
import { CalendarDays, Clock, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Shift {
  id: string;
  title: string;
  category: string;
  morningStart: string;
  morningEnd: string;
  lunchStart: string;
  lunchEnd: string;
  afternoonStart: string;
  afternoonEnd: string;
  toleranceMinutes: number;
  assignedCount: number;
}

const INITIAL_SHIFTS: Shift[] = [
  {
    id: 's-1',
    title: 'Horaire Fractionné Siège & Logistique',
    category: 'Fractionné (Journée)',
    morningStart: '07:30',
    morningEnd: '12:00',
    lunchStart: '12:00',
    lunchEnd: '13:30',
    afternoonStart: '13:30',
    afternoonEnd: '17:30',
    toleranceMinutes: 15,
    assignedCount: 4
  },
  {
    id: 's-2',
    title: 'Horaire Continu Magasin & Permanence',
    category: 'Continu',
    morningStart: '08:00',
    morningEnd: '16:00',
    lunchStart: '12:30',
    lunchEnd: '13:15',
    afternoonStart: '13:15',
    afternoonEnd: '16:00',
    toleranceMinutes: 10,
    assignedCount: 1
  }
];

export default function PlanningsPage() {
  const [shifts, setShifts] = useState<Shift[]>(INITIAL_SHIFTS);

  return (
    <div className="space-y-6">
      <Header
        title="Plannings & Gestion des Horaires Fractionnés"
        subtitle="Configuration des créneaux de travail, contrôle automatique des dépassements de pause"
      />

      {/* Règle automatique */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5" />
        </div>
        <div className="text-xs">
          <h4 className="font-extrabold text-slate-800 text-sm mb-0.5">Contrôle Automatique du Dépassement de Pause Déjeuner</h4>
          <p className="text-slate-500 leading-relaxed">
            Tout pointage de reprise après l'heure de fin de pause programmée (ex: retour à 13h45 au lieu de 13h30) est automatiquement calculé en minutes d'excès et flaggé dans le relevé sans intervention manuelle du gérant.
          </p>
        </div>
      </div>

      {/* Grille des shifts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {shifts.map((shift) => (
          <div key={shift.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  {shift.category}
                </span>
                <h3 className="font-extrabold text-base text-slate-900 mt-1">{shift.title}</h3>
              </div>
              <span className="text-xs font-bold text-slate-400 font-mono">
                {shift.assignedCount} collaborateurs
              </span>
            </div>

            {/* Tranches Horaires Fractionnées */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-4 rounded-xl border border-slate-100 text-center text-xs">
              <div>
                <span className="text-slate-400 text-[10px] block font-semibold">1. Matinée</span>
                <span className="font-mono font-extrabold text-slate-800 text-sm">
                  {shift.morningStart} - {shift.morningEnd}
                </span>
              </div>
              <div>
                <span className="text-amber-500 text-[10px] block font-bold">2. Pause Midi</span>
                <span className="font-mono font-extrabold text-amber-600 text-sm">
                  {shift.lunchStart} - {shift.lunchEnd}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block font-semibold">3. Après-Midi</span>
                <span className="font-mono font-extrabold text-slate-800 text-sm">
                  {shift.afternoonStart} - {shift.afternoonEnd}
                </span>
              </div>
            </div>

            {/* Paramètres de tolérance */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
              <span className="text-slate-500">Marge de tolérance retard accordée :</span>
              <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                +{shift.toleranceMinutes} minutes
              </span>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-3 rounded-xl text-xs transition">
                Modifier le Planning
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
