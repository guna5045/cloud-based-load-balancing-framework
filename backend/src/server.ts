import http from 'http';
import app from './app';
import { config } from './config/environment';
import { initWebSocket } from './websocket/socketHandler';
import { logger } from './utils/logger';

const server = http.createServer(app);

// Initialize Socket.IO real-time engine
initWebSocket(server);

// Start listening
server.listen(config.port, () => {
  logger.info(`=======================================================`);
  logger.info(`Cloud-Based Load Balancing Framework - Backend Engine`);
  logger.info(`Phase 1: Project Foundation`);
  logger.info(`Server running at: http://localhost:${config.port}`);
  logger.info(`Health check:      http://localhost:${config.port}/api/health`);
  logger.info(`Topology API:      http://localhost:${config.port}/api/topology`);
  logger.info(`Environment:       ${config.nodeEnv}`);
  logger.info(`Frontend Origin:   ${config.frontendUrl}`);
  logger.info(`=======================================================`);
});

// Process signal handling for graceful shutdown
const shutdown = () => {
  logger.info('Shutting down backend server gracefully...');
  server.close(() => {
    logger.info('HTTP and WebSocket servers closed');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export { server, app };
