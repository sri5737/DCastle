# Feature Specification: CI/CD Pipeline Foundation

**Feature Branch**: `002-cicd-foundation`

**Created**: 2026-07-05

**Status**: Draft

**Input**: User description: "Create a new central specification for pipeline and deployment work, including automatic QA Supabase migration execution with deployment blocking on migration failure, Cloudflare deployment context, branch strategy, and security expectations."

## Clarifications

### Session 2026-07-05

- Q: When should QA migrations execute for qa branch activity? -> A: QA migrations apply only on push commits to qa and reruns of that same run.
- Q: How should reruns and deployment authority be handled for qa branch commits? -> A: Reruns are pinned to their original commit; only the latest successful run for the current branch HEAD is deployment-authoritative.
- Q: Which branch is protected as deployment-authoritative before production is enabled? -> A: qa only; production branch protection is introduced when production enablement is activated.
- Q: If migrations succeed but a later required gate fails, should the pipeline auto-rollback the database migration? -> A: No automatic database rollback occurs after migration success; deployment remains blocked and recovery is fix-forward via a new migration.
- Q: What standardized content must the fail-fast security error message include? -> A: Include stage code, failed check category, target environment, run id/sha, and one remediation hint; never include secret values.
- Q: How should concurrent same-branch runs resolve deployment authority and cancellation timing? -> A: Newest-commit-wins with gate-boundary cancellation; older same-branch runs are canceled once a newer run reaches deployment-eligibility evaluation.
- Q: What audit log retention period and access scope should apply for pipeline security/compliance records? -> A: Retain audit logs for 90 days; access allowed to maintainers plus security/admin roles.
- Q: What gate-specific timeout budgets should be enforced for required pipeline stages? -> A: Unit/integration 20 minutes, end-to-end 30 minutes, Cloudflare parity build 20 minutes, and migration 10 minutes.
- Q: What trigger criteria should activate production enablement controls? -> A: Hybrid trigger: production enablement requires both 1 successful deployment-authoritative run on qa and explicit maintainer approval.
- Q: What exact QA stability threshold must be met before production enablement can activate? -> A: 1 successful deployment-authoritative run on qa.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enforce CI Quality Gates (Priority: P1)

As a maintainer, I want every qualifying code change to pass required verification gates before deployment eligibility, so that unstable or non-compliant changes are blocked early.

**Why this priority**: Quality gates are the primary safety barrier that prevents defective changes from reaching deployment stages.

**Independent Test**: Introduce one intentionally failing test or build condition in a change candidate and verify the pipeline marks the run as failed and blocks deployment eligibility.

**Acceptance Scenarios**:

1. **Given** a change candidate enters CI for a protected branch, **When** unit/integration and end-to-end validation complete successfully and Cloudflare parity build passes, **Then** the change is marked deployment-eligible.
2. **Given** a change candidate enters CI for a protected branch, **When** any required verification gate fails, **Then** the change is marked not deployment-eligible and no deployment stage starts.
3. **Given** a pipeline run is reviewed by maintainers, **When** they inspect gate outcomes, **Then** each required gate has a clear pass/fail result and execution timestamp.

---

### User Story 2 - Automate QA Database Migrations (Priority: P1)

As a maintainer of the qa branch, I want Supabase migrations to execute automatically when migration files are committed, so QA runtime and schema remain synchronized without manual intervention.

**Why this priority**: Schema drift between application code and QA database causes immediate runtime failures and blocks QA validation.

**Independent Test**: Commit a valid migration change to the migration directory on qa and verify the pipeline applies the migration to the QA database, then commit an invalid migration and verify migration failure blocks deployment.

**Acceptance Scenarios**:

1. **Given** a commit to qa includes one or more migration file changes under the migration directory, **When** the pipeline runs, **Then** database migration execution is triggered automatically before deployment.
2. **Given** a migration execution on qa fails, **When** the pipeline evaluates deployment eligibility, **Then** deployment is blocked and the run includes a failure reason tied to migration execution.
3. **Given** a commit to qa has no migration file changes, **When** the pipeline runs, **Then** migration execution is skipped intentionally and recorded as skipped, while other required gates continue.

---

### User Story 3 - Control Deployment Gating and Promotion (Priority: P2)

As a release owner, I want a clear branch-based promotion flow from qa toward future production, so releases are predictable, auditable, and gated by explicit checks.

**Why this priority**: A defined promotion flow reduces accidental releases and supports future production expansion without redesigning the process.

**Independent Test**: Validate that qa deployments can proceed only after qa-required gates pass, and that production promotion remains blocked until production-specific gates and approvals are satisfied.

