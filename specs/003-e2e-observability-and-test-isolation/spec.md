# Feature Specification: E2E Observability and Test Isolation

**Feature Branch**: `003-e2e-observability-and-test-isolation`

**Created**: 2026-07-05

**Status**: Draft

**Input**: User description: "Create an engineering quality feature specification for E2E Observability and Test Isolation. Developers and agents need faster scoped validation loops, isolated E2E data, headless defaults with explicit debug scripts, exact business-signal waits, richer failure artifacts, safe structured application logging for E2E/debug mode, test data factories, and a path to parallel Playwright workers after isolation. This is documentation/specification work only and must not weaken final quality gates."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer Runs Scoped Validation Quickly (Priority: P1)

As a developer or coding agent, I want focused validation commands for the current story or phase, so I can iterate on failures without repeatedly running broad validation, exhaustive E2E suites, or local Cloudflare builds.

**Why this priority**: The current development loop spends most time rerunning broad validation while a narrow failing slice is still unresolved. Scoped validation keeps feedback fast while preserving automated coverage and final quality expectations.

**Independent Test**: Change behavior in one story, run the cheapest meaningful affected validation command, verify only the affected slice executes, and confirm documented completion validation still covers the changed risk without requiring routine local Cloudflare builds.

**Acceptance Scenarios**:

1. **Given** a developer changes invite, auth, food submission, settings, or hosteler lifecycle code, **When** they run the documented scoped command, **Then** only the affected unit, API integration, component, or E2E coverage required by the changed risk executes.
2. **Given** a scoped validation fails, **When** the developer investigates, **Then** the workflow requires fixing and rerunning the scoped failing check before running the full gate.
3. **Given** a task or phase is ready to complete, **When** completion validation is performed, **Then** the full unit/integration gate and applicable E2E-critical smoke coverage run and must pass, while local Cloudflare build parity runs only when explicitly requested or when diagnosing a reported pipeline/build failure.

---

### User Story 1a - Team Uses E2E Only for Browser-Critical Risk (Priority: P1)

As a maintainer, I want E2E coverage reserved for flows that require real browser proof, so the suite stays fast, reliable, and focused on risks that lower-level tests cannot honestly prove.

**Why this priority**: Exhaustive E2E edge-case coverage slows iteration and increases flakiness. Non-browser-critical behavior should still be tested, but at the cheapest meaningful level that proves the business outcome.

**Independent Test**: Audit an existing detailed E2E case, classify whether it depends on browser routing, session/cookies, middleware/redirects, cross-role UI proof, mobile layout, installed/PWA behavior, or another browser-only risk, then either keep it as E2E-critical or move equivalent coverage to unit, API integration, or component tests before removing the E2E case.

**Acceptance Scenarios**:

1. **Given** a behavior involves pure logic, validation, calculations, status transitions, utility/helper behavior, or redaction, **When** coverage is selected, **Then** it is covered by unit tests rather than E2E unless a separate browser-only risk is documented.
2. **Given** a behavior involves backend/API/database persistence, auth/session rules, permissions/RLS, invite activation backend behavior, food submission persistence, dashboard counts, hosteler lifecycle, settings, billing, history, or export results, **When** coverage is selected, **Then** API integration tests are preferred unless real browser/session proof is required.
3. **Given** a behavior involves form validation, loading/error/success states, disabled/enabled controls, toggles, dialogs, tabs, responsive navigation visibility, or UI states that do not require real browser/session proof, **When** coverage is selected, **Then** component tests are preferred.
4. **Given** a behavior depends on real browser routing, session/cookies, middleware/redirects, cross-role producer-to-consumer proof, Android 375 px layout, installed/PWA behavior, or another browser-only risk, **When** coverage is selected, **Then** smoke-level E2E coverage is required.
5. **Given** existing E2E coverage includes detailed edge cases that are not E2E-critical, **When** the suite is reduced, **Then** equivalent unit, API integration, or component coverage exists before the E2E case is removed.

---

### User Story 2 - E2E Tests Own Their Data (Priority: P1)

As a maintainer, I want every E2E test to create and clean up its own data, so tests can run independently, in any order, and eventually in parallel without shared-state failures.

**Why this priority**: Current E2E failures are caused by tests mutating shared seeded hostelers and observing state left by other tests. Independent data ownership is required before parallelism or reliable full-suite validation.

**Independent Test**: Run each E2E spec alone and as part of the full suite in a different order; each test creates unique records, validates its own business outcome, and cleans up only records it created.

**Acceptance Scenarios**:

