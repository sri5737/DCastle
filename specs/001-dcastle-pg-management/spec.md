# Feature Specification: Deekshana Castle PG Management App (Full Application — v1.3)

**Feature Branch**: `001-dcastle-pg-management`

**Created**: 2026-07-03

**Updated**: 2026-07-10

**Status**: Draft

**Latest Update**: Added comprehensive billing and owner management functionality (User Stories 14-21): Building/Room Management, Room Rent Management with Effective Dates, Meal Rate Management with Effective Dates, Mess Facilities Assignment, Billing Generation & Transmission (two-phase), Employee Management with Salary Tracking, Profit Margin Dashboard, and Available Cot Dashboard. Includes 55 new functional requirements (FR-084 through FR-138), 13 new success criteria (SC-018 through SC-030), and 12 new key entities.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Hosteler Submits Daily Food Preferences (Priority: P1)

A hosteler opens the app on their phone, sees whether they have already submitted for tomorrow, toggles which meals they want (breakfast, lunch, dinner), and saves their preferences before the daily deadline. They can update their selection at any time before the deadline.

**Why this priority**: This is the core daily action the entire system is built around. Without it, no other feature has value. Every other story depends on food preferences being submitted.

**Independent Test**: Can be tested end-to-end by having a registered hosteler log in, navigate to the submission page, toggle meals, and save — then verify the saved selection is reflected on their dashboard and in the owner's count.

**Acceptance Scenarios**:

1. **Given** a logged-in hosteler who has not yet submitted for tomorrow, **When** they open the submission page, **Then** all three meal toggles are off and a "Save Preferences" button is enabled.
2. **Given** a logged-in hosteler who has already submitted, **When** they open the submission page, **Then** their previously selected meals are pre-filled and they can change them before the deadline.
3. **Given** a logged-in hosteler, **When** they save preferences, **Then** their dashboard immediately shows a green confirmation with the selected meals.
4. **Given** the current time is past the configured daily deadline, **When** a hosteler opens the submission page, **Then** all toggles are read-only and a message explains submissions are closed with the deadline time shown.
5. **Given** the current time is within 2 hours of the deadline, **When** a hosteler views their dashboard, **Then** a countdown banner is visible warning them of the approaching deadline.

---

### User Story 2 — Owner Views Live Daily Food Counts (Priority: P1)

The owner opens the admin dashboard and immediately sees how many hostelers have opted for breakfast, lunch, and dinner for tomorrow. The counts update live as hostelers submit or change their preferences. The owner can also see which hostelers have not yet submitted.

**Why this priority**: Tied with food submission as the primary reason for building the app — it replaces the owner's manual WhatsApp counting process. Without live counts, the app delivers no value to the owner.

**Independent Test**: Can be tested by having the owner open the dashboard while one or more hostelers submit preferences in real time — counts should increment without refreshing the page.

**Acceptance Scenarios**:

1. **Given** the owner is on the admin dashboard, **When** a hosteler submits or changes preferences, **Then** the meal count cards update automatically within a few seconds without a page refresh.
2. **Given** the owner is on the admin dashboard, **When** viewing the pending list, **Then** it shows only hostelers who have not yet submitted for tomorrow, with name and room number.
3. **Given** the owner is on the admin dashboard, **When** viewing the submitted list, **Then** it is collapsible and lists hostelers who have submitted.
4. **Given** it is any time of day, **When** the owner views the dashboard, **Then** a deadline countdown is visible showing time remaining for hostelers to submit.

---

### User Story 3 — New Hosteler Activates Account via Invite Link (Priority: P2)

The owner registers a new hosteler by entering their name, phone number, and room number. The system generates a unique invite link the owner shares via WhatsApp. The hosteler opens the link, is welcomed by name, and activates their account using Google sign-in or by setting a 4-digit PIN tied to their phone number. For already active PIN-linked hostelers, an owner-regenerated invite link also serves as a secure owner-assisted forgot-PIN path to set a new PIN.

**Why this priority**: Hostelers cannot log in without first activating their account. This story gates all hosteler functionality.

**Independent Test**: Can be tested by the owner adding a new hosteler, copying the invite link, opening it as the new hosteler, and completing activation — then verifying the hosteler can log into the app. It can also be tested by regenerating an invite for an already active PIN-linked hosteler and verifying the link completes a one-time PIN reset.

**Acceptance Scenarios**:

1. **Given** the owner has filled in name, phone, and room number, **When** they submit the form, **Then** a unique invite link is generated and displayed with a copy button.
2. **Given** a hosteler opens a valid, unexpired invite link, **When** the page loads, **Then** they see a welcome message with their name and room number.
3. **Given** a hosteler on the invite page chooses Google sign-in, **When** they complete Google authentication, **Then** their account is activated and they are redirected to the hosteler dashboard.
4. **Given** a hosteler on the invite page chooses PIN setup, **When** they enter their phone (pre-filled, read-only), set a 4-digit PIN, and confirm it, **Then** their account is activated and they are redirected to the dashboard.
5. **Given** a hosteler opens an invite link that has expired (older than 7 days), **When** the page loads, **Then** they see an error message telling them to contact the PG owner for a new link.
6. **Given** an invite link has been used successfully, **When** someone attempts to reuse the same link, **Then** it is rejected as already activated.
7. **Given** an owner regenerates an invite link for an already active PIN-linked hosteler who forgot their PIN, **When** the hosteler opens a valid, unexpired regenerated link, **Then** they are shown a secure owner-assisted PIN reset flow (not a new-account activation flow).
8. **Given** an active PIN-linked hosteler completes the PIN reset flow, **When** they submit and confirm a new 4-digit PIN, **Then** the old PIN becomes invalid at the moment the reset success response is returned, the reset token is marked used, and any subsequent PIN login attempt with the old PIN is rejected while the new PIN is accepted immediately.
9. **Given** an active hosteler account is linked only to Google and has no PIN credential, **When** that hosteler opens a regenerated invite intended for PIN recovery, **Then** PIN reset is not performed and the UI shows the exact instruction: "This account is linked to Google sign-in. Continue with your linked Google account.".
10. **Given** an owner has regenerated a newer invite token before a hosteler submits an older already-open reset page, **When** the hosteler tries to submit the old page, **Then** submission fails with HTTP 409 and a structured `invite_superseded` error response and the UI requires reopening the latest invite link.

---

### User Story 4 — Hosteler Logs In on Subsequent Visits (Priority: P2)

A returning hosteler opens the app and signs in using the credential they linked during activation: Google if they activated with Google, or their phone number and PIN if they activated with PIN. In v1, they are not required to add the second credential later. If they forget a PIN-linked credential, the owner can regenerate an invite link that provides a secure owner-assisted PIN reset path. They remain logged in for 30 days without needing to re-authenticate.

**Why this priority**: Friction-free login is critical for daily usage compliance. If login is cumbersome, hostelers will not use the app.

**Independent Test**: Can be tested by activating one account with Google and another with PIN, closing the browser, reopening, and verifying each account can log in only with its linked credential while the session persists for 30 days.

**Acceptance Scenarios**:

1. **Given** an active hosteler whose account was activated with Google, **When** they sign in with the same linked Google account, **Then** they are redirected to their dashboard without any manual steps.
2. **Given** an active hosteler whose account was activated with PIN, **When** they enter their phone number and correct 4-digit PIN, **Then** they are logged in and redirected to their dashboard.
3. **Given** an active hosteler whose account does not have a PIN credential linked, **When** they attempt phone-plus-PIN login, **Then** login is rejected and the UI tells them to use their linked Google sign-in.
4. **Given** an active hosteler whose account is not linked to Google, **When** they attempt Google sign-in, **Then** login is rejected and the UI tells them to use their linked phone number and PIN.
5. **Given** an active hosteler with a PIN-linked account, **When** they enter an incorrect PIN, **Then** they see an error message and are not logged in.
6. **Given** a Google account not linked to any registered hosteler, **When** the user attempts to sign in with Google, **Then** they see a message: "You are not registered. Contact your PG owner."
7. **Given** a hosteler is logged in, **When** 30 days have not yet elapsed, **Then** they remain logged in and do not need to re-authenticate.
8. **Given** an active PIN-linked hosteler has reset their PIN via a valid owner-regenerated invite, **When** they attempt login with the previous PIN, **Then** login is rejected.
9. **Given** an active PIN-linked hosteler has reset their PIN via a valid owner-regenerated invite, **When** they login with phone number and the new PIN, **Then** login succeeds immediately with normal session behavior.

---

### User Story 5 — Owner Manages Hosteler Registrations (Priority: P2)

The owner views all hostelers grouped by status (active, pending, inactive, deleted), can generate a new invite link for anyone, deactivate active hostelers, reactivate inactive ones, and delete active or pending hostelers while preserving owner-visible audit records.

**Why this priority**: Essential for keeping the system accurate as hostelers move in and out of the PG.

**Independent Test**: Can be tested by adding hostelers, deactivating one, reactivating one, deleting one pending hosteler, deleting one active hosteler, and generating a new invite — verifying status transitions, access revocation, and deleted-record visibility are reflected correctly.

**Acceptance Scenarios**:

1. **Given** the owner is on the hostelers page, **When** they switch tabs, **Then** each tab shows only hostelers with the matching status (active, pending, inactive, deleted).
2. **Given** an active hosteler with no future food preferences, **When** the owner clicks "Deactivate", **Then** the hosteler's status changes to inactive and they can no longer log in. **Given** an active hosteler who has food preferences recorded for future dates, **When** the owner clicks "Deactivate", **Then** a confirmation dialog appears: "This hosteler has submitted preferences for [N] future dates. These will remain and be included in billing. Deactivate anyway?" and the deactivation only proceeds if the owner confirms.
3. **Given** an inactive hosteler, **When** the owner clicks "Reactivate", **Then** the hosteler's status changes to active and they can log in again.
4. **Given** any hosteler, **When** the owner clicks "Reset", **Then** a new single-use invite link is generated (the old unused invite link is invalidated) and shown with a copy button. **And Given** the target hosteler is active and PIN-linked, **When** they open that regenerated link, **Then** the link starts a secure owner-assisted forgot-PIN reset flow.
5. **Given** an active hosteler, **When** the owner clicks "Delete", **Then** a confirmation explains that the hosteler will be treated as moved out of the PG, login access will be revoked, past and same-day owner-visible tracking history will be preserved, any future-dated food preferences after the deletion takes effect will be canceled, and the deletion only proceeds if the owner confirms.
6. **Given** the owner confirms deletion of an active hosteler, **When** the action completes, **Then** the hosteler no longer appears in the active, pending, or inactive tabs, appears in the deleted tab, their previously recorded past and same-day owner-visible history remains available for tracking and audit, and any food preferences whose record date is later than the deletion effective date are canceled, remain visible only inside that deleted hosteler's dedicated deleted/audit view, and are excluded from normal owner history/export, future operational counts, and billing.
7. **Given** a pending hosteler, **When** the owner clicks "Delete", **Then** the hosteler is permanently and irreversibly deleted from the database (hard delete), any unused invite is invalidated, and no record of the hosteler appears in the deleted tab — the deletion leaves no trace visible to the owner.
8. **Given** the owner fills in the add-hosteler form with a mobile number already registered to an active hosteler, **When** they submit the form, **Then** registration is rejected and the owner sees an error: "This mobile number is already registered to an active hosteler."
9. **Given** the owner fills in the add-hosteler form with a mobile number that was previously associated with a permanently deleted (hard-deleted) pending hosteler, **When** they submit the form, **Then** registration is permitted, allowing the person to rejoin the hostel with the same phone number.

---

### User Story 6 — Owner Generates Monthly Bills (Priority: P3)

The owner selects a month and year and triggers bill generation. The system counts each hosteler's opted meal days, multiplies by the applicable rate (accounting for any mid-month rate changes), and produces a bill summary for every hosteler whose preserved, non-canceled meal history is billable for that month, including active hostelers plus inactive or deleted-from-active hostelers whose retained history falls inside the selected month.

**Why this priority**: Billing is the financial core of the PG business, but it is needed only once per month and is secondary to the daily operational workflows.

**Independent Test**: Can be tested by seeding food preference data for a month with a mid-month rate change, triggering bill generation, and verifying that days before and after the rate change use the correct rates.

**Acceptance Scenarios**:

1. **Given** the owner selects a month and year, **When** they click "Generate Bills", **Then** bills are computed for all hostelers with preserved, non-canceled billable history in that month, including active hostelers plus inactive or deleted-from-active hostelers whose retained history falls inside the selected month, with accurate meal counts and amounts.
2. **Given** a meal rate changed mid-month, **When** bills are generated for that month, **Then** days before the change use the old rate and days after use the new rate.
3. **Given** bills have been generated, **When** the owner views the bills table, **Then** each row shows the hosteler's name, room, meal day counts, and total amount.
4. **Given** the owner clicks on a hosteler's row, **When** the detail view opens, **Then** a per-day breakdown shows which meals were opted on each date.
5. **Given** bills have already been generated for a month, **When** the owner regenerates them, **Then** the previous bills are replaced with updated figures.

---

### User Story 7 — Hosteler Views Food History (Priority: P3)

A hosteler selects a month and views a day-by-day list of which meals they opted for, along with monthly totals for each meal type.

**Why this priority**: Transparency feature that helps hostelers verify their own record before billing. Important but not blocking the daily workflow.

**Independent Test**: Can be tested by submitting preferences over several days and verifying the history page shows accurate per-day and monthly summary data.

