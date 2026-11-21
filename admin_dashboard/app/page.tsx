'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Shield, 
  CheckCircle2, 
  MapPin, 
  Wifi, 
  Smartphone, 
  Users, 
  Clock, 
  Sparkles, 
  ArrowRight, 
  Zap, 
  RefreshCw, 
  Lock, 
  HelpCircle, 
  Mail, 
  Check, 
  Building2, 
  Layers, 
  TrendingUp,
  FileSpreadsheet,
  AlertTriangle,
  Fingerprint,
  ChevronDown,
  HardHat,
  Stethoscope,
  Utensils,
  ShieldCheck,
  Star,
  Quote,
  Award,
  Briefcase
} from 'lucide-react';

export default function LandingPage() {
  // Simulateur de Rentabilité
  const [employeeCount, setEmployeeCount] = useState(12);

  // Onglet démo produit interactif
  const [activeDemoTab, setActiveDemoTab] = useState<'mobile' | 'cockpit' | 'justif' | 'export'>('mobile');

  // FAQ Accordion
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  // Calcul dynamique ROI (Plafond garanti à 15 000 FCFA/mois)
  const calculateMonthlyCost = (count: number) => {
    if (count <= 5) return 5000;
    if (count <= 15) return 10000;
    return 15000; // Plafond Garanti absolu !
  };

  const pointageProMonthly = calculateMonthlyCost(employeeCount);
  const pointageProAnnual = pointageProMonthly * 12;
  const badgeusePurchaseCost = 450000; // Achat badgeuse biométrique + pose + câblage
  const badgeuseMaintenanceAnnual = 100000; // Déplacements techniciens, pannes poussière
  const badgeuseTotalYear1 = badgeusePurchaseCost + badgeuseMaintenanceAnnual;
  const annualSavings = badgeuseTotalYear1 - pointageProAnnual;

  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100 font-sans antialiased selection:bg-amber-500 selection:text-black">
      
      {/* ==================== 0. BANDEAU D'ANNONCE HAUTE VISIBILITÉ ==================== */}
      <aside aria-label="Annonce officielle" className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 text-xs font-bold py-2 px-4 text-center border-b border-amber-400/40 shadow-sm relative z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 flex-wrap">
          <span className="inline-block px-2 py-0.5 rounded-full bg-slate-950 text-amber-300 text-[10px] font-black uppercase tracking-wider">
            Nouveau
          </span>
          <span>PointagePro Enterprise 2026.11 est déployé • Essai 14 jours 100% offert sans carte bancaire • Plafond garanti à 15 000 FCFA/mois</span>
          <Link href="/register" className="underline font-black hover:text-black ml-1 inline-flex items-center gap-1">
            Créer mon compte entreprise &rarr;
          </Link>
        </div>
      </aside>

      {/* ==================== 1. NAVIGATION PRINCIPALE ==================== */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#070A12]/85 border-b border-white/10 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo Officiel BAROUBA GROUP & Nom Produit */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute -inset-1 rounded-full bg-amber-500/30 blur-sm group-hover:bg-amber-500/50 transition" />
              <img
                src="/barouba-group-logo.png"
                alt="BAROUBA GROUP"
                className="relative w-10 h-10 rounded-full object-cover ring-2 ring-amber-500/40"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-lg text-white tracking-tight flex items-center gap-1.5">
                PointagePro
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Enterprise
                </span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Par BAROUBA GROUP • Burkina Faso 🇧🇫
              </span>
            </div>
          </Link>

          {/* Liens de Navigation Desktop */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-slate-300">
            <a href="#fonctionnement" className="hover:text-amber-400 transition">Fonctionnement</a>
            <a href="#comparatif" className="hover:text-amber-400 transition">Vs Badgeuse</a>
            <a href="#metiers" className="hover:text-amber-400 transition">Secteurs</a>
            <a href="#demo" className="hover:text-amber-400 transition">Aperçu Produit</a>
            <a href="#technologie" className="hover:text-amber-400 transition">Technologie</a>
            <a href="#simulateur" className="hover:text-amber-400 transition">Simulateur ROI</a>
            <a href="#tarifs" className="hover:text-amber-400 transition">Tarifs</a>
            <a href="#faq" className="hover:text-amber-400 transition">FAQ</a>
          </nav>

          {/* Actions & Connexion */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/5 border border-white/10 transition"
            >
              Espace Gérant
            </Link>
            <Link
              href="/register"
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 hover:shadow-lg hover:shadow-amber-500/25 transition active:scale-95"
            >
              <span>Essai Gratuit 14 Jours</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ==================== 2. HERO SECTION D'ÉLITE ==================== */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        {/* Halos d'ambiance or et bleu nuit */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[48rem] h-[28rem] bg-gradient-to-b from-amber-500/15 via-amber-700/5 to-transparent rounded-full blur-3xl -z-10" />
        <div className="pointer-events-none absolute top-40 -left-20 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl -z-10" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          
          {/* Badge Haute Fiabilité */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold backdrop-blur-md animate-fadeIn shadow-sm shadow-amber-500/10">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Solution 100% Logicielle • Zéro Matériel • Précision Satellite 1 Mètre</span>
          </div>

          {/* Titre Accroche Massue */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.1] max-w-5xl mx-auto">
            Dites adieu aux badgeuses en panne.{' '}
            <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 bg-clip-text text-transparent">
              Pointez par satellite.
            </span>
          </h1>

          {/* Sous-titre persuasif */}
          <p className="text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
            La solution de pointage mobile infalsifiable conçue pour les entreprises, cliniques, chantiers et institutions. 
            Géofencing WGS84 invariant, validation Wi-Fi sous dalle béton, biométrie native et résilience 100% hors-ligne. 
            <strong className="text-white font-semibold"> Éliminez définitivement les retards, les contestations et la fraude sans dépenser un franc en matériel.</strong>
          </p>

          {/* Boutons d'Action Principaux */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-3">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 transition duration-200 active:scale-95 cursor-pointer"
            >
              <span>Démarrer l'essai gratuit de 14 jours</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/apk"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white border border-white/15 font-bold text-sm transition duration-200 cursor-pointer active:scale-95"
            >
              <Smartphone className="w-4 h-4 text-amber-400" />
              <span>Télécharger l'App Employé (APK)</span>
            </Link>
          </div>

          {/* Réassurances directes */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Zéro matériel à acheter</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Plafond max à 15 000 FCFA/mois</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Conforme CIL & Droit du Travail</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Édité au Burkina Faso 🇧🇫</span>
            </div>
          </div>

          {/* Cockpit Preview Bento Card */}
          <div className="pt-8 max-w-5xl mx-auto">
            <div className="relative rounded-3xl p-2 sm:p-3 bg-gradient-to-b from-white/15 via-white/5 to-white/0 border border-white/15 shadow-2xl shadow-black/80">
              <div className="rounded-2xl bg-slate-950 overflow-hidden border border-slate-800 p-6 sm:p-8 text-left space-y-6">
                
                {/* Façade Barre Supérieure Cockpit */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500 animate-pulse shrink-0" />
                    <div>
                      <h2 className="font-extrabold text-sm sm:text-base text-white">Cockpit de Supervision en Direct</h2>
                      <p className="text-xs text-slate-400">Périmètre Siège Ouagadougou • WGS84 Satellite Live</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-emerald-400 font-bold">
                      🛰️ 12/12 Présents à l'heure
                    </span>
                    <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                      0 Fraude Détectée
                    </span>
                  </div>
                </div>

                {/* 3 Cartes Rapides d'illustration Cockpit */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
                    <span className="text-[11px] uppercase font-bold text-slate-400">Précision Géodésique</span>
                    <p className="text-xl font-black text-emerald-400">14 mètres du centre</p>
                    <p className="text-[11px] text-slate-500">Validation Satellite WGS84 + BSSID Wi-Fi</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
                    <span className="text-[11px] uppercase font-bold text-slate-400">Sécurité Matérielle</span>
                    <p className="text-xl font-black text-amber-400">Anti-Mock GPS Actif</p>
                    <p className="text-[11px] text-slate-500">Liaison Smartphone unique vérifiée</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
                    <span className="text-[11px] uppercase font-bold text-slate-400">Économie de l'Entreprise</span>
                    <p className="text-xl font-black text-white">450 000 FCFA</p>
                    <p className="text-[11px] text-slate-500">Budget badgeuse matérielle économisé</p>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ==================== 3. BANDEAU CHIFFRES CLÉS D'IMPACT ==================== */}
      <section className="py-12 bg-slate-950 border-y border-white/5 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-black text-amber-400 font-mono">0 FCFA</p>
              <p className="text-xs font-bold text-white">Frais de matériel & câblage</p>
              <p className="text-[11px] text-slate-400">Vos employés utilisent leur smartphone</p>
            </div>

            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono">&lt; 1 mètre</p>
              <p className="text-xs font-bold text-white">Précision géodésique WGS84</p>
              <p className="text-[11px] text-slate-400">Calibration satellite infalsifiable</p>
            </div>

            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-black text-blue-400 font-mono">0.8 sec</p>
              <p className="text-xs font-bold text-white">Temps de pointage moyen</p>
              <p className="text-[11px] text-slate-400">Zéro file d'attente à l'entrée</p>
            </div>

            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-black text-amber-300 font-mono">15 000 F</p>
              <p className="text-xs font-bold text-white">Plafond mensuel garanti</p>
              <p className="text-[11px] text-slate-400">Même avec 50 ou 200 employés</p>
            </div>

          </div>
        </div>
      </section>

      {/* ==================== 4. COMMENT ÇA MARCHE EN 3 ÉTAPES ==================== */}
      <section id="fonctionnement" className="py-20 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
          
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Simplicité Déconcertante</span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Déployé en 5 minutes. Zéro technicien.
            </h2>
            <p className="text-sm sm:text-base text-slate-400">
              Oubliez les installations de badgeuses murales qui prennent des semaines. Tout est prêt en trois étapes simples.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            
            {/* Étape 1 */}
            <div className="p-8 rounded-3xl bg-slate-900/60 border border-white/10 space-y-4 relative group hover:border-amber-500/40 transition">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-black text-lg flex items-center justify-center">
                1
              </div>
              <h3 className="text-lg font-bold text-white">Création & Définition des Sites</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Créez votre entreprise en 2 minutes sur le portail web. Placez le repère sur votre entreprise via la carte satellite et réglez le rayon autorisé (ex: 30 mètres).
              </p>
              <div className="text-[11px] font-semibold text-amber-400/90 pt-2 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>Détection Wi-Fi automatique disponible</span>
              </div>
            </div>

            {/* Étape 2 */}
            <div className="p-8 rounded-3xl bg-slate-900/60 border border-white/10 space-y-4 relative group hover:border-amber-500/40 transition">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-black text-lg flex items-center justify-center">
                2
              </div>
              <h3 className="text-lg font-bold text-white">Vos Salariés Installent l'App</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Vos collaborateurs téléchargent l'application Android PointagePro et saisissent votre Code Entreprise unique. L'application se lie de manière sécurisée à leur téléphone.
              </p>
              <div className="text-[11px] font-semibold text-blue-400/90 pt-2 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>Invitation directe par WhatsApp ou SMS</span>
              </div>
            </div>

            {/* Étape 3 */}
            <div className="p-8 rounded-3xl bg-slate-900/60 border border-white/10 space-y-4 relative group hover:border-amber-500/40 transition">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-lg flex items-center justify-center">
                3
              </div>
              <h3 className="text-lg font-bold text-white">Supervision Directe & Paie 1-Clic</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Chaque matin, suivez les arrivées en direct sur votre tableau de bord. En fin de mois, exportez le relevé complet des heures en Excel en 1 clic certifié.
              </p>
              <div className="text-[11px] font-semibold text-emerald-400/90 pt-2 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>Zéro contestation salariale</span>
              </div>
            </div>

          </div>

          <div className="text-center pt-2">
            <Link
              href="/register"
              className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/15 transition active:scale-95"
            >
              <span>Essayer gratuitement maintenant (14 jours sans engagement)</span>
              <ArrowRight className="w-4 h-4 text-amber-400" />
            </Link>
          </div>

        </div>
      </section>

      {/* ==================== 5. SECTION CHOC : BADGEUSE MURALE VS POINTAGEPRO ==================== */}
      <section id="comparatif" className="py-20 bg-slate-950/70 border-y border-white/5 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Comparatif Sans Appel</span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Pourquoi continuer à acheter des badgeuses murales ?
            </h2>
            <p className="text-sm sm:text-base text-slate-400">
              Les entreprises modernes abandonnent les terminaux physiques encombrants pour une solution purement logicielle, plus fiable et 10 fois plus économique.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            
            {/* Colonne 1 : La Badgeuse Physique Traditionnelle (Rouge/Négatif) */}
            <div className="rounded-3xl p-7 sm:p-8 bg-gradient-to-b from-rose-950/20 to-slate-950 border border-rose-500/20 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 text-xs font-bold border border-rose-500/20">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>La Badgeuse Physique Traditionnelle</span>
                </div>
                <h3 className="text-xl font-bold text-white">Coûteuse, fragile et figée au mur</h3>
                
                <ul className="space-y-3.5 text-xs text-slate-300">
                  <li className="flex items-start gap-3">
                    <span className="text-rose-400 font-bold shrink-0">✕</span>
                    <span><strong>Achat lourd :</strong> 350 000 à 600 000 FCFA d'investissement initial par appareil.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-rose-400 font-bold shrink-0">✕</span>
                    <span><strong>Pannes récurrentes :</strong> Poussière sahélienne, pannes Sonabel, capteurs optiques encrassés.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-rose-400 font-bold shrink-0">✕</span>
                    <span><strong>Technicien obligatoire :</strong> Frais de câblage, déplacement payant à la moindre panne.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-rose-400 font-bold shrink-0">✕</span>
                    <span><strong>Inutile hors bureau :</strong> Impossible à déployer sur des chantiers, livreurs ou agents terrain.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-rose-400 font-bold shrink-0">✕</span>
                    <span><strong>Prêt de badges :</strong> Un employé peut facilement badger pour son collègue en retard.</span>
                  </li>
                </ul>
              </div>

              <div className="pt-4 border-t border-rose-500/20 text-xs text-rose-400/90 font-medium">
                Bilan : Un gouffre financier avec maintenance permanente.
              </div>
            </div>

            {/* Colonne 2 : PointagePro Enterprise (Or/Positif) */}
            <div className="rounded-3xl p-7 sm:p-8 bg-gradient-to-b from-amber-950/30 to-slate-950 border border-amber-500/40 space-y-6 flex flex-col justify-between shadow-xl shadow-amber-950/20 relative">
              <div className="absolute top-4 right-4">
                <span className="px-3 py-1 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                  Recommandé
                </span>
              </div>

              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-bold border border-amber-500/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>PointagePro Enterprise (100% Logiciel)</span>
                </div>
                <h3 className="text-xl font-bold text-white">Précis, infalsifiable et instantané</h3>
                
                <ul className="space-y-3.5 text-xs text-slate-200">
                  <li className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>0 FCFA de matériel :</strong> Vos collaborateurs utilisent simplement leur propre smartphone.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>100% Résilient :</strong> Fonctionne même en coupure d'électricité et sans Internet grâce à l'heure satellite.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Déploiement en 5 minutes :</strong> Ajoutez vos sites et invitez votre équipe par lien sécurisé WhatsApp.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Multisites universel :</strong> Idéal pour les sièges, agences, chantiers BTP, dépôts et techniciens nomades.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Fraude impossible :</strong> Liaison biométrique (Touch ID / Face ID) + verrouillage au matériel du téléphone.</span>
                  </li>
                </ul>
              </div>

              <div className="pt-4 border-t border-amber-500/30 text-xs text-amber-300 font-bold flex items-center justify-between">
                <span>Économie moyenne constatée :</span>
                <span className="text-emerald-400 font-black">+80% de budget préservé</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ==================== 6. CAS D'USAGE PAR MÉTIER (BENTO SECTEURS) ==================== */}
      <section id="metiers" className="py-20 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Adaptabilité Totale</span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Une solution taillée pour chaque secteur d'activité
            </h2>
            <p className="text-sm sm:text-base text-slate-400">
              Qu'il s'agisse de bureaux climatisés ou de chantiers isolés, PointagePro s'adapte à vos contraintes de terrain.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Secteur 1 : BTP & Mines */}
            <div className="p-7 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-amber-500/40 transition duration-300 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <HardHat className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">BTP, Chantiers & Mines</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Périmètres géofencés sur parcelles ouvertes. Fonctionnement sans connexion Internet en zone blanche avec synchronisation différée. Zéro appareil fragile abîmé par la poussière.
              </p>
              <div className="pt-2 text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                <span>Pointage d'équipes de 50+ ouvriers sans attente</span>
              </div>
            </div>

            {/* Secteur 2 : Cliniques & Pharmacies */}
            <div className="p-7 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-blue-500/40 transition duration-300 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <Stethoscope className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Cliniques, Hôpitaux & Santé</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Gestion des relèves de gardes médicales 24/7 et astreintes de nuit. Détection des retards critiques au quart d'heure près et validation Wi-Fi sous dalle hospitalière.
              </p>
              <div className="pt-2 text-[11px] font-bold text-blue-400 flex items-center gap-1.5">
                <span>Horodatage certifié sans contestation RH</span>
              </div>
            </div>

            {/* Secteur 3 : Restauration & Hôtellerie */}
            <div className="p-7 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-emerald-500/40 transition duration-300 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Utensils className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Restauration & Commerces</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Suivi des équipes de cuisine, serveurs et extras par shifts de service (midi/soir). Validation Wi-Fi dans les cuisines blindées et exports automatiques pour la paie.
              </p>
              <div className="pt-2 text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                <span>Calcul automatique des heures supplémentaires</span>
              </div>
            </div>

            {/* Secteur 4 : Gardiennage & Sécurité */}
            <div className="p-7 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-purple-500/40 transition duration-300 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Gardiennage & Surveillance</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Contrôle des prises de poste sur 10, 20 ou 50 postes clients distants. Alerte instantanée en cas d'absence ou de retard d'un agent de sécurité sur un site sensible.
              </p>
              <div className="pt-2 text-[11px] font-bold text-purple-400 flex items-center gap-1.5">
                <span>Preuve de passage indiscutable pour vos clients</span>
              </div>
            </div>

            {/* Secteur 5 : PME & Bureaux */}
            <div className="p-7 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-amber-400/40 transition duration-300 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <Briefcase className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Sièges, Cabinets & PME</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Discipline de ponctualité administrative, suivi des pauses déjeuner et centralisation des justificatifs d'absence (certificats médicaux, pannes de transport).
              </p>
              <div className="pt-2 text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                <span>Rapprochement direct avec les logiciels de paie</span>
              </div>
            </div>

            {/* Secteur 6 : Multisites & Réseaux */}
            <div className="p-7 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-cyan-500/40 transition duration-300 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Agences & Réseaux Multisites</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Gérez toutes vos agences régionales (Bobo-Dioulasso, Koudougou, Ouagadougou...) depuis un cockpit unique sans multiplier les abonnements matériels.
              </p>
              <div className="pt-2 text-[11px] font-bold text-cyan-400 flex items-center gap-1.5">
                <span>Cockpit consolidé pour la direction générale</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ==================== 7. APERÇU PRODUIT INTERACTIF (TABS DÉMO) ==================== */}
      <section id="demo" className="py-20 bg-slate-950/80 border-t border-white/5 relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-3">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Démonstration Produit</span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Une interface intuitive pensée pour l'Afrique de l'Ouest
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl mx-auto">
              Découvrez les 4 modules clés qui font de PointagePro le standard de gestion du temps le plus abouti.
            </p>
          </div>

          {/* Onglets de Navigation Démo */}
          <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 max-w-2xl mx-auto text-xs font-bold">
            <button
              onClick={() => setActiveDemoTab('mobile')}
              className={`px-4 py-2.5 rounded-xl transition ${
                activeDemoTab === 'mobile' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-300 hover:text-white'
              }`}
            >
              1. App Mobile Employé
            </button>
            <button
              onClick={() => setActiveDemoTab('cockpit')}
              className={`px-4 py-2.5 rounded-xl transition ${
                activeDemoTab === 'cockpit' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-300 hover:text-white'
              }`}
            >
              2. Cockpit Live Gérant
            </button>
            <button
              onClick={() => setActiveDemoTab('justif')}
              className={`px-4 py-2.5 rounded-xl transition ${
                activeDemoTab === 'justif' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-300 hover:text-white'
              }`}
            >
              3. Justifications Retards
            </button>
            <button
              onClick={() => setActiveDemoTab('export')}
              className={`px-4 py-2.5 rounded-xl transition ${
                activeDemoTab === 'export' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-300 hover:text-white'
              }`}
            >
              4. Exports Paie Excel
            </button>
          </div>

          {/* Contenu de l'Aperçu Démo */}
          <div className="rounded-3xl p-6 sm:p-10 bg-slate-900 border border-amber-500/30 shadow-2xl relative overflow-hidden">
            
            {activeDemoTab === 'mobile' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-fadeIn">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-bold">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Expérience Salarié Ultra-Fluide</span>
                  </div>
                  <h3 className="text-2xl font-black text-white">Pointage validé en 0.8 seconde</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    L'employé ouvre l'application, appuie sur « Pointer mon Arrivée ». Le smartphone vérifie en une fraction de seconde la position satellite WGS84, l'empreinte digitale native et l'absence de faux GPS.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-400">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Retour haptique et confirmation sonore</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Historique personnel des pointages du mois</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Possibilité de soumettre un justificatif en cas de retard</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-black rounded-3xl p-6 border border-slate-800 text-center space-y-5 max-w-sm mx-auto w-full shadow-inner">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 border-b border-slate-900">
                    <span>12:28 • 4G LTE</span>
                    <span>PointagePro v9.4</span>
                  </div>
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 mx-auto flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/30">
                    <Fingerprint className="w-10 h-10" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-extrabold text-white">Pointage Arrivée Confirmé</p>
                    <p className="text-xs text-emerald-400 font-mono">11.24709° N, -4.29191° W</p>
                    <p className="text-[11px] text-slate-400">Précision : 1.4m • Livebox_Siege validée</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/90 text-[11px] text-slate-300 font-medium">
                    Statut : <span className="text-emerald-400 font-bold">À l'heure (07:28:12 UTC)</span>
                  </div>
                </div>
              </div>
            )}

            {activeDemoTab === 'cockpit' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-fadeIn">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 text-xs font-bold">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Vue Directeur & RH</span>
                  </div>
                  <h3 className="text-2xl font-black text-white">Carte Satellite & Présences Temps Réel</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Visualisez d'un coup d'œil qui est présent, qui est en retard, et qui n'est pas encore arrivé. Les anomalies de localisation sont surlignées en rouge instantanément.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-400">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Flux des arrivées mis à jour en temps réel via Supabase Live</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Filtres par site, département ou date</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800 text-[11px]">
                    <span>DERNIERS POINTAGES</span>
                    <span className="text-emerald-400">LIVE FEED ●</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80 flex items-center justify-between">
                    <div>
                      <p className="text-white font-bold">Jean-Marc K. (Logistique)</p>
                      <p className="text-[10px] text-slate-400">Siège Ouaga • 14m</p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">07:28 VALIDÉ</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80 flex items-center justify-between">
                    <div>
                      <p className="text-white font-bold">Fatou T. (Magasin)</p>
                      <p className="text-[10px] text-slate-400">Siège Ouaga • 34m</p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">07:46 RETARD</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80 flex items-center justify-between">
                    <div>
                      <p className="text-white font-bold">Ibrahim O. (Chantier)</p>
                      <p className="text-[10px] text-slate-400">Antenne Est • 8m</p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">07:15 VALIDÉ</span>
                  </div>
                </div>
              </div>
            )}

            {activeDemoTab === 'justif' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-fadeIn">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 text-xs font-bold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Workflow RH Numérisé</span>
                  </div>
                  <h3 className="text-2xl font-black text-white">Gestion des Justifications de Retard</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Fini les papiers perdus et les disputes. Lorsqu'un salarié arrive en retard, il peut soumettre son motif et sa pièce justificative depuis son mobile. Le gérant valide ou refuse en 1 clic.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-400">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Régularisation automatique des retenues de salaire</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Archive légale conforme aux inspections du travail</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 space-y-3 text-xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Demande en attente d'approbation</span>
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-white">Fatou T. • Retard de 16 min</p>
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">À TRAITER</span>
                    </div>
                    <p className="text-slate-300 text-xs italic">« Panne de moto sur l'avenue Bassawarga, pneu crevé réparé à 07h35 »</p>
                    <div className="flex gap-2 pt-2">
                      <button className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px]">
                        Accepter la justification
                      </button>
                      <button className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px]">
                        Refuser
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeDemoTab === 'export' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-fadeIn">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 text-xs font-bold">
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Comptabilité & Paie Précise</span>
                  </div>
                  <h3 className="text-2xl font-black text-white">Exports Excel & PDF en 1 Clic</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    À la fin du mois, ne perdez plus 3 jours à dépouiller des fiches de présence manuscrites. Téléchargez directement la synthèse consolidée avec total des heures, retards et pénalités.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-400">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Total des heures normales et heures supplémentaires</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Rapprochement direct pour les experts-comptables</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800 text-[11px]">
                    <span>RECAP_MENSUEL_NOV_2026.XLSX</span>
                    <span className="text-emerald-400">PRÊT AU TÉLÉCHARGEMENT</span>
                  </div>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between py-1 border-b border-slate-900 text-slate-300">
                      <span>Heures Travaillées Totales :</span>
                      <strong className="text-white">1 940 h</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-900 text-slate-300">
                      <span>Taux d'Assiduité Global :</span>
                      <strong className="text-emerald-400">97.4 %</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-900 text-slate-300">
                      <span>Total Retards Cumulés :</span>
                      <strong className="text-amber-400">38 min (2 justifiés)</strong>
                    </div>
                  </div>
                  <div className="pt-2">
                    <div className="w-full py-2 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 text-center font-bold text-xs">
                      Télécharger la Synthèse Paie Excel
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      </section>

      {/* ==================== 8. LES 4 PILIERS TECHNOLOGIQUES INFAILLIBLES ==================== */}
      <section id="technologie" className="py-20 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Ingénierie & Sécurité</span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Une forteresse technologique contre la fraude
            </h2>
            <p className="text-sm sm:text-base text-slate-400">
              Chaque pointage fait l'objet d'une triple vérification mathématique et cryptographique avant d'être accepté.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Pilier 1 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-amber-400/40 transition duration-300 space-y-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-base">Précision Satellite 1 Mètre</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Géofencing géodésique WGS84 invariant. L'employé doit se trouver physiquement dans le périmètre autorisé de l'entreprise pour pouvoir valider son arrivée.
              </p>
            </div>

            {/* Pilier 2 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-blue-400/40 transition duration-300 space-y-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Wifi className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-base">Détection Wi-Fi Sous Dalle Béton</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Dans les sous-sols et bâtiments blindés où le signal GPS s'affaiblit, validation instantanée et infalsifiable par l'adresse MAC (BSSID) de votre box Wi-Fi.
              </p>
            </div>

            {/* Pilier 3 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-emerald-400/40 transition duration-300 space-y-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-base">Anti-Mock GPS & Device Binding</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Blocage strict des applications de faux GPS et liaison irrévocable au matériel du smartphone de l'employé. Impossible de pointer depuis le téléphone d'un collègue.
              </p>
            </div>

            {/* Pilier 4 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-purple-400/40 transition duration-300 space-y-3.5">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <RefreshCw className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-base">Résilience 100% Hors-Ligne</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Coupure réseau ou zone blanche ? Les pointages sont horodatés par satellite atomique et synchronisés automatiquement dès le retour de la connexion Internet.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ==================== 9. SIMULATEUR DE RENTABILITÉ INTERACTIF ==================== */}
      <section id="simulateur" className="py-20 bg-gradient-to-b from-slate-950 to-[#070A12] border-t border-white/5 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="text-center space-y-3">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Calculateur de Rentabilité</span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Combien économisez-vous avec PointagePro ?
            </h2>
            <p className="text-sm text-slate-400">
              Déplacez le curseur selon le nombre de vos salariés pour calculer vos économies nettes la première année.
            </p>
          </div>

          <div className="p-8 sm:p-10 rounded-3xl bg-slate-900/90 border border-amber-500/30 shadow-2xl space-y-8">
            
            {/* Slider de sélection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-200">
                  Nombre de collaborateurs dans votre entreprise :
                </label>
                <span className="text-2xl font-black text-amber-400 font-mono px-4 py-1 rounded-xl bg-slate-950 border border-amber-500/30">
                  {employeeCount} employés
                </span>
              </div>
              
              <input
                type="range"
                min="1"
                max="50"
                value={employeeCount}
                onChange={(e) => setEmployeeCount(parseInt(e.target.value))}
                className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              
              <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                <span>1 employé</span>
                <span>15 employés (PME)</span>
                <span>30 employés</span>
                <span>50+ employés</span>
              </div>
            </div>

            {/* Comparatif de Coût en chiffres géants */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-slate-800 text-center">
              
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-xs font-medium text-slate-400">Abonnement PointagePro</span>
                <p className="text-2xl font-black text-white mt-1">
                  {pointageProMonthly.toLocaleString()} FCFA
                </p>
                <span className="text-[10px] text-amber-400 font-semibold">
                  {employeeCount > 15 ? 'Plafond Garanti Absolu !' : 'Facturé mensuellement'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-xs font-medium text-slate-400">Badgeuse Traditionnelle</span>
                <p className="text-2xl font-black text-rose-400 line-through mt-1">
                  {badgeuseTotalYear1.toLocaleString()} FCFA
                </p>
                <span className="text-[10px] text-slate-500">Achat matériel + maintenance</span>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40">
                <span className="text-xs font-bold text-emerald-400">Économie Nette (An 1)</span>
                <p className="text-2xl font-black text-emerald-300 mt-1">
                  +{annualSavings.toLocaleString()} FCFA
                </p>
                <span className="text-[10px] text-emerald-400 font-semibold">Budget direct préservé</span>
              </div>

            </div>

            {/* CTA dans le simulateur */}
            <div className="pt-2 text-center">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 transition active:scale-95"
              >
                <span>Démarrer sans payer avec {employeeCount} employés</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

          </div>

        </div>
      </section>

      {/* ==================== 10. TÉMOIGNAGES & RETOURS D'EXPÉRIENCE ==================== */}
      <section className="py-20 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Preuve Sociale</span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Ils ont remplacé leurs badgeuses par PointagePro
            </h2>
            <p className="text-sm text-slate-400">
              Découvrez ce que disent les dirigeants et responsables RH qui utilisent notre solution au quotidien.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="p-7 rounded-3xl bg-slate-900/60 border border-white/10 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex text-amber-400 gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed italic">
                  « Nous gérons 4 chantiers BTP à Ouaga et Koudougou. Nos anciennes pointeuses prenaient la poussière et tombaient en panne à chaque coupure Sonabel. Avec PointagePro, les ouvriers pointent sur smartphone même hors connexion. Zéro dispute en fin de mois. »
                </p>
              </div>
              <div className="pt-4 border-t border-slate-800">
                <p className="font-bold text-white text-xs">M. Oumar Kaboré</p>
                <p className="text-[11px] text-slate-400">Directeur Général, Entreprise BTP Sahel</p>
              </div>
            </div>

            <div className="p-7 rounded-3xl bg-slate-900/60 border border-white/10 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex text-amber-400 gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed italic">
                  « Dans une clinique, la ponctualité des soignants est vitale. Le système de justification des retards nous a permis de responsabiliser les équipes. L'export Excel mensuel me fait gagner 2 jours entiers sur le calcul des paies. »
                </p>
              </div>
              <div className="pt-4 border-t border-slate-800">
                <p className="font-bold text-white text-xs">Dr. Mariam Sawadogo</p>
                <p className="text-[11px] text-slate-400">Directrice Médicale & Administratrice</p>
              </div>
            </div>

            <div className="p-7 rounded-3xl bg-slate-900/60 border border-white/10 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex text-amber-400 gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed italic">
                  « Le plafond à 15 000 FCFA par mois est imbattable. Nous avons 32 employés répartis sur deux restaurants. Auparavant, on nous demandait plus de 800 000 FCFA rien que pour installer deux badgeuses murales. Le choix a été vite fait ! »
                </p>
              </div>
              <div className="pt-4 border-t border-slate-800">
                <p className="font-bold text-white text-xs">M. Eric Compaoré</p>
                <p className="text-[11px] text-slate-400">Gérant & Fondateur Réseau Restauration</p>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ==================== 11. GRILLE TARIFAIRE TRANSPARENTE (AVEC PLAFOND 15 000 FCFA) ==================== */}
      <section id="tarifs" className="py-24 bg-slate-950/70 border-t border-white/5 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Tarification Transparente</span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Des tarifs simples, sans mauvaise surprise
            </h2>
            <p className="text-sm sm:text-base text-slate-400">
              Nos tarifs sont conçus pour les réalités du marché. Vous ne paierez <strong className="text-white">jamais plus de 15 000 FCFA par mois</strong>, quel que soit votre effectif.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            
            {/* Formule 1 : Starter */}
            <div className="p-8 rounded-3xl bg-slate-900/70 border border-white/10 space-y-6 flex flex-col justify-between hover:border-slate-700 transition">
              <div className="space-y-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pack Starter</span>
                <h3 className="text-xl font-bold text-white">1 à 5 Employés</h3>
                <p className="text-xs text-slate-400">
                  Parfait pour boutiques, agences, officines et petits bureaux.
                </p>

                <div className="pt-2">
                  <span className="text-4xl font-black text-white">5 000</span>
                  <span className="text-xs text-slate-400 font-bold ml-1.5">FCFA / mois</span>
                </div>

                <ul className="space-y-3 text-xs text-slate-300 pt-2 border-t border-slate-800">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Jusqu'à 5 employés inclus</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>1 Périmètre géofencing WGS84</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Application mobile employé</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Exports des heures en Excel</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/register?plan=starter"
                className="w-full py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs text-center transition"
              >
                Choisir Starter
              </Link>
            </div>

            {/* Formule 2 : Croissance (POPULAIRE) */}
            <div className="p-8 rounded-3xl bg-gradient-to-b from-amber-950/40 to-slate-900 border-2 border-amber-500/50 space-y-6 flex flex-col justify-between shadow-2xl shadow-amber-950/30 relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md">
                Le Plus Populaire
              </div>

              <div className="space-y-4">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Pack Croissance</span>
                <h3 className="text-xl font-bold text-white">6 à 15 Employés</h3>
                <p className="text-xs text-slate-300">
                  Idéal pour les PME, restaurants, ateliers et cliniques.
                </p>

                <div className="pt-2">
                  <span className="text-4xl font-black text-amber-300">10 000</span>
                  <span className="text-xs text-slate-400 font-bold ml-1.5">FCFA / mois</span>
                </div>

                <ul className="space-y-3 text-xs text-slate-200 pt-2 border-t border-amber-500/20">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Jusqu'à 15 employés inclus</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Jusqu'à 3 sites géofencés</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Validation Wi-Fi sous dalle béton</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Cockpit de supervision temps réel</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Gestion des justifications de retards</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/register?plan=croissance"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-black text-xs text-center shadow-lg shadow-amber-500/25 transition active:scale-95"
              >
                Démarrer 14 Jours Gratuits
              </Link>
            </div>

            {/* Formule 3 : Entreprise (Plafond 15 000 FCFA) */}
            <div className="p-8 rounded-3xl bg-slate-900/70 border border-white/10 space-y-6 flex flex-col justify-between hover:border-slate-700 transition">
              <div className="space-y-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pack Illimité</span>
                <h3 className="text-xl font-bold text-white">16 Employés & Plus</h3>
                <p className="text-xs text-slate-400">
                  Pour grandes entreprises, chantiers BTP, usines et multisites.
                </p>

                <div className="pt-2">
                  <span className="text-4xl font-black text-white">15 000</span>
                  <span className="text-xs text-slate-400 font-bold ml-1.5">FCFA / mois</span>
                  <div className="text-[11px] font-bold text-emerald-400 mt-1">
                    Plafond Max Garanti (Jamais plus !)
                  </div>
                </div>

                <ul className="space-y-3 text-xs text-slate-300 pt-2 border-t border-slate-800">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Salariés illimités</strong></span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Sites & agences illimités</strong></span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Support dédié WhatsApp & Téléphone</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Assistance à l'onboarding sur site</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/register?plan=illimite"
                className="w-full py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs text-center transition"
              >
                Choisir Illimité
              </Link>
            </div>

          </div>

          {/* Bandeau Modes de Paiement Locaux */}
          <div className="p-6 rounded-3xl bg-slate-950 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-white">Paiement ultra-simple et 100% sécurisé</h4>
              <p className="text-xs text-slate-400">Réglez votre abonnement mensuel directement sans contrainte bancaire.</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5 text-xs font-bold text-slate-300">
              <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">🟠 Orange Money</span>
              <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">🔵 Moov Money</span>
              <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">🌊 Wave</span>
              <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">💳 Carte Visa/Mastercard</span>
            </div>
          </div>

        </div>
      </section>

      {/* ==================== 12. FOIRE AUX QUESTIONS (FAQ RH & JURIDIQUE) ==================== */}
      <section id="faq" className="py-20 bg-slate-950/60 border-t border-white/5 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="text-center space-y-3">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Questions Fréquentes</span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Tout ce que vous devez savoir
            </h2>
            <p className="text-sm text-slate-400">
              Des réponses claires et transparentes à vos questions RH, techniques et juridiques.
            </p>
          </div>

          <div className="space-y-4">
            
            {/* Question 1 */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
              <button
                onClick={() => toggleFaq(0)}
                className="w-full p-5 text-left flex items-center justify-between text-sm font-bold text-white cursor-pointer"
              >
                <span>L'application surveille-t-elle les employés en continu dans leur vie privée ?</span>
                <ChevronDown className={`w-4 h-4 text-amber-400 transition-transform ${openFaq === 0 ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === 0 && (
                <div className="px-5 pb-5 text-xs text-slate-400 leading-relaxed border-t border-slate-800/80 pt-3">
                  <strong>Absolument pas.</strong> Conformément aux règles de protection des données personnelles et au Droit du Travail, PointagePro ne fait <em>aucun pistage GPS continu</em>. La position géographique n'est interrogée que pendant la fraction de seconde où l'employé appuie sur le bouton pour pointer son arrivée ou son départ.
                </div>
              )}
            </div>

            {/* Question 2 */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
              <button
                onClick={() => toggleFaq(1)}
                className="w-full p-5 text-left flex items-center justify-between text-sm font-bold text-white cursor-pointer"
              >
                <span>Que se passe-t-il en cas de coupure Internet ou de délestage électrique ?</span>
                <ChevronDown className={`w-4 h-4 text-amber-400 transition-transform ${openFaq === 1 ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === 1 && (
                <div className="px-5 pb-5 text-xs text-slate-400 leading-relaxed border-t border-slate-800/80 pt-3">
                  Le système est conçu en <strong>architecture Offline-First</strong>. Les salariés pointent normalement même sans réseau ni électricité. Le pointage est scellé cryptographiquement dans le téléphone avec l'heure atomique des satellites GPS, puis transmis automatiquement dès que la connexion est rétablie.
                </div>
              )}
            </div>

            {/* Question 3 */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
              <button
                onClick={() => toggleFaq(2)}
                className="w-full p-5 text-left flex items-center justify-between text-sm font-bold text-white cursor-pointer"
              >
                <span>Un employé peut-il pointer à la place de son collègue en retard ?</span>
                <ChevronDown className={`w-4 h-4 text-amber-400 transition-transform ${openFaq === 2 ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === 2 && (
                <div className="px-5 pb-5 text-xs text-slate-400 leading-relaxed border-t border-slate-800/80 pt-3">
                  <strong>C'est matériellement impossible.</strong> L'application est verrouillée au téléphone personnel de l'employé (Device Binding unique). De plus, chaque pointage requiert la biométrie native du smartphone (empreinte digitale ou Face ID).
                </div>
              )}
            </div>

            {/* Question 4 */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
              <button
                onClick={() => toggleFaq(3)}
                className="w-full p-5 text-left flex items-center justify-between text-sm font-bold text-white cursor-pointer"
              >
                <span>Comment déploie-t-on la solution dans mon entreprise ?</span>
                <ChevronDown className={`w-4 h-4 text-amber-400 transition-transform ${openFaq === 3 ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === 3 && (
                <div className="px-5 pb-5 text-xs text-slate-400 leading-relaxed border-t border-slate-800/80 pt-3">
                  Le déploiement prend moins de 5 minutes : vous configurez vos horaires et l'emplacement de votre entreprise sur la carte satellite. Vous ajoutez vos collaborateurs, qui reçoivent instantanément leur invitation sécurisée sur WhatsApp pour installer l'application.
                </div>
              )}
            </div>

            {/* Question 5 */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
              <button
                onClick={() => toggleFaq(4)}
                className="w-full p-5 text-left flex items-center justify-between text-sm font-bold text-white cursor-pointer"
              >
                <span>Y a-t-il un engagement de durée ou des frais cachés ?</span>
                <ChevronDown className={`w-4 h-4 text-amber-400 transition-transform ${openFaq === 4 ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === 4 && (
                <div className="px-5 pb-5 text-xs text-slate-400 leading-relaxed border-t border-slate-800/80 pt-3">
                  <strong>Zéro engagement, zéro frais caché.</strong> Vous êtes libre d'interrompre votre abonnement à tout moment d'un simple clic depuis vos paramètres. Vous bénéficiez de 14 jours d'essai complets avant de décider.
                </div>
              )}
            </div>

          </div>

        </div>
      </section>

      {/* ==================== 13. GRAND CTA FINAL ==================== */}
      <section className="py-20 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl bg-gradient-to-r from-amber-950 via-slate-900 to-black border border-amber-500/40 p-8 sm:p-14 text-center space-y-6 shadow-2xl shadow-amber-950/40">
            
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <Sparkles className="w-8 h-8" />
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Prêt à moderniser le pointage de vos équipes ?
            </h2>
            <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
              Activez dès aujourd'hui vos 14 jours d'essai gratuit. Configuration en 5 minutes, sans engagement et sans carte bancaire.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 transition active:scale-95"
              >
                <span>Démarrer mon essai gratuit de 14 jours</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="mailto:contact@baroubagroup.com?subject=Demande%20d'information%20PointagePro%20Enterprise"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition"
              >
                <Mail className="w-4 h-4 text-amber-400" />
                <span>Contacter l'équipe BAROUBA GROUP</span>
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* ==================== 14. FOOTER OFFICIEL INSTITUTIONNEL ==================== */}
      <footer className="border-t border-white/10 bg-slate-950 text-slate-400 text-xs py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <img
                src="/barouba-group-logo.png"
                alt="BAROUBA GROUP"
                className="w-9 h-9 rounded-full object-cover ring-2 ring-amber-500/30"
              />
              <div>
                <span className="font-bold text-white text-sm">BAROUBA GROUP</span>
                <p className="text-[11px] text-slate-400">Éditeur & Architecte Numérique • Ouagadougou, Burkina Faso 🇧🇫</p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs text-slate-300">
              <Link href="/a-propos" className="hover:text-amber-400 transition">À propos</Link>
              <Link href="/login" className="hover:text-amber-400 transition">Espace Gérant</Link>
              <Link href="/register" className="hover:text-amber-400 transition">Créer mon compte</Link>
              <Link href="/apk" className="hover:text-amber-400 transition">Application Android</Link>
              <a href="mailto:contact@baroubagroup.com" className="hover:text-amber-400 transition">Service Client</a>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-3">
            <p>© BAROUBA GROUP. Tous droits réservés.</p>
            <p className="text-amber-400/80">Version Enterprise 2026.11 • Conforme Standards WGS84 & RGPD / CIL</p>
          </div>

        </div>
      </footer>

    </div>
  );
}
