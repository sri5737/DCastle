# API Contracts: Settings

**Phase**: 1 — Design & Contracts | **Date**: 2026-07-03

All routes declare `export const runtime = 'edge'`.

---

## GET `/api/settings`

Get all system settings.

**Auth**: Authenticated user (any role)

**Response 200**:
```json
{
  "deadline_time": "21:00",
  "rates": {
    "breakfast": { "rate": 30.00, "effective_from": "2026-06-01" },
    "lunch": { "rate": 50.00, "effective_from": "2026-06-01" },
    "dinner": { "rate": 40.00, "effective_from": "2026-06-01" }
  }
}
```

**Notes**:
- `rates` shows the currently active rate for each meal (most recent by `effective_from`)
- All authenticated users can read settings (hostelers need deadline for countdown, rates for bill view)

---

## PATCH `/api/settings`

Update system settings (deadline and/or meal rates).

**Auth**: Owner only

**Request (update deadline)**:
```json
{
  "deadline_time": "20:30"
}
```

**Response 200**:
```json
{
  "deadline_time": "20:30",
  "updated_at": "2026-07-03T15:00:00.000Z"
}
```

**Request (update meal rate)**:
```json
{
  "rates": {
    "breakfast": 35.00
  }
}
```

**Response 200**:
```json
{
  "rates": {
    "breakfast": {
      "rate": 35.00,
      "effective_from": "2026-07-04"
    }
  },
  "updated_at": "2026-07-03T15:00:00.000Z"
}
```

**Request (update multiple)**:
```json
{
  "deadline_time": "20:30",
  "rates": {
    "breakfast": 35.00,
    "lunch": 55.00,
    "dinner": 45.00
  }
}
```

**Response 400**: `{ "error": "Invalid deadline_time format. Expected HH:MM" }`  
**Response 400**: `{ "error": "Rate must be a positive number" }`  
**Response 401**: `{ "error": "Unauthorized" }`

**Validation**:
- `deadline_time`: Must match `^([01]\d|2[0-3]):[0-5]\d$` (24-hour HH:MM format)
- `rates.*`: Must be positive numbers (> 0)

**Business rules**:
- Deadline changes take effect immediately (same-day enforcement changes)
- Rate changes take effect from TOMORROW (`effective_from = today + 1 day` in IST)
- A new `meal_rates` row is inserted (never update existing rows — preserves history)
- Today's submissions are still billed at the old rate; new rate applies starting tomorrow

---

## Rate history note

The `meal_rates` table is append-only for rate changes. Each `PATCH` with a rate creates a new row:

```sql
INSERT INTO meal_rates (meal_type, rate, effective_from)
VALUES ($1, $2, (CURRENT_DATE AT TIME ZONE 'Asia/Kolkata') + INTERVAL '1 day');
```

This ensures accurate per-day billing lookups and complete audit trail of rate changes.