**Acceptance Scenarios**:

1. **Given** a logged-in hosteler, **When** they open the history page, **Then** the current month is selected by default and each submitted day is listed.
2. **Given** a hosteler selects a different month, **When** the view updates, **Then** it shows only records for the selected month.
3. **Given** a hosteler views any month, **When** the page loads, **Then** a summary row shows the total breakfast, lunch, and dinner days for that month.

---

### User Story 8 — Hosteler Views Monthly Bill (Priority: P3)

A hosteler selects a month and sees a breakdown of their meal counts, the rate per meal, the subtotal per meal type, and the overall total for the month. A note indicates the bill is confirmed by the owner.

**Why this priority**: Allows hostelers to understand their charges independently, reducing disputes and questions to the owner.

**Independent Test**: Can be tested after the owner generates a bill — the hosteler should see accurate figures matching the owner's bill view.

**Acceptance Scenarios**:

1. **Given** the owner has generated a bill for a month, **When** the hosteler views that month's bill, **Then** they see meal counts, rates, subtotals, and a highlighted total.
2. **Given** no bill has been generated yet for a month, **When** the hosteler selects that month, **Then** the view indicates the bill is not yet available.

---

### User Story 9 — Owner Views and Exports Food History (Priority: P3)

The owner filters food history by a specific hosteler and/or date range, views the results in a table, and can export the data as a CSV file.

**Why this priority**: Operational record-keeping and dispute resolution. Needed periodically, not daily.

**Independent Test**: Can be tested by filtering by a specific hosteler over a date range and verifying the exported CSV matches the on-screen data.

**Acceptance Scenarios**:

1. **Given** the owner applies a hosteler filter, **When** the table refreshes, **Then** only records for that hosteler are shown.
2. **Given** the owner applies a date range filter, **When** the table refreshes, **Then** only records within that range are shown.
3. **Given** the owner clicks "Export CSV", **When** the download completes, **Then** the file contains all rows visible in the current filtered table view.

---

### User Story 10 — Owner Configures Deadline and Meal Rates (Priority: P3)

The owner updates the daily food submission deadline time and adjusts per-meal rates. Rate changes are effective from the day they are saved.

**Why this priority**: Configuration is needed infrequently and changes only affect future submissions and billing.

**Independent Test**: Can be tested by changing the deadline and verifying the submission form locks at the new time; then changing a rate and verifying new bills use the updated rate from that day forward.

**Acceptance Scenarios**:

1. **Given** the owner saves a new deadline time, **When** hostelers open the submission page after that time the same day, **Then** the form is locked with the updated deadline shown.
2. **Given** the owner saves a new rate for a meal, **When** bills are generated for a period spanning the change date, **Then** days up to and including the save date use the old rate, and days from the next calendar day onward use the new rate.
3. **Given** the owner saves settings, **When** any hosteler views the submission page, **Then** the new deadline time is reflected in countdowns and lock messages.

---

### User Story 11 — User Installs the App as an Android PWA (Priority: P1)

A hosteler or owner opens the website on Android Chrome, receives an install option when the browser determines the app is installable, installs it, and then sees Deekshana Castle in the Android app drawer alongside normal native apps. When launched from the app drawer, the app opens in a standalone app window and can show the core app shell even if the network is unavailable.

**Why this priority**: Daily food submission is phone-first behavior. Android app drawer presence makes the app feel like a normal daily-use app instead of a link users must remember to reopen in the browser.

**Independent Test**: Can be tested on Android Chrome by opening the website, verifying install eligibility, installing the app, confirming the launcher/app-drawer icon appears, launching from that icon, and verifying standalone display plus offline app shell behavior.

**Acceptance Scenarios**:

1. **Given** a user opens the website on Android Chrome on a supported device, **When** the browser determines the app is installable, **Then** the user is shown an install action that clearly installs Deekshana Castle as an app.
2. **Given** the user accepts the install action, **When** installation completes, **Then** a Deekshana Castle icon appears in the Android app drawer alongside native apps.
3. **Given** the app has been installed on Android, **When** the user launches it from the app drawer, **Then** it opens in a standalone app window without the browser address bar.
4. **Given** the app has been installed and the device is offline, **When** the user launches the app, **Then** the cached app shell loads with navigation and layout visible, while data actions that require connectivity show an offline state instead of a broken page.
5. **Given** the app is already installed or the browser has not reported install eligibility, **When** the user visits the website, **Then** the app does not show a misleading or non-functional install prompt.

---

### User Story 12 — Server-Side Auth Proxy for Reliable Login (Priority: P3)

The owner login and hosteler PIN login currently call Supabase Auth directly from the browser. In corporate network environments with SSL inspection or proxy appliances, this causes intermittent CORS and network failures because the browser request to supabase.co gets intercepted or blocked. This story routes all authentication calls through server-side API routes (e.g., /api/auth/login) so the Next.js server handles the Supabase communication, where TLS configuration and retry logic can be managed centrally, eliminating browser-side CORS failures entirely.

**Why this priority**: This is a non-functional reliability improvement, not a new user-facing feature. The current client-side auth works correctly in most environments. This becomes important only when users operate behind restrictive corporate proxies or SSL inspection appliances.

**Independent Test**: Can be tested by configuring the owner login and hosteler PIN login to route through the server-side API route, then verifying that authentication succeeds when the browser is behind a proxy that blocks direct requests to supabase.co, and that existing login flows continue to work identically from the user's perspective.

**Acceptance Scenarios**:

1. **Given** an owner on the login page, **When** they submit their email and password, **Then** the authentication request is handled by a server-side API route rather than a direct browser call to Supabase, and login succeeds as before.
2. **Given** a hosteler on the PIN login page, **When** they submit their phone number and PIN, **Then** the authentication request is handled by a server-side API route rather than a direct browser call to Supabase, and login succeeds as before.
3. **Given** a user behind a corporate proxy that blocks direct browser requests to supabase.co, **When** they attempt to log in, **Then** authentication succeeds because the server-side route handles the Supabase communication without browser CORS restrictions.
4. **Given** the server-side auth route encounters a transient TLS or network error communicating with Supabase, **When** the error is retryable, **Then** the route retries the request before returning a failure to the client.
5. **Given** a user logs in via the server-side auth proxy, **When** authentication completes, **Then** the session is established identically to the previous client-side flow with no change in user experience, session duration, or behavior.

---

### User Story 13 — Users Operate the App on Their Primary Devices (Priority: P1)

**Hostelers use Android mobile phones** as their primary device for the app. The app layout behaves like a purpose-built mobile app: navigation is reachable without desktop assumptions, controls are touch-friendly at 375 px width, text remains readable, and no screen creates horizontal overflow.

**Owners use tablets (iPad-like, 768px+)** as their primary device for the app. The app layout is optimized for tablet usability: dashboards, hosteler tables, and settings use the full tablet width for data density and clarity. Mobile (375 px) rendering is a bonus; mobile breakage is acceptable.

**Authentication screens** (hosteler login, invite activation, PIN reset, owner login) are used by both roles on mobile devices and MUST work seamlessly at 375 px width regardless of the destination role.

**Why this priority**: 
- Hostelers submit meals daily on phones; if the mobile layout breaks, users cannot complete the core workflow. 
- Owners manage the system primarily from tablets while monitoring hosteler counts and managing registrations; tablet usability ensures efficient owner operations. 
- Authentication flows must be mobile-first because both roles authenticate on phones or other mobile-first scenarios.

**Independent Test**: 
- Hosteler screens: Open each completed hosteler-facing screen at 375 px Android mobile viewport and complete the core flows (login, submission, history, billing, settings) without horizontal scrolling or unreachable actions.
- Owner screens: Open each completed owner-facing screen at 768 px tablet viewport and complete core owner flows (dashboard, hosteler management, billing, settings) with proper data density and layout.
- Auth screens: Verify login, invite activation, and PIN reset screens work flawlessly at 375 px mobile width.

**Acceptance Scenarios**:

1. **Given** a completed hosteler-facing screen is opened on Android Chrome at 375 px width, **When** the hosteler views and interacts with the screen, **Then** all content fits within the viewport with no horizontal scrolling, clipped primary content, or overlapping controls.
2. **Given** a completed owner-facing screen is opened on a tablet viewport at 768 px or wider, **When** the owner reviews dashboards, hosteler tables, forms, dialogs, and action controls, **Then** the layout uses the full tablet width for data visibility and clarity without cramped or redundant spacing.
3. **Given** authentication screens (hosteler login, invite activation, PIN reset, owner login) are accessed on mobile, **When** a user completes authentication, **Then** the screen is fully usable at 375 px width with proper spacing, readable text, and touch-friendly controls.
4. **Given** an owner-facing screen is tested on Android mobile at 375 px width, **When** layout or functionality breaks, **Then** breakage is acceptable and does not block task completion. The owner primarily uses tablets; mobile rendering is an optional bonus.
5. **Given** a hosteler-facing screen is tested on tablet at 768 px or wider, **When** the screen renders at full tablet width, **Then** rendering is a bonus. Hosteler screens are optimized for mobile baseline; tablet rendering beyond mobile optimization is not required.
6. **Given** any hosteler-facing screen is marked complete, **When** acceptance evidence is recorded, **Then** the evidence includes mandatory validation at the 375 px mobile baseline. Tablet evidence is optional.
7. **Given** any owner-facing screen is marked complete, **When** acceptance evidence is recorded, **Then** the evidence includes mandatory validation at 768 px tablet width. Mobile (375 px) evidence is optional.

---

### User Story 14 — Owner Manages Buildings, Rooms, and Room Types (Priority: P3)

The owner creates hostel buildings, adds rooms within each building (optionally assigning to floors), and configures room templates/types using a fixed dropdown with two values: AC and non-AC. Each room type also carries its sharing capacity (for example, 1-sharing, 2-sharing, 4-sharing). Each room has a dynamic effective configuration that can be changed over time: sharing capacity, AC/non-AC class, and rent inputs used for billing. Cot assignments support different cot types (lower cot, upper cot). This structure enables the owner to track room inventory, change commercial room configuration without altering past bills, and assign hostelers to specific rooms and cot positions for accurate rent and facility tracking.

**Why this priority**: Room and building management is essential infrastructure for accurate billing and asset management, but it is a setup task performed infrequently (typically once during deployment and occasionally as the hostel expands).

**Independent Test**: Can be tested by creating a building, adding rooms with different floors and room types, configuring cot assignments, and verifying the building/room hierarchy is queryable for later hosteler assignment.

**Acceptance Scenarios**:

1. **Given** the owner is on the buildings/rooms configuration page, **When** they click "Add Building", **Then** a form appears allowing building name entry and creation.
2. **Given** a building has been created, **When** the owner clicks "Add Room" within that building, **Then** they can specify room number, floor (ground/first/second or null), and initial room configuration (sharing capacity and AC/non-AC).
3. **Given** the owner creates a new room template/type, **When** they define it, **Then** they choose AC or non-AC from a dropdown and specify the sharing capacity for that room type.
4. **Given** a room has active configuration and cot inventory, **When** the owner updates sharing capacity or AC/non-AC with an effective date, **Then** future billing uses the new room configuration while past billing remains unchanged.
5. **Given** rooms and cot assignments are configured, **When** the owner views the buildings dashboard, **Then** they see a tree/hierarchical view showing buildings, their rooms, room types, and available cots.

---

### User Story 15 — Owner Manages Global Room Rent Config with Effective Dates (Priority: P3)

The owner can configure global room rent rules using: sharing capacity + room type (AC/non-AC) + effective date. Example: 1-sharing + AC = 20000. Until the effective date is reached, the UI shows a label: "Rent config will be updated on [effective date]". Rate changes support previous calendar month, current calendar month, and future dates. On the effective date, the new global rent config applies for billing calculations for that date and forward.

**Why this priority**: Rent configuration management is periodic and critical for accurate billing, but it is not performed daily. Mid-month changes are supported to reflect seasonal adjustments or policy changes.

**Independent Test**: Can be tested by setting a future global rent config change for a sharing-capacity + room-type combination, verifying the pending-change label displays, then advancing the effective date and confirming bills generated after that date use the new configured rent for rooms matching that combination.

**Acceptance Scenarios**:

1. **Given** the owner opens Room Rent Config, **When** they choose sharing capacity and room type, **Then** a form appears with a date picker and rent input field.
2. **Given** the owner enters a future effective date and new rent amount, **When** they save, **Then** a "Rent config will be updated on [date]" label appears for that sharing-capacity + room-type combination until the effective date.
3. **Given** the current date has reached the effective date of a pending rent config change, **When** billing looks up rent for that combination, **Then** the new configured rent is active.
4. **Given** the owner updates the same sharing-capacity + room-type combination again, **When** they save a subsequent change with a new effective date, **Then** the system tracks multiple history entries for accurate historical billing.
5. **Given** rent config changes exist for previous calendar months, current month, and future dates, **When** bills are generated, **Then** each day's rent is calculated using the config effective on that specific date for the room's sharing-capacity + room-type combination.

---

### User Story 16 — Owner Manages Meal Rates with Effective Dates (Priority: P3)

The owner can update meal rates (breakfast, lunch, dinner) with an effective date (using a date picker). Until the effective date is reached, the UI shows a label: "Meal rate will be updated on [effective date]". Rate changes support previous calendar month, current calendar month, and future dates. On the effective date, the new meal rates apply for billing calculations for that date and forward.

