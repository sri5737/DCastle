-- Phase 19: Room configuration history (effective-dated, immutable)

CREATE TABLE IF NOT EXISTS room_configuration_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  old_sharing_capacity int,
  new_sharing_capacity int NOT NULL CHECK (new_sharing_capacity >= 1),
  old_room_class text CHECK (old_room_class IN ('ac', 'non_ac')),
  new_room_class text NOT NULL CHECK (new_room_class IN ('ac', 'non_ac')),
  old_rent decimal(10, 2),
  new_rent decimal(10, 2) NOT NULL CHECK (new_rent > 0),
  effective_date date NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT room_configuration_history_room_effective_unique UNIQUE (room_id, effective_date)
);

CREATE INDEX IF NOT EXISTS idx_room_configuration_history_room_id
  ON room_configuration_history(room_id);

CREATE INDEX IF NOT EXISTS idx_room_configuration_history_effective_date
  ON room_configuration_history(effective_date);

CREATE INDEX IF NOT EXISTS idx_room_configuration_history_created_at
  ON room_configuration_history(created_at);

ALTER TABLE room_configuration_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "room_configuration_history_owner_select" ON room_configuration_history;
DROP POLICY IF EXISTS "room_configuration_history_owner_insert" ON room_configuration_history;
DROP POLICY IF EXISTS "room_configuration_history_owner_no_update" ON room_configuration_history;
DROP POLICY IF EXISTS "room_configuration_history_owner_no_delete" ON room_configuration_history;

CREATE POLICY "room_configuration_history_owner_select" ON room_configuration_history
  FOR SELECT
  USING (
    room_id IN (
      SELECT r.id
      FROM rooms r
      JOIN buildings b ON b.id = r.building_id
      WHERE b.owner_id = auth.uid()
    )
  );

CREATE POLICY "room_configuration_history_owner_insert" ON room_configuration_history
  FOR INSERT
  WITH CHECK (
    room_id IN (
      SELECT r.id
      FROM rooms r
      JOIN buildings b ON b.id = r.building_id
      WHERE b.owner_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Explicitly block updates/deletes to preserve immutable history.
CREATE POLICY "room_configuration_history_owner_no_update" ON room_configuration_history
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "room_configuration_history_owner_no_delete" ON room_configuration_history
  FOR DELETE
  USING (false);

GRANT SELECT, INSERT ON room_configuration_history TO authenticated;
