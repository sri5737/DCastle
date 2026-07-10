# Implementation Plan: Deekshana Castle PG Management App (v1.2)

**Branch**: `001-dcastle-pg-management` | **Date**: 2026-07-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-dcastle-pg-management/spec.md`

## Summary

A mobile-first true Progressive Web App for Deekshana Castle PG that supports daily food submissions, live owner counts, invite-based activation, recurring login, hosteler lifecycle management, billing, Android installability, and an Android mobile app experience as the primary layout target. The v1.2 planning delta adds owner deletion of pending and active hostelers with owner-visible deleted records, immediate access revocation, preservation of past and same-day tracking and billing history, and cancellation of food preferences dated after the deletion effective date so those rows remain available only inside the deleted hosteler audit view and no longer affect normal owner history/export, future counts, or billing. The updated 2026-07-05 auth/invite delta captures owner-assisted PIN reset via regenerated invites for active PIN-linked hostelers, structured invite/reset error taxonomy, and deterministic superseded-token rejection for stale invite pages. The honest-E2E planning delta preserves Constitution XI and FR-066 through FR-069 by requiring an audit and correction pass for completed and future stories before any story or phase can be considered accepted. The Constitution v1.6.0 Android mobile app experience delta adds FR-071 through FR-079 and makes Android Chrome at 375 px the primary design baseline for every completed owner, hosteler, and auth screen, with no page-level horizontal overflow, touch-friendly controls, reachable app-like navigation, stable browser/standalone viewport behavior, and installed/standalone PWA validation for applicable owner and hosteler flows. The v1.3 planning delta (2026-07-10) clarifies that pending hosteler deletion is a complete hard delete — the row and all associated invite tokens are permanently removed from the database, no audit record is written, and no deleted-tab entry is created — and introduces explicit status-aware mobile number uniqueness validation at the API layer: adding a hosteler whose phone matches an active or pending row is rejected with a specific error; re-registration is permitted after a pending hard delete because the row no longer exists and the DB UNIQUE constraint is naturally freed.

## Technical Context

**Language/Version**: TypeScript 5.5, strict mode enabled

**Primary Dependencies**: Next.js 15.3.3 (App Router), React 19, Tailwind CSS, shadcn/ui, `@supabase/supabase-js`, `@ducanh2912/next-pwa`, `@cloudflare/next-on-pages`, `bcryptjs`

**Storage**: Supabase PostgreSQL (free tier) with Row Level Security and Realtime subscriptions

**Testing**: Vitest with `@testing-library/react` for unit/component coverage, Playwright for E2E browser coverage

**Testing Strategy**:
- Unit tests cover invite activation, PIN verification and 5-attempt/15-minute lockout, deadline enforcement, hosteler lifecycle transitions, deleted-record visibility, future-preference cancellation, billing eligibility rules, and server-side auth proxy retry/error handling.
- Existing and future E2E tests must be audited and corrected so each completed story proves at least one exact, falsifiable business outcome from its independent test using the real UI and real Next.js API routes. Route mocks, conditional skips, broad placeholder assertions, URL/heading-only checks, and direct cookie or localStorage session injection are not acceptable as core evidence for the feature being validated.
- Cross-role E2E workflows must prove producer-to-consumer behavior in one test or an explicitly linked sequence. For food submission and owner dashboard validation, a hosteler must submit exact breakfast/lunch/dinner preferences through the UI, then the owner dashboard must show the exact resulting counts and move that hosteler from Pending to Submitted.
- Owner dashboard E2E evidence must cover the initial fetched dashboard state, a live update caused by a real hosteler submission, and reload-stable state after the update. Counts and Pending/Submitted membership must remain exact across all three observations.
- Auth E2E evidence must log owner and hosteler users in through the real login UI and server-side auth routes, wait for post-login client effects, reload the authenticated surface, and verify the user remains on the correct role page. US12 proxy coverage must prove `/api/auth/login` and `/api/auth/pin/verify` are used without injected-session shortcuts.
- E2E tests cover each documented story flow, including PIN lockout, pending delete, active delete, deleted-tab visibility, deleted-hosteler audit detail visibility for canceled future preferences, exclusion of those canceled rows from normal owner history/export, dashboards, and billing inputs, and scoped performance evidence for SC-001 and SC-010.
- PWA checks validate manifest metadata, icon metadata, service worker registration, offline app-shell behavior, and install-prompt gating.
- Android mobile layout checks validate completed owner, hosteler, and auth screens at the 375 px Android Chrome baseline for no page-level horizontal overflow, clipped primary content, overlapping controls, unreachable primary actions, unreadable text, unstable viewport jumps, desktop-only navigation, hover-only actions, or unsafe touch spacing.
- Standalone PWA checks validate applicable installed-app flows for owner and hosteler navigation, viewport height, safe-area/keyboard/modal behavior, offline/online layout states, and primary action reachability.
- Manual Android validation remains required for installability, app-drawer presence, standalone launch, installed offline-shell behavior, and any mobile app experience evidence that cannot be proven by desktop browser automation.
- Per-story scripts must cover every documented story, including `npm run test:us12` for the server-side auth proxy. `/speckit.tasks` should refresh any missing scripts and ensure each story command runs the honest E2E evidence for that story in addition to relevant unit coverage.
- CI quality gate remains `npm run test:run` and `npm run test:e2e` before build/deploy, and deployment readiness must also run `npm run build:cloudflare` so strict TypeScript, Next.js production build, and Cloudflare Pages adapter/runtime failures are caught before production deployment.

**Target Platform**: Android mobile-first true PWA (375 px baseline as the primary experience), Android Chrome installability target, installed standalone PWA usage, Edge Runtime deployment on Cloudflare Pages

**Project Type**: Full-stack Next.js monolith with App Router and co-located API routes

**Performance Goals**: Food submission interaction completes in under 30 seconds using scoped browser or manual acceptance evidence for the documented login-and-submit flow, owner count updates propagate in under 3 seconds, owner can find a deleted record inside the deleted tab in under 30 seconds, and the system supports up to 100 hostelers with scoped seeded-data evidence and representative submission/dashboard checks rather than full load-testing infrastructure

**Constraints**: Edge Runtime only, zero-cost infrastructure, owner-visible deleted/audit records, deletion-effective-date semantics based on IST calendar date, canceled future food preferences after active deletion must remain visible only in the deleted-hosteler audit view and be excluded from normal owner history/export, dashboard counts, and billing queries, Android Chrome installability, standalone launch, maskable icons, cached offline app shell, Android mobile app-like navigation/layout as the primary user experience, no page-level horizontal overflow at 375 px, touch-friendly controls, stable viewport behavior in browser and standalone PWA contexts, honest E2E acceptance evidence for every completed story, no injected-session shortcut as core auth proof, real UI/API execution for feature evidence, and scoped SC-001/SC-010 performance evidence without adding load-test infrastructure unless a future spec requires it

**Scale/Scope**: Single-property deployment, about 40 active hostelers at launch and up to 100, owner and hosteler web surfaces in the current Next.js app, plus Supabase-backed API and data model changes for lifecycle and billing history

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | Evidence |
|---|-----------|--------|----------|
| I | Mobile-First | PASS | Constitution v1.6.0 makes Android Chrome at 375 px the primary baseline; FR-071 through FR-079 require app-like mobile navigation, touch-friendly controls, no page-level horizontal overflow, no clipped/overlapping/unreachable primary UI, stable browser and standalone PWA viewport behavior, and validation evidence before user-facing screens are accepted |
| II | Edge Runtime Compatibility | PASS | Route handlers remain Edge-only, lifecycle changes rely on Supabase APIs and SQL state changes rather than Node-only packages |
| III | Security & Data Isolation | PASS | RLS remains mandatory, owner-only deleted-record visibility is preserved, inactive/deleted access is revoked server-side, invite invalidation and PIN/session revocation happen server-side only |
| IV | Server-Side Deadline Enforcement | PASS | Food writes still use server-side IST deadline checks, and active-delete flow cancels future dated rows through server-side lifecycle logic |
| V | Zero-Cost Infrastructure | PASS | No new paid dependencies; lifecycle archive behavior is modeled inside existing Supabase/PostgreSQL data structures |
| VI | TypeScript Strict Mode & Simplicity | PASS | Deleted-record support extends the current hosteler/food-preference model instead of introducing a separate service or paid audit product |
| VII | Unit Testing Coverage | PASS | Plan explicitly adds coverage for deletion, archived visibility, future-preference cancellation, and billing inclusion/exclusion rules |
| VIII | CI/CD Pipeline with Isolated Test Job | PASS | Existing `test -> build -> deploy` pipeline remains unchanged, deploy remains gated on tests, and the build step mirrors Cloudflare Pages through `npm run build:cloudflare` |
| IX | Idempotent Database Migrations | PASS | v1.2 requires additive guarded migration updates for deleted lifecycle metadata and cancelable food-preference rows; no destructive migration strategy is required |
| X | True Progressive Web App | PASS | PWA scope is unchanged and remains validated independently of the lifecycle additions |
| XI | Honest End-to-End Validation | PASS | FR-066 through FR-069 require audit/correction of completed and future E2E tests for exact business outcomes, cross-role producer-to-consumer proof, dashboard initial/live/reload-stable evidence, and auth reload stability through real login UI/server routes |

**Gate Result**: ALL PASS. The v1.2 deletion/archive behavior, honest E2E clarification, and Constitution v1.6.0 Android mobile app experience requirements fit the constitution through additive schema/contract updates, stricter acceptance evidence, and mobile-first validation inside the existing Next.js 15.3.3 plus Supabase architecture.

## Project Structure

### Documentation (this feature)

```text
specs/001-dcastle-pg-management/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── auth.md
│   ├── billing.md
│   ├── food-preferences.md
│   ├── hostelers.md
│   ├── pwa.md
│   └── settings.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── (auth)/
│   │   ├── admin/login/page.tsx
│   │   ├── join/[token]/page.tsx
│   │   └── login/page.tsx
│   ├── (hosteler)/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── submit/page.tsx
│   │   ├── history/page.tsx           # planned under current route-group structure
│   │   └── bill/page.tsx              # planned under current route-group structure
│   ├── admin/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── hostelers/page.tsx
│   │   ├── billing/page.tsx           # planned in existing admin surface
│   │   ├── history/page.tsx           # planned in existing admin surface
│   │   └── settings/page.tsx
│   └── api/
│       ├── auth/
│       │   ├── callback/route.ts
│       │   └── pin/verify/route.ts
│       ├── food/
│       │   ├── submit/route.ts
│       │   ├── today-status/route.ts
│       │   └── history/route.ts       # planned
│       ├── hostelers/
│       │   ├── route.ts
│       │   └── [id]/
│       │       ├── route.ts
│       │       └── reset-invite/route.ts
│       ├── invite/
│       │   ├── activate/route.ts
│       │   ├── generate/route.ts
│       │   └── validate/route.ts
│       ├── billing/
│       │   ├── generate/route.ts      # planned
│       │   ├── detail/route.ts        # planned
│       │   └── route.ts               # planned
│       └── settings/route.ts
├── components/
│   ├── ui/
│   ├── countdown-banner.tsx
│   ├── food-toggle.tsx
│   ├── hosteler-list.tsx
│   ├── meal-count-card.tsx
│   └── owner-settings-page.tsx
├── lib/
│   ├── auth/
│   ├── supabase/
│   ├── billing.ts                     # planned
│   ├── deadline.ts
│   └── utils.ts
├── test/
│   └── setup.ts
└── types/
    └── index.ts