**Why this priority**: Meal rate management is periodic and less frequent than room rent changes, but it is essential for accurate monthly billing when meal service costs change seasonally.

**Independent Test**: Can be tested by setting a future meal rate change, verifying the pending-change label displays, then advancing the effective date and confirming bills generated after that date use the new rates.

**Acceptance Scenarios**:

1. **Given** the owner is on the settings page, **When** they click "Update Meal Rates", **Then** a form appears with date picker and input fields for breakfast, lunch, and dinner rates.
2. **Given** the owner enters a future effective date and new rate amounts, **When** they save, **Then** a "Meal rate will be updated on [date]" label appears in the settings until the effective date.
3. **Given** the current date has reached the effective date of a pending meal rate change, **When** the owner views settings, **Then** the label disappears and the new rates are now active.
4. **Given** meal rate changes exist for multiple months (previous, current, future), **When** bills are generated for any month, **Then** each day's meal charges are calculated using the rates effective on that specific date.

---

### User Story 17 — Owner Assigns Mess Facilities to Hostelers (Priority: P3)

The owner can specify whether each hosteler is availing mess (meal) facilities. If NOT availing, the system defaults the hosteler's food preference to NO for all three meals (breakfast, lunch, dinner); hostelers can override these daily. If YES availing, the system defaults to YES for all three meals; hostelers can override these daily. This assignment is made during hosteler registration and can be updated later.

**Why this priority**: Mess facility assignment is essential for accurate billing, as hostelers who don't avail facilities should not be charged for meals even if they accidentally submit preferences.

**Independent Test**: Can be tested by registering hostelers with different mess-facility settings, verifying their default daily food preferences, and confirming they can override those defaults if needed.

**Acceptance Scenarios**:

1. **Given** the owner is registering a new hosteler, **When** they fill in the hosteler form, **Then** they see a "Availing Mess Facilities?" toggle (defaulting to YES).
2. **Given** a hosteler with "NOT availing" mess is registered, **When** they open the food submission page for any date, **Then** all three meal toggles default to OFF, but they can manually toggle any on if needed.
3. **Given** a hosteler with "YES availing" mess is registered, **When** they open the food submission page for any date, **Then** all three meal toggles default to ON, but they can toggle any off if needed.
4. **Given** a hosteler's mess-facility status is set, **When** the owner views that hosteler's details, **Then** the current mess-facility status is displayed and can be edited.
5. **Given** the owner updates a hosteler's mess-facility status from "not availing" to "availing", **When** that hosteler next submits, **Then** the new defaults apply, but any previously submitted preferences remain unchanged.

---

### User Story 18 — Owner Generates and Transmits Hosteler Bills (Priority: P3)

The owner clicks "Generate Bill" and can generate bills for: all hostelers, a specific building, or an individual hosteler. Bills are generated separately from transmission. Once generated, the owner can view the bill before transmission. Each bill shows: room rent + food charges = total. The owner then clicks "Transmit Bill" to make the bill visible to hostelers. Bills are visible to hostelers only after transmission.

**Why this priority**: Two-phase billing (generation and transmission) provides the owner with an audit step before hostelers see final amounts, reducing disputes.

**Independent Test**: Can be tested by generating a bill, verifying the owner can view it without hostelers seeing it, then transmitting and confirming hostelers can view the transmitted bill.

**Acceptance Scenarios**:

1. **Given** the owner is on the billing page, **When** they click "Generate Bill", **Then** a dialog appears allowing them to select: All Hostelers, Specific Building, or Individual Hosteler, and a month picker.
2. **Given** the owner completes the generation dialog, **When** they click "Generate", **Then** bills are computed for the selected scope and month. Status shows "Generated, Awaiting Transmission".
3. **Given** bills have been generated, **When** the owner clicks on a hosteler's bill row, **Then** a detailed view shows room rent breakdown, meal charges by type, total amount, and a "Transmit Bill" button.
4. **Given** a bill is in "Awaiting Transmission" status, **When** the hosteler tries to view their bill, **Then** they see a "Bill not yet available" message or the bill does not appear in their bill list.
5. **Given** a bill is in "Awaiting Transmission" status, **When** the owner clicks "Transmit Bill", **Then** the bill status changes to "Transmitted" and becomes immediately visible to the hosteler.
6. **Given** a bill has been transmitted, **When** the owner regenerates bills for the same month, **Then** the old transmitted bill is replaced with the new generated bill (not transmitted until the owner chooses to transmit again).

---

### User Story 19 — Owner Manages Employee Records and Salary with Effective Dates (Priority: P3)

The owner can add employee records (name, job description, salary) for hostel staff. Salary changes are tracked with effective dates (using a date picker). Until the effective date is reached, the UI shows: "Salary will be updated on [effective date]". This creates an audit trail of hostel operations and enables salary expense tracking for profit margin calculations.

**Why this priority**: Employee management is required for operational transparency and profit margin calculations, but it is a periodic setup/update task.

**Independent Test**: Can be tested by adding employees, updating their salaries with future effective dates, and verifying the pending-change labels display correctly.

**Acceptance Scenarios**:

1. **Given** the owner is on the employee management page, **When** they click "Add Employee", **Then** a form appears for name, job description, and initial salary entry.
2. **Given** an employee has been created, **When** the owner clicks "Update Salary", **Then** a form appears with date picker and new salary input.
3. **Given** the owner enters a future effective date and new salary, **When** they save, **Then** a "Salary will be updated on [date]" label appears on the employee card until the effective date.
4. **Given** the current date has reached a pending salary change effective date, **When** the owner views the employee record, **Then** the label disappears and the new salary is active.
5. **Given** the owner views the employee list, **Then** each employee shows: name, job description, current salary, and any pending salary changes with their effective dates.
6. **Given** salary changes are tracked historically, **When** profit margin dashboards are calculated, **Then** the correct salary values are used based on the effective dates during the period.

---

### User Story 20 — Owner Views Profit Margin Dashboard (Priority: P3)

The owner selects a month and views a dashboard showing: total income (from room rent + meal charges), total expenses (sum of employee salaries + other expenses added by owner), and calculated profit (income − expenses). The owner can add line-item expenses (e.g., "EB bill ₹5000"). The dashboard is month-aware: it uses room rent rates, meal rates, and employee salaries effective for that specific month (not current month rates).

**Why this priority**: Profit tracking is essential for business decision-making, but it is a periodic review task (typically monthly).

**Independent Test**: Can be tested by seeding a month with hostelers, rooms, meal rates, employee salaries, and expenses, then verifying the dashboard correctly calculates income, expenses, and profit using the rates effective for that month.

**Acceptance Scenarios**:

1. **Given** the owner is on the profit margin dashboard, **When** they select a month using a date picker, **Then** the dashboard loads and displays income, expenses, and profit for that month.
2. **Given** the dashboard is displayed for a specific month, **When** the owner views income, **Then** it is calculated as: SUM(room rent for all billable hostelers in that month) + SUM(meal charges for all billable hostelers in that month), using rates effective for each date in that month.
3. **Given** the dashboard displays expenses, **When** the owner views it, **Then** expenses include: SUM(employee salaries for all employees, using salary effective for each date in that month) + SUM(any owner-added line-item expenses recorded for that month).
4. **Given** the owner wants to add a one-time expense, **When** they click "Add Expense", **Then** a form appears to enter description, amount, and optional date within the selected month.
5. **Given** an expense has been added to the dashboard, **When** the total expenses are recalculated, **Then** profit margin is updated: Profit = Income − Expenses.
6. **Given** a month contains mid-month rate changes (room rent, meal rates, or salary changes), **When** the dashboard calculates income and expenses, **Then** it uses the correct rates/salaries effective for each date, not applying a single blanket rate.
7. **Given** the owner views a dashboard for a past month, **When** room rent, meal rates, or employee salaries were different in that month compared to today, **Then** the dashboard correctly reflects those historical rates, not current rates.
8. **Given** the owner views the profit dashboard, **When** they click on income or expenses sections, **Then** a detailed breakdown is shown (e.g., per-hosteler room rent, per-meal-type food charges, per-employee salary).

---

### User Story 21 — Owner Views Available Cot Dashboard (Priority: P3)

The owner can view a dashboard showing all rooms, their cot inventory, and occupancy status (which cots are assigned to active hostelers, which are free). This provides a quick overview of hostel capacity and available cots for new registrations.

**Why this priority**: Cot occupancy visibility helps the owner understand capacity and plan new admissions, but it is a periodic review task.

**Independent Test**: Can be tested by assigning hostelers to specific cots, then verifying the dashboard correctly marks those cots as occupied and displays free cots available for assignment.

**Acceptance Scenarios**:

1. **Given** the owner is on the available-cot dashboard, **When** the page loads, **Then** a view shows all buildings and their rooms with cot status (occupied/free).
2. **Given** cots are displayed, **When** a cot is assigned to an active hosteler, **Then** it is marked "Occupied" with the hosteler's name and room assignment details.
3. **Given** a cot is not assigned to any active hosteler, **When** it is displayed, **Then** it is marked "Free" with its cot type (lower/upper) and room details.
4. **Given** a hosteler is deleted or deactivated, **When** the available-cot dashboard is refreshed, **Then** their previously assigned cots are marked "Free" again.
5. **Given** the owner clicks on a building, **When** the view expands, **Then** all rooms in that building and their cots are shown with clear visual distinction between occupied and free cots.

---

### Edge Cases

- What happens when a hosteler submits preferences exactly at the deadline second? → Submission is rejected server-side; client shows "closed" message.
- What happens when an invite link is opened on a device without a Google account? → PIN setup path is always available as a fallback.
- What happens when two submissions arrive simultaneously for the same hosteler and date? → The later submission silently replaces the earlier one (upsert semantics); no duplicate records are created.
- What happens if the owner generates bills for a month with no food preferences recorded? → Bills are generated with zero counts and zero totals for all hostelers.
- What happens if a hosteler is deactivated mid-month? → Their food preferences already recorded remain and are included in bill generation for that month. Additionally, food preferences submitted for future dates before deactivation also remain and are included in billing; the owner is warned about this via a confirmation dialog before the deactivation is applied.
- What happens if the client clock is ahead of or behind the server clock at the deadline boundary? → Server time (IST from API) is authoritative. The API enforces the deadline based on server time and rejects any write that arrives after the deadline regardless of what the client clock shows. Client-side countdowns are display-only and may differ slightly from server time.
- What happens if the Supabase Realtime subscription drops while the owner is viewing the dashboard? → The client silently attempts auto-reconnect. If reconnection has not succeeded within 10 seconds, a non-blocking banner "Live updates paused — reconnecting…" is shown. Meal counts remain visible but frozen until the connection is restored.
- What happens if the app is opened while offline? → The app shell loads from the local cache; data operations that require connectivity show an appropriate offline indicator.
- What happens if Android Chrome does not report install eligibility yet? → The custom install action remains hidden or disabled until install eligibility is available; the app must not present a dead install control.
- What happens if the app is already installed on Android? → The website does not continue prompting the user to install; launching from the Android app drawer opens the installed standalone app.
- What happens if an Android mobile viewport has less usable height because of browser chrome, the virtual keyboard, or standalone PWA window differences? → User-facing screens must keep primary navigation and current task actions reachable without relying on fixed desktop-height assumptions; form fields and dialogs must remain visible or scroll naturally within the vertical viewport.
- What happens if owner tables, dashboards, or hosteler history/billing views contain wide data on a 375 px Android viewport? → The screen must adapt the information into a mobile-usable layout without page-level horizontal overflow; any intentionally scrollable sub-region must be clearly bounded and must not hide primary actions off-screen.
- What happens if a completed screen passes desktop or broad responsive tests but fails in installed Android standalone mode? → The screen is not accepted as complete until standalone PWA validation passes for the applicable user flow.
- What happens when the owner regenerates invite links multiple times for the same hosteler? → Only the newest unexpired, unused token is valid; token supersession is deterministic by newest `generated_at` timestamp precedence. If timestamps are equal, the later persisted token record is treated as latest. If an older invite/reset page was already open, its submit attempt fails with HTTP 409 `invite_superseded`, and the user must reopen the latest link.
- What happens when an owner-regenerated invite token for PIN recovery is expired or already used? → Expired attempts fail with HTTP 410 `invite_expired`; used attempts fail with HTTP 409 `invite_used`; both responses instruct the hosteler to contact the owner for a fresh link.
- What happens if a regenerated invite token is opened for a hosteler who is not active (pending, inactive, or deleted) when attempting owner-assisted PIN recovery? → Owner-assisted PIN recovery is rejected with HTTP 403 `reset_not_allowed_non_active` because this reset path is active-hosteler-only.
- What happens when a PIN-linked hosteler tries their old PIN after completing owner-assisted reset? → Login with the old PIN fails immediately; only the newly set PIN is accepted.
- What happens when a hosteler's invite link expires before they activate? → The owner can generate a fresh invite link via the "Reset" action on the hostelers page.
- What happens when a deactivated hosteler's device still has an active session cookie? → The next API call returns 401 with "Account deactivated"; the client redirects to the login page.
- What happens when a hosteler enters a wrong PIN 5 times? → The phone number is locked out for 15 minutes; a message explains the cooldown.
- What happens if a hosteler tries to log in with a credential type that was not linked during activation? → Login is rejected and the UI tells them to use the credential that was actually linked during activation; v1 does not require or prompt them to add the second credential later.
- What happens if the owner regenerates a bill that a hosteler previously viewed? → The hosteler sees the updated bill on their next view; no notification is sent.
- What happens when an active hosteler is deleted after they already have food preferences or billing history? → Their previously recorded past and same-day owner-visible operational and billing history remains preserved for tracking and audit, but once deletion takes effect they immediately lose access on every device, cannot submit anything new, and any food preferences dated after the deletion effective date are canceled, remain visible only in that deleted hosteler's dedicated deleted/audit view, and are excluded from normal owner history/export, future counts, and billing.
- How is the deletion effective date applied when an active hosteler is deleted? → The deletion effective date is the IST calendar date on which the owner confirms deletion. Food preferences dated on that same IST date and any earlier IST date are preserved; food preferences dated on later IST dates are canceled. Example: if deletion is confirmed on 2026-07-04 IST, records dated 2026-07-04 and earlier are preserved, while records dated 2026-07-05 onward are canceled.
- What happens when a pending hosteler is deleted after their invite link has already been shared? → The invite becomes unusable immediately, the hosteler row is hard-deleted from the database, and no record of the hosteler is preserved — the deletion is complete and leaves no trace in the deleted tab.
- What happens if an owner tries to register a new hosteler using a mobile number already in use by an active or pending hosteler? → Registration is rejected with a clear error. The owner must resolve the conflict (deactivate or delete the existing hosteler) before re-using that mobile number.
- What happens if an owner tries to register a hosteler using a mobile number previously used by a deleted pending hosteler? → Registration is allowed. Because the pending hosteler was hard-deleted, their mobile number is free for re-registration, enabling a re-join scenario.
- What is the difference in deletion behavior between pending and active hostelers? → Pending hosteler deletion is a complete hard delete (row removed from DB, no trace left in the deleted tab). Active hosteler deletion is a soft archive (row kept, status changed to deleted) with full operational history preserved, future food preferences canceled, and the complete deletion lifecycle context retained.

