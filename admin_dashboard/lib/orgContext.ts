'use client';

import { createClient } from '@/lib/supabase/client';

export interface ActiveOrg {
  id: string;
  name: string;
  org_code: string;
  security_config?: any;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export function getLocalActiveOrgInfo(): { id: string | null; name: string; code: string } {
  if (typeof window === 'undefined') {
    return { id: null, name: 'Entreprise', code: 'ORG-PRO' };
  }
  const id = localStorage.getItem('pointage_org_id') || getCookie('pointage_active_org_id');
  const name = localStorage.getItem('pointage_org_name') || 'PointagePro';
  const code = localStorage.getItem('pointage_org_code') || getCookie('pointage_active_org_code') || '';
  return { id, name, code };
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

export async function fetchActiveOrg(): Promise<ActiveOrg | null> {
  const supabase = createClient();
  const { id, code } = getLocalActiveOrgInfo();

  let query = supabase.from('pointage_organizations').select('*');

  if (id) {
    query = query.eq('id', id);
  } else if (code && code !== 'ORG-PRO' && code !== 'ORG-8492') {
    query = query.eq('org_code', code);
  } else {
    // Prendre la dernière organisation enregistrée ou la première par défaut
    query = query.order('created_at', { ascending: false }).limit(1);
  }

  const { data, error } = await query.single();
  if (data) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pointage_org_id', data.id);
      localStorage.setItem('pointage_org_name', data.name);
      localStorage.setItem('pointage_org_code', data.org_code);
      document.cookie = `pointage_active_org_id=${data.id}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `pointage_active_org_code=${data.org_code}; path=/; max-age=86400; SameSite=Lax`;
    }
    return data;
  }
  return null;
}
