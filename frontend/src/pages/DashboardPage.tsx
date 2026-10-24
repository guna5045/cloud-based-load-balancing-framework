import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Server,
  Clock,
  Cpu,
  Zap,
} from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import { TopologyGraph } from '../components/TopologyGraph';
import { ServerDetailsPanel } from '../components/ServerDetailsPanel';
import { UtilizationChart } from '../components/UtilizationChart';
import { RequestDistribution } from '../components/RequestDistribution';
import { EventFeed } from '../components/EventFeed';
import { apiService } from '../services/api';
import { ServerNode } from '../types/server.types';
import {
  mockKpi,
  mockRequestDistribution,
  mockTimeSeries,
  mockEvents,
  buildMockTopology,
  LiveEvent,
} from '../data/mockData';

/* ─── Page ──────────────────────────────────────────────────────────────────── */

export const DashboardPage: React.FC = () => {
  /* ── Backend topology state (replaces mock when API is available) ── */
  const [liveServers, setLiveServers] = useState<ServerNode[]>([]);
  const [topologyLoading, setTopologyLoading] = useState(true);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [events, setEvents] = useState<LiveEvent[]>(mockEvents);

  /* ── Mock fallback topology ── */
  const mockServers = useMemo(() => buildMockTopology(), []);

  /* ── Merge: use live if available, else mock ── */
  const servers = liveServers.length > 0 ? liveServers : mockServers;

  /* ── Fetch live topology ── */
  const fetchTopology = useCallback(async () => {
    try {
      setTopologyLoading(true);
      const res = await apiService.getTopology();
      if (res.success && res.data?.servers?.length) {
        setLiveServers(res.data.servers);
      }
    } catch {
      // Silently fall back to mock data
    } finally {
      setTopologyLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTopology();
  }, [fetchTopology]);

  /* ── Simulate a new event every 5 seconds ── */
  useEffect(() => {
    const msgs = [
      { type: 'request' as const, message: 'Request routed to S1 via Round Robin', serverId: 'S1' },
      { type: 'request' as const, message: 'Request routed to S2 via Round Robin', serverId: 'S2' },
      { type: 'request' as const, message: 'Request routed to S3 via Round Robin', serverId: 'S3' },
      { type: 'info' as const, message: 'Health check passed — all nodes nominal' },
    ];
    let idx = 0;
    const interval = setInterval(() => {
      const m = msgs[idx % msgs.length];
      setEvents((prev) => [
        { id: `sim-${Date.now()}`, ...m, timestamp: new Date().toISOString() },
        ...prev.slice(0, 49),
      ]);
      idx++;
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  /* ── Selected server node ── */
  const selectedServer = useMemo(() => {
    if (!selectedServerId) return null;
    const walk = (nodes: ServerNode[]): ServerNode | null => {
      for (const n of nodes) {
        if (n.id === selectedServerId) return n;
        const found = walk(n.children);
        if (found) return found;
      }
      return null;
    };
    return walk(servers);
  }, [selectedServerId, servers]);

  return (
    <div className="flex flex-col gap-5 p-5 h-full overflow-y-auto">
      {/* KPI row */}
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
          value={mockKpi.totalRequests}
          icon={Activity}
          accentColor="text-blue-400"
          description="Since last restart"
        />
        <MetricCard
          title="Active Servers"
          value={mockKpi.activeServers}
          icon={Server}
          accentColor="text-emerald-400"
          description="Root pool: S1, S2, S3"
        />
        <MetricCard
          title="Avg Response"
          value={mockKpi.avgResponseTimeMs}
          unit="ms"
          icon={Clock}
          accentColor="text-indigo-400"
          description="Cross-cluster average"
        />
        <MetricCard
          title="System Load"
          value={mockKpi.systemLoadPercent}
          unit="%"
          icon={Cpu}
          accentColor="text-amber-400"
          description="Weighted cluster load"
        />
        <MetricCard
          title="Scaling Events"
          value={mockKpi.scalingEvents}
          icon={Zap}
          accentColor="text-violet-400"
          description="Phase 3 logic pending"
        />
      </motion.div>

      {/* Topology + Details */}
      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <TopologyGraph
            servers={servers}
            selectedServerId={selectedServerId}
            onSelectServer={setSelectedServerId}
            loading={topologyLoading}
            onRefresh={fetchTopology}
          />
        </div>

        {selectedServer && (
          <ServerDetailsPanel
            server={selectedServer}
            onClose={() => setSelectedServerId(null)}
          />
        )}
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <UtilizationChart data={mockTimeSeries} />
        </div>
        <RequestDistribution data={mockRequestDistribution} />
      </div>

      {/* Event feed */}
      <EventFeed events={events} />
    </div>
  );
};