---

## Requirements *(mandatory)*

### Functional Requirements

**Account Provisioning & Authentication**

- **FR-001**: The owner MUST be able to register a new hosteler by providing their full name, phone number, and room number.
- **FR-001a**: When registering a new hosteler, the system MUST validate that the provided mobile number is not already in use by a hosteler in active or pending status. If the mobile number is already registered to an active or pending hosteler, registration MUST be rejected and the owner MUST be shown a clear error message indicating the conflict.
- **FR-001b**: The system MUST permit registering a new hosteler using a mobile number that was previously associated with a permanently deleted (hard-deleted pending) hosteler record, to allow the person to rejoin the hostel. Because the pending hosteler row is completely removed with no residual record, the mobile number is fully free for re-registration.
- **FR-002**: The system MUST generate a unique, single-use invite link for each registered hosteler and for owner-triggered credential recovery when the owner regenerates an invite. **Duplicate Activation Handling**: If a hosteler attempts to use the same invite link after already activating via that link, the system MUST reject the attempt with HTTP 409 and error code `invite_used`, displaying the message "This invite link has already been used. If you need to reset your credentials, ask your PG owner to generate a new invite."
- **FR-003**: Invite links MUST expire 7 days after generation.
- **FR-004**: A new hosteler MUST be able to activate their account via the invite link using either a Google account or a 4-digit PIN linked to their phone number.
- **FR-004a**: Activation MUST link only the credential path actually completed during activation. In v1, the system MUST NOT require the hosteler to add the second credential type later in order to use the app.
- **FR-005**: The system MUST prevent activation or PIN-reset use of an invite link that has expired or has already been used.
- **FR-005b**: Owner-assisted invite-based PIN reset MUST be allowed only for hostelers currently in active status. Attempts to use this reset path for non-active statuses MUST be rejected.
- **FR-005c**: Invite tokens used for activation or owner-assisted PIN reset MUST be one-time-use. On successful completion, the token is consumed and cannot be reused.
- **FR-005d**: Invite/owner-assisted-reset submit failures MUST use distinct outcomes with a stable error taxonomy: expired token (`HTTP 410`, `invite_expired`), already used token (`HTTP 409`, `invite_used`), superseded token (`HTTP 409`, `invite_superseded`), and non-active reset attempt (`HTTP 403`, `reset_not_allowed_non_active`).
- **FR-005e**: Invite/owner-assisted-reset error responses MUST use a structured shape containing `error.code`, `error.message`, and `error.recovery_action` so clients can render consistent recovery guidance.
- **FR-006**: Hostelers MUST be able to log in on subsequent visits using only the credential type that was successfully linked during activation. Google-linked accounts use the same linked Google account; PIN-linked accounts use phone number plus PIN.
- **FR-006b**: When an active PIN-linked hosteler completes owner-assisted PIN reset via a valid regenerated invite, the previously stored PIN credential MUST be invalidated immediately at reset-success completion and only the new PIN MUST authenticate all subsequent PIN logins. Any PIN verification request processed after reset success MUST reject the old PIN.
- **FR-006c**: For active Google-linked hostelers with no PIN credential, regenerated invite usage MUST NOT create a new PIN in v1 through the owner-assisted reset flow. The flow MUST show the exact instruction: "This account is linked to Google sign-in. Continue with your linked Google account.".
- **FR-006a**: After 5 consecutive failed PIN attempts for a given phone number, the system MUST lock out PIN login for that phone number for 15 minutes. The lockout resets after the cooldown period elapses.
- **FR-007**: The system MUST reject sign-in attempts from Google accounts not linked to a provisioned hosteler, displaying a "contact your PG owner" message.
- **FR-008**: Hosteler sessions MUST remain valid for 30 days without requiring re-authentication. Multiple concurrent sessions (across different devices) are permitted; each device maintains an independent session.
- **FR-009**: The owner MUST authenticate via a separate login using email and password.
- **FR-010**: Owner sessions MUST remain valid for 7 days without requiring re-authentication.
- **FR-011**: All hosteler-facing pages MUST redirect unauthenticated users to the hosteler login page.
- **FR-012**: All owner-facing pages MUST redirect unauthenticated users to the owner login page.

**Food Preference Submission**

- **FR-013**: Hostelers MUST be able to select or deselect breakfast, lunch, and dinner individually for the next calendar day.
- **FR-014**: Hostelers MUST be able to update their selection at any time before the daily deadline.
- **FR-015**: The system MUST prevent any food preference write operation after the configured daily deadline, enforced using server time (IST). The API rejects writes based on server time regardless of the client device's local clock.
- **FR-016**: The submission form MUST display the meal time windows: Breakfast (7–9 AM), Lunch (12:30–2 PM), Dinner (7:30–9:30 PM).
- **FR-017**: The submission form MUST be read-only after the deadline, displaying the deadline time.
- **FR-018**: The hosteler dashboard MUST show whether preferences for tomorrow have been submitted and, if so, which meals were selected.
- **FR-019**: A deadline countdown banner MUST appear on the hosteler dashboard when the deadline is within 2 hours.

**Owner Daily Dashboard**

- **FR-020**: The owner dashboard MUST display the count of hostelers who opted for each of the three meals for tomorrow.
- **FR-021**: Meal counts MUST update automatically in real time as hostelers submit or modify their preferences, without requiring a page refresh. If the live subscription drops, the app MUST attempt silent auto-reconnect; if reconnection has not succeeded after 10 seconds, a non-blocking banner reading "Live updates paused — reconnecting…" MUST appear. Counts remain visible but frozen until the connection is restored.
- **FR-022**: The owner dashboard MUST display a list of hostelers who have not yet submitted for tomorrow, showing each person's name and room number.
- **FR-023**: The owner dashboard MUST display a collapsible list of hostelers who have submitted.
- **FR-024**: The owner dashboard MUST display a countdown to the daily deadline.

**Hosteler Management**

- **FR-025**: The owner MUST be able to view all hostelers, filterable by status: active, pending, inactive, or deleted. **Default Sort Order**: Within each status tab, hostelers MUST be sorted by room number in ascending order (e.g., 101, 102, 103...) to align with how owners naturally reference hostelers during daily operations.
- **FR-026**: Each hosteler row MUST display the hosteler's name, room number, phone number, and current status.
- **FR-027**: The owner MUST be able to deactivate any active hosteler. If the hosteler has food preferences recorded for future dates at the time of deactivation, the owner MUST be shown a confirmation dialog: "This hosteler has submitted preferences for [N] future dates. These will remain and be included in billing. Deactivate anyway?" Deactivation only proceeds upon explicit owner confirmation. Upon deactivation, the hosteler's active sessions MUST be invalidated immediately; any subsequent API call from the deactivated hosteler MUST return HTTP 401 with an "Account deactivated" message.
- **FR-028**: The owner MUST be able to reactivate any inactive hosteler.
- **FR-028a**: In v1, deletion is supported only from pending or active status. Inactive hostelers are not directly deletable; the deleted view contains only records deleted from pending or active status.
- **FR-029**: The owner MUST be able to generate a new invite link for any hosteler (invalidating any existing unused link). Token supersession ordering MUST be deterministic by latest token generation timestamp (`generated_at`); if multiple tokens share the same timestamp, later persisted token creation order determines precedence. If a newer invite has been regenerated before submission, any older already-open invite/reset page MUST fail on submit with `HTTP 409` and `invite_superseded`, and require reopening the latest link.
- **FR-029e**: For active PIN-linked hostelers, owner "Reset" invite regeneration MUST act as a secure owner-assisted forgot-PIN recovery path. Opening a valid regenerated link MUST lead to PIN reset (not re-activation), require the hosteler to set a new 4-digit PIN, and preserve all existing account status and history.
- **FR-029f**: Route ownership for this flow MUST be explicit: owner reset-link generation is handled by `POST /api/hostelers/[id]/reset-invite`; owner-assisted reset submit semantics are handled by `POST /api/invite/activate` using the invite token. The submit route MUST branch behavior between standard onboarding activation and owner-assisted reset based on hosteler status and linked credential context.
- **FR-029a**: The owner MUST be able to delete any pending hosteler directly. Deleting a pending hosteler MUST be a complete, permanent hard deletion — the hosteler row is removed from the database entirely and is NOT archived or soft-deleted, and NO audit record or deleted-tab entry is created. Any unused invite associated with the pending hosteler MUST be invalidated at the time of deletion, preventing any future activation attempt. The deletion leaves no trace visible to the owner. Because the hosteler row is completely removed, their mobile number becomes available again for re-registration (see FR-001b).
- **FR-029b**: The owner MUST be able to delete any active hosteler. Deleting an active hosteler MUST be treated as a moved-out-of-PG event: login access is revoked immediately across all active sessions on all devices, no new submissions are allowed, past and same-day owner-visible tracked history is preserved rather than removed, and any food preferences dated after the deletion effective date MUST be canceled so they are excluded from normal owner history/export, future operational counts, and billing. The deletion effective date is the IST calendar date on which the owner confirms deletion, so records dated on that same IST date are preserved and only later-dated records are canceled.
- **FR-029c**: Deleted hostelers MUST remain viewable by the owner in a dedicated deleted status view showing full name, room number, phone number, deletion timestamp, and whether the record was deleted from pending or active status. For active deletions, this deleted/audit view MUST also be the only owner-visible location where canceled future-dated food preferences remain available for audit.
- **FR-029d**: Deleted hosteler records are audit-only in v1. The owner MUST NOT be able to restore, reactivate, or otherwise move a deleted record back into pending, active, or inactive status from the deleted view.

**Food History**

- **FR-030**: Hostelers MUST be able to view a per-day food preference history for any selected month.
- **FR-031**: History MUST show whether each meal (breakfast, lunch, dinner) was opted on each date.
- **FR-032**: A monthly summary MUST show the total number of days each meal type was opted.
- **FR-033**: The owner MUST be able to view food history for any non-deleted or preserved historical hosteler records, filterable by hosteler and date range. Canceled future-dated food preferences created by active-hosteler deletion MUST NOT appear in this normal owner food history view.
- **FR-034**: The owner MUST be able to export the currently filtered food history as a CSV file. Canceled future-dated food preferences created by active-hosteler deletion MUST NOT be included in the normal owner history CSV export.
- **FR-034a**: The owner MUST be able to edit food entries for an individual hosteler for a selected date range within the current IST calendar month only.
- **FR-034b**: Owner food-entry edits MUST support per-meal ON/OFF updates (breakfast/lunch/dinner) and MUST apply only to dates inside the selected range that belong to the current month.
- **FR-034c**: Owner food-entry edits MUST require an adjustment reason and MUST persist audit metadata (`adjusted_by_owner_id`, `adjusted_at`, `adjustment_reason`) for each modified day.
- **FR-034d**: Owner food-entry edits MUST be allowed even if a transmitted bill already exists for the affected hosteler and month; direct mutation of the transmitted bill is not allowed, and updated values become hosteler-visible only after owner regenerate + retransmit.
- **FR-034e**: Owner food-entry edits in the current month MUST be included in subsequent bill generation/regeneration for the affected hosteler-month; if a transmitted bill exists, regenerated output remains "Awaiting Transmission" until retransmitted.

**Monthly Billing**

