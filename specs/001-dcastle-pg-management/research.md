# Research: Deekshana Castle PG Management App

**Phase**: 0 — Outline & Research | **Date**: 2026-07-04

## Research Tasks & Findings

### 1. Next.js 15.3.3 + Cloudflare Pages (Edge Runtime)

**Decision**: Use `@cloudflare/next-on-pages` adapter with App Router

**Rationale**: 
- Cloudflare Pages supports the repository's Next.js 15.3.3 baseline via the `@cloudflare/next-on-pages` adapter
- All route handlers must export `const runtime = 'edge'` — no Node.js runtime available
- Static pages are pre-rendered at build time; dynamic routes use Edge Functions
- `next.config.js` must be configured for the adapter (no `output: 'export'`)

**Alternatives considered**:
- Vercel (native Next.js support but costs $20/month on Pro) — rejected for zero-cost constraint
- `output: 'export'` static export — rejected because API routes require server-side execution

**Key constraints**:
- No `fs`, `path`, `child_process`, or Node.js `crypto` built-in
- Must use Web Crypto API (`crypto.randomUUID()`, `crypto.subtle`)
- `bcryptjs` works in Edge Runtime; `bcrypt` (native) does not
- `@supabase/supabase-js` is Edge-compatible (uses fetch)

---

### 2. Supabase Auth: Google OAuth + PIN-based login

**Decision**: Use Supabase Auth for Google OAuth; custom PIN verification via API route

**Rationale**:
- Supabase Auth natively supports Google OAuth with PKCE flow
- PIN login cannot use Supabase Auth directly (no phone/password provider for 4-digit PIN)
- Solution: Store bcryptjs-hashed PIN in `hostelers` table; custom `/api/auth/pin/verify` route validates PIN and calls `supabase.auth.admin.createUser()` or signs a custom JWT via Supabase's `signInWithPassword` using a generated email

**Implementation approach**:
- Google OAuth: Use Supabase's `signInWithOAuth({ provider: 'google' })` with redirect to `/api/auth/callback`
- PIN flow: Custom API route verifies phone+PIN against `hostelers.pin_hash`, then uses Supabase Admin API to generate a session
- Invite activation: Validate token → link Google ID or set PIN → mark hosteler as active

**Alternatives considered**:
- Custom JWT signing without Supabase Auth — rejected (loses Supabase session management, RLS relies on `auth.uid()`)
- Supabase phone auth (OTP) — rejected (requires Twilio/SMS provider, violates zero-cost)

---

### 3. Supabase Realtime for live meal counts

**Decision**: Subscribe to `food_preferences` table changes using Supabase Realtime

**Rationale**:
- Supabase Realtime provides PostgreSQL CDC (Change Data Capture) over WebSocket
- Owner dashboard subscribes to INSERT/UPDATE on `food_preferences` where `date = tomorrow`
- On each change event, re-fetch aggregated counts or maintain client-side count state

**Implementation approach**:
```typescript
supabase.channel('food-counts')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'food_preferences',
    filter: `date=eq.${tomorrowDate}`
  }, handleChange)
  .subscribe()
```

**Reconnection handling**: Supabase client auto-reconnects. Add a 10-second timeout to show "Live updates paused" banner if reconnection fails.

**Alternatives considered**:
- Polling every 5 seconds — rejected (Principle VI prefers Realtime over polling)
- Server-Sent Events from API route — rejected (more complexity, Supabase already provides this)

---

### 4. True PWA on Android Chrome

**Decision**: Keep the existing Next.js PWA architecture with `@ducanh2912/next-pwa`, but validate it against Android Chrome installability, app drawer presence, standalone launch, maskable icon, offline app shell, and install-prompt requirements.

**Rationale**:
- `@ducanh2912/next-pwa` remains the smallest architecture-preserving path for service worker generation in a Next.js App Router app deployed to Cloudflare Pages.
- Android Chrome installability is controlled by browser criteria, not only by app UI. The app must provide a valid manifest, a registered service worker with fetch handling, suitable icons, and a stable HTTPS deployment.
- App drawer presence and standalone launch cannot be proven by desktop-only tests; they require manual Android Chrome device or emulator evidence.
- Offline support is app-shell scope only: layout, navigation, login entry points, and primary owner/hosteler shells must render from cache, while fresh data and writes show offline states.

**Required manifest and icon behavior**:
- `manifest.json` includes `name`, `short_name`, `start_url`, `scope`, `display: "standalone"`, `theme_color`, `background_color`, and Android-suitable `icons`.
- Icons include at least 192x192 and 512x512 PNG assets.
- Maskable icon support is declared with `purpose: "maskable"` or `purpose: "any maskable"` so Android launchers can crop safely.

