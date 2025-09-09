// Availability Module Utilities

/**
 * Format time string for display (HH:MM:SS -> HH:MM AM/PM)
 */
export const formatTimeForDisplay = (timeString: string): string => {
  if (!timeString) return '';
  
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Format time string for form input (HH:MM:SS -> HH:MM)
 */
export const formatTimeForInput = (timeString: string): string => {
  if (!timeString) return '';
  
  const [hours, minutes] = timeString.split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
};

/**
 * Convert form time input to backend format (HH:MM -> HH:MM:SS)
 */
export const formatTimeForBackend = (timeString: string): string => {
  if (!timeString) return '';
  
  const [hours, minutes] = timeString.split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;
};

/**
 * Get weekday name from number
 */
export const getWeekdayName = (dayNumber: number): string => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return days[dayNumber] || 'Unknown';
};

/**
 * Check if a time range spans midnight
 */
export const spansMiddnight = (startTime: string, endTime: string): boolean => {
  if (!startTime || !endTime) return false;
  
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  
  const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = endHours * 60 + endMinutes;
  
  return endTotalMinutes < startTotalMinutes;
};

/**
 * Validate time range
 */
export const validateTimeRange = (startTime: string, endTime: string): string | null => {
  if (!startTime || !endTime) {
    return 'Both start and end times are required';
  }
  
  if (startTime === endTime) {
    return 'Start time and end time cannot be the same';
  }
  
  return null;
};

/**
 * Format duration in minutes to human readable
 */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }
  
  return `${hours} hr ${remainingMinutes} min`;
};

/**
 * Calculate time difference in minutes
 */
export const calculateTimeDifference = (startTime: string, endTime: string): number => {
  if (!startTime || !endTime) return 0;
  
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  
  let startTotalMinutes = startHours * 60 + startMinutes;
  let endTotalMinutes = endHours * 60 + endMinutes;
  
  // Handle midnight spanning
  if (endTotalMinutes < startTotalMinutes) {
    endTotalMinutes += 24 * 60; // Add 24 hours
  }
  
  return endTotalMinutes - startTotalMinutes;
};

/**
 * Format date for display
 */
export const formatDateForDisplay = (dateString: string): string => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Format datetime for display
 */
export const formatDateTimeForDisplay = (datetimeString: string): string => {
  if (!datetimeString) return '';
  
  const date = new Date(datetimeString);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Get relative time (e.g., "2 hours ago")
 */
export const getRelativeTime = (datetimeString: string): string => {
  if (!datetimeString) return '';
  
  const date = new Date(datetimeString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
  }
  
  return date.toLocaleDateString();
};

/**
 * Validate timezone string
 */
export const isValidTimezone = (timezone: string): boolean => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
};

/**
 * Get timezone offset in hours
 */
export const getTimezoneOffset = (timezone: string): number => {
  try {
    const date = new Date();
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    const targetTime = new Date(utc + (getTimezoneOffsetMinutes(timezone) * 60000));
    return (targetTime.getTime() - utc) / (1000 * 60 * 60);
  } catch {
    return 0;
  }
};

/**
 * Get timezone offset in minutes
 */
export const getTimezoneOffsetMinutes = (timezone: string): number => {
  try {
    const date = new Date();
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      timeZoneName: 'longOffset'
    });
    const parts = formatter.formatToParts(date);
    const offsetPart = parts.find(part => part.type === 'timeZoneName');
    
    if (offsetPart && offsetPart.value.includes('GMT')) {
      const match = offsetPart.value.match(/GMT([+-])(\d{1,2}):?(\d{2})?/);
      if (match) {
        const sign = match[1] === '+' ? 1 : -1;
        const hours = parseInt(match[2], 10);
        const minutes = parseInt(match[3] || '0', 10);
        return sign * (hours * 60 + minutes);
      }
    }
    
    return 0;
  } catch {
    return 0;
  }
};

/**
 * Sort availability rules by day of week and start time
 */
export const sortAvailabilityRules = <T extends { day_of_week: number; start_time: string }>(rules: T[]): T[] => {
  return [...rules].sort((a, b) => {
    if (a.day_of_week !== b.day_of_week) {
      return a.day_of_week - b.day_of_week;
    }
    return a.start_time.localeCompare(b.start_time);
  });
};

/**
 * Convert time string to minutes from midnight
 */
