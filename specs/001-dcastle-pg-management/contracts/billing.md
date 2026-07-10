# API Contracts: Billing

**Phase**: 1 — Design & Contracts | **Date**: 2026-07-04

All routes declare `export const runtime = 'edge'`.

---

## POST `/api/billing/generate`

Generate or regenerate monthly bills for all billable hostelers in a month.

**Auth**: Owner only

**Request**:
```json
{
  "month": 6,
  "year": 2026
}
```

**Response 200**:
```json
{
  "month": 6,
  "year": 2026,
  "bills_generated": 39,
  "summary": {
    "total_breakfast_amount": 34200.00,
    "total_lunch_amount": 57000.00,
    "total_dinner_amount": 45600.00,
    "grand_total": 136800.00
  }
}
```

**Response 400**:
- `{ "error": "Invalid month or year" }`
- `{ "error": "Cannot generate bills for a future month" }`

**Billing source set**:
- All active hostelers for the target month.
- Any inactive hostelers with preserved, non-canceled food history in the target month.
- Any deleted-from-active hostelers with preserved, non-canceled food history in the target month.

**Bill calculation algorithm**:
1. Select the billable hosteler set for the target month.
2. Query only `food_preferences` rows where `canceled_at IS NULL`.
3. For each opted meal day, resolve the latest `meal_rates` row where `effective_from <= day`.
4. Sum per-meal counts and amounts.
5. UPSERT `monthly_bills` on `(hosteler_id, month, year)`.

**Side effects**:
- Replaces existing bills for the same month/year.
- Deleted future rows canceled by hosteler deletion never contribute to bill totals.
- Those canceled future rows remain inspectable only through the deleted-hosteler audit view, not through billing endpoints.
- No notification is sent when a bill is regenerated; the latest version is shown on next view.

---

## GET `/api/billing`

Get bills for a specific month.

**Auth**: Authenticated user

**Query params**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `month` | integer (1-12) | Yes | Billing month |
| `year` | integer | Yes | Billing year |
| `hosteler_id` | uuid | No | Single hosteler filter for owner requests |

**Response 200** (owner):
```json
{
  "month": 6,
  "year": 2026,
  "generated_at": "2026-07-01T08:00:00.000Z",
  "bills": [
    {
      "hosteler_id": "uuid",
      "name": "Rahul Kumar",
      "room_number": "101",
      "status": "deleted",
      "breakfast_count": 25,
      "lunch_count": 28,
      "dinner_count": 22,
      "breakfast_amount": 750.00,
      "lunch_amount": 1400.00,
      "dinner_amount": 880.00,
      "total_amount": 3030.00
    }
  ]
}
```

**Response 200** (hosteler):
```json
{
  "month": 6,
  "year": 2026,
  "generated_at": "2026-07-01T08:00:00.000Z",
  "bill": {
    "breakfast_count": 25,
    "lunch_count": 28,
    "dinner_count": 22,
    "breakfast_amount": 750.00,
    "lunch_amount": 1400.00,
    "dinner_amount": 880.00,
    "total_amount": 3030.00
  },
  "confirmed_by_owner": true
}
```

**Response 404**: `{ "error": "No bills generated for this month yet" }`

**Authorization logic**:
- Hostelers may view only their own bill.
- Owners may view all bills, including bills tied to deleted hosteler records.

---

## GET `/api/billing/detail`

Get the preserved per-day breakdown for one bill.

**Auth**: Authenticated user

**Query params**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `month` | integer (1-12) | Yes | Billing month |
| `year` | integer | Yes | Billing year |
| `hosteler_id` | uuid | No | Owner-selected target hosteler |

**Response 200**:
```json
{
  "month": 6,
  "year": 2026,
  "hosteler": {
    "id": "uuid",
    "name": "Rahul Kumar",
    "room_number": "101",
    "status": "deleted"
  },
  "days": [
    {
      "date": "2026-06-01",
      "breakfast": true,
      "lunch": true,
      "dinner": false,
      "breakfast_rate": 30.00,
      "lunch_rate": 50.00,
      "dinner_rate": 40.00
    }
  ],
  "totals": {
    "breakfast_count": 25,
    "lunch_count": 28,
    "dinner_count": 22,
    "breakfast_amount": 750.00,
    "lunch_amount": 1400.00,
    "dinner_amount": 880.00,
    "total_amount": 3030.00
  }
}
```

**Notes**:
- The response excludes canceled future rows.
- Canceled future rows are not bill details; they remain visible only in the deleted-hosteler audit detail.
- Deleted hosteler bills remain inspectable by the owner because preserved same-day and past history is still billable and auditable.
