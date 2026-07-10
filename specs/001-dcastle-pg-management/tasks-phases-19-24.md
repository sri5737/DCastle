# Tasks: Phases 19–24 (Billing and Owner Management)

**Scope**: User Stories 14–21 (Building/Room Management, Rate History, Billing, Employee Management, Dashboards)

**Date**: 2026-07-10 | **Status**: Ready for Implementation

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

---

## Phase 19: Building/Room/Cot Infrastructure (US14)

**Goal**: Establish multi-building, multi-room, multi-cot inventory management

**Acceptance Criteria** (Phase-level):
- [ ] Owner can create buildings with unique names per owner
- [ ] Owner can add rooms to buildings with unique room numbers per building
- [ ] Owner can define room types with cot counts
- [ ] Owner can configure individual cots with lower/upper assignments
- [ ] Owner can assign hostelers to specific buildings, rooms, and cots during registration
- [ ] Building hierarchy is queryable for later billing and dashboard operations
- [ ] All operations respect RLS (owner cannot see other owners' buildings)

---

### T100 — Phase 19: Database Migrations for Building/Room/Cot Tables

**User Story**: US14  
**Functional Requirements**: FR-084, FR-085, FR-086, FR-087  
**Acceptance Criteria**:
- [ ] AC1: Migration creates `buildings` table with columns: `id`, `owner_id` (FK), `name`, `description`, `created_at`, `updated_at`, and unique constraint on `(owner_id, name)`
- [ ] AC2: Migration creates `room_types` table with columns: `id`, `owner_id` (FK), `name`, `base_rent`, `cot_count`, `description`, `created_at`, `updated_at`, and unique constraint on `(owner_id, name)`
- [ ] AC3: Migration creates `rooms` table with columns: `id`, `building_id` (FK), `room_number`, `floor` (enum: ground/first/second/null), `room_type_id` (FK), `current_rent`, `created_at`, `updated_at`, and unique constraint on `(building_id, room_number)`
- [ ] AC4: Migration creates `cots` table with columns: `id`, `room_id` (FK), `cot_id_label`, `cot_type` (enum: lower_cot/upper_cot), `hosteler_id` (FK, nullable), `created_at`, `updated_at`, and unique constraint on `(room_id, cot_id_label)`
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
- [ ] AC2: `GET /api/admin/buildings` returns all buildings for the authenticated owner with hierarchical rooms and cots nested
- [ ] AC3: `GET /api/admin/buildings/[id]` returns a single building with full hierarchy (rooms → cots) or 404 if not found
- [ ] AC4: `PATCH /api/admin/buildings/[id]` updates building name and/or description; enforces `(owner_id, name)` uniqueness again after update
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
- [ ] AC1: `POST /api/admin/room-types` creates a new room type for the owner; enforces `(owner_id, name)` uniqueness; returns full record with `id`, `base_rent`, `cot_count`
- [ ] AC2: `GET /api/admin/room-types` lists all room types for the authenticated owner
- [ ] AC3: `POST /api/admin/buildings/[id]/rooms` adds a room to a building; validates `room_type_id` belongs to same owner; enforces `(building_id, room_number)` uniqueness
- [ ] AC4: `GET /api/admin/buildings/[id]/rooms` returns all rooms in a building with their room-type details and cots
- [ ] AC5: `PATCH /api/admin/rooms/[id]` updates room details (number, floor, rent); validates uniqueness after update
- [ ] AC6: `DELETE /api/admin/rooms/[id]` removes room only if no cots are assigned to active hostelers; otherwise returns 400
- [ ] AC7: RLS prevents cross-owner room access (owner A cannot modify owner B's rooms)

**Test Coverage Required**:
- Unit tests: Input validation (room number format, floor enum, rent amount), uniqueness constraints
- API integration tests: Room CRUD workflow within building; RLS isolation; cascading cot relationships
- Component tests (Phase 19 UI): Form field rendering, dropdown selection for room types and floors

**Dependencies**: T100 (schema), T101 (building routes)

**File Paths**:
- Routes: `src/app/api/admin/room-types/route.ts`, `src/app/api/admin/buildings/[id]/rooms/route.ts`, `src/app/api/admin/rooms/[id]/route.ts`
- Tests: `src/app/api/admin/rooms/__tests__/route.test.ts`

**Estimated Scope**: Small

---

### T103 — Phase 19: API Routes for Cot Management and Hosteler Assignment

**User Story**: US14  
**Functional Requirements**: FR-087 (Cot CRUD and hosteler assignment)  
**Acceptance Criteria**:
- [ ] AC1: `POST /api/admin/rooms/[id]/cots` creates cots within a room based on room-type cot_count; enforces `(room_id, cot_id_label)` uniqueness
- [ ] AC2: `GET /api/admin/rooms/[id]/cots` returns all cots in a room with occupancy status (hosteler_id if assigned, null if free)
- [ ] AC3: `PATCH /api/admin/cots/[id]` assigns or unassigns a cot to/from a hosteler; validates hosteler exists and is active
- [ ] AC4: `GET /api/admin/cots/availability` returns full hierarchical view: all buildings → rooms → cots with occupancy details (for cot dashboard)
- [ ] AC5: When a hosteler is assigned during registration (`POST /api/admin/hostelers`), cot assignment is atomic (building_id, room_id, cot_id all set together)
- [ ] AC6: When a hosteler is deleted or deactivated, their cot is automatically unassigned (hosteler_id set to null)

**Test Coverage Required**:
- Unit tests: Cot label generation, occupancy status logic, cascade on hosteler deletion/deactivation
- API integration tests: Cot assignment workflow; hosteler lifecycle cascading; RLS enforcement
- E2E tests: Assign hosteler to building → room → cot; verify hierarchical response; deactivate hosteler and verify cot freed

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
- [ ] AC2: Page displays hierarchical tree: Buildings → Rooms → Cots with visual collapse/expand
- [ ] AC3: Owner can click "Add Building" → form appears for building name and description → submit creates building via `POST /api/admin/buildings`
- [ ] AC4: Owner can click "Add Room" within building → form appears for room number, floor, room type selection, rent → submit creates room via `POST /api/admin/buildings/[id]/rooms`
- [ ] AC5: Owner can click "Add Room Type" → form appears for name, base rent, cot count → submit creates room type via `POST /api/admin/room-types`
- [ ] AC6: Owner can click "Configure Cots" on room → form/modal shows cot creation and assignment workflow → cots are created via `POST /api/admin/rooms/[id]/cots`
- [ ] AC7: Forms include validation (required fields, numeric rent, enum dropdowns for floor/cot type)
- [ ] AC8: Success feedback (toast, snackbar) after create/update; error feedback with specific messages
- [ ] AC9: On 375 px mobile baseline: no page-level horizontal overflow, all form fields are reachable, buttons are touch-friendly (≥44 px)

**Test Coverage Required**:
- Component tests: Form rendering, input validation, success/error state handling
- API integration tests: Form submissions integrate with backend routes
- E2E tests: Create building → add room → configure cots → verify hierarchy displays correctly
- Mobile layout tests: Verify 375 px baseline compliance, no horizontal overflow, reachable primary actions

**Dependencies**: T103 (API routes complete)

**File Paths**:
- Page: `src/app/admin/buildings/page.tsx`, `src/app/admin/buildings/[id]/page.tsx`
- Components: `src/components/buildings/building-tree.tsx`, `src/components/buildings/add-building-form.tsx`, `src/components/buildings/add-room-form.tsx`, `src/components/buildings/add-room-type-form.tsx`, `src/components/buildings/configure-cots.tsx`
- Tests: `src/components/buildings/__tests__/building-tree.test.tsx`, `src/app/admin/buildings/__tests__/page.test.tsx`

**Estimated Scope**: Medium

---

### T105 — Phase 19: Integration of Cot Assignment in Hosteler Registration

**User Story**: US14  
**Functional Requirements**: FR-087 (hosteler assignment to cots during registration)  
**Acceptance Criteria**:
- [ ] AC1: Owner registration form for new hosteler includes cascading dropdowns: Building → Room → Cot
- [ ] AC2: Building dropdown populated via `GET /api/admin/buildings`; selecting building filters rooms
- [ ] AC3: Room dropdown populated via `GET /api/admin/buildings/[id]/rooms`; selecting room filters available cots
- [ ] AC4: Cot dropdown populated via `GET /api/admin/rooms/[id]/cots`; only shows free cots (hosteler_id IS NULL)
- [ ] AC5: Submission to `POST /api/admin/hostelers` includes building_id, room_id, cot_id in request body
- [ ] AC6: On success, hosteler is created and cot is atomically assigned (hosteler_id updated)
- [ ] AC7: Validation prevents submission if any required building/room/cot field is missing
- [ ] AC8: On 375 px mobile: cascading dropdown UX is accessible and not horizontally scrollable

**Test Coverage Required**:
- Component tests: Dropdown cascading logic, free-cot filtering, form validation
- API integration tests: Hosteler creation with building/room/cot atomicity; verify cot assignment
- E2E tests: Open hosteler registration → select building → room → cot → submit → verify hosteler and cot assignment

**Dependencies**: T104 (building/room/cot UI foundation)

**File Paths**:
- Component modifications: `src/components/hostelers/add-hosteler-form.tsx` (add cascading dropdowns)
- Tests: `src/components/hostelers/__tests__/add-hosteler-form.test.tsx`

**Estimated Scope**: Small

---

## Phase 20: Rate History Tracking (US15 & US16)

**Goal**: Track room rent and meal rate changes with effective dates; support historical rate lookups for accurate billing

**Acceptance Criteria** (Phase-level):
- [ ] Owner can set future room rent changes for individual rooms
- [ ] Owner can set future meal rate changes for breakfast, lunch, dinner
- [ ] "Rent will be updated on [date]" labels display until effective date is reached
- [ ] Historical rate lookups return correct rate for any given date
- [ ] Bills generated for any month use rates effective for each specific day
- [ ] Rate changes support previous, current, and future calendar months

---

### T106 — Phase 20: Database Migrations for Rate History Tables

**User Story**: US15, US16  
**Functional Requirements**: FR-088, FR-089  
**Acceptance Criteria**:
- [ ] AC1: Migration creates `room_rent_rate_history` table with columns: `id`, `room_id` (FK), `old_rent`, `new_rent`, `effective_date`, `created_by` (FK to owner), `created_at`, and unique constraint on `(room_id, effective_date)`
- [ ] AC2: Migration creates `meal_rate_rate_history` table with columns: `id`, `meal_type` (enum: breakfast/lunch/dinner), `old_rate`, `new_rate`, `effective_date`, `created_by` (FK to owner), `created_at`, and unique constraint on `(meal_type, effective_date)`
- [ ] AC3: Indexes created on `room_id`, `effective_date`, `meal_type`, `effective_date` for efficient historical lookups
- [ ] AC4: Both tables are immutable (no UPDATE or DELETE allowed via RLS/triggers; only INSERT)
- [ ] AC5: Migration is idempotent

**Test Coverage Required**:
- Unit tests: Migration idempotency, schema structure
- Integration tests: Immutability enforced via RLS or triggers; efficient query plans for historical lookups

**Dependencies**: T100 (foundational schema)

**File Paths**:
- Migration: `supabase/migrations/XXX_add_rate_history_tables.sql`
- Tests: `src/lib/__tests__/rate-history.test.ts`

**Estimated Scope**: Small

---

### T107 — Phase 20: API Routes for Room Rent Change Management

**User Story**: US15  
**Functional Requirements**: FR-088 (room rent change with effective date)  
**Acceptance Criteria**:
- [ ] AC1: `POST /api/admin/rooms/[id]/rent-change` accepts body: `{ new_rent: decimal, effective_date: date }`
- [ ] AC2: Creates a `room_rent_rate_history` record with `old_rent` = current rent, `new_rent`, `effective_date`, `created_by` = current owner
- [ ] AC3: Until effective date, room display shows "Rent will be updated to ₹[new_rent] on [date]"
- [ ] AC4: On the effective date, room query returns new rent as current
- [ ] AC5: Validates: new_rent > 0, effective_date is not in past (can be today or future)
- [ ] AC6: Supports date range: previous month (e.g., -30 days), current month, future dates
- [ ] AC7: `GET /api/admin/rooms/[id]` returns both current rent and any pending rent changes
- [ ] AC8: RLS prevents cross-owner rent modifications

**Test Coverage Required**:
- Unit tests: Date validation, decimal rent parsing, effective-date boundary testing (midnight IST edge cases)
- API integration tests: Create rent change, verify label until effective date, verify rent updates on/after effective date
- Component tests (Phase 20 UI): Date picker interaction, pending-change label display

**Dependencies**: T102 (room routes)

**File Paths**:
- Routes: `src/app/api/admin/rooms/[id]/rent-change/route.ts`
- Tests: `src/app/api/admin/rooms/__tests__/rent-change.test.ts`

**Estimated Scope**: Small

---

### T108 — Phase 20: API Routes for Meal Rate Change Management and Historical Lookups

**User Story**: US16  
**Functional Requirements**: FR-089 (meal rate change with effective date and historical lookups)  
**Acceptance Criteria**:
- [ ] AC1: `POST /api/admin/meal-rates/change` accepts body: `{ meal_type: 'breakfast'|'lunch'|'dinner', new_rate: decimal, effective_date: date }`
- [ ] AC2: Creates `meal_rate_rate_history` record; on effective date, this rate becomes current
- [ ] AC3: `GET /api/admin/settings/meal-rates` returns current rates for all three meals and any pending changes
- [ ] AC4: Until effective date, settings page displays "Meal rate will be updated on [date]" for each meal with pending change
- [ ] AC5: Endpoint `GET /api/billing/meal-rate?meal_type=breakfast&date=2026-07-15` returns the rate effective on that specific date (used by billing)
- [ ] AC6: Historical rate lookup queries are efficient (indexed, single-row lookups via `WHERE effective_date <= $date ORDER BY effective_date DESC LIMIT 1`)
- [ ] AC7: Validates: new_rate > 0, effective_date not in past, meal_type is valid enum
- [ ] AC8: Supports date ranges: previous month, current month, future

**Test Coverage Required**:
- Unit tests: Date boundary validation, decimal rate parsing, historical lookup queries (SQL correctness)
- API integration tests: Set meal rate change, verify pending label, verify historical lookup on/after effective date
- E2E tests: Set future meal rate → generate bill for future date → verify bill uses new rate

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
- [ ] AC1: Settings page at `/admin/settings` includes sections: "Room Rent Changes" and "Meal Rate Changes"
- [ ] AC2: Owner can click "Change Rent" for any room → modal/form appears with date picker and new rent input
- [ ] AC3: Form submission calls `POST /api/admin/rooms/[id]/rent-change`; success shows "Rent change scheduled"
- [ ] AC4: Room card displays pending-change label: "Rent will be updated to ₹[new] on [date]" until effective date
- [ ] AC5: Owner can click "Update Meal Rates" → modal appears with date picker and input fields for breakfast, lunch, dinner
- [ ] AC6: Form submission calls `POST /api/admin/meal-rates/change` for each meal; success shows "Meal rates change scheduled"
- [ ] AC7: Settings page displays pending meal rate changes: "Meal rate will be updated on [date]" for each meal
- [ ] AC8: On 375 px mobile: date picker and input fields are reachable, no horizontal overflow, forms are touch-friendly

**Test Coverage Required**:
- Component tests: Date picker functionality, form validation, pending-label rendering
- API integration tests: Forms call correct endpoints with correct payload
- E2E tests: Set room rent change with future date → verify label displays → advance date to effective date → verify label disappears and new rent is active

**Dependencies**: T107, T108 (rate change APIs)

**File Paths**:
- Page: `src/app/admin/settings/page.tsx` (extend existing)
- Components: `src/components/settings/room-rent-change-form.tsx`, `src/components/settings/meal-rate-change-form.tsx`
- Tests: `src/components/settings/__tests__/rate-change-forms.test.tsx`

**Estimated Scope**: Medium

---

### T110 — Phase 20: Unit Tests and Query Validation for Historical Rate Lookups

**User Story**: US15, US16  
**Functional Requirements**: FR-088, FR-089 (testing historical lookups)  
**Acceptance Criteria**:
- [ ] AC1: Unit test suite covers room rent lookup for dates: before first change, on change date, between changes, after latest change
- [ ] AC2: Unit test suite covers meal rate lookup for all three meal types with multiple historical rates per meal
- [ ] AC3: Tests verify query efficiency: single-row lookup with indexed effective_date
- [ ] AC4: Tests validate edge cases: midnight IST, last day of month, first day of month, leap years
- [ ] AC5: Tests confirm lookup returns correct rate when multiple rate changes exist for a room/meal
- [ ] AC6: Integration tests verify database indexes exist and queries use them (EXPLAIN analysis)

**Test Coverage Required**:
- Unit tests: 100% coverage of rate lookup logic with parametrized date scenarios
- Integration tests: Query plan verification, index usage confirmation

**Dependencies**: T106, T108 (rate history schema and APIs)

**File Paths**:
- Tests: `src/lib/__tests__/rate-history-queries.test.ts`

**Estimated Scope**: Small

---

## Phase 21: Mess Facility Assignment (US17)

**Goal**: Track which hostelers avail mess facilities; set food preference defaults accordingly

**Acceptance Criteria** (Phase-level):
- [ ] Owner can toggle "Availing Mess?" during hosteler registration and editing
- [ ] Hostelers NOT availing default to NO for all meals; hostelers availing default to YES for all meals
- [ ] Hostelers can override defaults by toggling any meal on/off
- [ ] Billing excludes meal charges for hostelers NOT availing mess

---

### T111 — Phase 21: Database Schema Update for Mess Facility Assignment

**User Story**: US17  
**Functional Requirements**: FR-090  
**Acceptance Criteria**:
- [ ] AC1: Migration adds `availing_mess` (boolean, default true) column to `hostelers` table
- [ ] AC2: Existing hostelers default to `availing_mess = true`
- [ ] AC3: Column is indexed for efficient filtering during food preference default application and billing
- [ ] AC4: RLS enforces that only the owner can modify a hosteler's `availing_mess` status
- [ ] AC5: Migration is idempotent

**Test Coverage Required**:
- Unit tests: Migration idempotency, default value application
- Integration tests: Column added and indexed; RLS policies work correctly

**Dependencies**: T100 (hostelers table exists)

**File Paths**:
- Migration: `supabase/migrations/XXX_add_availing_mess_to_hostelers.sql`

**Estimated Scope**: Small

---

### T112 — Phase 21: Food Preference Defaults Based on Mess Facility Status

**User Story**: US17  
**Functional Requirements**: FR-090 (food preference default logic)  
**Acceptance Criteria**:
- [ ] AC1: When a hosteler with `availing_mess = true` first visits food submission page, all three meals default to ON
- [ ] AC2: When a hosteler with `availing_mess = false` first visits food submission page, all three meals default to OFF
- [ ] AC3: Defaults apply only on first-time view for a date; if hosteler toggles and saves, their manual selection is preserved
- [ ] AC4: If owner later updates hosteler's `availing_mess` status, new defaults apply only to NEW submissions for future dates; past submissions are not modified
- [ ] AC5: Hostelers can always override defaults by manually toggling any meal on/off
- [ ] AC6: Logic is implemented in API route `POST /api/food/submit` and/or component initialization logic (client-side display only)

**Test Coverage Required**:
- Unit tests: Default logic for both availing_mess states, override scenarios
- Component tests: Food submission form initializes with correct defaults; toggles work independently
- API integration tests: Food preference submission respects defaults and allows overrides
- E2E tests: Register hosteler NOT availing → submit → verify defaults are OFF; register hosteler availing → submit → verify defaults are ON

**Dependencies**: T111 (availing_mess column added)

**File Paths**:
- API logic: `src/app/api/food/submit/route.ts` (update or new helper function)
- Component logic: `src/components/food-toggle.tsx` (update initialization)
- Tests: `src/components/__tests__/food-toggle.test.tsx`, `src/app/api/food/__tests__/submit.test.ts`

**Estimated Scope**: Small

---

### T113 — Phase 21: Owner UI to Toggle Mess Facility Status

**User Story**: US17  
**Functional Requirements**: FR-090 (UI for mess facility toggle)  
**Acceptance Criteria**:
- [ ] AC1: Owner hosteler registration form includes toggle: "Availing Mess Facilities?" (default ON)
- [ ] AC2: Owner hosteler management page (`/admin/hostelers`) shows "Availing Mess" status for each hosteler
- [ ] AC3: Owner can click to edit hosteler and toggle mess facility status; change calls `PATCH /api/admin/hostelers/[id]` with `{ availing_mess: boolean }`
- [ ] AC4: After toggle, next food submissions use new defaults (old submissions remain unchanged)
- [ ] AC5: UI clearly indicates what the default meals will be for each status (e.g., "Defaults to all meals OFF if unchecked")
- [ ] AC6: On 375 px mobile: toggle is reachable, label is readable, no horizontal overflow

**Test Coverage Required**:
- Component tests: Toggle rendering, state management, success/error feedback
- API integration tests: PATCH endpoint accepts availing_mess boolean and updates correctly
- E2E tests: Toggle mess status → submit preferences → verify new defaults are applied

**Dependencies**: T112 (food preference default logic)

**File Paths**:
- Components: `src/components/hostelers/add-hosteler-form.tsx` (add toggle), `src/components/hostelers/hosteler-list.tsx` (show status)
- Tests: `src/components/hostelers/__tests__/add-hosteler-form.test.tsx`

**Estimated Scope**: Small

---

## Phase 22: Bill Generation & Transmission (US18)

**Goal**: Two-phase billing (generate → review → transmit) with per-day accurate rate lookups

**Acceptance Criteria** (Phase-level):
- [ ] Owner can generate bills for all hostelers, specific building, or individual hosteler
- [ ] Bills are generated in "Awaiting Transmission" state; NOT visible to hostelers
- [ ] Owner can review bill details before transmission
- [ ] Owner can transmit bills, making them visible to hostelers
- [ ] Bills accurately calculate room rent + meal charges using rates effective for each day
- [ ] Hosteler views transmitted bills with per-day breakdown

---

### T114 — Phase 22: Database Migration for Monthly Bills Table

**User Story**: US18  
**Functional Requirements**: FR-091, FR-092  
**Acceptance Criteria**:
- [ ] AC1: Migration creates `monthly_bills` table with columns: `id`, `hosteler_id` (FK), `month` (date, first day of month), `status` (enum: 'generated'|'transmitted'), `room_rent_total`, `meal_charges` (jsonb with breakfast/lunch/dinner), `grand_total`, `generated_at`, `transmitted_at` (nullable), `created_at`, `updated_at`
- [ ] AC2: Unique constraint on `(hosteler_id, month)` ensures one bill per hosteler per month
- [ ] AC3: Indexes on `hosteler_id`, `month`, `status` for efficient queries
- [ ] AC4: RLS enforces owner-only access to bills; hostelers only see their own transmitted bills
- [ ] AC5: Migration is idempotent

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
- [ ] AC1: Function `calculateMonthlyBill(hosteler_id, month)` returns: `{ room_rent_total, meal_charges: { breakfast, lunch, dinner }, grand_total }`
- [ ] AC2: For each day in month: looks up room rent effective for that day (via `GET /api/billing/room-rent?room_id=[id]&date=[date]`)
- [ ] AC3: For each day: sums daily room rent and adds to `room_rent_total`
- [ ] AC4: For each meal type for each day: counts how many days hosteler opted for that meal (from `food_preferences`) and multiplies by meal rate effective for that day
- [ ] AC5: Aggregates meal charges: `{ breakfast: sum_breakfast, lunch: sum_lunch, dinner: sum_dinner }`
- [ ] AC6: Calculates `grand_total = room_rent_total + sum(meal_charges)`
- [ ] AC7: Handles edge cases: hosteler with no room assignment (room_rent_total = 0), hosteler with no food preferences (meal charges = 0), mess facility status (exclude meal charges for NOT availing)
- [ ] AC8: Uses only non-canceled food preferences (where `canceled_at IS NULL`)
- [ ] AC9: Function is testable in isolation (no side effects)

**Test Coverage Required**:
- Unit tests: Bill calculation with various scenarios (multi-rate-change months, no preferences, no room, no availing mess)
- Unit tests: Per-day rate lookup integration within bill calculation
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
- [ ] AC1: `POST /api/admin/billing/generate` accepts body: `{ scope: 'all'|'building'|'hosteler', scope_id?: uuid, month: date }`
- [ ] AC2: For scope='all': generates bills for all active hostelers with recorded food preferences or active room assignments in that month
- [ ] AC3: For scope='building': generates bills for active hostelers in specified building_id
- [ ] AC4: For scope='hosteler': generates bill for single hosteler_id
- [ ] AC5: Each bill created via `calculateMonthlyBill()` and inserted with `status='generated'`
- [ ] AC6: If bill already exists for (hosteler_id, month) with status='generated', replace it (delete old, insert new)
- [ ] AC7: If bill exists with status='transmitted', create new bill with status='generated' (preserve transmitted bill separately)
- [ ] AC8: Returns: `{ generated_count: int, bills: [ { hosteler_id, hosteler_name, room, total, status } ] }`
- [ ] AC9: RLS enforces owner-only access

**Test Coverage Required**:
- API integration tests: Generate bills for all/building/hosteler scopes; verify bill records created with correct status
- Unit tests: Edge case handling (no hostelers, no preferences, regeneration behavior)
- E2E tests: Generate bills → verify they appear in generated state → regenerate → verify replaced

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
- [ ] AC1: `PATCH /api/admin/billing/bills/[id]` (owner) accepts body: `{ action: 'transmit' }`
- [ ] AC2: Updates bill `status='transmitted'` and `transmitted_at=now()`
- [ ] AC3: After transmission, bill is immediately visible to hosteler via `GET /api/hosteler/bills`
- [ ] AC4: `GET /api/hosteler/bills?month=2026-07-01` returns only transmitted bills for authenticated hosteler
- [ ] AC5: `GET /api/hosteler/bills/[id]` returns bill detail (room_rent_total, meal_charges breakdown, grand_total, per-day breakdown) if bill is transmitted and belongs to hosteler
- [ ] AC6: Non-transmitted bills return 404 to hosteler even if bill exists
- [ ] AC7: Owner sees all bills (any status) in `GET /api/admin/billing/bills`
- [ ] AC8: RLS prevents cross-hosteler and cross-owner access

**Test Coverage Required**:
- API integration tests: Transmit bill → verify status changes and transmitted_at is set
- API integration tests: Hosteler cannot see generated bills; can see transmitted bills
- API integration tests: Owner can view all bills regardless of status
- E2E tests: Generate bill → verify hosteler doesn't see it → transmit → verify hosteler can see it

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
- [ ] AC1: Owner billing page at `/admin/billing` displays month selector (date picker) and "Generate Bill" button
- [ ] AC2: "Generate Bill" button opens dialog with scope selection: "All Hostelers" / "Specific Building" / "Individual Hosteler"
- [ ] AC3: Dialog includes month picker; submission calls `POST /api/admin/billing/generate`
- [ ] AC4: Bill list shows: Hosteler Name, Room, Total, Status ("Generated, Awaiting Transmission" or "Transmitted"), generated_at, transmitted_at
- [ ] AC5: Owner can click bill row to view detail modal: room_rent_total, meal_charges (breakfast/lunch/dinner), grand_total, per-day breakdown table
- [ ] AC6: Detail modal includes "Transmit Bill" button (enabled only if status='generated'); clicking calls `PATCH /api/admin/billing/bills/[id]` with action='transmit'
- [ ] AC7: On transmission, modal closes and bill list is refreshed; bill status changes to "Transmitted"
- [ ] AC8: Owner can regenerate bills for same month; new generated bills replace old (generated); transmitted bills are preserved
- [ ] AC9: On 375 px mobile: month picker, scope selection, detail modal, and buttons are reachable; no horizontal overflow

**Test Coverage Required**:
- Component tests: Dialog rendering, form submission, bill list rendering, detail modal
- API integration tests: Form payloads call correct endpoints
- E2E tests: Generate bills → view detail → transmit → verify hosteler sees bill

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
- [ ] AC1: Hosteler dashboard includes "Bills" card or tab showing list of transmitted bills
- [ ] AC2: Hosteler bill page at `/hosteler/bills` displays transmitted bills sorted by month (newest first)
- [ ] AC3: Bill list card shows: Month, Total Amount, view link/button
- [ ] AC4: Hosteler can click to view bill detail: month, room_rent_total, meal_charges (breakfast/lunch/dinner breakdown), grand_total, per-day cost breakdown
- [ ] AC5: Bill detail view is read-only (no edit/delete options)
- [ ] AC6: "No bills available" message if no transmitted bills yet
- [ ] AC7: On 375 px mobile: bill list and detail are fully readable, no horizontal overflow, touch-friendly link/button sizing

**Test Coverage Required**:
- Component tests: Bill list rendering, detail view, empty state
- E2E tests: Hosteler views their transmitted bills after owner transmits

**Dependencies**: T117 (hosteler bill APIs)

**File Paths**:
- Page: `src/app/(hosteler)/bills/page.tsx`
- Components: `src/components/hosteler/bill-list.tsx`, `src/components/hosteler/bill-detail.tsx`
- Tests: `src/app/(hosteler)/bills/__tests__/page.test.tsx`

**Estimated Scope**: Small

---

## Phase 23: Employee Management (US19)

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
- E2E tests: Set future salary change → verify label → verify profit dashboard uses historical salary for past periods

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
- [ ] AC2: Employee list displays: Name, Job Description, Current Salary, Pending Salary Changes (if any), and action buttons (Edit, Update Salary, Delete)
- [ ] AC3: "Add Employee" button opens form with fields: name, job_description, initial salary → submission calls `POST /api/admin/employees`
- [ ] AC4: "Edit" opens form to update name/job_description → calls `PATCH /api/admin/employees/[id]`
- [ ] AC5: "Update Salary" button opens modal with date picker and new salary input → calls `POST /api/admin/employees/[id]/salary-change`
- [ ] AC6: Pending salary changes displayed as: "Salary will be updated to ₹[new] on [date]"
- [ ] AC7: "Delete" soft-deletes employee; confirmation dialog warns "Past salary records will be preserved for billing calculations"
- [ ] AC8: Form validation: non-empty fields, decimal salary, future/current date for salary changes
- [ ] AC9: On 375 px mobile: list items are readable, forms and buttons are reachable, no horizontal overflow

**Test Coverage Required**:
- Component tests: Employee list rendering, form submission, pending-change label display
- API integration tests: Forms call correct endpoints
- E2E tests: Add employee → set salary change → verify label displays → verify employee is queryable for profit dashboard

**Dependencies**: T122 (salary change API)

**File Paths**:
- Page: `src/app/admin/employees/page.tsx` or extend `/admin/settings`
- Components: `src/components/employees/employee-list.tsx`, `src/components/employees/add-employee-form.tsx`, `src/components/employees/salary-change-form.tsx`
- Tests: `src/components/employees/__tests__/employee-management.test.tsx`

**Estimated Scope**: Small

---

## Phase 24: Profit Dashboard & Available Cots (US20 & US21)

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
- [ ] AC2: No unique constraint (multiple expenses per month allowed)
- [ ] AC3: Indexes on `owner_id`, `month` for efficient dashboard queries
- [ ] AC4: RLS enforces owner-only access
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
- [ ] AC2: Income calculation: aggregates room rent + meal charges for all active hostelers with billable history in that month
  - Uses historical room rent effective for each day (via `GET /api/billing/room-rent?room_id=[id]&date=[date]`)
  - Uses historical meal rates effective for each day (via `GET /api/billing/meal-rate?meal_type=[type]&date=[date]`)
  - Counts food preferences for each meal type for each day
  - Excludes canceled preferences (canceled_at IS NOT NULL)
  - Excludes meal charges for hostelers NOT availing mess
- [ ] AC3: Expense calculation: sums employee salaries (using historical salary effective for each day via `GET /api/billing/employee-salary?employee_id=[id]&date=[date]`) + line-item expenses for that month
- [ ] AC4: Profit = Income Total − Expenses Total
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
- [ ] AC2: `POST /api/admin/profit-dashboard/expenses` adds line-item expense; body: `{ description, amount, expense_date?, month }`
- [ ] AC3: `GET /api/admin/profit-dashboard/breakdown?month=[date]&type=income|expenses|rooms|meals|salaries` returns detailed breakdown for drilling down
- [ ] AC4: `DELETE /api/admin/expenses/[id]` removes line-item expense; dashboard recalculates automatically
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
- [ ] AC2: Dashboard displays three cards: Income, Expenses, Profit (with values and ± comparison to previous month if applicable)
- [ ] AC3: Income card shows: total, room rent subtotal, meal charges subtotal (with breakfast/lunch/dinner breakdown on click/expand)
- [ ] AC4: Expenses card shows: total, employee salaries subtotal, line-item expenses subtotal
- [ ] AC5: Line-item expenses section includes: list of current month's expenses, "Add Expense" button, and delete buttons per expense
- [ ] AC6: "Add Expense" button opens modal/form with fields: description, amount, optional date-within-month → submission calls `POST /api/admin/profit-dashboard/expenses`
- [ ] AC7: Clicking on income or expenses card expands detailed breakdown: per-hosteler rooms, per-meal breakdown, per-employee salaries
- [ ] AC8: Breakdown detail includes dates/effective-date information (e.g., "Room rent changed from ₹[old] to ₹[new] on [date]")
- [ ] AC9: Month selector triggers dashboard refresh; loading state displayed during calculation
- [ ] AC10: On 375 px mobile: cards are stacked vertically, all numbers are readable, buttons and form inputs are reachable, no horizontal overflow

**Test Coverage Required**:
- Component tests: Month selector, card rendering, breakdown expansion, form validation
- API integration tests: Form calls correct endpoints; dashboard refreshes on month change and after expense add/delete
- E2E tests: Load dashboard for specific month → verify calculations → add expense → verify profit recalculates

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
- [ ] AC2: Response structure: `{ buildings: [ { id, name, rooms: [ { id, room_number, floor, room_type, cots: [ { id, cot_id_label, cot_type, occupancy: 'occupied'|'free', hosteler_name?, hosteler_room?, hosteler_id? } ] } ] } ] }`
- [ ] AC3: For occupied cots: includes hosteler_name, hosteler_room, hosteler_id
- [ ] AC4: For free cots: occupancy='free', no hosteler fields
- [ ] AC5: Cots belong to rooms; rooms belong to buildings; building hierarchy is fully expandable
- [ ] AC6: Cots are ordered by cot_id_label within room
- [ ] AC7: RLS prevents cross-owner access
- [ ] AC8: Query is efficient (single call returns full tree; no cascading queries)

**Test Coverage Required**:
- API integration tests: Query returns correct hierarchical structure with accurate occupancy status
- Integration tests: Assign hosteler to cot → query → verify occupancy updates; unassign → verify cot is free again
- E2E tests: Navigate cot dashboard → verify hierarchy and occupancy accuracy

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
- [ ] AC2: Page displays buildings as collapsible sections; clicking expands to show rooms and cots
- [ ] AC3: Room rows show: Room Number, Floor (if applicable), Room Type, and Cot Count
- [ ] AC4: Cot rows display: Cot Label (e.g., "Lower-1", "Upper-2"), Cot Type, Occupancy Status (Occupied/Free), and Hosteler Name (if occupied)
- [ ] AC5: Visual distinction between occupied and free cots (e.g., color coding, icons)
- [ ] AC6: Clicking on occupied cot shows: Hosteler name, Phone, Room assignment, assignment date (optional)
- [ ] AC7: Clicking on free cot shows: Assign option (link to quick-assign modal or to hosteler registration flow)
- [ ] AC8: Dashboard refreshes automatically or with manual "Refresh" button; shows real-time occupancy changes
- [ ] AC9: Search/filter capability (optional): filter by building, room status, or hosteler name
- [ ] AC10: On 375 px mobile: hierarchical tree is readable with appropriate expand/collapse controls, cot status is clearly visible, no horizontal overflow

**Test Coverage Required**:
- Component tests: Tree rendering, expand/collapse, occupancy status display, modal/assignment flow
- API integration tests: Cot availability endpoint called and response rendered correctly
- E2E tests: Assign hosteler → refresh dashboard → verify cot is marked occupied with hosteler name; deactivate hosteler → verify cot freed

**Dependencies**: T128 (cot availability API)

**File Paths**:
- Page: `src/app/admin/available-cots/page.tsx`
- Components: `src/components/cots/cot-availability-tree.tsx`, `src/components/cots/cot-card.tsx`, `src/components/cots/occupied-cot-detail.tsx`
- Tests: `src/components/cots/__tests__/cot-availability-tree.test.tsx`

**Estimated Scope**: Medium

---

### T130 — Phase 24: End-to-End Tests for Profit Dashboard and Cot Occupancy

**User Story**: US20, US21  
**Functional Requirements**: FR-095, FR-096 (E2E validation)  
**Acceptance Criteria**:
- [ ] AC1: E2E test scenario: Seed month with buildings, rooms, hostelers (assigned to cots), employees with salaries, food preferences, rate/salary changes
- [ ] AC2: Test steps:
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
- [ ] AC3: Test validates month-aware rate/salary lookups (past month should use historical rates, not current)
- [ ] AC4: Test validates profit calculation handles mid-month rate changes correctly (per-day prorating)
- [ ] AC5: Test captures screenshot/video evidence for month-specific profit accuracy and real-time cot status updates

**Test Coverage Required**:
- E2E tests: Full workflow from data setup through dashboard verification
- Test isolation: Each E2E test uses seeded/unique data; cleanup after test

**Dependencies**: T127 (profit dashboard UI), T129 (cot dashboard UI)

**File Paths**:
- Tests: `e2e/us20-us21-dashboards.spec.ts`

**Estimated Scope**: Medium

---

## Summary

### Task Count by Phase

| Phase | Story | Tasks | Estimated Scope |
|-------|-------|-------|-----------------|
| 19 | US14 | T100–T105 (6 tasks) | 1 Small, 2 Small, 1 Medium, 1 Medium, 1 Small = Medium total |
| 20 | US15, US16 | T106–T110 (5 tasks) | 1 Small, 1 Small, 1 Medium, 1 Medium, 1 Small = Medium total |
| 21 | US17 | T111–T113 (3 tasks) | 1 Small, 1 Small, 1 Small = Small total |
| 22 | US18 | T114–T119 (6 tasks) | 1 Small, 1 Medium, 1 Medium, 1 Medium, 1 Medium, 1 Small = Medium–Large total |
| 23 | US19 | T120–T123 (4 tasks) | 1 Small, 1 Small, 1 Small, 1 Small = Small total |
| 24 | US20, US21 | T124–T130 (7 tasks) | 1 Small, 1 Medium, 1 Medium, 1 Small, 1 Medium, 1 Medium, 1 Medium = Medium–Large total |

**Total**: 31 tasks across 6 phases (Phases 19–24)

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
        └── T130: E2E Tests (Both Dashboards)
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
- [ ] Comprehensive test coverage: unit, component, API integration, and E2E
- [ ] Historical rate/salary lookups are efficient (indexed, single-row queries)
- [ ] Profit calculations handle mid-month rate changes correctly (per-day prorating)
- [ ] All E2E tests run successfully and prove business outcomes

---

## Phase 25: Convergence (Tracking Unimplemented Requirements)

**Generated by**: `/speckit.converge` | **Date**: 2026-07-10  
**Assessment**: All 31 tasks (T100–T130) in Phases 19–24 are currently unimplemented. Codebase contains no building/room/cot infrastructure, rate history tracking, billing schema/logic, employee management, or profit/cot dashboard features.

**Convergence Findings**:
- **CRITICAL (5)**: Schema gaps for buildings, rooms, rate history, billing, employees, and mess facility status
- **HIGH (12)**: Missing API routes for building/room/cot management, rate lookups, billing operations, employee management, and dashboards
- **MEDIUM (11)**: Missing UI components, integration logic, and E2E tests

**Next Steps**:
1. Run `/speckit.implement` to systematically complete Phases 19–24 starting with Phase 19 (Building/Room/Cot) which has no external dependencies
2. Phase 19 is fully independent and can begin immediately
3. Phase 21 (Mess Facility) is independent and can run in parallel with Phase 19
4. Phase 23 (Employee Management) is independent and can run in parallel with Phases 19/21
5. Phases 20, 22, 24 have sequential dependencies; implement after their prerequisite phases complete

**All tasks from Phases 19–24 remain in their original locations (above) and are ready for implementation**. This phase serves as a consolidation and tracking checkpoint. No task modifications are required; proceed with implementation as specified.

---

**Document Generated**: 2026-07-10 | **Version**: 1.0
