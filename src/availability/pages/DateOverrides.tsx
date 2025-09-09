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
  Tabs,
  Tab,
} from '@mui/material';
import { Add, EventAvailable, Block } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { PageHeader, Button, LoadingSpinner } from '@/components/core';
import { AvailabilityTable } from '../components/AvailabilityTable';
import { DateOverrideForm } from '../components/DateOverrideForm';
import {
  useDateOverrideRules,
  useDeleteDateOverrideRule,
} from '../hooks/useAvailabilityApi';
import { formatDateForDisplay } from '../utils';
import type { DateOverrideRule } from '../types';

const DateOverrides: React.FC = () => {
  const { data: overrides, isLoading, error } = useDateOverrideRules();
  const deleteOverride = useDeleteDateOverrideRule();

  const [formOpen, setFormOpen] = React.useState(false);
  const [editingOverride, setEditingOverride] = React.useState<DateOverrideRule | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deletingOverride, setDeletingOverride] = React.useState<DateOverrideRule | undefined>();
  const [tabValue, setTabValue] = React.useState(0);

  // Mock event types - in real implementation, this would come from Events module
  const eventTypes = [
    { id: '1', name: '30 Min Meeting' },
    { id: '2', name: 'Consultation' },
    { id: '3', name: 'Demo Call' },
  ];

  const handleCreate = () => {
    setEditingOverride(undefined);
    setFormOpen(true);
  };

  const handleEdit = (override: DateOverrideRule) => {
    setEditingOverride(override);
    setFormOpen(true);
  };

  const handleDelete = (override: DateOverrideRule) => {
    setDeletingOverride(override);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (deletingOverride) {
      await deleteOverride.mutateAsync(deletingOverride.id);
      setDeleteDialogOpen(false);
      setDeletingOverride(undefined);
    }
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingOverride(undefined);
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading date overrides..." />;
  }

  if (error) {
    return (
      <>
        <PageHeader
          title="Date Overrides"
          subtitle="Override your schedule for specific dates"
        />
        <Alert severity="error">
          Failed to load date overrides. Please try again later.
        </Alert>
      </>
    );
  }

  // Filter overrides by type
  const availableOverrides = overrides?.filter(o => o.is_available) || [];
  const blockedOverrides = overrides?.filter(o => !o.is_available) || [];

  // Sort by date (most recent first)
  const sortedAvailable = availableOverrides.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const sortedBlocked = blockedOverrides.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const currentOverrides = tabValue === 0 ? sortedAvailable : sortedBlocked;

  return (
    <>
      <PageHeader
        title="Date Overrides"
        subtitle="Override your schedule for specific dates"
        actions={
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreate}
          >
            Add Override
          </Button>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {!overrides || overrides.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <EventAvailable sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No date overrides configured
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Create date overrides to modify your availability for specific dates.
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleCreate}
              >
                Create First Override
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Date Overrides ({overrides.length} total)
                </Typography>
              </Box>

              <Tabs
                value={tabValue}
                onChange={(_, newValue) => setTabValue(newValue)}
                sx={{ mb: 3 }}
              >
                <Tab
                  icon={<EventAvailable />}
                  label={`Available (${availableOverrides.length})`}
                  iconPosition="start"
                />
                <Tab
                  icon={<Block />}
                  label={`Blocked (${blockedOverrides.length})`}
                  iconPosition="start"
                />
              </Tabs>
              
              <AvailabilityTable
                data={currentOverrides}
                type="overrides"
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Create/Edit Form */}
      <DateOverrideForm
        open={formOpen}
        onClose={handleFormClose}
        override={editingOverride}
        eventTypes={eventTypes}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Date Override</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the override for{' '}
            {deletingOverride && formatDateForDisplay(deletingOverride.date)}? This action cannot be undone.
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
            loading={deleteOverride.isPending}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DateOverrides;