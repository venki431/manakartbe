-- ============================================================================
-- Manakart Backend — Full Database Schema (single-file setup)
-- ----------------------------------------------------------------------------
-- Reconstructed from the backend source (services, controllers, migrations).
-- Run this ONCE against a fresh Postgres/Supabase database to recreate every
-- table, constraint, and index the app relies on.
--
-- Usage:
--   psql "$DATABASE_URL" -f migrations/000_full_schema.sql
--   -- or paste into the Supabase SQL editor
--
-- Idempotent: safe to re-run (uses IF NOT EXISTS everywhere).
-- ============================================================================

DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS addresses CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;


-- Needed for gen_random_uuid(). On Supabase this is usually already enabled.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. USERS
--    Referenced by: auth.controller.js, user.service.js
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  phone         VARCHAR(10)  NOT NULL UNIQUE,   -- validated as 10 digits in code
  password_hash TEXT         NOT NULL,          -- bcrypt hash
  role          VARCHAR(20)  NOT NULL DEFAULT 'customer', -- 'customer' | 'admin'
  created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. ADDRESSES
--    Referenced by: user.service.js, order.service.js
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS addresses (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  house      VARCHAR(255) NOT NULL,
  street     VARCHAR(255) NOT NULL,
  area       VARCHAR(255) NOT NULL,
  pincode    VARCHAR(10)  NOT NULL,
  landmark   TEXT,
  latitude   DOUBLE PRECISION,   -- captured GPS location (with user consent)
  longitude  DOUBLE PRECISION,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add GPS columns to pre-existing addresses tables.
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);

-- ----------------------------------------------------------------------------
-- 3. PRODUCTS
--    Referenced by: product.service.js, order.service.js
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(255) NOT NULL UNIQUE,
  price_per_kg INTEGER NOT NULL,          -- stored in ₹ (integer rupees)
  available    BOOLEAN NOT NULL DEFAULT true,
  sort_order   INTEGER NOT NULL DEFAULT 100,  -- lower = shown first (popularity)
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Ensure the UNIQUE(name) constraint exists even on pre-existing tables
-- (CREATE TABLE IF NOT EXISTS won't add it to an already-created table).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_name_key'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_name_key UNIQUE (name);
  END IF;
END $$;

-- Add sort_order to pre-existing products tables.
ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 100;

-- ----------------------------------------------------------------------------
-- 4. ORDERS
--    Referenced by: order.service.js, order.controller.js
--    'items' is stored as a JSON snapshot of the cart at checkout time.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  address_id      UUID REFERENCES addresses(id) ON DELETE SET NULL,
  items           JSONB NOT NULL,              -- JSON.stringify(cart items)
  subtotal        INTEGER NOT NULL,
  delivery_charge INTEGER NOT NULL DEFAULT 0,
  grand_total     INTEGER NOT NULL,
  pincode         VARCHAR(10),
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',
                  -- pending | confirmed | shipped | delivered | cancelled
  admin_note      TEXT,
  delivery_date   DATE,                    -- evening the order is scheduled for
  delivery_slot   VARCHAR(20) DEFAULT 'evening', -- delivery window key
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add delivery scheduling columns to pre-existing orders tables.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_date DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_slot VARCHAR(20) DEFAULT 'evening';

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date);

-- ----------------------------------------------------------------------------
-- 5. NOTIFICATIONS
--    Referenced by: notification.service.js
--    user_id IS NULL  -> admin notification
--    user_id IS SET   -> customer notification
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type       VARCHAR(50)  NOT NULL,   -- 'new_order', 'order_placed', 'order_confirmed', ...
  title      VARCHAR(255) NOT NULL,
  message    TEXT,
  order_id   UUID REFERENCES orders(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL = admin notification
  is_read    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_is_read    ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id    ON notifications(user_id);


CREATE TABLE IF NOT EXISTS password_reset_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL
    REFERENCES users(id)
    ON DELETE CASCADE,

  otp_hash TEXT NOT NULL,

  expires_at TIMESTAMP NOT NULL,

  attempts INTEGER NOT NULL DEFAULT 0,

  verified BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_otps_user_id
  ON password_reset_otps(user_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_otps_expires_at
  ON password_reset_otps(expires_at);


CREATE TABLE IF NOT EXISTS password_reset_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL
    REFERENCES users(id)
    ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_requests_user_time
  ON password_reset_requests(user_id, created_at DESC);

-- ============================================================================
-- OPTIONAL: promote a user to admin (needed for admin-only endpoints).
-- Sign up via the API first, then run:
--   UPDATE users SET role = 'admin' WHERE phone = '9999999999';
-- ============================================================================
