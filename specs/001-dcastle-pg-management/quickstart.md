# Quickstart: Validation Guide

**Phase**: 1 — Design & Contracts | **Date**: 2026-07-04

This guide documents how to validate the Deekshana Castle PG Management App end to end after implementation, including the v1.2 deleted-record lifecycle.

---

## Prerequisites

- Node.js 18+
- Supabase CLI installed and authenticated
- Supabase project on the free tier
- Cloudflare Pages project on the free tier
- Google OAuth credentials with redirect URI `{app-url}/api/auth/callback`
- GitHub Actions enabled

## Environment Setup

```bash
git clone <repo-url>
cd dCastle
npm install --registry=https://registry.npmjs.org/ --progress=false
```

Create `.env.local` from `.env.example` and provide:

```text
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
E2E_TEST_OWNER_EMAIL=owner@example.com
E2E_TEST_OWNER_PASSWORD=strong-password
E2E_TEST_HOSTELER_PHONE=9876543210
E2E_TEST_HOSTELER_PIN=1234
```

## Database Setup

```bash
supabase db push
supabase db seed
```

Seed data includes:
- `settings.deadline_time = '21:00'`
- Initial breakfast, lunch, and dinner meal rates

## Run Locally

```bash
npm run dev
```

## Run Validation Commands

```bash
npm run test:run
npm run test:e2e
```

Story-scoped validation commands must exist for every user story and include the honest E2E evidence for that story, including `npm run test:us12` for the server-side auth proxy flow. Existing completed-story suites must be audited before acceptance so they prove exact business outcomes through the real UI and real Next.js API routes.

---

## Validation Scenarios

### Scenario 1: Owner Login and Hosteler Registration

1. Open `/admin/login`.
2. Sign in as owner and verify redirect to `/admin/dashboard`.
3. Open `/admin/hostelers` and add a hosteler with name, phone, and room number.
4. Verify the hosteler appears in the pending tab and an invite URL is shown.

Expected:
- Owner session persists for 7 days.
- New hosteler appears in the pending tab with `status = pending`.
- Invite URL matches `{APP_URL}/join/{token}`.

Contracts referenced: [auth.md](contracts/auth.md), [hostelers.md](contracts/hostelers.md)

---

### Scenario 2: Hosteler Activation via Google OAuth

1. Open the invite link in an incognito browser.
2. Verify the welcome view shows the hosteler name and room.
3. Complete Google sign-in.
4. Verify redirect to the hosteler dashboard.

Expected:
- Hosteler transitions from `pending` to `active`.
- Invite token is marked used.
- Supabase Auth user is linked to the hosteler.

Contracts referenced: [auth.md](contracts/auth.md)

---

### Scenario 3: Hosteler Activation via PIN

1. Generate a fresh invite for a second pending hosteler.
2. Open the invite and choose the PIN path.
3. Verify the phone number is pre-filled and read-only.
4. Set and confirm a 4-digit PIN.

Expected:
- `pin_hash` is stored as a bcryptjs hash.
- Hosteler becomes active and can later log in with phone plus PIN.

Contracts referenced: [auth.md](contracts/auth.md)

---

### Scenario 4: Food Preference Submission Before the Deadline

1. Log in as an active hosteler.
2. Open `/submit`.
3. Select meal toggles and save.
4. Reopen `/submit`, confirm values are pre-filled, then update and save again.

Expected:
- First save creates tomorrow's row.
- Second save updates the same `(hosteler_id, date)` row.
- Dashboard reflects the latest selected meals immediately.

Contracts referenced: [food-preferences.md](contracts/food-preferences.md)

---

### Scenario 5: Deadline Enforcement

1. As owner, change the deadline to a time a few minutes ahead.
2. As hosteler, verify the countdown banner appears when inside the final two hours.
3. Wait for the deadline to pass.
4. Attempt another save.

Expected:
- Submission UI becomes read-only after the deadline.
- `POST /api/food/submit` returns 403 with deadline and server-time details.
- Server-side IST time remains authoritative.

Contracts referenced: [food-preferences.md](contracts/food-preferences.md), [settings.md](contracts/settings.md)

---

### Scenario 6: Owner Real-Time Dashboard

