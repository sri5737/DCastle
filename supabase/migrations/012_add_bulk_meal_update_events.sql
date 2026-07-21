-- Migration: 012_add_bulk_meal_update_events
-- Purpose: Store owner bulk meal adjustment events for settings audit visibility

CREATE TABLE IF NOT EXISTS bulk_meal_update_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL CHECK (event_type IN ('full_closure', 'custom_availability')),
  scope TEXT NOT NULL CHECK (scope IN ('all_active', 'specific_building')),
  building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  date_mode TEXT NOT NULL CHECK (date_mode IN ('single_date', 'date_range')),
  start_date DATE NOT NULL,
  end_date DATE,
  meals JSONB NOT NULL,
  affected_hostelers INTEGER NOT NULL DEFAULT 0 CHECK (affected_hostelers >= 0),
  affected_date_rows INTEGER NOT NULL DEFAULT 0 CHECK (affected_date_rows >= 0),
  adjustment_reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bulk_meal_update_events_owner_created
  ON bulk_meal_update_events(owner_id, created_at DESC);

ALTER TABLE bulk_meal_update_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bulk_meal_update_events_owner_select" ON bulk_meal_update_events;
CREATE POLICY "bulk_meal_update_events_owner_select"
  ON bulk_meal_update_events FOR SELECT
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "bulk_meal_update_events_owner_insert" ON bulk_meal_update_events;
CREATE POLICY "bulk_meal_update_events_owner_insert"
  ON bulk_meal_update_events FOR INSERT
  WITH CHECK (owner_id = auth.uid() AND created_by = auth.uid());
