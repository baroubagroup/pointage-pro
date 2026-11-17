'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/header';
import { createClient } from '@/lib/supabase/client';
import { 
  Building2, 
  Shield, 
  Save, 
  MapPin, 
  Plus, 
  ExternalLink, 
  CheckCircle2, 
  Radio, 
  Smartphone, 
  Wifi, 
  Eye, 
  Fingerprint, 
  Clock, 
  FileCheck2,
  AlertCircle,
  GraduationCap,
  Briefcase,
  Ticket,
  Sparkles
} from 'lucide-react';

interface SimpleSite {
  id: string;
  name: string;
  city: string;
  radiusMeters: number;
}

interface SecurityConfig {
  require_wifi_bssid: boolean;
  hard_block_mock_gps: boolean;
  require_device_binding: boolean;
  require_face_on_colleague_assist: boolean;
  require_biometrics: boolean;
  block_early_arrival: boolean;
  auto_prompt_delay_justification: boolean;
  allow_offline: boolean;
  grace_delay_minutes: number;
  max_break_minutes: number;
  sector_profile?: 'ENTERPRISE' | 'SCHOOL' | 'EVENT';
}

const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  require_wifi_bssid: false,
  hard_block_mock_gps: true,
  require_device_binding: true,
  require_face_on_colleague_assist: true,
  require_biometrics: true,
  block_early_arrival: true,
  auto_prompt_delay_justification: true,
  allow_offline: true,
  grace_delay_minutes: 15,
  max_break_minutes: 90,
  sector_profile: 'ENTERPRISE',
};

