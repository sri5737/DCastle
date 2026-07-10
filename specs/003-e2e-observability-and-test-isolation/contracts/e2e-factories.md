# Contract: E2E Factories and Cleanup

E2E factories create deterministic prerequisites for tests while preserving the real app action and business outcome as the evidence under test.

## Factory Functions

### `createPendingHosteler(options)`

Returns:

- `hostelerId`
- `name`
- `phone`
- `roomNumber`
- `inviteTokenId`
- `inviteUrl`
- `cleanupIds`
- `testRunId`

Requirements:

- Creates a unique pending hosteler for the current test.
- Generates an invite token or uses the real invite API when the test requires proving invite generation.
- Does not activate the hosteler when the core action under test is activation.

### `createActivePinHosteler(options)`

Returns:

- `hostelerId`
- `phone`
- `pin`
- `authUserId` when applicable
- `cleanupIds`
- `testRunId`

Requirements:

- Creates a unique active hosteler with bcryptjs PIN hash and deterministic login credentials.
- Redacts `pin` from logs and artifacts.
- Supports hosteler login, food submission, and owner dashboard producer-to-consumer tests without mutating global seeded hostelers.

### `createActiveGoogleHosteler(options)`

Returns:

- `hostelerId`
- `email`
- `authUserId`
- `cleanupIds`
- `testRunId`

Requirements:

- Links a unique Supabase auth user to a unique active hosteler.
- Does not expose raw password or provider tokens in diagnostics.

### `createFutureFoodPreference(options)`

Returns:

- `hostelerId`
- `preferenceId`
- `date`
- `meals`
- `cleanupIds`
- `testRunId`

Requirements:

- Creates deterministic setup for read-path or cancellation scenarios.
- Does not replace the core food submission action when the test is proving submission.

### `snapshotSettings(options)`

Returns:

- `settingsBefore`
- `restore()`
- `cleanupIds`
- `testRunId`

Requirements:

- Captures owner settings before mutation.
- Restores exact previous values after test completion or failure.

## Cleanup Contract

Cleanup helpers MUST:

- Delete only tracked IDs or records with stable E2E markers for the current run.
- Delete dependent rows before parent rows.
- Delete generated Supabase auth users for E2E-only hostelers.
- Restore settings snapshots instead of deleting global settings.
- Tolerate partial setup failure.

## Forbidden Factory Behavior

- Mutating shared seeded hostelers as business data.
- Using database writes to replace the user action under test.
- Logging PINs, passwords, invite token raw values, cookies, access tokens, refresh tokens, or service-role keys.
- Creating records without deterministic cleanup metadata.