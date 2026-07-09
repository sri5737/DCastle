# Research: E2E Observability and Test Isolation

## Decision: Keep scoped validation as an iteration accelerator, not a completion substitute

**Rationale**: The constitution allows narrow validation while a local failure is unresolved, but final completion still requires risk-based automated evidence: `npm run test:run` plus any applicable API integration, component, or retained E2E-critical smoke coverage. Story-scoped Vitest and Playwright commands should be documented as the first checks developers run after changing a story surface. Local `npm run build:cloudflare` is reserved for explicit user request or reported pipeline/build failure diagnosis.

**Alternatives considered**: Replacing E2E-critical browser evidence with unit-only validation was rejected because FR-001b and honest E2E validation still require browser proof for browser/session/cross-role/mobile/PWA risks. Running broad validation during every edit was rejected because FR-001 and FR-019 require faster iteration loops.

## Decision: Use E2E only for browser-critical smoke coverage

**Rationale**: Detailed E2E edge-case coverage slows iteration and increases flakiness when the same behavior can be proven below the browser layer. Unit tests, API integration tests, and component tests are preferred for non-E2E-critical logic, backend persistence, and UI state behavior. E2E remains required for real browser routing, cookies/session persistence, middleware/redirects, cross-role producer-to-consumer proof, Android 375 px layout, installed/PWA behavior, and other browser-only risks.

**Alternatives considered**: Keeping exhaustive E2E coverage was rejected because it wastes local and agent feedback cycles. Deleting E2E coverage without replacement was rejected because FR-001f requires equivalent lower-level automated coverage before non-critical E2E cases are removed.

## Decision: Make Playwright headless and non-blocking by default

**Rationale**: Default `npm run test:e2e` must be suitable for CI and agent automation. Headed browsers and auto-opening HTML reports can slow tests and leave terminal prompts blocking subsequent commands. Debug/headed behavior remains available through explicit scripts.

**Alternatives considered**: Keeping headed mode as default was rejected because it violates FR-002 and FR-004. Removing headed/debug support entirely was rejected because FR-003 requires intentional interactive diagnosis.

## Decision: Use per-test E2E factories backed by Supabase service-role setup helpers

**Rationale**: Current global setup creates and mutates shared test records, which is incompatible with independent, order-safe, and eventually parallel E2E execution. Factories can create unique records with stable E2E markers, return credentials/invite links/IDs, and register cleanup metadata while still exercising the core behavior through real UI/API flows.

**Alternatives considered**: Using only fixed seed records was rejected because destructive and mutable tests would remain order-dependent. Using route mocks was rejected because Principle XI requires real UI and real Next.js API routes for the behavior under test.

## Decision: Treat global seeded users as immutable authentication principals only

**Rationale**: Existing owner credentials are needed for login and owner-surface access, but mutable business assertions must use isolated records. The baseline hosteler may remain for authentication-only smoke flows; tests that change hosteler state must create their own target.

**Alternatives considered**: Deleting global principals was rejected because existing login helpers and environment setup depend on them. Continuing to update the shared hosteler in global setup was rejected because it creates shared-state races and violates FR-007.

## Decision: Capture safe structured diagnostics through Edge-compatible utilities

**Rationale**: API routes run in the Cloudflare Edge runtime, so logging helpers must avoid Node-only dependencies. A small `src/lib/diagnostics/` utility can create correlation IDs, redact sensitive fields, and emit structured events for E2E/debug mode without introducing noisy production logs.

**Alternatives considered**: Adding a paid observability service was rejected as out of scope and against zero-cost infrastructure. Writing ad hoc `console.log` calls in each route was rejected because it risks inconsistent redaction and noisy logs.

## Decision: Collect Playwright artifacts through shared test helpers and reporter configuration

**Rationale**: Trace, screenshot, video, console, request/response summaries, and app-flow logs must be available after failed runs. Centralizing collection in Playwright config and E2E artifact helpers keeps specs focused on business behavior while improving debuggability.

**Alternatives considered**: Relying on screenshots alone was rejected because SC-004 and SC-011 require route/action/status/error-code diagnosis. Always-on heavy artifacts were rejected because they slow scoped validation and create noise.

## Decision: Increase Playwright workers only after isolation audit passes

**Rationale**: The existing suite runs with one worker, which is appropriate until tests stop mutating shared state. Parallelism should be a final phase with before/after timing evidence and serial exceptions documented.

**Alternatives considered**: Increasing workers immediately was rejected because it could expose data races before isolation. Keeping one worker permanently was rejected because FR-020 allows faster full-suite validation after the suite is safe.