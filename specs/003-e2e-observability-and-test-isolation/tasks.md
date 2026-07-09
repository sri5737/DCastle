# Tasks: E2E Observability and Test Isolation

**Input**: Design documents from `/specs/003-e2e-observability-and-test-isolation/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [quickstart.md](quickstart.md), [contracts/](contracts/)

**Tests**: Required by the feature specification. Add or update unit, API integration, component, helper, and applicable E2E-critical smoke coverage before or alongside implementation. Use the cheapest meaningful test type that proves the behavior.

**Organization**: Tasks are grouped by user story so each story remains independently implementable and testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files or has no dependency on incomplete tasks
- **[Story]**: User story label for story phases only
- Every task names the concrete file path or command evidence file it affects

## Phase 1: Setup (Shared Governance and Baseline)

**Purpose**: Confirm governance and capture the current validation baseline without modifying application code or existing completed task state.

- [x] T001 Verify deterministic E2E/debuggability governance is present or update it in `.specify/memory/constitution.md` and `.github/copilot-instructions.md`
- [x] T002 [P] Record current E2E baseline, known failures, headed/headless behavior, reporter behavior, and one-worker assumption in `specs/003-e2e-observability-and-test-isolation/quickstart.md`
- [x] T003 [P] Compare current npm scripts against the validation-scope contract and note missing story/debug scopes in `specs/003-e2e-observability-and-test-isolation/contracts/validation-scopes.md`
- [x] T004 [P] Confirm `specs/001-dcastle-pg-management/tasks.md` completion checkboxes are not modified during this feature in `specs/003-e2e-observability-and-test-isolation/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared E2E infrastructure and diagnostic primitives required before story refactors.

**Critical**: No user story implementation should begin until this phase is complete.

- [x] T005 Create E2E run metadata helpers for `testRunId`, `testCaseId`, stable markers, and artifact metadata in `e2e/test-run.ts`
- [x] T006 [P] Create a service-role Supabase test client helper that is server/test-only and validates required env vars in `e2e/supabase-test-client.ts`
- [x] T007 Define cleanup metadata, delete ordering, settings restore records, and cleanup registration APIs in `e2e/cleanup-registry.ts`
- [x] T008 Extend deterministic cleanup to delete only tracked IDs or stable E2E marker records in `e2e/cleanup-e2e-data.ts`
- [x] T009 Update global setup so shared owner and baseline hosteler records are immutable authentication principals only in `e2e/global-setup.ts`
- [x] T010 Update global teardown to consume cleanup registry data, remove partial setup records safely, and preserve unrelated seeded data in `e2e/global-teardown.ts`
- [x] T011 [P] Add exact business-signal wait helpers for API responses, stable error codes, persisted states, and post-login reload checks in `e2e/helpers.ts`
- [x] T012 [P] Add a failure artifact collector shell for console logs, request/response summaries, app-flow logs, and test metadata in `e2e/artifacts.ts`
- [x] T013 [P] Add Edge-compatible diagnostic event types, correlation helpers, redaction helpers, and environment gating in `src/lib/diagnostics/events.ts`
- [x] T014 [P] Add redaction and diagnostic gating unit tests for PIN, password, token, cookie, invite token, authorization, and service-role fields in `src/lib/diagnostics/events.test.ts`
- [x] T015 Run foundational validation with `npm run test:run` and record any pre-existing or fixed failures in `specs/003-e2e-observability-and-test-isolation/quickstart.md`

**Checkpoint**: E2E setup, cleanup, wait helpers, artifact helper shell, and diagnostic utility shell are ready for user story implementation.

---

## Phase 3: User Story 1 - Developer Runs Scoped Validation Quickly (Priority: P1)

**Goal**: Provide focused unit, API integration, component, and applicable Playwright commands for story/phase iteration while preserving risk-based completion evidence.

**Independent Test**: Change or select one story behavior, run the cheapest meaningful scoped command, verify only that slice executes, then run the required risk-based completion validation before completion.

### Tests for User Story 1

- [x] T016 [P] [US1] Add script contract tests that verify required scoped command names and target files in `src/lib/validation-scopes.test.ts`
- [x] T017 [P] [US1] Add a documentation check that scoped commands are marked iteration-only and not completion evidence in `src/lib/validation-scopes-docs.test.ts`

