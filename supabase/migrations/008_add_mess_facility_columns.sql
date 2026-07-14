-- Migration: 008_add_mess_facility_columns
-- Adds mess facility assignment and auto-submission tracking for Phase 21
-- IDEMPOTENT: Safe to re-run (uses IF NOT EXISTS / ALTER TABLE ... ADD COLUMN IF NOT EXISTS)

-- ============================================================
-- Add availing_mess column to hostelers table
-- ============================================================
ALTER TABLE IF EXISTS hostelers
ADD COLUMN IF NOT EXISTS availing_mess boolean NOT NULL DEFAULT true;

-- Index for efficient blocking and query filtering
CREATE INDEX IF NOT EXISTS idx_hostelers_availing_mess ON hostelers(availing_mess);

-- ============================================================
-- Add is_auto_submitted column to food_preferences table
-- ============================================================
ALTER TABLE IF EXISTS food_preferences
ADD COLUMN IF NOT EXISTS is_auto_submitted boolean NOT NULL DEFAULT false;

-- Index for efficient billing queries and auto-submission status checks
CREATE INDEX IF NOT EXISTS idx_food_preferences_is_auto_submitted ON food_preferences(is_auto_submitted);

-- ============================================================
-- Add submitted_by column to track submission source (system for auto-submit, null/owner for manual)
-- ============================================================
ALTER TABLE IF EXISTS food_preferences
ADD COLUMN IF NOT EXISTS submitted_by text;

-- Ensure RLS remains enabled (idempotent check)
ALTER TABLE hostelers ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_preferences ENABLE ROW LEVEL SECURITY;
