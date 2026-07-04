# Implementation Plan: Deekshana Castle PG Management App (v1.2)

**Branch**: `001-dcastle-pg-management` | **Date**: 2026-07-04 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-dcastle-pg-management/spec.md`

## Summary

A mobile-first true Progressive Web App for Deekshana Castle PG that supports daily food submissions, live owner counts, invite-based activation, recurring login, hosteler lifecycle management, billing, and Android installability. The v1.2 planning delta adds owner deletion of pending and active hostelers with owner-visible deleted records, immediate access revocation, preservation of past and same-day tracking and billing history, and cancellation of food preferences dated after the deletion effective date so those rows remain available only inside the deleted hosteler audit view and no longer affect normal owner history/export, future counts, or billing.

## Technical Context

**Language/Version**: TypeScript 5.5, strict mode enabled

**Primary Dependencies**: Next.js 15.3.3 (App Router), React 19, Tailwind CSS, shadcn/ui, `@supabase/supabase-js`, `@ducanh2912/next-pwa`, `@cloudflare/next-on-pages`, `bcryptjs`

**Storage**: Supabase PostgreSQL (free tier) with Row Level Security and Realtime subscriptions

**Testing**: Vitest with `@testing-library/react` for unit/component coverage, Playwright for E2E browser coverage

**Testing Strategy**:
- Unit tests cover invite activation, PIN verification and lockout, deadline enforcement, hosteler lifecycle transitions, deleted-record visibility, future-preference cancellation, and billing eligibility rules.
- E2E tests cover each documented story flow, including pending delete, active delete, deleted-tab visibility, deleted-hosteler audit detail visibility for canceled future preferences, and exclusion of those canceled rows from normal owner history/export, dashboards, and billing inputs.
- PWA checks validate manifest metadata, icon metadata, service worker registration, offline app-shell behavior, and install-prompt gating.
- Manual Android validation remains required for installability, app-drawer presence, standalone launch, and installed offline-shell behavior.
- Existing per-story scripts currently cover `npm run test:us1` through `npm run test:us4`; `/speckit.tasks` should refresh story-scoped scripts so US5 and remaining documented stories have direct coverage commands for the v1.2 scope.
- CI quality gate remains `npm run test:run` and `npm run test:e2e` before build/deploy.

**Target Platform**: Mobile-first true PWA (375 px baseline), Android Chrome installability target, Edge Runtime deployment on Cloudflare Pages

**Project Type**: Full-stack Next.js monolith with App Router and co-located API routes

**Performance Goals**: Food submission interaction completes in under 30 seconds, owner count updates propagate in under 3 seconds, owner can find a deleted record inside the deleted tab in under 30 seconds, and the system supports up to 100 hostelers without paid infrastructure

**Constraints**: Edge Runtime only, zero-cost infrastructure, owner-visible deleted/audit records, deletion-effective-date semantics based on IST calendar date, canceled future food preferences after active deletion must remain visible only in the deleted-hosteler audit view and be excluded from normal owner history/export, dashboard counts, and billing queries, Android Chrome installability, standalone launch, maskable icons, cached offline app shell

**Scale/Scope**: Single-property deployment, about 40 active hostelers at launch and up to 100, owner and hosteler web surfaces in the current Next.js app, plus Supabase-backed API and data model changes for lifecycle and billing history

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | Evidence |
|---|-----------|--------|----------|
| I | Mobile-First | PASS | 375 px baseline, shadcn/ui-first component strategy, owner deleted-tab and confirmation flows remain mobile-first and touch-sized |
| II | Edge Runtime Compatibility | PASS | Route handlers remain Edge-only, lifecycle changes rely on Supabase APIs and SQL state changes rather than Node-only packages |
| III | Security & Data Isolation | PASS | RLS remains mandatory, owner-only deleted-record visibility is preserved, inactive/deleted access is revoked server-side, invite invalidation and PIN/session revocation happen server-side only |
| IV | Server-Side Deadline Enforcement | PASS | Food writes still use server-side IST deadline checks, and active-delete flow cancels future dated rows through server-side lifecycle logic |
| V | Zero-Cost Infrastructure | PASS | No new paid dependencies; lifecycle archive behavior is modeled inside existing Supabase/PostgreSQL data structures |
| VI | TypeScript Strict Mode & Simplicity | PASS | Deleted-record support extends the current hosteler/food-preference model instead of introducing a separate service or paid audit product |
| VII | Unit Testing Coverage | PASS | Plan explicitly adds coverage for deletion, archived visibility, future-preference cancellation, and billing inclusion/exclusion rules |
| VIII | CI/CD Pipeline with Isolated Test Job | PASS | Existing `test -> build -> deploy` pipeline remains unchanged and still gates deploy on tests |
| IX | Idempotent Database Migrations | PASS | v1.2 requires additive guarded migration updates for deleted lifecycle metadata and cancelable food-preference rows; no destructive migration strategy is required |
| X | True Progressive Web App | PASS | PWA scope is unchanged and remains validated independently of the lifecycle additions |

**Gate Result**: ALL PASS. The v1.2 deletion/archive behavior fits the constitution through additive schema and contract updates inside the existing Next.js plus Supabase architecture.

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

**Independent Test**: Owner logs in via proxy route → session established → hosteler logs in via proxy route → session established → both paths return identical cookies as before → direct Supabase calls from client are no longer required for login

### Scope

| Change | Description |
|--------|-------------|
| New route: `POST /api/auth/login` | Server-side owner email/password authentication via Supabase Admin API; returns session cookies |
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