**Acceptance Scenarios**:

1. **Given** a qa branch pipeline run passes all qa-required gates, **When** deployment gating is evaluated, **Then** deployment to the QA environment is allowed.
2. **Given** a qa branch pipeline run has any required gate failure, **When** deployment gating is evaluated, **Then** deployment to the QA environment is denied.
3. **Given** production environment support is enabled in future, **When** a production promotion is attempted, **Then** it follows a separate production gate set and explicit promotion control without bypassing QA evidence.

---

### User Story 4 - Operate Safely During Pipeline Failures (Priority: P2)

As an on-call maintainer, I want safe manual trigger, retry, rollback guidance, and observability for pipeline runs, so incidents can be resolved quickly without unsafe shortcuts.

**Why this priority**: Operational controls reduce outage duration while preserving release safety during transient failures or rollback events.

**Independent Test**: Trigger a controlled pipeline failure, perform an authorized retry/manual rerun, confirm observability data captures failure and recovery, and verify rollback guidance is available for failed deployments.

**Acceptance Scenarios**:

1. **Given** a pipeline run fails due to a transient condition, **When** an authorized maintainer retries the run, **Then** the retry action is recorded and the run restarts from a defined safe entry point.
2. **Given** a deployment was attempted and later judged unsafe, **When** maintainers follow rollback guidance, **Then** environment restoration steps and verification checks are available and unambiguous.
3. **Given** maintainers investigate a failure, **When** they view pipeline telemetry, **Then** they can identify failed stage, branch, environment target, and timestamp without accessing hidden systems.

---

### Edge Cases

- A migration file is committed on qa alongside unrelated application changes and migration succeeds while another gate fails: deployment remains blocked because all required gates must pass; no automatic database rollback is performed, and recovery is fix-forward via a new migration.
- Multiple migration files are committed in one qa push: migration execution order is deterministic and failure of any migration blocks deployment.
- A migration is syntactically valid but incompatible with current QA schema state: pipeline marks migration stage failed and prevents deployment.
- A non-qa branch modifies migration files: QA migration execution is not triggered because automated QA migration applies only to qa push runs and reruns of those same runs.
- A manual retry is triggered while a prior run is still active for the same branch: only one authoritative deployment candidate can proceed.
- A newer same-branch commit reaches deployment-eligibility evaluation while older same-branch runs are still active: older runs are canceled at that gate boundary, and only the newest commit can remain deployment-authoritative.
- A rerun for an older qa commit succeeds after a newer commit has reached branch HEAD: the older rerun remains non-authoritative and cannot authorize deployment.
- A required gate exceeds its configured timeout budget: the timed-out gate is marked failed with timeout reason, and deployment remains blocked.
- Production environment is introduced later while QA remains active: promotion policy must prevent direct production deployment from unqualified branch states.
- One successful deployment-authoritative qa run is achieved but explicit maintainer approval is not granted: production enablement remains inactive.
- Required secrets are missing or expired: pipeline fails in a clear preflight/security stage before migration or deployment actions begin.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The pipeline specification MUST be the central governance source for CI/CD, deployment, and database-migration automation changes for this repository.
- **FR-002**: The pipeline MUST enforce required quality gates that include unit/integration validation, end-to-end validation, and Cloudflare deployment parity validation before deployment eligibility is granted.
- **FR-003**: The Cloudflare parity gate MUST use the repository-standard parity command `npm run build:cloudflare` as the deployment build equivalence signal.
- **FR-004**: Only push-triggered runs on the qa branch (and reruns of those same runs) MUST evaluate migration-file changes under `supabase/migrations/` and automatically trigger QA database migration execution when changes are present.
- **FR-005**: QA migration execution failure MUST mark the run as failed and MUST block QA deployment.
- **FR-006**: QA runs without migration-file changes MUST explicitly record migration stage outcome as skipped or not-required, without being treated as a silent success.
- **FR-007**: Deployment gating MUST require all mandatory stages for the target environment to pass before deployment starts.
- **FR-008**: The deployment process MUST support branch strategy where qa branch deploys to QA now, and future production uses a separate promotion path with distinct controls.
- **FR-009**: Production promotion policy, when enabled, MUST require successful upstream qualification evidence from qa and MUST prevent bypass deployment paths.
- **FR-010**: The pipeline MUST provide an authorized manual trigger and retry mechanism that preserves normal gating requirements.
- **FR-011**: The operational playbook MUST include rollback guidance with prerequisite checks, restoration actions, and post-rollback verification expectations.
- **FR-012**: Pipeline observability MUST expose, at minimum, run status, stage outcomes, branch, target environment, and failure reason in auditable records.
- **FR-013**: Secrets used by pipeline stages MUST be environment-scoped, never committed to version control, and only accessible to authorized execution contexts.
- **FR-014**: The pipeline MUST fail fast with explicit messaging when required secrets are missing, invalid, or unauthorized for the target environment.
- **FR-020**: Standardized fail-fast security messages MUST include stage code, failed check category, target environment, run identifier (run id and/or commit SHA), and exactly one remediation hint, and MUST NOT expose any secret values.
- **FR-022**: Pipeline audit/security records MUST be retained for at least 90 days, and read access MUST be restricted to maintainers and designated security/admin roles.
- **FR-015**: Pipeline terminology and stage naming MUST align with repository conventions and existing workflow structure under `.github/workflows/` to keep operational language consistent.
- **FR-016**: Any rerun MUST remain pinned to the original commit SHA of its source run and MUST NOT be re-bound to a newer branch HEAD.
- **FR-017**: For deployment authorization, only the latest successful run whose evaluated commit SHA equals the current target branch HEAD at authorization time MAY be deployment-authoritative; older successful reruns are non-authoritative.
- **FR-018**: Until production enablement is explicitly activated, qa MUST be the only protected deployment-authoritative branch; production branch protection controls MUST be introduced only at production enablement time.
- **FR-019**: If QA migration execution succeeds and any later mandatory gate fails, deployment MUST remain blocked, MUST NOT perform automatic database rollback, and MUST require fix-forward recovery through a new migration change.
- **FR-021**: Deployment authority MUST follow newest-commit-wins per branch: when a newer same-branch run reaches deployment-eligibility evaluation, any older active same-branch runs MUST be canceled at that gate boundary and MUST NOT proceed to deployment authorization.
- **FR-023**: Required stage timeout budgets MUST be explicitly enforced as follows: unit/integration 20 minutes, end-to-end 30 minutes, Cloudflare parity build 20 minutes, and migration 10 minutes; timeout MUST be recorded as a gate failure reason.
- **FR-024**: Production enablement controls MUST activate only when both conditions are met: (a) the QA stability threshold of 1 successful deployment-authoritative qa run is satisfied, and (b) explicit maintainer approval is recorded for the same enablement decision; meeting only one condition MUST NOT activate production enablement.

