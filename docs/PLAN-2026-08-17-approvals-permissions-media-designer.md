# Implementation Plan — Approvals, Permissions, Media, Client Socials, Designer Workspace

**Date:** 2026-08-17
**Status:** Planning only — no code or migrations have been applied yet.
**Author context:** Written against the actual codebase at `new_socialnxt_codebase/` (Vite + React 19 SPA, react-router-dom v7, Supabase Postgres/RLS/Storage, TanStack Query). See `CLAUDE.md` for the full stack map.

This plan covers every item from your request. Each is traced to the real file/line it currently lives in, not guessed. Items that are very likely to be built together (same files, same data, same UI pattern) are merged into one **Group**; items that are independent stay separable so you can ship/review them one at a time.

---

## 0. Two things to fix *before* any new migration — schema drift

While tracing the code I found the live database already differs from what's in `supabase/migrations/`:

1. **`workspace_members.agency_role`** — read/written throughout the app (`src/lib/queries.ts:147,158`, `src/routes/team.tsx`), but **no migration in `supabase/migrations/` creates this column.** It exists live but isn't tracked.
2. **`posts.status = 'changes_requested'`** — used throughout `tasks.tsx` and `approvals.tsx`, but the tracked `CHECK` constraint (`supabase/migrations/20240101000000_baseline_schema.sql:91` and `supabase-schema.sql:75`) only allows `('draft','pending_approval','approved','scheduled','published','failed')`. `'changes_requested'` isn't in it. Either the live constraint was already patched by hand (untracked), or writes to this value are currently only succeeding because of drift/permissive state.

**Why this matters for this plan:** several groups below need to `ALTER` these same columns/constraints. If we write migrations against the *tracked* schema without reconciling first, `supabase db push` can fail (constraint already exists differently) or a fresh environment built from `supabase/migrations/` won't match production.

**Action (do this first, before Group 1):**
- Run `npx supabase link --project-ref ilwkuoumjsbqlzmskgnz` (confirmed live ref from `.env` `VITE_SUPABASE_URL`; `CLAUDE.md` flagged two refs as ambiguous — this is the correct one, matching `HOSTINGER-DEPLOY.txt`).
- Run `npx supabase db pull` to capture what's *actually* live into a new migration file, or manually inspect the live schema (`\d workspace_members`, `\d posts`) via the SQL editor and diff it against `supabase/migrations/`.
- Add one reconciliation migration (`20260817090000_reconcile_schema_drift.sql`) that idempotently brings tracked migrations in line with live reality (add `agency_role` if missing, fix the `status` CHECK constraint). This becomes the new floor everything else builds on.

I'll draft this migration's SQL in Group 3/Group 1 below since the two drifted fields belong to those groups' domains.

---

## Group 1 — Approvals & Content-Sheet Status Workflow
*Covers: approval confirmation modal, status-as-dropdown with guided-forward/free-revert.*

**Why merged:** both live in the same status state machine (`posts.status`), touch the same two files (`approvals.tsx`, `tasks.tsx`), and the confirm-modal is naturally reused as the "approve" step inside the new dropdown.

### 1a. Approve confirmation modal

**Current behavior:** `handleApprove` (`src/routes/approvals.tsx:81-93`) fires the mutation immediately on click — no confirmation, no final look at what's being approved beyond what's already in the row.

**Target:** clicking **Approve** opens a modal showing: task topic, client, all completed-content thumbnails/links (reuse `CompletedWorkMedia`, `approvals.tsx:23-52`), platform badges, scheduled date, and an explicit "Are you sure you want to approve this?" with Confirm/Cancel. Only on Confirm does `updateStatus.mutate(...)` fire.

