import { env } from '../utils/env';
import { HealthResponse, TopologySummary, ServerNode } from '../types/server.types';

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
};
