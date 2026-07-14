# Requirements Quality Checklist: Deekshana Castle PG Management App (Full Application — v1)

**Purpose**: Validate requirement completeness, clarity, consistency, measurability, and scenario coverage across all functional areas before planning and implementation
**Created**: 2026-07-03
**Feature**: [spec.md](../spec.md)

---

## Authentication & Account Provisioning

- [ ] CHK001 - Is "single-use" invite link (FR-002) defined with clarity on what constitutes "used" — account activation initiated, or account activation fully completed? [Clarity, Spec §FR-002]
- [ ] CHK002 - Are requirements defined for what happens when a hosteler attempts to activate an already-activated account (duplicate activation attempt via a second valid link)? [Coverage, Gap]
- [ ] CHK003 - Is the PIN format requirement (4-digit, Spec §FR-004) specified with input validation rules — are leading zeros, all-same-digit PINs (e.g., 0000), or sequential PINs (1234) addressed? [Clarity, Spec §FR-004]
- [ ] CHK004 - Are requirements defined for the case where a Google account's email matches no hosteler record but the phone number does — how is identity resolution specified? [Edge Case, Gap]
- [ ] CHK005 - Are session expiry requirements (30-day hosteler, 7-day owner) defined for whether "30 days" is measured from last login or last activity (idle timeout vs absolute expiry)? [Clarity, Spec §FR-008, FR-010]
- [ ] CHK006 - Are requirements defined for what happens when an owner session expires while the owner is mid-way through a multi-step action (e.g., bill generation)? [Edge Case, Gap]
- [x] CHK007 - Are post-login redirect requirements specified for all authentication paths — Google OAuth callback, PIN login, and invite activation — for both hosteler and owner? [Completeness, Spec §FR-011, FR-012] ✓ **COMPLETED (T105j)**
- [ ] CHK008 - Is FR-007 (reject unregistered Google sign-ins) consistent with FR-004 (activation via Google) — is the system able to distinguish an invited-but-not-yet-activated hosteler from a completely unregistered Google user? [Consistency, Spec §FR-007, FR-004]
- [ ] CHK009 - Are requirements defined for a hosteler who activates via PIN and later wants to link a Google account (or vice versa) — is mixed-auth-method migration in or out of scope? [Coverage, Gap]
- [ ] CHK010 - Are requirements for invite link generation (FR-002) specified to use `crypto.randomUUID()` or is the token generation method only implied by Constitution §III — is there a spec-level security requirement? [Consistency, Constitution §III, Spec §FR-002]
- [ ] CHK011 - Is the "contact your PG owner" message (FR-007) the only response, or are requirements defined for logging or alerting the owner when an unregistered sign-in is attempted? [Completeness, Spec §FR-007]
- [ ] CHK012 - Are requirements for the owner login page (FR-009) specified beyond "email and password" — is there a lockout policy, rate limiting, or MFA requirement? [Completeness, Spec §FR-009]

---

## Food Preference Submission

- [ ] CHK013 - Is "next calendar day" precisely defined — does "tomorrow" roll over at midnight IST, at the deadline time, or at some other boundary? [Clarity, Spec §FR-013]
- [ ] CHK014 - Are requirements defined for what a hosteler sees when submitting after midnight but before the deadline — is this still "submitting for tomorrow" or for "the same day"? [Clarity, Edge Case, Spec §FR-013]
- [ ] CHK015 - Is FR-016 (meal time window display) a purely informational requirement or does it impose submission time constraints — can breakfast preferences be set at 11 PM? [Clarity, Spec §FR-016]
- [ ] CHK016 - Is there a minimum re-submission interval specified for FR-014 (update before deadline) — can a hosteler submit 100 times in a minute? [Clarity, Spec §FR-014]
- [ ] CHK017 - Is the server-side deadline check (FR-015) specified to use IST consistently, and is the authoritative time source documented (server clock, Supabase function, NTP)? [Clarity, Spec §FR-015, Constitution §IV]
- [ ] CHK018 - Are requirements for the countdown banner (FR-019) specified for which timezone is shown to the user — IST, user's local timezone, or both? [Clarity, Spec §FR-019]
- [x] CHK019 - Is the confirmation shown after saving preferences (Acceptance Scenario 3, US-001) specified as transient (toast/banner) or persistent (dashboard state update)? [Clarity, Spec §US-001] ✓ **COMPLETED (T105i: Copy feedback with 2-sec status message)**
- [ ] CHK020 - Are accessibility requirements specified for the meal toggle components — keyboard navigation, screen reader labels, ARIA attributes? [Coverage, Gap] ⚠️ **PARTIAL: Added aria-live for copy feedback, but comprehensive keyboard/screen-reader coverage for meal toggles still needed**
- [ ] CHK021 - Are requirements defined for the submission page's behavior when a network error occurs during save — is there an optimistic UI update that must be rolled back? [Edge Case, Gap]
- [ ] CHK022 - Is the "read-only after deadline" state (FR-017) specified to prevent all input interactions or only the save action — can the user still toggle visually without saving? [Clarity, Spec §FR-017]

