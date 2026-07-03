# API Contracts: Hosteler Management

**Phase**: 1 — Design & Contracts | **Date**: 2026-07-03

All routes declare `export const runtime = 'edge'`.

---

## GET `/api/hostelers`

List all hostelers, optionally filtered by status.

**Auth**: Owner only

**Query params**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | string | No | Filter: `active`, `pending`, `inactive`, or omit for all |

**Response 200**:
```json
{
  "hostelers": [
    {
      "id": "uuid",
      "name": "Rahul Kumar",
      "phone": "9876543210",
      "room_number": "101",
      "status": "active",
      "activated_at": "2026-06-15T10:00:00.000Z",
      "created_at": "2026-06-14T08:00:00.000Z"
    }
  ],
  "counts": {
    "active": 38,
    "pending": 2,
    "inactive": 5
  }
}
```

---

## POST `/api/hostelers`

Register a new hosteler (creates record in pending status).

**Auth**: Owner only

**Request**:
```json
{
  "name": "Rahul Kumar",
  "phone": "9876543210",
  "room_number": "101"
}
```

**Response 201**:
```json
{
  "hosteler": {
    "id": "uuid",
    "name": "Rahul Kumar",
    "phone": "9876543210",
    "room_number": "101",
    "status": "pending",
    "created_at": "2026-07-03T10:00:00.000Z"
  },
  "invite": {
    "token": "uuid-v4-string",
    "invite_url": "https://{domain}/join/{token}",
    "expires_at": "2026-07-10T10:00:00.000Z"
  }
}
```

**Response 409**: `{ "error": "A hosteler with this phone number already exists" }`  
**Response 400**: `{ "error": "Invalid phone number format" }`

**Validation**:
- `name`: 2-100 characters, trimmed
- `phone`: Must match `^[6-9]\d{9}$` (10-digit Indian mobile)
- `room_number`: 1-10 characters, trimmed
- Phone uniqueness enforced at database level

**Side effects**:
- Creates `hostelers` row with `status = 'pending'`
- Creates `invite_tokens` row with 7-day expiry
- Returns the invite URL for the owner to share via WhatsApp

---

## PATCH `/api/hostelers/[id]`

Update a hosteler's status (deactivate/reactivate).

**Auth**: Owner only

**Request (deactivate)**:
```json
{
  "action": "deactivate"
}
```

**Response 200** (no future preferences):
```json
{
  "hosteler": {
    "id": "uuid",
    "name": "Rahul Kumar",
    "status": "inactive"
  }
}
```

**Response 200** (has future preferences — requires confirmation):
```json
{
  "requires_confirmation": true,
  "future_preference_count": 3,
  "message": "This hosteler has submitted preferences for 3 future dates. These will remain and be included in billing."
}
```

**Request (confirm deactivate)**:
```json
{
  "action": "deactivate",
  "confirmed": true
}
```

**Request (reactivate)**:
```json
{
  "action": "reactivate"
}
```

**Response 200**:
```json
{
  "hosteler": {
    "id": "uuid",
    "name": "Rahul Kumar",
    "status": "active"
  }
}
```

**Response 400**: `{ "error": "Cannot deactivate a pending hosteler" }`  
**Response 404**: `{ "error": "Hosteler not found" }`

**Business rules**:
- Deactivation: `active → inactive`. If hosteler has `food_preferences` with `date > today`, return confirmation prompt first.
- Reactivation: `inactive → active`. Hosteler can log in again.
- Pending hostelers cannot be deactivated (they haven't activated yet).

---

## POST `/api/hostelers/[id]/reset-invite`

Generate a new invite link for a hosteler (invalidates any existing unused token).

**Auth**: Owner only

**Response 200**:
```json
{
  "token": "uuid-v4-string",
  "invite_url": "https://{domain}/join/{token}",
  "expires_at": "2026-07-10T00:00:00.000Z"
}
```

**Response 404**: `{ "error": "Hosteler not found" }`

**Side effects**:
- Marks all existing unused tokens for this hosteler as `used = true`
- Creates new `invite_tokens` row
- If hosteler was `active`, resets to `pending` (clears `google_id`, `pin_hash`, `auth_user_id`)
