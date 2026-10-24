import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  allowedOrigins: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
  ],
  initialServers: (process.env.INITIAL_SERVERS || 'S1,S2,S3')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  maxLoadThreshold: parseInt(process.env.MAX_LOAD_THRESHOLD || '80', 10),
  expansionFactor: parseInt(process.env.EXPANSION_FACTOR || '3', 10),
};

export const isOriginAllowed = (origin?: string): boolean => {
  if (!origin) return true;
  if (config.allowedOrigins.includes(origin)) return true;
  if (/^http:\/\/localhost:\d+$/.test(origin)) return true;
  if (/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) return true;
  return false;
};
