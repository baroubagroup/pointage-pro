'use client';

import { useState, useEffect, Suspense } from 'react';
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
  Shield,
  Clock,
  Sparkles,
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
  const [orgName, setOrgName] = useState('BAROUBA PRO');
  const [orgCode, setOrgCode] = useState('ORG-8492');
  const [orgLogo, setOrgLogo] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [pendingJustifCount, setPendingJustifCount] = useState<number>(0);

  // Charger les justifications réelles en attente depuis Supabase
  useEffect(() => {
    const fetchPendingJustifs = async () => {
      try {
        const supabase = createClient();
        const { count } = await supabase
          .from('pointage_justifications')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'PENDING');
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
  }, []);

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
        const { data } = await supabase
          .from('pointage_organizations')
          .select('name, org_code, security_config')
          .limit(1)
          .single();
        if (data) {
          if (data.name) setOrgName(data.name);
          if (data.org_code) setOrgCode(data.org_code);
          if (data.security_config?.org_logo) {
            setOrgLogo(data.security_config.org_logo);
            if (typeof window !== 'undefined') {
              localStorage.setItem('pointage_org_logo', data.security_config.org_logo);
            }
          }
        }
      } catch (e) {
        console.warn('Sidebar fetch org error:', e);
      }
    };
    fetchOrg();

    // Écouteur de mise à jour instantanée du logo/nom/code depuis les Paramètres
    const handleOrgUpdate = (e: any) => {
      if (typeof window !== 'undefined') {
        const localLogo = localStorage.getItem('pointage_org_logo');
        if (localLogo !== null) setOrgLogo(localLogo);
        const localName = localStorage.getItem('pointage_org_name');
        if (localName) setOrgName(localName);
        const localCode = localStorage.getItem('pointage_org_code');
        if (localCode) setOrgCode(localCode);
      }
    };
    window.addEventListener('pointage_org_updated', handleOrgUpdate);
    return () => window.removeEventListener('pointage_org_updated', handleOrgUpdate);
  }, []);

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
            <div className="flex items-center justify-between w-full">
              <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'space-x-3 overflow-hidden min-w-0'}`}>
                
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
                  <div className="overflow-hidden min-w-0">
                    <h1 className="font-extrabold text-sm leading-tight tracking-wide text-white truncate" title={orgName}>
                      {orgName}
                    </h1>
                    <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Gouvernance WGS84
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
          </div>
        </div>

        {/* Pied de Sidebar */}
        <div className={`p-4 border-t border-slate-800 ${isCollapsed ? 'flex flex-col items-center gap-3' : 'space-y-3'}`}>
          {!isCollapsed ? (
            <>
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-2">
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
          <div className="flex items-center space-x-2.5">
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
            <span className="font-bold text-xs text-white truncate max-w-[180px]">{orgName}</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-[11px] text-red-400 font-bold px-2 py-1 bg-slate-800 rounded-lg"
          >
            Déconnexion
          </button>
        </div>
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
        </div>
      </div>
    </>
  );
}
