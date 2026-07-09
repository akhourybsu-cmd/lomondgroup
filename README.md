# Lomond Appraisal Group — Platform

Professional vehicle appraisal services platform. Independent auto appraisals and vehicle valuation.

---

## Architecture Overview

### Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth |
| File Storage | Supabase Storage (private buckets) |
| Forms | React Hook Form + Zod |
| Future: Email | Resend |
| Future: Payments | Stripe |
| Future: PDF | @react-pdf/renderer or Puppeteer |

### Application Areas

```
/                         Public website
  /(public)/              Public layout (header + footer)
    /                     Home page
    /services             Services
    /about                About
    /faq                  FAQ
    /contact              Contact
    /request              Multi-step appraisal intake form
    /request/confirmation Post-submission confirmation
    /privacy              Privacy Policy
    /terms                Terms & Disclaimer

  /(admin)/               Admin layout (sidebar + header)
    /admin                Dashboard
    /admin/jobs           Job board
    /admin/jobs/[id]      Job detail
    /admin/settings       Settings

  /auth/                  Auth (no layout wrapper)
    /auth/login           Login page
    /auth/callback        Supabase auth callback

  /api/                   API routes
    /api/health           Health check
    /api/intake           Intake form submission (Phase 2)
    /api/webhooks/stripe  Stripe webhook (Phase 7)
```

### Route Groups

- `(public)` — public-facing with `PublicHeader` + `PublicFooter`
- `(admin)` — protected admin with `AdminSidebar` + `AdminHeader`
- `auth/` — auth pages, no layout wrapper (standalone centered UI)

---

## Directory Structure

```
src/
  app/
    (public)/           Public pages
    (admin)/            Admin pages (middleware-protected)
    auth/               Auth pages + callback
    api/                API routes
    layout.tsx          Root layout (font, metadata)
    globals.css         Brand tokens + Tailwind config
  components/
    ui/                 shadcn/ui primitives
    public/             PublicHeader, PublicFooter, PublicNav
    admin/              AdminSidebar, AdminHeader, StatCard, JobStatusBadge
    intake/             Intake form step components (Phase 2)
  lib/
    supabase/
      client.ts         Browser Supabase client
      server.ts         Server Supabase client (+ service client)
    types/
      index.ts          All TypeScript types for DB entities + UI helpers
    utils.ts            cn() utility
  middleware.ts         Route protection + session refresh
supabase/
  migrations/
    001_initial_schema.sql   All tables + triggers + indexes
    002_rls_policies.sql     Full RLS setup
    003_storage_buckets.sql  Private storage buckets
```

---

## Security Model

See [SECURITY.md](./SECURITY.md) for the full security checklist.

**Key principles:**
- **Deny by default** — RLS enabled on all private tables, no implicit access
- **Role from DB** — `get_my_role()` reads `profiles.role` on each request, not JWT claims
- **Private storage** — no public buckets, all files via server-generated signed URLs
- **Server-side validation** — all mutations validated with Zod in server actions/API routes
- **No secret key leakage** — `SUPABASE_SERVICE_ROLE_KEY` is server-only; never in `NEXT_PUBLIC_*`

### User Roles

| Role | Access |
|---|---|
| `owner_admin` | Full access to all data |
| `staff_appraiser` | Assigned jobs only; cannot see payments or all audit logs |
| `client` | Own jobs, client-visible notes, finalized reports (Phase 8) |
| `read_only_reviewer` | Read-only on assigned jobs |

---

## Database

### Tables

| Table | Purpose |
|---|---|
| `profiles` | Auth user roles + display info |
| `clients` | Customer contact records |
| `vehicles` | Vehicle records |
| `appraisal_jobs` | Central job record — hub for all related data |
| `uploaded_files` | File metadata (storage paths, not file contents) |
| `job_notes` | Internal + client-visible notes |
| `appraisal_reports` | Report drafts + finalized data |
| `market_comparables` | Comparable vehicle data for valuation |
| `payments` | Payment status + Stripe metadata |
| `audit_logs` | Immutable event trail |

### Job Status Workflow

```
new_request → contacted → documents_needed → inspection_scheduled
           → in_progress → report_drafted → sent_to_client
           → paid_closed

Optional: canceled | on_hold | awaiting_payment | declined | needs_owner_review
```

---

## Local Development

### Prerequisites

- Node.js 22+
- npm 11+
- A Supabase project (free tier works)

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local and fill in Supabase URL + keys

# Run migrations (requires Supabase CLI linked to project)
# supabase db push

# Start dev server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