1. Keep `/admin/dashboard` open as owner.
2. Submit or update food preferences in another browser as a hosteler.
3. Observe owner meal counts and submitted/pending lists.

Expected:
- Counts update within 3 seconds without refresh.
- Pending and submitted lists update accordingly.
- The same exact counts and Pending/Submitted membership are correct on initial fetch, after a real hosteler UI submission live update, and after reloading the dashboard.
- If the Realtime connection drops for 10 seconds, a reconnecting banner appears.

Contracts referenced: [food-preferences.md](contracts/food-preferences.md)

---

### Scenario 7: Monthly Bill Generation with Mid-Month Rate Change

1. Seed a month of food preferences.
2. Add a mid-month meal-rate change.
3. Generate bills for that month from the owner billing page.
4. Open a bill detail view.

Expected:
- Days before the change use the prior rate.
- Days after the change use the new rate.
- Totals match day-level rate application.

Contracts referenced: [billing.md](contracts/billing.md), [data-model.md](data-model.md)

---

### Scenario 8: Hosteler Deactivation with Future Preferences

1. As a hosteler, submit a preference for tomorrow.
2. As owner, deactivate that hosteler.
3. Confirm the warning dialog.
4. Attempt to use the hosteler session again.

Expected:
- Warning includes the count of future-dated preferences.
- Hosteler moves to `inactive`.
- Existing future preference remains preserved and still billable.
- Next authenticated call fails with the deactivated-account response.

Contracts referenced: [hostelers.md](contracts/hostelers.md)

---

### Scenario 9: Pending and Active Hosteler Deletion

1. Create one pending hosteler and one active hosteler.
2. Delete the pending hosteler from `/admin/hostelers`.
3. Verify the invite link becomes unusable and the hosteler appears in the deleted tab.
4. For the active hosteler, ensure there is preserved history for today and a food preference dated after the deletion effective date.
5. Trigger delete on the active hosteler, review the confirmation, and confirm the action.
6. Reopen the deleted tab, dashboard, and any owner history/billing views that cover the relevant dates.

Expected:
- Pending delete sets `status = deleted`, invalidates unused invites, and preserves an owner-visible deleted record.
- Active delete sets `status = deleted`, revokes sessions immediately, preserves past and same-day history, and cancels food preferences dated after the deletion effective date.
- The deleted-hosteler audit view is the only owner-visible surface that still shows the canceled future rows for the deleted active hosteler.
- Normal owner history/export flows do not show the canceled future rows.
- Canceled future rows no longer affect owner dashboard counts or billing generation inputs.
- Deleted tab shows name, room, phone, deletion timestamp, and whether the row came from pending or active.

Contracts referenced: [hostelers.md](contracts/hostelers.md), [food-preferences.md](contracts/food-preferences.md), [billing.md](contracts/billing.md)

---

### Scenario 10: Android PWA Installation, Standalone Launch, and Offline Shell

1. Open the deployed HTTPS app URL in Android Chrome on a real device or emulator.
2. Wait for install eligibility and verify install UI appears only after eligibility exists.
3. Install the app and verify it appears in the Android app drawer.
4. Launch from the app drawer and verify standalone mode.
5. Disable network, relaunch, and verify the app shell still loads.

Expected:
- Manifest and icons satisfy Android installability requirements.
- Service worker caches the app shell.
- Install UI is hidden when unsupported, unavailable, or already installed.
- Offline launch renders the shell and explicit offline states instead of a broken page.

Contracts referenced: [pwa.md](contracts/pwa.md)

---

### Scenario 11: CI/CD Pipeline

1. Push a commit to `main`.
2. Observe GitHub Actions.
3. Verify `test` runs before `build`, and `build` runs before `deploy`.
4. Push a failing test and verify the pipeline stops before build/deploy.

Expected:
- Deployment never runs when tests or build fail.
- Validation remains aligned with the constitution.

**Expected**:
- Three distinct jobs visible in Actions UI
- Failed test blocks build and deploy
- Successful pipeline deploys to Cloudflare Pages

---

### Scenario 11: Nightly Backup

**Steps**:
1. Manually trigger the backup workflow (or wait for cron schedule)
2. Check Cloudflare R2 bucket for `backup-YYYY-MM-DD.sql.gz`
3. Verify file is a valid gzipped SQL dump
4. Check that backups older than 90 days are cleaned up

