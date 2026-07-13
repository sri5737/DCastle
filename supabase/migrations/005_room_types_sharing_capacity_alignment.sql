-- Phase 19 delta: align room_types schema with sharing-capacity model
-- Fixes older environments that still use base_rent and owner+name uniqueness.

ALTER TABLE IF EXISTS room_types
  ADD COLUMN IF NOT EXISTS sharing_capacity integer;

-- Backfill sharing_capacity for existing rows.
-- Old schema used cot_count/base_rent; cot_count is the best available fallback.
UPDATE room_types
SET sharing_capacity = GREATEST(1, LEAST(10, COALESCE(sharing_capacity, cot_count, 1)))
WHERE sharing_capacity IS NULL;

ALTER TABLE IF EXISTS room_types
  ALTER COLUMN sharing_capacity SET DEFAULT 1;

ALTER TABLE IF EXISTS room_types
  ALTER COLUMN sharing_capacity SET NOT NULL;

-- Remove legacy uniqueness and replace with owner + name + sharing_capacity.
ALTER TABLE IF EXISTS room_types
  DROP CONSTRAINT IF EXISTS room_types_owner_name_unique;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'room_types_owner_name_sharing_capacity_unique'
      AND conrelid = 'room_types'::regclass
  ) THEN
    ALTER TABLE room_types
      ADD CONSTRAINT room_types_owner_name_sharing_capacity_unique
      UNIQUE (owner_id, name, sharing_capacity);
  END IF;
END
$$;

-- Remove legacy base_rent shape; room-level rent now lives on rooms/current_rent.
ALTER TABLE IF EXISTS room_types
  DROP CONSTRAINT IF EXISTS room_types_base_rent_positive;

ALTER TABLE IF EXISTS room_types
  DROP COLUMN IF EXISTS base_rent;

-- Ensure sharing_capacity range validation exists.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'room_types_sharing_capacity_positive'
      AND conrelid = 'room_types'::regclass
  ) THEN
    ALTER TABLE room_types
      ADD CONSTRAINT room_types_sharing_capacity_positive
      CHECK (sharing_capacity > 0 AND sharing_capacity <= 10);
  END IF;
END
$$;
