import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { queryKeys } from '@/api/queryClient';
import {
  availabilityRulesApi,
  dateOverrideRulesApi,
  recurringBlockedTimesApi,
  blockedTimesApi,
  bufferTimeApi,
  calculatedSlotsApi,
  availabilityStatsApi,
  cacheManagementApi,
  timezoneTestApi,
} from '../api/availabilityApi';
import type {
  CreateAvailabilityRulePayload,
  UpdateAvailabilityRulePayload,
  CreateDateOverrideRulePayload,
  UpdateDateOverrideRulePayload,
  CreateRecurringBlockedTimePayload,
  UpdateRecurringBlockedTimePayload,
  CreateBlockedTimePayload,
  UpdateBlockedTimePayload,
  UpdateBufferTimePayload,
  CalculatedSlotsParams,
  TimezoneTestParams,
} from '../types';

// Availability Rules Hooks
export const useAvailabilityRules = () => {
  return useQuery({
    queryKey: queryKeys.availability.rules(),
    queryFn: availabilityRulesApi.getAll,
  });
};

export const useAvailabilityRule = (id: string) => {
  return useQuery({
    queryKey: [...queryKeys.availability.rules(), id],
    queryFn: () => availabilityRulesApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateAvailabilityRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAvailabilityRulePayload) => availabilityRulesApi.create(data),
    onSuccess: () => {
      // Force refetch of availability rules to ensure UI updates
      queryClient.invalidateQueries({ queryKey: queryKeys.availability.rules() });
      queryClient.refetchQueries({ queryKey: queryKeys.availability.rules() });
      queryClient.invalidateQueries({ queryKey: queryKeys.availability.stats() });
      toast.success('Availability rule created successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to create availability rule');
    },
  });
};

export const useUpdateAvailabilityRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAvailabilityRulePayload }) =>
      availabilityRulesApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.availability.rules() });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.availability.rules(), id] });
      queryClient.invalidateQueries({ queryKey: queryKeys.availability.stats() });
      toast.success('Availability rule updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to update availability rule');
    },
  });
};

export const useDeleteAvailabilityRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => availabilityRulesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.availability.rules() });
      queryClient.invalidateQueries({ queryKey: queryKeys.availability.stats() });
      toast.success('Availability rule deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to delete availability rule');
    },
  });
};

// Date Override Rules Hooks
export const useDateOverrideRules = () => {
  return useQuery({
    queryKey: queryKeys.availability.overrides(),
    queryFn: dateOverrideRulesApi.getAll,
  });
};

export const useDateOverrideRule = (id: string) => {
  return useQuery({
    queryKey: [...queryKeys.availability.overrides(), id],
    queryFn: () => dateOverrideRulesApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateDateOverrideRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDateOverrideRulePayload) => dateOverrideRulesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.availability.overrides() });
      queryClient.invalidateQueries({ queryKey: queryKeys.availability.stats() });
      toast.success('Date override created successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to create date override');
    },
  });
};

export const useUpdateDateOverrideRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDateOverrideRulePayload }) =>
      dateOverrideRulesApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.availability.overrides() });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.availability.overrides(), id] });
      queryClient.invalidateQueries({ queryKey: queryKeys.availability.stats() });
      toast.success('Date override updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to update date override');
    },
  });
};

export const useDeleteDateOverrideRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => dateOverrideRulesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.availability.overrides() });
      queryClient.invalidateQueries({ queryKey: queryKeys.availability.stats() });
      toast.success('Date override deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to delete date override');
    },
  });
};

// Recurring Blocked Times Hooks
export const useRecurringBlockedTimes = () => {
  return useQuery({
    queryKey: queryKeys.availability.recurringBlocks(),
    queryFn: recurringBlockedTimesApi.getAll,
  });
};

