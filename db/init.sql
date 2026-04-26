-- ZhirovKA database schema
-- PostgreSQL initialization script for utility bill and property expenses tracking.

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calc_method') THEN
        CREATE TYPE calc_method AS ENUM ('per_unit', 'per_area', 'per_person', 'fixed', 'manual');
    END IF;
END
$$;

ALTER TYPE calc_method ADD VALUE IF NOT EXISTS 'manual';

CREATE TABLE IF NOT EXISTS objects (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    object_type VARCHAR(60) NOT NULL DEFAULT 'apartment',
    address TEXT,
    area_m2 NUMERIC(10, 2) NOT NULL CHECK (area_m2 >= 0),
    residents_count INTEGER NOT NULL DEFAULT 0 CHECK (residents_count >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    unit VARCHAR(40),
    has_meter BOOLEAN NOT NULL DEFAULT FALSE,
    include_in_total BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tariffs (
    id BIGSERIAL PRIMARY KEY,
    service_id BIGINT NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    price NUMERIC(12, 4) NOT NULL CHECK (price >= 0),
    calc_method calc_method NOT NULL,
    valid_from DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT tariffs_service_valid_from_unique UNIQUE (service_id, valid_from)
);

CREATE TABLE IF NOT EXISTS monthly_records (
    id BIGSERIAL PRIMARY KEY,
    object_id BIGINT NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
    billing_year SMALLINT NOT NULL CHECK (billing_year BETWEEN 2000 AND 2200),
    billing_month SMALLINT NOT NULL CHECK (billing_month BETWEEN 1 AND 12),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT monthly_records_object_period_unique UNIQUE (object_id, billing_year, billing_month)
);

CREATE TABLE IF NOT EXISTS readings_and_charges (
    id BIGSERIAL PRIMARY KEY,
    monthly_record_id BIGINT NOT NULL REFERENCES monthly_records(id) ON DELETE CASCADE,
    service_id BIGINT NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    tariff_id BIGINT NOT NULL REFERENCES tariffs(id) ON DELETE RESTRICT,
    previous_reading NUMERIC(14, 4),
    current_reading NUMERIC(14, 4),
    consumption NUMERIC(14, 4) NOT NULL DEFAULT 0 CHECK (consumption >= 0),
    billable_quantity NUMERIC(14, 4) NOT NULL DEFAULT 0 CHECK (billable_quantity >= 0),
    applied_price NUMERIC(12, 4) NOT NULL CHECK (applied_price >= 0),
    final_cost NUMERIC(14, 2) NOT NULL CHECK (final_cost >= 0),
    include_in_total BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT readings_service_per_month_unique UNIQUE (monthly_record_id, service_id),
    CONSTRAINT readings_current_not_less_than_previous CHECK (
        previous_reading IS NULL
        OR current_reading IS NULL
        OR current_reading >= previous_reading
    )
);

ALTER TABLE services
ADD COLUMN IF NOT EXISTS include_in_total BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE readings_and_charges
ADD COLUMN IF NOT EXISTS include_in_total BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_objects_active ON objects(is_active);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);
CREATE INDEX IF NOT EXISTS idx_tariffs_service_valid_from ON tariffs(service_id, valid_from DESC);
CREATE INDEX IF NOT EXISTS idx_monthly_records_period ON monthly_records(billing_year, billing_month);
CREATE INDEX IF NOT EXISTS idx_readings_monthly_record ON readings_and_charges(monthly_record_id);
CREATE INDEX IF NOT EXISTS idx_readings_service ON readings_and_charges(service_id);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_objects_updated_at ON objects;
CREATE TRIGGER trg_objects_updated_at
BEFORE UPDATE ON objects
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_services_updated_at ON services;
CREATE TRIGGER trg_services_updated_at
BEFORE UPDATE ON services
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_tariffs_updated_at ON tariffs;
CREATE TRIGGER trg_tariffs_updated_at
BEFORE UPDATE ON tariffs
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_monthly_records_updated_at ON monthly_records;
CREATE TRIGGER trg_monthly_records_updated_at
BEFORE UPDATE ON monthly_records
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_readings_and_charges_updated_at ON readings_and_charges;
CREATE TRIGGER trg_readings_and_charges_updated_at
BEFORE UPDATE ON readings_and_charges
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMIT;
