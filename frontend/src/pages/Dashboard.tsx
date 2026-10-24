import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '../components/Header';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { TopologyPreview } from '../components/TopologyPreview';
import { apiService } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import { HealthResponse, ServerNode } from '../types/server.types';
import { AlertCircle, Layers, CheckCircle } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(true);
  const [healthError, setHealthError] = useState<string | null>(null);

  const [servers, setServers] = useState<ServerNode[]>([]);
  const [totalServers, setTotalServers] = useState<number>(0);
  const [maxDepth, setMaxDepth] = useState<number>(1);
  const [averageLoad, setAverageLoad] = useState<number>(0);
  const [topologyLoading, setTopologyLoading] = useState<boolean>(true);
  const [topologyError, setTopologyError] = useState<string | null>(null);

  const socket = useSocket();

  const fetchHealth = useCallback(async () => {
    try {
      setHealthLoading(true);
      setHealthError(null);
      const data = await apiService.getHealth();
      setHealth(data);
    } catch (err: unknown) {
      setHealthError(err instanceof Error ? err.message : 'Failed to connect to health API');
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const fetchTopology = useCallback(async () => {
    try {
      setTopologyLoading(true);
      setTopologyError(null);
      const res = await apiService.getTopology();
      if (res.success && res.data) {
        setServers(res.data.servers || []);
        setTotalServers(res.data.totalServers || 0);
        setMaxDepth(res.data.maxDepth || 1);
        setAverageLoad(res.data.averageLoad || 0);
      }
    } catch (err: unknown) {
      setTopologyError(err instanceof Error ? err.message : 'Failed to load topology');
    } finally {
      setTopologyLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    fetchTopology();
  }, [fetchHealth, fetchTopology]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Phase 1 Verification Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-blue-800/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 shrink-0 mt-0.5">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-white text-sm">
                Phase 1 Project Foundation Active
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                This foundation verifies full-stack connectivity: Express API health checks, Socket.IO real-time bi-directional pipeline, and recursive tree topology representing initial servers S1, S2, and S3.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-lg shrink-0">
            <CheckCircle className="w-4 h-4" />
            <span>Ready for Phase 2 Implementation</span>
          </div>
        </div>

        {/* Real-time and REST Health Status */}
        <section aria-label="System Connectivity Status">
          <ConnectionStatus
            health={health}
            healthLoading={healthLoading}
            healthError={healthError}
            socket={socket}
            onRefreshHealth={fetchHealth}
          />
        </section>

        {/* Server Topology Tree Model */}
        <section aria-label="Server Topology Hierarchy">
          {topologyError && (
            <div className="p-3 mb-4 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{topologyError}</span>
            </div>
          )}

          <TopologyPreview
            servers={servers}
            totalServers={totalServers}
            maxDepth={maxDepth}
            averageLoad={averageLoad}
            loading={topologyLoading}
            onRefresh={fetchTopology}
          />
        </section>

        {/* Phase Roadmap Note */}
        <footer className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-xs text-slate-400">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <span className="font-semibold text-slate-300">Phase 1 Scope:</span> Core Architecture & Connectivity.
            </div>
            <div className="text-slate-400">
              Next: Round-Robin load routing & recursive 3-child dynamic auto-scaling will be developed in Phase 2.
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};
