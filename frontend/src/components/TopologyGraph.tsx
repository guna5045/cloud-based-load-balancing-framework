import React, { useCallback, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  ReactFlowInstance,
  Node,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion } from 'framer-motion';
import { Maximize2, RefreshCw, GitBranch } from 'lucide-react';
import { ServerNode } from '../types/server.types';
import { LBFlowNode, ServerFlowNode } from './TopologyNode';
import { buildFlowGraph } from '../utils/topologyLayout';

interface TopologyGraphProps {
  servers: ServerNode[];
  selectedServerId: string | null;
  onSelectServer: (id: string | null) => void;
  loading?: boolean;
  onRefresh?: () => void;
}

// Register custom node types once (outside component to avoid re-registration)
const nodeTypes = {
  lbNode: LBFlowNode,
  serverNode: ServerFlowNode,
};

export const TopologyGraph: React.FC<TopologyGraphProps> = ({
  servers,
  selectedServerId,
  onSelectServer,
  loading = false,
  onRefresh,
}) => {
  const rfInstanceRef = useRef<ReactFlowInstance<Node, Edge> | null>(null);

  // Build graph from recursive server tree on each change
  const { nodes: freshNodes, edges: freshEdges } = useMemo(
    () => buildFlowGraph(servers, (id) => onSelectServer(id), selectedServerId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [servers, selectedServerId]
  );

  const fitView = useCallback(() => {
    rfInstanceRef.current?.fitView({ padding: 0.25, duration: 500 });
  }, []);

  const onPaneClick = useCallback(() => {
    onSelectServer(null);
  }, [onSelectServer]);

  const totalNodes = useMemo(() => {
    let count = 0;
    const walk = (nodes: ServerNode[]) => {
      count += nodes.length;
      nodes.forEach((n) => walk(n.children));
    };
    walk(servers);
    return count;
  }, [servers]);

  return (
    <div className="card flex flex-col" style={{ height: 480 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2.5">
          <GitBranch className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-sm text-slate-200">Live Server Topology</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 border border-slate-700 text-slate-400 font-mono">
            {totalNodes} node{totalNodes !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="Refresh topology"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button
            onClick={fitView}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Fit view"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Flow canvas */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/60 rounded-b-xl">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent"
            />
          </div>
        )}

        <ReactFlow
          nodes={freshNodes}
          edges={freshEdges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          onInit={(instance) => {
            rfInstanceRef.current = instance as ReactFlowInstance<Node, Edge>;
          }}
          onPaneClick={onPaneClick}
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#1e293b"
          />
          <Controls
            className="!bg-slate-900/90 !border-slate-800 !rounded-lg !shadow-card"
            showInteractive={false}
          />
          <MiniMap
            nodeColor={(n) => {
              if (n.type === 'lbNode') return '#1d4ed8';
              const s = (n.data as { server?: ServerNode })?.server;
              if (!s) return '#334155';
              if (s.status === 'overloaded') return '#ef4444';
              if (s.status === 'warning') return '#f59e0b';
              if (s.status === 'offline') return '#475569';
              return '#22c55e';
            }}
            maskColor="rgba(5,10,18,0.7)"
            style={{ background: '#0f172a', border: '1px solid #1e293b' }}
          />
        </ReactFlow>
      </div>
    </div>
  );
};
