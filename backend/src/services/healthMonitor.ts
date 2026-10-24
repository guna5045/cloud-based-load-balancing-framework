/**
 * HealthMonitor Service
 * Phase 5: Real Server Instances & HTTP Request Forwarding
 *
 * Runs periodic health checks on all registered server processes,
 * detects server failures and recoveries, updates the ServerRegistry,
 * and emits Socket.IO 'server:status' events.
 */

import { serverRegistry } from './serverRegistry';
import { serverClient } from './serverClient';
import { config } from '../config/environment';
import { getIO } from '../websocket/socketHandler';
import { ServerStatusEvent } from '../types/server.types';
import { logger } from '../utils/logger';

class HealthMonitor {
  private timer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  /**
   * Starts the background health check loop.
   */
  public start(intervalMs: number = config.healthCheckIntervalMs): void {
    if (this.isRunning) return;
    this.isRunning = true;

    logger.info(`[HealthMonitor] Starting health monitor (interval: ${intervalMs}ms)`);

    // Run first check after a brief startup window
    setTimeout(() => {
      this.checkAllServers().catch((err) =>
        logger.error('[HealthMonitor] Initial health check failed:', err)
      );
    }, 1000);

    this.timer = setInterval(() => {
      this.checkAllServers().catch((err) =>
        logger.error('[HealthMonitor] Periodic health check failed:', err)
      );
    }, intervalMs);

    if (this.timer.unref) {
      this.timer.unref();
    }
  }

  /**
   * Stops the background health check loop.
   */
  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    logger.info('[HealthMonitor] Stopped health monitor');
  }

  /**
   * Performs an immediate health check on all registered servers.
   */
  public async checkAllServers(): Promise<void> {
    const servers = serverRegistry.getAllServers();

    for (const server of servers) {
      const result = await serverClient.checkHealth(server);
      const currentStatus = server.status;

      if (result.ok) {
        // If server was offline or warning, mark it healthy (Recovery)
        if (currentStatus === 'offline') {
          serverRegistry.setServerStatus(server.id, 'healthy');
          logger.info(
            `[HealthMonitor] Server ${server.id} recovered and is now HEALTHY (port: ${result.port})`
          );
          this.broadcastStatusChange(server.id, 'healthy', 'health_check_recovered');
        }
      } else {
        // If server was healthy, mark it offline (Failure detected)
        if (currentStatus === 'healthy' || currentStatus === 'warning') {
          serverRegistry.setServerStatus(server.id, 'offline');
          logger.warn(
            `[HealthMonitor] Server ${server.id} is unreachable (${result.error}), marked OFFLINE`
          );
          this.broadcastStatusChange(server.id, 'offline', result.error || 'unreachable');
        }
      }
    }
  }

  /**
   * Broadcasts a 'server:status' event via Socket.IO.
   */
  public broadcastStatusChange(
    serverId: string,
    status: 'healthy' | 'warning' | 'overloaded' | 'offline',
    reason?: string
  ): void {
    const payload: ServerStatusEvent = {
      serverId,
      status,
      reason,
      timestamp: new Date().toISOString(),
    };

    try {
      const io = getIO();
      io.emit('server:status', payload);
      logger.info(
        `[HealthMonitor] Emitted Socket.IO server:status -> ${serverId} is ${status}`
      );
    } catch {
      logger.debug('[HealthMonitor] Socket.IO server not available for status broadcast');
    }
  }
}

export const healthMonitor = new HealthMonitor();
