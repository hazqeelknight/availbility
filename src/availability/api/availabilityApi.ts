import { api } from '@/api/client';
import type {
  AvailabilityRule,
  CreateAvailabilityRulePayload,
  UpdateAvailabilityRulePayload,
  DateOverrideRule,
  CreateDateOverrideRulePayload,
  UpdateDateOverrideRulePayload,
  RecurringBlockedTime,
  CreateRecurringBlockedTimePayload,
  UpdateRecurringBlockedTimePayload,
  BlockedTime,
  CreateBlockedTimePayload,
  UpdateBlockedTimePayload,
  BufferTime,
  UpdateBufferTimePayload,
  CalculatedSlotsParams,
  CalculatedSlotsResponse,
  AvailabilityStats,
  TimezoneTestParams,
  TimezoneTestResponse,
  CacheOperationResponse,
} from '../types';

// Availability Rules API
export const availabilityRulesApi = {
  getAll: async (): Promise<AvailabilityRule[]> => {
    const response = await api.get('/availability/rules/');
    // Handle paginated response structure
    if (response.data && Array.isArray(response.data.results)) {
      return response.data.results;
    } else if (Array.isArray(response.data)) {
      // Fallback for non-paginated responses
      return response.data;
    } else {
      console.warn('API returned unexpected data structure for availability rules:', response.data);
      return [];
    }
  },

  getById: async (id: string): Promise<AvailabilityRule> => {
    const response = await api.get(`/availability/rules/${id}/`);
    return response.data;
  },

  create: async (data: CreateAvailabilityRulePayload): Promise<AvailabilityRule> => {
    const response = await api.post('/availability/rules/', data);
    return response.data;
  },

  update: async (id: string, data: UpdateAvailabilityRulePayload): Promise<AvailabilityRule> => {
    const response = await api.patch(`/availability/rules/${id}/`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/availability/rules/${id}/`);
  },
};

// Date Override Rules API
export const dateOverrideRulesApi = {
  getAll: async (): Promise<DateOverrideRule[]> => {
    const response = await api.get('/availability/overrides/');
    // Handle paginated response structure
    if (response.data && Array.isArray(response.data.results)) {
      return response.data.results;
    } else if (Array.isArray(response.data)) {
      // Fallback for non-paginated responses
      return response.data;
    } else {
      console.warn('API returned unexpected data structure for date override rules:', response.data);
      return [];
    }
  },

  getById: async (id: string): Promise<DateOverrideRule> => {
    const response = await api.get(`/availability/overrides/${id}/`);
    return response.data;
  },

  create: async (data: CreateDateOverrideRulePayload): Promise<DateOverrideRule> => {
    const response = await api.post('/availability/overrides/', data);
    return response.data;
  },

  update: async (id: string, data: UpdateDateOverrideRulePayload): Promise<DateOverrideRule> => {
    const response = await api.patch(`/availability/overrides/${id}/`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/availability/overrides/${id}/`);
  },
};

// Recurring Blocked Times API
export const recurringBlockedTimesApi = {
  getAll: async (): Promise<RecurringBlockedTime[]> => {
    const response = await api.get('/availability/recurring-blocks/');
    // Handle paginated response structure
    if (response.data && Array.isArray(response.data.results)) {
      return response.data.results;
    } else if (Array.isArray(response.data)) {
      // Fallback for non-paginated responses
      return response.data;
    } else {
      console.warn('API returned unexpected data structure for recurring blocked times:', response.data);
      return [];
    }
  },

  getById: async (id: string): Promise<RecurringBlockedTime> => {
    const response = await api.get(`/availability/recurring-blocks/${id}/`);
    return response.data;
  },

  create: async (data: CreateRecurringBlockedTimePayload): Promise<RecurringBlockedTime> => {
    const response = await api.post('/availability/recurring-blocks/', data);
    return response.data;
  },

  update: async (id: string, data: UpdateRecurringBlockedTimePayload): Promise<RecurringBlockedTime> => {
    const response = await api.patch(`/availability/recurring-blocks/${id}/`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/availability/recurring-blocks/${id}/`);
  },
};

// Blocked Times API
export const blockedTimesApi = {
  getAll: async (): Promise<BlockedTime[]> => {
    const response = await api.get('/availability/blocked/');
    // Handle paginated response structure
    if (response.data && Array.isArray(response.data.results)) {
      return response.data.results;
    } else if (Array.isArray(response.data)) {
      // Fallback for non-paginated responses
      return response.data;
    } else {
      console.warn('API returned unexpected data structure for blocked times:', response.data);
      return [];
    }
  },

  getById: async (id: string): Promise<BlockedTime> => {
    const response = await api.get(`/availability/blocked/${id}/`);
    return response.data;
  },

  create: async (data: CreateBlockedTimePayload): Promise<BlockedTime> => {
    const response = await api.post('/availability/blocked/', data);
    return response.data;
  },

  update: async (id: string, data: UpdateBlockedTimePayload): Promise<BlockedTime> => {
    const response = await api.patch(`/availability/blocked/${id}/`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/availability/blocked/${id}/`);
  },
};

// Buffer Time API
export const bufferTimeApi = {
  get: async (): Promise<BufferTime> => {
    const response = await api.get('/availability/buffer/');
    return response.data;
  },

  update: async (data: UpdateBufferTimePayload): Promise<BufferTime> => {
    const response = await api.patch('/availability/buffer/', data);
    return response.data;
  },
};

// Calculated Slots API (Public)
export const calculatedSlotsApi = {
  get: async (organizerSlug: string, params: CalculatedSlotsParams): Promise<CalculatedSlotsResponse> => {
    const response = await api.get(`/availability/calculated-slots/${organizerSlug}/`, { params });
    return response.data;
  },
};

// Availability Stats API
export const availabilityStatsApi = {
  get: async (): Promise<AvailabilityStats> => {
    const response = await api.get('/availability/stats/');
    return response.data;
  },
};

// Cache Management API
export const cacheManagementApi = {
  clear: async (): Promise<CacheOperationResponse> => {
    const response = await api.post('/availability/cache/clear/');
    return response.data;
  },

  precompute: async (daysAhead?: number): Promise<CacheOperationResponse> => {
    const response = await api.post('/availability/cache/precompute/', { days_ahead: daysAhead });
    return response.data;
  },
};

// Timezone Testing API
export const timezoneTestApi = {
  test: async (params: TimezoneTestParams): Promise<TimezoneTestResponse> => {
    const response = await api.get('/availability/test/timezone/', { params });
    return response.data;
  },
};