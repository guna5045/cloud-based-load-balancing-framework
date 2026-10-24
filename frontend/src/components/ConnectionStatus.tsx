import React from 'react';
import { Activity, Radio, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { HealthResponse } from '../types/server.types';
import { UseSocketReturn } from '../hooks/useSocket';

interface Props {
  health: HealthResponse | null;
  healthLoading: boolean;
  healthError: string | null;
  socket: UseSocketReturn;
  onRefreshHealth: () => void;
}

export const ConnectionStatus: React.FC<Props> = ({
  health,
  healthLoading,
  healthError,
  socket,
  onRefreshHealth,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* REST API Status */}
      <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-sm text-slate-200">Express REST Backend</h3>
          </div>
          <button
            onClick={onRefreshHealth}
            disabled={healthLoading}
            className="text-xs text-blue-400 hover:text-blue-300 underline disabled:opacity-50"
          >
            {healthLoading ? 'Checking...' : 'Refresh'}
          </button>
        </div>

        {healthError ? (
          <div className="flex items-center gap-2 text-rose-400 text-xs py-2">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>Connection Failed: {healthError}</span>
          </div>
        ) : health ? (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Endpoint:</span>
              <code className="text-slate-200 bg-slate-900/80 px-1.5 py-0.5 rounded">/api/health</code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Status:</span>
              <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {health.status.toUpperCase()} (HTTP 200)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Backend Uptime:</span>
              <span className="text-slate-300 inline-flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                {health.uptimeSeconds} seconds
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Environment:</span>
              <span className="text-slate-300 capitalize">{health.environment}</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400">Loading backend status...</p>
        )}
      </div>

      {/* Socket.IO Real-Time Status */}
      <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-sm text-slate-200">Socket.IO Real-Time Engine</h3>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
              socket.isConnected
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                socket.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`}
            />
            {socket.isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {socket.error && !socket.isConnected ? (
          <div className="flex items-center gap-2 text-rose-400 text-xs py-2">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>Socket Error: {socket.error}</span>
          </div>
        ) : socket.isConnected ? (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Socket ID:</span>
              <code className="text-indigo-300 bg-slate-900/80 px-1.5 py-0.5 rounded">
                {socket.socketId || 'N/A'}
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Transport:</span>
              <span className="text-slate-300 capitalize font-mono">
                {socket.transportName || 'websocket'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Handshake ACK:</span>
              <span className="text-slate-300 truncate max-w-[200px]" title={socket.lastAck?.message}>
                {socket.lastAck ? 'Received (2-way handshake verified)' : 'Pending initial handshake'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Events:</span>
              <span className="text-slate-300">client connected / client disconnected</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400">Connecting to Socket.IO backend...</p>
        )}
      </div>
    </div>
  );
};
