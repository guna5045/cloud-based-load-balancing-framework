/**
 * Monitoring Service
 * Phase 6: Real-Time Server Monitoring & Overload Detection
 *
 * Centralized cluster monitoring service that observes the load of every active
 * server, calculates utilization deterministically, detects overload transitions
 * using hysteresis confirmation samples, maintains bounded history, and broadcasts
 * real-time events over Socket.IO.
 */

import { serverRegistry } from './serverRegistry';
import { serverClient } from './serverClient';
import { utilizationService } from './utilizationService';
import { monitoringStateEvaluator } from './monitoringStateEvaluator';
import { config } from '../config/environment';
import { getIO } from '../websocket/socketHandler';
import {
  ClusterMetricsSummary,
  MonitoringSample,
  RemoteServerTelemetry,
  ServerMetricsEvent,
  ServerNode,
  ServerOverloadedEvent,
  ServerStatusEvent,
} from '../types/server.types';
import { logger } from '../utils/logger';
import { scalingService } from './scalingService';

class MonitoringService {
  private timer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private historyMap: Map<string, MonitoringSample[]> = new Map();
  private readonly maxSamplesPerServer: number = 60;

  /**
   * Starts the central cluster monitoring loop.
   */
  public start(intervalMs: number = config.monitorIntervalMs): void {
    if (this.isRunning) return;
    this.isRunning = true;

    logger.info(`[MonitoringService] Starting central cluster monitor (interval: ${intervalMs}ms)`);

    // Initial pass shortly after startup
    setTimeout(() => {
      this.checkAllServers().catch((err) =>
        logger.error('[MonitoringService] Initial monitoring check failed:', err)
      );
    }, 1000);

    this.timer = setInterval(() => {
      this.checkAllServers().catch((err) =>
        logger.error('[MonitoringService] Periodic monitoring cycle failed:', err)
      );
    }, intervalMs);

    if (this.timer.unref) {
      this.timer.unref();
    }
  }

