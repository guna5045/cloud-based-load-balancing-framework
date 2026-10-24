/**
 * Utilization Service
 * Phase 6: Real-Time Server Monitoring & Overload Detection
 *
 * Provides a deterministic, bounded, application-level utilization formula
 * that converts measurable runtime telemetry into a normalized [0, 100] score.
 *
 * FORMULA SPECIFICATION:
 * ────────────────────────────────────────────────────────────────────────────
 * Utilization is a weighted composite of four real-time operational pressures:
 *
 * 1. Active Concurrency Pressure (Weight: 40%):
 *    Measures instantaneous concurrency against maximum nominal server capacity.
 *    P_active = min(100, (activeRequests / MAX_CONCURRENT_CAPACITY) * 100)
 *    Default MAX_CONCURRENT_CAPACITY = 8 requests.
 *
 * 2. Request Rate Throughput Pressure (Weight: 35%):
 *    Measures rolling throughput (RPS) against nominal throughput threshold.
 *    P_rate = min(100, (requestsPerSecond / NOMINAL_MAX_RPS) * 100)
 *    Default NOMINAL_MAX_RPS = 8.0 req/sec.
 *
 * 3. Latency Pressure (Weight: 15%):
 *    Measures average execution latency above baseline execution floor.
 *    P_latency = min(100, max(0, ((averageProcessingTime - BASE_LATENCY_MS) / (SATURATION_LATENCY_MS - BASE_LATENCY_MS)) * 100))
 *    Default BASE_LATENCY_MS = 15ms, SATURATION_LATENCY_MS = 150ms.
 *
 * 4. Process Memory Pressure (Weight: 10%):
 *    Measures Node.js heap usage ratio (heapUsed / heapTotal).
 *    P_memory = min(100, (heapUsed / heapTotal) * 100)
 *    Default fallback if memory telemetry unavailable: 15%.
 *
 * COMPOSITE FORMULA:
 *    RawUtilization = (0.40 * P_active) + (0.35 * P_rate) + (0.15 * P_latency) + (0.10 * P_memory)
 *
 * NORMALIZATION:
 *    Utilization = Math.min(100, Math.max(0, Math.round(RawUtilization)))
 *
 * Guaranteed Properties:
 * - Deterministic: Same telemetry always yields identical utilization.
 * - Bounded: 0 <= utilization <= 100.
 * - No Math.random().
 */

export interface TelemetryMetricsInput {
  activeRequests?: number;
  requestsPerSecond?: number;
  averageProcessingTime?: number;
  memory?: {
    rss?: number;
    heapUsed?: number;
    heapTotal?: number;
    external?: number;
  };
}

export interface UtilizationBreakdown {
  activePressure: number;
  ratePressure: number;
  latencyPressure: number;
  memoryPressure: number;
  rawUtilization: number;
  normalizedUtilization: number;
}

export class UtilizationService {
  // Reference saturation thresholds
  private readonly maxConcurrentCapacity: number = 8;
  private readonly nominalMaxRps: number = 8.0;
  private readonly baseLatencyMs: number = 15;
  private readonly saturationLatencyMs: number = 150;

  // Relative component weights (sum = 1.0)
  private readonly weightActive: number = 0.40;
  private readonly weightRate: number = 0.35;
  private readonly weightLatency: number = 0.15;
  private readonly weightMemory: number = 0.10;

  /**
   * Calculates normalized utilization (0 - 100) from telemetry input.
   */
  public calculateUtilization(metrics: TelemetryMetricsInput): number {
    return this.getUtilizationBreakdown(metrics).normalizedUtilization;
  }

  /**
   * Returns complete calculation breakdown for testing, debugging, and verification.
   */
  public getUtilizationBreakdown(metrics: TelemetryMetricsInput): UtilizationBreakdown {
    const activeRequests = Math.max(0, metrics.activeRequests ?? 0);
    const requestsPerSecond = Math.max(0, metrics.requestsPerSecond ?? 0);
    const avgLatency = Math.max(0, metrics.averageProcessingTime ?? 0);

    // 1. Active Concurrency Pressure (0 - 100)
    const activePressure = Math.min(
      100,
      (activeRequests / this.maxConcurrentCapacity) * 100
    );

    // 2. Request Rate Throughput Pressure (0 - 100)
    const ratePressure = Math.min(
      100,
      (requestsPerSecond / this.nominalMaxRps) * 100
    );

    // 3. Latency Pressure (0 - 100)
    let latencyPressure = 0;
    if (avgLatency > this.baseLatencyMs) {
      const dynamicSpan = this.saturationLatencyMs - this.baseLatencyMs;
      latencyPressure = Math.min(
        100,
        Math.max(0, ((avgLatency - this.baseLatencyMs) / dynamicSpan) * 100)
      );
    }

    // 4. Memory Heap Pressure (0 - 100)
    let memoryPressure = 15; // baseline nominal 15%
    if (metrics.memory?.heapUsed && metrics.memory?.heapTotal && metrics.memory.heapTotal > 0) {
      memoryPressure = Math.min(
        100,
        Math.max(0, (metrics.memory.heapUsed / metrics.memory.heapTotal) * 100)
      );
    }

    // Weighted composite
    const rawUtilization =
      this.weightActive * activePressure +
      this.weightRate * ratePressure +
      this.weightLatency * latencyPressure +
      this.weightMemory * memoryPressure;

    // Normalization bounded to [0, 100]
    const normalizedUtilization = Math.min(100, Math.max(0, Math.round(rawUtilization)));

    return {
      activePressure: Math.round(activePressure * 10) / 10,
      ratePressure: Math.round(ratePressure * 10) / 10,
      latencyPressure: Math.round(latencyPressure * 10) / 10,
      memoryPressure: Math.round(memoryPressure * 10) / 10,
      rawUtilization: Math.round(rawUtilization * 10) / 10,
      normalizedUtilization,
    };
  }
}

export const utilizationService = new UtilizationService();