### Implementation for User Story 1

- [x] T018 [US1] Add story-scoped Playwright scripts for `e2e/us1-food-submission.spec.ts`, `e2e/us2-owner-dashboard.spec.ts`, `e2e/us3-invite-activation.spec.ts`, `e2e/us4-hosteler-login.spec.ts`, `e2e/us5-hosteler-management.spec.ts`, `e2e/us10-settings.spec.ts`, `e2e/us12-auth-proxy.spec.ts`, and `e2e/us13-mobile-viewport.spec.ts` in `package.json`
- [x] T019 [US1] Add or verify matching scoped Vitest scripts for `src/app/api/food/`, `src/app/admin/dashboard/`, `src/app/api/invite/`, `src/app/api/auth/`, `src/app/api/hostelers/`, and settings coverage in `package.json`
- [x] T020 [US1] Add phase-level command groups for auth/invite, owner surfaces, hosteler lifecycle, settings, mobile viewport, and risk-based completion guidance in `package.json`
- [x] T021 [US1] Document each scoped command, target spec, matching unit command, and rerun-before-broadening rule in `specs/003-e2e-observability-and-test-isolation/quickstart.md`
- [x] T022 [US1] Update validation-scope contract examples to match final script names and exact file targets in `specs/003-e2e-observability-and-test-isolation/contracts/validation-scopes.md`
- [x] T023 [US1] Run the script contract tests with `npm run test:run` and record results in `specs/003-e2e-observability-and-test-isolation/quickstart.md`
- [x] T024 [US1] Run representative risk-based scoped commands for `package.json` scripts such as `test:us1`, `test:e2e:us1` when E2E-critical, `test:us3`, and `test:e2e:us3` when E2E-critical, then record timing evidence in `specs/003-e2e-observability-and-test-isolation/quickstart.md`

**Checkpoint**: Developers can run narrow story/phase validation commands, and docs make clear that scoped validation is not completion evidence.

---

## Phase 4: User Story 2 - E2E Tests Own Their Data (Priority: P1)

**Goal**: Ensure every mutable or destructive E2E test creates, owns, asserts, and cleans up isolated records.

**Independent Test**: Run each spec alone and in varied order; each mutable flow uses factory-created records and cleanup touches only tracked records or settings snapshots.

### Tests for User Story 2

- [x] T025 [P] [US2] Add factory unit tests for unique marker generation, cleanup registration, and secret redaction expectations in `e2e/factories.test.ts`
- [x] T026 [P] [US2] Add cleanup unit tests for tracked ID deletion order, partial setup tolerance, auth user cleanup, and settings restore behavior in `e2e/cleanup-registry.test.ts`

### Implementation for User Story 2

- [x] T027 [US2] Implement `createPendingHosteler(options)` with invite URL output and cleanup metadata in `e2e/factories.ts`
- [x] T028 [US2] Implement `createActivePinHosteler(options)` with bcryptjs PIN hashing, auth linkage where needed, and redacted credential output in `e2e/factories.ts`
- [x] T029 [US2] Implement `createActiveGoogleHosteler(options)` with unique Supabase auth user linkage and cleanup metadata in `e2e/factories.ts`
- [x] T030 [US2] Implement `createFutureFoodPreference(options)` without replacing the core food submission action in `e2e/factories.ts`
- [x] T031 [US2] Implement `snapshotSettings(options)` with exact restore support for owner settings in `e2e/factories.ts`
- [x] T032 [US2] Register all factory-created rows, auth users, invite tokens, food preferences, and settings snapshots with cleanup metadata in `e2e/factories.ts` and `e2e/cleanup-registry.ts`
- [x] T033 [US2] Refactor food submission tests to create an active PIN hosteler, submit exact meal preferences through the UI, and assert persisted meals in `e2e/us1-food-submission.spec.ts`
- [x] T034 [US2] Refactor owner dashboard tests to create isolated submitted and pending hostelers, assert exact breakfast/lunch/dinner counts, and avoid global seeded mutations in `e2e/us2-owner-dashboard.spec.ts`
- [x] T073 [US2] Audit existing E2E specs and classify each test as retained E2E-critical, convert to API integration, convert to component, convert to unit, or duplicate removal; document the mapping in `specs/003-e2e-observability-and-test-isolation/quickstart.md` before deleting or reducing any E2E coverage
- [x] T035 [US2] Refactor invite activation tests to create a pending hosteler per test, activate through the real join UI/API, assert status/link outcome, and clean invite records in `e2e/us3-invite-activation.spec.ts`
- [x] T036 [US2] Refactor hosteler login tests to use isolated active PIN hostelers for mutable cases and keep global principals authentication-only in `e2e/us4-hosteler-login.spec.ts`
- [x] T037 [US2] Refactor hosteler lifecycle tests so add, deactivate, reactivate, delete, reset invite, and PIN reset targets are per-test records in `e2e/us5-hosteler-management.spec.ts`
- [x] T038 [US2] Refactor settings tests to snapshot existing settings, save through the UI/API, assert exact persisted values, and restore on failure in `e2e/us10-settings.spec.ts`
- [x] T039 [US2] Refactor auth proxy tests to use isolated auth users or hosteler records for mutation-sensitive cases in `e2e/us12-auth-proxy.spec.ts`
- [x] T040 [US2] Refactor mobile viewport tests to avoid shared record mutation while preserving Android 375 px owner, hosteler, auth, and submit coverage in `e2e/us13-mobile-viewport.spec.ts`
- [x] T041 [US2] Remove shared mutable business-record assumptions from helper constants while preserving immutable credential fixtures in `e2e/test-data.ts`

