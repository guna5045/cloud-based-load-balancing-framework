/**
 * ServerClient Service
 * Phase 5: Real Server Instances & HTTP Request Forwarding
 *
 * Handles HTTP communication between the Load Balancer (:5000)
 * and independent server processes (S1 :3001, S2 :3002, S3 :3003).
 *
 * Implements:
 * - Request forwarding with timeout (AbortController)
 * - Server health checking
 * - Normalized response parsing
 * - Server failure detection
 */

import { ServerNode } from '../types/server.types';
import { config, getServerBaseUrl } from '../config/environment';
import { logger } from '../utils/logger';

export class ServerCommunicationError extends Error {
  public serverId: string;
  public baseUrl: string;
  public isTimeout: boolean;

  constructor(serverId: string, baseUrl: string, message: string, isTimeout: boolean = false) {
    super(`[${serverId} @ ${baseUrl}] ${message}`);
    this.name = 'ServerCommunicationError';
    this.serverId = serverId;
    this.baseUrl = baseUrl;
    this.isTimeout = isTimeout;
  }
}

export interface ForwardedProcessResponse {
  success: boolean;
  requestId: string;
  serverId: string;
  status: 'processed';
  processingTime: number;
  message: string;
  timestamp: string;
  payload?: unknown;
}

export interface ServerHealthCheckResult {
  ok: boolean;
  serverId: string;
  port: number;
  uptime?: number;
  error?: string;
}

export const serverClient = {
  /**
   * Forwards a client request over genuine HTTP to the target server process.
   *
   * @param server Target server instance node
   * @param requestId Unique tracking request ID
   * @param payload Optional client payload
   * @returns ForwardedProcessResponse
   * @throws ServerCommunicationError if server fails or times out
   */
  async forwardRequest(
    server: ServerNode,
    requestId: string,
    payload?: unknown
  ): Promise<ForwardedProcessResponse> {
    const baseUrl = server.baseUrl || getServerBaseUrl(server.id);
    const url = `${baseUrl}/process`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.requestTimeoutMs);

    logger.info(
      `[ServerClient] Forwarding request ${requestId} to ${server.id} via HTTP POST ${url}`
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': requestId,
          'X-Forwarded-By': 'LoadBalancer:5000',
        },
        body: JSON.stringify({
          requestId,
          payload: payload ?? { source: 'load-balancer' },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as ForwardedProcessResponse;

      logger.info(
        `[ServerClient] Server ${server.id} completed ${requestId} in ${data.processingTime}ms`
      );

      return data;
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      const isAbort =
        (error instanceof Error && error.name === 'AbortError') ||
        controller.signal.aborted;
      const message = isAbort
        ? `Request timed out after ${config.requestTimeoutMs}ms`
        : error instanceof Error
        ? error.message
        : String(error);

      logger.error(
        `[ServerClient] HTTP forwarding failed for ${server.id} (${url}): ${message}`
      );

      throw new ServerCommunicationError(server.id, baseUrl, message, isAbort);
    }
  },

  /**
   * Performs an HTTP health check on a server instance.
   *
   * @param server Target server node
   * @returns ServerHealthCheckResult
   */
  async checkHealth(server: ServerNode): Promise<ServerHealthCheckResult> {
    const baseUrl = server.baseUrl || getServerBaseUrl(server.id);
    const url = `${baseUrl}/health`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          ok: false,
          serverId: server.id,
          port: server.port || 3001,
          error: `HTTP ${response.status}`,
        };
      }

      const data = (await response.json()) as {
        status: string;
        serverId: string;
        port: number;
        uptime?: number;
      };

      const isHealthy = data.status === 'ok' && data.serverId === server.id;

      return {
        ok: isHealthy,
        serverId: server.id,
        port: data.port || server.port || 3001,
        uptime: data.uptime,
      };
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      const message =
        error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        serverId: server.id,
        port: server.port || 3001,
        error: message,
      };
    }
  },
};
