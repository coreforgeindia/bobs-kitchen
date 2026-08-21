-- =========================================================================
-- Bob's Satellite Kitchen — Complete Supabase Database Schema (Fresh Setup)
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/
-- =========================================================================

-- Enable pgcrypto extension for UUID generation if not enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Sequential public order codes: BSK001, BSK002, ...
CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION next_order_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_code TEXT;
BEGIN
  LOOP
    next_code := 'BSK' || LPAD(nextval('order_number_seq')::TEXT, 3, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM orders WHERE order_id = next_code);
  END LOOP;
  RETURN next_code;
END;
$$;

GRANT EXECUTE ON FUNCTION next_order_code() TO anon, authenticated;

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
  status TEXT DEFAULT 'PENDING' CHECK (status IN (
    'PENDING', 'PAID', 'FAILED', 'EXPIRED', 
    'Order Received', 'Restaurant Accepted', 'Preparing', 
    'Packed', 'Ready for Pickup', 'Delivery Partner Assigned', 'Picked Up', 
    'Out For Delivery', 'Delivered', 'Cancelled'
  )),
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  payment_method TEXT DEFAULT 'UPI',
  transaction_ref TEXT,
  upi_transaction_id TEXT,
  delivery_address TEXT,
  order_mode TEXT DEFAULT 'Delivery' CHECK (order_mode IN ('Delivery', 'Takeaway', 'Dining in')),
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

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN (
  'PENDING', 'PAID', 'FAILED', 'EXPIRED',
  'Order Received', 'Restaurant Accepted', 'Preparing', 'Packed',
  'Ready for Pickup', 'Delivery Partner Assigned', 'Picked Up',
  'Out For Delivery', 'Delivered', 'Cancelled'
));

-- =========================================================================
-- 1B. MENU ITEMS TABLE (Shared catalog managed by the admin panel)
-- =========================================================================
CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  description TEXT DEFAULT '',
  image TEXT DEFAULT '',
  veg BOOLEAN DEFAULT true,
  contains_egg BOOLEAN DEFAULT false,
  rating DECIMAL(3,2) DEFAULT 0,
  review_count INT DEFAULT 0,
  calories INT DEFAULT 0,
  prep_time TEXT DEFAULT '10 min',
  bestseller BOOLEAN DEFAULT false,
  available BOOLEAN DEFAULT true,
  special_offer_badge TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 2. PIPRAPAY COMPANION DEVICES TABLE (Paired SMS listener devices)
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
-- 3. PIPRAPAY SMS AUDIT TABLE (Parsed incoming bank SMS notifications)
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
-- 4. CUSTOMER PROFILES TABLE (Associated strictly by Phone number)
-- =========================================================================
CREATE TABLE IF NOT EXISTS customer_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  full_name TEXT,
  saved_address TEXT,
  wallet_coins INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 5. ROW LEVEL SECURITY (RLS) & POLICY DEFINITIONS
-- =========================================================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pp_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE pp_sms_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running script to avoid duplicate name conflicts
DROP POLICY IF EXISTS "Allow public select on customer_profiles" ON customer_profiles;
DROP POLICY IF EXISTS "Allow public insert on customer_profiles" ON customer_profiles;
DROP POLICY IF EXISTS "Allow public update on customer_profiles" ON customer_profiles;
DROP POLICY IF EXISTS "Allow public delete on customer_profiles" ON customer_profiles;

CREATE POLICY "Allow public select on customer_profiles" ON customer_profiles FOR SELECT USING (true);
CREATE POLICY "Allow public insert on customer_profiles" ON customer_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on customer_profiles" ON customer_profiles FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on customer_profiles" ON customer_profiles FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public select on orders" ON orders;
DROP POLICY IF EXISTS "Allow public insert on orders" ON orders;
DROP POLICY IF EXISTS "Allow public update on orders" ON orders;
DROP POLICY IF EXISTS "Allow public delete on orders" ON orders;

CREATE POLICY "Allow public select on orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Allow public insert on orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on orders" ON orders FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on orders" ON orders FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public select on menu_items" ON menu_items;
DROP POLICY IF EXISTS "Allow public insert on menu_items" ON menu_items;
DROP POLICY IF EXISTS "Allow public update on menu_items" ON menu_items;
DROP POLICY IF EXISTS "Allow public delete on menu_items" ON menu_items;

