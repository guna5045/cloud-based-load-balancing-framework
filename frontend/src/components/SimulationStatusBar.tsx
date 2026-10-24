/**
 * SimulationStatusBar.tsx
 *
 * Phase 3: Bottom status strip showing live simulation metrics.
 */

import React from 'react';
import { SimulationMetrics } from '../data/topologySimulation';
import { Activity, Server, Layers, Zap, GitBranch } from 'lucide-react';

interface SimulationStatusBarProps {
  metrics: SimulationMetrics;
}

interface Stat {
  icon: React.FC<{ className?: string }>;
  label: string;
  value: string | number;
  color?: string;
}

export const SimulationStatusBar: React.FC<SimulationStatusBarProps> = ({ metrics }) => {
  const stats: Stat[] = [
    {
      icon: Activity,
      label: 'Traffic',
      value: metrics.isRunning ? 'Running' : 'Paused',
      color: metrics.isRunning ? 'text-emerald-400' : 'text-slate-500',
    },
    {
      icon: Zap,
      label: 'Requests',
      value: metrics.totalRequests.toLocaleString(),
      color: 'text-blue-400',
    },
    {
      icon: Server,
      label: 'Active Nodes',
      value: metrics.activeNodes,
      color: 'text-slate-300',
    },
    {
      icon: Layers,
      label: 'Max Depth',
      value: metrics.maxDepth,
      color: 'text-indigo-400',
    },
    {
      icon: GitBranch,
      label: 'Scaling Events',
      value: metrics.scalingEvents,
      color: 'text-violet-400',
    },
  ];

  return (
    <div className="flex items-center gap-0 border border-slate-800/80 rounded-xl bg-slate-900/60 overflow-hidden divide-x divide-slate-800/60">
      {stats.map(({ icon: Icon, label, value, color }) => (
        <div key={label} className="flex items-center gap-2 px-4 py-2 flex-1 min-w-0">
          <Icon className={`w-3.5 h-3.5 shrink-0 ${color ?? 'text-slate-400'}`} />
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-600">
              {label}
            </p>
            <p className={`text-xs font-semibold tabular-nums font-mono ${color ?? 'text-slate-300'}`}>
              {value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
