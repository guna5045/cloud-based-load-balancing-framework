import React from 'react';
import { motion } from 'framer-motion';
import { UtilizationChart } from '../components/UtilizationChart';
import { RequestDistribution } from '../components/RequestDistribution';
import { mockTimeSeries, mockRequestDistribution } from '../data/mockData';
import { BarChart2 } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-5 p-5 h-full overflow-y-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <BarChart2 className="w-5 h-5 text-blue-400" />
          <h2 className="text-base font-bold text-slate-100">Analytics</h2>
        </div>
        <p className="text-xs text-slate-400">
          System utilization charts and request distribution. Mock data — live metrics connected in Phase 3.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <UtilizationChart data={mockTimeSeries} />
        </div>
        <RequestDistribution data={mockRequestDistribution} />
      </div>
    </div>
  );
};
