'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { createClient } from '@/lib/supabase/client';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Cpu, 
  Radio, 
  Clock, 
  Smartphone, 
  CheckCircle2, 
  Eye, 
  Fingerprint, 
  FileCheck2, 
  XCircle,
  Save,
  RefreshCw
} from 'lucide-react';

interface SecurityConfig {
  require_wifi_bssid: boolean;
  hard_block_mock_gps: boolean;
  require_device_binding: boolean;
  require_face_on_colleague_assist: boolean;
  require_biometrics: boolean;
  block_early_arrival: boolean;
  auto_prompt_delay_justification: boolean;
  allow_offline: boolean;
}

const DEFAULT_CONFIG: SecurityConfig = {
  require_wifi_bssid: false,
  hard_block_mock_gps: true,
  require_device_binding: true,
  require_face_on_colleague_assist: true,
  require_biometrics: true,
  block_early_arrival: true,
  auto_prompt_delay_justification: true,
  allow_offline: true,
};

export default function SecurityPage() {
  const [config, setConfig] = useState<SecurityConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchSecurityConfig = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('pointage_organizations')
        .select('security_config')
        .limit(1)
        .single();

      if (data && data.security_config) {
        setConfig(prev => ({ ...prev, ...data.security_config }));
      }
    } catch (err) {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('pointage_security_config');
        if (cached) {
          try {
            setConfig(JSON.parse(cached));
          } catch (_) {}
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityConfig();
  }, []);

  const handleToggle = async (key: keyof SecurityConfig, label: string) => {
    const updated = {
      ...config,
      [key]: !config[key]
    };
    setConfig(updated);

    // Sauvegarde locale
    if (typeof window !== 'undefined') {
      localStorage.setItem('pointage_security_config', JSON.stringify(updated));
    }

    // Sauvegarde Supabase
    try {
      const supabase = createClient();
      await supabase
        .from('pointage_organizations')
        .update({ security_config: updated })
        .eq('id', '00000000-0000-0000-0000-000000000001');

      setToastMsg(`Règle "${label}" : ${updated[key] ? 'Activée' : 'Désactivée'}`);
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err) {
      console.error('Erreur toggle securite:', err);
      setToastMsg(`Règle mise à jour localement`);
      setTimeout(() => setToastMsg(null), 3000);
    }
  };

  const securityRules = [
    {
      id: 'hard_block_mock_gps' as keyof SecurityConfig,
      title: 'Détection Faux GPS & Mock Locations (Android)',
      icon: Radio,
      desc: 'Toute application d\'usurpation de position GPS (Fake GPS, Mock Locations) active sur le smartphone est détectée et entraîne le rejet instantané du pointage.',
      isFixed: false,
    },
    {
      id: 'require_wifi_bssid' as keyof SecurityConfig,
      title: 'Confirmation Réseau Wi-Fi Box Professionnel (BSSID)',
      icon: Cpu,
      desc: 'Validation de l\'adresse MAC unique de la box Internet de l\'entreprise. Désactivez si vos équipes travaillent sur des chantiers ou sites sans Wi-Fi.',
      isFixed: false,
    },
    {
      id: 'require_device_binding' as keyof SecurityConfig,
      title: 'Liaison Matérielle Unique (Hardware Device ID)',
      icon: Smartphone,
      desc: 'Chaque compte employé est scellé cryptographiquement à un seul appareil mobile. Empêche le prêt d\'appareil ou le pointage de complaisance.',
      isFixed: false,
    },
    {
      id: 'require_face_on_colleague_assist' as keyof SecurityConfig,
      title: 'Reconnaissance Faciale sur Dépannage Collègue',
      icon: Eye,
      desc: 'Exige la vérification du visage en mémoire vive (RAM) lorsqu\'un employé utilise le smartphone d\'un collègue (zéro photo stockée sur le cloud).',
      isFixed: false,
    },
    {
      id: 'require_biometrics' as keyof SecurityConfig,
      title: 'Biométrie Matérielle du Smartphone (Touch ID / Face ID)',
      icon: Fingerprint,
      desc: 'Exige l\'authentification par capteur d\'empreinte ou reconnaissance faciale native du smartphone avant de valider tout pointage.',
      isFixed: false,
    },
    {
      id: 'block_early_arrival' as keyof SecurityConfig,
      title: 'Restriction des Arrivées Précoces (> 45 min)',
      icon: Clock,
      desc: 'Alerte ou bloque les collaborateurs lorsqu\'ils tentent de pointer leur arrivée bien avant l\'heure d\'ouverture officielle du quart de travail.',
      isFixed: false,
    },
    {
      id: 'auto_prompt_delay_justification' as keyof SecurityConfig,
      title: 'Formulaire Mobile de Justification de Retard',
      icon: FileCheck2,
      desc: 'Ouvre automatiquement le formulaire de déclaration du motif sur le smartphone dès que l\'arrivée dépasse la marge de tolérance autorisée.',
      isFixed: false,
    },
    {
      id: 'satellite_utc_clock' as any,
      title: 'Horodatage Satellite UTC Inviolable (Invariant Légal)',
      icon: Clock,
      desc: 'L\'heure de pointage est certifiée par les signaux satellites GPS UTC. La modification manuelle de l\'heure du téléphone est sans aucun effet.',
      isFixed: true,
    },
  ];

  return (
    <div className="space-y-6">
      <Header
        title="Matrice de Sécurité & Contrôles Anti-Triche"
        subtitle="Activez ou désactivez les protocoles de vérification appliqués en direct sur l'application mobile"
        actionButton={
          <button
            onClick={fetchSecurityConfig}
            disabled={loading}
            className="flex items-center gap-1.5 p-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition shadow-sm"
            title="Rafraîchir les politiques"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      {/* Toast de confirmation de modification */}
      {toastMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-semibold animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        </div>
      )}

      {/* Grille des Règles Anti-Triche */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {securityRules.map((rule, idx) => {
          const Icon = rule.icon;
          const isActive = rule.isFixed ? true : Boolean(config[rule.id as keyof SecurityConfig]);

          return (
            <div 
              key={idx} 
              className={`bg-white rounded-2xl border transition shadow-sm p-6 space-y-4 ${
                isActive ? 'border-slate-200/80 hover:border-emerald-300' : 'border-slate-200 bg-slate-50/40 opacity-80'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 ${
                    isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {isActive ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>ACTIF & EXIGÉ</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3 text-slate-400" />
                        <span>DÉSACTIVÉ</span>
                      </>
                    )}
                  </span>

                  {/* Toggle Switch */}
                  {!rule.isFixed ? (
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => handleToggle(rule.id, rule.title)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-mono italic">
                      Verrouillé
                    </span>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-extrabold text-sm text-slate-900 mb-1">{rule.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{rule.desc}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400">Statut de la règle :</span>
                <span className={`font-semibold ${isActive ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {rule.isFixed 
                    ? 'Invariant Cryptographique Inviolable' 
                    : (isActive ? 'Contrôle Obligatoire à Chaque Pointage' : 'Contrôle Désactivé / Optionnel')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
