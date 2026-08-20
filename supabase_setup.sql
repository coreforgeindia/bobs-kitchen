-- =========================================================================
-- Bob's Satellite Kitchen — Complete Supabase Database Schema
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/mswhhjfkunhumhkuwjqg/sql
-- =========================================================================

-- Enable pgcrypto extension for UUID generation if not enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================================
-- 1. ORDERS TABLE (Customer food orders & live UPI payment reconciliation)
-- =========================================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) DEFAULT 0,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  coins_earned INT DEFAULT 0,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'EXPIRED')),
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  payment_method TEXT DEFAULT 'UPI',
  transaction_ref TEXT,
  upi_transaction_id TEXT,
  delivery_address TEXT,
  order_mode TEXT DEFAULT 'Delivery' CHECK (order_mode IN ('Delivery', 'Takeaway')),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  distance_km DECIMAL(5,2),
  items JSONB DEFAULT '[]'::jsonb,
  webhook_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- =========================================================================
-- 2. PIPRAPAY COMPANION DEVICES TABLE (Paired Android phones running SMS listener)
-- =========================================================================
CREATE TABLE IF NOT EXISTS pp_devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT UNIQUE NOT NULL,
  otp TEXT NOT NULL,
  name TEXT DEFAULT 'Android Device',
  model TEXT,
  android_level TEXT,
  app_version TEXT,
  status TEXT DEFAULT 'used' CHECK (status IN ('processing', 'used', 'inactive')),
  last_sync TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 3. PIPRAPAY SMS AUDIT TABLE (Incoming bank & UPI SMS notifications parsed from companion app)
-- =========================================================================
CREATE TABLE IF NOT EXISTS pp_sms_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT,
  sender TEXT NOT NULL,
  simslot TEXT DEFAULT '1',
  message TEXT NOT NULL,
  amount DECIMAL(10,2),
  trx_id TEXT,
  status TEXT DEFAULT 'approved' CHECK (status IN ('approved', 'used', 'error', 'awaiting-review')),
  reason TEXT DEFAULT '--',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 4. ROW LEVEL SECURITY (RLS) & IDEMPOTENT POLICIES
-- =========================================================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE pp_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE pp_sms_data ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running script to avoid "already exists" errors
DROP POLICY IF EXISTS "Allow public select on orders" ON orders;
DROP POLICY IF EXISTS "Allow public insert on orders" ON orders;
DROP POLICY IF EXISTS "Allow public update on orders" ON orders;
DROP POLICY IF EXISTS "Allow public delete on orders" ON orders;

DROP POLICY IF EXISTS "Allow public select on pp_devices" ON pp_devices;
DROP POLICY IF EXISTS "Allow public insert on pp_devices" ON pp_devices;
DROP POLICY IF EXISTS "Allow public update on pp_devices" ON pp_devices;
DROP POLICY IF EXISTS "Allow public delete on pp_devices" ON pp_devices;

DROP POLICY IF EXISTS "Allow public select on pp_sms_data" ON pp_sms_data;
DROP POLICY IF EXISTS "Allow public insert on pp_sms_data" ON pp_sms_data;
DROP POLICY IF EXISTS "Allow public update on pp_sms_data" ON pp_sms_data;
DROP POLICY IF EXISTS "Allow public delete on pp_sms_data" ON pp_sms_data;

-- Orders policies (Public read/insert/update for frontend & webhook reconciliation)
CREATE POLICY "Allow public select on orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Allow public insert on orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on orders" ON orders FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on orders" ON orders FOR DELETE USING (true);

-- Device policies
CREATE POLICY "Allow public select on pp_devices" ON pp_devices FOR SELECT USING (true);
CREATE POLICY "Allow public insert on pp_devices" ON pp_devices FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on pp_devices" ON pp_devices FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on pp_devices" ON pp_devices FOR DELETE USING (true);

-- SMS Data policies
CREATE POLICY "Allow public select on pp_sms_data" ON pp_sms_data FOR SELECT USING (true);
CREATE POLICY "Allow public insert on pp_sms_data" ON pp_sms_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on pp_sms_data" ON pp_sms_data FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on pp_sms_data" ON pp_sms_data FOR DELETE USING (true);

-- =========================================================================
-- 5. INDEXES FOR HIGH-PERFORMANCE LOOKUPS
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_devices_device_id ON pp_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_devices_otp ON pp_devices(otp);
CREATE INDEX IF NOT EXISTS idx_sms_created_at ON pp_sms_data(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_sender ON pp_sms_data(sender);

-- =========================================================================
-- 6. AUTOMATIC TIMESTAMP UPDATE TRIGGER
-- =========================================================================
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

DROP TRIGGER IF EXISTS trg_pp_devices_updated_at ON pp_devices;
CREATE TRIGGER trg_pp_devices_updated_at
BEFORE UPDATE ON pp_devices
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

-- =========================================================================
-- 7. ENABLE REALTIME BROADCASTING (FOR LIVE KITCHEN & ORDER STATUS UPDATES)
-- =========================================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE pp_devices;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE pp_sms_data;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;
