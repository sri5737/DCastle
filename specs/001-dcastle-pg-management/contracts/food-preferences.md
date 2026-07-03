# API Contracts: Food Preferences

**Phase**: 1 — Design & Contracts | **Date**: 2026-07-03

All routes declare `export const runtime = 'edge'`.

---

## POST `/api/food/submit`

Submit or update food preferences for tomorrow.

**Auth**: Authenticated hosteler (active status required)

**Request**:
```json
{
  "breakfast": true,
  "lunch": false,
  "dinner": true
}
```

**Response 200** (upsert successful):
```json
{
  "date": "2026-07-04",
  "breakfast": true,
  "lunch": false,
  "dinner": true,
  "submitted_at": "2026-07-03T14:30:00.000Z",
  "updated_at": "2026-07-03T14:30:00.000Z"
}
```

**Response 403** (past deadline):
```json
{
  "error": "Submissions are closed for tomorrow",
  "deadline": "21:00",
  "server_time": "21:05:32"
}
```

**Response 401**: `{ "error": "Unauthorized" }`  
**Response 403**: `{ "error": "Account is inactive" }`

**Server-side validation**:
1. Verify authenticated user is an active hosteler
2. Get `deadline_time` from `settings` table
3. Get current IST time using `Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata' })`
4. If current IST time > deadline_time → reject with 403
5. Compute tomorrow's date (IST calendar day)
6. UPSERT into `food_preferences` on `(hosteler_id, date)` conflict

**Upsert SQL**:
```sql
INSERT INTO food_preferences (hosteler_id, date, breakfast, lunch, dinner, submitted_at, updated_at)
VALUES ($1, $2, $3, $4, $5, now(), now())
ON CONFLICT (hosteler_id, date)
DO UPDATE SET breakfast = $3, lunch = $4, dinner = $5, updated_at = now()
RETURNING *;
```

---

## GET `/api/food/history`

Retrieve food preference history for a hosteler or all hostelers.

**Auth**: Authenticated user

**Query params**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `month` | integer (1-12) | Yes* | Target month (*required for hosteler queries) |
| `year` | integer | Yes* | Target year (*required for hosteler queries) |
| `hosteler_id` | uuid | No | Filter by hosteler (owner only) |
| `start_date` | date (YYYY-MM-DD) | No | Start of date range (owner only, overrides month/year if provided) |
| `end_date` | date (YYYY-MM-DD) | No | End of date range (owner only, overrides month/year if provided) |
| `format` | string | No | `json` (default) or `csv` (owner only) |

**Note**: Owner can query by either `month`+`year` OR `start_date`+`end_date`. If both are provided, date range takes precedence. Hostelers always use `month`+`year`.

**Response 200** (hosteler view — own data):
```json
{
  "month": 7,
  "year": 2026,
  "days": [
    { "date": "2026-07-01", "breakfast": true, "lunch": true, "dinner": false },
    { "date": "2026-07-02", "breakfast": false, "lunch": true, "dinner": true }
  ],
  "summary": {
    "breakfast_count": 1,
    "lunch_count": 2,
    "dinner_count": 1,
    "total_days": 2
  }
}
```

**Response 200** (owner view with `hosteler_id`):
Same structure as above.

**Response 200** (owner view with `format=csv`):
```
Content-Type: text/csv
Content-Disposition: attachment; filename="food-history-2026-07.csv"

Date,Hosteler,Room,Breakfast,Lunch,Dinner
2026-07-01,Rahul Kumar,101,Yes,Yes,No
2026-07-02,Rahul Kumar,101,No,Yes,Yes
```

**Authorization logic**:
- Hostelers can only query their own data (hosteler_id is inferred from session)
- Owner can query any hosteler or omit hosteler_id for all records
- CSV export is owner-only

---

## GET `/api/food/today-status`

Get the current user's submission status for tomorrow (used by hosteler dashboard).

**Auth**: Authenticated hosteler

**Response 200** (submitted):
```json
{
  "submitted": true,
  "date": "2026-07-04",
  "preferences": {
    "breakfast": true,
    "lunch": false,
    "dinner": true
  },
  "deadline": "21:00",
  "deadline_passed": false,
  "server_time_ist": "18:30:00"
}
```

**Response 200** (not yet submitted):
```json
{
  "submitted": false,
  "date": "2026-07-04",
  "preferences": null,
  "deadline": "21:00",
  "deadline_passed": false,
  "server_time_ist": "18:30:00"
}
```

---

## GET `/api/food/counts`

Get aggregated meal counts for tomorrow (owner dashboard).

**Auth**: Owner only

**Response 200**:
```json
{
  "date": "2026-07-04",
  "counts": {
    "breakfast": 28,
    "lunch": 35,
    "dinner": 32
  },
  "total_active_hostelers": 40,
  "submitted_count": 36,
  "pending_count": 4,
  "pending_hostelers": [
    { "id": "uuid", "name": "Amit Kumar", "room_number": "205" },
    { "id": "uuid", "name": "Priya Sharma", "room_number": "312" }
  ],
  "deadline": "21:00",
  "server_time_ist": "18:30:00"
}
```

**Note**: This endpoint is for initial load. Live updates come via Supabase Realtime subscription on `food_preferences` table.
