/**
 * Server Instance Types
 * Phase 5: Real Server Instances & HTTP Request Forwarding
 */

export interface ServerHealthResponse {
  status: 'ok' | 'degraded';
  serverId: string;
  port: number;
  uptime: number;
  timestamp: string;
}

export interface ProcessRequestPayload {
  requestId?: string;
  payload?: unknown;
}

export interface ProcessResponse {
  success: boolean;
  requestId: string;
  serverId: string;
  status: 'processed';
  processingTime: number;
  message: string;
  timestamp: string;
  payload?: unknown;
}

export interface LocalRequestRecord {
  requestId: string;
  timestamp: string;
  processingTime: number;
  status: 'processed';
}

export interface LocalTelemetry {
  serverId: string;
  port: number;
  status: 'healthy';
  requestCount: number;
  requestsPerSecond: number;
  activeRequests: number;
  averageProcessingTime: number;
  lastRequestAt: string | null;
  uptime: number;
  memory?: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  cpuUsage?: {
    user: number;
    system: number;
  };
  timestamp: string;
}

