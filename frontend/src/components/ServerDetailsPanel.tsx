/**
 * ServerDetailsPanel.tsx  (Phase 3 — updated)
 *
 * Slide-in server inspector panel.
 * Adds: hierarchy path breadcrumb, "Simulate Overload / Trigger Scaling" button.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ServerNode, ServerMetrics } from '../types/server.types';
import { StatusBadge } from './StatusBadge';
import {
  X, Cpu, HardDrive, Activity, Zap, GitBranch, Clock, Users, ChevronRight,
} from 'lucide-react';

interface ServerDetailsPanelProps {
  server: ServerNode | null;
  onClose: () => void;
  /** Full hierarchy path from root, e.g. ['S1', 'S1.2', 'S1.2.1'] */
  hierarchyPath?: string[];
  /** Callback for the "Simulate Overload" button */
  onTriggerScaling?: (serverId: string) => void;
  /** Whether the selected server can currently be scaled */
  canScale?: boolean;
  /** Whether a scaling sequence is in progress */
  scalingInProgress?: boolean;
}

const StatRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  bar?: number;
  barColor?: string;
}> = ({ icon, label, value, bar, barColor = '#3b82f6' }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-slate-400">
        <span className="text-slate-500">{icon}</span>
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-xs font-semibold text-slate-200 tabular-nums font-mono">{value}</span>
    </div>
    {bar !== undefined && (
      <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: barColor }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(bar, 100)}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    )}
  </div>
);

function loadBarColor(val: number): string {
  if (val >= 80) return '#ef4444';
  if (val >= 70) return '#f59e0b';
  return '#22c55e';
}

export const ServerDetailsPanel: React.FC<ServerDetailsPanelProps> = ({
  server,
  onClose,
  hierarchyPath = [],
  onTriggerScaling,
  canScale = false,
  scalingInProgress = false,
}) => {
  const m: ServerMetrics | undefined = server?.metrics;

  return (
    <AnimatePresence>
      {server && (
        <motion.aside
          key={server.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="card flex flex-col overflow-hidden shrink-0"
          style={{ width: 272 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 shrink-0">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-blue-400" />
              <span className="font-mono font-bold text-slate-100">{server.id}</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">

            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Status</span>
              <StatusBadge status={server.status} pulse />
            </div>

            {/* Hierarchy path breadcrumb */}
            {hierarchyPath.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
                  Hierarchy Path
                </p>
                <div className="flex flex-wrap items-center gap-0.5">
                  <span className="text-[10px] font-mono text-blue-400">LB</span>
                  {hierarchyPath.map((id) => (
                    <React.Fragment key={id}>
                      <ChevronRight className="w-3 h-3 text-slate-700 shrink-0" />
                      <span
                        className={`text-[10px] font-mono ${
                          id === server.id ? 'text-slate-100 font-bold' : 'text-slate-400'
                        }`}
                      >
                        {id}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* Hierarchy */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Connections
              </p>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Parent</span>
                  <span className="font-mono text-slate-300">
                    {server.parentId ?? 'Load Balancer'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Children</span>
                  <span className="font-mono text-slate-300">{server.children.length}</span>
                </div>
                {server.children.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {server.children.map((c) => (
                      <span
                        key={c.id}
                        className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-slate-300"
                      >
                        {c.id}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Performance */}
            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Performance
              </p>
              <StatRow
                icon={<Activity className="w-3.5 h-3.5" />}
                label="Current Load"
                value={`${server.load}%`}
                bar={server.load}
                barColor={loadBarColor(server.load)}
              />
              <StatRow
                icon={<Cpu className="w-3.5 h-3.5" />}
                label="CPU Usage"
                value={`${m?.cpuUsagePercent ?? '—'}%`}
                bar={m?.cpuUsagePercent}
                barColor={loadBarColor(m?.cpuUsagePercent ?? 0)}
              />
              <StatRow
                icon={<HardDrive className="w-3.5 h-3.5" />}
                label="Memory"
                value={`${m?.memoryUsagePercent ?? '—'}%`}
                bar={m?.memoryUsagePercent}
                barColor="#6366f1"
              />
              <StatRow
                icon={<Clock className="w-3.5 h-3.5" />}
                label="Latency"
                value={`${m?.responseTimeMs ?? '—'} ms`}
              />
            </div>

            {/* Traffic */}
            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Traffic & Routing
              </p>
              <StatRow
                icon={<Zap className="w-3.5 h-3.5" />}
                label="Requests Routed"
                value={(server.requestCount ?? m?.totalRequestsHandled ?? 0).toLocaleString()}
              />
              <StatRow
                icon={<Activity className="w-3.5 h-3.5" />}
                label="Throughput (RPS)"
                value={`${server.requestsPerSecond ?? m?.requestsPerSecond ?? 0} req/s`}
              />
              <StatRow
                icon={<Clock className="w-3.5 h-3.5" />}
                label="Last Request"
                value={server.lastRequestAt ? new Date(server.lastRequestAt).toLocaleTimeString() : 'None yet'}
              />
              <StatRow
                icon={<Users className="w-3.5 h-3.5" />}
                label="Connections"
                value={(m?.activeConnections ?? 0).toLocaleString()}
              />
              <StatRow
                icon={<Activity className="w-3.5 h-3.5" />}
                label="Capacity"
                value={`${server.capacity} req/s`}
              />
            </div>

            {/* Simulate Scaling button */}
            {onTriggerScaling && (
              <div className="pt-1 border-t border-slate-800/80 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  Simulation
                </p>
                {server.children.length > 0 ? (
                  <p className="text-[10px] text-slate-600 italic">
                    Already scaled — has {server.children.length} child{server.children.length !== 1 ? 'ren' : ''}
                  </p>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => canScale && onTriggerScaling(server.id)}
                    disabled={!canScale || scalingInProgress}
                    className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      canScale && !scalingInProgress
                        ? 'bg-violet-600/20 text-violet-300 border border-violet-600/30 hover:bg-violet-600/30'
                        : 'bg-slate-800/50 text-slate-600 border border-slate-800 cursor-not-allowed'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    {scalingInProgress ? 'Scaling in progress…' : 'Simulate Overload → Scale'}
                  </motion.button>
                )}
                <p className="text-[9px] text-slate-700 leading-relaxed">
                  [SIM] Sets load ≥80%, triggers scaling sequence, spawns {server.id}.1/.2/.3
                </p>
              </div>
            )}

            {/* Timestamp */}
            <div className="pt-1 border-t border-slate-800">
              <p className="text-[10px] text-slate-700 mt-1">
                Created {new Date(server.createdAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
