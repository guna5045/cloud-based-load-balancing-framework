/**
 * Server Instance Entry Point
 * Phase 5: Real Server Instances & HTTP Request Forwarding
 *
 * Launches an independent server process for S1, S2, or S3.
 */

import http from 'http';
import app from './app';
import { serverConfig } from './config/serverConfig';

const server = http.createServer(app);

server.listen(serverConfig.port, () => {
  console.log(`=======================================================`);
  console.log(`Cloud-Based Load Balancing Framework`);
  console.log(`Server Instance Process: [${serverConfig.serverId}]`);
  console.log(`Status:                  ONLINE`);
  console.log(`Port:                    ${serverConfig.port}`);
  console.log(`Health Check:            http://localhost:${serverConfig.port}/health`);
  console.log(`Process Endpoint:        http://localhost:${serverConfig.port}/process`);
  console.log(`Telemetry:               http://localhost:${serverConfig.port}/telemetry`);
  console.log(`=======================================================`);
});

// Graceful shutdown handling
const shutdown = (signal: string) => {
  console.log(`[${serverConfig.serverId}] Received ${signal}, shutting down gracefully...`);
  server.close(() => {
    console.log(`[${serverConfig.serverId}] HTTP server closed cleanly.`);
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export { server, app };
