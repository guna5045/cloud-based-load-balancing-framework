/**
 * topologyLayout.ts  (Phase 3 — improved)
 *
 * Converts the recursive ServerNode tree into a flat list of React Flow
 * nodes and edges using a proper Reingold–Tilford-style horizontal layout.
 *
 * Works for arbitrary depth trees. Keeps sibling subtrees balanced.
 * Supports active path highlighting, scaling state, and hover-tooltip data.
 */

import { ServerNode } from '../types/server.types';
import { Node, Edge } from '@xyflow/react';
import { ScalingState } from '../hooks/useTopologySimulation';

// ─── Layout constants ─────────────────────────────────────────────────────────

const H_GAP   = 52;   // horizontal gap between sibling subtrees
const V_GAP   = 108;  // vertical gap between tree levels
const LB_Y    = 0;
const NODE_W  = 152;  // node width (all depths — we scale the card inside)

// ─── Recursive width calculator ───────────────────────────────────────────────

function subtreeWidth(node: ServerNode): number {
  if (node.children.length === 0) return NODE_W;
  const childWidths = node.children.map(subtreeWidth);
  const totalChildren = childWidths.reduce((a, b) => a + b, 0);
  const gaps = (node.children.length - 1) * H_GAP;
  return Math.max(NODE_W, totalChildren + gaps);
}

// ─── Recursive node + edge builder ────────────────────────────────────────────

function buildSubtree(
  node: ServerNode,
  cx: number,
  cy: number,
  onSelect: (id: string) => void,
  selected: string | null,
  activePath: Set<string>,
  scaling: ScalingState,
  nodes: Node[],
  edges: Edge[]
): void {
  const isSelected = node.id === selected;
  const isOnActivePath = activePath.has(node.id);
  const isScaling =
    scaling.serverId === node.id && scaling.step !== 'idle';

  nodes.push({
    id: node.id,
    type: 'serverNode',
    position: { x: cx - NODE_W / 2, y: cy },
    data: {
      server: node,
      isSelected,
      isOnActivePath,
      isScaling,
      scalingStep: scaling.serverId === node.id ? scaling.step : 'idle',
      onSelect,
    },
  });

  if (node.children.length === 0) return;

  // Compute total width of all children
  const childWidths = node.children.map(subtreeWidth);
  const totalW =
    childWidths.reduce((a, b) => a + b, 0) +
    (node.children.length - 1) * H_GAP;

  let startX = cx - totalW / 2;

  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    const cw = childWidths[i];
    const childCx = startX + cw / 2;

    const isActiveEdge =
      activePath.has(node.id) && activePath.has(child.id);

    edges.push({
      id: `e-${node.id}-${child.id}`,
      source: node.id,
      target: child.id,
      type: 'smoothstep',
      animated: isActiveEdge,
      style: {
        stroke: isActiveEdge ? '#3b82f6' : '#1e293b',
        strokeWidth: isActiveEdge ? 2.5 : 1.5,
        opacity: activePath.size > 0 && !isActiveEdge ? 0.35 : 1,
      },
    });

    buildSubtree(child, childCx, cy + V_GAP, onSelect, selected, activePath, scaling, nodes, edges);
    startX += cw + H_GAP;
  }
}

// ─── Public builder ───────────────────────────────────────────────────────────

export interface BuildFlowGraphOptions {
  servers: ServerNode[];
  onSelect: (id: string) => void;
  selected: string | null;
  /** IDs of nodes on the current active request path */
  activePath?: string[];
  scaling?: ScalingState;
}

export function buildFlowGraph({
  servers,
  onSelect,
  selected,
  activePath = [],
  scaling = { serverId: null, step: 'idle' },
}: BuildFlowGraphOptions): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const activePathSet = new Set(activePath);

  // ── Load Balancer synthetic root ───────────────────────────────────────────

  nodes.push({
    id: '__lb__',
    type: 'lbNode',
    position: { x: -76, y: LB_Y },
    data: {
      isOnActivePath: activePath.includes('__lb__'),
    },
    draggable: false,
  });

  if (servers.length === 0) return { nodes, edges };

  // ── Layout root servers ────────────────────────────────────────────────────

  const rootWidths = servers.map(subtreeWidth);
  const totalRootW =
    rootWidths.reduce((a, b) => a + b, 0) + (servers.length - 1) * H_GAP;
  let startX = -totalRootW / 2;

  for (let i = 0; i < servers.length; i++) {
    const server = servers[i];
    const rw = rootWidths[i];
    const rootCx = startX + rw / 2;

    const isActiveEdge =
      activePathSet.has('__lb__') && activePathSet.has(server.id);

    edges.push({
      id: `e-lb-${server.id}`,
      source: '__lb__',
      target: server.id,
      type: 'smoothstep',
      animated: isActiveEdge,
      style: {
        stroke: isActiveEdge ? '#3b82f6' : '#1d4ed8',
        strokeWidth: isActiveEdge ? 2.5 : 2,
        opacity: activePath.length > 0 && !isActiveEdge ? 0.3 : 1,
      },
    });

    buildSubtree(
      server,
      rootCx,
      LB_Y + V_GAP,
      onSelect,
      selected,
      activePathSet,
      scaling,
      nodes,
      edges
    );

    startX += rw + H_GAP;
  }

  return { nodes, edges };
}
