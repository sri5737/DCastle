-- Phase 19 delta: room type lifecycle controls and room-level cot reset support.

ALTER TABLE IF EXISTS room_types
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

UPDATE room_types
SET active = true
WHERE active IS NULL;

CREATE INDEX IF NOT EXISTS idx_room_types_owner_active ON room_types(owner_id, active);