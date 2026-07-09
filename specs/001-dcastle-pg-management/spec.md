# Feature Specification: Deekshana Castle PG Management App (Full Application — v1.2)

**Feature Branch**: `001-dcastle-pg-management`

**Created**: 2026-07-03

**Updated**: 2026-07-05

**Status**: Draft

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
7. **Given** a pending hosteler, **When** the owner clicks "Delete", **Then** the hosteler is removed from the pending tab, any unused invite is invalidated, and the hosteler appears in the deleted tab for owner tracking and audit.

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

### User Story 13 — Users Operate the App as a Mobile Android App Experience (Priority: P1)

An owner or hosteler uses Deekshana Castle primarily on Android mobile, either in Android Chrome or as an installed standalone PWA. The app layout behaves like a purpose-built mobile app: navigation is reachable without desktop assumptions, controls are touch-friendly, text remains readable, no screen creates horizontal overflow, and core owner and hosteler workflows remain usable at a 375 px viewport width.

**Why this priority**: The app is already a PWA, but daily use happens on Android phones. If the layout breaks on Android mobile, users cannot reliably submit meals, review counts, manage hostelers, or use the installed app as intended.

**Independent Test**: Can be tested by opening each completed user-facing screen at a 375 px Android mobile viewport and, where installability applies, from an installed/standalone PWA context, then completing the core owner and hosteler flows without horizontal scrolling, clipped text, unreachable actions, unstable viewport jumps, or controls that are too small for touch.

**Acceptance Scenarios**:

1. **Given** a completed hosteler-facing screen is opened on Android Chrome at 375 px width, **When** the user views and interacts with the screen, **Then** all content fits within the viewport with no horizontal scrolling, clipped primary content, or overlapping controls.
2. **Given** a completed owner-facing screen is opened on Android Chrome at 375 px width, **When** the owner reviews dashboards, tables, forms, dialogs, and action controls, **Then** the layout remains usable without desktop-only columns, off-screen actions, or horizontal overflow.
3. **Given** the app is installed and launched in Android PWA standalone mode, **When** a hosteler opens the dashboard, submits food preferences, and returns to the dashboard, **Then** navigation, viewport height, touch controls, confirmation state, and offline/online layout states behave like a mobile app and remain stable without browser-chrome-dependent spacing.
4. **Given** the app is installed and launched in Android PWA standalone mode, **When** the owner logs in, opens the dashboard, manages hostelers, and updates settings, **Then** primary navigation and actions remain reachable, touch-friendly, readable, and not obscured by viewport, safe-area, keyboard, or modal positioning issues.
5. **Given** any user-facing screen is marked complete, **When** acceptance evidence is recorded for that screen, **Then** the evidence includes validation at the 375 px mobile baseline and, where the screen participates in installed PWA usage, validation in standalone PWA context.

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
- What happens when a pending hosteler is deleted after their invite link has already been shared? → The invite becomes unusable immediately, and the deleted pending record remains visible only in the owner's deleted/audit view.

---

## Requirements *(mandatory)*

### Functional Requirements

**Account Provisioning & Authentication**

- **FR-001**: The owner MUST be able to register a new hosteler by providing their full name, phone number, and room number.
- **FR-002**: The system MUST generate a unique, single-use invite link for each registered hosteler and for owner-triggered credential recovery when the owner regenerates an invite.
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