---

## Owner Daily Dashboard

- [ ] CHK023 - Is "within a few seconds" in the real-time update acceptance scenario (US-002) reconciled with SC-003 (3 seconds) — should FR-021 reference SC-003 as its quantified threshold? [Consistency, Spec §FR-021, SC-003]
- [ ] CHK024 - Are requirements for the dashboard specified for the case where zero hostelers have submitted — should meal count cards show 0 or a different empty state? [Edge Case, Spec §FR-020]
- [ ] CHK025 - Is the default expansion state of the collapsible submitted-hostelers list (FR-023) specified — expanded or collapsed on page load? [Clarity, Spec §FR-023]
- [ ] CHK026 - Are requirements defined for dashboard behavior when the Supabase Realtime connection is interrupted — does the owner see a stale data warning or does the UI silently lag? [Edge Case, Gap]
- [ ] CHK027 - Is the deadline countdown (FR-024) specified to update continuously (live timer) or at a fixed refresh interval? [Clarity, Spec §FR-024]
- [ ] CHK028 - Are requirements defined for dashboard state after the deadline has passed — does it show today's final counts, reset for the next day, or both? [Coverage, Gap]
- [ ] CHK029 - Is the pending/submitted list ordering specified — alphabetical, by room number, by submission time? [Clarity, Gap]
- [ ] CHK030 - Are requirements for the dashboard defined for the case where a hosteler is deactivated while appearing in the pending list — is the list updated in real time? [Edge Case, Gap]

---

## Hosteler Management

- [ ] CHK031 - Is "pending" status duration defined — does a hosteler remain pending indefinitely, or is there a system-enforced expiry consistent with the 7-day invite expiry (FR-003)? [Clarity, Spec §FR-025, FR-003]
- [ ] CHK032 - Is the default sort order for each hosteler tab (active, pending, inactive) specified? [Clarity, Gap]
- [ ] CHK033 - Are requirements defined for what happens to a deactivated hosteler's future food preferences — are preferences beyond the deactivation date automatically removed or retained? [Edge Case, Gap]
- [x] CHK034 - Is confirmation required before deactivating an active hosteler (FR-027) — is a destructive-action guard (e.g., confirm dialog) specified? [Clarity, Spec §FR-027] ✓ **COMPLETED (T105l: Delete room confirmation + active-hosteler guard)**
- [ ] CHK035 - Is FR-029 (generate new invite, invalidate old) specified to require owner confirmation before invalidating an existing unused link? [Clarity, Spec §FR-029]
- [ ] CHK036 - Are requirements defined for what happens to a currently logged-in hosteler whose account is deactivated in real time — are they immediately logged out? [Edge Case, Gap]
- [ ] CHK037 - Are phone number display requirements (FR-026) specified — full display, partial masking, or formatting (e.g., +91 prefix)? [Clarity, Spec §FR-026]
- [ ] CHK038 - Are accessibility requirements specified for the hosteler management table — keyboard navigation, row actions via keyboard, screen reader row identification? [Coverage, Gap]

---

## Food History

