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
import { Add, Block, Repeat } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { PageHeader, Button, LoadingSpinner } from '@/components/core';
import { AvailabilityTable } from '../components/AvailabilityTable';
import { BlockedTimeForm } from '../components/BlockedTimeForm';
import { RecurringBlockedTimeForm } from '../components/RecurringBlockedTimeForm';
import {
  useBlockedTimes,
  useRecurringBlockedTimes,
  useDeleteBlockedTime,
  useDeleteRecurringBlockedTime,
} from '../hooks/useAvailabilityApi';
import { formatDateTimeForDisplay } from '../utils';
import type { BlockedTime, RecurringBlockedTime } from '../types';

const BlockedTimes: React.FC = () => {
  const { data: blockedTimes, isLoading: blockedLoading, error: blockedError } = useBlockedTimes();
  const { data: recurringBlocks, isLoading: recurringLoading, error: recurringError } = useRecurringBlockedTimes();
  const deleteBlockedTime = useDeleteBlockedTime();
  const deleteRecurringBlock = useDeleteRecurringBlockedTime();

  const [tabValue, setTabValue] = React.useState(0);
  const [blockedFormOpen, setBlockedFormOpen] = React.useState(false);
  const [recurringFormOpen, setRecurringFormOpen] = React.useState(false);
  const [editingBlocked, setEditingBlocked] = React.useState<BlockedTime | undefined>();
  const [editingRecurring, setEditingRecurring] = React.useState<RecurringBlockedTime | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deletingItem, setDeletingItem] = React.useState<BlockedTime | RecurringBlockedTime | undefined>();

  const isLoading = blockedLoading || recurringLoading;
  const error = blockedError || recurringError;

  const handleCreateBlocked = () => {
    setEditingBlocked(undefined);
    setBlockedFormOpen(true);
  };

  const handleCreateRecurring = () => {
    setEditingRecurring(undefined);
    setRecurringFormOpen(true);
  };

  const handleEditBlocked = (blocked: BlockedTime) => {
    setEditingBlocked(blocked);
    setBlockedFormOpen(true);
  };

  const handleEditRecurring = (recurring: RecurringBlockedTime) => {
    setEditingRecurring(recurring);
    setRecurringFormOpen(true);
  };

  const handleDeleteBlocked = (blocked: BlockedTime) => {
    setDeletingItem(blocked);
    setDeleteDialogOpen(true);
  };

  const handleDeleteRecurring = (recurring: RecurringBlockedTime) => {
    setDeletingItem(recurring);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (deletingItem) {
      if ('start_datetime' in deletingItem) {
        // It's a BlockedTime
        await deleteBlockedTime.mutateAsync(deletingItem.id);
      } else {
        // It's a RecurringBlockedTime
        await deleteRecurringBlock.mutateAsync(deletingItem.id);
      }
      setDeleteDialogOpen(false);
      setDeletingItem(undefined);
    }
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading blocked times..." />;
  }

  if (error) {
    return (
      <>
        <PageHeader
          title="Blocked Times"
          subtitle="Manage one-time and recurring blocked periods"
        />
        <Alert severity="error">
          Failed to load blocked times. Please try again later.
        </Alert>
      </>
    );
  }

  const hasData = (blockedTimes && blockedTimes.length > 0) || (recurringBlocks && recurringBlocks.length > 0);

  return (
    <>
      <PageHeader
        title="Blocked Times"
        subtitle="Manage one-time and recurring blocked periods"
        actions={
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              startIcon={<Repeat />}
              onClick={handleCreateRecurring}
            >
              Add Recurring Block
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleCreateBlocked}
            >
              Add Blocked Time
            </Button>
          </Box>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {!hasData ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Block sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No blocked times configured
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Block specific times when you're unavailable for meetings.
              </Typography>
              <Box display="flex" gap={2} justifyContent="center">
                <Button
                  variant="outlined"
                  startIcon={<Repeat />}
                  onClick={handleCreateRecurring}
                >
                  Add Recurring Block
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleCreateBlocked}
                >
                  Add One-Time Block
                </Button>
              </Box>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent>
              <Tabs
                value={tabValue}
                onChange={(_, newValue) => setTabValue(newValue)}
                sx={{ mb: 3 }}
              >
                <Tab
                  icon={<Block />}
                  label={`One-Time Blocks (${blockedTimes?.length || 0})`}
                  iconPosition="start"
                />
                <Tab
                  icon={<Repeat />}
                  label={`Recurring Blocks (${recurringBlocks?.length || 0})`}
                  iconPosition="start"
                />
              </Tabs>

              {tabValue === 0 && (
                <AvailabilityTable
                  data={blockedTimes || []}
                  type="blocked-times"
                  onEdit={handleEditBlocked}
                  onDelete={handleDeleteBlocked}
                />
              )}

              {tabValue === 1 && (
                <AvailabilityTable
                  data={recurringBlocks || []}
                  type="recurring-blocks"
                  onEdit={handleEditRecurring}
                  onDelete={handleDeleteRecurring}
                />
              )}
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* One-Time Blocked Time Form */}
      <BlockedTimeForm
        open={blockedFormOpen}
        onClose={() => {
          setBlockedFormOpen(false);
          setEditingBlocked(undefined);
        }}
        blockedTime={editingBlocked}
      />

      {/* Recurring Blocked Time Form */}
      <RecurringBlockedTimeForm
        open={recurringFormOpen}
        onClose={() => {
          setRecurringFormOpen(false);
          setEditingRecurring(undefined);
        }}
        recurringBlock={editingRecurring}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Blocked Time</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this blocked time? This action cannot be undone.
            {deletingItem && 'start_datetime' in deletingItem && (
              <Box sx={{ mt: 1, fontWeight: 500 }}>
                {formatDateTimeForDisplay(deletingItem.start_datetime)} - {formatDateTimeForDisplay(deletingItem.end_datetime)}
              </Box>
            )}
            {deletingItem && 'name' in deletingItem && (
              <Box sx={{ mt: 1, fontWeight: 500 }}>
                {deletingItem.name}
              </Box>
            )}
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
            loading={deleteBlockedTime.isPending || deleteRecurringBlock.isPending}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BlockedTimes;