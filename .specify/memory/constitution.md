<!--
SYNC IMPACT REPORT
==================
Version change: 1.7.1 -> 1.7.2
Modified principles:
  - VII. Unit Testing Coverage: expanded into credit-aware test pyramid guidance covering unit, API integration, component, and E2E tests.
  - XI. Honest End-to-End Validation: clarified that E2E is required for E2E-critical browser journeys, not every low-level edge case.
  - XII. Deterministic E2E and Debuggability: added as a new non-negotiable principle for headless defaults, isolated test data, scoped validation, business-signal waits, and safe diagnostics.
Modified sections:
  - Governance: development iteration now prefers scoped validation and the cheapest meaningful test type before full completion gates.
  - Validation Rule: E2E is applicable evidence for critical browser/session/cross-role/mobile flows; unit/API/component tests are preferred elsewhere.
  - Governance and Validation Rule: removed routine local `npm run build:cloudflare` completion-gate requirement; agents run it only on explicit user request or when diagnosing a reported pipeline/build failure.
Added sections:
  - XII. Deterministic E2E and Debuggability
Removed sections:
  - Former automatic `/speckit.implement` execution requirements were removed so agents follow the documented task scope without a blanket autonomous mandate.
Clarifications:
  - Detailed edge cases should usually be proven with unit, API integration, or component tests before E2E.
  - E2E coverage should be smoke-level and business-critical unless a spec explicitly requires deeper browser acceptance coverage.
  - Default E2E runs must be headless, with explicit headed/debug scripts.
  - Mutable and destructive E2E tests must own isolated data and cleanup.
  - E2E waits must use exact business signals rather than load/networkidle/sleeps/URL-only checks.
  - Safe application diagnostics are required for E2E/debug flows and must redact secrets.
  - Cloudflare build parity remains a CI/pipeline concern; local agents do not run `npm run build:cloudflare` unless requested or diagnosing a reported build failure.
