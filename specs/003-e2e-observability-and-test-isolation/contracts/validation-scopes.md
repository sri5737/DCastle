# Contract: Validation Scopes

Validation scopes are npm scripts and documented command groups used during implementation and completion. Scopes are risk-based: use the cheapest meaningful automated test type that proves the behavior, and reserve E2E for documented browser-critical risk.

## Iteration Scope Contract

Each story-level scope MUST define:

- A Vitest command for the affected unit, API integration, or component slice when one exists.
- A Playwright command targeting the affected spec file only when the story includes E2E-critical browser/session/cross-role/mobile/PWA risk.
- The user story or phase it validates.
- A note that failure must be fixed and rerun before broadening validation.

Risk mapping:

- Pure logic, validation, calculations, status transitions, utility/helper behavior, and redaction: unit tests.
- Backend/API/database persistence, auth/session rules, permissions/RLS, invite activation backend behavior, food submission persistence, dashboard counts, hosteler lifecycle, settings, billing, history, and exports: API integration tests where practical.
- Form validation, loading/error/success states, disabled/enabled controls, toggles, dialogs, tabs, responsive navigation visibility, and UI states that do not require real browser/session proof: component tests where practical.
- Real browser routing, session/cookies, middleware/redirects, cross-role producer-to-consumer proof, Android 375 px layout, installed/PWA behavior, or browser-only app wiring: E2E smoke tests.

Minimum story scopes:

- Food submission: `npm run test:us1` for `src/app/api/food/` and deadline logic; `npm run test:e2e:us1` for `e2e/us1-food-submission.spec.ts`.
- Owner dashboard: `npm run test:us2` for `src/app/admin/dashboard/`; `npm run test:e2e:us2` for `e2e/us2-owner-dashboard.spec.ts`.
- Invite activation: `npm run test:us3` for `src/app/api/invite/`; `npm run test:e2e:us3` for `e2e/us3-invite-activation.spec.ts`.
- Hosteler login/auth: `npm run test:us4` for `src/app/api/auth/`; `npm run test:e2e:us4` for `e2e/us4-hosteler-login.spec.ts`; `npm run test:e2e:us12` for auth proxy coverage.
- Hosteler lifecycle and PIN reset: `npm run test:us5` for `src/app/api/hostelers/`; `npm run test:e2e:us5` for `e2e/us5-hosteler-management.spec.ts`.
- Settings: `npm run test:us10` for settings API/component coverage; `npm run test:e2e:us10` only for retained E2E-critical settings browser smoke coverage.
- Mobile viewport: `npm run test:e2e:us13` for `e2e/us13-mobile-viewport.spec.ts` for affected user-facing screens.

Phase groups:

- Auth/invite: `npm run test:phase:auth-invite` and `npm run test:phase:e2e:auth-invite`.
- Owner surfaces: `npm run test:phase:owner` and `npm run test:phase:e2e:owner`.
- Hosteler flows: `npm run test:phase:hosteler` and `npm run test:phase:e2e:hosteler`.
- Settings: `npm run test:phase:settings` and `npm run test:phase:e2e:settings`.
- Mobile viewport: `npm run test:phase:e2e:mobile`.

Risk-based completion guidance scripts:

- `npm run test:complete:risk` -> `npm run test:run`
- `npm run test:complete:risk:us1` -> `npm run test:us1 && npm run test:e2e:us1 && npm run test:run`
- `npm run test:complete:risk:us3` -> `npm run test:us3 && npm run test:e2e:us3 && npm run test:run`

## Completion Scope Contract

Routine completion validation MUST include:

```powershell
npm run test:run
```

Completion validation MUST also include any applicable scoped API integration, component, or E2E-critical smoke command required by the documented risk. Run `npm run test:e2e` only when the completed scope explicitly requires the retained full E2E smoke suite. Run `npm run build:cloudflare` only when the user explicitly requests it or when diagnosing a reported pipeline/build failure.

All required commands for the documented scope MUST pass before a task, story, or phase is marked complete. Scoped commands are not completion evidence by themselves when broader risk-based coverage is explicitly required.

## Debug Scope Contract

Explicit debug/headed scripts MUST be separate from default `npm run test:e2e` and SHOULD support:

- Running one spec headed.
- Running Playwright inspector/debug mode intentionally.
- Preserving failure artifacts without auto-opening a blocking report server.

Implemented debug scopes:

- `npm run test:e2e:headed`
- `npm run test:e2e:debug`

## Current Package Script Comparison (Phase 1, 2026-07-06)

Compared against `package.json` during T003.

Present story Vitest scopes:

- `npm run test:us1`
- `npm run test:us2`
- `npm run test:us3`
- `npm run test:us4`
- `npm run test:us5`
- `npm run test:us10`
- `npm run test:us12`

Present story E2E scopes:

- `npm run test:e2e:us1`
- `npm run test:e2e:us2`
- `npm run test:e2e:us3`
- `npm run test:e2e:us4`
- `npm run test:e2e:us5`
- `npm run test:e2e:us10`
- `npm run test:e2e:us12`
- `npm run test:e2e:us13`

Present phase scopes:

- `npm run test:phase:auth-invite`
- `npm run test:phase:owner`
- `npm run test:phase:hosteler`
- `npm run test:phase:settings`
- `npm run test:phase:e2e:auth-invite`
- `npm run test:phase:e2e:owner`
- `npm run test:phase:e2e:hosteler`
- `npm run test:phase:e2e:settings`
- `npm run test:phase:e2e:mobile`

Present risk-based completion guidance scopes:

- `npm run test:complete:risk`
- `npm run test:complete:risk:us1`
- `npm run test:complete:risk:us3`

Present debug scopes:

- `npm run test:e2e:headed`
- `npm run test:e2e:debug`

Missing story/debug scopes noted during Phase 1 comparison: none. Future task T022 may still refine examples if script names or targets change during later phases.

## Non-Goals

- Do not replace E2E-critical browser validation with unit-only validation.
- Do not keep exhaustive E2E edge-case coverage when unit, API integration, or component tests can fully prove non-browser-critical behavior.
- Do not delete non-critical E2E cases before equivalent lower-level automated coverage exists.
- Do not auto-open reports from default commands.
- Do not mark existing completed tasks incomplete while adding scoped validation documentation.