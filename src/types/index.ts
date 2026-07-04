// ============================================================
// Database Entity Types
// ============================================================

export type HostelerStatus = 'pending' | 'active' | 'inactive' | 'deleted';

export type DeletedFromStatus = 'pending' | 'active';

export type FoodPreferenceCancellationReason = 'hosteler_deleted';

export interface Hosteler {
  id: string;
  name: string;
  phone: string;
  room_number: string;
  status: HostelerStatus;
  google_id: string | null;
  pin_hash: string | null;
  auth_user_id: string | null;
  activated_at: string | null;
  deleted_at: string | null;
  deleted_from_status: DeletedFromStatus | null;
  deletion_effective_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface InviteToken {
  id: string;
  hosteler_id: string;
  token: string;
  used: boolean;
  expires_at: string;
  created_at: string;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner';

export interface FoodPreference {
  id: string;
  hosteler_id: string;
  date: string;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  submitted_at: string;
  updated_at: string;
  canceled_at: string | null;
  cancellation_reason: FoodPreferenceCancellationReason | null;
}

export interface DeletedHostelerAudit {
  preserved_history_through: string;
  canceled_future_preferences: FoodPreference[];
}

export interface MealRate {
  id: string;
  meal_type: MealType;
  rate: number;
  effective_from: string;
  created_at: string;
}

export interface MonthlyBill {
  id: string;
  hosteler_id: string;
  month: number;
  year: number;
  breakfast_count: number;
  lunch_count: number;
  dinner_count: number;
  breakfast_amount: number;
  lunch_amount: number;
  dinner_amount: number;
  total_amount: number;
  generated_at: string;
}

export interface Setting {
  key: string;
  value: string;
  updated_at: string;
}

// ============================================================
// API Response Types
// ============================================================

export interface ApiError {
  error: string;
}

export interface SettingsResponse {
  deadline_time: string;
  rates: {
    breakfast: { rate: number; effective_from: string };
    lunch: { rate: number; effective_from: string };
    dinner: { rate: number; effective_from: string };
  };
}

export interface InviteGenerateResponse {
  token: string;
  invite_url: string;
  expires_at: string;
}

export interface InviteActivateResponse {
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  hosteler: {
    id: string;
    name: string;
    room_number: string;
  };
}

export interface FoodSubmitRequest {
  date: string;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
}

export interface FoodStatusResponse {
  submitted: boolean;
  preference: FoodPreference | null;
  deadline_time: string;
  is_past_deadline: boolean;
  server_time: string;
}

export type UserRole = 'owner' | 'hosteler';

export interface SessionUser {
  id: string;
  email?: string;
  role: UserRole;
  hosteler_id?: string;
}
