import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Endpoint de configuration distante Anti-Blocage pour les APK Android déjà compilées.
 * Permet de basculer dynamiquement l'URL Supabase, l'Anon Key ou l'API Vercel/Next.js sans recompiler l'APK.
 */
export async function GET(request: NextRequest) {
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = request.headers.get('x-forwarded-proto') || (host.includes('localhost') || host.startsWith('192.168.') ? 'http' : 'https');
  const detectedBaseUrl = `${protocol}://${host}`;
  const apiBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || detectedBaseUrl;

  return NextResponse.json(
    {
      status: 'success',
      updated_at: new Date().toISOString(),
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      supabase_anon_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      backup_supabase_url: process.env.BACKUP_SUPABASE_URL || '',
      backup_supabase_anon_key: process.env.BACKUP_SUPABASE_ANON_KEY || '',
      api_base_url: apiBaseUrl,
      min_app_version: process.env.MIN_APP_VERSION || '1.0.0',
      apk_download_url: `${apiBaseUrl}/apk`,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}