e2e/
├── global-setup.ts
├── global-teardown.ts
├── us1-food-submission.spec.ts
├── us2-owner-dashboard.spec.ts
├── us3-invite-activation.spec.ts
├── us4-hosteler-login.spec.ts
└── us5-hosteler-management.spec.ts

public/
├── manifest.json
└── sw.js

supabase/
├── seed.sql
└── migrations/
    └── 001_initial_schema.sql
```

**Structure Decision**: Keep the existing single Next.js monolith and extend the current hosteler lifecycle model in place. Deleted hostelers are represented as owner-visible lifecycle records in the same domain model, and future-dated food preferences are canceled through database state so existing dashboard, normal owner history/export, and billing queries can exclude them without introducing a second backend or archival service. The only surface allowed to reveal canceled future rows is the deleted-hosteler audit detail inside the owner deleted view.

## Post-Design Constitution Re-Check

| # | Principle | Status | Evidence |
|---|-----------|--------|----------|
| I | Mobile-First | PASS | Phase 18 planning and US13 validation gates remain explicit for 375 px Android baseline and standalone PWA usage for applicable flows |
| II | Edge Runtime Compatibility | PASS | Planned auth/invite and lifecycle work remains in Edge route handlers with no Node-only package introduction |
| III | Security & Data Isolation | PASS | Invite/reset errors remain structured and deterministic; owner-assisted reset remains active-hosteler scoped with server-side enforcement |
| IV | Server-Side Deadline Enforcement | PASS | Deadline enforcement remains server-authoritative and unchanged by the 2026-07-05 planning refresh |
| V | Zero-Cost Infrastructure | PASS | No new paid services introduced by updated reset semantics or mobile validation requirements |
| VI | TypeScript Strict Mode & Simplicity | PASS | Data-model updates stay additive (`created_at` aliasing for `generated_at`) without architecture expansion |
| VII | Unit Testing Coverage | PASS | Plan retains lockout, invite/reset taxonomy, lifecycle, and billing-eligibility test expectations |
| VIII | CI/CD Pipeline with Isolated Test Job | PASS | Validation gate still requires `npm run test:run`, `npm run test:e2e`, and `npm run build:cloudflare` |
| IX | Idempotent Database Migrations | PASS | No non-idempotent migration strategy introduced in refreshed artifacts |
| X | True Progressive Web App | PASS | PWA and Android standalone requirements remain explicit in quickstart/contracts |
| XI | Honest End-to-End Validation | PASS | Superseded-link and owner-assisted reset evidence is now explicit in quickstart scenario coverage |

**Post-Design Gate Result**: ALL PASS. The refreshed 2026-07-05 planning artifacts remain constitution-compliant with no new violations.

### v1.3 Post-Design Re-Check (2026-07-10)

| # | Principle | Status | Evidence |
|---|-----------|--------|----------|
| I | Mobile-First | PASS | Pending-delete confirmation dialog changes are UI text only; add-hosteler 409 error is inline on the phone field — no layout impact at 375 px |
| II | Edge Runtime Compatibility | PASS | Hard delete is a plain SQL `DELETE`; API-layer phone uniqueness check is a single `SELECT` — no Node.js packages required |
| III | Security & Data Isolation | PASS | Hard delete removes all traces of pending hosteler from DB; API-layer pre-check validates status before insert; DB UNIQUE constraint remains as safety net |
| IV | Server-Side Deadline Enforcement | PASS | Pending delete has no food preferences to cancel; no deadline interaction |
| V | Zero-Cost Infrastructure | PASS | No new paid dependencies introduced |
| VI | TypeScript Strict Mode & Simplicity | PASS | Pending hard delete simplifies the path (DELETE row vs. soft-delete update); uniqueness check is a single pre-insert query |
| VII | Unit Testing Coverage | PASS | New behavior requires: unit test for pending hard-delete route guard, unit tests for uniqueness check (active conflict, pending conflict, no conflict, freed-pending allowed) |
| VIII | CI/CD Pipeline | PASS | No pipeline changes; existing gates remain |
| IX | Idempotent Database Migrations | PASS | No schema migration needed; `ON DELETE CASCADE` for invite_tokens may need verification in existing migration |
| X | True Progressive Web App | PASS | No PWA scope change |
| XI | Honest End-to-End Validation | PASS | E2E test for US5 must verify pending hard delete leaves no deleted-tab entry, and add-hosteler 409 fires correctly for active/pending phone conflicts |

**v1.3 Post-Design Gate Result**: ALL PASS. Pending hard delete and status-aware phone uniqueness are additive API-layer behavioral changes fully contained within the existing architecture.

## Complexity Tracking

> No constitution violations detected.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |

---

## Phase 5 Amendment: Pending Hosteler Hard Delete & Mobile Number Uniqueness (v1.3)

**Updated**: 2026-07-10 | Amends: Phase 5 (US5) | **Spec**: [spec.md](spec.md) § US5 Scenarios 7, 8, 9

### Context

The v1.2 plan modeled both active and pending deletion as soft deletes into `status = 'deleted'`, placing all deleted records in the owner's deleted tab. The v1.3 spec update introduces two clarifications that alter the pending-delete path and the add-hosteler mobile validation:

1. **Pending hosteler deletion is a complete hard delete**: the row and all associated invite tokens are permanently removed from the database. No audit record is created. The owner's deleted tab will not show pending-deleted hostelers. The mobile number is freed immediately.
2. **Mobile number uniqueness is enforced at the API layer with status-aware semantics**: adding a hosteler with a phone matching an active or pending row is rejected with an explicit error; adding a hosteler with a phone previously associated with a hard-deleted pending hosteler is allowed (the row no longer exists, so no conflict arises).

### Data Model Implications

**No schema change is required for pending hard delete.**

- The `hostelers.phone` column retains its `UNIQUE` and `NOT NULL` constraints.
- Because a pending hard delete removes the row entirely, the DB-level UNIQUE constraint is naturally freed. A re-registration with the same phone succeeds without any special logic.
- The `deleted_from_status` and `deletion_effective_date` columns remain unchanged and continue to apply only to active-deletion soft-delete records.
- Pending-deleted rows never reach `status = 'deleted'`; they are fully removed before any deletion metadata would be written.
- A DB-level UNIQUE constraint on `phone` continues to serve as the safety net for all non-pending-delete cases (inactive and deleted-from-active rows retain their phone values and their UNIQUE slots).
- **No new migration is needed.** The DB structure already supports hard delete for pending rows via a plain `DELETE FROM hostelers WHERE id = $1 AND status = 'pending'`.
- The `invite_tokens` table must have `ON DELETE CASCADE` on `hosteler_id`, or the route must explicitly delete invite tokens before deleting the hosteler row. Verify in the existing `002_hosteler_deletion_lifecycle.sql` migration.

### API Design: Pending Hosteler Hard Delete

**`PATCH /api/hostelers/[id]`** — `action: "delete"` on a pending hosteler:

| Aspect | Decision |
|--------|----------|
| DB operation | `DELETE FROM hostelers WHERE id = $1 AND status = 'pending'` (hard delete — no soft delete) |
| Invite tokens | All invite tokens for the hosteler are deleted (cascade or explicit delete before row delete) |
| Response | `{ "deleted": true }` — no hosteler object returned (row is gone) |
| Deleted tab | Not affected — pending hard deletes produce no deleted-tab entry |
| Auth user | Pending hostelers have no activated `auth_user_id`; no Supabase Auth user cleanup is required |
| PIN attempts | No PIN attempts exist for pending hostelers — no cleanup required |
| Food preferences | No food preferences exist for pending hostelers — no cancellation logic required |
| Idempotency | If the row is not found (already deleted or never existed), return HTTP 404 |

The route must re-verify `status = 'pending'` server-side before issuing the DELETE. If the status is anything other than `pending`, the request must be rejected with HTTP 400 to prevent accidental hard delete of non-pending hostelers.

### API Design: Mobile Number Uniqueness Validation

**`POST /api/hostelers`** — add hosteler validation:

| Case | DB state | API behavior |
|------|----------|--------------|
| Phone matches `status = 'active'` row | Row exists | Reject HTTP 409: `"This mobile number is already registered to an active hosteler."` |
| Phone matches `status = 'pending'` row | Row exists | Reject HTTP 409: `"This mobile number is already registered to a pending hosteler."` |
| Phone matches hard-deleted pending hosteler | No row (hard delete removed it) | Allow — no conflict; natural re-registration |
| Phone matches `status = 'inactive'` row | Row exists | DB UNIQUE constraint blocks insert; return generic HTTP 409 |
| Phone matches `status = 'deleted'` (from active) row | Row exists | DB UNIQUE constraint blocks insert; return generic HTTP 409 |
| No existing row for phone | No row | Allow — insert proceeds normally |

**Explicit API-layer check** runs before the DB insert:

1. Query `hostelers` where `phone = $phone AND status IN ('active', 'pending')`.
2. If a row is found, return HTTP 409 with the status-aware error message.
3. If no row is found, proceed with the insert.
4. The DB UNIQUE constraint catches any remaining race conditions or inactive/deleted-phone collisions, returning a generic HTTP 409 in those paths.

This pre-check ensures the owner receives a clear, actionable error for the operationally meaningful cases (active and pending conflicts) while the DB constraint remains the safety net for all other collision scenarios.

### UI Implications

**Pending delete confirmation dialog**:
- Must explicitly state the action is permanent, irreversible, and leaves no record.
- Recommended dialog message: *"This hosteler will be permanently deleted. Their invite link will be invalidated and no record will be retained. This action cannot be undone."*
- A single destructive-styled "Delete permanently" confirm button is sufficient; no secondary confirmation step is required.
- Unlike active-delete, there is no preservation summary — there is nothing to preserve.

**Deleted tab**:
- Shows only records from active-hosteler soft deletes (`deleted_from_status = 'active'`).
- Never shows pending-deleted hostelers (they no longer exist in the DB).
- The `deleted` count returned by `GET /api/hostelers` counts only soft-deleted rows (`status = 'deleted'`), which excludes all hard-deleted pending records.

**Add hosteler form**:
- On HTTP 409 with a status-aware error, display the exact error message inline on the phone field.
- No special UI handling is needed for re-registration of hard-deleted-pending numbers — the form behaves as a normal successful insert.

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Accidental hard delete of a non-pending hosteler | Route must re-verify `status = 'pending'` server-side before issuing DELETE; return 400 if mismatch |
| Race condition: two registrations with the same phone submitted simultaneously | DB UNIQUE constraint catches any race after the API-layer pre-check; conflicting commits cannot both succeed |
| Cascade delete not configured for `invite_tokens` | Explicitly delete invite tokens before the hosteler row in the route handler, or confirm `ON DELETE CASCADE` is present in the existing migration |
| Soft-delete code paths accidentally executing for pending | The PATCH handler must branch on `hosteler.status`: hard delete path for `'pending'`, soft delete path for `'active'` |

### Artifact Updates Required

| Artifact | Change needed |
|----------|---------------|
| `contracts/hostelers.md` | Update `PATCH /api/hostelers/[id]` pending-delete response to `{ "deleted": true }` instead of a hosteler object with `status: 'deleted'`; add note that no deleted-tab entry is created |
| `contracts/hostelers.md` | Update `POST /api/hostelers` Response 409 to document the status-aware error message variants for active vs. pending conflicts |
| `data-model.md` | Annotate `pending -> deleted` state transition as a hard delete (row removed), not a transition to `status = 'deleted'` |
| `data-model.md` | Add a note that `deleted_from_status` and `deletion_effective_date` are only written for active-deletion soft-delete records |

**Checkpoint**: Pending hosteler DELETE removes the row entirely with no deleted-tab entry; active-deletion soft-delete path is unchanged; add-hosteler API returns status-aware HTTP 409 for active/pending phone conflicts; hard-deleted pending numbers can be re-registered without error; DB UNIQUE constraint remains as the safety net for all other cases.

---

## Phase 16: User Story 12 — Server-Side Auth Proxy for Reliable Login (Priority: P3)

**Goal**: Route owner email/password login and hosteler PIN login through server-side Next.js API routes instead of direct browser-to-Supabase calls, eliminating CORS and network failures in corporate proxy environments

**Motivation**: Corporate proxy environments (common in PG/hostel WiFi networks) can block direct browser-to-Supabase TLS connections. By proxying auth through the Next.js server (which runs on Cloudflare Edge with reliable outbound connectivity), login works regardless of client network restrictions.

**Independent Test**: Owner logs in through the real owner login UI and `/api/auth/login` proxy route → post-login client effects settle → reload remains on the admin surface → hosteler logs in through the real PIN login UI and `/api/auth/pin/verify` → post-login client effects settle → reload remains on the hosteler surface → both paths return the expected session cookies and no direct browser-to-Supabase auth call is required for login. Direct cookie/localStorage injection is not accepted as the core proof.

### Scope

| Change | Description |
|--------|-------------|
| New route: `POST /api/auth/login` | Server-side owner email/password authentication via Supabase API; returns session cookies |
| Update: `POST /api/auth/pin/verify` | Already exists; extend to handle the full auth flow server-side (currently creates session but client still calls Supabase directly in some paths) |
| Update: Admin login page | Replace direct `supabase.auth.signInWithPassword()` with `fetch('/api/auth/login')` |
| Update: Hosteler login page | Replace any remaining direct Supabase auth calls with `fetch('/api/auth/pin/verify')` |
| Server-side TLS & retry | Add retry logic (1 retry with exponential backoff) on the server-side Supabase calls to handle transient network failures |
| Session management | **No change** — cookies are set the same way (`sb-access-token`, `sb-refresh-token`); downstream middleware and guards remain unchanged |

### Technical Approach

1. **`POST /api/auth/login`** (new route at `src/app/api/auth/login/route.ts`):
   - Accept `{ email, password }` in request body
   - Call `supabase.auth.signInWithPassword()` server-side using the Supabase server client
   - On success: set `sb-access-token` and `sb-refresh-token` cookies, return `{ success: true, redirectTo: '/admin/dashboard' }`
   - On failure: return appropriate error (invalid credentials, rate limited)
   - Edge Runtime compatible; no Node.js dependencies

2. **`POST /api/auth/pin/verify`** (update existing route at `src/app/api/auth/pin/verify/route.ts`):
   - Already handles PIN verification and session creation server-side
   - Ensure no client-side fallback path exists that bypasses the API route
   - Add consistent error response structure matching `/api/auth/login`

3. **Admin login page** (`src/app/(auth)/admin/login/page.tsx`):
   - Replace `supabase.auth.signInWithPassword()` call with `POST /api/auth/login`
   - Handle API response (redirect on success, show error on failure)
   - Remove direct Supabase client auth import if no longer needed

4. **Hosteler login page** (`src/app/(auth)/login/page.tsx`):
   - Verify PIN login path uses only `/api/auth/pin/verify` (no direct Supabase calls)
   - Google OAuth flow remains unchanged (already uses server callback at `/api/auth/callback`)

5. **Retry logic** (shared utility in `src/lib/auth/retry.ts` or inline):
   - Wrap server-side Supabase auth calls with 1 retry on network/timeout errors
   - Exponential backoff: 500ms delay before retry
   - Only retry on transient errors (network timeout, 5xx); do not retry on 4xx (invalid credentials)

6. **TLS configuration**:
   - Cloudflare Edge Runtime handles TLS natively; no additional configuration needed
   - Supabase client on server-side uses HTTPS by default
   - No custom certificate pinning required (standard CA trust)

### Dependencies

- Depends on Phase 2 (Foundational) — auth framework must exist
- Depends on Phase 4 (US4) — PIN verify route must exist
- No dependency on billing, food, or hosteler management stories
- Can run in parallel with Phases 9–12 (US6, US7, US8, US9)

### What Does NOT Change

- Cookie names and structure
- Middleware auth checks
- Session duration (30-day hosteler, 7-day owner)
- Google OAuth flow (already server-side via `/api/auth/callback`)
- RLS policies
- Any other API routes

### Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Breaking existing login flows during migration | Both direct and proxy paths can coexist during development; E2E tests validate end-to-end |
| Edge Runtime compatibility of retry logic | Use standard `setTimeout`/`fetch` — no Node.js timers needed |
| Cookie domain mismatch if proxy sets cookies differently | Use identical `Set-Cookie` headers as current direct flow |

**Checkpoint**: All login flows route through server-side API routes; corporate proxy environments no longer block authentication; E2E login tests pass unchanged

---

## Phase 17: Honest E2E Audit & Correction (Cross-Cutting)

**Goal**: Audit completed and future Playwright suites against Constitution XI and FR-066 through FR-069, then correct any weak evidence before the related story or phase is treated as complete.

**Scope**:

| Evidence Area | Required Proof |
|---------------|----------------|
| Exact business outcomes | Each story E2E asserts a falsifiable domain result from the story's independent test, not only route reachability, rendered headings, or broad placeholder text |
| Real app path | Tests exercise the real UI and real Next.js API routes for the behavior under test; direct DB writes are setup/teardown only and do not replace the core action |
| Cross-role producer-to-consumer | Food submission/dashboard tests submit exact meal choices through the hosteler UI, then verify exact owner counts and Pending/Submitted membership |
| Owner dashboard stability | Owner dashboard evidence covers initial fetch, live update, and reload-stable state with exact counts and list membership |
| Auth reload stability | Owner and hosteler login tests use the real login UI and server-side routes, wait for client effects, reload, and remain on the correct authenticated role surface |
| PIN lockout | Hosteler PIN tests cover five failed attempts, 15-minute lockout, correct-PIN rejection during lockout, and success after cooldown or deterministic reset |
| Per-story scripts | Story-scoped scripts exist for US1 through US12, including `test:us12`, and run the relevant honest E2E suite plus any story-specific unit coverage |
| Scoped performance acceptance | SC-001 uses representative browser/manual timing for login-and-submit under 30 seconds; SC-010 uses seeded up-to-100-hosteler evidence and representative submission/dashboard checks |

**Phase Planning Rules**:

1. Audit already completed E2E suites (`us1`, `us2`, `us3`, `us4`, `us5`, `us10`, and `us12`) before marking the post-clarification plan complete for implementation.
2. Correct any suite that would pass while the core workflow is broken; add deterministic setup rather than conditional skips when time/state would otherwise block the core path.
3. Add or refresh missing story-scoped npm scripts for US6 through US12, including `test:us12`.
4. For future story phases, include the honest E2E proof in the same phase as the implementation task; do not defer acceptance evidence to final polish.
5. Run `npm run test:run`, the affected `npm run test:usN` command, `npm run test:e2e`, and `npm run build:cloudflare` before declaring the audited or deployment-ready scope complete.

**Checkpoint**: Existing and future E2E suites satisfy Constitution XI and FR-066 through FR-069; weak tests are corrected, story-scoped scripts include US12, and acceptance evidence covers exact business outcomes, cross-role proof, dashboard reload stability, auth reload stability, PIN lockout, and scoped SC-001/SC-010 performance evidence.

---

## Phase 18: Android Mobile App Experience Remediation & Validation (Cross-Cutting)

**Goal**: Treat Android mobile as the primary experience for completed user-facing screens, correcting any layout that behaves like a broken desktop shrink-down and validating applicable screens in installed/standalone PWA context.

**Scope**:

| Evidence Area | Required Proof |
|---------------|----------------|
| Android primary layout | Completed owner, hosteler, and auth screens are validated at the 375 px Android mobile baseline |
| No horizontal overflow | Pages do not create page-level horizontal scrolling, clipped primary content, overlapping controls, or hidden primary actions |
| Mobile app navigation | Owner and hosteler role destinations remain reachable without desktop-only sidebars, hover interactions, or off-screen controls |
| Touch and readability | Controls are touch-friendly, text is readable without pinch zoom, and dense data reflows or wraps without breaking the viewport |
| Stable viewport behavior | Android Chrome browser chrome, standalone PWA mode, virtual keyboard, modal positioning, offline/online states, and safe-area spacing do not obstruct core tasks or trigger layout jumps that hide primary actions |
| Core hosteler flow | Login, dashboard review, food preference submission, confirmation, and dashboard return complete at 375 px and in standalone PWA context where applicable |
| Core owner flow | Login, dashboard count review, pending/submitted review, hosteler management actions, and settings updates complete at 375 px and in standalone PWA context where applicable |

**Phase Planning Rules**:

1. Inventory completed user-facing screens before remediation so validation scope is explicit.
2. Correct shared role navigation shells before screen-specific layout fixes, because shell behavior controls most mobile reachability failures.
3. Add automated mobile viewport evidence for page-level overflow, clipped content, overlapping controls, touch target reachability, and primary-action reachability where the browser test environment can prove it.
4. Record manual Android Chrome and installed/standalone PWA evidence for flows that cannot be fully proven by automated browser tests, including owner and hosteler core workflows launched from the installed app where applicable.
5. Keep the existing Honest E2E and Cloudflare build parity gates intact: run the relevant story/mobile E2E commands, `npm run test:run`, `npm run test:e2e`, and `npm run build:cloudflare` before declaring the mobile experience accepted.

**Phase 18 consistency note**: Phase 18 / US13 is a planning and validation gate for completed user-facing screens, not permission to change business behavior. Any mobile remediation must preserve the existing story contracts in `spec.md`, the task order in `tasks.md`, and the honest E2E/Cloudflare parity evidence requirements from Phase 17.

**Checkpoint**: Android mobile validation passes for completed user-facing screens, applicable standalone PWA validation passes, and the app can be used as a stable mobile app for the documented owner and hosteler core flows.

---

## Phase 19: Billing and Owner Management Features (User Stories 14–21)

**Updated**: 2026-07-10 | **Scope**: Building/Room Management, Rate History Tracking, Billing Generation, Employee Management, Profit Dashboard, Available Cot Dashboard

### Overview

Phases 19–24 implement the comprehensive billing and operational management suite for owners (US14–US21). These stories introduce multi-property infrastructure (buildings, rooms, cots), rate history tracking with effective-date support (room rent, meal rates, salaries), two-phase billing (generate → review → transmit), employee salary management, profit margin calculation with month-aware rate lookups, and cot occupancy visibility. Each phase builds on the foundational hosteler and food submission infrastructure (US1–US5) and can run in parallel with authentication hardening (US12) and mobile validation (US13).

### Data Model Architecture

#### New Core Entities

1. **Building**: Organizational grouping of rooms
   - Fields: `id` (uuid), `owner_id` (uuid, FK), `name` (text), `description` (text, nullable), `created_at`, `updated_at`
   - Constraints: `(owner_id, name)` unique (one owner cannot have duplicate building names)

2. **Room**: Rentable unit within a building
   - Fields: `id` (uuid), `building_id` (uuid, FK), `room_number` (text), `floor` (enum: 'ground'|'first'|'second'|null), `room_type_id` (uuid, FK), `current_rent` (numeric, decimal(10,2)), `created_at`, `updated_at`
   - Constraints: `(building_id, room_number)` unique
   - Note: `current_rent` denotes the active rent; historical changes are tracked in `room_rent_rate_history`

3. **RoomType**: Classification for groups of identical rooms
   - Fields: `id` (uuid), `owner_id` (uuid, FK), `name` (text, e.g., "2-sharing AC"), `description` (text, nullable), `base_rent` (numeric, decimal(10,2)), `cot_count` (integer), `created_at`, `updated_at`
   - Constraints: `(owner_id, name)` unique
   - Note: `base_rent` is a reference value; actual room rent is stored separately per room

4. **Cot**: Bed/sleeping unit within a room
   - Fields: `id` (uuid), `room_id` (uuid, FK), `cot_id_label` (text, e.g., "L1", "U2"), `cot_type` (enum: 'lower_cot'|'upper_cot'), `hosteler_id` (uuid, FK, nullable), `created_at`, `updated_at`
   - Constraints: `(room_id, cot_id_label)` unique
   - Note: When a hosteler is deactivated or deleted, `hosteler_id` is set to null

5. **RoomTypeHistory** (Q6 Clarification - Future/Current-Date Only Effective Dates): Immutable audit trail of room type attribute changes
   - Fields: `id` (uuid), `room_type_id` (uuid, FK), `old_base_rent` (numeric, decimal(10,2), nullable), `new_base_rent` (numeric, decimal(10,2)), `old_cot_count` (integer, nullable), `new_cot_count` (integer), `effective_date` (date), `created_by` (uuid, FK to owner), `created_at` (timestamp)
   - Constraints: `(room_type_id, effective_date)` unique (one change per room type per date); `effective_date >= today()` (no retroactive changes per Q6)
   - Note: Immutable record; never updated/deleted; INSERT-only after `effective_date`. Historical lookups return the room type attributes effective on a given date for accurate multi-date billing. Owner UI prevents past-date selection via date picker validation and API layer rejects effective_date < today() with HTTP 400 "Effective date cannot be in the past"
   - Billing Impact: When generating a bill, room type changes are consulted via historical lookup; bills use the room type (and thus base_rent, cot_count) effective on each billing day

6. **RoomRentRateHistory**: Immutable audit trail of room rent changes
   - Fields: `id` (uuid), `room_id` (uuid, FK), `old_rent` (numeric, decimal(10,2), nullable), `new_rent` (numeric, decimal(10,2)), `effective_date` (date), `created_by` (uuid, FK to owner), `created_at` (timestamp)
   - Constraints: `(room_id, effective_date)` unique (one rate change per room per date)
   - Note: Immutable record; never updated; only inserted for audit trail

7. **MealRateRateHistory**: Immutable audit trail of meal rate changes
   - Fields: `id` (uuid), `meal_type` (enum: 'breakfast'|'lunch'|'dinner'), `old_rate` (numeric, decimal(10,2), nullable), `new_rate` (numeric, decimal(10,2)), `effective_date` (date), `created_by` (uuid, FK to owner), `created_at` (timestamp)
   - Constraints: `(meal_type, effective_date)` unique (one rate change per meal per date)
   - Note: Single table covers all three meal types; queries filter by `meal_type`

8. **Employee**: Hostel staff member record
   - Fields: `id` (uuid), `owner_id` (uuid, FK), `name` (text), `job_description` (text), `current_salary` (numeric, decimal(10,2)), `active` (boolean, default true), `created_at`, `updated_at`
   - Note: `current_salary` is the active salary; historical changes tracked in `employee_salary_history`

9. **EmployeeSalaryHistory**: Immutable audit trail of employee salary changes
   - Fields: `id` (uuid), `employee_id` (uuid, FK), `old_salary` (numeric, decimal(10,2), nullable), `new_salary` (numeric, decimal(10,2)), `effective_date` (date), `created_by` (uuid, FK to owner), `created_at` (timestamp)
   - Constraints: `(employee_id, effective_date)` unique
   - Note: Immutable; never updated

10. **MonthlyBill**: Two-phase billing record (generated, then transmitted)
   - Fields: `id` (uuid), `hosteler_id` (uuid, FK), `month` (date, first day of month), `status` (enum: 'generated'|'transmitted'), `room_rent_total` (numeric, decimal(10,2)), `meal_charges` (jsonb: `{ breakfast: decimal, lunch: decimal, dinner: decimal }`), `grand_total` (numeric, decimal(10,2)), `generated_at` (timestamp), `transmitted_at` (timestamp, nullable), `created_at`, `updated_at`
   - Constraints: `(hosteler_id, month)` unique (one bill per hosteler per month)
   - Note: On regeneration, old `status='generated'` bills are replaced; `status='transmitted'` bills are soft-replaced (new bill created in 'generated' status)

11. **LineItemExpense**: One-time expenses added to profit dashboard
    - Fields: `id` (uuid), `owner_id` (uuid, FK), `month` (date, first day of month), `description` (text), `amount` (numeric, decimal(10,2)), `expense_date` (date, nullable, within the month), `created_at`, `updated_at`
    - Constraints: None (multiple expenses per month allowed)

12. **MessFacilityAssignment**: Configuration for each hosteler (availing mess or not)
    - Fields: `id` (uuid), `hosteler_id` (uuid, FK), `availing_mess` (boolean, default true), `created_at`, `updated_at`
    - Constraints: `hosteler_id` unique (one assignment per hosteler)
    - Note: Embedded in hosteler form during registration; can be updated later

#### Existing Entity Extensions

1. **Hostelers** table: Add columns
   - `building_id` (uuid, FK, nullable)
   - `room_id` (uuid, FK, nullable)
   - `cot_id` (uuid, FK, nullable)
   - `availing_mess` (boolean, default true)
   - Note: When registering a hosteler, owner assigns them to a specific building, room, and cot

2. **FoodPreferences** table: Add columns
   - `canceled_by_deletion` (boolean, default false)
   - Note: Used to track when active-deletion cancels future-dated preferences; excluded from normal owner history/export

3. **Settings** table: No changes needed (already supports deadline and meal rates)

### Data Model Relationships Diagram

```
Building 1──N Room
           │
           └──N RoomType

