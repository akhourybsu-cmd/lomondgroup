@AGENTS.md

# Lomond Appraisal Group — Platform Context

## Project

Professional vehicle appraisal business platform. Two audiences:
1. **Public customers** — requesting appraisals via the web
2. **Admin (owner + staff)** — managing jobs through a full dashboard

This is a real production platform. Treat it accordingly: security-first, no fake data, no overbuild.

## Stack

- Next.js 16, App Router, TypeScript
- Tailwind CSS v4 + shadcn/ui
- Supabase (Postgres + Auth + Storage)
- React Hook Form + Zod
- Future: Stripe, Resend, PDF generation

## Route Groups

- `(public)` — header + footer, public visitors
- `(admin)` — sidebar + header, protected by middleware
- `auth/` — standalone auth pages (no layout)

## Key Files

- `src/lib/types/index.ts` — all TypeScript types + enums + status config
- `src/lib/supabase/client.ts` — browser Supabase client
- `src/lib/supabase/server.ts` — server Supabase client + service client
- `src/proxy.ts` — route protection (/admin/* requires auth) — Next.js 16 calls this "proxy" not "middleware"
- `supabase/migrations/001_initial_schema.sql` — full DB schema
- `supabase/migrations/002_rls_policies.sql` — all RLS policies
- `supabase/migrations/003_storage_buckets.sql` — private storage
- `SECURITY.md` — security checklist and decisions

## Brand

- Primary: Brand Navy `#1B3A5C` (oklch(0.290 0.073 258))
- Accent: Brand Gold `#C9A84C` (oklch(0.730 0.118 77))
- Feel: Professional services firm, NOT a car dealership
- Admin sidebar uses navy background with gold active states

## Design Principles

- Public site: mobile-excellent, desktop-premium
- Admin dashboard: desktop-first spacious layout, still mobile-usable
- No fake testimonials, certifications, or stats
- No placeholder lorem ipsum content on customer-facing pages

## Security Rules

- NEVER put `SUPABASE_SERVICE_ROLE_KEY` in `NEXT_PUBLIC_*` env vars
- NEVER use the service client in Client Components
- ALL private data access goes through RLS — no frontend-only gates
- File `storage_path` values are NEVER sent to the browser — generate signed URLs server-side
- Internal notes (visibility = 'internal') must NEVER be readable by clients

## Operations Module (appointments + routing)

Contractor assignment intake (PDF upload → AI-assisted extraction → human
review) + appointment management + daily route optimization. Lives under
`(admin)` alongside jobs; appraisal *jobs* and field *appointments* are
separate entities.

- Migrations 005–008: ops schema, ops RLS, `assignment-pdfs` bucket, route matrix_cache
- `src/lib/types/ops.ts` — ops types + status configs + VALID_APPOINTMENT_TRANSITIONS (re-exported from types/index.ts)
- `src/lib/ops/` modules:
  - `appointments/validation.ts` (getRoutabilityIssues — the single routability gate), `appointments/duplicates.ts`
  - `format.ts` (DATE/TIME formatting — never `new Date("YYYY-MM-DD")`, it shifts a day)
  - `pdf/extractText.ts` (unpdf; scanned PDFs fail gracefully — OCR is a future seam)
  - `pdf/parseAppointments.ts` (Anthropic SDK, model claude-opus-4-8, structured outputs via output_config.format)
  - `geocoding/google.ts` (Geocoding API; success/ambiguous/failed)
  - `routing/` — matrix.ts (Routes API computeRouteMatrix), optimize.ts (NN + 2-opt; locked/completed fixed — pure), schedule.ts (ETAs/conflicts — pure), insertion.ts (best-insertion — pure), engine.ts (recomputeRoute: fetch → matrix (cached in daily_routes.matrix_cache) → optimize → schedule → persist)
- `src/app/actions/ops/` — saveContractor, saveAppointment, updateAppointmentStatus (auto-geocodes on confirm), uploadAssignmentPdfs, processPdfUpload, getPdfSignedUrl, geocodeAppointment, generateRoute, routeStopAction, reoptimizeRoute, routeInsertion (suggest + apply)
- Pages: /admin/uploads (+[id]), /admin/appointments (+new, [id], [id]/edit), /admin/calendar (+[date]), /admin/routes (+[date]), /admin/contractors (+new, [id]); dashboard has a Field Operations tile row
- Components in `src/components/ops/`
- Base UI gotcha: link-styled buttons use `<Button render={<Link …/>} nativeButton={false}>`, NOT Radix `asChild`
- Turbopack gotcha: new route directories sometimes 404 until `.next` is deleted and dev restarted
- Providers: Google Maps Platform (Geocoding + Routes API), Anthropic API for extraction — keys server-only

Core rules: extraction is never auto-confirmed (drafts start `needs_review`);
original PDFs + raw text + raw AI output always preserved; only confirmed +
geocoded appointments are routable; locked/completed stops never move;
new appointments suggest insertion, never silently reshuffle a route.

## Phases

- Phase 0 ✅ Foundation
- Phase 1 ✅ Full public website content (Services, About, FAQ, Contact, Privacy, Terms)
- Phase 2 ✅ Multi-step intake form + server action
- Phase 3: Admin auth + job board + job detail
- Phase 4: File upload + private storage + signed URLs
- Phase 5: Notes, status workflow, audit logging
- Phase 6: Report builder + PDF
- Phase 7: Stripe payments
- Phase 8: Client portal

## Phase 2 notes

- `src/components/intake/` — all form step components + schemas
- `src/app/actions/submitIntake.ts` — server action (uses service client, bypasses RLS)
- `submitIntake` gracefully no-ops (redirects anyway) when Supabase env vars absent
- Zod v4 API changes: use `{ error: "..." }` or `{ message: "..." }`, NOT `errorMap` or `invalid_type_error`
- RHF + Zod resolver type mismatch: avoid `z.preprocess()` and `.default()` in schemas used with useForm — they split input/output types and break the Resolver generic. Use `setValueAs` in register options for numeric conversions instead.
- Boolean toggle groups (is_drivable, vehicle_repaired etc): call `setValue(name, true/false/null)` directly; no string→boolean preprocess needed
- Base UI Accordion: `multiple={false}` (not Radix's `type="single" collapsible`)