- **FR-025**: The owner MUST be able to view all hostelers, filterable by status: active, pending, inactive, or deleted.
- **FR-026**: Each hosteler row MUST display the hosteler's name, room number, phone number, and current status.
- **FR-027**: The owner MUST be able to deactivate any active hosteler. If the hosteler has food preferences recorded for future dates at the time of deactivation, the owner MUST be shown a confirmation dialog: "This hosteler has submitted preferences for [N] future dates. These will remain and be included in billing. Deactivate anyway?" Deactivation only proceeds upon explicit owner confirmation. Upon deactivation, the hosteler's active sessions MUST be invalidated immediately; any subsequent API call from the deactivated hosteler MUST return HTTP 401 with an "Account deactivated" message.
- **FR-028**: The owner MUST be able to reactivate any inactive hosteler.
- **FR-028a**: In v1, deletion is supported only from pending or active status. Inactive hostelers are not directly deletable; the deleted view contains only records deleted from pending or active status.
- **FR-029**: The owner MUST be able to generate a new invite link for any hosteler (invalidating any existing unused link). Token supersession ordering MUST be deterministic by latest token generation timestamp (`generated_at`); if multiple tokens share the same timestamp, later persisted token creation order determines precedence. If a newer invite has been regenerated before submission, any older already-open invite/reset page MUST fail on submit with `HTTP 409` and `invite_superseded`, and require reopening the latest link.
- **FR-029e**: For active PIN-linked hostelers, owner "Reset" invite regeneration MUST act as a secure owner-assisted forgot-PIN recovery path. Opening a valid regenerated link MUST lead to PIN reset (not re-activation), require the hosteler to set a new 4-digit PIN, and preserve all existing account status and history.
- **FR-029f**: Route ownership for this flow MUST be explicit: owner reset-link generation is handled by `POST /api/hostelers/[id]/reset-invite`; owner-assisted reset submit semantics are handled by `POST /api/invite/activate` using the invite token. The submit route MUST branch behavior between standard onboarding activation and owner-assisted reset based on hosteler status and linked credential context.
- **FR-029a**: The owner MUST be able to delete any pending hosteler directly. Deleting a pending hosteler MUST invalidate any unused invite and prevent any future activation, while preserving an owner-visible deleted record for tracking and audit purposes.
- **FR-029b**: The owner MUST be able to delete any active hosteler. Deleting an active hosteler MUST be treated as a moved-out-of-PG event: login access is revoked immediately across all active sessions on all devices, no new submissions are allowed, past and same-day owner-visible tracked history is preserved rather than removed, and any food preferences dated after the deletion effective date MUST be canceled so they are excluded from normal owner history/export, future operational counts, and billing. The deletion effective date is the IST calendar date on which the owner confirms deletion, so records dated on that same IST date are preserved and only later-dated records are canceled.
- **FR-029c**: Deleted hostelers MUST remain viewable by the owner in a dedicated deleted status view showing full name, room number, phone number, deletion timestamp, and whether the record was deleted from pending or active status. For active deletions, this deleted/audit view MUST also be the only owner-visible location where canceled future-dated food preferences remain available for audit.
- **FR-029d**: Deleted hosteler records are audit-only in v1. The owner MUST NOT be able to restore, reactivate, or otherwise move a deleted record back into pending, active, or inactive status from the deleted view.

**Food History**

- **FR-030**: Hostelers MUST be able to view a per-day food preference history for any selected month.
- **FR-031**: History MUST show whether each meal (breakfast, lunch, dinner) was opted on each date.
- **FR-032**: A monthly summary MUST show the total number of days each meal type was opted.
- **FR-033**: The owner MUST be able to view food history for any non-deleted or preserved historical hosteler records, filterable by hosteler and date range. Canceled future-dated food preferences created by active-hosteler deletion MUST NOT appear in this normal owner food history view.
- **FR-034**: The owner MUST be able to export the currently filtered food history as a CSV file. Canceled future-dated food preferences created by active-hosteler deletion MUST NOT be included in the normal owner history CSV export.

**Monthly Billing**

- **FR-035**: The owner MUST be able to trigger bill generation for any selected month and year.
- **FR-036**: Bill generation MUST calculate each hosteler's total as: (days breakfast opted × breakfast rate) + (days lunch opted × lunch rate) + (days dinner opted × dinner rate).
- **FR-037**: If a meal rate changed during the selected month, the system MUST apply the rate that was effective on each individual day.
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

