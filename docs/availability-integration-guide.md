# Availability Module Integration Guide for Events

## Overview

The Availability module provides a complete system for managing organizer schedules and calculating available time slots. This guide shows you how to integrate it with the Events module to display bookable time slots on public booking pages.

## Quick Start

### 1. Import Required Dependencies

```typescript
// In your Events module component
import { useCalculatedSlots } from '@/availability/hooks/useAvailabilityApi';
import type { 
  CalculatedSlotsParams, 
  CalculatedSlotsResponse, 
  AvailableSlot 
} from '@/availability/types';
```

### 2. Basic Usage Example

```typescript
// Example: Public booking page component
import React, { useState } from 'react';
import { useCalculatedSlots } from '@/availability/hooks/useAvailabilityApi';

const PublicBookingPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>('2024-01-15');
  const [inviteeTimezone, setInviteeTimezone] = useState<string>('America/New_York');
  
  // Parameters for availability calculation
  const slotsParams: CalculatedSlotsParams = {
    event_type_slug: 'consultation', // From your event type
    start_date: selectedDate,
    end_date: selectedDate, // Same day booking
    invitee_timezone: inviteeTimezone,
    attendee_count: 1, // Single attendee
  };
  
  // Fetch available slots
  const { 
    data: slotsResponse, 
    isLoading, 
    error 
  } = useCalculatedSlots('john-doe', slotsParams);
  
  if (isLoading) return <div>Loading available times...</div>;
  if (error) return <div>Error loading availability</div>;
  
  const availableSlots = slotsResponse?.available_slots || [];
  
  return (
    <div>
      <h2>Select a Time</h2>
      {availableSlots.map((slot, index) => (
        <button 
          key={index}
          onClick={() => handleSlotSelection(slot)}
        >
          {new Date(slot.local_start_time || slot.start_time).toLocaleTimeString()}
        </button>
      ))}
    </div>
  );
};
```

## API Reference

### Hook: `useCalculatedSlots`

**Purpose**: Fetches available time slots for a specific organizer and event type.

**Signature**:
```typescript
useCalculatedSlots(
  organizerSlug: string, 
  params: CalculatedSlotsParams
)
```

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `organizerSlug` | `string` | ✅ | Unique identifier for the organizer (from URL or context) |
| `params.event_type_slug` | `string` | ✅ | Unique identifier for the event type |
| `params.start_date` | `string` | ✅ | Start date in 'YYYY-MM-DD' format |
| `params.end_date` | `string` | ✅ | End date in 'YYYY-MM-DD' format |
| `params.invitee_timezone` | `string` | ❌ | IANA timezone (default: 'UTC') |
| `params.attendee_count` | `number` | ❌ | Number of attendees (default: 1) |
| `params.invitee_timezones` | `string[]` | ❌ | Multiple timezones for group scheduling |

**Returns**:
```typescript
{
  data: CalculatedSlotsResponse | undefined;
  isLoading: boolean;
  error: any;
  refetch: () => void;
}
```

### Response Structure: `CalculatedSlotsResponse`

```typescript
interface CalculatedSlotsResponse {
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
  warnings?: string[];
  performance_metrics?: {
    duration: number;
    total_slots_calculated: number;
    date_range_days: number;
  };
}
```

### Slot Structure: `AvailableSlot`

```typescript
interface AvailableSlot {
  start_time: string;        // ISO datetime in UTC
  end_time: string;          // ISO datetime in UTC
  duration_minutes: number;  // Duration of the slot
  local_start_time?: string; // ISO datetime in invitee's timezone
  local_end_time?: string;   // ISO datetime in invitee's timezone
  invitee_times?: Record<string, {
    start_time: string;
    end_time: string;
    start_hour: number;
    end_hour: number;
    is_reasonable: boolean;
  }>;
  fairness_score?: number;   // For multi-invitee scheduling (0-1)
}
```

## Implementation Examples

### Example 1: Single Day Booking

```typescript
const SingleDayBooking: React.FC<{ organizerSlug: string; eventTypeSlug: string }> = ({
  organizerSlug,
  eventTypeSlug
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  
  const slotsParams: CalculatedSlotsParams = {
    event_type_slug: eventTypeSlug,
    start_date: selectedDate,
    end_date: selectedDate,
    invitee_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
  
  const { data, isLoading, error } = useCalculatedSlots(organizerSlug, slotsParams);
  
  if (isLoading) {
    return <CircularProgress />;
  }
  
  if (error) {
    return <Alert severity="error">Unable to load available times</Alert>;
  }
  
  const slots = data?.available_slots || [];
  
  return (
    <Box>
      <Typography variant="h6">Available Times for {selectedDate}</Typography>
      <Grid container spacing={1}>
        {slots.map((slot, index) => (
          <Grid item key={index}>
            <Button
              variant="outlined"
              onClick={() => handleBookSlot(slot)}
            >
              {format(new Date(slot.local_start_time || slot.start_time), 'h:mm a')}
            </Button>
          </Grid>
        ))}
      </Grid>
      
      {slots.length === 0 && (
        <Typography color="text.secondary">
          No available times for this date
        </Typography>
      )}
    </Box>
  );
};
```

