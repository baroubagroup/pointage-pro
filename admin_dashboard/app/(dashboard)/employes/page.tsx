'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { createClient } from '@/lib/supabase/client';
import { UserPlus, QrCode, Smartphone, Share2, Unlink, CheckCircle2, Clock, X, RefreshCw } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  role: string;
  phone: string;
  site: string;
  shift: string;
  device: string;
  isBound: boolean;
  token: string;
}

const FALLBACK_EMPLOYEES: Employee[] = [
  {
    id: 'emp-1',
    name: 'Kouassi Jean-Marc',
    role: 'Chef d\'équipe Logistique',
    phone: '+225 07 48 92 11 00',
    site: 'Boutique Centrale - Siège',
    shift: '07h30 - 17h30 (Fractionné)',
    device: 'Samsung Galaxy A54 (Lié)',
    isBound: true,
    token: 'ACT-9921-JM'
  },
  {
    id: 'emp-2',
    name: 'Traoré Fatou',
    role: 'Responsable Magasin',
    phone: '+225 05 74 12 33 44',
    site: 'Entrepôt Logistique Zone Nord',
    shift: '07h30 - 17h30 (Fractionné)',
    device: 'iPhone 13 (Lié)',
    isBound: true,
    token: 'ACT-5512-FT'
  },
  {
    id: 'emp-3',
    name: 'N\'Guessan Marie',
    role: 'Assistante Administrative',
    phone: '+225 01 02 03 04 05',
    site: 'Boutique Centrale - Siège',
    shift: '08h00 - 17h00 (Standard)',
    device: 'En attente d\'activation',
    isBound: false,
    token: 'ACT-7841-MN'
  }
];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>(FALLBACK_EMPLOYEES);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState<Employee | null>(null);

  // New employee form
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('Collaborateur');
  const [newPhone, setNewPhone] = useState('+225 ');
  const [newSite, setNewSite] = useState('Boutique Centrale - Siège');

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('pointage_employees')
        .select('*, pointage_establishments(name)')
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        const mapped: Employee[] = data.map((d: any) => ({
          id: d.id,
          name: d.full_name,
          role: d.role === 'EMPLOYEE' ? 'Collaborateur' : d.role,
          phone: d.phone || '+225 --',
          site: d.pointage_establishments?.name || 'Boutique Centrale - Siège',
          shift: '07h30 - 17h30 (Fractionné)',
          device: d.device_model ? `${d.device_model} (Lié)` : 'En attente d\'activation',
          isBound: Boolean(d.bound_device_id || d.is_enrolled),
          token: d.enrollment_token || 'PPRO-TOKEN'
        }));
        setEmployees(mapped);
      }
    } catch (err) {
      console.warn('Using local employees fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();

    // Subscribe to realtime changes on pointage_employees
    const supabase = createClient();
    const channel = supabase
      .channel('realtime_employees_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pointage_employees' }, () => {
        fetchEmployees();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const token = 'PPRO-' + Math.floor(100000 + Math.random() * 900000);
    const newEmp: Employee = {
      id: 'emp-' + Date.now(),
      name: newName,
      role: newRole,
      phone: newPhone,
      site: newSite,
      shift: '07h30 - 17h30 (Fractionné)',
      device: 'En attente d\'activation',
      isBound: false,
      token
    };

    // Optimistic UI update
    setEmployees(prev => [newEmp, ...prev]);
    setShowAddModal(false);
    setShowQrModal(newEmp);

    // Save to Supabase
    try {
      const supabase = createClient();
      await supabase.from('pointage_employees').insert({
        org_id: '00000000-0000-0000-0000-000000000001',
        default_establishment_id: '00000000-0000-0000-0000-000000000010',
        full_name: newName,
        email: `${newName.toLowerCase().replace(/[^a-z0-9]/g, '')}@pointagepro.ci`,
        phone: newPhone,
        role: 'EMPLOYEE',
        enrollment_token: token,
        is_enrolled: false,
        is_active: true
      });
    } catch (err) {
      console.error('Error inserting employee in Supabase:', err);
    }

    setNewName('');
    setNewPhone('+225 ');
  };

  const handleUnbindDevice = async (id: string) => {
    if (confirm("Voulez-vous réinitialiser l'appareil associé pour ce collaborateur ? Il devra scanner à nouveau un code d'activation.")) {
      setEmployees(prev => prev.map(e => e.id === id ? { ...e, isBound: false, device: 'En attente d\'activation' } : e));
      try {
        const supabase = createClient();
        await supabase
          .from('pointage_employees')
          .update({ bound_device_id: null, device_model: null, is_enrolled: false })
          .eq('id', id);
      } catch (err) {
        console.error('Error unbinding device in Supabase:', err);
      }
    }
  };

  return (
    <div className="space-y-6">
      <Header
        title="Employés & Enrôlement Sécurisé"
        subtitle="Gestion des collaborateurs, enrôlement 0-mot de passe et liaison matérielle unique"
        actionButton={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchEmployees}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-xl transition shadow-sm"
              title="Rafraîchir depuis Supabase"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Enrôler un Collaborateur</span>
            </button>
          </div>
        }
      />

      {/* Bannière explicative 0-mot de passe */}
      <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white p-5 rounded-2xl shadow-sm border border-blue-800/40 flex items-center justify-between">
        <div>
          <h3 className="font-extrabold text-sm mb-1 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-blue-400" />
            Système d'Enrôlement 0-Mot de Passe Inviolable
          </h3>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            L'employé n'a pas d'identifiant ni de mot de passe à retenir. Il active son application soit par <strong>scan direct du QR Code</strong>, soit en recevant l'invitation sur <strong>WhatsApp</strong> et en l'important depuis sa galerie photo. Le jeton est cryptographiquement brûlé dès la 1ère liaison matérielle.
          </p>
        </div>
      </div>

      {/* Tableau des Employés */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-800 text-sm">Effectif Enregistré</h3>
            <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-semibold">
              {employees.length} collaborateurs
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-6">Collaborateur</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Établissement Attribué</th>
                <th className="py-3 px-4">Statut Liaison Matérielle</th>
                <th className="py-3 px-6 text-right">Actions Sécurité</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-6 font-semibold text-slate-900">
                    <div>{emp.name}</div>
                    <div className="text-[11px] text-slate-400 font-normal">{emp.role}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">
                    {emp.phone}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    <div>{emp.site}</div>
                    <div className="text-[11px] text-slate-400">{emp.shift}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    {emp.isBound ? (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold text-[11px] border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>{emp.device}</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 font-semibold text-[11px] border border-amber-500/20">
                        <Clock className="w-3 h-3 text-amber-500" />
                        <span>En attente d'activation</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setShowQrModal(emp)}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold transition flex items-center gap-1 text-[11px]"
                        title="Afficher le QR code d'enrôlement ou lien WhatsApp"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Activation</span>
                      </button>

                      {emp.isBound && (
                        <button
                          onClick={() => handleUnbindDevice(emp.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-semibold transition flex items-center gap-1 text-[11px]"
                          title="Délier l'appareil (en cas de perte ou changement de smartphone)"
                        >
                          <Unlink className="w-3.5 h-3.5" />
                          <span>Délier</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1 : Enrôler un nouveau collaborateur */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-600" />
                Enrôler un Nouveau Collaborateur
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nom Complet</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="ex: Kouamé David"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fonction / Poste</label>
                <input
                  type="text"
                  required
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="ex: Responsable Logistique"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Numéro WhatsApp (pour invitation)</label>
                <input
                  type="text"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+225 07..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Site de Rattachement</label>
                <select
                  value={newSite}
                  onChange={(e) => setNewSite(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="Boutique Centrale - Siège">Boutique Centrale - Siège</option>
                  <option value="Entrepôt Logistique Zone Nord">Entrepôt Logistique Zone Nord</option>
                  <option value="Chantier Plateau">Chantier Plateau</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 font-semibold text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20"
                >
                  Créer et Générer l'Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2 : QR Code & Partage WhatsApp */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <span className="font-bold text-slate-800 text-xs">Jeton d'Enrôlement 0-Mot de Passe</span>
              <button onClick={() => setShowQrModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <h4 className="font-extrabold text-slate-900 text-base">{showQrModal.name}</h4>
            <p className="text-xs text-slate-400 mt-0.5">{showQrModal.role}</p>

            {/* QR Code Container */}
            <div className="my-5 p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(JSON.stringify({ token: showQrModal.token, empId: showQrModal.id, name: showQrModal.name }))}`}
                alt="QR Code Enrôlement"
                className="w-44 h-44 rounded-xl mx-auto"
              />
            </div>

            <div className="bg-slate-100 p-2.5 rounded-xl font-mono text-[11px] text-slate-700 font-bold mb-4">
              Jeton : {showQrModal.token}
            </div>

            <p className="text-[11px] text-slate-500 mb-5 leading-relaxed">
              Faites scanner ce QR Code sur le smartphone de l'employé, ou transmettez-lui l'invitation sur WhatsApp.
            </p>

            <a
              href={`https://api.whatsapp.com/send?phone=${encodeURIComponent(showQrModal.phone.replace(/[^0-9+]/g, ''))}&text=${encodeURIComponent(`Bonjour ${showQrModal.name}, voici votre invitation officielle pour activer votre application de pointage sécurisée PointagePro.\n\nCode d'activation unique : ${showQrModal.token}\n\nOuvrez l'application et choisissez "Importer depuis WhatsApp" ou scannez ce code.`)}`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Envoyer l'Invitation par WhatsApp</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
