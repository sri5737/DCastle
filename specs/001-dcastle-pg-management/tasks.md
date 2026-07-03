# Tasks: Deekshana Castle PG Management App

**Input**: Design documents from `/specs/001-dcastle-pg-management/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing. Auth stories (US3, US4) are ordered before US1 due to hard dependency — hostelers must be able to activate and log in before submitting food preferences.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Single Next.js monolith with App Router
- Source: `src/` at repository root
- Infrastructure: `.github/`, `supabase/`, root config files

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependencies, configuration files

- [x] T001 Initialize Next.js 14 project with TypeScript (`strict: true` in tsconfig.json), Tailwind CSS, and App Router in project root (`package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`, `postcss.config.js`)
- [x] T002 Install all dependencies: `@supabase/supabase-js`, `@ducanh2912/next-pwa`, `@cloudflare/next-on-pages`, `bcryptjs`, `shadcn/ui` init, `vitest`, `@testing-library/react`, `@types/bcryptjs`
- [x] T003 [P] Configure `next.config.js` with `@ducanh2912/next-pwa` wrapper and `@cloudflare/next-on-pages` adapter settings
- [x] T004 [P] Create `.env.example` with all required environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
- [x] T005 [P] Configure Vitest in `vitest.config.ts` with path aliases and jsdom environment
- [x] T006 [P] Create root layout with Tailwind globals and PWA meta tags in `src/app/layout.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, Supabase configuration, shared types, auth framework, and middleware that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

**Constitution Note**: All API route files (`route.ts`) MUST include `export const runtime = 'edge'` at the top. Use only Edge-compatible packages (bcryptjs, Web Crypto API). No Node.js-only imports.

- [x] T007 Create Supabase SQL migration with all tables (`hostelers`, `invite_tokens`, `food_preferences`, `meal_rates`, `monthly_bills`, `settings`), indexes, constraints, and RLS policies in `supabase/migrations/001_initial_schema.sql`
- [x] T008 Create seed SQL with default settings (`deadline_time = '21:00'`) and initial meal rates (breakfast ₹30, lunch ₹50, dinner ₹40) in `supabase/seed.sql`
- [x] T009 [P] Create Supabase browser client helper (anon key) in `src/lib/supabase/client.ts`
- [x] T010 [P] Create Supabase server client helper (service role, Edge-compatible) in `src/lib/supabase/server.ts`
- [x] T011 [P] Define all shared TypeScript types and interfaces (Hosteler, FoodPreference, MealRate, MonthlyBill, Settings, API response types) in `src/types/index.ts`
- [x] T012 [P] Create deadline validation utility (IST time comparison using `Intl.DateTimeFormat`) in `src/lib/deadline.ts`
- [x] T013 [P] Create shared utility functions (IST date helpers, `getTomorrowDate()`, format helpers) in `src/lib/utils.ts`
- [x] T014 Create auth session management helpers (get session, get user role, verify owner) in `src/lib/auth/session.ts`
- [x] T015 Create auth guard utilities (requireHosteler, requireOwner, requireAuth) in `src/lib/auth/guards.ts`
- [x] T016 Create Next.js middleware for auth-based route protection and redirects in `src/middleware.ts`
- [x] T017 [P] Create owner login page (email/password form via Supabase Auth) in `src/app/(auth)/admin/login/page.tsx`
- [x] T018 [P] Create owner layout shell with navigation and auth guard in `src/app/(owner)/layout.tsx`
- [x] T019 [P] Create hosteler layout shell with navigation and auth guard in `src/app/(hosteler)/layout.tsx`
- [x] T020 [P] Create landing page with role-based redirect logic in `src/app/page.tsx`
- [x] T021 [P] Initialize shadcn/ui components (Button, Card, Input, Toggle, Tabs, Dialog, Badge, Table) in `src/components/ui/`
- [x] T022 Implement `GET /api/settings` endpoint (returns deadline_time and current rates) in `src/app/api/settings/route.ts`

