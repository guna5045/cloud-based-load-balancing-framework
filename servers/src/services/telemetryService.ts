/**
 * Telemetry Service
 * Phase 5: Real Server Instances & HTTP Request Forwarding
 *
 * Tracks local server telemetry, rolling RPS, average latency,
 * and bounded request history.
 */

import { serverConfig } from '../config/serverConfig';
import { LocalRequestRecord, LocalTelemetry } from '../types/serverInstance.types';

class TelemetryService {
  private requestCount: number = 0;
  private totalProcessingTimeMs: number = 0;
  private lastRequestAt: string | null = null;
  private activeRequests: number = 0;
  private history: LocalRequestRecord[] = [];
  private readonly maxHistorySize: number = 100;
  private rpsWindow: { count: number; windowStart: number } = {
    count: 0,
    windowStart: Date.now(),
  };
  private prevCpuUsage: NodeJS.CpuUsage = process.cpuUsage();

  /**
   * Increments active concurrent requests.
   */
  public incrementActiveRequests(): void {
    this.activeRequests += 1;
  }

  /**
   * Decrements active concurrent requests (safely clamped to >= 0).
   */
  public decrementActiveRequests(): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
  }

  /**
   * Returns current active in-flight requests count.
   */
  public getActiveRequests(): number {
    return this.activeRequests;
  }

  /**
   * Records a processed request in local server memory.
   */
  public recordRequest(requestId: string, processingTimeMs: number): void {
    const timestamp = new Date().toISOString();
    this.requestCount += 1;
    this.totalProcessingTimeMs += processingTimeMs;
    this.lastRequestAt = timestamp;

    // Rolling RPS calculation (5-second window)
    const nowMs = Date.now();
    if (nowMs - this.rpsWindow.windowStart > 5000) {
      this.rpsWindow = { count: 1, windowStart: nowMs };
    } else {
      this.rpsWindow.count += 1;
    }

    // Record bounded history
    const record: LocalRequestRecord = {
      requestId,
      timestamp,
      processingTime: processingTimeMs,
      status: 'processed',
    };

    this.history.unshift(record);
    if (this.history.length > this.maxHistorySize) {
      this.history.pop();
    }
  }

  /**
   * Returns current local telemetry metrics.
   */
  public getTelemetry(): LocalTelemetry {
    const nowMs = Date.now();
    const elapsedSec = Math.max(1, (nowMs - this.rpsWindow.windowStart) / 1000);
    const requestsPerSecond = Math.round((this.rpsWindow.count / elapsedSec) * 10) / 10;
    const averageProcessingTime =
      this.requestCount > 0
        ? Math.round((this.totalProcessingTimeMs / this.requestCount) * 10) / 10
        : 0;

    const mem = process.memoryUsage();
    const currentCpu = process.cpuUsage(this.prevCpuUsage);
    this.prevCpuUsage = process.cpuUsage();

    return {
      serverId: serverConfig.serverId,
      port: serverConfig.port,
      status: 'healthy',
      requestCount: this.requestCount,
      requestsPerSecond,
      activeRequests: this.activeRequests,
      averageProcessingTime,
      lastRequestAt: this.lastRequestAt,
      uptime: Math.round(process.uptime() * 100) / 100,
      memory: {
        rss: mem.rss,
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
        external: mem.external,
      },
      cpuUsage: {
        user: currentCpu.user,
        system: currentCpu.system,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Returns recent local request history.
   */
  public getHistory(limit: number = 50): LocalRequestRecord[] {
    const safeLimit = Math.max(1, Math.min(limit, this.maxHistorySize));
    return this.history.slice(0, safeLimit);
  }

  /**
   * Resets telemetry metrics (for testing).
   */
  public reset(): void {
    this.requestCount = 0;
    this.totalProcessingTimeMs = 0;
    this.lastRequestAt = null;
    this.activeRequests = 0;
    this.history = [];
    this.rpsWindow = { count: 0, windowStart: Date.now() };
    this.prevCpuUsage = process.cpuUsage();
  }
}

export const telemetryService = new TelemetryService();

