import { Request, Response } from 'express';
import { serverTopology } from '../models/serverTopology';

export const getMetrics = (_req: Request, res: Response): void => {
  const summary = serverTopology.getSummary();
  const memory = process.memoryUsage();

  res.status(200).json({
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
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
    },
  });
};