1. **Given** any E2E test starts, **When** it needs mutable records, **Then** it creates unique records using approved E2E factory helpers instead of mutating shared seeded users.
2. **Given** an E2E test performs destructive actions such as deactivate, reactivate, delete, reset invite, PIN reset, billing generation, settings update, or export, **When** setup is performed, **Then** the destructive target is an isolated per-test record.
3. **Given** an E2E test completes or fails, **When** teardown runs, **Then** records created by that test are removable through stable E2E prefixes, metadata, or tracked IDs without deleting unrelated records.
4. **Given** a test uses an immutable global login principal, **When** it needs mutable business data, **Then** it creates separate per-test business records and does not edit the global principal except through documented authentication-only use.

---

### User Story 3 - E2E Failures Are Diagnosable From Artifacts (Priority: P1)

As a coding agent debugging E2E failures, I want request, response, console, screenshot, trace, and safe application-flow logs available from failed runs, so I can identify whether the click fired, the request started, the API returned, and the UI reacted.

**Why this priority**: Current failures often show only a stuck button or a timeout. Without structured diagnostics, agents spend time guessing whether the problem is a selector, request, API route, Supabase latency, navigation, or UI state update.

**Independent Test**: Force a controlled E2E failure in an invite activation or food submission flow and verify the failure artifacts include the browser screenshot, trace, console logs, failed API response summary, and safe app-flow log entries without sensitive values.

**Acceptance Scenarios**:

1. **Given** an E2E action clicks a submit/reset/save/delete/generate button, **When** the action runs in E2E/debug mode, **Then** a safe UI action log identifies action name, route, request correlation ID when available, and result state.
2. **Given** an API route used by E2E returns success or failure, **When** logging is enabled, **Then** a structured log records route, method, action, status, duration, stable error code if present, and correlation ID.
3. **Given** an E2E test fails, **When** artifacts are inspected, **Then** trace, screenshot, video when configured, relevant console logs, request/response summary, and app-flow logs are available.
4. **Given** logs are captured, **When** sensitive fields are present in the flow, **Then** PINs, passwords, tokens, cookies, service-role keys, access tokens, refresh tokens, invite token raw values, and sensitive personal data are redacted or omitted.
5. **Given** a major flow runs in E2E/debug mode, **When** login, invite validation, invite activation, PIN reset, food submission, hosteler lifecycle, or settings save actions occur, **Then** safe structured logs identify the route/action/status/duration/error code needed to diagnose the flow.

---

### User Story 4 - Playwright Runs Headless By Default (Priority: P2)

As a developer or CI maintainer, I want Playwright to run headless by default with explicit debug/headed scripts, so local and CI validation is faster and does not leave report servers or visible browsers blocking automation.

**Why this priority**: The current default headed browser and HTML reporter slow down iteration and can leave report server prompts that intercept subsequent terminal commands.

**Independent Test**: Run `npm run test:e2e` and verify it runs headless, does not auto-open or block on HTML report serving, and captures trace/screenshot/video only as configured for failures. Run a debug script and verify headed mode remains available on demand.

**Acceptance Scenarios**:

1. **Given** a developer runs the default E2E command, **When** Playwright starts, **Then** it runs headless and does not open a visible browser.
2. **Given** a developer needs interactive diagnosis, **When** they run the documented headed/debug command, **Then** Playwright opens headed or inspector mode intentionally.
3. **Given** an E2E run fails, **When** the command exits, **Then** it returns control to the terminal without a blocking HTML report server prompt.

---

### User Story 5 - Full Suite Can Safely Become Faster (Priority: P2)

As a maintainer, I want the E2E suite to be eligible for controlled parallelism after tests are isolated, so full validation time decreases without data races.

**Why this priority**: The full E2E suite currently runs with one worker. Parallelism is unsafe until every mutable test owns its data and avoids shared state.

**Independent Test**: After isolation refactor, run the full E2E suite with the approved worker count and verify the same tests pass repeatedly without order-dependent failures.

**Acceptance Scenarios**:

1. **Given** tests have been audited and isolated, **When** Playwright workers are increased, **Then** no test mutates records another test depends on.
2. **Given** a test cannot yet be isolated, **When** it is documented, **Then** it remains serial with explicit rationale and does not block parallelization of isolated specs.
3. **Given** full validation runs before phase completion, **When** the suite completes, **Then** timing evidence is recorded for before/after comparison.

## Edge Cases