CREATE POLICY "Allow public select on menu_items" ON menu_items FOR SELECT USING (true);
CREATE POLICY "Allow public insert on menu_items" ON menu_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on menu_items" ON menu_items FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on menu_items" ON menu_items FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public select on pp_devices" ON pp_devices;
DROP POLICY IF EXISTS "Allow public insert on pp_devices" ON pp_devices;
DROP POLICY IF EXISTS "Allow public update on pp_devices" ON pp_devices;
DROP POLICY IF EXISTS "Allow public delete on pp_devices" ON pp_devices;

CREATE POLICY "Allow public select on pp_devices" ON pp_devices FOR SELECT USING (true);
CREATE POLICY "Allow public insert on pp_devices" ON pp_devices FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on pp_devices" ON pp_devices FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on pp_devices" ON pp_devices FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public select on pp_sms_data" ON pp_sms_data;
DROP POLICY IF EXISTS "Allow public insert on pp_sms_data" ON pp_sms_data;
DROP POLICY IF EXISTS "Allow public update on pp_sms_data" ON pp_sms_data;
DROP POLICY IF EXISTS "Allow public delete on pp_sms_data" ON pp_sms_data;

CREATE POLICY "Allow public select on pp_sms_data" ON pp_sms_data FOR SELECT USING (true);
CREATE POLICY "Allow public insert on pp_sms_data" ON pp_sms_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on pp_sms_data" ON pp_sms_data FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on pp_sms_data" ON pp_sms_data FOR DELETE USING (true);