### Example 2: Week View with Multiple Days

```typescript
const WeekViewBooking: React.FC<{ organizerSlug: string; eventTypeSlug: string }> = ({
  organizerSlug,
  eventTypeSlug
}) => {
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date()));
  
  const weekEnd = endOfWeek(weekStart);
  
  const slotsParams: CalculatedSlotsParams = {
    event_type_slug: eventTypeSlug,
    start_date: format(weekStart, 'yyyy-MM-dd'),
    end_date: format(weekEnd, 'yyyy-MM-dd'),
    invitee_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
  
  const { data, isLoading } = useCalculatedSlots(organizerSlug, slotsParams);
  
  // Group slots by date
  const slotsByDate = useMemo(() => {
    const slots = data?.available_slots || [];
    return slots.reduce((acc, slot) => {
      const date = format(new Date(slot.local_start_time || slot.start_time), 'yyyy-MM-dd');
      if (!acc[date]) acc[date] = [];
      acc[date].push(slot);
      return acc;
    }, {} as Record<string, AvailableSlot[]>);
  }, [data?.available_slots]);
  
  return (
    <Grid container spacing={2}>
      {eachDayOfInterval({ start: weekStart, end: weekEnd }).map(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const daySlots = slotsByDate[dateKey] || [];
        
        return (
          <Grid item xs={12} md={6} lg={4} key={dateKey}>
            <Card>
              <CardContent>
                <Typography variant="h6">
                  {format(day, 'EEEE, MMM d')}
                </Typography>
                <Box mt={2}>
                  {daySlots.map((slot, index) => (
                    <Button
                      key={index}
                      variant="outlined"
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                      onClick={() => handleBookSlot(slot)}
                    >
                      {format(new Date(slot.local_start_time || slot.start_time), 'h:mm a')}
                    </Button>
                  ))}
                  {daySlots.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No available times
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
};
```

### Example 3: Group Event with Multiple Attendees

```typescript
const GroupEventBooking: React.FC<{ organizerSlug: string; eventTypeSlug: string }> = ({
  organizerSlug,
  eventTypeSlug
}) => {
  const [attendeeCount, setAttendeeCount] = useState<number>(1);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  
  const slotsParams: CalculatedSlotsParams = {
    event_type_slug: eventTypeSlug,
    start_date: selectedDate,
    end_date: selectedDate,
    invitee_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    attendee_count: attendeeCount, // Important for group events
  };
  
  const { data, isLoading } = useCalculatedSlots(organizerSlug, slotsParams);
  
  return (
    <Box>
      <TextField
        label="Number of Attendees"
        type="number"
        value={attendeeCount}
        onChange={(e) => setAttendeeCount(parseInt(e.target.value))}
        inputProps={{ min: 1, max: 20 }}
        sx={{ mb: 2 }}
      />
      
      <Typography variant="h6">
        Available Times for {attendeeCount} attendee{attendeeCount > 1 ? 's' : ''}
      </Typography>
      
      {data?.available_slots.map((slot, index) => (
        <Button
          key={index}
          variant="outlined"
          sx={{ mr: 1, mb: 1 }}
          onClick={() => handleBookSlot(slot)}
        >
          {format(new Date(slot.local_start_time || slot.start_time), 'h:mm a')}
        </Button>
      ))}
    </Box>
  );
};
```

### Example 4: Multi-Timezone Scheduling

