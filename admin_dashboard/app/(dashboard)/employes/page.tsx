'use client';

import { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/header';
import { createClient } from '@/lib/supabase/client';
import { UserPlus, QrCode, Smartphone, Share2, Unlink, CheckCircle2, Clock, X, RefreshCw, Camera, Scan, AlertCircle } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  matricule?: string;
  role: string;
  phone: string;
  siteId?: string;
  site: string;
  scheduleId?: string;
  shift: string;
  device: string;
  isBound: boolean;
  token: string;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [establishments, setEstablishments] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState<Employee | null>(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // New employee form
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('Collaborateur');
  const [newPhone, setNewPhone] = useState('+226 ');
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [selectedScheduleId, setSelectedScheduleId] = useState('');

  // Manager Camera QR Scanner state
  const [cameraActive, setCameraActive] = useState(false);
  const [scannedDeviceId, setScannedDeviceId] = useState('');
  const [scannedDeviceModel, setScannedDeviceModel] = useState('');
  const [targetEmployeeId, setTargetEmployeeId] = useState('');
  const [bindingInProgress, setBindingInProgress] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const fetchEmployeesAndConfig = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // 1. Charger les sites
      const { data: estData } = await supabase
        .from('pointage_establishments')
        .select('id, name, city')
        .eq('is_active', true);
      if (estData && estData.length > 0) {
        setEstablishments(estData);
        if (!selectedSiteId) setSelectedSiteId(estData[0].id);
      }

      // 2. Charger les plannings
      const { data: schedData } = await supabase
        .from('pointage_schedules')
        .select('id, name, category, morning_start, afternoon_end')
        .eq('is_active', true);
      if (schedData && schedData.length > 0) {
        setSchedules(schedData);
        if (!selectedScheduleId) setSelectedScheduleId(schedData[0].id);
      }

      // 3. Charger les employés
      const { data: empData, error } = await supabase
        .from('pointage_employees')
        .select('*, pointage_establishments(id, name), pointage_schedules(id, name, morning_start, afternoon_end)')
        .order('created_at', { ascending: false });

      if (empData && empData.length > 0) {
        const mapped: Employee[] = empData.map((d: any) => {
          const shiftInfo = d.pointage_schedules
            ? `${d.pointage_schedules.name} (${(d.pointage_schedules.morning_start || '07:30').slice(0, 5)} - ${(d.pointage_schedules.afternoon_end || '17:30').slice(0, 5)})`
            : '07h30 - 17h30 (Fractionné)';

          return {
            id: d.id,
            name: d.full_name,
            matricule: d.employee_matricule,
            role: d.role === 'EMPLOYEE' ? 'Collaborateur' : d.role,
            phone: d.phone || '+226 --',
            siteId: d.default_establishment_id,
            site: d.pointage_establishments?.name || 'Siège Principal Ouagadougou',
            scheduleId: d.schedule_id,
            shift: shiftInfo,
            device: d.device_model ? `${d.device_model} (Lié)` : 'En attente d\'activation',
            isBound: Boolean(d.bound_device_id || d.is_enrolled),
            token: d.enrollment_token || 'PPRO-TOKEN'
          };
        });
        setEmployees(mapped);
      }
    } catch (err) {
      console.warn('Erreur fetch employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeesAndConfig();

    const supabase = createClient();
    const channel = supabase
      .channel('realtime_employees_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pointage_employees' }, () => {
        fetchEmployeesAndConfig();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      stopCamera();
    };
  }, []);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const token = 'PPRO-' + Math.floor(100000 + Math.random() * 900000);
    const matricule = 'OUA-2026-00' + (employees.length + 1);

    const siteObj = establishments.find(s => s.id === selectedSiteId);
    const schedObj = schedules.find(sc => sc.id === selectedScheduleId);

    const newEmp: Employee = {
      id: 'emp-' + Date.now(),
      name: newName.trim(),
      matricule: matricule,
      role: newRole,
      phone: newPhone,
      siteId: selectedSiteId,
      site: siteObj?.name || 'Siège Principal Ouagadougou',
      scheduleId: selectedScheduleId,
      shift: schedObj ? `${schedObj.name} (${schedObj.morning_start.slice(0, 5)} - ${schedObj.afternoon_end.slice(0, 5)})` : '07h30 - 17h30 (Fractionné)',
      device: 'En attente d\'activation',
      isBound: false,
      token
    };

    setEmployees(prev => [newEmp, ...prev]);
    setShowAddModal(false);
    setShowQrModal(newEmp);

    try {
      const supabase = createClient();
      await supabase.from('pointage_employees').insert({
        org_id: '00000000-0000-0000-0000-000000000001',
        default_establishment_id: selectedSiteId || '00000000-0000-0000-0000-000000000010',
        schedule_id: selectedScheduleId || '00000000-0000-0000-0000-000000000001',
        full_name: newName.trim(),
        employee_matricule: matricule,
        email: `${newName.toLowerCase().replace(/[^a-z0-9]/g, '')}@pointagepro.bf`,
        phone: newPhone,
        role: 'EMPLOYEE',
        enrollment_token: token,
        is_enrolled: false,
        is_active: true
      });
      await fetchEmployeesAndConfig();
    } catch (err) {
      console.error('Error inserting employee in Supabase:', err);
    }

    setNewName('');
    setNewPhone('+226 ');
  };

  const handleUnbindDevice = async (id: string) => {
    if (confirm("Voulez-vous réinitialiser l'appareil associé pour ce collaborateur ? Il devra scanner à nouveau un code d'activation.")) {
      setEmployees(prev => prev.map(e => e.id === id ? { ...e, isBound: false, device: 'En attente d\'activation' } : e));
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from('pointage_employees')
          .update({ bound_device_id: null, device_model: null, is_enrolled: false })
          .eq('id', id);
        if (error) {
          console.error('Error unbinding device in Supabase:', error);
          alert("Erreur lors de la dissociation : " + error.message);
          return;
        }
        setToastMsg("Appareil dissocié avec succès. Le smartphone sera déconnecté.");
        setTimeout(() => setToastMsg(null), 3500);
      } catch (err) {
        console.error('Error unbinding device in Supabase:', err);
      }
    }
  };

  // ==================== GÉRANT : SCANNER QR COLLABORATEUR (MODE INVERSE) ====================

  const startCamera = async () => {
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Impossible d'accéder à la webcam:", err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const openScanModal = (emp?: Employee) => {
    if (emp) {
      setTargetEmployeeId(emp.id);
    } else if (employees.length > 0) {
      const unenrolled = employees.find(e => !e.isBound);
      setTargetEmployeeId(unenrolled ? unenrolled.id : employees[0].id);
    }
    setScannedDeviceId('');
    setScannedDeviceModel('');
    setShowScanModal(true);
    setTimeout(() => startCamera(), 200);
  };

  const closeScanModal = () => {
    stopCamera();
    setShowScanModal(false);
  };

  const handleBindDeviceToEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEmployeeId || !scannedDeviceId.trim()) return;

    setBindingInProgress(true);
    try {
      const supabase = createClient();
      const model = scannedDeviceModel.trim() || 'Smartphone Sécurisé';

      const { error } = await supabase
        .from('pointage_employees')
        .update({
          bound_device_id: scannedDeviceId.trim(),
          device_model: model,
          is_enrolled: true
        })
        .eq('id', targetEmployeeId);

      if (error) {
        setToastMsg(`Erreur lors de la liaison : ${error.message}`);
      } else {
        const emp = employees.find(e => e.id === targetEmployeeId);
        setToastMsg(`Smartphone lié avec succès à ${emp?.name || 'l\'employé'} ! Son application est maintenant active.`);
        closeScanModal();
        await fetchEmployeesAndConfig();
      }
    } catch (err: any) {
      setToastMsg(`Erreur : ${err.message}`);
    } finally {
      setBindingInProgress(false);
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      <Header
        title="Employés & Enrôlement Sécurisé"
        subtitle="Gestion des collaborateurs, affectation des plannings (Lun-Ven, Lun-Sam) et liaison matérielle unique"
        actionButton={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchEmployeesAndConfig}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-xl transition shadow-sm"
              title="Rafraîchir depuis Supabase"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => openScanModal()}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-sm"
              title="Scanner le QR affiché sur le téléphone du collaborateur (Mode Inversé)"
            >
              <Scan className="w-3.5 h-3.5" />
              <span>📲 Enrôler par Scan Caméra</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Nouveau Collaborateur</span>
            </button>
          </div>
        }
      />

      {toastMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Bannière explicative 0-mot de passe */}
      <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white p-5 rounded-2xl shadow-sm border border-blue-800/40 flex items-center justify-between">
        <div>
          <h3 className="font-extrabold text-sm mb-1 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-blue-400" />
            Enrôlement 0-Mot de Passe & Scellement Matériel
          </h3>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Pour activer un collaborateur, deux méthodes simples : soit l'employé <strong>scanne son invitation QR Code</strong>, soit le gérant <strong>scanne l'écran du smartphone</strong> de l'employé via le bouton violet <em>« 📲 Enrôler par Scan Caméra »</em>. L'appareil est lié immédiatement.
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
                <th className="py-3 px-4">Établissement & Planning</th>
                <th className="py-3 px-4">Statut Liaison Matérielle</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-6 font-semibold text-slate-900">
                    <div className="flex items-center gap-2">
                      <span>{emp.name}</span>
                      {emp.matricule && (
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {emp.matricule}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-normal">{emp.role}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">
                    {emp.phone}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    <div className="font-medium text-slate-800">{emp.site}</div>
                    <div className="text-[11px] text-blue-600 font-medium">{emp.shift}</div>
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
                      {!emp.isBound && (
                        <button
                          onClick={() => openScanModal(emp)}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-semibold transition flex items-center gap-1 text-[11px]"
                          title="Lier directement en scannant le smartphone de ce collaborateur"
                        >
                          <Scan className="w-3.5 h-3.5" />
                          <span>Lier Smartphone</span>
                        </button>
                      )}

                      <button
                        onClick={() => setShowQrModal(emp)}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold transition flex items-center gap-1 text-[11px]"
                        title="Afficher le QR code d'enrôlement ou lien WhatsApp"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>QR Invitation</span>
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

      {/* Modal Ajout Collaborateur avec Sélection de Planning & Établissement */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Enrôler un Nouveau Collaborateur</h3>
                <p className="text-xs text-slate-500">Configurez son affectation de site et son planning d'horaires.</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nom et Prénom *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex : Ouedraogo Moussa"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Fonction / Rôle</label>
                  <input
                    type="text"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Numéro WhatsApp</label>
                  <input
                    type="text"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Sélection Établissement Dynamique */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Site de Pointage Attribué</label>
                <select
                  value={selectedSiteId}
                  onChange={(e) => setSelectedSiteId(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {establishments.map(est => (
                    <option key={est.id} value={est.id}>
                      {est.name} ({est.city || 'Ouagadougou'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sélection Planning d'Horaires Dynamique */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Planning d'Horaires de Travail</label>
                <select
                  value={selectedScheduleId}
                  onChange={(e) => setSelectedScheduleId(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {schedules.map(sch => (
                    <option key={sch.id} value={sch.id}>
                      {sch.name} ({sch.category})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  * L'application calculera les retards et jours de présence en fonction de ce planning précis.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition"
                >
                  Générer l'Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Caméra Gérant : Scan du QR Collaborateur (Mode Inversé) */}
      {showScanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                  <Scan className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Enrôlement par Scan Caméra</h3>
                  <p className="text-xs text-slate-500">Pointez votre caméra vers l'écran du smartphone collaborateur.</p>
                </div>
              </div>
              <button
                onClick={closeScanModal}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Fenêtre Vidéo Webcam */}
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border-2 border-indigo-500/50 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 border-2 border-dashed border-indigo-400/80 m-6 rounded-xl pointer-events-none flex items-center justify-center">
                <span className="text-[11px] text-white/90 bg-black/60 px-3 py-1 rounded-full font-semibold">
                  Cadrez le QR affiché sur le téléphone
                </span>
              </div>
            </div>

            <form onSubmit={handleBindDeviceToEmployee} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Collaborateur concerné</label>
                <select
                  value={targetEmployeeId}
                  onChange={(e) => setTargetEmployeeId(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} {emp.isBound ? '(Déjà lié)' : '⭐ (En attente)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Identifiant Matériel du Smartphone (Device ID) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex : BP2A.250605.031.A3 ou scannez le QR"
                  value={scannedDeviceId}
                  onChange={(e) => setScannedDeviceId(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Modèle du Téléphone</label>
                <input
                  type="text"
                  placeholder="Ex : TECNO CM6 ou Samsung Galaxy A53"
                  value={scannedDeviceModel}
                  onChange={(e) => setScannedDeviceModel(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeScanModal}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={bindingInProgress || !scannedDeviceId.trim()}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{bindingInProgress ? 'Liaison en cours...' : 'Lier et Activer le Smartphone'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal QR Code Invitation */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setShowQrModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <QrCode className="w-7 h-7" />
            </div>

            <div>
              <h3 className="font-extrabold text-base text-slate-900">{showQrModal.name}</h3>
              <p className="text-xs text-slate-500">Invitation d'activation de poste</p>
              {showQrModal.matricule && (
                <span className="inline-block mt-1 text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                  Matricule : {showQrModal.matricule}
                </span>
              )}
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 inline-block">
              {/* Image QR simulée avec le token */}
              <div className="w-44 h-44 bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center p-2 shadow-xs">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(showQrModal.token)}`}
                  alt="QR Code d'activation"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="mt-3 text-xs font-mono font-bold text-slate-800 bg-white py-1.5 px-3 rounded-lg border border-slate-200">
                Code : {showQrModal.token}
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              L'employé ouvre son application PointagePro et scanne ce QR Code ou saisit ce code pour lier son smartphone.
            </p>

            <button
              onClick={() => setShowQrModal(null)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}