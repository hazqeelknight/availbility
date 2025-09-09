import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button as MuiButton,
  Alert,
  Chip,
} from '@mui/material';
import {
  Schedule,
  EventAvailable,
  Block,
  Settings,
  Analytics,
  Add,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/core';
import { Button, LoadingSpinner } from '@/components/core';
import {
  useAvailabilityRules,
  useDateOverrideRules,
  useBlockedTimes,
  useRecurringBlockedTimes,
  useAvailabilityStats,
} from '../hooks/useAvailabilityApi';

const AvailabilityOverview: React.FC = () => {
  const navigate = useNavigate();
  
  const { data: rules, isLoading: rulesLoading } = useAvailabilityRules();
  const { data: overrides, isLoading: overridesLoading } = useDateOverrideRules();
  const { data: blockedTimes, isLoading: blockedLoading } = useBlockedTimes();
  const { data: recurringBlocks, isLoading: recurringLoading } = useRecurringBlockedTimes();
  const { data: stats, isLoading: statsLoading } = useAvailabilityStats();

  const isLoading = rulesLoading || overridesLoading || blockedLoading || recurringLoading || statsLoading;

  const quickActions = [
    {
      title: 'Add Availability Rule',
      description: 'Set your recurring weekly schedule',
      icon: Schedule,
      color: 'primary.main',
      action: () => navigate('/availability/rules'),
    },
    {
      title: 'Add Date Override',
      description: 'Override availability for specific dates',
      icon: EventAvailable,
      color: 'info.main',
      action: () => navigate('/availability/overrides'),
    },
    {
      title: 'Block Time',
      description: 'Block time periods when unavailable',
      icon: Block,
      color: 'warning.main',
      action: () => navigate('/availability/blocked'),
    },
    {
      title: 'Buffer Settings',
      description: 'Configure default buffer times',
      icon: Settings,
      color: 'secondary.main',
      action: () => navigate('/availability/buffer'),
    },
  ];

  const overviewCards = [
    {
      title: 'Availability Rules',
      count: rules?.length || 0,
      active: rules?.filter(rule => rule.is_active).length || 0,
      icon: Schedule,
      color: 'primary.main',
      path: '/availability/rules',
    },
    {
      title: 'Date Overrides',
      count: overrides?.length || 0,
      active: overrides?.filter(override => override.is_active).length || 0,
      icon: EventAvailable,
      color: 'info.main',
      path: '/availability/overrides',
    },
    {
      title: 'Blocked Times',
      count: blockedTimes?.length || 0,
      active: blockedTimes?.filter(block => block.is_active).length || 0,
      icon: Block,
      color: 'warning.main',
      path: '/availability/blocked',
    },
    {
      title: 'Recurring Blocks',
      count: recurringBlocks?.length || 0,
      active: recurringBlocks?.filter(block => block.is_active).length || 0,
      icon: Block,
      color: 'secondary.main',
      path: '/availability/blocked',
    },
  ];

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading availability overview..." />;
  }

  return (
    <>
      <PageHeader
        title="Availability Overview"
        subtitle="Manage when you're available for meetings"
        actions={
          <Button
            variant="contained"
            startIcon={<Analytics />}
            onClick={() => navigate('/availability/stats')}
          >
            View Statistics
          </Button>
        }
      />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Grid container spacing={3}>
          {/* Quick Stats */}
          {overviewCards.map((card, index) => (
            <Grid item xs={12} sm={6} md={3} key={card.title}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 4,
                    },
                  }}
                  onClick={() => navigate(card.path)}
                >
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography color="text.secondary" gutterBottom variant="overline">
                          {card.title}
                        </Typography>
                        <Typography variant="h4" component="div" sx={{ fontWeight: 700 }}>
                          {card.count}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1} mt={1}>
                          <Chip
                            label={`${card.active} active`}
                            size="small"
                            color={card.active > 0 ? 'success' : 'default'}
                          />
                        </Box>
                      </Box>
                      <Box
                        sx={{
                          backgroundColor: card.color,
                          borderRadius: 2,
                          p: 1.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <card.icon sx={{ color: 'white', fontSize: 24 }} />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}

          {/* Weekly Summary */}
          {stats && (
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Weekly Summary
                  </Typography>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Typography variant="h3" fontWeight={700} color="primary.main">
                      {stats.average_weekly_hours.toFixed(1)}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      hours available per week
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2" color="text.secondary">
                      Busiest day:
                    </Typography>
                    <Chip label={stats.busiest_day} color="primary" size="small" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Quick Actions */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <Grid container spacing={2}>
                  {quickActions.map((action, index) => (
                    <Grid item xs={12} key={action.title}>
                      <MuiButton
                        fullWidth
                        variant="outlined"
                        startIcon={<action.icon />}
                        onClick={action.action}
                        sx={{
                          justifyContent: 'flex-start',
                          p: 2,
                          textAlign: 'left',
                        }}
                      >
                        <Box>
                          <Typography variant="subtitle2" display="block">
                            {action.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {action.description}
                          </Typography>
                        </Box>
                      </MuiButton>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
    </>
  );
};

          {/* Getting Started */}
          {(!rules || rules.length === 0) && (
            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Get Started:</strong> You haven't set up any availability rules yet. 
                  Start by creating your first availability rule to define when you're available for meetings.
                </Typography>
                <Box mt={2}>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Add />}
                    onClick={() => navigate('/availability/rules')}
                  >
                    Create First Rule
                  </Button>
                </Box>
              </Alert>
            </Grid>
          )}
        </Grid>
      </motion.div>
export default AvailabilityOverview;