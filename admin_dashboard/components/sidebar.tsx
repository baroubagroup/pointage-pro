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
  PanelLeftOpen
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const OP_ITEMS = [
  { href: '/dashboard', label: 'Supervision Cockpit', icon: PieChart },
  { href: '/pointages', label: 'Journal des Pointages', icon: ClipboardList },
  { href: '/employes', label: 'Personnel & Effectif', icon: Users },
  { href: '/releves', label: 'Relevés & Heures RH', icon: FileSpreadsheet },
  { href: '/justifications', label: 'Justifications', icon: ClipboardCheck },
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
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      if (localName) setOrgName(localName);
      const localId = localStorage.getItem('pointage_org_id');
      if (localId) setCurrentOrgId(localId);
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
            <div className="flex items-center justify-between w-full relative" ref={dropdownRef}>
              <div 
                onClick={() => !isCollapsed && setShowOrgDropdown(prev => !prev)}
                className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'space-x-3 overflow-hidden min-w-0 cursor-pointer group hover:opacity-90 transition'}`}
                title={isCollapsed ? orgName : "Changer d'organisation"}
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
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition shrink-0" />
                    </div>
                    <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Multi-Tenant Actif
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

              {/* Dropdown Sélecteur Multi-Entreprises Desktop */}
              {showOrgDropdown && !isCollapsed && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 animate-fadeIn text-left">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-700/60 flex items-center justify-between">
                    <span>Vos Entreprises</span>
                    <span className="text-emerald-400 font-semibold">{allOrgs.length} active{allOrgs.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-1 my-1.5 pr-0.5">
                    {allOrgs.map((org) => {
                      const isCurrent = org.id === currentOrgId || org.org_code === orgCode;
                      const initial = org.name ? org.name.substring(0, 2).toUpperCase() : 'OR';
                      return (
                        <button
                          key={org.id}
                          type="button"
                          onClick={() => handleSwitchOrg(org)}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition cursor-pointer ${
                            isCurrent
                              ? 'bg-blue-600/30 text-white border border-blue-500/50 font-bold'
                              : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {org.security_config?.org_logo ? (
                              <img src={org.security_config.org_logo} alt={org.name} className="w-6 h-6 rounded-lg object-cover bg-white shrink-0" />
                            ) : (
                              <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                                {initial}
                              </div>
                            )}
                            <div className="text-left truncate">
                              <span className="font-bold block truncate">{org.name}</span>
                              <span className="text-[10px] font-mono text-slate-400 block truncate">{org.org_code}</span>
                            </div>
                          </div>
                          {isCurrent && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-xs shrink-0 ml-1"></span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <Link
                    href="/register"
                    onClick={() => setShowOrgDropdown(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-amber-400 hover:text-amber-300 hover:bg-slate-700/50 rounded-xl transition border-t border-slate-700/60"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ Nouvelle Entreprise</span>
                  </Link>
                </div>
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

      {/* 2. BARRE DE NAVIGATION MOBILE */}
      <div className="md:hidden w-full bg-slate-900 text-white border-b border-slate-800 px-4 py-2.5 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <div 
            onClick={() => setShowOrgDropdown(prev => !prev)}
            className="flex items-center space-x-2.5 cursor-pointer group"
            title="Changer d'organisation"
          >
            {orgLogo ? (
              <img
                src={orgLogo}
                alt={orgName}
                className="w-7 h-7 rounded-lg object-cover shrink-0 shadow-xs border border-slate-700 bg-white"
              />
            ) : (
              <div className="w-7 h-7 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xs font-black">
                {orgInitials}
              </div>
            )}
            <div className="flex items-center gap-1">
              <span className="font-bold text-xs text-white truncate max-w-[160px]">{orgName}</span>
              <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white shrink-0" />
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-[11px] text-red-400 font-bold px-2 py-1 bg-slate-800 rounded-lg hover:bg-slate-700 transition cursor-pointer"
          >
            Déconnexion
          </button>
        </div>

        {/* Dropdown Mobile de sélection de l'organisation */}
        {showOrgDropdown && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-2.5 my-1.5 space-y-2 animate-fadeIn">
            <div className="px-2 py-1 text-[10px] font-bold uppercase text-slate-400 flex items-center justify-between border-b border-slate-700/60 pb-1.5">
              <span>Changer d'organisation ({allOrgs.length})</span>
              <button 
                type="button" 
                onClick={() => setShowOrgDropdown(false)}
                className="text-slate-400 hover:text-white text-xs px-1"
              >
                ✕
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {allOrgs.map((org) => {
                const isCurrent = org.id === currentOrgId || org.org_code === orgCode;
                return (
                  <button
                    key={org.id}
                    type="button"
                    onClick={() => handleSwitchOrg(org)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition cursor-pointer ${
                      isCurrent ? 'bg-blue-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-700/60'
                    }`}
                  >
                    <span className="truncate">{org.name}</span>
                    <span className="text-[10px] font-mono text-slate-300 ml-2 shrink-0">{org.org_code}</span>
                  </button>
                );
              })}
            </div>
            <Link
              href="/register"
              onClick={() => setShowOrgDropdown(false)}
              className="block text-center text-xs font-bold text-amber-400 py-1.5 border-t border-slate-700/60 mt-1"
            >
              + Enregistrer une nouvelle entreprise
            </Link>
          </div>
        )}
        <div className="flex space-x-1.5 overflow-x-auto pb-1 text-xs">
          {OP_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap px-3 py-1.5 rounded-xl font-bold transition ${
                  isActive ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/parametres"
            className={`whitespace-nowrap px-3 py-1.5 rounded-xl font-bold transition ${
              isSettingsActive ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            Paramètres
          </Link>
          <Link
            href="/a-propos"
            className={`whitespace-nowrap px-3 py-1.5 rounded-xl font-bold transition ${
              pathname === '/a-propos' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            À propos
          </Link>
        </div>
      </div>
    </>
  );
}
