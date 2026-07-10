# SpecKit Governance Rules

## Source of Truth

The spec folder is the authoritative source of truth.

Files:
- spec.md
- plan.md
- tasks.md

Implementation MUST remain consistent with these documents.

## Mandatory Workflow

Before making code changes:

1. Read spec.md
2. Read plan.md
3. Read tasks.md
4. Verify the requested work exists in an approved task.

If the requested change is not represented in the specification documents:
- STOP.
- Do not modify code.
- Explain what documentation needs to be updated first.

## Local Dependency Installation

When installing dependencies locally in this repository, use exactly:

```bash
npm install --registry=https://registry.npmjs.org/ --progress=false
```

Do not run bare `npm install` locally, because it can regenerate lockfiles with environment-specific registry metadata and break Cloudflare builds.

## Task Execution Rules

Only implement tasks that are explicitly listed in tasks.md.

Never:
- Skip phases.
- Execute future phases.
- Mark tasks complete without performing them.
- Implement requirements not present in spec.md.

## Task State Preservation (NON-NEGOTIABLE)

When regenerating or updating `tasks.md` (including via SpecKit commands such as `/speckit.tasks`, `/speckit.plan`, or `/speckit.converge`):

- Do NOT wipe previously checked tasks (`- [x]`) that represent already completed and validated work.
- Preserve historical completion state whenever task intent is unchanged.
- If task IDs/descriptions are restructured, map old completed items to equivalent new tasks and keep them checked.
- If automatic regeneration resets checkboxes, immediately reconcile `tasks.md` in the same workflow before proceeding.
- Do NOT reopen completed work without explicit user instruction.

Reason: clearing completed checkmarks can cause duplicate implementation of already finished functionality.

## Spec First Policy

If implementation requires:
- New business rules
- New API behavior
- Schema changes
- Architecture changes
- Database changes

Then:

1. Update spec.md.
2. Update plan.md.
3. Update tasks.md.
4. Only then implement code.

Code must never become the source of truth.

## Logic Change Protection

When modifying existing code:

- Preserve existing business behavior unless the specification explicitly requires a change.
- Treat current behavior as intentional.
- Do not refactor business logic while implementing unrelated tasks.
- If behavior appears incorrect, create a specification update instead of silently changing it.

## Requirement Drift Prevention

Before submitting changes:

Verify:

- Code matches spec.md
- Code matches plan.md
- Code matches tasks.md
- No undocumented behavior was introduced

If undocumented behavior exists:
- Revert the change
- Update the specification first

## Automation Gate (Post-Development Verification)

After completing any phase or user story:

1. Run `npm run test:run` â€” all unit/integration tests MUST pass.
2. Run applicable component/API integration scoped tests when the completed scope changes UI states, API behavior, or database persistence.
3. Do not run `npm run test:e2e` as part of the routine local quality gate.
4. Do not run `npm run build:cloudflare` as a routine local completion gate. Run it only when the user explicitly requests it or when diagnosing a reported pipeline/build failure.
5. If any required test fails, fix the code before marking the phase complete.
6. New features MUST include corresponding test coverage using the cheapest meaningful test type: unit tests for logic, API integration tests for backend/persistence behavior, and component tests for UI states.

Per-story test commands:
- `npm run test:us1` â€” Food submission tests
- `npm run test:us2` â€” Owner dashboard tests
- `npm run test:us3` â€” Invite activation tests
- `npm run test:us4` â€” Hosteler login tests
- `npm run test:e2e` â€” Full end-to-end browser tests

During implementation, use the narrowest relevant validation before full-gate validation:

1. Run affected unit tests only.
2. Run affected API integration tests for backend/API/database behavior.
3. Run affected component tests for UI states and form behavior.
4. Run the affected story/phase Playwright spec only when the behavior is E2E-critical or the spec/task requires E2E acceptance evidence.
5. Run adjacent specs only when the change crosses story boundaries.
6. Run `npm run test:run` before marking the task, story, or phase complete. Reserve `npm run build:cloudflare` for explicit user requests or reported pipeline/build failures.

Do not repeatedly run the full E2E suite while a narrower failing test remains unresolved.

The agent MUST NOT mark a phase as complete if automated tests are failing.

## Validation Rule

Implementation agents must perform:
- unit tests
- API integration tests for backend/API/database behavior
- component tests for UI states and form behavior
- Android mobile layout validation for affected user-facing screens
- installed/standalone PWA validation for affected installed-app screens

Any failures must be fixed automatically and retested.

Do not run `npm run build:cloudflare` during normal local implementation or task completion. Run it only when the user reports a pipeline/build failure.

## Android Mobile App Experience Guardrails

