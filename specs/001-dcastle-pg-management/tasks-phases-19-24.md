# Tasks: Phases 19–24 (Billing and Owner Management)

**Scope**: User Stories 14–21 (Building/Room Management, Rate History, Billing, Employee Management, Dashboards)

**Date**: 2026-07-10 | **Status**: Phase 19 complete; Phases 20-24 pending

**Organization**: Tasks are grouped by phase, ordered by dependencies. Each phase represents a complete, independently testable increment.

---

## Dependencies Summary

```
Phase 19 (US14) ──┐
                  ├─> Phase 20 (US15, US16) ──┐
                  │                           ├─> Phase 22 (US18) ──┐
Phase 21 (US17) ──┘                           │                     ├─> Phase 24 (US20, US21)
                                              │                     │
Phase 23 (US19) ────────────────────────────────────────────────────┘
```

- **Phase 19** (Building/Room/Cot) → Foundational; no external dependencies
- **Phase 20** (Rate History) → Depends on Phase 19 (room structure)
- **Phase 21** (Mess Facility) → Can run in parallel with Phase 19/20
- **Phase 22** (Billing) → Depends on Phase 20 (rate lookups)
- **Phase 23** (Employee) → Independent; no hard dependencies
- **Phase 24** (Dashboards) → Depends on Phases 20, 22, 23
- **Phase 26** (Accommodation Assignment/Reassignment) → Depends on Phase 19 (building/room/cot infrastructure)

---

## Phase 19: Building/Room/Cot Infrastructure (US14)

**Goal**: Establish multi-building, multi-room, multi-cot inventory management

