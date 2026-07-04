# Hosteler Lifecycle Requirements Checklist: Deekshana Castle PG Management App (Phase 7 / US5)

**Purpose**: Validate requirement completeness, clarity, consistency, measurability, and scenario coverage for the Phase 7 owner delete/archive lifecycle updates before implementation
**Created**: 2026-07-04
**Feature**: [spec.md](../spec.md)

**Note**: This checklist focuses on the updated owner deletion behavior for pending and active hostelers, deleted-record visibility, preserved same-day and past history, and cancellation of future-dated preferences.

## Requirement Completeness

- [x] CHK001 - Are the pending-delete requirements explicit about every required outcome beyond invite invalidation and deleted-tab visibility, including whether any pre-activation session, token-validation, or shared-link states must be handled after deletion? [Completeness, Spec §FR-029a, US5 Scenario 7]
- [x] CHK002 - Are the active-delete requirements explicit about all preserved owner-visible artifacts, including deleted-tab metadata, food-history visibility, operational tracking history, and billing history, rather than relying on the broad phrase "history remains available"? [Completeness, Spec §FR-029b, US5 Scenarios 5-6, Key Entities]
- [x] CHK003 - Are requirements defined for whether canceled future-dated preferences remain visible anywhere with a canceled marker for audit purposes, or are they intended to disappear entirely from all owner-visible operational and billing surfaces? [Gap, Spec §FR-029b, US5 Scenario 6]
- [x] CHK004 - Are dependencies on downstream views explicitly documented so preserved same-day and past history for deleted-from-active hostelers is included where intended, while canceled future rows are excluded from owner dashboard, owner history, and billing inputs? [Traceability, Spec §FR-029b, FR-033, FR-035, FR-039, SC-013]

## Requirement Clarity

- [x] CHK005 - Is "deletion effective date" defined precisely enough to determine the preservation-vs-cancellation boundary for food preferences: IST calendar date, deletion timestamp, or owner confirmation moment? [Clarity, Spec §FR-029b, Plan Summary]
- [x] CHK006 - Is "same-day history" defined relative to the authoritative IST business date so reviewers can determine exactly which records are preserved when deletion happens near midnight or after timezone conversion? [Clarity, Spec §FR-029b, Edge Case: active hosteler deleted]
- [x] CHK007 - Is "owner-visible deleted record" quantified with a complete required field set and location, beyond the minimum FR-029c columns, so the audit requirement is objectively reviewable? [Clarity, Spec §FR-029c, SC-013]
- [x] CHK008 - Are the active-delete confirmation requirements specific enough about the owner-facing explanation of consequences, including access revocation, preserved past and same-day history, and cancellation of future-dated preferences, or does the spec still leave room for materially different confirmation copy and scope? [Clarity, US5 Scenario 5, Spec §FR-029b]

## Requirement Consistency

- [x] CHK009 - Are the preservation rules consistent across FR-029b, US5 Scenario 6, the active-delete edge case, and the Deleted Hosteler Record entity definition, or do any sections imply different treatment of same-day, past, or future records? [Consistency, Spec §FR-029b, US5 Scenario 6, Edge Cases, Key Entities]
- [x] CHK010 - Are the exclusion rules for canceled future preferences stated consistently across hosteler-management, dashboard, billing, and success-criteria sections so no future operational count or bill input can legitimately include a post-deletion row? [Consistency, Spec §FR-029b, FR-035, SC-013]
- [x] CHK011 - Is the deleted-from-status requirement consistent with the lifecycle model in FR-025 and the tasks/plan delta, especially for distinguishing deleted-from-pending versus deleted-from-active and clarifying whether deleted-from-inactive is intentionally unsupported? [Consistency, Spec §FR-025, FR-029c, Tasks Phase 7]

## Acceptance Criteria Quality

- [x] CHK012 - Can the deleted-record auditability requirement be objectively verified from the spec alone, including what "locate that deleted record" means and which surfaces must make it discoverable within the SC-013 threshold? [Measurability, Spec §FR-029c, SC-013]
- [x] CHK013 - Are the preserved-history requirements measurable enough to confirm that same-day and past rows remain available without reinterpreting implementation details, such as which queries or reports must still surface them? [Acceptance Criteria, Spec §FR-029b, SC-013]

## Scenario Coverage

- [x] CHK014 - Are alternate and exception flows defined for a pending invite link that is opened after the hosteler has been deleted but before the recipient realizes the link is no longer valid, including the expected error state and owner-audit expectations? [Coverage, Gap, Spec §FR-029a]
- [x] CHK015 - Are recovery or reversal expectations intentionally excluded for deletion actions, or should the requirements explicitly state whether deleted hostelers can never be restored from the deleted view? [Coverage, Gap, Spec §FR-029a, FR-029b, FR-029c]
- [x] CHK016 - Are requirements defined for active deletion when the hosteler is logged in on multiple devices, so the immediate access-revocation promise is unambiguous for concurrent sessions and not inferred only from deactivation behavior? [Coverage, Spec §FR-029b, Clarifications 2026-07-04]

## Dependencies & Assumptions

- [x] CHK017 - Does the spec make explicit whether deleted-from-active records remain eligible for monthly billing only through preserved same-day and past history, while deleted-from-pending records never contribute billing data, or is that distinction left as an implementation assumption? [Assumption, Spec §FR-029a, FR-029b, FR-035]
- [x] CHK018 - Are assumptions about invite invalidation, auth-session revocation, and future-preference cancellation traced back to written requirements rather than being documented only in plan/tasks text? [Traceability, Spec §FR-029a, FR-029b, Plan Testing Strategy, Tasks T049f-T049j]

## Ambiguities & Conflicts

- [x] CHK019 - Is there any unresolved ambiguity between "past and same-day history is preserved" and "future-dated preferences after the deletion effective date are canceled" for a deletion submitted on the same calendar day as a future operational target date? [Ambiguity, Spec §FR-029b, US5 Scenario 6]
- [x] CHK020 - Do any existing requirements for owner food-history export or bill regeneration conflict with the new deleted-hosteler lifecycle rules by implying that all historical rows remain equally exportable or billable regardless of cancellation state? [Conflict, Spec §FR-034, FR-035, FR-039, FR-029b]

## Notes

- Check items off as completed: `[x]`
- Use `[N/A]` for items intentionally excluded from scope with a brief justification
- Add inline findings when a checklist item reveals a gap that requires a spec amendment before implementation
- Items are numbered CHK001–CHK020 for traceability to review comments and follow-up spec updates