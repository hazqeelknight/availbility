import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  Schedule,
  EventAvailable,
  Block,
  Repeat,
  TrendingUp,
  Speed,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { PageHeader, Button, LoadingSpinner } from '@/components/core';
import {
  useAvailabilityStats,
  useClearAvailabilityCache,
  usePrecomputeAvailabilityCache,
} from '../hooks/useAvailabilityApi';

const AvailabilityStats: React.FC = () => {
  const { data: stats, isLoading, error, refetch } = useAvailabilityStats();
  const clearCache = useClearAvailabilityCache();
  const precomputeCache = usePrecomputeAvailabilityCache();

  const handleClearCache = () => {
    clearCache.mutate();
  };

  const handlePrecomputeCache = () => {
    precomputeCache.mutate(14); // 14 days ahead
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading availability statistics..." />;
  }

  if (error) {
    return (
      <>
        <PageHeader
          title="Availability Statistics"
          subtitle="Insights into your availability patterns and system performance"
        />
        <Alert severity="error">
          Failed to load availability statistics. Please try again later.
        </Alert>
      </>
    );
  }

  const statCards = [
    {
      title: 'Total Rules',
      value: stats?.total_rules || 0,
      icon: Schedule,
      color: 'primary.main',
      description: 'Availability rules configured',
    },
    {
      title: 'Active Rules',
      value: stats?.active_rules || 0,
      icon: EventAvailable,
      color: 'success.main',
      description: 'Currently active rules',
    },
    {
      title: 'Date Overrides',
      value: stats?.total_overrides || 0,
      icon: EventAvailable,
      color: 'info.main',
      description: 'Date-specific overrides',
    },
    {
      title: 'Blocked Times',
      value: stats?.total_blocks || 0,
      icon: Block,
      color: 'warning.main',
      description: 'One-time blocked periods',
    },
    {
      title: 'Recurring Blocks',
      value: stats?.total_recurring_blocks || 0,
      icon: Repeat,
      color: 'secondary.main',
      description: 'Recurring blocked periods',
    },
    {
      title: 'Weekly Hours',
      value: stats?.average_weekly_hours?.toFixed(1) || '0.0',
      icon: TrendingUp,
      color: 'primary.main',
      description: 'Average available hours per week',
      suffix: 'hrs',
    },
  ];

  return (
    <>
      <PageHeader
        title="Availability Statistics"
        subtitle="Insights into your availability patterns and system performance"
        actions={
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              onClick={() => refetch()}
              size="small"
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              onClick={handlePrecomputeCache}
              loading={precomputeCache.isPending}
              size="small"
            >
              Precompute Cache
            </Button>
            <Button
              variant="outlined"
              color="warning"
              onClick={handleClearCache}
              loading={clearCache.isPending}
              size="small"
            >
              Clear Cache
            </Button>
          </Box>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Grid container spacing={3}>
          {/* Statistics Cards */}
          {statCards.map((stat, index) => (
            <Grid item xs={12} sm={6} md={4} key={stat.title}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography color="text.secondary" gutterBottom variant="overline">
                          {stat.title}
                        </Typography>
                        <Typography variant="h4" component="div" sx={{ fontWeight: 700 }}>
                          {stat.value}
                          {stat.suffix && (
                            <Typography
                              component="span"
                              variant="h6"
                              color="text.secondary"
                              sx={{ ml: 0.5 }}
                            >
                              {stat.suffix}
                            </Typography>
                          )}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {stat.description}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          backgroundColor: stat.color,
                          borderRadius: 2,
                          p: 1.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <stat.icon sx={{ color: 'white', fontSize: 24 }} />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}

          {/* Busiest Day */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Busiest Day
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                  <Chip
                    label={stats?.busiest_day || 'None'}
                    color="primary"
                    size="large"
                    sx={{ fontSize: '1rem', fontWeight: 600 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Day with the most available hours
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Cache Performance */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Speed sx={{ color: 'info.main' }} />
                  <Typography variant="h6">
                    Cache Performance
                  </Typography>
                </Box>
                <Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2" color="text.secondary">
                      Hit Rate
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {stats?.cache_hit_rate?.toFixed(1) || '0.0'}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={stats?.cache_hit_rate || 0}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        backgroundColor: stats?.cache_hit_rate && stats.cache_hit_rate > 80 
                          ? 'success.main' 
                          : stats?.cache_hit_rate && stats.cache_hit_rate > 60 
                          ? 'warning.main' 
                          : 'error.main',
                      },
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Higher cache hit rates improve booking page performance
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Daily Hours Breakdown */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Daily Hours Breakdown
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Average available hours per day of the week
                </Typography>
                <Grid container spacing={2}>
                  {stats?.daily_hours && Object.entries(stats.daily_hours).map(([day, hours]) => (
                    <Grid item xs={12} sm={6} md={3} key={day}>
                      <Box
                        sx={{
                          p: 2,
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 2,
                          textAlign: 'center',
                        }}
                      >
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          {day}
                        </Typography>
                        <Typography variant="h5" fontWeight={600}>
                          {typeof hours === 'number' ? hours.toFixed(1) : '0.0'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          hours
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Cache Management */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Cache Management
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Manage availability cache for optimal performance
                </Typography>
                <Box display="flex" gap={2} flexWrap="wrap">
                  <Button
                    variant="outlined"
                    onClick={handlePrecomputeCache}
                    loading={precomputeCache.isPending}
                    startIcon={<TrendingUp />}
                  >
                    Precompute Cache (14 days)
                  </Button>
                  <Button
                    variant="outlined"
                    color="warning"
                    onClick={handleClearCache}
                    loading={clearCache.isPending}
                    startIcon={<Block />}
                  >
                    Clear All Cache
                  </Button>
                </Box>
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Precompute:</strong> Generates availability cache for the next 14 days to improve booking page performance.
                    <br />
                    <strong>Clear Cache:</strong> Removes all cached availability data. Use this if you notice stale availability information.
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

export default AvailabilityStats;