Room 1──N Cot
    │
    └──1 RoomType

RoomType 1──N Room
        │
        └──1 RoomTypeHistory (audit trail - Q6 clarification)

Room ──┬── RoomRentRateHistory (audit trail)
       │
       └── Cot (occupancy)

Hosteler ──┬── Cot (assigned cot, nullable)
           ├── Room (assigned room, nullable)
           ├── Building (assigned building, nullable)
           └── MessFacilityAssignment

FoodPreferences ──── Hosteler
                 (canceled_by_deletion flag)

Employee ──┬── EmployeeSalaryHistory (audit trail)
           └── Owner

MonthlyBill ──── Hosteler

LineItemExpense ──── Owner

MealRateRateHistory ──── (global, not per-owner)
                      (breakfast, lunch, dinner)

RoomTypeHistory ──── RoomType (audit trail - Q6 clarification)
```

### Rate History & Effective-Date Lookup Patterns

**Room Type Lookup for a Specific Date** (Q6 Clarification):
```sql
SELECT new_base_rent, new_cot_count FROM room_type_history
WHERE room_type_id = $room_type_id
  AND effective_date <= $lookup_date
ORDER BY effective_date DESC
LIMIT 1;
```

**Room Rent Lookup for a Specific Date**:
```sql
SELECT new_rent FROM room_rent_rate_history
WHERE room_id = $room_id
  AND effective_date <= $lookup_date
