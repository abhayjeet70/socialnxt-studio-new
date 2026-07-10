# SocialNxt Studio — Smoothness Implementation Plan

*How top social CRMs (Sprout Social, Agorapulse, Planable, SocialBee, Cloud Campaign, Later, Buffer) make agency work frictionless, and how we get there from our current codebase.*

---

## 1. Where we are today

**Stack:** React 19 + TanStack Start/Router/Query, Tailwind v4, Radix (shadcn), Supabase (Postgres + RLS + Storage).

**Working modules (real DB-backed):** Clients, Deals (pipeline), Tasks/Content sheet (`posts`), Content Calendar, Team + RBAC (admin/employee/client), Meetings, Proposals (PDF), Quotations (GST line items), Issues, Reports, Activity logs, Settings.

**Backend is fully provisioned** on Supabase project `SocialNxt` (`dppqinvtzvljuzplungb`): 11 tables, RLS, `post_media` + `proposal_pdfs` storage buckets, `handle_new_user` invite trigger.

### Honest gaps vs. real social CRMs
| Gap | Today | Impact |
|---|---|---|
| **No actual publishing** | `social_accounts` stores tokens; nothing posts to IG/FB/LinkedIn/X | It's a planner, not a publisher — the core value of a social tool is missing |
| **Approval is a status flip** | `status` field toggles; no comments, no revision rounds, no client magic-link | Feedback still happens over WhatsApp/email — the #1 thing agencies pay to escape |
| **No notifications** | derived client-side only | People miss approvals, assignments, deadlines |
| **No unified inbox** | none | Comments/DMs handled outside the tool |
| **No platform analytics** | Reports only chart internal deal revenue | Can't prove ROI to clients |
| **No AI assist** | none | Captions/hashtags written manually |
| **No media library** | files dumped in one bucket, no reuse | Assets re-uploaded every time |
| **No bulk / recurring scheduling** | one post at a time | Slow to fill a month |

---

## 2. What "smooth" means at the leaders (grounded)

- **Planable / Agorapulse** win on **collaboration + client approval** — review, comment inline, approve in one place, no email chains. Agorapulse approval scores 8.5/10 on G2, Sprout 8.2.
- **Agorapulse / Sprout** win on the **unified inbox** — all comments/DMs across profiles in one queue.
- **Cloud Campaign / SocialBee** win on **agency scale** — per-client workspaces, content *categories* + **bulk CSV scheduling**, auto-recycling evergreen posts.
- **Across the board (2026):** AI caption/hashtag generation that **adapts per network**, **best-time-to-post** from engagement history, and **client-facing PDF performance reports**.

Sources: [Planable – Sprout alternatives](https://planable.io/blog/sprout-social-alternatives/), [Statusbrew – Sprout vs Agorapulse](https://statusbrew.com/insights/sprout-social-vs-agorapulse), [Cloud Campaign – APIs for agencies](https://www.cloudcampaign.com/smm-tips/best-social-media-apis-and-management-tools-for-agencies-in-2026), [Planable – scheduling tools](https://planable.io/blog/schedule-social-media-posts/), [SocialBee](https://socialbee.com/).

---

## 3. Implementation plan (phased, mapped to our code)

Guiding rule: our biggest leverage is **turning the planner into a real publisher** and **making client approval painless**. Do those first — everything else is polish.

### Phase 1 — Approval that clients actually use (2–3 wks) ★ highest ROI, no external APIs
The one feature that removes the most daily friction and needs zero platform integrations.

1. **Comment threads on posts.** New table `post_comments (id, post_id, author_id, body, created_at)`. Render a thread panel in `tasks.tsx` / calendar post drawer.
2. **Revision rounds.** Extend `posts.status` flow: `draft → pending_approval → changes_requested → approved`. Store `revision_note`. Reuse existing `useUpdatePostStatus`.
3. **Client magic-link approval.** Supabase **Edge Function** `approve-link` issues a signed token; a public route `/approve/$token` lets a client approve/comment **without an account**. This is the Planable killer feature.
4. **Notifications backbone.** New table `notifications (id, user_id, workspace_id, type, entity_id, read, created_at)` + Supabase **Realtime** subscription in `app-shell.tsx` bell. Trigger rows on approval-needed, assignment, comment, deadline.

*Deliverable: an agency runs its whole review cycle in-app.*

### Phase 2 — Become a real publisher (4–6 wks) ★ core product value
5. **OAuth connect flows** per platform (Meta Graph for IG/FB, LinkedIn, X, TikTok) → populate `social_accounts` for real (tokens already modeled). Edge Functions hold client secrets; **never** ship secrets to the browser.
6. **Publish pipeline.** Edge Function `publish-post` + a scheduler (Supabase `pg_cron` calling the function every minute) that picks `scheduled` posts whose `scheduled_for <= now()` and pushes to each platform in `platforms[]`. Write back `published_at` or `status='failed'` + error.
7. **Token refresh** cron per `token_expires_at`.

*Deliverable: schedule once, it auto-posts. This is the line between "CRM" and "social tool."*

### Phase 3 — Speed features that save hours (3–4 wks)
8. **AI caption + hashtag assist.** Edge Function calling Claude (`claude-opus-4-8` / `claude-haiku-4-5` for cheap bulk) — generate caption from topic, **adapt length/hashtags per network**, suggest variations. Button in the post editor.
9. **Best-time-to-post.** Once Phase 2 analytics exist, compute per-account engagement heatmap; surface suggested slots in the calendar.
10. **Bulk scheduling + content categories.** CSV import → many `posts`; add `posts.category` and an auto-recycle queue for evergreen content (Cloud Campaign/SocialBee model).
11. **Media library.** Index the `post_media` bucket in a `media_assets` table (tags, client_id) so assets are searchable and reusable instead of re-uploaded.

### Phase 4 — Prove ROI + scale (ongoing)
12. **Platform analytics ingestion.** Cron pulls post insights (reach/engagement) into `post_metrics`; upgrade `reports.tsx` beyond internal revenue.
13. **Client-facing PDF reports** (reuse the proposal PDF pipeline).
14. **Unified inbox** (comments/DMs) — largest build; do last.

---

## 4. Quick technical wins (do alongside, low effort)
- **Optimistic updates** in TanStack mutations (drag a card, flip a status → instant UI) instead of invalidate-and-refetch. Noticeably snappier.
- **Realtime everywhere** via Supabase channels so multi-user workspaces stay live without refresh.
- **Command palette** (`cmdk` is already a dependency) — jump to any client/post/deal, matches the "search everything" bar in the design spec.
- **Global toasts** (`sonner` already installed) on every mutation success/failure.
- **Saved views / filters** on tasks + calendar (per client, per status, per assignee).

---

## 5. Suggested order of attack
1. Phase 1 (approval + notifications) — biggest friction removed, no API risk.
2. Quick wins in parallel.
3. Phase 2 (publishing) — the defining capability.
4. Phase 3 AI + bulk — the "wow, this saves hours" features.
5. Phase 4 analytics/inbox — retention + upsell.

New tables to add across phases: `post_comments`, `notifications`, `media_assets`, `post_metrics` (+ `posts.category`, `posts.revision_note`). All follow the existing workspace-scoped RLS pattern using `get_user_workspaces()`.
