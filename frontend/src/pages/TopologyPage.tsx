import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TopologyGraph } from '../components/TopologyGraph';
import { ServerDetailsPanel } from '../components/ServerDetailsPanel';
import { StatusBadge } from '../components/StatusBadge';
import { apiService } from '../services/api';
import { ServerNode } from '../types/server.types';
import { buildMockTopology } from '../data/mockData';
import { GitBranch, Info } from 'lucide-react';

export const TopologyPage: React.FC = () => {
  const [liveServers, setLiveServers] = useState<ServerNode[]>([]);
  const [topologyLoading, setTopologyLoading] = useState(true);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const mockServers = useMemo(() => buildMockTopology(), []);
  const servers = liveServers.length > 0 ? liveServers : mockServers;

  const fetchTopology = useCallback(async () => {
    try {
      setTopologyLoading(true);
      const res = await apiService.getTopology();
      if (res.success && res.data?.servers?.length) {
        setLiveServers(res.data.servers);
      }
    } catch {
      // Use mock
    } finally {
      setTopologyLoading(false);
    }
  }, []);

  useEffect(() => { fetchTopology(); }, [fetchTopology]);

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

  // Flatten for summary list
  const allServers = useMemo(() => {
    const out: ServerNode[] = [];
    const walk = (nodes: ServerNode[]) => {
      for (const n of nodes) { out.push(n); walk(n.children); }
    };
    walk(servers);
    return out;
  }, [servers]);

  return (
    <div className="flex flex-col gap-5 p-5 h-full overflow-y-auto">
      {/* Info banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3 p-4 rounded-xl bg-blue-950/40 border border-blue-800/40"
      >
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-blue-300">Recursive Tree Architecture</p>
          <p className="text-xs text-slate-400 mt-0.5">
            This topology represents a recursive N-ary tree. Any node can dynamically expand
            into 3 child servers when load exceeds the threshold. Expansion logic is implemented in Phase 3.
          </p>
        </div>
      </motion.div>

      {/* Large topology + details */}
      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <div className="card flex flex-col" style={{ height: 600 }}>
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-800/80 shrink-0">
              <GitBranch className="w-4 h-4 text-blue-400" />
              <span className="font-semibold text-sm text-slate-200">Full Topology View</span>
            </div>
            <div className="flex-1">
              <TopologyGraph
                servers={servers}
                selectedServerId={selectedServerId}
                onSelectServer={setSelectedServerId}
                loading={topologyLoading}
                onRefresh={fetchTopology}
              />
            </div>
          </div>
        </div>
        {selectedServer && (
          <ServerDetailsPanel server={selectedServer} onClose={() => setSelectedServerId(null)} />
        )}
      </div>

      {/* Server summary grid */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">All Nodes</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {allServers.map((s) => (
            <motion.button
              key={s.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedServerId(s.id === selectedServerId ? null : s.id)}
              className={`card p-3 text-left space-y-2 transition-shadow ${
                s.id === selectedServerId ? 'ring-1 ring-blue-400 shadow-node-selected' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-200">{s.id}</span>
                <StatusBadge status={s.status} showLabel={false} pulse />
              </div>
              <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${s.load}%`,
                    backgroundColor: s.load >= 80 ? '#ef4444' : s.load >= 60 ? '#f59e0b' : '#22c55e',
                  }}
                />
              </div>
              <p className="text-[10px] text-slate-500">{s.load}% load</p>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};