```typescript
const MultiTimezoneBooking: React.FC<{ organizerSlug: string; eventTypeSlug: string }> = ({
  organizerSlug,
  eventTypeSlug
}) => {
  const [inviteeTimezones, setInviteeTimezones] = useState<string[]>([
    'America/New_York',
    'Europe/London',
    'Asia/Tokyo'
  ]);
  
  const slotsParams: CalculatedSlotsParams = {
    event_type_slug: eventTypeSlug,
    start_date: '2024-01-15',
    end_date: '2024-01-19', // 5 days
    invitee_timezone: 'America/New_York', // Primary timezone
    invitee_timezones: inviteeTimezones, // Multiple timezones
  };
  
  const { data, isLoading } = useCalculatedSlots(organizerSlug, slotsParams);
  
  return (
    <Box>
      <Typography variant="h6">Multi-Timezone Scheduling</Typography>
      
      {data?.available_slots.map((slot, index) => (
        <Card key={index} sx={{ mb: 2 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="subtitle1">
                  {format(new Date(slot.start_time), 'EEEE, MMM d')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Fairness Score: {(slot.fairness_score || 0 * 100).toFixed(0)}%
                </Typography>
              </Box>
              
              <Button
                variant="contained"
                onClick={() => handleBookSlot(slot)}
              >
                Book This Time
              </Button>
            </Box>
            
            {/* Show times in all requested timezones */}
            {slot.invitee_times && (
              <Box mt={2}>
                {Object.entries(slot.invitee_times).map(([tz, timeInfo]) => (
                  <Box key={tz} display="flex" justifyContent="space-between">
                    <Typography variant="body2">{tz}:</Typography>
                    <Typography variant="body2">
                      {format(new Date(timeInfo.start_time), 'h:mm a')}
                      {timeInfo.is_reasonable ? ' ✅' : ' ⚠️'}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};
```

## Complete Integration Example

Here's a full example of a booking page component:

```typescript
import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Alert,
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format, addDays, startOfDay } from 'date-fns';
import { useCalculatedSlots } from '@/availability/hooks/useAvailabilityApi';
import type { CalculatedSlotsParams, AvailableSlot } from '@/availability/types';

interface BookingPageProps {
  organizerSlug: string;
  eventTypeSlug: string;
  eventTypeName: string;
  eventDuration: number;
  maxAttendees?: number;
}

const BookingPage: React.FC<BookingPageProps> = ({
  organizerSlug,
  eventTypeSlug,
  eventTypeName,
  eventDuration,
  maxAttendees = 1,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [attendeeCount, setAttendeeCount] = useState<number>(1);
  const [inviteeTimezone] = useState<string>(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  
  // Prepare parameters for availability calculation
  const slotsParams: CalculatedSlotsParams = useMemo(() => ({
    event_type_slug: eventTypeSlug,
    start_date: format(selectedDate, 'yyyy-MM-dd'),
    end_date: format(selectedDate, 'yyyy-MM-dd'),
    invitee_timezone: inviteeTimezone,
    attendee_count: attendeeCount,
  }), [eventTypeSlug, selectedDate, inviteeTimezone, attendeeCount]);
  
  // Fetch available slots
  const { 
    data: slotsResponse, 
    isLoading, 
    error,
    refetch 
  } = useCalculatedSlots(organizerSlug, slotsParams);
  
  const handleSlotSelection = (slot: AvailableSlot) => {
    // Navigate to booking form with selected slot
    console.log('Selected slot:', slot);
    // Example: navigate(`/book/${organizerSlug}/${eventTypeSlug}?slot=${slot.start_time}`);
  };
  
  const handleDateChange = (newDate: Date | null) => {
    if (newDate) {
      setSelectedDate(startOfDay(newDate));
    }
  };
  
  // Group slots by time for better display
  const availableSlots = slotsResponse?.available_slots || [];
  
  return (
    <Box maxWidth="md" mx="auto" p={3}>
      <Typography variant="h4" gutterBottom>
        Book a {eventTypeName}
      </Typography>
      
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Duration: {eventDuration} minutes
      </Typography>
      
      <Grid container spacing={3}>
        {/* Date and Settings */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Select Date & Settings
              </Typography>
              
              <DatePicker
                label="Select Date"
                value={selectedDate}
                onChange={handleDateChange}
                minDate={new Date()}
                maxDate={addDays(new Date(), 60)} // 60 days ahead
                slotProps={{
                  textField: { fullWidth: true, margin: 'normal' }
                }}
              />
              
              {maxAttendees > 1 && (
                <TextField
                  fullWidth
                  label="Number of Attendees"
                  type="number"
                  value={attendeeCount}
                  onChange={(e) => setAttendeeCount(parseInt(e.target.value) || 1)}
                  inputProps={{ min: 1, max: maxAttendees }}
                  margin="normal"
                />
              )}
              
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Times shown in your timezone: {inviteeTimezone}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Available Times */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Available Times
              </Typography>
              
              {isLoading && (
                <Box display="flex" justifyContent="center" p={4}>
                  <CircularProgress />
                  <Typography variant="body2" sx={{ ml: 2 }}>
                    Loading available times...
                  </Typography>
                </Box>
              )}
              
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  Unable to load available times. Please try again.
                  <Button size="small" onClick={() => refetch()} sx={{ ml: 1 }}>
                    Retry
                  </Button>
                </Alert>
              )}
              
              {!isLoading && !error && (
                <>
                  {/* Performance Info */}
                  {slotsResponse?.cache_hit && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Loaded from cache ({slotsResponse.computation_time_ms}ms)
                    </Alert>
                  )}
                  
                  {/* Warnings */}
                  {slotsResponse?.warnings && slotsResponse.warnings.length > 0 && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      {slotsResponse.warnings.join(', ')}
                    </Alert>
                  )}
                  
                  {/* Available Slots */}
                  {availableSlots.length === 0 ? (
                    <Typography color="text.secondary" textAlign="center" py={4}>
                      No available times for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                    </Typography>
                  ) : (
                    <Grid container spacing={1}>
                      {availableSlots.map((slot, index) => (
                        <Grid item key={index}>
                          <Button
                            variant="outlined"
                            onClick={() => handleSlotSelection(slot)}
                            sx={{
                              minWidth: 100,
                              textTransform: 'none',
                            }}
                          >
                            {format(
                              new Date(slot.local_start_time || slot.start_time), 
                              'h:mm a'
                            )}
                          </Button>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                  
                  {/* Slot Count Info */}
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                    {availableSlots.length} available time{availableSlots.length !== 1 ? 's' : ''} found
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
```

## Advanced Features

### 1. Handling Multi-Invitee Scheduling

When scheduling for multiple people across different timezones:

```typescript
const slotsParams: CalculatedSlotsParams = {
  event_type_slug: eventTypeSlug,
  start_date: '2024-01-15',
  end_date: '2024-01-19',
  invitee_timezone: 'America/New_York', // Primary timezone
  invitee_timezones: [
    'America/New_York',
    'Europe/London', 
    'Asia/Tokyo'
  ],
};

// The response will include fairness_score and invitee_times
const { data } = useCalculatedSlots(organizerSlug, slotsParams);

// Display slots sorted by fairness score
const sortedSlots = data?.available_slots.sort((a, b) => 
  (b.fairness_score || 0) - (a.fairness_score || 0)
) || [];
```

### 2. Error Handling

```typescript
const { data, isLoading, error } = useCalculatedSlots(organizerSlug, slotsParams);

if (error) {
  // Handle different error types
  if (error.response?.status === 404) {
    return <Alert severity="error">Organizer or event type not found</Alert>;
  }
  
  if (error.response?.status === 400) {
    const errorDetails = error.response.data.details;
    return (
      <Alert severity="error">
        Invalid parameters: {JSON.stringify(errorDetails)}
      </Alert>
    );
  }
  
  return <Alert severity="error">Unable to load availability</Alert>;
}
```

### 3. Performance Optimization

```typescript
// Use React.useMemo to prevent unnecessary recalculations
const slotsParams = useMemo(() => ({
  event_type_slug: eventTypeSlug,
  start_date: format(selectedDate, 'yyyy-MM-dd'),
  end_date: format(selectedDate, 'yyyy-MM-dd'),
  invitee_timezone: inviteeTimezone,
  attendee_count: attendeeCount,
}), [eventTypeSlug, selectedDate, inviteeTimezone, attendeeCount]);

// The hook automatically handles caching via TanStack Query
const { data, isLoading } = useCalculatedSlots(organizerSlug, slotsParams);

// Access cache information
if (data?.cache_hit) {
  console.log('Data loaded from cache in', data.computation_time_ms, 'ms');
}
```

## Important Notes

### 1. Timezone Handling
- Always provide `invitee_timezone` for accurate local time display
- The `local_start_time` and `local_end_time` fields contain times converted to the invitee's timezone
- Use these local times for display to users

### 2. Caching
- The availability system uses aggressive caching for performance
- Cache keys include organizer, event type, date range, timezone, and attendee count
- Cache is automatically invalidated when availability rules change
- `cache_hit` field in response indicates if data came from cache

### 3. Date Range Limits
- Maximum date range is 90 days to prevent abuse
- Recommended to fetch 1-7 days at a time for better performance
- Use pagination for longer date ranges

### 4. Group Events
- Always pass `attendee_count` for group events
- The system automatically checks capacity against existing bookings
- Slots are only returned if there's sufficient capacity

### 5. Error Scenarios
- Invalid timezone strings will fall back to UTC with a warning
- Non-existent organizer or event type returns 404
- Invalid date formats return 400 with validation details

## Testing Your Integration

### 1. Test with Different Scenarios

