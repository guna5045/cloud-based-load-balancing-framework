import { ServerNode } from '../types/server.types';
import { Node, Edge } from '@xyflow/react';

/**
 * Converts the recursive ServerNode tree into a flat list of React Flow
 * nodes and edges. Uses Reingold–Tilford-inspired horizontal spacing.
 *
 * @param servers   Root-level server nodes from the backend
 * @param onSelect  Callback when a node is clicked
 * @param selected  Currently selected server ID
 */

const H_GAP = 60;    // horizontal gap between sibling subtrees
const V_GAP = 110;   // vertical gap between tree levels
const LB_X = 0;
const LB_Y = 0;
const NODE_W = 148;  // root-level node width

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
  nodes: Node[],
  edges: Edge[]
): void {
  nodes.push({
    id: node.id,
    type: 'serverNode',
    position: { x: cx - NODE_W / 2, y: cy },
    data: {
      server: node,
      isSelected: node.id === selected,
      onSelect,
    },
  });

  if (node.children.length === 0) return;

  // Position children
  const totalW = node.children.map(subtreeWidth).reduce((a, b) => a + b, 0)
    + (node.children.length - 1) * H_GAP;

  let startX = cx - totalW / 2;
  for (const child of node.children) {
    const cw = subtreeWidth(child);
    const childCx = startX + cw / 2;

    edges.push({
      id: `e-${node.id}-${child.id}`,
      source: node.id,
      target: child.id,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#334155', strokeWidth: 1.5 },
    });

    buildSubtree(child, childCx, cy + V_GAP, onSelect, selected, nodes, edges);
    startX += cw + H_GAP;
  }
}

// ─── Public builder ───────────────────────────────────────────────────────────

export function buildFlowGraph(
  servers: ServerNode[],
  onSelect: (id: string) => void,
  selected: string | null
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Synthetic Load Balancer node at top
  nodes.push({
    id: '__lb__',
    type: 'lbNode',
    position: { x: LB_X - 76, y: LB_Y },
    data: {},
    draggable: false,
  });

  if (servers.length === 0) return { nodes, edges };

  // Layout root servers at depth 1
  const rootWidths = servers.map(subtreeWidth);
  const totalRootW = rootWidths.reduce((a, b) => a + b, 0) + (servers.length - 1) * H_GAP;
  let startX = LB_X - totalRootW / 2;

  for (let i = 0; i < servers.length; i++) {
    const server = servers[i];
    const rw = rootWidths[i];
    const rootCx = startX + rw / 2;

    edges.push({
      id: `e-lb-${server.id}`,
      source: '__lb__',
      target: server.id,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#1d4ed8', strokeWidth: 2 },
    });

    buildSubtree(server, rootCx, LB_Y + V_GAP, onSelect, selected, nodes, edges);
    startX += rw + H_GAP;
  }

  return { nodes, edges };
}
