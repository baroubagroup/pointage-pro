import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createClient } from '@/lib/supabase/server';

export interface AuditEntry {
  id: string;
  org_id: string | null;
  org_code: string | null;
  event_type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  actor_name: string | null;
  actor_identifier: string | null;
  ip_address: string;
  user_agent: string;
  details: Record<string, any>;
  prev_hash: string;
  entry_hash: string;
  created_at: string;
}

const LEDGER_FILE_PATH = path.join(process.cwd(), '.audit_ledger.ndjson');

function extractRealClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0].trim();
    if (first) return first === '::1' ? '127.0.0.1 (Localhost)' : first;
  }
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim() === '::1' ? '127.0.0.1 (Localhost)' : realIp.trim();

  const host = req.headers.get('host') || '';
  if (host.includes('localhost') || host.includes('127.0.0.1') || host.startsWith('192.168.')) {
    return 'Réseau local (IP LAN non relayée par proxy)';
  }
  return 'Non transmise';
}

function summarizeUserAgent(rawUa: string | null): string {
  if (!rawUa) return 'Agent non transmis';
  let browser = 'Navigateur';
  if (rawUa.includes('Edg/')) browser = 'Edge';
  else if (rawUa.includes('Chrome/') && !rawUa.includes('Chromium')) browser = 'Chrome';
  else if (rawUa.includes('Firefox/')) browser = 'Firefox';
  else if (rawUa.includes('Safari/') && !rawUa.includes('Chrome')) browser = 'Safari';
  else if (rawUa.includes('Dart/') || rawUa.includes('Flutter')) browser = 'App Mobile Native';

  let os = '';
  if (rawUa.includes('Android')) os = 'Android';
  else if (rawUa.includes('iPhone') || rawUa.includes('iPad')) os = 'iOS';
  else if (rawUa.includes('Windows')) os = 'Windows';
  else if (rawUa.includes('Mac OS')) os = 'macOS';
  else if (rawUa.includes('Linux')) os = 'Linux';

  return os ? `${browser} • ${os}` : browser;
}