ORDER BY effective_date DESC
LIMIT 1;
```

**Meal Rate Lookup for a Specific Date**:
```sql
SELECT new_rate FROM meal_rate_rate_history
WHERE meal_type = $meal_type
  AND effective_date <= $lookup_date
ORDER BY effective_date DESC
LIMIT 1;
```

**Employee Salary Lookup for a Specific Date**:
```sql
SELECT new_salary FROM employee_salary_history
WHERE employee_id = $employee_id
  AND effective_date <= $lookup_date
ORDER BY effective_date DESC
LIMIT 1;
```

**Bill Calculation for Month**:
For each day in the month:
1. Look up meal rate effective for that day
2. Count hosteler's meal preferences for that day
3. Calculate daily meal charge: sum of (opted_count × day_rate) for each meal
4. Look up room rent effective for that day
5. Add daily room rent to total
6. Sum all days in the month

### Bill Transmission & Visibility

**Generate Phase**:
- Owner clicks "Generate Bill" → selects scope (All/Building/Individual) and month
- System queries `food_preferences` for that month (excluding `canceled_by_deletion=true` rows)
- For each hosteler with food preferences or active room assignment:
  - Calculate room rent total: SUM(daily_room_rent) for each day in month
  - Calculate meal charges: SUM(daily_meal_charges) for each day in month
  - Create `monthly_bill` record with `status='generated'`
  - Bill is NOT visible to hosteler

**Review Phase**:
- Owner can click on bill to view detailed breakdown (per-day charges, meal counts, room rent)
- Owner can manually review for accuracy before transmission

**Transmission Phase**:
- Owner clicks "Transmit Bill" → sets `status='transmitted'`, `transmitted_at=now()`
- Bill becomes immediately visible to hosteler via `GET /api/billing/bill/[id]`

**Regeneration**:
- If owner regenerates bills for same month:
  - Existing `status='generated'` bills are replaced (delete and recreate)
  - Existing `status='transmitted'` bills are preserved, but new `status='generated'` bill is created for that month
  - Next transmit replaces the transmitted version

### API Design Overview

#### Building & Room Management

**`POST /api/buildings`** — Create building
- Body: `{ name, description? }`
- Response: `{ id, owner_id, name, description, created_at }`
- Validation: `(owner_id, name)` must be unique

**`GET /api/buildings`** — List all buildings for owner
- Query: none
- Response: `{ buildings: [ { id, name, description, rooms: [ ... ] } ] }`
- Note: Hierarchical response includes rooms within each building

**`POST /api/buildings/[id]/rooms`** — Add room to building
- Body: `{ room_number, floor?, room_type_id, rent }`
- Response: `{ id, building_id, room_number, floor, room_type_id, current_rent, cots: [ ... ] }`
- Validation: `(building_id, room_number)` unique

**`POST /api/room-types`** — Define room type
- Body: `{ name, description?, base_rent, cot_count }`
- Response: `{ id, owner_id, name, description, base_rent, cot_count }`
- Validation: `(owner_id, name)` unique

**`POST /api/room-types/[id]/cots`** — Configure cots within room type
- Body: `{ cot_id_label, cot_type }`
- Response: `{ id, room_id, cot_id_label, cot_type, hosteler_id }`

#### Rate Management

**`POST /api/rooms/[id]/rent-change`** — Initiate room rent change with effective date
- Body: `{ new_rent, effective_date }`
- Response: `{ id, room_id, new_rent, effective_date, status: 'pending' }`
- Note: Inserts into `room_rent_rate_history` on effective date passing; no update to historical records

**`POST /api/meal-rates/change`** — Initiate meal rate change
- Body: `{ meal_type, new_rate, effective_date }`
- Response: `{ id, meal_type, new_rate, effective_date, status: 'pending' }`

**`GET /api/meal-rates`** — Get current meal rates
- Response: `{ breakfast: decimal, lunch: decimal, dinner: decimal }`

#### Billing

**`POST /api/billing/generate`** — Trigger bill generation
- Body: `{ scope: 'all'|'building'|'hosteler', scope_id?, month }`
- Response: `{ generated_count, bills: [ { hosteler_id, hosteler_name, total, status: 'generated' } ] }`
- Behavior: Creates `monthly_bill` records with `status='generated'`

**`GET /api/billing/bills`** — List all bills for selected month
- Query: `?month=YYYY-MM-DD`
- Response: `{ bills: [ { id, hosteler_name, total, status, generated_at, transmitted_at? } ] }`
- Note: Shows both 'generated' and 'transmitted' to owner

**`GET /api/billing/bills/[id]`** — View bill detail (owner or hosteler)
- Owner: Always sees bill (any status)
- Hosteler: Only sees `status='transmitted'` bills
- Response: `{ id, hosteler_id, month, room_rent_total, meal_charges, grand_total, per_day_breakdown: [ ... ], status, generated_at, transmitted_at? }`

**`PATCH /api/billing/bills/[id]`** — Transmit bill
- Body: `{ action: 'transmit' }`
- Response: `{ status: 'transmitted', transmitted_at }`
- Behavior: Sets `status='transmitted'`, `transmitted_at=now()`

#### Employee Management

**`POST /api/employees`** — Add employee
- Body: `{ name, job_description, salary }`
- Response: `{ id, owner_id, name, job_description, current_salary }`

**`POST /api/employees/[id]/salary-change`** — Update employee salary
- Body: `{ new_salary, effective_date }`
- Response: `{ id, employee_id, new_salary, effective_date }`
- Behavior: Inserts into `employee_salary_history`

**`GET /api/employees`** — List all employees
- Response: `{ employees: [ { id, name, job_description, current_salary, pending_changes: [ ... ] } ] }`

#### Profit Dashboard

**`GET /api/profit-dashboard`** — Load profit dashboard for a month
- Query: `?month=YYYY-MM-DD`
- Response:
  ```json
  {
    month: "2026-07-01",
    income: { room_rent: decimal, meal_charges: decimal, total: decimal },
    expenses: { salaries: decimal, line_items: decimal, total: decimal },
    profit: decimal,
    breakdowns: {
      room_rent_by_hosteler: [ ... ],
      meal_charges_by_type: { breakfast: decimal, lunch: decimal, dinner: decimal },
      salaries_by_employee: [ ... ]
    }
  }
  ```

**`POST /api/profit-dashboard/expenses`** — Add line-item expense
- Body: `{ description, amount, expense_date?, month }`
- Response: `{ id, owner_id, description, amount, expense_date, month }`
- Behavior: Recalculates dashboard profit immediately

#### Available Cot Dashboard

**`GET /api/cots/availability`** — Get cot occupancy status
- Response:
  ```json
  {
    buildings: [ 
      {
        id, name,
        rooms: [
          {
            id, room_number, floor,
            cots: [
              { id, cot_id_label, cot_type, occupancy: 'occupied'|'free', hosteler_name?, hosteler_id? }
            ]
          }
        ]
      }
    ]
  }
  ```

### Implementation Phases (19–24)

#### Phase 19: Building/Room/Cot Infrastructure (US14)

**Goal**: Establish the foundational infrastructure for room inventory and cot assignment

**Deliverables**:
- Database migrations for `buildings`, `rooms`, `room_types`, `cots` tables
- CRUD API routes: building/room/room-type/cot management
- Owner UI: building hierarchy view, room management forms
- Hosteler assignment UI: select building → room → cot during registration
- Validation tests for room uniqueness, cot allocation

**Dependencies**: None (can start immediately after Phase 18)

**Estimated Scope**: 5 tasks

#### Phase 20: Rate History Tracking (US15 & US16)

**Goal**: Implement effective-date-based rate change tracking for room rent and meal rates

**Deliverables**:
- Database migrations for `room_rent_rate_history`, `meal_rate_rate_history` tables
- API routes: rate change endpoints with effective-date pickers
- Owner UI: room rent change forms, meal rate change forms
- "Pending update on [date]" label display until effective date
- Historical rate lookup queries and tests
- Unit tests for prorating and date-based rate application

**Dependencies**: Phase 19 (room structure required for room rent changes)

**Estimated Scope**: 4 tasks

#### Phase 21: Mess Facility Assignment (US17)

**Goal**: Configure whether each hosteler avails mess facilities and set food preference defaults accordingly

**Deliverables**:
- Database column: `hostelers.availing_mess` (boolean, default true)
- API: update mess facility status
- Owner UI: toggle on hosteler registration and management
- Food submission logic: apply defaults based on mess facility status
- Unit tests for default application and override behavior

**Dependencies**: Phase 1 (hosteler registration flow) — can integrate with Phase 19 or run independently

**Estimated Scope**: 2 tasks

#### Phase 22: Bill Generation & Transmission (US18)

**Goal**: Implement two-phase billing (generate → review → transmit)

**Deliverables**:
- Database migrations for `monthly_bills` table
- Billing calculation logic: room rent + meal charges with historical rate lookups
- API routes: generate, list, view, transmit bills
- Owner UI: bill generation dialog, bill review/transmission workflow
- Hosteler UI: bill list and detail view (transmitted only)
- Unit tests for billing calculation, rate application per-day
- E2E tests: generate → review → transmit workflow, hosteler bill visibility

**Dependencies**: Phase 20 (historical rate lookups required for accurate billing)

**Estimated Scope**: 6 tasks

#### Phase 23: Employee Management & Salary History (US19)

**Goal**: Track employee records and salary changes with effective-date support

**Deliverables**:
- Database migrations for `employees`, `employee_salary_history` tables
- CRUD API routes: employee management, salary changes
- Owner UI: employee list, add employee, update salary forms
- "Pending salary update on [date]" labels
- Unit tests for salary history lookups

**Dependencies**: None (independent feature)

**Estimated Scope**: 3 tasks

#### Phase 24: Profit Dashboard & Available Cots (US20 & US21)

**Goal**: Provide owner visibility into financial performance and cot occupancy

**Deliverables**:
- Database queries for income (room rent + meal charges) and expenses (salaries + line items)
- API routes: profit dashboard data, add expense
- Owner UI: profit dashboard with month selector, income/expense/profit display, expense line items, detailed breakdowns
- API route: cot availability dashboard
- Owner UI: available cot dashboard with building/room/cot tree, occupancy status
- Unit tests for profit calculations with historical rate/salary lookups
- E2E tests: dashboard month switching, expense addition, cot occupancy accuracy

**Dependencies**: Phase 20 (historical lookups), Phase 22 (billing records), Phase 23 (employee salaries)

**Estimated Scope**: 5 tasks

### Testing Strategy for US14–US21

#### Unit Tests

**Building/Room/Cot Infrastructure (Phase 19)**:
- Room uniqueness validation per building
- Cot label uniqueness per room
- Cot assignment and deassignment logic

**Rate History Tracking (Phase 20)**:
- Rate change creation with effective-date validation
- Historical rate lookup queries (SQL correctness)
- Prorating logic: if rent changes mid-month, bills use the correct rent per day
- Date-range boundary testing (midnight IST, first/last day of month)

**Mess Facility Assignment (Phase 21)**:
- Default food preference application based on availing_mess flag
- Override scenarios (hosteler manually toggling meals despite defaults)

**Bill Generation (Phase 22)**:
- Bill calculation: room rent total + meal charges for a specific month
- Calculation with mid-month rate changes (multi-rate days in one bill)
- Hosteler inclusion/exclusion based on billable history (any food pref or active room assignment)
- Meal count aggregation (days breakfast opted, days lunch opted, etc.)
- Status transitions: generated → transmitted

**Employee Salary History (Phase 23)**:
- Salary history lookups for a specific date
- Pending salary label generation until effective date

**Profit Dashboard (Phase 24)**:
- Income calculation: SUM(room rent) + SUM(meal charges) for a month using historical rates
- Expense calculation: SUM(salaries) + SUM(line items) using historical salaries
- Profit formula: Income − Expenses
- Breakdown detail calculations: per-hosteler rent, per-meal-type charges, per-employee salary
- Month-aware queries (past month lookups use historical rates, not current rates)

#### Component/UI Tests

**Building & Room Management UI (Phase 19)**:
- Room creation form validation and submission
- Building hierarchy rendering
- Hosteler assignment flow

**Rate Change Forms (Phase 20)**:
- Date picker interaction and validation
- Pending-change label visibility until effective date
- Form submission success/error handling

**Bill Generation UI (Phase 22)**:
- Bill generation dialog: scope and month selection
- Bill list rendering and status display
- Bill detail view: per-day breakdown, meal charges, totals
- Transmission workflow

**Profit Dashboard UI (Phase 24)**:
- Month selector and dashboard refresh
- Income/expense/profit card rendering
- Breakdown detail modal or expansion
- Line-item expense form and addition

#### E2E Tests

**Building & Room Setup (Phase 19)**:
- Create building → add rooms → configure cots → assign hosteler
- Verify hierarchy queryable for later hosteler assignment

**Rate Changes with Billing (Phase 20 + Phase 22)**:
- Set future room rent change → advance effective date → generate bill → verify bill uses new rent

**Mess Facility Defaults (Phase 21)**:
- Register hosteler with "NOT availing" mess → submit preferences → verify defaults are OFF
- Register hosteler with "YES availing" mess → submit preferences → verify defaults are ON
- Update hosteler's mess status → submit new preferences → verify new defaults apply

**Bill Generation & Transmission Workflow (Phase 22)**:
- Seed month with hostelers and food preferences
- Generate bill → verify bill is in "Awaiting Transmission" → bill NOT visible to hosteler
- Transmit bill → verify bill is "Transmitted" → bill IS visible to hosteler
- Regenerate bill → verify new bill replaces old in "generated" status

**Employee Salary Tracking (Phase 23)**:
- Add employee with salary
- Create salary change with future effective date
- Verify pending-change label displays until effective date

**Profit Dashboard Month-Awareness (Phase 24)**:
- Seed past month with specific room rent and meal rates
- Seed current month with different rates
- Load dashboard for past month
- Verify dashboard shows past-month rates, not current rates
- Add line-item expense → verify profit recalculates immediately
- Verify breakdown details show correct per-hosteler/per-meal/per-employee amounts

**Available Cot Dashboard (Phase 24)**:
- Assign hostelers to cots → load dashboard → verify cots show "Occupied" with hosteler names
- Deactivate hosteler → refresh dashboard → verify previously assigned cots show "Free"

#### Android Mobile Layout Validation (Tablet-First for Owner Screens)

**Owner Screens (768px+ Tablet Baseline)**:
- Room management table: full width with proper column layout for editing
- Rate change forms: spacious layout with readable input fields
- Bill list: data-dense table for multiple hostelers
- Profit dashboard: cards and charts using full tablet width
- Available cot dashboard: hierarchical tree with adequate spacing

**Hosteler Screens (375px Mobile Baseline)**:
- No impact from owner-focused features; validate existing hosteler screens remain unaffected

#### Automated Hover/Scroll/Overflow Detection

- Add test to verify no page-level horizontal scrolling on owner screens at 1024px width
- Validate button and form control target sizes for touch (44px minimum recommended)
- Verify dense data tables remain readable without pinch zoom

### Deployment & Migration Strategy

#### Database Migrations (Idempotent, Guarded)

**Migration 003: Building/Room Infrastructure**
```sql
-- buildings table
CREATE TABLE IF NOT EXISTS buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  UNIQUE(owner_id, name)
);