**Device Strategy:**
- **Hostelers**: Android mobile (375 px width) is the PRIMARY baseline. All hosteler-facing screens must be optimized for mobile-first experience.
- **Owners**: Tablet (iPad-like, 768px+ width) is the PRIMARY baseline. Owner-facing screens must be designed for tablet usability. Mobile compatibility is a bonus, not required.
- **Authentication screens** (login, invite activation): Mobile-first since both roles use these.

**For Hosteler Screens (Mobile First — REQUIRED):**

Android Chrome at 375 px width is the primary design baseline for all hosteler-facing screens. Desktop and tablet layouts are progressive enhancements only after the mobile experience is complete.

For every hosteler-facing UI change:
- Design and inspect the affected screen at 375 px mobile width first.
- Preserve a mobile app experience: primary navigation and actions must be reachable without desktop-only sidebars, hover-only controls, off-screen menus, hidden actions, or precision mouse interactions.
- Ensure no page-level horizontal overflow, clipped primary content, overlapping controls, unreachable submit/save/delete actions, unstable viewport jumps, or unreadable text.
- Use touch-friendly controls with safe spacing; primary controls should be at least 44 px in their smallest touch dimension unless the design system imposes a stricter standard.
- Validate affected hosteler screens in Android Chrome/mobile viewport E2E where practical, and validate installed/standalone PWA behavior where the screen is used from the installed app.

Do not mark hosteler-facing tasks complete if the affected screen breaks at the 375 px Android baseline, even when unit tests, E2E tests, or Cloudflare build pass.

**For Owner Screens (Tablet First — REQUIRED):**

Tablet (768px width and up) is the primary design baseline for owner-facing screens. Mobile compatibility (375 px) is optional but welcome if it doesn't compromise tablet usability.

For every owner-facing UI change:
- Design and inspect the affected screen at 768 px tablet width first (or actual iPad/tablet device if available).
- Use the full tablet width for data-rich layouts: dashboards, tables, hosteler lists, settings, billing views.
- Preserve a tablet app experience: primary navigation, data density, and actions must be optimized for tablet usability with touch-friendly spacing.
- Ensure no unusual viewport jumps, keyboard obstruction, or modal positioning issues specific to tablets.
- If mobile (375 px) rendering is attempted, ensure it remains usable without breaking primary functionality. Mobile breakage is acceptable; mobile optimization is not required.

Do not mark owner-facing tasks complete if the affected screen is unusable on tablets (768px+), even when unit tests, E2E tests, or Cloudflare build pass. Mobile rendering issues are acceptable and do not block completion.

**For Authentication Screens (Mobile First — REQUIRED):**

Login, invite activation, and PIN reset screens are used by both roles on mobile devices. Apply mobile-first design (375 px baseline):
- All auth screens MUST work seamlessly at 375 px width.
- Touch-friendly controls and readable text are non-negotiable.
- These screens are not owner-specific and do not follow the tablet-primary rule.

Human approval is not required for iterative fixes, testing, or refactoring.

Commit and push operations always require explicit user instruction.

## Credit-Aware Test Selection for New Functionality

Every new feature, API endpoint, or user-facing page MUST have corresponding automated test coverage as part of the same task or phase. Choose the cheapest meaningful test type that proves the behavior without weakening acceptance quality.

Rules:
- Pure logic, validation, calculations, status transitions, utility functions, redaction, and helper behavior â†’ add or update unit tests.
- API route behavior, auth/session rules, permission checks, database persistence, RLS-sensitive behavior, invite activation, food submission persistence, hosteler lifecycle, dashboard counts, settings, billing, history, and exports â†’ add or update API integration tests where practical.
- UI forms, loading/error/success states, disabled/enabled controls, toggles, dialogs, tabs, responsive navigation visibility, and client-side validation â†’ add or update component tests.
- Critical user journeys that depend on real browser routing, middleware, cookies/session persistence, real UI-to-API wiring, cross-role producer-to-consumer proof, realtime/read surfaces, Android 375 px layout, installed PWA behavior, or Cloudflare-like app wiring â†’ add or update E2E smoke tests in `e2e/`.
- E2E tests MUST run against a real dev server (Playwright + localhost:3000) when they are required by the documented task.
- Required tests MUST pass before the task is marked complete.

Detailed edge cases SHOULD be covered by unit, API integration, or component tests instead of many browser tests. If an E2E test is not required because the behavior is sufficiently proven below the browser layer, document the chosen test type and rationale in the task/spec evidence.

## Honest E2E Validation Guardrails

E2E tests are acceptance evidence and MUST prove the actual independent-test behavior documented in `spec.md` and `tasks.md`.

Never mark an E2E task complete when the test only proves:
- a route was reached,
- a heading/card/button rendered,
- a page did not crash,
- a broad placeholder string such as `pending|submitted|hosteler` appeared,
- a mocked response or manually injected cookie/localStorage session made the UI look authenticated.

