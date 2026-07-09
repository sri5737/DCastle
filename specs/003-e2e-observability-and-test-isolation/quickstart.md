# Quickstart: E2E Observability and Test Isolation

This guide describes the validation path for implementing and proving the feature. Scoped validation is not a replacement for required completion evidence, but completion evidence is risk-based: use the cheapest meaningful automated test type and run E2E only for documented E2E-critical flows.

## Prerequisites

- `.env.local` contains Supabase URL/anon key, `SUPABASE_SERVICE_ROLE_KEY`, and E2E owner credentials.
- Local dependencies are already installed. If installation is required, use `npm install --registry=https://registry.npmjs.org/ --progress=false`.
- The local Next.js dev server can be started by Playwright through `npm run dev`.

## Phase 1 Baseline Evidence (2026-07-06)

Phase 1 is documentation and governance verification only. No application code, tests, full E2E run, or Cloudflare build was executed for this baseline.

### Governance Verification

- `.specify/memory/constitution.md` already contains Constitution XII for deterministic E2E/debuggability, including headless Playwright defaults, isolated per-test mutable data, exact business-signal waits, safe diagnostics/artifacts, one-worker-until-audit parallelism, and the local `npm run build:cloudflare` guardrail.
- `.github/copilot-instructions.md` already mirrors the risk-based validation policy: use unit/API/component tests for non-browser-critical behavior, reserve E2E for E2E-critical browser/session/cross-role/mobile/PWA flows, avoid routine local Cloudflare builds, and preserve completed task checkboxes.
- Result: no governance file update was required for T001.

### Current E2E Baseline

- Latest recorded Playwright run metadata in `test-results/.last-run.json` has status `failed`.
- Current failure artifact: `e2e/us3-invite-activation.spec.ts` test `owner registers hosteler and hosteler activates via PIN` timed out after 10 seconds while posting to `/api/hostelers` during owner-authenticated setup.
- Known carried-forward failures from the current feature baseline are US1 food submission selector/submission visibility issues and US3 invite activation setup/API timeout. These are not Phase 1 fixes.
- No new E2E baseline was run for this Phase 1 documentation pass.

### Playwright Execution Defaults

- `playwright.config.ts` sets `headless: true`, so `npm run test:e2e` is headless by default.
- The Playwright reporter is configured as `[['list'], ['html', { open: 'never' }]]`, so the HTML report should not auto-open or block terminal completion by default.
- Failure artifacts are configured with `trace: 'retain-on-failure'`, `screenshot: 'only-on-failure'`, and `video: 'retain-on-failure'`.
- `workers: 1` remains the current one-worker assumption until isolation audit and timing evidence justify any increase.
- Explicit interactive debug scopes exist in `package.json`: `npm run test:e2e:headed` and `npm run test:e2e:debug`.

### Legacy Task-State Preservation

- `specs/001-dcastle-pg-management/tasks.md` was inspected before Phase 1 edits and was not edited as part of this feature pass.
- Pre-existing working-tree state for `specs/001-dcastle-pg-management/tasks.md` showed 98 checked tasks and 52 unchecked tasks, with an existing diff of 22 inserted lines.
- T004 evidence: Phase 1 changes must not alter that file or reset any existing checked task checkbox.

## Phase 2 Foundational Validation Evidence (2026-07-06)

Command:

```powershell
npm run test:run
```

Result: PASS.

- Vitest completed successfully with 15 test files passed and 75 tests passed in 19.36 seconds.
- No Phase 2 foundational failures required code fixes during T015.
- The run emitted an expected stderr log from `src/app/api/auth/login/route.test.ts` while asserting the mocked unexpected-error path; that test passed and is not a blocker.
- No Playwright E2E command or Cloudflare build command was run for T015.
- Known carried-forward E2E baseline issues remain documented in the Phase 1 baseline and are outside T015 because `npm run test:run` did not invoke Playwright.

## Iteration Workflow

1. Identify the affected story, phase, and risk type.
2. Run the narrowest relevant Vitest command for unit, API integration, or component coverage.
3. Run the matching story-scoped Playwright command only when the change affects an E2E-critical browser/session/cross-role/mobile/PWA flow.
4. If a scoped command fails, fix that slice and rerun the same scoped command before broadening validation.
5. Use headed/debug scripts only when interactive diagnosis is needed.

Expected result: scoped commands execute only the targeted unit/API/component slice or applicable Playwright smoke spec and return control to the terminal without opening a blocking report server.

## Risk-Based Test Selection

