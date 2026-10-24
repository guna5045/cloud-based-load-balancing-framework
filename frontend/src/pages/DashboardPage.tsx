/**
 * DashboardPage.tsx
 * Phase 4: Real Round Robin Load Balancer & Request Routing
 *
 * Main dashboard for the Cloud-Based Load Balancing Framework.
 * Integrates live backend Round Robin telemetry, dynamic request distribution,
 * real-time request triggering, and interactive topology visualization.
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, Server, Clock, Cpu, Zap, Send, RefreshCw, CheckCircle2 } from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import { TopologyGraph } from '../components/TopologyGraph';
import { ServerDetailsPanel } from '../components/ServerDetailsPanel';
import { UtilizationChart } from '../components/UtilizationChart';
import { RequestDistribution } from '../components/RequestDistribution';
import { EventFeed } from '../components/EventFeed';
import { useSimulation } from '../context/SimulationContext';
import { useRealRouting } from '../hooks/useRealRouting';
import { mockTimeSeries } from '../data/mockData';
import { getHierarchyPath, countNodes } from '../data/topologySimulation';

export const DashboardPage: React.FC = () => {
  const sim = useSimulation();
  const real = useRealRouting();

  // Active particle path for edge highlighting
  const activePath = useMemo(() => {
    if (sim.particles.length === 0) return [];
    const latest = sim.particles[sim.particles.length - 1];
    return latest?.path ?? [];
  }, [sim.particles]);

  // Hierarchy path for selected server
  const hierarchyPath = useMemo(() => {
    if (!sim.selectedServerId) return [];
    return getHierarchyPath(sim.servers, sim.selectedServerId);
  }, [sim.selectedServerId, sim.servers]);

  // Compute live KPIs
  const activeNodes = useMemo(() => countNodes(sim.servers), [sim.servers]);

  const avgLoad = useMemo(() => {
    const all: number[] = [];
    const walk = (nodes: typeof sim.servers) => {
      for (const n of nodes) {
        all.push(n.load);
        walk(n.children);
      }
    };
    walk(sim.servers);
    return all.length > 0 ? Math.round(all.reduce((a, b) => a + b, 0) / all.length) : 0;
  }, [sim.servers]);

  const avgLatency = useMemo(() => {
    if (real.metrics && real.metrics.totalRequests > 0) {
      return real.metrics.averageResponseTime;
    }
    const all: number[] = [];
    const walk = (nodes: typeof sim.servers) => {
      for (const n of nodes) {
        if (n.metrics?.responseTimeMs) all.push(n.metrics.responseTimeMs);
        walk(n.children);
      }
    };
    walk(sim.servers);
    return all.length > 0 ? Math.round(all.reduce((a, b) => a + b, 0) / all.length) : 0;
  }, [sim.servers, real.metrics]);

  // Real or simulated request distribution
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

    // Fallback to active servers from topology
    const leaves: typeof sim.servers = [];
    const walk = (nodes: typeof sim.servers) => {
      for (const n of nodes) {
        if (n.children.length === 0) leaves.push(n);
        walk(n.children);
      }
    };
    walk(sim.servers);
    const total = leaves.reduce((a, n) => a + (n.metrics?.totalRequestsHandled ?? 0), 0);
    const mockEntries = leaves.map((n) => ({
      serverId: n.id,
      requests: n.metrics?.totalRequestsHandled ?? 0,
      percentage: total > 0 ? Math.round(((n.metrics?.totalRequestsHandled ?? 0) / total) * 100) : 0,
    }));
    return { distributionData: mockEntries, isRealDistribution: false };
  }, [real.metrics, sim.servers]);

  return (
    <div className="flex flex-col gap-5 p-5 h-full overflow-y-auto">
      {/* Real Request Quick Dispatcher Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            Phase 4 Round Robin
          </span>
          <span className="text-xs text-slate-300 font-medium">Real Backend Dispatcher</span>
          <span className="hidden sm:inline text-xs text-slate-500">•</span>
          <span className="hidden sm:inline text-xs text-slate-400 font-mono">
            Next: <strong className="text-emerald-400">{real.nextExpectedServer}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {real.lastResult && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{real.lastResult.requestId}</span>
              <span className="text-slate-500">→</span>
              <span className="text-blue-400 font-bold">{real.lastResult.server.id}</span>
              <span className="text-slate-500">({real.lastResult.response.processingTime}ms)</span>
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => real.sendSingleRequest()}
            disabled={real.isSending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-xs shadow-sm transition-colors"
          >
            <Send className={`w-3.5 h-3.5 ${real.isSending ? 'animate-spin' : ''}`} />
            <span>Send Real Request</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => real.sendBurstRequests(5)}
            disabled={real.isSending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/30 text-indigo-200 text-xs font-medium transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span>Burst (5x)</span>
          </motion.button>

          <button
            onClick={() => real.refreshData()}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Refresh backend metrics"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI row — using real backend routing metrics when available */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.07 } },
        }}
        className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3"
      >
        <MetricCard
          title="Total Requests"
          value={real.metrics && real.metrics.totalRequests > 0 ? real.metrics.totalRequests : sim.metrics.totalRequests}
          icon={Activity}
          accentColor="text-blue-400"
          description={real.metrics && real.metrics.totalRequests > 0 ? 'Real Round Robin requests' : 'Simulated — since startup'}
        />
        <MetricCard
          title="Active Nodes"
          value={activeNodes}
          icon={Server}
          accentColor="text-emerald-400"
          description={`Max depth: ${sim.metrics.maxDepth}`}
        />
        <MetricCard
          title="Avg Response"
          value={avgLatency}
          unit="ms"
          icon={Clock}
          accentColor="text-indigo-400"
          description={real.metrics && real.metrics.totalRequests > 0 ? 'Backend processing latency' : 'Cross-cluster average'}
        />
        <MetricCard
          title="System Load"
          value={avgLoad}
          unit="%"
          icon={Cpu}
          accentColor="text-amber-400"
          description="Weighted cluster load"
        />
        <MetricCard
          title="Scaling Events"
          value={sim.metrics.scalingEvents}
          icon={Zap}
          accentColor="text-violet-400"
          description="Triggered this session"
        />
      </motion.div>

      {/* Topology + Details */}
      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <TopologyGraph
            servers={sim.servers}
            selectedServerId={sim.selectedServerId}
            onSelectServer={sim.setSelectedServerId}
            activePath={activePath}
            scaling={sim.scaling}
            particles={sim.particles}
            height={440}
          />
        </div>

        {sim.selectedServer && (
          <ServerDetailsPanel
            server={sim.selectedServer}
            onClose={() => sim.setSelectedServerId(null)}
            hierarchyPath={hierarchyPath}
            onTriggerScaling={sim.triggerScaling}
            canScale={sim.canScale(sim.selectedServerId!)}
            scalingInProgress={sim.scaling.step !== 'idle'}
          />
        )}
      </div>

      {/* Bottom row: Charts + Real Request Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <UtilizationChart data={mockTimeSeries} />
        </div>
        <RequestDistribution
          data={distributionData}
          isRealData={isRealDistribution}
        />
      </div>

      {/* Live event feed */}
      <EventFeed events={sim.events} />
    </div>
  );
};
