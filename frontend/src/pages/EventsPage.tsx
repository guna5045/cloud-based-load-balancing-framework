/**
 * EventsPage.tsx
 *
 * Real-time unified event feed displaying live Socket.IO broadcasts
 * (request routing, server status, overload alerts, scaling operations)
 * as well as interactive simulation events.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { EventFeed } from '../components/EventFeed';
import { useSimulation } from '../context/SimulationContext';
import { useRealRouting } from '../hooks/useRealRouting';
import { List, Radio, CheckCircle2 } from 'lucide-react';

export const EventsPage: React.FC = () => {
  const sim = useSimulation();
  const real = useRealRouting();

  return (
    <div className="flex flex-col gap-5 p-5 h-full overflow-y-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center justify-between gap-3 max-w-4xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <List className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold text-slate-100">System Event Stream</h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Live Stream
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Authoritative event pipeline streaming real-time request routing, server transitions, overload warnings, and dynamic 3-child scaling.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
            <Radio className="w-3.5 h-3.5 text-indigo-400" />
            <span>Socket.IO:</span>
            <span className={real.socketConnected ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
              {real.socketConnected ? 'LIVE' : 'CONNECTING'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
            <span>Events:</span>
            <strong className="text-white">{sim.events.length}</strong>
          </div>
        </div>
      </motion.div>

      <div className="max-w-4xl">
        <EventFeed events={sim.events} />
      </div>
    </div>
  );
};