```typescript
// Test basic availability
const basicParams = {
  event_type_slug: 'consultation',
  start_date: '2024-01-15',
  end_date: '2024-01-15',
  invitee_timezone: 'America/New_York',
};

// Test group events
const groupParams = {
  ...basicParams,
  attendee_count: 5,
};

// Test multi-timezone
const multiTimezoneParams = {
  ...basicParams,
  invitee_timezones: ['America/New_York', 'Europe/London', 'Asia/Tokyo'],
};
```

### 2. Handle Edge Cases

```typescript
const { data, isLoading, error } = useCalculatedSlots(organizerSlug, slotsParams);

// Check for warnings
if (data?.warnings && data.warnings.length > 0) {
  console.warn('Availability warnings:', data.warnings);
}

// Handle empty results
if (data && data.available_slots.length === 0) {
  // Show "no available times" message
  // Suggest alternative dates
}

// Monitor performance
if (data?.performance_metrics) {
  console.log('Calculation took:', data.performance_metrics.duration, 'seconds');
}
```

## Common Patterns

### 1. Date Navigation

```typescript
const [currentDate, setCurrentDate] = useState<Date>(new Date());

const navigateDate = (direction: 'prev' | 'next') => {
  setCurrentDate(prev => 
    direction === 'next' 
      ? addDays(prev, 1) 
      : addDays(prev, -1)
  );
};

// Use currentDate in your slotsParams
```

### 2. Slot Selection State

```typescript
const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

const handleSlotClick = (slot: AvailableSlot) => {
  setSelectedSlot(slot);
  // Proceed to booking form
};
```

### 3. Loading States

```typescript
if (isLoading) {
  return (
    <Box display="flex" justifyContent="center" p={4}>
      <CircularProgress />
      <Typography sx={{ ml: 2 }}>Loading available times...</Typography>
    </Box>
  );
}
```

## API Endpoint Details

The `useCalculatedSlots` hook calls this public endpoint:
```
GET /api/v1/availability/calculated-slots/{organizer_slug}/
```

**Query Parameters**:
- `event_type_slug` (required)
- `start_date` (required, YYYY-MM-DD)
- `end_date` (required, YYYY-MM-DD)
- `invitee_timezone` (optional, default: UTC)
- `attendee_count` (optional, default: 1)
- `invitee_timezones` (optional, comma-separated list)

**Response Format**:
```json
{
  "organizer_slug": "john-doe",
  "event_type_slug": "consultation",
  "start_date": "2024-01-15",
  "end_date": "2024-01-15",
  "invitee_timezone": "America/New_York",
  "attendee_count": 1,
  "available_slots": [
    {
      "start_time": "2024-01-15T14:00:00Z",
      "end_time": "2024-01-15T14:30:00Z",
      "duration_minutes": 30,
      "local_start_time": "2024-01-15T09:00:00-05:00",
      "local_end_time": "2024-01-15T09:30:00-05:00"
    }
  ],
  "cache_hit": true,
  "total_slots": 16,
  "computation_time_ms": 45.2
}
```

## Troubleshooting

### Common Issues

1. **No slots returned**: Check if the organizer has availability rules set up
2. **Wrong timezone**: Verify `invitee_timezone` is a valid IANA timezone
3. **Performance issues**: Monitor `computation_time_ms` and `cache_hit` rate
4. **Capacity issues**: For group events, ensure `attendee_count` doesn't exceed `max_attendees`

### Debug Tools

The Availability module includes a timezone tester at `/availability/timezone-test` that you can use to debug timezone-related issues.

## Dependencies

Make sure these are installed in your Events module:

```typescript
// Required imports
import { useCalculatedSlots } from '@/availability/hooks/useAvailabilityApi';
import type { 
  CalculatedSlotsParams, 
  CalculatedSlotsResponse, 
  AvailableSlot 
} from '@/availability/types';

// Optional: Date utilities
import { format, addDays, startOfDay } from 'date-fns';
```

## Summary

The Availability module provides everything you need to display bookable time slots:

1. **Import** the `useCalculatedSlots` hook and types
2. **Prepare** parameters with organizer slug, event type, dates, and timezone
3. **Call** the hook to fetch available slots
4. **Display** the slots in your UI
5. **Handle** loading states, errors, and edge cases

The system automatically handles complex scheduling logic including:
- Recurring availability rules
- Date-specific overrides  
- Blocked times (manual and synced)
- Buffer times and minimum gaps
- Group event capacity
- Multi-timezone coordination
- Performance optimization through caching

This allows you to focus on the booking UI/UX while the Availability module handles all the complex scheduling calculations behind the scenes.