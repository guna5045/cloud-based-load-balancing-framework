import { env } from '../utils/env';
import {
  HealthResponse,
  TopologySummary,
  ServerNode,
  RoutingResult,
  RequestRecord,
  RoutingMetrics,
} from '../types/server.types';

export const apiService = {
  /**
   * Fetches backend health status
   */
  async getHealth(): Promise<HealthResponse> {
    const res = await fetch(`${env.apiUrl}/api/health`);
    if (!res.ok) {
      throw new Error(`Health check failed with status: ${res.status}`);
    }
    return res.json();
  },

  /**
   * Fetches server topology tree
   */
  async getTopology(): Promise<{ success: boolean; data: TopologySummary }> {
    const res = await fetch(`${env.apiUrl}/api/topology`);
    if (!res.ok) {
      throw new Error(`Failed to fetch topology: ${res.status}`);
    }
    return res.json();
  },

  /**
   * Fetches all servers flat list
   */
  async getServers(): Promise<{ success: boolean; count: number; data: ServerNode[] }> {
    const res = await fetch(`${env.apiUrl}/api/servers`);
    if (!res.ok) {
      throw new Error(`Failed to fetch servers: ${res.status}`);
    }
    return res.json();
  },

  /**
   * Fetches a specific server by ID
   */
  async getServerById(id: string): Promise<{ success: boolean; data: ServerNode }> {
    const res = await fetch(`${env.apiUrl}/api/servers/${encodeURIComponent(id)}`);
    if (!res.ok) {
      throw new Error(`Server ${id} not found`);
    }
    return res.json();
  },

  /**
   * Dispatches a real client request through the Round Robin load balancer.
   */
  async submitRequest(payload?: unknown): Promise<RoutingResult> {
    const res = await fetch(`${env.apiUrl}/api/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload ?? { client: 'web-dashboard' }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `Request failed with status ${res.status}`);
    }

    return res.json();
  },

  /**
   * Fetches recent request routing history
   */
  async getRequests(limit: number = 50): Promise<{ success: boolean; count: number; data: RequestRecord[] }> {
    const res = await fetch(`${env.apiUrl}/api/requests?limit=${limit}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch requests: ${res.status}`);
    }
    return res.json();
  },

  /**
   * Fetches real routing metrics and cluster telemetry
   */
  async getMetrics(): Promise<{
    success: boolean;
    data: {
      routing: RoutingMetrics;
      topology: { totalServers: number; activeServers: number; maxDepth: number; averageLoadPercent: number };
      uptimeSeconds: number;
      healthyServers?: number;
      warningServers?: number;
      overloadedServers?: number;
      offlineServers?: number;
      averageUtilization?: number;
      servers?: Record<string, ServerNode>;
    };
  }> {
    const res = await fetch(`${env.apiUrl}/api/metrics`);
    if (!res.ok) {
      throw new Error(`Failed to fetch metrics: ${res.status}`);
    }
    return res.json();
  },

  /**
   * Fetches recent monitoring history samples for charts
   */
  async getMonitoringHistory(serverId?: string, limit: number = 60): Promise<{
    success: boolean;
    count: number;
    data: Array<{
      timestamp: string;
      serverId: string;
      utilization: number;
      load: number;
      requestsPerSecond: number;
      activeRequests: number;
      averageProcessingTime: number;
      status: string;
    }>;
  }> {
    const query = serverId ? `?serverId=${encodeURIComponent(serverId)}&limit=${limit}` : `?limit=${limit}`;
    const res = await fetch(`${env.apiUrl}/api/metrics/history${query}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch monitoring history: ${res.status}`);
    }
    return res.json();
  },
};