- **FR-059**: All automated tests (unit, integration, and E2E) MUST pass before any build or deployment can proceed.
- **FR-060**: The deployment pipeline MUST be blocked if tests or the build step fail.
- **FR-061**: Each user story MUST have corresponding E2E tests that verify its acceptance scenarios in a real browser environment.
- **FR-062**: After completing any phase, all relevant automated tests MUST be executed and pass before the phase is considered done.
- **FR-063**: Per-story test scripts MUST exist to allow running tests scoped to a specific user story independently.
- **FR-064**: E2E tests MUST use a global setup that seeds required test data (test owner user, test hosteler user with known credentials) into Supabase before tests run, and a global teardown that cleans up test data after tests complete.
- **FR-065**: E2E test credentials MUST be stored in environment variables (not hardcoded) and use a dedicated test owner account and test hosteler account that are pre-provisioned in the Supabase project.
- **FR-066**: Existing and future E2E tests MUST be audited and corrected so each completed story proves at least one exact, falsifiable business outcome from its independent test, using the real UI and real Next.js API routes for the behavior under test. Route mocks, conditional skips, broad placeholder assertions, and direct cookie or localStorage session injection MUST NOT be accepted as core evidence for the feature being validated.
- **FR-067**: Cross-role E2E workflows MUST prove producer-to-consumer behavior in the same test or an explicitly linked sequence. For food submission and owner dashboard validation, a hosteler MUST submit exact breakfast, lunch, and dinner preferences through the UI, and the owner dashboard MUST show the exact resulting meal counts and move that hosteler from Pending to Submitted.
- **FR-068**: Owner dashboard E2E validation MUST cover both the initial fetched dashboard state and a live update caused by a real hosteler submission. The same resulting counts and Pending/Submitted membership MUST remain correct after a page reload so the accepted evidence proves both live and reload-stable behavior.
- **FR-069**: Authentication E2E validation MUST log in owner and hosteler users through the real login UI and server-side auth routes, wait for post-login client effects, reload the authenticated page, and verify the user remains on the correct role surface. Direct cookie or localStorage injection is allowed only for documented setup helpers, never as the core proof that login works.
- **FR-070**: Local and CI deployment validation MUST include `npm run build:cloudflare` before any deployment or phase-complete claim. This gate MUST catch strict TypeScript, Next.js production build, and Cloudflare Pages adapter/runtime failures that unit tests or E2E tests may not exercise.

**Android Mobile App Experience**

- **FR-071**: Android mobile MUST be treated as the primary user experience for all completed user-facing screens, not as a desktop layout merely reduced to a smaller viewport.
- **FR-072**: Every completed hosteler-facing and owner-facing screen MUST be usable at a 375 px wide Android mobile viewport with no page-level horizontal overflow, clipped primary content, overlapping interactive elements, or unreachable primary actions.
- **FR-073**: Navigation on Android mobile MUST behave like a mobile app experience: primary owner and hosteler destinations must be reachable from the current role shell without relying on desktop-width sidebars, hover interactions, or off-screen menus.
- **FR-074**: Interactive controls on Android mobile MUST be touch-friendly, with enough target size and spacing to avoid accidental activation in normal one-handed use.
- **FR-075**: Text, labels, form fields, table/card content, dialog content, and status messages on Android mobile MUST remain readable without requiring pinch zoom, and long values MUST wrap, truncate with accessible context, or reflow without breaking the screen.
- **FR-076**: Android mobile viewport behavior MUST remain stable across normal browser mode and installed PWA standalone mode, including safe spacing around the top and bottom viewport edges, modal/dialog positioning, virtual-keyboard interactions, and offline/online state changes.
- **FR-077**: Core hosteler flows on Android mobile at 375 px width and in installed PWA standalone mode MUST support login, dashboard review, food preference submission, submission confirmation, and navigation back to the dashboard without layout breakage.
- **FR-078**: Core owner flows on Android mobile at 375 px width and in installed PWA standalone mode MUST support login, dashboard count review, pending/submitted review, hosteler management actions, and settings updates without layout breakage.
- **FR-079**: Completion evidence for any user-facing screen MUST include validation at the 375 px Android mobile baseline; if the screen participates in installed app usage, evidence MUST also include installed or standalone PWA context validation where applicable.

---

### Key Entities

