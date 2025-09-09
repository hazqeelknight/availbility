import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Grid,
  Box,
  Chip,
  OutlinedInput,
  Alert,
} from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/core';
import { useCreateAvailabilityRule, useUpdateAvailabilityRule } from '../hooks/useAvailabilityApi';
import { 
  formatTimeForInput, 
  formatTimeForBackend, 
  validateTimeRange, 
  checkRuleOverlap, 
  findOverlappingRule, 
  getWeekdayName, 
  formatTimeForDisplay,
  areTimeIntervalsOverlapping 
} from '../utils';
import type { AvailabilityRule, AvailabilityRuleFormData } from '../types';
import { WEEKDAY_OPTIONS } from '../types';

interface AvailabilityRuleFormProps {
  open: boolean;
  onClose: () => void;
  rule?: AvailabilityRule;
  eventTypes?: Array<{ id: string; name: string }>;
  existingRules?: AvailabilityRule[];
}

export const AvailabilityRuleForm: React.FC<AvailabilityRuleFormProps> = ({
  open,
  onClose,
  rule,
  eventTypes = [],
  existingRules = [],
}) => {
  const createRule = useCreateAvailabilityRule();
  const updateRule = useUpdateAvailabilityRule();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<AvailabilityRuleFormData>({
    defaultValues: {
      day_of_week: 0,
      start_time: '09:00',
      end_time: '17:00',
      event_types: [],
      is_active: true,
    },
  });

  const watchedStartTime = watch('start_time');
  const watchedEndTime = watch('end_time');
  const watchedDayOfWeek = watch('day_of_week');

  // Check for overlaps with existing rules
  const isOverlapping = React.useMemo(() => {
    if (!watchedStartTime || !watchedEndTime) return false;
    
    const newRuleData = {
      day_of_week: watchedDayOfWeek,
      start_time: watchedStartTime,
      end_time: watchedEndTime,
    };
    
    return checkRuleOverlap(newRuleData, existingRules, rule?.id);
  }, [watchedDayOfWeek, watchedStartTime, watchedEndTime, existingRules, rule?.id]);

  const overlappingRule = React.useMemo(() => {
    if (!isOverlapping) return null;
    
    const newRuleData = {
      day_of_week: watchedDayOfWeek,
      start_time: watchedStartTime,
      end_time: watchedEndTime,
    };
    
    return findOverlappingRule(newRuleData, existingRules, rule?.id);
  }, [isOverlapping, existingRules, watchedDayOfWeek, watchedStartTime, watchedEndTime, rule?.id]);

  React.useEffect(() => {
    if (rule) {
      reset({
        day_of_week: rule.day_of_week,
        start_time: formatTimeForInput(rule.start_time),
        end_time: formatTimeForInput(rule.end_time),
        event_types: rule.event_types,
        is_active: rule.is_active,
      });
    } else {
      reset({
        day_of_week: 0,
        start_time: '09:00',
        end_time: '17:00',
        event_types: [],
        is_active: true,
      });
    }
  }, [rule, reset]);

  const onSubmit = async (data: AvailabilityRuleFormData) => {
    const payload = {
      ...data,
      start_time: formatTimeForBackend(data.start_time),
      end_time: formatTimeForBackend(data.end_time),
    };

    try {
      if (rule) {
        await updateRule.mutateAsync({ id: rule.id, data: payload });
      } else {
        await createRule.mutateAsync(payload);
      }
      onClose();
    } catch (error) {
      // Error handling is done in the hooks
    }
  };

  const timeRangeError = validateTimeRange(watchedStartTime, watchedEndTime);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {rule ? 'Edit Availability Rule' : 'Create Availability Rule'}
      </DialogTitle>
      
      <DialogContent>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Box component="form" sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Controller
                  name="day_of_week"
                  control={control}
                  rules={{ required: 'Day of week is required' }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.day_of_week}>
                      <InputLabel>Day of Week</InputLabel>
                      <Select {...field} label="Day of Week">
                        {WEEKDAY_OPTIONS.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>

              <Grid item xs={6}>
                <Controller
                  name="start_time"
                  control={control}
                  rules={{ required: 'Start time is required' }}
                  render={({ field }) => (
                    <TimePicker
                      {...field}
                      label="Start Time"
                      value={field.value ? new Date(`2000-01-01T${field.value}:00`) : null}
                      onChange={(newValue) => {
                        if (newValue) {
                          const timeString = newValue.toTimeString().slice(0, 5);
                          field.onChange(timeString);
                        }
                      }}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors.start_time,
                          helperText: errors.start_time?.message,
                        },
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={6}>
                <Controller
                  name="end_time"
                  control={control}
                  rules={{ required: 'End time is required' }}
                  render={({ field }) => (
                    <TimePicker
                      {...field}
                      label="End Time"
                      value={field.value ? new Date(`2000-01-01T${field.value}:00`) : null}
                      onChange={(newValue) => {
                        if (newValue) {
                          const timeString = newValue.toTimeString().slice(0, 5);
                          field.onChange(timeString);
                        }
                      }}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors.end_time || !!timeRangeError,
                          helperText: errors.end_time?.message || timeRangeError,
                        },
                      }}
                    />
                  )}
                />
              </Grid>

              {timeRangeError && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    This rule spans midnight (e.g., 10 PM to 6 AM). This is allowed for night shift schedules.
                  </Alert>
                </Grid>
              )}

              {isOverlapping && overlappingRule && (
                <Grid item xs={12}>
                  <Alert severity="error">
                    This time range overlaps with existing availability rule on {getWeekdayName(overlappingRule.day_of_week)} 
                    from {formatTimeForDisplay(overlappingRule.start_time)} to {formatTimeForDisplay(overlappingRule.end_time)}.
                  </Alert>
                </Grid>
              )}

              <Grid item xs={12}>
                <Controller
                  name="event_types"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Event Types (Optional)</InputLabel>
                      <Select
                        {...field}
                        multiple
                        input={<OutlinedInput label="Event Types (Optional)" />}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {(selected as string[]).map((value) => {
                              const eventType = eventTypes.find(et => et.id === value);
                              return (
                                <Chip
                                  key={eventType?.id || value}
                                  label={eventType?.name || value}
                                  size="small"
                                />
                              );
                            })}
                          </Box>
                        )}
                      >
                        {eventTypes.map((eventType) => (
                          <MenuItem key={eventType.id} value={eventType.id}>
                            {eventType.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="is_active"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} />}
                      label="Active"
                    />
                  )}
                />
              </Grid>
            </Grid>
          </Box>
        </LocalizationProvider>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          variant="contained"
          loading={createRule.isPending || updateRule.isPending}
          disabled={!!timeRangeError || isOverlapping}
        >
          {rule ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};