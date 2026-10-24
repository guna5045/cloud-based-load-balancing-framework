/**
 * ServersPage.tsx  (Phase 3 — uses simulation context)
 */

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { StatusBadge } from '../components/StatusBadge';
import { ServerDetailsPanel } from '../components/ServerDetailsPanel';
import { useSimulation } from '../context/SimulationContext';
import { getHierarchyPath } from '../data/topologySimulation';
import { Server } from 'lucide-react';
import { ServerNode } from '../types/server.types';

export const ServersPage: React.FC = () => {
  const sim = useSimulation();
  const [localSelected, setLocalSelected] = useState<string | null>(null);

  // Flatten all nodes for the grid
  const flat = useMemo(() => {
    const out: ServerNode[] = [];
    const walk = (nodes: ServerNode[]) => {
      for (const n of nodes) { out.push(n); walk(n.children); }
    };
    walk(sim.servers);
    return out;
  }, [sim.servers]);

  const selectedServer = flat.find((s) => s.id === localSelected) ?? null;

  const hierarchyPath = useMemo(() => {
    if (!localSelected) return [];
    return getHierarchyPath(sim.servers, localSelected);
  }, [localSelected, sim.servers]);

  return (
    <div className="flex flex-col gap-5 p-5 h-full overflow-y-auto">
      <div className="flex items-center gap-2">
        <Server className="w-5 h-5 text-blue-400" />
        <h2 className="text-base font-bold text-slate-100">Server Instances</h2>
        <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 border border-slate-700 text-slate-400 font-mono">
          {flat.length} total
        </span>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {flat.map((s, i) => (
              <motion.button
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setLocalSelected(s.id === localSelected ? null : s.id)}
                className={`card p-4 text-left space-y-3 transition-shadow ${
                  s.id === localSelected ? 'ring-1 ring-blue-400 shadow-node-selected' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-slate-100">{s.id}</span>
                    <span className="ml-2 text-[10px] text-slate-500 font-mono">
                      {s.parentId ? `↑ ${s.parentId}` : 'root'}
                    </span>
                  </div>
                  <StatusBadge status={s.status} pulse />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Load</span>
                    <span className="font-mono text-slate-300">{s.load}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${s.load}%`,
                        backgroundColor: s.load >= 80 ? '#ef4444' : s.load >= 70 ? '#f59e0b' : '#22c55e',
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <p className="text-slate-600">CPU</p>
                    <p className="text-slate-300 font-mono">{s.metrics?.cpuUsagePercent ?? '—'}%</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Memory</p>
                    <p className="text-slate-300 font-mono">{s.metrics?.memoryUsagePercent ?? '—'}%</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Latency</p>
                    <p className="text-slate-300 font-mono">{s.metrics?.responseTimeMs ?? '—'} ms</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Children</p>
                    <p className="text-slate-300 font-mono">{s.children.length}</p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {selectedServer && (
          <ServerDetailsPanel
            server={selectedServer}
            onClose={() => setLocalSelected(null)}
            hierarchyPath={hierarchyPath}
            onTriggerScaling={sim.triggerScaling}
            canScale={sim.canScale(localSelected!)}
            scalingInProgress={sim.scaling.step !== 'idle'}
          />
        )}
      </div>
    </div>
  );
};
