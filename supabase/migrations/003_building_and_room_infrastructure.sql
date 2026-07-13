-- Phase 19: Building and Room Infrastructure
-- Creates tables for multi-building, multi-room, multi-cot inventory management

-- Buildings table: Owner can have multiple buildings
CREATE TABLE IF NOT EXISTS buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT buildings_owner_name_unique UNIQUE (owner_id, name),
  CONSTRAINT buildings_name_min_length CHECK (char_length(name) >= 1 AND char_length(name) <= 255)
);

-- Room Types: Owner can define multiple room configurations
CREATE TABLE IF NOT EXISTS room_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  base_rent decimal(10, 2) NOT NULL,
  cot_count int NOT NULL DEFAULT 1,
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT room_types_owner_name_unique UNIQUE (owner_id, name),
  CONSTRAINT room_types_name_min_length CHECK (char_length(name) >= 1 AND char_length(name) <= 255),
  CONSTRAINT room_types_base_rent_positive CHECK (base_rent > 0),
  CONSTRAINT room_types_cot_count_positive CHECK (cot_count > 0 AND cot_count <= 10)
);

-- Rooms: Multiple rooms per building with floor and type
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  room_number text NOT NULL,
  floor text CHECK (floor IN ('ground', 'first', 'second', NULL)) DEFAULT NULL,
  room_type_id uuid NOT NULL REFERENCES room_types(id) ON DELETE RESTRICT,
  current_rent decimal(10, 2) NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT rooms_building_room_number_unique UNIQUE (building_id, room_number),
  CONSTRAINT rooms_room_number_min_length CHECK (char_length(room_number) >= 1 AND char_length(room_number) <= 50),
  CONSTRAINT rooms_current_rent_positive CHECK (current_rent > 0)
);

-- Cots: Individual cots within rooms with assignment to hostelers
CREATE TABLE IF NOT EXISTS cots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  cot_id_label text NOT NULL,
  cot_type text NOT NULL CHECK (cot_type IN ('lower_cot', 'upper_cot')),
  hosteler_id uuid REFERENCES hostelers(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT cots_room_label_unique UNIQUE (room_id, cot_id_label),
  CONSTRAINT cots_label_min_length CHECK (char_length(cot_id_label) >= 1 AND char_length(cot_id_label) <= 50)
);

-- Hosteler Room Assignments: Track current room/cot assignment for each hosteler
CREATE TABLE IF NOT EXISTS hosteler_room_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hosteler_id uuid NOT NULL UNIQUE REFERENCES hostelers(id) ON DELETE CASCADE,
  building_id uuid NOT NULL REFERENCES buildings(id),
  room_id uuid NOT NULL REFERENCES rooms(id),
  cot_id uuid NOT NULL REFERENCES cots(id),
  assigned_at timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add columns to hostelers table to support room/cot assignment (redundant but for query efficiency)
ALTER TABLE hostelers ADD COLUMN IF NOT EXISTS building_id uuid REFERENCES buildings(id) ON DELETE SET NULL;
ALTER TABLE hostelers ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES rooms(id) ON DELETE SET NULL;
ALTER TABLE hostelers ADD COLUMN IF NOT EXISTS cot_id uuid REFERENCES cots(id) ON DELETE SET NULL;

-- Indexes for frequently-queried columns
CREATE INDEX IF NOT EXISTS idx_buildings_owner_id ON buildings(owner_id);
CREATE INDEX IF NOT EXISTS idx_room_types_owner_id ON room_types(owner_id);
CREATE INDEX IF NOT EXISTS idx_rooms_building_id ON rooms(building_id);
CREATE INDEX IF NOT EXISTS idx_rooms_room_type_id ON rooms(room_type_id);
CREATE INDEX IF NOT EXISTS idx_cots_room_id ON cots(room_id);
CREATE INDEX IF NOT EXISTS idx_cots_hosteler_id ON cots(hosteler_id);
CREATE INDEX IF NOT EXISTS idx_hosteler_room_assignments_hosteler_id ON hosteler_room_assignments(hosteler_id);
CREATE INDEX IF NOT EXISTS idx_hosteler_room_assignments_building_id ON hosteler_room_assignments(building_id);
CREATE INDEX IF NOT EXISTS idx_hosteler_room_assignments_room_id ON hosteler_room_assignments(room_id);
CREATE INDEX IF NOT EXISTS idx_hostelers_building_id ON hostelers(building_id);
CREATE INDEX IF NOT EXISTS idx_hostelers_room_id ON hostelers(room_id);
CREATE INDEX IF NOT EXISTS idx_hostelers_cot_id ON hostelers(cot_id);

-- Row Level Security Policies

-- Buildings: Owners can only see/modify their own buildings
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "buildings_owner_access" ON buildings;

CREATE POLICY "buildings_owner_access" ON buildings
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Room Types: Owners can only see/modify their own room types
ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "room_types_owner_access" ON room_types;

CREATE POLICY "room_types_owner_access" ON room_types
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Rooms: Owners can only see/modify rooms in their own buildings
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rooms_owner_access" ON rooms;

CREATE POLICY "rooms_owner_access" ON rooms
  USING (
    building_id IN (
      SELECT id FROM buildings WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    building_id IN (
      SELECT id FROM buildings WHERE owner_id = auth.uid()
    )
  );

-- Cots: Owners can only see/modify cots in their own buildings
ALTER TABLE cots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cots_owner_access" ON cots;

CREATE POLICY "cots_owner_access" ON cots
  USING (
    room_id IN (
      SELECT r.id FROM rooms r
      JOIN buildings b ON r.building_id = b.id
      WHERE b.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    room_id IN (
      SELECT r.id FROM rooms r
      JOIN buildings b ON r.building_id = b.id
      WHERE b.owner_id = auth.uid()
    )
  );

-- Hosteler Room Assignments: Owners can only see/modify assignments in their own buildings
ALTER TABLE hosteler_room_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hosteler_room_assignments_owner_access" ON hosteler_room_assignments;

CREATE POLICY "hosteler_room_assignments_owner_access" ON hosteler_room_assignments
  USING (
    building_id IN (
      SELECT id FROM buildings WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    building_id IN (
      SELECT id FROM buildings WHERE owner_id = auth.uid()
    )
  );

-- Grant necessary permissions to authenticated users (owners)
GRANT SELECT, INSERT, UPDATE, DELETE ON buildings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON room_types TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON hosteler_room_assignments TO authenticated;