- Pure logic, validation, calculations, status transitions, utility/helper behavior, and redaction: use unit tests.
- Backend/API/database persistence, auth/session rules, permissions/RLS, invite activation backend behavior, food submission persistence, dashboard counts, hosteler lifecycle, settings, billing, history, and exports: use API integration tests where practical.
- Form validation, loading/error/success states, disabled/enabled controls, toggles, dialogs, tabs, responsive navigation visibility, and UI states that do not require real browser/session proof: use component tests where practical.
- Real browser routing, session/cookies, middleware/redirects, cross-role producer-to-consumer proof, Android 375 px layout, installed/PWA behavior, or browser-only app wiring: use E2E smoke tests.
- Existing detailed E2E cases that are not E2E-critical must be converted to equivalent unit, API integration, or component coverage before the E2E case is removed.

## Required Story Scopes

Implementation tasks should add or document commands for these scopes:
Each E2E-scoped command should be documented with its matching unit command when applicable.

Story-scoped Vitest commands and primary targets:

```powershell
npm run test:us1
npm run test:us2
npm run test:us3
npm run test:us4
npm run test:us5
npm run test:us10
npm run test:us12
```

- `npm run test:us1` -> `src/app/api/food/`, `src/lib/deadline.test.ts`
- `npm run test:us2` -> `src/app/admin/dashboard/`
- `npm run test:us3` -> `src/app/api/invite/`
- `npm run test:us4` -> `src/app/api/auth/`
- `npm run test:us5` -> `src/app/api/hostelers/`
- `npm run test:us10` -> `src/app/api/settings/`, `src/components/owner-settings-page.tsx`
- `npm run test:us12` -> `src/app/api/auth/`, `src/middleware.ts`

Additional E2E scoped commands are used only when the story includes E2E-critical browser risk and should target:

```powershell
npm run test:e2e:us1
npm run test:e2e:us2
npm run test:e2e:us3
npm run test:e2e:us4
npm run test:e2e:us5
npm run test:e2e:us10
npm run test:e2e:us12
npm run test:e2e:us13
```

- `npm run test:e2e:us1` -> `e2e/us1-food-submission.spec.ts`
- `npm run test:e2e:us2` -> `e2e/us2-owner-dashboard.spec.ts`
- `npm run test:e2e:us3` -> `e2e/us3-invite-activation.spec.ts`
- `npm run test:e2e:us4` -> `e2e/us4-hosteler-login.spec.ts`
- `npm run test:e2e:us5` -> `e2e/us5-hosteler-management.spec.ts`
- `npm run test:e2e:us10` -> `e2e/us10-settings.spec.ts`
- `npm run test:e2e:us12` -> `e2e/us12-auth-proxy.spec.ts`
- `npm run test:e2e:us13` -> `e2e/us13-mobile-viewport.spec.ts`

Phase-level groups are available for auth/invite, owner surfaces, hosteler lifecycle, settings, and mobile viewport validation. Use E2E phase groups only for retained E2E-critical smoke coverage:

```powershell
npm run test:phase:auth-invite
npm run test:phase:owner
npm run test:phase:hosteler
npm run test:phase:settings
npm run test:phase:e2e:auth-invite
npm run test:phase:e2e:owner
npm run test:phase:e2e:hosteler
npm run test:phase:e2e:settings
npm run test:phase:e2e:mobile
```

- `npm run test:phase:auth-invite` -> `src/app/api/auth/`, `src/app/api/invite/`
- `npm run test:phase:owner` -> `src/app/admin/dashboard/`, `src/app/api/settings/`, `src/app/api/hostelers/`
- `npm run test:phase:hosteler` -> `src/app/api/auth/`, `src/app/api/food/`, `src/lib/deadline.test.ts`
- `npm run test:phase:settings` -> `src/app/api/settings/`, `src/components/owner-settings-page.tsx`
- `npm run test:phase:e2e:auth-invite` -> `e2e/us3-invite-activation.spec.ts`, `e2e/us4-hosteler-login.spec.ts`, `e2e/us12-auth-proxy.spec.ts`
- `npm run test:phase:e2e:owner` -> `e2e/us2-owner-dashboard.spec.ts`, `e2e/us5-hosteler-management.spec.ts`, `e2e/us10-settings.spec.ts`
- `npm run test:phase:e2e:hosteler` -> `e2e/us1-food-submission.spec.ts`, `e2e/us4-hosteler-login.spec.ts`
- `npm run test:phase:e2e:settings` -> `e2e/us10-settings.spec.ts`
- `npm run test:phase:e2e:mobile` -> `e2e/us13-mobile-viewport.spec.ts`

Risk-based completion guidance commands:

```powershell
npm run test:complete:risk
npm run test:complete:risk:us1
npm run test:complete:risk:us3
```

- `npm run test:complete:risk` -> completion gate baseline (`npm run test:run`)
- `npm run test:complete:risk:us1` -> scoped US1 validation then baseline completion gate
- `npm run test:complete:risk:us3` -> scoped US3 validation then baseline completion gate

If a scoped command fails, fix that slice and rerun the same scoped command before broadening validation.

