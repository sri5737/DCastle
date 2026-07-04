# Quickstart: Validation Guide

**Phase**: 1 — Design & Contracts | **Date**: 2026-07-03

This guide documents how to validate the Deekshana Castle PG Management App end-to-end after implementation. It covers prerequisites, setup, and validation scenarios that prove each major feature works correctly.

---

## Prerequisites

- Node.js 18+ and pnpm installed
- Supabase account (free tier) with a project created
- Cloudflare account (free tier) with Pages configured
- Google Cloud Console project with OAuth 2.0 credentials (redirect URI: `{app-url}/api/auth/callback`)
- GitHub repository with Actions enabled

## Environment Setup

```bash
# Clone and install
git clone <repo-url> && cd dCastle
pnpm install

# Copy env template
cp .env.example .env.local
```

Required `.env.local` values:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Database Setup

```bash
# Apply migrations to Supabase
pnpm supabase db push

# Seed default settings and rates
pnpm supabase db seed
```

Seed data includes:
- `settings`: `deadline_time = '21:00'`
- `meal_rates`: breakfast ₹30, lunch ₹50, dinner ₹40 (effective from project start date)

## Run Locally

```bash
pnpm dev
# App available at http://localhost:3000
```

## Run Tests

```bash
pnpm test          # Vitest in watch mode
pnpm test:run      # Single run (CI mode)
```

---

## Validation Scenarios

### Scenario 1: Owner Login & Hosteler Registration

**Steps**:
1. Navigate to `/admin/login`
2. Enter owner email and password → verify redirect to `/admin/dashboard`
3. Navigate to `/admin/hostelers`
4. Click "Add Hosteler" → enter name: "Test User", phone: "9876543210", room: "101"
5. Submit → verify invite URL is displayed with copy button

**Expected**:
- Owner session persists for 7 days
- Hosteler appears in "Pending" tab with status badge
- Invite URL format: `{APP_URL}/join/{uuid}`

**Contracts referenced**: [auth.md](contracts/auth.md), [hostelers.md](contracts/hostelers.md)

---

### Scenario 2: Hosteler Activation via Google OAuth

**Steps**:
1. Open the invite URL from Scenario 1 in an incognito browser
2. Verify welcome page shows "Welcome, Test User! Room 101"
3. Click "Sign in with Google" → complete OAuth flow
4. Verify redirect to hosteler dashboard

**Expected**:
- Hosteler status changes from `pending` to `active`
- Invite token marked as `used`
- Google ID stored in hosteler record
- Supabase Auth user created and linked

**Contracts referenced**: [auth.md](contracts/auth.md)

---

### Scenario 3: Hosteler Activation via PIN

**Steps**:
1. Generate a new invite for a second hosteler
2. Open invite URL → click "Set up PIN instead"
3. Verify phone is pre-filled and read-only
4. Enter PIN "1234", confirm PIN "1234" → submit
5. Verify redirect to hosteler dashboard

**Expected**:
- PIN stored as bcryptjs hash (verify in DB: NOT plaintext)
- Hosteler activated with `pin_hash` set
- Can subsequently log in at `/login` with phone + PIN

---

### Scenario 4: Food Preference Submission (Before Deadline)

**Steps**:
1. Log in as an active hosteler
2. Navigate to `/submit`
3. Verify all three toggles (breakfast, lunch, dinner) are interactive
4. Toggle breakfast ON, lunch ON, dinner OFF → save
5. Verify dashboard shows green confirmation with "Breakfast, Lunch"
6. Return to `/submit` → verify pre-filled state matches
7. Change dinner to ON → save again

**Expected**:
- First save: creates `food_preferences` row for tomorrow
- Second save: updates same row (upsert — no duplicate)
- Dashboard immediately reflects latest selection

**Contracts referenced**: [food-preferences.md](contracts/food-preferences.md)

---

### Scenario 5: Deadline Enforcement

**Steps**:
1. As owner, change deadline to 2 minutes from now via `/admin/settings`
2. As hosteler, verify countdown banner appears (< 2 hours)
3. Wait for deadline to pass
4. Attempt to submit/change preferences
5. Verify form is read-only with "Submissions closed" message
6. Verify API returns 403 if attempted via curl/fetch

**Expected**:
- Client shows read-only UI after deadline
- Server rejects POST to `/api/food/submit` with 403 and deadline info
- Server time is authoritative (IST)

