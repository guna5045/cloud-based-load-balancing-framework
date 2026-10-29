/**
 * TopologyNode.tsx
 *
 * Professional custom React Flow node components for Cloud-Based Load Balancing Framework.
 * LBFlowNode     — authoritative Load Balancer ingress gateway
 * ServerFlowNode — individual cluster server instance (supporting Active Leaf & Scaled Parent roles)
 */

import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { motion, AnimatePresence } from 'framer-motion';
import { ServerNode, ServerStatus } from '../types/server.types';
import { Activity } from 'lucide-react';

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface TopologyNodeData extends Record<string, unknown> {
  server: ServerNode;
  isSelected: boolean;
  isOnActivePath: boolean;
  isScaling: boolean;
  scalingStep: string;
  onSelect: (id: string) => void;
}

export interface LBNodeData extends Record<string, unknown> {
  isOnActivePath: boolean;
}

// ─── Color helpers ────────────────────────────────────────────────────────────

function loadColor(load: number): string {
  if (load >= 80) return '#ef4444';
  if (load >= 70) return '#f59e0b';
  return '#10b981';
}

const STATUS_BORDER: Record<ServerStatus, string> = {
  healthy:    'border-emerald-500/70',
  warning:    'border-amber-500/80',
  overloaded: 'border-rose-500/90',
  offline:    'border-slate-700/60',
  scaling:    'border-blue-500/90',
  scaled:     'border-indigo-500/80 border-dashed',
};

const STATUS_LABEL: Record<ServerStatus, string> = {
  healthy:    'Healthy',
  warning:    'High Load',
  overloaded: 'Overloaded',
  offline:    'Offline',
  scaling:    'Scaling…',
  scaled:     'Scaled Parent',
};

const STATUS_LABEL_COLOR: Record<ServerStatus, string> = {
  healthy:    'text-emerald-400',
  warning:    'text-amber-400',
  overloaded: 'text-rose-400',
  offline:    'text-slate-500',
  scaling:    'text-blue-400',
  scaled:     'text-indigo-300',
};

// ─── Hover Tooltip ────────────────────────────────────────────────────────────

const NodeTooltip: React.FC<{ server: ServerNode }> = ({ server }) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 6 }}
    transition={{ duration: 0.15 }}
    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none"
  >
    <div className="bg-slate-900/95 border border-slate-700 rounded-lg px-3 py-2 shadow-2xl text-xs min-w-[160px] backdrop-blur-md">
      <div className="flex items-center justify-between pb-1 border-b border-slate-800 mb-1.5">
        <span className="font-mono font-bold text-slate-100">{server.id}</span>
        {server.port && <span className="font-mono text-emerald-400 text-[10px]">:{server.port}</span>}
      </div>
      <div className="space-y-1 text-slate-400 text-[11px]">
        <div className="flex justify-between gap-4">
          <span>Load</span>
          <span className="font-mono font-semibold" style={{ color: loadColor(server.load) }}>
            {server.load}%
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Status</span>
          <span className={`font-semibold ${STATUS_LABEL_COLOR[server.status]}`}>
            {STATUS_LABEL[server.status]}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Connections</span>
          <span className="font-mono text-slate-200">
            {server.metrics?.activeConnections ?? 0}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Processed</span>
          <span className="font-mono text-slate-200">
            {server.metrics?.totalRequestsHandled ?? server.requestCount ?? 0}
          </span>
        </div>
        {server.children && server.children.length > 0 && (
          <div className="flex justify-between gap-4 pt-1 border-t border-slate-800 text-indigo-300">
            <span>Children</span>
            <span className="font-mono font-bold">{server.children.length}</span>
          </div>
        )}
      </div>
      {/* Tooltip arrow */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0
        border-l-[5px] border-l-transparent
        border-r-[5px] border-r-transparent
        border-t-[5px] border-t-slate-700" />
    </div>
  </motion.div>
);

// ─── Load Balancer root node ──────────────────────────────────────────────────

