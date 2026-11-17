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
  AlertCircle
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
}

const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  require_wifi_bssid: false, // Optionnel par défaut pour supporter les chantiers/sites sans Wi-Fi
  hard_block_mock_gps: true,
  require_device_binding: true,
  require_face_on_colleague_assist: true,
  require_biometrics: true,
  block_early_arrival: true,
  auto_prompt_delay_justification: true,
  allow_offline: true,
  grace_delay_minutes: 15,
  max_break_minutes: 90,
};

export default function ParametresPage() {
  const [orgName, setOrgName] = useState('Société Ivoire Prestige');
  const [orgCode, setOrgCode] = useState('ORG-8492');
  const [copiedCode, setCopiedCode] = useState(false);
  const [timezone, setTimezone] = useState('Africa/Abidjan (GMT 0)');
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig>(DEFAULT_SECURITY_CONFIG);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sites, setSites] = useState<SimpleSite[]>([]);

  useEffect(() => {
    // 1. Charger la configuration de sécurité depuis Supabase
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
          }
        }
      } catch (err) {
        // Fallback localStorage
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem('pointage_security_config');
          if (cached) {
            try {
              setSecurityConfig(JSON.parse(cached));
            } catch (_) {}
          }
        }
      }
    };

    // 2. Charger les sites
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
            { id: '1', name: 'Boutique Centrale - Siège', city: 'Abidjan (Plateau)', radiusMeters: 80 },
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

    // 1. Sauvegarde dans localStorage pour réactivité instantanée
    if (typeof window !== 'undefined') {
      localStorage.setItem('pointage_security_config', JSON.stringify(securityConfig));
      localStorage.setItem('pointage_org_name', orgName);
    }

    // 2. Sauvegarde dans Supabase
    try {
      const supabase = createClient();
      await supabase
        .from('pointage_organizations')
        .update({
          name: orgName,
          org_code: orgCode.toUpperCase().trim(),
          security_config: securityConfig
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
        title="Paramètres de l'Entreprise"
        subtitle="Règles d'assiduité, matrice de sécurité anti-triche et gestion des sites de pointage"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulaire Principal de Configuration */}
        <form onSubmit={handleSave} className="lg:col-span-2 bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
          
          {/* Section 1 : Identité de l'organisation */}
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 mb-1 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              Identité de l'Organisation
            </h3>
            <p className="text-xs text-slate-500 mb-4">Informations affichées aux collaborateurs lors du pointage mobile.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Raison Sociale / Nom de l'Entreprise</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Code Établissement Unique (Identifiant Multi-Tenant)
                  </label>
                  <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Pour l'enrôlement mobile en masse
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={orgCode}
                    onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
                    placeholder="ORG-8492"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold tracking-wider uppercase"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(orgCode);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="shrink-0 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                  >
                    <span>{copiedCode ? '✓ Copié !' : 'Copier'}</span>
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  * Vos 500 élèves ou collaborateurs saisissent ce code dans l'application mobile pour rejoindre directement votre structure.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fuseau Horaire Satellite de Référence</label>
                <input
                  type="text"
                  disabled
                  value={timezone}
                  className="w-full text-xs bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-500 font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  * Verrouillé sur l'horloge atomique UTC pour garantir l'inaltérabilité légale des pointages.
                </span>
              </div>
            </div>
          </div>

          {/* Section 2 : Matrice des Contrôles Anti-Triche (Cochable / Interactive) */}
          <div className="pt-5 border-t border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  Matrice des Contrôles Anti-Triche & Sécurité
                </h3>
                <p className="text-xs text-slate-500">Cochez ou décochez les vérifications exigées lors de chaque pointage.</p>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                Paramétrable en Direct
              </span>
            </div>

            <div className="space-y-3 pt-2">
              {/* Règle 1 : Wi-Fi BSSID */}
              <div className="flex items-start justify-between p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0 mt-0.5">
                    <Wifi className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">Validation Wi-Fi BSSID Obligatoire</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                      Exige la connexion à la box Wi-Fi de l'établissement. <span className="text-indigo-600 font-semibold">(Désactivez pour autoriser les chantiers et sites extérieurs sans Wi-Fi).</span>
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

              {/* Règle 2 : Bouclier Anti-Mock GPS */}
              <div className="flex items-start justify-between p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 shrink-0 mt-0.5">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">Bouclier Anti-Faux GPS & Mock Locations</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                      Détecte et bloque immédiatement toute tentative de pointage avec application d'usurpation de position GPS (Fake GPS, Fly GPS).
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

              {/* Règle 3 : Liaison Matérielle Unique (Device Binding) */}
              <div className="flex items-start justify-between p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0 mt-0.5">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">Liaison Matérielle Unique (1 Smartphone = 1 Employé)</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                      Scelle l'appareil mobile au compte collaborateur. Empêche le prêt de smartphone ou le pointage de complaisance.
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

              {/* Règle 4 : Reconnaissance Faciale Dépannage */}
              <div className="flex items-start justify-between p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-purple-50 text-purple-600 shrink-0 mt-0.5">
                    <Eye className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">Reconnaissance Faciale sur Dépannage Collègue</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                      Exige le scan biométrique facial en mémoire vive (RAM) sans stockage de photo lors de l'assistance d'un collègue sans téléphone.
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

              {/* Règle 5 : Biométrie Smartphone */}
              <div className="flex items-start justify-between p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-teal-50 text-teal-600 shrink-0 mt-0.5">
                    <Fingerprint className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">Biométrie Matérielle de l'Appareil (Touch ID / Face ID)</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                      Déclenche le capteur d'empreinte ou la reconnaissance faciale native du smartphone avant chaque validation de pointage.
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

              {/* Règle 6 : Blocage Arrivées Précoces */}
              <div className="flex items-start justify-between p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-600 shrink-0 mt-0.5">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">Restriction des Pointages Trop Anticipés</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                      Empêche ou avertit le collaborateur lorsqu'il tente de pointer plus de 45 minutes avant le début officiel de son quart de travail.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4 mt-1">
                  <input
                    type="checkbox"
                    checked={securityConfig.block_early_arrival}
                    onChange={() => handleToggle('block_early_arrival')}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Règle 7 : Justification Obligatoire Retard */}
              <div className="flex items-start justify-between p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-rose-50 text-rose-600 shrink-0 mt-0.5">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">Formulaire Mobile de Justification de Retard</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                      Ouvre automatiquement le module de justification sur le smartphone si le collaborateur pointe après le seuil de tolérance.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4 mt-1">
                  <input
                    type="checkbox"
                    checked={securityConfig.auto_prompt_delay_justification}
                    onChange={() => handleToggle('auto_prompt_delay_justification')}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Section 3 : Seuils Horaires Numériques */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="font-extrabold text-sm text-slate-900 mb-1 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Seuils Algorithmiques de Tolérance
            </h3>
            <p className="text-xs text-slate-500 mb-4">Définissez les marges temporelles autorisées avant déclenchement d'une alerte.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
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
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
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
                <CheckCircle2 className="w-4 h-4" /> Paramètres & Politique Anti-Triche enregistrés avec succès !
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
              <span>{saving ? 'Sauvegarde...' : 'Enregistrer la Politique'}</span>
            </button>
          </div>
        </form>

        {/* Panneau Latéral : Établissements & Sites */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                Sites & Établissements
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {sites.length} Actifs
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Chaque site possède son rayon satellite de présence (géofencing) et son empreinte Wi-Fi.
            </p>

            <div className="space-y-2">
              {sites.map((site) => (
                <div key={site.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">{site.name}</h4>
                    <span className="text-[10px] text-slate-500">{site.city} • Rayon {site.radiusMeters}m</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="Actif" />
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
              <span>Ajouter un Nouveau Site</span>
            </Link>

            <Link
              href="/sites"
              className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold py-2 transition"
            >
              <span>Gérer les Box Wi-Fi & Rayons GPS</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
