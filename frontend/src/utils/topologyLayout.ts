/**
 * topologyLayout.ts
 *
 * Converts the recursive ServerNode tree into a flat list of React Flow
 * nodes and edges using a proper Reingold–Tilford-style horizontal layout.
 *
 * Features:
 * - Deterministic, non-overlapping hierarchical positioning for arbitrary depths
 * - Explicit node bounding dimensions ensuring immediate, robust React Flow layout
 * - Wires up custom InfrastructureEdge with rich traffic state metadata
 * - Permanent connection visibility (zero opacity drop on inactive edges)
 */

import { ServerNode } from '../types/server.types';
import { Node, Edge } from '@xyflow/react';
import { ScalingState } from '../hooks/useTopologySimulation';

// ─── Layout constants ─────────────────────────────────────────────────────────

export const H_GAP = 64;   // horizontal gap between sibling subtrees
export const V_GAP = 120;  // vertical gap between tree levels
export const LB_Y = 0;
export const NODE_W = 160; // matches rendered node card width
export const NODE_H_LEAF = 90;
export const NODE_H_SCALED = 98;

// ─── LB node dimensions (for centering) ──────────────────────────────────────

export const LB_W = 176;
export const LB_H = 78;

// ─── Recursive width calculator ───────────────────────────────────────────────

export function subtreeWidth(node: ServerNode): number {
  if (!node.children || node.children.length === 0) return NODE_W;
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
  const isScaling = scaling.serverId === node.id && scaling.step !== 'idle';
  const isScaledParent = (node.children && node.children.length > 0) || node.status === 'scaled';
  const nodeH = isScaledParent ? NODE_H_SCALED : NODE_H_LEAF;

  nodes.push({
    id: node.id,
    type: 'serverNode',
    position: { x: Math.round(cx - NODE_W / 2), y: Math.round(cy) },
    width: NODE_W,
    height: nodeH,
    data: {
      server: node,
      isSelected,
      isOnActivePath,
      isScaling,
      scalingStep: scaling.serverId === node.id ? scaling.step : 'idle',
      onSelect,
    },
  });

  if (!node.children || node.children.length === 0) return;

  const childWidths = node.children.map(subtreeWidth);
  const totalW =
    childWidths.reduce((a, b) => a + b, 0) +
    (node.children.length - 1) * H_GAP;

  let startX = cx - totalW / 2;

  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    const cw = childWidths[i];
    const childCx = startX + cw / 2;

    const isActiveEdge = activePath.has(node.id) && activePath.has(child.id);
    const isScalingEdge = scaling.serverId === node.id && scaling.step === 'spawning';

    edges.push({
      id: `e-${node.id}-${child.id}`,
      source: node.id,
      sourceHandle: 'source',
      target: child.id,
      targetHandle: 'target',
      type: 'infraEdge',
      data: {
        isActive: isActiveEdge,
        isScaling: isScalingEdge,
        targetStatus: child.status,
        sourceType: 'server',
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

  if (!servers || servers.length === 0) {
    // No root servers: LB centered at origin
    nodes.push({
      id: '__lb__',
      type: 'lbNode',
      position: { x: Math.round(-LB_W / 2), y: LB_Y },
      width: LB_W,
      height: LB_H,
      data: { isOnActivePath: activePathSet.has('__lb__') },
      draggable: false,
    });
    return { nodes, edges };
  }

  // ── Compute total width of all root server subtrees ────────────────────────
  const rootWidths = servers.map(subtreeWidth);
  const totalRootW =
    rootWidths.reduce((a, b) => a + b, 0) + (servers.length - 1) * H_GAP;

  // LB is centered over the entire root row
  const lbCx = 0; // world center
  const lbX = lbCx - LB_W / 2;

  nodes.push({
    id: '__lb__',
    type: 'lbNode',
    position: { x: Math.round(lbX), y: LB_Y },
    width: LB_W,
    height: LB_H,
    data: { isOnActivePath: activePathSet.has('__lb__') },
    draggable: false,
  });

  // ── Layout root servers ────────────────────────────────────────────────────
  let startX = lbCx - totalRootW / 2;

  for (let i = 0; i < servers.length; i++) {
    const server = servers[i];
    const rw = rootWidths[i];
    const rootCx = startX + rw / 2;

    const isActiveEdge = activePathSet.has('__lb__') && activePathSet.has(server.id);
    const isScalingEdge = scaling.serverId === server.id && scaling.step === 'spawning';

    edges.push({
      id: `e-lb-${server.id}`,
      source: '__lb__',
      sourceHandle: 'source',
      target: server.id,
      targetHandle: 'target',
      type: 'infraEdge',
      data: {
        isActive: isActiveEdge,
        isScaling: isScalingEdge,
        targetStatus: server.status,
        sourceType: 'lb',
      },
    });

    buildSubtree(
      server,
      rootCx,
      LB_Y + V_GAP + LB_H,   // start below LB node bottom
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