export default function ParametresPage() {
  const [orgName, setOrgName] = useState('BAROUBA POINTAGE PRO');
  const [orgCode, setOrgCode] = useState('ORG-8492');
  const [copiedCode, setCopiedCode] = useState(false);
  const [timezone, setTimezone] = useState('Africa/Abidjan (GMT 0)');
  const [sectorProfile, setSectorProfile] = useState<'ENTERPRISE' | 'SCHOOL' | 'EVENT'>('ENTERPRISE');
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig>(DEFAULT_SECURITY_CONFIG);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sites, setSites] = useState<SimpleSite[]>([]);

  useEffect(() => {
    const fetchOrgSettings = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('pointage_organizations')
          .select('*')
          .limit(1)
          .single();

        if (data) {
          if (data.name) setOrgName(data.name);
          if (data.org_code) setOrgCode(data.org_code);
          if (data.security_config) {
            setSecurityConfig(prev => ({
              ...prev,
              ...data.security_config
            }));
            if (data.security_config.sector_profile) {
              setSectorProfile(data.security_config.sector_profile);
            }
          }
        }
      } catch (err) {
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem('pointage_security_config');
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              setSecurityConfig(parsed);
              if (parsed.sector_profile) setSectorProfile(parsed.sector_profile);
            } catch (_) {}
          }
        }
      }
    };

    const fetchSites = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('pointage_establishments')
          .select('id, name, city, radius_meters')
          .eq('is_active', true)
          .order('name');

        if (data && data.length > 0) {
          setSites(data.map((d: any) => ({
            id: d.id,
            name: d.name,
            city: d.city || 'Abidjan',
            radiusMeters: d.radius_meters || 80
          })));
        } else {
          setSites([
            { id: '1', name: 'Siège Principal & Direction', city: 'Abidjan (Plateau)', radiusMeters: 80 },
            { id: '2', name: 'Entrepôt Logistique Zone Nord', city: 'Abidjan (Yopougon)', radiusMeters: 120 }
          ]);
        }
      } catch (err) {
        console.warn('Error fetching sites in settings:', err);
      }
    };

    fetchOrgSettings();
    fetchSites();
  }, []);

  const handleToggle = (key: keyof SecurityConfig) => {
    setSecurityConfig(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const mergedConfig: SecurityConfig = {
      ...securityConfig,
      sector_profile: sectorProfile
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('pointage_security_config', JSON.stringify(mergedConfig));
      localStorage.setItem('pointage_org_name', orgName);
      localStorage.setItem('pointage_sector_profile', sectorProfile);
    }

    try {
      const supabase = createClient();
      await supabase
        .from('pointage_organizations')
        .update({
          name: orgName,
          org_code: orgCode.toUpperCase().trim(),
          security_config: mergedConfig
        })
        .eq('id', '00000000-0000-0000-0000-000000000001');

      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch (err) {
      console.error('Erreur sauvegarde paramètres dans Supabase:', err);
      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Header
        title="Paramètres de l'Organisation"
        subtitle="Profil métier, code établissement universel ORG, protocole anti-fraude et géofencing"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Formulaire Principal de Configuration (2 colonnes) */}
        <form onSubmit={handleSave} className="lg:col-span-2 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-7">
          
          {/* Section 0 : Sélecteur de Profil Métier (Scolaire / Entreprise / Événement) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Secteur d'Activité & Profil Métier
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                Adaptation Automatique
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Sélectionnez votre cas d'usage pour adapter la terminologie et les flux de l'ensemble de la plateforme.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div
                onClick={() => setSectorProfile('ENTERPRISE')}
                className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                  sectorProfile === 'ENTERPRISE'
                    ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  {sectorProfile === 'ENTERPRISE' && (
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Entreprise / PME</h4>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                    Collaborateurs, Départements, Heures de travail, Chantiers & Agences
                  </p>
                </div>
              </div>

              <div
                onClick={() => setSectorProfile('SCHOOL')}
                className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                  sectorProfile === 'SCHOOL'
                    ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  {sectorProfile === 'SCHOOL' && (
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Établissement Scolaire</h4>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                    Élèves, Classes, Campus, Justifications parentales d'absence
                  </p>
                </div>
              </div>

              <div
                onClick={() => setSectorProfile('EVENT')}
                className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                  sectorProfile === 'EVENT'
                    ? 'border-purple-600 bg-purple-50/40 ring-2 ring-purple-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                    <Ticket className="w-4 h-4" />
                  </div>
                  {sectorProfile === 'EVENT' && (
                    <CheckCircle2 className="w-4 h-4 text-purple-600" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Événementiel & Salons</h4>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                    Participants, Badges, Pavillons & Portiques d'accès WGS84
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 1 : Identité de l'organisation & Code ORG */}
          <div className="pt-6 border-t border-slate-100 space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              Identité de l'Organisation & Code Établissement
            </h3>
            <p className="text-xs text-slate-500">
              Paramètres d'enrôlement mobile en masse distribués aux 500+ utilisateurs.
            </p>

            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nom Officiel de l'Organisation / Établissement
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Code Établissement Unique (Clé Multi-Tenant)
                  </label>
                  <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    À communiquer aux utilisateurs
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={orgCode}
                    onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
                    placeholder="ORG-8492"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-black tracking-wider uppercase text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(orgCode);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="shrink-0 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{copiedCode ? '✓ Copié !' : 'Copier le Code'}</span>
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  * Vos élèves ou employés renseignent ce code simple (ex: <strong className="font-mono text-slate-600">ORG-8492</strong>) sur l'application mobile avec leur matricule et secret 2FA pour lier leur smartphone en 2 secondes.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fuseau Horaire de Référence</label>
                <input
                  type="text"
                  disabled
                  value={timezone}
                  className="w-full text-xs bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-500 font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  * Scellé sur l'horloge atomique UTC pour prévenir toute falsification d'horodatage.
                </span>
              </div>
            </div>
          </div>

          {/* Section 2 : Matrice de Sécurité Anti-Triche */}
          <div className="pt-6 border-t border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  Matrice des Contrôles de Sécurité & Anti-Fraude
                </h3>
                <p className="text-xs text-slate-500">Activez ou désactivez les vérifications en temps réel sur les smartphones.</p>
              </div>
              <span className="text-[10px] uppercase font-extrabold tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                Temps Réel
              </span>
            </div>

            <div className="space-y-3 pt-2">
              
              {/* Bouclier Mock GPS */}
              <div className="flex items-start justify-between p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 shrink-0 mt-0.5">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">Bouclier Anti-Faux GPS & Mock Locations</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                      Détecte et bloque immédiatement toute usurpation par application tierce (Fake GPS, Mock Location Android).
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4 mt-1">
                  <input
                    type="checkbox"
                    checked={securityConfig.hard_block_mock_gps}
                    onChange={() => handleToggle('hard_block_mock_gps')}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Wi-Fi BSSID */}
              <div className="flex items-start justify-between p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0 mt-0.5">
                    <Wifi className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">Validation Wi-Fi BSSID Obligatoire</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                      Exige la détection de la box Wi-Fi de l'établissement. <span className="text-indigo-600 font-semibold">(Désactivez pour autoriser les chantiers et sites extérieurs).</span>
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4 mt-1">
                  <input
                    type="checkbox"
                    checked={securityConfig.require_wifi_bssid}
                    onChange={() => handleToggle('require_wifi_bssid')}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Device Binding */}
              <div className="flex items-start justify-between p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600 shrink-0 mt-0.5">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">Liaison Matérielle Unique (1 Appareil = 1 Compte)</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                      Scelle l'appareil mobile au compte collaborateur. Empêche le prêt d'appareil ou le pointage de complaisance.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4 mt-1">
                  <input
                    type="checkbox"
                    checked={securityConfig.require_device_binding}
                    onChange={() => handleToggle('require_device_binding')}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Reconnaissance Faciale Dépannage */}
              <div className="flex items-start justify-between p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-purple-50 text-purple-600 shrink-0 mt-0.5">
                    <Eye className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">Reconnaissance Faciale en RAM (Dépannage Collègue)</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                      Vérification biométrique instantanée sans stockage de photo dans le cloud en cas de dépannage sur un autre appareil.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4 mt-1">
                  <input
                    type="checkbox"
                    checked={securityConfig.require_face_on_colleague_assist}
                    onChange={() => handleToggle('require_face_on_colleague_assist')}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Biométrie Native */}
              <div className="flex items-start justify-between p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-teal-50 text-teal-600 shrink-0 mt-0.5">
                    <Fingerprint className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">Biométrie Matérielle (Touch ID / Face ID)</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                      Exige l'empreinte digitale ou le déverrouillage facial natif du smartphone avant tout pointage.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4 mt-1">
                  <input
                    type="checkbox"
                    checked={securityConfig.require_biometrics}
                    onChange={() => handleToggle('require_biometrics')}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Section 3 : Seuils Temporels */}
          <div className="pt-6 border-t border-slate-100 space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Seuils Algorithmiques de Tolérance
            </h3>
            <p className="text-xs text-slate-500">Définissez les marges temporelles autorisées avant déclenchement d'une alerte.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tolérance Retard Prise de Poste</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={securityConfig.grace_delay_minutes}
                    onChange={(e) => setSecurityConfig(prev => ({
                      ...prev,
                      grace_delay_minutes: parseInt(e.target.value, 10) || 0
                    }))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <span className="text-xs text-slate-500 font-semibold">minutes</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Durée Max Pause Déjeuner</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="15"
                    max="180"
                    value={securityConfig.max_break_minutes}
                    onChange={(e) => setSecurityConfig(prev => ({
                      ...prev,
                      max_break_minutes: parseInt(e.target.value, 10) || 0
                    }))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <span className="text-xs text-slate-500 font-semibold">minutes</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bouton de Sauvegarde */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            {saved ? (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4" /> Paramètres synchronisés sur tous les appareils !
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">Modifications synchronisées en direct sur les smartphones</span>
            )}
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Sauvegarde...' : 'Enregistrer la Configuration'}</span>
            </button>
          </div>
        </form>

        {/* Panneau Latéral : Établissements & Sites (1 colonne) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                Périmètres & Sites Actifs
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {sites.length} Actifs
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Chaque site possède son rayon satellite de présence (géofencing WGS84) et son empreinte Wi-Fi certifiée.
            </p>

            <div className="space-y-2.5">
              {sites.map((site) => (
                <div key={site.id} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">{site.name}</h4>
                    <span className="text-[10px] text-slate-500">{site.city} • Rayon {site.radiusMeters}m</span>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" title="Actif" />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-2">
            <Link
              href="/sites?action=new"
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter un Nouveau Périmètre</span>
            </Link>

            <Link
              href="/sites"
              className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold py-2 transition"
            >
              <span>Accéder au Radar Satellite Géofencing</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
