-- Phase 20: Rate history tracking for room rent and meal rates with effective dates

-- Create room_rent_config_history table for tracking global room rent changes
CREATE TABLE IF NOT EXISTS room_rent_config_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sharing_capacity INT NOT NULL,
  room_class TEXT NOT NULL CHECK (room_class IN ('ac', 'non_ac')),
  old_rent DECIMAL(10, 2) NOT NULL,
  new_rent DECIMAL(10, 2) NOT NULL CHECK (new_rent > 0),
  effective_date DATE NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: one change per owner/sharing_capacity/room_class/effective_date combination
  UNIQUE(owner_id, sharing_capacity, room_class, effective_date)
);

-- Create meal_rate_rate_history table for tracking meal rate changes
CREATE TABLE IF NOT EXISTS meal_rate_rate_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
  old_rate DECIMAL(10, 2) NOT NULL,
  new_rate DECIMAL(10, 2) NOT NULL CHECK (new_rate > 0),
  effective_date DATE NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: one change per meal_type/effective_date combination (global, not per-owner)
  UNIQUE(meal_type, effective_date)
);

-- Indexes for efficient historical lookups
CREATE INDEX IF NOT EXISTS idx_room_rent_config_history_owner_sharing_room_class 
  ON room_rent_config_history(owner_id, sharing_capacity, room_class, effective_date DESC);

CREATE INDEX IF NOT EXISTS idx_room_rent_config_history_effective_date 
  ON room_rent_config_history(owner_id, effective_date DESC);

CREATE INDEX IF NOT EXISTS idx_meal_rate_history_meal_type_effective_date 
  ON meal_rate_rate_history(meal_type, effective_date DESC);

CREATE INDEX IF NOT EXISTS idx_meal_rate_history_effective_date 
  ON meal_rate_rate_history(effective_date DESC);

-- RLS Policies for room_rent_config_history
ALTER TABLE room_rent_config_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their own room rent config history"
  ON room_rent_config_history FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can insert their own room rent config history"
  ON room_rent_config_history FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Immutability: prevent updates and deletes
CREATE POLICY "Prevent updates to room rent config history"
  ON room_rent_config_history FOR UPDATE
  USING (false);

CREATE POLICY "Prevent deletes from room rent config history"
  ON room_rent_config_history FOR DELETE
  USING (false);

-- RLS Policies for meal_rate_rate_history (global, owner doesn't matter, but restrict to authenticated users)
ALTER TABLE meal_rate_rate_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view meal rate history"
  ON meal_rate_rate_history FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins/service role can insert meal rate history"
  ON meal_rate_rate_history FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Immutability: prevent updates and deletes
CREATE POLICY "Prevent updates to meal rate history"
  ON meal_rate_rate_history FOR UPDATE
  USING (false);

CREATE POLICY "Prevent deletes from meal rate history"
  ON meal_rate_rate_history FOR DELETE
  USING (false);
