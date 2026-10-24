import React from 'react';
import { motion } from 'framer-motion';
import { ServerStatus } from '../types/server.types';

interface StatusBadgeProps {
  status: ServerStatus;
  showLabel?: boolean;
  pulse?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<
  ServerStatus,
  { color: string; bg: string; border: string; label: string; dotColor: string }
> = {
  healthy: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/25',
    label: 'Healthy',
    dotColor: 'bg-emerald-400',
  },
  warning: {
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/25',
    label: 'High Load',
    dotColor: 'bg-amber-400',
  },
  overloaded: {
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/25',
    label: 'Scaling Required',
    dotColor: 'bg-rose-400',
  },
  offline: {
    color: 'text-slate-400',
    bg: 'bg-slate-800/60',
    border: 'border-slate-700/40',
    label: 'Offline',
    dotColor: 'bg-slate-500',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showLabel = true,
  pulse = false,
  className = '',
}) => {
  const cfg = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color} ${cfg.bg} ${cfg.border} ${className}`}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        {pulse && status !== 'offline' && (
          <motion.span
            className={`absolute inline-flex h-full w-full rounded-full opacity-60 ${cfg.dotColor}`}
            animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${cfg.dotColor}`} />
      </span>
      {showLabel && <span>{cfg.label}</span>}
    </span>
  );
};