- **Hosteler**: A paying guest registered by the owner. Identified by name, phone number, and room number. Has a lifecycle status of pending (invite sent, not yet activated), active (can log in and submit), or inactive (deactivated). If deleted from pending or active status, the person remains represented through an owner-visible deleted record rather than disappearing from owner tracking.
- **Deleted Hosteler Record**: An owner-visible audit record created when a pending or active hosteler is deleted. Retains identifying details, deletion timing, prior status, and, for active deletions, the preserved past and same-day operational and billing history associated with the move-out event. Its deletion effective date is the IST calendar date on which the owner confirmed deletion: records dated on that same IST date and earlier remain preserved, while records dated later are canceled. It also retains canceled future-dated food preferences after the deletion effective date as audit-only records visible only inside the deleted hosteler's dedicated deleted/audit view and excluded from normal owner history/export, dashboard counts, and billing. Deleted records are audit-only and are not restorable in v1.
- **Invite Token**: A unique, time-limited, one-time credential generated by the owner to provision a new hosteler or assist credential recovery for an active PIN-linked hosteler. Expires in 7 days and progresses through explicit states: latest active, superseded, used, or expired.
- **Food Preference**: A hosteler's daily meal selection for a specific date. Records whether the hosteler opted for breakfast, lunch, and/or dinner. One record per hosteler per day; later submissions replace earlier ones.
- **Meal Rate**: The price per meal type (breakfast, lunch, dinner) as configured by the owner. Each rate record has an effective start date, allowing historical rate lookup for accurate billing.
- **Monthly Bill**: A computed record of a hosteler's total meals and charges for a given calendar month. Produced by manual owner action.
- **Settings**: System-wide configuration values. Includes the daily submission deadline time, which is owner-configurable.
- **Android Mobile App Experience**: The primary presentation and interaction mode for Deekshana Castle on Android phones, covering Android Chrome and installed standalone PWA usage. It includes mobile navigation, viewport-safe layout, touch-friendly controls, readable content, and validation at the 375 px mobile baseline.

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
- **SC-014**: At 375 px Android mobile viewport width, 100% of completed user-facing screens complete mobile layout validation with no page-level horizontal scrolling, no clipped primary content, no overlapping controls, and no unreachable primary action.
- **SC-015**: In installed Android PWA standalone mode, the core hosteler flow and core owner flow can each be completed without viewport jumps, keyboard/modal obstruction, unsafe spacing, unreadable text, or navigation dead ends.

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
- Android mobile is the primary product experience for v1. Desktop and larger tablet layouts may exist, but they must not drive design decisions that break Android Chrome or installed Android PWA usage.
- The nightly backup runs on a fixed cron schedule (2:00 AM IST) and uses the owner's Cloudflare R2 storage for retention.
- Infrastructure operates entirely on free service tiers; no recurring paid third-party services are required.
- The repository's actual application stack, including Next.js 15.3.3, is treated as the intended implementation baseline. Any conflicting plan or constitution text must be aligned to that baseline through artifact/governance updates rather than downgrading the existing implementation.
- Owner-assisted forgot-PIN in v1 is not self-service. It is initiated only by owner invite regeneration and is limited to active PIN-linked hostelers.

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
- Q: How should completed E2E tests be treated after adding Honest E2E Validation guardrails? → A: Existing and future E2E tests must be audited and corrected to prove exact business outcomes through the real UI and real Next.js API routes; broad render, route, placeholder, mock, or injected-session checks are not sufficient completion evidence.
- Q: What must owner dashboard E2E evidence prove for food-count workflows? → A: A real hosteler UI submission must change the exact breakfast, lunch, and dinner counts, move that hosteler from Pending to Submitted, and remain correct for both initial fetch and live/reload-stable dashboard behavior.
- Q: What must auth E2E evidence prove after the server-side auth proxy work? → A: Owner and hosteler login must use the real login UI and server-side auth routes, survive post-login client effects plus reload, and must not use direct cookie or localStorage injection as the core authentication proof.
- Q: How is the Next.js version conflict resolved for this feature? → A: The actual repository stack, Next.js 15.3.3, is intended; planning and constitution artifacts must align to that baseline rather than downgrading the implementation.
- Q: How should SC-001 and SC-010 be validated for v1 acceptance? → A: Treat them as scoped acceptance evidence tasks using representative browser/manual timing and seeded 100-hosteler scenarios; full load-testing infrastructure is not required unless explicitly documented later.
- Q: How should Android mobile layout breakage be handled now that the app is already a PWA? → A: Treat Android mobile as the primary product experience. Completed user-facing screens must pass 375 px mobile baseline validation, and screens used from the installed app must also pass standalone PWA validation where applicable.

### Session 2026-07-05

- Q: When an owner regenerates an invite for an already active hosteler, is the link only for onboarding, or can it support credential recovery? → A: For active PIN-linked hostelers, regenerated invite links also serve as a secure owner-assisted forgot-PIN reset path.
- Q: Which hosteler statuses are eligible for this invite-based PIN reset path? → A: Only active hostelers are eligible for owner-assisted PIN reset via regenerated invite links.
- Q: How should regenerated invite reset behavior differ for Google-linked versus PIN-linked active hostelers? → A: PIN-linked active hostelers can reset their PIN via the regenerated link; Google-linked active hostelers without a PIN cannot create a PIN through this flow in v1 and must continue using linked Google sign-in.
- Q: If a newer invite is regenerated before submit, what should happen to an older already-open reset page? → A: The older page must fail on submit with token-invalid (superseded), and the user must reopen the latest invite link.
