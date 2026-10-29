/**
 * Scaling Service
 * Phase 7: Automatic Recursive 3-Child Server Scaling
 *
 * Coordinates automatic recursive scaling across any active server:
 * - Listens for server overload transitions
 * - Enforces pre-scaling validation and concurrency locks
 * - Generates deterministic hierarchical child IDs (S1 -> S1.1, S1.2, S1.3)
 * - Dynamically allocates collision-free ports
 * - Spawns real child server processes and verifies health readiness
 * - Atomically registers child nodes and updates parent to 'scaled'
 * - Maintains bounded scaling history and broadcasts Socket.IO events
 */

import { config } from '../config/environment';
import { serverTopology } from '../models/serverTopology';
import { serverRegistry } from './serverRegistry';
import { portAllocator } from './portAllocator';
import { serverProcessManager } from './serverProcessManager';
import {
  ScalingHistoryRecord,
  ServerNode,
  ServerScaledEvent,
  ServerScaleFailedEvent,
  ServerScalingEvent,
  TopologyUpdatedEvent,
} from '../types/server.types';
import { getIO } from '../websocket/socketHandler';
import { logger } from '../utils/logger';

export interface ScalingEligibilityResult {
  eligible: boolean;
  reason?: string;
}

export interface ScalingExecutionResult {
  success: boolean;
  parentId: string;
  children: string[];
  ports: number[];
  durationMs: number;
  error?: string;
}

export class ScalingService {
  private scalingLocks: Set<string> = new Set();
  private history: ScalingHistoryRecord[] = [];
  private readonly maxHistorySize: number = 100;
  private totalScalingOperations: number = 0;

  /**
   * Generates deterministic child IDs for any parent node in the hierarchy.
   * e.g. S1 -> [S1.1, S1.2, S1.3]
   *      S1.2 -> [S1.2.1, S1.2.2, S1.2.3]
   */
  public generateChildIds(parentId: string): [string, string, string] {
    return [`${parentId}.1`, `${parentId}.2`, `${parentId}.3`];
  }

  /**
   * Checks whether a server node is currently eligible to scale.
   */
  public canScale(serverId: string): ScalingEligibilityResult {
    const server = serverTopology.findServer(serverId);
    if (!server) {
      return { eligible: false, reason: `Server '${serverId}' not found in topology` };
    }

    // 1. A parent with existing children cannot scale again
    if (server.children && server.children.length > 0) {
      return {
        eligible: false,
        reason: `Server '${serverId}' already has ${server.children.length} children and cannot scale again`,
      };
    }

    // 2. Server already in 'scaled' state cannot scale again
    if (server.status === 'scaled') {
      return {
        eligible: false,
        reason: `Server '${serverId}' is already in 'scaled' state`,
      };
    }

    // 3. Concurrent scaling lock check
    if (this.scalingLocks.has(serverId)) {
      return {
        eligible: false,
        reason: `Server '${serverId}' is currently undergoing scaling`,
      };
    }

    // 4. Maximum scaling depth safety limit
    const currentDepth = serverTopology.calculateDepth(serverId);
    if (currentDepth + 1 > config.maxScalingDepth) {
      return {
        eligible: false,
        reason: `Maximum scaling depth of ${config.maxScalingDepth} reached for branch ${serverId}`,
      };
    }

    // 5. Maximum process count safety limit
    const runningCount = serverProcessManager.getRunningCount();
    if (runningCount + 3 > config.maxServerProcesses) {
      return {
        eligible: false,
        reason: `Maximum process count of ${config.maxServerProcesses} would be exceeded`,
      };
    }

    return { eligible: true };
  }

  /**
   * Automatically handles an overload transition event from monitoring.
   */
  public handleOverload(serverId: string, triggerUtilization: number): void {
    const eligibility = this.canScale(serverId);
    if (!eligibility.eligible) {
      logger.info(
        `[ScalingService] Overload event for '${serverId}' received but scaling blocked: ${eligibility.reason}`
      );
      return;
    }

    logger.warn(
      `[ScalingService] Automatic scaling triggered for '${serverId}' (utilization: ${triggerUtilization}%)`
    );

    // Asynchronously execute scaling
    this.scaleServer(serverId, triggerUtilization).catch((err) => {
      logger.error(`[ScalingService] Unexpected failure during scaling of '${serverId}':`, err);
    });
  }

