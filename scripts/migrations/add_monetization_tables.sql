-- Add tables for product events, early access signups, and screening quotas.
-- Run after deploying the code that references these models.

CREATE TABLE IF NOT EXISTS product_events (
    id SERIAL PRIMARY KEY,
    event_name VARCHAR NOT NULL,
    user_id VARCHAR,
    session_id VARCHAR,
    symbol VARCHAR,
    metadata_json TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_product_events_event_name ON product_events (event_name);
CREATE INDEX IF NOT EXISTS ix_product_events_created_at ON product_events (created_at);

CREATE TABLE IF NOT EXISTS early_access_signups (
    id SERIAL PRIMARY KEY,
    email VARCHAR NOT NULL UNIQUE,
    name VARCHAR NOT NULL DEFAULT '',
    source VARCHAR NOT NULL DEFAULT 'premium_page',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS screening_quotas (
    id SERIAL PRIMARY KEY,
    actor_key VARCHAR NOT NULL,
    date VARCHAR NOT NULL,
    count INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_screening_quota_actor_date ON screening_quotas (actor_key, date);
