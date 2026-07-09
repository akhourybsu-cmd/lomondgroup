# Security Checklist — Lomond Appraisal Group

This document tracks security decisions, requirements, and open items for the platform.
Review and update as the system evolves.

---

## Principles

1. **Deny by default** — no private data is accessible unless explicitly allowed
2. **Least privilege** — each role has the minimum access needed
3. **No frontend-only security** — UI restrictions are cosmetic; enforcement is at the database/server layer
4. **Secrets stay server-side** — no service keys, Stripe secrets, or email API keys in browser code
5. **Private files only** — no public storage buckets for customer data

---

## Authentication & Authorization

| Item | Status | Notes |
|---|---|---|
| Supabase Auth configured | Phase 3 | Email + password for admin |
| `middleware.ts` protects `/admin/*` | ✅ Done | Redirects unauthenticated to `/auth/login` |
| Role stored in `profiles.role` (DB, not JWT) | ✅ Done | `get_my_role()` function re-reads on each request |
| Role assignment admin-only | ✅ RLS | Only `owner_admin` can UPDATE profiles.role |
| Magic link for client portal | Phase 8 | Future |
| Session via `@supabase/ssr` (HTTP cookies) | ✅ Done | Server + browser clients configured |

---

## Row Level Security

| Table | RLS Enabled | Admin | Staff | Client | Public |
|---|---|---|---|---|---|
| profiles | ✅ | Full | Own only | Own only | ❌ |
| clients | ✅ | Full | Read | ❌ | ❌ |
| vehicles | ✅ | Full | Read | ❌ | ❌ |
| appraisal_jobs | ✅ | Full | Assigned only | Own (Phase 8) | ❌ |
| uploaded_files | ✅ | Full | Assigned only | ❌ | ❌ |
| job_notes | ✅ | Full | Assigned only | Client-visible (Phase 8) | ❌ |
| appraisal_reports | ✅ | Full | Assigned only | Finalized (Phase 8) | ❌ |
| market_comparables | ✅ | Full | Assigned only | ❌ | ❌ |
| payments | ✅ | Full | ❌ | ❌ | ❌ |
| audit_logs | ✅ | Read | Insert only | ❌ | ❌ |

---

## File Storage

| Item | Status | Notes |
|---|---|---|
| `job-files` bucket is private | ✅ Done | `public = FALSE` |
| `appraisal-reports` bucket is private | ✅ Done | `public = FALSE` |
| Files accessed via signed URLs only | Phase 4 | TTL: 60 minutes recommended |
| `storage_path` never sent to client | ✅ Planned | Server generates signed URL on demand |
| Allowed MIME types enforced at bucket level | ✅ Done | PDF, JPG, PNG, WEBP, HEIC |
| Max file size: 50 MB (job-files), 100 MB (reports) | ✅ Done | Enforced at bucket level |
| File metadata stored in `uploaded_files` table | ✅ Schema | Implemented in Phase 4 |
| File names sanitized | Phase 4 | Strip non-alphanumeric chars from display names |

---

## API & Server-Side

| Item | Status | Notes |
|---|---|---|
| Service role key is server-only | ✅ Done | Only in `lib/supabase/server.ts` (service client) |
| Intake form validated server-side (Zod) | Phase 2 | Client-side Zod + server action re-validation |
| Rate limiting on intake API | Phase 2 | Add rate limiting middleware on `/api/intake` |
| Honeypot field on intake form | Phase 2 | Hidden field to catch bot submissions |
| Stripe webhook signature verified | Phase 7 | `stripe.webhooks.constructEvent()` |
| Stripe secret key server-only | Phase 7 | Never in `NEXT_PUBLIC_*` vars |

---

## Sensitive Data

| Data Type | Protection |
|---|---|
| Customer PII (name, email, phone) | RLS + private DB, no public endpoints |
| VIN numbers | RLS, treated as sensitive |
| Insurance claim numbers | RLS, treated as sensitive |
| Uploaded documents | Private storage bucket + signed URLs |
| Appraisal reports | Private bucket + signed URLs |
| Internal notes | RLS blocks client access by visibility enum |
| Payment / Stripe data | Admin-only RLS on payments table |
| Audit logs | Insert-only for staff; admin-read only |

---

## Audit Logging

Events that must be logged:

- [ ] `job_created` — when intake is submitted
- [ ] `job_status_changed` — with `{ from, to }` in metadata
- [ ] `job_assigned` — when appraiser is assigned
- [ ] `file_uploaded` — with file ID and category
- [ ] `file_viewed` — when signed URL is generated
- [ ] `note_added` — with visibility level
- [ ] `report_generated` — when PDF is created
- [ ] `report_finalized` — when locked
- [ ] `report_sent` — when delivered to client
- [ ] `payment_updated` — with status change
- [ ] `user_role_changed` — with `{ from_role, to_role }`
- [ ] `failed_access_attempt` — when RLS rejects a suspicious request

---

## Open Security Items

- [ ] Add rate limiting to intake API route (Phase 2)
- [ ] Add honeypot to intake form (Phase 2)
- [ ] Implement signed URL generation for file access (Phase 4)
- [ ] Implement full audit log writes in server actions (Phase 5)
- [ ] Set up CSP headers in `next.config.ts` (Phase 1)
- [ ] Review and restrict CORS for API routes (Phase 2)
- [ ] Add input sanitization for file display names (Phase 4)
- [ ] Consider CAPTCHA on public intake form if spam becomes an issue
- [ ] Configure Supabase Auth email templates (before launch)
- [ ] Enable Supabase Auth MFA for admin accounts (before launch)
- [ ] Review Supabase project network restrictions (before launch)
- [ ] Set up Supabase Point-in-Time Recovery (before launch)

---

## Environment Variables

| Variable | Visibility | Used In |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public (browser) | Supabase client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (browser) | Supabase client — safe, RLS protects data |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | Service client — bypasses RLS, never expose |
| `NEXT_PUBLIC_SITE_URL` | Public | Metadata, canonical URLs |
| `RESEND_API_KEY` | **Server only** | Email sending (Phase 2+) |
| `STRIPE_SECRET_KEY` | **Server only** | Stripe API (Phase 7) |
| `STRIPE_WEBHOOK_SECRET` | **Server only** | Webhook verification (Phase 7) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Public | Stripe Elements (Phase 7) |

---

*Last reviewed: Phase 0 — update with each phase.*