**Contracts referenced**: [food-preferences.md](contracts/food-preferences.md), [settings.md](contracts/settings.md)

---

### Scenario 6: Owner Real-Time Dashboard

**Steps**:
1. Open owner dashboard at `/admin/dashboard` in one browser
2. In a separate browser/incognito, log in as a hosteler and submit preferences
3. Observe owner dashboard — meal counts should update without refresh

**Expected**:
- Count cards increment within 3 seconds
- Hosteler moves from "Pending submissions" list to "Submitted" list
- If WebSocket disconnects, "Live updates paused" banner appears after 10s

**Contracts referenced**: [food-preferences.md](contracts/food-preferences.md)

---

### Scenario 7: Monthly Bill Generation with Mid-Month Rate Change

**Steps**:
1. Seed food preference data for a full month (or use a month with real data)
2. Midway through that month, set a new rate (e.g., breakfast from ₹30 → ₹35)
3. As owner, navigate to `/admin/billing`
4. Select the month → click "Generate Bills"
5. Verify bill table shows all hostelers with correct totals
6. Click into a hosteler → verify per-day breakdown shows old rate before change date, new rate after

**Expected**:
- Days before rate change: charged at ₹30/breakfast
- Days after rate change: charged at ₹35/breakfast
- Total = sum of (opted_days × applicable_rate) per meal

**Contracts referenced**: [billing.md](contracts/billing.md), [data-model.md](data-model.md)

---

### Scenario 8: Hosteler Deactivation with Future Preferences

**Steps**:
1. As a hosteler, submit food preferences for tomorrow
2. As owner, go to hosteler management → click "Deactivate" on that hosteler
3. Verify confirmation dialog mentions future preference count
4. Confirm deactivation
5. Verify hosteler cannot log in anymore
6. Verify their existing food preferences remain in the database

**Expected**:
- Confirmation dialog: "This hosteler has submitted preferences for 1 future dates..."
- After confirmation: status = `inactive`
- Login attempt shows "Account is inactive" error
- Food preferences not deleted (will be billed)

**Contracts referenced**: [hostelers.md](contracts/hostelers.md)

---

### Scenario 9: Android PWA Installation, Standalone Launch, and Offline Shell

**Steps**:
1. Open the deployed HTTPS app URL on Android Chrome on a real device or emulator.
2. Wait until the browser reports PWA install eligibility and verify the app shows an install action only after eligibility is available.
3. Tap the install action and accept the native Android Chrome installation prompt.
4. Verify the Deekshana Castle icon appears in the Android app drawer alongside native apps.
5. Launch Deekshana Castle from the Android app drawer and verify standalone mode: no browser address bar or normal Chrome UI.
6. Disable network connectivity and launch or reload the installed app.
7. Verify the cached app shell loads with layout, navigation, and login/primary shell UI visible.
8. Navigate to data-dependent areas and verify they show an offline state instead of a blank page, browser error, or broken UI.
9. Re-enable network and verify normal data loading recovers.

**Expected**:
- `/manifest.json` serves `name`, `short_name`, `start_url`, `scope`, `display: "standalone"`, `theme_color`, `background_color`, and Android icon metadata.
- Icons include 192x192, 512x512, and maskable support, and resolve successfully from the deployed app.
- Service worker registers successfully and caches the core app shell.
- Install UI does not appear when unsupported, unavailable, already installed, or before Android Chrome reports eligibility.
- Installed app appears in the Android app drawer with Deekshana Castle name/icon.
- App drawer launch opens standalone without browser chrome.
- Offline launch renders the app shell within 3 seconds and shows offline states for data-dependent actions.

**Automated checks**:
- Manifest required fields and icon metadata.
- Service worker registration.
- Offline app shell under disabled network conditions.
- Install prompt visibility/hidden states where browser automation supports simulation.

**Manual evidence to record**:
- Device or emulator name, Android version, Chrome version, deployment URL, validation date, app drawer screenshot/notes, standalone launch result, and offline shell result.

**Contracts referenced**: [pwa.md](contracts/pwa.md)

---

### Scenario 10: CI/CD Pipeline

**Steps**:
1. Push a commit to `main` branch
2. Observe GitHub Actions workflow
3. Verify `test` job runs first (Vitest)
4. Verify `build` job runs only after `test` passes
5. Verify `deploy` job runs only after `build` passes
6. Introduce a failing test → push → verify pipeline stops at `test` job

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
