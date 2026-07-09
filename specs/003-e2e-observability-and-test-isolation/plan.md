# Implementation Plan: E2E Observability and Test Isolation

**Branch**: `003-e2e-observability-and-test-isolation` | **Date**: 2026-07-05 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-e2e-observability-and-test-isolation/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Deliver an engineering quality refactor plan that makes validation deterministic, diagnosable, and faster to iterate without weakening automated coverage. The implementation approach is to introduce risk-based scoped validation scripts, reserve E2E for browser-critical smoke coverage, add headless Playwright defaults with explicit debug scripts, isolate retained E2E factories and cleanup tracking, add safe structured diagnostics for E2E-critical API/UI flows, capture richer Playwright failure artifacts, and audit existing specs so detailed non-critical E2E cases are converted to unit, API integration, or component tests before removal.

## Technical Context

**Language/Version**: TypeScript 5.5, React 19, Next.js 15.3.3 App Router

**Primary Dependencies**: Next.js App Router, Playwright 1.61, Vitest 1.6, Supabase JS 2.45, bcryptjs, Tailwind CSS, shadcn/ui, @cloudflare/next-on-pages

**Storage**: Supabase PostgreSQL with RLS; E2E setup/cleanup may use service-role access server-side only; no new persistent product tables are planned for this quality feature

**Testing**: Vitest for unit, API integration, and component scopes where practical; Playwright for E2E-critical browser/session/cross-role/mobile/PWA smoke coverage; scoped story commands for iteration; completion validation uses `npm run test:run` plus applicable E2E-critical smoke checks. Local `npm run build:cloudflare` is reserved for explicit user request or reported pipeline/build failure diagnosis.

**Target Platform**: Cloudflare Pages Edge runtime for Next.js API routes; local and CI Playwright against `http://localhost:3000`; Android Chrome 375 px remains the baseline for user-facing flow validation affected by E2E specs

**Project Type**: Web application with Next.js API routes, Supabase-backed auth/data, Playwright acceptance tests, and engineering-quality test infrastructure

**Performance Goals**: Story-scoped validation should complete under 2 minutes where the story flow allows; retained E2E smoke runtime should be measured before/after isolation and eligible for controlled worker increases only after shared-state audit passes

**Constraints**: Preserve honest E2E acceptance evidence for browser-critical flows; move detailed non-critical behavior to unit, API integration, or component tests; no route mocks for core E2E-critical behavior; no mutation of shared seeded users except immutable auth-principal use; no secrets or sensitive personal data in logs/artifacts; default E2E must be headless and non-blocking; Cloudflare Edge compatibility must be preserved

**Scale/Scope**: Audit existing E2E coverage for US1, US2, US3, US4, US5, US10, US12, and US13; retain only E2E-critical smoke flows, convert detailed non-critical cases to unit/API/component coverage before removal, add shared factory/helper architecture for retained E2E specs, and document serial exceptions until isolation is complete

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Gate Status**: PASS for planning. This feature is documentation/design work in this phase and does not modify application code or tests.

- **I. Mobile-First**: Applicable to validation design only. Any later user-facing E2E flow changes must preserve Android Chrome 375 px evidence, especially US13 mobile viewport coverage.
- **II. Edge Runtime Compatibility**: PASS. Planned diagnostics must be Edge-compatible and must not introduce Node-only imports into API route dependency graphs.
- **III. Security & Data Isolation**: PASS with controls. Service-role use is limited to E2E setup/teardown helpers outside client bundles. Diagnostics must redact/omit PINs, passwords, tokens, cookies, invite token raw values, service-role keys, and sensitive personal data.
- **VII. Credit-Aware Test Pyramid**: PASS. Scoped iteration uses the cheapest meaningful test type, and completion still requires `npm run test:run` plus applicable E2E-critical smoke coverage.
- **XI. Honest End-to-End Validation**: PASS with explicit guardrail. Retained E2E specs must assert exact business outcomes for browser-critical flows and must not replace core UI/API actions with database setup.
- **XII. Deterministic E2E and Debuggability**: PASS by feature purpose. Plan requires headless defaults, isolated test data, exact business-signal waits, safe diagnostics, and failure artifacts.
- **VIII. CI/CD Pipeline**: PASS. CI/pipeline build validation remains a pipeline concern; local `npm run build:cloudflare` runs only on explicit user request or when diagnosing a reported pipeline/build failure.
- **Task State Preservation**: PASS. This planning step must not modify existing `tasks.md` files or reset completed checkboxes in `specs/001-dcastle-pg-management/tasks.md`.

