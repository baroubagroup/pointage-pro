-- ==============================================================================
-- SCHÉMA DE BASE DE DONNÉES : SOLUTION DE POINTAGE SÉCURISÉE (100% LOGICIEL)
-- Moteur : PostgreSQL 15+ / Supabase avec PostGIS
-- ==============================================================================

-- 1. EXTENSIONS NÉCESSAIRES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TYPES ÉNUMÉRÉS
CREATE TYPE user_role AS ENUM ('SUPERADMIN', 'ORG_ADMIN', 'MANAGER', 'EMPLOYEE');
CREATE TYPE punch_type AS ENUM ('CHECK_IN', 'CHECK_OUT', 'BREAK_START', 'BREAK_END');
CREATE TYPE punch_status AS ENUM ('VERIFIED', 'FLAGGED', 'REJECTED');

-- ==============================================================================
-- 3. TABLES STRUCTURELLES
-- ==============================================================================

-- Entreprises clientes
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Paramètres globaux de sécurité
    security_config JSONB DEFAULT '{
        "require_biometrics": true,
        "require_selfie": false,
        "allow_offline": true,
        "hard_block_mock_gps": true,
        "hard_block_distance_meters": 500
    }'::jsonb
);

-- Sites / Établissements (Boutiques, Chantiers, Sièges)
CREATE TABLE establishments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    -- Coordonnées GPS précises (PostGIS Geography Point : WGS84)
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 80, -- Rayon de tolérance standard
    elastic_radius_meters INTEGER NOT NULL DEFAULT 150, -- Au-delà = Refus, entre les deux = Alerte Orange
    -- Signature Wi-Fi optionnelle (BSSID / MAC de la box internet)
    wifi_bssid VARCHAR(32) DEFAULT NULL,
    wifi_ssid VARCHAR(128) DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profils utilisateurs & Employés
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    default_establishment_id UUID REFERENCES establishments(id) ON DELETE SET NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'EMPLOYEE',
    -- Device Binding : Empreinte unique du smartphone
    bound_device_id VARCHAR(255) DEFAULT NULL,
    device_model VARCHAR(128) DEFAULT NULL, -- ex: "Samsung Galaxy A53", "iPhone 13"
    -- Horaires de référence (pour calcul automatique des retards)
    expected_check_in_time TIME DEFAULT '08:30:00',
    expected_check_out_time TIME DEFAULT '17:30:00',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 4. TABLE CENTRALE : REGISTRE DES POINTAGES (ATTENDANCE LOGS)
-- ==============================================================================

CREATE TABLE attendance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    establishment_id UUID REFERENCES establishments(id) ON DELETE SET NULL,
    
    -- Type et Horodatages
    punch_type punch_type NOT NULL,
    recorded_at_utc TIMESTAMPTZ NOT NULL, -- Heure satellite GPS déclarée
    synced_at_utc TIMESTAMPTZ DEFAULT NOW(), -- Heure de réception par le serveur
    is_offline_sync BOOLEAN DEFAULT FALSE,
    
    -- Géolocalisation réelle lors du pointage
    actual_location GEOGRAPHY(POINT, 4326),
    accuracy_meters FLOAT, -- Précision du signal GPS au moment du clic
    distance_to_site_meters FLOAT, -- Calculé automatiquement via PostGIS
    
    -- Réseau & Matériel
    device_id VARCHAR(255) NOT NULL,
    device_model VARCHAR(128),
    wifi_bssid VARCHAR(32),
    is_mock_location BOOLEAN DEFAULT FALSE,
    
    -- Selfie éphémère (purgé après 24h)
    selfie_url TEXT DEFAULT NULL,
    selfie_purged BOOLEAN DEFAULT FALSE,
    
    -- Statut & Alertes (Vert / Orange / Rejet)
    status punch_status NOT NULL DEFAULT 'VERIFIED',
    flag_reasons TEXT[] DEFAULT '{}', -- ex: ARRAY['NEW_DEVICE', 'OUT_OF_BOUNDS_TOLERATED', 'OFFLINE_DELAYED']
    is_acknowledged_by_manager BOOLEAN DEFAULT FALSE,
    manager_notes TEXT DEFAULT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour optimiser les requêtes temps réel et cartographiques
