# Data Model: E2E Observability and Test Isolation

This feature does not add product-facing database tables. The model below defines test infrastructure entities, transient metadata, structured diagnostic events, and artifact bundles used by E2E validation.

## E2E Test Record

**Purpose**: Represents a Supabase/auth/application record created for exactly one E2E test.

**Fields**:

- `recordType`: `hosteler`, `authUser`, `inviteToken`, `foodPreference`, `settingsSnapshot`, or future documented test-owned type
- `recordId`: Supabase table ID or auth user ID
- `testRunId`: unique run marker shared by records from one test run
- `testCaseId`: stable test identifier, usually derived from spec and test title
- `marker`: stable cleanup marker such as `E2E <scope> <short-id>`
- `createdAt`: ISO timestamp
- `cleanupStrategy`: `delete`, `restore`, or `manual-serial-exception`
- `sensitiveFields`: list of fields that must never be logged raw

**Validation Rules**:

- Mutable records must include `testRunId` or a stable E2E marker.
- Destructive workflow targets must be created by the current test or explicitly documented as serial exceptions.
- Global login principals cannot be used as destructive targets.

**Relationships**:

- Created by a Test Data Factory.
- Registered in Cleanup Metadata.
- May appear in request/response summaries only through redacted or non-sensitive identifiers.

## Test Data Factory

**Purpose**: Creates deterministic prerequisites while preserving real UI/API validation for the core action under test.

**Factory Outputs**:

- Pending hosteler: hosteler row, invite token/link, cleanup IDs
- Active PIN-linked hosteler: auth user where needed, hosteler row, PIN credentials, cleanup IDs
- Active Google-linked hosteler: auth user, linked hosteler row, cleanup IDs
- Future food preference: isolated hosteler, future preference row, cleanup IDs
- Settings snapshot/restore: current owner settings, restore function, cleanup metadata

**Validation Rules**:

- Factories may use service-role Supabase access only in E2E setup/teardown code.
- Factories must not perform the user action that the test is supposed to prove.
- Factory-returned credentials and invite URLs are sensitive and must be redacted from logs/artifacts.

## Cleanup Metadata

**Purpose**: Tracks records that can be safely removed or restored after each test or suite run.

**Fields**:

- `testRunId`
- `tableName` or `authResource`
- `recordId`
- `restoreValue` for settings snapshots
- `deleteOrder`: dependency-aware cleanup order
- `createdAt`

**Validation Rules**:

- Cleanup must target only records created by the current test/run marker or explicitly recorded IDs.
- Cleanup must handle failed tests and partial setup.
- Settings changes must restore previous values instead of deleting global settings.

## Validation Scope

**Purpose**: Names a runnable validation slice for local iteration or risk-based completion evidence.

**Fields**:

- `name`: e.g. `us3-invite`, `us4-auth`, `us5-hosteler-lifecycle`, `full-completion`
- `unitCommand`: Vitest command where applicable
- `e2eCommand`: Playwright command where E2E-critical browser coverage is applicable
- `includesSpecs`: list of Playwright spec files
- `completionEligible`: boolean; true when the command is required evidence for the documented risk scope
- `expectedRuntimeTarget`: documented runtime expectation where measurable

**Validation Rules**:

- Scoped validation may guide iteration but cannot mark a task or phase complete unless it is part of the documented risk-based completion evidence.
- Completion evidence must include `npm run test:run` plus applicable API integration, component, or retained E2E-critical smoke coverage for the documented scope.
- `npm run build:cloudflare` is not routine local completion evidence; run it only on explicit user request or when diagnosing a reported pipeline/build failure.

## Diagnostic Event

**Purpose**: A structured, redacted log entry for API or UI flow debugging.

**Fields**:

- `timestamp`
- `source`: `api`, `ui`, `playwright`, or `setup`
- `route` or `page`
- `method`
- `action`
- `status`
- `durationMs`
- `stableErrorCode`
- `correlationId`
- `testRunId` when available
- `redactedMetadata`

**Validation Rules**:

- Must omit or redact PINs, passwords, tokens, cookies, invite token raw values, service-role keys, access/refresh tokens, and sensitive personal data.
- Must be gated by E2E/debug mode or approved operational logging level.
- Must be Edge-compatible for API route usage.

## Failure Artifact Bundle

**Purpose**: Collects evidence needed to diagnose an E2E failure without rerunning immediately.

**Contents**:

- Playwright trace
- Screenshot on failure
- Video where configured
- Browser console logs
- Request/response summaries for relevant API calls
- Safe application-flow diagnostics
- Test metadata: spec, test title, retry, worker, testRunId

**Validation Rules**:

- Artifact capture must not block terminal completion.
- Artifact contents must pass redaction checks.
- Failed flows should identify route, action, status, stable error code, and correlation ID when available.

## State Transitions

### E2E Test Record

`planned` -> `created` -> `used by core UI/API action` -> `asserted` -> `cleaned`

If setup fails: `planned` -> `partial` -> `cleaned where possible` -> `failed with artifact bundle`

### Diagnostic Event

`created` -> `redacted` -> `emitted` -> `captured in artifact bundle when relevant`

Unredacted diagnostic events are invalid and must not be emitted.

### Playwright Parallelism

`serial-only` -> `isolated audit pass` -> `controlled worker increase` -> `repeat full suite pass twice` -> `approved worker count documented`