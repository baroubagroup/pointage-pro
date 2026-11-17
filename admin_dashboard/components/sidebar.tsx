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
  Shield,
  Clock
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const OP_ITEMS = [
  { href: '/dashboard', label: 'Supervision Cockpit', icon: PieChart },
  { href: '/pointages', label: 'Journal des Pointages', icon: ClipboardList },
  { href: '/employes', label: 'Personnel & Effectif', icon: Users },
  { href: '/releves', label: 'Relevés & Heures RH', icon: FileSpreadsheet },
  { href: '/justifications', label: 'Justifications', icon: ClipboardCheck, badge: '1' },
];

const SETTINGS_SUB_ITEMS = [
  { tab: 'general', label: 'Organisation & Métier', icon: Building2 },
  { tab: 'sites', label: 'Sites & Géofencing', icon: MapPin },
  { tab: 'plannings', label: 'Plannings & Horaires', icon: CalendarDays },
  { tab: 'securite', label: 'Sécurité Anti-Triche', icon: Shield },
];

function SettingsNavSection({ isSettingsActive }: { isSettingsActive: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(true);

  // Détection de l'onglet actif dans l'URL (?tab=...)
  const currentTab = searchParams.get('tab') || 'general';

  // Toggle du pliage / dépliage
  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(prev => !prev);
  };

  const handleHeaderClick = () => {
    if (!isOpen) {
      setIsOpen(true);
    }
    router.push('/parametres?tab=general');
  };

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

      {/* Sous-onglets de Paramètres avec surbrillance active et synchronisation immédiate */}
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
  const [orgName, setOrgName] = useState('BAROUBA POINTAGE PRO');
  const [orgCode, setOrgCode] = useState('ORG-8492');
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('pointage_organizations')
          .select('name, org_code')
          .limit(1)
          .single();
        if (data) {
          if (data.name) setOrgName(data.name);
          if (data.org_code) setOrgCode(data.org_code);
        }
      } catch (e) {
        console.warn('Sidebar fetch org error:', e);
      }
    };
    fetchOrg();
  }, []);

  const handleCopyCode = () => {
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

  return (
    <>
      {/* 1. BARRE LATÉRALE BUREAU (Desktop Sidebar) */}
      <aside className="w-64 bg-slate-900 text-white flex-col justify-between hidden md:flex shrink-0 min-h-screen border-r border-slate-800 select-none">
        <div>
          {/* En-tête Organisation avec Code Multi-Tenant */}
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/20 shrink-0">
                P
              </div>
              <div className="overflow-hidden min-w-0">
                <h1 className="font-extrabold text-sm leading-tight tracking-wide text-white truncate" title={orgName}>
                  {orgName}
                </h1>
                <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Gouvernance WGS84
                </p>
              </div>
            </div>

            {/* Code Établissement Canonique pour les 500 élèves / collaborateurs */}
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
          </div>

          {/* Navigation Liens Opérationnels */}
          <div className="p-3">
            <span className="px-3 text-[10px] uppercase font-extrabold tracking-wider text-slate-500 block mb-1">
              Opérations & Suivi
            </span>
            <nav className="space-y-1 text-xs font-medium">
              {OP_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-2xl transition ${
                      isActive
                        ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-600/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto bg-amber-500 text-slate-900 font-black text-[10px] px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Section Configuration & Paramètres Repliable & Active */}
            <Suspense fallback={<div className="h-12" />}>
              <SettingsNavSection isSettingsActive={isSettingsActive} />
            </Suspense>
          </div>
        </div>

        {/* Pied de Sidebar */}
        <div className="p-4 border-t border-slate-800 space-y-3">
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
        </div>
      </aside>

      {/* 2. BARRE DE NAVIGATION MOBILE */}
      <div className="md:hidden w-full bg-slate-900 text-white border-b border-slate-800 px-4 py-2.5 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xs font-black">
              P
            </div>
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
