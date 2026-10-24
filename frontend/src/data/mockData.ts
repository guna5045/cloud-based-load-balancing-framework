/**
 * mockData.ts
 *
 * Centralized mock data for Phase 2 UI.
 * All shapes match the backend types exactly so this data can be
 * replaced by real REST / Socket.IO responses in Phase 3.
 */

import { ServerNode, ServerStatus } from '../types/server.types';

// ─── Extended UI types ──────────────────────────────────────────────────────

export type EventType = 'request' | 'warning' | 'scaling' | 'success' | 'error' | 'info';

export interface LiveEvent {
  id: string;
  type: EventType;
  message: string;
  timestamp: string;
  serverId?: string;
}

export interface RequestDistributionEntry {
  serverId: string;
  requests: number;
  percentage: number;
}

export interface TimeSeriesPoint {
  time: string;
  load: number;
  requests: number;
  latency: number;
}

export interface KpiData {
  totalRequests: number;
  activeServers: number;
  avgResponseTimeMs: number;
  systemLoadPercent: number;
  scalingEvents: number;
}

// ─── Mock Server Topology (matches ServerNode exactly) ─────────────────────

export function buildMockTopology(): ServerNode[] {
  const now = new Date().toISOString();

  const makeNode = (
    id: string,
    parentId: string | null,
    load: number,
    status: ServerStatus,
    children: ServerNode[] = []
  ): ServerNode => ({
    id,
    parentId,
    status,
    load,
    capacity: 100,
    children,
    createdAt: now,
    metrics: {
      activeConnections: Math.floor(load * 0.6),
      totalRequestsHandled: Math.floor(Math.random() * 20000) + 1000,
      cpuUsagePercent: load + Math.floor(Math.random() * 10) - 5,
      memoryUsagePercent: Math.floor(load * 0.75 + Math.random() * 15),
      responseTimeMs: Math.floor(80 + load * 0.8 + Math.random() * 40),
    },
  });

  return [
    makeNode('S1', null, 42, 'healthy'),
    makeNode('S2', null, 68, 'warning'),
    makeNode('S3', null, 31, 'healthy'),
  ];
}

// ─── Mock KPIs ──────────────────────────────────────────────────────────────

export const mockKpi: KpiData = {
  totalRequests: 24582,
  activeServers: 3,
  avgResponseTimeMs: 118,
  systemLoadPercent: 47,
  scalingEvents: 4,
};

// ─── Mock Request Distribution ──────────────────────────────────────────────

export const mockRequestDistribution: RequestDistributionEntry[] = [
  { serverId: 'S1', requests: 8194, percentage: 33 },
  { serverId: 'S2', requests: 8401, percentage: 34 },
  { serverId: 'S3', requests: 7987, percentage: 33 },
];

// ─── Mock Time Series ───────────────────────────────────────────────────────

function generateTimeSeries(points = 20): TimeSeriesPoint[] {
  const now = Date.now();
  return Array.from({ length: points }, (_, i) => {
    const t = new Date(now - (points - i) * 30000);
    const hours = t.getHours().toString().padStart(2, '0');
    const mins = t.getMinutes().toString().padStart(2, '0');
    const secs = t.getSeconds().toString().padStart(2, '0');
    return {
      time: `${hours}:${mins}:${secs}`,
      load: Math.floor(35 + Math.sin(i * 0.5) * 20 + Math.random() * 15),
      requests: Math.floor(180 + Math.sin(i * 0.4) * 80 + Math.random() * 40),
      latency: Math.floor(90 + Math.sin(i * 0.6) * 40 + Math.random() * 20),
    };
  });
}

export const mockTimeSeries: TimeSeriesPoint[] = generateTimeSeries(20);

// ─── Mock Live Events ────────────────────────────────────────────────────────

export const mockEvents: LiveEvent[] = [
  {
    id: 'e1',
    type: 'request',
    message: 'Request routed to S1 via Round Robin',
    timestamp: new Date(Date.now() - 2000).toISOString(),
    serverId: 'S1',
  },
  {
    id: 'e2',
    type: 'request',
    message: 'Request routed to S2 via Round Robin',
    timestamp: new Date(Date.now() - 4500).toISOString(),
    serverId: 'S2',
  },
  {
    id: 'e3',
    type: 'request',
    message: 'Request routed to S3 via Round Robin',
    timestamp: new Date(Date.now() - 7000).toISOString(),
    serverId: 'S3',
  },
  {
    id: 'e4',
    type: 'warning',
    message: 'S2 reached 68% load — monitoring threshold',
    timestamp: new Date(Date.now() - 15000).toISOString(),
    serverId: 'S2',
  },
  {
    id: 'e5',
    type: 'info',
    message: 'Load balancer health check passed',
    timestamp: new Date(Date.now() - 30000).toISOString(),
  },
  {
    id: 'e6',
    type: 'scaling',
    message: 'Auto-scaling check — all servers within threshold',
    timestamp: new Date(Date.now() - 60000).toISOString(),
  },
  {
    id: 'e7',
    type: 'success',
    message: 'Topology synchronized with backend',
    timestamp: new Date(Date.now() - 90000).toISOString(),
  },
];
