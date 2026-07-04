<!--
SYNC IMPACT REPORT
==================
Version change: 1.3.1 -> 1.4.0
Modified principles: None
Added sections:
  - Autonomous Implementation Mode
Removed sections: None
Clarifications:
  - Added explicit /speckit.implement execution rules for autonomous task implementation.
  - Added explicit Validation Rule for build, unit, integration, and E2E test execution.
  - Clarified that iterative fixes, testing, and refactoring do not require human approval.
  - Clarified that commit and push operations always require explicit user instruction.
Templates requiring updates:
  - .github/copilot-instructions.md updated with matching Validation Rule and Autonomous Implementation Mode.
Follow-up TODOs: None
-->

# Deekshana Castle (dCastle) Constitution

## Core Principles

### I. Mobile-First (NON-NEGOTIABLE)

Every UI component and layout MUST be designed for a 375 px viewport first.
Tablet and desktop breakpoints are progressive enhancements, never the baseline.
95 % of users are on mobile — any feature that degrades mobile UX is a defect,
not a trade-off.

- Default font sizes, tap targets, and spacing MUST meet WCAG 2.1 AA on mobile.
- Horizontal scrolling on mobile is forbidden.
- shadcn/ui components MUST be used as the primary UI building block; custom
  components are only permitted when shadcn/ui cannot satisfy the requirement.

### II. Edge Runtime Compatibility (NON-NEGOTIABLE)

All Next.js API routes and middleware MUST declare:

```ts
export const runtime = 'edge';
```

No Node.js-only packages (fs, path, child_process, crypto built-in, etc.) are
permitted inside any file that is imported by an API route or middleware.
Violations block deployment to Cloudflare Pages and MUST be caught in code
review before merging.

- Use `bcryptjs` exclusively — never `bcrypt` (bcrypt is not Edge-compatible).
- Use `crypto.randomUUID()` for token generation — never sequential IDs in
  publicly exposed URLs.

### III. Security & Data Isolation (NON-NEGOTIABLE)

Supabase Row Level Security (RLS) MUST be enabled on every table — no exceptions.
The service role key MUST never be used on the client side or exposed to the
browser. API routes that require elevated access use the service role key
server-side only.

- Client-side Supabase instances use the `anon` key exclusively.
- Invite tokens are random UUIDs (`crypto.randomUUID()`) — never sequential IDs.
- Unregistered Google sign-ins (Google account not linked to a provisioned
  hosteler row) MUST be rejected with a clear "Contact your PG owner" message.
- PIN values are stored as bcryptjs hashes — never plaintext.
- Session lifetimes: hosteler refresh token = 30 days; owner refresh token =
  7 days; access token = 1 h (auto-refreshed by Supabase client).

### IV. Server-Side Deadline Enforcement

Food preference write operations (breakfast / lunch / dinner) MUST be validated
server-side by comparing the current IST (Asia/Kolkata) time against the
`settings.deadline_time` value before any database write is permitted.
Client-side deadline checks are UX only and MUST NOT be the sole gate.

- All food preference submissions MUST use upsert semantics:
  `INSERT ... ON CONFLICT DO UPDATE` — never unconditional INSERT or silent
  duplicates.
- The deadline configuration is stored in the `settings` table and is
  owner-configurable; hardcoded deadline times in application logic are forbidden.

### V. Zero-Cost Infrastructure

The total hosting budget is ~₹42/month (domain registration only). All
infrastructure MUST remain on free tiers:

- Cloudflare Pages: free tier (commercial-friendly, no build-minute cap concerns
  for this scale).
- Supabase: free tier — daily application activity MUST be maintained to prevent
  the automatic inactivity pause.
- Daily database backups via GitHub Actions → Cloudflare R2 (free 10 GB tier).
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

### VII. Unit Testing Coverage (NON-NEGOTIABLE)

Every feature MUST have unit tests covering all core functionality before it is
considered complete. Tests are a delivery requirement, not an afterthought.

- Test coverage MUST include: auth flows (invite token validation, Google OAuth
  linking, PIN verify), deadline enforcement logic, bill calculation
  (days × rate per meal), food preference upsert logic, and RLS policy behavior.
- Use **Vitest** as the test runner — Edge Runtime compatible, works with
  Next.js + Cloudflare Pages.
