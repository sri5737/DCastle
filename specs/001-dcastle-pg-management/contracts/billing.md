# API Contracts: Billing

**Phase**: 1 — Design & Contracts | **Date**: 2026-07-03

All routes declare `export const runtime = 'edge'`.

---

## POST `/api/billing/generate`

Generate (or regenerate) monthly bills for all active hostelers.

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
  "bills_generated": 38,
  "summary": {
    "total_breakfast_amount": 34200.00,
    "total_lunch_amount": 57000.00,
    "total_dinner_amount": 45600.00,
    "grand_total": 136800.00
  }
}
```

**Response 400**: `{ "error": "Invalid month or year" }`  
**Response 400**: `{ "error": "Cannot generate bills for a future month" }`

**Bill calculation algorithm**:
1. For each active hosteler (including those deactivated mid-month who have preferences):
2. Query `food_preferences` for the billing month
3. For each day a meal was opted:
   - Find applicable `meal_rates` row: `WHERE meal_type = X AND effective_from <= day ORDER BY effective_from DESC LIMIT 1`
   - Add `rate` to the meal's running total
4. Sum all meal totals for `total_amount`
5. UPSERT into `monthly_bills` on `(hosteler_id, month, year)` conflict

**Side effects**:
- Creates or replaces `monthly_bills` rows for all hostelers with food preferences in the target month
- Hostelers with zero preferences get a bill with all-zero counts and amounts
- No notification is sent to hostelers when bills are generated or regenerated; hostelers see the latest bill the next time they open the bill view (FR-040)

---

## GET `/api/billing`

Get bills for a specific month.

**Auth**: Authenticated user

**Query params**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `month` | integer (1-12) | Yes | Billing month |
| `year` | integer | Yes | Billing year |
| `hosteler_id` | uuid | No | Single hosteler (owner can specify; hosteler inferred from session) |

**Response 200** (owner — all hostelers):
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

**Response 200** (hosteler — own bill):
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
- Hosteler: Can only view their own bill; `hosteler_id` is inferred from session
- Owner: Can view all bills or filter by `hosteler_id`

---

## GET `/api/billing/detail`

Get per-day breakdown for a specific hosteler's bill.

**Auth**: Authenticated user

**Query params**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `month` | integer (1-12) | Yes | Billing month |
| `year` | integer | Yes | Billing year |
| `hosteler_id` | uuid | No | Target hosteler (owner can specify; hosteler inferred) |

**Response 200**:
```json
{
  "month": 6,
  "year": 2026,
  "hosteler": {
    "id": "uuid",
    "name": "Rahul Kumar",
    "room_number": "101"
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
    },
    {
      "date": "2026-06-02",
      "breakfast": false,
      "lunch": true,
      "dinner": true,
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

**Note**: The rate shown per day is the rate that was effective on that specific date, enabling transparency for mid-month rate changes.