- A story legitimately depends on a global login principal: the principal may be used for authentication only, but mutable business records must still be per-test.
- A test needs direct database setup for deterministic state: setup may use service-role helpers, but the core user action and business outcome must still be exercised through real UI/API unless the task explicitly documents API-only scope.
- A route returns an expected business error: the test must assert the exact status and stable error code instead of treating any non-200 as a generic failure.
- A page navigation is delayed by Next.js dev tooling or service worker behavior: the test must wait on the exact API response and business UI state rather than `networkidle` or full `load`.
- A log field may contain sensitive data: it must be redacted or excluded before writing to console, artifacts, or persistent logs.
- Parallel execution causes a race: reduce scope to serial for the affected spec and document the remaining shared dependency as a task to remove.
- A detailed E2E edge case proves behavior that can be fully validated below the browser layer: convert that case to unit, API integration, or component coverage before removing the E2E assertion.
- A user-facing flow includes both browser-critical and non-browser-critical behavior: keep an E2E smoke path for the browser-critical journey and move detailed permutations to cheaper tests.
- A local agent reaches completion validation: do not run `npm run build:cloudflare` unless the user explicitly asks for it or the work is diagnosing a reported pipeline/build failure.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The repository MUST provide scoped validation commands for story-level and phase-level iteration, including at minimum invite/auth, hosteler lifecycle, owner-assisted PIN reset, food submission, and settings coverage.
- **FR-001a**: Every new or changed feature MUST have automated coverage using the cheapest meaningful test type that proves the behavior without weakening acceptance quality.
- **FR-001b**: E2E tests MUST be kept or written only for E2E-critical flows involving real browser routing, session/cookies, middleware/redirects, cross-role producer-to-consumer workflows, Android 375 px layout, installed/PWA behavior, or other browser-only risks.
- **FR-001c**: Non-E2E-critical pure logic, validation, calculations, status transitions, utility/helper behavior, and redaction behavior MUST be covered by unit tests instead of E2E.
- **FR-001d**: Non-E2E-critical backend/API/database persistence, auth/session rules, permissions/RLS, invite activation backend behavior, food submission persistence, dashboard counts, hosteler lifecycle, settings, billing, history, and export behavior MUST be covered by API integration tests where practical instead of E2E.
- **FR-001e**: Non-E2E-critical form validation, loading/error/success states, disabled/enabled controls, toggles, dialogs, tabs, responsive navigation visibility, and UI states MUST be covered by component tests where practical instead of E2E.
- **FR-001f**: Existing E2E coverage MUST be audited and reduced or retained based on E2E-critical risk; detailed non-critical E2E edge cases MUST be converted to equivalent unit, API integration, or component coverage before removal.
- **FR-002**: The default Playwright E2E command MUST run headless locally and in CI.
- **FR-003**: The repository MUST provide explicit headed/debug Playwright commands for interactive diagnosis.
- **FR-004**: Playwright HTML reports MUST NOT auto-open or block terminal completion by default.
- **FR-005**: E2E runs MUST retain useful failure artifacts, including trace, screenshot, video where configured, relevant console logs, and request/response summaries where useful.
- **FR-006**: Every E2E test that mutates application state MUST create or provision unique per-test records through documented helpers.
- **FR-007**: E2E tests MUST NOT mutate global seeded users or shared records that another test depends on.
- **FR-008**: Destructive E2E workflows MUST use isolated targets and deterministic cleanup.
- **FR-009**: E2E setup helpers MAY use service-role database access or real API requests for deterministic setup, but MUST NOT replace the core business action under test.
- **FR-010**: E2E tests MUST wait on exact business signals, such as specific API responses, stable error codes, exact UI state, exact persisted API/database outcome, or route state after response success.
- **FR-011**: E2E tests MUST avoid `networkidle`, full page `load`, arbitrary sleeps, broad regex assertions, and URL-only waits as primary completion evidence unless explicitly documented with rationale.
- **FR-012**: E2E data factories MUST support pending hosteler, active PIN-linked hosteler, active Google-linked hosteler, future food preference, owner settings snapshot/restore, and cleanup by tracked IDs or stable E2E marker.
- **FR-013**: API routes used by E2E-critical flows MUST support safe structured diagnostics for route start/end, method, action, status, duration, stable error code, and correlation ID.
- **FR-014**: Client UI flows used by E2E-critical actions MUST support safe action diagnostics for button click, submit start, submit success/failure, and navigation intent where practical.
- **FR-014a**: Safe diagnostics MUST cover major flows including login, invite validate/activate, PIN reset, food submit, hosteler lifecycle, and settings save.
- **FR-015**: Diagnostic logging MUST be gated by environment or test/debug mode where appropriate and MUST NOT create noisy production logs beyond approved operational events.
- **FR-016**: Diagnostic logs and artifacts MUST NOT include PINs, passwords, access tokens, refresh tokens, cookies, invite token raw values, service-role keys, or unmasked sensitive user data.
- **FR-017**: Logging utilities MUST include redaction coverage for sensitive fields.
- **FR-018**: Completion validation MUST continue to require the repository's full unit/integration test gate and applicable E2E-critical smoke coverage before any phase/story is marked complete.
- **FR-018a**: Local `npm run build:cloudflare` MUST NOT be treated as a routine completion gate for agents; it MUST run only when explicitly requested by the user or when diagnosing a reported pipeline/build failure, while CI or pipeline build validation may remain a pipeline concern.
- **FR-019**: During implementation, agents SHOULD run the narrowest failing validation slice first and MUST NOT repeatedly run full E2E while a narrower failing check is unresolved.
- **FR-020**: The full E2E suite MAY increase Playwright workers only after isolation audit confirms no mutable shared-state dependencies remain.
- **FR-021**: Any E2E spec that cannot be parallelized MUST document its shared dependency and remaining isolation task.
- **FR-022**: The E2E refactor MUST preserve honest acceptance evidence for each existing completed user story; tests must become more deterministic, not weaker.

