# API Contracts: Food Preferences

**Phase**: 1 — Design & Contracts | **Date**: 2026-07-04

All routes declare `export const runtime = 'edge'`.

---

## POST `/api/food/submit`

Submit or update food preferences for tomorrow.

**Auth**: Authenticated hosteler with `status = active`

**Request**:
```json
{
  "breakfast": true,
  "lunch": false,
  "dinner": true
}
```

**Response 200**:
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

**Response 401**: `{ "error": "Unauthorized" }`

**Response 403**:
- `{ "error": "Submissions are closed for tomorrow", "deadline": "21:00", "server_time": "21:05:32" }`
- `{ "error": "Account is inactive or deleted" }`

**Server-side validation**:
1. Verify the authenticated user maps to an active hosteler.
2. Read `deadline_time` from `settings`.
3. Compute current IST time.
4. Reject if current IST time is past the deadline.
5. Compute tomorrow's IST date.
6. UPSERT into `food_preferences` on `(hosteler_id, date)`.

**Notes**:
- Deleted-hosteler lifecycle changes do not remove preserved rows; they only cancel rows that fall after the deletion effective date.
- A canceled row is never returned by normal owner dashboard/history/export/billing queries.
- Canceled rows remain retrievable only through the deleted-hosteler audit detail contract in [hostelers.md](hostelers.md).

---

## GET `/api/food/history`

Retrieve preserved food history for a hosteler or for owner reporting.

**Auth**: Authenticated user

**Query params**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `month` | integer (1-12) | Yes* | Target month (*required for hosteler queries) |
| `year` | integer | Yes* | Target year (*required for hosteler queries) |
| `hosteler_id` | uuid | No | Owner-only hosteler filter |
| `start_date` | date | No | Owner-only range start |
| `end_date` | date | No | Owner-only range end |
| `format` | string | No | `json` or `csv` (owner only) |

**Response 200** (JSON):
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

**Response 200** (CSV):
```text
Content-Type: text/csv
Content-Disposition: attachment; filename="food-history-2026-07.csv"

Date,Hosteler,Room,Breakfast,Lunch,Dinner
2026-07-01,Rahul Kumar,101,Yes,Yes,No
2026-07-02,Rahul Kumar,101,No,Yes,Yes
```

**Authorization logic**:
- Hostelers can query only their own preserved history.
- Owner can query any hosteler, including deleted hostelers.
- CSV export is owner-only.

**Filtering rules**:
- Default results exclude rows where `canceled_at IS NOT NULL`.
- For deleted active hostelers, preserved rows are the rows on or before `deletion_effective_date`.
- Canceled future rows for deleted active hostelers are audit-only and are not available from this endpoint, even when the owner filters by that deleted hosteler.
- Pending-deleted hostelers normally return no food-history rows because they never activated.

---

## GET `/api/food/today-status`

Get the current hosteler's submission status for tomorrow.

**Auth**: Authenticated hosteler

**Response 200**:
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

---

## GET `/api/food/counts`

Get aggregated meal counts for tomorrow for the owner dashboard.

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

**Counting rules**:
- Only `hostelers.status = active` are considered pending/submitted for tomorrow.
- Only `food_preferences` rows with `canceled_at IS NULL` are counted.
- Deleted hostelers and canceled future rows never contribute to owner dashboard counts.
