import React from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Typography,
  Grid,
  InputAdornment,
  Alert,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { motion } from 'framer-motion';
import { PageHeader, Button, LoadingSpinner } from '@/components/core';
import { useBufferTime, useUpdateBufferTime } from '../hooks/useAvailabilityApi';
import type { BufferTimeFormData } from '../types';

const BufferSettings: React.FC = () => {
  const { data: bufferSettings, isLoading, error } = useBufferTime();
  const updateBufferTime = useUpdateBufferTime();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<BufferTimeFormData>({
    defaultValues: {
      default_buffer_before: 0,
      default_buffer_after: 0,
      minimum_gap: 0,
      slot_interval_minutes: 15,
    },
  });

  // Reset form when data loads
  React.useEffect(() => {
    if (bufferSettings) {
      reset({
        default_buffer_before: bufferSettings.default_buffer_before,
        default_buffer_after: bufferSettings.default_buffer_after,
        minimum_gap: bufferSettings.minimum_gap,
        slot_interval_minutes: bufferSettings.slot_interval_minutes,
      });
    }
  }, [bufferSettings, reset]);

  const onSubmit = (data: BufferTimeFormData) => {
    updateBufferTime.mutate(data);
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading buffer settings..." />;
  }

  if (error) {
    return (
      <>
        <PageHeader
          title="Buffer Settings"
          subtitle="Configure default buffer times and scheduling intervals"
        />
        <Alert severity="error">
          Failed to load buffer settings. Please try again later.
        </Alert>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Buffer Settings"
        subtitle="Configure default buffer times and scheduling intervals"
        actions={
          <Button
            variant="contained"
            onClick={handleSubmit(onSubmit)}
            loading={updateBufferTime.isPending}
            disabled={!isDirty}
          >
            Save Changes
          </Button>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardContent sx={{ p: 4 }}>
            <Box component="form" onSubmit={handleSubmit(onSubmit)}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Default Buffer Times
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    These settings apply to all event types unless overridden individually.
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="default_buffer_before"
                    control={control}
                    rules={{
                      required: 'Buffer before is required',
                      min: { value: 0, message: 'Must be 0 or greater' },
                      max: { value: 120, message: 'Must be 120 minutes or less' },
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Buffer Before Meeting"
                        type="number"
                        error={!!errors.default_buffer_before}
                        helperText={
                          errors.default_buffer_before?.message ||
                          'Time to block before each meeting'
                        }
                        InputProps={{
                          endAdornment: <InputAdornment position="end">minutes</InputAdornment>,
                        }}
                        inputProps={{ min: 0, max: 120 }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="default_buffer_after"
                    control={control}
                    rules={{
                      required: 'Buffer after is required',
                      min: { value: 0, message: 'Must be 0 or greater' },
                      max: { value: 120, message: 'Must be 120 minutes or less' },
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Buffer After Meeting"
                        type="number"
                        error={!!errors.default_buffer_after}
                        helperText={
                          errors.default_buffer_after?.message ||
                          'Time to block after each meeting'
                        }
                        InputProps={{
                          endAdornment: <InputAdornment position="end">minutes</InputAdornment>,
                        }}
                        inputProps={{ min: 0, max: 120 }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Scheduling Constraints
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Control how tightly meetings can be scheduled together.
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="minimum_gap"
                    control={control}
                    rules={{
                      required: 'Minimum gap is required',
                      min: { value: 0, message: 'Must be 0 or greater' },
                      max: { value: 60, message: 'Must be 60 minutes or less' },
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Minimum Gap Between Bookings"
                        type="number"
                        error={!!errors.minimum_gap}
                        helperText={
                          errors.minimum_gap?.message ||
                          'Minimum time between any two bookings'
                        }
                        InputProps={{
                          endAdornment: <InputAdornment position="end">minutes</InputAdornment>,
                        }}
                        inputProps={{ min: 0, max: 60 }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="slot_interval_minutes"
                    control={control}
                    rules={{
                      required: 'Slot interval is required',
                      min: { value: 5, message: 'Must be at least 5 minutes' },
                      max: { value: 60, message: 'Must be 60 minutes or less' },
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Time Slot Interval"
                        type="number"
                        error={!!errors.slot_interval_minutes}
                        helperText={
                          errors.slot_interval_minutes?.message ||
                          'Granularity for generating available time slots'
                        }
                        InputProps={{
                          endAdornment: <InputAdornment position="end">minutes</InputAdornment>,
                        }}
                        inputProps={{ min: 5, max: 60, step: 5 }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Note:</strong> Individual event types can override these default
                      buffer times. The slot interval affects how frequently available times are
                      offered to invitees (e.g., every 15 minutes vs every 30 minutes).
                    </Typography>
                  </Alert>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
};

export default BufferSettings;