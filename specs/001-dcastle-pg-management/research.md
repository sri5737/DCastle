# Research: Deekshana Castle PG Management App

**Phase**: 0 — Outline & Research | **Date**: 2026-07-03

## Research Tasks & Findings

### 1. Next.js 14 + Cloudflare Pages (Edge Runtime)

**Decision**: Use `@cloudflare/next-on-pages` adapter with App Router

**Rationale**: 
- Cloudflare Pages supports Next.js via the `@cloudflare/next-on-pages` adapter
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

### 4. PWA with @ducanh2912/next-pwa

**Decision**: Use `@ducanh2912/next-pwa` for service worker generation and PWA manifest

**Rationale**:
- Drop-in Next.js plugin; wraps `next.config.js`
- Auto-generates service worker for app shell caching
- Supports `manifest.json` configuration for installability
- Works with Cloudflare Pages deployment

**Key configuration**:
- Cache strategy: NetworkFirst for API calls, CacheFirst for static assets
- Offline: App shell loads from cache; data screens show offline indicator
- Install prompt: Use `beforeinstallprompt` event to show custom install UI on first visit

**Alternatives considered**:
- `next-pwa` (original) — abandoned/unmaintained
- Manual service worker — rejected (unnecessary complexity for standard PWA needs)

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

| Item | Resolution |
|------|-----------|
| Edge Runtime compatibility | bcryptjs, Web Crypto API, @supabase/supabase-js all Edge-safe |
| PIN-based auth on Supabase | Custom API route + Supabase Admin API for session creation |
| Real-time updates | Supabase Realtime (postgres_changes) with 10s reconnection banner |
| PWA approach | @ducanh2912/next-pwa (auto service worker + manifest) |
| Mid-month billing | Per-day rate lookup via `effective_from` in meal_rates |
| Backup strategy | GitHub Actions cron → pg_dump → gzip → Cloudflare R2 |
| IST deadline enforcement | Intl.DateTimeFormat in Edge Runtime, server-authoritative |
| CI/CD pipeline | 3-job GitHub Actions: test → build → deploy |

All NEEDS CLARIFICATION items resolved. No remaining unknowns.
