import React from 'react';
import { Network, Server } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur px-6 py-4 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">
                Cloud-Based Load Balancing Framework
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Production Cluster
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Distributed Load Balancing Framework • Dynamic Hierarchical Cloud Topology
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <Server className="w-4 h-4 text-emerald-400" />
            <span>Algorithm: <strong className="text-slate-100">Round Robin</strong></span>
          </div>
        </div>
      </div>
    </header>
  );
};