**Checkpoint**: Mutable E2E tests own their data, destructive workflows target isolated records, and cleanup is deterministic.

---

## Phase 5: User Story 3 - E2E Failures Are Diagnosable From Artifacts (Priority: P1)

**Goal**: Capture safe route/action/status/error-code evidence, browser artifacts, and redacted app-flow logs for failed E2E runs.

**Independent Test**: Force a controlled invite or food failure and confirm screenshot, trace, console, request/response summaries, and safe app-flow logs exist without sensitive values.

### Tests for User Story 3


### Implementation for User Story 3


**Checkpoint**: Failed E2E runs provide safe, useful diagnostic evidence without exposing secrets.

---

## Phase 6: User Story 4 - Playwright Runs Headless By Default (Priority: P2)

**Goal**: Make default E2E automation headless and non-blocking, with explicit headed/debug scripts available on demand.

**Independent Test**: Run `npm run test:e2e` and verify headless non-blocking completion; run a debug command and verify headed/inspector mode is intentional.

### Tests for User Story 4


### Implementation for User Story 4


**Checkpoint**: Default E2E is automation-safe, while interactive debugging remains explicit.

---

## Phase 7: User Story 5 - Full Suite Can Safely Become Faster (Priority: P2)

**Goal**: Audit retained E2E-critical isolation, document serial exceptions, and only then evaluate controlled Playwright worker increases with timing evidence.

**Independent Test**: Run the retained E2E-critical suite with the approved worker count twice consecutively after isolation and confirm no order-dependent failures.

### Tests for User Story 5


### Implementation for User Story 5


**Checkpoint**: The retained E2E-critical suite has documented parallelism readiness, timing evidence, and repeat validation.

---

## Phase 8: Polish & Cross-Cutting Validation

**Purpose**: Final checks across governance, contracts, documentation, redaction, mobile baseline, and risk-based completion evidence.


---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: No dependencies; must complete before implementation.
- **Phase 2 Foundational**: Depends on Phase 1; blocks all user stories.
- **US1 Scoped Validation**: Depends on Phase 2; can be completed before E2E refactors to improve iteration speed.
- **US2 Test Data Isolation**: Depends on Phase 2; should run before US5 parallelism and before relying on retained E2E suite ordering evidence.
- **US3 Diagnostics and Artifacts**: Depends on Phase 2; can proceed after or alongside US2, but controlled failure evidence is strongest after relevant spec refactors.
- **US4 Headless Defaults**: Depends on Phase 2 and should complete before repeated retained E2E suite timing.
- **US5 Parallelism Readiness**: Depends on US2 and US4; should use US3 artifacts if failures occur.
- **Polish**: Depends on all selected user stories and must include risk-based completion evidence.

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Foundation; no dependency on other stories.
- **User Story 2 (P1)**: Starts after Foundation; required before any worker increase.
- **User Story 3 (P1)**: Starts after Foundation; complements US2 and US4 but remains independently testable through controlled failure artifacts.
- **User Story 4 (P2)**: Starts after Foundation; required before non-blocking retained E2E suite timing evidence.
- **User Story 5 (P2)**: Starts after US2 and US4; cannot complete until isolation audit and repeated retained E2E-critical validation pass.

