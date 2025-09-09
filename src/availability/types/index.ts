// Availability Module TypeScript Types

export interface AvailabilityRule {
  id: string;
  day_of_week: number;
  day_of_week_display: string;
  start_time: string; // HH:MM:SS format
  end_time: string; // HH:MM:SS format
  event_types: string[]; // Array of event type IDs
  event_types_count: number;
  spans_midnight: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAvailabilityRulePayload {
  day_of_week: number;
  start_time: string;
  end_time: string;
  event_types?: string[];
  is_active?: boolean;
}

export interface UpdateAvailabilityRulePayload extends Partial<CreateAvailabilityRulePayload> {}

export interface DateOverrideRule {
  id: string;
  date: string; // YYYY-MM-DD format
  is_available: boolean;
  start_time?: string; // HH:MM:SS format
  end_time?: string; // HH:MM:SS format
  event_types: string[]; // Array of event type IDs
  event_types_count: number;
  spans_midnight: boolean;
  reason: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateDateOverrideRulePayload {
  date: string;
  is_available: boolean;
  start_time?: string;
  end_time?: string;
  event_types?: string[];
  reason?: string;
  is_active?: boolean;
}

export interface UpdateDateOverrideRulePayload extends Partial<CreateDateOverrideRulePayload> {}

export interface RecurringBlockedTime {
  id: string;
  name: string;
  day_of_week: number;
  day_of_week_display: string;
  start_time: string; // HH:MM:SS format
  end_time: string; // HH:MM:SS format
  start_date?: string; // YYYY-MM-DD format
  end_date?: string; // YYYY-MM-DD format
  spans_midnight: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateRecurringBlockedTimePayload {
  name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
}

export interface UpdateRecurringBlockedTimePayload extends Partial<CreateRecurringBlockedTimePayload> {}

export interface BlockedTime {
  id: string;
  start_datetime: string; // ISO datetime string
  end_datetime: string; // ISO datetime string
  reason: string;
  source: 'manual' | 'google_calendar' | 'outlook_calendar' | 'apple_calendar' | 'external_sync';
  source_display: string;
  external_id: string;
  external_updated_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateBlockedTimePayload {
  start_datetime: string;
  end_datetime: string;
  reason?: string;
  is_active?: boolean;
}

export interface UpdateBlockedTimePayload extends Partial<CreateBlockedTimePayload> {}

export interface BufferTime {
  default_buffer_before: number; // minutes
  default_buffer_after: number; // minutes
  minimum_gap: number; // minutes
  slot_interval_minutes: number; // minutes
  created_at: string;
  updated_at: string;
}

export interface UpdateBufferTimePayload {
  default_buffer_before?: number;
  default_buffer_after?: number;
  minimum_gap?: number;
  slot_interval_minutes?: number;
}

export interface AvailableSlot {
  start_time: string; // ISO datetime string
  end_time: string; // ISO datetime string
  duration_minutes: number;
  local_start_time?: string; // ISO datetime string
  local_end_time?: string; // ISO datetime string
  invitee_times?: Record<string, any>;
  fairness_score?: number;
}

export interface CalculatedSlotsParams {
  event_type_slug: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  invitee_timezone?: string;
  attendee_count?: number;
  invitee_timezones?: string[];
}

export interface CalculatedSlotsResponse {
  organizer_slug: string;
  event_type_slug: string;
  start_date: string;
  end_date: string;
  invitee_timezone: string;
  attendee_count: number;
  available_slots: AvailableSlot[];
  cache_hit: boolean;
  total_slots: number;
  computation_time_ms: number;
  invitee_timezones?: string[];
  multi_invitee_mode?: boolean;
}

export interface AvailabilityStats {
  total_rules: number;
  active_rules: number;
  total_overrides: number;
  total_blocks: number;
  total_recurring_blocks: number;
  average_weekly_hours: number;
  busiest_day: string;
  daily_hours: Record<string, number>;
  cache_hit_rate: number;
  performance_summary?: Record<string, any>;
}

export interface TimezoneTestParams {
  timezone?: string;
  date?: string; // YYYY-MM-DD
}

export interface TimezoneTestResponse {
  organizer_timezone: string;
  test_timezone: string;
  test_date: string;
  offset_hours: number;
  timezone_valid: boolean;
  is_dst: boolean;
  dst_offset_hours: number;
  is_dst_transition_date: boolean;
}

export interface CacheOperationResponse {
  message: string;
}

// Form validation types
export interface AvailabilityRuleFormData {
  day_of_week: number;
  start_time: string;
  end_time: string;
  event_types: string[];
  is_active: boolean;
}

export interface DateOverrideRuleFormData {
  date: string;
  is_available: boolean;
  start_time: string;
  end_time: string;
  event_types: string[];
  reason: string;
  is_active: boolean;
}

export interface RecurringBlockedTimeFormData {
  name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface BlockedTimeFormData {
  start_datetime: string;
  end_datetime: string;
  reason: string;
  is_active: boolean;
}

export interface BufferTimeFormData {
  default_buffer_before: number;
  default_buffer_after: number;
  minimum_gap: number;
  slot_interval_minutes: number;
}

// Utility types
export const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Monday' },
  { value: 1, label: 'Tuesday' },
  { value: 2, label: 'Wednesday' },
  { value: 3, label: 'Thursday' },
  { value: 4, label: 'Friday' },
  { value: 5, label: 'Saturday' },
  { value: 6, label: 'Sunday' },
] as const;

export const BLOCKED_TIME_SOURCES = [
  { value: 'manual', label: 'Manual' },
  { value: 'google_calendar', label: 'Google Calendar' },
  { value: 'outlook_calendar', label: 'Outlook Calendar' },
  { value: 'apple_calendar', label: 'Apple Calendar' },
  { value: 'external_sync', label: 'External Sync' },
] as const;