export const LBFlowNode = memo(({ data, selected }: NodeProps) => {
  const lbData = data as LBNodeData;
  const isOnActivePath = lbData?.isOnActivePath;

  return (
    <div className="relative">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 20 }}
        className={`relative flex flex-col items-center justify-center w-[176px] h-[78px]
          rounded-xl border select-none transition-all duration-300
          bg-gradient-to-br from-slate-900 via-blue-950/80 to-slate-900
          ${selected || isOnActivePath
            ? 'border-sky-400 shadow-[0_0_24px_rgba(56,189,248,0.5),0_0_0_1px_#38bdf8]'
            : 'border-blue-600/70 shadow-[0_4px_20px_-4px_rgba(37,99,235,0.35)]'
          }`}
      >
        {/* Pulsating active ingress indicator ring */}
        {isOnActivePath && (
          <motion.span
            className="absolute -inset-1 rounded-2xl border-2 border-sky-400/80 pointer-events-none"
            animate={{ scale: [1, 1.06, 1], opacity: [0.8, 0.2, 0.8] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* Top Tag */}
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-sky-300">
            LOAD BALANCER
          </span>
        </div>

        {/* Algorithm Subtitle */}
        <span className="text-[11px] font-semibold text-slate-100 font-mono mt-0.5">
          Round Robin
        </span>

        {/* Port & Routing Status */}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[9px] font-mono text-emerald-400 font-bold">:5000</span>
          <span className="text-[9px] font-mono text-slate-400">·</span>
          <span className="text-[9px] font-mono text-slate-300">
            {isOnActivePath ? 'Routing Traffic…' : 'Active Gateway'}
          </span>
        </div>

        {/* Outgoing Traffic Handle */}
        <Handle
          id="source"
          type="source"
          position={Position.Bottom}
          className="!bg-sky-400 !border-blue-900 !w-2.5 !h-2.5 shadow-[0_0_8px_#38bdf8]"
        />
      </motion.div>
    </div>
  );
});
LBFlowNode.displayName = 'LBFlowNode';

// ─── Server instance node ─────────────────────────────────────────────────────

export const ServerFlowNode = memo(({ data }: NodeProps) => {
  const nodeData = data as TopologyNodeData;
  const { server, isSelected, isOnActivePath, isScaling, scalingStep, onSelect } = nodeData;
  const [hovered, setHovered] = useState(false);

  const lc = loadColor(server.load);
  const isScaledParent = (server.children && server.children.length > 0) || server.status === 'scaled';
  const depth = server.id.split('.').length - 1;

  const nodeW = 160;
  const nodeH = isScaledParent ? 98 : 90;

  const borderClass =
    isScaling
      ? STATUS_BORDER.scaling
      : STATUS_BORDER[server.status] ?? STATUS_BORDER.healthy;

  // Luminous border and glow styles
  const glowStyle: React.CSSProperties =
    server.status === 'overloaded'
      ? { boxShadow: '0 0 24px -2px rgba(239,68,68,0.7)' }
      : server.status === 'warning'
      ? { boxShadow: '0 0 16px -4px rgba(245,158,11,0.5)' }
      : server.status === 'scaling'
      ? { boxShadow: '0 0 18px -2px rgba(59,130,246,0.6)' }
      : isOnActivePath
      ? { boxShadow: '0 0 20px -2px rgba(56,189,248,0.6)' }
      : {};

  const selectedStyle: React.CSSProperties = isSelected
    ? { boxShadow: '0 0 0 2px #38bdf8, 0 4px 20px -2px rgba(56,189,248,0.4)' }
    : {};

  const bgClass = isScaledParent
    ? 'bg-slate-950/95'
    : server.status === 'offline'
    ? 'bg-slate-950/90'
    : 'bg-slate-900/95';

  return (
    <>
      {/* Target input handle (top) */}
      <Handle
        id="target"
        type="target"
        position={Position.Top}
        className="!bg-slate-400 !border-slate-800 !w-2.5 !h-2.5"
      />

      <div
        className="relative"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Tooltip */}
        <AnimatePresence>
          {hovered && !isSelected && <NodeTooltip server={server} />}
        </AnimatePresence>

        {/* Scaling / Overload Pulse Ring */}
        {(isScaling || server.status === 'overloaded') && (
          <motion.span
            className={`absolute -inset-1 rounded-2xl border-2 pointer-events-none ${
              scalingStep === 'spawning' ? 'border-sky-400/70' : 'border-rose-500/70'
            }`}
            animate={{ scale: [1, 1.08, 1], opacity: [0.8, 0.1, 0.8] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
          />
        )}

        {/* Active Traffic Hit Glow */}
        {isOnActivePath && !isSelected && (
          <motion.span
            className="absolute -inset-1 rounded-2xl border-2 border-sky-400/80 pointer-events-none"
            animate={{ opacity: [0.9, 0.3, 0.9] }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        <motion.div
          initial={false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: 'spring',
            stiffness: 280,
            damping: 22,
          }}
          whileHover={{ scale: 1.02 }}
          onClick={() => onSelect(server.id)}
          style={{
            width: nodeW,
            height: nodeH,
            ...glowStyle,
            ...selectedStyle,
          }}
          className={`relative flex flex-col justify-between rounded-xl border
            ${bgClass} cursor-pointer select-none overflow-hidden
            transition-all duration-200
            ${borderClass}`}
        >
          {/* Top colored status stripe */}
          <div
            className="h-1 w-full"
            style={{
              backgroundColor: isScaledParent ? '#6366f1' : lc,
              opacity: isScaledParent ? 0.8 : 1,
            }}
          />

          {/* Header Row: ID + Port + Status Dot */}
          <div className="flex items-center justify-between px-3 pt-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className={`font-mono font-bold tracking-tight truncate ${
                  depth === 0 ? 'text-[13px] text-slate-100' : 'text-xs text-slate-200'
                }`}
              >
                {server.id}
              </span>
              {server.port && (
                <span className="text-[9px] font-mono text-emerald-400/90 font-medium">
                  :{server.port}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Role badge */}
              {isScaledParent ? (
                <span className="text-[8px] font-bold uppercase tracking-wider text-indigo-400 font-mono">
                  Parent
                </span>
              ) : (
                <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Leaf
                </span>
              )}
              {/* Status beacon dot */}
              <motion.span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: isScaledParent ? '#818cf8' : lc }}
                animate={
                  server.status === 'overloaded' || server.status === 'warning'
                    ? { scale: [1, 1.3, 1] }
                    : {}
                }
                transition={{ duration: 1, repeat: Infinity }}
              />
            </div>
          </div>

          {/* Load Progress Bar */}
          <div className="px-3 py-1">
            <div className="h-1.5 w-full rounded-full bg-slate-800/90 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: lc }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(server.load, 3)}%` }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Telemetry Row: Load % + Connection Count */}
          <div className="px-3 pb-2 flex items-center justify-between text-xs">
            <div className="flex items-baseline gap-1 font-mono">
              <span className="font-bold text-slate-100 text-[12px]">{server.load}%</span>
              <span className="text-[9px] text-slate-500">load</span>
            </div>

            <div className="text-right font-mono text-[10px] text-slate-400">
              {server.metrics?.activeConnections ?? 0} <span className="text-slate-500">conn</span>
            </div>
          </div>

          {/* Bottom Role Banner */}
          {isScaledParent ? (
            <div className="px-3 py-1 bg-indigo-950/60 border-t border-indigo-900/50 flex items-center justify-between text-[9px] font-mono text-indigo-300">
              <span className="font-semibold">⊞ {server.children?.length ?? 3} Children</span>
              <span className="text-indigo-400/80 uppercase font-bold tracking-wider">Not Routable</span>
            </div>
          ) : (
            <div className="px-3 py-0.5 bg-slate-950/40 border-t border-slate-800/60 flex items-center justify-between text-[9px] font-mono">
              <span className={`font-semibold ${STATUS_LABEL_COLOR[server.status]}`}>
                {STATUS_LABEL[server.status]}
              </span>
              {isOnActivePath && (
                <span className="text-sky-400 font-bold flex items-center gap-1">
                  <Activity className="w-2.5 h-2.5 animate-pulse" />
                  ROUTED
                </span>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Source handle (bottom) for parent-child connections */}
      <Handle
        id="source"
        type="source"
        position={Position.Bottom}
        className="!bg-slate-400 !border-slate-800 !w-2.5 !h-2.5"
      />
    </>
  );
});
ServerFlowNode.displayName = 'ServerFlowNode';
