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
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/core';
import { useCreateDateOverrideRule, useUpdateDateOverrideRule } from '../hooks/useAvailabilityApi';
import { formatTimeForInput, formatTimeForBackend, validateTimeRange } from '../utils';
import type { DateOverrideRule, DateOverrideRuleFormData } from '../types';

interface DateOverrideFormProps {
  open: boolean;
  onClose: () => void;
  override?: DateOverrideRule;
  eventTypes?: Array<{ id: string; name: string }>;
}

export const DateOverrideForm: React.FC<DateOverrideFormProps> = ({
  open,
  onClose,
  override,
  eventTypes = [],
}) => {
  const createOverride = useCreateDateOverrideRule();
  const updateOverride = useUpdateDateOverrideRule();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<DateOverrideRuleFormData>({
    defaultValues: {
      date: '',
      is_available: true,
      start_time: '09:00',
      end_time: '17:00',
      event_types: [],
      reason: '',
      is_active: true,
    },
  });

  const watchedIsAvailable = watch('is_available');
  const watchedStartTime = watch('start_time');
  const watchedEndTime = watch('end_time');

  React.useEffect(() => {
    if (override) {
      reset({
        date: override.date,
        is_available: override.is_available,
        start_time: override.start_time ? formatTimeForInput(override.start_time) : '09:00',
        end_time: override.end_time ? formatTimeForInput(override.end_time) : '17:00',
        event_types: override.event_types,
        reason: override.reason,
        is_active: override.is_active,
      });
    } else {
      reset({
        date: '',
        is_available: true,
        start_time: '09:00',
        end_time: '17:00',
        event_types: [],
        reason: '',
        is_active: true,
      });
    }
  }, [override, reset]);

  const onSubmit = async (data: DateOverrideRuleFormData) => {
    const payload = {
      ...data,
      start_time: data.is_available ? formatTimeForBackend(data.start_time) : undefined,
      end_time: data.is_available ? formatTimeForBackend(data.end_time) : undefined,
    };

    try {
      if (override) {
        await updateOverride.mutateAsync({ id: override.id, data: payload });
      } else {
        await createOverride.mutateAsync(payload);
      }
      onClose();
    } catch (error) {
      // Error handling is done in the hooks
    }
  };

  const timeRangeError = watchedIsAvailable ? validateTimeRange(watchedStartTime, watchedEndTime) : null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {override ? 'Edit Date Override' : 'Create Date Override'}
      </DialogTitle>
      
      <DialogContent>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Box component="form" sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="date"
                  control={control}
                  rules={{ required: 'Date is required' }}
                  render={({ field }) => (
                    <DatePicker
                      {...field}
                      label="Date"
                      value={field.value ? new Date(field.value) : null}
                      onChange={(newValue) => {
                        if (newValue) {
                          field.onChange(newValue.toISOString().split('T')[0]);
                        }
                      }}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors.date,
                          helperText: errors.date?.message,
                        },
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="is_available"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} />}
                      label="Available on this date"
                      sx={{ mt: 2 }}
                    />
                  )}
                />
              </Grid>

              {watchedIsAvailable && (
                <>
                  <Grid item xs={6}>
                    <Controller
                      name="start_time"
                      control={control}
                      rules={{ 
                        required: watchedIsAvailable ? 'Start time is required when available' : false 
                      }}
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
                      rules={{ 
                        required: watchedIsAvailable ? 'End time is required when available' : false 
                      }}
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
                        This override spans midnight. This is allowed for special schedules.
                      </Alert>
                    </Grid>
                  )}
                </>
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
                  name="reason"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Reason (Optional)"
                      multiline
                      rows={2}
                      placeholder="e.g., Personal day off, Special hours for holiday"
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
          loading={createOverride.isPending || updateOverride.isPending}
          disabled={!!timeRangeError}
        >
          {override ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};