- **FR-035**: The owner MUST be able to trigger bill generation for any selected month and year. **Session Handling**: Bill generation is a server-side operation initiated by an authenticated owner. If the owner's session expires during bill generation, the calculation MUST continue and complete server-side. Upon successful completion, the bill is persisted. On the owner's next login, they will see the completed bill in the summary. If the client receives a session-expired response during generation, the owner MUST check after re-login to confirm bill status.
- **FR-036**: Bill generation MUST calculate each hosteler's total as: (days breakfast opted × breakfast rate) + (days lunch opted × lunch rate) + (days dinner opted × dinner rate).
- **FR-037**: If a meal rate changed during the selected month, the system MUST apply the rate that was effective on each individual day. **Proration Rule**: When a rate change is effective on date D, the NEW rate applies from day D onward; the OLD rate applies for all days before D. There is no prorated splitting of charges within a single day. **Multi-Rate Handling**: If multiple rate changes occur within the same month, bill generation MUST look up the rate effective on each specific day and apply that day's rate to the meal count for that day.
- **FR-037a**: Bill generation MUST include every hosteler who has preserved, non-canceled billable meal history in the selected month, including active hostelers plus inactive or deleted-from-active hostelers whose retained history falls inside that month.
- **FR-038**: The owner MUST be able to view a bill summary table showing all hostelers' meal counts and total amounts for the selected month.
- **FR-039**: The owner MUST be able to view a per-day breakdown for any individual hosteler's bill.
- **FR-040**: Hostelers MUST be able to view their own bill for any month in which a bill has been generated. If a bill is regenerated by the owner, the hosteler sees the latest version on their next view without notification; no explicit change alert is provided in v1.
- **FR-041**: Hosteler bill view MUST display a note that the final bill is confirmed by the owner.

**Settings**

- **FR-042**: The owner MUST be able to change the daily food submission deadline time.
- **FR-043**: The owner MUST be able to set a new rate for any meal type (breakfast, lunch, dinner), which takes effect from the NEXT calendar day after it is saved. The day the rate is saved continues to use the previously active rate, preventing retroactive same-day changes.
- **FR-044**: All deadline and rate settings MUST be persisted and applied to all future submissions and bill calculations.

**Progressive Web App**

- **FR-045**: The website MUST qualify as a true Progressive Web App on Android Chrome, meeting browser installability criteria so users can install it as an app rather than only bookmarking it.
- **FR-046**: The web app manifest MUST provide a user-facing app name, short name, start URL, scope, standalone display mode, theme color, background color, and sufficient icon metadata for Android installation.
- **FR-047**: The app MUST provide Android-suitable launcher icons, including at least 192×192 and 512×512 sizes and maskable icon support, so the installed app appears correctly in the Android app drawer.
- **FR-048**: The installed Android PWA MUST appear in the Android app drawer alongside native apps using the Deekshana Castle app name and icon.
- **FR-049**: When launched from the Android app drawer, the installed app MUST open in standalone mode without the browser address bar or normal browser chrome.
- **FR-050**: The app MUST provide an install action on eligible Android Chrome visits when the browser reports installability, and the action MUST trigger the native PWA installation flow.
- **FR-051**: The app MUST NOT show a misleading install action when installation is unsupported, unavailable, already completed, or temporarily not eligible.
- **FR-052**: A service worker MUST cache the core app shell required to display the app layout, navigation, login entry points, and primary hosteler/owner shells while offline.
- **FR-053**: When offline, the cached app shell MUST load without a network connection, and data operations that require connectivity MUST show an offline state instead of failing with a blank or broken page.
- **FR-054**: PWA validation MUST include automated checks for manifest availability, required manifest fields, service worker registration, offline app shell loading, and install prompt behavior where supported by the test environment.
- **FR-055**: PWA validation MUST include manual Android device or emulator verification that the app installs successfully, appears in the Android app drawer, launches in standalone mode, and shows the offline app shell after installation.

**Data Backup**

- **FR-056**: A full database backup MUST run automatically every night.
- **FR-057**: Backups MUST be retained for 90 days, after which they are automatically deleted.
- **FR-058**: If a nightly backup fails, GitHub Actions MUST send a failure notification to a subscribed owner/admin account; no in-app backup failure notification UI is provided in v1.
- **FR-058a**: Backup restoration is a manual developer/admin process only. No restore UI is provided in v1; restoring from backup requires direct infrastructure access.

**Automated Quality Gate**

- **FR-059**: All automated tests (unit, integration, and component) MUST pass before any build or deployment can proceed.
- **FR-060**: The deployment pipeline MUST be blocked if tests or the build step fail.
- **FR-061**: Each user story MUST have corresponding automated tests that verify its acceptance scenarios using the cheapest meaningful test type (unit, API integration, component). Browser E2E is optional and only required when explicitly requested.
- **FR-062**: After completing any phase, all relevant automated tests MUST be executed and pass before the phase is considered done.
- **FR-063**: Per-story test scripts MUST exist to allow running tests scoped to a specific user story independently.
- **FR-064**: Automated test suites that require seeded data MUST use deterministic setup and teardown so tests are independently runnable and repeatable.
- **FR-065**: Test credentials MUST be stored in environment variables (not hardcoded) and use dedicated non-production accounts.
- **FR-066**: Existing and future automated tests MUST be audited so each completed story proves at least one exact, falsifiable business outcome through real business logic and API behavior. Route mocks, conditional skips, broad placeholder assertions, and direct cookie or localStorage session injection MUST NOT be accepted as core evidence for feature validation.
- **FR-067**: Cross-role workflows MUST prove producer-to-consumer behavior through automated validation (API integration/component tests, and browser tests only when explicitly requested). For food submission and owner dashboard validation, evidence MUST show exact breakfast/lunch/dinner count impact and pending-to-submitted transition.
- **FR-068**: Owner dashboard validation MUST cover both initial fetched state and live update behavior from real submissions, and results MUST remain correct after reload.
- **FR-069**: Authentication validation MUST verify owner and hosteler login behavior through server-side auth routes with persisted-session checks. Direct cookie or localStorage injection is allowed only for setup helpers, never as the core proof that login works.
- **FR-070**: Local and CI deployment validation MUST include `npm run build:cloudflare` before any deployment or phase-complete claim. This gate MUST catch strict TypeScript, Next.js production build, and Cloudflare Pages adapter/runtime failures that unit, integration, or component tests may not exercise.

**Building, Room, and Room Type Management**

- **FR-084**: The owner MUST be able to create new hostel buildings with a name and optional description.
- **FR-085**: The owner MUST be able to add rooms within a building, specifying: room number, optional floor (ground, first, second), associated room type, and initial effective configuration.
- **FR-086**: The owner MUST be able to define room types using a fixed dropdown with only two values (AC and non-AC) plus a sharing capacity value; optional description may also be stored.
- **FR-087**: The owner MUST be able to configure individual cots within a room type, specifying cot ID and cot type (lower cot, upper cot).
- **FR-088**: The building/room/cot hierarchy MUST be queryable and displayable in a tree or hierarchical view showing all buildings, rooms within each building, room types, and cot assignments.
- **FR-089**: When a hosteler is registered, the owner MUST be able to assign them to a specific building, room, and available cot.
- **FR-090**: The system MUST prevent multiple hostelers from being assigned to the same cot within a room at the same time; each cot can be occupied by only one active hosteler.

**Room Rent Management with Effective Dates**

- **FR-091**: The owner MUST be able to configure room rent globally by sharing capacity and room type (AC/non-AC) by specifying a new rent amount and an effective date (using a date picker).
- **FR-092**: Effective dates MUST support: previous calendar month, current calendar month, and all future dates.
- **FR-093**: Until the effective date of a pending rent config change is reached, the settings display MUST show a label: "Rent config will be updated on [effective date]".
- **FR-094**: Once the effective date is reached, the label MUST disappear and the new configured rent MUST become active for billing calculations from that date forward.
- **FR-095**: The system MUST maintain a complete historical record of all global room rent config changes keyed by sharing capacity and room type with effective dates, enabling accurate billing for any month with rate changes.
- **FR-096**: When bills are generated for a month containing room rent config changes, the system MUST apply the configured rent effective on each individual date for the room's sharing-capacity + room-type combination.

**Meal Rate Management with Effective Dates**

- **FR-097**: The owner MUST be able to update meal rates (breakfast, lunch, dinner) by specifying new rates and an effective date (using a date picker).
- **FR-098**: Effective dates MUST support: previous calendar month, current calendar month, and all future dates.
- **FR-099**: Until the effective date of a pending meal rate change is reached, the settings display MUST show a label: "Meal rate will be updated on [effective date]".
- **FR-100**: Once the effective date is reached, the label MUST disappear and the new rates MUST become active for billing calculations from that date forward.
- **FR-101**: The system MUST maintain a complete historical record of all meal rate changes with effective dates, enabling accurate billing for any month with rate changes.
- **FR-102**: When bills are generated for a month containing meal rate changes, the system MUST apply each meal's rate that was effective on each individual date.

**Mess Facilities Assignment**

- **FR-103**: When registering a new hosteler, the owner MUST be able to specify whether the hosteler is availing mess (meal) facilities using a toggle or checkbox.
- **FR-104**: If a hosteler is NOT availing mess facilities, their food preference defaults MUST be NO (off) for all three meals (breakfast, lunch, dinner) on any submission date, but the hosteler MUST be able to manually toggle any meal ON if desired.
- **FR-105**: If a hosteler IS availing mess facilities, their food preference defaults MUST be YES (on) for all three meals on any submission date, but the hosteler MUST be able to manually toggle any meal OFF if desired.
- **FR-106**: The owner MUST be able to view and update a hosteler's mess-facility assignment status after registration.
- **FR-107**: When a hosteler's mess-facility status changes, the new default preferences MUST apply to future submissions, but previously submitted preferences MUST remain unchanged.

**Billing Generation and Transmission**

- **FR-108**: The owner MUST be able to trigger bill generation via a "Generate Bill" button on the billing page.
- **FR-109**: When generating bills, the owner MUST be able to select the generation scope: All Hostelers, Specific Building, or Individual Hosteler.
- **FR-110**: Bill generation MUST accept a month/year parameter and generate bills for all hostelers with billable history (food preferences and/or room assignment) in the selected month.
- **FR-111**: Generated bills MUST calculate each hosteler's total as: (days breakfast opted × breakfast rate) + (days lunch opted × lunch rate) + (days dinner opted × dinner rate) + room rent.
- **FR-112**: If meal rates or room rent changed during the selected month, bills MUST apply the rate/rent that was effective on each individual date.
- **FR-113**: Generated bills MUST be placed in a "Generated, Awaiting Transmission" status and MUST NOT be visible to hostelers until transmission.
- **FR-114**: The owner MUST be able to view detailed bill information after generation, including per-day breakdowns, meal charges by type, room rent, and total amount.
- **FR-115**: The owner MUST be able to transmit a generated bill via a "Transmit Bill" button. Once transmitted, the bill MUST become immediately visible to the hosteler.
- **FR-116**: If the owner regenerates bills for a month that already has transmitted bills, the previously transmitted bills MUST be replaced with the newly generated bills (which remain in "Awaiting Transmission" status until the owner chooses to transmit again).
- **FR-117**: Hostelers MUST be able to view only bills that have been transmitted by the owner. Bills in "Awaiting Transmission" status MUST NOT appear in the hosteler's bill list.

**Employee Management with Salary Tracking**

- **FR-118**: The owner MUST be able to add employee records by providing: name, job description, and initial salary.
- **FR-119**: The owner MUST be able to update an employee's salary by specifying a new salary amount and an effective date (using a date picker).
- **FR-120**: Until the effective date of a pending salary change is reached, the employee display MUST show a label: "Salary will be updated on [effective date]".
- **FR-121**: Once the effective date is reached, the label MUST disappear and the new salary MUST become active.
- **FR-122**: The system MUST maintain a complete historical record of all employee salary changes with effective dates, enabling accurate expense calculations for profit margin dashboards.
- **FR-123**: The owner MUST be able to view a list of all employees with their current salary and any pending salary changes with effective dates.
- **FR-124**: The owner MUST be able to deactivate or delete employee records when they are no longer employed.

**Profit Margin Dashboard**

- **FR-125**: The owner MUST be able to select a month/year and view a profit margin dashboard displaying: total income, total expenses, and calculated profit (income − expenses).
- **FR-126**: Income MUST be calculated as: SUM(room rent for all billable hostelers in the selected month) + SUM(meal charges for all billable hostelers in the selected month), using rates effective for each date in that month.
- **FR-127**: Expenses MUST include: SUM(employee salaries for all employees, using salary effective for each date in the selected month) + SUM(any owner-added line-item expenses for that month).
- **FR-128**: The owner MUST be able to add line-item expenses (e.g., "EB bill ₹5000") by specifying description, amount, and optional date within the selected month.
- **FR-129**: When the owner adds an expense to the dashboard, the total expenses and profit margin MUST be recalculated immediately.
- **FR-130**: When viewing a dashboard for a past month, the system MUST use historical rates effective for that month (room rent, meal rates, employee salaries), not current rates, to ensure accurate historical profit calculation.
- **FR-131**: The owner MUST be able to click on income or expense sections in the dashboard to view detailed breakdowns (e.g., per-hosteler room rent, per-meal-type food charges, per-employee salary).
- **FR-132**: The profit margin dashboard MUST display month-aware data, accounting for mid-month rate and salary changes, ensuring accuracy when rates or salaries change during a month.

**Available Cot Dashboard**

- **FR-133**: The owner MUST be able to view a dashboard showing all buildings, rooms, and their cot inventory with occupancy status (occupied/free).
- **FR-134**: Occupied cots MUST display the assigned hosteler's name, cot ID, and cot type (lower/upper).
- **FR-135**: Free cots MUST display as available with cot ID and cot type clearly marked.
- **FR-136**: When a hosteler is deleted or deactivated, their assigned cots MUST automatically be marked as "Free" on the available-cot dashboard.
- **FR-137**: The owner MUST be able to expand/collapse buildings and rooms in the dashboard to focus on specific areas of the hostel.
- **FR-138**: The available-cot dashboard MUST update in real time or on refresh to reflect current occupancy changes.

