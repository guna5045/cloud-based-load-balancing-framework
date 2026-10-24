/**
 * topologySimulation.ts
 *
 * Phase 3: Frontend-only simulation state for the Cloud-Based Load Balancing Framework.
 * Contains all data shapes and pure functions that operate on topology state.
 * No backend calls — designed to be swappable with real Socket.IO/REST in Phase 8.
 */

import { ServerNode, ServerStatus } from '../types/server.types';
import { LiveEvent, EventType } from './mockData';

// ─── Traffic rate config ─────────────────────────────────────────────────────

export type TrafficRate = 'low' | 'medium' | 'high';

export const TRAFFIC_RATE_MS: Record<TrafficRate, number> = {
  low: 3000,
  medium: 1500,
  high: 700,
};

// ─── Request particle (visual only) ─────────────────────────────────────────

export interface RequestParticle {
  id: string;
  /** IDs of nodes along the path: ['__lb__', 'S1', 'S1.2'] */
  path: string[];
  /** Current segment index (0 = LB→first-server, etc.) */
  segmentIndex: number;
  /** Timestamp when this particle was created */
  createdAt: number;
  /** Target server ID */
  targetServerId: string;
  /** Mock request number */
  requestNumber: number;
}

// ─── Simulation summary ──────────────────────────────────────────────────────

export interface SimulationMetrics {
  totalRequests: number;
  scalingEvents: number;
  activeNodes: number;
  maxDepth: number;
  isRunning: boolean;
  trafficRate: TrafficRate;
}

// ─── Helper: deeply clone a ServerNode tree ──────────────────────────────────

export function cloneTree(nodes: ServerNode[]): ServerNode[] {
  return nodes.map((n) => ({
    ...n,
    children: cloneTree(n.children),
    metrics: n.metrics ? { ...n.metrics } : undefined,
  }));
}

// ─── Helper: walk tree and find a node by ID ─────────────────────────────────

export function findNode(
  nodes: ServerNode[],
  id: string
): ServerNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findNode(n.children, id);
    if (found) return found;
  }
  return null;
}

// ─── Helper: mutate a node inside the tree (returns new tree) ────────────────

export function updateNode(
  nodes: ServerNode[],
  id: string,
  updater: (n: ServerNode) => ServerNode
): ServerNode[] {
  return nodes.map((n) => {
    if (n.id === id) return updater(n);
    return { ...n, children: updateNode(n.children, id, updater) };
  });
}

// ─── Helper: count total nodes ───────────────────────────────────────────────

export function countNodes(nodes: ServerNode[]): number {
  return nodes.reduce((acc, n) => acc + 1 + countNodes(n.children), 0);
}

// ─── Helper: get max depth of tree ──────────────────────────────────────────

export function getMaxDepth(nodes: ServerNode[], depth = 0): number {
  if (nodes.length === 0) return depth;
  return Math.max(...nodes.map((n) => getMaxDepth(n.children, depth + 1)));
}

// ─── Helper: collect all leaf nodes (no children) ───────────────────────────

export function getLeafNodes(nodes: ServerNode[]): ServerNode[] {
  const leaves: ServerNode[] = [];
  const walk = (ns: ServerNode[]) => {
    for (const n of ns) {
      if (n.children.length === 0) leaves.push(n);
      else walk(n.children);
    }
  };
  walk(nodes);
  return leaves;
}

// ─── Helper: pick a random "active" (leaf or non-overloaded) server ─────────

export function pickRouteTarget(nodes: ServerNode[]): ServerNode | null {
  // Prefer leaf nodes (those without children) that are not offline
  const leaves = getLeafNodes(nodes).filter(
    (n) => n.status !== 'offline'
  );
  if (leaves.length === 0) return null;
  return leaves[Math.floor(Math.random() * leaves.length)];
}

// ─── Helper: build hierarchy path for a server ──────────────────────────────

export function getHierarchyPath(
  nodes: ServerNode[],
  targetId: string
): string[] {
  function walk(ns: ServerNode[], path: string[]): string[] | null {
    for (const n of ns) {
      const newPath = [...path, n.id];
      if (n.id === targetId) return newPath;
      const found = walk(n.children, newPath);
      if (found) return found;
    }
    return null;
  }
  return walk(nodes, []) ?? [targetId];
}

// ─── Make a new child node ───────────────────────────────────────────────────

