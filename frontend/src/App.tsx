import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { DashboardLayout } from './layouts/DashboardLayout';
import { DashboardPage } from './pages/DashboardPage';
import { TopologyPage } from './pages/TopologyPage';
import { ServersPage } from './pages/ServersPage';
import { RequestsPage } from './pages/RequestsPage';
import { AutoScalingPage } from './pages/AutoScalingPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { EventsPage } from './pages/EventsPage';
import { SimulationProvider } from './context/SimulationContext';
import { RealRoutingProvider } from './context/RealRoutingContext';

// ─── Animated page wrapper ─────────────────────────────────────────────────────

const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -4 }}
    transition={{ duration: 0.18, ease: 'easeOut' }}
    className="h-full"
  >
    {children}
  </motion.div>
);

// ─── Inner router (needs useLocation inside BrowserRouter) ───────────────────

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><DashboardPage /></PageTransition>} />
        <Route path="/topology" element={<PageTransition><TopologyPage /></PageTransition>} />
        <Route path="/servers" element={<PageTransition><ServersPage /></PageTransition>} />
        <Route path="/requests" element={<PageTransition><RequestsPage /></PageTransition>} />
        <Route path="/autoscaling" element={<PageTransition><AutoScalingPage /></PageTransition>} />
        <Route path="/analytics" element={<PageTransition><AnalyticsPage /></PageTransition>} />
        <Route path="/events" element={<PageTransition><EventsPage /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

// ─── Root app ─────────────────────────────────────────────────────────────────

export const App: React.FC = () => {
  return (
    <SimulationProvider>
      <RealRoutingProvider>
        <BrowserRouter>
          <DashboardLayout>
            <AnimatedRoutes />
          </DashboardLayout>
        </BrowserRouter>
      </RealRoutingProvider>
    </SimulationProvider>
  );
};

export default App;