-- room_types table
CREATE TABLE IF NOT EXISTS room_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  base_rent numeric(10, 2),
  cot_count integer NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  UNIQUE(owner_id, name)
);

-- rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  room_number text NOT NULL,
  floor text CHECK (floor IN ('ground', 'first', 'second', NULL)),
  room_type_id uuid NOT NULL REFERENCES room_types(id) ON DELETE RESTRICT,
  current_rent numeric(10, 2) NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  UNIQUE(building_id, room_number)
);

-- cots table
CREATE TABLE IF NOT EXISTS cots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  cot_id_label text NOT NULL,
  cot_type text NOT NULL CHECK (cot_type IN ('lower_cot', 'upper_cot')),
  hosteler_id uuid REFERENCES hostelers(id) ON DELETE SET NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  UNIQUE(room_id, cot_id_label)
);

-- Extend hostelers table
ALTER TABLE hostelers ADD COLUMN IF NOT EXISTS building_id uuid REFERENCES buildings(id) ON DELETE SET NULL;
ALTER TABLE hostelers ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES rooms(id) ON DELETE SET NULL;
ALTER TABLE hostelers ADD COLUMN IF NOT EXISTS cot_id uuid REFERENCES cots(id) ON DELETE SET NULL;
ALTER TABLE hostelers ADD COLUMN IF NOT EXISTS availing_mess boolean DEFAULT true;
```

**Migration 004: Rate History Tracking**
```sql
CREATE TABLE IF NOT EXISTS room_rent_rate_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  old_rent numeric(10, 2),
  new_rent numeric(10, 2) NOT NULL,
  effective_date date NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp DEFAULT now(),
  UNIQUE(room_id, effective_date)
);