export function makeChildNode(
  parentId: string,
  childIndex: number,
  now: string
): ServerNode {
  const id = `${parentId}.${childIndex}`;
  const load = Math.floor(15 + Math.random() * 20); // 15–35% initial load
  return {
    id,
    parentId,
    status: 'healthy',
    load,
    capacity: 100,
    children: [],
    createdAt: now,
    metrics: {
      activeConnections: Math.floor(load * 0.4),
      totalRequestsHandled: 0,
      cpuUsagePercent: load + Math.floor(Math.random() * 8),
      memoryUsagePercent: Math.floor(load * 0.7 + Math.random() * 10),
      responseTimeMs: Math.floor(60 + Math.random() * 40),
    },
  };
}

// ─── Derive status from load ─────────────────────────────────────────────────

export function statusFromLoad(load: number): ServerStatus {
  if (load >= 80) return 'overloaded';
  if (load >= 70) return 'warning';
  return 'healthy';
}

// ─── Trigger scaling on a server: sets load high and status ─────────────────

export function applyOverload(
  nodes: ServerNode[],
  serverId: string
): ServerNode[] {
  return updateNode(nodes, serverId, (n) => ({
    ...n,
    load: 85 + Math.floor(Math.random() * 10),
    status: 'overloaded' as ServerStatus,
    metrics: n.metrics
      ? {
          ...n.metrics,
          cpuUsagePercent: 88 + Math.floor(Math.random() * 10),
        }
      : undefined,
  }));
}

// ─── Spawn 3 children for an overloaded node ─────────────────────────────────

export function spawnChildren(
  nodes: ServerNode[],
  parentId: string
): ServerNode[] {
  const now = new Date().toISOString();
  const children = [1, 2, 3].map((i) => makeChildNode(parentId, i, now));

  return updateNode(nodes, parentId, (n) => ({
    ...n,
    // After spawning, parent returns to normal monitoring load
    load: Math.floor(20 + Math.random() * 20),
    status: 'healthy' as ServerStatus,
    children: [...n.children, ...children],
    metrics: n.metrics
      ? {
          ...n.metrics,
          cpuUsagePercent: 25 + Math.floor(Math.random() * 15),
        }
      : undefined,
  }));
}

// ─── Gradually nudge loads for "live" feel ───────────────────────────────────

export function nudgeLoads(nodes: ServerNode[]): ServerNode[] {
  return nodes.map((n) => {
    const delta = Math.floor(Math.random() * 7) - 3; // ±3%
    const newLoad = Math.max(5, Math.min(95, n.load + delta));
    const newStatus = n.status === 'overloaded' || n.children.length > 0
      ? n.status
      : statusFromLoad(newLoad);

    return {
      ...n,
      load: newLoad,
      status: newStatus,
      metrics: n.metrics
        ? {
            ...n.metrics,
            cpuUsagePercent: Math.max(5, Math.min(99, n.metrics.cpuUsagePercent + delta)),
            activeConnections: Math.max(
              0,
              n.metrics.activeConnections + Math.floor(Math.random() * 3) - 1
            ),
            totalRequestsHandled: n.metrics.totalRequestsHandled + Math.floor(Math.random() * 5),
          }
        : undefined,
      children: nudgeLoads(n.children),
    };
  });
}

// ─── Build an event for logging ──────────────────────────────────────────────

export function makeEvent(
  type: EventType,
  message: string,
  serverId?: string
): LiveEvent {
  return {
    id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    message,
    timestamp: new Date().toISOString(),
    serverId,
  };
}

// ─── Initial 3-root topology ─────────────────────────────────────────────────

export function buildInitialTopology(): ServerNode[] {
  const now = new Date().toISOString();
  const makeRoot = (
    id: string,
    load: number
  ): ServerNode => ({
    id,
    parentId: null,
    status: statusFromLoad(load),
    load,
    capacity: 100,
    children: [],
    createdAt: now,
    metrics: {
      activeConnections: Math.floor(load * 0.5),
      totalRequestsHandled: Math.floor(Math.random() * 10000) + 1000,
      cpuUsagePercent: load + Math.floor(Math.random() * 8) - 4,
      memoryUsagePercent: Math.floor(load * 0.7 + Math.random() * 12),
      responseTimeMs: Math.floor(70 + load * 0.7 + Math.random() * 30),
    },
  });

  return [
    makeRoot('S1', 42),
    makeRoot('S2', 55),
    makeRoot('S3', 28),
  ];
}
