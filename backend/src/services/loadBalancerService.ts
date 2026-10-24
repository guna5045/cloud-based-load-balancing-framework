/**
 * LoadBalancerService
 * Phase 5: Real Server Instances & HTTP Request Forwarding
 *
 * Coordinates request ingress, Round Robin server selection,
 * genuine HTTP forwarding to independent server processes (:3001, :3002, :3003),
 * server failure detection and failover, telemetry tracking,
 * and Socket.IO real-time event distribution.
 */

import { roundRobinService } from './roundRobinService';
import { serverClient, ServerCommunicationError } from './serverClient';
import { serverRegistry } from './serverRegistry';
import { RequestRecord, RoutingMetrics, RoutingResult } from '../types/routing.types';
import { ServerStatusEvent } from '../types/server.types';
import { getIO } from '../websocket/socketHandler';
import { logger } from '../utils/logger';

export class NoActiveServersError extends Error {
  constructor(message = 'Service Unavailable: No active servers available in the load balancing pool') {
    super(message);
    this.name = 'NoActiveServersError';
  }
}

class LoadBalancerService {
  private requestCounter: number = 0;
  private requestHistory: RequestRecord[] = [];
  private readonly maxHistoryLimit: number = 200;

  // Real-time metrics
  private totalRequests: number = 0;
  private requestsByServer: Record<string, number> = {};
  private totalResponseTimeMs: number = 0;
  private lastRoutedServer: string | null = null;
  private lastRequestAt: string | null = null;

  constructor() {
    this.initializeServerCounters();
  }

  private initializeServerCounters(): void {
    const servers = serverRegistry.getAllServers();
    for (const server of servers) {
      if (!(server.id in this.requestsByServer)) {
        this.requestsByServer[server.id] = 0;
      }
    }
  }

  /**
   * Generates a sequential, clean, academic-grade Request ID.
   * e.g. REQ-000001, REQ-000002
   */
  private generateRequestId(): string {
    this.requestCounter += 1;
    return `REQ-${String(this.requestCounter).padStart(6, '0')}`;
  }

