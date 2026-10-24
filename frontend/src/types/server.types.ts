export type ServerStatus = 'healthy' | 'warning' | 'overloaded' | 'offline';

export interface ServerMetrics {
  activeConnections: number;
  totalRequestsHandled: number;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  responseTimeMs: number;
}

export interface ServerNode {
  id: string;
  parentId: string | null;
  status: ServerStatus;
  load: number;
  capacity: number;
  children: ServerNode[];
  createdAt: string;
  metrics?: ServerMetrics;
}

export interface TopologySummary {
  totalServers: number;
  activeServers: number;
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
