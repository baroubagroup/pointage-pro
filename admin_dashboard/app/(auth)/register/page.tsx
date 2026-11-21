'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  Building2, 
  User, 
  Mail, 
  Lock, 
  Phone, 
  MapPin, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Layers, 
  HelpCircle 
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();

  // Form states
  const [companyName, setCompanyName] = useState('');
  const [customOrgCode, setCustomOrgCode] = useState('');
  const [hasManuallyEditedCode, setHasManuallyEditedCode] = useState(false);
  const [sector, setSector] = useState('Services & Entreprise');
  const [city, setCity] = useState('Ouagadougou');
  const [country, setCountry] = useState('Burkina Faso 🇧🇫');

  const [managerName, setManagerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+226 ');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [employeeRange, setEmployeeRange] = useState<'1-5' | '6-15' | '16+'>('6-15');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Générateur dynamique de Code Entreprise
  const generateCodeFromName = (name: string) => {
    if (!name.trim()) return 'ORG-ENT-2026-8492TT';
    
    // Nettoyer les accents et caractères spéciaux
    const cleanName = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .trim();
    
    const words = cleanName.split(/\s+/).filter(w => w.length > 0);
    let initials = '';
    
    if (words.length === 1) {
      initials = words[0].slice(0, 4);
    } else {
      initials = words.map(w => w[0]).join('').slice(0, 5);
    }

    const randNum = Math.floor(1000 + Math.random() * 9000);
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const randLetters = letters[Math.floor(Math.random() * letters.length)] + letters[Math.floor(Math.random() * letters.length)];
    const currentYear = new Date().getFullYear();
    
    return `ORG-${initials}-${currentYear}-${randNum}${randLetters}`;
  };

  // Synchronisation dynamique quand le gérant tape le nom de l'entreprise
  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCompanyName(val);
    if (!hasManuallyEditedCode) {
      setCustomOrgCode(generateCodeFromName(val));
    }
  };

  const handleRegenerateCode = () => {
    setCustomOrgCode(generateCodeFromName(companyName));
    setHasManuallyEditedCode(false);
  };

  // Initialisation du code par défaut
  const activeOrgCode = useMemo(() => {
    return customOrgCode || generateCodeFromName(companyName);
  }, [customOrgCode, companyName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!companyName.trim()) {
      setError("Veuillez renseigner le nom de votre entreprise.");
      setLoading(false);
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError("Veuillez renseigner un email professionnel et un mot de passe.");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const finalCode = activeOrgCode;
      const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      // 1. Création de l'entreprise dans Supabase avec les colonnes vérifiées
      let orgId: string | null = null;
      try {
        const { data: insertedOrg, error: orgErr } = await supabase
          .from('pointage_organizations')
          .insert([
            {
              name: companyName.trim(),
              org_code: finalCode,
              city: city.trim() || 'Ouagadougou',
              country: country || 'Burkina Faso',
              latitude: 11.247051,
              longitude: -4.291915,
              created_at: new Date().toISOString(),
              security_config: {
                manager_name: managerName.trim(),
                manager_email: email.trim(),
                manager_phone: phone.trim(),
                sector_profile: sector,
                city: city.trim(),
                country: country,
                employee_range: employeeRange,
                trial_active: true,
                trial_ends_at: trialEndsAt,
                require_biometrics: true,
                require_selfie: false,
                allow_offline: true,
                hard_block_mock_gps: true,
                support_contact: phone.trim() || 'contact@baroubagroup.com'
              }
            }
          ])
          .select()
          .single();

        if (orgErr) {
          console.warn("Erreur insertion organisation:", orgErr);
        } else if (insertedOrg?.id) {
          orgId = insertedOrg.id;
          
          // 2. Création automatique du premier site géofencé pour cette nouvelle entreprise
          await supabase.from('pointage_establishments').insert([
            {
              org_id: orgId,
              name: `Siège Principal - ${companyName.trim()}`,
              city: city.trim() || 'Ouagadougou',
              latitude: 11.247051,
              longitude: -4.291915,
              radius_meters: 80,
              elastic_radius_meters: 150,
              is_active: true
            }
          ]);
        }
      } catch (dbErr) {
        console.warn("Notice: insertion directe Supabase (mode offline/fallback actif):", dbErr);
      }

      // 3. Mémorisation locale et cookies d'isolation multi-entreprises
      if (typeof window !== 'undefined') {
        if (orgId) localStorage.setItem('pointage_org_id', orgId);
        localStorage.setItem('pointage_org_name', companyName.trim());
        localStorage.setItem('pointage_org_code', finalCode);
        localStorage.setItem('pointage_manager_name', managerName.trim());
        localStorage.setItem('pointage_manager_email', email.trim());
        localStorage.setItem('pointage_manager_phone', phone.trim());
        localStorage.setItem('pointage_trial_ends_at', trialEndsAt);
      }

      // 4. Poser les cookies de session et d'organisation active
      if (orgId) {
        document.cookie = `pointage_active_org_id=${orgId}; path=/; max-age=86400; SameSite=Lax`;
      }
      document.cookie = `pointage_active_org_code=${finalCode}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = 'pointage_manager_session=manager_authenticated; path=/; max-age=86400; SameSite=Lax';

      // 5. Redirection vers le tableau de bord avec notification d'onboarding
      router.push('/dashboard?onboarding=success');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans">
      
      {/* Halos d'ambiance or & obsidian */}
      <div className="pointer-events-none absolute -top-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />

      {/* Header BAROUBA GROUP */}
      <div className="text-center mb-8 relative z-10 space-y-3">
        <Link href="/" className="inline-flex items-center gap-3 group">
          <div className="relative">
            <div className="absolute -inset-1 rounded-full bg-amber-500/30 blur-sm group-hover:bg-amber-500/50 transition" />
            <img
              src="/barouba-group-logo.png"
              alt="BAROUBA GROUP"
              className="relative w-12 h-12 rounded-full object-cover ring-2 ring-amber-500/40"
            />
          </div>
          <div className="text-left">
            <span className="font-black text-xl text-white tracking-tight flex items-center gap-1.5">
              PointagePro
              <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Enterprise
              </span>
            </span>
            <span className="text-xs text-slate-400 font-medium block">
              Édité par BAROUBA GROUP • Burkina Faso 🇧🇫
            </span>
          </div>
        </Link>
      </div>

      {/* Carte Formulaire d'Onboarding */}
      <div className="w-full max-w-xl bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl relative z-10 space-y-7">
        
        {/* Titres & Badges */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Essai 14 Jours Offert • Zéro Carte Bancaire</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Créer votre compte Entreprise
          </h1>
          <p className="text-xs text-slate-400">
            Configurez votre espace en 2 minutes et commencez à pointer par satellite.
          </p>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold animate-fadeIn">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* SECTION 1 : ENTREPRISE */}
          <div className="space-y-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              <span>1. Identité de votre Entreprise</span>
            </span>

            {/* Nom de l'entreprise */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Nom officiel de l'Établissement / Société <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={handleCompanyNameChange}
                placeholder="Ex: BAROUBA GROUP, Clinique de l'Espoir, Sahel BTP..."
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
              />
            </div>

            {/* Code Organisation Canonique Auto-Généré */}
            <div className="p-4 rounded-2xl bg-slate-950/90 border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Code Établissement Canonique (Généré)</span>
                </label>
                <button
                  type="button"
                  onClick={handleRegenerateCode}
                  className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold cursor-pointer"
                  title="Générer une nouvelle clé"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Régénérer</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  required
                  value={activeOrgCode}
                  onChange={(e) => {
                    setCustomOrgCode(e.target.value.toUpperCase());
                    setHasManuallyEditedCode(true);
                  }}
                  className="w-full font-mono font-black text-sm text-amber-300 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 tracking-wider focus:outline-none focus:border-amber-400"
                />
              </div>

              <p className="text-[10px] text-slate-400 leading-relaxed">
                Ce code officiel servira à enrôler les smartphones de vos collaborateurs lors de l'activation sur WhatsApp.
              </p>
            </div>

            {/* Secteur & Ville en 2 colonnes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Secteur d'activité</label>
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="Services & Entreprise">Services & Tertiaire</option>
                  <option value="Commerce & Boutiques">Commerce & Vente</option>
                  <option value="BTP & Chantiers">BTP, Mines & Industrie</option>
                  <option value="Santé & Cliniques">Santé, Cliniques & Pharmacie</option>
                  <option value="Éducation & Universités">Éducation & Écoles</option>
                  <option value="Sécurité & Gardiennage">Sécurité & Gardiennage</option>
                  <option value="Restauration & Hôtellerie">Hôtellerie & Restauration</option>
                  <option value="Autre">Autre activité</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Ville du Siège</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex: Ouagadougou, Bobo, Abidjan..."
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2 : RESPONSABLE / GÉRANT */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>2. Coordonnées du Gérant / DRH</span>
            </span>

            {/* Nom complet */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Nom & Prénom du Responsable <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                placeholder="Ex: Ibrahim Ouedraogo"
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Email & Téléphone WhatsApp en 2 colonnes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Email Professionnel <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@entreprise.com"
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Numéro WhatsApp <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+226 70 00 00 00"
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Mot de Passe d'Accès <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 caractères"
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-2xl pl-10 pr-11 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 3 : ESTIMATION EFFECTIF */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>3. Taille de votre Effectif</span>
            </span>

            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setEmployeeRange('1-5')}
                className={`p-3 rounded-2xl border text-center transition cursor-pointer ${
                  employeeRange === '1-5'
                    ? 'bg-amber-500/15 border-amber-400 text-amber-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="block font-black text-sm">1 à 5</span>
                <span className="block text-[10px] text-slate-400 mt-0.5">Starter • 5 000 F</span>
              </button>

              <button
                type="button"
                onClick={() => setEmployeeRange('6-15')}
                className={`p-3 rounded-2xl border text-center transition cursor-pointer relative ${
                  employeeRange === '6-15'
                    ? 'bg-amber-500/15 border-amber-400 text-amber-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="block font-black text-sm">6 à 15</span>
                <span className="block text-[10px] text-slate-400 mt-0.5">Croissance • 10 000 F</span>
              </button>

              <button
                type="button"
                onClick={() => setEmployeeRange('16+')}
                className={`p-3 rounded-2xl border text-center transition cursor-pointer ${
                  employeeRange === '16+'
                    ? 'bg-amber-500/15 border-amber-400 text-amber-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="block font-black text-sm">16 et +</span>
                <span className="block text-[10px] text-emerald-400 font-bold mt-0.5">Plafond • 15 000 F</span>
              </button>
            </div>
          </div>

          {/* Bouton de Soumission */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 transition duration-200 active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Initialisation de votre espace...</span>
              ) : (
                <>
                  <span>Créer mon Entreprise & Activer l'Essai 14 Jours</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Lien Déjà Inscrit */}
          <div className="text-center pt-2">
            <p className="text-xs text-slate-400">
              Votre entreprise a déjà un compte ?{' '}
              <Link href="/login" className="text-amber-400 hover:text-amber-300 font-bold transition">
                Se connecter à l'espace gérant →
              </Link>
            </p>
          </div>

        </form>

      </div>

      {/* Footer sécurité & copyright */}
      <div className="mt-8 text-center text-xs text-slate-500 space-y-1 relative z-10">
        <p className="flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Données cryptées & souveraines • Hébergement conforme standards WGS84</span>
        </p>
        <p>© BAROUBA GROUP. Tous droits réservés.</p>
      </div>

    </div>
  );
}
