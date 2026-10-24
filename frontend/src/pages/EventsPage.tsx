/**
 * EventsPage.tsx  (Phase 3 — uses simulation context)
 */

import React from 'react';
import { motion } from 'framer-motion';
import { EventFeed } from '../components/EventFeed';
import { useSimulation } from '../context/SimulationContext';

export const EventsPage: React.FC = () => {
  const sim = useSimulation();

  return (
    <div className="flex flex-col gap-5 p-5 h-full overflow-y-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
        <h2 className="text-base font-bold text-slate-100">System Event Log</h2>
        <p className="text-xs text-slate-400 mt-1">
          Live event stream from the frontend simulation. Events tagged <code className="text-blue-300">[SIM]</code> are
          simulation-generated. In Phase 8, these will be replaced by real Socket.IO broadcasts from the backend.
        </p>
      </motion.div>
      <div className="max-w-2xl">
        <EventFeed events={sim.events} />
      </div>
    </div>
  );
};
