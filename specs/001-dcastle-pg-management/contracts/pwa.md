# Browser Contract: Progressive Web App

**Phase**: 1 — Design & Contracts | **Date**: 2026-07-04

This contract defines the browser-facing requirements for Deekshana Castle's true PWA behavior and Android mobile app experience. It is not an HTTP API contract; it describes the manifest, service worker, install UI, offline shell, standalone context, and validation evidence required by the current feature specification and Constitution v1.6.0.

---

## Web App Manifest

**Path**: `/manifest.json`

**Required fields**:
```json
{
  "name": "Deekshana Castle",
  "short_name": "dCastle",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "theme_color": "#...",
  "background_color": "#...",
  "icons": []
}
```

**Icon requirements**:
- At least one 192x192 PNG icon.
- At least one 512x512 PNG icon.
- At least one Android maskable icon entry using `purpose: "maskable"` or `purpose: "any maskable"`.
- Icon paths must resolve successfully from the deployed app.

**Acceptance**:
- Android Chrome recognizes the manifest as installable when service worker and HTTPS criteria are also satisfied.
- Installed app uses the Deekshana Castle name and configured launcher icon in the Android app drawer.

---

## Service Worker and Offline App Shell

**Registration**: The app registers a service worker on supported browsers.

**Cached app-shell scope**:
- Root layout and global styles.
- Navigation and shared shell UI.
- Hosteler shell and owner shell route shells.
- Hosteler and owner login entry points.
- Static assets needed for the above shell to render.

**Data request behavior**:
- API requests and Supabase-backed data reads are not treated as authoritative offline data.
- When connectivity is unavailable, data-dependent areas show an offline state instead of a blank page or browser error.
- Mutating actions that require connectivity are blocked or fail with a clear offline state.

**Acceptance**:
- With network disabled after the app shell has been cached, launching or reloading the app renders layout and navigation within 3 seconds.
- Data-dependent actions surface offline UI rather than uncaught failures.

---

## Android Mobile App Experience

**Baseline**: Android Chrome at 375 px viewport width is the primary design and validation target for every completed owner, hosteler, and auth screen. Wider layouts are progressive enhancements.

**Layout rules**:
- No completed user-facing screen may create page-level horizontal overflow.
- Primary content, submit/save/delete actions, role navigation, dialogs, tabs, toggles, tables/lists, and settings controls must remain visible, readable, and reachable.
- Touch controls should be at least 44 px in their smallest touch dimension unless the component standard is stricter.
- Owner dashboards, hosteler lists, history, billing, export, and settings surfaces must adapt dense information into stacked cards, segmented views, contained tables, or other bounded regions that do not create page-level overflow.
- Hover-only affordances, desktop-only sidebars, off-screen menus, hidden primary actions, clipped text, overlapping controls, and unstable viewport jumps are acceptance blockers.

**Standalone PWA rules**:
- Screens used from the installed app must work in standalone display mode without relying on browser chrome spacing.
- Core hosteler standalone flow covers login, dashboard, food submission, confirmation, and dashboard return.
- Core owner standalone flow covers login, dashboard counts, pending/submitted review, hosteler management, and settings update.
- Virtual keyboard, safe-area spacing, modal positioning, offline/online indicators, and viewport height changes must not hide primary actions.

**Acceptance**:
- Automated mobile viewport checks prove no page-level overflow and primary-action reachability where Playwright can observe it.
- Manual Android Chrome or emulator evidence covers installed standalone flows where desktop automation cannot prove app-drawer launch, browser-address-bar absence, or device-specific viewport behavior.

---

## Install Prompt UI

**Eligibility source**: Android Chrome `beforeinstallprompt` event.

**Rules**:
- Install UI remains hidden or disabled until `beforeinstallprompt` is available.
- Install UI calls the deferred event's `prompt()` only in response to a user gesture.
- Install UI records whether the user accepted or dismissed the native prompt.
- Install UI is hidden after `appinstalled`.
- Install UI is hidden when `matchMedia('(display-mode: standalone)')` indicates the app is already running standalone.
- Install UI must not claim installation is available when the browser has not reported eligibility.

**Acceptance**:
- Eligible Android Chrome users receive an install action that triggers the native PWA installation flow.
- Already-installed users and non-eligible sessions are not shown a misleading install action.

---

## Validation Evidence

**Automated checks**:
- Manifest endpoint returns required fields.
- Manifest icon metadata includes 192x192, 512x512, and maskable support.
- Service worker registration succeeds in a supported browser context.
- Offline app shell loads under network-disabled conditions.
- Install UI is hidden before browser eligibility.
- Install UI appears and calls native prompt behavior when `beforeinstallprompt` can be simulated by the test environment.
- Completed user-facing screens at 375 px width do not create page-level horizontal overflow and keep primary actions reachable where this can be proven in Playwright.

**Manual Android checks**:
- Install from Android Chrome on a real device or emulator.
- Confirm Deekshana Castle appears in the Android app drawer with the expected name and icon.
- Launch from the app drawer and confirm standalone display without the browser address bar.
- Disable network and confirm the installed app loads the cached app shell and shows offline states for data-dependent areas.
- Complete applicable owner and hosteler core flows in Android Chrome and installed standalone PWA context without clipped primary content, overlapping controls, unreachable actions, or unstable viewport jumps.

Manual validation evidence should record device/emulator name, Android version, Chrome version, deployment URL, date, viewport, browser or standalone context, and pass/fail notes for the checks above.