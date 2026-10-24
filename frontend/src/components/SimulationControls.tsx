/**
 * SimulationControls.tsx
 *
 * Phase 3: Compact traffic simulation controls bar.
 * Start/Pause traffic, change rate, reset topology.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Zap, Activity } from 'lucide-react';
import { TrafficRate } from '../data/topologySimulation';

interface SimulationControlsProps {
  isRunning: boolean;
  trafficRate: TrafficRate;
  onStart: () => void;
  onPause: () => void;
  onSetRate: (rate: TrafficRate) => void;
  onReset: () => void;
  /** If a scaling sequence is in progress */
  scalingInProgress?: boolean;
}

const RATE_OPTIONS: { label: string; value: TrafficRate }[] = [
  { label: 'Low', value: 'low' },
  { label: 'Med', value: 'medium' },
  { label: 'High', value: 'high' },
];

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  isRunning,
  trafficRate,
  onStart,
  onPause,
  onSetRate,
  onReset,
  scalingInProgress = false,
}) => {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Start / Pause */}
      <button
        onClick={isRunning ? onPause : onStart}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
          isRunning
            ? 'bg-amber-600/20 text-amber-300 border border-amber-600/30 hover:bg-amber-600/30'
            : 'bg-emerald-600/20 text-emerald-300 border border-emerald-600/30 hover:bg-emerald-600/30'
        }`}
      >
        {isRunning ? (
          <>
            <Pause className="w-3 h-3" />
            Pause
          </>
        ) : (
          <>
            <Play className="w-3 h-3" />
            Start Traffic
          </>
        )}
      </button>

      {/* Traffic rate */}
      <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
        {RATE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSetRate(opt.value)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              trafficRate === opt.value
                ? 'bg-blue-600/30 text-blue-300 border border-blue-600/30'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Live traffic indicator */}
      {isRunning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-1.5 text-xs text-emerald-400"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          <Activity className="w-3 h-3" />
          <span className="font-mono text-[10px]">Live</span>
        </motion.div>
      )}

      {/* Scaling in progress */}
      {scalingInProgress && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-1.5 text-xs text-blue-400"
        >
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          >
            <Zap className="w-3 h-3" />
          </motion.span>
          <span>Scaling…</span>
        </motion.div>
      )}

      {/* Reset */}
      <button
        onClick={onReset}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 border border-slate-800 hover:text-slate-200 hover:bg-slate-800 transition-colors ml-auto"
        title="Reset simulation to initial state (S1, S2, S3)"
      >
        <RotateCcw className="w-3 h-3" />
        Reset
      </button>
    </div>
  );
};
