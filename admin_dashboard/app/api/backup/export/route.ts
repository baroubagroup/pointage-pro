import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Exporte une sauvegarde JSON complète des données de l'organisation (ou globales)
 * pour permettre une migration ou restauration rapide vers un nouveau projet Supabase.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('org_id')?.trim() || null;
    const download = searchParams.get('download') === '1';

    let orgQuery = supabase.from('pointage_organizations').select('*');
    if (orgId) orgQuery = orgQuery.eq('id', orgId);
    const { data: organizations, error: orgError } = await orgQuery;
    if (orgError) {
      return NextResponse.json({ success: false, error: orgError.message }, { status: 500 });
    }

    let estQuery = supabase.from('pointage_establishments').select('*');
    if (orgId) estQuery = estQuery.eq('org_id', orgId);
    const { data: establishments } = await estQuery.order('created_at', { ascending: true });

    let schedQuery = supabase.from('pointage_schedules').select('*');
    if (orgId) schedQuery = schedQuery.eq('org_id', orgId);
    const { data: schedules } = await schedQuery.order('created_at', { ascending: true });

    let empQuery = supabase.from('pointage_employees').select('*');
    if (orgId) empQuery = empQuery.eq('org_id', orgId);
    const { data: employees } = await empQuery.order('full_name', { ascending: true });

    const employeeIds = (employees || []).map((e: any) => e.id).filter(Boolean);

    let logs: any[] = [];
    let logsQuery = supabase.from('pointage_logs').select('*').order('recorded_at', { ascending: false }).limit(2000);
    if (orgId) {
      logsQuery = logsQuery.eq('org_id', orgId);
    }
    const { data: logsData } = await logsQuery;
    logs = logsData || [];

    let justifications: any[] = [];
    if (!orgId || employeeIds.length > 0) {
      let justQuery = supabase.from('pointage_justifications').select('*').order('created_at', { ascending: false }).limit(1000);
      if (orgId && employeeIds.length > 0) {
        justQuery = justQuery.in('employee_id', employeeIds);
      }
      const { data: justData } = await justQuery;
      justifications = justData || [];
    }

    let auditLogs: any[] = [];
    try {
      let auditQuery = supabase.from('pointage_audit_logs').select('*').order('created_at', { ascending: false }).limit(1000);
      if (orgId) auditQuery = auditQuery.eq('org_id', orgId);
      const { data: auditData } = await auditQuery;
      auditLogs = auditData || [];
    } catch {
      auditLogs = [];
    }

    const orgCode = organizations && organizations.length === 1 ? organizations[0].org_code : 'GLOBAL';
    const payload = {
      success: true,
      schema_version: 1,
      exported_at: new Date().toISOString(),
      scope_org_id: orgId,
      scope_org_code: orgCode,
      counts: {
        organizations: (organizations || []).length,
        establishments: (establishments || []).length,
        schedules: (schedules || []).length,
        employees: (employees || []).length,
        logs: logs.length,
        justifications: justifications.length,
        audit_logs: auditLogs.length,
      },
      tables: {
        pointage_organizations: organizations || [],
        pointage_establishments: establishments || [],
        pointage_schedules: schedules || [],
        pointage_employees: employees || [],
        pointage_logs: logs,
        pointage_justifications: justifications,
        pointage_audit_logs: auditLogs,
      },
    };

    const headers: Record<string, string> = {
      'Cache-Control': 'no-store',
    };
    if (download) {
      const dateStr = new Date().toISOString().slice(0, 10);
      headers['Content-Disposition'] = `attachment; filename="Backup_PointagePro_${orgCode}_${dateStr}.json"`;
    }

    return NextResponse.json(payload, { headers });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Erreur lors de la génération de sauvegarde.' },
      { status: 500 }
    );
  }
}