CREATE TABLE IF NOT EXISTS meal_rate_rate_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_type text NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
  old_rate numeric(10, 2),
  new_rate numeric(10, 2) NOT NULL,
  effective_date date NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp DEFAULT now(),
  UNIQUE(meal_type, effective_date)
);

-- Extend food_preferences table
ALTER TABLE food_preferences ADD COLUMN IF NOT EXISTS canceled_by_deletion boolean DEFAULT false;
```

**Migration 005: Billing & Expenses**
```sql
CREATE TABLE IF NOT EXISTS monthly_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hosteler_id uuid NOT NULL REFERENCES hostelers(id) ON DELETE CASCADE,
  month date NOT NULL,
  status text NOT NULL CHECK (status IN ('generated', 'transmitted')) DEFAULT 'generated',
  room_rent_total numeric(10, 2) DEFAULT 0,
  meal_charges jsonb, -- { breakfast: decimal, lunch: decimal, dinner: decimal }
  grand_total numeric(10, 2) NOT NULL DEFAULT 0,
  generated_at timestamp DEFAULT now(),
  transmitted_at timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  UNIQUE(hosteler_id, month)
);

CREATE TABLE IF NOT EXISTS line_item_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month date NOT NULL,
  description text NOT NULL,
  amount numeric(10, 2) NOT NULL,
  expense_date date,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
