import React from 'react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';

export const RequestsPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-5 p-5 h-full overflow-y-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <Send className="w-5 h-5 text-blue-400" />
          <h2 className="text-base font-bold text-slate-100">Request Pipeline</h2>
        </div>
        <p className="text-xs text-slate-400">
          Live request routing and tracking panel.
        </p>
      </motion.div>

      <div className="card p-8 flex flex-col items-center justify-center gap-3 text-center max-w-md mx-auto">
        <Send className="w-8 h-8 text-slate-600" />
        <p className="text-sm font-semibold text-slate-300">Request Routing — Phase 3</p>
        <p className="text-xs text-slate-500 max-w-xs">
          Round Robin request routing, real-time request tracking, and animated packet flow
          will be implemented in Phase 3 when backend business logic is connected.
        </p>
      </div>
    </div>
  );
};
