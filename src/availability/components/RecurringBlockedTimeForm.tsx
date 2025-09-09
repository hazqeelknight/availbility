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
  Alert,
} from '@mui/material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/core';
import { useCreateRecurringBlockedTime, useUpdateRecurringBlockedTime } from '../hooks/useAvailabilityApi';
import { formatTimeForInput, formatTimeForBackend, validateTimeRange } from '../utils';
import { checkRuleOverlap } from '../utils';
import type { RecurringBlockedTime, RecurringBlockedTimeFormData } from '../types';
import { WEEKDAY_OPTIONS } from '../types';

interface RecurringBlockedTimeFormProps {
  open: boolean;
  onClose: () => void;
  recurringBlock?: RecurringBlockedTime;
  existingRecurringBlocks?: RecurringBlockedTime[];
}

export const RecurringBlockedTimeForm: React.FC<RecurringBlockedTimeFormProps> = ({
  open,
  onClose,
  recurringBlock,
  existingRecurringBlocks = [],
}) => {
  const createRecurringBlock = useCreateRecurringBlockedTime();
  const updateRecurringBlock = useUpdateRecurringBlockedTime();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<RecurringBlockedTimeFormData>({
    defaultValues: {
      name: '',
      day_of_week: 0,
      start_time: '14:00',
      end_time: '15:00',
      start_date: '',
      end_date: '',
      is_active: true,
    },
  });

  const watchedStartTime = watch('start_time');
  const watchedEndTime = watch('end_time');
  const watchedDayOfWeek = watch('day_of_week');
  const watchedStartDate = watch('start_date');
  const watchedEndDate = watch('end_date');

  // Check for overlaps with existing recurring blocks
  const isOverlapping = React.useMemo(() => {
    if (!watchedStartTime || !watchedEndTime) return false;
    
    const newBlockData = {
      day_of_week: watchedDayOfWeek,
      start_time: watchedStartTime,
      end_time: watchedEndTime,
      event_types: [], // Not relevant for recurring blocks
      is_active: true,
    };
    
    return checkRuleOverlap(newBlockData, existingRecurringBlocks, recurringBlock?.id);
  }, [watchedDayOfWeek, watchedStartTime, watchedEndTime, existingRecurringBlocks, recurringBlock?.id]);

  const overlappingBlock = React.useMemo(() => {
    if (!isOverlapping) return null;
    
    return existingRecurringBlocks.find(block => {
      if (recurringBlock?.id && block.id === recurringBlock.id) return false;
      if (block.day_of_week !== watchedDayOfWeek) return false;
      
      const newBlockData = {
        day_of_week: watchedDayOfWeek,
        start_time: watchedStartTime,
        end_time: watchedEndTime,
        event_types: [],
        is_active: true,
      };
      
      return checkRuleOverlap(newBlockData, [block]);
    });
  }, [isOverlapping, existingRecurringBlocks, watchedDayOfWeek, watchedStartTime, watchedEndTime, recurringBlock?.id]);

  React.useEffect(() => {
    if (recurringBlock) {
      reset({
        name: recurringBlock.name,
        day_of_week: recurringBlock.day_of_week,
        start_time: formatTimeForInput(recurringBlock.start_time),
        end_time: formatTimeForInput(recurringBlock.end_time),
        start_date: recurringBlock.start_date || '',
        end_date: recurringBlock.end_date || '',
        is_active: recurringBlock.is_active,
      });
    } else {
      reset({
        name: '',
        day_of_week: 0,
        start_time: '14:00',
        end_time: '15:00',
        start_date: '',
        end_date: '',
        is_active: true,
      });
    }
  }, [recurringBlock, reset]);

  const onSubmit = async (data: RecurringBlockedTimeFormData) => {
    const payload = {
      ...data,
      start_time: formatTimeForBackend(data.start_time),
      end_time: formatTimeForBackend(data.end_time),
      start_date: data.start_date || undefined,
      end_date: data.end_date || undefined,
    };

    try {
      if (recurringBlock) {
        await updateRecurringBlock.mutateAsync({ id: recurringBlock.id, data: payload });
      } else {
        await createRecurringBlock.mutateAsync(payload);
      }
      onClose();
    } catch (error) {
      // Error handling is done in the hooks
    }
  };

  const timeRangeError = validateTimeRange(watchedStartTime, watchedEndTime);
  const dateRangeError = watchedStartDate && watchedEndDate && new Date(watchedStartDate) > new Date(watchedEndDate)
    ? 'Start date must be before or equal to end date'
    : null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {recurringBlock ? 'Edit Recurring Block' : 'Create Recurring Block'}
      </DialogTitle>
      
      <DialogContent>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Box component="form" sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Controller
                  name="name"
                  control={control}
                  rules={{ required: 'Name is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Name"
                      placeholder="e.g., Weekly Team Meeting, Lunch Break"
                      error={!!errors.name}
                      helperText={errors.name?.message}
                    />
                  )}
                />
              </Grid>

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
                    This block spans midnight. This is allowed for overnight blocks.
                  </Alert>
                </Grid>
              )}

              <Grid item xs={12} md={6}>
            {isOverlapping && overlappingBlock && (
              <Grid item xs={12}>
                <Alert severity="error">
                  This time range overlaps with existing recurring block "{overlappingBlock.name}" 
                  on {overlappingBlock.day_of_week_display} from {formatTimeForDisplay(overlappingBlock.start_time)} 
                  to {formatTimeForDisplay(overlappingBlock.end_time)}.
                </Alert>
              </Grid>
            )}

                <Controller
                  name="start_date"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      {...field}
                      label="Start Date (Optional)"
                      value={field.value ? new Date(field.value) : null}
                      onChange={(newValue) => {
                        if (newValue) {
                          field.onChange(newValue.toISOString().split('T')[0]);
                        } else {
                          field.onChange('');
                        }
                      }}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          helperText: 'When this recurring block starts (leave empty for indefinite)',
                        },
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="end_date"
                  control={control}
                  rules={{
                    validate: () => !dateRangeError || dateRangeError,
                  }}
                  render={({ field }) => (
                    <DatePicker
                      {...field}
                      label="End Date (Optional)"
                      value={field.value ? new Date(field.value) : null}
                      onChange={(newValue) => {
                        if (newValue) {
                          field.onChange(newValue.toISOString().split('T')[0]);
                        } else {
                          field.onChange('');
                        }
                      }}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!dateRangeError,
                          helperText: dateRangeError || 'When this recurring block ends (leave empty for indefinite)',
                        },
                      }}
                    />
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
          loading={createRecurringBlock.isPending || updateRecurringBlock.isPending}
          disabled={!!timeRangeError || !!dateRangeError || isOverlapping}
        >
          {recurringBlock ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};