-- ============================================
-- Caribean Homes Manager - Supabase Schema
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- https://supabase.com/dashboard/project/_/sql/new
-- ============================================

-- ============================================
-- 1. ROLES (must be created before users)
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  permissions TEXT[] DEFAULT '{}'
);

-- ============================================
-- 2. USERS (plain table, NO Supabase Auth)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  pin TEXT NOT NULL UNIQUE,
  role_id UUID REFERENCES roles(id) ON DELETE SET NULL
);

-- ============================================
-- 3. APARTMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS apartments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  description TEXT,
  image_url TEXT,
  price_per_night NUMERIC DEFAULT 0,
  bedrooms INT DEFAULT 1,
  bathrooms INT DEFAULT 1,
  amenities TEXT[] DEFAULT '{}',
  wifi_ssid TEXT,
  wifi_password TEXT,
  access_code TEXT,
  check_in_time TEXT,
  check_out_time TEXT,
  max_guests INT DEFAULT 2,
  house_rules TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. RECOMMENDATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  distance TEXT,
  image_url TEXT,
  map_url TEXT,
  phone_number TEXT
);

-- ============================================
-- 5. INVENTORY
-- ============================================
CREATE TABLE IF NOT EXISTS inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  total_quantity INT DEFAULT 0,
  min_threshold INT DEFAULT 5
);

-- ============================================
-- 6. CLEANING LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS cleaning_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL,
  cleaner_name TEXT NOT NULL,
  notes TEXT,
  items JSONB DEFAULT '[]',
  payment_status TEXT DEFAULT 'Pending'
);

-- ============================================
-- 7. CLEANING TEMPLATES
-- ============================================
CREATE TABLE IF NOT EXISTS cleaning_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE UNIQUE,
  rooms JSONB DEFAULT '[]'
);

-- ============================================
-- 8. MAINTENANCE
-- ============================================
CREATE TABLE IF NOT EXISTS maintenance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  apartment_id UUID REFERENCES apartments(id) ON DELETE SET NULL,
  area_id TEXT,
  area_name TEXT,
  last_maintenance_date TIMESTAMPTZ NOT NULL,
  frequency_days INT DEFAULT 90,
  notes TEXT,
  technician_contact TEXT
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS on all tables
ALTER TABLE apartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaning_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaning_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Permissive policies for anon role (full access)
-- These allow the frontend to read/write without authentication
CREATE POLICY "Allow all for anon" ON apartments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON recommendations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON inventory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON cleaning_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON cleaning_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON maintenance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON roles FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- INDEXES (for performance)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_recommendations_apartment_id ON recommendations(apartment_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_logs_apartment_id ON cleaning_logs(apartment_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_logs_date ON cleaning_logs(date);
CREATE INDEX IF NOT EXISTS idx_maintenance_apartment_id ON maintenance(apartment_id);
CREATE INDEX IF NOT EXISTS idx_users_pin ON users(pin);

-- ============================================
-- SEED DATA (optional - default admin role)
-- ============================================
INSERT INTO roles (name, permissions) VALUES
  ('Administrador', ARRAY['manage_apartments', 'manage_cleaning', 'perform_cleaning', 'manage_maintenance', 'manage_inventory', 'manage_settings']),
  ('Limpieza', ARRAY['perform_cleaning']),
  ('Mantenimiento', ARRAY['manage_maintenance'])
ON CONFLICT (name) DO NOTHING;
