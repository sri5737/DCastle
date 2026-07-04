# API Contracts: Hosteler Management

**Phase**: 1 — Design & Contracts | **Date**: 2026-07-04

All routes declare `export const runtime = 'edge'`.

---

## GET `/api/hostelers`

List hostelers, optionally filtered by lifecycle status.

**Auth**: Owner only

**Query params**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | string | No | `active`, `pending`, `inactive`, `deleted`, or omit for all |

**Response 200**:
```json
{
  "hostelers": [
    {
      "id": "uuid",
      "name": "Rahul Kumar",
      "phone": "9876543210",
      "room_number": "101",
      "status": "deleted",
      "activated_at": "2026-06-15T10:00:00.000Z",
      "deleted_at": "2026-07-04T08:30:00.000Z",
      "deleted_from_status": "active",
      "created_at": "2026-06-14T08:00:00.000Z"
    }
  ],
  "counts": {
    "active": 38,
    "pending": 2,
    "inactive": 5,
    "deleted": 3
  }
}
```

**Business rules**:
- Deleted rows remain owner-visible in this endpoint.
- Deleted rows include deletion metadata for the dedicated deleted tab.
- This list endpoint does not return canceled future-dated food-preference rows; it may return only summary metadata such as canceled-row counts for deleted-from-active hostelers.

---

## GET `/api/hostelers/[id]`

Retrieve hosteler detail for owner views, including deleted-hosteler audit detail.

**Auth**: Owner only

**Query params**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `view` | string | No | `audit` to include deleted-hosteler audit detail; omit for default detail |

**Response 200** (`view=audit` for deleted active hosteler):
```json
{
  "hosteler": {
    "id": "uuid",
    "name": "Rahul Kumar",
    "phone": "9876543210",
    "room_number": "101",
    "status": "deleted",
    "deleted_at": "2026-07-04T08:30:00.000Z",
    "deleted_from_status": "active",
    "deletion_effective_date": "2026-07-04"
  },
  "audit": {
    "preserved_history_through": "2026-07-04",
    "canceled_future_preferences": [
      {
        "date": "2026-07-05",
        "breakfast": true,
        "lunch": false,
        "dinner": true,
        "canceled_at": "2026-07-04T08:30:00.000Z",
        "cancellation_reason": "hosteler_deleted"
      }
    ]
  }
}
```

**Response 400**:
- `{ "error": "Audit view is available only for deleted hostelers" }`

**Response 404**: `{ "error": "Hosteler not found" }`

**Business rules**:
- `view=audit` is the only owner-facing API surface allowed to expose canceled future-dated food-preference rows created by active-hosteler deletion.
- For deleted-from-pending hostelers, `audit.canceled_future_preferences` is an empty list.
- Preserved past and same-day history remains available through standard owner history and billing surfaces when applicable, but canceled future rows do not.

---

## POST `/api/hostelers`

Register a new hosteler in pending status.

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

---

## PATCH `/api/hostelers/[id]`

Trigger a lifecycle action on a single hosteler.

**Auth**: Owner only

### Request: deactivate active hosteler

```json
{
  "action": "deactivate"
}
```

**Response 200** (requires confirmation):
```json
{
  "requires_confirmation": true,
  "future_preference_count": 3,
  "message": "This hosteler has submitted preferences for 3 future dates. These will remain and be included in billing. Deactivate anyway?"
}
```

**Response 200** (deactivated):
```json
{
  "hosteler": {
    "id": "uuid",
    "name": "Rahul Kumar",
    "status": "inactive"
  }
}
```

### Request: reactivate inactive hosteler

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

### Request: delete pending hosteler

```json
{
  "action": "delete"
}
```

**Response 200**:
```json
{
  "hosteler": {
    "id": "uuid",
    "name": "Rahul Kumar",
    "status": "deleted",
    "deleted_from_status": "pending",
    "deleted_at": "2026-07-04T08:30:00.000Z"
  }
}
```

### Request: delete active hosteler (preview)

```json
{
  "action": "delete"
}
```

**Response 200** (requires confirmation):
```json
{
  "requires_confirmation": true,
  "deletion_effective_date": "2026-07-04",
  "future_preference_count": 2,
  "message": "Deleting this hosteler will revoke login access immediately, preserve past and same-day history, and cancel 2 future-dated food preference rows after 2026-07-04. Delete anyway?"
}
```

### Request: delete active hosteler (confirmed)

```json
{
  "action": "delete",
  "confirmed": true
}
```

**Response 200**:
```json
{
  "hosteler": {
    "id": "uuid",
    "name": "Rahul Kumar",
    "status": "deleted",
    "deleted_from_status": "active",
    "deleted_at": "2026-07-04T08:30:00.000Z",
    "deletion_effective_date": "2026-07-04"
  },
  "canceled_future_preferences": 2
}
```

**Response 400**:
- `{ "error": "Cannot deactivate a pending hosteler" }`
- `{ "error": "Cannot reactivate a deleted hosteler" }`
- `{ "error": "Cannot delete an inactive hosteler" }`

**Response 404**: `{ "error": "Hosteler not found" }`

**Business rules**:
- Deactivation is only `active -> inactive`.
- Reactivation is only `inactive -> active`.
- Pending deletion is direct and invalidates invite usage.
- Active deletion is treated as a move-out event and always requires explicit confirmation before completion.
- Active deletion preserves history with `date <= deletion_effective_date` and cancels rows where `date > deletion_effective_date`.

**Side effects**:
- Deactivation and active deletion globally sign out the Supabase Auth user.
- Pending delete invalidates unused invite tokens.
- Active delete invalidates unused invite tokens, clears PIN-attempt state, and marks future food-preference rows canceled.
- Deleted rows remain visible only in owner views, and canceled future rows created by active deletion become audit-only data exposed through `GET /api/hostelers/[id]?view=audit`.

---

## POST `/api/hostelers/[id]/reset-invite`

Generate a new invite link for a non-deleted hosteler.

**Auth**: Owner only

**Response 200**:
```json
{
  "token": "uuid-v4-string",
  "invite_url": "https://{domain}/join/{token}",
  "expires_at": "2026-07-10T00:00:00.000Z"
}
```

**Response 400**: `{ "error": "Cannot reset invite for a deleted hosteler" }`

**Response 404**: `{ "error": "Hosteler not found" }`

**Side effects**:
- Marks all existing unused tokens for this hosteler as used.
- Creates a new 7-day invite token.
- Does not change the hosteler lifecycle status or clear existing auth linkage.