### Within Each User Story

- Add the story's tests first and confirm they fail for missing behavior where practical.
- Implement helper/config changes before refactoring specs that depend on them.
- Run the narrowest scoped command after each story slice.
- Do not mark any story complete until its independent test criteria pass.
- Do not mark the feature complete until `npm run test:run` and applicable retained E2E-critical smoke coverage pass. Run `npm run build:cloudflare` only on explicit user request or when diagnosing a reported pipeline/build failure.

---

## Parallel Opportunities

- Setup baseline documentation tasks T002-T004 can run in parallel.
- Foundational helper shells T006, T011, T012, T013, and T014 can run in parallel after T005 is clear.
- US1 script tests T016-T017 can run in parallel.
- US2 factory and cleanup tests T025-T026 can run in parallel before factory implementation.
- US2 per-spec refactors T033-T040 can be split across implementers after T027-T032 are complete.
- US3 artifact and diagnostic tests T043-T045 can run in parallel.
- US3 route diagnostics T047-T050 and UI diagnostics T051 can be split by file ownership after T046 is complete.
- US4 config tests T055 can run before T056-T057.
- Polish checks T066-T068 can run in parallel before risk-based completion checks T069-T071.

---

## Parallel Example: User Story 2

```text
Task: "T033 Refactor e2e/us1-food-submission.spec.ts to use factory-owned active PIN hosteler"
Task: "T034 Refactor e2e/us2-owner-dashboard.spec.ts to use isolated submitted and pending hostelers"
Task: "T035 Refactor e2e/us3-invite-activation.spec.ts to create pending hostelers per activation"
Task: "T038 Refactor e2e/us10-settings.spec.ts to snapshot and restore settings"
```

## Parallel Example: User Story 3

```text
Task: "T047 Add diagnostics to auth API routes"
Task: "T048 Add diagnostics to invite API routes"
Task: "T049 Add diagnostics to food API routes"
Task: "T050 Add diagnostics to hosteler, dashboard, and settings API routes"
Task: "T051 Add UI action diagnostics to auth, join, submit, settings, and hosteler pages"
```

## Parallel Example: Polish

```text
Task: "T066 Reconcile spec, plan, and contracts"
Task: "T067 Verify Android 375 px coverage"
Task: "T068 Verify redaction tests and artifact safety"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup and Phase 2 foundational helpers.
2. Complete Phase 3 scoped validation commands and documentation.
3. Validate US1 independently with the script contract tests and representative scoped commands.
4. Continue through the remaining P1 stories before considering the engineering quality feature complete.

### P1 Reliability Increment

1. Complete US1 to speed up iteration.
2. Complete US2 so specs own data and clean up deterministically.
3. Complete US3 so failures are diagnosable from artifacts without exposing secrets.
4. Run scoped validation for each affected spec before broadening.

### P2 Automation Increment

1. Complete US4 so default Playwright runs are headless and non-blocking.
2. Complete US5 only after isolation audit passes.
3. Run the retained E2E-critical suite twice consecutively before accepting any worker increase.

### Completion Gate

1. Run `npm run test:run`.
2. Run applicable scoped API integration, component, and retained E2E-critical smoke coverage for the documented scope.
3. Run `npm run test:e2e` only when the completed scope explicitly requires the retained full E2E smoke suite.
4. Run `npm run build:cloudflare` only on explicit user request or when diagnosing a reported pipeline/build failure.
5. Confirm `specs/001-dcastle-pg-management/tasks.md` completion state is unchanged.

---

## Notes

- Scoped validation is an iteration accelerator only; it never replaces required risk-based completion evidence.
- Direct database writes are allowed for deterministic setup and teardown only, not as proof of the core user action.
- All diagnostic and artifact output must pass redaction checks before story completion.
- Any remaining serial spec must document the shared dependency and a follow-up isolation task.
