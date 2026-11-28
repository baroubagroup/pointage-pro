'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Lock, Mail, ShieldCheck, ArrowRight, Building, KeyRound, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanId || !cleanPass) {
      setError("Veuillez renseigner votre email professionnel (ou code entreprise) et votre mot de passe.");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      // 1. Recherche sécurisée de l'entreprise correspondante dans Supabase
      const { data: orgs, error: fetchErr } = await supabase
        .from('pointage_organizations')
        .select('*');

      if (fetchErr) {
        console.warn("Supabase query error:", fetchErr);
      }

      // Recherche par email manager ou par code organisation (ex: ORG-NB-2026-3653TB)
      const matchedOrg = (orgs || []).find((o: any) => {
        const mgrEmail = (o.security_config?.manager_email || '').toLowerCase().trim();
        const orgCode = (o.org_code || '').toLowerCase().trim();
        return mgrEmail === cleanId || orgCode === cleanId;
      });

      if (!matchedOrg) {
        fetch('/api/audit/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_type: 'LOGIN_FAILED',
            severity: 'WARNING',
            actor_identifier: cleanId,
            details: { reason: 'Identifiant ou code organisation introuvable' }
          })
        }).catch(() => {});

        setError("Identifiant introuvable. Veuillez vérifier votre adresse email professionnelle ou votre code organisation.");
        setLoading(false);
        return;
      }

      // 2. Vérification du mot de passe
      const expectedPass = matchedOrg.security_config?.manager_password;
      let isAuthenticated = false;

      // Tentative Supabase Auth
      try {
        const { error: authErr } = await supabase.auth.signInWithPassword({
          email: matchedOrg.security_config?.manager_email || cleanId,
          password: cleanPass,
        });
        if (!authErr) isAuthenticated = true;
      } catch {}

      // Vérification mot de passe configuré
      if (!isAuthenticated && expectedPass && expectedPass === cleanPass) {
        isAuthenticated = true;
      }

      if (!isAuthenticated) {
        fetch('/api/audit/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            org_id: matchedOrg.id,
            org_code: matchedOrg.org_code,
            event_type: 'LOGIN_FAILED',
            severity: 'CRITICAL',
            actor_name: matchedOrg.security_config?.manager_name || null,
            actor_identifier: cleanId,
            details: { reason: 'Mot de passe incorrect', org_name: matchedOrg.name }
          })
        }).catch(() => {});

        setError("Mot de passe incorrect pour cet espace entreprise. Veuillez réessayer.");
        setLoading(false);
        return;
      }

      // Journaliser la connexion réussie dans le registre d'audit immuable
      await fetch('/api/audit/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: matchedOrg.id,
          org_code: matchedOrg.org_code,
          event_type: 'LOGIN_SUCCESS',
          severity: 'INFO',
          actor_name: matchedOrg.security_config?.manager_name || 'Dirigeant',
          actor_identifier: matchedOrg.security_config?.manager_email || cleanId,
          details: { org_name: matchedOrg.name }
        })
      }).catch(() => {});

      // 3. Mémorisation stricte et isolée de l'organisation connectée
      if (typeof window !== 'undefined') {
        localStorage.setItem('pointage_org_id', matchedOrg.id);
        localStorage.setItem('pointage_org_name', matchedOrg.name);
        localStorage.setItem('pointage_org_code', matchedOrg.org_code);
        if (matchedOrg.security_config?.manager_name) {
          localStorage.setItem('pointage_manager_name', matchedOrg.security_config.manager_name);
        }
        if (matchedOrg.security_config?.manager_email) {
          localStorage.setItem('pointage_manager_email', matchedOrg.security_config.manager_email);
        }
        if (matchedOrg.security_config?.org_logo) {
          localStorage.setItem('pointage_org_logo', matchedOrg.security_config.org_logo);
        } else {
          localStorage.removeItem('pointage_org_logo');
        }

        // Poser les cookies de session et d'organisation active
        document.cookie = `pointage_active_org_id=${matchedOrg.id}; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `pointage_active_org_code=${matchedOrg.org_code}; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = 'pointage_manager_session=manager_authenticated; path=/; max-age=86400; SameSite=Lax';

        window.dispatchEvent(new Event('pointage_org_updated'));
      }

      // 4. Redirection vers le tableau de bord de CETTE entreprise exclusivement
      window.location.href = '/dashboard';
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Erreur de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans">
      {/* Background decoration */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10">
        {/* En-tête */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-blue-600 items-center justify-center text-white text-2xl shadow-lg shadow-blue-500/30 mb-4">
            <i className="fa-solid fa-fingerprint"></i>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">PointagePro Enterprise</h1>
          <p className="text-xs text-slate-400 mt-1">Connexion Sécurisée à l'Espace Dirigeant</p>
          <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[11px] font-semibold text-blue-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Isolation Multi-Entreprises Certifiée</span>
          </div>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="mb-6 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium animate-fadeIn">
            {error}
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Email Professionnel ou Code Entreprise
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Ex: direction@entreprise.com ou ORG-..."
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Mot de Passe Sécurisé
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder-slate-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl text-sm transition shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 active:scale-95"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <span>Accéder à mon Espace Entreprise</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Inscription */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
          <p className="text-xs text-slate-400 mb-2">Votre entreprise n'est pas encore enregistrée ?</p>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Créer le compte de mon entreprise (Essai 14 jours)</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
