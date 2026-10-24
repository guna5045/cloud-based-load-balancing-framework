/**
 * Server Instance Express Application
 * Phase 5: Real Server Instances & HTTP Request Forwarding
 */

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { serverConfig } from './config/serverConfig';
import { getHealth, processRequest, getTelemetry, getRequests } from './handlers/requestHandler';

const app: Application = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Core endpoints required for load balancer forwarding and health checks
app.get('/health', getHealth);
app.post('/process', processRequest);
app.post('/shutdown', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'shutting_down', serverId: serverConfig.serverId });
  setTimeout(() => {
    process.exit(0);
  }, 100);
});

// Telemetry & diagnostics endpoints
app.get('/telemetry', getTelemetry);
app.get('/requests', getRequests);

// Root informational endpoint
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    service: 'server-instance',
    serverId: serverConfig.serverId,
    port: serverConfig.port,
    status: 'online',
    endpoints: {
      health: '/health',
      process: 'POST /process',
      telemetry: '/telemetry',
      requests: '/requests',
    },
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Endpoint ${req.method} ${req.originalUrl} not found on server ${serverConfig.serverId}`,
  });
});

export default app;
