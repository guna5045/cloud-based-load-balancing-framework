/**
 * TopologyNode.tsx  (Phase 3 — improved)
 *
 * Custom React Flow node components for the Cloud-Based Load Balancing Framework.
 * LBFlowNode  — synthetic Load Balancer root
 * ServerFlowNode — individual server instance with hover tooltip, scaling state
 */

import { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { motion, AnimatePresence } from 'framer-motion';
import { ServerNode, ServerStatus } from '../types/server.types';

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
  return '#22c55e';
}

const STATUS_BORDER: Record<ServerStatus | 'scaling', string> = {
  healthy:    'border-slate-700/70',
  warning:    'border-amber-500/70',
  overloaded: 'border-rose-500/80',
  offline:    'border-slate-700/30',
  scaling:    'border-blue-500/80',
};

const STATUS_LABEL: Record<ServerStatus, string> = {
  healthy:    'Healthy',
  warning:    'High Load',
  overloaded: 'Overloaded',
  offline:    'Offline',
};

const STATUS_LABEL_COLOR: Record<ServerStatus, string> = {
  healthy:    'text-emerald-400',
  warning:    'text-amber-400',
  overloaded: 'text-rose-400',
  offline:    'text-slate-500',
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
    <div className="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 shadow-xl text-xs min-w-[140px]">
      <p className="font-mono font-bold text-slate-100 mb-1.5">{server.id}</p>
      <div className="space-y-0.5 text-slate-400">
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
          <span>Req/s</span>
          <span className="font-mono text-slate-300">
            {server.metrics?.activeConnections ?? 0}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Capacity</span>
          <span className="font-mono text-slate-300">{server.capacity}</span>
        </div>
        {server.children.length > 0 && (
          <div className="flex justify-between gap-4">
            <span>Children</span>
            <span className="font-mono text-slate-300">{server.children.length}</span>
          </div>
        )}
      </div>
      {/* Arrow */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0
        border-l-[5px] border-l-transparent
        border-r-[5px] border-r-transparent
        border-t-[5px] border-t-slate-700/80" />
    </div>
  </motion.div>
);

// ─── Load Balancer root node ──────────────────────────────────────────────────

import React from 'react';

export const LBFlowNode = memo(({ data, selected }: NodeProps) => {
  const lbData = data as LBNodeData;
  const isOnActivePath = lbData?.isOnActivePath;

  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className={`relative flex flex-col items-center justify-center w-[160px] h-[72px]
        rounded-xl border select-none
        bg-gradient-to-br from-blue-900/80 to-indigo-900/70
        ${selected || isOnActivePath
          ? 'border-blue-400 shadow-[0_0_0_1px_#60a5fa,0_4px_16px_-2px_rgba(59,130,246,0.35)]'
          : 'border-blue-700/60 shadow-node'
        }`}
    >
      {isOnActivePath && (
        <motion.span
          className="absolute inset-0 rounded-xl border border-blue-400/60"
          animate={{ opacity: [0.6, 0.15] }}
          transition={{ duration: 0.9, repeat: Infinity, repeatType: 'reverse' }}
        />
      )}
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-300/80">
        Load Balancer
      </span>
      <span className="text-xs font-semibold text-blue-200 mt-0.5 font-mono">Round Robin</span>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-blue-500 !border-blue-700 !w-2 !h-2"
      />
    </motion.div>
  );
});
LBFlowNode.displayName = 'LBFlowNode';

// ─── Server instance node ─────────────────────────────────────────────────────

