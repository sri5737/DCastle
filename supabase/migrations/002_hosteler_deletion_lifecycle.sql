-- Migration: 002_hosteler_deletion_lifecycle
-- Adds deletion lifecycle metadata for hostelers and cancelation metadata for food preferences.
-- IDEMPOTENT: Safe to re-run across environments.

ALTER TABLE hostelers
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_from_status text,
  ADD COLUMN IF NOT EXISTS deletion_effective_date date;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'hostelers_status_check'
      AND conrelid = 'hostelers'::regclass
  ) THEN
    ALTER TABLE hostelers DROP CONSTRAINT hostelers_status_check;
  END IF;
END $$;

ALTER TABLE hostelers
  ADD CONSTRAINT hostelers_status_check
  CHECK (status IN ('pending', 'active', 'inactive', 'deleted'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'hostelers_deleted_from_status_check'
      AND conrelid = 'hostelers'::regclass
  ) THEN
    ALTER TABLE hostelers DROP CONSTRAINT hostelers_deleted_from_status_check;
  END IF;
END $$;

ALTER TABLE hostelers
  ADD CONSTRAINT hostelers_deleted_from_status_check
  CHECK (
    deleted_from_status IS NULL
    OR deleted_from_status IN ('pending', 'active')
  );

CREATE INDEX IF NOT EXISTS idx_hostelers_deleted_at ON hostelers(deleted_at);

ALTER TABLE food_preferences
  ADD COLUMN IF NOT EXISTS canceled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'food_preferences_cancellation_reason_check'
      AND conrelid = 'food_preferences'::regclass
  ) THEN
    ALTER TABLE food_preferences DROP CONSTRAINT food_preferences_cancellation_reason_check;
  END IF;
END $$;

ALTER TABLE food_preferences
  ADD CONSTRAINT food_preferences_cancellation_reason_check
  CHECK (
    cancellation_reason IS NULL
    OR cancellation_reason IN ('hosteler_deleted')
  );

CREATE INDEX IF NOT EXISTS idx_food_preferences_date_active
  ON food_preferences(date)
  WHERE canceled_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_food_preferences_canceled_at
  ON food_preferences(canceled_at);