**Expected**:
- Backup file created in R2 bucket
- File contains complete database dump
- Retention policy enforced (90-day max)
- Failure sends notification to owner
- Restore is manual only — no restore UI exists in v1

---

### Scenario 12: PIN Brute-Force Lockout

**Steps**:
1. Log in as a hosteler via PIN to confirm credentials work
2. Attempt PIN login 5 times with an incorrect PIN for the same phone number
3. On the 5th failure, verify HTTP 429 response with lockout message
4. Attempt login with the correct PIN within the 15-minute window → verify still locked
5. Wait 15 minutes (or adjust `pin_login_attempts.locked_until` in DB) → verify login succeeds

**Expected**:
- Attempts 1–4: HTTP 401 "Invalid phone number or PIN"
- Attempt 5: HTTP 429 "Too many failed attempts. Try again in 15 minutes." with `locked_until` timestamp
- Correct PIN during lockout: still HTTP 429
- After cooldown: login succeeds normally, counter is cleared

**Contracts referenced**: [auth.md](contracts/auth.md), [data-model.md](data-model.md)

---

### Scenario 13: Session Invalidation on Deactivation

**Steps**:
1. Log in as a hosteler on two separate browser sessions (simulating two devices)
2. Verify both sessions can access `/dashboard` and `/submit`
3. As owner, deactivate the hosteler (with confirmation if future preferences exist)
4. In both hosteler sessions, attempt any API call (e.g., navigate to `/dashboard`)
5. Verify both sessions receive HTTP 401 "Account deactivated" and are redirected to login

**Expected**:
- Before deactivation: both sessions work independently
- After deactivation: both sessions are invalidated simultaneously
- No manual logout required on either device
- Reactivation allows the hosteler to log in fresh but does not restore old sessions

**Contracts referenced**: [hostelers.md](contracts/hostelers.md), [auth.md](contracts/auth.md)

---

### Scenario 14: Honest E2E Evidence Audit

**Steps**:
1. Run each story-scoped command from US1 through US12, including `npm run test:us12` once added.
2. Review each Playwright suite and confirm the core story action is performed through the real UI and real Next.js API route.
3. For cross-role food/dashboard flows, confirm the hosteler submits exact meal choices through the UI and the owner dashboard shows exact resulting counts plus Pending-to-Submitted movement.
4. For auth flows, confirm owner and hosteler login use the real login UI and server-side auth routes, wait for post-login client effects, reload, and remain on the correct role surface.
5. Confirm no suite accepts route mocks, direct cookie/localStorage injection, broad placeholder assertions, conditional skips, or URL/heading-only checks as the core story proof.
6. Record scoped acceptance evidence for SC-001 and SC-010: representative login-and-submit timing under 30 seconds and seeded up-to-100-hosteler submission/dashboard behavior.

**Expected**:
- Completed and future story E2E suites prove exact, falsifiable business outcomes.
- US2 owner dashboard evidence covers initial fetch, live update, and reload-stable state.
- US4/US12 auth evidence proves reload-stable login through the server-side routes without injected-session shortcuts.
- PIN lockout and scoped performance acceptance evidence are covered before the related story or phase is marked complete.

**Contracts referenced**: [auth.md](contracts/auth.md), [food-preferences.md](contracts/food-preferences.md), [hostelers.md](contracts/hostelers.md)

---

## Test Coverage Checklist

| Area | Key Tests |
|------|-----------|
| Auth - invite token | Valid/expired/used token handling |
| Auth - Google OAuth | Link to hosteler, reject unregistered |
| Auth - PIN verify | Correct/incorrect PIN, inactive account, brute-force lockout (5 attempts → 429) |
| Auth - sessions | Concurrent multi-device sessions, invalidation on deactivation |
| Deadline | Before/after/exact boundary, timezone handling |
| Food upsert | Create new, update existing, no duplicates |
| Bill calculation | Simple month, mid-month rate change, zero preferences, regen without notification |
| RLS policies | Hosteler isolation, owner access, anon rejection |
| Realtime | Subscription connect/disconnect/reconnect |
