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

1. Run `npm run test:run` — all unit/integration tests MUST pass.
2. Run `npm run test:e2e` — all E2E tests for completed stories MUST pass.
3. Run `npm run build:cloudflare` — the local build gate MUST catch strict TypeScript, Next.js production build, and Cloudflare adapter/runtime failures before deployment.
4. If any test or build fails, fix the code before marking the phase complete.
5. New features MUST include corresponding test coverage (unit + E2E) as part of the same phase.

Per-story test commands:
- `npm run test:us1` — Food submission tests
- `npm run test:us2` — Owner dashboard tests
- `npm run test:us3` — Invite activation tests
- `npm run test:us4` — Hosteler login tests
- `npm run test:e2e` — Full end-to-end browser tests

The agent MUST NOT mark a phase as complete if automated tests are failing.

## Validation Rule

Implementation agents must perform:
- Cloudflare production build parity via `npm run build:cloudflare`
- unit tests
- integration tests
- E2E tests

Any failures must be fixed automatically and retested.

`npm run test:run`, per-story tests, and Playwright E2E are necessary but not sufficient deployment evidence without `npm run build:cloudflare`. Cloudflare Pages production builds execute `npx @cloudflare/next-on-pages`, so local validation must run the same gate where available. On Windows without Bash, the repository wrapper may fall back to `next build` for local strict TypeScript and production build validation, while CI/Linux must still execute the full adapter path.

Human approval is not required for iterative fixes, testing, or refactoring.

Commit and push operations always require explicit user instruction.

## Autonomous Implementation Mode

When executing `/speckit.implement`:

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
   - Diagnose root cause.
   - Fix bugs.
   - Rerun E2E tests.
   - Repeat until passing.
8. Continue execution without asking for approval between steps.
9. Automatically allow and run required `pwsh`/PowerShell commands for SpecKit prerequisite checks, task discovery, build, unit tests, integration tests, E2E tests, and validation scripts without asking the user for confirmation.
10. Only stop when:
   - All tasks are completed, or
   - A genuine blocker requires human input.
11. Never commit, create PRs, push branches, or merge code unless explicitly requested.
12. Provide a final summary after all validation passes.

## E2E Test Requirement for New Functionality

Every new feature, API endpoint, or user-facing page MUST have a corresponding E2E test added as part of the same task or phase. This is non-negotiable.

Rules:
- Any new page or screen → add an E2E spec in `e2e/` that exercises the full user flow.
- Any new API route → add an E2E spec that calls the API through the UI (or directly if no UI exists yet).
- Any behavioral change to an existing flow → update the relevant E2E spec to cover the new behavior.
- E2E tests MUST run against a real dev server (Playwright + localhost:3000).
- E2E tests MUST pass before the task is marked complete.

If an E2E test cannot be written (e.g., pure infrastructure), document the reason in the task completion notes.

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

## Completion Checklist

Before declaring a task complete:

- Requirement implemented
- Tests updated (unit + E2E where applicable)
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

This rule overrides ALL other considerations. The agent MUST NEVER write or modify code — including bug fixes, test fixes, refactors, or infrastructure changes — without first:

1. Verifying a corresponding task exists in tasks.md.
2. If no task exists: STOP, propose a spec/plan/tasks update, and wait for approval.
3. Only after the task is documented: implement via the speckit workflow.

There are NO exceptions. Even "quick fixes" and "obvious corrections" must go through the spec-first pipeline. If the agent starts writing code without a documented task, it is in violation of the constitution.