## Headless Default Check

Run:

```powershell
npm run test:e2e
```

Expected result:

- Playwright runs headless by default.
- The HTML report does not auto-open or block terminal completion.
- Failure artifacts are retained according to the artifact contract.

## Debug Check

Run the explicit headed/debug script created during implementation for one spec.

```powershell
npm run test:e2e:headed
npm run test:e2e:debug
```

Expected result:

- A visible browser or inspector opens only for the debug command.
- The default `npm run test:e2e` remains headless.

## Isolation Check

For each retained E2E-critical refactored spec:

1. Run the spec alone.
2. Run it after a different spec.
3. Verify the spec creates its own mutable records through E2E factories.
4. Verify teardown removes only tracked IDs or stable E2E marker records.

Expected result: no retained E2E spec depends on state left by another spec, and destructive E2E workflows target only isolated records.

## Diagnostics Check

Force a controlled failure in an invite activation or food submission flow during implementation validation.

Expected artifact evidence:

- Screenshot or trace shows the UI state.
- Console/request/response summaries identify the relevant API call.
- Safe app-flow diagnostics identify route/action/status/stable error code/correlation ID where available.
- No artifact contains raw PINs, passwords, tokens, cookies, service-role keys, or raw invite tokens.

## Parallelism Readiness Check

Only after the retained E2E-critical isolation audit passes:

1. Record baseline full-suite timing with one worker.
2. Increase Playwright workers to the approved candidate count.
3. Run the full E2E suite twice consecutively.
4. Record timing and any serial exceptions.

Expected result: both full-suite runs pass without shared-state failures before the worker increase is considered complete.

## Completion Validation

Before marking this feature, story, phase, or task complete:

```powershell
npm run test:run
```

Then run any applicable scoped API integration, component, or E2E-critical smoke command required by the changed risk. For example:

```powershell
npm run test:us3
npm run test:e2e:us3
```

Run `npm run test:e2e` only when the completed scope explicitly requires the retained full E2E smoke suite. Run `npm run build:cloudflare` only when the user explicitly requests it or when diagnosing a reported pipeline/build failure.

All required commands for the documented scope must pass. Scoped validation is useful for iteration but is not sufficient completion evidence when broader risk-based coverage is explicitly required.

## Phase 3 Validation Evidence (2026-07-06)

### T023 Script Contract Test Evidence

Command:

```powershell
npm run test:run
```

Result: recorded below after Phase 3 execution.

Execution result (2026-07-06): PASS.

- `npm run test:run` completed with 15 passed test files and 77 passed tests.
- Terminal-reported duration: 20.53s (Vitest summary) / 28011 ms (wall-clock wrapper).
- Expected stderr log from `src/app/api/auth/login/route.test.ts` mocked unexpected-error test path was present and non-blocking.

Result (latest rerun): PASS.

- `npm run test:run` passed with 15 test files and 77 tests passing.
- Vitest duration reported: 20.53 seconds.
- Shell wrapper capture: `DURATION_MS=28011`, `EXIT_CODE=0`.
- Expected stderr from mocked login unexpected-error test remained non-blocking.
- No `npm run build:cloudflare` command was run.

### T024 Representative Scoped Command Evidence

Commands:

```powershell
npm run test:us1
npm run test:e2e:us1
npm run test:us3
npm run test:e2e:us3
```

Result and timing evidence: recorded below after Phase 3 execution.

Execution results (2026-07-06):

- `npm run test:us1`: PASS. 2 test files passed, 12 tests passed (`src/app/api/food/submit/route.test.ts`, `src/lib/deadline.test.ts`). Terminal-reported duration: 5.36s (Vitest summary) / 11127 ms (wall-clock wrapper).
- `npm run test:e2e:us1`: FAIL (known carried-forward E2E baseline issue). Failing tests: `US1: Food Submission > hosteler toggles meals, saves, and sees confirmation on dashboard` and `US1: Food Submission > submission page shows pre-filled state on revisit`. Wall-clock wrapper duration was not captured because the script exited early, but failure artifacts were generated under `test-results/...`.
- `npm run test:us3`: PASS. 1 test file passed, 9 tests passed (`src/app/api/invite/activate/route.test.ts`). Terminal-reported duration: 6.11s (Vitest summary) / 11469 ms (wall-clock wrapper).
- `npm run test:e2e:us3`: FAIL (known carried-forward E2E baseline issue). One test failed and one passed in `e2e/us3-invite-activation.spec.ts`; failing test: `US3: Invite Activation > owner registers hosteler and hosteler activates via PIN` at `e2e/helpers.ts:45` (`expect(loginResponse.ok()).toBeTruthy()`). Terminal wall-clock duration: 50335 ms. Failure artifacts captured under `test-results/...`.

Scope handling note:

