/**
 * HealthMonitor Service (Compatibility Wrapper)
 * Phase 5/6: Cloud-Based Load Balancing Framework
 *
 * Delegates to the centralized MonitoringService to ensure there is only
 * ONE unified monitoring loop for the entire cluster.
 */

import { monitoringService } from './monitoringService';
import { ServerStatus, ServerStatusEvent } from '../types/server.types';
import { getIO } from '../websocket/socketHandler';

class HealthMonitor {
  /**
   * Starts the centralized monitoring service.
   */
  public start(intervalMs?: number): void {
    monitoringService.start(intervalMs);
  }

  /**
   * Stops the centralized monitoring service.
   */
  public stop(): void {
    monitoringService.stop();
  }

  /**
   * Performs an immediate check of all servers via monitoring service.
   */
  public async checkAllServers(): Promise<void> {
    await monitoringService.checkAllServers();
  }

  /**
   * Broadcasts a 'server:status' event via Socket.IO (compatibility helper).
   */
  public broadcastStatusChange(
    serverId: string,
    status: ServerStatus,
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
      if (io) {
        io.emit('server:status', payload);
      }
    } catch {
      // Ignore if socket not ready
    }
  }
}

export const healthMonitor = new HealthMonitor();
