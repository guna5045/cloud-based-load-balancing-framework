/**
 * TopologyGraph.tsx  (Phase 3 — simulation-aware)
 *
 * Interactive React Flow graph for the Cloud-Based Load Balancing Framework.
 * Supports: particle overlays, active path highlighting, scaling animation,
 * zoom/pan/minimap/fit-view, node selection, drag.
 */

import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  Node,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, RefreshCw, GitBranch } from 'lucide-react';
import { ServerNode } from '../types/server.types';
import { LBFlowNode, ServerFlowNode } from './TopologyNode';
import { buildFlowGraph } from '../utils/topologyLayout';
import { RequestParticle } from '../data/topologySimulation';
import { ScalingState } from '../hooks/useTopologySimulation';

// ─── Custom node type registry ────────────────────────────────────────────────

const nodeTypes = {
  lbNode: LBFlowNode,
  serverNode: ServerFlowNode,
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface TopologyGraphProps {
  servers: ServerNode[];
  selectedServerId: string | null;
  onSelectServer: (id: string | null) => void;
  activePath?: string[];
  scaling?: ScalingState;
  particles?: RequestParticle[];
  loading?: boolean;
  onRefresh?: () => void;
  height?: number;
  /** Extra content for the header toolbar (e.g. simulation controls) */
  headerExtra?: React.ReactNode;
}

// ─── Particle dot rendered as SVG overlay ────────────────────────────────────

const ParticleOverlay: React.FC<{
  particles: RequestParticle[];
  nodes: Node[];
}> = ({ particles, nodes }) => {
  // Build a position map from flow node positions
  const posMap = useMemo(() => {
    const m: Record<string, { x: number; y: number }> = {};
    for (const n of nodes) {
      m[n.id] = {
        x: n.position.x + 76,  // approx center-x
        y: n.position.y + 43,  // approx center-y
      };
    }
    return m;
  }, [nodes]);

  if (particles.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {particles.map((p) => {
        if (p.path.length < 2) return null;
        // Animate along entire path as CSS-animated dots
        return (
          <ParticleDot key={p.id} particle={p} posMap={posMap} />
        );
      })}
    </div>
  );
};

const ParticleDot: React.FC<{
  particle: RequestParticle;
  posMap: Record<string, { x: number; y: number }>;
}> = ({ particle, posMap }) => {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const duration = 1600; // ms

  useEffect(() => {
    startRef.current = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      setProgress(Math.min(elapsed / duration, 1));
      if (elapsed < duration) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const path = particle.path.filter((id) => posMap[id]);
  if (path.length < 2) return null;

  // Lerp position along path segments
  const segCount = path.length - 1;
  const globalT = progress * segCount;
  const segIndex = Math.min(Math.floor(globalT), segCount - 1);
  const segT = globalT - segIndex;

  const fromId = path[segIndex];
  const toId = path[segIndex + 1];
  const from = posMap[fromId];
  const to = posMap[toId];
  if (!from || !to) return null;

  const x = from.x + (to.x - from.x) * segT;
  const y = from.y + (to.y - from.y) * segT;
  const opacity = progress > 0.88 ? 1 - (progress - 0.88) / 0.12 : 1;

  return (
    <div
      className="absolute"
      style={{
        left: x - 5,
        top: y - 5,
        opacity,
        transition: 'opacity 0.1s',
      }}
    >
      <div className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_6px_2px_rgba(59,130,246,0.5)]" />
      {/* Request number label — show on first segment only */}
      {segIndex === 0 && progress < 0.4 && (
        <span className="absolute left-3 top-0 text-[9px] font-mono text-blue-300/80 whitespace-nowrap">
          #{particle.requestNumber}
        </span>
      )}
    </div>
  );
};

// ─── Inner graph (uses useReactFlow for fitView) ─────────────────────────────

const InnerGraph: React.FC<TopologyGraphProps & { onNodesReady?: (nodes: Node[]) => void }> = ({
  servers,
  selectedServerId,
  onSelectServer,
  activePath = [],
  scaling = { serverId: null, step: 'idle' },
  particles = [],
  loading = false,
  onRefresh,
  height = 500,
  headerExtra,
  onNodesReady,
}) => {
  const rfInstance = useReactFlow();
  const prevServerCount = useRef(0);

  const { nodes: freshNodes, edges: freshEdges } = useMemo(
    () =>
      buildFlowGraph({
        servers,
        onSelect: (id) => onSelectServer(id),
        selected: selectedServerId,
        activePath,
        scaling,
      }),
    // Re-compute when servers, selection, activePath, or scaling changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [servers, selectedServerId, JSON.stringify(activePath), scaling.step, scaling.serverId]
  );

  // Auto-fit view when new nodes are added (scaling events)
  useEffect(() => {
    const current = freshNodes.length;
    if (current > prevServerCount.current) {
      setTimeout(() => {
        rfInstance.fitView({ padding: 0.25, duration: 600 });
      }, 300);
    }
    prevServerCount.current = current;
    onNodesReady?.(freshNodes);
  }, [freshNodes.length, rfInstance, onNodesReady]);

  const onPaneClick = useCallback(() => {
    onSelectServer(null);
  }, [onSelectServer]);

  const fitView = useCallback(() => {
    rfInstance.fitView({ padding: 0.25, duration: 500 });
  }, [rfInstance]);

  const totalNodes = useMemo(() => {
    let count = 0;
    const walk = (ns: ServerNode[]) => {
      count += ns.length;
      ns.forEach((n) => walk(n.children));
    };
    walk(servers);
    return count;
  }, [servers]);

  const [flowNodes, setFlowNodes] = useState<Node[]>(freshNodes);
  useEffect(() => { setFlowNodes(freshNodes); }, [freshNodes]);

  return (
    <div className="card flex flex-col" style={{ height }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2.5">
          <GitBranch className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-sm text-slate-200">Server Topology</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 border border-slate-700 text-slate-400 font-mono">
            {totalNodes} node{totalNodes !== 1 ? 's' : ''}
          </span>
          {scaling.step !== 'idle' && (
            <motion.span
              animate={{ opacity: [1, 0.4] }}
              transition={{ duration: 0.7, repeat: Infinity, repeatType: 'reverse' }}
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-600/20 border border-blue-600/40 text-blue-300"
            >
              ⊕ Scaling…
            </motion.span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {headerExtra}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="Refresh from backend"
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

      {/* Canvas */}
      <div className="flex-1 relative">
        {/* Loading overlay */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/70 rounded-b-xl"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Particle overlay (rendered on top of React Flow) */}
        <ParticleOverlay particles={particles} nodes={flowNodes} />

        <ReactFlow
          nodes={freshNodes}
          edges={freshEdges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          onPaneClick={onPaneClick}
          minZoom={0.15}
          maxZoom={2.5}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={true}
          nodesConnectable={false}
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
            maskColor="rgba(5,10,18,0.75)"
            style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: 8,
            }}
          />
        </ReactFlow>
      </div>
    </div>
  );
};

// ─── Public export (wraps with ReactFlowProvider) ─────────────────────────────

export const TopologyGraph: React.FC<TopologyGraphProps> = (props) => (
  <ReactFlowProvider>
    <InnerGraph {...props} />
  </ReactFlowProvider>
);