-- =========================================================================
-- 6. INDEXES FOR STABLE HIGH-PERFORMANCE LOOKUPS
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(available);
CREATE INDEX IF NOT EXISTS idx_devices_device_id ON pp_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_devices_otp ON pp_devices(otp);
CREATE INDEX IF NOT EXISTS idx_sms_created_at ON pp_sms_data(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_phone ON customer_profiles(phone);

-- =========================================================================
-- 7. AUTOMATIC TIMESTAMP UPDATE TRIGGER
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

DROP TRIGGER IF EXISTS trg_customer_profiles_updated_at ON customer_profiles;
CREATE TRIGGER trg_customer_profiles_updated_at
BEFORE UPDATE ON customer_profiles
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

DROP TRIGGER IF EXISTS trg_menu_items_updated_at ON menu_items;
CREATE TRIGGER trg_menu_items_updated_at
BEFORE UPDATE ON menu_items
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

-- =========================================================================
-- 8. ENABLE REALTIME BROADCASTING
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
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE customer_profiles;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- =========================================================================
-- 9. INITIAL MENU ITEMS SEED DATA
-- =========================================================================
INSERT INTO menu_items (id, name, category, price, description, veg, rating, review_count, calories, prep_time, bestseller, available, special_offer_badge) VALUES
('paneer-tikka-snack-pack', 'Veg Snack Pack', 'Fusion Snack Pack', 120.00, 'Crispy cottage cheese paneer tikka cubes served with signature dipping sauce & golden fries.', true, 4.8, 482, 480, '15 min', true, true, 'OUR SIGNATURE'),
('chicken-tikka-snack-pack', 'Chicken Snack Pack', 'Fusion Snack Pack', 120.00, 'Smoky grilled chicken tikka bites, seasoned crispy fries, and house spicy mayo dip.', false, 4.9, 654, 590, '15 min', true, true, 'OUR SIGNATURE'),
('chicken-jalfrezi-snack-pack', 'Chicken Jalfrezi Snack Pack', 'Fusion Snack Pack', 130.00, 'Spiced chicken jalfrezi tossed with crunchy bell peppers, crispy potato wedges, and mint dip.', false, 4.8, 390, 610, '15 min', true, true, 'CHEF SPECIAL'),
('crunchy-paneer-roll', 'Crunchy Paneer Roll', 'Rolls', 110.00, 'Crispy seasoned paneer cubes, crunchy fresh slaw, and smoky house sauce rolled in a warm paratha wrap.', true, 4.7, 345, 390, '10 min', true, true, NULL),
('tawa-grilled-chicken-roll', 'Tawa Grilled Chicken Roll', 'Rolls', 110.00, 'Tawa-seared tender chicken strips, sauteed onions, and herbs rolled with a creamy tangy sauce.', false, 4.8, 420, 440, '10 min', true, true, NULL),
('chicken-jalfrezi-roll', 'Chicken Jalfrezi Roll', 'Rolls', 110.00, 'Spiced jalfrezi chicken, sweet peppers, and red onions rolled in a hot grilled wrap.', false, 4.7, 290, 450, '10 min', false, true, NULL),
('veg-burger', 'Veg Burger', 'Burgers', 89.00, 'Crispy spiced golden vegetable patty topped with fresh lettuce, juicy tomato, and signature secret burger sauce.', true, 4.8, 780, 380, '10 min', true, true, NULL),
('chicken-burger', 'Chicken Burger', 'Burgers', 99.00, 'Juicy flame-grilled chicken patty, creamy herb mayo, melted cheese slice, and crisp lettuce on toasted bun.', false, 4.9, 1040, 460, '10 min', true, true, NULL),
('peri-peri-french-fries', 'Peri Peri French Fries', 'Fries & Sides', 69.00, 'Crispy golden potato fries tossed in our signature bold, smoky 12-spice African peri peri dust.', true, 4.9, 1350, 290, '10 min', true, true, NULL),
('plain-french-fries', 'Plain French Fries', 'Fries & Sides', 59.00, 'Classic golden salted fries cooked extra crisp and served hot.', true, 4.6, 480, 260, '10 min', false, true, NULL),
('veg-nuggets', 'Veg Nuggets', 'Fries & Sides', 59.00, 'Crispy golden vegetable bites packed with potatoes and corn, served with tomato dip.', true, 4.6, 260, 280, '10 min', false, true, NULL),
('peri-peri-veg-nuggets', 'Peri Peri Veg Nuggets', 'Fries & Sides', 69.00, 'Crunchy golden veg nuggets dusted with spicy and tangy peri peri spice mix.', true, 4.7, 230, 290, '10 min', false, true, NULL),
('chicken-nuggets', 'Chicken Nuggets', 'Fries & Sides', 79.00, 'Tender chicken bites encased in a crispy breadcrumb coating with house mayo.', false, 4.8, 490, 340, '10 min', true, true, NULL),
('peri-peri-chicken-nuggets', 'Peri Peri Chicken Nuggets', 'Fries & Sides', 89.00, 'Crispy chicken nuggets coated in fiery African peri-peri spices.', false, 4.9, 310, 360, '10 min', false, true, NULL),
('potato-smilies', 'Potato Smilies', 'Fries & Sides', 59.00, 'Fun, crispy potato faces with a fluffy mashed interior and crisp crust.', true, 4.7, 210, 270, '10 min', false, true, NULL),
('peri-peri-potato-smilies', 'Peri Peri Potato Smilies', 'Fries & Sides', 69.00, 'Classic potato smilies spiced with hot & zesty peri peri dust.', true, 4.8, 190, 280, '10 min', false, true, NULL),
('paneer-tikka-sandwich', 'Paneer Tikka Sandwich', 'Sandwiches', 99.00, 'Grilled sandwich filled with marinated cottage cheese, crunchy capsicum, and melted cheese.', true, 4.8, 510, 420, '10 min', true, true, NULL),
('cheese-sandwich', 'Cheese Sandwich', 'Sandwiches', 89.00, 'Double layered toasted sandwich with melted mozzarella, cheddar, and Italian seasoning.', true, 4.7, 430, 390, '10 min', false, true, NULL),
('chicken-tikka-sandwich', 'Chicken Tikka Sandwich', 'Sandwiches', 110.00, 'Spiced grilled chicken, mint sauce, and melted cheese toasted between sourdough slices.', false, 4.9, 620, 480, '10 min', true, true, NULL)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  veg = EXCLUDED.veg,
  rating = EXCLUDED.rating,
  review_count = EXCLUDED.review_count,
  calories = EXCLUDED.calories,
  prep_time = EXCLUDED.prep_time,
  bestseller = EXCLUDED.bestseller,
  available = EXCLUDED.available,
  special_offer_badge = EXCLUDED.special_offer_badge;

