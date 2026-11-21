'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { createClient } from '@/lib/supabase/client';
import { ClipboardCheck, Check, X, ShieldAlert, Clock, MessageSquare, RefreshCw } from 'lucide-react';

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

const FALLBACK_JUSTIFICATIONS: Justification[] = [
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
  const [items, setItems] = useState<Justification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchJustifications = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const activeOrgId = typeof window !== 'undefined' ? localStorage.getItem('pointage_org_id') : null;

      let query = supabase
        .from('pointage_justifications')
        .select('*, pointage_employees(full_name, role)')
        .order('created_at', { ascending: false });

      if (activeOrgId) {
        query = query.eq('org_id', activeOrgId);
      }
      const { data, error } = await query;

      if (data && data.length > 0) {
        const mapped: Justification[] = data.map((d: any) => ({
          id: d.id,
          name: d.pointage_employees?.full_name || 'Collaborateur',
          role: d.pointage_employees?.role || 'Employé',
          date: new Date(d.created_at).toLocaleDateString('fr-FR'),
          type: 'Retard / Absence',
          delayMinutes: 15,
          category: 'Déclaration Mobile',
          reason: d.reason_text || 'Motif déclaré sur smartphone',
          status: d.status === 'APPROVED' ? 'APPROVED' : (d.status === 'REJECTED' ? 'REJECTED' : 'PENDING')
        }));
        setItems(mapped);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.warn('Using local justifications error:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJustifications();

    const supabase = createClient();
    const channel = supabase
      .channel('realtime_justifications_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pointage_justifications' }, () => {
        fetchJustifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleArbitrate = async (id: string, isApproved: boolean) => {
    // Optimistic UI update
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          status: isApproved ? 'APPROVED' : 'REJECTED'
        };
      }
      return item;
    }));

    try {
      const supabase = createClient();
      await supabase
        .from('pointage_justifications')
        .update({
          status: isApproved ? 'APPROVED' : 'REJECTED',
          reviewed_at: new Date().toISOString(),
          reviewed_by: 'Direction Gérance'
        })
        .eq('id', id);
    } catch (err) {
      console.error('Error updating justification status in Supabase:', err);
    }
  };

  const pendingCount = items.filter(x => x.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      <Header
        title="Demandes de Justification (Retards & Absences)"
        subtitle="Validation managériale des motifs sans stockage photo pour préserver la confidentialité"
        actionButton={
          <button
            onClick={fetchJustifications}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-xl transition shadow-sm"
            title="Rafraîchir depuis Supabase"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      {/* Note d'architecture 100% textuel */}
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
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Aucune demande de justification pour cette organisation. Les retards ou absences déclarés par les collaborateurs apparaîtront ici.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
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
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 font-extrabold text-[11px]">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>En attente</span>
                      </span>
                    )}
                    {item.status === 'APPROVED' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-extrabold text-[11px]">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Validé</span>
                      </span>
                    )}
                    {item.status === 'REJECTED' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/10 text-red-600 font-extrabold text-[11px]">
                        <X className="w-3 h-3 text-red-600" />
                        <span>Refusé</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-6 text-right">
                    {item.status === 'PENDING' ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleArbitrate(item.id, true)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition flex items-center gap-1 text-[11px]"
                          title="Approuver ce motif"
                        >
                          <Check className="w-3 h-3" />
                          <span>Approuver</span>
                        </button>
                        <button
                          onClick={() => handleArbitrate(item.id, false)}
                          className="px-2.5 py-1 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition flex items-center gap-1 text-[11px]"
                          title="Refuser ce motif"
                        >
                          <X className="w-3 h-3" />
                          <span>Refuser</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium">Arbitré</span>
                    )}
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