function computeAuditHash(payload: {
  prev_hash: string;
  org_id: string | null;
  event_type: string;
  severity: string;
  actor_identifier: string | null;
  ip_address: string;
  created_at: string;
  details: Record<string, any>;
}): string {
  const canonical = JSON.stringify({
    prev_hash: payload.prev_hash,
    org_id: payload.org_id || '',
    event_type: payload.event_type,
    severity: payload.severity,
    actor_identifier: payload.actor_identifier || '',
    ip_address: payload.ip_address,
    created_at: payload.created_at,
    details: payload.details || {}
  });
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

function verifyChain(chronologicalEntries: AuditEntry[]): { intact: boolean; brokenIndex: number | null } {
  for (let i = 0; i < chronologicalEntries.length; i++) {
    const entry = chronologicalEntries[i];
    const expectedPrev = i === 0 ? 'GENESIS' : chronologicalEntries[i - 1].entry_hash;
    if (entry.prev_hash !== expectedPrev) {
      return { intact: false, brokenIndex: i };
    }
    const recomputed = computeAuditHash({
      prev_hash: entry.prev_hash,
      org_id: entry.org_id,
      event_type: entry.event_type,
      severity: entry.severity,
      actor_identifier: entry.actor_identifier,
      ip_address: entry.ip_address,
      created_at: entry.created_at,
      details: entry.details
    });
    if (recomputed !== entry.entry_hash) {
      return { intact: false, brokenIndex: i };
    }
  }
  return { intact: true, brokenIndex: null };
}

function readLocalLedger(orgId?: string | null): AuditEntry[] {
  try {
    if (!fs.existsSync(LEDGER_FILE_PATH)) return [];
    const lines = fs.readFileSync(LEDGER_FILE_PATH, 'utf8')
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);
    const parsed: AuditEntry[] = [];
    for (const line of lines) {
      try {
        const item = JSON.parse(line) as AuditEntry;
        if (!orgId || !item.org_id || item.org_id === orgId) {
          parsed.push(item);
        }
      } catch {}
    }
    return parsed;
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('org_id');
    const supabase = await createClient();

    // 1. Essai lecture table cloud immuable Supabase
    let query = supabase
      .from('pointage_audit_logs')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(200);

    if (orgId) {
      query = query.eq('org_id', orgId);
    }

    const { data, error } = await query;

    if (!error && Array.isArray(data)) {
      const check = verifyChain(data as AuditEntry[]);
      return NextResponse.json({
        success: true,
        storage: 'supabase_immutable',
        needsSqlMigration: false,
        chainIntact: check.intact,
        total: data.length,
        entries: [...data].reverse()
      });
    }

    // 2. Fallback honnête vers le registre local append-only si la table SQL n'est pas encore créée
    const localChrono = readLocalLedger(orgId);
    const check = verifyChain(localChrono);
    return NextResponse.json({
      success: true,
      storage: 'local_ledger',
      needsSqlMigration: true,
      chainIntact: check.intact,
      total: localChrono.length,
      entries: [...localChrono].reverse()
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Erreur audit log' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orgId: string | null = body.org_id || null;
    const orgCode: string | null = body.org_code || null;
    const eventType: string = String(body.event_type || 'SYSTEM_EVENT').trim();
    const severity: 'INFO' | 'WARNING' | 'CRITICAL' =
      body.severity === 'CRITICAL' || body.severity === 'WARNING' ? body.severity : 'INFO';
    const actorName: string | null = body.actor_name ? String(body.actor_name).trim() : null;
    const actorIdentifier: string | null = body.actor_identifier ? String(body.actor_identifier).trim() : null;
    const details: Record<string, any> = body.details && typeof body.details === 'object' ? body.details : {};

    const ipAddress = extractRealClientIp(req);
    const userAgent = summarizeUserAgent(req.headers.get('user-agent'));
    const createdAt = new Date().toISOString();
    const supabase = await createClient();

    // 1. Tenter écriture dans Supabase immuable
    let prevQuery = supabase
      .from('pointage_audit_logs')
      .select('entry_hash')
      .order('created_at', { ascending: false })
      .limit(1);

    if (orgId) {
      prevQuery = prevQuery.eq('org_id', orgId);
    }
    const { data: prevRows, error: prevErr } = await prevQuery;

    if (!prevErr) {
      const prevHash = prevRows && prevRows.length > 0 ? prevRows[0].entry_hash : 'GENESIS';
      const entryHash = computeAuditHash({
        prev_hash: prevHash,
        org_id: orgId,
        event_type: eventType,
        severity,
        actor_identifier: actorIdentifier,
        ip_address: ipAddress,
        created_at: createdAt,
        details
      });

      const record = {
        org_id: orgId,
        org_code: orgCode,
        event_type: eventType,
        severity,
        actor_name: actorName,
        actor_identifier: actorIdentifier,
        ip_address: ipAddress,
        user_agent: userAgent,
        details,
        prev_hash: prevHash,
        entry_hash: entryHash,
        created_at: createdAt
      };

      const { data: inserted, error: insErr } = await supabase
        .from('pointage_audit_logs')
        .insert(record)
        .select()
        .single();

      if (!insErr && inserted) {
        return NextResponse.json({
          success: true,
          storage: 'supabase_immutable',
          entry: inserted
        });
      }
    }

    // 2. Sinon écriture dans le fichier append-only local (uniquement ajout en fin de fichier)
    const existingLocal = readLocalLedger(orgId);
    const prevHash = existingLocal.length > 0 ? existingLocal[existingLocal.length - 1].entry_hash : 'GENESIS';
    const entryHash = computeAuditHash({
      prev_hash: prevHash,
      org_id: orgId,
      event_type: eventType,
      severity,
      actor_identifier: actorIdentifier,
      ip_address: ipAddress,
      created_at: createdAt,
      details
    });

    const localRecord: AuditEntry = {
      id: crypto.randomUUID(),
      org_id: orgId,
      org_code: orgCode,
      event_type: eventType,
      severity,
      actor_name: actorName,
      actor_identifier: actorIdentifier,
      ip_address: ipAddress,
      user_agent: userAgent,
      details,
      prev_hash: prevHash,
      entry_hash: entryHash,
      created_at: createdAt
    };

    try {
      fs.appendFileSync(LEDGER_FILE_PATH, JSON.stringify(localRecord) + '\n', 'utf8');
    } catch {}

    return NextResponse.json({
      success: true,
      storage: 'local_ledger',
      needsSqlMigration: true,
      entry: localRecord
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Erreur écriture audit' }, { status: 500 });
  }
}