- Use **@testing-library/react** for component and UI tests.
- Test files live alongside source: `*.test.ts` / `*.test.tsx` co-located with
  the file they test.
- All tests MUST pass before any feature is marked done.

### VIII. CI/CD Pipeline with Isolated Test Job (NON-NEGOTIABLE)

The GitHub Actions CI/CD pipeline MUST have unit tests as a **separate,
dedicated job** — never merged into the build or deploy job.

Pipeline job order (enforced via `needs:` dependencies):

1. `test` — runs `vitest run`; MUST pass before any subsequent job proceeds.
2. `build` — depends on `test` passing; runs Next.js + Cloudflare Pages build.
3. `deploy` — depends on `build` passing; deploys to Cloudflare Pages.

- The `deploy` job MUST never run if `test` or `build` fails.
- The `test` job MUST run on every push and every pull request to `main`.
- Pipeline MUST be defined in `.github/workflows/ci.yml`.
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
| Framework | Next.js 14 (App Router, TypeScript) | App Router only — no Pages Router |
| Styling | Tailwind CSS + shadcn/ui | shadcn/ui preferred over custom components |
| Database + Auth | Supabase (PostgreSQL + RLS + Realtime) | Free tier |
| PWA | Best available npmjs.org-compatible PWA tooling, currently @ducanh2912/next-pwa unless superseded by a better maintained option | Must be Android-installable, app-drawer visible, standalone, and offline app-shell capable |
| Deployment | Cloudflare Pages + @cloudflare/next-on-pages | Edge adapter required |
| PIN hashing | bcryptjs | NOT bcrypt — must be Edge Runtime compatible |
| Backups | GitHub Actions → Cloudflare R2 | Daily, free 10 GB tier |

Local dependency installation:
- Local `npm install` MUST use the public npm registry command:
  `npm install --registry=https://registry.npmjs.org/ --progress=false`
- Do not run bare `npm install` locally for this repository, because it can
  regenerate lockfiles with environment-specific registry metadata.

Authentication flow:
- **Hostelers**: Owner-provisioned invite link → Google OAuth (primary) or
  4-digit PIN fallback.
- **Owner**: Supabase email + password.

## v1 Scope Boundaries

The following capabilities are explicitly OUT OF SCOPE for v1. Implementing them
constitutes a constitution amendment:

- Automated billing or payment gateway integration.
- SMS or email notifications to hostelers.
- Multi-PG (multiple properties) support.
- Auto-generated monthly bills — manual trigger only in v1.

Any spec or task that touches these areas MUST be deferred to a future version
or explicitly ratified via governance amendment.

## Governance

This constitution supersedes all other project practices. Every pull request
MUST include a brief "Constitution Check" confirming no principles are violated.
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

All PRs MUST verify compliance with the ten Core Principles above before merge.
Complexity MUST be justified; if a simpler approach exists, it MUST be preferred.

### Validation Rule

Implementation agents MUST perform all required validation before declaring work
complete:

- Build validation.
- Unit tests.
- Integration tests.
- E2E tests.

Any validation failure MUST be fixed automatically and retested until the
completed scope passes or a genuine blocker is identified. Human approval is NOT
required for iterative fixes, testing, or refactoring within the documented task
scope.

Commit and push operations always require explicit user instruction.

### Autonomous Implementation Mode

When executing `/speckit.implement`, implementation agents MUST proceed
autonomously through the documented task scope:

1. Do not ask for confirmation before modifying files.
2. Implement all tasks automatically.
3. Run unit tests automatically.
4. If tests fail:
   - Analyze failures.
   - Apply fixes.
   - Rerun tests.
   - Repeat until passing or blocked by missing requirements.
5. Run integration tests automatically.
6. Run E2E tests automatically.
7. If E2E tests fail:
   - Diagnose the root cause.
   - Fix bugs.
   - Rerun E2E tests.
   - Repeat until passing.
8. Continue execution without asking for approval between steps.
9. Only stop when all tasks are completed or a genuine blocker requires human
   input.
10. Never commit, create PRs, push branches, or merge code unless explicitly
    requested.
11. Provide a final summary after all validation passes.

**Version**: 1.4.0 | **Ratified**: 2026-07-03 | **Last Amended**: 2026-07-04
