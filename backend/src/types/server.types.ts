export type ServerStatus = 'healthy' | 'warning' | 'overloaded' | 'offline' | 'scaling' | 'scaled';

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
  activeRequests?: number;
  averageProcessingTime?: number;
  utilization?: number;
  lastMetricsAt?: string;
  lastRequestAt?: string | null;
  host?: string;
  port?: number;
  baseUrl?: string;
}

export interface RemoteServerTelemetry {
  serverId: string;
  port: number;
  status: ServerStatus;
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

export interface ServerStatusEvent {
  serverId: string;
  status: ServerStatus;
  reason?: string;
  timestamp: string;
}

export interface ServerMetricsEvent {
  serverId: string;
  load: number;
  utilization: number;
  requestsPerSecond: number;
  activeRequests: number;
  averageProcessingTime: number;
  status: ServerStatus;
  timestamp: string;
  requestCount?: number;
  port?: number;
  uptime?: number;
  memoryUsagePercent?: number;
  cpuUsagePercent?: number;
}

export interface ServerOverloadedEvent {
  serverId: string;
  utilization: number;
  threshold: number;
  status: 'overloaded';
  timestamp: string;
}

export interface MonitoringSample {
  timestamp: string;
  serverId: string;
  utilization: number;
  load: number;
  requestsPerSecond: number;
  activeRequests: number;
  averageProcessingTime: number;
  status: ServerStatus;
}

export interface ClusterMetricsSummary {
  healthyServers: number;
  warningServers: number;
  overloadedServers: number;
  offlineServers: number;
  averageUtilization: number;
  totalRequests: number;
}


export interface TopologySummary {
  totalServers: number;
  activeServers: number;
  activeLeafServers?: number;
  rootServers?: number;
  scaledServers?: number;
  maxDepth: number;
  averageLoad: number;
  servers: ServerNode[];
}

export interface ServerScalingEvent {
  serverId: string;
  status: 'scaling';
  timestamp: string;
}

export interface ServerScaledEvent {
  serverId: string;
  status: 'scaled';
  children: string[];
  timestamp: string;
  servers?: ServerNode[];
  summary?: TopologySummary;
}

export interface ServerScaleFailedEvent {
  serverId: string;
  status: 'scale_failed';
  reason: string;
  timestamp: string;
}

export interface TopologyUpdatedEvent {
  action: 'scale' | 'status_change';
  parentId: string;
  children: string[];
  timestamp: string;
  servers?: ServerNode[];
  summary?: TopologySummary;
}

export interface ScalingHistoryRecord {
  id: string;
  timestamp: string;
  parentId: string;
  children: string[];
  triggerUtilization: number;
  status: 'success' | 'failed';
  durationMs: number;
  reason?: string;
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
