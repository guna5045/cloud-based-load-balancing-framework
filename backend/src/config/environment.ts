import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const serverPorts: Record<string, number> = {
  S1: parseInt(process.env.SERVER_S1_PORT || '3001', 10),
  S2: parseInt(process.env.SERVER_S2_PORT || '3002', 10),
  S3: parseInt(process.env.SERVER_S3_PORT || '3003', 10),
};

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  allowedOrigins: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175',
  ],
  initialServers: (process.env.INITIAL_SERVERS || 'S1,S2,S3')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  serverPorts,
  serverHost: process.env.SERVER_HOST || 'localhost',
  requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || '3000', 10),
  healthCheckIntervalMs: parseInt(process.env.HEALTH_CHECK_INTERVAL_MS || '5000', 10),
  monitorIntervalMs: parseInt(process.env.MONITOR_INTERVAL_MS || '5000', 10),
  overloadThreshold: parseInt(process.env.OVERLOAD_THRESHOLD || '80', 10),
  warningThreshold: parseInt(process.env.WARNING_THRESHOLD || '60', 10),
  recoveryThreshold: parseInt(process.env.RECOVERY_THRESHOLD || '70', 10),
  overloadConfirmationSamples: parseInt(process.env.OVERLOAD_CONFIRMATION_SAMPLES || '2', 10),
  recoveryConfirmationSamples: parseInt(process.env.RECOVERY_CONFIRMATION_SAMPLES || '2', 10),
  maxLoadThreshold: parseInt(process.env.MAX_LOAD_THRESHOLD || '80', 10),
  expansionFactor: parseInt(process.env.EXPANSION_FACTOR || '3', 10),
};

export const getServerBaseUrl = (serverId: string): string => {
  const port = config.serverPorts[serverId] || 3001;
  return `http://${config.serverHost}:${port}`;
};

export const isOriginAllowed = (origin?: string): boolean => {
  if (!origin) return true;
  if (config.allowedOrigins.includes(origin)) return true;
  if (/^http:\/\/localhost:\d+$/.test(origin)) return true;
  if (/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) return true;
  return false;
};
