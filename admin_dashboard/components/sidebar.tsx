'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  Building2 
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Supervision Live', icon: PieChart },
  { href: '/employes', label: 'Employés & Enrôlement', icon: Users },
  { href: '/justifications', label: 'Justifications Retards', icon: ClipboardCheck, badge: '1' },
  { href: '/plannings', label: 'Plannings & Horaires', icon: CalendarDays },
  { href: '/sites', label: 'Sites & Géofencing', icon: MapPin },
  { href: '/releves', label: 'Relevé d\'Assiduité', icon: FileSpreadsheet },
  { href: '/securite', label: 'Sécurité & Anti-Triche', icon: ShieldAlert },
  { href: '/parametres', label: 'Paramètres Entreprise', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    // Clear cookie & redirect
    document.cookie = 'pointage_manager_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {}
    router.push('/login?logout=true');
  };

  return (
    <>
      {/* 1. BARRE LATÉRALE BUREAU (Desktop Sidebar) */}
      <aside className="w-64 bg-slate-900 text-white flex-col justify-between hidden md:flex shrink-0 min-h-screen">
        <div>
          {/* En-tête Organisation */}
          <div className="h-16 flex items-center px-6 border-b border-slate-800 space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-blue-500/20">
              <i className="fa-solid fa-fingerprint"></i>
            </div>
            <div className="overflow-hidden">
              <h1 className="font-extrabold text-sm leading-tight tracking-wide text-white truncate">
                Société Ivoire Prestige
              </h1>
              <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Portail Gérant Sécurisé
              </p>
            </div>
          </div>

          {/* Navigation Liens */}
          <nav className="p-4 space-y-1 text-sm font-medium">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4 text-center shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto bg-amber-500 text-slate-900 font-extrabold text-[10px] px-1.5 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Pied de Sidebar : Déconnexion & Statut Cloud */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-2">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Supabase Cloud
            </span>
            <span className="font-mono text-slate-500">v2.0 SSR</span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs font-semibold transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Déconnexion Gérant</span>
          </button>
        </div>
      </aside>

      {/* 2. BARRE DE NAVIGATION MOBILE (En haut avec scroll horizontal) */}
      <div className="md:hidden w-full bg-slate-900 text-white border-b border-slate-800 px-4 py-2.5 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs">
              <i className="fa-solid fa-fingerprint"></i>
            </div>
            <span className="font-bold text-xs text-white">PointagePro Entreprise</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-[11px] text-red-400 font-semibold px-2 py-1 bg-slate-800 rounded-lg"
          >
            Déconnexion
          </button>
        </div>
        <div className="flex space-x-2 overflow-x-auto pb-1 text-xs">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg font-semibold transition ${
                  isActive ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