**Service worker and offline behavior**:
- Cache static assets and the core app shell needed for root layout, navigation, hosteler shell, owner shell, and login entry points.
- Use network-first or no-store behavior for API/data requests so stale operational data is not presented as fresh.
- When offline, render the cached shell and show explicit offline states for data-dependent actions instead of blank pages or browser network errors.

**Install prompt behavior**:
- Capture `beforeinstallprompt`, store the deferred event, and reveal install UI only while the event is available.
- Trigger `prompt()` only from a user gesture and record the outcome.
- Hide or disable install UI when the app is already installed, after `appinstalled`, when `matchMedia('(display-mode: standalone)')` is true, or when Android Chrome has not reported installability.

**Validation approach**:
- Automated checks: manifest response and required fields, icon metadata including maskable icons, service worker registration, offline shell load under network-disabled conditions, install UI hidden before eligibility, install UI shown after simulated `beforeinstallprompt` where the test environment supports it.
- Manual checks: Android Chrome device or emulator installs the app, Deekshana Castle appears in the app drawer with the expected icon/name, launch opens standalone without the address bar, and offline launch renders the app shell within the success-criteria window.

**Alternatives considered**:
- `next-pwa` (original) — rejected as less maintained than the selected package.
- Manual service worker only — rejected unless generated service worker behavior cannot satisfy offline app-shell caching; it would increase maintenance with no current architecture need.
- Treating PWA as only responsive web + manifest — rejected because spec v1.1 and Constitution Principle X require Android app drawer presence, standalone launch, and offline app shell evidence.

---

### 5. Bill calculation with mid-month rate changes

**Decision**: Query `meal_rates` table with `effective_from` dates; apply per-day rate lookup

**Rationale**:
- `meal_rates` stores rate history: each row has `meal_type`, `rate`, and `effective_from`
- Bill calculation joins `food_preferences` with the applicable rate for each day
- SQL approach: For each day in the billing month, find the most recent rate where `effective_from <= day`

**Algorithm**:
```sql
-- For each hosteler, for each day they opted a meal:
-- Find rate where effective_from <= that day, ordered DESC, LIMIT 1
SELECT fp.date, fp.breakfast, fp.lunch, fp.dinner,
  (SELECT rate FROM meal_rates WHERE meal_type = 'breakfast' AND effective_from <= fp.date ORDER BY effective_from DESC LIMIT 1) as breakfast_rate,
  (SELECT rate FROM meal_rates WHERE meal_type = 'lunch' AND effective_from <= fp.date ORDER BY effective_from DESC LIMIT 1) as lunch_rate,
  (SELECT rate FROM meal_rates WHERE meal_type = 'dinner' AND effective_from <= fp.date ORDER BY effective_from DESC LIMIT 1) as dinner_rate
FROM food_preferences fp
WHERE fp.hosteler_id = $1 AND fp.date BETWEEN $2 AND $3
```

**Alternatives considered**:
- Store rate snapshot per food_preference row — rejected (denormalization, harder to recalculate)
- Single rate per month — rejected (spec requires mid-month rate change support)

---

### 6. Nightly backup: GitHub Actions → pg_dump → Cloudflare R2

**Decision**: GitHub Actions cron job runs `pg_dump`, compresses, uploads to R2

**Rationale**:
- GitHub Actions provides free cron-scheduled workflows
- `pg_dump` connects to Supabase PostgreSQL via connection string (stored as Actions secret)
- Output compressed with gzip: `backup-YYYY-MM-DD.sql.gz`
- Upload to Cloudflare R2 using `aws` CLI (R2 is S3-compatible)
- 90-day retention: lifecycle rule on R2 bucket or cleanup step in workflow

**Failure alerting**: On workflow failure, send email via GitHub Actions built-in notification (owner watches the repo) or use a simple webhook.

**Alternatives considered**:
- Supabase built-in backups — only available on Pro plan ($25/month), rejected
- Manual pg_dump — rejected (not automated, error-prone)

---

### 7. Deadline enforcement (server-side IST)

**Decision**: All food preference writes validated against IST server time in API route

**Rationale**:
- API route reads `settings.deadline_time` from database
- Compares current IST time (`new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })`)
- If past deadline for tomorrow's date, reject with 403 and deadline message
- Client shows countdown for UX but server is authoritative

**Edge Runtime time handling**:
- `Date` and `Intl.DateTimeFormat` are available in Edge Runtime
- Use `Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata' })` for IST conversion
- No Node.js `moment` or `dayjs` needed — native Intl APIs suffice

