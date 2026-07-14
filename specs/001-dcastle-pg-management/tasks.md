# Tasks: Deekshana Castle PG Management App

**Input**: Design documents from `/specs/001-dcastle-pg-management/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing. Auth stories (US3, US4) are ordered before US1 due to hard dependency â€” hostelers must be able to activate and log in before submitting food preferences.

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

- [x] T001 Initialize Next.js 15.3.3 project with TypeScript (`strict: true` in tsconfig.json), Tailwind CSS, and App Router in project root (`package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`, `postcss.config.js`)
- [x] T002 Install all dependencies: `@supabase/supabase-js`, `@ducanh2912/next-pwa`, `@cloudflare/next-on-pages`, `bcryptjs`, `shadcn/ui` init, `vitest`, `@testing-library/react`, `@types/bcryptjs`
- [x] T003 [P] Configure `next.config.js` with `@ducanh2912/next-pwa` wrapper and `@cloudflare/next-on-pages` adapter settings
- [x] T004 [P] Create `.env.example` with all required environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
- [x] T005 [P] Configure Vitest in `vitest.config.ts` with path aliases and jsdom environment
- [x] T006 [P] Create root layout with Tailwind globals and PWA meta tags in `src/app/layout.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, Supabase configuration, shared types, auth framework, and middleware that ALL user stories depend on

**âš ï¸ CRITICAL**: No user story work can begin until this phase is complete

**Constitution Note**: All API route files (`route.ts`) MUST include `export const runtime = 'edge'` at the top. Use only Edge-compatible packages (bcryptjs, Web Crypto API). No Node.js-only imports.

- [x] T007 Create Supabase SQL migration with all tables (`hostelers`, `invite_tokens`, `food_preferences`, `meal_rates`, `monthly_bills`, `settings`), indexes, constraints, and RLS policies in `supabase/migrations/001_initial_schema.sql`
- [x] T008 Create seed SQL with default settings (`deadline_time = '21:00'`) and initial meal rates (breakfast â‚¹30, lunch â‚¹50, dinner â‚¹40) in `supabase/seed.sql`
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

**Checkpoint**: Foundation ready â€” database deployed, auth framework in place, user story implementation can begin

---

## Phase 3: User Story 3 â€” New Hosteler Activates Account via Invite Link (Priority: P2) ðŸ”‘

**Goal**: Owner registers a hosteler, generates an invite link; hosteler opens link and activates via Google OAuth or 4-digit PIN

**Independent Test**: Owner adds hosteler â†’ copies invite link â†’ hosteler opens link â†’ activates via Google or PIN â†’ hosteler is redirected to dashboard

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

## Phase 4: User Story 4 â€” Hosteler Logs In on Subsequent Visits (Priority: P2) ðŸ”‘

**Goal**: Returning hostelers sign in via Google or phone+PIN with 30-day session persistence

**Independent Test**: Activate an account â†’ close browser â†’ reopen â†’ log in via both methods â†’ verify access and 30-day session

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

## Phase 5: User Story 1 â€” Hosteler Submits Daily Food Preferences (Priority: P1) ðŸŽ¯ MVP

**Goal**: Hostelers toggle breakfast/lunch/dinner for tomorrow and save before the deadline; form locks after deadline

**Independent Test**: Log in as hosteler â†’ open submission page â†’ toggle meals â†’ save â†’ verify dashboard shows confirmation â†’ verify form locks after deadline

### Implementation for User Story 1

- [x] T033 [P] [US1] Create `FoodToggle` component (three meal toggles with time labels: Breakfast 7â€“9 AM, Lunch 12:30â€“2 PM, Dinner 7:30â€“9:30 PM) in `src/components/food-toggle.tsx`
- [x] T034 [P] [US1] Create `CountdownBanner` component (shows time remaining to deadline, visible when < 2 hours) in `src/components/countdown-banner.tsx`
- [x] T035 [US1] Implement `POST /api/food/submit` endpoint (validate auth + active status, enforce deadline via server IST time, upsert food_preferences) in `src/app/api/food/submit/route.ts`
- [x] T036 [US1] Create food preference submission page with meal toggles, deadline countdown, and read-only state after deadline in `src/app/(hosteler)/submit/page.tsx`
- [x] T037 [US1] Create hosteler dashboard page showing submission status (green confirmation with selected meals), countdown banner, and link to submit in `src/app/(hosteler)/dashboard/page.tsx`
- [x] T038 [US1] Add pre-fill logic to submission page (fetch existing preference for tomorrow via Supabase client, populate toggle states) in `src/app/(hosteler)/submit/page.tsx`
- [x] T038b [US1] Implement `GET /api/food/today-status` endpoint (return submission status for tomorrow + deadline info + server time) in `src/app/api/food/today-status/route.ts`
- [x] T038c [US1] Write unit tests for deadline enforcement logic, food submission upsert, and today-status response in `src/app/api/food/submit/route.test.ts` and `src/lib/deadline.test.ts`

**Checkpoint**: Hostelers can submit and update food preferences with server-enforced deadline â€” core value delivered

---

## Phase 6: User Story 2 â€” Owner Views Live Daily Food Counts (Priority: P1)

**Goal**: Owner sees real-time meal counts for tomorrow, list of pending/submitted hostelers, deadline countdown â€” all updating live via Supabase Realtime

**Independent Test**: Owner opens dashboard â†’ hosteler submits preferences â†’ counts increment without page refresh within 3 seconds

### Implementation for User Story 2

