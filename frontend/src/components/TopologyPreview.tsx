import React from 'react';
import { ServerNode } from '../types/server.types';
import { HardDrive, GitBranch, Cpu, Activity } from 'lucide-react';

interface ServerTreeNodeProps {
  node: ServerNode;
  level: number;
}

const ServerTreeNode: React.FC<ServerTreeNodeProps> = ({ node, level }) => {
  const statusColor =
    node.status === 'healthy'
      ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-400'
      : node.status === 'warning'
      ? 'border-amber-500/40 bg-amber-500/5 text-amber-400'
      : node.status === 'overloaded'
      ? 'border-rose-500/40 bg-rose-500/5 text-rose-400'
      : 'border-slate-700 bg-slate-800/40 text-slate-400';

  const indentStyle = {
    marginLeft: level > 0 ? `${level * 1.5}rem` : '0',
  };

  return (
    <div className="space-y-2" style={indentStyle}>
      <div className={`p-3.5 rounded-lg border ${statusColor} backdrop-blur-sm transition-all hover:bg-slate-800/60`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-slate-900/80 border border-slate-700/60">
              {level === 0 ? (
                <HardDrive className="w-4 h-4 text-blue-400" />
              ) : (
                <GitBranch className="w-4 h-4 text-indigo-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-100 text-sm">{node.id}</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400 font-mono">
                  {node.parentId ? `Parent: ${node.parentId}` : 'Root Server'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Status: <strong className="capitalize">{node.status}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              <span>Load: <strong className="text-slate-100">{node.load}%</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <Cpu className="w-3.5 h-3.5 text-slate-500" />
              <span>Cap: {node.capacity} req/s</span>
            </div>
            {node.children && node.children.length > 0 && (
              <span className="px-2 py-0.5 rounded text-[11px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                {node.children.length} Children
              </span>
            )}
          </div>
        </div>

        {/* Load Bar */}
        <div className="w-full bg-slate-900/80 rounded-full h-1.5 mt-2.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              node.load > 80
                ? 'bg-rose-500'
                : node.load > 50
                ? 'bg-amber-400'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.max(node.load, 2)}%` }}
          />
        </div>
      </div>

      {/* Recursive Children Rendering */}
      {node.children && node.children.length > 0 && (
        <div className="space-y-2 border-l-2 border-slate-800 pl-2">
          {node.children.map((child) => (
            <ServerTreeNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

interface Props {
  servers: ServerNode[];
  totalServers: number;
  maxDepth: number;
  averageLoad: number;
  loading: boolean;
  onRefresh: () => void;
}

export const TopologyPreview: React.FC<Props> = ({
  servers,
  totalServers,
  maxDepth,
  averageLoad,
  loading,
  onRefresh,
}) => {
  return (
    <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/60 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <span>Server Topology Tree Data Model</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
              Recursive N-Ary Structure
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Initial root pool (S1, S2, S3). Supports dynamic 3-child expansion under any active node.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh Topology'}
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Total Nodes</div>
          <div className="text-lg font-bold text-white mt-0.5 font-mono">{totalServers}</div>
        </div>
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Max Tree Depth</div>
          <div className="text-lg font-bold text-blue-400 mt-0.5 font-mono">{maxDepth}</div>
        </div>
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Avg Cluster Load</div>
          <div className="text-lg font-bold text-emerald-400 mt-0.5 font-mono">{averageLoad}%</div>
        </div>
      </div>

      {/* Server Tree Nodes */}
      <div className="space-y-3">
        {servers.length > 0 ? (
          servers.map((server) => (
            <ServerTreeNode key={server.id} node={server} level={0} />
          ))
        ) : (
          <div className="text-center py-8 text-slate-400 text-sm">
            {loading ? 'Loading initial topology...' : 'No servers found in topology.'}
          </div>
        )}
      </div>
    </div>
  );
};
