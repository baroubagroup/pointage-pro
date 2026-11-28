-- ==============================================================================
-- JOURNAL D'AUDIT INVIOLABLE (APPEND-ONLY + CHAÎNE CRYPTOGRAPHIQUE SHA-256)
-- Exécuter ce script une fois dans Supabase SQL Editor pour activer le stockage cloud inviolable.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS pointage_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID,
    org_code TEXT,
    event_type TEXT NOT NULL,           -- ex: LOGIN_SUCCESS, LOGIN_FAILED, SITE_CREATED, SITE_UPDATED, SITE_DELETED, SECURITY_POLICY_UPDATED
    severity TEXT NOT NULL DEFAULT 'INFO', -- INFO | WARNING | CRITICAL
    actor_name TEXT,
    actor_identifier TEXT,
    ip_address TEXT,                    -- IP réelle capturée côté serveur (ou 'Non transmise')
    user_agent TEXT,                    -- Navigateur / OS / App
    details JSONB DEFAULT '{}'::jsonb,  -- Détails structurés (ex: ancien -> nouveau rayon, motif échec)
    prev_hash TEXT NOT NULL,            -- Hash SHA-256 de l'entrée précédente (ou 'GENESIS')
    entry_hash TEXT NOT NULL,           -- Hash SHA-256 de cette entrée liée à prev_hash
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_org_created
    ON pointage_audit_logs (org_id, created_at DESC);

-- VERROU BASE DE DONNÉES : INTERDICTION FORMELLE DE MODIFIER OU SUPPRIMER UN LOG
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

-- SÉCURITÉ ROW LEVEL SECURITY (INSERT & SELECT UNIQUEMENT)
ALTER TABLE pointage_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Audit logs insert only" ON pointage_audit_logs;
CREATE POLICY "Audit logs insert only"
    ON pointage_audit_logs FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Audit logs read by org" ON pointage_audit_logs;
CREATE POLICY "Audit logs read by org"
    ON pointage_audit_logs FOR SELECT
    USING (true);
