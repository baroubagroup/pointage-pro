'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Bell, 
  X, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  User, 
  MapPin, 
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Command
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actionButton?: React.ReactNode;
}

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: 'employee' | 'page' | 'site';
  href: string;
}

export function Header({ title, subtitle, actionButton }: HeaderProps) {
  const router = useRouter();

  // Search & Command Palette State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Notification Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(2);
  const [recentEvents, setRecentEvents] = useState<any[]>([
    {
      id: 'notif-1',
      title: 'Justification en attente',
      desc: 'Traoré Fatou a déclaré un retard de 16 min (Embouteillage)',
      time: 'Il y a 10 min',
      type: 'warning',
      href: '/justifications'
    },
    {
      id: 'notif-2',
      title: 'Pointage certifié',
      desc: 'Kouassi Jean-Marc • Prise de poste 07:28 (Box Wi-Fi OK)',
      time: 'Il y a 25 min',
      type: 'success',
      href: '/dashboard'
    },
    {
      id: 'notif-3',
      title: 'Sécurité GPS confirmée',
      desc: 'Bouclier anti-triche : 0 faux-GPS détecté sur le site',
      time: 'Il y a 1h',
      type: 'info',
      href: '/securite'
    }
  ]);

  // Horloge en direct
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Raccourci Clavier Ctrl + K / Cmd + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus sur l'input quand la palette s'ouvre
  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [isSearchOpen]);

  // Recherche dynamique des employés & pages
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([
        { id: 'p-1', title: 'Supervision Cockpit', subtitle: 'Synthèse des présences et indicateurs', type: 'page', href: '/dashboard' },
        { id: 'p-2', title: 'Journal des Pointages', subtitle: 'Registre d\'audit WGS84 et historique complet', type: 'page', href: '/pointages' },
        { id: 'p-3', title: 'Personnel & Effectif', subtitle: 'Gestion de l\'effectif et imports en masse', type: 'page', href: '/employes' },
        { id: 'p-4', title: 'Relevé d\'Assiduité & Paie', subtitle: 'Export Excel et calcul des heures supp', type: 'page', href: '/releves' },
        { id: 'p-5', title: 'Sites & Radar Géofencing', subtitle: 'Périmètres satellite et box Wi-Fi', type: 'page', href: '/parametres?tab=sites' },
        { id: 'p-6', title: 'Paramètres & Hub Système', subtitle: 'Code organisation ORG-8492 et règles', type: 'page', href: '/parametres' }
      ]);
      return;
    }

    const query = searchQuery.toLowerCase();
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const supabase = createClient();
        const { data: emps } = await supabase
          .from('pointage_employees')
          .select('id, full_name, employee_matricule, role, department')
          .or(`full_name.ilike.%${query}%,employee_matricule.ilike.%${query}%,department.ilike.%${query}%`)
          .limit(8);

        const results: SearchResult[] = [];

        if (emps && emps.length > 0) {
          emps.forEach((emp: any) => {
            results.push({
              id: emp.id,
              title: emp.full_name,
              subtitle: `Matricule : ${emp.employee_matricule || 'N/A'} • ${emp.department || emp.role || 'Collaborateur'}`,
              type: 'employee',
              href: `/employes`
            });
          });
        }

        // Pages correspondantes
        const pages = [
          { title: 'Supervision Live', subtitle: 'Tableau de bord', href: '/dashboard' },
          { title: 'Employés & Enrôlement', subtitle: 'Effectif', href: '/employes' },
          { title: 'Justifications de Retard', subtitle: 'Arbitrage', href: '/justifications' },
          { title: 'Relevé d\'Assiduité', subtitle: 'Rapports et paie', href: '/releves' },
          { title: 'Sites & Géofencing', subtitle: 'Périmètre GPS', href: '/sites' }
        ];

        pages.forEach((p, idx) => {
          if (p.title.toLowerCase().includes(query) || p.subtitle.toLowerCase().includes(query)) {
            results.push({
              id: `page-${idx}`,
              title: p.title,
              subtitle: p.subtitle,
              type: 'page',
              href: p.href
            });
          }
        });

        setSearchResults(results);
      } catch (err) {
        console.warn('Search query error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectResult = (href: string) => {
    setIsSearchOpen(false);
    router.push(href);
  };

  return (
    <>
      <header className="bg-white border-b border-slate-200/80 px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs sticky top-0 z-30">
        
        {/* Titre & Sous-titre de la Page */}
        <div className="flex items-center space-x-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-black text-slate-900 tracking-tight leading-tight">{title}</h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200/60 uppercase tracking-wider">
                SaaS Enterprise
              </span>
            </div>
            {subtitle && (
              <p className="text-xs text-slate-500 font-medium mt-0.5 leading-snug">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Barre d'Outils Universelle : Recherche + Actions + Notifications + Horloge UTC */}
        <div className="flex items-center flex-wrap gap-2.5">
          
          {/* 1. Déclencheur Recherche Globale Ctrl + K */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100/90 text-slate-500 hover:text-slate-800 text-xs px-3 py-2 rounded-xl border border-slate-200 transition shadow-xs group"
            title="Rechercher partout (Ctrl + K)"
          >
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition" />
            <span className="font-medium hidden sm:inline">Rechercher...</span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 bg-white border border-slate-200 text-slate-400 text-[10px] font-mono px-1.5 py-0.5 rounded shadow-2xs">
              Ctrl K
            </kbd>
          </button>

          {/* 2. Slot pour les boutons d'action spécifiques de chaque page */}
          {actionButton}

          {/* 3. Cloche de Notifications avec Badge Animé */}
          <button
            type="button"
            onClick={() => {
              setIsDrawerOpen(prev => !prev);
              setUnreadCount(0);
            }}
            className="relative p-2 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition shadow-xs"
            title="Centre de notifications et alertes en direct"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-bounce shadow-xs">
                {unreadCount}
              </span>
            )}
          </button>

          {/* 4. Horloge Atomique Satellite UTC */}
          <div className="hidden sm:flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-mono font-bold text-slate-800">
              {currentTime || 'En direct UTC'}
            </span>
          </div>
        </div>
      </header>

      {/* ==================== COMMAND PALETTE (MODAL RECHERCHE GLOBALE) ==================== */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col">
            
            {/* Input de recherche */}
            <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
              <Search className="w-5 h-5 text-blue-600 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tapez un nom, matricule (ex: MAT-2026-001) ou une page..."
                className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none font-medium"
              />
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Résultats de recherche */}
            <div className="max-h-80 overflow-y-auto p-3 space-y-1">
              {isSearching ? (
                <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Recherche en cours...</span>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Aucun résultat trouvé pour « {searchQuery} »
                </div>
              ) : (
                searchResults.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectResult(item.href)}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-blue-50/70 cursor-pointer transition group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        item.type === 'employee' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {item.type === 'employee' ? <User className="w-4 h-4" /> : <Command className="w-4 h-4" />}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700 transition">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {item.subtitle}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition shrink-0" />
                  </div>
                ))
              )}
            </div>

            {/* Pied de palette */}
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <kbd className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[10px]">Esc</kbd>
                pour fermer
              </span>
              <span>Recherche universelle temps réel</span>
            </div>
          </div>
        </div>
      )}

      {/* ==================== ACTIVITY NOTIFICATION DRAWER ==================== */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-2xs animate-fade-in">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-slide-in-right">
            
            {/* En-tête du volet */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Centre d'Activité Live</h3>
                  <p className="text-[11px] text-slate-500">Flux d'événements et alertes de présence</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/50 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Liste des événements */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {recentEvents.map((evt) => (
                <div
                  key={evt.id}
                  onClick={() => {
                    setIsDrawerOpen(false);
                    router.push(evt.href);
                  }}
                  className="p-3.5 rounded-2xl border border-slate-200/80 hover:border-blue-300 hover:shadow-xs transition cursor-pointer bg-white"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                      evt.type === 'warning' ? 'bg-amber-100 text-amber-800' :
                      evt.type === 'success' ? 'bg-emerald-100 text-emerald-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {evt.title}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">{evt.time}</span>
                  </div>
                  <p className="text-xs text-slate-700 font-semibold leading-relaxed mt-1">
                    {evt.desc}
                  </p>
                  <div className="mt-2 flex items-center gap-1 text-[11px] text-blue-600 font-bold hover:underline">
                    <span>Voir le détail</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              ))}
            </div>

            {/* Pied du volet */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Synchronisation temps réel</span>
              <button
                type="button"
                onClick={() => {
                  setIsDrawerOpen(false);
                  router.push('/justifications');
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 transition"
              >
                Toutes les justifications &rarr;
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
