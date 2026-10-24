import React from 'react';
import { motion } from 'framer-motion';
import { EventFeed } from '../components/EventFeed';
import { mockEvents } from '../data/mockData';

export const EventsPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-5 p-5 h-full overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl"
      >
        <h2 className="text-base font-bold text-slate-100">System Event Log</h2>
        <p className="text-xs text-slate-400 mt-1">
          Real-time event stream. Displays request routing, scaling events, and system alerts.
          In Phase 3, these events will be driven by live Socket.IO messages from the backend.
        </p>
      </motion.div>
      <div className="max-w-2xl">
        <EventFeed events={mockEvents} />
      </div>
    </div>
  );
};