**Dynamic Room Configuration for Sharing and AC/Non-AC**

- **FR-139**: The owner MUST be able to configure each room's effective commercial configuration with: `sharing_capacity` (minimum 1), room class (`ac` or `non_ac`), and rent inputs used for billing.
- **FR-140**: The owner MUST be able to schedule a room configuration change per room (not global room-type-only) using an effective date that is today or in the future; past dates are rejected.
- **FR-141**: Billing MUST be calculated using the room configuration effective for each billable date for that room assignment: sharing capacity plus AC/non-AC class and the corresponding rent inputs.
- **FR-142**: The system MUST maintain immutable room-configuration history per room so historical bills remain stable and auditable when sharing capacity or AC/non-AC changes later.
- **FR-143**: The active sharing capacity for a room MUST NOT exceed configured cot inventory for that room; validation MUST block invalid configurations.
- **FR-144**: Owner UI MUST show current room configuration and any pending effective-dated change label (for example, "Room configuration will update on [date]") until effective date is reached.
- **FR-145**: Cot labels MUST be auto-generated per bunk pair using deterministic prefixes: `L{n}` for lower bed and `U{n}` for upper bed. For each configured bunk count `n`, the room MUST contain exactly two cot entries (`L{n}`, `U{n}`), and labels MUST remain unique within the room.
- **FR-146**: During "Configure Cots", the owner MUST choose a cot configuration type: `bunker` or `normal`. For `normal`, labels MUST be generated as `L{n}` only (for example `L1`, `L2`, `L3`) and map to lower cot type semantics.
- **FR-147**: The Buildings and Rooms UI MUST expose a visible delete action for each building, wired to existing delete API behavior and guardrails (for example, block deletion when active room assignments exist).
- **FR-148**: All room-configuration form inputs in owner UI MUST include explicit visible labels (not placeholder-only), including the first field for sharing capacity.
- **FR-149**: Building detail interaction MUST scale for large inventories (20-40 rooms per building) by separating room list navigation from room detail/configuration editing. Opening a building should first show room numbers list; full room configuration panels should appear only for the selected room.
- **FR-150**: Room Type management MUST support safe delete and archive semantics: an unused room type can be deleted, but if any room references a room type, hard delete MUST be blocked and owner MUST be able to mark that room type inactive/archived so it is hidden from new room creation.
- **FR-151**: Cot management MUST NOT expose per-cot hard delete as a standard owner action. Instead, owners MUST use room-level cot reconfiguration/reset flows, and destructive cot reset operations MUST be blocked when any cot in that room is assigned to an active hosteler.
- **FR-152**: Building delete in owner UI MUST require explicit confirmation before sending delete request to prevent accidental destructive actions.
- **FR-153**: Room Type lifecycle panel MUST support scalable browsing (search and/or filter with pagination or lazy list rendering) so owners can manage large room-type catalogs without excessive scrolling.
- **FR-154**: When room-type delete is blocked due to room references, UI error feedback MUST include usage context (for example, number of rooms currently using that type) and direct owner guidance to archive instead.
- **FR-155**: Configure Cots reset UX MUST present a clear destructive-action panel showing current cot mode, target mode, and guardrail note before confirmation.
- **FR-156**: Building room list UX MUST include quick room search/filter controls to help owners navigate buildings with high room counts.
- **FR-157**: Rate-change forms (global room rent and meal rates) MUST include a concise effective-date summary panel showing current value, scheduled value, and effective date before submit.
- **FR-158**: Billing owner UI MUST support high-volume review with status filters, searchable hosteler list, and sticky month/scope context so owners can quickly find generated vs transmitted bills.
- **FR-159**: Hosteler bill detail and owner bill detail views MUST provide an optional collapsed/expanded breakdown mode to reduce visual overload on small screens.
- **FR-160**: Employee management UI MUST include quick search/filter and clear pending-change chips so owners can locate employees and upcoming salary updates without scanning full lists.
- **FR-161**: Profit and available-cot dashboards MUST include explicit loading, empty, and error states with retry actions; large breakdown sections SHOULD support progressive disclosure (collapsed by default with expand controls).
- **FR-162**: Completed hosteler daily-flow screens (login, dashboard, submit) MUST surface clearer action-state feedback including deterministic loading state, success confirmation, and recoverable error guidance without forcing manual page refresh.
- **FR-163**: Completed owner operational screens (dashboard, hostelers, settings) MUST provide quick-find controls (search and/or status filter) for dense lists so common records can be located without full-list scanning.
- **FR-164**: Invite activation and login forms MUST provide inline field-level validation messages with focus directed to the first invalid field and preserved non-invalid inputs after validation failure.
- **FR-165**: Destructive or irreversible lifecycle actions in already completed phases (deactivate/delete/reset-like actions) MUST include concise impact summaries and explicit confirmation language before commit.
- **FR-166**: Android PWA install and offline indicators on already completed shells MUST provide non-intrusive but persistent contextual guidance so users understand install availability, offline limitations, and reconnect behavior.
- **FR-167**: Completed hosteler and owner pages MUST avoid blank-data ambiguity by rendering explicit empty-state messages with a next-best action (for example, retry, change filter, or navigate to setup action).
- **FR-168**: Buildings page MUST remove the standalone "Room Type Lifecycle" management panel and shift room-type template creation into the Add Room workflow so owners can create/select room template data in a single flow.
- **FR-169**: Add Room workflow MUST capture room template attributes directly: room class (`AC`/`non-AC`), sharing capacity, cot count, and cot configuration type (`bunker`/`normal`) before room creation.
- **FR-170**: Add Room workflow MUST no longer require manual rent input; rent is managed by Phase 20 global room-rent configuration and unresolved rent state for newly created rooms MUST be handled explicitly until global config exists.
- **FR-171**: Room creation flow MUST support cot mode selection at create-time so owner can choose `bunker` or `normal` inventory behavior without a separate immediate post-create cot setup step.
- **FR-172**: Owner hosteler registration form MUST capture only core identity fields (name and phone) and MUST NOT require building, room, cot, or room-number assignment at registration time.
- **FR-173**: Owner UI MUST provide a dedicated accommodation assignment page where building, room, and cot can be assigned or reassigned for an existing hosteler.
- **FR-174**: Reassigning a hosteler to a different room/cot MUST atomically release the previous cot and assign the new cot, with guardrails preventing assignment to occupied cots.
- **FR-175**: Hosteler records MUST support an explicit unassigned accommodation state until the owner performs assignment from the dedicated page.

**Android Mobile and Tablet App Experience**

- **FR-071**: Hosteler-facing screens MUST be optimized for Android mobile (375 px width) as the primary baseline. Hostelers access the app primarily on phones; all hosteler workflows must be usable at 375 px without horizontal scrolling or broken layouts.
- **FR-072**: Owner-facing screens MUST be optimized for tablet (768px+ width) as the primary baseline. Owners access the app primarily on tablets; all owner workflows must be usable and data-dense at 768 px and wider. Mobile (375 px) compatibility is optional.
- **FR-073**: Authentication screens (hosteler login, invite activation, PIN reset, owner login) MUST work seamlessly at 375 px mobile width for both roles, with readable text, touch-friendly controls, and no horizontal overflow.
- **FR-074**: Every completed hosteler-facing screen MUST be usable at a 375 px wide Android mobile viewport with no page-level horizontal overflow, clipped primary content, overlapping interactive elements, or unreachable primary actions.
- **FR-075**: Every completed owner-facing screen MUST be designed for tablet usability (768px+) with proper data density, table layouts optimized for tablet width, and efficient use of space for dashboards and management interfaces.
- **FR-076**: Navigation on Android mobile hosteler screens MUST behave like a mobile app experience: primary hosteler destinations must be reachable from the current hosteler shell without relying on desktop-width sidebars, hover interactions, or off-screen menus.
- **FR-077**: Interactive controls on hosteler screens at 375 px MUST be touch-friendly, with enough target size and spacing to avoid accidental activation in normal one-handed use.
- **FR-078**: Text, labels, form fields, card content, dialog content, and status messages on hosteler screens at 375 px MUST remain readable without requiring pinch zoom, and long values MUST wrap, truncate with accessible context, or reflow without breaking the screen.
- **FR-079**: Android mobile viewport behavior on hosteler screens MUST remain stable across normal browser mode and installed PWA standalone mode, including safe spacing around the top and bottom viewport edges, modal/dialog positioning, virtual-keyboard interactions, and offline/online state changes.
- **FR-080**: Core hosteler workflows on Android mobile at 375 px width and in installed PWA standalone mode MUST support login, dashboard review, food preference submission, submission confirmation, and navigation back to the dashboard without layout breakage.
- **FR-081**: Owner-facing tables, dashboards, hosteler lists, settings, and billing views MUST use the full tablet width (768px+) for data visibility and clarity, with proper spacing optimized for touch interaction and data density.
- **FR-082**: Completion evidence for any hosteler-facing screen MUST include validation at the 375 px Android mobile baseline. If the screen participates in installed app usage, evidence MUST also include installed or standalone PWA context validation where applicable. Mobile tablet rendering evidence is optional.
- **FR-083**: Completion evidence for any owner-facing screen MUST include validation at 768 px tablet width. Mobile (375 px) rendering evidence is optional; mobile rendering issues are acceptable and do not block owner-facing task completion.

---

### Key Entities

- **Hosteler**: A paying guest registered by the owner. Identified by name, phone number, and room number. Has a lifecycle status of pending (invite sent, not yet activated), active (can log in and submit), or inactive (deactivated). If deleted from active status, the person remains represented through an owner-visible deleted record. If deleted from pending status, the record is completely removed with no trace.
- **Deleted Hosteler Record**: An owner-visible audit record created only when an **active** hosteler is deleted (soft archive). Pending hosteler deletion is a complete hard delete that creates no deleted record.
  - **Deleted-from-pending (hard delete)**: The hosteler row is permanently and completely removed from the database. No deleted-tab entry or audit record is created. The invite is invalidated and the mobile number is freed for re-registration.
  - **Deleted-from-active (soft archive)**: The hosteler row is archived in place (not hard-deleted). The record retains full identifying details, deletion timing, prior status, and the preserved past and same-day operational and billing history associated with the move-out event. Its deletion effective date is the IST calendar date on which the owner confirmed deletion: records dated on that same IST date and earlier remain preserved, while records dated later are canceled. Canceled future-dated food preferences after the deletion effective date are audit-only records visible only inside the deleted hosteler's dedicated deleted/audit view and excluded from normal owner history/export, dashboard counts, and billing. This record is non-restorable in v1.