- Per risk-based scoped workflow, failures were recorded as evidence for this phase and validation was not broadened beyond the required representative commands.

Result summary:

- `npm run test:us1` -> PASS. Vitest duration: 4.85 seconds.
- `npm run test:us3` -> PASS. Vitest duration: 5.68 seconds.
- `npm run test:e2e:us1` -> FAIL (`EXIT_CODE=1`, `DURATION_MS=21993`).
- `npm run test:e2e:us3` -> FAIL (`EXIT_CODE=1`, `DURATION_MS=54462`).

Observed failure context (pre-existing/unrelated environment blockers):

- E2E global setup reported owner auth principal missing and hosteler auth creation failure due to HTML proxy response instead of JSON.
- Scoped E2E requests hit proxy authentication pages (`WWW Authorization Required`) and `ERR_CONNECTION_RESET`/auth-response failures.
- These failures are outside Phase 3 script-contract/documentation scope and were recorded as representative timing evidence only.

## Phase 4 User Story 2 Audit and Isolation Evidence (2026-07-07)

### T073 E2E Coverage Audit Mapping

No E2E coverage was deleted or reduced in this pass. Classification was documented first to preserve spec-first coverage discipline before any future reduction work.

| Spec | Current classification | Mapping decision | Rationale |
| --- | --- | --- | --- |
| `e2e/us1-food-submission.spec.ts` | Retained E2E-critical | Keep as E2E smoke | Real hosteler UI submit plus persisted readback is a browser/session and producer action path. |
| `e2e/us2-owner-dashboard.spec.ts` | Retained E2E-critical | Keep as E2E smoke | Cross-role consumer proof for owner dashboard meal counts from real submitted records. |
| `e2e/us3-invite-activation.spec.ts` | Retained E2E-critical | Keep as E2E smoke | Real join route, invite token validation, activation, and post-activation status/link outcome. |
| `e2e/us4-hosteler-login.spec.ts` | Retained E2E-critical | Keep as E2E smoke | Browser auth/session cookie route for PIN login and post-login route stability. |
| `e2e/us5-hosteler-management.spec.ts` | Retained E2E-critical | Keep as E2E smoke | Owner UI lifecycle operations with destructive flows and audit/read surfaces. |
| `e2e/us10-settings.spec.ts` | Retained E2E-critical | Keep as E2E smoke | Owner settings write path and hosteler submit-surface lock behavior across roles. |
| `e2e/us12-auth-proxy.spec.ts` | Retained E2E-critical | Keep as E2E smoke | Server-side auth proxy and session persistence require browser/cookie evidence. |
| `e2e/us13-mobile-viewport.spec.ts` | Retained E2E-critical | Keep as E2E smoke | Android 375 px mobile layout and action reachability are browser-viewport critical. |

### Phase 4 Refactor Status Snapshot (T035-T041)

- `e2e/us3-invite-activation.spec.ts` now provisions pending hostelers via `createPendingHosteler(...)` per mutable activation test.
- `e2e/us4-hosteler-login.spec.ts` uses `createActivePinHosteler(...)` for mutable login cases and keeps global principal use auth-only.
- `e2e/us5-hosteler-management.spec.ts` uses per-test record targets for deactivate/reactivate/delete/reset-invite/PIN-reset lifecycle operations.
- `e2e/us10-settings.spec.ts` snapshots settings via `snapshotSettings(...)`, restores settings after each test, and validates save behavior through UI/API.
- `e2e/us12-auth-proxy.spec.ts` uses isolated hosteler records for mutation-sensitive hosteler-auth checks.
- `e2e/us13-mobile-viewport.spec.ts` preserves Android 375 px coverage without mutating shared seeded business records.
- `e2e/test-data.ts` keeps immutable auth-principal fixtures only.

### T042 Isolation Run Evidence (Scoped Commands)

Scoped isolation command execution is currently blocked by environment-level network/proxy auth interception for Supabase service-role/auth API calls.

Representative scoped command attempts and outcomes:

- `npm run test:e2e:us4`: FAIL. Isolated hosteler factory setup failed with `AuthUnknownError` (`Unexpected token '<', "<!DOCTYPE ..."`) while calling `supabase.auth.admin.createUser`, caused by proxy HTML auth response.
- `npm run test:e2e:us10`: FAIL. Settings snapshot/read failed with proxy `WWW Authorization Required` HTML response instead of Supabase JSON for service-role REST call.
- `npm run test:e2e:us13`: PASS in current session baseline evidence (`exit=0`) before this Phase 4 pass.

Current blocker for completing the full T042 matrix:

- Environment proxy/auth interception prevents deterministic service-role setup calls required by isolated E2E factories for retained specs.
- Until that environment issue is removed, each retained spec cannot be fully re-validated both alone and after another scoped spec in this workstation context.