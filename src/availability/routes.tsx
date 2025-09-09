import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Placeholder components - to be implemented by the availability module developer
const AvailabilityOverview = React.lazy(() => import('./pages/AvailabilityOverview'));
const AvailabilityRules = React.lazy(() => import('./pages/AvailabilityRules'));
const DateOverrides = React.lazy(() => import('./pages/DateOverrides'));
const BlockedTimes = React.lazy(() => import('./pages/BlockedTimes'));
const BufferSettings = React.lazy(() => import('./pages/BufferSettings'));
const AvailabilityStats = React.lazy(() => import('./pages/AvailabilityStats'));
const TimezoneTester = React.lazy(() => import('./pages/TimezoneTester'));

const AvailabilityRoutes: React.FC = () => {
  return (
    <Routes>
      <Route index element={<AvailabilityOverview />} />
      <Route path="rules" element={<AvailabilityRules />} />
      <Route path="overrides" element={<DateOverrides />} />
      <Route path="blocked" element={<BlockedTimes />} />
      <Route path="buffer" element={<BufferSettings />} />
      <Route path="stats" element={<AvailabilityStats />} />
      <Route path="timezone-test" element={<TimezoneTester />} />
    </Routes>
  );
};

export default AvailabilityRoutes;