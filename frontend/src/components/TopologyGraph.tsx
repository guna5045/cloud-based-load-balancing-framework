/**
 * TopologyGraph.tsx
 *
 * Interactive React Flow graph for the Cloud-Based Load Balancing Framework.
 * Central visualization hub with:
 * - Deterministic, non-disappearing hierarchical tree rendering (Reingold–Tilford)
 * - Custom InfrastructureEdge with high-contrast dual-rail permanent conduit & neon traffic flows
 * - Orthogonal waypoint-following particle badges travelling precisely along connection lines
 * - Viewport stability: fitView ONLY on hierarchy expansion/pruning, NEVER on telemetry load nudges
 * - Seamless fullscreen expansion with ESC exit & state persistence
 * - Zoom controls & Minimap completely removed as requested
 */

import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Node,
  Edge,
  ReactFlowProvider,
  useReactFlow,
  ViewportPortal,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Minimize2, RefreshCw, GitBranch, Layers } from 'lucide-react';
import { ServerNode } from '../types/server.types';
import { LBFlowNode, ServerFlowNode } from './TopologyNode';
import { InfrastructureEdge } from './InfrastructureEdge';
import { buildFlowGraph, NODE_W, LB_W, LB_H, LB_Y, V_GAP } from '../utils/topologyLayout';
import { RequestParticle } from '../data/topologySimulation';
import { ScalingState } from '../hooks/useTopologySimulation';

// ─── Custom node and edge type registry ───────────────────────────────────────

const nodeTypes = {
  lbNode: LBFlowNode,
  serverNode: ServerFlowNode,
};

const edgeTypes = {
  infraEdge: InfrastructureEdge,
};

// ─── Props ────────────────────────────────────────────────────────────────────

export interface TopologyGraphProps {
  servers: ServerNode[];
  selectedServerId: string | null;
  onSelectServer: (id: string | null) => void;
  activePath?: string[];
  scaling?: ScalingState;
  particles?: RequestParticle[];
  loading?: boolean;
  onRefresh?: () => void;
  height?: number;
  headerExtra?: React.ReactNode;
}

// ─── Orthogonal Waypoint Particle Badge ───────────────────────────────────────

interface NodeCenter {
  x: number;
  y: number;
}

/**
 * Calculates coordinates along the exact orthogonal smooth-step path:
 * 1. Drop vertically from source anchor
 * 2. Route horizontally across midpoint bus
 * 3. Drop vertically into target anchor
 */
function getOrthogonalPoint(from: NodeCenter, to: NodeCenter, t: number): { x: number; y: number } {
  const midY = from.y + V_GAP / 2 + 10;
  const d1 = Math.abs(midY - from.y);
  const d2 = Math.abs(to.x - from.x);
  const d3 = Math.abs(to.y - midY);
  const total = d1 + d2 + d3;
  if (total <= 0) return from;

  const currentDist = t * total;
  if (currentDist <= d1) {
    const segT = d1 === 0 ? 1 : currentDist / d1;
    return { x: from.x, y: from.y + (midY - from.y) * segT };
  } else if (currentDist <= d1 + d2) {
    const segT = d2 === 0 ? 1 : (currentDist - d1) / d2;
    return { x: from.x + (to.x - from.x) * segT, y: midY };
  } else {
    const segT = d3 === 0 ? 1 : (currentDist - d1 - d2) / d3;
    return { x: to.x, y: midY + (to.y - midY) * segT };
  }
}

