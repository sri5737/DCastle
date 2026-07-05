# Implementation Plan: Deekshana Castle PG Management App (v1.2)

**Branch**: `001-dcastle-pg-management` | **Date**: 2026-07-04 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-dcastle-pg-management/spec.md`

## Summary

A mobile-first true Progressive Web App for Deekshana Castle PG that supports daily food submissions, live owner counts, invite-based activation, recurring login, hosteler lifecycle management, billing, Android installability, and an Android mobile app experience as the primary layout target. The v1.2 planning delta adds owner deletion of pending and active hostelers with owner-visible deleted records, immediate access revocation, preservation of past and same-day tracking and billing history, and cancellation of food preferences dated after the deletion effective date so those rows remain available only inside the deleted hosteler audit view and no longer affect normal owner history/export, future counts, or billing. The honest-E2E planning delta preserves Constitution XI and FR-066 through FR-069 by requiring an audit and correction pass for completed and future stories before any story or phase can be considered accepted. The Constitution v1.6.0 Android mobile app experience delta adds FR-071 through FR-079 and makes Android Chrome at 375 px the primary design baseline for every completed owner, hosteler, and auth screen, with no page-level horizontal overflow, touch-friendly controls, reachable app-like navigation, stable browser/standalone viewport behavior, and installed/standalone PWA validation for applicable owner and hosteler flows.

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

## Complexity Tracking

> No constitution violations detected.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |

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
