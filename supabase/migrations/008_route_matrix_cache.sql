-- ============================================================
-- Lomond Appraisal Group — Route Matrix Cache
-- Migration: 008
-- ============================================================
-- Caches the drive-time/distance matrix computed by the Google
-- Routes API when a route is built, so manual reorders, locks, and
-- completions can recompute ETAs without re-calling the API.
-- Shape: { points: [{key, lat, lng}], seconds: [][], meters: [][] }
-- where key is 'start' or an appointment UUID.
-- Invalidated (recomputed) whenever the stop set changes.
-- ============================================================

ALTER TABLE public.daily_routes
  ADD COLUMN matrix_cache JSONB;