const ParticleBadge: React.FC<{
  particle: RequestParticle;
  posMap: Record<string, NodeCenter>;
}> = ({ particle, posMap }) => {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const duration = 950; // ms

  useEffect(() => {
    startRef.current = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      const t = Math.min(elapsed / duration, 1);
      setProgress(t);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const path = particle.path.filter((id) => posMap[id]);
  if (path.length < 2) return null;

  const segCount = path.length - 1;
  const globalT = progress * segCount;
  const segIndex = Math.min(Math.floor(globalT), segCount - 1);
  const segT = globalT - segIndex;

  const from = posMap[path[segIndex]];
  const to = posMap[path[segIndex + 1]];
  if (!from || !to) return null;

  // Orthogonal interpolation matching edgePath
  const pt = getOrthogonalPoint(from, to, segT);
  const opacity = progress > 0.85 ? Math.max(0, 1 - (progress - 0.85) / 0.15) : 1;

  return (
    <div
      className="absolute pointer-events-none select-none"
      style={{
        transform: `translate3d(${pt.x}px, ${pt.y}px, 0)`,
        opacity,
        zIndex: 9999,
      }}
    >
      <div className="relative -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
        {/* Glowing badge pill */}
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-400 text-slate-950 font-mono font-bold text-[10px] shadow-[0_0_12px_rgba(56,189,248,0.9),0_0_0_1px_#ffffff]">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
          <span>#{particle.requestNumber}</span>
        </div>
      </div>
    </div>
  );
};

const ParticleViewportOverlay: React.FC<{
  particles: RequestParticle[];
  nodes: Node[];
}> = ({ particles, nodes }) => {
  const posMap = useMemo(() => {
    const m: Record<string, NodeCenter> = {};
    for (const n of nodes) {
      if (n.id === '__lb__') {
        m['__lb__'] = {
          x: n.position.x + LB_W / 2,
          y: LB_Y + LB_H, // Bottom anchor point
        };
      } else {
        m[n.id] = {
          x: n.position.x + NODE_W / 2,
          y: n.position.y, // Top anchor point
        };
      }
    }
    return m;
  }, [nodes]);

  if (particles.length === 0) return null;

  return (
    <ViewportPortal>
      {particles.map((p) => (
        <ParticleBadge key={p.id} particle={p} posMap={posMap} />
      ))}
    </ViewportPortal>
  );
};

// ─── Inner Graph Component ───────────────────────────────────────────────────

const InnerGraph: React.FC<TopologyGraphProps & {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}> = ({
  servers,
  selectedServerId,
  onSelectServer,
  activePath = [],
  scaling = { serverId: null, step: 'idle' },
  particles = [],
  loading = false,
  onRefresh,
  height = 440,
  headerExtra,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const rfInstance = useReactFlow();

  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);

  // Build the hierarchical graph with persistent node and edge object references
  // This prevents React Flow from invalidating handleBounds and unmounting edges
  const { flowNodes, flowEdges } = useMemo(() => {
    const raw = buildFlowGraph({
      servers,
      onSelect: onSelectServer,
      selected: selectedServerId,
      activePath,
      scaling,
    });

    const prevNodesMap = new Map(nodesRef.current.map((n) => [n.id, n]));
    const stableNodes = raw.nodes.map((newNode) => {
      const prev = prevNodesMap.get(newNode.id);
      if (
        prev &&
        prev.position.x === newNode.position.x &&
        prev.position.y === newNode.position.y &&
        prev.type === newNode.type
      ) {
        prev.data = newNode.data;
        return prev;
      }
      return newNode;
    });
    nodesRef.current = stableNodes;

    const prevEdgesMap = new Map(edgesRef.current.map((e) => [e.id, e]));
    const stableEdges = raw.edges.map((newEdge) => {
      const prev = prevEdgesMap.get(newEdge.id);
      if (
        prev &&
        prev.source === newEdge.source &&
        prev.target === newEdge.target &&
        prev.sourceHandle === newEdge.sourceHandle &&
        prev.targetHandle === newEdge.targetHandle &&
        prev.type === newEdge.type
      ) {
        prev.data = newEdge.data;
        prev.animated = newEdge.animated;
        return prev;
      }
      return newEdge;
    });
    edgesRef.current = stableEdges;

    return { flowNodes: stableNodes, flowEdges: stableEdges };
  }, [servers, selectedServerId, JSON.stringify(activePath), scaling.step, scaling.serverId, onSelectServer]);

  // Structural fingerprint: ONLY changes when node hierarchy expands, prunes, or roots change
  // Does NOT depend on load or server status to prevent re-fit camera jumps on telemetry ticks
  const structuralKey = useMemo(() => {
    const walk = (ns: ServerNode[]): string => {
      return ns.map((n) => `${n.id}:${n.children?.length ?? 0}(${walk(n.children || [])})`).join(';');
    };
    return walk(servers);
  }, [servers]);

  const prevKeyRef = useRef<string>('');

  // Fit view ONLY when hierarchy structure genuinely changes (scaling event, initial cluster load)
  useEffect(() => {
    if (structuralKey !== prevKeyRef.current) {
      prevKeyRef.current = structuralKey;
      requestAnimationFrame(() => {
        rfInstance.fitView({ padding: 0.22, duration: 400 });
      });
    }
  }, [structuralKey, rfInstance]);

  // Re-fit view when fullscreen toggled or window resized
  useEffect(() => {
    const handleResize = () => {
      rfInstance.fitView({ padding: 0.22, duration: 250 });
    };
    window.addEventListener('resize', handleResize);
    const timer = setTimeout(handleResize, 100);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [isFullscreen, rfInstance]);

  const onPaneClick = useCallback(() => {
    onSelectServer(null);
  }, [onSelectServer]);

  const totalNodeCount = useMemo(() => {
    let count = 0;
    const walk = (ns: ServerNode[]) => {
      count += ns.length;
      ns.forEach((n) => {
        if (n.children && n.children.length > 0) walk(n.children);
      });
    };
    walk(servers);
    return count;
  }, [servers]);

  const containerHeight = isFullscreen ? '100%' : Math.max(height, 420);

  return (
    <div
      className={`card flex flex-col w-full relative overflow-hidden transition-all duration-300 ${
        isFullscreen ? 'h-full border-0 rounded-none bg-slate-950/98' : 'bg-slate-900/60'
      }`}
      style={{ height: containerHeight }}
    >
      {/* ── Graph Header Bar ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/80 bg-slate-950/50 shrink-0 select-none">
        <div className="flex items-center gap-2.5">
          <GitBranch className="w-4 h-4 text-sky-400" />
          <span className="font-semibold text-sm text-slate-100">
            {isFullscreen ? 'Server Topology — Focused Full View' : 'Server Topology'}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 border border-slate-700 text-slate-300 font-mono">
            {totalNodeCount} node{totalNodeCount !== 1 ? 's' : ''}
          </span>
          {scaling.step !== 'idle' && (
            <motion.span
              animate={{ opacity: [1, 0.4] }}
              transition={{ duration: 0.7, repeat: Infinity, repeatType: 'reverse' }}
              className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 border border-sky-400/40 text-sky-300 flex items-center gap-1 font-mono"
            >
              <Layers className="w-3 h-3 text-sky-400 animate-spin" />
              <span>Scaling Active…</span>
            </motion.span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {headerExtra}

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

          {/* Fullscreen Toggle Button */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-xs font-medium transition-colors"
              title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Expand Fullscreen'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-sky-400" />
                  <span className="hidden sm:inline">Exit Fullscreen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                  <span className="hidden sm:inline">Fullscreen</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── React Flow Canvas ─────────────────────────────────────────────── */}
      <div className="flex-1 relative min-h-0 w-full">
        {/* Loading overlay */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/70"
            >
              <div className="w-7 h-7 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
            </motion.div>
          )}
        </AnimatePresence>

        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onPaneClick={onPaneClick}
          onNodeClick={(_, node) => {
            if (node.id !== '__lb__') {
              onSelectServer(node.id);
            }
          }}
          minZoom={0.2}
          maxZoom={2.2}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#1e293b"
          />

          {/* Dynamic request particle badges travelling along orthogonal paths */}
          <ParticleViewportOverlay particles={particles} nodes={flowNodes} />
        </ReactFlow>
      </div>
    </div>
  );
};

// ─── Public Export with Provider & Seamless Fullscreen ────────────────────────

export const TopologyGraph: React.FC<TopologyGraphProps> = (props) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ESC key handler for exiting fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  return (
    <>
      {/* Inline Graph */}
      {!isFullscreen && (
        <ReactFlowProvider>
          <InnerGraph
            {...props}
            isFullscreen={false}
            onToggleFullscreen={() => setIsFullscreen(true)}
          />
        </ReactFlowProvider>
      )}

      {/* Fullscreen Overlay */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-[#050a12] p-4 flex flex-col"
          >
            <ReactFlowProvider>
              <InnerGraph
                {...props}
                isFullscreen={true}
                onToggleFullscreen={() => setIsFullscreen(false)}
              />
            </ReactFlowProvider>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
