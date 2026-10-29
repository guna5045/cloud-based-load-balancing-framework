import http from 'http';
import app from './app';
import { config, getServerBaseUrl } from './config/environment';
import { initWebSocket } from './websocket/socketHandler';
import { monitoringService } from './services/monitoringService';
import { scalingService } from './services/scalingService';
import { serverProcessManager } from './services/serverProcessManager';
import { logger } from './utils/logger';

const server = http.createServer(app);

// Initialize Socket.IO real-time engine
initWebSocket(server);

const PORT = Number(process.env.PORT || config.port || 5000);
const HOST = config.host || '0.0.0.0';

/**
 * Ensures initial root cluster servers (S1, S2, S3) are active and healthy.
 * If already running (e.g. multi-process local dev), leaves them undisturbed.
 * If not running (e.g. single-container Render production), spawns them internally.
 */
export const ensureInitialServers = async (): Promise<void> => {
  logger.info('[ClusterInit] Verifying root server instances (S1, S2, S3)...');
  for (const sId of config.initialServers) {
    const port = config.serverPorts[sId] || 3001;
    let isAlive = false;
    try {
      const res = await fetch(`http://localhost:${port}/health`, {
        signal: AbortSignal.timeout(1000),
      });
      if (res.ok) {
        isAlive = true;
      }
    } catch {
      isAlive = false;
    }

    if (isAlive) {
      logger.info(`[ClusterInit] Root server ${sId} is already running on internal port ${port}`);
    } else {
      logger.info(`[ClusterInit] Spawning root server ${sId} on internal port ${port}...`);
      try {
        await serverProcessManager.spawnServer(sId, port);
        const deadline = Date.now() + 8000;
        let ready = false;
        while (Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 200));
          try {
            const res = await fetch(`http://localhost:${port}/health`, {
              signal: AbortSignal.timeout(400),
            });
            if (res.ok) {
              ready = true;
              break;
            }
          } catch {
            // Awaiting startup
          }
        }
        if (ready) {
          logger.info(`[ClusterInit] Root server ${sId} is online and healthy on internal port ${port}`);
        } else {
          logger.warn(`[ClusterInit] Root server ${sId} process spawned on port ${port}, awaiting health recovery...`);
        }
      } catch (err) {
        logger.error(`[ClusterInit] Failed to spawn root server ${sId}:`, err);
      }
    }
  }
};

// Start listening on Render / configured PORT and 0.0.0.0
server.listen(PORT, HOST, async () => {
  logger.info(`=======================================================`);
  logger.info(`Cloud-Based Load Balancing Framework - Load Balancer`);
  logger.info(`Phase 6: Real-Time Server Monitoring & Overload Detection`);
  logger.info(`Public Host Binding: http://${HOST}:${PORT}`);
  logger.info(`Health check:        http://${HOST}:${PORT}/api/health`);
  logger.info(`Requests API:        http://${HOST}:${PORT}/api/requests`);
  logger.info(`Routing Metrics:     http://${HOST}:${PORT}/api/metrics`);
  logger.info(`Monitoring History:  http://${HOST}:${PORT}/api/metrics/history`);
  logger.info(`Target Servers:`);
  for (const sId of config.initialServers) {
    logger.info(`  - ${sId}:             ${getServerBaseUrl(sId)}`);
  }
  logger.info(`Environment:         ${config.nodeEnv}`);
  logger.info(`Monitoring Interval: ${config.monitorIntervalMs}ms`);
  logger.info(`Overload Threshold:  ${config.overloadThreshold}%`);
  logger.info(`Recovery Threshold:  ${config.recoveryThreshold}%`);
  logger.info(`Allowed Origin:      ${config.frontendUrl}`);
  logger.info(`=======================================================`);

  // Ensure root server cluster instances (S1, S2, S3) are active and healthy
  await ensureInitialServers();

  // Start background monitoring service to track real server instances
  monitoringService.start();
});

// Process signal handling for graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down load balancer gracefully...');
  monitoringService.stop();
  try {
    await scalingService.terminateAll();
  } catch (err) {
    logger.error('Error terminating dynamically scaled processes:', err);
  }
  try {
    await serverProcessManager.terminateAll();
  } catch (err) {
    logger.error('Error terminating managed server processes:', err);
  }
  server.close(() => {
    logger.info('HTTP and WebSocket servers closed');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export { server, app };