- **Invite Token**: A unique, time-limited, one-time credential generated by the owner to provision a new hosteler or assist credential recovery for an active PIN-linked hosteler. Expires in 7 days and progresses through explicit states: latest active, superseded, used, or expired.
- **Food Preference**: A hosteler's daily meal selection for a specific date. Records whether the hosteler opted for breakfast, lunch, and/or dinner. One record per hosteler per day; later submissions replace earlier ones.
- **Meal Rate**: The price per meal type (breakfast, lunch, dinner) as configured by the owner. Each rate record has an effective start date, allowing historical rate lookup for accurate billing.
- **Monthly Bill**: A computed record of a hosteler's total meals and charges for a given calendar month. Produced by manual owner action.
- **Settings**: System-wide configuration values. Includes the daily submission deadline time, which is owner-configurable.
- **Android Mobile App Experience**: The primary presentation and interaction mode for Deekshana Castle on Android phones, covering Android Chrome and installed standalone PWA usage. It includes mobile navigation, viewport-safe layout, touch-friendly controls, readable content, and validation at the 375 px mobile baseline.
- **Building**: A physical structure within the hostel property that houses rooms. Contains name and optional description. Used for organizational grouping of rooms.
- **Room**: A rentable unit within a building. Identified by room number and optionally associated with a floor (ground, first, second). Has effective-dated commercial configuration (sharing capacity, AC/non-AC, and rent inputs) used directly by billing.
- **Room Type**: A reusable template/category (for example AC/non-AC variants and defaults). Room-level effective configuration is authoritative for billing. Room types support active/inactive lifecycle for operational safety: inactive room types are excluded from new room creation but remain valid for historical room references.
- **Room Configuration History**: Immutable per-room history of configuration changes over time. Each entry stores sharing capacity, AC/non-AC class, rent inputs, effective date, and creation metadata; historical lookups drive billing correctness.
- **Cot**: A bed or sleeping unit within a room. Has a unique cot ID, associated cot type (lower cot, upper cot), and occupancy status (assigned to a hosteler or free). Labels are auto-generated based on selected cot configuration type: bunker mode uses paired labels `L{n}` and `U{n}` (for example `L1`, `U1`, `L2`, `U2`), while normal mode uses `L{n}` labels only (for example `L1`, `L2`, `L3`), unique within each room. Inventory changes are managed via room-level reconfiguration/reset workflows rather than per-cot hard delete.
- **Room Rent Rate History**: A record of room rent changes over time. Each entry contains: room ID, new rent amount, effective date, and creation timestamp. Enables historical lookup for accurate billing when rent changes mid-month.
- **Meal Rate History**: A record of meal rate changes over time. Each entry contains: meal type (breakfast/lunch/dinner), new rate, effective date, and creation timestamp. Enables historical lookup for accurate billing when rates change mid-month.
- **Employee**: A hostel staff member record containing: name, job description, and current salary. Salary changes are tracked with effective dates to support expense calculations for profit margin analysis.
- **Employee Salary History**: A record of employee salary changes over time. Each entry contains: employee ID, new salary amount, effective date, and creation timestamp. Enables historical lookup for accurate expense calculation when salaries change mid-month.
- **Line-Item Expense**: A one-time expense entry added by the owner to the profit margin dashboard for a specific month. Contains: description (e.g., "EB bill"), amount, optional date within the month, and month reference.
- **Monthly Bill (Extended)**: A computed billing record for a hosteler for a specific month. Contains: hosteler ID, month/year, room rent total, meal charges by type, grand total, generation timestamp, transmission timestamp (null until transmitted), and status (Generated/Transmitted). Bill generation separates into two phases: generation (computed but not visible to hosteler) and transmission (owner confirms, bill becomes visible).
- **Mess Facility Assignment**: An owner-set configuration for each hosteler indicating whether they are availing mess (meal) facilities. When set to NO, food preference defaults to off for all meals; when set to YES, defaults to on.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A hosteler can log in and submit food preferences for the next day in under 30 seconds on a mobile device. For v1 acceptance, this is validated through scoped browser or manual acceptance evidence for the documented login-and-submit flow, not a full performance load-testing program.
- **SC-002**: On Android Chrome, an eligible user can install the app within 5 seconds of the install action becoming available, and the installed Deekshana Castle icon appears in the Android app drawer.
- **SC-003**: The owner's daily food counts update within 3 seconds of a hosteler submitting or changing preferences, without any page refresh.
- **SC-004**: Monthly bill generation produces verified-accurate meal counts and amounts for all hostelers for any selected month, including months containing mid-month rate changes.
- **SC-005**: The food preference form is reliably locked for submission after the configured deadline — no late submission is accepted.
- **SC-006**: Nightly database backups succeed on every scheduled run, and any backup failure triggers a GitHub Actions failure notification to a subscribed owner/admin account within 15 minutes.
- **SC-007**: The complete app is fully usable on a 375 px wide mobile viewport with no horizontal scrolling on any screen.
- **SC-008**: All automated tests pass on every push to the main branch before any deployment proceeds.
- **SC-009**: The owner can generate a new invite link and onboard a hosteler in under 2 minutes from start to the hosteler's first successful login.
- **SC-010**: The system supports up to 100 concurrent hostelers without degradation in submission response time. For v1 acceptance, this is validated through scoped seeded-data evidence with up to 100 hostelers and representative submission/dashboard checks; full load-testing infrastructure is out of scope unless a future specification explicitly adds it.
- **SC-011**: In an installed Android PWA session with network disabled, the app shell loads in under 3 seconds and shows an offline state for data-dependent actions instead of a blank, browser error, or broken page.
- **SC-012**: PWA verification produces passing automated evidence for manifest, service worker, offline shell, and install prompt behavior, plus manual Android evidence for app drawer presence and standalone launch.
- **SC-013**: The owner can delete an active or pending hosteler and later locate that deleted record, with its retained audit context, in under 30 seconds; for active deletions, the deleted record keeps past and same-day history, exposes canceled future-dated food preferences only in the deleted/audit view, and ensures those canceled records never appear in normal owner history/export, dashboard counts, or bill inputs.
- **SC-014**: At 375 px Android mobile viewport width, 100% of completed hosteler-facing screens complete mobile layout validation with no page-level horizontal scrolling, no clipped primary content, no overlapping controls, and no unreachable primary action.
- **SC-015**: At 768 px tablet viewport width and above, 100% of completed owner-facing screens display with proper data density, no cramped layouts, and optimized use of tablet width for dashboards, tables, and data-rich views.
- **SC-016**: All authentication screens (hosteler login, invite activation, PIN reset, owner login) work seamlessly at 375 px mobile width with readable text, touch-friendly controls, and no horizontal overflow.
- **SC-017**: In installed Android PWA standalone mode, the core hosteler flow (login → dashboard → submission → confirmation → return) can be completed without viewport jumps, keyboard/modal obstruction, unsafe spacing, unreadable text, or navigation dead ends.
- **SC-018**: The owner can create a building, add rooms with different room types and floors, and configure cots within 5 minutes, with a queryable hierarchical structure for later hosteler assignments.
- **SC-019**: Room rent rate changes with future effective dates display a pending-change label until the effective date; after the effective date, the label disappears and new rent applies for billing from that date forward.
- **SC-020**: Meal rate changes with future effective dates display a pending-change label until the effective date; after the effective date, the label disappears and new rates apply for billing from that date forward.
- **SC-021**: Bills generated for a month containing mid-month room rent or meal rate changes apply each rate that was effective on each individual date, not a blanket rate for the entire month.
- **SC-022**: A hosteler registered with "NOT availing mess" has food preference defaults of OFF for all meals on first submission, but can manually toggle meals ON.
- **SC-023**: A hosteler registered with "YES availing mess" has food preference defaults of ON for all meals on first submission, but can manually toggle meals OFF.
- **SC-024**: The owner can generate a bill, review it in "Awaiting Transmission" status (not visible to hosteler), and then transmit it to make it visible to the hosteler within 2 minutes of generation.
- **SC-025**: Bills in "Awaiting Transmission" status do not appear in any hosteler's bill list; only transmitted bills are hosteler-visible.
- **SC-026**: The owner can add employees with salary and salary change history; salary changes with future effective dates display pending-change labels until the effective date is reached.
- **SC-027**: A profit margin dashboard for a specific month calculates income, expenses, and profit using rates and salaries effective for that month, accounting for mid-month changes and not applying current month rates retroactively.
- **SC-028**: When the owner adds a line-item expense to the profit margin dashboard, the total expenses and profit margin are recalculated immediately.
- **SC-029**: The available-cot dashboard shows all buildings, rooms, and cots with occupancy status (occupied with hosteler name / free); occupied cots become free immediately when their assigned hosteler is deactivated or deleted.
- **SC-030**: For a past month with historical rate/salary changes, the profit margin dashboard correctly reflects the rates and salaries that were effective in that month, not current rates.
- **SC-031**: When cot configuration is triggered for a room, generated labels follow the deterministic sequence `L1`,`U1`,`L2`,`U2`... based on bunk count, and each generated pair correctly maps to lower/upper cot types.
- **SC-032**: When cot configuration type is set to `normal`, generated labels follow `L1`,`L2`,`L3`... with no `U` labels, and generated entries map to lower cot type semantics.
- **SC-033**: For a building with at least 30 rooms, owner can find a room and open its full configuration panel in under 10 seconds without rendering all room configuration forms at once.
- **SC-034**: Attempting to delete a room type currently referenced by at least one room returns a clear blocked-delete response, and archiving that room type removes it from Add Room selectors while preserving existing room references.
- **SC-035**: For a building with at least 30 rooms, owner can locate a target room via room search/filter and open its detail panel in under 5 seconds on tablet baseline.
- **SC-036**: In owner billing review for a month with at least 100 generated rows, an owner can filter to a target hosteler and open bill detail in under 10 seconds on tablet baseline.
- **SC-037**: On settings and dashboard pages, loading/empty/error states render deterministically with a visible retry path and no blank-state dead ends.
- **SC-038**: For completed Phase 1-18 auth and submission flows on Android 375 px baseline, users can recover from a validation or network error and complete the intended action in one retry attempt without losing previously entered valid fields.
- **SC-039**: For completed owner list-heavy screens from Phase 1-18, owners can locate a target record (hosteler or settings item) in under 8 seconds using search/filter controls on tablet baseline.
- **SC-040**: In Buildings flow, owner can create a room including class, sharing, cot count, and cot mode in a single submission without navigating a separate room-type lifecycle panel.
- **SC-041**: Owner can assign or reassign accommodation (building -> room -> cot) for an existing hosteler in under 30 seconds from the dedicated assignment page.

---

## Assumptions

- All hostelers are known individuals registered by the owner; there is no self-registration flow.
- The PG operates a single property; multi-property support is not required in v1.
- Food preferences are always submitted for the next calendar day; same-day or advance multi-day submission is not supported.
- The owner acts as the sole administrator; there is no multi-admin or role-sharing capability in v1.
- Default meal rates at launch: Breakfast ₹30 per day, Lunch ₹50 per day, Dinner ₹40 per day.
- Default daily submission deadline: 9:00 PM IST.
- All time-based logic (deadline enforcement, date assignment for "tomorrow") uses IST (Asia/Kolkata, UTC+5:30). Server time is the authoritative clock for all deadline enforcement; client-side countdowns and displays are display-only and may vary slightly. The calendar day boundary (midnight IST, 00:00) defines when "tomorrow" rolls over to the new day; the owner dashboard meal counts reset at this midnight boundary, not at deadline time.
- Active-hosteler deletion also uses IST calendar dates. The deletion effective date is the owner's confirmation date in IST; food preferences dated on that same IST date are preserved, and only later-dated records are canceled.
- Approximately 40 hostelers will be active at launch; maximum design capacity is 100.
- Bill generation is a manual, owner-triggered action for each month; automatic bill generation is out of scope for v1.
- Payment collection and processing are out of scope for v1.
- Automated notifications (push, SMS, email) to hostelers are out of scope for v1.
- Analytics dashboards and charts are out of scope for v1.
- Android Chrome is the primary required installability target; iOS Safari add-to-home-screen support remains desirable where the browser permits it, but Android app drawer appearance is the required validation outcome.
- Android mobile is the primary product experience for hostelers (v1). Tablet and desktop layouts are progressive enhancements only after the mobile-first hosteler experience is complete.
- Tablet (iPad-like, 768px+) is the primary product experience for owners (v1). Mobile (375 px) rendering is optional; mobile usability issues do not block owner-screen completion.
- Authentication screens (hosteler login, invite activation, PIN reset, owner login) must work seamlessly at 375 px mobile width for both roles, regardless of their primary device strategy.
- The nightly backup runs on a fixed cron schedule (2:00 AM IST) and uses the owner's Cloudflare R2 storage for retention.
- Infrastructure operates entirely on free service tiers; no recurring paid third-party services are required.
- The repository's actual application stack, including Next.js 15.3.3, is treated as the intended implementation baseline. Any conflicting plan or constitution text must be aligned to that baseline through artifact/governance updates rather than downgrading the existing implementation.
- Owner-assisted forgot-PIN in v1 is not self-service. It is initiated only by owner invite regeneration and is limited to active PIN-linked hostelers.
- Buildings and physical room/cot structure changes are infrequent (typically at deployment or when hostel physically expands), but room commercial configuration (sharing capacity and AC/non-AC) is dynamic and may change based on occupancy and pricing decisions.
- A single cot can only be occupied by one active hosteler at a time. When a hosteler is deleted or deactivated, their cot is immediately freed for reassignment.
- Room rent and meal rates can change mid-month; the system tracks complete rate history to enable accurate billing for any month with changes.
- Employee salary changes are tracked historically to enable accurate expense calculations for profit margin dashboards; salary does not retroactively change.
- Bill generation is a two-phase process: generation (computed, owner-only-visible) and transmission (owner approves, hosteler-visible). Bills are not visible to hostelers until transmission.
- Mess facility assignment defaults (YES/NO) are applied only to the first submission after the assignment changes; prior submissions retain their choices and are not retroactively updated.
- Profit margin dashboards are month-aware and use historical rates effective for that month; past months always reflect rates/salaries from their respective month, never current rates.
- Expenses added to profit margin dashboards are one-time line items; recurring expenses (e.g., monthly internet) are not automated and must be re-entered each month if they recur.

---

## Clarifications

### Session 2026-07-03

- Q: After the daily deadline passes, does "tomorrow" shift at midnight (12:00 AM IST) or immediately after the deadline? And do the owner's food counts reset at midnight or at deadline time? → A: "Tomorrow" means the next calendar day; the day boundary is midnight IST (00:00). Owner dashboard meal counts reset at midnight IST when the date rolls over. The deadline governs when submissions close, not when the date changes.
- Q: If the owner saves a new meal rate today, does today's food preference use the old rate or the new rate in billing? → A: New rate applies from the NEXT calendar day after it is saved. The day it is saved still uses the old rate, preventing retroactive same-day changes.
- Q: Is the deadline enforced using server time or client device time? What happens if there is clock skew between client and server? → A: Server time (IST from API) is authoritative for all deadline checks. Client-side countdown is display-only. The API rejects writes based on server time regardless of the client device's local clock.
- Q: If the Supabase Realtime subscription drops while the owner is viewing the dashboard, should the app show a stale-data warning, auto-reconnect silently, or show an error? → A: Auto-reconnect silently. If reconnection fails after 10 seconds, show a non-blocking banner "Live updates paused — reconnecting…". Counts remain visible but frozen until reconnected.
- Q: When a hosteler is deactivated mid-month, should the owner be warned that existing food preferences for future dates will still be counted in billing? → A: Yes. Show a confirmation dialog when deactivating a hosteler who has future food preferences recorded: "This hosteler has submitted preferences for [N] future dates. These will remain and be included in billing. Deactivate anyway?" Owner must confirm before deactivation proceeds.

### Session 2026-07-04