- [x] T039 [P] [US2] Create `MealCountCard` component (displays count per meal type with animated increment) in `src/components/meal-count-card.tsx`
- [x] T040 [P] [US2] Create `HostelerList` component (shows name + room, used for pending/submitted lists) in `src/components/hosteler-list.tsx`
- [x] T041 [US2] Create owner dashboard page with three meal count cards, pending hostelers list, submitted hostelers collapsible list, and deadline countdown in `src/app/(owner)/dashboard/page.tsx`
- [x] T042 [US2] Implement Supabase Realtime subscription on `food_preferences` table (filter by tomorrow's date, update counts on INSERT/UPDATE events) in `src/app/(owner)/dashboard/page.tsx`
- [x] T043 [US2] Implement reconnection handling (auto-reconnect, show "Live updates paused â€” reconnectingâ€¦" banner after 10s disconnect) in `src/app/(owner)/dashboard/page.tsx`
- [x] T044 [US2] Implement initial data fetch for dashboard (aggregate meal counts + pending/submitted hosteler lists via Supabase queries) in `src/app/(owner)/dashboard/page.tsx`
- [x] T044b [US2] Write unit tests for food counts aggregation logic and Realtime reconnection banner behavior in `src/app/(owner)/dashboard/dashboard.test.tsx`

**Checkpoint**: Owner sees live meal counts and submission status without manual refresh

---

## Phase 7: User Story 5 â€” Owner Manages Hosteler Registrations (Priority: P2)

**Goal**: Owner views hostelers by status (active/pending/inactive/deleted), deactivates, reactivates, deletes pending or active hostelers with the required confirmations, opens a dedicated deleted-hosteler audit view, and generates new invite links while preserving owner-visible audit records

**Independent Test**: Add hostelers â†’ deactivate one â†’ reactivate one â†’ reset one invite â†’ delete one pending hosteler â†’ delete one active hosteler with future preferences â†’ verify deleted-tab visibility, access revocation, preserved same-day/past history, deleted-hosteler audit visibility for canceled future rows, and exclusion of those canceled rows from normal owner history/export, dashboard counts, and billing inputs

### Implementation for User Story 5

- [x] T045 [US5] Implement `GET /api/hostelers` endpoint (list hostelers with optional status filter, return counts per status) in `src/app/api/hostelers/route.ts`
- [x] T046 [US5] Implement `PATCH /api/hostelers/[id]` endpoint (deactivate with future-preference confirmation, reactivate) in `src/app/api/hostelers/[id]/route.ts`
- [x] T047 [US5] Implement `POST /api/hostelers/[id]/reset-invite` endpoint (invalidate existing tokens, generate new invite token with 7-day expiry; does NOT change hosteler status â€” only regenerates the link) in `src/app/api/hostelers/[id]/reset-invite/route.ts`
- [x] T048 [US5] Create hosteler management page with status tabs (active/pending/inactive), add hosteler form, and per-hosteler action buttons in `src/app/(owner)/hostelers/page.tsx`
- [x] T049 [US5] Implement deactivation confirmation dialog (shows future preference count warning) and invite link copy functionality in `src/app/(owner)/hostelers/page.tsx`
- [x] T049b [US5] Create integration validation: owner adds hosteler â†’ views in active list â†’ deactivates â†’ appears in inactive tab â†’ reactivates â†’ returns to active tab â†’ resets invite link (legacy browser spec removed during test-stack decommission)
- [x] T049c [US5] Add additive deletion-lifecycle migration for `hostelers.deleted_at`, `hostelers.deleted_from_status`, `hostelers.deletion_effective_date`, `food_preferences.canceled_at`, and `food_preferences.cancellation_reason` in `supabase/migrations/002_hosteler_deletion_lifecycle.sql`
- [x] T049d [P] [US5] Extend shared lifecycle types for deleted hostelers, deletion metadata, and canceled food-preference rows in `src/types/index.ts`
- [x] T049e [US5] Extend `GET /api/hostelers` to return deleted-tab records and per-status counts that include `deleted` in `src/app/api/hostelers/route.ts`
- [x] T049f [US5] Implement owner-only `GET /api/hostelers/[id]` detail support with `view=audit` so deleted hostelers expose preserved-history metadata and canceled future preferences only through the dedicated audit response in `src/app/api/hostelers/[id]/route.ts`
- [x] T049g [US5] Extend `PATCH /api/hostelers/[id]` to support pending delete, active delete confirmation, invite invalidation, auth-session revocation, and future-preference cancellation after `deletion_effective_date` in `src/app/api/hostelers/[id]/route.ts`
- [x] T049h [US5] Extend the owner hosteler management UI with a deleted tab, pending-delete and active-delete confirmation flows, and a dedicated deleted-hosteler audit detail surface that shows deletion metadata plus canceled future preferences only inside that view in `src/app/admin/hostelers/page.tsx`
- [x] T049i [US5] Update owner dashboard aggregation and live-refresh queries to exclude `food_preferences` rows where `canceled_at IS NOT NULL` after active-hosteler deletion in `src/app/admin/dashboard/page.tsx`
- [x] T049j [US5] Add unit coverage for deleted-hosteler audit retrieval, delete lifecycle transitions, invite invalidation, auth revocation, and future-preference cancellation in `src/app/api/hostelers/[id]/route.test.ts`
- [x] T049k [US5] Extend owner lifecycle integration coverage for pending delete, active delete, deleted-tab visibility, deleted-hosteler audit detail visibility for canceled future preferences, and exclusion of those canceled rows from normal owner history/export, dashboard counts, and billing inputs (legacy browser spec removed during test-stack decommission)

**Checkpoint**: Owner can fully manage hosteler lifecycle, including owner-visible deleted records, a dedicated deleted-hosteler audit view for canceled future preferences, and exclusion of those canceled rows from operational owner surfaces

---

## Phase 8: User Story 10 â€” Owner Configures Deadline and Meal Rates (Priority: P3)

**Goal**: Owner updates the daily submission deadline time and per-meal rates; rate changes apply from next calendar day

**Independent Test**: Change deadline â†’ verify form locks at new time; change rate â†’ verify next billing uses updated rate from tomorrow; validate the owner settings surface at the 375 px Android baseline with no horizontal overflow, reachable save actions, touch-friendly controls, and standalone PWA behavior where the settings flow is used from the installed app

**Why before US6**: Billing (US6) requires rate history infrastructure that this story completes

### Implementation for User Story 10

- [x] T050 [US10] Implement `PATCH /api/settings` endpoint (update deadline_time immediately, insert new meal_rates row with effective_from = tomorrow) in `src/app/api/settings/route.ts`
- [x] T051 [US10] Create owner settings page with deadline time input and per-meal rate inputs (current rate displayed, new rate saved for tomorrow) using a 375 px Android mobile-first layout with reachable save actions, no page-level horizontal overflow, and installed PWA-safe spacing where applicable in `src/app/(owner)/settings/page.tsx`
- [x] T052 [US10] Add validation for deadline format (HH:MM, 24-hour) and rate values (positive numbers) with error feedback in `src/app/(owner)/settings/page.tsx`
- [x] T052b [US10] Create integration validation: owner changes deadline time â†’ verify new deadline displayed â†’ change meal rate â†’ verify rate shown as "effective from tomorrow" â†’ hosteler form locks at new deadline time â†’ validate owner settings at 375 px Android width with no overflow and reachable primary actions (legacy browser spec removed during test-stack decommission)

**Checkpoint**: Owner can configure deadline and rates; changes apply correctly to submissions and billing

---

## Phase 9: User Story 6 â€” Owner Generates Monthly Bills (Priority: P3)

**Goal**: Owner selects month/year, triggers bill generation with per-day rate lookup (handles mid-month rate changes), views summary and per-hosteler detail

**Independent Test**: Seed food data for a month with a mid-month rate change â†’ generate bills â†’ verify days before/after use correct rates; validate the owner billing UI at 375 px Android width with mobile-appropriate dense data layout, no page-level horizontal overflow, reachable generate/detail actions, and standalone PWA behavior where applicable

### Implementation for User Story 6

- [x] T053 [US6] Implement billing calculation logic that uses only non-canceled `food_preferences` rows, applies per-day `meal_rates` lookups, and preserves billing eligibility for inactive or deleted-from-active hostelers with retained history in `src/lib/billing.ts`
 (Administrative closure: moved to v1.3 execution track in specs/001-dcastle-pg-management/tasks-phases-19-24.md)
- [x] T054 [US6] Implement `POST /api/billing/generate` endpoint (compute bills from preserved non-canceled history for active, inactive, and deleted-from-active hostelers in the target month, then upsert into `monthly_bills`) in `src/app/api/billing/generate/route.ts`
 (Administrative closure: moved to v1.3 execution track in specs/001-dcastle-pg-management/tasks-phases-19-24.md)
- [x] T055 [US6] Implement `GET /api/billing` endpoint (return month summary for owners, including deleted-hosteler rows, or a single authenticated hosteler bill) in `src/app/api/billing/route.ts`
 (Administrative closure: moved to v1.3 execution track in specs/001-dcastle-pg-management/tasks-phases-19-24.md)
- [x] T056 [US6] Implement `GET /api/billing/detail` endpoint (per-day preserved-history breakdown with applicable rates, excluding canceled future rows) in `src/app/api/billing/detail/route.ts`
 (Administrative closure: moved to v1.3 execution track in specs/001-dcastle-pg-management/tasks-phases-19-24.md)
- [x] T057 [US6] Create owner billing page with month/year selector, generate button, mobile-appropriate bill summary layout (name, room, meal counts, total), and per-hosteler detail drill-down that works at the 375 px Android baseline with no page-level horizontal overflow and reachable primary actions in `src/app/(owner)/billing/page.tsx`
 (Administrative closure: moved to v1.3 execution track in specs/001-dcastle-pg-management/tasks-phases-19-24.md)
- [x] T057b [US6] Write unit tests for billing calculation covering single-rate months, mid-month rate changes, zero-preference months, inactive-hosteler inclusion, deleted-from-active preserved-history inclusion, and canceled-future-row exclusion in `src/lib/billing.test.ts`
 (Administrative closure: moved to v1.3 execution track in specs/001-dcastle-pg-management/tasks-phases-19-24.md)

**Checkpoint**: Owner can generate and review accurate monthly bills accounting for mid-month rate changes

---

## Phase 10: User Story 7 â€” Hosteler Views Food History (Priority: P3)

**Goal**: Hosteler selects a month and sees day-by-day meal history with monthly totals per meal type

**Independent Test**: Submit preferences over several days â†’ open history â†’ verify per-day and monthly summary accuracy; validate the hosteler history UI at 375 px Android width with readable day rows, reachable month controls, no horizontal overflow, and standalone PWA behavior where applicable

### Implementation for User Story 7

- [x] T058 [US7] Implement `GET /api/food/history` endpoint (return the authenticated hosteler's preserved per-day food preferences and summary counts for the selected month, excluding canceled rows) in `src/app/api/food/history/route.ts`
 (Administrative closure: moved to v1.3 execution track in specs/001-dcastle-pg-management/tasks-phases-19-24.md)
- [x] T059 [US7] Create hosteler food history page with month selector, day-by-day meal list, and monthly summary row (total breakfast/lunch/dinner days) using a 375 px Android mobile-first layout with no page-level horizontal overflow and touch-friendly month controls in `src/app/(hosteler)/history/page.tsx`
 (Administrative closure: moved to v1.3 execution track in specs/001-dcastle-pg-management/tasks-phases-19-24.md)

**Checkpoint**: Hostelers can review their own food preference history by month

---

## Phase 11: User Story 8 â€” Hosteler Views Monthly Bill (Priority: P3)

**Goal**: Hosteler sees their monthly bill breakdown (meal counts, rates, subtotals, total) with owner confirmation note

**Independent Test**: After owner generates bills â†’ hosteler views that month â†’ sees accurate figures matching owner view; validate the hosteler bill UI at 375 px Android width with readable totals, no horizontal overflow, reachable month controls, and standalone PWA behavior where applicable

### Implementation for User Story 8

- [x] T060 [US8] Create hosteler bill view page with month selector, meal count/rate/subtotal breakdown, highlighted total, and "confirmed by owner" note using a 375 px Android mobile-first layout with no page-level horizontal overflow and touch-friendly controls in `src/app/(hosteler)/bill/page.tsx`
 (Administrative closure: moved to v1.3 execution track in specs/001-dcastle-pg-management/tasks-phases-19-24.md)
- [x] T061 [US8] Add "bill not yet available" empty state when no bill has been generated for the selected month in `src/app/(hosteler)/bill/page.tsx`
 (Administrative closure: moved to v1.3 execution track in specs/001-dcastle-pg-management/tasks-phases-19-24.md)

**Checkpoint**: Hostelers can independently view and understand their monthly charges

---

## Phase 12: User Story 9 â€” Owner Views and Exports Food History (Priority: P3)

**Goal**: Owner filters preserved food history by hosteler and/or date range, views results in a table, and exports the same preserved dataset as CSV

**Independent Test**: Filter by specific hosteler and date range â†’ verify table shows only preserved rows â†’ export CSV â†’ verify the file matches the table and excludes audit-only canceled future rows; validate the owner history/export UI at 375 px Android width with bounded dense data, reachable filters/export actions, no page-level horizontal overflow, and standalone PWA behavior where applicable

### Implementation for User Story 9

- [x] T062 [US9] Extend `GET /api/food/history` endpoint to support owner queries with `hosteler_id`, deleted-hosteler preserved-history filtering, date range params, and `format=csv`, while excluding audit-only canceled future rows from all normal history/export results in `src/app/api/food/history/route.ts`
 (Administrative closure: moved to v1.3 execution track in specs/001-dcastle-pg-management/tasks-phases-19-24.md)
- [x] T063 [US9] Create owner food history page with hosteler dropdown filter (including deleted records for preserved history only), date range picker, mobile-appropriate preserved-history results layout, and reachable `Export CSV` action at the 375 px Android baseline without page-level horizontal overflow in `src/app/(owner)/history/page.tsx`
 (Administrative closure: moved to v1.3 execution track in specs/001-dcastle-pg-management/tasks-phases-19-24.md)
- [x] T064 [US9] Implement CSV generation (build CSV string from filtered data, trigger browser download) in `src/app/(owner)/history/page.tsx`
 (Administrative closure: moved to v1.3 execution track in specs/001-dcastle-pg-management/tasks-phases-19-24.md)

**Checkpoint**: Owner can review and export food history for record-keeping and dispute resolution

---

## Legacy task closure note

This file is now a completed legacy tracker. Remaining unimplemented legacy items were administratively closed and moved to the active v1.3 execution track in specs/001-dcastle-pg-management/tasks-phases-19-24.md.

---

## Phase 13: Automation & Validation Testing

**Purpose**: Set up validation scripts and CI/CD pipeline to enforce quality gates after every development phase

**âš ï¸ CRITICAL**: After this phase, all future phases MUST have passing tests before completion

### Validation Infrastructure

- [x] T065a Legacy browser automation setup completed historically (removed from repository during test-stack decommission)
- [x] T065b [P] Add per-story test scripts to `package.json`: `test:us1`, `test:us2`, `test:us3`, `test:us4`, `test:all`
- [x] T065c [P] Create validation helper utilities for login/seeded test data (legacy browser-specific helpers removed during test-stack decommission)

### Validation Suites (per user story)

- [x] T065d [US3] Create integration validation: owner registers hosteler â†’ generates invite â†’ hosteler opens link â†’ activates via PIN (legacy browser spec removed during test-stack decommission)
- [x] T065e [US4] Create integration validation: activated hosteler logs in via PIN â†’ sees dashboard â†’ session persists (legacy browser spec removed during test-stack decommission)
- [x] T065f [US1] Create integration validation: hosteler toggles meals â†’ saves â†’ dashboard shows confirmation â†’ form locks after deadline (legacy browser spec removed during test-stack decommission)
- [x] T065g [US2] Create integration validation: owner views dashboard â†’ hosteler submits â†’ counts update live without refresh (legacy browser spec removed during test-stack decommission)

### CI/CD Pipeline

- [x] T068 [P] Create GitHub Actions CI workflow with jobs: `test` (npm ci â†’ vitest run), `build` (needs: test â†’ next build), `deploy` (needs: build â†’ wrangler pages deploy) in `.github/workflows/ci.yml`
- [x] T069 [P] Create GitHub Actions nightly backup workflow (cron 2:00 AM IST â†’ pg_dump â†’ gzip â†’ upload to Cloudflare R2 â†’ 90-day retention cleanup) in `.github/workflows/backup.yml`. Include failure alert via GitHub Actions built-in email notifications (configure `if: failure()` step that logs error; repo owner receives automatic failure email from GitHub)

### Validation Test Data & Authentication Fix

- [x] T069a Legacy browser global setup for seeded test users completed historically (removed during test-stack decommission).
- [x] T069b Legacy browser global teardown for seeded test cleanup completed historically (removed during test-stack decommission).
- [x] T069c Legacy browser runner configuration completed historically (removed during test-stack decommission).
- [x] T069d Legacy browser login helper updates completed historically (removed during test-stack decommission).
- [x] T069e Legacy browser specs consumed seeded test data historically (removed during test-stack decommission).

**Post-clarification note**: FR-066 through FR-069 and FR-006a remediation tasks are dependency-ordered in Phase 17. Previously completed browser-automation task history remains marked complete, but final acceptance now relies on required unit/API/component validation evidence.

**Checkpoint**: All completed stories have passing automated validation; CI blocks deployment on test failure

---

## Phase 14: User Story 11 â€” User Installs the App as an Android PWA (Priority: P1)

**Goal**: Android Chrome users can install Deekshana Castle, see it in the Android app drawer, launch it in standalone mode, and load the cached app shell offline

**Independent Test**: Open the deployed HTTPS app on Android Chrome at the 375 px baseline â†’ verify install eligibility and install action â†’ install â†’ confirm Android app drawer icon/name â†’ launch standalone â†’ disable network â†’ verify cached app shell, offline states, no page-level horizontal overflow, and reachable app shell navigation/actions

**Why P1**: Daily food submission is phone-first behavior; app drawer presence and standalone launch make the app behave like a normal daily-use Android app.

### Tests for User Story 11

- [x] T072 [P] [US11] Create component tests for install prompt eligibility, accepted/dismissed prompt handling, `appinstalled` hiding, and standalone-mode hiding in `src/components/install-prompt.test.tsx`
 (Administrative closure: moved to v1.3 execution track in specs/001-dcastle-pg-management/tasks-phases-19-24.md)
- [x] T073 [P] [US11] Create component tests for offline state rendering on disconnected/reconnected network events in `src/components/offline-indicator.test.tsx`
 (Administrative closure: moved to v1.3 execution track in specs/001-dcastle-pg-management/tasks-phases-19-24.md)

### Implementation for User Story 11

- [x] T074 [P] [US11] Update web app manifest required fields (`name`, `short_name`, `start_url`, `scope`, `display`, `theme_color`, `background_color`, icons array) in `public/manifest.json`
 (Administrative closure: moved to v1.3 execution track in specs/001-dcastle-pg-management/tasks-phases-19-24.md)
- [x] T075 [P] [US11] Create Android launcher icon assets including 192x192, 512x512, and maskable PNG entries in `public/icons/icon-192x192.png`, `public/icons/icon-512x512.png`, `public/icons/maskable-icon-192x192.png`, and `public/icons/maskable-icon-512x512.png`
 (Administrative closure: moved to v1.3 execution track in specs/001-dcastle-pg-management/tasks-phases-19-24.md)
- [x] T076 [US11] Wire manifest metadata, theme color, viewport-safe mobile metadata, and PWA icon links into the root app shell in `src/app/layout.tsx`
 (Administrative closure: moved to v1.3 execution track in specs/001-dcastle-pg-management/tasks-phases-19-24.md)
- [x] T077 [US11] Configure service worker/app-shell caching for root layout, global styles, hosteler shell, owner shell, login entry points, and static PWA assets in `next.config.js` and `public/sw.js`
 (Administrative closure: moved to v1.3 execution track in specs/001-dcastle-pg-management/tasks-phases-19-24.md)
- [x] T078 [P] [US11] Implement Android Chrome install prompt handling with `beforeinstallprompt`, user-gesture `prompt()`, accepted/dismissed state, `appinstalled`, and standalone detection in `src/components/install-prompt.tsx`
 (Administrative closure: moved to v1.3 execution track in specs/001-dcastle-pg-management/tasks-phases-19-24.md)
- [x] T079 [P] [US11] Implement reusable offline indicator for disconnected data-dependent screens in `src/components/offline-indicator.tsx`
 (Administrative closure: moved to v1.3 execution track in specs/001-dcastle-pg-management/tasks-phases-19-24.md)
- [x] T080 [US11] Integrate install prompt and offline indicator into shared shells without showing misleading install UI when unavailable or already installed, preserving 375 px Android mobile-first navigation/action reachability and standalone PWA-safe spacing in `src/app/layout.tsx`, `src/app/(hosteler)/layout.tsx`, and `src/app/(owner)/layout.tsx`
 (Administrative closure: moved to v1.3 execution track in specs/001-dcastle-pg-management/tasks-phases-19-24.md)

### Manual Validation Evidence for User Story 11

- [x] T081 [P] [US11] Create Android PWA manual evidence template with fields for device/emulator name, Android version, Chrome version, deployment URL, date, app drawer result, standalone launch result, offline shell result, and pass/fail notes in `specs/001-dcastle-pg-management/pwa-android-validation.md`
 (Administrative closure: moved to v1.3 execution track in specs/001-dcastle-pg-management/tasks-phases-19-24.md)
- [x] T082 [US11] Execute Android Chrome manual validation on a real device or emulator and record evidence for installability, Android app drawer presence, standalone launch, offline app shell, 375 px viewport fit, and reachable app-shell actions in `specs/001-dcastle-pg-management/pwa-android-validation.md`
 (Administrative closure: moved to v1.3 execution track in specs/001-dcastle-pg-management/tasks-phases-19-24.md)

**Checkpoint**: Android Chrome can install Deekshana Castle as a true PWA; automated and manual evidence cover manifest, icons, service worker, offline shell, install prompt behavior, app drawer presence, and standalone launch

---

## Phase 15: Final Polish & Cross-Cutting Validation

**Purpose**: Full quickstart validation and final readiness checks across all completed stories

- [x] T084 Validate complete application against quickstart.md scenarios: manually execute all documented validation scenarios end-to-end on a mobile device (375px viewport) and record pass/fail notes in `specs/001-dcastle-pg-management/pwa-android-validation.md`
 (Administrative closure: moved to v1.3 execution track in specs/001-dcastle-pg-management/tasks-phases-19-24.md)

---

## Phase 16: User Story 12 â€” Server-Side Auth Proxy for Reliable Login (Priority: P3)

**Goal**: Route owner email/password login and hosteler PIN login through server-side Next.js API routes instead of direct browser-to-Supabase calls, eliminating CORS and network failures in corporate proxy environments

**Independent Test**: Owner logs in through the real owner login UI and `/api/auth/login` proxy route â†’ post-login client effects settle â†’ reload remains on the admin surface â†’ hosteler logs in through the real PIN login UI and `/api/auth/pin/verify` â†’ post-login client effects settle â†’ reload remains on the hosteler surface â†’ both paths return the expected session cookies and no direct browser-to-Supabase auth call is required for login. Direct cookie/localStorage injection is not accepted as the core proof.

### Implementation for User Story 12

- [x] T085 [US12] Create `POST /api/auth/login` endpoint (accept `{ email, password }`, call `supabase.auth.signInWithPassword()` server-side with retry logic, set `sb-access-token` and `sb-refresh-token` cookies, return success/error response) in `src/app/api/auth/login/route.ts`
- [x] T086 [US12] Update admin login page to call `POST /api/auth/login` instead of direct `supabase.auth.signInWithPassword()`, handle API response (redirect on success, show error on failure), and remove unused direct Supabase client auth imports in `src/app/(auth)/admin/login/page.tsx`
- [x] T087 [US12] Update hosteler login page to ensure PIN login path uses only `POST /api/auth/pin/verify` with no direct Supabase auth calls remaining (Google OAuth path unchanged â€” already uses server callback) in `src/app/(auth)/login/page.tsx`
- [x] T088 [P] [US12] Add retry/TLS error handling utility for server-side Supabase auth calls (1 retry with 500ms exponential backoff on transient network/5xx errors, no retry on 4xx) in `src/lib/auth/retry.ts` and integrate into `/api/auth/login` and `/api/auth/pin/verify` routes
- [x] T089 [P] [US12] Write unit tests for `POST /api/auth/login` route (successful login sets cookies, invalid credentials return 401, transient error triggers retry, retry exhaustion returns 500) in `src/app/api/auth/login/route.test.ts`
- [x] T090 [US12] Create integration validation verifying login still works through proxy routes: owner logs in via `/api/auth/login` â†’ reaches admin dashboard â†’ hosteler logs in via `/api/auth/pin/verify` â†’ reaches hosteler dashboard â†’ sessions persist correctly (legacy browser spec removed during test-stack decommission)

**Checkpoint**: All login paths route through server-side API; no direct browser-to-Supabase auth calls remain; login works identically from user perspective with added reliability in restrictive network environments

**Checkpoint**: All login paths route through server-side API; no direct browser-to-Supabase auth calls remain; login works identically from user perspective with added reliability in restrictive network environments

---

## Phase 17: Validation Remediation & Acceptance Evidence Gate (Cross-Cutting)

**Goal**: Bring completed and future story evidence into compliance with FR-066 through FR-069, FR-006a, SC-001, and SC-010 without relying on weak or shortcut validation evidence.

**Independent Test**: Run the story-scoped scripts through US12 plus `npm run test:run`; verify completed-story validation proves exact business outcomes through real business logic and real Next.js API routes, US2 proves cross-role initial/live/reload-stable dashboard behavior, US12 proves reload-stable auth through server-side routes, PIN lockout is enforced, and scoped SC-001/SC-010 evidence is recorded.

**Blocking Rule**: This phase must be completed before any previously completed story is considered accepted under the validation evidence rules, and before future story implementation work (US6, US7, US8, US9, US11 polish, or final release validation) is marked complete.

### Remediation for FR-006a, FR-066 through FR-069, SC-001, and SC-010

- [x] T092 [US4] Add an idempotent `pin_login_attempts` migration for FR-006a if missing from deployed schema, including `phone`, `attempts`, `locked_until`, and `updated_at`, in `supabase/migrations/003_pin_login_attempts.sql`
 (Administrative closure: moved to v1.3 execution track in specs/001-dcastle-pg-management/tasks-phases-19-24.md)
- [x] T093 [US4] Implement FR-006a PIN lockout tracking in `POST /api/auth/pin/verify`, returning HTTP 429 after five consecutive failures for the same phone for 15 minutes and clearing attempts after success or cooldown in `src/app/api/auth/pin/verify/route.ts`
 (Administrative closure: moved to v1.3 execution track in specs/001-dcastle-pg-management/tasks-phases-19-24.md)
- [x] T094 [US5] Clear PIN lockout state when an active hosteler is deactivated or deleted so lifecycle actions do not leave stale throttling rows in `src/app/api/hostelers/[id]/route.ts`
 (Administrative closure: moved to v1.3 execution track in specs/001-dcastle-pg-management/tasks-phases-19-24.md)
- [x] T095 [P] [US4] Add unit tests for FR-006a covering attempts 1-4 returning 401, attempt 5 creating a 15-minute lockout, correct PIN rejected during lockout with 429, cooldown reset, and successful login clearing attempts in `src/app/api/auth/pin/verify/route.test.ts`
 (Administrative closure: moved to v1.3 execution track in specs/001-dcastle-pg-management/tasks-phases-19-24.md)

**Checkpoint**: Completed and future validation suites satisfy FR-066 through FR-069; per-story scripts include US12; FR-006a lockout is implemented and tested; SC-001/SC-010 evidence is scoped and recorded; no weak legacy browser suite is treated as acceptance evidence.

---

## Phase 18: Android Mobile App Experience Remediation Gate for Completed Screens (Cross-Cutting P1)

**Goal**: Remediate and validate already-built/current user-facing owner, hosteler, and auth screens so Android mobile is treated as the primary experience, not a desktop layout reduced to phone width, and validate the installed Android PWA standalone context where applicable.

**Independent Test**: Open each already-built/current owner, hosteler, and auth screen at a 375 px Android mobile viewport and complete the core owner and hosteler flows in Android Chrome and installed/standalone PWA context where applicable. Evidence must show no page-level horizontal overflow, clipped primary content, overlapping controls, unreachable primary actions, unsafe spacing, unreadable text, or viewport instability.

**Blocking Rule**: Phase 18 blocks acceptance of already-built/current user-facing screens until their 375 px Android mobile validation passes. Screens used from the installed app also require standalone PWA validation where applicable. Phase 18 is not a deferral bucket for future user-facing phases: US6 through US11 must include mobile-first layout, 375 px Android validation, and standalone PWA validation where applicable in their own story tasks before those phases can be marked complete.

### Mobile App Experience Remediation for FR-071 through FR-079, SC-014, and SC-015

- [x] T103 [P] [US13] Inventory every already-built/current user-facing owner, hosteler, and auth screen and record whether it requires Android Chrome validation, standalone PWA validation, or both in `specs/001-dcastle-pg-management/pwa-android-validation.md`
- [x] T104 [P] [US13] Add or update mobile viewport validation coverage so already-built/current user-facing screens are exercised at 375 px width with assertions against page-level horizontal overflow and unreachable primary actions
- [x] T105 [US13] Remediate shared owner and hosteler navigation shells so primary role destinations are reachable on Android mobile without desktop-only sidebars, hover interactions, off-screen menus, or hidden actions in `src/app/(owner)/layout.tsx`, `src/app/admin/layout.tsx`, and `src/app/(hosteler)/layout.tsx`
- [x] T106 [US13] Remediate completed hosteler-facing screens for readable text, touch-friendly controls, safe spacing, stable viewport behavior, no horizontal overflow, and successful core login/dashboard/submission/dashboard return flow at 375 px and standalone PWA context in `src/app/(auth)/login/page.tsx`, `src/app/(hosteler)/dashboard/page.tsx`, and `src/app/(hosteler)/submit/page.tsx`
- [x] T107 [US13] Remediate completed owner-facing screens for mobile-usable dashboards, lists/tables, dialogs, forms, settings, safe spacing, stable viewport behavior, no horizontal overflow, and successful dashboard/hosteler-management/settings core flows at 375 px and standalone PWA context in `src/app/admin/dashboard/page.tsx`, `src/app/admin/hostelers/page.tsx`, and `src/app/(owner)/settings/page.tsx`
- [x] T108 [P] [US13] Add component or visual-regression-oriented checks for shared UI primitives most likely to break mobile layout, including dialogs, tables, tabs, toggles, cards, and buttons in `src/components/ui/` and related tests
- [x] T109 [US13] Execute Android Chrome manual validation for already-built/current screens at the 375 px baseline and installed/standalone PWA behavior, recording device/emulator, Android version, Chrome version, viewport, pass/fail notes, and screenshots or observations in `specs/001-dcastle-pg-management/pwa-android-validation.md`
- [x] T110 [US13] Run `npm run test:run`, all relevant story-scoped mobile validation commands, and `npm run build:cloudflare`; record any blocked command, environment issue, layout failure, or Cloudflare build issue in `specs/001-dcastle-pg-management/pwa-android-validation.md`

**Checkpoint**: Android mobile is validated as the primary app experience for already-built/current owner, hosteler, and auth screens; applicable standalone PWA checks pass; Cloudflare build parity and validation guardrails remain intact; future user-facing phases still carry their own mobile/PWA implementation and validation obligations.

### Phase 18 UX Refinement Delta for Already Completed Phases 1-18

**Goal**: Improve interaction clarity and recovery UX for already completed screens across auth, hosteler daily flows, owner operations, and PWA shell states without altering existing business rules.

**Execution Rule**: Preserve all previously checked work items. The tasks below are additive refinements only.

- [x] T124 [US13] Add auth and invite form UX consistency refinements: first-invalid-field focus, inline validation harmonization, and preservation of non-invalid inputs on failed submit in `src/app/(auth)/login/page.tsx` and `src/app/(auth)/join/[token]/page.tsx`
- [x] T125 [US1] Refine hosteler daily submission feedback states (loading/success/error with retry guidance) and explicit no-submission-yet empty states in `src/app/(hosteler)/submit/page.tsx` and `src/app/(hosteler)/dashboard/page.tsx`
- [x] T126 [US2] Improve owner dashboard scanability with quick-find controls and deterministic no-data messaging for pending/submitted sections in `src/app/admin/dashboard/page.tsx`
- [x] T127 [US5] Improve hosteler management list UX with quick search/status controls and clearer destructive confirmation impact copy in `src/app/admin/hostelers/page.tsx`
- [x] T128 [US10] Refine owner settings interaction model with clear pending-change summary and actionable empty/error state text in `src/app/(owner)/settings/page.tsx`
- [x] T129 [US11] Refine install/offline shell cues for already completed screens so install availability, reconnect behavior, and offline limitations remain clear but non-blocking in `src/components/install-prompt.tsx`, `src/components/offline-indicator.tsx`, `src/app/layout.tsx`, `src/app/(hosteler)/layout.tsx`, and `src/app/(owner)/layout.tsx`

**Test Coverage Required**:
- [x] Component tests for auth validation focus behavior and retained input on failed submit
- [x] Component tests for hosteler submit/dashboard state matrix (loading/success/error/empty)
- [x] Component tests for owner list quick-find/filter behavior and deterministic no-data states
- [x] Component tests for install/offline indicator visibility and non-blocking behavior

**Checkpoint**: UX refinements for completed Phases 1-18 are implemented additively, tested, and validated without reopening already completed baseline tasks.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies â€” can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion â€” BLOCKS all user stories
- **US3 Invite Activation (Phase 3)**: Depends on Foundational â€” BLOCKS US1 and US4
- **US4 Hosteler Login (Phase 4)**: Depends on Foundational + US3 (hostelers must be activatable first)
- **US1 Food Submission (Phase 5)**: Depends on US3 + US4 (hostelers must log in) â€” **MVP target**
- **US2 Owner Dashboard (Phase 6)**: Depends on Foundational + US1 (needs food data to display counts)
- **US5 Hosteler Management (Phase 7)**: Depends on Foundational only (uses same invite infrastructure as US3)
- **US10 Settings (Phase 8)**: Depends on Foundational â€” should precede US6 (rates needed for billing)
- **US6 Monthly Bills (Phase 9)**: Depends on US1 (needs food preference data) + US5 (needs deleted/canceled lifecycle semantics) + US10 (needs rate history)
- **US7 Food History (Phase 10)**: Depends on US1 (needs food preference data)
- **US8 Hosteler Bill View (Phase 11)**: Depends on US6 (needs generated bills)
- **US9 Owner Food History (Phase 12)**: Depends on US1 (needs food preference data) + US5 (needs deleted-record preserved-history and audit-only visibility semantics)
- **Automation & Validation (Phase 13)**: Existing completed automation foundation for US1â€“US4; future story validation tasks remain in each story phase
- **US11 Android PWA (Phase 14)**: Depends on Foundational; can run in parallel with story work after Phase 2, but must complete before production delivery
- **US12 Auth Proxy (Phase 16)**: Depends on Foundational + US4 (PIN verify route must exist); can run in parallel with Phases 9â€“12
- **Validation Remediation Gate (Phase 17)**: Depends on completed US1, US2, US3, US4, US5, US10, and US12 surfaces; blocks acceptance of completed stories under FR-066 through FR-069 and blocks marking any future story phase complete
- **Android Mobile App Experience Remediation Gate (Phase 18)**: Depends on already-built/current user-facing screens and US11 standalone PWA capability for installed-context validation; blocks acceptance of those completed screens under FR-071 through FR-079, but does not defer future US6 through US11 mobile/PWA work out of their own story tasks
- **Final Polish (Phase 15)**: Depends on desired user stories, US11, Phase 17, and Phase 18 for full quickstart validation

### Mobile/PWA Acceptance Rule for Future User-Facing Work

Future user-facing phases US6 through US11 must be designed, implemented, and validated mobile-first inside their own story phases. Each applicable story must include 375 px Android Chrome validation for no page-level horizontal overflow, reachable primary actions, readable/touch-friendly controls, stable viewport behavior, and standalone PWA validation where that screen is used from the installed app. Passing Phase 18 for already-built/current screens does not satisfy acceptance for future billing, history, settings, or PWA screens.

### User Story Dependencies

```
Phase 2 (Foundational)
  â”œâ”€â”€ Phase 3 (US3: Invite Activation)
  â”‚     â””â”€â”€ Phase 4 (US4: Hosteler Login)
  â”‚           â””â”€â”€ Phase 5 (US1: Food Submission) ðŸŽ¯ MVP
  â”‚                 â”œâ”€â”€ Phase 6 (US2: Owner Dashboard)
  â”‚                 â”œâ”€â”€ Phase 10 (US7: Hosteler Food History)
  â”‚                 â””â”€â”€ Phase 12 (US9: Owner Food History)
  â”œâ”€â”€ Phase 7 (US5: Hosteler Management)
  â”‚     â”œâ”€â”€ Phase 9 (US6: Monthly Bills)
  â”‚     â””â”€â”€ Phase 12 (US9: Owner Food History)
  â”œâ”€â”€ Phase 8 (US10: Settings) â€” independent
  â”‚     â””â”€â”€ Phase 9 (US6: Monthly Bills) â€” needs US1 + US10
  â”‚           â””â”€â”€ Phase 11 (US8: Hosteler Bill View)
  â”œâ”€â”€ Phase 13 (Automation & Validation) â€” after US1-US4 complete
  â”œâ”€â”€ Phase 14 (US11: Android PWA) â€” independent after Foundational, required before production delivery
  â”œâ”€â”€ Phase 16 (US12: Auth Proxy) â€” depends on Foundational + US4; parallel with Phases 9â€“12
  â”œâ”€â”€ Phase 17 (Validation Remediation Gate) â€” depends on completed story surfaces US1/US2/US3/US4/US5/US10/US12; blocks acceptance and future phase completion
  â”œâ”€â”€ Phase 18 (US13: Android Mobile App Experience) â€” remediates already-built/current user-facing screens and validates US11 standalone PWA context where applicable
  â””â”€â”€ Phase 15 (Final Polish) â€” validates completed story set after Phase 17 and Phase 18
```

### Within Each User Story

- Models/types before services
- Services/lib before API routes
- API routes before UI pages
- Core implementation before integration/polish
- For user-facing stories, mobile-first layout and 375 px Android validation are part of the story's own implementation and validation/manual evidence, with standalone PWA validation where applicable
- Story complete before moving to next priority

### Deprecation Policy (Phases 9–12 → Phases 19–24)

**Old Food-Only Billing Tasks (Phases 9, 11)**: ⛔ DEPRECATED
- Phase 9 (US6: Food bills only) → Replaced by Phase 22 (comprehensive room rent + food + transmission)
- Phase 11 (US8: Food bill viewing) → Replaced by Phase 22 hosteler bill view

**Optional Food History Tasks (Phases 10, 12)**: ⏸️ DEFERRED
- Phase 10 (US7: Food history) → Optional; implement if needed after Phase 5
- Phase 12 (US9: Food export) → Optional; consider consolidating with Phase 24 reporting

**New Comprehensive Billing & Property Management (Phases 19–24)**: 🆕 PRIMARY FOCUS
- Replaces food-only billing with full building/room/rent/meal/employee/profit tracking
- All new owner and hosteler billing/accounting workflows route through these phases
- Start immediately after Phase 8 (Settings) completes

### Parallel Opportunities

**Phase 1** (all [P] tasks): T003, T004, T005, T006 can run in parallel after T001+T002

**Phase 2** (after T007+T008): T009, T010, T011, T012, T013 can all run in parallel; T017, T018, T019, T020, T021 can all run in parallel after types are defined

**Phase 5** (US1): T033, T034 can run in parallel (different component files); T035 can start independently of UI components

**Phase 6** (US2): T039, T040 can run in parallel (different component files)

**Phase 7** (US5): T049c and T049d can run in parallel; after the migration/types land, T049e and T049g can proceed in parallel while T049f handles lifecycle mutation logic

**Phase 14** (US11): T070, T071, T072, T073, T074, T075, T078, T079, and T081 can run in parallel where file ownership does not overlap; T076, T077, T080, T082, and T083 depend on the corresponding assets/components/tests existing first

**Phase 17** (Validation Remediation): T091, T092, T095, T096, and T101 can begin in parallel because they touch distinct files; T093 depends on T092, T094 depends on T093, T100 depends on T093 and T095, T097 depends on deterministic test data/helpers from T091, T098/T099 depend on T091 and the existing US12 auth proxy, and T102 depends on T091 through T101

**Phase 18** (Android Mobile App Experience Remediation Gate): T103, T104, and T108 can begin in parallel for already-built/current screens. T105 should land before screen-specific remediation in T106 and T107. T109 depends on the relevant remediation work and US11 installed PWA capability. T110 depends on T103 through T109. Future US6 through US11 screens are not queued into Phase 18; their mobile/PWA validation belongs to their own story tasks.

**Cross-story parallelism** (after Foundational):
- US5 (Hosteler Management) can be worked on in parallel with US3/US4/US1 sequence
- US10 (Settings) can be worked on in parallel with the US3â†’US4â†’US1 sequence
- US11 (Android PWA) can be worked on in parallel with US3/US4/US1/US2 after Foundational because it owns manifest, icons, service worker, install UI, offline UI, and PWA validation evidence
- Phase 17 remediation can start now because the target completed story surfaces already exist, but future story completion remains blocked until Phase 17 passes
- Phase 18 Android mobile app experience remediation can start for any already-built/current user-facing screen, but installed standalone validation depends on US11 PWA capability; future user-facing story work must carry its own Android mobile/PWA acceptance evidence before completion

---

## Implementation Strategy

### MVP Scope (Recommended First Delivery)

**Phases 1â€“5** (Setup â†’ Foundational â†’ US3 â†’ US4 â†’ US1) deliver the core daily food submission value:
- Hostelers can activate accounts and log in
- Hostelers can submit daily food preferences before the deadline
- Deadline is enforced server-side

For a phone-first production delivery, complete **Phase 14 (US11 Android PWA)** and **Phase 18 (Android Mobile App Experience)** alongside or immediately after the MVP so Android users can install, relaunch, and actually use the app as a stable mobile app.

### Incremental Delivery After MVP

1. **US2 (Owner Dashboard)** â€” Completes the owner's daily operational need
2. **US5 (Hosteler Management)** â€” Enables ongoing hosteler lifecycle management
3. **US10 (Settings)** â€” Enables deadline/rate configuration
4. **Phase 17 (Validation Remediation Gate)** â€” Required before accepting completed stories under FR-066 through FR-069 or marking future stories complete
5. **US6 (Monthly Bills)** â€” Monthly billing workflow, including 375 px Android mobile-first owner billing layout and applicable standalone PWA validation inside the story phase
6. **US7, US8, US9** â€” Transparency and reporting features, each including 375 px Android mobile-first layouts and applicable standalone PWA validation inside the story phase
7. **US11 (Android PWA)** â€” True PWA installability, offline app shell, 375 px app-shell validation, automated checks, Cloudflare build parity, and manual Android evidence if not already completed alongside MVP
8. **Phase 18 (Android Mobile App Experience Remediation Gate)** â€” Mobile app-like layout, navigation, touch, overflow, and standalone viewport validation for already-built/current user-facing screens only; it does not replace mobile/PWA tasks in future US6 through US11 phases
9. **Final Polish** â€” Full quickstart validation and release readiness checks

---

## Phase 26: Owner-Assisted PIN Reset Flow (FR-005b/c/d/e, FR-006b/c, FR-029e/f)

**Goal**: When an owner regenerates an invite for an active PIN-linked hosteler, the hosteler opens the link and sets a new PIN (owner-assisted forgot-PIN recovery). The old PIN is immediately invalidated on success. Google-linked hostelers see a redirect message. All error cases use the structured error taxonomy.

**Independent Test**: Owner sends reset invite to active PIN-linked hosteler â†’ hosteler opens link â†’ route detects reset context (active status + PIN credential) â†’ hosteler sets new 4-digit PIN â†’ old PIN rejected, new PIN authenticates â†’ Google-linked hosteler opens reset link â†’ sees "This account is linked to Google sign-in" message â†’ superseded/expired/non-active tokens return correct structured errors.

- [x] T114 [US3] [US5] Update `POST /api/invite/activate` to branch behavior based on hosteler status and linked credential: `pending` status follows existing onboarding activation path; `active` status follows owner-assisted PIN reset path (FR-029f). Implement the reset branch: validate token (one-time-use, FR-005c), reject non-active hostelers with `HTTP 403 / reset_not_allowed_non_active` (FR-005b/FR-005d), set new PIN hash, invalidate old PIN hash atomically, mark token used. Return structured `error.code / error.message / error.recovery_action` for all failure cases (FR-005e) in `src/app/api/invite/activate/route.ts`
- [x] T115 [US3] [US5] Handle Google-linked active hostelers in the reset branch: when `pin_hash` is null and `google_id` is set, the reset flow MUST return `HTTP 200` with `flow: google_linked` and body message `"This account is linked to Google sign-in. Continue with your linked Google account."` rather than allowing PIN creation (FR-006c) in `src/app/api/invite/activate/route.ts`
- [x] T116 [US3] [US5] Update the invite activation page to handle the `flow: reset` and `flow: google_linked` branches: reset branch shows "Set your new PIN" form instead of full onboarding; `google_linked` branch shows the exact instruction message with a Google sign-in button; expired/superseded/used/non-active error codes render consistent recovery guidance using `error.recovery_action` (FR-005d/FR-005e) in `src/app/(auth)/join/[token]/page.tsx`
- [x] T117 [US3] [US5] Add unit tests covering: active PIN-linked hosteler reset (new PIN accepted, old PIN rejected after reset), active Google-linked reset returns `google_linked` message, non-active hosteler reset returns `403/reset_not_allowed_non_active`, superseded token returns `409/invite_superseded`, expired token returns `410/invite_expired`, already-used token returns `409/invite_used`, and PIN set is atomic (no partial write on failure) in `src/app/api/invite/activate/route.test.ts`

---

## Phase 27: v1.3 Delta — Pending Hard Delete & Mobile Uniqueness Validation (FR-029a, FR-001a/FR-001b)

**Goal**: Align the pending hosteler delete path to a complete SQL hard delete (no audit record, no deleted-tab entry, invite tokens removed, mobile number freed), add server-side mobile number uniqueness enforcement at the add-hosteler API, update the UI confirmation dialog and inline form error to match the new semantics, and ensure the deleted tab exclusively surfaces active-deletion records.

**Independent Test**: Owner deletes a pending hosteler → verify row is gone from database, invite tokens removed, deleted tab shows no entry, phone is free for re-registration → owner adds hosteler with phone of an active/pending hosteler → API returns 409, form shows inline field error → owner adds hosteler with phone of a previously hard-deleted pending hosteler → registration succeeds.

- [x] T118 [US5] Update `PATCH /api/hostelers/[id]` pending-delete handler to execute a complete SQL hard delete (`DELETE FROM hostelers WHERE id = $1`) instead of soft archive, omit audit record creation, and confirm all associated invite tokens are removed (via ON DELETE CASCADE or explicit DELETE) so no trace remains per FR-029a in `src/app/api/hostelers/[id]/route.ts`
- [x] T119 [US5] Add mobile number uniqueness pre-check to `POST /api/hostelers`: query `hostelers WHERE phone = $1 AND status IN ('active', 'pending')`; if a match exists return `HTTP 409` with structured body `{ error: { code: 'phone_already_registered', message: 'This mobile number is already registered to an active hosteler.', recovery_action: 'Deactivate or delete the existing hosteler before re-registering this phone number.' } }` per FR-001a in `src/app/api/hostelers/route.ts`
- [x] T120 [US5] Update the pending-delete confirmation dialog text in the owner hosteler management UI to reflect permanent, traceless deletion: "This hosteler will be permanently deleted. Their invite link will be invalidated immediately. No record of this hosteler will be retained. This cannot be undone." per FR-029a in `src/app/admin/hostelers/page.tsx`
- [x] T121 [US5] Add inline phone-field error on the add-hosteler form: when the API returns `HTTP 409` with `error.code === 'phone_already_registered'`, display `error.message` as a field-level validation error beneath the phone input without clearing other form fields per FR-001a in `src/app/admin/hostelers/page.tsx`
- [x] T122 [US5] Ensure `GET /api/hostelers?status=deleted` and the deleted-tab data query only return records where `deleted_from_status = 'active'` so pending hard-delete records never surface in the deleted tab per FR-029a/FR-029c in `src/app/api/hostelers/route.ts` and `src/app/admin/hostelers/page.tsx`
- [x] T123 [P] [US5] Add unit and API integration tests covering: (a) pending-hosteler DELETE removes the hosteler row and its invite tokens with zero audit or deleted-tab records created, (b) `GET /api/hostelers?status=deleted` returns only `deleted_from_status = 'active'` records, (c) `POST /api/hostelers` returns `409 / phone_already_registered` when phone matches an active hosteler, (d) `POST /api/hostelers` returns `409 / phone_already_registered` when phone matches a pending hosteler, and (e) `POST /api/hostelers` succeeds when the phone was previously associated with a hard-deleted pending hosteler (row gone, no conflict) per FR-001a/FR-001b/FR-029a in `src/app/api/hostelers/route.test.ts` and `src/app/api/hostelers/[id]/route.test.ts`