**Checkpoint**: Foundation ready — database deployed, auth framework in place, user story implementation can begin

---

## Phase 3: User Story 3 — New Hosteler Activates Account via Invite Link (Priority: P2) 🔑

**Goal**: Owner registers a hosteler, generates an invite link; hosteler opens link and activates via Google OAuth or 4-digit PIN

**Independent Test**: Owner adds hosteler → copies invite link → hosteler opens link → activates via Google or PIN → hosteler is redirected to dashboard

**Why before P1**: Hostelers cannot submit food preferences (US1) without first having an activated account

### Implementation for User Story 3

- [x] T023 [US3] Implement `POST /api/hostelers` endpoint (create hosteler with pending status + generate invite token) in `src/app/api/hostelers/route.ts`
- [x] T024 [US3] Implement `POST /api/invite/generate` endpoint (generate/regenerate invite token, invalidate previous) in `src/app/api/invite/generate/route.ts`
- [x] T025 [US3] Implement `POST /api/invite/activate` endpoint (validate token, activate via Google or PIN, create Supabase Auth user, return session) in `src/app/api/invite/activate/route.ts`
- [x] T026 [US3] Implement `GET /api/auth/callback` route (Google OAuth callback handler for Supabase Auth redirect flow) in `src/app/api/auth/callback/route.ts`
- [x] T027 [US3] Create invite activation page with welcome message, Google sign-in button, and PIN setup form in `src/app/(auth)/join/[token]/page.tsx`
- [x] T028 [US3] Add invite token validation logic (check expiry, used status) and display error states (expired, already used) on the activation page in `src/app/(auth)/join/[token]/page.tsx`
- [x] T028b [US3] Write unit tests for invite token validation (expiry, reuse rejection), PIN hashing with bcryptjs, and Google OAuth account linking in `src/app/api/invite/activate/route.test.ts`

**Checkpoint**: Owner can register hostelers and hostelers can activate their accounts via invite links

---

## Phase 4: User Story 4 — Hosteler Logs In on Subsequent Visits (Priority: P2) 🔑

**Goal**: Returning hostelers sign in via Google or phone+PIN with 30-day session persistence

**Independent Test**: Activate an account → close browser → reopen → log in via both methods → verify access and 30-day session

### Implementation for User Story 4

- [x] T029 [US4] Implement `POST /api/auth/pin/verify` endpoint (validate phone + PIN against hostelers.pin_hash, create Supabase session) in `src/app/api/auth/pin/verify/route.ts`
- [x] T030 [US4] Create hosteler login page with Google sign-in and phone+PIN form in `src/app/(auth)/login/page.tsx`
- [x] T031 [US4] Implement unregistered Google account rejection (display "not registered" message when Google ID has no matching hosteler) in `src/app/(auth)/login/page.tsx`
- [x] T032 [US4] Configure Supabase Auth session expiry to 30 days for hostelers and 7 days for owner in `src/lib/auth/session.ts`
- [x] T032b [US4] Write unit tests for PIN verification (correct/incorrect PIN, inactive account rejection) and unregistered Google sign-in rejection in `src/app/api/auth/pin/verify/route.test.ts`

**Checkpoint**: Both auth methods work, sessions persist correctly, unregistered users are rejected

### Bug Fix: PIN Login Session (T029 incomplete implementation)

- [x] T032c [US4] Fix `POST /api/auth/pin/verify` to generate a real Supabase session (using `supabase.auth.admin.generateLink` or `signInWithPassword` with a service-generated password) and return proper JWT access/refresh tokens in `src/app/api/auth/pin/verify/route.ts`
- [x] T032d [US4] Fix hosteler login page to set `sb-access-token` and `sb-refresh-token` cookies after successful PIN verify (matching owner login pattern) and use `window.location.href` instead of `router.push` for full page reload through middleware in `src/app/(auth)/login/page.tsx`

---

## Phase 5: User Story 1 — Hosteler Submits Daily Food Preferences (Priority: P1) 🎯 MVP

