'use client';

import { useState } from 'react';
import { Header } from '@/components/header';
import { UserPlus, QrCode, Smartphone, Share2, Unlink, CheckCircle2, Clock, X } from 'lucide-react';

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

const INITIAL_EMPLOYEES: Employee[] = [
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
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState<Employee | null>(null);

  // New employee form
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('Collaborateur');
  const [newPhone, setNewPhone] = useState('+225 ');
  const [newSite, setNewSite] = useState('Boutique Centrale - Siège');

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const token = 'ACT-' + Math.floor(1000 + Math.random() * 9000) + '-' + newName.substring(0, 2).toUpperCase();
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

    setEmployees(prev => [newEmp, ...prev]);
    setShowAddModal(false);
    setShowQrModal(newEmp);

    setNewName('');
    setNewPhone('+225 ');
  };

  const handleUnbindDevice = (id: string) => {
    if (confirm("Voulez-vous réinitialiser l'appareil associé pour ce collaborateur ? Il devra scanner à nouveau un code d'activation.")) {
      setEmployees(prev => prev.map(e => e.id === id ? { ...e, isBound: false, device: 'En attente d\'activation' } : e));
    }
  };

  return (
    <div className="space-y-6">
      <Header
        title="Employés & Enrôlement Sécurisé"
        subtitle="Gestion des collaborateurs, enrôlement 0-mot de passe et liaison matérielle unique"
        actionButton={
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Enrôler un Collaborateur</span>
          </button>
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
            Vos collaborateurs n'ont pas d'identifiant ni de mot de passe à retenir. Vous générez une invitation WhatsApp ou un QR Code unique : leur smartphone est verrouillé à leur compte lors du 1er pointage et devient leur badge biométrique infalsifiable.
          </p>
        </div>
      </div>

      {/* Table des employés */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">Effectif des Collaborateurs ({employees.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-6">Collaborateur</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Établissement & Planning</th>
                <th className="py-3 px-4">Statut Appareil Mobile</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-6 font-semibold text-slate-900">
                    <div>{emp.name}</div>
                    <div className="text-[11px] text-slate-400 font-normal">{emp.role}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-medium text-slate-600">{emp.phone}</td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-800">{emp.site}</div>
                    <div className="text-[11px] text-slate-400">{emp.shift}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    {emp.isBound ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {emp.device}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        <Clock className="w-3 h-3 text-amber-600" />
                        En attente du 1er pointage
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-6 text-right space-x-2">
                    <button
                      onClick={() => setShowQrModal(emp)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs transition inline-flex items-center gap-1.5"
                    >
                      <QrCode className="w-3 h-3" />
                      <span>Invitation</span>
                    </button>
                    {emp.isBound && (
                      <button
                        onClick={() => handleUnbindDevice(emp.id)}
                        className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-bold text-xs transition inline-flex items-center gap-1.5"
                        title="Dissocier en cas de perte de téléphone"
                      >
                        <Unlink className="w-3 h-3" />
                        <span>Dissocier</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Ajout Employé */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-extrabold text-base text-slate-900 mb-1">Nouveau Collaborateur</h3>
            <p className="text-xs text-slate-500 mb-4">Génère automatiquement une clé d'activation mobile sécurisée.</p>

            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nom & Prénoms</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Bakayoko Souleymane"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Poste / Fonction</label>
                <input
                  type="text"
                  required
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="Ex: Chauffeur Livreur"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Numéro Mobile (WhatsApp)</label>
                <input
                  type="tel"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Établissement Principal</label>
                <select
                  value={newSite}
                  onChange={(e) => setNewSite(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                >
                  <option value="Boutique Centrale - Siège">Boutique Centrale - Siège</option>
                  <option value="Entrepôt Logistique Zone Nord">Entrepôt Logistique Zone Nord</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 rounded-xl transition shadow-md mt-2"
              >
                Générer l'Invitation & le Code
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal QR Code & WhatsApp */}
      {showQrModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center relative">
            <button
              onClick={() => setShowQrModal(null)}
              className="absolute right-5 top-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <QrCode className="w-6 h-6" />
            </div>

            <h3 className="font-extrabold text-base text-slate-900 mb-1">{showQrModal.name}</h3>
            <p className="text-xs text-slate-500 mb-4">Code d'activation unique pour son smartphone</p>

            {/* Code Visuel */}
            <div className="bg-slate-100 p-4 rounded-2xl mb-4 font-mono font-extrabold text-lg tracking-widest text-blue-700 border border-dashed border-blue-300">
              {showQrModal.token}
            </div>

            <div className="space-y-2">
              <a
                href={`https://wa.me/${showQrModal.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                  `Bonjour ${showQrModal.name}, voici votre lien d'activation sécurisé pour l'application PointagePro : https://pointage-pro-kappa.vercel.app/app/activate?token=${showQrModal.token}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                <span>Envoyer sur WhatsApp</span>
              </a>

              <button
                onClick={() => setShowQrModal(null)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
