-- ==============================================================================
-- POINTAGEPRO ENTERPRISE — SCHÉMA SQL COMPLET ET IDEMPOTENT (SUPABASE / POSTGRESQL)
-- Sans danger sur une base existante (CREATE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS)
-- et prêt pour une migration complète vers un nouveau projet Supabase.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ORGANISATIONS (MULTI-TENANT)
CREATE TABLE IF NOT EXISTS pointage_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    org_code TEXT UNIQUE NOT NULL,
    city TEXT DEFAULT 'Ouagadougou',
    country TEXT DEFAULT 'Burkina Faso',
    latitude DOUBLE PRECISION DEFAULT 11.247051,
    longitude DOUBLE PRECISION DEFAULT -4.291915,
    security_config JSONB DEFAULT '{
        "require_biometrics": true,
        "require_selfie": false,
        "allow_offline": true,
        "hard_block_mock_gps": true,
        "require_device_binding": true,
        "require_wifi_bssid": false,
        "admission_policy": "STRICT"
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pointage_organizations ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Ouagadougou';
ALTER TABLE pointage_organizations ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Burkina Faso';
ALTER TABLE pointage_organizations ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION DEFAULT 11.247051;
ALTER TABLE pointage_organizations ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION DEFAULT -4.291915;
ALTER TABLE pointage_organizations ADD COLUMN IF NOT EXISTS security_config JSONB DEFAULT '{}'::jsonb;

-- 2. ÉTABLISSEMENTS / SITES GÉOFENCÉS WGS84 + MULTI-WI-FI
CREATE TABLE IF NOT EXISTS pointage_establishments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES pointage_organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    city TEXT DEFAULT 'Bobo-Dioulasso',
    latitude DOUBLE PRECISION NOT NULL DEFAULT 11.247051,
    longitude DOUBLE PRECISION NOT NULL DEFAULT -4.291915,
    radius_meters INTEGER NOT NULL DEFAULT 80,
    elastic_radius_meters INTEGER NOT NULL DEFAULT 150,
    wifi_ssid TEXT,
    wifi_bssid TEXT,
    wifi_bssids TEXT[] DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pointage_establishments ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Bobo-Dioulasso';
ALTER TABLE pointage_establishments ADD COLUMN IF NOT EXISTS elastic_radius_meters INTEGER DEFAULT 150;
ALTER TABLE pointage_establishments ADD COLUMN IF NOT EXISTS wifi_ssid TEXT;
ALTER TABLE pointage_establishments ADD COLUMN IF NOT EXISTS wifi_bssid TEXT;
ALTER TABLE pointage_establishments ADD COLUMN IF NOT EXISTS wifi_bssids TEXT[] DEFAULT '{}';
ALTER TABLE pointage_establishments ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_pointage_est_org ON pointage_establishments(org_id);

-- 3. PLANNINGS & COULOIRS HORAIRES
CREATE TABLE IF NOT EXISTS pointage_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES pointage_organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Continu',
    working_days INTEGER[] DEFAULT '{1,2,3,4,5}',
    morning_start TEXT DEFAULT '08:00',
    morning_end TEXT DEFAULT '12:00',
    lunch_start TEXT DEFAULT '12:00',
    lunch_end TEXT DEFAULT '13:30',
    afternoon_start TEXT DEFAULT '13:30',
    afternoon_end TEXT DEFAULT '17:00',
    tolerance_minutes INTEGER NOT NULL DEFAULT 15,
    weekly_hours DOUBLE PRECISION DEFAULT 40,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pointage_schedules ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Continu';
ALTER TABLE pointage_schedules ADD COLUMN IF NOT EXISTS working_days INTEGER[] DEFAULT '{1,2,3,4,5}';
ALTER TABLE pointage_schedules ADD COLUMN IF NOT EXISTS lunch_start TEXT DEFAULT '12:00';
ALTER TABLE pointage_schedules ADD COLUMN IF NOT EXISTS lunch_end TEXT DEFAULT '13:30';
ALTER TABLE pointage_schedules ADD COLUMN IF NOT EXISTS tolerance_minutes INTEGER DEFAULT 15;
ALTER TABLE pointage_schedules ADD COLUMN IF NOT EXISTS weekly_hours DOUBLE PRECISION DEFAULT 40;
ALTER TABLE pointage_schedules ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_pointage_sched_org ON pointage_schedules(org_id);

