import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DashboardLayout } from './layouts/DashboardLayout';
import { DashboardPage } from './pages/DashboardPage';
import { TopologyPage } from './pages/TopologyPage';
import { ServersPage } from './pages/ServersPage';
import { RequestsPage } from './pages/RequestsPage';
import { AutoScalingPage } from './pages/AutoScalingPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { EventsPage } from './pages/EventsPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/topology" element={<TopologyPage />} />
          <Route path="/servers" element={<ServersPage />} />
          <Route path="/requests" element={<RequestsPage />} />
          <Route path="/autoscaling" element={<AutoScalingPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/events" element={<EventsPage />} />
        </Routes>
      </DashboardLayout>
    </BrowserRouter>
  );
};

export default App;