export const useRecurringBlockedTime = (id: string) => {
  return useQuery({
    queryKey: [...queryKeys.availability.recurringBlocks(), id],
    queryFn: () => recurringBlockedTimesApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateRecurringBlockedTime = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRecurringBlockedTimePayload) => recurringBlockedTimesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.availability.recurringBlocks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.availability.stats() });
      toast.success('Recurring blocked time created successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to create recurring blocked time');
    },
  });
};

export const useUpdateRecurringBlockedTime = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRecurringBlockedTimePayload }) =>
      recurringBlockedTimesApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.availability.recurringBlocks() });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.availability.recurringBlocks(), id] });
      queryClient.invalidateQueries({ queryKey: queryKeys.availability.stats() });
      toast.success('Recurring blocked time updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to update recurring blocked time');
    },
  });
};

export const useDeleteRecurringBlockedTime = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => recurringBlockedTimesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.availability.recurringBlocks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.availability.stats() });
      toast.success('Recurring blocked time deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to delete recurring blocked time');
    },
  });
};

// Blocked Times Hooks
export const useBlockedTimes = () => {
  return useQuery({
    queryKey: queryKeys.availability.blockedTimes(),
    queryFn: blockedTimesApi.getAll,
  });
};

export const useBlockedTime = (id: string) => {
  return useQuery({
    queryKey: [...queryKeys.availability.blockedTimes(), id],
    queryFn: () => blockedTimesApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateBlockedTime = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBlockedTimePayload) => blockedTimesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.availability.blockedTimes() });
      queryClient.invalidateQueries({ queryKey: queryKeys.availability.stats() });
      toast.success('Blocked time created successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to create blocked time');
    },
  });
};

export const useUpdateBlockedTime = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBlockedTimePayload }) =>
      blockedTimesApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.availability.blockedTimes() });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.availability.blockedTimes(), id] });
      queryClient.invalidateQueries({ queryKey: queryKeys.availability.stats() });
      toast.success('Blocked time updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to update blocked time');
    },
  });
};

export const useDeleteBlockedTime = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => blockedTimesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.availability.blockedTimes() });
      queryClient.invalidateQueries({ queryKey: queryKeys.availability.stats() });
      toast.success('Blocked time deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to delete blocked time');
    },
  });
};

// Buffer Time Hooks
export const useBufferTime = () => {
  return useQuery({
    queryKey: queryKeys.availability.bufferSettings(),
    queryFn: bufferTimeApi.get,
  });
};

export const useUpdateBufferTime = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateBufferTimePayload) => bufferTimeApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.availability.bufferSettings() });
      toast.success('Buffer settings updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to update buffer settings');
    },
  });
};

// Calculated Slots Hook (Public)
export const useCalculatedSlots = (organizerSlug: string, params: CalculatedSlotsParams) => {
  return useQuery({
    queryKey: queryKeys.availability.calculatedSlots(organizerSlug, params),
    queryFn: () => calculatedSlotsApi.get(organizerSlug, params),
    enabled: !!organizerSlug && !!params.event_type_slug && !!params.start_date && !!params.end_date,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Availability Stats Hook
export const useAvailabilityStats = () => {
  return useQuery({
    queryKey: queryKeys.availability.stats(),
    queryFn: availabilityStatsApi.get,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Cache Management Hooks
export const useClearAvailabilityCache = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cacheManagementApi.clear,
    onSuccess: (data) => {
      // Invalidate all availability-related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.availability.all });
      toast.success(data.message || 'Cache cleared successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to clear cache');
    },
  });
};

export const usePrecomputeAvailabilityCache = () => {
  return useMutation({
    mutationFn: (daysAhead?: number) => cacheManagementApi.precompute(daysAhead),
    onSuccess: (data) => {
      toast.success(data.message || 'Cache precomputation initiated');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to precompute cache');
    },
  });
};

// Timezone Testing Hook
export const useTimezoneTest = (params: TimezoneTestParams) => {
  return useQuery({
    queryKey: ['availability', 'timezone-test', params],
    queryFn: () => timezoneTestApi.test(params),
    enabled: !!params.timezone,
    staleTime: 0, // Always fresh for testing
  });
};