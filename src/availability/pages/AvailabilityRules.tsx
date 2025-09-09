import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { Add, Schedule } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { PageHeader, Button, LoadingSpinner } from '@/components/core';
import { AvailabilityTable } from '../components/AvailabilityTable';
import { AvailabilityRuleForm } from '../components/AvailabilityRuleForm';
import {
  useAvailabilityRules,
  useDeleteAvailabilityRule,
} from '../hooks/useAvailabilityApi';
import { useEventTypes } from '@/events/hooks/useEventTypes'; // Import the new hook
import { useEventTypes } from '@/events/hooks/useEventTypes'; // Import the new hook
import { sortAvailabilityRules, getWeekdayName } from '../utils';
import type { AvailabilityRule } from '../types';

const AvailabilityRules: React.FC = () => {
  const { data: rules, isLoading, error } = useAvailabilityRules();
  const deleteRule = useDeleteAvailabilityRule();
  };

  const handleEdit = (rule: AvailabilityRule) => {
    setEditingRule(rule);
  const { data: eventTypes, isLoading: eventTypesLoading } = useEventTypes();

  const confirmDelete = async () => {
    if (deletingRule) {
      await deleteRule.mutateAsync(deletingRule.id);
      setDeleteDialogOpen(false);
      setDeletingRule(undefined);
    }
  };

  if (isLoading || eventTypesLoading) {
    setFormOpen(false);
    setEditingRule(undefined);
  };

  if (isLoading || eventTypesLoading) {
    return <LoadingSpinner fullScreen message="Loading availability rules..." />;
  }

  if (error) {
    return (
      <>
        <PageHeader
          title="Availability Rules"
          subtitle="Set your recurring weekly schedule"
        />
        <Alert severity="error">
          Failed to load availability rules. Please try again later.
        </Alert>
      </>
    );
  }

  const sortedRules = rules ? sortAvailabilityRules(rules) : [];

  return (
    <>
      <PageHeader
        title="Availability Rules"
        subtitle="Set your recurring weekly schedule"
        actions={
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreate}
          >
            Add Rule
          </Button>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {sortedRules.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Schedule sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No availability rules set up
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Create your first availability rule to define when you're available for meetings.
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleCreate}
              >
                Create First Rule
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Weekly Availability ({sortedRules.length} rules)
                </Typography>
              </Box>
              
              <AvailabilityTable
                data={sortedRules}
                type="rules"
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Create/Edit Form */}
      <AvailabilityRuleForm
        open={formOpen}
        onClose={handleFormClose}
        rule={editingRule}
        eventTypes={eventTypes || []}
        existingRules={rules || []}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Availability Rule</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this availability rule for{' '}
            {deletingRule && getWeekdayName(deletingRule.day_of_week)}? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            loading={deleteRule.isPending}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AvailabilityRules;