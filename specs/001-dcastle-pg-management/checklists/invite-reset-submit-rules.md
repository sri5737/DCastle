# Invite Reset & Superseded Submit Checklist: dCastle PG Management

**Purpose**: Validate requirement quality for owner-assisted forgot-PIN via regenerated invites and superseded-token submit behavior.
**Created**: 2026-07-05
**Feature**: [spec.md](../spec.md)

**Note**: This checklist validates requirements clarity, completeness, consistency, and readiness for planning/tasks. It does not validate implementation behavior.

## Requirement Completeness

- [x] CHK001 Are first-time invite activation requirements explicitly separated from owner-assisted forgot-PIN reset requirements for active PIN-linked hostelers? [Completeness, Spec §User Story 3, Spec §FR-029e]
- [x] CHK002 Are eligibility requirements for owner-assisted PIN reset defined for all lifecycle statuses (active, pending, inactive, deleted), including explicit rejection paths for non-active statuses? [Completeness, Spec §FR-005b]
- [x] CHK003 Are superseded-token requirements defined for both an already-open reset page and direct submit attempts against older tokens? [Completeness, Spec §User Story 3 Scenario 10, Spec §FR-029]
- [x] CHK004 Are invite token state transitions (new, active/latest, superseded, used, expired) fully documented with expected outcomes for each state? [Completeness, Spec §FR-005, Spec §FR-005c, Spec §FR-029, Spec §Edge Cases]
- [x] CHK005 Are account-preservation requirements during PIN reset (no lifecycle/status/history mutation) explicitly documented as non-negotiable outcomes? [Completeness, Spec §FR-029e]

## Requirement Clarity & Measurability

- [x] CHK006 Is the superseded-token failure response defined with a precise HTTP status code and response schema rather than only descriptive text? [Clarity, Gap]
- [x] CHK007 Is the ordering rule for "newer invite regenerated before submission" explicitly defined (for example, generation timestamp precedence) to avoid race-condition interpretation drift? [Ambiguity, Spec §User Story 3 Scenario 10]
- [x] CHK008 Is "old PIN becomes invalid immediately" measurable with explicit timing semantics and expected auth behavior boundary conditions? [Measurability, Spec §User Story 3 Scenario 8, Spec §FR-006b]
- [x] CHK009 Is the required user-facing instruction for active Google-linked hostelers in this flow specified precisely enough to prevent inconsistent UI wording/handling? [Clarity, Spec §User Story 3 Scenario 9, Spec §FR-006c, Gap]

## Requirement Consistency

- [x] CHK010 Do one-time token requirements align consistently between functional requirements and endpoint side-effect definitions for invite reset/regeneration? [Consistency, Spec §FR-005c, Spec §FR-029, Contract §hostelers.md POST /api/hostelers/[id]/reset-invite]
- [x] CHK011 Are superseded-token semantics in User Story 3 consistent with the currently documented invite activation error taxonomy (invalid/expired/used)? [Conflict, Spec §User Story 3 Scenario 10, Contract §auth.md POST /api/invite/activate]
- [x] CHK012 Are terms such as "token-invalid", "invalid or expired", "used", and "superseded" normalized to a non-conflicting vocabulary across spec and contracts? [Consistency, Spec §FR-005, Spec §FR-029, Contract §auth.md]
- [x] CHK013 Do post-reset login requirements align without conflict across User Story 4 scenarios, FR-006b invalidation rules, and FR-006a lockout constraints? [Consistency, Spec §User Story 4 Scenarios 8-9, Spec §FR-006a, Spec §FR-006b]

## Acceptance Criteria Quality

- [x] CHK014 Are acceptance criteria specific enough to distinguish successful activation from successful owner-assisted PIN reset using objective, falsifiable outcomes? [Acceptance Criteria, Spec §User Story 3 Independent Test]
- [x] CHK015 Is the superseded-token path acceptance criterion objectively testable with explicit expected error payload and recovery action (open latest link)? [Acceptance Criteria, Spec §User Story 3 Scenario 10]
- [x] CHK016 Are failure outcomes for expired, used, superseded, and non-active reset attempts defined as distinct requirement-level outcomes rather than merged generic failure language? [Acceptance Criteria, Spec §FR-005, Spec §FR-005b, Spec §FR-029, Gap]

## Scenario & Edge Case Coverage

- [x] CHK017 Are recovery-flow requirements documented for the full sequence where an old page fails as superseded and the hosteler retries with the newest link? [Coverage, Spec §User Story 3 Scenario 10, Gap]
- [x] CHK018 Are concurrent owner-regeneration scenarios covered with deterministic behavior requirements when multiple resets happen close together? [Edge Case, Spec §Edge Cases, Gap]
- [x] CHK019 Are boundary requirements defined for regenerated-token expiry during an in-progress forgot-PIN reset interaction? [Edge Case, Spec §FR-003, Spec §Edge Cases, Gap]

## Dependencies & Traceability Readiness

- [x] CHK020 Is there explicit traceability from FR-029e/FR-006b/FR-029 to contract clauses that define branch-specific API behavior for owner-assisted reset versus onboarding activation? [Traceability, Spec §FR-029e, Spec §FR-006b, Spec §FR-029, Gap]
- [x] CHK021 Do task definitions explicitly cover superseded-token submit handling for already-open reset pages and corresponding E2E acceptance evidence? [Dependencies, Tasks §US3, Tasks §US5, Gap]
- [x] CHK022 Is a requirement-level mapping documented for which API route handles owner-assisted forgot-PIN submit semantics and how it differs from standard invite activation processing? [Assumption, Gap]

## Notes

- Mark each item complete only after requirement text (spec/plan/tasks/contracts) is updated and internally consistent.
- Items marked with [Gap], [Ambiguity], [Conflict], or [Assumption] indicate readiness blockers for robust planning/task decomposition.
- 2026-07-05 closure: Spec, auth contract, hosteler contract, and US3 tasks were aligned on superseded-token taxonomy, deterministic ordering, immediate old-PIN invalidation boundary, Google-linked reset instruction text, route ownership, and stale-link recovery traceability.