**Alternatives considered**:
- Client-side only enforcement — rejected (Constitution Principle IV explicitly forbids)
- Store deadline as UTC offset — rejected (IST is fixed UTC+5:30, simpler to use timezone name)

---

### 8. CI/CD Pipeline structure

**Decision**: Three-job pipeline in `.github/workflows/ci.yml`: test → build → deploy

**Rationale**:
- Constitution Principle VIII mandates isolated test job
- `test` job: `pnpm install` → `vitest run` (must pass before build)
- `build` job: `needs: [test]` → `npx @cloudflare/next-on-pages`
- `deploy` job: `needs: [build]` → Cloudflare Pages deploy via wrangler

**Triggers**: Push to `main`, all PRs to `main`

**Alternatives considered**:
- Single job with sequential steps — rejected (violates Principle VIII)
- Vercel auto-deploy — rejected (using Cloudflare Pages)

---

## Summary of Resolved Items

All technical unknowns resolved. Architecture decisions are finalized:

1. Next.js 15.3.3 + Cloudflare Pages via `@cloudflare/next-on-pages`
2. Supabase Auth (Google OAuth) + custom PIN verify route
3. Supabase Realtime for live meal counts
4. True PWA via `@ducanh2912/next-pwa` with Android Chrome installability validation
5. Per-day rate lookup for mid-month billing
6. GitHub Actions cron → pg_dump → Cloudflare R2 for backups (restore is manual infrastructure process — no UI in v1)
7. Server-side IST deadline enforcement via Intl APIs
8. Three-job CI/CD pipeline (test → build → deploy)
9. PIN brute-force lockout via `pin_login_attempts` table (5 attempts / 15-minute cooldown)
10. Session invalidation on deactivation via Supabase Admin API `signOut(userId, 'global')`
11. Unlimited concurrent sessions — no device limit enforcement
12. Deleted hosteler lifecycle uses soft-delete metadata on the hosteler plus soft-cancellation markers on future-dated food preferences
13. Honest E2E acceptance evidence is a delivery requirement: exact business outcomes, real UI/API paths, cross-role producer-to-consumer proof, dashboard initial/live/reload-stable evidence, auth reload stability through server-side routes, PIN lockout coverage, story-scoped scripts through US12, and scoped SC-001/SC-010 performance evidence

---

### 13. Honest E2E Audit and Scoped Acceptance Evidence

**Decision**: Treat FR-066 through FR-069 and Constitution XI as a cross-cutting audit/correction requirement for every completed and future story E2E suite.

**Rationale**:
- E2E tests are acceptance evidence, so a passing suite must prove a falsifiable business outcome from the relevant independent test rather than only proving that a route, heading, or broad placeholder rendered.
- The most important workflows are cross-role. Food submission only proves business value when the owner dashboard consumes the submitted choices as exact counts and Pending/Submitted membership.
- Auth proxy validation must prove real login behavior through server-side routes and reload-stable authenticated pages; direct cookie or localStorage injection can support setup but cannot replace the core proof.
- SC-001 and SC-010 are scoped v1 acceptance checks. They require representative browser/manual timing and seeded 100-hosteler evidence, not a new load-testing platform.

**Alternatives considered**:
- Keeping existing E2E tests unchanged after the clarification — rejected because FR-066 through FR-069 explicitly require audit and correction.
- Using direct database writes or injected sessions as the primary proof — rejected because those shortcuts bypass the behavior users rely on.
- Adding full performance/load-test infrastructure for SC-001/SC-010 — rejected because the clarified success criteria require scoped acceptance evidence only.

## Addendum: Session & Security Clarifications (2026-07-04)

### 9. PIN Brute-Force Lockout Implementation

**Decision**: Track failed attempts in a `pin_login_attempts` table; enforce 5-attempt / 15-minute lockout per phone number

**Rationale**:
- Edge Runtime cannot rely on in-memory state (workers are stateless)
- A dedicated Supabase table provides persistence across worker invocations
- The `pin_login_attempts` table is keyed by `phone` with an `attempts` counter and `locked_until` timestamp
- On each failed attempt: UPSERT row, increment `attempts`; when `attempts >= 5`, set `locked_until = now() + 15 min`
- On success or after cooldown: DELETE the row (reset)
- API returns HTTP 429 when `locked_until > now()`

**Alternatives considered**:
- KV store (Cloudflare KV) — possible but adds a dependency and free-tier limits; table is simpler
- In-memory Map — rejected (Edge workers are ephemeral, state lost between requests)
- Supabase RPC function — viable but unnecessary complexity for a simple counter

---

### 10. Session Invalidation on Deactivation