**Goal**: Hostelers toggle breakfast/lunch/dinner for tomorrow and save before the deadline; form locks after deadline

**Independent Test**: Log in as hosteler → open submission page → toggle meals → save → verify dashboard shows confirmation → verify form locks after deadline

### Implementation for User Story 1

- [x] T033 [P] [US1] Create `FoodToggle` component (three meal toggles with time labels: Breakfast 7–9 AM, Lunch 12:30–2 PM, Dinner 7:30–9:30 PM) in `src/components/food-toggle.tsx`
- [x] T034 [P] [US1] Create `CountdownBanner` component (shows time remaining to deadline, visible when < 2 hours) in `src/components/countdown-banner.tsx`
- [x] T035 [US1] Implement `POST /api/food/submit` endpoint (validate auth + active status, enforce deadline via server IST time, upsert food_preferences) in `src/app/api/food/submit/route.ts`
- [x] T036 [US1] Create food preference submission page with meal toggles, deadline countdown, and read-only state after deadline in `src/app/(hosteler)/submit/page.tsx`
- [x] T037 [US1] Create hosteler dashboard page showing submission status (green confirmation with selected meals), countdown banner, and link to submit in `src/app/(hosteler)/dashboard/page.tsx`
- [x] T038 [US1] Add pre-fill logic to submission page (fetch existing preference for tomorrow via Supabase client, populate toggle states) in `src/app/(hosteler)/submit/page.tsx`
- [x] T038b [US1] Implement `GET /api/food/today-status` endpoint (return submission status for tomorrow + deadline info + server time) in `src/app/api/food/today-status/route.ts`
- [x] T038c [US1] Write unit tests for deadline enforcement logic, food submission upsert, and today-status response in `src/app/api/food/submit/route.test.ts` and `src/lib/deadline.test.ts`

**Checkpoint**: Hostelers can submit and update food preferences with server-enforced deadline — core value delivered

---

## Phase 6: User Story 2 — Owner Views Live Daily Food Counts (Priority: P1)

**Goal**: Owner sees real-time meal counts for tomorrow, list of pending/submitted hostelers, deadline countdown — all updating live via Supabase Realtime

**Independent Test**: Owner opens dashboard → hosteler submits preferences → counts increment without page refresh within 3 seconds

### Implementation for User Story 2

