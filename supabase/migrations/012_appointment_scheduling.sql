-- ============================================================
-- Lomond Appraisal Group — Route-First Scheduling
-- Migration: 012
-- ============================================================
-- New appointment statuses for the route-first workflow:
--   needs_review → scheduled → routed → booked → in_progress → completed
-- 'scheduled' = assigned to a day + address verified (route-ready, no
-- time). 'booked' = time set with the customer (after routing).
-- The legacy 'confirmed' value stays in the enum and is treated as
-- 'scheduled' by the app.
--
-- NOTE: enum ADD VALUE cannot be used in the same transaction it's
-- created in, so this migration only adds the values — no data update
-- is needed (the app treats 'confirmed' as routable/legacy).
-- ============================================================

ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'scheduled';
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'booked';

ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'appointment_scheduled';
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'appointment_booked';
