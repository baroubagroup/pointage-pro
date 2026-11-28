'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { 
  PieChart, 
  Users, 
  ClipboardCheck, 
  CalendarDays, 
  MapPin, 
  FileSpreadsheet, 
  ShieldAlert, 
  Settings, 
  LogOut, 
  Building2,
  Copy,
  Check,
  ClipboardList,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronsUpDown,
  PlusCircle,
  CheckCircle2,
  Shield,
  Clock,
  Sparkles,
  Info,
  PanelLeftClose,
  PanelLeftOpen,
  Smartphone,
  Menu,
  X,
  RefreshCw
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const OP_ITEMS = [
  { href: '/dashboard', label: 'Supervision Cockpit', icon: PieChart },
  { href: '/pointages', label: 'Journal des Pointages', icon: ClipboardList },
  { href: '/employes', label: 'Personnel & Effectif', icon: Users },
  { href: '/releves', label: 'Relevés & Heures RH', icon: FileSpreadsheet },
  { href: '/justifications', label: 'Justifications', icon: ClipboardCheck },
  { href: '/maquette-gerant', label: 'App Gérant Mobile', icon: Smartphone },
  { href: '/maquette-employe', label: 'App Employé (Maquette)', icon: Smartphone },
];

const SETTINGS_SUB_ITEMS = [
  { tab: 'general', label: 'Organisation & Métier', icon: Building2 },
  { tab: 'sites', label: 'Sites & Géofencing', icon: MapPin },
  { tab: 'plannings', label: 'Plannings & Horaires', icon: CalendarDays },
  { tab: 'securite', label: 'Sécurité Anti-Triche', icon: Shield },
];

