import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ServerNode,
  ServerMetrics,
} from '../types/server.types';
import { StatusBadge } from './StatusBadge';
import {
  X,
  Cpu,
  HardDrive,
  Activity,
  Zap,
  GitBranch,
  Clock,
  Users,
} from 'lucide-react';

interface ServerDetailsPanelProps {
  server: ServerNode | null;
  onClose: () => void;
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
      <span className="text-xs font-semibold text-slate-200 tabular-nums">{value}</span>
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
  if (val >= 60) return '#f59e0b';
  return '#22c55e';
}

export const ServerDetailsPanel: React.FC<ServerDetailsPanelProps> = ({ server, onClose }) => {
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
          className="card flex flex-col overflow-hidden"
          style={{ minWidth: 260, maxWidth: 280 }}
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

            {/* Hierarchy */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Hierarchy
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
                Traffic
              </p>
              <StatRow
                icon={<Users className="w-3.5 h-3.5" />}
                label="Active Connections"
                value={(m?.activeConnections ?? 0).toLocaleString()}
              />
              <StatRow
                icon={<Zap className="w-3.5 h-3.5" />}
                label="Total Requests"
                value={(m?.totalRequestsHandled ?? 0).toLocaleString()}
              />
              <StatRow
                icon={<Activity className="w-3.5 h-3.5" />}
                label="Capacity"
                value={`${server.capacity} req/s`}
              />
            </div>

            {/* Timestamps */}
            <div className="pt-1 border-t border-slate-800">
              <p className="text-[10px] text-slate-600 mt-2">
                Created {new Date(server.createdAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