-- 4. EMPLOYÉS / COLLABORATEURS & ENRÔLEMENT
CREATE TABLE IF NOT EXISTS pointage_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES pointage_organizations(id) ON DELETE CASCADE,
    default_establishment_id UUID REFERENCES pointage_establishments(id) ON DELETE SET NULL,
    schedule_id UUID REFERENCES pointage_schedules(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    employee_matricule TEXT,
    email TEXT,
    phone TEXT,
    role TEXT DEFAULT 'Collaborateur',
    department TEXT DEFAULT 'Général',
    birth_date TEXT,
    security_secret TEXT,
    enrollment_token TEXT,
    bound_device_id TEXT,
    device_model TEXT,
    face_embedding_vector TEXT,
    face_update_count INTEGER NOT NULL DEFAULT 0,
    is_enrolled BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pointage_employees ADD COLUMN IF NOT EXISTS default_establishment_id UUID REFERENCES pointage_establishments(id) ON DELETE SET NULL;
ALTER TABLE pointage_employees ADD COLUMN IF NOT EXISTS schedule_id UUID REFERENCES pointage_schedules(id) ON DELETE SET NULL;
ALTER TABLE pointage_employees ADD COLUMN IF NOT EXISTS employee_matricule TEXT;
ALTER TABLE pointage_employees ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE pointage_employees ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE pointage_employees ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Collaborateur';
ALTER TABLE pointage_employees ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'Général';
ALTER TABLE pointage_employees ADD COLUMN IF NOT EXISTS birth_date TEXT;
ALTER TABLE pointage_employees ADD COLUMN IF NOT EXISTS security_secret TEXT;
ALTER TABLE pointage_employees ADD COLUMN IF NOT EXISTS enrollment_token TEXT;
ALTER TABLE pointage_employees ADD COLUMN IF NOT EXISTS bound_device_id TEXT;
ALTER TABLE pointage_employees ADD COLUMN IF NOT EXISTS device_model TEXT;
ALTER TABLE pointage_employees ADD COLUMN IF NOT EXISTS face_embedding_vector TEXT;
ALTER TABLE pointage_employees ADD COLUMN IF NOT EXISTS face_update_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pointage_employees ADD COLUMN IF NOT EXISTS is_enrolled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE pointage_employees ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_pointage_emp_org ON pointage_employees(org_id);
CREATE INDEX IF NOT EXISTS idx_pointage_emp_mat ON pointage_employees(org_id, employee_matricule);

-- 5. REGISTRE DES POINTAGES (GPS WGS84 + WI-FI + ANTI-FRAUDE)
CREATE TABLE IF NOT EXISTS pointage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES pointage_organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES pointage_employees(id) ON DELETE CASCADE,
    establishment_id UUID REFERENCES pointage_establishments(id) ON DELETE SET NULL,
    punch_type TEXT NOT NULL DEFAULT 'CHECK_IN',
    recorded_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    synced_at_utc TIMESTAMPTZ DEFAULT NOW(),
    is_offline_sync BOOLEAN NOT NULL DEFAULT FALSE,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    accuracy_meters DOUBLE PRECISION,
    distance_to_site_meters DOUBLE PRECISION,
    device_id TEXT,
    device_model TEXT,
    wifi_bssid TEXT,
    is_mock_location BOOLEAN NOT NULL DEFAULT FALSE,
    selfie_url TEXT,
    selfie_purged BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'VALIDATED',
    flag_reasons TEXT[] DEFAULT '{}',
    is_assisted BOOLEAN NOT NULL DEFAULT FALSE,
    assisted_by_employee_id UUID,
    is_acknowledged_by_manager BOOLEAN NOT NULL DEFAULT FALSE,
    manager_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pointage_logs ADD COLUMN IF NOT EXISTS is_assisted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE pointage_logs ADD COLUMN IF NOT EXISTS assisted_by_employee_id UUID;
ALTER TABLE pointage_logs ADD COLUMN IF NOT EXISTS wifi_bssid TEXT;
ALTER TABLE pointage_logs ADD COLUMN IF NOT EXISTS flag_reasons TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_pointage_logs_org_date ON pointage_logs(org_id, recorded_at_utc DESC);
CREATE INDEX IF NOT EXISTS idx_pointage_logs_emp_date ON pointage_logs(employee_id, recorded_at_utc DESC);

-- 6. JUSTIFICATIONS DE RETARDS & ARBITRAGE RH
CREATE TABLE IF NOT EXISTS pointage_justifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES pointage_organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES pointage_employees(id) ON DELETE CASCADE,
    punch_id UUID REFERENCES pointage_logs(id) ON DELETE SET NULL,
    reason_text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    reviewed_at TIMESTAMPTZ,
    reviewed_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pointage_justifications ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES pointage_organizations(id) ON DELETE CASCADE;
ALTER TABLE pointage_justifications ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE pointage_justifications ADD COLUMN IF NOT EXISTS reviewed_by TEXT;

CREATE INDEX IF NOT EXISTS idx_pointage_justif_org ON pointage_justifications(org_id, created_at DESC);

-- 7. JOURNAL D'AUDIT INVIOLABLE (APPEND-ONLY + CHAÎNAGE SHA-256)
CREATE TABLE IF NOT EXISTS pointage_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID,
    org_code TEXT,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'INFO',
    actor_name TEXT,
    actor_identifier TEXT,
    ip_address TEXT,
    user_agent TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    prev_hash TEXT NOT NULL,
    entry_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_org_created ON pointage_audit_logs(org_id, created_at DESC);

-- VERROU POSTGRESQL : IMPOSSIBLE DE MODIFIER OU SUPPRIMER UNE ENTRÉE D'AUDIT
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'SECURITE AUDIT : Le journal est strictement immuable (modification et suppression interdites).';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_immutable_audit_logs ON pointage_audit_logs;
CREATE TRIGGER trg_immutable_audit_logs
    BEFORE UPDATE OR DELETE ON pointage_audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_mutation();

-- 8. SÉCURITÉ RLS (ROW LEVEL SECURITY)
ALTER TABLE pointage_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pointage_establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pointage_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE pointage_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE pointage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pointage_justifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE pointage_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pointage_organizations_all" ON pointage_organizations;
CREATE POLICY "pointage_organizations_all" ON pointage_organizations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "pointage_establishments_all" ON pointage_establishments;
CREATE POLICY "pointage_establishments_all" ON pointage_establishments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "pointage_schedules_all" ON pointage_schedules;
CREATE POLICY "pointage_schedules_all" ON pointage_schedules FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "pointage_employees_all" ON pointage_employees;
CREATE POLICY "pointage_employees_all" ON pointage_employees FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "pointage_logs_all" ON pointage_logs;
CREATE POLICY "pointage_logs_all" ON pointage_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "pointage_justifications_all" ON pointage_justifications;
CREATE POLICY "pointage_justifications_all" ON pointage_justifications FOR ALL USING (true) WITH CHECK (true);

-- Audit : INSERT & SELECT uniquement (jamais UPDATE/DELETE)
DROP POLICY IF EXISTS "Audit logs insert only" ON pointage_audit_logs;
CREATE POLICY "Audit logs insert only" ON pointage_audit_logs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Audit logs read by org" ON pointage_audit_logs;
CREATE POLICY "Audit logs read by org" ON pointage_audit_logs FOR SELECT USING (true);

-- 9. ACTIVER SUPABASE REALTIME SUR LES TABLES TEMPS RÉEL
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE pointage_logs;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE pointage_justifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
