import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Zap, GitBranch, AlertTriangle, CheckCircle2, History, RefreshCw } from 'lucide-react';
import { useRealRouting } from '../hooks/useRealRouting';
import { MetricCard } from '../components/MetricCard';
import { ScalingHistoryRecord } from '../types/server.types';
import { env } from '../utils/env';

interface ScaleStep {
  label: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  description: string;
}

const STEPS: ScaleStep[] = [
  {
    label: '1. Real Telemetry Monitoring',
    icon: AlertTriangle,
    color: 'text-amber-400',
    description: 'Continuously monitors in-flight active requests, RPS, latency, and memory via GET /telemetry on all server instances.',
  },
  {
    label: '2. Deterministic Overload Detection',
    icon: Zap,
    color: 'text-rose-400',
    description: 'When sustained load >= 80% is confirmed across 2 consecutive samples, server:overloaded is emitted.',
  },
  {
    label: '3. Atomic 3-Child Process Creation',
    icon: GitBranch,
    color: 'text-blue-400',
    description: 'Spawns exactly 3 independent server processes on dynamic ports (3100-3999), verifies readiness, and attaches to topology.',
  },
  {
    label: '4. Dynamic Leaf Routing Reconfiguration',
    icon: CheckCircle2,
    color: 'text-emerald-400',
    description: 'Parent becomes a logical scaled group; its 3 healthy children enter the active Round Robin leaf pool.',
  },
];

export const AutoScalingPage: React.FC = () => {
  const real = useRealRouting();
  const [scalingHistory, setScalingHistory] = useState<ScalingHistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchScalingHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const res = await fetch(`${env.apiUrl}/api/metrics/scaling/history?limit=20`);
      if (res.ok) {
        const body = await res.json();
        if (body.data) {
          setScalingHistory(body.data);
        }
      }
    } catch {
      // Backend may be offline
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchScalingHistory();
  }, [fetchScalingHistory, real.scalingKPIs.scalingOperations]);

  return (
    <div className="flex flex-col gap-5 p-5 h-full overflow-y-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-5 h-5 text-violet-400" />
            <h2 className="text-base font-bold text-slate-100">Hierarchical Auto-Scaling Engine</h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-violet-500/20 text-violet-300 border border-violet-500/30">
              Recursive 3-Child
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Decentralized recursive 3-child server scaling. Any overloaded leaf node independently spawns child instances.
          </p>
        </div>

        <button
          onClick={fetchScalingHistory}
          disabled={loadingHistory}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
          <span>Refresh Scaling History</span>
        </button>
      </motion.div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MetricCard
          title="Total Servers"
          value={real.scalingKPIs.totalServers}
          icon={GitBranch}
          accentColor="text-blue-400"
          description="In authoritative topology"
        />
        <MetricCard
          title="Active Leaves"
          value={real.scalingKPIs.activeLeafServers}
          icon={CheckCircle2}
          accentColor="text-emerald-400"
          description="Receiving Round Robin traffic"
        />
        <MetricCard
          title="Scaled Parents"
          value={real.scalingKPIs.scaledServers}
          icon={GitBranch}
          accentColor="text-indigo-400"
          description="Logical group nodes"
        />
        <MetricCard
          title="Max Tree Depth"
          value={real.scalingKPIs.maxTopologyDepth}
          icon={Zap}
          accentColor="text-purple-400"
          description="Safety limit: 10 levels"
        />
        <MetricCard
          title="Operations"
          value={real.scalingKPIs.scalingOperations}
          icon={History}
          accentColor="text-amber-400"
          description="Total scaling events"
        />
      </div>

      {/* Workflow steps */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="card p-5 space-y-3"
            >
              <div className={`w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center ${step.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-slate-200">{step.label}</p>
              <p className="text-xs text-slate-400 leading-relaxed">{step.description}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Scaling History & Example Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Authoritative Scaling Event Log */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Scaling Operation History
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {scalingHistory.length} recorded
            </span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {scalingHistory.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-6 text-center">
                No automatic scaling operations triggered yet. All servers currently within nominal load thresholds (&lt;80%).
              </p>
            ) : (
              scalingHistory.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1 font-mono text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-slate-200 font-bold">
                      Parent {rec.parentId} → [{rec.children.join(', ')}]
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                        rec.status === 'success'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {rec.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Trigger Load: {rec.triggerUtilization}%</span>
                    <span>Duration: {rec.durationMs}ms</span>
                    <span>{new Date(rec.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tree Expansion Rules & Safety Limits */}
        <div className="card p-5 space-y-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            Scaling Architecture & Safety Limits
          </p>
          <div className="space-y-2 text-xs text-slate-300">
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-blue-400 font-bold block mb-1">Decentralized Independence:</span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Overload on any server node triggers branching strictly beneath that node. Unrelated branches continue executing independently.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-indigo-400 font-bold block mb-1">Dynamic Port Isolation (3100-3999):</span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Each child process receives an OS socket probe-verified unique port, preventing collisions.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-amber-400 font-bold block mb-1">Safety Boundaries:</span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Max scaling depth: <strong>10 levels</strong>. Max process count: <strong>50 processes</strong>. Single-operation locks prevent runaway concurrency.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
