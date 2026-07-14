-- Migration: 009_add_monthly_bills_table
-- Phase 22: Two-phase billing (generate → transmit) and food preference adjustment tracking
-- IDEMPOTENT: Safe to re-run (uses IF NOT EXISTS / DROP IF EXISTS guards)

-- ============================================================
-- Replace legacy monthly_bills table with new two-phase billing schema
-- The original schema in 001_initial_schema.sql used month/year int columns.
-- Phase 22 replaces this with a date-keyed, status-driven schema.
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'monthly_bills'
      AND column_name = 'year'
      AND table_schema = 'public'
  ) THEN
    DROP TABLE IF EXISTS monthly_bills CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS monthly_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hosteler_id UUID NOT NULL REFERENCES hostelers(id) ON DELETE CASCADE,
  -- month stores the first day of the billing month (e.g. 2026-07-01)
  month DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'transmitted')),
  room_rent_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  -- meal_charges JSONB: { breakfast: number, lunch: number, dinner: number }
  meal_charges JSONB NOT NULL DEFAULT '{"breakfast": 0, "lunch": 0, "dinner": 0}'::jsonb,
  grand_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  transmitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT monthly_bills_hosteler_month_unique UNIQUE (hosteler_id, month)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_monthly_bills_hosteler_id ON monthly_bills(hosteler_id);
CREATE INDEX IF NOT EXISTS idx_monthly_bills_month ON monthly_bills(month DESC);
CREATE INDEX IF NOT EXISTS idx_monthly_bills_status ON monthly_bills(status);
CREATE INDEX IF NOT EXISTS idx_monthly_bills_hosteler_month ON monthly_bills(hosteler_id, month DESC);

-- ============================================================
-- RLS Policies for monthly_bills
-- ============================================================
ALTER TABLE monthly_bills ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Owners can view bills for their hostelers" ON monthly_bills;
DROP POLICY IF EXISTS "Hostelers can view their own transmitted bills" ON monthly_bills;
DROP POLICY IF EXISTS "Service role can manage all bills" ON monthly_bills;
DROP POLICY IF EXISTS "Owners can insert bills for their hostelers" ON monthly_bills;
DROP POLICY IF EXISTS "Owners can update bills for their hostelers" ON monthly_bills;
DROP POLICY IF EXISTS "Owners can delete generated bills for their hostelers" ON monthly_bills;

-- Owners can view all bills for hostelers in their buildings
CREATE POLICY "Owners can view bills for their hostelers"
  ON monthly_bills FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM hostelers h
      JOIN buildings b ON h.building_id = b.id
      WHERE h.id = monthly_bills.hosteler_id
        AND b.owner_id = auth.uid()
    )
  );

-- Hostelers can view only their own transmitted bills
CREATE POLICY "Hostelers can view their own transmitted bills"
  ON monthly_bills FOR SELECT
  USING (
    status = 'transmitted'
    AND EXISTS (
      SELECT 1 FROM hostelers h
      WHERE h.id = monthly_bills.hosteler_id
        AND h.auth_user_id = auth.uid()
    )
  );

-- Owners can insert bills for their hostelers (via service role in API)
CREATE POLICY "Owners can insert bills for their hostelers"
  ON monthly_bills FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hostelers h
      JOIN buildings b ON h.building_id = b.id
      WHERE h.id = monthly_bills.hosteler_id
        AND b.owner_id = auth.uid()
    )
  );

-- Owners can update bills (e.g. transmit: set status, transmitted_at)
CREATE POLICY "Owners can update bills for their hostelers"
  ON monthly_bills FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM hostelers h
      JOIN buildings b ON h.building_id = b.id
      WHERE h.id = monthly_bills.hosteler_id
        AND b.owner_id = auth.uid()
    )
  );

-- Owners can delete generated bills (for regeneration)
CREATE POLICY "Owners can delete generated bills for their hostelers"
  ON monthly_bills FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM hostelers h
      JOIN buildings b ON h.building_id = b.id
      WHERE h.id = monthly_bills.hosteler_id
        AND b.owner_id = auth.uid()
    )
  );

-- ============================================================
-- Food preference adjustment audit columns (T119a)
-- Allows owner to adjust current-month food entries with audit trail
-- ============================================================
ALTER TABLE food_preferences
  ADD COLUMN IF NOT EXISTS adjusted_by_owner_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS adjusted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS adjustment_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_food_preferences_adjusted_at
  ON food_preferences(adjusted_at) WHERE adjusted_at IS NOT NULL;
