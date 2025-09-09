import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Box,
  Typography,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Edit,
  Delete,
  MoreVert,
  Schedule,
  EventAvailable,
  Block,
  Info,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { formatTimeForDisplay, getWeekdayName, formatDateForDisplay, formatDateTimeForDisplay } from '../utils';
import type { AvailabilityRule, DateOverrideRule, RecurringBlockedTime, BlockedTime } from '../types';

type TableData = AvailabilityRule | DateOverrideRule | RecurringBlockedTime | BlockedTime;

interface AvailabilityTableProps<T extends TableData> {
  data: T[];
  type: 'rules' | 'overrides' | 'recurring-blocks' | 'blocked-times';
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  loading?: boolean;
}

export const AvailabilityTable = <T extends TableData>({
  data,
  type,
  onEdit,
  onDelete,
  loading = false,
}: AvailabilityTableProps<T>) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedItem, setSelectedItem] = React.useState<T | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, item: T) => {
    setAnchorEl(event.currentTarget);
    setSelectedItem(item);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedItem(null);
  };

  const handleEdit = () => {
    if (selectedItem) {
      onEdit(selectedItem);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedItem) {
      onDelete(selectedItem);
    }
    handleMenuClose();
  };

  const getTableHeaders = () => {
    switch (type) {
      case 'rules':
        return ['Day', 'Time Range', 'Event Types', 'Status', 'Actions'];
      case 'overrides':
        return ['Date', 'Availability', 'Time Range', 'Reason', 'Status', 'Actions'];
      case 'recurring-blocks':
        return ['Name', 'Day', 'Time Range', 'Date Range', 'Status', 'Actions'];
      case 'blocked-times':
        return ['Date & Time', 'Reason', 'Source', 'Status', 'Actions'];
      default:
        return [];
    }
  };

  const renderTableRow = (item: T, index: number) => {
    const canEdit = type !== 'blocked-times' || (item as BlockedTime).source === 'manual';

    return (
      <motion.tr
        key={item.id}
        component={TableRow}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: index * 0.05 }}
        hover
      >
        {type === 'rules' && (
          <>
            <TableCell>
              <Box display="flex" alignItems="center" gap={1}>
                <Schedule fontSize="small" color="primary" />
                {getWeekdayName((item as AvailabilityRule).day_of_week)}
              </Box>
            </TableCell>
            <TableCell>
              <Box>
                <Typography variant="body2">
                  {formatTimeForDisplay((item as AvailabilityRule).start_time)} - {formatTimeForDisplay((item as AvailabilityRule).end_time)}
                </Typography>
                {(item as AvailabilityRule).spans_midnight && (
                  <Chip label="Spans Midnight" size="small" color="info" sx={{ mt: 0.5 }} />
                )}
              </Box>
            </TableCell>
            <TableCell>
              <Chip
                label={
                  (item as AvailabilityRule).event_types_count > 0
                    ? `${(item as AvailabilityRule).event_types_count} types`
                    : 'All types'
                }
                size="small"
                variant="outlined"
              />
            </TableCell>
          </>
        )}

        {type === 'overrides' && (
          <>
            <TableCell>
              <Box display="flex" alignItems="center" gap={1}>
                <EventAvailable fontSize="small" color="primary" />
                {formatDateForDisplay((item as DateOverrideRule).date)}
              </Box>
            </TableCell>
            <TableCell>
              <Chip
                label={(item as DateOverrideRule).is_available ? 'Available' : 'Blocked'}
                color={(item as DateOverrideRule).is_available ? 'success' : 'error'}
                size="small"
              />
            </TableCell>
            <TableCell>
              {(item as DateOverrideRule).is_available && (item as DateOverrideRule).start_time && (item as DateOverrideRule).end_time ? (
                <Box>
                  <Typography variant="body2">
                    {formatTimeForDisplay((item as DateOverrideRule).start_time!)} - {formatTimeForDisplay((item as DateOverrideRule).end_time!)}
                  </Typography>
                  {(item as DateOverrideRule).spans_midnight && (
                    <Chip label="Spans Midnight" size="small" color="info" sx={{ mt: 0.5 }} />
                  )}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Entire day
                </Typography>
              )}
            </TableCell>
            <TableCell>
              <Typography variant="body2" color="text.secondary">
                {(item as DateOverrideRule).reason || '—'}
              </Typography>
            </TableCell>
          </>
        )}

        {type === 'recurring-blocks' && (
          <>
            <TableCell>
              <Box display="flex" alignItems="center" gap={1}>
                <Block fontSize="small" color="warning" />
                <Typography variant="body2" fontWeight={500}>
                  {(item as RecurringBlockedTime).name}
                </Typography>
              </Box>
            </TableCell>
            <TableCell>
              {getWeekdayName((item as RecurringBlockedTime).day_of_week)}
            </TableCell>
            <TableCell>
              <Box>
                <Typography variant="body2">
                  {formatTimeForDisplay((item as RecurringBlockedTime).start_time)} - {formatTimeForDisplay((item as RecurringBlockedTime).end_time)}
                </Typography>
                {(item as RecurringBlockedTime).spans_midnight && (
                  <Chip label="Spans Midnight" size="small" color="info" sx={{ mt: 0.5 }} />
                )}
              </Box>
            </TableCell>
            <TableCell>
              <Typography variant="body2" color="text.secondary">
                {(item as RecurringBlockedTime).start_date && (item as RecurringBlockedTime).end_date
                  ? `${formatDateForDisplay((item as RecurringBlockedTime).start_date!)} - ${formatDateForDisplay((item as RecurringBlockedTime).end_date!)}`
                  : (item as RecurringBlockedTime).start_date
                  ? `From ${formatDateForDisplay((item as RecurringBlockedTime).start_date!)}`
                  : (item as RecurringBlockedTime).end_date
                  ? `Until ${formatDateForDisplay((item as RecurringBlockedTime).end_date!)}`
                  : 'Indefinite'}
              </Typography>
            </TableCell>
          </>
        )}

        {type === 'blocked-times' && (
          <>
            <TableCell>
              <Box display="flex" alignItems="center" gap={1}>
                <Block fontSize="small" color="error" />
                <Box>
                  <Typography variant="body2">
                    {formatDateTimeForDisplay((item as BlockedTime).start_datetime)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    to {formatDateTimeForDisplay((item as BlockedTime).end_datetime)}
                  </Typography>
                </Box>
              </Box>
            </TableCell>
            <TableCell>
              <Typography variant="body2" color="text.secondary">
                {(item as BlockedTime).reason || '—'}
              </Typography>
            </TableCell>
            <TableCell>
              <Chip
                label={(item as BlockedTime).source_display}
                size="small"
                color={(item as BlockedTime).source === 'manual' ? 'default' : 'info'}
              />
            </TableCell>
          </>
        )}

        <TableCell>
          <Chip
            label={item.is_active ? 'Active' : 'Inactive'}
            color={item.is_active ? 'success' : 'default'}
            size="small"
          />
        </TableCell>

        <TableCell>
          <IconButton
            size="small"
            onClick={(e) => handleMenuOpen(e, item)}
            disabled={!canEdit}
          >
            <MoreVert />
          </IconButton>
        </TableCell>
      </motion.tr>
    );
  };

  if (data.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No {type.replace('-', ' ')} configured yet.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {getTableHeaders().map((header) => (
                <TableCell key={header} sx={{ fontWeight: 600 }}>
                  {header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((item, index) => renderTableRow(item, index))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <Delete fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};