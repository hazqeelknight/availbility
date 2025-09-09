import React from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Typography,
  Grid,
  Alert,
  Chip,
  Divider,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { motion } from 'framer-motion';
import { PageHeader, Button, LoadingSpinner } from '@/components/core';
import { useTimezoneTest } from '../hooks/useAvailabilityApi';
import type { TimezoneTestParams } from '../types';

interface TimezoneTestFormData {
  timezone: string;
  date: Date | null;
}

const TimezoneTester: React.FC = () => {
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<TimezoneTestFormData>({
    defaultValues: {
      timezone: 'America/New_York',
      date: new Date(),
    },
  });

  const watchedValues = watch();
  
  const testParams: TimezoneTestParams = {
    timezone: watchedValues.timezone,
    date: watchedValues.date ? watchedValues.date.toISOString().split('T')[0] : undefined,
  };

  const { data: testResult, isLoading, error } = useTimezoneTest(testParams);

  const onSubmit = (data: TimezoneTestFormData) => {
    // Form submission triggers the query automatically via watch
    console.log('Testing timezone:', data);
  };

  const commonTimezones = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Kolkata',
    'Australia/Sydney',
  ];

  return (
    <>
      <PageHeader
        title="Timezone Tester"
        subtitle="Test timezone handling and DST transitions for debugging"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Grid container spacing={3}>
          {/* Input Form */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Test Parameters
                </Typography>
                
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                    <Grid container spacing={3}>
                      <Grid item xs={12}>
                        <Controller
                          name="timezone"
                          control={control}
                          rules={{ required: 'Timezone is required' }}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              fullWidth
                              label="Timezone"
                              error={!!errors.timezone}
                              helperText={
                                errors.timezone?.message ||
                                'Enter an IANA timezone identifier (e.g., America/New_York)'
                              }
                              placeholder="America/New_York"
                            />
                          )}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <Controller
                          name="date"
                          control={control}
                          rules={{ required: 'Date is required' }}
                          render={({ field }) => (
                            <DatePicker
                              {...field}
                              label="Test Date"
                              slotProps={{
                                textField: {
                                  fullWidth: true,
                                  error: !!errors.date,
                                  helperText: errors.date?.message || 'Select a date to test',
                                },
                              }}
                            />
                          )}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom>
                          Common Timezones
                        </Typography>
                        <Box display="flex" flexWrap="wrap" gap={1}>
                          {commonTimezones.map((tz) => (
                            <Chip
                              key={tz}
                              label={tz}
                              size="small"
                              clickable
                              variant={watchedValues.timezone === tz ? 'filled' : 'outlined'}
                              onClick={() => {
                                control.setValue('timezone', tz);
                              }}
                            />
                          ))}
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                </LocalizationProvider>
              </CardContent>
            </Card>
          </Grid>

          {/* Results */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Test Results
                </Typography>

                {isLoading && (
                  <Box display="flex" justifyContent="center" py={4}>
                    <LoadingSpinner message="Testing timezone..." />
                  </Box>
                )}

                {error && (
                  <Alert severity="error">
                    Failed to test timezone. Please check your input and try again.
                  </Alert>
                )}

                {testResult && (
                  <Box>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <Typography variant="body2" color="text.secondary">
                            Timezone Valid:
                          </Typography>
                          <Chip
                            label={testResult.timezone_valid ? 'Valid' : 'Invalid'}
                            color={testResult.timezone_valid ? 'success' : 'error'}
                            size="small"
                          />
                        </Box>
                      </Grid>

                      {testResult.timezone_valid && (
                        <>
                          <Grid item xs={12}>
                            <Divider sx={{ my: 1 }} />
                          </Grid>

                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Organizer Timezone:
                            </Typography>
                            <Typography variant="body1" fontWeight={500}>
                              {testResult.organizer_timezone}
                            </Typography>
                          </Grid>

                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Test Timezone:
                            </Typography>
                            <Typography variant="body1" fontWeight={500}>
                              {testResult.test_timezone}
                            </Typography>
                          </Grid>

                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Test Date:
                            </Typography>
                            <Typography variant="body1" fontWeight={500}>
                              {testResult.test_date}
                            </Typography>
                          </Grid>

                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Offset Hours:
                            </Typography>
                            <Typography variant="body1" fontWeight={500}>
                              {testResult.offset_hours > 0 ? '+' : ''}{testResult.offset_hours}
                            </Typography>
                          </Grid>

                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              DST Active:
                            </Typography>
                            <Chip
                              label={testResult.is_dst ? 'Yes' : 'No'}
                              color={testResult.is_dst ? 'warning' : 'default'}
                              size="small"
                            />
                          </Grid>

                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              DST Offset:
                            </Typography>
                            <Typography variant="body1" fontWeight={500}>
                              {testResult.dst_offset_hours} hours
                            </Typography>
                          </Grid>

                          <Grid item xs={12}>
                            <Typography variant="body2" color="text.secondary">
                              DST Transition Date:
                            </Typography>
                            <Chip
                              label={testResult.is_dst_transition_date ? 'Yes' : 'No'}
                              color={testResult.is_dst_transition_date ? 'error' : 'success'}
                              size="small"
                            />
                          </Grid>

                          {testResult.is_dst_transition_date && (
                            <Grid item xs={12}>
                              <Alert severity="warning" sx={{ mt: 2 }}>
                                <Typography variant="body2">
                                  <strong>Warning:</strong> This date is a DST transition date. 
                                  Time calculations may be affected, and some time slots might 
                                  be unavailable or shifted.
                                </Typography>
                              </Alert>
                            </Grid>
                          )}
                        </>
                      )}
                    </Grid>
                  </Box>
                )}

                {!testResult && !isLoading && !error && (
                  <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                    Enter a timezone to see test results
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Usage Information */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Usage Information
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  This tool helps debug timezone-related issues in the availability system. 
                  Use it to test how different timezones and dates are handled, especially 
                  around DST transition periods.
                </Typography>
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>DST Transitions:</strong> During DST transitions, some time slots 
                    may be skipped (spring forward) or duplicated (fall back). The availability 
                    engine automatically handles these cases to prevent booking conflicts.
                  </Typography>
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </motion.div>
    </>
  );
};

export default TimezoneTester;