**Files:**
- New shared component `src/components/approve-confirm-dialog.tsx` (Radix `Dialog`, same primitives already used elsewhere e.g. `clients_.$clientId.tsx`'s `Dialog` usage).
- `src/routes/approvals.tsx` — replace direct `onClick={() => handleApprove(post)}` with `onClick={() => setConfirmingPost(post)}`, render the dialog when `confirmingPost` is set.
- `src/routes/tasks.tsx:1234-1259` — the Content Sheet's own inline "Approve" action (used by client/admin/SMM when `status === 'pending_approval'`) should open the same dialog for consistency, since it does the same mutation.

**No DB changes needed** — uses existing `Post` fields.

### 1b. Status as a dropdown: guided forward, free revert backward

**Current behavior:** `tasks.tsx:1190-1310` renders separate conditional buttons per role/status ("Send for Approval", "Approve", "Request Changes", "Resubmit", "Schedule", "Mark as Published"), each gated by `workspace.role`/`isSMM` and the current `post.status`.

**Your decision:** keep the *forward* flow exactly as guided today (one step at a time, same role gating) — but let authorized users **jump backward to any earlier stage directly from a dropdown**, e.g. revert a `published` post back to `draft` to fix a mistake.

**Design:**
- Define a canonical order once: `STATUS_FLOW = ['draft', 'pending_approval', 'approved', 'scheduled', 'published']`, with `changes_requested` modeled as a side-branch reachable from `pending_approval`/`approved` (not part of the linear order).
- Replace the button row with a single `<Select>` per row showing the current status plus:
  - The one valid **forward** option (same permission checks as today's buttons — e.g. only client/admin/SMM can move `pending_approval → approved`).
  - **All earlier stages** in `STATUS_FLOW`, always selectable by admin/employee (not client) as a "revert" — wrapped in a confirm (`window.confirm` or a small dialog) since it undoes progress.
  - `changes_requested` still offered as an explicit branch off `pending_approval`/`approved`, same as today, prompting for the note (`tasks.tsx:96` pattern in `approvals.tsx`, and `updatePost.mutate` with `revision_note`).
- Keep `approvals.tsx`'s Approve/Request Changes buttons as-is (they're a filtered, single-purpose view of the same mutations) — just point Approve through the 1a confirm dialog.

**DB fix bundled here** (closes the drift from §0): migration `20260817090000_reconcile_schema_drift.sql` includes:
```sql
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_status_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_status_check
  CHECK (status IN ('draft','pending_approval','changes_requested','approved','scheduled','published','failed'));
```
(Constraint name may differ live — confirm via `\d posts` before writing the final `DROP CONSTRAINT` name.)

**Files:** `src/routes/tasks.tsx` (TaskRow's status cell, ~line 1190+), new small `STATUS_FLOW` constant (co-locate in `tasks.tsx` or promote to `src/lib/permissions.ts` if `approvals.tsx` needs it too).

**Acceptance criteria:** forward transitions behave identically to today (no new capability added there); reverting is available to admin/employee, requires confirmation, and is blocked for `client` role.

---

## Group 2 — Structured Links (Media Library "Add Drive Link" + Reference/Completed Content name+URL)

**Why merged:** both are "let the user attach a link with a display name" — same UI pattern, worth building one `<AddLinkDialog>` component and reusing it in both places. They touch different tables, so migrations stay separate.

### 2a. Media Library — add a Drive-link option

**Current behavior:** `src/routes/media.tsx` upload bar (~line 358-383) only supports file upload via `<input type="file">` → Supabase Storage. `media_assets` table (`supabase/migrations/20240321000000_media_assets.sql`) has `url text not null` but nothing distinguishes "uploaded file" from "external link".

**Target:** an "Add Link" button next to "Upload" in the Upload Settings bar. Opens the same `<AddLinkDialog>` (name + URL), creates a `media_assets` row with the pasted URL, tagged so the grid renders it as a link card (icon + name) instead of trying to thumbnail it as an image/video.

**Migration** (`20260817090100_media_assets_source_type.sql`):
```sql
ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'upload'
  CHECK (source_type IN ('upload', 'link'));
```

**Files:** `media.tsx` (button + dialog + grid-card branch for `source_type === 'link'`), `src/lib/queries.ts` `useCreateMediaAsset` (~line 373) to accept `source_type`.

### 2b. Reference Content / Completed Content — name + URL, conditional display

**Current behavior:** `handleAddLink` (`tasks.tsx:932-941`) is a bare `window.prompt("Enter the URL link...")` — one field, no name. Stored as plain strings in `posts.reference_content` / `posts.completed_work` (`TEXT[]`, confirmed in `supabase/migrations/20240101000000_baseline_schema.sql:105-106`). Same pattern is rendered read-only in `approvals.tsx`'s `CompletedWorkMedia` (line 23-52).

**Target:** "Add Link" opens `<AddLinkDialog>` asking **Link Name** and **Link Address**. Render rule: if the URL is short (proposed threshold: ≤ 40 characters), show `Name — url` (both, url still clickable); otherwise show only the Name, clickable, opening the URL in a new tab.

**Data model change (the bigger one in this group):** `TEXT[]` of raw URLs can't hold a name. Change both columns to `jsonb` arrays of `{ "name": string | null, "url": string }`.

**Migration** (`20260817090200_posts_reference_completed_jsonb.sql`):
```sql
ALTER TABLE public.posts
  ALTER COLUMN reference_content TYPE jsonb
  USING (
    CASE WHEN reference_content IS NULL THEN NULL
    ELSE (SELECT jsonb_agg(jsonb_build_object('name', NULL, 'url', u)) FROM unnest(reference_content) AS u)
    END
  ),
  ALTER COLUMN completed_work TYPE jsonb
  USING (
    CASE WHEN completed_work IS NULL THEN NULL
    ELSE (SELECT jsonb_agg(jsonb_build_object('name', NULL, 'url', u)) FROM unnest(completed_work) AS u)
    END
  );
```
This backfills existing plain-URL rows into `{name: null, url: <existing value>}` so nothing is lost. Old entries display with the URL as fallback name until edited.

**Files touched by the shape change** (need updated read/write logic wherever these two columns are touched):
- `src/routes/tasks.tsx` — `handleAddLink` (932), `renderMedia` (944), CSV export (`535-544`), image-upload merge logic (~477-503).
- `src/routes/approvals.tsx` — `CompletedWorkMedia` (23-52), `isImageUrl` needs to operate on `.url` not the raw string.
- `src/utils/importExcel.ts` / `exportExcel.ts` if they read these columns (check before writing).
- `src/routes/index.tsx` (dashboard) and `src/routes/calendar.tsx` if either previews these fields — verify with a grep before implementation.

**Risk to flag:** this is the most invasive migration in the plan because it changes an existing column's *shape*, not just adds a column. Recommend a full backup/point-in-time-recovery check before running it, and keep the read path tolerant of a bare string entry (defensive `typeof x === 'string' ? {name: null, url: x} : x`) in case any stray write path still pushes a raw string post-migration.

---

## Group 3 — Team, Roles & Permissions
*Covers: add member from Settings too, fix the broken permission toggles, add All-Employees/Specific-Employees scoping.*

**Why merged:** all three live in `settings.tsx` + `team.tsx` + `permissions.ts` + `workspace_members`, and 3b (root-cause fix) must land before 3c (the new overlay feature) makes sense to build on.

### 3a. Add Member from Settings → Members tab too

**Current behavior:** Settings → Members (`settings.tsx:226-325`) only *lists* members and can remove them (`handleRemove`, `316`). The invite/create flow only exists on the separate Team page (`team.tsx:120-152`), calling `createAccount()` from `src/lib/admin-api.ts`, which invokes the `admin-users` Supabase Edge Function.

**Target:** add an "Add Member" button + the same create-account dialog (name/email/phone/password/role/agencyRole) to the Members tab header (next to the search/role-filter row at `settings.tsx:233`), calling the exact same `createAccount()` helper — no new backend logic needed, this is a UI-reuse task.

**Files:** `settings.tsx` (new dialog state + button), reuse form JSX from `team.tsx:154+` (consider extracting a shared `<AddMemberDialog>` component so both pages stay in sync instead of duplicating the form).

**No DB changes.**

### 3b. Fix: permission toggles don't actually restrict/unrestrict employees — root cause found

**Reported symptom:** "View all clients" toggled ON for `employee` role, but employees still don't see all clients.

**Root cause, confirmed in code:**
1. `src/lib/queries.ts:158` — `agencyRole: data.agency_role as string || "Social Media Manager"`. Any employee **without an explicitly set `agency_role`** silently defaults to `"Social Media Manager"`.
2. `src/routes/clients.tsx:230,235` —
   ```ts
   const isSMM = workspace?.role === "employee" && workspace?.agencyRole === "Social Media Manager";
   const accessibleClients = isEmployee && (isSMM || !hasPermission("view_clients"))
     ? clients.filter(...)   // restricted to assigned clients
     : clients;              // everyone
   ```
   Because `isSMM` is `OR`'d in, **any employee who defaults to SMM is force-restricted regardless of the `view_clients` toggle.** Since most employees never get an explicit `agency_role` set (only Designer/Video Editor are assigned at invite time per `team.tsx:78`), this silently overrides the Settings toggle for the majority of employees — matching exactly what you observed.

**Fix (two parts, do both):**
1. In `clients.tsx`, change the gating so the toggle is authoritative and `isSMM` only decides *which* filter predicate applies when restricted, not *whether* to restrict:
   ```ts
   const accessibleClients = isEmployee && !hasPermission("view_clients")
     ? clients.filter(c => isSMM
         ? c.team_assignments?.["Account/Social Media Manager"] === myUserId
         : Object.values(c.team_assignments || {}).includes(myUserId!))
     : clients;
   ```
2. Stop silently mislabeling unset `agency_role` as `"Social Media Manager"` in `queries.ts:158` — that default should be a neutral value (e.g. `"Employee"` or `null`), with the DB column itself given an explicit, sane default via the reconciliation migration (§0):
   ```sql
   ALTER TABLE public.workspace_members
     ADD COLUMN IF NOT EXISTS agency_role text; -- tracked, nullable, no forced SMM default
   ```

**Also audit** (grep confirmed `hasPermission` is wired into `app-shell.tsx` for nav visibility and `calendar.tsx:73` for edit-gating) — these look correctly wired at the role level; the bug was specific to `clients.tsx`'s SMM special-case. Still worth a quick pass over `deals.tsx`, `proposals.tsx`, `quotations.tsx`, `reports.tsx` gating during implementation to confirm no similar silent-override pattern exists elsewhere.

**Files:** `clients.tsx`, `queries.ts`, reconciliation migration.

### 3c. Permission scope: "All Employees" vs "Specific Employees" (multiselect) overlay

**Your decision:** overlay on role default — a per-user override only changes the specific permission keys you toggle for that person; everything else still tracks the role default. This is simpler and won't silently drift when you later change the role-level defaults.

**Design:**
- New table, one row per (workspace, user) holding only their *overridden* keys:
  ```sql
  CREATE TABLE IF NOT EXISTS public.permission_overrides (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    permissions jsonb NOT NULL DEFAULT '{}',   -- { "<perm_key>": boolean }
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(workspace_id, user_id)
  );
  -- RLS: workspace-scoped select for members; write restricted to admins (mirror clients/workspaces policy pattern)
  ```
  (This becomes `20260817090300_permission_overrides.sql`.)
- `usePermissions()` (`src/lib/permissions.ts:31-48`) resolution order becomes:
  1. If `permission_overrides` has an entry for `(workspace, currentUserId)` **and** that entry's `permissions[permKey]` is defined → use it.
  2. Else fall back to existing role-matrix logic (`wsPerms` → `DEFAULT_PERMISSIONS`) exactly as today.
- Settings → Roles & Permissions UI (`settings.tsx:334+`): next to each permission row, add a scope control — **"All Employees"** (today's existing role toggle, unchanged) or **"Specific Employees"**, which reveals a multiselect of workspace employees (`useWorkspaceMembers`). Toggling for selected users upserts into `permission_overrides` for just that `permKey`, for just those `user_id`s — never touches the role matrix.
- New query hooks needed in `queries.ts`: `useWorkspacePermissionOverrides(workspaceId)`, `useSetPermissionOverride()` (upsert one key for one/many users).

**Files:** `permissions.ts` (resolution logic), `settings.tsx` (UI), `queries.ts` (new hooks), new migration above.

**Sequencing note:** ship 3b before 3c — the override layer is meaningless while the underlying role-level toggle is silently ignored for most employees.

---

## Group 4 — Client Social Accounts ↔ Content Sheet
*Covers: multiple accounts per platform per client, clickable platform badges in Content Sheet, posts targeting a specific account.*

**Why merged:** all three live in the same data path — `client_socials` → `clients_.$clientId.tsx` (where handles are managed) → `tasks.tsx` `PlatformMultiSelect` (where a post's platforms are chosen). Your answer that posts should target a *specific* account (not just link out) means this needs a posts-table change too, so it's one coherent workstream.

**Current behavior:**
- `client_socials` (`supabase/migrations/20260721000001_client_socials.sql`) has `UNIQUE(client_id, platform)` — **hard-blocks a second Instagram account for the same client** at the DB level. `clients_.$clientId.tsx:321` also blocks it in the UI with `toast.error("A handle for ${sPlatform} already exists")`.
- `tasks.tsx`'s `PlatformMultiSelect` (line 81+) just lets you pick platform names (`Instagram`, `Facebook`, ...) — no concept of *which* account.
- Content Sheet's platform badges (`approvals.tsx:179`, similar in `tasks.tsx`) are static `<Badge>`s, not links.

**Target:**
1. Client Management can store multiple labeled accounts per platform (e.g. "Instagram — Main", "Instagram — Store").
2. When building a Content Sheet row, if the client has >1 account for a selected platform, the platform chip gets a secondary account picker.
3. The platform badge in Content Sheet becomes clickable, opening the *specific* account's profile URL the post is targeting (falling back to the client's primary account for that platform if the post predates this feature).

**Migrations:**

`20260817090400_client_socials_multi_account.sql`:
```sql
ALTER TABLE public.client_socials DROP CONSTRAINT IF EXISTS client_socials_client_id_platform_key;
ALTER TABLE public.client_socials ADD COLUMN IF NOT EXISTS label text;          -- e.g. "Main", "Store"
ALTER TABLE public.client_socials ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;
-- Optional: partial unique index so at most one primary per (client_id, platform)
CREATE UNIQUE INDEX IF NOT EXISTS client_socials_one_primary
  ON public.client_socials (client_id, platform) WHERE is_primary;
```

`20260817090500_posts_platform_accounts.sql`:
```sql
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS platform_accounts jsonb DEFAULT '{}'::jsonb;
-- shape: { "Instagram": "<client_socials.id>", "Facebook": "<client_socials.id>" }
```

**Files:**
- `clients_.$clientId.tsx` — "Add handle" dialog (~1029-1053) gains a Label field; remove/relax the duplicate-platform block (only block exact duplicate client+platform+label); handle list (~856-885) groups by platform, shows label.
- `queries.ts` — `useAddClientSocial`/`useUpdateClientSocial` (~953-977) accept `label`/`is_primary`.
- `tasks.tsx` — `PlatformMultiSelect` gains a per-platform account sub-picker when multiple accounts exist for that platform+client; write the chosen `client_socials.id` into `post.platform_accounts[platform]`.
- `tasks.tsx` / `approvals.tsx` — platform `<Badge>` becomes `<a href={resolvedProfileUrl} target="_blank">`, resolving via `post.platform_accounts[platform]` → that `client_socials.profile_url`, else the client's `is_primary` account for that platform, else the sole account if only one exists.

**Sequencing note:** build after Group 2 lands, since both touch `TaskRow` in `tasks.tsx` and doing them back-to-back avoids merge churn in that file.

---

## Group 5 — Designer Personal "Designs" Library
*Standalone new feature — biggest single addition, kept separate from everything else.*

**Current behavior:** no personal storage concept exists. `Designer` is only an `agency_role` value used for a filtered "Designers" list in `team.tsx:90,282-286` — no dedicated view or storage for them.

**Target (per your answers):** a new "Designs" section, visible to users with `agency_role === 'Designer'` (and their own uploads only — **private until attached**, not admin-browsable). Structurally a personal counterpart to the Media Library. From Content Sheet, a Designer (or admin) can pick from *that designer's own* stash and attach it to a post's `reference_content`/`completed_work` — at which point it becomes visible to admin and allocated employees for that client, same as any other link (Group 2's `{name, url}` shape).

**Migration** (`20260817090600_designer_assets.sql`):
```sql
CREATE TABLE IF NOT EXISTS public.designer_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  designer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  url text NOT NULL,
  file_name text,
  mime_type text,
  tags text[],
  attached_to_post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  attached_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.designer_assets ENABLE ROW LEVEL SECURITY;

-- Private until attached: designer sees their own always; others only once it's linked
-- to a post they already have access to (mirrors posts' own RLS via a join).
CREATE POLICY "Designer sees own assets" ON public.designer_assets
  FOR SELECT USING (designer_id = auth.uid());

CREATE POLICY "Others see only attached assets they have post access to" ON public.designer_assets
  FOR SELECT USING (
    attached_to_post_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.posts p WHERE p.id = attached_to_post_id
                AND p.workspace_id IN (SELECT public.get_user_workspaces()))
  );

CREATE POLICY "Designer manages own assets" ON public.designer_assets
  FOR ALL USING (designer_id = auth.uid()) WITH CHECK (designer_id = auth.uid());
```
**Note:** the privacy rule is enforced at the RLS layer, not just hidden in the UI — this matters because the Supabase anon client is used directly from the browser (`src/lib/supabase.ts`), so RLS is the actual security boundary here, not React conditionals.

**Files:**
- New route `src/routes/designs.tsx` → `/designs`, wired in `app-router.tsx`, nav entry in `app-shell.tsx` gated on `workspace.agencyRole === 'Designer'` (also visible to admins for *their own* uploads if they use it, consistent with the RLS above — admins don't get special browse access to others').
- `queries.ts` — `useDesignerAssets(designerId)`, `useUploadDesignerAsset`, `useAttachDesignerAsset({id, postId, clientId, target})`.
- `tasks.tsx` — reference/completed-content "Add" controls (~1091, 1117) gain a third option "From My Designs" (only rendered for the current user's own `agencyRole === 'Designer'`/admin), opening a picker over `designer_assets` filtered to `attached_to_post_id IS NULL` (or allow re-attaching already-used ones too). On pick: set `attached_to_post_id`/`attached_client_id` on the `designer_assets` row, and append `{name: file_name, url}` into the post's `reference_content`/`completed_work` jsonb array (Group 2 shape) — this is what makes it show up for admin/allocated employees, reusing existing Content Sheet visibility rules with no further changes needed there.

**Dependency:** build after Group 2, since it reuses the `{name, url}` jsonb shape and the `<AddLinkDialog>`-adjacent UI conventions established there.

---

## Suggested delivery order

| Order | Work | Depends on |
|---|---|---|
| 0 | Schema drift reconciliation (§0) | — |
| 1 | Group 3b — permission bug fix (small, high trust payoff) | §0 |
| 2 | Group 1 — approval modal + status dropdown | §0 |
| 3 | Group 2 — structured links (media + reference/completed) | — |
| 4 | Group 4 — client socials multi-account + clickable platforms | Group 2 (file overlap) |
| 5 | Group 3a + 3c — Settings add-member, permission overlay | Group 3b |
| 6 | Group 5 — Designer library | Group 2 (shape reuse) |

Groups 1–3b can ship independently and in parallel if you want quicker wins; 2 → 4 → 5 has a real file/shape dependency chain and is best done in that sequence.

## Running the migrations

Once each group's migration file is written and reviewed:
```bash
npx supabase link --project-ref ilwkuoumjsbqlzmskgnz   # once per machine, if not already linked
npx supabase db push                                    # applies all new files in supabase/migrations/
```
I have **not** run any of this yet — these are schema changes on what appears to be your live/production Supabase project (`ilwkuoumjsbqlzmskgnz`), including one non-trivial column-type change (Group 2b). Recommend applying them one migration file at a time, in the order above, confirming the app still works after each before moving to the next — and taking a Supabase backup/PITR checkpoint before Group 2b specifically, since it rewrites existing `posts` data.

## Assumptions made (flag if wrong)

- "Short link" threshold in Group 2b set at 40 characters as a starting point — easy to tune once you see it rendered.
- Group 5's Designer nav item also shows for admins (for their own uploads only, per RLS) rather than being Designer-only.
- Group 4's "primary account" fallback (for posts created before this feature, or when a post doesn't specify an account) uses the `is_primary` flag; if a platform has multiple accounts and none is marked primary, the badge falls back to non-clickable until one is set.
