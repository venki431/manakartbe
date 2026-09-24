-- Manakart demo schema. This script deliberately rebuilds the demo database.
-- Do not run it against production data without taking a backup first.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS product_variants CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS addresses CASCADE;
DROP TABLE IF EXISTS password_reset_otps CASCADE;
DROP TABLE IF EXISTS password_reset_requests CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(255) NOT NULL,
  phone VARCHAR(10) NOT NULL UNIQUE, password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'customer', email VARCHAR(255) UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  house VARCHAR(255) NOT NULL, street VARCHAR(255) NOT NULL, area VARCHAR(255) NOT NULL,
  pincode VARCHAR(10) NOT NULL, landmark TEXT, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION,
  is_default BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE, description TEXT, image_url TEXT,
  available BOOLEAN NOT NULL DEFAULT true, sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), category_id UUID NOT NULL REFERENCES categories(id),
  name VARCHAR(255) NOT NULL, slug VARCHAR(255) NOT NULL UNIQUE, description TEXT, image_url TEXT,
  available BOOLEAN NOT NULL DEFAULT true, sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_available ON products(available);
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  unit_type VARCHAR(20) NOT NULL CHECK (unit_type IN ('weight', 'count', 'bunch', 'packet', 'volume')),
  unit_quantity NUMERIC NOT NULL CHECK (unit_quantity > 0), unit_label VARCHAR(100) NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0), available BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 100, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, unit_type, unit_quantity)
);
CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  address_id UUID REFERENCES addresses(id) ON DELETE SET NULL, items JSONB NOT NULL,
  subtotal INTEGER NOT NULL, delivery_charge INTEGER NOT NULL DEFAULT 0, grand_total INTEGER NOT NULL,
  pincode VARCHAR(10), status VARCHAR(20) NOT NULL DEFAULT 'pending', admin_note TEXT,
  delivery_date DATE, delivery_slot VARCHAR(20) DEFAULT 'evening',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), type VARCHAR(50) NOT NULL, title VARCHAR(255) NOT NULL,
  message TEXT, order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE TABLE password_reset_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  otp_hash TEXT NOT NULL, expires_at TIMESTAMP NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE password_reset_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

