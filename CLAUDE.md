# SocialNxt Studio — Project Context

All-in-one CRM + social media management platform for agencies/freelancers: clients, deal
pipeline, content calendar/approvals, tasks, meetings, proposals, quotations, issue tracking,
team RBAC, reports, activity logs.

## Stack (actual, verified from code — not from README)

- **Plain Vite + React 19 SPA**, client-side routed with **react-router-dom v7**
  (`BrowserRouter` in `src/main.tsx`, all routes declared in `src/app-router.tsx`).
  - ⚠️ `README.md` and `src/routes/README.md` describe **TanStack Start/Router file-based
    routing** (`routeTree.gen.ts`, `__root.tsx`, etc.) — that is **stale/aspirational**, not
    what's implemented. `src/routes/*.tsx` are just plain page components imported and wired
    manually into `<Routes>` in `app-router.tsx`. Don't assume TanStack Router conventions apply.
  - `@tanstack/react-query` **is** actually used, for server-state/data fetching.
- **Styling:** Tailwind CSS v4 + Radix UI primitives in shadcn/ui pattern (`src/components/ui/`,
  46 components: dialog, table, sidebar, chart, form, etc.)
- **Backend:** Supabase (Postgres + RLS + Storage + Edge Functions), client in `src/lib/supabase.ts`,
  reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` from env (no `.env` committed — gitignored).
- **Forms:** react-hook-form + zod. **Charts:** Recharts. **Toasts:** sonner. **PDF:** jspdf +
  html2canvas (proposals/invoices). **Excel:** exceljs + custom `src/utils/importExcel.ts` /
  `exportExcel.ts`.
- **Package manager:** npm (`package-lock.json` present) though `bunfig.toml` also exists.

## Directory map

```
socialnxt/
├── src/
│   ├── main.tsx              # app entry: QueryClientProvider > AuthProvider > BrowserRouter
│   ├── app-router.tsx        # ALL routes + auth/workspace guards (RequireAuth, RequireWorkspace,
│   │                         #   OnboardingGate, PublicOnly) live here
│   ├── routes/                # one page component per route (NOT file-based routing, see above)
│   │   ├── index.tsx          → "/" Dashboard
│   │   ├── login.tsx          → "/login"
│   │   ├── onboarding.tsx     → "/onboarding" (create/join workspace)
│   │   ├── clients.tsx, clients_.$clientId.tsx → "/clients", "/clients/:clientId"
│   │   ├── tasks.tsx           → "/tasks" (content sheet)
│   │   ├── calendar.tsx        → "/calendar"
│   │   ├── media.tsx           → "/media" (media library)
│   │   ├── meetings.tsx        → "/meetings"
│   │   ├── deals.tsx           → "/deals" (project tracker / pipeline)
│   │   ├── proposals.tsx       → "/proposals" (PDF export)
│   │   ├── quotations.tsx      → "/quotations" (GST line items)
│   │   ├── issues.tsx          → "/issues" (support tickets)
│   │   ├── reports.tsx         → "/reports"
│   │   ├── team.tsx            → "/team" (RBAC + invites)
│   │   ├── settings.tsx        → "/settings"
│   │   └── activity-logs.tsx   → "/activity-logs"
│   ├── components/
│   │   ├── app-shell.tsx      # sidebar + header layout wrapper (544 lines)
│   │   ├── admin-tasks-view.tsx, import-preview-modal.tsx, invoice-preview.tsx, social-icons.tsx
│   │   ├── invoices/           # InvoiceAdapter, InvoiceDocument, InvoiceEditor, payment QR/logo helpers
│   │   └── ui/                 # shadcn/radix primitives (46 files)
│   ├── lib/
│   │   ├── queries.ts          # 1255 lines — all TanStack Query hooks / Supabase data access
│   │   ├── auth.tsx            # AuthContext: session + loading via supabase.auth
│   │   ├── permissions.ts      # DEFAULT_PERMISSIONS matrix + usePermissions() hook
│   │   ├── admin-api.ts, demo-data.ts, error-capture.ts, error-page.ts,
│   │   │   exportInvoicePdf.ts, invoiceUtils.ts, supabase.ts, utils.ts
│   ├── hooks/use-mobile.tsx
│   └── utils/exportExcel.ts, importExcel.ts
├── supabase/
│   ├── migrations/             # ~30 SQL migration files (chronological, some legacy-named)
│   ├── functions/admin-users/  # Edge Function — required for "Add Team Member" (service role)
│   ├── final_schema.sql, full_setup.sql, combined_migrations*.sql, seed.sql
├── docs/IMPLEMENTATION-PLAN.md # roadmap / gap analysis vs competitors (see below)
├── Newdesign.md                 # exact visual redesign spec for the dashboard (colors, type, layout)
├── scripts/package-hostinger.mjs
├── HOSTINGER-DEPLOY.txt         # static SPA deploy guide for Hostinger
└── SocialNxt-hostinger-dist.zip # prebuilt static export (committed artifact)
```

## Data model (Supabase Postgres tables, from `queries.ts` + migrations)

`workspaces`, `workspace_members`, `users`, `clients`, `client_socials`, `deals`, `posts`,
`post_media`, `media`, `media_assets`, `meetings`, `proposals`, `proposal_pdfs`, `quotations`,
`issues`, `social_accounts`.

Workspace-scoped multi-tenancy: every table is scoped by `workspace_id`, RLS uses a
`get_user_workspaces()` helper (per `docs/IMPLEMENTATION-PLAN.md`).

## Auth & authorization model

- **Auth:** Supabase Auth session via `AuthProvider` (`src/lib/auth.tsx`) — just tracks
  `{session, loading}`, no role logic itself.
- **Routing guards** (`app-router.tsx`):
  - `PublicOnly` — keeps logged-in users off `/login` (except during Supabase invite/recovery
    hash flows, which must stay on `/login` to set a password).
  - `RequireAuth` — redirects to `/login` if no session.
  - `OnboardingGate` / `RequireWorkspace` — checks `workspace_members` for the user; routes to
    `/onboarding` if they belong to no workspace yet, else gates the main app.
- **RBAC:** three roles — `admin`, `employee`, `client`. `src/lib/permissions.ts` defines
  `DEFAULT_PERMISSIONS` (11 permission keys e.g. `view_clients`, `approve_proposals`,
  `access_deals`, `manage_employees`). Workspaces can override via a `permissions` JSONB column
  (`wsPerms`) that takes precedence over defaults, even for admins (see TC06 comment in code).
  Admins default to all-permissions unless explicitly overridden.

## Deployment

- Static SPA build: `npm run build:hostinger` → `vite build` + `scripts/package-hostinger.mjs`
  → `dist/` with `index.html`, `assets/`, `.htaccess` (for deep-link routing on Apache/Hostinger).
- After deploying, the `admin-users` Supabase Edge Function must also be deployed separately
  (`npx supabase functions deploy admin-users --project-ref <ref>`) or "Add Team Member" breaks.
- ⚠️ Two different Supabase project refs appear in the repo: `dppqinvtzvljuzplungb`
  (`docs/IMPLEMENTATION-PLAN.md`) vs `ilwkuoumjsbqlzmskgnz` (`HOSTINGER-DEPLOY.txt`) — confirm
  which is the live/current project before touching Supabase config or deploying functions.

## Product roadmap / known gaps (from `docs/IMPLEMENTATION-PLAN.md`)

Currently a **planner, not a publisher** — no OAuth/actual posting to IG/FB/LinkedIn/X yet,
`social_accounts` table exists but is unused for real publishing. Also missing: comment threads
on posts, client magic-link approval (no-account review), notifications, unified inbox, platform
analytics, AI caption assist, bulk/recurring scheduling, real media library. Planned phased
order: (1) approval workflow + notifications, (2) real publishing pipeline, (3) AI + bulk
scheduling, (4) analytics + unified inbox. See the doc for full detail before starting large
feature work — check whether it's still accurate first, since it may go stale as work progresses.

## Design system note

`Newdesign.md` is a **restyle-only spec** for the dashboard (colors, type, spacing) — it
explicitly forbids changing any data, labels, metrics, or copy, only visual treatment. Consult it
before touching dashboard UI, and don't treat it as defining functional/data changes.

## Conventions / gotchas worth remembering

- Don't create `src/pages/` or TanStack-style route files — despite `src/routes/README.md`
  describing that convention, the real router is `app-router.tsx` (react-router-dom). New pages
  = new file in `src/routes/` + manual `<Route>` entry in `app-router.tsx`.
- No git remote confirmed beyond `origin/main`; repo currently has a single "intial commit" —
  treat git history as effectively fresh/local.
- This is a **nested** project: repo root is `Socialnxt-final/socialnxt/` (the outer
  `Socialnxt-final/` folder is not itself a git repo and holds nothing else).

---

## Session changelog

*Newest first. One or two lines per work session: what changed and why. Update this after
completing meaningful work so future sessions have continuity.*

- **2026-08-04** — Initial project analysis; created this CLAUDE.md context file. No code changes.