Templates requiring updates:
  - .specify/templates/plan-template.md checked; no update required.
  - .specify/templates/spec-template.md checked; no update required.
  - .specify/templates/tasks-template.md checked; no update required.
  - .specify/templates/commands/*.md checked; no files present.
  - .github/copilot-instructions.md updated.
  - specs/003-e2e-observability-and-test-isolation/spec.md created.
Follow-up TODOs: None
-->

# Deekshana Castle (dCastle) Constitution

## Core Principles

### I. Mobile-First (NON-NEGOTIABLE)

Every UI component and layout MUST be designed for a 375 px viewport first.
Tablet and desktop breakpoints are progressive enhancements, never the baseline.
95 % of users are on mobile â€” any feature that degrades mobile UX is a defect,
not a trade-off.

- Default font sizes, tap targets, and spacing MUST meet WCAG 2.1 AA on mobile.
- Horizontal scrolling on mobile is forbidden.
- shadcn/ui components MUST be used as the primary UI building block; custom
  components are only permitted when shadcn/ui cannot satisfy the requirement.
- Android Chrome at 375 px width is the required design baseline for every
  user-facing owner, hosteler, and auth screen. Wider layouts are enhancements
  only after the 375 px experience is complete.
- The app MUST feel and behave like a mobile app in Android PWA usage: primary
  navigation and primary actions must be reachable without desktop sidebars,
  hover-only affordances, off-screen menus, hidden controls, or precision mouse
  interactions.
- Primary controls, form fields, dialogs, tabs, toggles, tables/lists, and
  bottom/top navigation MUST remain readable, touch-friendly, and reachable with
  safe spacing. Controls should be at least 44 px in their smallest touch
  dimension unless a stricter component standard applies.
- Page-level horizontal overflow, clipped content, overlapping controls,
  unreachable submit/save/delete actions, unstable viewport jumps, and text that
  cannot fit its container are release-blocking defects on Android mobile.
- Data-dense owner surfaces such as dashboards, hosteler lists, history,
  billing, exports, and settings MUST use mobile-appropriate layouts such as
  stacked cards, segmented views, contained tables, or horizontally contained
  regions that do not create page-level overflow.
- User-facing work is not complete until the relevant screens are validated at
  375 px Android mobile width. Screens used from the installed app also require
  installed/standalone PWA validation where applicable.

### II. Edge Runtime Compatibility (NON-NEGOTIABLE)

All Next.js API routes and middleware MUST declare:

```ts
export const runtime = 'edge';
```

No Node.js-only packages (fs, path, child_process, crypto built-in, etc.) are
permitted inside any file that is imported by an API route or middleware.
Violations block deployment to Cloudflare Pages and MUST be caught in code
review before merging.

- Use `bcryptjs` exclusively â€” never `bcrypt` (bcrypt is not Edge-compatible).
- Use `crypto.randomUUID()` for token generation â€” never sequential IDs in
  publicly exposed URLs.

### III. Security & Data Isolation (NON-NEGOTIABLE)

Supabase Row Level Security (RLS) MUST be enabled on every table â€” no exceptions.
The service role key MUST never be used on the client side or exposed to the
browser. API routes that require elevated access use the service role key
server-side only.

- Client-side Supabase instances use the `anon` key exclusively.
- Invite tokens are random UUIDs (`crypto.randomUUID()`) â€” never sequential IDs.
- Unregistered Google sign-ins (Google account not linked to a provisioned
  hosteler row) MUST be rejected with a clear "Contact your PG owner" message.
- PIN values are stored as bcryptjs hashes â€” never plaintext.
- Session lifetimes: hosteler refresh token = 30 days; owner refresh token =
  7 days; access token = 1 h (auto-refreshed by Supabase client).

### IV. Server-Side Deadline Enforcement

Food preference write operations (breakfast / lunch / dinner) MUST be validated
server-side by comparing the current IST (Asia/Kolkata) time against the
`settings.deadline_time` value before any database write is permitted.
Client-side deadline checks are UX only and MUST NOT be the sole gate.

- All food preference submissions MUST use upsert semantics:
  `INSERT ... ON CONFLICT DO UPDATE` â€” never unconditional INSERT or silent
  duplicates.
- The deadline configuration is stored in the `settings` table and is
  owner-configurable; hardcoded deadline times in application logic are forbidden.

### V. Zero-Cost Infrastructure

The total hosting budget is ~â‚¹42/month (domain registration only). All
infrastructure MUST remain on free tiers:

- Cloudflare Pages: free tier (commercial-friendly, no build-minute cap concerns
  for this scale).
- Supabase: free tier â€” daily application activity MUST be maintained to prevent
  the automatic inactivity pause.
- Daily database backups via GitHub Actions â†’ Cloudflare R2 (free 10 GB tier).
- No paid external services: no SMS/OTP API, no WhatsApp API, no email
  notification service.

Any feature proposal that introduces a recurring paid dependency is out of scope
until explicitly approved and budgeted.

### VI. TypeScript Strict Mode & Simplicity

TypeScript `strict: true` is mandatory across the entire codebase. Implicit `any`
is a lint error. Type assertions (`as`) MUST be justified with a comment.

- YAGNI: build only what the current spec requires; do not pre-engineer for
  multi-PG, payment gateways, or notification services in v1.
- Prefer Supabase Realtime subscriptions over polling for live count updates.
- Keep components small and composable; co-locate types with the files that
  own them.

### VII. Credit-Aware Test Pyramid (NON-NEGOTIABLE)

Every feature MUST have automated tests covering its core functionality before
it is considered complete. Tests are a delivery requirement, not an
afterthought, but the test type MUST match the behavior being proven so local
development and agent iteration do not waste time or AI credits.

- Prefer **unit tests** for pure logic, validation, status transitions,
  deadline enforcement, bill calculations, food preference upsert rules,
  permission helpers, diagnostics, redaction, and deterministic helper logic.
- Prefer **API integration tests** for real backend behavior, database
  persistence, RLS/authorization behavior, invite validation/activation, PIN
  verification, session/logout, food submission persistence, dashboard counts,
  hosteler lifecycle, settings save/read, billing, history, exports, and other
  API-owned behavior.
- Prefer **component tests** with **@testing-library/react** for form validation,
  loading/error/success states, disabled buttons, toggles, dialogs, tabs,
  mobile navigation visibility, and UI behavior that does not require real
  browser routing or cookies.
- Use **E2E tests** for critical browser journeys where real UI routing,
  middleware, cookies/session persistence, cross-role behavior, realtime/read
  surfaces, Android 375 px layout, PWA behavior, or Cloudflare-like app wiring is
  part of the requirement.
- E2E tests SHOULD be smoke-level and business-critical. Detailed edge cases
  SHOULD be covered by unit, API integration, or component tests unless the
  relevant spec/task explicitly requires browser-level acceptance coverage.
- Use **Vitest** as the default runner for unit, component, and API integration
  scopes where practical â€” Edge Runtime compatible, works with Next.js +
  Cloudflare Pages.
- Test files live alongside source where practical: `*.test.ts` / `*.test.tsx`
  co-located with the file they test. Cross-cutting E2E specs live under
  `e2e/`.
- All required tests for the documented scope MUST pass before any feature is
  marked done.

### XI. Honest End-to-End Validation (NON-NEGOTIABLE)

E2E tests are acceptance evidence for E2E-critical browser journeys. They MUST
prove the user-story independent test stated in `spec.md`/`tasks.md`; they MUST
NOT only prove that a page loads, a URL changes, or a heading is visible.

E2E is required when the documented behavior depends on real browser routing,
middleware, cookies/session persistence, real UI-to-API wiring, cross-role
producer-to-consumer proof, realtime/read surfaces, Android 375 px layout,
installed PWA behavior, or another browser-only risk. Pure logic, internal API
behavior, server-side persistence rules, and UI component states SHOULD be
validated primarily with unit, API integration, and component tests.

- Every E2E test for a story MUST include at least one falsifiable assertion on
  the core business outcome of that story.
- Cross-role flows MUST exercise the full producer-to-consumer behavior in one
  test or an explicitly linked test sequence. Example: a hosteler submits food
  preferences, then the owner dashboard MUST show the exact meal counts and the
  hosteler MUST move from Pending to Submitted.
- Login/auth E2E tests MUST verify post-login stability after client effects run
  and after a reload, so redirect loops and stale client session checks are
  caught.
- E2E tests MUST use the real app UI and real Next.js API routes for the feature
  under test. Route mocks, direct localStorage/session injection, manual cookie
  injection, or direct database writes are allowed only for global test setup or
  teardown and MUST NOT replace the core action being validated.
- Conditional skips such as "if closed, return", broad regex checks such as
  `pending|submitted|hosteler`, and shell-only assertions such as URL/heading
  checks are forbidden as completion evidence unless paired with the exact
  business assertion required by the story.
- When a feature depends on persisted or realtime data, the E2E test MUST assert
  both the write path and the read path. For dashboard/realtime behavior, the
  test MUST verify the initial fetch and at least one update caused by a real
  submitted record.
- If the current app state or time makes the core path untestable, the test MUST
  set up deterministic state through documented setup helpers, or the task is
  blocked. It MUST NOT silently pass on a weaker assertion.

Any E2E test that can pass while the documented core workflow is broken is a
constitution violation and MUST be fixed before the task or phase is marked
complete.

### XII. Deterministic E2E and Debuggability (NON-NEGOTIABLE)

E2E tests MUST be deterministic, independently executable, and debuggable from
captured artifacts. Faster development loops are allowed only when they preserve
the full completion gate and the honest acceptance evidence required by
Principle XI.

- Playwright E2E MUST run headless by default in local validation and CI.
  Headed or inspector mode is permitted only through explicit headed/debug
  scripts.
- Every E2E test that mutates application state MUST create or provision its own
  isolated test data unless the task explicitly documents read-only use of
  global seed data.
- E2E tests MUST NOT mutate shared seeded users or records that another test
  depends on. Global login principals may be used only as immutable
  authentication principals.
- Destructive workflows such as deactivate, reactivate, delete, reset invite,
  PIN reset, billing regeneration, settings updates, and export validation MUST
  use isolated per-test records and deterministic cleanup.
- Test setup MAY use service-role helpers, direct database inserts, or API
  helpers for deterministic prerequisites, but those helpers MUST NOT replace
  the core user action or business outcome being validated.
- E2E tests MUST wait on exact business signals: specific API responses, stable
  error codes, exact persisted API/database outcomes, exact UI state, or route
  state after response success.
- E2E tests SHOULD NOT use `networkidle`, full page `load`, arbitrary sleeps,
  broad regex assertions, or URL-only waits as primary completion evidence. Any
  exception MUST be documented in the test or task.
- Each E2E spec MUST clean up records it creates through tracked IDs, stable E2E
  prefixes, or metadata so teardown remains safe.
- Playwright traces, screenshots, video where configured, browser console logs,
  request/response summaries, and safe application flow logs MUST be captured
  for failed E2E runs.
- API and UI flows used by E2E MUST expose safe structured diagnostics for
  route/action, method, status, duration, stable error code, and correlation ID
  where practical.
- Future E2E development MUST comply with the diagnostic event and failure
  artifact contract in
  `specs/003-e2e-observability-and-test-isolation/contracts/diagnostic-events.md`.
  Any new or changed E2E-critical flow MUST either implement the required API/UI
  diagnostic events or document why the flow is outside that contract.
- Diagnostic logs and artifacts MUST NOT include PINs, passwords, cookies,
  invite token raw values, access tokens, refresh tokens, service-role keys, or
  unmasked sensitive personal data.
- Agents SHOULD run the narrowest relevant validation first during development:
  affected unit tests, affected API integration tests, affected component tests,
  affected story/phase E2E only for E2E-critical flows, then the required
  documented completion tests for the scope.
- Local agents MUST NOT run `npm run build:cloudflare` as a routine completion
  gate. Run it only when the user explicitly requests it or when diagnosing a
  reported pipeline/build failure.
- Playwright worker parallelism MAY increase only after an isolation audit proves
  tests no longer mutate shared state. Any spec that remains serial MUST
  document the shared dependency and follow-up isolation task.

### VIII. CI/CD Pipeline with Isolated Test Job (NON-NEGOTIABLE)

The GitHub Actions CI/CD pipeline MUST have unit tests as a **separate,
dedicated job** â€” never merged into the build or deploy job.

Pipeline job order (enforced via `needs:` dependencies):

1. `test` â€” runs `vitest run`; MUST pass before any subsequent job proceeds.
2. `build` â€” depends on `test` passing; runs the Cloudflare Pages adapter build.
3. `deploy` â€” depends on `build` passing; deploys to Cloudflare Pages.

- The `deploy` job MUST never run if `test` or `build` fails.
- The `test` job MUST run on every push and every pull request to `main`.
- Pipeline MUST be defined in `.github/workflows/ci.yml`.
- CI deployment validation MUST keep a build job that catches strict TypeScript,
  Next.js production build, and Cloudflare adapter/runtime failures before
  Cloudflare Pages deployment.
- Local agents MUST NOT run `npm run build:cloudflare` by default. Run it only
  on explicit user request or when diagnosing a reported pipeline/build failure.
- Any change that disables or bypasses the `test` job constitutes a
  constitution violation and MUST NOT be merged.

### IX. Idempotent Database Migrations (NON-NEGOTIABLE)

All SQL migration files MUST be idempotent and safe to re-run across QA and prod
environments without errors. This enables shared databases (e.g., QA used by
both local dev and QA servers) and safe re-deployment.

- Tables: `CREATE TABLE IF NOT EXISTS`
- Indexes: `CREATE INDEX IF NOT EXISTS`
- Functions: `CREATE OR REPLACE FUNCTION`
- Policies: `DROP POLICY IF EXISTS` before `CREATE POLICY`
- Triggers: `DROP TRIGGER IF EXISTS` before `CREATE TRIGGER`
- Realtime publications: check `pg_publication_tables` before `ALTER PUBLICATION`
- Seed data: `INSERT ... ON CONFLICT DO NOTHING` (or `DO UPDATE` where appropriate)
- Never use bare `CREATE TABLE`, `CREATE INDEX`, `CREATE POLICY`, or
  `CREATE TRIGGER` without the idempotency guard.

### X. True Progressive Web App (NON-NEGOTIABLE)

The website MUST be built and validated as a true Progressive Web App, not only
a mobile-responsive website. Android Chrome is the required installability
target: users MUST be able to install Deekshana Castle so it appears in the
Android app drawer alongside native apps.

- The manifest MUST include app name, short name, start URL, scope, standalone
  display mode, theme color, background color, and Android-suitable icon
  metadata.
- Launcher icons MUST include 192x192 and 512x512 sizes and maskable icon
  support.
- A service worker MUST cache the core app shell so layout, navigation, login
  entry points, and primary owner/hosteler shells load offline.
- Install UI MUST only appear when browser installability is available and MUST
  trigger the native PWA installation flow.
- PWA completion requires automated validation for manifest/service-worker/
  offline-shell behavior plus manual Android device or emulator evidence that
  the installed app appears in the app drawer and launches standalone.

## Approved Tech Stack

The following stack is FINALIZED for v1 and MUST NOT be changed without a
constitution amendment:

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15.3.3 (Next.js 15 App Router, TypeScript) | App Router only â€” no Pages Router |
| Styling | Tailwind CSS + shadcn/ui | shadcn/ui preferred over custom components |
| Database + Auth | Supabase (PostgreSQL + RLS + Realtime) | Free tier |
| PWA | Best available npmjs.org-compatible PWA tooling, currently @ducanh2912/next-pwa unless superseded by a better maintained option | Must be Android-installable, app-drawer visible, standalone, and offline app-shell capable |
| Deployment | Cloudflare Pages + @cloudflare/next-on-pages | Edge adapter required |
| PIN hashing | bcryptjs | NOT bcrypt â€” must be Edge Runtime compatible |
| Backups | GitHub Actions â†’ Cloudflare R2 | Daily, free 10 GB tier |

Local dependency installation:
- Local `npm install` MUST use the public npm registry command:
  `npm install --registry=https://registry.npmjs.org/ --progress=false`
- Do not run bare `npm install` locally for this repository, because it can
  regenerate lockfiles with environment-specific registry metadata.

Authentication flow:
- **Hostelers**: Owner-provisioned invite link â†’ Google OAuth (primary) or
  4-digit PIN fallback.
- **Owner**: Supabase email + password.

## v1 Scope Boundaries

The following capabilities are explicitly OUT OF SCOPE for v1. Implementing them
constitutes a constitution amendment:

- Automated billing or payment gateway integration.
- SMS or email notifications to hostelers.
- Multi-PG (multiple properties) support.
- Auto-generated monthly bills â€” manual trigger only in v1.

Any spec or task that touches these areas MUST be deferred to a future version
or explicitly ratified via governance amendment.

## Governance

This constitution supersedes all other project practices. Every pull request
MUST include a brief "Constitution Check" confirming no principles are violated.
Before declaring deployment readiness or phase completion, validation evidence MUST include the required unit, API integration, and component tests for the documented scope. E2E execution is not part of the routine local quality gate. Local `npm run build:cloudflare` evidence is
required only when explicitly requested by the user or when diagnosing a reported
pipeline/build failure.
For user-facing changes, validation evidence MUST also include Android mobile
layout checks for the affected screens at the 375 px baseline, and
installed/standalone PWA checks where the screen is used from the installed app.
During implementation, agents SHOULD avoid repeatedly running full E2E while a
narrower failing check remains unresolved. Use the cheapest meaningful test type
for iteration first: unit tests for logic, API integration tests for backend and
persistence behavior, component tests for UI states, then scoped E2E only for
E2E-critical browser journeys. Run broad gates only before declaring completion
for a scope that requires them.
Amendments require:

1. A written proposal describing the change, its rationale, and a migration plan
   for any impacted code or specs.
2. Explicit ratification recorded as a constitution version bump per the
   semantic versioning policy below.
3. All dependent templates and docs updated in the same commit.

**Versioning policy**:
- MAJOR: backward-incompatible governance change, principle removal, or
  redefinition of a NON-NEGOTIABLE rule.
- MINOR: new principle or section added; materially expanded guidance.
- PATCH: clarifications, wording fixes, typo corrections.

All PRs MUST verify compliance with the Core Principles above before merge.
Complexity MUST be justified; if a simpler approach exists, it MUST be preferred.

### Task State Preservation (NON-NEGOTIABLE)

`tasks.md` is both planning and execution state. Completed checklist items are authoritative evidence of work already delivered.

- Regeneration workflows MUST preserve existing completed task checkmarks (`- [x]`) when task intent is unchanged.
- Agents MUST NOT bulk-reset task checkboxes during plan/task refresh.
- If task IDs or phrasing are regenerated, agents MUST reconcile prior completed tasks to equivalent regenerated tasks in the same operation.
- Reopening previously completed tasks requires explicit user instruction.

Rationale: accidental checkbox resets create requirement drift and can trigger duplicate implementation of already completed functionality.

### Validation Rule

Implementation agents MUST perform all required validation before declaring work
complete:

- Unit tests.
- API integration tests for backend/API/database behavior.
- Component tests for UI states and form behavior.
- Android mobile layout validation for affected user-facing screens.
- Installed/standalone PWA validation for affected installed-app screens.

Any validation failure MUST be fixed automatically and retested until the
completed scope passes or a genuine blocker is identified. Human approval is NOT
required for iterative fixes, testing, or refactoring within the documented task
scope.

Commit and push operations always require explicit user instruction.

**Version**: 1.7.3 | **Ratified**: 2026-07-03 | **Last Amended**: 2026-07-09