- [ ] CHK039 - Is the default month shown when a hosteler opens the history page (FR-030) specified — current month or most recent month with data? [Clarity, Spec §FR-030]
- [ ] CHK040 - Are requirements for history display when no preferences exist for the selected month specified — empty state message, or is the month hidden from selection? [Edge Case, Gap]
- [ ] CHK041 - Is the position of the monthly summary row (FR-032) specified — header, footer, or sticky? [Clarity, Spec §FR-032]
- [ ] CHK042 - Is the CSV export format (FR-034) specified — column names, date format (ISO 8601 vs DD/MM/YYYY), encoding (UTF-8), and whether only filtered rows or all rows are exported? [Clarity, Spec §FR-034]
- [ ] CHK043 - Are requirements for FR-033 (owner filters by hosteler AND date range simultaneously) specified for the AND/OR logic and how the view updates when filters change? [Clarity, Spec §FR-033]
- [ ] CHK044 - Is the history view's meal representation (FR-031) specified with explicit symbols or states — opted vs not-opted vs "no data for that date"? [Clarity, Spec §FR-031]
- [ ] CHK045 - Are requirements for hosteler-side history (FR-030) and owner-side history (FR-033) consistent in how they display the same underlying data — are any display differences specified? [Consistency, Spec §FR-030, FR-033]

---

## Monthly Billing

- [ ] CHK046 - Is the rate change proration rule (FR-037) specified with an unambiguous day-of-change rule — does the change-date day use the old rate, the new rate, or is this left undefined? [Clarity, Spec §FR-037]
- [ ] CHK047 - Is the bill calculation formula (FR-036) consistent with the multi-rate scenario (FR-037) — is the formula updated to accommodate variable rates per day? [Consistency, Spec §FR-036, FR-037]
- [ ] CHK048 - Are requirements defined for bill generation when a hosteler was deactivated mid-month — are their recorded preferences included or excluded? [Edge Case, Spec §FR-035]
- [ ] CHK049 - Is there a requirement against concurrent bill generation — what happens if the owner triggers generation for the same month twice in rapid succession? [Edge Case, Gap]
- [ ] CHK050 - Are requirements for the bill summary table (FR-038) specified for pagination, sorting, or scroll behavior when there are ~100 hostelers? [Completeness, Spec §FR-038]
- [ ] CHK051 - Is the per-day bill breakdown (FR-039) specified at the same data granularity as the per-day history (FR-030) — are they derived from the same underlying record? [Consistency, Spec §FR-039, FR-030]
- [ ] CHK052 - Are requirements for the hosteler bill view's "not yet available" state (US-008, Scenario 2) specified with an exact message or just described as an indicator? [Clarity, Spec §US-008]
- [ ] CHK053 - Is FR-041 ("confirmed by owner" note) specified with exact message text, placement on the page, and whether it is timestamp-stamped? [Clarity, Spec §FR-041]
- [ ] CHK054 - Are requirements defined for regenerating bills (US-006, Scenario 5) — does regeneration affect the hosteler's view immediately, or is there a publish/confirm step? [Clarity, Spec §US-006]

---

## Settings

- [ ] CHK055 - Is the time input format for the deadline (FR-042) specified — 12-hour or 24-hour clock, IST always assumed, and what is the granularity (minutes, 15-minute steps)? [Clarity, Spec §FR-042]
- [ ] CHK056 - Are validation constraints for meal rates (FR-043) specified — minimum (> ₹0), maximum, decimal places, and currency unit? [Clarity, Spec §FR-043]
- [ ] CHK057 - Is the effective date of a rate change (FR-043) precisely defined — is "the date it is saved" the IST calendar date of save, or the exact UTC timestamp? [Clarity, Spec §FR-043]
- [ ] CHK058 - Are requirements defined for hostelers on the submission page at the exact moment the owner changes the deadline — do they see the new deadline immediately or on next page load? [Edge Case, Gap]
- [ ] CHK059 - Is there a requirement to display current deadline and current rates on the settings page before editing — are read and write views the same page? [Completeness, Gap]
- [ ] CHK060 - Are requirements defined for resetting rates or the deadline to a default — is there a "revert to default" action, or are all values treated as permanent overrides? [Coverage, Gap]

---

## Progressive Web App