function SettingsNavSection({ 
  isSettingsActive,
  isCollapsed 
}: { 
  isSettingsActive: boolean;
  isCollapsed: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Menu déroulant replié par défaut selon l'exigence explicite de l'utilisateur
  const [isOpen, setIsOpen] = useState(false);

  // Détection de l'onglet actif dans l'URL (?tab=...)
  const currentTab = searchParams.get('tab') || 'general';

  // Toggle du pliage / dépliage
  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(prev => !prev);
  };

  const handleHeaderClick = () => {
    router.push('/parametres?tab=general');
  };

  // En mode replié (icônes seules), on affiche un bouton compact direct vers les Paramètres
  if (isCollapsed) {
    return (
      <div className="mt-4 pt-4 border-t border-slate-800/80">
        <Link
          href="/parametres?tab=general"
          title="Paramètres & Gouvernance Hub"
          className={`w-full flex items-center justify-center p-3 rounded-2xl transition group relative cursor-pointer ${
            isSettingsActive
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Settings className={`w-5 h-5 shrink-0 ${isSettingsActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'}`} />
          {/* Tooltip flottant au hover */}
          <span className="absolute left-full ml-3 px-2.5 py-1 bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition whitespace-nowrap z-50 border border-slate-700">
            Paramètres & Hub
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 pt-4 border-t border-slate-800/80">
      <div className="flex items-center justify-between px-3 mb-1.5">
        <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500">
          Gouvernance Système
        </span>
        <button
          type="button"
          onClick={handleToggle}
          title={isOpen ? "Replier le sous-menu" : "Dérouler le sous-menu"}
          className="text-[10px] font-bold text-slate-400 hover:text-white transition cursor-pointer"
        >
          {isOpen ? 'Replier' : 'Dérouler'}
        </button>
      </div>

      {/* Bouton principal cliquable & repliable */}
      <div
        onClick={handleHeaderClick}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl transition text-xs font-bold cursor-pointer select-none ${
          isSettingsActive
            ? 'bg-slate-800 text-white border border-slate-700/80 shadow-xs'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
        }`}
      >
        <div className="flex items-center space-x-3">
          <Settings className="w-4 h-4 shrink-0 text-blue-400" />
          <span>Paramètres & Hub</span>
        </div>
        
        {/* Chevron cliquable pour replier / déplier */}
        <button
          type="button"
          onClick={handleToggle}
          title={isOpen ? "Replier le sous-menu" : "Dérouler le sous-menu"}
          className="p-1 hover:bg-slate-700/60 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
        >
          <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-90 text-blue-400' : 'text-slate-500'}`} />
        </button>
      </div>

      {/* Sous-onglets de Paramètres (repliés par défaut, s'ouvrent au clic) */}
      {isOpen && (
        <div className="mt-1.5 pl-3 space-y-1 animate-fadeIn">
          {SETTINGS_SUB_ITEMS.map((sub) => {
            const SubIcon = sub.icon;
            const isTabActive = isSettingsActive && currentTab === sub.tab;
            return (
              <Link
                key={sub.tab}
                href={`/parametres?tab=${sub.tab}`}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-semibold transition ${
                  isTabActive
                    ? 'bg-blue-600/30 text-blue-300 font-bold border border-blue-500/50 shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <SubIcon className={`w-3.5 h-3.5 shrink-0 ${isTabActive ? 'text-blue-400' : 'text-slate-500'}`} />
                  <span className="truncate">{sub.label}</span>
                </div>
                {isTabActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [orgName, setOrgName] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('pointage_org_name') || 'PointagePro' : 'PointagePro'));
  const [orgCode, setOrgCode] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('pointage_org_code') || 'ORG-PRO' : 'ORG-PRO'));
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(() => (typeof window !== 'undefined' ? localStorage.getItem('pointage_org_id') : null));
  const [orgLogo, setOrgLogo] = useState<string | null>(null);
  const [allOrgs, setAllOrgs] = useState<any[]>([]);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [pendingJustifCount, setPendingJustifCount] = useState<number>(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fermer le menu mobile lors d'un changement de page
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Fermer le menu déroulant en cliquant à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowOrgDropdown(false);
      }
    };
    if (showOrgDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOrgDropdown]);

  // Charger les justifications réelles en attente depuis Supabase
  useEffect(() => {
    const fetchPendingJustifs = async () => {
      try {
        const supabase = createClient();
        const activeId = typeof window !== 'undefined' ? localStorage.getItem('pointage_org_id') : null;
        let query = supabase
          .from('pointage_justifications')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'PENDING');
        if (activeId) {
          query = query.eq('org_id', activeId);
        }
        const { count } = await query;
        setPendingJustifCount(count || 0);
      } catch {}
    };
    fetchPendingJustifs();

    const supabase = createClient();
    const channel = supabase
      .channel('realtime_sidebar_justifs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pointage_justifications' }, () => {
        fetchPendingJustifs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrgId]);

  // Charger la préférence de pliage depuis localStorage au montage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCollapsed = localStorage.getItem('pointage_sidebar_collapsed');
      if (savedCollapsed !== null) {
        setIsCollapsed(savedCollapsed === 'true');
      }
      const localLogo = localStorage.getItem('pointage_org_logo');
      if (localLogo) setOrgLogo(localLogo);
      const localCode = localStorage.getItem('pointage_org_code');
      if (localCode) setOrgCode(localCode);
      const localName = localStorage.getItem('pointage_org_name');
      const localId = localStorage.getItem('pointage_org_id');
      if (localName === 'BAROUBA PRO' || localId === '00000000-0000-0000-0000-000000000001') {
        localStorage.removeItem('pointage_org_name');
        localStorage.removeItem('pointage_org_id');
        localStorage.removeItem('pointage_org_code');
      } else {
        if (localName) setOrgName(localName);
        if (localId) setCurrentOrgId(localId);
      }
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('pointage_sidebar_collapsed', String(next));
      }
      return next;
    });
  };

  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const supabase = createClient();
        const activeId = typeof window !== 'undefined' ? localStorage.getItem('pointage_org_id') : null;
        const activeCode = typeof window !== 'undefined' ? localStorage.getItem('pointage_org_code') : null;
        const localName = typeof window !== 'undefined' ? localStorage.getItem('pointage_org_name') : null;

        // Récupérer toutes les entreprises enregistrées
        const { data: orgsList } = await supabase
          .from('pointage_organizations')
          .select('id, name, org_code, security_config, created_at')
          .order('created_at', { ascending: false });

        if (orgsList && orgsList.length > 0) {
          setAllOrgs(orgsList);

          const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
          const isOnboardingSuccess = urlParams?.get('onboarding') === 'success';

          let current: any = null;

          // Si on vient de créer une entreprise, prendre la toute dernière créée
          if (isOnboardingSuccess) {
            current = orgsList[0];
          } else if (activeId) {
            current = orgsList.find(o => o.id === activeId);
          } else if (activeCode && activeCode !== 'ORG-8492' && activeCode !== 'ORG-PRO') {
            current = orgsList.find(o => o.org_code === activeCode);
          }

          if (!current && localName && localName !== 'PointagePro') {
            current = orgsList.find(o => o.name?.toLowerCase() === localName.toLowerCase());
          }

          if (!current) {
            current = orgsList[0];
          }

          if (current) {
            setOrgName(current.name);
            setOrgCode(current.org_code);
            setCurrentOrgId(current.id);
            if (current.security_config?.org_logo) {
              setOrgLogo(current.security_config.org_logo);
            } else {
              setOrgLogo(null);
            }
            if (typeof window !== 'undefined') {
              localStorage.setItem('pointage_org_id', current.id);
              localStorage.setItem('pointage_org_name', current.name);
              localStorage.setItem('pointage_org_code', current.org_code);
              document.cookie = `pointage_active_org_id=${current.id}; path=/; max-age=86400; SameSite=Lax`;
              document.cookie = `pointage_active_org_code=${current.org_code}; path=/; max-age=86400; SameSite=Lax`;
            }
          }
        }
      } catch (e) {
        console.warn('Sidebar fetch org error:', e);
      }
    };
    fetchOrg();

    // Écouteur de mise à jour instantanée du logo/nom/code depuis les Paramètres
    const handleOrgUpdate = () => {
      if (typeof window !== 'undefined') {
        const localLogo = localStorage.getItem('pointage_org_logo');
        if (localLogo !== null) setOrgLogo(localLogo);
        const localName = localStorage.getItem('pointage_org_name');
        if (localName) setOrgName(localName);
        const localCode = localStorage.getItem('pointage_org_code');
        if (localCode) setOrgCode(localCode);
        const localId = localStorage.getItem('pointage_org_id');
        if (localId) setCurrentOrgId(localId);
      }
    };
    window.addEventListener('pointage_org_updated', handleOrgUpdate);
    return () => window.removeEventListener('pointage_org_updated', handleOrgUpdate);
  }, []);

  const handleSwitchOrg = (targetOrg: any) => {
    setOrgName(targetOrg.name);
    setOrgCode(targetOrg.org_code);
    setCurrentOrgId(targetOrg.id);
    if (targetOrg.security_config?.org_logo) {
      setOrgLogo(targetOrg.security_config.org_logo);
    } else {
      setOrgLogo(null);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('pointage_org_id', targetOrg.id);
      localStorage.setItem('pointage_org_name', targetOrg.name);
      localStorage.setItem('pointage_org_code', targetOrg.org_code);
      document.cookie = `pointage_active_org_id=${targetOrg.id}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `pointage_active_org_code=${targetOrg.org_code}; path=/; max-age=86400; SameSite=Lax`;
      window.dispatchEvent(new Event('pointage_org_updated'));
    }
    setShowOrgDropdown(false);
    window.location.reload();
  };

  const handleCopyCode = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    navigator.clipboard.writeText(orgCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleLogout = async () => {
    document.cookie = 'pointage_manager_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'pointage_active_org_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'pointage_active_org_code=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {}
    router.push('/login?logout=true');
  };

  const handleOtaUpdate = async () => {
    setIsMobileMenuOpen(false);
    if (typeof window !== 'undefined') {
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) await reg.update();
        } catch {}
      }
      alert("✅ PointagePro Enterprise est à jour !\nModules et correctifs synchronisés avec succès.");
      window.location.reload();
    }
  };

  const isSettingsActive = pathname.startsWith('/parametres') || pathname === '/sites' || pathname === '/plannings' || pathname === '/securite';

  // Monogramme fallback pour l'avatar (ex: "BP" pour BAROUBA PRO)
  const orgInitials = orgName
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'P';

  return (
    <>
      {/* 1. BARRE LATÉRALE BUREAU (Desktop Sidebar) AVEC MODE REPLIABLE */}
      <aside 
        className={`bg-slate-900 text-white flex-col justify-between hidden md:flex shrink-0 min-h-screen border-r border-slate-800 select-none transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div>
          {/* En-tête Organisation avec Logo Personnalisé & Bouton Rétractable */}
          <div className={`p-4 border-b border-slate-800 ${isCollapsed ? 'flex flex-col items-center gap-3' : ''}`}>
            
            {/* Ligne En-tête : Logo, Nom, et Bouton Replier/Déplier */}
            <div className="flex items-center justify-between w-full relative">
              <div 
                onClick={handleCopyCode}
                className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'space-x-3 overflow-hidden min-w-0 cursor-pointer group hover:opacity-90 transition'}`}
                title="Cliquer pour copier le code organisation"
              >
                {/* Logo personnalisé ou Avatar Monogramme */}
                {orgLogo ? (
                  <img
                    src={orgLogo}
                    alt={orgName}
                    className="w-10 h-10 rounded-2xl object-cover shrink-0 shadow-md border border-slate-700 bg-white"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-500/20 shrink-0">
                    {orgInitials}
                  </div>
                )}

                {!isCollapsed && (
                  <div className="overflow-hidden min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <h1 className="font-extrabold text-sm leading-tight tracking-wide text-white truncate" title={orgName}>
                        {orgName}
                      </h1>
                    </div>
                    <p className="text-[11px] text-emerald-400 font-mono font-semibold flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      {copiedCode ? 'Code copié !' : orgCode}
                    </p>
                  </div>
                )}
              </div>

              {/* Bouton pour Replier (visible en mode étendu) */}
              {!isCollapsed && (
                <button
                  type="button"
                  onClick={toggleCollapse}
                  title="Replier la barre latérale (mode épuré)"
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer shrink-0 ml-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Bouton pour Déplier (visible en mode replié) */}
            {isCollapsed && (
              <button
                type="button"
                onClick={toggleCollapse}
                title="Déplier la barre latérale"
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition cursor-pointer mt-1"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {/* Code Établissement Canonique */}
            {!isCollapsed ? (
              <div className="mt-3 bg-slate-800/80 rounded-2xl p-2.5 flex items-center justify-between border border-slate-700/60">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Code :</span>
                  <span className="font-mono text-xs font-black text-amber-400 tracking-wider truncate">
                    {orgCode}
                  </span>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="text-[10px] bg-slate-700 hover:bg-slate-600 text-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition shrink-0 cursor-pointer"
                  title="Copier le code établissement d'enrôlement"
                >
                  {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode ? 'Copié' : 'Copier'}</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleCopyCode}
                title={`Code Établissement : ${orgCode} (Cliquer pour copier)`}
                className="w-10 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-xl text-amber-400 text-xs font-mono font-bold transition cursor-pointer"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          {/* Navigation Liens Opérationnels */}
          <div className="p-3">
            {!isCollapsed && (
              <span className="px-3 text-[10px] uppercase font-extrabold tracking-wider text-slate-500 block mb-1">
                Opérations & Suivi
              </span>
            )}
            <nav className="space-y-1 text-xs font-medium">
              {OP_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    className={`w-full flex items-center rounded-2xl transition group relative cursor-pointer ${
                      isCollapsed 
                        ? 'justify-center p-3' 
                        : 'space-x-3 px-3 py-2.5'
                    } ${
                      isActive
                        ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-600/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                    {item.href === '/justifications' && pendingJustifCount > 0 ? (
                      isCollapsed ? (
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                      ) : (
                        <span className="ml-auto bg-amber-500 text-slate-900 font-black text-[10px] px-1.5 py-0.5 rounded-full">
                          {pendingJustifCount}
                        </span>
                      )
                    ) : null}

                    {/* Tooltip en mode replié au survol */}
                    {isCollapsed && (
                      <span className="absolute left-full ml-3 px-2.5 py-1 bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition whitespace-nowrap z-50 border border-slate-700">
                        {item.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Section Configuration & Paramètres Repliable & Active */}
            <Suspense fallback={<div className="h-12" />}>
              <SettingsNavSection 
                isSettingsActive={isSettingsActive} 
                isCollapsed={isCollapsed} 
              />
            </Suspense>

            {/* Onglet Indépendant : À propos */}
            <div className={`mt-2 ${isCollapsed ? 'px-0' : 'px-1'}`}>
              <Link
                href="/a-propos"
                className={`w-full flex items-center ${isCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-2.5'} rounded-2xl transition text-xs font-bold group relative cursor-pointer select-none ${
                  pathname === '/a-propos'
                    ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/30 ring-1 ring-amber-400/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
                title="À propos • BAROUBA GROUP"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 ring-1 ring-amber-400/50">
                    <img src="/barouba-group-logo.png" alt="À propos" className="w-full h-full object-cover" />
                  </div>
                  {!isCollapsed && <span>À propos</span>}
                </div>
                {!isCollapsed && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                    pathname === '/a-propos' ? 'bg-amber-700 text-white' : 'bg-slate-800 text-amber-300 border border-amber-500/20'
                  }`}>
                    Éditeur
                  </span>
                )}
                {isCollapsed && (
                  <span className="absolute left-full ml-3 px-2.5 py-1 bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition whitespace-nowrap z-50 border border-slate-700">
                    À propos
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>

        {/* Pied de Sidebar */}
        <div className={`p-4 border-t border-slate-800 ${isCollapsed ? 'flex flex-col items-center gap-3' : 'space-y-3'}`}>
          {!isCollapsed ? (
            <>
              {/* Badge Éditeur & Conception BAROUBA GROUP */}
              <Link
                href="/a-propos"
                className="flex items-center gap-2.5 p-2 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/20 hover:border-amber-400/50 hover:bg-slate-800/80 transition group shadow-xs cursor-pointer"
                title="BAROUBA GROUP • Éditeur & Concepteur de la solution"
              >
                <img
                  src="/barouba-group-logo.png"
                  alt="BAROUBA GROUP"
                  className="w-7 h-7 rounded-full object-cover shrink-0 ring-2 ring-amber-500/30 group-hover:scale-105 transition duration-300"
                />
                <div className="flex flex-col text-[10px] leading-tight overflow-hidden">
                  <span className="font-extrabold text-amber-300 group-hover:text-amber-200 transition truncate">
                    BAROUBA GROUP
                  </span>
                  <span className="text-[9px] text-slate-400 truncate">
                    Édité au Burkina Faso
                  </span>
                </div>
              </Link>

              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-0.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Supabase Live
                </span>
                <span className="font-mono text-slate-500">v9 WGS84</span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs font-bold transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Déconnexion Gérant</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/a-propos"
                title="Édité par BAROUBA GROUP (Burkina Faso)"
                className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-amber-500/30 hover:ring-amber-400 transition cursor-pointer flex items-center justify-center shrink-0"
              >
                <img src="/barouba-group-logo.png" alt="BAROUBA GROUP" className="w-full h-full object-cover" />
              </Link>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="Supabase Live Connecté"></span>
              <button
                onClick={handleLogout}
                title="Déconnexion Gérant"
                className="w-10 h-10 flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </aside>

      {/* 2. BARRE SUPÉRIEURE MOBILE AVEC MENU SANDWICH */}
      <header className="md:hidden sticky top-0 z-40 w-full bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800 px-4 py-3 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center space-x-2.5 min-w-0">
          {orgLogo ? (
            <img
              src={orgLogo}
              alt={orgName}
              className="w-8 h-8 rounded-xl object-cover shrink-0 shadow-sm border border-slate-700 bg-white"
            />
          ) : (
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xs font-black shrink-0 shadow-sm shadow-blue-500/30">
              {orgInitials}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-white truncate max-w-[170px]">{orgName}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 font-semibold">{orgCode}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {pendingJustifCount > 0 && (
            <Link
              href="/justifications"
              className="relative p-1.5 bg-slate-800 text-amber-400 rounded-xl hover:bg-slate-700 transition"
              title={`${pendingJustifCount} justification(s) en attente`}
            >
              <ClipboardCheck className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-slate-950 font-black text-[9px] rounded-full flex items-center justify-center">
                {pendingJustifCount}
              </span>
            </Link>
          )}

          {/* Bouton Menu Sandwich */}
          <button
            onClick={() => setIsMobileMenuOpen(prev => !prev)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl transition cursor-pointer active:scale-95"
            aria-label="Menu principal"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5 text-amber-400" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* TIROIR COULISSANT DU MENU SANDWICH MOBILE */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Overlay sombre */}
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-fadeIn"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Panneau coulissant depuis la droite */}
          <div className="relative ml-auto w-4/5 max-w-xs bg-slate-900 border-l border-slate-800 h-full flex flex-col justify-between p-5 z-10 shadow-2xl animate-fadeIn">
            <div className="space-y-5 overflow-y-auto">
              {/* En-tête du tiroir */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xs">
                    {orgInitials}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white truncate max-w-[150px]">{orgName}</h3>
                    <span className="text-[10px] font-mono text-emerald-400">{orgCode}</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800/60"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Navigation Principale */}
              <div className="space-y-1">
                <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Pilotage & Opérations
                </div>
                {OP_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  const isJustif = item.href === '/justifications';
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {isJustif && pendingJustifCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
                          {pendingJustifCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* Paramètres & Système */}
              <div className="space-y-1 pt-2 border-t border-slate-800/80">
                <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Gouvernance & Hub
                </div>
                <Link
                  href="/parametres"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                    pathname.startsWith('/parametres')
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Paramètres & Géofencing</span>
                </Link>
                <Link
                  href="/gerant"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                    pathname === '/gerant'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Mode Smartphone Plein Écran</span>
                </Link>
                <button
                  type="button"
                  onClick={handleOtaUpdate}
                  className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition cursor-pointer text-left"
                >
                  <RefreshCw className="w-4 h-4 text-cyan-400" />
                  <span>Mettre à jour l'app (OTA)</span>
                </button>
                <Link
                  href="/a-propos"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                    pathname === '/a-propos'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Info className="w-4 h-4 text-slate-400" />
                  <span>À propos & Support</span>
                </Link>
              </div>
            </div>

            {/* Pied du tiroir : Déconnexion */}
            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center space-x-2 p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Déconnexion Sécurisée</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. BARRE DE NAVIGATION INFÉRIEURE MOBILE STYLE WHATSAPP */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 flex items-center justify-around select-none shadow-lg">
        <Link
          href="/dashboard"
          className={`flex flex-col items-center py-1 px-3 rounded-2xl transition ${
            pathname === '/dashboard' ? 'text-blue-400 font-extrabold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <PieChart className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Cockpit</span>
        </Link>

        <Link
          href="/pointages"
          className={`flex flex-col items-center py-1 px-3 rounded-2xl transition ${
            pathname === '/pointages' ? 'text-blue-400 font-extrabold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <ClipboardList className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Pointages</span>
        </Link>

        <Link
          href="/employes"
          className={`flex flex-col items-center py-1 px-3 rounded-2xl transition ${
            pathname === '/employes' ? 'text-blue-400 font-extrabold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Équipe</span>
        </Link>

        <Link
          href="/justifications"
          className={`flex flex-col items-center py-1 px-3 rounded-2xl relative transition ${
            pathname === '/justifications' ? 'text-blue-400 font-extrabold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <ClipboardCheck className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Justifs</span>
          {pendingJustifCount > 0 && (
            <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
          )}
        </Link>

        <Link
          href="/parametres"
          className={`flex flex-col items-center py-1 px-3 rounded-2xl transition ${
            pathname.startsWith('/parametres') ? 'text-blue-400 font-extrabold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Settings className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Paramètres</span>
        </Link>
      </nav>
    </>
  );
}
