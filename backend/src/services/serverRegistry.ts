/**
 * ServerRegistry Service
 * Phase 4: Real Round Robin Load Balancer & Request Routing
 *
 * Manages active cloud server instances (initially S1, S2, S3),
 * their operational statuses, and dynamic metrics.
 * Designed for clean extensibility in future scaling phases.
 */

import { ServerNode, ServerStatus } from '../types/server.types';
import { serverTopology } from '../models/serverTopology';
import { logger } from '../utils/logger';

class ServerRegistry {
  private rpsTrackers: Map<string, { count: number; windowStart: number }> = new Map();

  constructor() {
    this.startLoadDecayLoop();
  }

  /**
   * Returns all active/healthy servers eligible to receive traffic.
   * Filters out offline or maintenance nodes.
   */
  public getActiveServers(): ServerNode[] {
    const allServers = serverTopology.getAllServers();
    return allServers.filter((server) => server.status !== 'offline');
  }

  /**
   * Retrieves a specific server by ID.
   */
  public getServer(id: string): ServerNode | null {
    return serverTopology.findServer(id);
  }

  /**
   * Returns all servers in the topology.
   */
  public getAllServers(): ServerNode[] {
    return serverTopology.getAllServers();
  }

  /**
   * Registers a new server instance into the topology pool.
   */
  public registerServer(server: ServerNode): void {
    const existing = this.getServer(server.id);
    if (existing) {
      logger.warn(`[ServerRegistry] Server '${server.id}' is already registered`);
      return;
    }
    // For root-level servers
    if (!server.parentId) {
      serverTopology.getRootServers().push(server);
    } else {
      const parent = this.getServer(server.parentId);
      if (parent) {
        parent.children.push(server);
      } else {
        serverTopology.getRootServers().push(server);
      }
    }
    logger.info(`[ServerRegistry] Registered server instance '${server.id}'`);
  }

  /**
   * Unregisters/removes a server instance or sets it offline.
   */
  public unregisterServer(id: string): boolean {
    const server = this.getServer(id);
    if (!server) return false;
    server.status = 'offline';
    logger.info(`[ServerRegistry] Marked server instance '${id}' as offline`);
    return true;
  }

  /**
   * Sets the status of a server (healthy | warning | overloaded | offline).
   */
  public setServerStatus(id: string, status: ServerStatus): boolean {
    const server = this.getServer(id);
    if (!server) return false;
    server.status = status;
    logger.info(`[ServerRegistry] Updated server '${id}' status to '${status}'`);
    return true;
  }

  /**
   * Updates partial state on a server instance.
   */
  public updateServerState(id: string, updates: Partial<ServerNode>): boolean {
    const server = this.getServer(id);
    if (!server) return false;
    Object.assign(server, updates);
    return true;
  }

  /**
   * Records a processed request on a server instance:
   * - increments requestCount and totalRequestsHandled
   * - updates lastRequestAt
   * - updates responseTimeMs
   * - updates requestsPerSecond
   * - applies a mild simulated load increment (NO auto-scaling triggered)
   */
  public recordRequest(id: string, processingTimeMs: number): void {
    const server = this.getServer(id);
    if (!server) return;

    const now = new Date().toISOString();
    const currentCount = (server.requestCount ?? 0) + 1;
    server.requestCount = currentCount;
    server.lastRequestAt = now;

    // Calculate rolling Requests Per Second (RPS) in 5-second sliding windows
    const nowMs = Date.now();
    let rpsData = this.rpsTrackers.get(id);
    if (!rpsData || nowMs - rpsData.windowStart > 5000) {
      rpsData = { count: 1, windowStart: nowMs };
    } else {
      rpsData.count++;
    }
    this.rpsTrackers.set(id, rpsData);
    const elapsedSec = Math.max(1, (nowMs - rpsData.windowStart) / 1000);
    const calculatedRps = Math.round((rpsData.count / elapsedSec) * 10) / 10;
    server.requestsPerSecond = calculatedRps;

    // Mild simulated load (increases with each request, capped safely below overload threshold)
    // IMPORTANT: Phase 4 strictly prohibits automatic scaling.
    const currentLoad = server.load || 0;
    const newLoad = Math.min(65, currentLoad + 4); // Capped safely at 65% so no overload triggers
    server.load = newLoad;

    if (!server.metrics) {
      server.metrics = {
        activeConnections: 1,
        totalRequestsHandled: currentCount,
        cpuUsagePercent: Math.round(newLoad * 0.8),
        memoryUsagePercent: Math.round(15 + newLoad * 0.4),
        responseTimeMs: processingTimeMs,
        requestCount: currentCount,
        requestsPerSecond: calculatedRps,
        lastRequestAt: now,
      };
    } else {
      server.metrics.totalRequestsHandled = currentCount;
      server.metrics.requestCount = currentCount;
      server.metrics.requestsPerSecond = calculatedRps;
      server.metrics.lastRequestAt = now;
      server.metrics.responseTimeMs = processingTimeMs;
      server.metrics.cpuUsagePercent = Math.round(newLoad * 0.8);
      server.metrics.memoryUsagePercent = Math.round(15 + newLoad * 0.4);
    }
  }

  /**
   * Periodic gentle decay for simulated server load to return towards baseline.
   */
  private startLoadDecayLoop(): void {
    const timer = setInterval(() => {
      const servers = this.getAllServers();
      for (const s of servers) {
        if (s.load > 5) {
          s.load = Math.max(0, s.load - 2);
          if (s.metrics) {
            s.metrics.cpuUsagePercent = Math.max(5, Math.round(s.load * 0.8));
          }
        }
      }
    }, 3000);
    if (timer.unref) {
      timer.unref();
    }
  }

  /**
   * Resets registry to initial state (S1, S2, S3).
   */
  public reset(): void {
    serverTopology.reset();
    this.rpsTrackers.clear();
    logger.info('[ServerRegistry] Reset all server instances to initial baseline');
  }
}

export const serverRegistry = new ServerRegistry();
