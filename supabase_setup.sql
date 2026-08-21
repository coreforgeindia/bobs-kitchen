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
-- =========================================================================
-- 9. INITIAL MENU ITEMS SEED DATA (All 7 Categories + Image Links)
-- =========================================================================
INSERT INTO menu_items (id, name, category, price, original_price, description, image, veg, contains_egg, rating, review_count, calories, prep_time, bestseller, available, special_offer_badge) VALUES
('paneer-tikka-snack-pack', 'Paneer Tikka Snack Pack', 'Fusion Snack Pack', 199.00, NULL, 'Crispy cottage cheese paneer tikka cubes served with signature dipping sauce & golden fries.', '/veg-snack-pack.jpg', true, false, 4.8, 482, 480, '15 min', true, true, 'OUR SIGNATURE'),
('chicken-tikka-snack-pack', 'Chicken Tikka Snack Pack', 'Fusion Snack Pack', 199.00, NULL, 'Smoky grilled chicken tikka bites, seasoned crispy fries, and house spicy mayo dip.', '/chicken-snack-pack.jpg', false, false, 4.9, 654, 590, '15 min', true, true, 'OUR SIGNATURE'),
('chicken-jalfrezi-snack-pack', 'Chicken Jalfrezi Snack Pack', 'Fusion Snack Pack', 199.00, NULL, 'Spiced chicken jalfrezi tossed with crunchy bell peppers, crispy potato wedges, and mint dip.', '/chicken-jalfrezi-snack-pack.png', false, false, 4.8, 390, 610, '15 min', true, true, 'CHEF SPECIAL'),
('crunchy-paneer-roll', 'Crunchy Paneer Wrap', 'Rolls', 149.00, 199.00, 'Crispy seasoned paneer cubes, crunchy fresh slaw, and smoky house sauce rolled in a warm paratha wrap.', '/crunchy_paneer_wrap.png', true, false, 4.7, 345, 390, '10 min', true, true, NULL),
('tawa-grilled-chicken-roll', 'Tawa Grilled Chicken Wrap', 'Rolls', 149.00, 199.00, 'Tawa-seared tender chicken strips, sauteed onions, and herbs rolled with a creamy tangy sauce.', '/tawa_grilled_chicken_wrap.png', false, false, 4.8, 420, 440, '10 min', true, true, NULL),
('chicken-jalfrezi-roll', 'Chicken Jalfrezi Wrap', 'Rolls', 149.00, 199.00, 'Spiced jalfrezi chicken, sweet peppers, and red onions rolled in a hot grilled wrap.', '/chicken_jalfrezi_wrap.png', false, false, 4.7, 290, 450, '10 min', true, true, NULL),
('veg-burger', 'Veg Burger', 'Burgers', 99.00, 139.00, 'Crispy spiced golden vegetable patty topped with fresh lettuce, juicy tomato, and signature secret burger sauce.', '/veg_burger.png', true, false, 4.8, 780, 380, '10 min', true, true, NULL),
('chicken-burger', 'Chicken Burger', 'Burgers', 109.00, 149.00, 'Juicy flame-grilled chicken patty, creamy herb mayo, melted cheese slice, and crisp lettuce on toasted bun.', '/chicken_burger.png', false, false, 4.9, 1040, 460, '10 min', true, true, NULL),
('peri-peri-french-fries', 'Peri Peri French Fries', 'Fries & Sides', 69.00, 99.00, 'Crispy golden potato fries tossed in our signature bold, smoky 12-spice African peri peri dust.', '/peri_peri_fries.png', true, false, 4.9, 1350, 290, '10 min', true, true, NULL),
('plain-french-fries', 'Plain French Fries', 'Fries & Sides', 59.00, 89.00, 'Classic golden salted fries cooked extra crisp and served hot.', 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?auto=format&fit=crop&w=800&q=80', true, false, 4.6, 480, 260, '10 min', false, true, NULL),
('veg-nuggets', 'Veg Nuggets', 'Fries & Sides', 59.00, 89.00, 'Crispy golden vegetable bites packed with potatoes and corn, served with tomato dip.', 'https://images.unsplash.com/photo-1562967916-eb82221dfb92?auto=format&fit=crop&w=800&q=80', true, false, 4.6, 260, 280, '10 min', false, true, NULL),
('peri-peri-veg-nuggets', 'Peri Peri Veg Nuggets', 'Fries & Sides', 69.00, 99.00, 'Crunchy golden veg nuggets dusted with spicy and tangy peri peri spice mix.', 'https://images.unsplash.com/photo-1562967916-eb82221dfb92?auto=format&fit=crop&w=800&q=80', true, false, 4.7, 230, 290, '10 min', false, true, NULL),
('chicken-nuggets', 'Chicken Nuggets', 'Fries & Sides', 59.00, 89.00, 'Tender chicken bites encased in a crispy breadcrumb coating with house mayo.', 'https://images.unsplash.com/photo-1562967916-eb82221dfb92?auto=format&fit=crop&w=800&q=80', false, false, 4.8, 490, 340, '10 min', true, true, NULL),
('peri-peri-chicken-nuggets', 'Peri Peri Chicken Nuggets', 'Fries & Sides', 69.00, 99.00, 'Crispy chicken nuggets coated in fiery African peri-peri spices.', 'https://images.unsplash.com/photo-1562967916-eb82221dfb92?auto=format&fit=crop&w=800&q=80', false, false, 4.9, 310, 360, '10 min', false, true, NULL),
('potato-smilies', 'Plain Smilies', 'Fries & Sides', 79.00, 109.00, 'Fun, crispy potato faces with a fluffy mashed interior and crisp crust.', 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80', true, false, 4.7, 210, 270, '10 min', false, true, NULL),
('peri-peri-potato-smilies', 'Peri Peri Smilies', 'Fries & Sides', 89.00, 119.00, 'Classic potato smilies spiced with hot & zesty peri peri dust.', 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80', true, false, 4.8, 190, 280, '10 min', false, true, NULL),
('paneer-tikka-sandwich', 'Paneer Tikka Sandwich', 'Sandwiches', 99.00, 139.00, 'Grilled sandwich filled with marinated cottage cheese, crunchy capsicum, and melted cheese.', '/paneer_tikka_sandwich.png', true, false, 4.8, 510, 420, '10 min', true, true, NULL),
('cheese-sandwich', 'Cheese Sandwich', 'Sandwiches', 79.00, 99.00, 'Double layered toasted sandwich with melted mozzarella, cheddar, and Italian seasoning.', '/cheese_sandwich.png', true, false, 4.7, 430, 390, '10 min', false, true, NULL),
('chicken-tikka-sandwich', 'Chicken Tikka Sandwich', 'Sandwiches', 99.00, 139.00, 'Spiced grilled chicken, mint sauce, and melted cheese toasted between sourdough slices.', '/chicken_tikka_sandwich.png', false, false, 4.9, 620, 480, '10 min', true, true, NULL),
('chicken-jalfrezi-sandwich', 'Chicken Jalfrezi Sandwich', 'Sandwiches', 99.00, 139.00, 'Tangy and spiced chicken jalfrezi tossed with peppers in a crispy grilled sandwich.', '/chicken_jalfrezi_sandwich.png', false, false, 4.7, 380, 420, '10 min', false, true, NULL),
('tiramisu-cup', 'Tiramisu Cup', 'Desserts', 199.00, 239.00, 'Silky mascarpone cream layered with espresso-soaked ladyfingers and dusted with rich Dutch cocoa.', 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=800&q=80', false, true, 4.9, 610, 310, '5 min', true, true, NULL),
('brownie-with-ice-cream', 'Brownie', 'Desserts', 99.00, 149.00, 'Warm, gooey chocolate fudge brownie topped with a chilled scoop of vanilla ice cream and chocolate drizzle.', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80', false, true, 4.9, 780, 420, '5 min', true, true, NULL),
('water-500ml', 'Water Bottle – 500 ml', 'Beverages', 10.00, NULL, 'Pure packaged mineral water 500 ml chilled.', 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=800&q=80', true, false, 4.5, 150, 0, '1 min', false, true, NULL),
('water-1l', 'Water Bottle – 1 L', 'Beverages', 20.00, NULL, 'Pure packaged mineral water 1 Litre chilled.', 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=800&q=80', true, false, 4.5, 220, 0, '1 min', false, true, NULL),
('thums-up', 'Thums Up', 'Beverages', 20.00, NULL, 'Charged ice-cold Thums Up can/bottle (250ml).', 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80', true, false, 4.8, 920, 120, '1 min', false, true, NULL),
('sprite', 'Sprite', 'Beverages', 20.00, NULL, 'Crisp refreshing lemon-lime Sprite soda.', 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?auto=format&fit=crop&w=800&q=80', true, false, 4.7, 490, 110, '1 min', false, true, NULL),
('mirinda', 'Mirinda', 'Beverages', 20.00, NULL, 'Sweet fizzy orange fruit flavored soda.', 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=800&q=80', true, false, 4.6, 310, 130, '1 min', false, true, NULL),
('coca-cola', 'Coca-Cola', 'Beverages', 20.00, NULL, 'Classic ice-cold fizzy Coca-Cola.', 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80', true, false, 4.8, 880, 120, '1 min', false, true, NULL),
('pepsi', 'Pepsi', 'Beverages', 20.00, NULL, 'Chilled bold Pepsi cola refreshment.', 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80', true, false, 4.7, 430, 120, '1 min', false, true, NULL),
('fanta', 'Fanta', 'Beverages', 20.00, NULL, 'Tangy sparkling orange drink.', 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=800&q=80', true, false, 4.6, 290, 120, '1 min', false, true, NULL)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  price = EXCLUDED.price,
  original_price = EXCLUDED.original_price,
  description = EXCLUDED.description,
  image = EXCLUDED.image,
  veg = EXCLUDED.veg,
  contains_egg = EXCLUDED.contains_egg,
  rating = EXCLUDED.rating,
  review_count = EXCLUDED.review_count,
  calories = EXCLUDED.calories,
  prep_time = EXCLUDED.prep_time,
  bestseller = EXCLUDED.bestseller,
  available = EXCLUDED.available,
  special_offer_badge = EXCLUDED.special_offer_badge;

-- =========================================================================
-- 10. PRODUCTION CLEANUP SCRIPT (Clear all test orders & reset order sequence to #BSK001)
-- =========================================================================
TRUNCATE TABLE orders CASCADE;
TRUNCATE TABLE pp_sms_data CASCADE;
ALTER SEQUENCE order_number_seq RESTART WITH 1;