export const timeToMinutes = (timeString: string): number => {
  if (!timeString) return 0;
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Check if a new rule overlaps with existing rules
 */
export const checkRuleOverlap = <T extends { id: string; day_of_week: number; start_time: string; end_time: string; is_active?: boolean }>(
  newRule: { day_of_week: number; start_time: string; end_time: string },
  existingRules: T[],
  currentRuleId?: string
): boolean => {
  const newStartMinutes = timeToMinutes(newRule.start_time);
  const newEndMinutes = timeToMinutes(newRule.end_time);
  const newDay = newRule.day_of_week;

  // Handle midnight spanning for new rule
  const newSpansMiddnight = newEndMinutes < newStartMinutes;
  const adjustedNewEndMinutes = newSpansMiddnight ? newEndMinutes + 24 * 60 : newEndMinutes;

  for (const existingRule of existingRules) {
    // Skip the rule being edited and inactive rules
    if ((currentRuleId && existingRule.id === currentRuleId) || 
        (existingRule.is_active !== undefined && !existingRule.is_active)) {
      continue;
    }

    // Only check rules on the same day
    if (existingRule.day_of_week === newDay) {
      const existingStartMinutes = timeToMinutes(existingRule.start_time);
      const existingEndMinutes = timeToMinutes(existingRule.end_time);

      // Handle midnight spanning for existing rule
      const existingSpansMiddnight = existingEndMinutes < existingStartMinutes;
      const adjustedExistingEndMinutes = existingSpansMiddnight ? existingEndMinutes + 24 * 60 : existingEndMinutes;

      // Check for overlap using interval intersection logic
      // Two intervals [a,b] and [c,d] overlap if: max(a,c) < min(b,d)
      const overlapStart = Math.max(newStartMinutes, existingStartMinutes);
      const overlapEnd = Math.min(adjustedNewEndMinutes, adjustedExistingEndMinutes);

      if (overlapStart < overlapEnd) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Find the overlapping rule for detailed error messages
 */
export const findOverlappingRule = <T extends { id: string; day_of_week: number; start_time: string; end_time: string; is_active?: boolean }>(
  newRule: { day_of_week: number; start_time: string; end_time: string },
  existingRules: T[],
  currentRuleId?: string
): T | null => {
  const newStartMinutes = timeToMinutes(newRule.start_time);
  const newEndMinutes = timeToMinutes(newRule.end_time);
  const newDay = newRule.day_of_week;

  // Handle midnight spanning for new rule
  const adjustedNewEndMinutes = newEndMinutes < newStartMinutes ? newEndMinutes + 24 * 60 : newEndMinutes;

  for (const existingRule of existingRules) {
    // Skip the rule being edited and inactive rules
    if ((currentRuleId && existingRule.id === currentRuleId) || 
        (existingRule.is_active !== undefined && !existingRule.is_active)) {
      continue;
    }

    // Only check rules on the same day
    if (existingRule.day_of_week === newDay) {
      const existingStartMinutes = timeToMinutes(existingRule.start_time);
      const existingEndMinutes = timeToMinutes(existingRule.end_time);

      // Handle midnight spanning for existing rule
      const adjustedExistingEndMinutes = existingEndMinutes < existingStartMinutes ? existingEndMinutes + 24 * 60 : existingEndMinutes;

      // Check for overlap using interval intersection logic
      const overlapStart = Math.max(newStartMinutes, existingStartMinutes);
      const overlapEnd = Math.min(adjustedNewEndMinutes, adjustedExistingEndMinutes);

      if (overlapStart < overlapEnd) {
        return existingRule;
      }
    }
  }

  return null;
};

/**
 * Group blocked times by date
 */
export const groupBlockedTimesByDate = <T extends { start_datetime: string }>(blockedTimes: T[]): Record<string, T[]> => {
  return blockedTimes.reduce((groups, blockedTime) => {
    const date = new Date(blockedTime.start_datetime).toISOString().split('T')[0];
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(blockedTime);
    return groups;
  }, {} as Record<string, T[]>);
};

/**
 * Check if two time ranges overlap
 */
export const timeRangesOverlap = (
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean => {
  const [start1Hours, start1Mins] = start1.split(':').map(Number);
  const [end1Hours, end1Mins] = end1.split(':').map(Number);
  const [start2Hours, start2Mins] = start2.split(':').map(Number);
  const [end2Hours, end2Mins] = end2.split(':').map(Number);
  
  const start1TotalMinutes = start1Hours * 60 + start1Mins;
  const end1TotalMinutes = end1Hours * 60 + end1Mins;
  const start2TotalMinutes = start2Hours * 60 + start2Mins;
  const end2TotalMinutes = end2Hours * 60 + end2Mins;
  
  return start1TotalMinutes < end2TotalMinutes && end1TotalMinutes > start2TotalMinutes;
};