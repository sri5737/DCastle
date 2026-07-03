-- Migration: 001_initial_schema
-- Creates all tables, indexes, constraints, and RLS policies for DCastle PG Management
-- IDEMPOTENT: Safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Table: hostelers
-- ============================================================
CREATE TABLE IF NOT EXISTS hostelers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL UNIQUE,
  room_number text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
  google_id text UNIQUE,
  pin_hash text,
  auth_user_id uuid UNIQUE REFERENCES auth.users(id),
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hostelers_phone ON hostelers(phone);
CREATE INDEX IF NOT EXISTS idx_hostelers_google_id ON hostelers(google_id);
CREATE INDEX IF NOT EXISTS idx_hostelers_status ON hostelers(status);
CREATE INDEX IF NOT EXISTS idx_hostelers_auth_user_id ON hostelers(auth_user_id);

-- ============================================================
-- Table: invite_tokens
-- ============================================================
CREATE TABLE IF NOT EXISTS invite_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hosteler_id uuid NOT NULL REFERENCES hostelers(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  used boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invite_tokens_token ON invite_tokens(token);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_hosteler_id ON invite_tokens(hosteler_id);

-- ============================================================
-- Table: food_preferences
-- ============================================================
CREATE TABLE IF NOT EXISTS food_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hosteler_id uuid NOT NULL REFERENCES hostelers(id) ON DELETE CASCADE,
  date date NOT NULL,
  breakfast boolean NOT NULL DEFAULT false,
  lunch boolean NOT NULL DEFAULT false,
  dinner boolean NOT NULL DEFAULT false,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hosteler_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_food_preferences_date ON food_preferences(date);

-- ============================================================
-- Table: meal_rates
-- ============================================================
CREATE TABLE IF NOT EXISTS meal_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_type text NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
  rate numeric(10,2) NOT NULL CHECK (rate > 0),
  effective_from date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (meal_type, effective_from)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_meal_rates_type_effective ON meal_rates(meal_type, effective_from DESC);

-- ============================================================
-- Table: monthly_bills
-- ============================================================
CREATE TABLE IF NOT EXISTS monthly_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hosteler_id uuid NOT NULL REFERENCES hostelers(id) ON DELETE CASCADE,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  year integer NOT NULL CHECK (year BETWEEN 2024 AND 2100),
  breakfast_count integer NOT NULL DEFAULT 0,
  lunch_count integer NOT NULL DEFAULT 0,
  dinner_count integer NOT NULL DEFAULT 0,
  breakfast_amount numeric(10,2) NOT NULL DEFAULT 0,
  lunch_amount numeric(10,2) NOT NULL DEFAULT 0,
  dinner_amount numeric(10,2) NOT NULL DEFAULT 0,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hosteler_id, month, year)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_monthly_bills_month_year ON monthly_bills(month, year);

-- ============================================================
-- Table: settings
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Enable Realtime for food_preferences
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'food_preferences'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE food_preferences;
  END IF;
END $$;

-- ============================================================
-- Row Level Security
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE hostelers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- hostelers policies
DROP POLICY IF EXISTS "hostelers_select_own" ON hostelers;
CREATE POLICY "hostelers_select_own" ON hostelers
  FOR SELECT TO authenticated
  USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "hostelers_select_owner" ON hostelers;
CREATE POLICY "hostelers_select_owner" ON hostelers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = current_setting('app.owner_email', true)
    )
  );

DROP POLICY IF EXISTS "hostelers_insert_owner" ON hostelers;
CREATE POLICY "hostelers_insert_owner" ON hostelers
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = current_setting('app.owner_email', true)
    )
  );

DROP POLICY IF EXISTS "hostelers_update_owner" ON hostelers;
CREATE POLICY "hostelers_update_owner" ON hostelers
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = current_setting('app.owner_email', true)
    )
  );

-- invite_tokens policies
DROP POLICY IF EXISTS "invite_tokens_select_public" ON invite_tokens;
CREATE POLICY "invite_tokens_select_public" ON invite_tokens
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "invite_tokens_insert_owner" ON invite_tokens;
CREATE POLICY "invite_tokens_insert_owner" ON invite_tokens
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = current_setting('app.owner_email', true)
    )
  );

DROP POLICY IF EXISTS "invite_tokens_update_authenticated" ON invite_tokens;
CREATE POLICY "invite_tokens_update_authenticated" ON invite_tokens
  FOR UPDATE TO authenticated
  USING (true);

-- food_preferences policies
DROP POLICY IF EXISTS "food_preferences_select_own" ON food_preferences;
CREATE POLICY "food_preferences_select_own" ON food_preferences
  FOR SELECT TO authenticated
  USING (
    hosteler_id IN (
      SELECT id FROM hostelers WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "food_preferences_select_owner" ON food_preferences;
CREATE POLICY "food_preferences_select_owner" ON food_preferences
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = current_setting('app.owner_email', true)
    )
  );

DROP POLICY IF EXISTS "food_preferences_insert_own" ON food_preferences;
CREATE POLICY "food_preferences_insert_own" ON food_preferences
  FOR INSERT TO authenticated
  WITH CHECK (
    hosteler_id IN (
      SELECT id FROM hostelers WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "food_preferences_update_own" ON food_preferences;
CREATE POLICY "food_preferences_update_own" ON food_preferences
  FOR UPDATE TO authenticated
  USING (
    hosteler_id IN (
      SELECT id FROM hostelers WHERE auth_user_id = auth.uid()
    )
  );

-- meal_rates policies
DROP POLICY IF EXISTS "meal_rates_select_authenticated" ON meal_rates;
CREATE POLICY "meal_rates_select_authenticated" ON meal_rates
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "meal_rates_insert_owner" ON meal_rates;
CREATE POLICY "meal_rates_insert_owner" ON meal_rates
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = current_setting('app.owner_email', true)
    )
  );

-- monthly_bills policies
DROP POLICY IF EXISTS "monthly_bills_select_own" ON monthly_bills;
CREATE POLICY "monthly_bills_select_own" ON monthly_bills
  FOR SELECT TO authenticated
  USING (
    hosteler_id IN (
      SELECT id FROM hostelers WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "monthly_bills_select_owner" ON monthly_bills;
CREATE POLICY "monthly_bills_select_owner" ON monthly_bills
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = current_setting('app.owner_email', true)
    )
  );

DROP POLICY IF EXISTS "monthly_bills_insert_owner" ON monthly_bills;
CREATE POLICY "monthly_bills_insert_owner" ON monthly_bills
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = current_setting('app.owner_email', true)
    )
  );

DROP POLICY IF EXISTS "monthly_bills_update_owner" ON monthly_bills;
CREATE POLICY "monthly_bills_update_owner" ON monthly_bills
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = current_setting('app.owner_email', true)
    )
  );

-- settings policies
DROP POLICY IF EXISTS "settings_select_authenticated" ON settings;
CREATE POLICY "settings_select_authenticated" ON settings
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "settings_update_owner" ON settings;
CREATE POLICY "settings_update_owner" ON settings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = current_setting('app.owner_email', true)
    )
  );

-- ============================================================
-- Updated_at trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
DROP TRIGGER IF EXISTS set_hostelers_updated_at ON hostelers;
CREATE TRIGGER set_hostelers_updated_at
  BEFORE UPDATE ON hostelers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_food_preferences_updated_at ON food_preferences;
CREATE TRIGGER set_food_preferences_updated_at
  BEFORE UPDATE ON food_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_settings_updated_at ON settings;
CREATE TRIGGER set_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
