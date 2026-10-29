/**
 * Routing and Load Balancer Type Definitions
 * Phase 4: Real Round Robin Load Balancer & Request Routing
 */

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
