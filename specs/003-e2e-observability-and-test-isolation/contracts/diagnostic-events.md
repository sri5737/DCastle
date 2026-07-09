# Contract: Diagnostic Events and Failure Artifacts

Diagnostics must make E2E failures debuggable while remaining safe for local, CI, and Cloudflare Edge-compatible execution.

## Future Development Guardrail

All future E2E creation, E2E repair, and feature work that touches an E2E-critical flow MUST use this contract as the diagnostic checklist before the work is marked complete.

For every new or changed E2E-critical flow:

- Confirm the relevant API route emits safe diagnostic events in E2E/debug mode, or document why no API route is involved.
- Confirm the relevant UI action emits safe action diagnostics where practical, or document why UI diagnostics are not applicable.
- Confirm Playwright failure artifacts can identify the route, action, status, stable error code, and correlation ID where available.
- Confirm redaction covers every sensitive field touched by the flow.
- Confirm the E2E test waits on exact business signals rather than relying on full page `load`, `networkidle`, arbitrary sleeps, or URL-only waits as primary evidence.

Work that skips this checklist is not complete, even if the E2E test passes.

## API Diagnostic Event

API routes used by E2E-critical flows SHOULD emit start/end events in E2E/debug mode.

Required fields where available:

- `timestamp`
- `source: "api"`
- `route`
- `method`
- `action`
- `status`
- `durationMs`
- `stableErrorCode`
- `correlationId`

Covered flows:

- Owner login and session checks
- Hosteler PIN login
- Invite validate and activate
- Invite reset/generate
- Food today-status and submit
- Hosteler create, deactivate, reactivate, delete, reset invite
- Settings read/save

## UI Diagnostic Event

Client UI flows used by E2E-critical actions SHOULD emit action events in E2E/debug mode where practical.

Required fields where available:

- `timestamp`
- `source: "ui"`
- `page`
- `action`
- `state`: `click`, `submit-start`, `submit-success`, `submit-failure`, or `navigation-intent`
- `correlationId`
- `redactedMetadata`

## Redaction Contract

Diagnostics and artifacts MUST NOT include raw:

- PINs
- Passwords
- Cookies
- Invite token values
- Access tokens
- Refresh tokens
- Service-role keys
- Supabase auth tokens
- Sensitive personal data beyond masked or non-sensitive identifiers needed for debugging

Redaction utilities MUST cover common keys such as `pin`, `password`, `token`, `cookie`, `authorization`, `serviceRole`, `access_token`, `refresh_token`, and invite-token variants.

## Artifact Bundle Contract

Failed Playwright runs MUST preserve enough evidence to identify route/action/status/error-code causes:

- Playwright trace
- Screenshot on failure
- Video where configured
- Browser console logs relevant to the test
- Request/response summaries for relevant API calls
- Safe app-flow diagnostic events
- Test metadata including spec, test title, retry number, worker, and testRunId when available

Artifacts MUST NOT auto-open or keep a report server blocking terminal completion by default.