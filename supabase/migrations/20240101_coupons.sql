-- Run this in your Supabase SQL editor to enable coupon codes
-- Dashboard → SQL Editor → New Query → paste and run

CREATE TABLE IF NOT EXISTS coupons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT UNIQUE NOT NULL,
  description TEXT,
  type        TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value       NUMERIC(10, 2) NOT NULL,
  min_order_amount NUMERIC(10, 2),
  max_uses    INTEGER,
  uses_count  INTEGER NOT NULL DEFAULT 0,
  expires_at  TIMESTAMPTZ,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by code
CREATE INDEX IF NOT EXISTS coupons_code_idx ON coupons (code);

-- Optional: sample coupons to test with
-- INSERT INTO coupons (code, description, type, value) VALUES
--   ('WELCOME10', '10% off your first order', 'percentage', 10),
--   ('SAVE5', '€5 off orders over €30', 'fixed', 5, 30);