**Decision**: Use Supabase Admin API `auth.admin.signOut(userId, 'global')` to revoke all sessions immediately upon deactivation

**Rationale**:
- Supabase Auth provides a server-side global sign-out that invalidates all refresh tokens for a user
- The deactivation API route (owner-only) calls this after updating `hostelers.status = 'inactive'`
- Subsequent requests from any device with a stale access token fail at JWT validation → 401
- The middleware/guard layer additionally checks `hostelers.status` and returns "Account deactivated" for clarity

**Alternatives considered**:
- Token blacklist table — rejected (unnecessary; Supabase handles this natively)
- Short-lived access tokens only — rejected (doesn't revoke immediately; waits for expiry)

---

### 11. Unlimited Concurrent Sessions

**Decision**: No session limit enforcement; each device gets an independent 30-day session

**Rationale**:
- Target user base is ~40–100 hostelers using 1–2 personal devices
- Enforcing a device cap adds complexity (session registry, eviction logic) with no business value

---

### 12. Deleted Hosteler Archive and Future-Preference Cancellation

**Decision**: Represent a deleted hosteler as the existing `hostelers` row moved to `status = 'deleted'` with deletion metadata, and cancel future-dated `food_preferences` rows by marking them canceled rather than hard-deleting them, while exposing those canceled rows only through the deleted-hosteler audit detail.

**Rationale**:
- Preserves joins from the same person to historical food preferences and monthly bills without copying data into a second archive table.
- Keeps the owner's deleted tab simple because it can read from the existing hosteler lifecycle surface using a new deleted status.
- Preserves past and same-day operational and billing history while allowing future operational queries and billing generation to exclude rows canceled by deletion.
- Avoids destructive deletion of operational data while still making the canceled future rows non-billable, absent from normal owner dashboard/history/export flows, and visible only where the spec permits: the deleted-hosteler audit view.

**Implementation approach**:
- Add `deleted_at`, `deleted_from_status`, and `deletion_effective_date` to `hostelers` and extend the status enum to include `deleted`.
- When deleting a pending hosteler: mark the hosteler deleted and invalidate any unused invite token immediately.
- When deleting an active hosteler: revoke sessions immediately, set deletion metadata, and mark every `food_preferences` row with `date > deletion_effective_date` as canceled.
- Add `canceled_at` and `cancellation_reason` to `food_preferences`; owner dashboard, normal owner history/export, and billing queries filter out canceled rows by default.
- Serve canceled future rows only from the deleted-hosteler audit detail, keyed by the deleted hosteler identity, so the owner can inspect what was canceled without reintroducing those rows into standard operational surfaces.

**Alternatives considered**:
- Separate `deleted_hosteler_records` archive table plus hard-delete of the live hosteler row — rejected because it complicates joins to preserved history and bill generation.
- Hard-delete future food-preference rows — rejected because it removes useful audit context around what was canceled as part of deletion.
- Supabase Auth naturally supports multiple refresh tokens per user without conflict
- No security concern at this scale — PIN/Google auth already gates access

**Alternatives considered**:
- Max 3 devices — rejected (unnecessary friction, no spec requirement)

---

### 12. Manual Backup Restore (No UI)

**Decision**: Backup restore remains a manual infrastructure operation in v1; no restore UI is provided

**Rationale**:
- Restoring a database backup is a destructive, irreversible operation that overwrites current data
- At the scale of one PG (40–100 users), restore events are extremely rare emergency-only actions
- Building a restore UI introduces complexity, requires confirmation flows, and creates a security surface with no proportional user value
- The owner is notified of backup failures; restoration requires direct developer/admin access to R2 + Supabase

**Alternatives considered**:
- Self-service restore button — rejected (dangerous at this maturity; deferred to future version if needed)

| Item | Resolution |
|------|-----------|
| Edge Runtime compatibility | bcryptjs, Web Crypto API, @supabase/supabase-js all Edge-safe |
| PIN-based auth on Supabase | Custom API route + Supabase Admin API for session creation |
| Real-time updates | Supabase Realtime (postgres_changes) with 10s reconnection banner |
| PWA approach | @ducanh2912/next-pwa with Android Chrome installability, manifest/icon, offline app shell, install prompt, automated PWA, and manual Android validation gates |
| Mid-month billing | Per-day rate lookup via `effective_from` in meal_rates |
| Backup strategy | GitHub Actions cron → pg_dump → gzip → Cloudflare R2 |
| IST deadline enforcement | Intl.DateTimeFormat in Edge Runtime, server-authoritative |
| CI/CD pipeline | 3-job GitHub Actions: test → build → deploy |

All NEEDS CLARIFICATION items resolved. No remaining unknowns.
