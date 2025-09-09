import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Grid,
  Box,
  Alert,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/core';
import { useCreateBlockedTime, useUpdateBlockedTime } from '../hooks/useAvailabilityApi';
import type { BlockedTime, BlockedTimeFormData } from '../types';

interface BlockedTimeFormProps {
  open: boolean;
  onClose: () => void;
  blockedTime?: BlockedTime;
}

export const BlockedTimeForm: React.FC<BlockedTimeFormProps> = ({
  open,
  onClose,
  blockedTime,
}) => {
  const createBlockedTime = useCreateBlockedTime();
  const updateBlockedTime = useUpdateBlockedTime();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<BlockedTimeFormData>({
    defaultValues: {
      start_datetime: '',
      end_datetime: '',
      reason: '',
      is_active: true,
    },
  });

  const watchedStartDateTime = watch('start_datetime');
  const watchedEndDateTime = watch('end_datetime');

  React.useEffect(() => {
    if (blockedTime) {
      reset({
        start_datetime: blockedTime.start_datetime,
        end_datetime: blockedTime.end_datetime,
        reason: blockedTime.reason,
        is_active: blockedTime.is_active,
      });
    } else {
      reset({
        start_datetime: '',
        end_datetime: '',
        reason: '',
        is_active: true,
      });
    }
  }, [blockedTime, reset]);

  const onSubmit = async (data: BlockedTimeFormData) => {
    try {
      if (blockedTime) {
        await updateBlockedTime.mutateAsync({ id: blockedTime.id, data });
      } else {
        await createBlockedTime.mutateAsync(data);
      }
      onClose();
    } catch (error) {
      // Error handling is done in the hooks
    }
  };

  const isValidDateRange = () => {
    if (!watchedStartDateTime || !watchedEndDateTime) return true;
    return new Date(watchedStartDateTime) < new Date(watchedEndDateTime);
  };

  const canEdit = !blockedTime || blockedTime.source === 'manual';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {blockedTime ? 'Edit Blocked Time' : 'Create Blocked Time'}
      </DialogTitle>
      
      <DialogContent>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Box component="form" sx={{ mt: 2 }}>
            {blockedTime && blockedTime.source !== 'manual' && (
              <Alert severity="info" sx={{ mb: 3 }}>
                This blocked time was synced from {blockedTime.source_display}. 
                Some fields may be read-only.
              </Alert>
            )}

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="start_datetime"
                  control={control}
                  rules={{ required: 'Start date and time is required' }}
                  render={({ field }) => (
                    <DateTimePicker
                      {...field}
                      label="Start Date & Time"
                      value={field.value ? new Date(field.value) : null}
                      onChange={(newValue) => {
                        if (newValue) {
                          field.onChange(newValue.toISOString());
                        }
                      }}
                      disabled={!canEdit}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors.start_datetime,
                          helperText: errors.start_datetime?.message,
                        },
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="end_datetime"
                  control={control}
                  rules={{ 
                    required: 'End date and time is required',
                    validate: () => isValidDateRange() || 'End time must be after start time',
                  }}
                  render={({ field }) => (
                    <DateTimePicker
                      {...field}
                      label="End Date & Time"
                      value={field.value ? new Date(field.value) : null}
                      onChange={(newValue) => {
                        if (newValue) {
                          field.onChange(newValue.toISOString());
                        }
                      }}
                      disabled={!canEdit}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors.end_datetime || !isValidDateRange(),
                          helperText: errors.end_datetime?.message || 
                            (!isValidDateRange() ? 'End time must be after start time' : ''),
                        },
                      }}
                    />
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
                      label="Reason"
                      multiline
                      rows={2}
                      placeholder="e.g., Doctor appointment, Personal time"
                      disabled={!canEdit}
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
                      disabled={!canEdit}
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
        {canEdit && (
          <Button
            onClick={handleSubmit(onSubmit)}
            variant="contained"
            loading={createBlockedTime.isPending || updateBlockedTime.isPending}
            disabled={!isValidDateRange()}
          >
            {blockedTime ? 'Update' : 'Create'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};