  /**
   * Executes the full atomic 3-child scaling operation for a target parent server.
   */
  public async scaleServer(
    serverId: string,
    triggerUtilization: number = 80
  ): Promise<ScalingExecutionResult> {
    const startTime = Date.now();
    const eligibility = this.canScale(serverId);

    if (!eligibility.eligible) {
      return {
        success: false,
        parentId: serverId,
        children: [],
        ports: [],
        durationMs: 0,
        error: eligibility.reason,
      };
    }

    // Acquire scaling lock for this parent
    this.scalingLocks.add(serverId);

    const parentNode = serverTopology.findServer(serverId)!;
    const previousStatus = parentNode.status;
    parentNode.status = 'scaling';

    const timestamp = new Date().toISOString();
    logger.info(`[ScalingService] Scaling initiated for '${serverId}'`);

    // Broadcast server:scaling event
    this.broadcastScalingEvent({
      serverId,
      status: 'scaling',
      timestamp,
    });

    const childIds = this.generateChildIds(serverId);
    let allocatedPorts: number[] = [];

    try {
      // 1. Allocate 3 dynamic ports
      allocatedPorts = await portAllocator.allocatePorts(3);

      // 2. Spawn 3 child processes concurrently
      const spawnPromises = childIds.map((childId, idx) =>
        serverProcessManager.spawnServer(childId, allocatedPorts[idx])
      );
      await Promise.all(spawnPromises);

      // 3. Await health readiness for all 3 child processes
      const healthPromises = allocatedPorts.map((port) =>
        this.waitForChildHealth(port, config.childStartupTimeoutMs)
      );
      const healthResults = await Promise.all(healthPromises);

      const allHealthy = healthResults.every(Boolean);
      if (!allHealthy) {
        throw new Error('One or more child server processes failed health check readiness');
      }

      // 4. Construct child ServerNode models
      const childNodes: ServerNode[] = childIds.map((childId, idx) => {
        const port = allocatedPorts[idx];
        return {
          id: childId,
          parentId: serverId,
          status: 'healthy',
          load: 0,
          utilization: 0,
          capacity: 100,
          children: [],
          createdAt: new Date().toISOString(),
          host: config.serverHost,
          port,
          baseUrl: `http://${config.serverHost}:${port}`,
          metrics: {
            activeConnections: 0,
            totalRequestsHandled: 0,
            cpuUsagePercent: 0,
            memoryUsagePercent: 15,
            responseTimeMs: 0,
            requestCount: 0,
            requestsPerSecond: 0,
            lastRequestAt: null,
          },
          requestCount: 0,
          requestsPerSecond: 0,
          lastRequestAt: null,
        };
      });

      // 5. Atomically attach children to parent in topology & update parent status
      serverTopology.attachChildren(serverId, childNodes);

      const durationMs = Date.now() - startTime;
      this.totalScalingOperations += 1;

      // 6. Record bounded scaling history
      this.recordHistory({
        id: `SCALE-${Date.now()}-${this.totalScalingOperations}`,
        timestamp: new Date().toISOString(),
        parentId: serverId,
        children: childIds,
        triggerUtilization,
        status: 'success',
        durationMs,
      });

      logger.info(
        `[ScalingService] Successfully scaled '${serverId}' -> [${childIds.join(', ')}] in ${durationMs}ms`
      );

      // 7. Broadcast real-time topology update and server:scaled events with authoritative tree snapshot
      const currentServers = serverTopology.getRootServers();
      const currentSummary = serverTopology.getSummary();

      this.broadcastTopologyUpdated({
        action: 'scale',
        parentId: serverId,
        children: childIds,
        timestamp: new Date().toISOString(),
        servers: currentServers,
        summary: currentSummary,
      });

      this.broadcastScaledEvent({
        serverId,
        status: 'scaled',
        children: childIds,
        timestamp: new Date().toISOString(),
        servers: currentServers,
        summary: currentSummary,
      });

      return {
        success: true,
        parentId: serverId,
        children: childIds,
        ports: allocatedPorts,
        durationMs,
      };
    } catch (error: unknown) {
      const durationMs = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);

      logger.error(`[ScalingService] Scaling failed for '${serverId}': ${errorMsg}`);

      // Rollback: terminate any started processes and release ports
      await Promise.all(childIds.map((id) => serverProcessManager.terminateServer(id)));
      portAllocator.releasePorts(allocatedPorts);

      // Restore parent status
      parentNode.status = previousStatus;

      // Broadcast server:scale_failed event
      this.broadcastScaleFailedEvent({
        serverId,
        status: 'scale_failed',
        reason: errorMsg,
        timestamp: new Date().toISOString(),
      });

      this.recordHistory({
        id: `SCALE-${Date.now()}-FAIL`,
        timestamp: new Date().toISOString(),
        parentId: serverId,
        children: childIds,
        triggerUtilization,
        status: 'failed',
        durationMs,
        reason: errorMsg,
      });

      return {
        success: false,
        parentId: serverId,
        children: childIds,
        ports: allocatedPorts,
        durationMs,
        error: errorMsg,
      };
    } finally {
      // Release scaling lock
      this.scalingLocks.delete(serverId);
    }
  }

  /**
   * Polls child /health endpoint until it responds with status 'ok' or times out.
   */
  private async waitForChildHealth(port: number, timeoutMs: number): Promise<boolean> {
    const start = Date.now();
    const url = `http://localhost:${port}/health`;

    while (Date.now() - start < timeoutMs) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(600) });
        if (res.ok) {
          const body = (await res.json()) as { status: string };
          if (body.status === 'ok') {
            return true;
          }
        }
      } catch {
        // Retry
      }
      await new Promise((r) => setTimeout(r, 150));
    }

    return false;
  }

  /**
   * Records a scaling event into the bounded in-memory log.
   */
  private recordHistory(record: ScalingHistoryRecord): void {
    this.history.unshift(record);
    if (this.history.length > this.maxHistorySize) {
      this.history.pop();
    }
  }

  /**
   * Returns recent scaling history.
   */
  public getHistory(limit: number = 50): ScalingHistoryRecord[] {
    return this.history.slice(0, Math.min(limit, this.maxHistorySize));
  }

  /**
   * Returns total scaling operations count.
   */
  public getTotalOperations(): number {
    return this.totalScalingOperations;
  }

  /**
   * Gracefully shuts down all dynamically scaled child processes and cleans up.
   */
  public async terminateAll(): Promise<void> {
    logger.info('[ScalingService] Terminating all dynamically spawned child processes...');
    await serverProcessManager.terminateAll();
    portAllocator.reset();
    this.scalingLocks.clear();
  }

  /**
   * Resets scaling service state (for testing).
   */
  public async reset(): Promise<void> {
    await this.terminateAll();
    this.history = [];
    this.totalScalingOperations = 0;
  }

  // ─── Socket.IO Broadcast Helpers ──────────────────────────────────────────

  private broadcastScalingEvent(payload: ServerScalingEvent): void {
    try {
      const io = getIO();
      if (io) {
        io.emit('server:scaling', payload);
      }
    } catch {}
  }

  private broadcastScaledEvent(payload: ServerScaledEvent): void {
    try {
      const io = getIO();
      if (io) {
        io.emit('server:scaled', payload);
      }
    } catch {}
  }

  private broadcastScaleFailedEvent(payload: ServerScaleFailedEvent): void {
    try {
      const io = getIO();
      if (io) {
        io.emit('server:scale_failed', payload);
      }
    } catch {}
  }

  private broadcastTopologyUpdated(payload: TopologyUpdatedEvent): void {
    try {
      const io = getIO();
      if (io) {
        io.emit('topology:updated', payload);
      }
    } catch {}
  }
}

export const scalingService = new ScalingService();
