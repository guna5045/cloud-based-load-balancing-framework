/**
 * RequestsPage.tsx
 * Phase 8: Real-Time Frontend/Backend Integration
 *
 * Real-time request pipeline and distribution monitoring:
 * - Direct HTTP request dispatching through Round Robin load balancer
 * - Live request history table updated via Socket.IO
 * - Per-server request distribution metrics
 * - Round Robin sequence progression timeline
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Send, Zap, Play, Pause, RefreshCw, Activity, Clock, CheckCircle2, Cpu, AlertCircle, WifiOff } from 'lucide-react';
import { useRealRouting } from '../hooks/useRealRouting';
import { MetricCard } from '../components/MetricCard';

export const RequestsPage: React.FC = () => {
  const real = useRealRouting();

  return (
    <div className="flex flex-col gap-5 p-5 h-full overflow-y-auto">
      {/* Failure & Reliability Warning Banners */}
      {!real.socketConnected && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium">
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
          <span><strong>Connection Lost:</strong> Disconnected from load balancer WebSocket. Attempting auto-reconnect...</span>
        </div>
      )}

      {real.scalingKPIs.activeLeafServers === 0 && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span><strong>No healthy servers available:</strong> All server instances in the cluster are offline. Routing is paused until instances recover.</span>
        </div>
      )}

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Send className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold text-slate-100">Live Request Pipeline</h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Round Robin
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Real-time HTTP request ingress, distribution, and latency tracking through Load Balancer (:5000).
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => real.sendSingleRequest()}
            disabled={real.isSending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-xs transition-colors shadow-sm"
          >
            <Send className={`w-3.5 h-3.5 ${real.isSending ? 'animate-spin' : ''}`} />
            <span>Send Request</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => real.sendBurstRequests(5)}
            disabled={real.isSending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/30 text-indigo-200 text-xs font-medium transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span>Burst (5x)</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={real.toggleAutoTraffic}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              real.isAutoTrafficRunning
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
          >
            {real.isAutoTrafficRunning ? (
              <>
                <Pause className="w-3.5 h-3.5 text-amber-400" />
                <span>Pause Auto-Traffic</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                <span>Auto-Traffic (1.2s)</span>
              </>
            )}
          </motion.button>

          <button
            onClick={() => real.refreshData()}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Refresh request metrics"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          title="Total Requests"
          value={real.metrics?.totalRequests ?? 0}
          icon={Activity}
          accentColor="text-blue-400"
          description="Processed by Round Robin"
        />
        <MetricCard
          title="Average Latency"
          value={real.metrics?.averageResponseTime ?? 0}
          unit="ms"
          icon={Clock}
          accentColor="text-indigo-400"
          description="Real server execution time"
        />
        <MetricCard
          title="Next Target"
          value={real.nextExpectedServer}
          icon={Cpu}
          accentColor="text-emerald-400"
          description="Authoritative pointer"
        />
        <MetricCard
          title="Active Routing Leaves"
          value={real.scalingKPIs.activeLeafServers}
          icon={Zap}
          accentColor="text-amber-400"
          description="Eligible leaf instances"
        />
      </div>

      {/* Real-time Response Banner */}
      {real.lastResult && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-blue-500/30 text-xs font-mono"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-slate-300">Latest Request:</span>
            <span className="text-white font-bold">{real.lastResult.requestId}</span>
            <span className="text-slate-500">→</span>
            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
              {real.lastResult.server.id}
            </span>
          </div>
          <div className="flex items-center gap-3 text-slate-400 text-[11px]">
            <span>Sequence: <strong className="text-indigo-300">#{real.lastResult.routing.sequence}</strong></span>
            <span>Latency: <strong className="text-emerald-300">{real.lastResult.response.processingTime}ms</strong></span>
            <span>Timestamp: <strong className="text-slate-300">{new Date(real.lastResult.timestamp).toLocaleTimeString()}</strong></span>
          </div>
        </motion.div>
      )}

      {/* Request History Table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Recent Request Stream ({real.recentRequests.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {real.socketConnected ? '● Live WebSocket Sync' : '○ Polling Fallback'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/60 text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-2.5">Seq</th>
                <th className="px-4 py-2.5">Request ID</th>
                <th className="px-4 py-2.5">Target Server</th>
                <th className="px-4 py-2.5">Latency</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {real.recentRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 italic">
                    No requests dispatched yet. Click "Send Request" to begin.
                  </td>
                </tr>
              ) : (
                real.recentRequests.map((req) => (
                  <tr key={req.requestId} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-2 text-slate-400">#{req.sequence}</td>
                    <td className="px-4 py-2 font-bold text-slate-200">{req.requestId}</td>
                    <td className="px-4 py-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/25">
                        {req.serverId}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-emerald-400">{req.processingTime} ms</td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-400">
                      {new Date(req.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