  /**
   * Stops the monitoring loop gracefully.
   */
  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    logger.info('[MonitoringService] Stopped cluster monitor');
  }

  /**
   * Performs an immediate monitoring inspection on all registered servers.
   */
  public async checkAllServers(): Promise<void> {
    const servers = serverRegistry.getAllServers();

    for (const server of servers) {
      try {
        await this.inspectServer(server);
      } catch (err) {
        logger.error(`[MonitoringService] Error inspecting server ${server.id}:`, err);
      }
    }
  }

  /**
   * Inspects a single server instance, updates registry, records history, and emits events.
   */
  public async inspectServer(
    server: ServerNode,
    injectedTelemetry?: RemoteServerTelemetry
  ): Promise<{
    status: string;
    utilization: number;
    telemetry: RemoteServerTelemetry | null;
  }> {
    // Obtain telemetry (either from remote process or injected for deterministic test)
    const telemetry = injectedTelemetry ?? (await serverClient.getTelemetry(server));

    // Handle unreachable / offline server
    if (!telemetry) {
      const stateResult = monitoringStateEvaluator.markOffline(server.id);
      if (stateResult.statusChanged) {
        serverRegistry.setServerStatus(server.id, 'offline');
        logger.warn(`[MonitoringService] Server ${server.id} unreachable, marked OFFLINE`);
        this.broadcastStatusEvent({
          serverId: server.id,
          status: 'offline',
          reason: 'server_unreachable',
          timestamp: new Date().toISOString(),
        });
      }
      return { status: 'offline', utilization: 0, telemetry: null };
    }

    // Server is reachable. Calculate deterministic utilization.
    const utilization = utilizationService.calculateUtilization({
      activeRequests: telemetry.activeRequests,
      requestsPerSecond: telemetry.requestsPerSecond,
      averageProcessingTime: telemetry.averageProcessingTime,
      memory: telemetry.memory,
    });

    // Evaluate state machine with hysteresis confirmation samples
    const evalResult = monitoringStateEvaluator.evaluateStatus(
      server.id,
      utilization,
      server.status
    );

    const nowIso = telemetry.timestamp || new Date().toISOString();

    // Update ServerRegistry state
    server.load = utilization;
    server.utilization = utilization;
    server.status = evalResult.newStatus;
    server.requestsPerSecond = telemetry.requestsPerSecond;
    server.activeRequests = telemetry.activeRequests;
    server.averageProcessingTime = telemetry.averageProcessingTime;
    server.lastMetricsAt = nowIso;
    server.lastRequestAt = telemetry.lastRequestAt || server.lastRequestAt;
    server.requestCount = telemetry.requestCount;

    // Update metrics object for backward-compatible dashboard consumers
    if (!server.metrics) {
      server.metrics = {
        activeConnections: telemetry.activeRequests,
        totalRequestsHandled: telemetry.requestCount,
        cpuUsagePercent: Math.round(utilization * 0.8),
        memoryUsagePercent: Math.round(
          telemetry.memory?.heapUsed && telemetry.memory?.heapTotal
            ? (telemetry.memory.heapUsed / telemetry.memory.heapTotal) * 100
            : 20
        ),
        responseTimeMs: telemetry.averageProcessingTime,
        requestCount: telemetry.requestCount,
        requestsPerSecond: telemetry.requestsPerSecond,
        lastRequestAt: telemetry.lastRequestAt,
      };
    } else {
      server.metrics.activeConnections = telemetry.activeRequests;
      server.metrics.totalRequestsHandled = telemetry.requestCount;
      server.metrics.cpuUsagePercent = Math.round(utilization * 0.8);
      server.metrics.responseTimeMs = telemetry.averageProcessingTime;
      server.metrics.requestsPerSecond = telemetry.requestsPerSecond;
      server.metrics.requestCount = telemetry.requestCount;
      server.metrics.lastRequestAt = telemetry.lastRequestAt || server.metrics.lastRequestAt;
    }

    // Record bounded history sample
    this.recordSample({
      timestamp: nowIso,
      serverId: server.id,
      utilization,
      load: utilization,
      requestsPerSecond: telemetry.requestsPerSecond,
      activeRequests: telemetry.activeRequests,
      averageProcessingTime: telemetry.averageProcessingTime,
      status: evalResult.newStatus,
    });

    // Log operational status
    logger.info(
      `[MONITOR] ${server.id} utilization=${utilization}% status=${evalResult.newStatus} (rps=${telemetry.requestsPerSecond}, active=${telemetry.activeRequests}, latency=${telemetry.averageProcessingTime}ms)`
    );

    // Broadcast server:metrics event on every cycle (enriched for Phase 8 real-time integration)
    const metricsPayload: ServerMetricsEvent = {
      serverId: server.id,
      load: utilization,
      utilization,
      requestsPerSecond: telemetry.requestsPerSecond,
      activeRequests: telemetry.activeRequests,
      averageProcessingTime: telemetry.averageProcessingTime,
      status: evalResult.newStatus,
      timestamp: nowIso,
      requestCount: telemetry.requestCount,
      port: server.port,
      cpuUsagePercent: Math.round(utilization * 0.8),
      memoryUsagePercent: Math.round(
        telemetry.memory?.heapUsed && telemetry.memory?.heapTotal
          ? (telemetry.memory.heapUsed / telemetry.memory.heapTotal) * 100
          : 20
      ),
      uptime: telemetry.uptime,
    };
    this.broadcastMetricsEvent(metricsPayload);

    // Overload transition event (emitted ONLY when entering overloaded state)
    if (evalResult.overloadTransition) {
      logger.warn(
        `[MONITOR] ${server.id} crossed overload threshold: ${utilization}% (threshold: ${config.overloadThreshold}%)`
      );
      const overloadPayload: ServerOverloadedEvent = {
        serverId: server.id,
        utilization,
        threshold: config.overloadThreshold,
        status: 'overloaded',
        timestamp: nowIso,
      };
      this.broadcastOverloadedEvent(overloadPayload);
      this.broadcastStatusEvent({
        serverId: server.id,
        status: 'overloaded',
        reason: `overload_threshold_exceeded_${utilization}%`,
        timestamp: nowIso,
      });

      // Phase 7: Automatically trigger 3-child recursive scaling when eligible
      scalingService.handleOverload(server.id, utilization);
    } else if (evalResult.statusChanged) {
      logger.info(
        `[MONITOR] ${server.id} state changed: ${evalResult.previousStatus} -> ${evalResult.newStatus}`
      );
      this.broadcastStatusEvent({
        serverId: server.id,
        status: evalResult.newStatus,
        reason: evalResult.recoveryTransition
          ? 'overload_recovery_confirmed'
          : `state_transition_to_${evalResult.newStatus}`,
        timestamp: nowIso,
      });
    }

    return {
      status: evalResult.newStatus,
      utilization,
      telemetry,
    };
  }

  /**
   * Records a monitoring sample into bounded per-server memory history.
   */
  private recordSample(sample: MonitoringSample): void {
    let list = this.historyMap.get(sample.serverId);
    if (!list) {
      list = [];
      this.historyMap.set(sample.serverId, list);
    }
    list.unshift(sample);
    if (list.length > this.maxSamplesPerServer) {
      list.pop();
    }
  }

  /**
   * Returns bounded monitoring history for a server or all servers.
   */
  public getHistory(serverId?: string, limit: number = 60): MonitoringSample[] {
    const safeLimit = Math.max(1, Math.min(limit, this.maxSamplesPerServer));
    if (serverId) {
      return (this.historyMap.get(serverId) || []).slice(0, safeLimit);
    }
    const all: MonitoringSample[] = [];
    for (const list of this.historyMap.values()) {
      all.push(...list.slice(0, safeLimit));
    }
    return all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Computes high-level cluster metrics summary.
   */
  public getClusterSummary(): ClusterMetricsSummary {
    const servers = serverRegistry.getAllServers();
    let healthy = 0;
    let warning = 0;
    let overloaded = 0;
    let offline = 0;
    let totalUtil = 0;
    let totalReqs = 0;

    for (const s of servers) {
      if (s.status === 'healthy') healthy++;
      else if (s.status === 'warning') warning++;
      else if (s.status === 'overloaded') overloaded++;
      else if (s.status === 'offline') offline++;

      totalUtil += s.utilization ?? s.load ?? 0;
      totalReqs += s.requestCount ?? 0;
    }

    const count = servers.length;
    const averageUtilization = count > 0 ? Math.round((totalUtil / count) * 10) / 10 : 0;

    return {
      healthyServers: healthy,
      warningServers: warning,
      overloadedServers: overloaded,
      offlineServers: offline,
      averageUtilization,
      totalRequests: totalReqs,
    };
  }

  /**
   * Resets all monitoring state and history (for tests).
   */
  public reset(): void {
    monitoringStateEvaluator.reset();
    this.historyMap.clear();
  }

  // ─── Socket.IO Broadcast Helpers ──────────────────────────────────────────

  private broadcastMetricsEvent(payload: ServerMetricsEvent): void {
    try {
      const io = getIO();
      if (io) {
        io.emit('server:metrics', payload);
      }
    } catch {
      // Socket not initialized in standalone unit tests
    }
  }

  private broadcastOverloadedEvent(payload: ServerOverloadedEvent): void {
    try {
      const io = getIO();
      if (io) {
        io.emit('server:overloaded', payload);
      }
    } catch {
      // Socket not initialized in standalone unit tests
    }
  }

  private broadcastStatusEvent(payload: ServerStatusEvent): void {
    try {
      const io = getIO();
      if (io) {
        io.emit('server:status', payload);
      }
    } catch {
      // Socket not initialized in standalone unit tests
    }
  }
}

export const monitoringService = new MonitoringService();
