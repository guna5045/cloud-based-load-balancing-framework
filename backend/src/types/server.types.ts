export type ServerStatus = 'healthy' | 'warning' | 'overloaded' | 'offline';

export interface ServerMetrics {
  activeConnections: number;
  totalRequestsHandled: number;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  responseTimeMs: number;
  requestCount?: number;
  requestsPerSecond?: number;
  lastRequestAt?: string | null;
}

export interface ServerNode {
  id: string;
  parentId: string | null;
  status: ServerStatus;
  load: number; // 0 to 100 percentage
  capacity: number; // max concurrent requests before saturation
  children: ServerNode[];
  createdAt: string;
  metrics?: ServerMetrics;
  requestCount?: number;
  requestsPerSecond?: number;
  lastRequestAt?: string | null;
  host?: string;
  port?: number;
  baseUrl?: string;
}

export interface ServerStatusEvent {
  serverId: string;
  status: ServerStatus;
  reason?: string;
  timestamp: string;
}

export interface TopologySummary {
  totalServers: number;
  activeServers: number;
  maxDepth: number;
  averageLoad: number;
  servers: ServerNode[];
}

export interface ClientRequestPayload {
  id: string;
  clientId: string;
  timestamp: string;
  endpoint: string;
  status: 'pending' | 'routed' | 'completed' | 'dropped';
  targetServerId?: string;
}

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  version: string;
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
}
