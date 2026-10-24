import http from 'http';
import app from './app';
import { config, getServerBaseUrl } from './config/environment';
import { initWebSocket } from './websocket/socketHandler';
import { monitoringService } from './services/monitoringService';
import { logger } from './utils/logger';

const server = http.createServer(app);

// Initialize Socket.IO real-time engine
initWebSocket(server);

// Start listening
server.listen(config.port, () => {
  logger.info(`=======================================================`);
  logger.info(`Cloud-Based Load Balancing Framework - Load Balancer`);
  logger.info(`Phase 6: Real-Time Server Monitoring & Overload Detection`);
  logger.info(`Load Balancer:     http://localhost:${config.port}`);
  logger.info(`Health check:      http://localhost:${config.port}/api/health`);
  logger.info(`Requests API:      http://localhost:${config.port}/api/requests`);
  logger.info(`Routing Metrics:   http://localhost:${config.port}/api/metrics`);
  logger.info(`Monitoring History:http://localhost:${config.port}/api/metrics/history`);
  logger.info(`Target Servers:`);
  for (const sId of config.initialServers) {
    logger.info(`  - ${sId}:           ${getServerBaseUrl(sId)}`);
  }
  logger.info(`Environment:       ${config.nodeEnv}`);
  logger.info(`Monitoring Interval:${config.monitorIntervalMs}ms`);
  logger.info(`Overload Threshold: ${config.overloadThreshold}%`);
  logger.info(`Recovery Threshold: ${config.recoveryThreshold}%`);
  logger.info(`Frontend Origin:   ${config.frontendUrl}`);
  logger.info(`=======================================================`);

  // Start background monitoring service to track real server instances
  monitoringService.start();
});

// Process signal handling for graceful shutdown
const shutdown = () => {
  logger.info('Shutting down load balancer gracefully...');
  monitoringService.stop();
  server.close(() => {
    logger.info('HTTP and WebSocket servers closed');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export { server, app };