  /**
   * Routes a request through the Round Robin load balancer to an independent server process.
   * Handles server failure detection, status broadcast, and healthy-server failover.
   *
   * @param clientPayload optional client payload
   * @returns RoutingResult
   * @throws NoActiveServersError if no active servers are available
   */
  public async handleRequest(clientPayload?: unknown): Promise<RoutingResult> {
    const maxAttempts = Math.max(1, serverRegistry.getActiveServers().length);
    let attempts = 0;
    const requestId = this.generateRequestId();

    while (attempts < maxAttempts) {
      attempts += 1;

      // 1. Get next eligible server via Round Robin scheduler
      const selection = roundRobinService.getNextServer();
      if (!selection) {
        logger.error('[LoadBalancer] Request rejected — no active servers in pool');
        throw new NoActiveServersError();
      }

      const { server, sequence } = selection;

      logger.info(
        `[LoadBalancer] Incoming request ${requestId} assigned to ${server.id} via Round Robin (seq: ${sequence})`
      );

      try {
        // 2. Forward request over actual HTTP to target server process
        const serverResponse = await serverClient.forwardRequest(server, requestId, clientPayload);

        // 3. Update server registry with processed telemetry
        serverRegistry.recordRequest(server.id, serverResponse.processingTime);

        // 4. Update load balancer routing metrics
        this.totalRequests += 1;
        this.requestsByServer[server.id] = (this.requestsByServer[server.id] || 0) + 1;
        this.totalResponseTimeMs += serverResponse.processingTime;
        this.lastRoutedServer = server.id;
        this.lastRequestAt = serverResponse.timestamp;

        // 5. Record bounded in-memory request history
        const record: RequestRecord = {
          requestId,
          sequence,
          serverId: server.id,
          algorithm: 'round-robin',
          processingTime: serverResponse.processingTime,
          status: 'processed',
          timestamp: serverResponse.timestamp,
          clientPayload,
        };

        this.requestHistory.unshift(record);
        if (this.requestHistory.length > this.maxHistoryLimit) {
          this.requestHistory.pop();
        }

        // 6. Emit Socket.IO 'request:routed' event
        try {
          const io = getIO();
          io.emit('request:routed', {
            requestId,
            serverId: server.id,
            algorithm: 'round-robin',
            sequence,
            processingTime: serverResponse.processingTime,
            timestamp: serverResponse.timestamp,
          });
        } catch {
          logger.debug('[LoadBalancer] Socket.IO broadcast skipped (no active socket server)');
        }

        // 7. Return normalized response to client
        const result: RoutingResult = {
          success: true,
          requestId,
          server: {
            id: server.id,
          },
          routing: {
            algorithm: 'round-robin',
            sequence,
          },
          response: {
            status: 'processed',
            processingTime: serverResponse.processingTime,
            message: serverResponse.message,
            payload: serverResponse.payload,
          },
          timestamp: serverResponse.timestamp,
        };

        return result;
      } catch (error: unknown) {
        if (error instanceof ServerCommunicationError) {
          // Failure handling: Mark server offline in registry
          logger.warn(
            `[LoadBalancer] Server ${server.id} failed during request ${requestId}. Marking OFFLINE.`
          );
          serverRegistry.setServerStatus(server.id, 'offline');

          // Emit Socket.IO server:status event
          try {
            const io = getIO();
            const statusEvent: ServerStatusEvent = {
              serverId: server.id,
              status: 'offline',
              reason: error.isTimeout ? 'request_timeout' : 'connection_failed',
              timestamp: new Date().toISOString(),
            };
            io.emit('server:status', statusEvent);
          } catch {
            logger.debug('[LoadBalancer] Socket.IO status emit skipped');
          }

          // Continue loop to failover to next healthy server if available
          continue;
        }

        throw error;
      }
    }

    // All active attempts exhausted
    logger.error(`[LoadBalancer] All server instances failed for request ${requestId}`);
    throw new NoActiveServersError(
      'Service Unavailable: All available servers failed to process the request'
    );
  }

  /**
   * Retrieves recent request history with optional limit.
   */
  public getRequestHistory(limit: number = 50): RequestRecord[] {
    const safeLimit = Math.max(1, Math.min(limit, this.maxHistoryLimit));
    return this.requestHistory.slice(0, safeLimit);
  }

  /**
   * Returns current real-time routing metrics.
   */
  public getRoutingMetrics(): RoutingMetrics {
    const activeServers = serverRegistry.getActiveServers();
    const averageResponseTime =
      this.totalRequests > 0
        ? Math.round((this.totalResponseTimeMs / this.totalRequests) * 10) / 10
        : 0;

    const distribution: Record<string, number> = {};
    for (const s of serverRegistry.getAllServers()) {
      distribution[s.id] = this.requestsByServer[s.id] || 0;
    }

    return {
      algorithm: 'round-robin',
      totalRequests: this.totalRequests,
      requestsByServer: distribution,
      averageResponseTime,
      lastRoutedServer: this.lastRoutedServer,
      activeServersCount: activeServers.length,
      lastRequestAt: this.lastRequestAt,
    };
  }

  /**
   * Resets all routing metrics and history (for tests and clean restarts).
   */
  public reset(): void {
    this.requestCounter = 0;
    this.requestHistory = [];
    this.totalRequests = 0;
    this.requestsByServer = {};
    this.totalResponseTimeMs = 0;
    this.lastRoutedServer = null;
    this.lastRequestAt = null;
    roundRobinService.reset();
    serverRegistry.reset();
    this.initializeServerCounters();
    logger.info('[LoadBalancer] All metrics and request history reset to initial state');
  }
}

export const loadBalancerService = new LoadBalancerService();
