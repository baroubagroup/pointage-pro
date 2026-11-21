'use client';

import { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/header';
import { createClient } from '@/lib/supabase/client';
import * as XLSX from 'xlsx';
import { 
  UserPlus, 
  QrCode, 
  Smartphone, 
  Share2, 
  Unlink, 
  CheckCircle2, 
  Clock, 
  X, 
  RefreshCw, 
  Camera, 
  Scan, 
  AlertCircle,
  FileSpreadsheet,
  Download,
  UploadCloud,
  AlertTriangle,
  ArrowRight,
  FileCheck,
  Check,
  Sparkles,
  Users,
  Wand2,
  Link2,
  Copy,
  MessageSquare,
  ExternalLink
} from 'lucide-react';

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

  // Organization & Magic Link States
  const [currentOrgId, setCurrentOrgId] = useState<string>(() => (typeof window !== 'undefined' ? localStorage.getItem('pointage_org_id') || '' : ''));
  const [orgCode, setOrgCode] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('pointage_org_code') || '' : ''));
  const [orgName, setOrgName] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('pointage_org_name') || '' : ''));
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // New employee form
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('Collaborateur');
  const [newPhone, setNewPhone] = useState('+226 ');
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [selectedScheduleId, setSelectedScheduleId] = useState('');

  // Mass Import States (Pour 500+ élèves ou collaborateurs)
  const [showMassModal, setShowMassModal] = useState(false);
  const [massStep, setMassStep] = useState<'upload' | 'preview' | 'importing' | 'completed'>('upload');
  const [massSiteId, setMassSiteId] = useState('');
  const [massScheduleId, setMassScheduleId] = useState('');
  const [massFileName, setMassFileName] = useState('');
  const [massValidRows, setMassValidRows] = useState<any[]>([]);
  const [massInvalidRows, setMassInvalidRows] = useState<{ row: number; matricule: string; name: string; error: string }[]>([]);
  const [massImportProgress, setMassImportProgress] = useState(0);
  const [massGeneratedList, setMassGeneratedList] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manager Camera QR Scanner state
  const [cameraActive, setCameraActive] = useState(false);
  const [scannedDeviceId, setScannedDeviceId] = useState('');
  const [scannedDeviceModel, setScannedDeviceModel] = useState('');
  const [targetEmployeeId, setTargetEmployeeId] = useState('');
  const [bindingInProgress, setBindingInProgress] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Helpers pour le Lien Magique
  const getMagicLink = (emp: Employee) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    return `${origin}/rejoindre?token=${emp.token}&org=${orgCode}&mat=${encodeURIComponent(emp.matricule || '')}`;
  };

  const handleCopyMagicLink = (emp: Employee) => {
    const link = getMagicLink(emp);
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setToastMsg(`✓ Lien magique de ${emp.name} copié dans le presse-papier !`);
    setTimeout(() => setCopiedLink(false), 2500);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleShareWhatsApp = (emp: Employee) => {
    const link = getMagicLink(emp);
    const text = `Bonjour ${emp.name},\nVoici votre *Lien Magique d'Activation* pour l'application PointagePro (${orgName}) :\n\n👉 Cliquez directement ici pour activer votre compte :\n${link}\n\nVotre Matricule : *${emp.matricule}*\nCode Jeton : *${emp.token}*\nCode Établissement : *${orgCode}*\n\nInstallez l'application PointagePro et cliquez sur ce lien pour lier votre téléphone en 1 clic !`;
    
    const cleanPhone = (emp.phone || '').replace(/[^0-9]/g, '');
    const waUrl = cleanPhone.length >= 8 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    
    window.open(waUrl, '_blank');
  };

  const fetchEmployeesAndConfig = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const activeOrgId = typeof window !== 'undefined' ? localStorage.getItem('pointage_org_id') : null;
      const activeOrgCode = typeof window !== 'undefined' ? localStorage.getItem('pointage_org_code') : null;

      // 0. Charger l'organisation & code multi-tenant
      let orgQuery = supabase
        .from('pointage_organizations')
        .select('id, name, org_code');
      if (activeOrgId) {
        orgQuery = orgQuery.eq('id', activeOrgId);
      } else if (activeOrgCode && activeOrgCode !== 'ORG-8492') {
        orgQuery = orgQuery.eq('org_code', activeOrgCode);
      } else {
        orgQuery = orgQuery.order('created_at', { ascending: false }).limit(1);
      }
      const { data: orgData } = await orgQuery.single();

      let resolvedOrgId = activeOrgId || currentOrgId;
      if (orgData) {
        resolvedOrgId = orgData.id;
        setCurrentOrgId(orgData.id);
        if (orgData.org_code) setOrgCode(orgData.org_code);
        if (orgData.name) setOrgName(orgData.name);
      }

      // 1. Charger les sites de cette entreprise
      let estQuery = supabase
        .from('pointage_establishments')
        .select('id, name, city')
        .eq('is_active', true);
      if (resolvedOrgId) {
        estQuery = estQuery.eq('org_id', resolvedOrgId);
      }
      const { data: estData } = await estQuery;
      if (estData && estData.length > 0) {
        setEstablishments(estData);
        if (!selectedSiteId) setSelectedSiteId(estData[0].id);
      } else {
        setEstablishments([]);
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

      // 3. Charger les employés de cette entreprise uniquement
      let empQuery = supabase
        .from('pointage_employees')
        .select('*, pointage_establishments(id, name), pointage_schedules(id, name, morning_start, afternoon_end)')
        .order('created_at', { ascending: false });
      if (resolvedOrgId) {
        empQuery = empQuery.eq('org_id', resolvedOrgId);
      }
      const { data: empData, error } = await empQuery;

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
      } else {
        setEmployees([]);
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
        org_id: currentOrgId,
        default_establishment_id: selectedSiteId || (establishments[0]?.id || null),
        schedule_id: selectedScheduleId || (schedules[0]?.id || null),
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

  // ==================== FONCTIONS IMPORT EN MASSE (EXCEL / CSV) ====================

  // 1. Télécharger le modèle Excel officiel
  const downloadTemplateXlsx = () => {
    const templateData = [
      {
        Matricule: 'MAT-2026-001',
        Nom: 'TRAORE',
        Prenom: 'Amadou',
        Telephone: '+226 70 12 34 56',
        Classe_ou_Service: 'Terminale S2',
        Date_Naissance_ou_Secret: '14/05/2006',
        Role: 'Elève'
      },
      {
        Matricule: 'MAT-2026-002',
        Nom: 'SAWADOGO',
        Prenom: 'Fatou',
        Telephone: '+226 76 98 76 54',
        Classe_ou_Service: 'Terminale S2',
        Date_Naissance_ou_Secret: '22/11/2005',
        Role: 'Elève'
      },
      {
        Matricule: 'MAT-2026-003',
        Nom: 'KABORE',
        Prenom: 'Ibrahim',
        Telephone: '+226 78 55 44 33',
        Classe_ou_Service: '3ème A',
        Date_Naissance_ou_Secret: '08/02/2008',
        Role: 'Elève'
      },
      {
        Matricule: 'MAT-2026-004',
        Nom: 'OUEDRAOGO',
        Prenom: 'Awa',
        Telephone: '+226 71 00 11 22',
        Classe_ou_Service: 'Administration',
        Date_Naissance_ou_Secret: '03/09/1990',
        Role: 'Collaborateur'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Effectif_A_Importer');
    XLSX.writeFile(wb, 'modele_import_pointagepro.xlsx');
  };

  // 2. Télécharger en CSV
  const downloadTemplateCsv = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Matricule,Nom,Prenom,Telephone,Classe_ou_Service,Date_Naissance_ou_Secret,Role\n"
      + "MAT-2026-001,TRAORE,Amadou,+226 70 12 34 56,Terminale S2,14/05/2006,Elève\n"
      + "MAT-2026-002,SAWADOGO,Fatou,+226 76 98 76 54,Terminale S2,22/11/2005,Elève\n"
      + "MAT-2026-003,KABORE,Ibrahim,+226 78 55 44 33,3ème A,08/02/2008,Elève\n"
      + "MAT-2026-004,OUEDRAOGO,Awa,+226 71 00 11 22,Administration,03/09/1990,Collaborateur\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "modele_import_pointagepro.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 3. Traitement & Sas de Pré-validation (Dry-Run)
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMassFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          alert("Le fichier est vide ou n'a pas pu être lu.");
          return;
        }

        const valid: any[] = [];
        const invalid: { row: number; matricule: string; name: string; error: string }[] = [];
        const seenMatriculesInFile = new Set<string>();
        const existingMatriculesInDb = new Set(
          employees.map(emp => (emp.matricule || '').toUpperCase().trim()).filter(Boolean)
        );

        rawJson.forEach((row, idx) => {
          const rowNum = idx + 2; // Ligne 1 = en-tête

          // Détection intelligente insensible à la casse et aux espaces
          const getVal = (possibleKeys: string[]) => {
            for (const key of Object.keys(row)) {
              const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
              for (const pk of possibleKeys) {
                if (cleanKey === pk.toLowerCase().replace(/[^a-z0-9]/g, '')) {
                  return String(row[key] || '').trim();
                }
              }
            }
            return '';
          };

          const matricule = getVal(['matricule', 'id', 'identifiant', 'code']);
          const nom = getVal(['nom', 'nomfamille', 'lastname']);
          const prenom = getVal(['prenom', 'prénom', 'firstname']);
          const tel = getVal(['telephone', 'téléphone', 'tel', 'phone', 'contact', 'whatsapp']);
          const classe = getVal(['classe_ou_service', 'classe', 'service', 'departement', 'section', 'groupe']);
          const secret = getVal(['date_naissance_ou_secret', 'secret', 'date_naissance', 'datenaissance', 'dob', 'secret_personnel']);
          const role = getVal(['role', 'fonction', 'statut']) || 'Collaborateur';

          const fullName = [nom, prenom].filter(Boolean).join(' ');

          // Contrôles de Sécurité & Conformité
          if (!nom) {
            invalid.push({ row: rowNum, matricule: matricule || '---', name: 'Inconnu', error: 'Nom obligatoire manquant' });
            return;
          }
          if (!matricule) {
            invalid.push({ row: rowNum, matricule: '---', name: fullName, error: 'Matricule officiel manquant' });
            return;
          }

          const upperMat = matricule.toUpperCase().trim();
          if (seenMatriculesInFile.has(upperMat)) {
            invalid.push({ row: rowNum, matricule, name: fullName, error: 'Matricule en doublon dans le fichier' });
            return;
          }
          seenMatriculesInFile.add(upperMat);

          if (existingMatriculesInDb.has(upperMat)) {
            invalid.push({ row: rowNum, matricule, name: fullName, error: 'Ce matricule existe déjà dans votre effectif' });
            return;
          }

          valid.push({
            matricule,
            nom,
            prenom,
            fullName,
            telephone: tel || '+226 --',
            classe: classe || 'Général',
            secret: secret || '1234',
            role
          });
        });

        setMassValidRows(valid);
        setMassInvalidRows(invalid);
        setMassStep('preview');
      } catch (err: any) {
        console.error('Erreur lecture fichier:', err);
        alert("Erreur lors de l'analyse du fichier : " + err.message);
      }
    };

    reader.readAsBinaryString(file);
  };

  // 4. Exécution de l'Import par Lots dans Supabase
  const executeBatchImport = async () => {
    if (massValidRows.length === 0) return;
    setMassStep('importing');
    setMassImportProgress(0);

    const supabase = createClient();
    const siteId = massSiteId || selectedSiteId || (establishments[0]?.id ?? null);
    const scheduleId = massScheduleId || selectedScheduleId || (schedules[0]?.id ?? null);

    const newlyCreated: any[] = [];
    const total = massValidRows.length;
    const batchSize = 25; // Par lots de 25 pour une insertion fluide

    try {
      for (let i = 0; i < total; i += batchSize) {
        const batch = massValidRows.slice(i, i + batchSize);
        const recordsToInsert = batch.map((r) => {
          const randNum = Math.floor(100000 + Math.random() * 900000);
          const token = `PPRO-${randNum}`;
          const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
          
          newlyCreated.push({
            matricule: r.matricule,
            nom_complet: r.fullName,
            classe: r.classe,
            telephone: r.telephone,
            token_activation: token,
            lien_activation: `${origin}/rejoindre?token=${token}&org=${orgCode}&mat=${encodeURIComponent(r.matricule)}`
          });

          return {
            org_id: currentOrgId,
            default_establishment_id: siteId,
            schedule_id: scheduleId,
            full_name: r.fullName,
            employee_matricule: r.matricule,
            email: `${r.matricule.toLowerCase().replace(/[^a-z0-9]/g, '')}@pointagepro.bf`,
            phone: r.telephone,
            role: r.role === 'Elève' ? 'EMPLOYEE' : 'EMPLOYEE',
            department: r.classe,
            birth_date: r.secret,
            security_secret: r.secret,
            enrollment_token: token,
            is_enrolled: false,
            is_active: true
          };
        });

        const { error } = await supabase.from('pointage_employees').insert(recordsToInsert);
        if (error) {
          console.error('Erreur lot Supabase:', error);
          throw error;
        }

        const currentDone = Math.min(i + batchSize, total);
        setMassImportProgress(Math.round((currentDone / total) * 100));
      }

      setMassGeneratedList(newlyCreated);
      setMassStep('completed');
      await fetchEmployeesAndConfig();
      setToastMsg(`Succès : ${newlyCreated.length} profils créés et configurés avec succès !`);
      setTimeout(() => setToastMsg(null), 4000);
    } catch (err: any) {
      console.error('Erreur import massif:', err);
      alert("Erreur lors de l'enregistrement : " + err.message);
      setMassStep('preview');
    }
  };

  // 5. Exporter la liste des Badges / Tokens générés
  const downloadGeneratedListXlsx = () => {
    if (massGeneratedList.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(massGeneratedList);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tokens_Activation');
    XLSX.writeFile(wb, `pointagepro_tokens_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
              onClick={() => {
                setMassStep('upload');
                setMassValidRows([]);
                setMassInvalidRows([]);
                setMassImportProgress(0);
                setMassGeneratedList([]);
                setShowMassModal(true);
              }}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-sm"
              title="Importer en 1 clic 500+ élèves ou collaborateurs depuis Excel / CSV avec pré-validation"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>📊 Import en Masse (Excel/CSV)</span>
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
                    <div className="flex items-center justify-end gap-1.5">
                      {!emp.isBound && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleCopyMagicLink(emp)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold transition flex items-center gap-1.5 text-[11px] cursor-pointer"
                            title="Copier le Lien Magique d'enrôlement direct pour ce collaborateur"
                          >
                            <Wand2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Lien Magique</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openScanModal(emp)}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-semibold transition flex items-center gap-1 text-[11px] cursor-pointer"
                            title="Lier directement en scannant le smartphone de ce collaborateur"
                          >
                            <Scan className="w-3.5 h-3.5" />
                            <span>Lier</span>
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => setShowQrModal(emp)}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold transition flex items-center gap-1 text-[11px] cursor-pointer"
                        title="Ouvrir le Kit d'Invitation (Lien Magique, WhatsApp & QR Code)"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Invitation & QR</span>
                      </button>

                      {emp.isBound && (
                        <button
                          type="button"
                          onClick={() => handleUnbindDevice(emp.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-semibold transition flex items-center gap-1 text-[11px] cursor-pointer"
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

      {/* ==================== MODAL LIEN MAGIQUE & INVITATION INDIVIDUELLE ==================== */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 sm:p-7 space-y-5 max-h-[92vh] overflow-y-auto">
            
            {/* En-tête */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                  <Wand2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      Lien Magique Disponible
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                      {showQrModal.matricule || 'Sans matricule'}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-lg text-slate-900 mt-0.5 leading-snug">
                    {showQrModal.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {showQrModal.role} • {showQrModal.site}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowQrModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SECTION 1 : LIEN MAGIQUE EN 1 CLIC (MAGIC LINK) */}
            <div className="p-4 sm:p-5 bg-linear-to-br from-blue-50 via-indigo-50/50 to-white rounded-2xl border border-blue-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-black uppercase tracking-wider text-blue-900">
                    Lien Magique d'Enrôlement Mobile
                  </span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                  Zéro Saisie
                </span>
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed">
                Envoyez ce lien magique par WhatsApp ou SMS. En cliquant dessus depuis son smartphone, l'application PointagePro s'ouvre et configure instantanément son compte avec son matricule et son jeton sans aucune saisie manuelle !
              </p>

              {/* Champ d'affichage du lien */}
              <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-blue-200 shadow-inner">
                <input
                  type="text"
                  readOnly
                  value={getMagicLink(showQrModal)}
                  className="w-full text-xs font-mono text-slate-700 bg-transparent px-2 py-1 outline-none truncate select-all"
                />
                <button
                  type="button"
                  onClick={() => handleCopyMagicLink(showQrModal)}
                  className="shrink-0 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copié !' : 'Copier'}</span>
                </button>
              </div>

              {/* Boutons d'Action Rapide */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(showQrModal)}
                  className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-emerald-500/20"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Envoyer sur WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyMagicLink(showQrModal)}
                  className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Link2 className="w-4 h-4 text-blue-600" />
                  <span>{copiedLink ? '✓ Lien Copié !' : 'Copier le Lien Magique'}</span>
                </button>
              </div>
            </div>

            {/* SECTION 2 : QR CODE ET JETON */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-center gap-4">
              <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-xs shrink-0 flex flex-col items-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(getMagicLink(showQrModal))}`}
                  alt="QR Code d'enrôlement magique"
                  className="w-28 h-28 object-contain"
                />
                <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Scan Caméra</span>
              </div>

              <div className="space-y-2 flex-1 text-xs">
                <h4 className="font-bold text-slate-800">Alternative : Scan QR ou Saisie du Jeton</h4>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Si le collaborateur utilise un autre appareil ou préfère scanner, il peut pointer son appareil photo sur ce code.
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg flex-1 font-mono font-bold text-slate-800 text-xs">
                    Jeton : <span className="text-blue-600">{showQrModal.token}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyToken(showQrModal.token)}
                    className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                    title="Copier le jeton"
                  >
                    {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="text-[10px] text-slate-500 font-mono">
                  Code Établissement : <strong className="text-slate-800">{orgCode}</strong>
                </div>
              </div>
            </div>

            {/* Bouton de Fermeture */}
            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowQrModal(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==================== MODAL IMPORT EN MASSE (EXCEL / CSV) ==================== */}
      {showMassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
            
            {/* En-tête de la Modal */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Importation en Masse Sécurisée (500+ Utilisateurs)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Écoles, entreprises et grands événements • Sas de pré-validation anti-doublon
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (massStep === 'importing') return;
                  setShowMassModal(false);
                }}
                disabled={massStep === 'importing'}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60 transition disabled:opacity-40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corps de la Modal selon l'Étape */}
            <div className="p-6 overflow-y-auto space-y-5">
              
              {/* ÉTAPE 1 : DÉPÔT DU FICHIER & TÉLÉCHARGEMENT DU MODÈLE */}
              {massStep === 'upload' && (
                <div className="space-y-5">
                  {/* Bloc A : Téléchargement du Modèle Officiel */}
                  <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-extrabold text-xs text-blue-950 flex items-center gap-1.5">
                        <Download className="w-4 h-4 text-blue-600" />
                        Étape 1 : Téléchargez le Modèle Standard Conforme
                      </h4>
                      <p className="text-[11px] text-blue-800/80 mt-0.5 leading-relaxed">
                        Contient les colonnes requises : <em>Matricule, Nom, Prénom, Téléphone, Classe/Service, Date de Naissance / Secret</em>.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={downloadTemplateXlsx}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Modèle Excel (.xlsx)</span>
                      </button>
                      <button
                        type="button"
                        onClick={downloadTemplateCsv}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl transition"
                      >
                        <span>CSV</span>
                      </button>
                    </div>
                  </div>

                  {/* Bloc B : Affectation par Défaut (Héritage Automatique) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Site / Établissement de Rattachement</label>
                      <select
                        value={massSiteId || (establishments[0]?.id ?? '')}
                        onChange={(e) => setMassSiteId(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium"
                      >
                        {establishments.map(est => (
                          <option key={est.id} value={est.id}>{est.name} ({est.city || 'Principal'})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Planning / Horaires par Défaut</label>
                      <select
                        value={massScheduleId || (schedules[0]?.id ?? '')}
                        onChange={(e) => setMassScheduleId(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium"
                      >
                        {schedules.map(sch => (
                          <option key={sch.id} value={sch.id}>{sch.name} ({sch.category})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Bloc C : Zone de Dépôt Drag & Drop */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Étape 2 : Déposez votre fichier rempli (.xlsx, .xls ou .csv)
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleFileSelected}
                      className="hidden"
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2 group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition duration-200">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <div className="text-xs font-bold text-slate-800">
                        Cliquez ici ou glissez votre fichier Excel / CSV
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Formats acceptés : Microsoft Excel (.xlsx, .xls) et CSV texte séparé par virgules
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ÉTAPE 2 : SAS DE PRÉ-VALIDATION (DRY-RUN) */}
              {massStep === 'preview' && (
                <div className="space-y-4">
                  {/* Résumé Statistique du Sas */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Lignes Détectées</span>
                      <div className="text-xl font-black text-slate-900 mt-0.5">
                        {massValidRows.length + massInvalidRows.length}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                      <span className="text-[10px] text-emerald-700 font-bold uppercase">100% Conformes & Prêts</span>
                      <div className="text-xl font-black text-emerald-700 mt-0.5">
                        {massValidRows.length}
                      </div>
                    </div>
                    <div className={`p-3.5 rounded-xl ${massInvalidRows.length > 0 ? 'bg-red-50 border border-red-200' : 'bg-slate-50 border border-slate-200'}`}>
                      <span className={`text-[10px] font-bold uppercase ${massInvalidRows.length > 0 ? 'text-red-700' : 'text-slate-500'}`}>
                        Anomalies Bloquées
                      </span>
                      <div className={`text-xl font-black mt-0.5 ${massInvalidRows.length > 0 ? 'text-red-700' : 'text-slate-400'}`}>
                        {massInvalidRows.length}
                      </div>
                    </div>
                  </div>

                  {/* Rapport d'Anomalies si erreurs */}
                  {massInvalidRows.length > 0 && (
                    <div className="p-4 rounded-2xl bg-red-50/80 border border-red-200 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-red-900">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>{massInvalidRows.length} ligne(s) bloquée(s) pour non-conformité :</span>
                      </div>
                      <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                        {massInvalidRows.map((err, i) => (
                          <div key={i} className="text-[11px] bg-white p-2 rounded-lg border border-red-100 text-red-800 flex items-center justify-between">
                            <span className="font-semibold">Ligne {err.row} : {err.name} (Matricule: {err.matricule})</span>
                            <span className="font-bold text-red-600">{err.error}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-red-700 italic">
                        * Les profils non conformes sont automatiquement écartés pour protéger l'intégrité de votre base de données.
                      </p>
                    </div>
                  )}

                  {/* Aperçu des Profils Valides */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" />
                      Aperçu des profils qui seront créés ({massValidRows.length}) :
                    </h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold sticky top-0">
                          <tr>
                            <th className="py-2 px-3">Matricule</th>
                            <th className="py-2 px-3">Nom & Prénom</th>
                            <th className="py-2 px-3">Classe / Service</th>
                            <th className="py-2 px-3">Contact</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {massValidRows.slice(0, 15).map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-1.5 px-3 font-mono font-bold text-blue-600">{row.matricule}</td>
                              <td className="py-1.5 px-3 font-semibold">{row.fullName}</td>
                              <td className="py-1.5 px-3">{row.classe}</td>
                              <td className="py-1.5 px-3 font-mono text-slate-500">{row.telephone}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {massValidRows.length > 15 && (
                      <p className="text-[10px] text-slate-400 mt-1 italic">
                        ... et {massValidRows.length - 15} autres profils prêts à être importés.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ÉTAPE 3 : EN COURS D'IMPORTATION */}
              {massStep === 'importing' && (
                <div className="py-10 text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto animate-pulse">
                    <Sparkles className="w-7 h-7 animate-spin" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">
                      Importation et Génération des Jetons en Cours...
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Enregistrement sécurisé dans la base Supabase Cloud ({massImportProgress}%)
                    </p>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden max-w-md mx-auto">
                    <div
                      className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${massImportProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* ÉTAPE 4 : IMPORTATION TERMINÉE AVEC SUCCÈS */}
              {massStep === 'completed' && (
                <div className="py-6 text-center space-y-5">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg text-slate-900">
                      {massGeneratedList.length} Profils Importés avec Succès !
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                      Chaque collaborateur/élève dispose désormais de son jeton unique et peut s'enrôler sur son application mobile.
                    </p>
                  </div>

                  {/* Bouton Téléchargement Récapitulatif avec Tokens */}
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl max-w-md mx-auto space-y-3">
                    <div className="text-xs font-bold text-emerald-950 flex items-center justify-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                      <span>Fiche Récapitulative des Tokens d'Activation</span>
                    </div>
                    <p className="text-[11px] text-emerald-800/80">
                      Téléchargez le classeur Excel contenant les matricules et tokens pour transmission aux élèves, parents ou chefs de service.
                    </p>
                    <button
                      type="button"
                      onClick={downloadGeneratedListXlsx}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Télécharger le Fichier des Tokens (.xlsx)</span>
                    </button>
                  </div>

                  {/* Rappel Code Établissement Mobile */}
                  <div className="p-3 bg-slate-100 rounded-xl text-[11px] text-slate-600 max-w-md mx-auto">
                    💡 <strong>Enrôlement Mobile 2FA :</strong> Les utilisateurs peuvent aussi simplement ouvrir leur app PointagePro, choisir <em>« Rejoindre mon Établissement »</em> et saisir le code organisation (<strong>ORG-8492</strong>) avec leur matricule !
                  </div>
                </div>
              )}
            </div>

            {/* Pied de la Modal avec Boutons d'Action */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between shrink-0">
              {massStep === 'upload' && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowMassModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition"
                  >
                    Fermer
                  </button>
                  <span className="text-[11px] text-slate-400 italic">
                    Glissez votre fichier pour lancer la pré-validation
                  </span>
                </>
              )}

              {massStep === 'preview' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMassStep('upload');
                      setMassValidRows([]);
                      setMassInvalidRows([]);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition"
                  >
                    ← Changer de Fichier
                  </button>
                  <button
                    type="button"
                    disabled={massValidRows.length === 0}
                    onClick={executeBatchImport}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-40 flex items-center gap-2"
                  >
                    <span>Valider & Importer les {massValidRows.length} Profils</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {massStep === 'completed' && (
                <button
                  type="button"
                  onClick={() => setShowMassModal(false)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition"
                >
                  Terminer et Revenir aux Collaborateurs
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}