- [x] T039 [P] [US2] Create `MealCountCard` component (displays count per meal type with animated increment) in `src/components/meal-count-card.tsx`
- [x] T040 [P] [US2] Create `HostelerList` component (shows name + room, used for pending/submitted lists) in `src/components/hosteler-list.tsx`
- [x] T041 [US2] Create owner dashboard page with three meal count cards, pending hostelers list, submitted hostelers collapsible list, and deadline countdown in `src/app/(owner)/dashboard/page.tsx`
- [x] T042 [US2] Implement Supabase Realtime subscription on `food_preferences` table (filter by tomorrow's date, update counts on INSERT/UPDATE events) in `src/app/(owner)/dashboard/page.tsx`
- [x] T043 [US2] Implement reconnection handling (auto-reconnect, show "Live updates paused — reconnecting…" banner after 10s disconnect) in `src/app/(owner)/dashboard/page.tsx`
- [x] T044 [US2] Implement initial data fetch for dashboard (aggregate meal counts + pending/submitted hosteler lists via Supabase queries) in `src/app/(owner)/dashboard/page.tsx`
- [x] T044b [US2] Write unit tests for food counts aggregation logic and Realtime reconnection banner behavior in `src/app/(owner)/dashboard/dashboard.test.tsx`

**Checkpoint**: Owner sees live meal counts and submission status without manual refresh

---

## Phase 7: User Story 5 — Owner Manages Hosteler Registrations (Priority: P2)

**Goal**: Owner views hostelers by status (active/pending/inactive), deactivates, reactivates, and generates new invite links

**Independent Test**: Add hosteler → deactivate → reactivate → reset invite → verify all status changes reflect correctly

### Implementation for User Story 5

- [ ] T045 [US5] Implement `GET /api/hostelers` endpoint (list hostelers with optional status filter, return counts per status) in `src/app/api/hostelers/route.ts`
- [ ] T046 [US5] Implement `PATCH /api/hostelers/[id]` endpoint (deactivate with future-preference confirmation, reactivate) in `src/app/api/hostelers/[id]/route.ts`
- [ ] T047 [US5] Implement `POST /api/hostelers/[id]/reset-invite` endpoint (invalidate existing tokens, generate new invite token with 7-day expiry; does NOT change hosteler status — only regenerates the link) in `src/app/api/hostelers/[id]/reset-invite/route.ts`
- [ ] T048 [US5] Create hosteler management page with status tabs (active/pending/inactive), add hosteler form, and per-hosteler action buttons in `src/app/(owner)/hostelers/page.tsx`
- [ ] T049 [US5] Implement deactivation confirmation dialog (shows future preference count warning) and invite link copy functionality in `src/app/(owner)/hostelers/page.tsx`
- [ ] T049b [US5] Create E2E test: owner adds hosteler → views in active list → deactivates → appears in inactive tab → reactivates → returns to active tab → resets invite link in `e2e/us5-hosteler-management.spec.ts`

**Checkpoint**: Owner can fully manage hosteler lifecycle

---

## Phase 8: User Story 10 — Owner Configures Deadline and Meal Rates (Priority: P3)

**Goal**: Owner updates the daily submission deadline time and per-meal rates; rate changes apply from next calendar day

**Independent Test**: Change deadline → verify form locks at new time; change rate → verify next billing uses updated rate from tomorrow

**Why before US6**: Billing (US6) requires rate history infrastructure that this story completes

### Implementation for User Story 10

- [ ] T050 [US10] Implement `PATCH /api/settings` endpoint (update deadline_time immediately, insert new meal_rates row with effective_from = tomorrow) in `src/app/api/settings/route.ts`
- [ ] T051 [US10] Create owner settings page with deadline time input and per-meal rate inputs (current rate displayed, new rate saved for tomorrow) in `src/app/(owner)/settings/page.tsx`
- [ ] T052 [US10] Add validation for deadline format (HH:MM, 24-hour) and rate values (positive numbers) with error feedback in `src/app/(owner)/settings/page.tsx`
- [ ] T052b [US10] Create E2E test: owner changes deadline time → verify new deadline displayed → change meal rate → verify rate shown as "effective from tomorrow" → hosteler form locks at new deadline time in `e2e/us10-settings.spec.ts`

**Checkpoint**: Owner can configure deadline and rates; changes apply correctly to submissions and billing

---

## Phase 9: User Story 6 — Owner Generates Monthly Bills (Priority: P3)

**Goal**: Owner selects month/year, triggers bill generation with per-day rate lookup (handles mid-month rate changes), views summary and per-hosteler detail

**Independent Test**: Seed food data for a month with a mid-month rate change → generate bills → verify days before/after use correct rates

### Implementation for User Story 6

- [ ] T053 [US6] Implement billing calculation logic (per-day rate lookup from `meal_rates` with `effective_from <= day`, sum per meal type) in `src/lib/billing.ts`
- [ ] T054 [US6] Implement `POST /api/billing/generate` endpoint (compute bills for all hostelers with preferences in target month, upsert into monthly_bills) in `src/app/api/billing/generate/route.ts`
- [ ] T055 [US6] Implement `GET /api/billing` endpoint (return bill summary for month, all hostelers or single hosteler) in `src/app/api/billing/route.ts`
- [ ] T056 [US6] Implement `GET /api/billing/detail` endpoint (per-day breakdown with applicable rates for a hosteler's bill) in `src/app/api/billing/detail/route.ts`
- [ ] T057 [US6] Create owner billing page with month/year selector, generate button, bill summary table (name, room, meal counts, total), and per-hosteler detail drill-down in `src/app/(owner)/billing/page.tsx`
- [ ] T057b [US6] Write unit tests for billing calculation: single rate month, mid-month rate change, zero-preference month, deactivated hosteler inclusion in `src/lib/billing.test.ts`
- [ ] T057c [US6] Create E2E test: seed food preferences for a month → owner navigates to billing page → selects month → generates bills → verify summary table shows correct totals → drill into hosteler detail → verify per-day breakdown in `e2e/us6-monthly-bills.spec.ts`

**Checkpoint**: Owner can generate and review accurate monthly bills accounting for mid-month rate changes

---

## Phase 10: User Story 7 — Hosteler Views Food History (Priority: P3)

**Goal**: Hosteler selects a month and sees day-by-day meal history with monthly totals per meal type

**Independent Test**: Submit preferences over several days → open history → verify per-day and monthly summary accuracy

### Implementation for User Story 7

- [ ] T058 [US7] Implement `GET /api/food/history` endpoint (return per-day food preferences and summary counts for hosteler's selected month) in `src/app/api/food/history/route.ts`
- [ ] T059 [US7] Create hosteler food history page with month selector, day-by-day meal list, and monthly summary row (total breakfast/lunch/dinner days) in `src/app/(hosteler)/history/page.tsx`
- [ ] T059b [US7] Create E2E test: hosteler submits food preferences for multiple days → navigates to history page → selects current month → verifies day-by-day list matches submissions → verifies monthly totals are correct in `e2e/us7-food-history.spec.ts`

**Checkpoint**: Hostelers can review their own food preference history by month

---

## Phase 11: User Story 8 — Hosteler Views Monthly Bill (Priority: P3)

**Goal**: Hosteler sees their monthly bill breakdown (meal counts, rates, subtotals, total) with owner confirmation note

**Independent Test**: After owner generates bills → hosteler views that month → sees accurate figures matching owner view

### Implementation for User Story 8

- [ ] T060 [US8] Create hosteler bill view page with month selector, meal count/rate/subtotal breakdown, highlighted total, and "confirmed by owner" note in `src/app/(hosteler)/bill/page.tsx`
- [ ] T061 [US8] Add "bill not yet available" empty state when no bill has been generated for the selected month in `src/app/(hosteler)/bill/page.tsx`
- [ ] T061b [US8] Create E2E test: hosteler navigates to bill page with no bills → sees "not available" state → owner generates bill → hosteler refreshes → sees meal breakdown with correct counts, rates, and total in `e2e/us8-hosteler-bill.spec.ts`

**Checkpoint**: Hostelers can independently view and understand their monthly charges

---

## Phase 12: User Story 9 — Owner Views and Exports Food History (Priority: P3)

**Goal**: Owner filters food history by hosteler and/or date range, views results in a table, exports as CSV

**Independent Test**: Filter by specific hosteler and date range → verify table shows correct data → export CSV → verify file matches table

### Implementation for User Story 9

- [ ] T062 [US9] Extend `GET /api/food/history` endpoint to support owner queries with `hosteler_id` filter, date range params, and `format=csv` response in `src/app/api/food/history/route.ts`
- [ ] T063 [US9] Create owner food history page with hosteler dropdown filter, date range picker, results table, and "Export CSV" download button in `src/app/(owner)/history/page.tsx`
- [ ] T064 [US9] Implement CSV generation (build CSV string from filtered data, trigger browser download) in `src/app/(owner)/history/page.tsx`
- [ ] T064b [US9] Create E2E test: owner navigates to food history → filters by specific hosteler → filters by date range → verifies table shows correct entries → clicks Export CSV → verifies downloaded file contains matching data in `e2e/us9-owner-food-history.spec.ts`

**Checkpoint**: Owner can review and export food history for record-keeping and dispute resolution

---

## Phase 13: Automation & E2E Testing

**Purpose**: Set up Playwright E2E testing, per-story test scripts, and CI/CD pipeline to enforce quality gates after every development phase

**⚠️ CRITICAL**: After this phase, all future phases MUST have passing tests before completion

### E2E Testing Infrastructure

- [x] T065a Install Playwright and configure `playwright.config.ts` (baseURL: localhost:3000, projects: chromium + mobile-chrome, webServer auto-start) in project root
- [x] T065b [P] Add per-story test scripts to `package.json`: `test:us1`, `test:us2`, `test:us3`, `test:us4`, `test:e2e`, `test:all`
- [x] T065c [P] Create E2E test helper utilities (login as owner, login as hosteler, seed test data) in `e2e/helpers.ts`

### E2E Test Suites (per user story)

- [x] T065d [US3] Create E2E test: owner registers hosteler → generates invite → hosteler opens link → activates via PIN in `e2e/us3-invite-activation.spec.ts`
- [x] T065e [US4] Create E2E test: activated hosteler logs in via PIN → sees dashboard → session persists in `e2e/us4-hosteler-login.spec.ts`
- [x] T065f [US1] Create E2E test: hosteler toggles meals → saves → dashboard shows confirmation → form locks after deadline in `e2e/us1-food-submission.spec.ts`
- [x] T065g [US2] Create E2E test: owner views dashboard → hosteler submits → counts update live without refresh in `e2e/us2-owner-dashboard.spec.ts`

### CI/CD Pipeline

- [x] T068 [P] Create GitHub Actions CI workflow with jobs: `test` (npm ci → vitest run → playwright test), `build` (needs: test → next build), `deploy` (needs: build → wrangler pages deploy) in `.github/workflows/ci.yml`
- [x] T069 [P] Create GitHub Actions nightly backup workflow (cron 2:00 AM IST → pg_dump → gzip → upload to Cloudflare R2 → 90-day retention cleanup) in `.github/workflows/backup.yml`. Include failure alert via GitHub Actions built-in email notifications (configure `if: failure()` step that logs error; repo owner receives automatic failure email from GitHub)

### E2E Test Data & Authentication Fix

- [x] T069a Create Playwright global setup (`e2e/global-setup.ts`) that seeds a test owner user and test hosteler (with known phone+PIN) into Supabase using the service role key before tests run. Add E2E test env vars (`E2E_TEST_OWNER_EMAIL`, `E2E_TEST_OWNER_PASSWORD`, `E2E_TEST_HOSTELER_PHONE`, `E2E_TEST_HOSTELER_PIN`) to `.env.local` and `.env.example`.
- [x] T069b Create Playwright global teardown (`e2e/global-teardown.ts`) that cleans up test-seeded data from Supabase after tests complete.
- [x] T069c Update `playwright.config.ts` to reference `globalSetup` and `globalTeardown`, load env vars via `dotenv`.
- [x] T069d Update `e2e/helpers.ts` login helpers to use env-based test credentials and fix login flows to match the actual app login pages (correct selectors, cookie-based auth).
- [x] T069e Update all E2E test specs (`us1`, `us2`, `us3`, `us4`) to use seeded test data from global setup and pass with the actual running app.

**Checkpoint**: All completed stories have passing E2E tests; CI blocks deployment on test failure

---

## Phase 14: Polish & Cross-Cutting Concerns

**Purpose**: PWA configuration, offline handling, and final validation

- [ ] T070a [P] Create PWA manifest with app name, icons, theme color, and standalone display mode in `public/manifest.json`
- [ ] T070b [P] Create PWA icons (192x192 and 512x512) in `public/icons/`
- [ ] T070c [P] Implement install prompt handling (capture `beforeinstallprompt` event, show custom install UI on first mobile visit) in `src/components/install-prompt.tsx`
- [ ] T070d [P] Add offline indicator component (detect network status, show "You're offline" on data screens) in `src/components/offline-indicator.tsx`
- [ ] T070e Create E2E test: verify PWA manifest loads correctly → verify app installs as standalone → verify offline indicator appears when network disconnected → verify app recovers when network restored in `e2e/pwa-offline.spec.ts`
- [ ] T071 Validate complete application against quickstart.md scenarios: manually execute all 11 validation scenarios end-to-end on a mobile device (375px viewport). Pass criteria: each scenario completes without errors, correct data persists in DB, deadline enforcement works at configured time, PWA installs successfully. Document pass/fail per scenario.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US3 Invite Activation (Phase 3)**: Depends on Foundational — BLOCKS US1 and US4
- **US4 Hosteler Login (Phase 4)**: Depends on Foundational + US3 (hostelers must be activatable first)
- **US1 Food Submission (Phase 5)**: Depends on US3 + US4 (hostelers must log in) — **MVP target**
- **US2 Owner Dashboard (Phase 6)**: Depends on Foundational + US1 (needs food data to display counts)
- **US5 Hosteler Management (Phase 7)**: Depends on Foundational only (uses same invite infrastructure as US3)
- **US10 Settings (Phase 8)**: Depends on Foundational — should precede US6 (rates needed for billing)
- **US6 Monthly Bills (Phase 9)**: Depends on US1 (needs food preference data) + US10 (needs rate history)
- **US7 Food History (Phase 10)**: Depends on US1 (needs food preference data)
- **US8 Hosteler Bill View (Phase 11)**: Depends on US6 (needs generated bills)
- **US9 Owner Food History (Phase 12)**: Depends on US1 (needs food preference data)
- **Polish (Phase 13)**: Can start after Phase 2; should complete after all user stories

### User Story Dependencies

```
Phase 2 (Foundational)
  ├── Phase 3 (US3: Invite Activation)
  │     └── Phase 4 (US4: Hosteler Login)
  │           └── Phase 5 (US1: Food Submission) 🎯 MVP
  │                 ├── Phase 6 (US2: Owner Dashboard)
  │                 ├── Phase 10 (US7: Hosteler Food History)
  │                 └── Phase 12 (US9: Owner Food History)
  ├── Phase 7 (US5: Hosteler Management) — independent
  ├── Phase 8 (US10: Settings) — independent
  │     └── Phase 9 (US6: Monthly Bills) — needs US1 + US10
  │           └── Phase 11 (US8: Hosteler Bill View)
  ├── Phase 13 (Automation & E2E) — after US1-US4 complete
  └── Phase 14 (Polish) — independent of stories
```

### Within Each User Story

- Models/types before services
- Services/lib before API routes
- API routes before UI pages
- Core implementation before integration/polish
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1** (all [P] tasks): T003, T004, T005, T006 can run in parallel after T001+T002

**Phase 2** (after T007+T008): T009, T010, T011, T012, T013 can all run in parallel; T017, T018, T019, T020, T021 can all run in parallel after types are defined

**Phase 5** (US1): T033, T034 can run in parallel (different component files); T035 can start independently of UI components

**Phase 6** (US2): T039, T040 can run in parallel (different component files)

**Cross-story parallelism** (after Foundational):
- US5 (Hosteler Management) can be worked on in parallel with US3/US4/US1 sequence
- US10 (Settings) can be worked on in parallel with the US3→US4→US1 sequence
- Polish (Phase 13) tasks can start after Foundational (T065–T070 are independent of user stories)

---

## Implementation Strategy

### MVP Scope (Recommended First Delivery)

**Phases 1–5** (Setup → Foundational → US3 → US4 → US1) deliver the core value proposition:
- Hostelers can activate accounts and log in
- Hostelers can submit daily food preferences before the deadline
- Deadline is enforced server-side

This is the minimum viable product — the daily action the entire system is built around.

### Incremental Delivery After MVP

1. **US2 (Owner Dashboard)** — Completes the owner's daily operational need
2. **US5 (Hosteler Management)** — Enables ongoing hosteler lifecycle management
3. **US10 (Settings)** — Enables deadline/rate configuration
4. **US6 (Monthly Bills)** — Monthly billing workflow
5. **US7, US8, US9** — Transparency and reporting features
6. **Polish** — PWA, CI/CD, backup (can be done incrementally alongside stories)
