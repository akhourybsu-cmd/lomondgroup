-- ============================================================
-- Lomond Appraisal Group — Operations Module RLS Policies
-- Migration: 006
-- ============================================================
-- Same principle as 002: deny by default. Clients have NO access
-- to any operations table — these contain other customers' PII,
-- claim numbers, and route data.
--
-- Access model:
--   owner_admin      → full access to everything
--   staff_appraiser  → read all ops data; update appointments and
--                      route stops (field workflow: complete, note)
--   read_only_reviewer → read only
--   client           → nothing
-- ============================================================

ALTER TABLE public.contractors                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_uploads                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_routes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_stops                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_adjustment_suggestions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CONTRACTORS
-- ============================================================

CREATE POLICY "contractors: admin full access"
  ON public.contractors FOR ALL
  USING (get_my_role() = 'owner_admin');

CREATE POLICY "contractors: staff read"
  ON public.contractors FOR SELECT
  USING (get_my_role() IN ('staff_appraiser', 'read_only_reviewer'));

-- ============================================================
-- PDF UPLOADS
-- ============================================================

CREATE POLICY "pdf_uploads: admin full access"
  ON public.pdf_uploads FOR ALL
  USING (get_my_role() = 'owner_admin');

CREATE POLICY "pdf_uploads: staff read"
  ON public.pdf_uploads FOR SELECT
  USING (get_my_role() IN ('staff_appraiser', 'read_only_reviewer'));

-- ============================================================
-- APPOINTMENTS
-- ============================================================

CREATE POLICY "appointments: admin full access"
  ON public.appointments FOR ALL
  USING (get_my_role() = 'owner_admin');

CREATE POLICY "appointments: staff read"
  ON public.appointments FOR SELECT
  USING (get_my_role() IN ('staff_appraiser', 'read_only_reviewer'));

-- Staff can update appointments (field statuses, notes) but not create/delete
CREATE POLICY "appointments: staff update"
  ON public.appointments FOR UPDATE
  USING (get_my_role() = 'staff_appraiser');

-- ============================================================
-- DAILY ROUTES
-- ============================================================

CREATE POLICY "daily_routes: admin full access"
  ON public.daily_routes FOR ALL
  USING (get_my_role() = 'owner_admin');

CREATE POLICY "daily_routes: staff read"
  ON public.daily_routes FOR SELECT
  USING (get_my_role() IN ('staff_appraiser', 'read_only_reviewer'));

-- ============================================================
-- ROUTE STOPS
-- ============================================================

CREATE POLICY "route_stops: admin full access"
  ON public.route_stops FOR ALL
  USING (get_my_role() = 'owner_admin');

CREATE POLICY "route_stops: staff read"
  ON public.route_stops FOR SELECT
  USING (get_my_role() IN ('staff_appraiser', 'read_only_reviewer'));

-- Staff can mark stops completed/skipped and add route notes in the field
CREATE POLICY "route_stops: staff update"
  ON public.route_stops FOR UPDATE
  USING (get_my_role() = 'staff_appraiser');

-- ============================================================
-- ROUTE ADJUSTMENT SUGGESTIONS
-- ============================================================

CREATE POLICY "route_adjustment_suggestions: admin full access"
  ON public.route_adjustment_suggestions FOR ALL
  USING (get_my_role() = 'owner_admin');

CREATE POLICY "route_adjustment_suggestions: staff read"
  ON public.route_adjustment_suggestions FOR SELECT
  USING (get_my_role() IN ('staff_appraiser', 'read_only_reviewer'));
