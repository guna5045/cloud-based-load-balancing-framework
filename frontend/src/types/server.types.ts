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
  load: number;
  capacity: number;
  children: ServerNode[];
  createdAt: string;
  host?: string;
  port?: number;
  baseUrl?: string;
  metrics?: ServerMetrics;
  requestCount?: number;
  requestsPerSecond?: number;
  activeRequests?: number;
  averageProcessingTime?: number;
  utilization?: number;
  lastMetricsAt?: string;
  lastRequestAt?: string | null;
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

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  version: string;
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
}

export interface SocketConnectionAck {
  status: string;
  socketId: string;
  timestamp: string;
  message: string;
}

// ─── Phase 4 Routing Types ───────────────────────────────────────────────────

export interface RoutingResult {
  success: boolean;
  requestId: string;
  server: {
    id: string;
  };
  routing: {
    algorithm: 'round-robin';
    sequence: number;
  };
  response: {
    status: 'processed' | 'failed';
    processingTime: number;
    message: string;
    payload?: unknown;
  };
  timestamp: string;
}

export interface RequestRecord {
  requestId: string;
  sequence: number;
  serverId: string;
  algorithm: string;
  processingTime: number;
  status: 'processed' | 'failed';
  timestamp: string;
  clientPayload?: unknown;
}

export interface RoutingMetrics {
  algorithm: string;
  totalRequests: number;
  requestsByServer: Record<string, number>;
  averageResponseTime: number;
  lastRoutedServer: string | null;
  activeServersCount: number;
  lastRequestAt: string | null;
  nextServerId?: string | null;
}

export interface RoutedSocketEvent {
  requestId: string;
  serverId: string;
  algorithm: string;
  sequence: number;
  processingTime: number;
  timestamp: string;
  nextServerId?: string | null;
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

// ─── Phase 7 Scaling Event Types ─────────────────────────────────────────────

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
  action: 'scale' | 'prune' | 'add' | 'status_change';
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

