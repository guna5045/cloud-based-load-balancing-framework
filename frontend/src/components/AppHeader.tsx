import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, CheckCircle2, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { HealthResponse } from '../types/server.types';
import { UseSocketReturn } from '../hooks/useSocket';

interface AppHeaderProps {
  health: HealthResponse | null;
  socket: UseSocketReturn;
  onRefresh: () => void;
  refreshing: boolean;
  currentPageTitle: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  health,
  socket,
  onRefresh,
  refreshing,
  currentPageTitle,
}) => {
  const isOperational = health?.status === 'ok' && socket.isConnected;

  return (
    <header className="h-12 flex items-center justify-between px-5 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-sm shrink-0 z-10">
      {/* Left: Page title */}
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-slate-200">{currentPageTitle}</h2>
        <span className="text-slate-700">·</span>
        <span className="text-xs text-slate-500">Cloud-Based Load Balancing Framework</span>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-3">
        {/* System status */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${isOperational
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/25'
            }`}
        >
          {isOperational ? (
            <CheckCircle2 className="w-3 h-3" />
          ) : (
            <AlertCircle className="w-3 h-3" />
          )}
          {isOperational ? 'System Operational' : 'Degraded'}
        </motion.div>

        {/* Socket status */}
        <div
          className="flex items-center gap-1.5 text-xs"
          title={socket.isConnected ? `Socket ID: ${socket.socketId}` : 'Not connected — attempting auto-reconnect'}
        >
          {socket.isConnected ? (
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          )}
          <span className={socket.isConnected ? 'text-slate-400' : 'text-amber-400 font-medium'}>
            {socket.isConnected ? 'Real-time' : 'Reconnecting...'}
          </span>
        </div>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          disabled={refreshing}
          title="Refresh data"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>

        {/* System status badge */}
        <span className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
          Cloud Load Balancer
        </span>
      </div>
    </header>
  );
};