export const ServerFlowNode = memo(({ data }: NodeProps) => {
  const nodeData = data as TopologyNodeData;
  const { server, isSelected, isOnActivePath, isScaling, scalingStep, onSelect } = nodeData;
  const [hovered, setHovered] = useState(false);

  const lc = loadColor(server.load);
  const isRoot = server.parentId === null;
  const depth = server.id.split('.').length - 1;

  // Node sizing: all levels same width for layout consistency, visual depth via font/border
  const nodeW = 152;
  const nodeH = 86;

  const borderClass =
    isScaling
      ? STATUS_BORDER.scaling
      : STATUS_BORDER[server.status] ?? STATUS_BORDER.healthy;

  const glowStyle: React.CSSProperties =
    server.status === 'overloaded'
      ? { boxShadow: '0 0 18px -4px rgba(239,68,68,0.5)' }
      : server.status === 'warning'
      ? { boxShadow: '0 0 14px -6px rgba(245,158,11,0.4)' }
      : isOnActivePath
      ? { boxShadow: '0 0 14px -6px rgba(59,130,246,0.45)' }
      : {};

  const selectedStyle: React.CSSProperties = isSelected
    ? { boxShadow: '0 0 0 1.5px #60a5fa, 0 4px 16px -2px rgba(59,130,246,0.3)' }
    : {};

  return (
    <>
      {/* Input handle — always present so edges can connect */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-slate-600 !border-slate-700 !w-2 !h-2"
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

        {/* Scaling ring animation */}
        {(isScaling || server.status === 'overloaded') && (
          <motion.span
            className={`absolute inset-0 rounded-xl border-2 pointer-events-none ${
              scalingStep === 'spawning' ? 'border-blue-400/60' : 'border-rose-500/60'
            }`}
            animate={{ scale: [1, 1.07], opacity: [0.7, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
          />
        )}

        {/* Active path glow */}
        {isOnActivePath && !isSelected && (
          <motion.span
            className="absolute inset-0 rounded-xl border border-blue-400/40 pointer-events-none"
            animate={{ opacity: [0.8, 0.2] }}
            transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
          />
        )}

        <motion.div
          initial={{ scale: 0.78, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: 'spring',
            stiffness: 260,
            damping: 22,
            delay: depth * 0.05,
          }}
          whileHover={{ scale: 1.025 }}
          onClick={() => onSelect(server.id)}
          style={{
            width: nodeW,
            height: nodeH,
            ...glowStyle,
            ...selectedStyle,
          }}
          className={`relative flex flex-col justify-between rounded-xl border
            bg-slate-900/95 cursor-pointer select-none overflow-hidden
            transition-shadow duration-200
            ${borderClass}`}
        >
          {/* Header: ID + status dot */}
          <div className="flex items-center justify-between px-3 pt-2.5">
            <div className="flex items-center gap-1.5 min-w-0">
              {/* Depth indicator */}
              {depth > 0 && (
                <span className="text-slate-700 text-[10px] font-mono shrink-0">{'·'.repeat(depth)}</span>
              )}
              <span
                className={`font-mono font-bold tracking-tight text-slate-100 truncate ${
                  depth === 0 ? 'text-sm' : 'text-xs'
                }`}
              >
                {server.id}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {isRoot && (
                <span className="text-[8px] font-bold uppercase tracking-widest text-blue-500/60">
                  root
                </span>
              )}
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: lc }}
              />
            </div>
          </div>

          {/* Load bar */}
          <div className="px-3">
            <div className="h-1 w-full rounded-full bg-slate-800 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: lc }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(server.load, 2)}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Metrics row */}
          <div className="px-3 pb-2.5">
            <div className="flex items-end justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-200 tabular-nums font-mono">
                  {server.load}%
                </span>
                <span className="text-[9px] text-slate-500 ml-1">load</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-slate-500">
                  {server.metrics?.activeConnections ?? 0} conn
                </span>
              </div>
            </div>

            {/* Status label */}
            <div className="flex items-center gap-1 mt-1">
              {isScaling ? (
                <motion.span
                  className="text-[10px] font-semibold text-blue-400"
                  animate={{ opacity: [1, 0.4] }}
                  transition={{ duration: 0.7, repeat: Infinity, repeatType: 'reverse' }}
                >
                  {scalingStep === 'overloading'
                    ? '↑ Load rising'
                    : scalingStep === 'scaling'
                    ? '⚠ Overloaded'
                    : scalingStep === 'spawning'
                    ? '⊕ Spawning…'
                    : '↓ Stabilizing'}
                </motion.span>
              ) : (
                <span className={`text-[10px] font-medium capitalize ${STATUS_LABEL_COLOR[server.status]}`}>
                  {STATUS_LABEL[server.status]}
                </span>
              )}
              {server.children.length > 0 && (
                <span className="text-[9px] text-slate-600 ml-auto">
                  {server.children.length} child{server.children.length !== 1 ? 'ren' : ''}
                </span>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Source handle — always present (React Flow connects by node id) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-slate-600 !border-slate-700 !w-2 !h-2"
      />
    </>
  );
});
ServerFlowNode.displayName = 'ServerFlowNode';