- [ ] CHK061 - Is "installable as a standalone PWA" (FR-045) specified with minimum web app manifest requirements — icon sizes, theme color, background color, start URL, display mode? [Completeness, Spec §FR-045]
- [ ] CHK062 - Is the iOS Safari install prompt requirement (FR-046) technically feasible — iOS Safari does not support `beforeinstallprompt`; are requirements updated to reflect a manual "Add to Home Screen" instruction instead? [Clarity, Spec §FR-046]
- [ ] CHK063 - Is FR-047 (offline app shell) specified with clarity on scope — does "app shell" include any cached data (e.g., today's submission state) or only structural layout and navigation? [Clarity, Spec §FR-047]
- [ ] CHK064 - Are requirements defined for service worker update behavior — when does a new deployment reach users (immediate, on next visit, on next backgrounding)? [Coverage, Gap]
- [ ] CHK065 - Are PWA icon requirements specified for both Android (PNG, multiple sizes) and iOS (Apple touch icon)? [Completeness, Gap]
- [ ] CHK066 - Are offline error states (FR-047) specified for each data-dependent page — what does a hosteler see on the submission page, history page, and bill page when offline? [Coverage, Spec §FR-047]

---

## Data Backup

- [ ] CHK067 - Is "nightly" backup schedule (FR-048) quantified with the exact cron expression — the Assumptions section states 2:00 AM IST, but this should be a traceable requirement, not only an assumption? [Completeness, Spec §FR-048, Assumptions]
- [ ] CHK068 - Is "full database backup" (FR-048) defined — does it include schema, data, or both; does it include storage bucket contents or only PostgreSQL tables? [Clarity, Spec §FR-048]
- [ ] CHK069 - Are backup file naming conventions specified — are they structured to support the 90-day automated deletion (FR-049)? [Completeness, Gap]
- [ ] CHK070 - Is the 90-day retention deletion (FR-049) specified as automated (lifecycle policy on R2) or requiring manual cron job — and which is preferred? [Clarity, Spec §FR-049]
- [ ] CHK071 - Is the "alert notification" channel for backup failure (FR-050) specified — email, webhook, GitHub Actions notification — and is "within 15 minutes" (SC-006) a traceable requirement linked from FR-050? [Clarity, Spec §FR-050, SC-006]
- [ ] CHK072 - Are requirements defined for backup restoration — is a documented restoration procedure in scope for v1, or explicitly deferred? [Coverage, Gap]
- [ ] CHK073 - Is the Cloudflare R2 authentication method (service account keys, API tokens) specified in requirements, or only implied by the infrastructure section of the constitution? [Completeness, Constitution §V]

---

## CI/CD Pipeline

- [ ] CHK074 - Is the test job scope (FR-051) specified — which test suites, file patterns, or coverage targets must pass? [Completeness, Spec §FR-051]
- [ ] CHK075 - Are pipeline trigger conditions specified beyond what FR-052 states — does the pipeline run on all branches, only on `main`, or on both `main` and pull requests? [Clarity, Spec §FR-052]
- [ ] CHK076 - Is there a requirement for the pipeline on pull requests that mirrors the push-to-main behavior — is PR gate enforcement explicitly required? [Coverage, Gap]
- [ ] CHK077 - Are requirements for pipeline job failure notifications specified — does the owner or engineering team receive an alert on CI failure? [Completeness, Gap]
- [ ] CHK078 - Are requirements defined for the pipeline's behavior on a flaky test (intermittent failure) — is re-run on failure permitted, or is a single failure always a block? [Edge Case, Gap]
- [ ] CHK079 - Is the `.github/workflows/ci.yml` file path (Constitution §VIII) a requirement traceable from the spec, or only a constitution-level implementation detail? [Consistency, Constitution §VIII, Spec §FR-052]

---

## Non-Functional Requirements

- [ ] CHK080 - Are WCAG 2.1 AA compliance requirements (Constitution §I) specified with measurable detail in the spec — minimum contrast ratios, minimum tap target sizes, specific keyboard navigation requirements? [Completeness, Gap]
- [ ] CHK081 - Is the 375px mobile-first constraint (Constitution §I) reflected in per-screen layout requirements — are any spec requirements device-specific or assumed to be mobile-first by default? [Consistency, Constitution §I]
- [ ] CHK082 - Is the 100-hosteler concurrency requirement (SC-010) backed by specific non-functional requirements — are there database indexing, Supabase connection pooling, or rate-limiting requirements? [Completeness, Spec §SC-010]
- [ ] CHK083 - Are response time requirements specified per operation type — is SC-001 (30-second end-to-end) the only timing requirement, or are per-API-call latency targets defined? [Completeness, Spec §SC-001]
- [ ] CHK084 - Are RLS policy requirements specified per table — for each entity (hostelers, food_preferences, bills, settings), is the read/write access rule documented in requirements? [Completeness, Constitution §III]
- [ ] CHK085 - Is horizontal scrolling prohibition (Constitution §I) measurable as a testable requirement — is there a defined set of screens and viewport widths to validate? [Measurability, Constitution §I, Spec §SC-007]
- [ ] CHK086 - Are security requirements for PIN storage (bcryptjs hash) specified in the spec, or only in the constitution — is there a spec-level requirement traceable to hashing? [Consistency, Constitution §III, Gap]

---

## Acceptance Criteria Quality

- [ ] CHK087 - Are "within X seconds" success criteria (SC-001, SC-003, SC-006) defined with measurement conditions — what network profile (4G, Wi-Fi), what device class, and what data volume are assumed? [Measurability, Spec §SC-001, SC-003, SC-006]
- [ ] CHK088 - Is SC-002 (PWA install within 5 seconds of first mobile visit) measurable — what starts and ends the 5-second window, and does it account for iOS Safari's manual installation flow? [Measurability, Spec §SC-002]
- [ ] CHK089 - Is SC-004 (bill generation accuracy) measurable without a reference dataset — is there a specified test case with known inputs and expected outputs? [Measurability, Spec §SC-004]
- [ ] CHK090 - Is SC-007 (no horizontal scrolling on 375px) defined with a comprehensive scope — is there a list of all screens and states to be validated? [Measurability, Spec §SC-007]
- [ ] CHK091 - Are the acceptance scenarios in User Stories 1–10 traceable to their corresponding functional requirements (FR-013–FR-052) — are any scenarios orphaned from FRs? [Traceability, Spec §US-001–US-010]
- [ ] CHK092 - Are all 10 success criteria (SC-001–SC-010) each traceable to at least one functional requirement that directly enables them? [Traceability, Spec §SC-001–SC-010]

---

## Dependencies & Assumptions

- [ ] CHK093 - Is the Supabase free-tier inactivity pause risk (Constitution §V) mitigated by a documented requirement — is there a specified mechanism (e.g., scheduled health-check ping) to maintain daily activity? [Assumption, Constitution §V]
- [ ] CHK094 - Are the default meal rates (Breakfast ₹30, Lunch ₹50, Dinner ₹40) specified as seeded configuration values, not hardcoded constants — is there a migration or seed requirement for initial settings? [Assumption, Spec §Assumptions]
- [ ] CHK095 - Is the assumption that "all users are on mobile" validated against requirements that are desktop-only in practice — does the CSV export (FR-034) require a file download mechanism that is specified for mobile browsers? [Assumption, Consistency, Spec §FR-034]
- [ ] CHK096 - Is the assumption of a single-property PG (no multi-property) explicitly captured as an out-of-scope exclusion, ensuring no data model decisions inadvertently create multi-tenancy complexity? [Assumption, Spec §Assumptions]
- [ ] CHK097 - Is the assumption that bill generation is always owner-triggered (never automatic) enforced by a spec requirement, or only stated in assumptions? [Assumption, Spec §Assumptions, FR-035]
- [ ] CHK098 - Are external service dependencies (Supabase, Cloudflare Pages, Cloudflare R2, Google OAuth) documented as assumptions with fallback or degradation behavior specified for each? [Dependencies, Gap]

---

## Ambiguities & Conflicts

- [ ] CHK099 - Is there a potential conflict between FR-014 (hosteler can update before deadline) and FR-015 (server blocks after deadline) regarding clock skew — if the client and server clocks differ, is the server clock always authoritative, and is this stated explicitly? [Conflict, Spec §FR-014, FR-015]
- [ ] CHK100 - Is there an ambiguity in "food preferences always submitted for the next calendar day" (Assumptions) for the edge case of submission at exactly 11:59 PM IST — which "next day" is the target? [Ambiguity, Spec §Assumptions, FR-013]
- [ ] CHK101 - Is there a potential conflict between FR-003 (invite expires 7 days after generation) and FR-029 (owner can reset invite) for a pending hosteler with a still-valid link — does reset require the old link to still be valid or can it be triggered at any time? [Consistency, Spec §FR-003, FR-029]
- [ ] CHK102 - Is there an ambiguity in FR-037 (rate changes during billing month) when a rate changes multiple times within one month — is only the most recent change applied per day, or is the full rate history traversed per date? [Ambiguity, Spec §FR-037]
- [ ] CHK103 - Are the terms "active," "pending," and "inactive" used consistently across all requirements, acceptance scenarios, and edge cases — is there any location where these states are used interchangeably or inconsistently? [Consistency, Spec §FR-025, Key Entities]

---

## PRIORITY ACTION SUMMARY

### ✓ Completed in Phase 19
- CHK007: Post-login redirects (PIN activation → login with success message)
- CHK019: Copy feedback confirmation (2-sec status indicator with aria-live)
- CHK034: Destructive action guard (delete room confirmation dialog)

### ⚠️ Phase 20 — HIGH-IMPACT GAPS (Blocking v1 or QA testing)

**Category 1: PWA Requirements (CHK061-CHK066) — REQUIRED FOR v1**
- [ ] **CHK061**: Define manifest.json (icons 192px/512px, theme/bg color, display, start_url)
- [ ] **CHK062**: Clarify iOS: replace `beforeinstallprompt` with manual "Add to Home Screen" instructions
- [ ] **CHK063**: Offline app shell scope (layout-only vs cached submission state)
- [ ] **CHK064**: Service worker update strategy (immediate/lazy/on-background)
- [ ] **CHK065**: Icon specifications (Android PNG multi-size + iOS Apple touch icon)
- [ ] **CHK066**: Offline error states per page (submission/history/bill views)

**Category 2: Session & Edge Cases (CHK002, CHK005-006, CHK026, CHK036, CHK058)**
- [ ] **CHK002**: Duplicate activation handling (already-activated hosteler retries)
- [ ] **CHK005-006**: Session expiry clarification (last-login vs idle timeout, mid-action recovery)
- [ ] **CHK026**: Realtime connection loss (stale data warning vs silent lag)
- [ ] **CHK036**: Real-time deactivation (logged-in hostelers immediately logout?)
- [ ] **CHK058**: Live deadline change (hostelers see new deadline immediately?)

**Category 3: Billing & Rates (CHK046-054, CHK102)**
- [ ] **CHK046**: Proration rule for mid-month rate changes (old rate / new rate / split?)
- [ ] **CHK102**: Multi-rate-change handling (most recent per day or full traversal?)

**Category 4: Measurability (CHK087-090)**
- [ ] **CHK087-088**: Define network profile for timing SCs (4G/WiFi, device class, data volume)
- [ ] **CHK089**: Create reference bill test case (known inputs → expected outputs)
- [ ] **CHK090**: Document comprehensive mobile scope (375px no-h-scroll validation checklist)

**Category 5: Accessibility & Mobile (CHK020, CHK038, CHK080-085)**
- [ ] **CHK020**: Meal toggle keyboard navigation + screen reader labels
- [ ] **CHK038**: Hosteler table keyboard navigation + row identification
- [ ] **CHK080-085**: WCAG 2.1 AA, contrast ratios, tap target sizes (44px minimum)

**Category 6: Deferred (Non-Blocking v1)**
- [N/A] **CHK067-073**: Data backup/recovery → operational Phase 2+ responsibility
- [N/A] **CHK074-079**: CI/CD pipeline detail → use current vitest + GitHub Actions as baseline

### Next Steps
1. **Assign spec updates** for High-Impact categories (PWA, session edge cases, billing)
2. **Create Phase 20 tasks** for each unchecked item in Categories 1-5
3. **Mobile validation** of new dialog/room features at 375px (Android Chrome)
4. **Test execution** against updated spec before QA signoff

---

## Notes

- Check items off as completed: `[x]`
- Use `[N/A]` for items intentionally excluded from scope with a brief justification
- Add inline findings when a checklist item reveals a gap that requires spec amendment
- Items are numbered CHK001–CHK103 for traceability to review comments and spec update PRs
