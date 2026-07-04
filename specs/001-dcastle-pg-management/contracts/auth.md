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

Activate a hosteler account using an invite token.

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

**Response 400**: `{ "error": "Invalid or expired invite token" }`  
**Response 400**: `{ "error": "PIN must be exactly 4 digits" }`  
**Response 409**: `{ "error": "Token already used" }`

**Side effects**:
- Marks token as `used = true`
- Updates hosteler: sets `google_id` or `pin_hash`, `status = 'active'`, `activated_at = now()`
- Creates Supabase Auth user and links `auth_user_id`

**Validation**:
- Token must exist, not be used, and not be expired
- PIN must match `^\d{4}$`
- Google token is verified against Google's token info endpoint

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
