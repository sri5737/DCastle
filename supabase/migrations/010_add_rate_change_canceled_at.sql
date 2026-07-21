-- Phase 22 (T119e): soft-cancel support for future scheduled rate changes
-- Add nullable canceled_at columns so cancel actions can mark a change as canceled without deleting history.

ALTER TABLE IF EXISTS meal_rate_rate_history
  ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE IF EXISTS room_rent_config_history
  ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_meal_rate_history_canceled_at
  ON meal_rate_rate_history(canceled_at);

CREATE INDEX IF NOT EXISTS idx_room_rent_config_history_canceled_at
  ON room_rent_config_history(canceled_at);
