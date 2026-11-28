import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export interface BroadcastAnnouncement {
  id: string;
  message: string;
  sender: string;
  sent_at: string;
  urgent: boolean;
}

/**
 * GET /api/broadcast?org_id=...
 * Retourne la dernière annonce d'urgence persistée dans pointage_organizations.security_config.latest_broadcast
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('org_id')?.trim();

    if (!orgId) {
      return NextResponse.json(
        { success: false, error: 'Paramètre org_id requis.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('pointage_organizations')
      .select('id, name, org_code, security_config')
      .eq('id', orgId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ success: false, error: 'Organisation introuvable.' }, { status: 404 });
    }

    const sc = (data.security_config && typeof data.security_config === 'object')
      ? data.security_config as Record<string, any>
      : {};

    return NextResponse.json(
      {
        success: true,
        org_id: data.id,
        org_name: data.name,
        broadcast: sc.latest_broadcast || null,
        history: Array.isArray(sc.broadcast_history) ? sc.broadcast_history : [],
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Erreur lecture diffusion.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/broadcast
 * Persiste l'annonce d'urgence dans Supabase (security_config.latest_broadcast + broadcast_history)
 * afin qu'elle soit captée en direct par toutes les applications mobiles des collaborateurs.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const orgId = typeof body.org_id === 'string' ? body.org_id.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const sender = typeof body.sender === 'string' && body.sender.trim()
      ? body.sender.trim()
      : 'Direction / Gérant';
    const urgent = body.urgent !== false;

    if (!orgId || !message) {
      return NextResponse.json(
        { success: false, error: 'org_id et message non vide sont obligatoires.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: orgData, error: fetchError } = await supabase
      .from('pointage_organizations')
      .select('id, name, org_code, security_config')
      .eq('id', orgId)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 });
    }
    if (!orgData) {
      return NextResponse.json({ success: false, error: 'Organisation introuvable.' }, { status: 404 });
    }

    const existingConfig = (orgData.security_config && typeof orgData.security_config === 'object')
      ? { ...(orgData.security_config as Record<string, any>) }
      : {};

    const existingHistory = Array.isArray(existingConfig.broadcast_history)
      ? existingConfig.broadcast_history
      : [];

    const announcement: BroadcastAnnouncement = {
      id: crypto.randomUUID(),
      message,
      sender,
      sent_at: new Date().toISOString(),
      urgent,
    };

    const nextConfig = {
      ...existingConfig,
      latest_broadcast: announcement,
      broadcast_history: [announcement, ...existingHistory].slice(0, 15),
    };

    const { error: updateError } = await supabase
      .from('pointage_organizations')
      .update({ security_config: nextConfig })
      .eq('id', orgId);

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      delivery_mode: 'supabase_live_sync',
      broadcast: announcement,
      history: nextConfig.broadcast_history,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Erreur diffusion push.' },
      { status: 500 }
    );
  }
}