No constitution violations require complexity tracking.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
package.json                  # Add scoped E2E/debug validation scripts during implementation
playwright.config.ts          # Headless defaults, non-blocking reporter, artifact policy, controlled workers
src/
├── factories.ts              # Planned: isolated hosteler/auth/settings/food test data factories
├── artifacts.ts              # Planned: console/request/response/app-flow artifact collection helpers
├── cleanup-e2e-data.ts       # Existing cleanup surface to extend with tracked IDs/stable markers
├── global-setup.ts           # Existing immutable auth-principal setup; stop mutating shared business records
├── global-teardown.ts        # Existing cleanup; extend to deterministic marker/tracked-ID cleanup
├── helpers.ts                # Existing login/navigation helpers; add exact signal waits as needed
└── us*.spec.ts               # Existing specs to refactor in phases without weakening assertions

src/
├── app/api/**/route.ts       # Edge API diagnostics for auth, invite, food, hostelers, settings, dashboard
├── app/**/page.tsx           # UI action diagnostics for login, join, submit, hosteler lifecycle, settings
└── lib/
    ├── diagnostics/          # Planned: safe structured logging and redaction utilities
    └── supabase/             # Existing Supabase integration; no client exposure of service-role secrets
```

**Structure Decision**: Keep the existing single Next.js application structure. Add shared E2E helpers under `e2e/` and Edge-safe diagnostics under `src/lib/diagnostics/` during implementation. Do not add a separate test package or service because the scope is repository-local validation infrastructure.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitution violations or justified complexity exceptions.

## Phase Plan

### Phase A - Risk-Based Validation Scripts and Playwright Defaults

- Add story-scoped validation scripts that map each story to the cheapest meaningful proof: unit tests for logic, API integration tests for backend/database behavior, component tests for UI state, and E2E smoke tests only for E2E-critical browser/session/cross-role/mobile/PWA risks.
- Keep existing Vitest story scripts and add missing scoped scripts only where the feature tasks require them.
- Change default `npm run test:e2e` behavior to headless, non-blocking reporter output, and failure-only artifacts.
- Add explicit headed/debug scripts for local diagnosis.

### Phase B - E2E Factory and Cleanup Architecture

- Introduce factories for pending hosteler, active PIN-linked hosteler, active Google-linked hosteler, future food preference, settings snapshot/restore, and tracked cleanup metadata.
- Treat global owner and baseline hosteler as immutable authentication principals only.
- Extend teardown to cleanup by tracked IDs and stable E2E markers without deleting unrelated data.

### Phase C - E2E-Critical Audit, Exact Signals, and Honest Assertions

- Audit existing E2E specs and retain only E2E-critical smoke coverage for browser routing, session/cookies, middleware/redirects, cross-role proof, mobile layout, installed/PWA behavior, or other browser-only risks.
- Convert detailed non-critical E2E cases to equivalent unit, API integration, or component coverage before removing the E2E case.
- Refactor retained E2E specs to wait on exact API responses, stable error codes, persisted database/API outcomes, exact UI states, or route state after response success.
- Remove or document primary uses of `networkidle`, full page `load`, arbitrary sleeps, broad regex assertions, and URL-only waits.
- Preserve or strengthen business assertions for completed stories rather than weakening them.

### Phase D - Safe Diagnostics and Failure Artifacts

- Add Edge-safe redaction utilities and structured diagnostic events for API route/action start/end, method, status, duration, stable error code, and correlation ID.
- Add client-side action diagnostics for E2E/debug mode where practical: click, submit start, success/failure, and navigation intent.
- Capture browser console, request/response summaries, app-flow logs, screenshots, traces, and video where configured for failed Playwright runs.

### Phase E - Controlled Parallelism Readiness

- Audit remaining serial dependencies and document exceptions.
- Only after all mutable specs own data, evaluate increasing Playwright workers and record before/after timing evidence.

## Post-Design Constitution Check

**Gate Status**: PASS. The design artifacts preserve final quality gates, keep scoped validation as iteration-only, require deterministic isolated data, require safe redaction, and avoid implementation changes during this planning step.
