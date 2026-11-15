import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const pathname = request.nextUrl.pathname;

  // 1. API routes and APK downloads pass through directly (no authentication check)
  if (pathname.startsWith('/api') || pathname.startsWith('/apk') || pathname.endsWith('.apk')) {
    return supabaseResponse;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ylrnxuphtaoazlhlmnsd.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlscm54dXBodGFvYXpsaGxtbnNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMDc3NDgsImV4cCI6MjEwMTg4Mzc0OH0._F9Kr-vgD_nahWhVfYJDhP8xRhDw_HyukIHWw5yOC8g';

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refreshes the session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage = pathname.startsWith('/login');
  const demoAccess = request.cookies.get('pointage_manager_session')?.value;
  const isExplicitLogout = request.nextUrl.searchParams.get('logout') === 'true';

  // 2. If user explicitly logged out, keep them on /login
  if (isExplicitLogout && isAuthPage) {
    return supabaseResponse;
  }

  // 3. For preview & demo convenience: Auto-grant manager session if visiting dashboard routes
  if (!user && !demoAccess && !isAuthPage && pathname !== '/') {
    supabaseResponse.cookies.set('pointage_manager_session', 'manager_authenticated', {
      path: '/',
      maxAge: 86400 * 7,
      sameSite: 'lax',
    });
  }

  return supabaseResponse;
}
