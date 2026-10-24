import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';
import { ServerNode } from '../types/server.types';

// The extra data we attach when building Flow nodes
export interface TopologyNodeData extends Record<string, unknown> {
  server: ServerNode;
  isSelected: boolean;
  onSelect: (id: string) => void;
  isLB?: boolean; // true for the synthetic Load Balancer root node
}

const LOAD_COLOR = (load: number) => {
  if (load >= 80) return '#ef4444';
  if (load >= 60) return '#f59e0b';
  return '#22c55e';
};

const STATUS_RING: Record<string, string> = {
  healthy: 'border-slate-700/60',
  warning: 'border-amber-500/60',
  overloaded: 'border-rose-500/80',
  offline: 'border-slate-700/30',
};

const STATUS_GLOW: Record<string, string> = {
  healthy: '',
  warning: 'shadow-[0_0_16px_-4px_rgba(245,158,11,0.4)]',
  overloaded: 'shadow-[0_0_20px_-4px_rgba(239,68,68,0.55)]',
  offline: '',
};

// ─── Load Balancer root node ─────────────────────────────────────────────────

export const LBFlowNode = memo(({ selected }: NodeProps) => {
  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className={`relative flex flex-col items-center justify-center w-[152px] h-[68px]
        rounded-xl border bg-gradient-to-br from-blue-900/70 to-indigo-900/60
        ${selected ? 'border-blue-400 shadow-node-selected' : 'border-blue-700/60'}
        shadow-node cursor-default select-none`}
    >
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-300/80">
        Load Balancer
      </span>
      <span className="text-sm font-semibold text-blue-200 mt-0.5">Round Robin</span>
      {/* Output handle at the bottom */}
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500 !border-blue-700 !w-2 !h-2" />
    </motion.div>
  );
});
LBFlowNode.displayName = 'LBFlowNode';

// ─── Server instance node ─────────────────────────────────────────────────────

export const ServerFlowNode = memo(({ data }: NodeProps) => {
  const nodeData = data as TopologyNodeData;
  const { server, isSelected, onSelect } = nodeData;
  const loadColor = LOAD_COLOR(server.load);
  const ringClass = STATUS_RING[server.status] || STATUS_RING.healthy;
  const glowClass = STATUS_GLOW[server.status] || '';

  const isRoot = server.parentId === null;
  const depth = server.id.split('.').length - 1;

  // Slightly smaller nodes at deeper levels
  const nodeW = depth === 0 ? 148 : depth === 1 ? 132 : 120;
  const nodeH = depth === 0 ? 82 : depth === 1 ? 76 : 70;

  return (
    <>
      {/* Input from parent */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-slate-600 !border-slate-700 !w-2 !h-2"
      />

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22, delay: depth * 0.06 }}
        whileHover={{ scale: 1.03 }}
        onClick={() => onSelect(server.id)}
        style={{ width: nodeW, height: nodeH }}
        className={`relative flex flex-col justify-between rounded-xl border bg-slate-900/90
          ${ringClass} ${glowClass}
          ${isSelected ? 'shadow-node-selected ring-1 ring-blue-400' : 'shadow-node'}
          cursor-pointer select-none overflow-hidden transition-shadow duration-200`}
      >
        {/* Overloaded pulse ring */}
        {server.status === 'overloaded' && (
          <motion.span
            className="absolute inset-0 rounded-xl border-2 border-rose-500/60"
            animate={{ scale: [1, 1.08], opacity: [0.6, 0] }}
            transition={{ duration: 1.3, repeat: Infinity, ease: 'easeOut' }}
          />
        )}

        {/* Top section – ID + status dot */}
        <div className="flex items-center justify-between px-3 pt-2.5">
          <span
            className={`font-mono font-bold tracking-tight ${
              depth === 0 ? 'text-sm' : 'text-xs'
            } text-slate-100`}
          >
            {server.id}
          </span>
          <span
            className={`w-2 h-2 rounded-full shrink-0`}
            style={{ backgroundColor: loadColor }}
          />
        </div>

        {/* Load bar */}
        <div className="px-3">
          <div className="h-1 w-full rounded-full bg-slate-800 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: loadColor }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(server.load, 2)}%` }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
            />
          </div>
        </div>

        {/* Bottom – load % + status */}
        <div className="flex items-center justify-between px-3 pb-2.5">
          <span className="text-[11px] font-semibold text-slate-300 tabular-nums">
            {server.load}% load
          </span>
          <span
            className={`text-[10px] font-medium capitalize ${
              server.status === 'healthy'
                ? 'text-emerald-400'
                : server.status === 'warning'
                ? 'text-amber-400'
                : server.status === 'overloaded'
                ? 'text-rose-400'
                : 'text-slate-500'
            }`}
          >
            {server.status === 'overloaded' ? 'scaling' : server.status}
          </span>
        </div>

        {/* Root badge */}
        {isRoot && (
          <span className="absolute top-1.5 right-7 text-[9px] font-bold uppercase tracking-widest text-blue-500/70">
            root
          </span>
        )}
      </motion.div>

      {/* Output to children */}
      {server.children.length > 0 && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!bg-slate-600 !border-slate-700 !w-2 !h-2"
        />
      )}
    </>
  );
});
ServerFlowNode.displayName = 'ServerFlowNode';
