'use client';

import { useState } from 'react';
import { Header } from '@/components/header';
import { ClipboardCheck, Check, X, ShieldAlert, Clock, MessageSquare } from 'lucide-react';

interface Justification {
  id: string;
  name: string;
  role: string;
  date: string;
  type: string;
  delayMinutes: number;
  category: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

const INITIAL_JUSTIFICATIONS: Justification[] = [
  {
    id: 'justif-1',
    name: 'Traoré Fatou',
    role: 'Responsable Magasin',
    date: 'Aujourd\'hui (15/11)',
    type: 'Retard de 16 min (Arrivée à 07h46)',
    delayMinutes: 16,
    category: 'Transport / Embouteillage',
    reason: 'Ralentissement majeur sur le boulevard principal suite à des travaux de voirie.',
    status: 'PENDING'
  },
  {
    id: 'justif-2',
    name: 'Kouassi Jean-Marc',
    role: 'Chef d\'équipe Logistique',
    date: '12/11/2026',
    type: 'Dépassement Pause Déjeuner (22 min)',
    delayMinutes: 22,
    category: 'Rendez-vous Fournisseur',
    reason: 'Réception imprévue d\'une livraison de matériel sur le quai extérieur.',
    status: 'APPROVED'
  }
];

export default function JustificationsPage() {
  const [items, setItems] = useState<Justification[]>(INITIAL_JUSTIFICATIONS);

  const handleArbitrate = (id: string, isApproved: boolean) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          status: isApproved ? 'APPROVED' : 'REJECTED'
        };
      }
      return item;
    }));
  };

  const pendingCount = items.filter(x => x.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      <Header
        title="Demandes de Justification (Retards & Absences)"
        subtitle="Validation managériale des motifs sans stockage photo pour préserver la confidentialité"
      />

      {/* Note d'architecture */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="font-extrabold text-sm mb-1 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            Workflow 100% Textuel Sans Fichier Stocké
          </h3>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Pour éliminer les coûts de stockage cloud et garantir la conformité RGPD, aucune photo ni document justificatif n'est conservé. Le motif déclaré par le collaborateur sur son smartphone est soumis directement à l'approbation du gérant.
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-2xl font-extrabold text-amber-400">{pendingCount}</span>
          <p className="text-[10px] text-slate-400 font-bold uppercase">En attente</p>
        </div>
      </div>

      {/* Table des justifications */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">Dernières Demandes Soumises</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-6">Collaborateur</th>
                <th className="py-3 px-4">Événement & Date</th>
                <th className="py-3 px-4">Catégorie</th>
                <th className="py-3 px-4">Motif Explicatif (Texte)</th>
                <th className="py-3 px-4">Statut Décision</th>
                <th className="py-3 px-6 text-right">Arbitrage Gérant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-6 font-semibold text-slate-900">
                    <div>{item.name}</div>
                    <div className="text-[11px] text-slate-400 font-normal">{item.role}</div>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-800">
                    <div>{item.type}</div>
                    <div className="text-[11px] text-slate-400">{item.date}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="bg-slate-100 px-2 py-1 rounded-md text-[11px] font-medium text-slate-700">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 italic max-w-xs">
                    "{item.reason}"
                  </td>
                  <td className="py-3.5 px-4">
                    {item.status === 'PENDING' && (
                      <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                        En attente
                      </span>
                    )}
                    {item.status === 'APPROVED' && (
                      <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                        ✓ Régularisé (Approuvé)
                      </span>
                    )}
                    {item.status === 'REJECTED' && (
                      <span className="bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                        ✗ Rejeté (Non justifié)
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-6 text-right space-x-1.5">
                    {item.status === 'PENDING' ? (
                      <>
                        <button
                          onClick={() => handleArbitrate(item.id, true)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1.5 rounded-lg text-xs transition inline-flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>Approuver</span>
                        </button>
                        <button
                          onClick={() => handleArbitrate(item.id, false)}
                          className="bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-700 font-bold px-2.5 py-1.5 rounded-lg text-xs border border-slate-200 transition inline-flex items-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          <span>Refuser</span>
                        </button>
                      </>
                    ) : (
                      <span className="text-slate-400 text-xs italic">Dossier clôturé</span>
                    )}
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
