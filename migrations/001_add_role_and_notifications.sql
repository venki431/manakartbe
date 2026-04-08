-- Migration 001: Add role to users + notifications table + order status updates

-- 1. Add role column to users (default 'customer', admin must be set manually)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'customer';

-- 2. Create notifications table for admin alerts
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,           -- 'new_order', 'order_cancelled', etc.
  title VARCHAR(255) NOT NULL,
  message TEXT,
  order_id UUID REFERENCES orders(id),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Add updated_at to orders for tracking status changes
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 4. Add admin_note to orders for rejection/approval reasons
ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_note TEXT;

-- 5. Create index on notifications for fast admin queries
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
