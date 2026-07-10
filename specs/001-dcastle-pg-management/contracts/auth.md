# API Contracts: Authentication

**Phase**: 1 — Design & Contracts | **Date**: 2026-07-03

All routes declare `export const runtime = 'edge'`.

---

## POST `/api/invite/generate`

Generate a unique invite link for a hosteler.

**Auth**: Owner only (Supabase email/password session)

**Request**:
```json
{
  "hosteler_id": "uuid"
}
```

**Response 201**:
```json
{
  "token": "uuid-v4-string",
  "invite_url": "https://{domain}/join/{token}",
  "expires_at": "2026-07-10T00:00:00.000Z"
}
```

**Response 404**: `{ "error": "Hosteler not found" }`  
**Response 401**: `{ "error": "Unauthorized" }`

**Side effects**:
- Invalidates any existing unused token for this hosteler (sets `used = true`)
- Creates new `invite_tokens` row with 7-day expiry

---

## POST `/api/invite/activate`

Submit invite-token credentials for either first-time activation or owner-assisted PIN reset.

**Auth**: None (public — token itself is the credential)

**Request (Google OAuth path)**:
```json
{
  "token": "uuid-v4-string",
  "method": "google",
  "google_access_token": "string"
}
```

**Request (PIN path)**:
```json
{
  "token": "uuid-v4-string",
  "method": "pin",
  "pin": "1234"
}
```

**Response 200**:
```json
{
  "flow": "activation",
  "session": {
    "access_token": "string",
    "refresh_token": "string",
    "expires_in": 3600
  },
  "hosteler": {
    "id": "uuid",
    "name": "string",
    "room_number": "string"
  }
}
```

**Response 200** (owner-assisted reset branch):
```json
{
  "flow": "owner_assisted_pin_reset",
  "session": {
    "access_token": "string",
    "refresh_token": "string",
    "expires_in": 3600
  },
  "hosteler": {
    "id": "uuid",
    "name": "string",
    "room_number": "string"
  }
}
```

**Error response schema**:
```json
{
  "error": {
    "code": "invite_superseded",
    "message": "This invite link has been replaced by a newer one.",
    "recovery_action": "open_latest_invite_link"
  }
}
```

**Response 400**: invalid payload or PIN format
- `{ "error": { "code": "invalid_request", "message": "PIN must be exactly 4 digits", "recovery_action": "submit_valid_pin" } }`

**Response 403**: owner-assisted reset attempted for non-active lifecycle status
- `{ "error": { "code": "reset_not_allowed_non_active", "message": "PIN reset is allowed only for active hostelers.", "recovery_action": "contact_owner" } }`

**Response 409**: invite token was already consumed
- `{ "error": { "code": "invite_used", "message": "This invite link has already been used.", "recovery_action": "contact_owner" } }`

**Response 409**: older token submit after newer token generation
- `{ "error": { "code": "invite_superseded", "message": "This invite link has been replaced by a newer one.", "recovery_action": "open_latest_invite_link" } }`

**Response 409**: active Google-linked account without PIN in owner-assisted reset branch
- `{ "error": { "code": "reset_google_linked_no_pin", "message": "This account is linked to Google sign-in. Continue with your linked Google account.", "recovery_action": "continue_google_sign_in" } }`

**Response 410**: invite token expired
- `{ "error": { "code": "invite_expired", "message": "This invite link has expired.", "recovery_action": "contact_owner" } }`

**Side effects**:
- Marks token as `used = true`
- Standard activation branch updates hosteler: sets `google_id` or `pin_hash`, `status = 'active'`, `activated_at = now()`
- Owner-assisted reset branch updates only `pin_hash` and consumes token; hosteler lifecycle status and preserved history remain unchanged
- In owner-assisted reset branch, old PIN becomes invalid immediately when the success response is returned
- Creates Supabase Auth user and links `auth_user_id`

**Validation**:
- Token must exist, not be expired, and not be used
- For owner-assisted reset submit, hosteler must currently be active and PIN-linked
- Superseded check is deterministic: any token with older `generated_at` than the latest active token for the hosteler is rejected as `invite_superseded`
- PIN must match `^\d{4}$`
- Google token is verified against Google's token info endpoint

**Route ownership note**:
- `POST /api/hostelers/[id]/reset-invite` generates owner-assisted reset tokens
- `POST /api/invite/activate` owns submit-time branch semantics for both onboarding activation and owner-assisted PIN reset

---

## GET `/api/auth/callback`

OAuth callback handler for Google sign-in (used by Supabase Auth redirect flow).

**Auth**: None (redirect from Google OAuth)

**Query params**: Handled by Supabase Auth SDK internally

**Behavior**:
- Supabase processes the OAuth code exchange
- On success: Check if `google_id` exists in `hostelers` table
  - If found and `status = 'active'`: redirect to `/dashboard`
  - If found and `status != 'active'`: redirect to `/login?error=inactive`
  - If not found: redirect to `/login?error=not_registered`

---

## POST `/api/auth/pin/verify`

Authenticate a returning hosteler via phone + PIN.

**Auth**: None (public)

**Request**:
```json
{
  "phone": "9876543210",
  "pin": "1234"
}
```

**Response 200**:
```json
{
  "session": {
    "access_token": "string",
    "refresh_token": "string",
    "expires_in": 3600
  },
  "hosteler": {
    "id": "uuid",
    "name": "string",
    "room_number": "string"
  }
}
```

**Response 401**: `{ "error": "Invalid phone number or PIN" }`  
**Response 403**: `{ "error": "Account is inactive. Contact your PG owner." }`  
**Response 429**: `{ "error": "Too many failed attempts. Try again in 15 minutes.", "locked_until": "2026-07-04T21:15:00.000Z" }`

**Validation**:
- Phone must match `^[6-9]\d{9}$`
- PIN compared against `hostelers.pin_hash` using `bcryptjs.compare()`
- Hosteler must have `status = 'active'`
- Generic error message for invalid credentials (no info leakage about whether phone exists)

**Brute-force protection**: After 5 consecutive failed PIN attempts for a phone number, the account is locked out for 15 minutes. The lockout counter resets on successful login or after the 15-minute cooldown elapses. Tracked via `pin_login_attempts` table.

**Session behavior**:
- Successful login creates an independent session; multiple concurrent sessions across devices are permitted with no cap
- Each device maintains its own 30-day session independently
- If the hosteler's account is deactivated while sessions exist, all active sessions are invalidated; subsequent API calls return HTTP 401 with "Account deactivated" message
