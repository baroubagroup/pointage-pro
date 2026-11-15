'use client';

import { useState } from 'react';
import { Header } from '@/components/header';
import { FileSpreadsheet, Download, Filter, CheckCircle2, AlertTriangle, Calendar } from 'lucide-react';

interface AttendanceRecord {
  id: string;
  name: string;
  role: string;
  plannedHours: string;
  actualHours: string;
  totalLateMinutes: number;
  breakOverrunMinutes: number;
  unjustifiedAbsences: number;
  attendanceRate: number;
}

const INITIAL_RECORDS: AttendanceRecord[] = [
  {
    id: 'rec-1',
    name: 'Kouassi Jean-Marc',
    role: 'Chef d\'équipe Logistique',
    plannedHours: '160h00',
    actualHours: '164h15',
    totalLateMinutes: 0,
    breakOverrunMinutes: 0,
    unjustifiedAbsences: 0,
    attendanceRate: 100
  },
  {
    id: 'rec-2',
    name: 'Traoré Fatou',
    role: 'Responsable Magasin',
    plannedHours: '160h00',
    actualHours: '158h20',
    totalLateMinutes: 38,
    breakOverrunMinutes: 15,
    unjustifiedAbsences: 0,
    attendanceRate: 98.2
  },
  {
    id: 'rec-3',
    name: 'Yao Brice',
    role: 'Agent de Sécurité',
    plannedHours: '176h00',
    actualHours: '176h00',
    totalLateMinutes: 0,
    breakOverrunMinutes: 0,
    unjustifiedAbsences: 0,
    attendanceRate: 100
  }
];

export default function RelevesPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>(INITIAL_RECORDS);
  const [period, setPeriod] = useState('Novembre 2026');

  const exportCSV = () => {
    let csv = '\uFEFFCollaborateur;Poste;Heures_Contractuelles;Heures_Effectives;Minutes_Retard;Minutes_Depassement_Pause;Absences_Non_Justifiees;Taux_Assiduite\n';
    records.forEach(r => {
      csv += `"${r.name}";"${r.role}";"${r.plannedHours}";"${r.actualHours}";"${r.totalLateMinutes}";"${r.breakOverrunMinutes}";"${r.unjustifiedAbsences}";"${r.attendanceRate}%"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `releve_assiduite_${period.replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <Header
        title="Relevé d'Assiduité & Heures Effectives"
        subtitle="Rapports d'heures brutes, retards et dépassements de pause (sans calculs tarifaires)"
        actionButton={
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Télécharger le Fichier CSV</span>
          </button>
        }
      />

      {/* Note de conformité logicielle */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="font-extrabold text-sm mb-1 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Données d'Assiduité Brutes Prêtes pour la Comptabilité
          </h3>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            PointagePro se concentre exclusivement sur la certification des présences : heures effectives travaillées, cumuls de retard et pauses excédentaires. Aucun montant en Francs CFA ni calcul de paie n'est appliqué, laissant votre entreprise libre d'appliquer sa propre politique salariale.
          </p>
        </div>
      </div>

      {/* Table des relevés */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">Période Active : {period}</h3>
          <span className="text-xs text-slate-400 font-medium">Export compatible Excel / ERP</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-6">Collaborateur</th>
                <th className="py-3 px-4">Heures Prévues</th>
                <th className="py-3 px-4">Heures Réelles Effectuées</th>
                <th className="py-3 px-4">Minutes de Retard</th>
                <th className="py-3 px-4">Excès Pause Midi</th>
                <th className="py-3 px-6 text-right">Taux d'Assiduité</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-6 font-semibold text-slate-900">
                    <div>{r.name}</div>
                    <div className="text-[11px] text-slate-400 font-normal">{r.role}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-medium text-slate-600">{r.plannedHours}</td>
                  <td className="py-3.5 px-4 font-mono font-extrabold text-blue-700">{r.actualHours}</td>
                  <td className="py-3.5 px-4 font-mono">
                    {r.totalLateMinutes > 0 ? (
                      <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded">
                        +{r.totalLateMinutes} min
                      </span>
                    ) : (
                      <span className="text-slate-400 font-bold">0 min</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    {r.breakOverrunMinutes > 0 ? (
                      <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded">
                        +{r.breakOverrunMinutes} min
                      </span>
                    ) : (
                      <span className="text-slate-400 font-bold">0 min</span>
                    )}
                  </td>
                  <td className="py-3.5 px-6 text-right">
                    <span className={`inline-block font-mono font-extrabold text-xs px-2.5 py-1 rounded-full ${
                      r.attendanceRate >= 99 ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {r.attendanceRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