### Key Entities

- **E2E Test Record**: A database or auth record created specifically for one E2E test with a stable marker for cleanup.
- **Test Data Factory**: A helper that creates deterministic test prerequisites and returns IDs, credentials, invite links, and cleanup metadata.
- **Validation Scope**: A named command or command group that runs the narrowest relevant tests for a story, phase, or full completion gate.
- **E2E-Critical Flow**: A user or system journey that requires real browser evidence because the risk depends on routing, cookies/session persistence, middleware/redirects, cross-role UI proof, mobile layout, installed/PWA behavior, or browser-only integration.
- **Cheapest Meaningful Test Type**: The lowest-level automated test that can fully prove the behavior being changed without replacing a required browser-critical acceptance signal.
- **Diagnostic Event**: A structured log entry for API or UI flow debugging with redacted fields and correlation metadata.
- **Failure Artifact Bundle**: Playwright and application evidence captured when a test fails.

## Out of Scope

- Weakening acceptance quality or replacing exact business-outcome assertions with page-load, URL-only, or broad placeholder checks.
- Keeping exhaustive E2E coverage for detailed edge cases when unit, API integration, or component tests can prove the same non-browser-critical behavior.
- Deleting E2E edge-case coverage without first preserving equivalent automated coverage at the appropriate cheaper test level.
- Replacing core UI action validation with direct database writes; direct database writes are limited to deterministic setup and cleanup.
- Logging secrets, raw credentials, raw invite tokens, service-role keys, session tokens, cookies, PINs, passwords, or sensitive personal data.
- Disabling automated coverage before story, phase, or task completion.
- Treating local Cloudflare build parity as a routine agent completion gate when no user request or reported pipeline/build failure exists.
- Introducing paid observability, monitoring, logging, tracing, or test-hosting services.
- Implementing unrelated application product behavior as part of this engineering quality feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of mutable E2E tests create isolated per-test business records instead of mutating shared seeded users or records.
- **SC-002**: 100% of destructive E2E workflows use isolated targets and deterministic cleanup.
- **SC-003**: Default `npm run test:e2e` runs headless and exits without a blocking report server prompt.
- **SC-004**: For a controlled E2E failure, maintainers can identify the failed API route/action/status/error code from artifacts within 5 minutes.
- **SC-005**: Affected-story iteration commands complete significantly faster than the full E2E suite, with typical phase-scoped E2E feedback completing in under 2 minutes where the story flow allows.
- **SC-006**: Full validation remains intact: the full unit/integration test gate and applicable E2E-critical smoke coverage pass before task completion.
- **SC-007**: No captured diagnostic artifact contains raw PINs, passwords, tokens, cookies, or service-role keys in redaction tests.
- **SC-008**: After isolation audit, the full E2E suite can run with the approved worker count repeatedly without order-dependent failures.
- **SC-009**: The full E2E suite passes twice consecutively without shared-state failures before the isolation refactor is considered complete.
- **SC-010**: No E2E test mutates global seed users except documented immutable login principals used only for authentication.
- **SC-011**: Failure artifacts identify the failing route, action, status, and stable error code without exposing secrets or sensitive personal data.
- **SC-012**: 100% of retained E2E tests document or clearly exercise an E2E-critical risk, and non-critical detailed cases have equivalent unit, API integration, or component coverage before removal.
- **SC-013**: Routine local completion evidence does not include `npm run build:cloudflare` unless the user requested it or the task is diagnosing a reported pipeline/build failure.

## Assumptions

- Supabase remains the real backing service for E2E validation.
- Global setup may keep immutable login principals for owner and baseline hosteler authentication, but destructive tests must use per-test business records.
- CI or pipeline build validation remains responsible for Cloudflare parity unless local build diagnosis is explicitly requested or needed for a reported pipeline/build failure.
- Future features still require automated coverage, but E2E should stay smoke-level and business-critical rather than exhaustive.
- Some specs may remain serial temporarily if a documented shared dependency cannot be removed in the first pass.
