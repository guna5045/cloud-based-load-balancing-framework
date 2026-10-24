/**
 * Server Instance Configuration
 * Phase 5: Real Server Instances & HTTP Request Forwarding
 *
 * Configurable via:
 * 1. CLI positional args: `tsx src/server.ts S1 3001`
 * 2. CLI flags: `--id S1 --port 3001`
 * 3. Environment variables: `SERVER_ID=S1 SERVER_PORT=3001`
 */

import dotenv from 'dotenv';
import path from 'path';

// Load .env if present
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function parseArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  return undefined;
}

// Check positional args: `node server.js [id] [port]`
const positionalId = process.argv[2] && !process.argv[2].startsWith('-') ? process.argv[2] : undefined;
const positionalPort = process.argv[3] && !process.argv[3].startsWith('-') ? process.argv[3] : undefined;

const serverId =
  parseArg('--id') ||
  positionalId ||
  process.env.SERVER_ID ||
  'S1';

// Default port lookup based on server ID if port not explicitly set
const defaultPortMap: Record<string, number> = {
  S1: 3001,
  S2: 3002,
  S3: 3003,
};

const portStr =
  parseArg('--port') ||
  positionalPort ||
  process.env.SERVER_PORT ||
  process.env.PORT ||
  String(defaultPortMap[serverId] || 3001);

const port = parseInt(portStr, 10);

export const serverConfig = {
  serverId,
  port,
  baseDelayMs: parseInt(process.env.SERVER_DELAY_MS || '15', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
};
