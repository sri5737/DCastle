-- Seed data for DCastle PG Management

-- Default settings
INSERT INTO settings (key, value) VALUES
  ('deadline_time', '21:00')
ON CONFLICT (key) DO NOTHING;

-- Initial meal rates (effective from launch date)
INSERT INTO meal_rates (meal_type, rate, effective_from) VALUES
  ('breakfast', 40.00, '2026-07-01'),
  ('lunch', 40.00, '2026-07-01'),
  ('dinner', 40.00, '2026-07-01')
ON CONFLICT (meal_type, effective_from) DO NOTHING;
