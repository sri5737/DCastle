# Implementation Plan: Deekshana Castle PG Management App (v1.1)

**Branch**: `001-dcastle-pg-management` | **Date**: 2026-07-04 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-dcastle-pg-management/spec.md`

## Summary

A mobile-first true Progressive Web App for managing daily food preferences at Deekshana Castle PG (~40 hostelers, max 100). Hostelers submit breakfast/lunch/dinner selections for the next day before a configurable deadline; the owner views real-time counts, manages hosteler lifecycle, and generates monthly bills. The app must be installable from Android Chrome, appear in the Android app drawer, launch in standalone mode, and load the cached app shell offline. Built with Next.js 14 (App Router, Edge Runtime), Supabase (PostgreSQL + RLS + Realtime), deployed to Cloudflare Pages on free-tier infrastructure.

## Technical Context

**Language/Version**: TypeScript 5.x, strict mode enabled

**Primary Dependencies**: Next.js 14 (App Router), Tailwind CSS, shadcn/ui, @supabase/supabase-js, @ducanh2912/next-pwa, @cloudflare/next-on-pages, bcryptjs

**Storage**: Supabase PostgreSQL (free tier) with Row Level Security + Realtime subscriptions

**Testing**: Vitest + @testing-library/react (co-located test files), Playwright (E2E browser tests in `e2e/` directory)

**Testing Strategy**:
- **Unit tests** (Vitest): Business logic, utilities, API route handlers — co-located as `*.test.ts` next to source
- **E2E tests** (Playwright): Full browser flows per user story — in `e2e/` directory at project root
- **PWA checks** (Playwright + browser/devtools validation where supported): Manifest availability and required fields, maskable icon metadata, service worker registration, offline app shell loading, install prompt behavior, and no install UI when unavailable or already installed
- **Manual Android validation**: Android Chrome device or emulator evidence for installation, app drawer icon/name, standalone launch without browser chrome, and offline app shell after install
- **E2E test data**: Global setup (`e2e/global-setup.ts`) seeds a test owner and test hosteler into Supabase using the service role key before tests run. Global teardown cleans up test data. Credentials stored in `.env.local` as `E2E_TEST_OWNER_EMAIL`, `E2E_TEST_OWNER_PASSWORD`, `E2E_TEST_HOSTELER_PHONE`, `E2E_TEST_HOSTELER_PIN`.
- **Per-story scripts**: `npm run test:us1` through `test:us4` exist for completed stories; `/speckit.tasks` must add a scoped PWA/US11 script when it updates tasks for spec v1.1
- **CI gate**: All tests must pass before deployment proceeds (`npm run test:run` + `npm run test:e2e`)

**Target Platform**: Mobile-first true PWA (375px baseline), Android Chrome installability target, Edge Runtime (Cloudflare Workers)

**Project Type**: Full-stack web application (Next.js monolith)

**Performance Goals**: Food submission < 30s end-to-end, real-time count updates < 3s, supports 100 concurrent hostelers

**Constraints**: Edge Runtime only (no Node.js APIs), zero-cost infrastructure (Cloudflare Pages free, Supabase free), Android Chrome installability, app drawer presence, standalone launch, maskable launcher icons, offline app shell via service worker

**Scale/Scope**: ~40 active users at launch (max 100), 10 screens (5 hosteler + 5 owner), single property

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | Evidence |
|---|-----------|--------|----------|
| I | Mobile-First | ✅ PASS | 375px baseline viewport, Tailwind responsive-first, shadcn/ui components, WCAG 2.1 AA tap targets |
| II | Edge Runtime Compatibility | ✅ PASS | All API routes declare `export const runtime = 'edge'`, bcryptjs (not bcrypt), crypto.randomUUID() for tokens, @cloudflare/next-on-pages adapter |
| III | Security & Data Isolation | ✅ PASS | RLS on all tables, anon key client-side only, service role server-side only, PIN stored as bcryptjs hash, invite tokens are UUIDs, unregistered Google rejected, PIN brute-force lockout (5 attempts / 15 min), session invalidation on deactivation via Supabase Admin API |
| IV | Server-Side Deadline Enforcement | ✅ PASS | API validates IST server time before food preference writes, upsert semantics (ON CONFLICT DO UPDATE), deadline from settings table |
| V | Zero-Cost Infrastructure | ✅ PASS | Cloudflare Pages free, Supabase free tier, GitHub Actions free, R2 free 10GB, no paid APIs |
| VI | TypeScript Strict Mode & Simplicity | ✅ PASS | strict: true, YAGNI (no multi-PG, no payment, no notifications in v1), Realtime over polling |
| VII | Unit Testing Coverage | ✅ PASS | Vitest + @testing-library/react, co-located *.test.ts files, covers auth/deadline/billing/RLS |
| VIII | CI/CD Pipeline with Isolated Test Job | ✅ PASS | .github/workflows/ci.yml: test → build → deploy jobs with `needs:` dependencies |
| IX | Idempotent Database Migrations | ✅ PASS | Existing schema uses guarded/idempotent migration patterns; PWA v1.1 adds no database migration |
| X | True Progressive Web App | ✅ PASS | Plan requires Android Chrome installability, Android app drawer presence, standalone launch, manifest required fields, 192/512 maskable icons, service worker app-shell caching, gated native install prompt, automated PWA checks, and manual Android device/emulator evidence |

**Gate Result**: ALL PASS — no violations, no complexity justifications needed. PWA requirements are satisfied through existing Next.js/PWA architecture with stricter validation, not through a new backend or paid service.

## Project Structure

### Documentation (this feature)

```text
specs/001-dcastle-pg-management/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API route contracts)
│   ├── auth.md
│   ├── food-preferences.md
│   ├── hostelers.md
│   ├── billing.md
│   ├── settings.md
│   └── pwa.md
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── layout.tsx                  # Root layout (PWA meta, manifest metadata, Tailwind)
│   ├── page.tsx                    # Landing/redirect
│   ├── (auth)/
│   │   ├── login/page.tsx          # Hosteler login (Google / PIN)
│   │   ├── admin/login/page.tsx    # Owner login (email/password)
│   │   └── join/[token]/page.tsx   # Invite activation page
│   ├── (hosteler)/
│   │   ├── layout.tsx              # Hosteler shell + auth guard
│   │   ├── dashboard/page.tsx      # Submission status + countdown
│   │   ├── submit/page.tsx         # Food preference form
│   │   ├── history/page.tsx        # Monthly food history
│   │   └── bill/page.tsx           # Monthly bill view
│   ├── (owner)/
│   │   ├── layout.tsx              # Owner shell + auth guard
│   │   ├── dashboard/page.tsx      # Live meal counts + pending list
│   │   ├── hostelers/page.tsx      # Hosteler management (tabs)
│   │   ├── history/page.tsx        # Food history + CSV export
│   │   ├── billing/page.tsx        # Bill generation + summary
│   │   └── settings/page.tsx       # Deadline + rates config
│   └── api/
│       ├── auth/
│       │   ├── callback/route.ts   # Google OAuth callback
│       │   └── pin/verify/route.ts # PIN login
│       ├── invite/
│       │   ├── generate/route.ts   # Create invite token
│       │   └── activate/route.ts   # Activate via token
│       ├── food/
│       │   ├── submit/route.ts     # Upsert food preference
│       │   └── history/route.ts    # Get food history
│       ├── hostelers/
│       │   ├── route.ts            # List/manage hostelers
│       │   └── [id]/route.ts       # Single hosteler actions
│       ├── billing/
│       │   ├── generate/route.ts   # Trigger bill generation
│       │   └── route.ts            # Get bills
│       └── settings/route.ts       # Get/update settings
├── components/
│   ├── ui/                         # shadcn/ui components
│   ├── food-toggle.tsx             # Meal toggle component
│   ├── countdown-banner.tsx        # Deadline countdown
│   ├── install-prompt.tsx          # Android Chrome install UI gated by beforeinstallprompt/app-installed state
│   ├── offline-indicator.tsx       # Offline state for data-dependent screens
│   ├── meal-count-card.tsx         # Real-time count display
│   └── hosteler-list.tsx           # Hosteler status list
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # Browser client (anon key)
│   │   ├── server.ts              # Server client (service role)
│   │   └── middleware.ts          # Auth middleware helper
│   ├── auth/
│   │   ├── session.ts             # Session management
│   │   └── guards.ts              # Route protection
│   ├── deadline.ts                # Server-side deadline validation
│   ├── billing.ts                 # Bill calculation logic
│   └── utils.ts                   # Shared utilities
├── types/
│   └── index.ts                   # Shared TypeScript types
└── middleware.ts                   # Next.js middleware (auth routing)

public/
├── manifest.json                  # PWA manifest: name, short_name, start_url, scope, display, colors, icons
├── sw.js                          # Service worker (generated) caching offline app shell
└── icons/                         # Android launcher icons: 192, 512, maskable variants

.github/
└── workflows/
    ├── ci.yml                     # test → build → deploy
    └── backup.yml                 # Nightly pg_dump → R2

supabase/
└── migrations/                    # SQL migration files
    └── 001_initial_schema.sql
```

**Structure Decision**: Single Next.js monolith (App Router) with co-located API routes. No separate backend — Supabase handles data layer + auth. PWA behavior remains a client/browser concern using the existing Next.js public asset, root layout metadata, service worker, and component surfaces.

## Complexity Tracking

> No violations detected — section intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