```

**Migration 006: Employee Management**
```sql
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  job_description text,
  current_salary numeric(10, 2) NOT NULL,
  active boolean DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_salary_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  old_salary numeric(10, 2),
  new_salary numeric(10, 2) NOT NULL,
  effective_date date NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp DEFAULT now(),
  UNIQUE(employee_id, effective_date)
);
```

#### RLS (Row Level Security) Policies

All owner-facing tables should be protected with RLS policies:

```sql
-- Example for buildings table
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own buildings"
  ON buildings FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Owner can create buildings"
  ON buildings FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owner can update own buildings"
  ON buildings FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Owner can delete own buildings"
  ON buildings FOR DELETE USING (owner_id = auth.uid());
```

Apply similar policies to: `room_types`, `rooms`, `cots`, `monthly_bills`, `line_item_expenses`, `employees`, rate history tables.

#### Test Data Seeding

Update `supabase/seed.sql` to include:
- Test building and rooms
- Test room types and cots
- Test meal rate history with past, current, and future rate changes
- Test employee records with salary history
- Test hostelers assigned to rooms and cots with mess facility settings

#### Backward Compatibility

- Existing hostelers remain unassigned to rooms/cots until explicitly configured
- Existing settings (deadline, meal rates) remain effective; new rate history mechanism doesn't disturb past data
- Bills can be generated retroactively for past months (historical rate lookups apply)

### Feature Flags & Gradual Rollout

**Optional**: Use feature flags to hide US14–US21 admin UI until all phases complete and testing passes:

```typescript
const BILLING_FEATURES_ENABLED = process.env.NEXT_PUBLIC_BILLING_FEATURES === 'true';
```

### Go-Live Checklist

- [ ] All database migrations applied and verified on production Supabase
- [ ] All API routes deployed and responding correctly
- [ ] Owner UI screens validated at 768px tablet baseline
- [ ] All E2E tests passing on production environment
- [ ] Profit dashboard calculates correctly for historical months
- [ ] Bill transmission workflow verified end-to-end
- [ ] Cot assignment and occupancy tracking tested
- [ ] Rate changes and historical lookups verified via test bills
- [ ] Salary history and expense tracking tested in profit dashboard
- [ ] Android mobile UI validation complete for affected screens
- [ ] Build step (`npm run build:cloudflare`) passing without errors
- [ ] Backup and restore procedures tested

---

## Technical Decisions & Rationale

### Why Separate Rate History Tables?

Each meal type (breakfast, lunch, dinner) is global, not per-room. Storing all three in one table (`meal_rate_rate_history`) with a `meal_type` column is simpler than three separate tables. Room rent is per-room, so its own table is appropriate.

### Why Immutable Rate History Records?

Rate history serves as an audit trail. Immutability ensures no accidental overwriting of historical data, and queries always reflect the true effective rates on any given date.

### Why Two-Phase Billing?

The owner needs a review step before hostelers see final amounts, reducing billing disputes and allowing corrections before transmission. This is a common pattern in SaaS billing systems.

### Why Canceled Future Preferences Only in Deleted View?

When an active hosteler is deleted, their future-dated preferences are canceled to stop billing. But these canceled records are valuable audit information — they show what the hosteler submitted before deletion. Keeping them in a dedicated deleted-hosteler audit view (visible only to owner) preserves the audit trail without polluting normal owner history/export/dashboard/billing queries.

### Why No Payment Processing?

Payment collection is out of scope for v1. The bill is a record-keeping and owner communication tool, not a payment mechanism. Future versions can integrate payment gateways.

### Why Month as First Day of Month (not arbitrary date)?

Using `month = 2026-07-01` (first day of month) as the key makes date arithmetic simpler and aligns with calendar month boundaries. Queries for "July billing" filter by `month >= '2026-07-01' AND month < '2026-08-01'`.

---

## Success Criteria for US14–US21

- **SC-018**: Owner creates building, adds rooms with types/floors, configures cots within 5 minutes; structure is queryable for hosteler assignment
- **SC-019**: Room rent change with future effective date shows "Pending" label; after effective date, label disappears and new rent applies to bills
- **SC-020**: Meal rate change with future effective date shows "Pending" label; after effective date, label disappears and new rates apply to bills
- **SC-021**: Bills generated for month with mid-month rate changes apply correct rate per day, not blanket rate
- **SC-022**: Hosteler registered with "NOT availing mess" has OFF defaults; can manually toggle ON
- **SC-023**: Hosteler registered with "YES availing mess" has ON defaults; can manually toggle OFF
- **SC-024**: Owner generates bill, reviews in "Awaiting Transmission", transmits to make visible to hosteler within 2 minutes
- **SC-025**: Bills in "Awaiting Transmission" do not appear in hosteler bill list; only transmitted bills visible
- **SC-026**: Owner adds employees with salary; salary changes with future effective dates show "Pending" labels
- **SC-027**: Profit dashboard for specific month uses rates/salaries effective for that month, not current rates
- **SC-028**: Owner adds line-item expense to dashboard; total expenses and profit recalculate immediately
- **SC-029**: Available-cot dashboard shows all buildings/rooms/cots with occupancy; occupied cots become free when hosteler deactivated/deleted
- **SC-030**: Past month profit dashboard reflects historical rates/salaries from that month, not current rates


