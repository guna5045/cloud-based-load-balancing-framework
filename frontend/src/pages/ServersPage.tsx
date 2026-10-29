/**
 * ServersPage.tsx  (R1 — improved server list + Add Server UI)
 *
 * R1 Changes:
 * - Professional page header with Add Server button (frontend-only, opens modal)
 * - "Add Server" modal shows form fields but is clearly labeled "Not Yet Available"
 * - Improved server cards: bigger, clearer, root/child/scaled-parent distinction
 * - Animated load bar uses motion.div
 */

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StatusBadge } from '../components/StatusBadge';
import { ServerDetailsPanel } from '../components/ServerDetailsPanel';
import { useSimulation } from '../context/SimulationContext';
import { getHierarchyPath } from '../data/topologySimulation';
import { Server, Plus, X, Info } from 'lucide-react';
import { ServerNode } from '../types/server.types';

// ─── Add Server Modal (frontend only, non-functional) ─────────────────────────

const AddServerModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
  >
    <motion.div
      initial={{ scale: 0.92, opacity: 0, y: 16 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.95, opacity: 0, y: 8 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <Plus className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-slate-200">Add Server Instance</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Notice */}
      <div className="mx-5 mt-4 flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-amber-500/10 border border-amber-500/25">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-300/90">
          Dynamic server registration is not available in this build.
          Servers are statically registered at startup (S1:3001, S2:3002, S3:3003)
          and can scale recursively via the Auto Scaling engine.
        </p>
      </div>

      {/* Form (disabled/preview) */}
      <div className="p-5 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">Server ID</label>
          <input
            disabled
            placeholder="e.g. S4"
            className="w-full px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-500 text-sm font-mono placeholder:text-slate-600 cursor-not-allowed"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">Port</label>
          <input
            disabled
            placeholder="e.g. 3004"
            className="w-full px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-500 text-sm font-mono placeholder:text-slate-600 cursor-not-allowed"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">Capacity</label>
          <input
            disabled
            placeholder="e.g. 100"
            className="w-full px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-500 text-sm font-mono placeholder:text-slate-600 cursor-not-allowed"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">Parent Server (optional)</label>
          <input
            disabled
            placeholder="Leave blank for root"
            className="w-full px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-500 text-sm font-mono placeholder:text-slate-600 cursor-not-allowed"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 px-5 pb-5">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-sm transition-colors"
        >
          Cancel
        </button>
        <button
          disabled
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600/40 text-blue-300/50 text-sm font-medium cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Server
        </button>
      </div>
    </motion.div>
  </motion.div>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadColor(load: number): string {
  if (load >= 80) return '#ef4444';
  if (load >= 70) return '#f59e0b';
  return '#22c55e';
}

function serverRole(s: ServerNode): string {
  if (s.children.length > 0 || s.status === 'scaled') return 'scaled group';
  if (s.parentId) return `child of ${s.parentId}`;
  return 'root';
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const ServersPage: React.FC = () => {
  const sim = useSimulation();
  const [localSelected, setLocalSelected] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

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
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Server className="w-5 h-5 text-blue-400" />
          <h2 className="text-base font-bold text-slate-100">Server Instances</h2>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 border border-slate-700 text-slate-400 font-mono">
            {flat.length} total
          </span>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-300 text-xs font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5 text-blue-400" />
          Add Server
        </motion.button>
      </div>

      {/* Server grid + detail panel */}
      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {flat.map((s, i) => {
              const lc = loadColor(s.load);
              const isScaledParent = s.children.length > 0 || s.status === 'scaled';
              return (
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
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-slate-100 text-sm">{s.id}</span>
                        {s.port && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 font-bold">
                            :{s.port}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                        {serverRole(s)}
                      </span>
                    </div>
                    <StatusBadge status={s.status} pulse />
                  </div>

                  {/* Load bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Load</span>
                      <span className="font-mono" style={{ color: lc }}>{s.load}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: lc }}
                        initial={{ width: 0 }}
                        animate={{ width: `${s.load}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                    </div>
                  </div>

                  {/* Metrics grid */}
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
                      <p className="text-slate-600">
                        {isScaledParent ? 'Children' : 'Connections'}
                      </p>
                      <p className="text-slate-300 font-mono">
                        {isScaledParent ? s.children.length : (s.metrics?.activeConnections ?? 0)}
                      </p>
                    </div>
                  </div>

                  {/* Scaled parent badge */}
                  {isScaledParent && (
                    <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800/60">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-400/70">
                        ⊞ scaled group · not routable
                      </span>
                    </div>
                  )}
                </motion.button>
              );
            })}
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

      {/* Add Server Modal */}
      <AnimatePresence>
        {showAddModal && <AddServerModal onClose={() => setShowAddModal(false)} />}
      </AnimatePresence>
    </div>
  );
};
