/**
 * MetricsController
 * Phase 4: Exposes system, topology, and real load balancing routing metrics.
 */

import { Request, Response } from 'express';
import { serverTopology } from '../models/serverTopology';
import { loadBalancerService } from '../services/loadBalancerService';
import { monitoringService } from '../services/monitoringService';
import { serverRegistry } from '../services/serverRegistry';

export const getMetrics = (_req: Request, res: Response): void => {
  const summary = serverTopology.getSummary();
  const memory = process.memoryUsage();
  const routingMetrics = loadBalancerService.getRoutingMetrics();
  const clusterSummary = monitoringService.getClusterSummary();

  const servers = serverRegistry.getAllServers();
  const serverMetricsMap: Record<string, unknown> = {};

  for (const s of servers) {
    serverMetricsMap[s.id] = {
      id: s.id,
      load: s.load,
      utilization: s.utilization ?? s.load,
      status: s.status,
      capacity: s.capacity,
      requestsPerSecond: s.requestsPerSecond ?? 0,
      activeRequests: s.activeRequests ?? 0,
      averageProcessingTime: s.averageProcessingTime ?? 0,
      requestCount: s.requestCount ?? 0,
      lastMetricsAt: s.lastMetricsAt,
      lastRequestAt: s.lastRequestAt,
    };
  }

  res.status(200).json({
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      totalRequests: routingMetrics.totalRequests,
      healthyServers: clusterSummary.healthyServers,
      warningServers: clusterSummary.warningServers,
      overloadedServers: clusterSummary.overloadedServers,
      offlineServers: clusterSummary.offlineServers,
      averageUtilization: clusterSummary.averageUtilization,
      servers: serverMetricsMap,
      systemMemoryMB: {
        rss: Math.round(memory.rss / (1024 * 1024)),
        heapTotal: Math.round(memory.heapTotal / (1024 * 1024)),
        heapUsed: Math.round(memory.heapUsed / (1024 * 1024)),
      },
      topology: {
        totalServers: summary.totalServers,
        activeServers: summary.activeServers,
        maxDepth: summary.maxDepth,
        averageLoadPercent: summary.averageLoad,
      },
      routing: routingMetrics,
    },
  });
};

export const getMonitoringHistory = (req: Request, res: Response): void => {
  const serverId = typeof req.query.serverId === 'string' ? req.query.serverId : undefined;
  const limitQuery = req.query.limit;
  const limit = typeof limitQuery === 'string' ? parseInt(limitQuery, 10) : 60;

  const history = monitoringService.getHistory(serverId, limit);

  res.status(200).json({
    success: true,
    count: history.length,
    data: history,
  });
};

