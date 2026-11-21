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
  ChevronRight, 
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
  ChevronDown
} from 'lucide-react';

export default function LandingPage() {
  // Simulateur de Rentabilité
  const [employeeCount, setEmployeeCount] = useState(12);

  // FAQ Accordion
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  // Calcul dynamique ROI
  // Coût mensuel PointagePro selon effectif (avec plafond max à 15 000 FCFA)
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
      
      {/* ==================== 1. NAVIGATION PRINCIPALE ==================== */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#070A12]/80 border-b border-white/10 transition-all">
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
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300">
            <a href="#avantages" className="hover:text-amber-400 transition">Avantages</a>
            <a href="#comparatif" className="hover:text-amber-400 transition">Vs Badgeuse</a>
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
              href="/dashboard"
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 hover:shadow-lg hover:shadow-amber-500/25 transition active:scale-95"
            >
              <span>Essai Gratuit 14 Jours</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ==================== 2. HERO SECTION D'ÉLITE ==================== */}
      <section className="relative overflow-hidden pt-12 pb-24 lg:pt-20 lg:pb-32">
        {/* Halos d'ambiance or et bleu nuit */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[42rem] h-[26rem] bg-gradient-to-b from-amber-500/15 via-amber-700/5 to-transparent rounded-full blur-3xl -z-10" />
        <div className="pointer-events-none absolute top-40 -left-20 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl -z-10" />

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
            La solution de pointage mobile infalsifiable conçue pour les PME, institutions et chantiers. 
            Géofencing WGS84 invariant, validation Wi-Fi sous dalle béton, biométrie native et résilience 100% hors-ligne. 
            <strong className="text-white font-semibold"> Éliminez les retards et la fraude sans dépenser un franc en matériel.</strong>
          </p>

          {/* Boutons d'Action Principaux */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/dashboard"
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
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Zéro frais d'installation</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Sans engagement de durée</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Conforme Droit du Travail & CIL</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Édité au Burkina Faso 🇧🇫</span>
            </div>
          </div>

          {/* Mockup / Dashboard Preview Card Bento */}
          <div className="pt-10 max-w-5xl mx-auto">
            <div className="relative rounded-3xl p-2 sm:p-3 bg-gradient-to-b from-white/15 via-white/5 to-white/0 border border-white/15 shadow-2xl shadow-black/80">
              <div className="rounded-2xl bg-slate-950 overflow-hidden border border-slate-800 p-6 sm:p-8 text-left">
                
                {/* Façade Barre Supérieure Style Cockpit */}
                <div className="flex items-center justify-between pb-6 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500 animate-pulse" />
                    <div>
                      <h2 className="font-extrabold text-sm sm:text-base text-white">Cockpit de Supervision en Direct</h2>
                      <p className="text-xs text-slate-400">Périmètre Siège Ouagadougou • WGS84 Satellite Live</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
                      🛰️ 12/12 Présents
                    </span>
                  </div>
                </div>

                {/* 3 Cartes Rapides d'illustration */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
                    <span className="text-[11px] uppercase font-bold text-slate-400">Arrivée Ponctuelle</span>
                    <p className="text-xl font-black text-emerald-400">96.8 %</p>
                    <p className="text-[11px] text-slate-500">Validation Face ID + Satellite</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
                    <span className="text-[11px] uppercase font-bold text-slate-400">Fraude Détectée</span>
                    <p className="text-xl font-black text-amber-400">0 Fraude</p>
                    <p className="text-[11px] text-slate-500">Anti-Mock GPS & Liaison Appareil</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
                    <span className="text-[11px] uppercase font-bold text-slate-400">Économie Matériel</span>
                    <p className="text-xl font-black text-white">450 000 F</p>
                    <p className="text-[11px] text-slate-500">Zéro badgeuse physique achetée</p>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ==================== 3. SECTION CHOC : POINTEUSE PHYSIQUE VS POINTAGEPRO ==================== */}
      <section id="comparatif" className="py-20 bg-slate-950/60 border-y border-white/5 relative">
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

      {/* ==================== 4. LES 4 PILIERS TECHNOLOGIQUES INFAILLIBLES ==================== */}
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

      {/* ==================== 5. SIMULATEUR DE RENTABILITÉ INTERACTIF ==================== */}
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
                  {employeeCount > 15 ? 'Plafond Garanti !' : 'Facturé mensuellement'}
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
                href="/dashboard"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 transition active:scale-95"
              >
                <span>Démarrer sans payer avec {employeeCount} employés</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

          </div>

        </div>
      </section>

      {/* ==================== 6. GRILLE TARIFAIRE TRANSPARENTE (AVEC PLAFOND 15 000 FCFA) ==================== */}
      <section id="tarifs" className="py-24 relative">
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
                href="/dashboard"
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
                href="/dashboard"
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
                href="/dashboard"
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

      {/* ==================== 7. FOIRE AUX QUESTIONS (FAQ RH & JURIDIQUE) ==================== */}
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

          </div>

        </div>
      </section>

      {/* ==================== 8. CTA FINAL BANNER ==================== */}
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
              Testez gratuitement pendant 14 jours, sans engagement et sans renseigner de carte bancaire.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 transition active:scale-95"
              >
                <span>Démarrer mon essai gratuit</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="mailto:contact@baroubagroup.com?subject=Demande%20d'information%20PointagePro"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition"
              >
                <Mail className="w-4 h-4 text-amber-400" />
                <span>Contacter l'équipe BAROUBA GROUP</span>
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* ==================== 9. FOOTER OFFICIEL INSTITUTIONNEL ==================== */}
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
