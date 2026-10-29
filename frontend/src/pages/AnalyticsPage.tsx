/**
 * AnalyticsPage.tsx
 *
 * Real-time performance analytics, utilization telemetry charts,
 * and Round Robin distribution visualization.
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { UtilizationChart } from '../components/UtilizationChart';
import { RequestDistribution } from '../components/RequestDistribution';
import { mockTimeSeries, mockRequestDistribution } from '../data/mockData';
import { BarChart2, Cpu, Activity, Clock, RefreshCw } from 'lucide-react';
import { useRealRouting } from '../hooks/useRealRouting';
import { MetricCard } from '../components/MetricCard';

export const AnalyticsPage: React.FC = () => {
  const real = useRealRouting();

  const { distributionData, isRealDistribution } = useMemo(() => {
    if (real.metrics && real.metrics.totalRequests > 0) {
      const entries = Object.entries(real.metrics.requestsByServer).map(([serverId, count]) => ({
        serverId,
        requests: count,
        percentage:
          real.metrics!.totalRequests > 0
            ? Math.round((count / real.metrics!.totalRequests) * 100)
            : 0,
      }));
      return { distributionData: entries, isRealDistribution: true };
    }
    return { distributionData: mockRequestDistribution, isRealDistribution: false };
  }, [real.metrics]);

  const chartData = real.liveTimeSeries.length > 0 ? real.liveTimeSeries : mockTimeSeries;

  return (
    <div className="flex flex-col gap-5 p-5 h-full overflow-y-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart2 className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold text-slate-100">Cluster Telemetry & Analytics</h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Live Real-Time
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Real-time server utilization, in-flight concurrency, and Round Robin traffic distribution.
          </p>
        </div>

        <button
          onClick={() => real.refreshData()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Metrics</span>
        </button>
      </motion.div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          title="Cluster Utilization"
          value={real.clusterSummary.averageUtilization}
          unit="%"
          icon={Cpu}
          accentColor={
            real.clusterSummary.averageUtilization >= 80
              ? 'text-rose-400'
              : real.clusterSummary.averageUtilization >= 60
              ? 'text-amber-400'
              : 'text-blue-400'
          }
          description="Normalized telemetry load"
        />
        <MetricCard
          title="Requests Routed"
          value={real.metrics?.totalRequests ?? 0}
          icon={Activity}
          accentColor="text-emerald-400"
          description="Through Round Robin scheduler"
        />
        <MetricCard
          title="Average Latency"
          value={real.metrics?.averageResponseTime ?? 0}
          unit="ms"
          icon={Clock}
          accentColor="text-indigo-400"
          description="Average HTTP response latency"
        />
        <MetricCard
          title="Active Leaf Instances"
          value={real.scalingKPIs.activeLeafServers}
          icon={BarChart2}
          accentColor="text-amber-400"
          description="Healthy routable servers"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <UtilizationChart data={chartData} isLive={real.liveTimeSeries.length > 0} />
        </div>
        <RequestDistribution data={distributionData} isRealData={isRealDistribution} />
      </div>
    </div>
  );
};