CREATE INDEX idx_attendance_user_date ON attendance_logs(user_id, recorded_at_utc DESC);
CREATE INDEX idx_attendance_org_today ON attendance_logs(org_id, recorded_at_utc);
CREATE INDEX idx_attendance_actual_location ON attendance_logs USING GIST(actual_location);
CREATE INDEX idx_establishments_location ON establishments USING GIST(location);

-- ==============================================================================
-- 5. JOURNAL D'AUDIT DES CORRECTIONS MANUELLES (IMMUABILITÉ)
-- ==============================================================================

CREATE TABLE attendance_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attendance_log_id UUID REFERENCES attendance_logs(id) ON DELETE CASCADE,
    modified_by UUID NOT NULL REFERENCES users(id),
    original_recorded_at TIMESTAMPTZ NOT NULL,
    adjusted_recorded_at TIMESTAMPTZ NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 6. FONCTION INTELLIGENTE D'ÉVALUATION DU POINTAGE
-- Calcule la distance, vérifie le Wi-Fi, compare l'appareil et attribue les alertes
-- ==============================================================================

CREATE OR REPLACE FUNCTION process_attendance_punch(
    p_user_id UUID,
    p_establishment_id UUID,
    p_punch_type punch_type,
    p_recorded_at_utc TIMESTAMPTZ,
    p_longitude FLOAT,
    p_latitude FLOAT,
    p_accuracy_meters FLOAT,
    p_device_id VARCHAR(255),
    p_device_model VARCHAR(128),
    p_wifi_bssid VARCHAR(32) DEFAULT NULL,
    p_is_mock_location BOOLEAN DEFAULT FALSE,
    p_selfie_url TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_user users%ROWTYPE;
    v_est establishments%ROWTYPE;
    v_org organizations%ROWTYPE;
    v_point GEOGRAPHY;
    v_distance FLOAT := NULL;
    v_status punch_status := 'VERIFIED';
    v_flags TEXT[] := '{}';
    v_is_offline BOOLEAN := FALSE;
    v_new_id UUID;
BEGIN
    -- 1. Récupérer l'employé et le site
    SELECT * INTO v_user FROM users WHERE id = p_user_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Utilisateur non trouvé');
    END IF;

    SELECT * INTO v_est FROM establishments WHERE id = p_establishment_id;
    SELECT * INTO v_org FROM organizations WHERE id = v_user.org_id;

    -- Créer le point géographique du pointage
    IF p_longitude IS NOT NULL AND p_latitude IS NOT NULL THEN
        v_point := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography;
        IF v_est.id IS NOT NULL THEN
            -- Distance exacte en mètres via PostGIS
            v_distance := ST_Distance(v_point, v_est.location);
        END IF;
    END IF;

    -- Vérifier si la synchro est différée (plus de 15 min de décalage)
    IF (NOW() - p_recorded_at_utc) > INTERVAL '15 minutes' THEN
        v_is_offline := TRUE;
        v_flags := array_append(v_flags, 'OFFLINE_DELAYED');
    END IF;

    -- ==========================================================================
    -- 2. ÉVALUATION DES RÈGLES DE SÉCURITÉ & ALERTES
    -- ==========================================================================

    -- Règle A : Faux GPS (Mock Location)
    IF p_is_mock_location THEN
        IF (v_org.security_config->>'hard_block_mock_gps')::boolean THEN
            RETURN jsonb_build_object('success', false, 'error', 'Refus : Application de faux GPS détectée.');
        ELSE
            v_status := 'FLAGGED';
            v_flags := array_append(v_flags, 'MOCK_GPS_DETECTED');
        END IF;
    END IF;

    -- Règle B : Changement d'appareil (Device Binding)
    IF v_user.bound_device_id IS NULL THEN
        -- Premier pointage : on associe l'appareil
        UPDATE users SET bound_device_id = p_device_id, device_model = p_device_model WHERE id = p_user_id;
    ELSIF v_user.bound_device_id <> p_device_id THEN
        -- Appareil différent : on accepte mais on ALERTE le patron !
        v_status := 'FLAGGED';
        v_flags := array_append(v_flags, 'NEW_DEVICE_DETECTED');
    END IF;

    -- Règle C : Signature Wi-Fi
    -- Si connecté au Wi-Fi de la boîte, présence validée même si GPS faible en intérieur !
    IF v_est.wifi_bssid IS NOT NULL AND p_wifi_bssid IS NOT NULL THEN
        IF LOWER(v_est.wifi_bssid) = LOWER(p_wifi_bssid) THEN
            v_flags := array_append(v_flags, 'WIFI_CONFIRMED');
        END IF;
    END IF;

    -- Règle D : Distance & Geofencing
    IF v_distance IS NOT NULL THEN
        IF v_distance > (v_org.security_config->>'hard_block_distance_meters')::float THEN
            -- Trop loin (ex: > 500m) : Refus net
            RETURN jsonb_build_object('success', false, 'error', 'Refus : Vous êtes hors de la zone de travail.');
        ELSIF v_distance > v_est.radius_meters THEN
            -- Entre le rayon normal (ex: 80m) et la tolérance élastique (ex: 150m) : Alerte Orange
            v_status := 'FLAGGED';
            v_flags := array_append(v_flags, 'OUT_OF_BOUNDS_TOLERATED');
        END IF;
    END IF;

    -- Règle E : Précision GPS médiocre
    IF p_accuracy_meters IS NOT NULL AND p_accuracy_meters > 80.0 THEN
        v_flags := array_append(v_flags, 'LOW_GPS_ACCURACY');
    END IF;

    -- ==========================================================================
    -- 3. INSERTION DANS LE REGISTRE
    -- ==========================================================================
    INSERT INTO attendance_logs (
        org_id,
        user_id,
        establishment_id,
        punch_type,
        recorded_at_utc,
        actual_location,
        accuracy_meters,
        distance_to_site_meters,
        device_id,
        device_model,
        wifi_bssid,
        is_mock_location,
        is_offline_sync,
        selfie_url,
        status,
        flag_reasons
    ) VALUES (
        v_user.org_id,
        p_user_id,
        p_establishment_id,
        p_punch_type,
        p_recorded_at_utc,
        v_point,
        p_accuracy_meters,
        v_distance,
        p_device_id,
        p_device_model,
        p_wifi_bssid,
        p_is_mock_location,
        v_is_offline,
        p_selfie_url,
        v_status,
        v_flags
    ) RETURNING id INTO v_new_id;

    RETURN jsonb_build_object(
        'success', true,
        'punch_id', v_new_id,
        'status', v_status,
        'distance_meters', ROUND(v_distance::numeric, 1),
        'flags', v_flags,
        'recorded_at', p_recorded_at_utc
    );
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 7. FONCTION DE PURGE AUTOMATIQUE DES SELFIES (ÉPHÉMÈRE 24H)
-- Programmable via pg_cron ou un webhook Supabase
-- ==============================================================================

CREATE OR REPLACE FUNCTION purge_expired_selfies()
RETURNS INTEGER AS $$
DECLARE
    v_purged_count INTEGER;
BEGIN
    -- Efface les URLs de selfies de plus de 24 heures
    UPDATE attendance_logs
    SET selfie_url = NULL,
        selfie_purged = TRUE
    WHERE selfie_url IS NOT NULL
      AND recorded_at_utc < (NOW() - INTERVAL '24 hours');
      
    GET DIAGNOSTICS v_purged_count = ROW_COUNT;
    RETURN v_purged_count;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 8. VUE TEMPS RÉEL DU GÉRANT (LE DASHBOARD DU JOUR)
-- ==============================================================================

CREATE OR REPLACE VIEW view_today_attendance AS
SELECT 
    u.id AS user_id,
    u.org_id,
    u.full_name,
    u.bound_device_id,
    u.expected_check_in_time,
    e.name AS establishment_name,
    l.id AS punch_id,
    l.punch_type,
    l.recorded_at_utc,
    l.distance_to_site_meters,
    l.status,
    l.flag_reasons,
    l.selfie_url,
    l.is_offline_sync,
    CASE 
        WHEN l.punch_type = 'CHECK_IN' AND l.recorded_at_utc::time > (u.expected_check_in_time + INTERVAL '5 minutes') 
        THEN EXTRACT(EPOCH FROM (l.recorded_at_utc::time - u.expected_check_in_time)) / 60
        ELSE 0
    END AS late_minutes
FROM users u
LEFT JOIN establishments e ON u.default_establishment_id = e.id
LEFT JOIN LATERAL (
    SELECT * FROM attendance_logs 
    WHERE user_id = u.id 
      AND recorded_at_utc::date = CURRENT_DATE
    ORDER BY recorded_at_utc DESC
    LIMIT 1
) l ON true
WHERE u.role = 'EMPLOYEE' AND u.is_active = TRUE;