For every E2E test:
- Assert at least one exact, falsifiable business outcome from the user story.
- Exercise the real UI and real Next.js API routes for the behavior under test.
- Use direct database writes only for deterministic setup/teardown, never as a replacement for the core user action.
- Do not use route mocks for the feature under test unless the task explicitly documents that the external system is out of scope.
- Do not use conditional branches that silently skip the core path; if state/time prevents the core path, create deterministic setup or mark the task blocked.
- After login or auth-sensitive navigation, wait for client effects and reload once when the story depends on persisted authentication, so redirect loops are caught.

Cross-role workflows require producer-to-consumer proof in the same E2E test or an explicitly linked sequence. For example:
- Hosteler submits exact meal preferences through the UI.
- Owner dashboard is opened as owner.
- Dashboard shows the exact breakfast/lunch/dinner counts caused by that hosteler submission.
- The hosteler appears in Submitted and is absent from Pending.

Dashboard, realtime, history, billing, and export stories MUST assert both the write path and the read/consumer surface. An E2E test that would still pass while the core workflow is broken is invalid and MUST be rewritten before the task is marked complete.

## Deterministic E2E and Debuggability Rules

These rules implement `specs/003-e2e-observability-and-test-isolation/spec.md` and Constitution XII.

E2E tests MUST:
- Run headless by default in `npm run test:e2e`; headed/debug mode must be exposed through explicit debug scripts only.
- Create isolated per-test data for any mutable workflow.
- Never mutate shared seeded users or records that another E2E depends on; seeded login principals are authentication-only unless a task explicitly documents otherwise.
- Use isolated records for destructive workflows including deactivate, reactivate, delete, reset invite, PIN reset, billing regeneration, settings updates, and export validation.
- Use deterministic cleanup through tracked IDs, stable E2E prefixes, or metadata.
- Wait on exact business signals: specific API response, stable error code, exact persisted API/database outcome, exact UI state, or route state after response success.
- Avoid `networkidle`, full page `load`, arbitrary sleeps, broad regex assertions, and URL-only waits as primary evidence unless the test documents why no better signal exists.
- Preserve honest acceptance evidence; setup helpers may create prerequisites, but the core user action and business outcome must still use the real UI/API unless the task explicitly documents API-only scope.

When adding or repairing E2E tests:
- Prefer shared E2E factory helpers for pending hosteler, active PIN hosteler, Google-linked hosteler, future food preference, settings snapshot/restore, and cleanup.
- Add response waits for important actions such as submit, activate, login, delete, reset, save, generate, and export.
- Assert exact business outcomes rather than broad text checks.
- Keep specs independently runnable and safe to run in any order.

Application logging added for E2E debugging MUST:
- Be structured and safe for test/debug diagnostics.
- Include route/action, method, status, duration, stable error code, and correlation ID where practical.
- Capture major flows such as login, invite validate/activate, PIN reset, food submit, hosteler lifecycle, and settings save.
- Never log PINs, passwords, cookies, invite token raw values, access tokens, refresh tokens, service-role keys, or unmasked sensitive personal data.

For any future E2E creation, repair, or feature implementation that touches an E2E-critical flow, agents MUST check `specs/003-e2e-observability-and-test-isolation/contracts/diagnostic-events.md` and ensure the flow emits the required safe API/UI diagnostic events and failure artifacts. If a flow cannot implement a required diagnostic event, document the reason in the relevant spec/task before marking the work complete.

Playwright failure artifacts SHOULD include trace, screenshot, video where configured, browser console logs, request/response summaries, and safe app-flow logs. HTML reports must not auto-open or block terminal completion by default.

## Completion Checklist

Before declaring a task complete:

- Requirement implemented
- Tests updated using the required mix of unit, API integration, component, and applicable E2E coverage
- All automated tests passing (`npm run test:run`)
- Specification still matches implementation
- No undocumented logic changes introduced


## Hard Stop Rules

The agent MUST refuse implementation when:

- spec.md is missing
- plan.md is missing
- tasks.md is missing
- requested behavior is not documented
- implementation would introduce new business logic not described in the specification

In these cases, provide a documentation update proposal instead of code changes.

## Absolute Spec-First Enforcement

This rule overrides ALL other considerations. The agent MUST NEVER write or modify code â€” including bug fixes, test fixes, refactors, or infrastructure changes â€” without first:

1. Verifying a corresponding task exists in tasks.md.
2. If no task exists: STOP, propose a spec/plan/tasks update, and wait for approval.
3. Only after the task is documented: implement via the speckit workflow.

There are NO exceptions. Even "quick fixes" and "obvious corrections" must go through the spec-first pipeline. If the agent starts writing code without a documented task, it is in violation of the constitution.

