'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { CalendarDays, Clock, Plus, AlertCircle, CheckCircle2, Trash2, Edit3, X, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export interface Schedule {
  id: string;
  name: string;
  category: string;
  working_days: number[]; // 1=Lundi, ..., 7=Dimanche
  morning_start: string;
  morning_end: string;
  lunch_start: string;
  lunch_end: string;
  afternoon_start: string;
  afternoon_end: string;
  tolerance_minutes: number;
  weekly_hours: number;
  assignedCount?: number;
  is_active: boolean;
}

const DAY_LABELS = [
  { day: 1, label: 'Lun', full: 'Lundi' },
  { day: 2, label: 'Mar', full: 'Mardi' },
  { day: 3, label: 'Mer', full: 'Mercredi' },
  { day: 4, label: 'Jeu', full: 'Jeudi' },
  { day: 5, label: 'Ven', full: 'Vendredi' },
  { day: 6, label: 'Sam', full: 'Samedi' },
  { day: 7, label: 'Dim', full: 'Dimanche' },
];

export default function PlanningsPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Formulaire d'ajout
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'Fractionné' | 'Continu' | 'Personnalisé'>('Fractionné');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [morningStart, setMorningStart] = useState('07:30');
  const [morningEnd, setMorningEnd] = useState('12:00');
  const [lunchStart, setLunchStart] = useState('12:00');
  const [lunchEnd, setLunchEnd] = useState('13:30');
  const [afternoonStart, setAfternoonStart] = useState('13:30');
  const [afternoonEnd, setAfternoonEnd] = useState('17:30');
  const [tolerance, setTolerance] = useState(15);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: schedData, error } = await supabase
        .from('pointage_schedules')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erreur chargement plannings:', error);
      }

      // Récupérer le décompte des collaborateurs assignés
      const { data: empData } = await supabase
        .from('pointage_employees')
        .select('schedule_id');

      const countMap: Record<string, number> = {};
      empData?.forEach((emp: any) => {
        if (emp.schedule_id) {
          countMap[emp.schedule_id] = (countMap[emp.schedule_id] || 0) + 1;
        }
      });

      if (schedData && schedData.length > 0) {
        const mapped = schedData.map((s: any) => ({
          ...s,
          morning_start: (s.morning_start || '07:30').slice(0, 5),
          morning_end: (s.morning_end || '12:00').slice(0, 5),
          lunch_start: (s.lunch_start || '12:00').slice(0, 5),
          lunch_end: (s.lunch_end || '13:30').slice(0, 5),
          afternoon_start: (s.afternoon_start || '13:30').slice(0, 5),
          afternoon_end: (s.afternoon_end || '17:30').slice(0, 5),
          assignedCount: countMap[s.id] || 0
        }));
        setSchedules(mapped);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length === 1) return; // Garder au moins 1 jour
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort((a, b) => a - b));
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const supabase = createClient();
      const dailyHours = category === 'Continu' ? 8.0 : 8.0;
      const weeklyHours = Math.round(selectedDays.length * dailyHours);

      const { data, error } = await supabase
        .from('pointage_schedules')
        .insert({
          org_id: '00000000-0000-0000-0000-000000000001',
          name: name.trim(),
          category: category,
          working_days: selectedDays,
          morning_start: morningStart,
          morning_end: morningEnd,
          lunch_start: lunchStart,
          lunch_end: lunchEnd,
          afternoon_start: afternoonStart,
          afternoon_end: afternoonEnd,
          tolerance_minutes: tolerance,
          weekly_hours: weeklyHours,
          is_active: true
        })
        .select();

      if (error) {
        console.error('Erreur insertion planning:', error);
        setToastMsg(`Erreur lors de la création : ${error.message}`);
      } else {
        setToastMsg(`Planning "${name.trim()}" créé avec succès !`);
        setShowAddModal(false);
        setName('');
        setSelectedDays([1, 2, 3, 4, 5]);
        await fetchSchedules();
      }
    } catch (err: any) {
      setToastMsg(`Erreur : ${err.message}`);
    } finally {
      setSubmitting(false);
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  const handleDeleteSchedule = async (id: string, schedName: string) => {
    if (!confirm(`Supprimer définitivement le planning "${schedName}" ? Les collaborateurs seront réassignés au planning par défaut.`)) return;

    try {
      const supabase = createClient();
      await supabase.from('pointage_schedules').delete().eq('id', id);
      setSchedules(prev => prev.filter(s => s.id !== id));
      setToastMsg(`Planning "${schedName}" supprimé.`);
      setTimeout(() => setToastMsg(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Header
          title="Plannings & Gestion des Horaires de Travail"
          subtitle="Horaires personnalisés par corps de métier (Lun-Ven, Lun-Sam, mi-temps), gestion des pauses et tolérances"
        />
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau Planning / Horaire</span>
        </button>
      </div>

      {toastMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Règle automatique */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5" />
        </div>
        <div className="text-xs">
          <h4 className="font-extrabold text-slate-800 text-sm mb-0.5">Adaptabilité Totale par Collaborateur</h4>
          <p className="text-slate-500 leading-relaxed">
            Chaque collaborateur est rattaché à son propre planning (ex: 5j/7, 6j/7 ou jours alternés). Un collaborateur absent un jour non prévu dans son planning n'est <strong className="text-slate-700">jamais pénalisé</strong> ni marqué en retard.
          </p>
        </div>
      </div>

      {/* Grille des shifts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {schedules.map((shift) => (
          <div key={shift.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4 hover:border-slate-300 transition">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                    shift.category === 'Continu' 
                      ? 'bg-purple-100 text-purple-800' 
                      : shift.category === 'Personnalisé'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {shift.category}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {shift.weekly_hours}h / semaine
                  </span>
                </div>
                <h3 className="font-extrabold text-base text-slate-900 mt-1.5">{shift.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 font-mono flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  {shift.assignedCount ?? 0}
                </span>
                <button
                  onClick={() => handleDeleteSchedule(shift.id, shift.name)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="Supprimer ce planning"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Jours travaillés */}
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">Jours d'activité prévus :</span>
              <div className="flex items-center gap-1.5">
                {DAY_LABELS.map(d => {
                  const isWorking = (shift.working_days || []).includes(d.day);
                  return (
                    <span
                      key={d.day}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg transition ${
                        isWorking 
                          ? 'bg-emerald-600 text-white font-extrabold shadow-xs' 
                          : 'bg-slate-100 text-slate-400 line-through'
                      }`}
                    >
                      {d.label}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Tranches Horaires Fractionnées */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-center text-xs">
              <div>
                <span className="text-slate-400 text-[10px] block font-semibold">1. Matinée</span>
                <span className="font-mono font-extrabold text-slate-800 text-xs sm:text-sm">
                  {shift.morning_start} - {shift.morning_end}
                </span>
              </div>
              <div>
                <span className="text-amber-600 text-[10px] block font-bold">2. Pause Midi</span>
                <span className="font-mono font-extrabold text-amber-600 text-xs sm:text-sm">
                  {shift.lunch_start} - {shift.lunch_end}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block font-semibold">3. Après-Midi</span>
                <span className="font-mono font-extrabold text-slate-800 text-xs sm:text-sm">
                  {shift.afternoon_start} - {shift.afternoon_end}
                </span>
              </div>
            </div>

            {/* Paramètres de tolérance */}
            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
              <span className="text-slate-500 font-medium">Tolérance retard sans pénalité :</span>
              <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                +{shift.tolerance_minutes} minutes
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Création de Planning */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Créer un Nouveau Planning d'Activité</h3>
                <p className="text-xs text-slate-500">Définissez les créneaux, pauses et jours de travail applicables.</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nom du Planning *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex : Équipe Commerciale Ouaga (Lun - Sam)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Type de Shift</label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Fractionné">Fractionné (Pause Midi)</option>
                    <option value="Continu">Continu (Journée Continue)</option>
                    <option value="Personnalisé">Personnalisé / Nuit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tolérance Retard (min)</label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={tolerance}
                    onChange={(e) => setTolerance(parseInt(e.target.value, 10) || 0)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Sélection des jours travaillés */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Jours de travail obligatoires :
                </label>
                <div className="grid grid-cols-7 gap-1.5">
                  {DAY_LABELS.map(d => {
                    const isSelected = selectedDays.includes(d.day);
                    return (
                      <button
                        key={d.day}
                        type="button"
                        onClick={() => toggleDay(d.day)}
                        className={`py-2 text-xs font-extrabold rounded-xl border transition ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  * Cliquez pour activer/désactiver un jour (ex: désactivez le Jeudi pour les collaborateurs repos en milieu de semaine).
                </span>
              </div>

              {/* Créneaux horaires */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-3">
                <span className="text-xs font-bold text-slate-800 block">Horaires de la Journée :</span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Prise de Poste (Matin)</label>
                    <input
                      type="time"
                      value={morningStart}
                      onChange={(e) => setMorningStart(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-mono text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Début Pause Déjeuner</label>
                    <input
                      type="time"
                      value={lunchStart}
                      onChange={(e) => setLunchStart(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-mono text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Fin Pause (Reprise)</label>
                    <input
                      type="time"
                      value={lunchEnd}
                      onChange={(e) => setLunchEnd(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-mono text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Fin de Journée</label>
                    <input
                      type="time"
                      value={afternoonEnd}
                      onChange={(e) => setAfternoonEnd(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-mono text-slate-800"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {submitting ? 'Création en cours...' : 'Enregistrer le Planning'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}