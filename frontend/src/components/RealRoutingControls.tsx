/**
 * RealRoutingControls.tsx
 * Phase 4: Real Round Robin Load Balancer & Request Routing
 *
 * Interactive control station for triggering real backend API requests,
 * bursts, and controlled auto-traffic, with real-time feedback and
 * Round Robin sequence tracking.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Send, Zap, Play, Pause, RefreshCw, Cpu, Activity, CheckCircle2 } from 'lucide-react';
import { UseRealRoutingReturn } from '../hooks/useRealRouting';

interface RealRoutingControlsProps {
  routing: UseRealRoutingReturn;
}

export const RealRoutingControls: React.FC<RealRoutingControlsProps> = ({ routing }) => {
  const {
    isSending,
    lastResult,
    recentRequests,
    isAutoTrafficRunning,
    socketConnected,
    sendSingleRequest,
    sendBurstRequests,
    toggleAutoTraffic,
    nextExpectedServer,
    refreshData,
  } = routing;

  return (
    <div className="flex flex-col gap-3">
      {/* Top action row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Algorithm Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono font-semibold">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>ROUND ROBIN</span>
          </div>

          {/* Next Target Pill */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs font-mono">
            <span className="text-slate-400">Next:</span>
            <span className="text-emerald-400 font-bold">{nextExpectedServer}</span>
          </div>

          {/* WebSocket status */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[11px]">
            <span
              className={`w-2 h-2 rounded-full ${
                socketConnected ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="text-slate-400 text-[10px] font-mono">
              {socketConnected ? 'Socket.IO Live' : 'Connecting...'}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          {/* Send Single Request */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => sendSingleRequest()}
            disabled={isSending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-xs shadow-md shadow-blue-900/20 transition-colors"
          >
            <Send className={`w-3.5 h-3.5 ${isSending ? 'animate-spin' : ''}`} />
            <span>Send Request</span>
          </motion.button>

          {/* Send Burst (5x) */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => sendBurstRequests(5)}
            disabled={isSending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/30 text-indigo-200 text-xs font-medium transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span>Burst (5x)</span>
          </motion.button>

          {/* Controlled Auto-Traffic Toggle */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={toggleAutoTraffic}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isAutoTrafficRunning
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
          >
            {isAutoTrafficRunning ? (
              <>
                <Pause className="w-3.5 h-3.5 text-amber-400" />
                <span>Pause Traffic</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                <span>Auto Traffic (1.2s)</span>
              </>
            )}
          </motion.button>

          {/* Refresh */}
          <button
            onClick={() => refreshData()}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Refresh metrics from backend"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Real-time Response Banner */}
      {lastResult && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-900/90 border border-blue-500/30 text-xs"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-mono text-slate-200 font-semibold">{lastResult.requestId}</span>
            <span className="text-slate-400">→</span>
            <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Routed to {lastResult.server.id}
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
            <span>Algorithm: <strong className="text-indigo-300">Round Robin (Seq #{lastResult.routing.sequence})</strong></span>
            <span>Processing: <strong className="text-emerald-300">{lastResult.response.processingTime} ms</strong></span>
          </div>
        </motion.div>
      )}

      {/* Round Robin Sequence Timeline (Last 5-8 requests) */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin">
        <span className="text-[10px] font-mono text-slate-400 shrink-0 uppercase tracking-wider flex items-center gap-1">
          <Activity className="w-3 h-3 text-slate-400" />
          Sequence:
        </span>
        {recentRequests.length === 0 ? (
          <span className="text-[11px] text-slate-400 italic">
            No real requests dispatched yet. Click "Send Request" or "Burst (5x)" to begin.
          </span>
        ) : (
          recentRequests.slice(0, 8).map((req, idx) => {
            const serverColor =
              req.serverId === 'S1'
                ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                : req.serverId === 'S2'
                ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                : 'bg-purple-500/10 text-purple-300 border-purple-500/30';

            return (
              <motion.div
                key={req.requestId}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-mono shrink-0 ${serverColor} ${
                  idx === 0 ? 'ring-1 ring-emerald-400/50' : ''
                }`}
              >
                <span className="opacity-75">{req.requestId.slice(-6)}</span>
                <span className="font-bold">→ {req.serverId}</span>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};