- Q: When the owner deactivates a hosteler, what happens to their active session? → A: Immediate session invalidation. The next API call from the deactivated hosteler returns HTTP 401 with an "Account deactivated" message; they are forced to the login page.
- Q: What brute-force protection applies to PIN login attempts? → A: After 5 consecutive failed PIN attempts, the account is locked out for 15 minutes. The lockout is per phone number and resets after the cooldown period.
- Q: Can a hosteler be logged in on multiple devices simultaneously? → A: Yes, unlimited concurrent sessions are allowed. Each device maintains its own independent 30-day session.
- Q: Who can trigger a database backup restore? → A: Restore is a manual developer/admin process only. No restore UI exists in v1; the owner is notified of backup failures but restoration requires direct infrastructure access.
- Q: When the owner regenerates a bill that a hosteler may have already viewed, is the hosteler notified of the change? → A: No notification. The hosteler sees the latest bill the next time they open the bill view. Notifications are explicitly out of scope for v1.
- Q: How should a nightly database backup failure notify the responsible user? → A: GitHub Actions failure notification to a subscribed owner/admin account; no in-app backup UI.
- Q: When the owner deletes a hosteler, how should active and pending users differ? → A: Deleting an active hosteler is treated as a moved-out-of-PG event: access is revoked, and owner-visible tracking and audit history is preserved in a deleted record. Pending hostelers may be deleted directly, but they still remain visible to the owner in the deleted view for auditability.
- Q: When an active hosteler is deleted, should future-dated food preferences remain for billing/audit or be canceled? → A: Preserve past and same-day history, but cancel any future-dated food preferences after the deletion takes effect so they no longer affect future counts or billing.
- Q: After an active hosteler is deleted, where should canceled future-dated food preferences remain visible? → A: They remain visible only inside that deleted hosteler's dedicated deleted/audit view and are excluded from normal owner history/export, dashboard counts, and billing.
- Q: After activation, can a hosteler log in with both Google and PIN, or only with the credential actually linked during activation? → A: Only the credential actually linked during activation is valid for login in v1. The system does not require the hosteler to add the second credential later.
- Q: How should completed E2E tests be treated after adding Honest E2E Validation guardrails? → A: Superseded by later clarification. Going forward, browser E2E is optional and only run on explicit request.
- Q: What must owner dashboard E2E evidence prove for food-count workflows? → A: Superseded by later clarification. Required coverage now relies on unit/API integration/component evidence for exact count and pending/submitted behavior.
- Q: What must auth E2E evidence prove after the server-side auth proxy work? → A: Superseded by later clarification. Required coverage now relies on unit/API integration/component evidence for login and session persistence behavior.
- Q: How is the Next.js version conflict resolved for this feature? → A: The actual repository stack, Next.js 15.3.3, is intended; planning and constitution artifacts must align to that baseline rather than downgrading the implementation.
- Q: How should SC-001 and SC-010 be validated for v1 acceptance? → A: Treat them as scoped acceptance evidence tasks using representative browser/manual timing and seeded 100-hosteler scenarios; full load-testing infrastructure is not required unless explicitly documented later.
- Q: How should Android mobile layout breakage be handled now that the app is already a PWA? → A: Treat Android mobile as the primary product experience. Completed user-facing screens must pass 375 px mobile baseline validation, and screens used from the installed app must also pass standalone PWA validation where applicable.

### Session 2026-07-05

- Q: When an owner regenerates an invite for an already active hosteler, is the link only for onboarding, or can it support credential recovery? → A: For active PIN-linked hostelers, regenerated invite links also serve as a secure owner-assisted forgot-PIN reset path.
- Q: Which hosteler statuses are eligible for this invite-based PIN reset path? → A: Only active hostelers are eligible for owner-assisted PIN reset via regenerated invite links.
- Q: How should regenerated invite reset behavior differ for Google-linked versus PIN-linked active hostelers? → A: PIN-linked active hostelers can reset their PIN via the regenerated link; Google-linked active hostelers without a PIN cannot create a PIN through this flow in v1 and must continue using linked Google sign-in.
- Q: If a newer invite is regenerated before submit, what should happen to an older already-open reset page? → A: The older page must fail on submit with token-invalid (superseded), and the user must reopen the latest invite link.

### Session 2026-07-10

- Q: How should room rent changes with effective dates be calculated for billing when a month contains multiple rent changes? → A: Each room's rent for billing is determined by which rate was effective on that specific date. If rent changes on the 15th, days 1-14 use the old rate and days 15-31 use the new rate.
- Q: What happens if a room rent effective date is set to a date in the past? → A: The UI should prevent selecting past dates; only current date onwards is allowed for new rate changes to prevent retroactive billing confusion.
- Q: If an owner adds a building/room/cot hierarchy but then wants to reorganize, what happens to historical data? → A: Room/building hierarchy changes are allowed; historical billing and food preference records remain attached to their original room/hosteler references. Reorganizing the structure does not affect historical accuracy.
- Q: Can a single hosteler be assigned to multiple cots simultaneously? → A: No. A hosteler can only occupy one cot at a time. Reassigning a hosteler to a different cot must deassign them from the current cot first.
- Q: What happens if the owner tries to delete a building that still has rooms and assigned hostelers? → A: The system should warn the owner about the impact and require confirmation. Deleting a building with active assignments should either cascade-delete or mark the structure as inactive, preserving historical data.
- Q: For profit margin dashboard, if a hosteler is deleted mid-month, should their partial-month history be included in expense calculations? → A: Yes. Deleted hostelers' historical room rent and meal charges for dates prior to deletion are included in income calculations. Only future-dated preferences after the deletion effective date are excluded.
- Q: Can the owner have multiple effective-date-pending changes for the same room or meal rate? → A: No. Only one pending change per room or meal type is allowed. If a new effective date is set before the previous one is reached, it replaces the pending change.
- Q: How should the profit margin dashboard handle employees who were hired mid-month or during the month they are being calculated? → A: The dashboard includes their salary from their hire date (effective date) onward for the selected month. If hired after the selected month, they contribute no salary expense.
- Q: What is the minimum and maximum value for room rent, meal rates, and salary? → A: No hard limits in v1; the system accepts any positive integer value. Business logic validation (e.g., zero checks) is left to the owner.
- Q: If a hosteler with "NOT availing mess" later changes to "YES availing mess", what happens to their past food preferences? → A: Past food preferences remain unchanged. Only future submissions default to YES for all meals.
- Q: For bills generated but awaiting transmission, who can see them and for how long are they retained? → A: Only the owner can see bills awaiting transmission. They are retained indefinitely (or until manually deleted) and do not auto-expire.
- Q: Can an owner regenerate/retransmit a bill after it has already been transmitted to a hosteler? → A: Yes. If the owner regenerates bills for a month that already has a transmitted bill, the old transmitted bill is replaced and the new bill remains in "Awaiting Transmission" until retransmitted.
- Q: How is the billing calculation performed when a hosteler's mess-facility assignment changes mid-month? → A: The hosteler's food preferences (which were already submitted) are used as-is for billing. Changing mess-facility assignment affects only future submission defaults, not retroactive food preference billing.
- Q: What if the owner assigns a cot to a hosteler but then deletes that hosteler? Are cots freed for assignment? → A: Yes. Deleted or deactivated hostelers' assigned cots become immediately "Free" and can be reassigned to new hostelers.
- Q: What is the bill lifecycle, and can bills be modified after transmission? → A: Bills can only be in two states: "Awaiting Transmission" (mutable, owner can regenerate) or "Transmitted" (immutable and permanent). Once transmitted, a bill cannot be edited. If a hosteler is deleted before transmission, their bill remains in "Awaiting Transmission" and can still be transmitted after deletion; the deleted hosteler's history is preserved in the bill.
- Q: How should room rent be prorated when a hosteler's room assignment changes or a hosteler moves in/out mid-month? → A: **Option A - Prorate by date (SELECTED)**: Room rent is split based on how many days the hosteler occupied each room. For example, if a hosteler occupied Room A for 15 days and Room B for 16 days of a 31-day month, Room A's rent is divided by days occupied / total room days, and Room B's rent is calculated proportionally. Bills show the breakdown per room with the prorated amount.
- Q: What happens if a hosteler's room assignment is changed multiple times within the same IST calendar day? → A: **Day-Granularity Rule (SELECTED)**: Billing remains day-granular (not hour-granular). For any date, only one room assignment is billable: the latest assignment recorded for that IST date is used for that day's room rent. No intra-day proration is applied.
- Q: What should happen if a hosteler has no room assignment for part of the month? Should the owner be charged room rent for unassigned days? → A: **Option A - Skip billing for unassigned days (SELECTED)**: If a hosteler has no room assignment for any portion of the month, no room rent is charged for those days. Only days when a room assignment is active are subject to room rent billing.
- Q: Should the owner be allowed to edit an individual hosteler's food entries for selected dates in the current month? → A: **Yes (SELECTED)**: Owner may edit current-month entries for an individual hosteler for a chosen date range, with mandatory adjustment reason and audit trail. Edits are allowed even if a transmitted bill exists; owner must regenerate and retransmit for revised values to become hosteler-visible.
- Q: When a rate (room rent, meal rate, or salary) is changed with an effective date, should past bills be recalculated with the new rate, or remain locked with their original rates? → A: **Option A - Immutable Past Rates (SELECTED)**: Once a rate change takes effect, only future bills use the new rate. Past bills remain locked and cannot be recalculated. This ensures billing history is stable and prevents retroactive financial surprises.
- Q: For the profit margin dashboard, should the owner be able to select only the current month, or any month in history? If selecting past months, should rates be recalculated with current rates or the historical rates that were effective during that month? → A: **Option B - Historical Month Selection (Full History) (SELECTED)**: The dashboard allows owner to select any past, current, or future month. When a past month is selected, the dashboard recalculates using the rates (room, meal, salary) that were effective during that specific month. This provides accurate historical profit analysis.
- Q: Can the owner change a room type (e.g., from "2-sharing Non-AC" to "2-sharing AC") after the room has been created? If so, can the effective date be a past date? → A: **Option B - Change with Effective Date (Future/Current Only) (SELECTED)**: The owner can change a room type with an effective date that is today or in the future. Past room types cannot be changed retroactively (no backdated effective dates allowed) to maintain consistency with the immutable past rates decision. This prevents retroactive billing confusion: once a bill is generated using a room type, that room's historical type is locked and cannot be changed. Room type changes only affect future bills generated after the effective date.
- Q: Can rooms of the same type have different sharing capacities dynamically, and should billing use the room's current sharing plus AC/non-AC configuration? → A: **Yes (SELECTED)**: Room-level configuration is authoritative and dynamic. The owner can update a specific room's sharing capacity and AC/non-AC configuration with effective dates (today/future only). Billing uses the effective room configuration for each date (sharing capacity + AC/non-AC + rent inputs). Past bills remain immutable through room configuration history.
- Q: Is browser E2E mandatory for future implementation phases and task completion? → A: **No (SELECTED)**: Going forward, browser E2E is optional and runs only when explicitly requested. Required completion coverage is unit tests, API integration tests, and component tests with documented acceptance evidence.

### Session 2026-07-10-clarify

**Billing Clarifications Workflow Completed**

All 5 critical billing and dashboard decisions have been clarified and integrated:

1. **Q1: Bills Immutable Once Transmitted (Generated → Transmitted end state)** → Bills exist in exactly two states: "Awaiting Transmission" (mutable, owner can regenerate) or "Transmitted" (immutable and permanent). Once a bill is transmitted to a hosteler, it cannot be modified or edited. This ensures billing transparency and prevents disputes over historical charges.

2. **Q2: Room Rent Prorated by Date of Occupation** → Room rent is split based on how many days the hosteler occupied each room during the billing month. For example, if a hosteler occupied Room A for 15 days and Room B for 16 days of a 31-day month, rent is calculated proportionally per room. Bills show the per-room breakdown with prorated amounts.

3. **Q3: Skip Billing for Unassigned Days** → If a hosteler has no room assignment for any portion of the billing month, no room rent is charged for those unassigned days. Only days when a room assignment is active are subject to room rent billing.

4. **Q4: Past Rates Immutable After Billing** → Once a rate change (room rent, meal rate, or salary) takes effect, only future bills use the new rate. Past bills remain locked with their original rates and cannot be recalculated retroactively. This ensures billing history is stable and prevents retroactive financial surprises.

5. **Q5: Profit Dashboard Allows Full Historical Month Selection** → The profit margin dashboard allows the owner to select any past, current, or future month for analysis. When a past month is selected, the dashboard recalculates income and expenses using the historical rates (room rent, meal rates, salaries) that were effective during that specific month. This provides accurate historical profit margin analysis and period-over-period comparison without retroactively modifying archived bills.

6. **Q6: Room Type Changes with Future/Current Effective Dates Only** → The owner can change a room type (e.g., Non-AC to AC) with an effective date that is today or in the future. Past room types cannot be changed retroactively to maintain consistency with the immutable past rates decision. This ensures: (a) past bills remain accurate with their original room types, (b) no confusion about which room type was billed, (c) alignment with billing immutability principle. Changes apply to future bills only.

7. **Q7: Same-Day Room Reassignment Billing Rule** → If a hosteler's room assignment changes multiple times within the same IST date, billing uses day-level granularity and charges only one room for that date: the latest assignment recorded on that IST date. No intra-day/hourly proration is applied.

8. **Q8: Owner Current-Month Food Entry Corrections** → Owner can edit an individual hosteler's food entries for selected dates within the current IST month with a mandatory reason and audit trail. If the affected hosteler-month bill is already transmitted, edits are still allowed; owner must regenerate and retransmit so the revised bill replaces the previously transmitted version.