### Key Entities *(include if feature involves data)*

- **Pipeline Run**: A single auditable execution for a branch/event that evaluates all required gates and records outcomes.
- **Stage Gate**: A mandatory verification checkpoint (quality, migration, deployment eligibility) with explicit pass/fail/skip outcome.
- **Migration Change Set**: The set of migration file modifications detected for a run and evaluated for QA automation policy.
- **Environment Target**: A deployment context with its own gating policy and secrets scope (QA now, production planned).
- **Promotion Record**: Evidence linking an upstream qualified run to a downstream environment promotion decision.
- **Operational Event**: A manual trigger, retry, rollback, or failure investigation action recorded for traceability.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of qa deployments are preceded by a pipeline run in which all mandatory qa gates pass.
- **SC-002**: 100% of qa runs that include migration-file changes execute the migration stage automatically.
- **SC-003**: 100% of runs with migration-stage failure result in deployment being blocked.
- **SC-004**: For pipeline failures, maintainers can identify the failed stage and failure reason within 5 minutes using available run records.
- **SC-005**: 100% of deployment attempts are traceable to a recorded branch, environment target, and gate outcome set.
- **SC-006**: After production promotion is enabled, 100% of production deployments originate from the defined promotion path with documented upstream qualification evidence.
- **SC-007**: 100% of pipeline audit/security records remain available for 90 days and are accessible only to maintainers and designated security/admin roles.
- **SC-008**: 100% of production enablement activation events include evidence of both conditions: exactly 1 successful deployment-authoritative qa run and explicit maintainer approval for that activation event.

## Assumptions

- QA currently uses a single Supabase database shared for QA validation, while a separate production database/environment will be introduced later.
- Cloudflare remains the deployment platform context and parity validation signal for release readiness.
- Existing workflow definitions under `.github/workflows/` are the operational baseline and will be extended, not replaced, by future pipeline changes.
- Authorized maintainers are responsible for manual retries/triggers and for executing rollback steps according to documented guidance.
- This specification is intentionally broad so future CI/CD enhancements (additional gates, environments, or safety controls) can be added without creating a new top-level pipeline spec.
