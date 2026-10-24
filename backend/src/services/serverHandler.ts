/**
 * ServerHandler Service
 * Phase 4: Real Round Robin Load Balancer & Request Routing
 *
 * Simulates genuine server instance execution (S1, S2, S3) handling incoming requests.
 * Records realistic processing execution time and updates server telemetry.
 */

import { ServerNode } from '../types/server.types';
import { serverRegistry } from './serverRegistry';
import { logger } from '../utils/logger';

export interface ProcessedServerResponse {
  serverId: string;
  requestId: string;
  message: string;
  payload: unknown;
  timestamp: string;
  processingTime: number;
}

export const serverHandler = {
  /**
   * Processes a request through the selected server instance.
   * Simulates realistic async computation time (10ms - 35ms)
   * and updates server telemetry.
   */
  async processRequest(
    server: ServerNode,
    requestId: string,
    clientPayload?: unknown
  ): Promise<ProcessedServerResponse> {
    const startTime = Date.now();

    // Realistic server processing simulation (random jitter 10ms - 30ms)
    const simulatedDelay = Math.floor(Math.random() * 20) + 10;
    await new Promise((resolve) => setTimeout(resolve, simulatedDelay));

    const processingTime = Date.now() - startTime;
    const timestamp = new Date().toISOString();

    // Update server instance state in the registry
    serverRegistry.recordRequest(server.id, processingTime);

    logger.info(
      `[ServerHandler] Server ${server.id} processed ${requestId} in ${processingTime}ms`
    );

    return {
      serverId: server.id,
      requestId,
      message: `Request processed successfully by server instance ${server.id}`,
      payload: clientPayload ?? { echo: 'ok' },
      timestamp,
      processingTime,
    };
  },
};