**Acceptance Criteria** (Phase-level):
- [x] Owner can create buildings with unique names per owner
- [x] Owner can add rooms to buildings with unique room numbers per building
- [x] Owner can define room types with AC/non-AC dropdown values and sharing capacity
- [x] Owner can configure individual cots with lower/upper assignments
- [x] Owner can assign hostelers to specific buildings, rooms, and cots during registration
- [x] Building hierarchy is queryable for later billing and dashboard operations
- [x] All operations respect RLS (owner cannot see other owners' buildings)

**Implementation Audit Snapshot (2026-07-10, post-implementation)**:
- T100: Complete. Migration/schema coverage verified in `src/lib/__tests__/migrations.test.ts` for tables, constraints, indexes, RLS, and idempotency guards.
- T101: Complete. Building CRUD route coverage added in `src/app/api/admin/buildings/__tests__/route.test.ts` for duplicate handling, hierarchy fetch, update conflicts, not found, and occupied delete blocking.
- T102: Complete. Room and configuration route coverage added/expanded in `src/app/api/admin/rooms/__tests__/route.test.ts` and `src/app/api/admin/rooms/__tests__/configuration-change.test.ts` including duplicate/date validation and pending-change response.
- T103: Complete. Cot and assignment route coverage added in `src/app/api/admin/cots/__tests__/route.test.ts`; lifecycle cot release remains covered in `src/app/api/hostelers/[id]/route.test.ts`.
- T104: Complete. Owner buildings UI coverage added in `src/components/buildings/__tests__/building-tree.test.tsx`, `src/components/buildings/__tests__/room-configuration-change-form.test.tsx`, and `src/app/admin/buildings/__tests__/page.test.tsx`.
- T105: Complete. Hosteler registration cascading assignment coverage added in `src/app/admin/hostelers/__tests__/page.test.tsx` including free-cot filtering and payload assertions.
- T105b: Complete. Room configuration history migration coverage expanded in `src/lib/__tests__/migrations.test.ts` including immutable policy and grant shape.
- T105c: Complete. Boundary and historical lookup coverage expanded in `src/app/api/admin/rooms/__tests__/configuration-change.test.ts` and `src/app/api/billing/__tests__/room-config.test.ts`; immutability policy assertions are included in migration tests.

**Phase 19 Completion Checklist (Partial -> Complete)**:
- [x] C1 (T100/T105b): Added migration verification tests in `src/lib/__tests__/migrations.test.ts` covering table shape, unique constraints, indexes, idempotent re-apply, and `room_configuration_history` immutability behavior.
- [x] C2 (T101): Added `src/app/api/admin/buildings/__tests__/route.test.ts` for POST/GET/PATCH/DELETE happy-path and failures (duplicate name, not found, occupied building delete block, owner isolation).
- [x] C3 (T102): Added `src/app/api/admin/rooms/__tests__/route.test.ts` and extended `src/app/api/admin/rooms/__tests__/configuration-change.test.ts` for IST boundary cases, duplicate effective dates, and pending-change behavior via `GET /api/admin/rooms/[id]`.
- [x] C4 (T102/T105c): Expanded `src/app/api/billing/__tests__/room-config.test.ts` to cover pre-change/on-change/post-change lookups and invalid date input handling.
- [x] C5 (T103): Added `src/app/api/admin/cots/__tests__/route.test.ts` for cot generation, assignment/unassignment, active-hosteler enforcement, occupancy reporting, and cross-owner access denial.
- [x] C6 (T103): Retained and validated lifecycle integration coverage for cot release on deactivate/delete in `src/app/api/hostelers/[id]/route.test.ts`.
- [x] C7 (T104): Added component/page tests: `src/components/buildings/__tests__/building-tree.test.tsx`, `src/components/buildings/__tests__/room-configuration-change-form.test.tsx`, and `src/app/admin/buildings/__tests__/page.test.tsx` for form validation, pending labels, and mobile-safe rendering contracts.
- [x] C8 (T105): Added hosteler assignment UI tests in `src/app/admin/hostelers/__tests__/page.test.tsx` validating cascading Building -> Room -> Cot flow, free-cot filtering, required-field validation, and payload fields `building_id`, `room_id`, `cot_id`.
- [x] C9 (T105c): Added immutability proof assertions in `src/lib/__tests__/migrations.test.ts` confirming update/delete policies are blocked (`USING (false)` / `WITH CHECK (false)`).
- [x] C10 (Phase gate): Ran `npm run test:run` (full suite pass: 21 files, 112 tests).

**Phase 19 Task Status**:
- [x] T100 complete
- [x] T101 complete
- [x] T102 complete
- [x] T103 complete
- [x] T104 complete
- [x] T105 complete
- [x] T105b complete
- [x] T105c complete

**New Requirement Delta**:
- [x] T105d [Phase 19/20] Update room type model and Add Room Type UI/API so room type is a fixed AC/non-AC dropdown with sharing capacity, and remove base rent from the room-type form while preserving completed Phase 19 work.
    - [x] D1: Update the room type data model in spec/plan so `name` is a fixed enum value (`AC` or `non-AC`) and `sharing_capacity` is stored with the room type.
    - [x] D2: Remove the `base_rent` input from the Add Room Type form and replace the free-text room type name field with an AC/non-AC dropdown plus sharing-capacity input.
    - [x] D3: Update `POST /api/admin/room-types` validation and response shape to accept `name`, `sharing_capacity`, and `cot_count` only.
    - [x] D4: Update any room-type consumers (`Add Room Type`, room selection, room creation defaults) so they read the new enum-driven room type values without breaking existing Phase 19 room/building behavior.
    - [x] D5: Add or update component/API tests for the room-type form and route to verify the dropdown values, sharing-capacity validation, and absence of base rent.
    - [x] D6: Run the relevant targeted tests and then `npm run test:run` to confirm the updated room-type flow does not regress completed Phase 19 functionality.
- [x] T105e [Phase 19] Update cot auto-generation to create deterministic bunker-pair labels per room as `L{n}`/`U{n}` (for example `L1`,`U1`,`L2`,`U2`) instead of ambiguous sequential labels.
    - [x] E1: Update cot generation algorithm in `POST /api/admin/rooms/[id]/cots` so each configured bunk index creates exactly two cots: lower (`L{n}`) and upper (`U{n}`).
    - [x] E2: Confirm `room_types.cot_count` semantics are treated as bunker count for cot generation and reflected consistently in API comments/docs.
    - [x] E3: Preserve uniqueness and owner-isolation constraints while generating labels (`(room_id, cot_id_label)` and existing RLS behavior).
    - [x] E4: Update owner UI cot displays (building tree/availability views) to show the new labels without breaking occupancy status rendering.
    - [x] E5: Add/extend API and component tests to verify exact label sequence (`L1`,`U1`,`L2`,`U2`), correct `cot_type` mapping, duplicate-protection behavior, and existing assignment flows.
    - [x] E6: Run targeted cot/room tests and then `npm run test:run` to ensure no regression in Phase 19 room/cot assignment behavior.
- [x] T105f [Phase 19] Add cot configuration type selection in Configure Cots (`bunker` or `normal`) and support normal-mode `L{n}` label generation.
    - [x] F1: Update configure-cots UI to include required cot configuration type selector with options `bunker` and `normal`.
    - [x] F2: Update `POST /api/admin/rooms/[id]/cots` request validation and generation logic to branch by selected type: bunker => `L{n}`/`U{n}`, normal => `L{n}` only.
    - [x] F3: Ensure normal-mode generated labels map to lower cot semantics and preserve `(room_id, cot_id_label)` uniqueness plus owner isolation.
    - [x] F4: Update cot display surfaces (building tree, availability, hosteler assignment dropdowns) so normal-mode labels appear correctly without regression.
    - [x] F5: Add/extend API and component tests for both modes, including exact label sequences and cot-type mapping assertions.
    - [x] F6: Run targeted cot/configure-cots tests and then `npm run test:run` to confirm no regression in Phase 19 room/cot assignment behavior.
- [x] T105g [Phase 19] Redesign Buildings and Rooms owner UI for scalable room navigation and management actions.
    - [x] G1: Add visible delete action for each building in UI and wire it to existing `DELETE /api/admin/buildings/[id]` behavior, including blocked-delete error messaging.
    - [x] G2: Restructure building expansion UX to show room numbers list first; avoid rendering all room configuration forms at once.
    - [x] G3: Add selected-room detail panel that renders Configure Cots, Change Room Configuration, and cot status only for active room selection.
    - [x] G4: Add explicit visible labels for all room configuration inputs (including sharing capacity first field) and retain existing validation behavior.
    - [x] G5: Preserve mobile/tablet usability and no-horizontal-overflow guardrails while introducing new navigation pattern.
    - [x] G6: Add/extend component tests for building delete action visibility/flow, room-list-to-room-detail interaction, and room configuration field labels.
    - [x] G7: Run targeted buildings UI tests and then `npm run test:run` to confirm no regression in Phase 19 functionality.
- [x] T105h [Phase 19] Add room type lifecycle controls (safe delete + archive) and room-level cot reset workflow.
    - [x] H1: Add `active` lifecycle field support for room types and ensure inactive room types are excluded from Add Room selectors.
    - [x] H2: Implement `PATCH /api/admin/room-types/[id]` archive/unarchive operation with owner isolation and validation.
    - [x] H3: Implement `DELETE /api/admin/room-types/[id]` safe delete that blocks when any room references the room type and returns clear blocked-delete messaging.
    - [x] H4: Do not add per-cot hard delete endpoint; add room-level cot reset operation that regenerates cot inventory only when no active hosteler assignment exists in that room.
    - [x] H5: Update Buildings/Rooms UI with room type archive/delete controls and cot reset action messaging/confirmations.
    - [x] H6: Add/extend API and component tests for room type archive/delete constraints and cot reset guardrails.
    - [x] H7: Run targeted room-type/cot tests and then `npm run test:run` to confirm no regression in Phase 19 behavior.
- [x] T105i [Phase 19] Apply Buildings/Rooms UX refinements for safer destructive actions and faster large-inventory navigation.
    - [x] I1: Add confirmation modal for building delete action with clear irreversible-action wording and building identifier.
    - [x] I2: Add room-type lifecycle search/filter controls and scalable rendering behavior for large room-type lists.
    - [x] I3: Improve blocked room-type delete feedback to include usage context (referencing room count when available) and archive guidance.
    - [x] I4: Redesign cot reset interaction as a clearer destructive-action panel that shows current mode, target mode, and guardrail notes before submit.
    - [x] I5: Add room-number search/filter within each opened building to quickly locate a room before loading room detail.
    - [x] I6: Add/extend component and API tests covering delete confirmation flow, room search/filter interaction, and enhanced reset/blocked-delete messaging.
    - [x] I7: Run targeted Buildings/Rooms UX tests and then `npm run test:run` to confirm no regression in Phase 19 functionality.
- [x] T105j [Phase 19] Simplify Buildings creation flow by removing standalone Room Type Lifecycle UI and embedding room template fields directly in Add Room.
    - [x] J1: Remove "Room Type Lifecycle" panel from Buildings page primary surface while preserving underlying safe archive/delete backend behavior.
    - [x] J2: Extend Add Room form to include inline room template attributes: room class (`AC`/`non-AC`), sharing capacity, cot count.
    - [x] J3: Add cot configuration type (`bunker`/`normal`) to Add Room form and apply it at room-creation time so owner does not need immediate follow-up cot configuration step.
    - [x] J4: Update room-creation API flow to resolve-or-create active room type template from inline fields and create room in one transaction-safe operation.
    - [x] J5: Remove mandatory rent field from Add Room flow and introduce explicit unresolved/global-rent-managed state until Phase 20 global room-rent config is active.
    - [x] J6: Update/extend component and API tests for the new unified Add Room flow, including duplicate template resolution, cot mode handling, and no-rent submission path.
    - [x] J7: Run targeted Buildings/Rooms tests and then `npm run test:run` to verify no regression after lifecycle-panel removal.
- [x] T105l [Phase 19] Add delete room button with confirmation in building tree, and add immediate cot-count update field to room detail panel.
    - [x] L1: Add delete room button in room detail panel, wired to existing DELETE /api/admin/rooms/[id] with active-hosteler guard.
    - [x] L2: Add confirmation dialog for room delete (name the room number, destructive warning).
    - [x] L3: Extend PATCH /api/admin/rooms/[id] to accept cot_count and update the room_type template in-place (unique constraint prevents new row creation).
    - [x] L4: Add "Update Cot Count" immediate control in room detail panel � updates template then auto-resets cots preserving current mode.
    - [x] L5: Update/add component and API tests for delete room flow and cot-count update.
    - [x] L6: Run targeted Buildings/Rooms tests and then npm run test:run.
- [x] T105k [Phase 19] Simplify hosteler registration to identity-only fields and remove accommodation assignment fields from Add Hosteler form.
    - [x] K1: Remove Building, Room, Cot, and Room No. fields from Add Hosteler registration UI.
    - [x] K2: Keep registration payload limited to identity fields (name, phone) and required invite/auth fields.
    - [x] K3: Ensure hosteler records can be created in unassigned accommodation state.
    - [x] K4: Update/add component and API tests to assert registration no longer requires assignment fields.
    - [x] K5: Run targeted hosteler-registration tests and then `npm run test:run` to confirm no regression.

---

### T100 — Phase 19: Database Migrations for Building/Room/Cot Tables

**User Story**: US14  
**Functional Requirements**: FR-084, FR-085, FR-086, FR-087  
**Acceptance Criteria**:
- [ ] AC1: Migration creates `buildings` table with columns: `id`, `owner_id` (FK), `name`, `description`, `created_at`, `updated_at`, and unique constraint on `(owner_id, name)`
- [x] AC2: Migration creates `room_types` table with columns: `id`, `owner_id` (FK), `name` (AC/non-AC enum), `sharing_capacity`, `cot_count`, `description`, `created_at`, `updated_at`, and unique constraint on `(owner_id, name, sharing_capacity)`
- [x] AC3: Migration creates `rooms` table with columns: `id`, `building_id` (FK), `room_number`, `floor` (enum: ground/first/second/null), `room_type_id` (FK), `current_rent`, `created_at`, `updated_at`, and unique constraint on `(building_id, room_number)`
- [x] AC4: Migration creates `cots` table with columns: `id`, `room_id` (FK), `cot_id_label`, `cot_type` (enum: lower_cot/upper_cot), `hosteler_id` (FK, nullable), `created_at`, `updated_at`, and unique constraint on `(room_id, cot_id_label)`
- [ ] AC5: All tables include appropriate indexes on foreign keys and frequently-queried columns
- [ ] AC6: Migration is idempotent and can be run against any database state

**Test Coverage Required**:
- Unit tests: Verify migration syntax, table structure, constraints, and idempotency
- Integration tests: Apply migration to test database, verify schema matches specification

**Dependencies**: Phase 2 (Supabase setup complete)

**File Paths**:
- Migration: `supabase/migrations/XXX_add_building_room_cot_tables.sql`
- Tests: `src/lib/__tests__/migrations.test.ts`

**Estimated Scope**: Small

---

### T101 — Phase 19: API Routes for Building Management (CRUD)

**User Story**: US14  
**Functional Requirements**: FR-085 (Building CRUD)  
**Acceptance Criteria**:
- [ ] AC1: `POST /api/admin/buildings` creates a new building; enforces `(owner_id, name)` uniqueness; returns `{ id, name, description, created_at }`
- [x] AC2: `GET /api/admin/buildings` returns all buildings for the authenticated owner with hierarchical rooms and cots nested
- [x] AC3: `GET /api/admin/buildings/[id]` returns a single building with full hierarchy (rooms → cots) or 404 if not found
- [x] AC4: `PATCH /api/admin/buildings/[id]` updates building name and/or description; enforces `(owner_id, name)` uniqueness again after update
- [ ] AC5: `DELETE /api/admin/buildings/[id]` soft-deletes or returns 400 if building contains active rooms; RLS prevents cross-owner access
- [ ] AC6: All routes include proper error handling (400 for validation, 401 for auth, 403 for RLS, 500 for server)
- [ ] AC7: Responses follow consistent JSON structure with metadata (created_at, updated_at)

**Test Coverage Required**:
- Unit tests: Input validation (building name length, description), uniqueness checks
- API integration tests: Create → read → update → delete workflow per owner; RLS isolation between owners
- Component tests (in Phase 19 UI task): Form submission and response handling

**Dependencies**: T100 (schema created)

**File Paths**:
- Routes: `src/app/api/admin/buildings/route.ts`, `src/app/api/admin/buildings/[id]/route.ts`
- Tests: `src/app/api/admin/buildings/__tests__/route.test.ts`

**Estimated Scope**: Small

---

### T102 — Phase 19: API Routes for Room and Room-Type Management

**User Story**: US14  
**Functional Requirements**: FR-085, FR-086 (Room and RoomType CRUD)  
**Acceptance Criteria**:
- [ ] AC1: `POST /api/admin/room-types` creates a new room type for the owner; enforces `(owner_id, name, sharing_capacity)` uniqueness; returns full record with `id`, `name` (AC/non-AC), `sharing_capacity`, `cot_count`
- [x] AC2: `GET /api/admin/room-types` lists all room types for the authenticated owner
- [x] AC3: `POST /api/admin/buildings/[id]/rooms` adds a room to a building; validates `room_type_id` belongs to same owner; enforces `(building_id, room_number)` uniqueness
- [x] AC4: `GET /api/admin/buildings/[id]/rooms` returns all rooms in a building with their room-type details and cots
- [ ] AC5: `PATCH /api/admin/rooms/[id]` updates room details (number, floor, rent); validates uniqueness after update
- [ ] AC6: `DELETE /api/admin/rooms/[id]` removes room only if no cots are assigned to active hostelers; otherwise returns 400
- [ ] AC7: RLS prevents cross-owner room access (owner A cannot modify owner B's rooms)
- [ ] AC8: `POST /api/admin/rooms/[id]/configuration-change` accepts JSON body: `{ new_sharing_capacity: int, new_room_class: 'ac'|'non_ac', new_rent: decimal, effective_date: date }`
- [ ] AC9: Validates: new_sharing_capacity >= 1, new_rent > 0, effective_date must be today or future (IST calendar date); returns HTTP 400 with specific error "Effective date cannot be in the past" if effective_date < today
- [ ] AC10: Creates immutable `room_configuration_history` record (INSERT-only; no UPDATE/DELETE allowed after creation); room's active configuration changes only when effective_date is reached
- [ ] AC11: `GET /api/admin/rooms/[id]` returns extended response including: `{ ...current fields..., pending_change: { new_sharing_capacity, new_room_class, new_rent, effective_date } | null }`
- [ ] AC12: `GET /api/billing/room-config?room_id=[id]&date=[date]` returns `{ sharing_capacity, room_class, rent, effective_date }` for the room configuration effective on that specific date; lookup query pattern: `SELECT new_sharing_capacity, new_room_class, new_rent FROM room_configuration_history WHERE room_id=$id AND effective_date <= $date ORDER BY effective_date DESC LIMIT 1`

**Test Coverage Required**:
- Unit tests: Input validation (room number format, floor enum, rent amount), uniqueness constraints, effective-date validation (reject past dates, accept today/future, IST boundary edge cases), sharing-capacity validation against cot inventory
- API integration tests: Room CRUD workflow within building; RLS isolation; cascading cot relationships; room configuration history immutability (past changes block UPDATE/DELETE); historical lookup correctness
- Component tests (Phase 19 UI): Form field rendering, dropdown selection for room types and floors, date picker behavior
- Integration/component validation: Cross-story billing validation (create room with type change → generate bill for date before/after effective_date → verify billing uses correct type)

**Dependencies**: T100 (schema), T101 (building routes), T105b (room_configuration_history migration)

**File Paths**:
- Routes: `src/app/api/admin/room-types/route.ts`, `src/app/api/admin/buildings/[id]/rooms/route.ts`, `src/app/api/admin/rooms/[id]/route.ts`, `src/app/api/admin/rooms/[id]/configuration-change/route.ts`, `src/app/api/billing/room-config/route.ts`
- Tests: `src/app/api/admin/rooms/__tests__/route.test.ts`, `src/app/api/admin/rooms/__tests__/configuration-change.test.ts`, `src/app/api/billing/__tests__/room-config.test.ts`

**Estimated Scope**: Medium

---

### T103 — Phase 19: API Routes for Cot Management and Hosteler Assignment

**User Story**: US14  
**Functional Requirements**: FR-087 (Cot CRUD and hosteler assignment)  
**Acceptance Criteria**:
- [ ] AC1: `POST /api/admin/rooms/[id]/cots` creates cots within a room based on room-type cot_count; enforces `(room_id, cot_id_label)` uniqueness
- [x] AC2: `GET /api/admin/rooms/[id]/cots` returns all cots in a room with occupancy status (hosteler_id if assigned, null if free)
- [x] AC3: `PATCH /api/admin/cots/[id]` assigns or unassigns a cot to/from a hosteler; validates hosteler exists and is active
- [x] AC4: `GET /api/admin/cots/availability` returns full hierarchical view: all buildings → rooms → cots with occupancy details (for cot dashboard)
- [ ] AC5: When a hosteler is assigned during registration (`POST /api/admin/hostelers`), cot assignment is atomic (building_id, room_id, cot_id all set together)
- [ ] AC6: When a hosteler is deleted or deactivated, their cot is automatically unassigned (hosteler_id set to null)

**Test Coverage Required**:
- Unit tests: Cot label generation, occupancy status logic, cascade on hosteler deletion/deactivation
- API integration tests: Cot assignment workflow; hosteler lifecycle cascading; RLS enforcement
- Integration/component validation: Assign hosteler to building → room → cot; verify hierarchical response; deactivate hosteler and verify cot freed

**Dependencies**: T102 (room routes)

**File Paths**:
- Routes: `src/app/api/admin/rooms/[id]/cots/route.ts`, `src/app/api/admin/cots/[id]/route.ts`, `src/app/api/admin/cots/availability/route.ts`
- Tests: `src/app/api/admin/cots/__tests__/route.test.ts`
- Hosteler update: `src/app/api/admin/hostelers/route.ts` (modify to support building/room/cot assignment)

**Estimated Scope**: Medium

---

### T104 — Phase 19: Owner UI for Building/Room/Cot Management

**User Story**: US14  
**Functional Requirements**: FR-085, FR-086, FR-087 (UI implementation)  
**Acceptance Criteria**:
- [ ] AC1: Owner dashboard includes "Buildings & Rooms" page at `/admin/buildings`
- [x] AC2: Page displays hierarchical tree: Buildings → Rooms → Cots with visual collapse/expand
- [x] AC3: Owner can click "Add Building" → form appears for building name and description → submit creates building via `POST /api/admin/buildings`
- [x] AC4: Owner can click "Add Room" within building → form appears for room number, floor, room type selection, rent → submit creates room via `POST /api/admin/buildings/[id]/rooms`
- [ ] AC5: Owner can click "Add Room Type" → form appears for AC/non-AC dropdown and sharing capacity (no base rent field), plus cot count → submit creates room type via `POST /api/admin/room-types`
- [ ] AC6: Owner can click "Configure Cots" on room → form/modal shows cot creation and assignment workflow → cots are created via `POST /api/admin/rooms/[id]/cots`
- [ ] AC7: Forms include validation (required fields, numeric rent, enum dropdowns for floor/cot type)
- [ ] AC8: Success feedback (toast, snackbar) after create/update; error feedback with specific messages
- [ ] AC9: On 375 px mobile baseline: no page-level horizontal overflow, all form fields are reachable, buttons are touch-friendly (≥44 px)
- [ ] AC10: Owner can click "Change Room Configuration" button on any room card → modal/form appears with: (a) sharing capacity input (1/2/3/4...), (b) AC/non-AC selector, (c) rent input, (d) date picker for effective date (default to today)
- [ ] AC11: Form submission calls `POST /api/admin/rooms/[id]/configuration-change` with `{ new_sharing_capacity, new_room_class, new_rent, effective_date }`; on success, room card displays label in warning color: "Room configuration will be updated on [effective_date]" until the effective date is reached; on error (effective_date in past), error message displays inline below date picker: "Effective date cannot be in the past"
- [ ] AC12: Date picker validation: (a) disallows selection of dates in the past (< today, IST calendar date), (b) submit button is disabled if effective_date < today, (c) date picker UI indicates "today" as default/highlighted option
- [ ] AC13: On 375 px mobile: date picker form is fully rendered in viewport without horizontal scroll; input fields and buttons are touch-friendly (≥44 px tall); modal/form does not overlap with primary content

**Test Coverage Required**:
- Component tests: Form rendering, input validation, success/error state handling, pending-change label display, sharing-capacity and AC/non-AC controls
- API integration tests: Form submissions integrate with backend routes; effective-date validation
- Integration/component validation: Create room → schedule configuration change (sharing + AC/non-AC + rent) for future date → verify pending label → advance calendar to effective date → verify label removed and new configuration applied
- Mobile layout tests: Verify 375 px baseline compliance, no horizontal overflow, reachable primary actions, date picker accessibility

**Dependencies**: T102 (API routes with effective-date support), T105b (room_configuration_history migration)

**File Paths**:
- Page: `src/app/admin/buildings/page.tsx`, `src/app/admin/buildings/[id]/page.tsx`
- Components: `src/components/buildings/building-tree.tsx`, `src/components/buildings/add-building-form.tsx`, `src/components/buildings/add-room-form.tsx`, `src/components/buildings/add-room-type-form.tsx`, `src/components/buildings/room-configuration-change-form.tsx`, `src/components/buildings/configure-cots.tsx`
- Tests: `src/components/buildings/__tests__/building-tree.test.tsx`, `src/components/buildings/__tests__/room-configuration-change-form.test.tsx`, `src/app/admin/buildings/__tests__/page.test.tsx`

**Estimated Scope**: Medium

---

### T105 — Phase 19: Integration of Cot Assignment in Hosteler Registration

**User Story**: US14  
**Functional Requirements**: FR-087 (hosteler assignment to cots during registration)  
**Acceptance Criteria**:
- [ ] AC1: Owner registration form for new hosteler includes cascading dropdowns: Building → Room → Cot
- [x] AC2: Building dropdown populated via `GET /api/admin/buildings`; selecting building filters rooms
- [x] AC3: Room dropdown populated via `GET /api/admin/buildings/[id]/rooms`; selecting room filters available cots
- [x] AC4: Cot dropdown populated via `GET /api/admin/rooms/[id]/cots`; only shows free cots (hosteler_id IS NULL)
- [ ] AC5: Submission to `POST /api/admin/hostelers` includes building_id, room_id, cot_id in request body
- [ ] AC6: On success, hosteler is created and cot is atomically assigned (hosteler_id updated)
- [ ] AC7: Validation prevents submission if any required building/room/cot field is missing
- [ ] AC8: On 375 px mobile: cascading dropdown UX is accessible and not horizontally scrollable

**Test Coverage Required**:
- Component tests: Dropdown cascading logic, free-cot filtering, form validation
- API integration tests: Hosteler creation with building/room/cot atomicity; verify cot assignment
- Integration/component validation: Open hosteler registration → select building → room → cot → submit → verify hosteler and cot assignment

**Dependencies**: T104 (building/room/cot UI foundation)

**File Paths**:
- Component modifications: `src/components/hostelers/add-hosteler-form.tsx` (add cascading dropdowns)
- Tests: `src/components/hostelers/__tests__/add-hosteler-form.test.tsx`

**Estimated Scope**: Small

---

### T105b — Phase 19: Database Migration for Room Configuration History

**User Story**: US14  
**Functional Requirements**: FR-139, FR-140, FR-141, FR-142  
**Acceptance Criteria**:
- [ ] AC1: Migration creates `room_configuration_history` table with columns: `id` (PK, uuid), `room_id` (FK to rooms.id, ON DELETE CASCADE), `old_sharing_capacity` (int, nullable), `new_sharing_capacity` (int, NOT NULL, >=1), `old_room_class` (enum ac/non_ac, nullable), `new_room_class` (enum ac/non_ac, NOT NULL), `old_rent` (decimal, nullable), `new_rent` (decimal, NOT NULL, > 0), `effective_date` (date, NOT NULL), `created_by` (uuid, FK to auth.users.id, NOT NULL), `created_at` (timestamptz, default now())
- [x] AC2: Unique constraint on `(room_id, effective_date)` — no two configuration changes for same room on same effective date
- [x] AC3: Indexes created on: `room_id`, `effective_date`, `created_at` for efficient historical lookups during billing
- [x] AC4: RLS or trigger enforces immutability: INSERT allowed, UPDATE/DELETE blocked on all rows (past effective_date cannot be modified)
- [ ] AC5: Migration is idempotent (IF NOT EXISTS guards)

**Test Coverage Required**:
- Unit tests: Migration syntax, schema structure, constraints, idempotency
- Integration tests: Immutability verified (UPDATE rejected, DELETE rejected); efficiency via EXPLAIN analysis for historical queries

**Dependencies**: T100 (rooms table exists), T102 (room configuration routes reference history table)

**File Paths**:
- Migration: `supabase/migrations/XXX_room_configuration_history.sql`
- Tests: `src/lib/__tests__/migrations.test.ts` (add room_configuration_history verification)

**Estimated Scope**: Small

---

### T105c - Phase 19: Room Configuration History Validation and Immutability

**User Story**: US14  
**Functional Requirements**: FR-139, FR-140, FR-141, FR-142, FR-143, FR-144  
**Acceptance Criteria**:
- [ ] AC1: Unit tests for effective-date validation: (a) reject dates in past, (b) accept today/future (IST calendar date), (c) edge cases: midnight IST boundary, end-of-month, leap years, month transitions
- [x] AC2: Unit tests for room configuration history immutability: (a) INSERT new room_configuration_history record succeeds, (b) UPDATE attempted on any room_configuration_history row returns HTTP 403 Forbidden or blocks via RLS, (c) DELETE attempted on any room_configuration_history row returns HTTP 403 Forbidden or blocks via RLS
- [x] AC3: API integration tests: (a) `POST /api/admin/rooms/[id]/configuration-change` with past date returns HTTP 400 with specific error "Effective date cannot be in the past", (b) `POST` with future date succeeds and creates immutable history record, (c) `GET /api/admin/rooms/[id]` includes `pending_change` field until effective_date, then field removed, (d) `GET /api/billing/room-config?room_id=[id]&date=[date]` returns correct room configuration for dates before/on/after effective_date
- [x] AC4: Cross-story integration validation (non-E2E required): (a) owner creates room with initial configuration (4-sharing non_ac), (b) owner schedules room configuration change to 2-sharing ac with future date, (c) generate bill for date before effective_date → verify old configuration-based rent, (d) advance IST calendar date to effective_date, (e) generate bill for date on/after effective_date → verify new configuration-based rent
- [ ] AC5: Immutability proof test: attempt to PATCH/UPDATE historical room_configuration_history row → verify HTTP 403 Forbidden or 400 Bad Request with appropriate error message

**Test Coverage Required**:
- Unit tests: 100% date validation coverage (past/future/boundary), immutability enforcement via RLS
- API integration tests: Effective-date boundary testing (day boundaries, month boundaries), historical lookup correctness, error responses
- Integration/component validation: Cross-story billing validation (room configuration change → bill generation for multiple dates)

**Dependencies**: T102 (room configuration change API routes), T105b (room_configuration_history schema)

**File Paths**:
- Tests: `src/app/api/admin/rooms/__tests__/configuration-change.test.ts` (new, effective-date and immutability tests)
- Tests: `src/app/api/billing/__tests__/room-config.test.ts` (new, historical lookup tests)

**Estimated Scope**: Medium

---

## Phase 20: Rate History Tracking (US15 & US16)

**Goal**: Track room rent and meal rate changes with effective dates; support historical rate lookups for accurate billing

**Acceptance Criteria** (Phase-level):
- [x] Owner can set future global room rent config by sharing capacity and room type
- [x] Owner can set future meal rate changes for breakfast, lunch, dinner
- [x] "Rent will be updated on [date]" labels display until effective date is reached
- [x] Historical rate lookups return correct rate for any given date
- [x] Bills generated for any month use rates effective for each specific day
- [x] Rate changes support previous, current, and future calendar months

---

### T106 — Phase 20: Database Migrations for Rate History Tables

**User Story**: US15, US16  
**Functional Requirements**: FR-088, FR-089  
**Acceptance Criteria**:
- [x] AC1: Migration creates `room_rent_config_history` table with columns: `id`, `owner_id` (FK), `sharing_capacity`, `room_class` (`ac`/`non_ac`), `old_rent`, `new_rent`, `effective_date`, `created_by` (FK to owner), `created_at`, and unique constraint on `(owner_id, sharing_capacity, room_class, effective_date)`
- [x] AC2: Migration creates `meal_rate_rate_history` table with columns: `id`, `meal_type` (enum: breakfast/lunch/dinner), `old_rate`, `new_rate`, `effective_date`, `created_by` (FK to owner), `created_at`, and unique constraint on `(meal_type, effective_date)`
- [x] AC3: Indexes created on `owner_id`, `sharing_capacity`, `room_class`, `effective_date`, `meal_type` for efficient historical lookups
- [x] AC4: Both tables are immutable (no UPDATE or DELETE allowed via RLS/triggers; only INSERT)
- [x] AC5: Migration is idempotent

**Test Coverage Required**:
- Unit tests: Migration idempotency, schema structure
- Integration tests: Immutability enforced via RLS or triggers; efficient query plans for historical lookups

**Dependencies**: T100 (foundational schema)

**File Paths**:
- Migration: `supabase/migrations/XXX_add_rate_history_tables.sql`
- Tests: `src/lib/__tests__/rate-history.test.ts`

**Estimated Scope**: Small

**Phase 20 Task Status**:
- [x] T106 complete
- [x] T107 complete
- [x] T108 complete
- [x] T109 complete
- [x] T110 complete
- [x] T110a complete

---

### T107 — Phase 20: API Routes for Global Room Rent Config Management

**User Story**: US15  
**Functional Requirements**: FR-088 (global room rent config change with effective date)  
**Acceptance Criteria**:
- [x] AC1: `POST /api/admin/room-rent-config/change` accepts body: `{ sharing_capacity: int, room_class: 'ac'|'non_ac', new_rent: decimal, effective_date: date }`
- [x] AC2: Creates a `room_rent_config_history` record keyed by `(owner_id, sharing_capacity, room_class, effective_date)`
- [x] AC3: Until effective date, settings display shows "Rent config will be updated to ₹[new_rent] on [date]" for the selected sharing-capacity + room-class combination
- [x] AC4: On/after the effective date, billing lookup for that combination returns the new rent
- [x] AC5: Validates: sharing_capacity >= 1, room_class enum valid, new_rent > 0, effective_date is not in past (can be today or future)
- [x] AC6: Supports date range: previous month (e.g., -30 days), current month, future dates
- [x] AC7: `GET /api/admin/room-rent-config` returns current rent config matrix and pending changes per combination
- [x] AC8: RLS prevents cross-owner rent-config modifications

**Test Coverage Required**:
- Unit tests: Date validation, decimal rent parsing, effective-date boundary testing (midnight IST edge cases)
- API integration tests: Create rent change, verify label until effective date, verify rent updates on/after effective date
- Component tests (Phase 20 UI): Date picker interaction, pending-change label display

**Dependencies**: T102 (room configuration routes)

**File Paths**:
- Routes: `src/app/api/admin/room-rent-config/change/route.ts`, `src/app/api/admin/room-rent-config/route.ts`
- Tests: `src/app/api/admin/room-rent-config/__tests__/change.test.ts`

**Estimated Scope**: Small

---

### T108 — Phase 20: API Routes for Meal Rate Change Management and Historical Lookups

**User Story**: US16  
**Functional Requirements**: FR-089 (meal rate change with effective date and historical lookups)  
**Acceptance Criteria**:
- [x] AC1: `POST /api/admin/meal-rates/change` accepts body: `{ meal_type: 'breakfast'|'lunch'|'dinner', new_rate: decimal, effective_date: date }`
- [x] AC2: Creates `meal_rate_rate_history` record; on effective date, this rate becomes current
- [x] AC3: `GET /api/admin/settings/meal-rates` returns current rates for all three meals and any pending changes
- [x] AC4: Until effective date, settings page displays "Meal rate will be updated on [date]" for each meal with pending change
- [x] AC5: Endpoint `GET /api/billing/meal-rate?meal_type=breakfast&date=2026-07-15` returns the rate effective on that specific date (used by billing)
- [x] AC6: Historical rate lookup queries are efficient (indexed, single-row lookups via `WHERE effective_date <= $date ORDER BY effective_date DESC LIMIT 1`)
- [x] AC7: Validates: new_rate > 0, effective_date not in past, meal_type is valid enum
- [x] AC8: Supports date ranges: previous month, current month, future

**Test Coverage Required**:
- Unit tests: Date boundary validation, decimal rate parsing, historical lookup queries (SQL correctness)
- API integration tests: Set meal rate change, verify pending label, verify historical lookup on/after effective date
- Integration/component validation: Set future meal rate → generate bill for future date → verify bill uses new rate

**Dependencies**: T106 (rate history schema)

**File Paths**:
- Routes: `src/app/api/admin/meal-rates/change/route.ts`, `src/app/api/billing/meal-rate/route.ts`
- Tests: `src/app/api/admin/meal-rates/__tests__/change.test.ts`, `src/app/api/billing/__tests__/meal-rate.test.ts`

**Estimated Scope**: Medium

---

### T109 — Phase 20: Owner UI for Rate Change Management

**User Story**: US15, US16  
**Functional Requirements**: FR-088, FR-089 (UI for rate changes)  
**Acceptance Criteria**:
- [x] AC1: Settings page at `/admin/settings` includes sections: "Global Room Rent Config" and "Meal Rate Changes"
- [x] AC2: Owner can choose sharing capacity + room class in Room Rent Config, then set date and new rent
- [x] AC3: Form submission calls `POST /api/admin/room-rent-config/change`; success shows "Rent config change scheduled"
- [x] AC4: Settings page displays pending label per combination: "Rent config will be updated to ₹[new] on [date]"
- [x] AC5: Owner can click "Update Meal Rates" → modal appears with date picker and input fields for breakfast, lunch, dinner
- [x] AC6: Form submission calls `POST /api/admin/meal-rates/change` for each meal; success shows "Meal rates change scheduled"
- [x] AC7: Settings page displays pending meal rate changes: "Meal rate will be updated on [date]" for each meal
- [x] AC8: On 375 px mobile: date picker and input fields are reachable, no horizontal overflow, forms are touch-friendly

**Test Coverage Required**:
- Component tests: Date picker functionality, form validation, pending-label rendering
- API integration tests: Forms call correct endpoints with correct payload
- Integration/component validation: Set global room-rent config change (sharing capacity + room class) with future date → verify label displays → advance date to effective date → verify billing lookup uses new rent

**Dependencies**: T107, T108 (rate change APIs)

**File Paths**:
- Page: `src/app/admin/settings/page.tsx` (extend existing)
- Components: `src/components/settings/room-rent-config-form.tsx`, `src/components/settings/meal-rate-change-form.tsx`
- Tests: `src/components/settings/__tests__/rate-change-forms.test.tsx`

**Estimated Scope**: Medium

---

### T110 — Phase 20: Unit Tests and Query Validation for Historical Rate Lookups

**User Story**: US15, US16  
**Functional Requirements**: FR-088, FR-089 (testing historical lookups)  
**Acceptance Criteria**:
- [x] AC1: Unit test suite covers global room-rent config lookup for dates: before first change, on change date, between changes, after latest change
- [x] AC2: Unit test suite covers meal rate lookup for all three meal types with multiple historical rates per meal
- [x] AC3: Tests verify query efficiency: single-row lookup with indexed effective_date
- [x] AC4: Tests validate edge cases: midnight IST, last day of month, first day of month, leap years
- [x] AC5: Tests confirm lookup returns correct rate when multiple config changes exist for a sharing-capacity + room-class combination and for meal types
- [x] AC6: Integration tests verify database indexes exist and queries use them (EXPLAIN analysis)

**Test Coverage Required**:
- Unit tests: 100% coverage of rate lookup logic with parametrized date scenarios
- Integration tests: Query plan verification, index usage confirmation

**Dependencies**: T106, T108 (rate history schema and APIs)

**File Paths**:
- Tests: `src/lib/__tests__/rate-history-queries.test.ts`

**Estimated Scope**: Small

### T110a � Phase 20: UX Refinements for Rate Change Flows

**User Story**: US15, US16  
**Functional Requirements**: FR-157  
**Acceptance Criteria**:
- [x] AC1: Room rent and meal rate forms show pre-submit effective-date summary (current vs scheduled values)
- [x] AC2: Pending-change chips remain visible and consistent after refresh
- [x] AC3: Duplicate/invalid effective-date feedback appears inline and is actionable
- [x] AC4: Tablet-primary layout remains scannable with no horizontal overflow

**Phase 20 Completion Summary**:
- [x] All 6 tasks completed with 193/193 tests passing
- [x] Rate history tables created with immutability via RLS
- [x] APIs for room rent and meal rate management implemented
- [x] Owner UI for rate changes added to settings page
- [x] Comprehensive test coverage for historical lookups
- [x] Mobile-responsive at 375px baseline
- [x] Ready for Phase 22 (Billing) implementation

**Test Coverage Required**:
- Component tests: Summary card rendering, inline validation feedback, pending-chip visibility

**Dependencies**: T107, T108, T109

**File Paths**:
- Components: `src/components/settings/room-rent-config-form.tsx`, `src/components/settings/meal-rate-change-form.tsx`
- Tests: `src/components/settings/__tests__/rate-change-forms.test.tsx`

**Estimated Scope**: Small

---

## Phase 21: Mess Facility Access and Auto-Submission (US17)



**Goal**: Control hosteler access to meal submission; auto-submit defaults after owner's configured deadline if meal submission is enabled

**Acceptance Criteria** (Phase-level):
- [x] Owner can enable/disable "Meal Submission" per hosteler during registration and editing
- [x] Hostelers with meal submission DISABLED cannot access food submission page (access blocked)
- [x] Hostelers with meal submission ENABLED see defaults (YES/YES/YES) and can manually submit before owner's deadline
- [x] After owner's configured meal deadline, any unsubmitted meals auto-submit with defaults (YES/YES/YES) marked as `is_auto_submitted=true`
- [x] Hostelers cannot modify auto-submitted meals; must contact owner for changes
- [x] Billing excludes all meal charges for hostelers with meal submission disabled; includes auto-submitted meals in billing

---

### T111 — Phase 21: Database Schema Update for Mess Facility Assignment

**User Story**: US17  
**Functional Requirements**: FR-090  
**Acceptance Criteria**:
- [x] AC1: Migration adds `availing_mess` (boolean, default true) column to `hostelers` table
- [x] AC2: Existing hostelers default to `availing_mess = true`
- [x] AC3: `availing_mess` is indexed on hostelers; `is_auto_submitted` is indexed on food_preferences for efficient blocking and billing queries
- [x] AC4: RLS enforces that only the owner can modify a hosteler's `availing_mess` status
- [x] AC5: Migration adds `is_auto_submitted` (boolean, default false) column to `food_preferences` table to track auto-submitted meals
- [x] AC6: Migration is idempotent

**Test Coverage Required**:
- Unit tests: Migration idempotency, default value application
- Integration tests: Column added and indexed; RLS policies work correctly

**Dependencies**: T100 (hostelers table exists)

**File Paths**:
- Migration: `supabase/migrations/XXX_add_availing_mess_to_hostelers.sql`

**Estimated Scope**: Small

---

### T112 — Phase 21: Food Preference Auto-Submission and Meal Switch Logic

**User Story**: US17  
**Functional Requirements**: FR-090 (food submission blocking and auto-submission)  
**Acceptance Criteria**:
- [x] AC1: When a hosteler with `availing_mess = false` attempts to access food submission page, access is denied with message: "Meal submission is disabled. Please contact owner to enable meal facilities."
- [x] AC2: When a hosteler with `availing_mess = true` visits food submission page, all three meals default to ON
- [x] AC3: Hosteler can manually submit with defaults (YES/YES/YES) or override by toggling meals ON/OFF before the owner-configured meal deadline
- [x] AC4: After owner's meal deadline (configured in settings) on any given day, any unsubmitted meals for that day auto-submit with defaults (breakfast=YES, lunch=YES, dinner=YES)
- [x] AC5: Auto-submitted `food_preferences` records include `is_auto_submitted=true` flag and `submitted_by='system'` audit field
- [x] AC6: Hostelers CANNOT manually edit or delete auto-submitted meals; they must contact owner to make changes
- [x] AC7: If owner toggles `availing_mess = false` mid-period, already auto-submitted meals stand; only future submissions are blocked
- [x] AC8: Billing queries treat auto-submitted meals (is_auto_submitted=true) identically to manually submitted meals (counts toward daily meal charges)
- [x] AC9: Logic is implemented in API route `POST /api/food/submit` (blocking check, auto-submission trigger via background job or scheduled task), component initialization, and food preferences query layer

**Test Coverage Required**:
- Unit tests: Auto-submission timing logic (trigger at owner deadline), is_auto_submitted flag, blocking logic for availing_mess=false
- Component tests: Food submission page blocks/displays based on availing_mess; defaults render correctly; UI disables manual edit for auto-submitted meals
- API integration tests: POST /api/food/submit rejects for availing_mess=false; accepts/defaults for availing_mess=true; auto-submission job creates records with is_auto_submitted=true; billing queries include auto-submitted records
- Integration/component validation: Hosteler NOT availing → access denied; hosteler availing → submit → defaults auto-apply after deadline; verify billing includes auto-submitted meals; verify toggle OFF mid-period blocks future submissions but preserves past auto-submissions

**Dependencies**: T111 (availing_mess column added)

**File Paths**:
- API logic: `src/app/api/food/submit/route.ts` (update or new helper function)
- Component logic: `src/components/food-toggle.tsx` (update initialization)
- Tests: `src/components/__tests__/food-toggle.test.tsx`, `src/app/api/food/__tests__/submit.test.ts`

**Estimated Scope**: Small

---

### T113 — Phase 21: Owner UI to Toggle Mess Facility Status

**User Story**: US17  
**Functional Requirements**: FR-090 (UI for meal submission access control)  
**Acceptance Criteria**:
- [x] AC1: Owner hosteler registration form includes toggle: "Enable Meal Submission?" (default ON) with help text: "When ON: hosteler sees meal submission form with defaults (breakfast/lunch/dinner). When OFF: hosteler cannot access meal submission; auto-submit at deadline is blocked."
- [x] AC2: Owner hosteler management page (`/admin/hostelers`) displays "Meal Submission" status (Enabled/Disabled) for each hosteler
- [x] AC3: Owner can click to edit hosteler and toggle "Enable Meal Submission" status; change calls `PATCH /api/admin/hostelers/[id]` with `{ availing_mess: boolean }`
- [x] AC4: Toggle OFF immediately blocks access to food submission page for that hosteler; already auto-submitted meals from past periods remain (not reversed)
- [x] AC5: Toggle ON re-enables access and resumes auto-submission after owner's configured deadline
- [x] AC6: UI shows audit info: "Last changed [date/time] by owner" next to toggle
- [x] AC7: On 375 px mobile: toggle is reachable, help text is readable, no horizontal overflow

**Test Coverage Required**:
- Component tests: Toggle rendering, help text visibility, state management (enable/disable), success/error feedback, audit timestamp display
- API integration tests: PATCH endpoint accepts availing_mess boolean and updates correctly; RLS prevents cross-owner edits
- Integration/component validation: Toggle ON → hosteler can access food form and auto-submits after deadline; Toggle OFF → hosteler blocked from access; Toggle OFF mid-period → existing auto-submissions preserved; Toggle back ON → auto-submission resumes; verify audit timestamp updates

**Dependencies**: T111 (availing_mess and is_auto_submitted schema), T112 (auto-submission logic)

**File Paths**:
- API: `src/app/api/admin/hostelers/[id]/route.ts` (PATCH endpoint for toggle)
- Components: `src/components/hostelers/add-hosteler-form.tsx` (add toggle), `src/components/hostelers/hosteler-list.tsx` (show status and last-changed audit)
- Tests: `src/components/hostelers/__tests__/add-hosteler-form.test.tsx`, `src/app/api/admin/hostelers/__tests__/[id].test.ts`

**Estimated Scope**: Small

---

**Phase 21 Task Status**:
- [x] T111 complete
- [x] T112 complete
- [x] T113 complete

**Phase 21 Completion Summary**:
- [x] All 3 tasks completed
- [x] Mess facility controls are implemented end-to-end
- [x] Auto-submission behavior and blocking rules are covered
- [x] Billing integration for availing/non-availing mess paths is in place

---

## Phase 22: Billing Generation, Transmission, and Visibility (US18)



**Goal**: Two-phase billing (generate → review → transmit) with per-day accurate rate lookups

**Acceptance Criteria** (Phase-level):
- [x] Owner can generate bills for all hostelers, specific building, or individual hosteler
- [x] Bills are generated in "Awaiting Transmission" state; NOT visible to hostelers
- [x] Owner can review bill details before transmission
- [x] Owner can transmit bills, making them visible to hostelers
- [x] Bills accurately calculate room rent + meal charges using rates effective for each day
- [x] Hosteler views transmitted bills with per-day breakdown

---

### T114 — Phase 22: Database Migration for Monthly Bills Table

**User Story**: US18  
**Functional Requirements**: FR-091, FR-092  
**Acceptance Criteria**:
- [x] AC1: Migration creates `monthly_bills` table with columns: `id`, `hosteler_id` (FK), `month` (date, first day of month), `status` (enum: 'generated'|'transmitted'), `room_rent_total`, `meal_charges` (jsonb with breakfast/lunch/dinner), `grand_total`, `generated_at`, `transmitted_at` (nullable), `created_at`, `updated_at`
- [x] AC2: Unique constraint on `(hosteler_id, month)` ensures one bill per hosteler per month
- [x] AC3: Indexes on `hosteler_id`, `month`, `status` for efficient queries
- [x] AC4: RLS enforces owner-only access to bills; hostelers only see their own transmitted bills
- [x] AC5: Migration is idempotent

**Test Coverage Required**:
- Unit tests: Schema structure, constraints, idempotency
- Integration tests: RLS policies enforce correct access (owner sees all, hosteler sees only own transmitted)

**Dependencies**: T100 (foundational schema)

**File Paths**:
- Migration: `supabase/migrations/XXX_add_monthly_bills_table.sql`

**Estimated Scope**: Small

---

### T115 — Phase 22: Billing Calculation Logic (Room Rent + Meal Charges)

**User Story**: US18  
**Functional Requirements**: FR-091 (bill calculation with historical rates)  
**Acceptance Criteria**:
- [x] AC1: Function `calculateMonthlyBill(hosteler_id, month)` returns: `{ room_rent_total, meal_charges: { breakfast, lunch, dinner }, grand_total }`
- [x] AC2: For each day in month: looks up room rent effective for that day (via `GET /api/billing/room-rent?room_id=[id]&date=[date]`)
- [x] AC3: For each day: sums daily room rent and adds to `room_rent_total`
- [x] AC4: For each meal type for each day: counts how many days hosteler opted for that meal (from `food_preferences`) and multiplies by meal rate effective for that day
- [x] AC5: Aggregates meal charges: `{ breakfast: sum_breakfast, lunch: sum_lunch, dinner: sum_dinner }`
- [x] AC6: Calculates `grand_total = room_rent_total + sum(meal_charges)`
- [x] AC7: Handles edge cases: hosteler with no room assignment (room_rent_total = 0), hosteler with no food preferences (meal charges = 0), mess facility status (exclude meal charges for NOT availing)
- [x] AC8: Uses only non-canceled food preferences (where `canceled_at IS NULL`)
- [x] AC9: Same-day reassignment rule: if a hosteler has multiple room assignments on the same IST date, billing uses only the latest assignment for that date (no intra-day/hourly proration)
- [x] AC10: Uses owner-adjusted current-month food entries when present (latest persisted value for each affected day)
- [x] AC11: Function is testable in isolation (no side effects)

**Test Coverage Required**:
- Unit tests: Bill calculation with various scenarios (multi-rate-change months, no preferences, no room, no availing mess)
- Unit tests: Per-day rate lookup integration within bill calculation
- Unit tests: Same-day multiple room changes resolve to latest assignment for that IST date
- Unit tests: Owner-adjusted entries are used in bill totals before transmission
- Integration tests: Seeded month with specific hostelers, rates, preferences → generate bill → verify totals are correct

**Dependencies**: T108 (historical rate lookups available), T111 (mess facility status available)

**File Paths**:
- Utility: `src/lib/billing.ts`
- Tests: `src/lib/__tests__/billing.test.ts`

**Estimated Scope**: Medium

---

### T116 — Phase 22: API Route for Bill Generation

**User Story**: US18  
**Functional Requirements**: FR-091 (bill generation endpoint)  
**Acceptance Criteria**:
- [x] AC1: `POST /api/admin/billing/generate` accepts body: `{ scope: 'all'|'building'|'hosteler', scope_id?: uuid, month: date }`
- [x] AC2: For scope='all': generates bills for all active hostelers with recorded food preferences or active room assignments in that month
- [x] AC3: For scope='building': generates bills for active hostelers in specified building_id
- [x] AC4: For scope='hosteler': generates bill for single hosteler_id
- [x] AC5: Each bill created via `calculateMonthlyBill()` and inserted with `status='generated'`
- [x] AC6: If bill already exists for (hosteler_id, month) with status='generated', replace it (delete old, insert new)
- [x] AC7: If bill exists with status='transmitted', create new bill with status='generated' (preserve transmitted bill separately)
- [x] AC8: Returns: `{ generated_count: int, bills: [ { hosteler_id, hosteler_name, room, total, status } ] }`
- [x] AC9: RLS enforces owner-only access

**Test Coverage Required**:
- API integration tests: Generate bills for all/building/hosteler scopes; verify bill records created with correct status
- Unit tests: Edge case handling (no hostelers, no preferences, regeneration behavior)
- Integration/component validation: Generate bills → verify they appear in generated state → regenerate → verify replaced

**Dependencies**: T115 (billing calculation logic), T114 (bills table)

**File Paths**:
- Routes: `src/app/api/admin/billing/generate/route.ts`
- Tests: `src/app/api/admin/billing/__tests__/generate.test.ts`

**Estimated Scope**: Medium

---

### T117 — Phase 22: API Route for Bill Transmission and Hosteler Bill Visibility

**User Story**: US18  
**Functional Requirements**: FR-092 (bill transmission and hosteler access)  
**Acceptance Criteria**:
- [x] AC1: `PATCH /api/admin/billing/bills/[id]` (owner) accepts body: `{ action: 'transmit' }`
- [x] AC2: Updates bill `status='transmitted'` and `transmitted_at=now()`
- [x] AC3: After transmission, bill is immediately visible to hosteler via `GET /api/hosteler/bills`
- [x] AC4: `GET /api/hosteler/bills?month=2026-07-01` returns only transmitted bills for authenticated hosteler
- [x] AC5: `GET /api/hosteler/bills/[id]` returns bill detail (room_rent_total, meal_charges breakdown, grand_total, per-day breakdown) if bill is transmitted and belongs to hosteler
- [x] AC6: Non-transmitted bills return 404 to hosteler even if bill exists
- [x] AC7: Owner sees all bills (any status) in `GET /api/admin/billing/bills`
- [x] AC8: RLS prevents cross-hosteler and cross-owner access

**Test Coverage Required**:
- API integration tests: Transmit bill → verify status changes and transmitted_at is set
- API integration tests: Hosteler cannot see generated bills; can see transmitted bills
- API integration tests: Owner can view all bills regardless of status
- Integration/component validation: Generate bill → verify hosteler doesn't see it → transmit → verify hosteler can see it

**Dependencies**: T116 (bill generation), T114 (bills table)

**File Paths**:
- Routes: `src/app/api/admin/billing/bills/[id]/route.ts`, `src/app/api/hosteler/bills/route.ts`, `src/app/api/hosteler/bills/[id]/route.ts`
- Tests: `src/app/api/admin/billing/__tests__/transmission.test.ts`, `src/app/api/hosteler/__tests__/bills.test.ts`

**Estimated Scope**: Medium

---

### T118 — Phase 22: Owner UI for Bill Generation, Review, and Transmission

**User Story**: US18  
**Functional Requirements**: FR-091, FR-092 (billing UI)  
**Acceptance Criteria**:
- [x] AC1: Owner billing page at `/admin/billing` displays month selector (date picker) and "Generate Bill" button
- [x] AC2: "Generate Bill" button opens dialog with scope selection: "All Hostelers" / "Specific Building" / "Individual Hosteler"
- [x] AC3: Dialog includes month picker; submission calls `POST /api/admin/billing/generate`
- [x] AC4: Bill list shows: Hosteler Name, Room, Total, Status ("Generated, Awaiting Transmission" or "Transmitted"), generated_at, transmitted_at
- [x] AC5: Owner can click bill row to view detail modal: room_rent_total, meal_charges (breakfast/lunch/dinner), grand_total, per-day breakdown table
- [x] AC6: Detail modal includes "Transmit Bill" button (enabled only if status='generated'); clicking calls `PATCH /api/admin/billing/bills/[id]` with action='transmit'
- [x] AC7: On transmission, modal closes and bill list is refreshed; bill status changes to "Transmitted"
- [x] AC8: Owner can regenerate bills for same month; new generated bills replace old (generated); transmitted bills are preserved
- [x] AC9: On 375 px mobile: month picker, scope selection, detail modal, and buttons are reachable; no horizontal overflow

**Test Coverage Required**:
- Component tests: Dialog rendering, form submission, bill list rendering, detail modal
- API integration tests: Form payloads call correct endpoints
- Integration/component validation: Generate bills → view detail → transmit → verify hosteler sees bill

**Dependencies**: T117 (bill APIs)

**File Paths**:
- Page: `src/app/admin/billing/page.tsx`
- Components: `src/components/billing/generate-bill-dialog.tsx`, `src/components/billing/bill-list.tsx`, `src/components/billing/bill-detail-modal.tsx`
- Tests: `src/components/billing/__tests__/billing-ui.test.tsx`

**Estimated Scope**: Medium

---

### T119 — Phase 22: Hosteler UI for Bill Viewing

**User Story**: US18  
**Functional Requirements**: FR-092 (hosteler bill viewing)  
**Acceptance Criteria**:
- [x] AC1: Hosteler dashboard includes "Bills" card or tab showing list of transmitted bills
- [x] AC2: Hosteler bill page at `/hosteler/bills` displays transmitted bills sorted by month (newest first)
- [x] AC3: Bill list card shows: Month, Total Amount, view link/button
- [x] AC4: Hosteler can click to view bill detail: month, room_rent_total, meal_charges (breakfast/lunch/dinner breakdown), grand_total, per-day cost breakdown
- [x] AC5: Bill detail view is read-only (no edit/delete options)
- [x] AC6: "No bills available" message if no transmitted bills yet
- [x] AC7: On 375 px mobile: bill list and detail are fully readable, no horizontal overflow, touch-friendly link/button sizing

**Test Coverage Required**:
- Component tests: Bill list rendering, detail view, empty state
- Integration/component validation: Hosteler views their transmitted bills after owner transmits

**Dependencies**: T117 (hosteler bill APIs)

**File Paths**:
- Page: `src/app/(hosteler)/bills/page.tsx`
- Components: `src/components/hosteler/bill-list.tsx`, `src/components/hosteler/bill-detail.tsx`
- Tests: `src/app/(hosteler)/bills/__tests__/page.test.tsx`

**Estimated Scope**: Small

---

### T119a — Phase 22: Owner Meal Entry Adjustment Modal (Single Date, Per-Hosteler)

**User Story**: US18  
**Functional Requirements**: FR-034a, FR-034b, FR-034c, FR-034d, FR-034e  
**Acceptance Criteria**:
- [x] AC1: Hosteler list page (`/admin/hostelers`) displays [Adjust Meals] button in the action column for each hosteler (next to [Meals ON] button)
- [x] AC2: Clicking [Adjust Meals] opens a modal dialog with title "Adjust Meals for [Hosteler Name]"
- [x] AC3: Modal includes a date picker (allowing any past or current date within the organization; no future dates allowed)
- [x] AC4: Owner selects a date and the modal displays existing meal entries for that date: Breakfast (Y/N), Lunch (Y/N), Dinner (Y/N) fetched from `food_preferences` table for that hosteler and date
- [x] AC5: Owner can toggle each meal (Breakfast, Lunch, Dinner) ON/OFF to change the entry
- [x] AC6: Modal includes a "Reason" textarea (required, non-empty) where owner explains why adjustment is being made
- [x] AC7: Owner clicks [Save] → calls `POST /api/admin/food-preferences/adjust` with body: `{ hosteler_id, date, meals: { breakfast: bool, lunch: bool, dinner: bool }, adjustment_reason }`
- [x] AC8: On successful save: modal closes, toast appears "Meal adjustment saved", hosteler list refreshes
- [x] AC9: On error: toast shows error message; modal remains open
- [x] AC10: If bill already exists and is transmitted for the month containing the adjusted date, display warning in modal: "Warning: Bill for [Month] already transmitted. Changes will only be visible after regenerating and retransmitting the bill."
- [x] AC11: On 375 px mobile: modal fits viewport without horizontal scroll; date picker is functional; meal toggles are touch-friendly; textarea scrollable
- [x] AC12: On successful adjustment, if bill exists and is transmitted for that month, automatically set bill status to "needs_retransmission"

**Test Coverage Required**:
- API integration tests: POST adjust endpoint accepts single date, persists breakfast/lunch/dinner toggles, validates reason is non-empty, rejects future dates
- API integration tests: Adjustment persists audit fields (adjusted_by_owner_id, adjusted_at, adjustment_reason)
- API integration tests: Bill status auto-updates to "needs_retransmission" if bill transmitted
- Component tests: Modal renders date picker, displays existing meal entries from API, toggles functional, reason textarea required
- Component tests: Success/error toast handling
- Component tests: Mobile layout at 375px
- Integration: Select date → existing meals display → toggle → save → bill flag updates

**Dependencies**: T115, T116, T117, T118

**File Paths**:
- API Route: `src/app/api/admin/food-preferences/adjust/route.ts` (NEW)
- Component: `src/components/hostelers/meal-adjustment-modal.tsx` (NEW)
- Modified: `src/app/admin/hostelers/page.tsx` (add [Adjust Meals] button + modal trigger)
- Tests: `src/app/api/admin/food-preferences/__tests__/adjust.test.ts`, `src/components/hostelers/__tests__/meal-adjustment-modal.test.tsx`

**Estimated Scope**: Small (single date, existing meals display, simple toggle + reason + save)

### T119b � Phase 22: UX Refinements for Bill Review and Bill Detail Density

**User Story**: US18  
**Functional Requirements**: FR-158, FR-159  
**Acceptance Criteria**:
- [x] AC1: Owner bill list supports status filter, hosteler search, and sticky month/scope context
- [x] AC2: Owner and hosteler bill details support collapsed/expanded breakdown mode
- [x] AC3: High-volume bill list remains navigable without losing active filter context

**Test Coverage Required**:
- Component tests: Filter/search persistence and compact/expanded detail rendering states

**Dependencies**: T118, T119

**File Paths**:
- Components: `src/components/billing/bill-list.tsx`, `src/components/billing/bill-detail-modal.tsx`, `src/components/hosteler/bill-detail.tsx`
- Tests: `src/components/billing/__tests__/billing-ui.test.tsx`, `src/app/(hosteler)/bills/__tests__/page.test.tsx`

**Estimated Scope**: Small

---

### T119c — Phase 22: Display Current Active Meal Rates Card on Settings Page

**User Story**: US18  
**Functional Requirements**: FR-160 (owner visibility of current rates)  
**Acceptance Criteria**:
- [x] AC1: Settings page displays new card titled "Currently Active Meal Rates" above the scheduling forms
- [x] AC2: Card shows effective_from date at the top (e.g., "Effective from: 2026-07-01")
- [x] AC3: Three-row layout displaying: Breakfast | ₹[rate] | effective_from, Lunch | ₹[rate] | effective_from, Dinner | ₹[rate] | effective_from
- [x] AC4: Card has muted/gray background styling to indicate read-only status
- [x] AC5: Lock icon or "View only" badge indicates content is not editable
- [x] AC6: Data sourced from existing `SettingsResponse.rates` returned by `GET /api/settings`
- [x] AC7: Card remains visible even if no pending changes exist
- [x] AC8: On 375 px mobile: card displays in single column (Meal Type | Current Rate) without horizontal overflow
- [x] AC9: On 768 px+ tablet: card displays in full three-column layout with clear spacing

**Test Coverage Required**:
- Component tests: Card renders with meal rates, effective_from date, read-only styling
- Component tests: Mobile and tablet layout rendering
- Integration tests: Verify rates data flows correctly from API to display

**Dependencies**: T115 (billing logic ensures current rates in SettingsResponse)

**File Paths**:
- Components: `src/components/settings/meal-rates-display.tsx`
- Tests: `src/components/settings/__tests__/meal-rates-display.test.tsx`

**Estimated Scope**: Small

---

### T119d — Phase 22: Display Current Active Room Rent Config Card on Settings Page

**User Story**: US18  
**Functional Requirements**: FR-160 (owner visibility of current room rent config)  
**Acceptance Criteria**:
- [x] AC1: Settings page displays new card titled "Current Room Rent Configuration" next to or below meal rates card
- [x] AC2: Card shows effective_from date at the top (e.g., "Effective from: 2026-07-01")
- [x] AC3: Table/grid layout showing columns: Room Type | Sharing Capacity | Current Rent | Effective From
- [x] AC4: Rows grouped by room type (AC, Non-AC) with sorted sharing capacities within each group
- [x] AC5: Displays most recent active configuration for each (room_class, sharing_capacity) combination (where effective_date ≤ today)
- [x] AC6: Card has muted/gray background styling to indicate read-only status
- [x] AC7: Fetches data from `GET /api/admin/room-rent-config`, filters for most recent active entries per combination, and displays
- [x] AC8: Card remains visible even if no pending changes exist
- [x] AC9: On 375 px mobile: table converts to vertically stacked card layout (one row per room configuration) without horizontal overflow
- [x] AC10: On 768 px+ tablet: full table visible with clear column headers and aligned data

**Test Coverage Required**:
- Component tests: Card renders with room rent configurations, grouped/sorted correctly
- Component tests: Mobile and tablet layout rendering; horizontal scroll prevention
- Integration tests: Verify room-rent-config API data flows correctly and filters active entries
- Unit tests: Active entry filtering logic (effective_date ≤ today)

**Dependencies**: T115 (room rent lookups), T116 (billing needs this query logic)

**File Paths**:
- Components: `src/components/settings/room-rent-config-display.tsx`
- Utility: `src/lib/room-rent-config-parser.ts` (filter active entries)
- Tests: `src/components/settings/__tests__/room-rent-config-display.test.tsx`, `src/lib/__tests__/room-rent-config-parser.test.ts`

**Estimated Scope**: Small

---

### T119e — Phase 22: Display Upcoming Scheduled Rate Changes on Settings Page

**User Story**: US18  
**Functional Requirements**: FR-160 (owner visibility of upcoming rate changes)  
**Acceptance Criteria**:
- [x] AC1: Settings page displays new section titled "Upcoming Scheduled Changes" below the current rates cards
- [x] AC2: Section displays all upcoming meal rate changes (breakfast/lunch/dinner with new rate and effective date)
- [x] AC3: Section displays all upcoming room rent configuration changes (room type, sharing capacity, new rent, effective date)
- [x] AC4: Changes are sorted chronologically by effective date (nearest date first)
- [x] AC5: Only displays changes where effective_date > today AND canceled_at IS NULL (excludes already-active and canceled changes)
- [x] AC6: Empty state shows "No upcoming changes scheduled" when no future changes exist
- [x] AC7: Each change includes: Type | Current Rate → New Rate | Effective Date | "Cancel" button
- [x] AC8: Multiple changes for the same type are displayed if they have different effective dates (e.g., Breakfast on July 20 AND August 1)
- [x] AC9: Color coding: amber/warning color for changes effective within 7 days, normal color for further dates
- [x] AC10: Fetches data from two sources (filters for future dates only, excludes canceled records):
  - `GET /api/admin/meal-rates` → filters to rows where effective_date > today AND canceled_at IS NULL
  - `GET /api/admin/room-rent-config` → filters to rows where effective_date > today AND canceled_at IS NULL
- [x] AC11: **[NEW] Owner can click "Cancel" button on any upcoming change**
- [x] AC12: **[NEW] Cancel action shows confirmation dialog: "Cancel this change? [Change details] This cannot be undone."**
- [x] AC13: **[NEW] On confirm, sends DELETE request to cancel the scheduled change (soft-delete via canceled_at timestamp)**
- [x] AC14: **[NEW] After cancel, change disappears from upcoming list immediately without page reload**
- [x] AC15: **[NEW] On cancel error, show toast: "Failed to cancel change. Please try again."**
- [x] AC16: On 375 px mobile: vertical stack of individual change cards (one per change) without horizontal overflow, "Cancel" button inline or stacked
- [x] AC17: On 768 px+ tablet: two-column layout (meal changes | room rent changes) or single consolidated table with clear separation by type, "Cancel" buttons aligned
- [x] AC18: Section remains visible even if no upcoming changes exist

**Test Coverage Required**:
- Component tests: Upcoming changes render with correct formatting, sorting by date, color coding, multiple changes per type
- Component tests: Mobile and tablet layout rendering; empty state display
- Component tests: Within-7-days warning styling applied correctly
- Component tests: "Cancel" button interaction, confirmation dialog, success/error toast display
- API integration tests: Verify pending filter returns only future-dated, non-canceled changes
- API integration tests: DELETE endpoints soft-delete (update canceled_at) without removing records
- Unit tests: Date comparison and sorting logic for upcoming changes

**New API Endpoints Required**:
- `DELETE /api/admin/meal-rates/change/[id]` — Soft-delete meal rate change (set canceled_at = now)
- `DELETE /api/admin/room-rent-config/change/[id]` — Soft-delete room rent change (set canceled_at = now)

**Database Schema Changes**:
- `meal_rate_rate_history` table: Add `canceled_at TIMESTAMP WITH TIME ZONE` (nullable, NULL = active)
- `room_rent_config_history` table: Add `canceled_at TIMESTAMP WITH TIME ZONE` (nullable, NULL = active)

**Edge Cases Handled**:
- Owner cancels breakfast for July 20 → it's immediately removed from upcoming list
- Owner cancels change then refreshes page → still gone
- Multiple changes: cancel one (Aug 1) but keep another (July 20) → only canceled one is gone
- Cannot cancel a change that already went into effect (should show as current rate instead)
- Canceling a change during peak season doesn't affect active rates (only affects future)

**Dependencies**: T119c, T119d (current rates cards), T115 (meal rates API), T116 (room rent API)

**File Paths**:
- Components: `src/components/settings/upcoming-changes-card.tsx`
- API routes: `src/app/api/admin/meal-rates/change/[id]/route.ts` (DELETE), `src/app/api/admin/room-rent-config/change/[id]/route.ts` (DELETE)
- Tests: `src/components/settings/__tests__/upcoming-changes-card.test.tsx`, `src/app/api/admin/meal-rates/__tests__/change-cancel.test.ts`, `src/app/api/admin/room-rent-config/__tests__/change-cancel.test.ts`
- Migrations: Update `supabase/migrations/007_rate_history_tables.sql` to add `canceled_at` columns

**Estimated Scope**: Small → **Medium** (due to delete API + UI interaction + schema update)

---

### T119f — Phase 22: Settings UX for Bulk Meal Update (Mess Closure / Holiday)

**User Story**: US18  
**Functional Requirements**: FR-034f, FR-034g (bulk owner adjustment workflow)  
**Acceptance Criteria**:
- [x] AC1: Settings page (`/admin/settings`) shows a compact summary card only (title, brief description, "Open Bulk Update" button, last-run/empty summary) and does not render full bulk form by default.
- [x] AC2: Clicking "Open Bulk Update" launches on-demand workflow: drawer on tablet/desktop and full-screen sheet on mobile.
- [x] AC3: Workflow uses 4-step guided wizard: Scope → Date → Meals → Preview & Confirm, with visible step indicator and sticky footer actions (Back/Next/Cancel).
- [x] AC4: Scope step supports `All Active Hostelers` (default) and `Specific Building`; building selector appears only when `Specific Building` is chosen.
- [x] AC5: Date step supports `Single Date` and `Date Range`; end date appears only for range mode; invalid ranges show inline validation.
- [x] AC6: Meals step supports template selector `Full Closure (B/L/D OFF)` and `Custom Meal Availability`; custom toggles appear only in custom mode.
- [x] AC7: Preview step loads impact on demand (`Preview Impact`) and shows: total hostelers affected, total date rows affected, sample current B/L/D → new B/L/D changes.
- [x] AC8: Preview step shows transmitted-bill warning banner only when impacted months contain transmitted bills; hidden otherwise.
- [x] AC9: "Apply Bulk Update" opens confirmation modal requiring non-empty reason textarea before final submit.
- [x] AC10: On confirm, UI calls `POST /api/admin/food-preferences/adjust/bulk` with `{ scope, building_id?, date_mode, start_date, end_date?, meals, adjustment_reason }`; success toast includes impacted counts.
- [x] AC11: After success, recent bulk events list (latest 10) is visible via collapsible section in the on-demand workflow, not always expanded on settings page.
- [x] AC12: Unsaved-close protection: if user attempts to close drawer/sheet with unsaved inputs, show confirm dialog (`Discard changes?`).
- [x] AC13: Responsive behavior: on 375 px mobile use full-screen wizard with no horizontal overflow; on 768 px+ use drawer with two-pane preview layout in Step 4.

**Test Coverage Required**:
- Component tests: Summary-card-only default render and on-demand open behavior (drawer/sheet)
- Component tests: Stepper navigation, progressive-disclosure rules (building/date-range/custom toggles), unsaved-close guard
- Component tests: Preview Impact card, transmitted-bill warning visibility, confirmation modal reason-required enforcement
- Component tests: Mobile (375px) full-screen wizard and tablet (768px+) drawer two-pane preview rendering
- API integration tests: Bulk endpoint updates only targeted hostelers/dates and persists audit metadata
- API integration tests: Bulk endpoint handles partial failure reporting and keeps successful updates committed
- API integration tests: Transmitted bill status transitions to `needs_retransmission` for impacted months
- Integration: Apply `Full Closure` for a date range → verify food preferences updated for all targeted hostelers → verify retransmission warning/flag behavior

**Dependencies**: T115, T116, T117, T118, T119a

**File Paths**:
- Components: `src/components/settings/bulk-meal-update-trigger-card.tsx` (NEW), `src/components/settings/bulk-meal-update-panel.tsx`, `src/components/settings/bulk-update-preview-modal.tsx`
- API Routes: `src/app/api/admin/food-preferences/adjust/bulk/route.ts` (NEW)
- Modified: `src/app/admin/settings/page.tsx` (add trigger card and on-demand workflow wiring)
- Tests: `src/components/settings/__tests__/bulk-meal-update-panel.test.tsx`, `src/app/api/admin/food-preferences/__tests__/adjust-bulk.test.ts`

**Estimated Scope**: Medium

---

**Phase 22 Task Status**:
- [x] T114 complete
- [x] T115 complete
- [x] T116 complete
- [x] T117 complete
- [x] T118 complete
- [x] T119 complete
- [x] T119a complete
- [x] T119b complete
- [x] T119c complete
- [x] T119d complete
- [x] T119e complete
- [x] T119f complete

**Phase 22 Completion Summary**:
- [x] Billing generation, review, and transmission flow is implemented
- [x] Hosteler bill visibility is gated by transmitted status
- [x] Owner meal adjustment and bulk adjustment flows are implemented
- [x] Retransmission signaling support is included for impacted transmitted bills

---

**Goal**: Track hostel staff with salary history and effective-date support

**Acceptance Criteria** (Phase-level):
- [ ] Owner can add employees with name, job description, initial salary
- [ ] Owner can update employee salary with effective dates
- [ ] "Salary will be updated on [date]" labels display until effective date
- [ ] Salary history is queryable for profit margin calculations
- [ ] Multiple salary changes per employee are tracked chronologically

---

### T120 — Phase 23: Database Migrations for Employee and Salary History Tables

**User Story**: US19  
**Functional Requirements**: FR-093, FR-094  
**Acceptance Criteria**:
- [ ] AC1: Migration creates `employees` table with columns: `id`, `owner_id` (FK), `name`, `job_description`, `current_salary`, `active` (boolean, default true), `created_at`, `updated_at`
- [ ] AC2: Migration creates `employee_salary_history` table with columns: `id`, `employee_id` (FK), `old_salary`, `new_salary`, `effective_date`, `created_by` (FK to owner), `created_at`, and unique constraint on `(employee_id, effective_date)`
- [ ] AC3: Indexes on `owner_id`, `employee_id`, `effective_date` for efficient queries
- [ ] AC4: `employee_salary_history` is immutable (no UPDATE/DELETE)
- [ ] AC5: RLS enforces owner-only access
- [ ] AC6: Migration is idempotent

**Test Coverage Required**:
- Unit tests: Schema structure, immutability enforcement
- Integration tests: Constraints and indexes work correctly

**Dependencies**: T100 (foundational schema)

**File Paths**:
- Migration: `supabase/migrations/XXX_add_employee_salary_tables.sql`

**Estimated Scope**: Small

---

### T121 — Phase 23: API Routes for Employee Management (CRUD)

**User Story**: US19  
**Functional Requirements**: FR-093 (employee CRUD)  
**Acceptance Criteria**:
- [ ] AC1: `POST /api/admin/employees` creates new employee; body: `{ name, job_description, salary }` → returns `{ id, name, job_description, current_salary }`
- [ ] AC2: `GET /api/admin/employees` lists all active employees for owner with current salary and any pending salary changes
- [ ] AC3: `GET /api/admin/employees/[id]` returns single employee detail including salary history (chronological list)
- [ ] AC4: `PATCH /api/admin/employees/[id]` updates name and/or job_description
- [ ] AC5: `DELETE /api/admin/employees/[id]` soft-deletes (sets `active=false`); employee record remains for historical salary lookups
- [ ] AC6: RLS prevents cross-owner access
- [ ] AC7: Validation: name and job_description are non-empty, salary is > 0

**Test Coverage Required**:
- Unit tests: Input validation, employee state transitions
- API integration tests: CRUD workflow; soft deletion preserves salary history
- Component tests (Phase 23 UI): Form rendering and submission

**Dependencies**: T120 (employee schema)

**File Paths**:
- Routes: `src/app/api/admin/employees/route.ts`, `src/app/api/admin/employees/[id]/route.ts`
- Tests: `src/app/api/admin/employees/__tests__/route.test.ts`

**Estimated Scope**: Small

---

### T122 — Phase 23: API Route for Salary Changes and Historical Lookups

**User Story**: US19  
**Functional Requirements**: FR-094 (salary change with effective date and historical lookup)  
**Acceptance Criteria**:
- [ ] AC1: `POST /api/admin/employees/[id]/salary-change` accepts body: `{ new_salary: decimal, effective_date: date }`
- [ ] AC2: Creates `employee_salary_history` record with `old_salary` = current salary, `new_salary`, `effective_date`, `created_by` = owner
- [ ] AC3: Until effective date, employee list shows "Salary will be updated to ₹[new] on [date]"
- [ ] AC4: On effective date, queries return new salary as current
- [ ] AC5: Endpoint `GET /api/billing/employee-salary?employee_id=[id]&date=[date]` returns salary effective on that date (for profit dashboard)
- [ ] AC6: Validation: new_salary > 0, effective_date not in past (can be today or future), supports past/current/future months
- [ ] AC7: Supports multiple salary changes per employee with correct precedence (latest effective date ≤ lookup date)

**Test Coverage Required**:
- Unit tests: Date validation, salary lookup logic, effective-date boundary testing
- API integration tests: Create salary change, verify pending label, verify lookup returns correct historical salary
- Integration/component validation: Set future salary change → verify label → verify profit dashboard uses historical salary for past periods

**Dependencies**: T121 (employee CRUD)

**File Paths**:
- Routes: `src/app/api/admin/employees/[id]/salary-change/route.ts`, `src/app/api/billing/employee-salary/route.ts`
- Tests: `src/app/api/admin/employees/__tests__/salary-change.test.ts`

**Estimated Scope**: Small

---

### T123 — Phase 23: Owner UI for Employee Management

**User Story**: US19  
**Functional Requirements**: FR-093, FR-094 (employee UI)  
**Acceptance Criteria**:
- [ ] AC1: Owner settings/admin page includes "Employees" section accessible via `/admin/employees` or within `/admin/settings`
- [x] AC2: Employee list displays: Name, Job Description, Current Salary, Pending Salary Changes (if any), and action buttons (Edit, Update Salary, Delete)
- [x] AC3: "Add Employee" button opens form with fields: name, job_description, initial salary → submission calls `POST /api/admin/employees`
- [x] AC4: "Edit" opens form to update name/job_description → calls `PATCH /api/admin/employees/[id]`
- [ ] AC5: "Update Salary" button opens modal with date picker and new salary input → calls `POST /api/admin/employees/[id]/salary-change`
- [ ] AC6: Pending salary changes displayed as: "Salary will be updated to ₹[new] on [date]"
- [ ] AC7: "Delete" soft-deletes employee; confirmation dialog warns "Past salary records will be preserved for billing calculations"
- [ ] AC8: Form validation: non-empty fields, decimal salary, future/current date for salary changes
- [ ] AC9: On 375 px mobile: list items are readable, forms and buttons are reachable, no horizontal overflow

**Test Coverage Required**:
- Component tests: Employee list rendering, form submission, pending-change label display
- API integration tests: Forms call correct endpoints
- Integration/component validation: Add employee → set salary change → verify label displays → verify employee is queryable for profit dashboard

**Dependencies**: T122 (salary change API)

**File Paths**:
- Page: `src/app/admin/employees/page.tsx` or extend `/admin/settings`
- Components: `src/components/employees/employee-list.tsx`, `src/components/employees/add-employee-form.tsx`, `src/components/employees/salary-change-form.tsx`
- Tests: `src/components/employees/__tests__/employee-management.test.tsx`

**Estimated Scope**: Small

### T123a � Phase 23: UX Refinements for Employee Search and Pending Salary Visibility

**User Story**: US19  
**Functional Requirements**: FR-160  
**Acceptance Criteria**:
- [ ] AC1: Employee list supports search/filter for name and role fields
- [ ] AC2: Pending salary updates are shown as clear chips/badges with effective date
- [ ] AC3: Employee list remains tablet-optimized and touch-friendly

**Test Coverage Required**:
- Component tests: Search/filter behavior and pending-chip rendering

**Dependencies**: T123

**File Paths**:
- Components: `src/components/employees/employee-list.tsx`
- Tests: `src/components/employees/__tests__/employee-management.test.tsx`

**Estimated Scope**: Small

---



**Goal**: Owner visibility into financial performance and cot occupancy

**Acceptance Criteria** (Phase-level):
- [ ] Owner can view profit dashboard for any selected month
- [ ] Dashboard shows income (room rent + meal charges), expenses (salaries + line items), and calculated profit
- [ ] Income and expenses use historical rates effective for that month (not current rates)
- [ ] Owner can add one-time line-item expenses
- [ ] Owner can view cot occupancy dashboard showing all buildings, rooms, and cot status (occupied/free)
- [ ] Cot dashboard updates when hostelers are assigned/unassigned

---

### T124 — Phase 24: Database Migration for Line-Item Expenses Table

**User Story**: US20  
**Functional Requirements**: FR-095  
**Acceptance Criteria**:
- [ ] AC1: Migration creates `line_item_expenses` table with columns: `id`, `owner_id` (FK), `month` (date, first day), `description`, `amount`, `expense_date` (date, nullable, within month), `created_at`, `updated_at`
- [x] AC2: No unique constraint (multiple expenses per month allowed)
- [x] AC3: Indexes on `owner_id`, `month` for efficient dashboard queries
- [x] AC4: RLS enforces owner-only access
- [ ] AC5: Migration is idempotent

**Test Coverage Required**:
- Unit tests: Schema structure
- Integration tests: Multiple expenses per month work correctly

**Dependencies**: T100 (foundational schema)

**File Paths**:
- Migration: `supabase/migrations/XXX_add_line_item_expenses_table.sql`

**Estimated Scope**: Small

---

### T125 — Phase 24: Profit Dashboard Calculation Logic (Income, Expenses, Profit)

**User Story**: US20  
**Functional Requirements**: FR-095 (profit calculation with historical rates)  
**Acceptance Criteria**:
- [ ] AC1: Function `calculateProfitDashboard(owner_id, month)` returns: `{ income: { room_rent, meal_charges, total }, expenses: { salaries, line_items, total }, profit }`
- [x] AC2: Income calculation: aggregates room rent + meal charges for all active hostelers with billable history in that month
  - Uses historical room rent effective for each day (via `GET /api/billing/room-rent?room_id=[id]&date=[date]`)
  - Uses historical meal rates effective for each day (via `GET /api/billing/meal-rate?meal_type=[type]&date=[date]`)
  - Counts food preferences for each meal type for each day
  - Excludes canceled preferences (canceled_at IS NOT NULL)
  - Excludes meal charges for hostelers NOT availing mess
- [x] AC3: Expense calculation: sums employee salaries (using historical salary effective for each day via `GET /api/billing/employee-salary?employee_id=[id]&date=[date]`) + line-item expenses for that month
- [x] AC4: Profit = Income Total − Expenses Total
- [ ] AC5: Breakdown details available: per-hosteler room rent, per-meal-type charges, per-employee salary
- [ ] AC6: Function is testable in isolation; no side effects
- [ ] AC7: Handles edge cases: month with no hostelers, no employees, no rate changes

**Test Coverage Required**:
- Unit tests: Income calculation with various hosteler/rate/preference scenarios
- Unit tests: Expense calculation with salary changes within month
- Unit tests: Profit formula verification
- Unit tests: Breakdown detail accuracy
- Integration tests: Seeded month with specific hostelers, rates, meals, employees → calculate dashboard → verify totals and breakdowns

**Dependencies**: T115 (billing calculation), T122 (salary history), T108 (meal rate history), T124 (line-item expenses)

**File Paths**:
- Utility: `src/lib/profit-dashboard.ts` or extend `src/lib/billing.ts`
- Tests: `src/lib/__tests__/profit-dashboard.test.ts`

**Estimated Scope**: Medium

---

### T126 — Phase 24: API Route for Profit Dashboard and Expense Management

**User Story**: US20  
**Functional Requirements**: FR-095 (profit dashboard API)  
**Acceptance Criteria**:
- [ ] AC1: `GET /api/admin/profit-dashboard?month=2026-07-01` calculates and returns full dashboard: income breakdown, expenses breakdown, profit, pending breakdowns
- [x] AC2: `POST /api/admin/profit-dashboard/expenses` adds line-item expense; body: `{ description, amount, expense_date?, month }`
- [x] AC3: `GET /api/admin/profit-dashboard/breakdown?month=[date]&type=income|expenses|rooms|meals|salaries` returns detailed breakdown for drilling down
- [x] AC4: `DELETE /api/admin/expenses/[id]` removes line-item expense; dashboard recalculates automatically
- [ ] AC5: Month parameter accepts any date (not just first of month); queries convert to first-of-month range
- [ ] AC6: RLS prevents cross-owner dashboard access
- [ ] AC7: Responses include: income/expense/profit totals, itemized breakdowns, pending changes (future rate/salary changes)

**Test Coverage Required**:
- API integration tests: GET dashboard for various months with different data; verify calculations
- API integration tests: POST/DELETE expense; verify dashboard recalculates
- API integration tests: Breakdown queries return correct itemized data
- Unit tests: Month parameter parsing (handles any date → first-of-month range)

**Dependencies**: T125 (profit calculation logic), T124 (line-item expenses)

**File Paths**:
- Routes: `src/app/api/admin/profit-dashboard/route.ts`, `src/app/api/admin/profit-dashboard/expenses/route.ts`, `src/app/api/admin/profit-dashboard/breakdown/route.ts`, `src/app/api/admin/expenses/[id]/route.ts`
- Tests: `src/app/api/admin/profit-dashboard/__tests__/route.test.ts`

**Estimated Scope**: Medium

---

### T127 — Phase 24: Owner UI for Profit Dashboard

**User Story**: US20  
**Functional Requirements**: FR-095 (profit dashboard UI)  
**Acceptance Criteria**:
- [ ] AC1: Owner page at `/admin/profit-dashboard` with month selector (date picker, defaults to current month)
- [x] AC2: Dashboard displays three cards: Income, Expenses, Profit (with values and ± comparison to previous month if applicable)
- [x] AC3: Income card shows: total, room rent subtotal, meal charges subtotal (with breakfast/lunch/dinner breakdown on click/expand)
- [x] AC4: Expenses card shows: total, employee salaries subtotal, line-item expenses subtotal
- [ ] AC5: Line-item expenses section includes: list of current month's expenses, "Add Expense" button, and delete buttons per expense
- [ ] AC6: "Add Expense" button opens modal/form with fields: description, amount, optional date-within-month → submission calls `POST /api/admin/profit-dashboard/expenses`
- [ ] AC7: Clicking on income or expenses card expands detailed breakdown: per-hosteler rooms, per-meal breakdown, per-employee salaries
- [ ] AC8: Breakdown detail includes dates/effective-date information (e.g., "Room rent changed from ₹[old] to ₹[new] on [date]")
- [ ] AC9: Month selector triggers dashboard refresh; loading state displayed during calculation
- [ ] AC10: On 375 px mobile: cards are stacked vertically, all numbers are readable, buttons and form inputs are reachable, no horizontal overflow

**Test Coverage Required**:
- Component tests: Month selector, card rendering, breakdown expansion, form validation
- API integration tests: Form calls correct endpoints; dashboard refreshes on month change and after expense add/delete
- Integration/component validation: Load dashboard for specific month → verify calculations → add expense → verify profit recalculates

**Dependencies**: T126 (profit dashboard APIs)

**File Paths**:
- Page: `src/app/admin/profit-dashboard/page.tsx`
- Components: `src/components/profit-dashboard/dashboard-cards.tsx`, `src/components/profit-dashboard/add-expense-modal.tsx`, `src/components/profit-dashboard/breakdown-detail.tsx`
- Tests: `src/components/profit-dashboard/__tests__/profit-dashboard.test.tsx`

**Estimated Scope**: Medium

---

### T128 — Phase 24: API Route for Cot Availability Dashboard

**User Story**: US21  
**Functional Requirements**: FR-096 (cot availability query)  
**Acceptance Criteria**:
- [ ] AC1: `GET /api/admin/cots/availability` returns hierarchical view: buildings → rooms → cots with occupancy status
- [x] AC2: Response structure: `{ buildings: [ { id, name, rooms: [ { id, room_number, floor, room_type, cots: [ { id, cot_id_label, cot_type, occupancy: 'occupied'|'free', hosteler_name?, hosteler_room?, hosteler_id? } ] } ] } ] }`
- [x] AC3: For occupied cots: includes hosteler_name, hosteler_room, hosteler_id
- [x] AC4: For free cots: occupancy='free', no hosteler fields
- [ ] AC5: Cots belong to rooms; rooms belong to buildings; building hierarchy is fully expandable
- [ ] AC6: Cots are ordered by cot_id_label within room
- [ ] AC7: RLS prevents cross-owner access
- [ ] AC8: Query is efficient (single call returns full tree; no cascading queries)

**Test Coverage Required**:
- API integration tests: Query returns correct hierarchical structure with accurate occupancy status
- Integration tests: Assign hosteler to cot → query → verify occupancy updates; unassign → verify cot is free again
- Integration/component validation: Navigate cot dashboard → verify hierarchy and occupancy accuracy

**Dependencies**: T103 (cot assignment logic from Phase 19)

**File Paths**:
- Routes: `src/app/api/admin/cots/availability/route.ts`
- Tests: `src/app/api/admin/cots/__tests__/availability.test.ts`

**Estimated Scope**: Small

---

### T129 — Phase 24: Owner UI for Available Cot Dashboard

**User Story**: US21  
**Functional Requirements**: FR-096 (cot dashboard UI)  
**Acceptance Criteria**:
- [ ] AC1: Owner page at `/admin/available-cots` displaying hierarchical building/room/cot view
- [x] AC2: Page displays buildings as collapsible sections; clicking expands to show rooms and cots
- [x] AC3: Room rows show: Room Number, Floor (if applicable), Room Type, and Cot Count
- [x] AC4: Cot rows display: Cot Label (e.g., "Lower-1", "Upper-2"), Cot Type, Occupancy Status (Occupied/Free), and Hosteler Name (if occupied)
- [ ] AC5: Visual distinction between occupied and free cots (e.g., color coding, icons)
- [ ] AC6: Clicking on occupied cot shows: Hosteler name, Phone, Room assignment, assignment date (optional)
- [ ] AC7: Clicking on free cot shows: Assign option (link to quick-assign modal or to hosteler registration flow)
- [ ] AC8: Dashboard refreshes automatically or with manual "Refresh" button; shows real-time occupancy changes
- [ ] AC9: Search/filter capability (optional): filter by building, room status, or hosteler name
- [ ] AC10: On 375 px mobile: hierarchical tree is readable with appropriate expand/collapse controls, cot status is clearly visible, no horizontal overflow

**Test Coverage Required**:
- Component tests: Tree rendering, expand/collapse, occupancy status display, modal/assignment flow
- API integration tests: Cot availability endpoint called and response rendered correctly
- Integration/component validation: Assign hosteler → refresh dashboard → verify cot is marked occupied with hosteler name; deactivate hosteler → verify cot freed

**Dependencies**: T128 (cot availability API)

**File Paths**:
- Page: `src/app/admin/available-cots/page.tsx`
- Components: `src/components/cots/cot-availability-tree.tsx`, `src/components/cots/cot-card.tsx`, `src/components/cots/occupied-cot-detail.tsx`
- Tests: `src/components/cots/__tests__/cot-availability-tree.test.tsx`

**Estimated Scope**: Medium

---

### T130 — Phase 24: Integration Validation for Profit Dashboard and Cot Occupancy

**User Story**: US20, US21  
**Functional Requirements**: FR-095, FR-096 (integration/component validation)  
**Acceptance Criteria**:
- [ ] AC1: Integration validation scenario: Seed month with buildings, rooms, hostelers (assigned to cots), employees with salaries, food preferences, rate/salary changes
- [x] AC2: Test steps:
  1. Navigate to profit dashboard for that month
  2. Verify income calculation (room rent + meal charges) matches expected values
  3. Verify expense calculation (salaries + line items) matches expected values
  4. Verify profit = income − expenses
  5. Add line-item expense → verify profit recalculates immediately
  6. Verify breakdown details show correct itemized amounts
  7. Navigate to cot availability dashboard
  8. Verify building/room/cot hierarchy displays correctly
  9. Verify occupancy status matches assignments
  10. Deactivate a hosteler → refresh cot dashboard → verify their cots are now free
- [x] AC3: Test validates month-aware rate/salary lookups (past month should use historical rates, not current)
- [x] AC4: Test validates profit calculation handles mid-month rate changes correctly (per-day prorating)
- [ ] AC5: Test captures screenshot/video evidence for month-specific profit accuracy and real-time cot status updates

**Test Coverage Required**:
- Integration/component validation: Full workflow from data setup through dashboard verification
- Test isolation: Each integration test uses seeded/unique data; cleanup after test

**Dependencies**: T127 (profit dashboard UI), T129 (cot dashboard UI)

**File Paths**:
- Tests: `src/app/admin/__tests__/us20-us21-dashboards.integration.test.ts`

**Estimated Scope**: Medium

### T130a � Phase 24: UX Refinements for Dashboard State Handling and Progressive Disclosure

**User Story**: US20, US21  
**Functional Requirements**: FR-161  
**Acceptance Criteria**:
- [ ] AC1: Profit and available-cot dashboards display explicit loading, empty, and error states with retry action
- [x] AC2: Large breakdown sections are collapsed by default and expandable on demand
- [x] AC3: State transitions (loading -> data, loading -> empty, loading -> error) are deterministic and test-covered

**Test Coverage Required**:
- Component tests: State rendering matrix and expand/collapse behavior

**Dependencies**: T127, T129

**File Paths**:
- Components: `src/components/profit-dashboard/dashboard-cards.tsx`, `src/components/profit-dashboard/breakdown-detail.tsx`, `src/components/cots/cot-availability-tree.tsx`
- Tests: `src/components/profit-dashboard/__tests__/profit-dashboard.test.tsx`, `src/components/cots/__tests__/cot-availability-tree.test.tsx`

**Estimated Scope**: Small

---



**Goal**: Move building/room/cot assignment out of hosteler registration into a dedicated owner page for assign/reassign operations.

**Acceptance Criteria** (Phase-level):
- [x] Owner can assign building -> room -> cot for an existing hosteler from a dedicated page
- [x] Owner can reassign a hosteler to a different room/cot
- [x] Reassignment atomically releases old cot and assigns new cot
- [x] Occupied-cot assignment attempts are blocked with clear feedback
- [x] Hosteler can remain unassigned until owner explicitly assigns accommodation

---

### T131 � Phase 26: API Routes for Hosteler Accommodation Assignment

**User Story**: US22  
**Functional Requirements**: FR-173, FR-174, FR-175  
**Acceptance Criteria**:
- [x] AC1: Add assign/reassign endpoint for existing hosteler with payload `{ hosteler_id, building_id, room_id, cot_id }`
- [x] AC2: Reassignment flow atomically clears previous cot assignment and assigns target cot
- [x] AC3: Assignment to occupied cot returns validation error
- [x] AC4: Unassign endpoint supports returning hosteler to unassigned state

**Test Coverage Required**:
- [x] API integration tests for assign, reassign, occupied-cot rejection, and unassign

**Dependencies**: Phase 19 APIs

**File Paths**:
- [x] Routes: `src/app/api/admin/hostelers/[id]/accommodation/route.ts`
- [x] Tests: `src/app/api/admin/hostelers/__tests__/accommodation-route.test.ts`

**Estimated Scope**: Medium

---

### T132 � Phase 26: Owner UI Page for Accommodation Assignment/Reassignment

**User Story**: US22  
**Functional Requirements**: FR-173, FR-174  
**Acceptance Criteria**:
- [x] AC1: New owner page lists hostelers with assignment status (assigned/unassigned)
- [x] AC2: Page provides cascading selectors for building -> room -> cot and assign/reassign action
- [x] AC3: Reassignment confirmation explains old cot release and new cot assignment
- [x] AC4: UI shows clear error when selected cot is occupied

**Test Coverage Required**:
- [x] Component tests for selector cascade and assign/reassign flows

**Dependencies**: T131

**File Paths**:
- [x] Page: `src/app/admin/hostelers/accommodation/page.tsx`
- [x] Components: `src/components/hostelers/accommodation-assignment-panel.tsx`
- [x] Tests: `src/components/hostelers/__tests__/accommodation-assignment-panel.test.tsx`

**Estimated Scope**: Medium

---

### T133 � Phase 26: Remove Registration-Time Assignment Dependencies

**User Story**: US22  
**Functional Requirements**: FR-172, FR-175  
**Acceptance Criteria**:
- [x] AC1: Add Hosteler form requires only identity fields and no accommodation fields
- [x] AC2: Registration success no longer depends on cot availability
- [x] AC3: Hosteler list clearly indicates unassigned state until accommodation assignment occurs

**Test Coverage Required**:
- [x] Component/API tests for identity-only registration and unassigned-state rendering

**Dependencies**: T105k, T132

**File Paths**:
- [x] Components: `src/app/admin/hostelers/page.tsx`, `src/components/hostelers/add-hosteler-form.tsx`
- [x] Tests: `src/app/admin/hostelers/__tests__/page.test.tsx`

**Estimated Scope**: Small

---

## Summary

### Task Count by Phase

| Phase | Story | Tasks | Estimated Scope |
|-------|-------|-------|-----------------|
| 19 | US14 | T100–T105 (6 tasks) | 1 Small, 2 Small, 1 Medium, 1 Medium, 1 Small = Medium total |
| 20 | US15, US16 | T106–T110 (5 tasks) | 1 Small, 1 Small, 1 Medium, 1 Medium, 1 Small = Medium total |
| 21 | US17 | T111–T113 (3 tasks) | 1 Small, 1 Small, 1 Small = Small total |
| 22 | US18 | T114–T119e (8 tasks) | 1 Small, 1 Medium, 1 Medium, 1 Medium, 1 Medium, 1 Small, 1 Medium, 1 Small = Large total |
| 23 | US19 | T120–T123 (4 tasks) | 1 Small, 1 Small, 1 Small, 1 Small = Small total |
| 24 | US20, US21 | T124–T130 (7 tasks) | 1 Small, 1 Medium, 1 Medium, 1 Small, 1 Medium, 1 Medium, 1 Medium = Medium–Large total |

**Total**: 32 tasks across 6 phases (Phases 19–24)

### Dependency Chain

```
Phase 19 (US14) — Building/Room/Cot Infrastructure
└── T100: Database migrations
    └── T101: Building CRUD API
        └── T102: Room/RoomType CRUD API
            └── T103: Cot/Assignment API
                └── T104: Owner UI (Building/Room/Cot)
                    └── T105: Hosteler Registration Integration

Phase 20 (US15, US16) — Rate History Tracking (depends on Phase 19)
└── T106: Rate History Database
    └── T107: Room Rent Change API
    └── T108: Meal Rate Change API
        └── T109: Owner UI (Rate Changes)
        └── T110: Unit Tests (Historical Lookups)

Phase 21 (US17) — Mess Facility (can run parallel to 19/20)
└── T111: Database Schema (availing_mess column)
    └── T112: Food Preference Default Logic
        └── T113: Owner UI (Mess Facility Toggle)

Phase 22 (US18) — Billing (depends on Phase 20)
└── T114: Bills Database
    └── T115: Billing Calculation Logic
        └── T116: Bill Generation API
            └── T117: Bill Transmission API
                └── T118: Owner Billing UI
                └── T119: Hosteler Bill UI
                └── T119a: Owner Food Entry Adjustments (Current Month)

Phase 23 (US19) — Employee Management (independent)
└── T120: Employee Database
    └── T121: Employee CRUD API
        └── T122: Salary Change API
            └── T123: Owner UI (Employee Management)

Phase 24 (US20, US21) — Dashboards (depends on 20, 22, 23)
└── T124: Line-Item Expenses Database
    └── T125: Profit Calculation Logic
        └── T126: Profit Dashboard API
            └── T127: Profit Dashboard UI
└── T128: Cot Availability API
    └── T129: Cot Availability UI
        └── T130: Integration Validation (Both Dashboards)
```

### Implementation Order Recommendation

**Parallel Execution Windows**:

1. **Start Phase 19 + Phase 21** in parallel (no dependencies between them)
   - Phase 19 provides foundational building/room/cot structure
   - Phase 21 adds mess facility toggle (independent, only depends on hostelers table)

2. **After Phase 19 completes: Start Phase 20** (depends on room structure)
   - Rate history tracking for room rent and meal rates

3. **After Phase 20 completes: Start Phase 22** (depends on rate lookups)
   - Billing generation and transmission

4. **Anytime (no critical dependencies): Start Phase 23** (employee management)
   - Can run in parallel with any other phase

5. **After Phases 20, 22, 23 complete: Start Phase 24** (depends on all three)
   - Profit dashboard (needs rate/salary/billing history)
   - Cot availability dashboard (depends on Phase 19)

### Success Criteria

- [ ] All 31 tasks completed and tested
- [ ] Phase 19 provides functional building/room/cot inventory
- [ ] Phase 20 enables month-aware rate tracking with historical lookups
- [ ] Phase 21 configures meal preferences defaults
- [ ] Phase 22 delivers two-phase billing with hosteler visibility
- [ ] Phase 23 tracks employee salary history
- [ ] Phase 24 provides owner dashboards for profit analysis and cot occupancy
- [ ] All phases respect RLS and cross-owner data isolation
- [ ] Mobile-first 375 px baseline compliance on all owner and hosteler UI
- [ ] Comprehensive test coverage: unit, component, and API integration
- [ ] Historical rate/salary lookups are efficient (indexed, single-row queries)
- [ ] Profit calculations handle mid-month rate changes correctly (per-day prorating)
- [ ] Optional browser tests run successfully when explicitly requested

---



**Generated by**: `/speckit.converge` | **Date**: 2026-07-10  
**Assessment**: All 31 tasks (T100–T130) in Phases 19–24 are currently unimplemented. Codebase contains no building/room/cot infrastructure, rate history tracking, billing schema/logic, employee management, or profit/cot dashboard features.

**Convergence Findings**:
- **CRITICAL (5)**: Schema gaps for buildings, rooms, rate history, billing, employees, and mess facility status
- **HIGH (12)**: Missing API routes for building/room/cot management, rate lookups, billing operations, employee management, and dashboards
- **MEDIUM (11)**: Missing UI components and integration logic

**Next Steps**:
1. Run `/speckit.implement` to systematically complete Phases 19–24 starting with Phase 19 (Building/Room/Cot) which has no external dependencies
2. Phase 19 is fully independent and can begin immediately
3. Phase 21 (Mess Facility) is independent and can run in parallel with Phase 19
4. Phase 23 (Employee Management) is independent and can run in parallel with Phases 19/21
5. Phases 20, 22, 24 have sequential dependencies; implement after their prerequisite phases complete

**All tasks from Phases 19–24 remain in their original locations (above) and are ready for implementation**. This phase serves as a consolidation and tracking checkpoint. No task modifications are required; proceed with implementation as specified.

---

**Document Generated**: 2026-07-10 | **Version**: 1.0




---



**Generated by**: /speckit.converge | **Date**: 2026-07-14
**Assessment**: Phase 19 is COMPLETE. Phases 20�24 are PENDING (fully defined, ready for implementation). Phase 25 captures quality checklist gaps not covered by US1�US21 specification.

**Convergence Findings** (Quality Checklist References):
- **ACCESSIBILITY (HIGH)**: CHK020 (keyboard nav), CHK038 (table a11y), CHK080 (WCAG 2.1 AA compliance)
- **PWA DETAIL (MEDIUM)**: CHK064 (service worker updates), CHK065 (icon specs), CHK066 (offline states)
- **EDGE CASES (MEDIUM)**: CHK021 (network errors), CHK030 (real-time deactivation), CHK049 (concurrent billing), CHK058 (live deadline updates)
- **MEASURABILITY (LOW)**: CHK083, CHK087�090 (performance & test dataset documentation)
- **OPERATIONAL (LOW)**: CHK093 (Supabase keepalive), CHK098 (external service fallback)

---

### T134 � Phase 25: Accessibility Audit and Keyboard Navigation (CHK020, CHK038, CHK080)

**Functional Requirements**: FR-071, FR-076, FR-077, FR-080
**Quality Checklist References**: CHK020, CHK038, CHK080
**Acceptance Criteria**:
- [ ] AC1: Meal toggle component supports full keyboard navigation: Tab/Space/Enter/Arrow keys
- [x] AC2: All form labels linked with htmlFor; aria-label on inputs; screen reader support
- [x] AC3: WCAG 2.1 AA compliance: color contrast = 4.5:1, tap target = 44px, 200% text resizable
- [x] AC4: All interactive elements reachable via Tab; focus indicator visible
- [ ] AC5: Form errors announced; aria-invalid and aria-describedby attributes
- [ ] AC6: Comprehensive test: keyboard navigation, WCAG tools (Lighthouse, AXE)

**Dependencies**: Phase 1�6

**File Paths**:
- Tests: src/components/__tests__/food-toggle.accessibility.test.tsx

**Estimated Scope**: Medium

---

### T135 � Phase 25: Network Error Recovery for Food Submission (CHK021)

**Functional Requirements**: FR-019
**Quality Checklist Reference**: CHK021
**Acceptance Criteria**:
- [ ] AC1: Food submit errors show inline message with retry button (not form disable)
- [x] AC2: Error messages vary by type (network vs. timeout vs. server)
- [x] AC3: Retry button enabled; clicking retries with state preserved
- [x] AC4: Form validation state preserved across retries
- [ ] AC5: On 375 px mobile: error and retry fully visible without scroll

**Dependencies**: Phase 5

**File Paths**:
- Tests: src/app/(hosteler)/submit/__tests__/error-handling.test.tsx

**Estimated Scope**: Small

---

### T136 � Phase 25: Real-Time Hosteler Deactivation Updates (CHK030)

**Functional Requirements**: FR-027
**Quality Checklist Reference**: CHK030
**Acceptance Criteria**:
- [ ] AC1: Deactivate hosteler ? immediately removed from dashboard lists (Realtime)
- [x] AC2: Delete hosteler ? name disappears from lists in real time
- [x] AC3: If detail form open, show "Hosteler no longer available" message
- [x] AC4: Dashboard Realtime includes hosteler status changes

**Dependencies**: Phase 5�6

**File Paths**:
- Tests: src/app/(owner)/dashboard/__tests__/realtime-hosteler-updates.test.tsx

**Estimated Scope**: Small

---

### T137 � Phase 25: Concurrent Bill Generation Guard (CHK049)

**Functional Requirements**: FR-091
**Quality Checklist Reference**: CHK049
**Acceptance Criteria**:
- [ ] AC1: Detect concurrent generation for same month within 10-second window
- [x] AC2: Return HTTP 409 if concurrent detected
- [x] AC3: UI shows "Generating bills..." and disables button during generation
- [x] AC4: Re-enable button after completion; show warning if > 30s

**Dependencies**: Phase 22

**File Paths**:
- Tests: src/app/api/admin/billing/__tests__/concurrent-generation.test.ts

**Estimated Scope**: Small

---

### T138 � Phase 25: Live Deadline Changes and Realtime Broadcast (CHK058)

**Functional Requirements**: FR-024, FR-042
**Quality Checklist Reference**: CHK058
**Acceptance Criteria**:
- [ ] AC1: Deadline change via settings ? hosteler submission pages receive update via Realtime within 5s
- [x] AC2: Countdown timer updates; form lock status updates in real time
- [x] AC3: Preserve form input if editing when deadline changes

**Dependencies**: Phase 6 + Phase 8

**File Paths**:
- Tests: src/app/(hosteler)/submit/__tests__/realtime-deadline-update.test.tsx

**Estimated Scope**: Small

---

### T139 � Phase 25: Service Worker Update Strategy and Caching Policy (CHK064)

**Functional Requirements**: FR-050�FR-052
**Quality Checklist Reference**: CHK064
**Acceptance Criteria**:
- [ ] AC1: Cache versioning strategy documented (versioned keys vs. skip-waiting)
- [x] AC2: Update detection: every 24 hours or app-foreground
- [x] AC3: User prompt: "App update available�restart to apply?"
- [x] AC4: Cache cleanup: old versions deleted after 7 days
- [ ] AC5: Implementation in src/public/sw.js and src/app/layout.tsx

**Dependencies**: Phase 11

**File Paths**:
- Service Worker: src/public/sw.js
- Documentation: specs/001-dcastle-pg-management/pwa-android-validation.md

**Estimated Scope**: Medium

---

### T140 � Phase 25: PWA Icon Specifications and Manifest Configuration (CHK065)

**Functional Requirements**: FR-046�FR-047
**Quality Checklist Reference**: CHK065
**Acceptance Criteria**:
- [ ] AC1: Create icons: 192�192 px, 512�512 px, maskable variant, iOS apple-touch-icon (180�180)
- [x] AC2: Update manifest.json with icon array (3+ entries with purpose field)
- [x] AC3: Test Android install: verify icon appears in app drawer and home screen

**Dependencies**: Phase 11

**File Paths**:
- Icons: public/dcastle-192.png, public/dcastle-512.png, public/dcastle-maskable.png
- Manifest: public/manifest.json

**Estimated Scope**: Small

---

### T141 � Phase 25: Offline Error States per Page (CHK066)

**Functional Requirements**: FR-052�FR-053
**Quality Checklist Reference**: CHK066
**Acceptance Criteria**:
- [ ] AC1: Submission (offline): show cached form, disabled "Save" button, "No internet" message
- [x] AC2: Dashboard (offline): cached counters/lists with "You are offline" banner
- [x] AC3: History (offline): cached or empty state
- [x] AC4: Bills (offline): cached or "No bills (offline)"
- [ ] AC5: Owner dashboard (offline): "No internet. Real-time paused" message; disable forms
- [ ] AC6: Settings (offline): cached values (read-only)
- [ ] AC7: Reconnect: auto-refresh or prompt to refresh

**Dependencies**: Phase 1�6

**File Paths**:
- Components: src/components/offline-indicator.tsx

**Estimated Scope**: Medium

---

### T142 � Phase 25: Response Time Measurement and Performance Harness (CHK083)

**Functional Requirements**: SC-001, SC-003, SC-006
**Quality Checklist Reference**: CHK083
**Acceptance Criteria**:
- [ ] AC1: Performance utility: measureFlow(name), 
ecordMetric(name, duration)
- [x] AC2: Food submission flow: = 30 seconds (login ? submit)
- [x] AC3: Dashboard update: = 3 seconds (hosteler submit ? count increment)
- [x] AC4: Food save: = 1 second (API only)
- [ ] AC5: Output to console (dev) and observability service (production)
- [ ] AC6: Test harness with deterministic data and baseline timings

**Dependencies**: Phase 1�5

**File Paths**:
- Utility: src/lib/performance.ts
- Tests: src/lib/__tests__/performance-measurement.test.ts
- Documentation: specs/001-dcastle-pg-management/performance-measurement.md

**Estimated Scope**: Small

---

### T143 � Phase 25: Measurability Documentation (CHK087�090)

**Functional Requirements**: SC-001�SC-041
**Quality Checklist References**: CHK087, CHK088, CHK089, CHK090
**Acceptance Criteria**:
- [ ] AC1: Network profile assumptions: iPhone 12, Pixel 6, 4G LTE (10 Mbps, 30ms latency)
- [x] AC2: Reference bill test case: known inputs ? expected output totals
- [x] AC3: Mobile scope checklist: all screens at 375 px with layout checks
- [x] AC4: Measurability Runbook: how to measure each SC

**Dependencies**: All phases

**File Paths**:
- Documentation: 
  - specs/001-dcastle-pg-management/measurability-runbook.md
  - specs/001-dcastle-pg-management/reference-test-cases.md
  - specs/001-dcastle-pg-management/mobile-scope-checklist.md

**Estimated Scope**: Small

---

### T144 � Phase 25: Supabase Free-Tier Keepalive Strategy (CHK093)

**Functional Requirements**: Constitution �V
**Quality Checklist Reference**: CHK093
**Acceptance Criteria**:
- [ ] AC1: Document Supabase free-tier inactivity: projects pause after 7 days with no queries
- [x] AC2: Health-check endpoint: GET /api/health (trivial query)
- [x] AC3: Cron job: /.github/workflows/keepalive.yml calls /api/health every 6 days
- [x] AC4: Monitor logs; alert on failure
- [ ] AC5: Fallback: manual reactivation via Supabase dashboard within 24 hours

**Dependencies**: None

**File Paths**:
- Routes: src/app/api/health/route.ts
- Workflow: .github/workflows/keepalive.yml
- Documentation: specs/001-dcastle-pg-management/supabase-keepalive-strategy.md

**Estimated Scope**: Small

---

### T145 � Phase 25: External Service Dependency and Fallback Documentation (CHK098)

**Functional Requirements**: Constitution �V
**Quality Checklist Reference**: CHK098
**Acceptance Criteria**:
- [ ] AC1: Document all dependencies: Supabase (DB + auth), Cloudflare Pages (hosting), Google OAuth
- [x] AC2: Fallback per service: Supabase down ("Temporarily unavailable"), Google OAuth down ("PIN login available")
- [x] AC3: Retry logic with exponential backoff
- [x] AC4: Create DEPENDENCIES.md: all services, SLAs, fallback procedures

**Dependencies**: None

**File Paths**:
- Documentation: specs/001-dcastle-pg-management/DEPENDENCIES.md

**Estimated Scope**: Small

---

## Convergence Summary

**Phase 25 Tasks Appended**: T134�T145 (12 tasks)
**Total Project Tasks**: T001�T145 (145 tasks)

**Status**:
- Phase 19: ? COMPLETE
- Phases 20�24: ? PENDING (fully defined, ready for /speckit.implement)
- Phase 25: ? PENDING (accessibility + edge cases, can run in parallel or after Phase 24)

**Convergence Result**: ? **COMPLETE** � All phases documented; no specification gaps identified. Phase 19 verified complete; Phases 20�24 ready for implementation; Phase 25 captures quality checklist items not in US1�US21.

**Next Step**: Run /speckit.implement Phases 20�24 (Phase 25 can follow or run in parallel)

---

**Convergence Completed**: 2026-07-14 | **Version**: 2.0

