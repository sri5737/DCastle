-- Migration: 011_add_monthly_bills_needs_retransmission_status
-- Purpose: Allow bill status transition after owner food adjustments on transmitted bills

DO $$
DECLARE
  status_check RECORD;
BEGIN
  FOR status_check IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'monthly_bills'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%status IN (%'
  LOOP
    EXECUTE format('ALTER TABLE public.monthly_bills DROP CONSTRAINT IF EXISTS %I', status_check.conname);
  END LOOP;
END $$;

ALTER TABLE IF EXISTS public.monthly_bills
  DROP CONSTRAINT IF EXISTS monthly_bills_status_check;

ALTER TABLE IF EXISTS monthly_bills
  ADD CONSTRAINT monthly_bills_status_check
  CHECK (status IN ('generated', 'transmitted', 'needs_retransmission'));
