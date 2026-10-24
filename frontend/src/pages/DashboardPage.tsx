/**
 * DashboardPage.tsx  (Phase 3 — simulation-integrated)
 *
 * Main dashboard for the Cloud-Based Load Balancing Framework.
 * Uses the shared SimulationContext for live topology and KPI data.
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, Server, Clock, Cpu, Zap } from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import { TopologyGraph } from '../components/TopologyGraph';
import { ServerDetailsPanel } from '../components/ServerDetailsPanel';
import { UtilizationChart } from '../components/UtilizationChart';
import { RequestDistribution } from '../components/RequestDistribution';
import { EventFeed } from '../components/EventFeed';
import { useSimulation } from '../context/SimulationContext';
import { mockTimeSeries } from '../data/mockData';
import { getHierarchyPath, countNodes } from '../data/topologySimulation';

export const DashboardPage: React.FC = () => {
  const sim = useSimulation();

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

  // Compute live KPIs from simulation state
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
    const all: number[] = [];
    const walk = (nodes: typeof sim.servers) => {
      for (const n of nodes) {
        if (n.metrics?.responseTimeMs) all.push(n.metrics.responseTimeMs);
        walk(n.children);
      }
    };
    walk(sim.servers);
    return all.length > 0 ? Math.round(all.reduce((a, b) => a + b, 0) / all.length) : 0;
  }, [sim.servers]);

  // Request distribution from active servers
  const requestDistribution = useMemo(() => {
    const leaves: typeof sim.servers = [];
    const walk = (nodes: typeof sim.servers) => {
      for (const n of nodes) {
        if (n.children.length === 0) leaves.push(n);
        walk(n.children);
      }
    };
    walk(sim.servers);
    const total = leaves.reduce((a, n) => a + (n.metrics?.totalRequestsHandled ?? 0), 0);
    return leaves.map((n) => ({
      serverId: n.id,
      requests: n.metrics?.totalRequestsHandled ?? 0,
      percentage: total > 0 ? Math.round(((n.metrics?.totalRequestsHandled ?? 0) / total) * 100) : 0,
    }));
  }, [sim.servers]);

  return (
    <div className="flex flex-col gap-5 p-5 h-full overflow-y-auto">
      {/* KPI row — live from simulation state */}
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
          value={sim.metrics.totalRequests}
          icon={Activity}
          accentColor="text-blue-400"
          description="Simulated — since startup"
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
          description="Cross-cluster average"
        />
        <MetricCard
          title="System Load"
          value={avgLoad}
          unit="%"
          icon={Cpu}
          accentColor="text-amber-400"
          description="Weighted average load"
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

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <UtilizationChart data={mockTimeSeries} />
        </div>
        <RequestDistribution data={requestDistribution.length > 0 ? requestDistribution : [
          { serverId: 'S1', requests: 8194, percentage: 33 },
          { serverId: 'S2', requests: 8401, percentage: 34 },
          { serverId: 'S3', requests: 7987, percentage: 33 },
        ]} />
      </div>

      {/* Live event feed from simulation */}
      <EventFeed events={sim.events} />
    </div>
  );
};
