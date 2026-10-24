/**
 * Request Handler
 * Phase 5: Real Server Instances & HTTP Request Forwarding
 *
 * Implements the HTTP endpoints for independent server processes:
 * - GET /health: Health verification and identity reporting
 * - POST /process: Genuine request execution and latency tracking
 * - GET /telemetry: Local metrics inspection
 * - GET /requests: Bounded request history
 */

import { Request, Response } from 'express';
import { serverConfig } from '../config/serverConfig';
import { telemetryService } from '../services/telemetryService';
import { ProcessResponse, ServerHealthResponse } from '../types/serverInstance.types';

export const getHealth = (_req: Request, res: Response): void => {
  const response: ServerHealthResponse = {
    status: 'ok',
    serverId: serverConfig.serverId,
    port: serverConfig.port,
    uptime: Math.round(process.uptime() * 100) / 100,
    timestamp: new Date().toISOString(),
  };

  res.status(200).json(response);
};

export const processRequest = async (req: Request, res: Response): Promise<void> => {
  telemetryService.incrementActiveRequests();
  try {
    const startTime = Date.now();
    const requestId = req.body?.requestId || `REQ-${Date.now()}`;
    const clientPayload = req.body?.payload;

    // Controlled execution delay (10ms - 25ms jitter) demonstrating real processing time
    // Or explicit delayMs if requested (for testing active request concurrency)
    const customDelay = typeof req.body?.delayMs === 'number' ? req.body.delayMs : undefined;
    const jitter = Math.floor(Math.random() * 15);
    const totalDelay = customDelay !== undefined ? customDelay : serverConfig.baseDelayMs + jitter;
    await new Promise((resolve) => setTimeout(resolve, totalDelay));

    const processingTime = Date.now() - startTime;
    const timestamp = new Date().toISOString();

    // Record in server local telemetry
    telemetryService.recordRequest(requestId, processingTime);

    const response: ProcessResponse = {
      success: true,
      requestId,
      serverId: serverConfig.serverId,
      status: 'processed',
      processingTime,
      message: `Request processed by ${serverConfig.serverId}`,
      timestamp,
      payload: clientPayload,
    };

    res.status(200).json(response);
  } finally {
    telemetryService.decrementActiveRequests();
  }
};

export const getTelemetry = (_req: Request, res: Response): void => {
  const telemetry = telemetryService.getTelemetry();
  res.status(200).json({
    success: true,
    data: telemetry,
  });
};

export const getRequests = (req: Request, res: Response): void => {
  const limitQuery = req.query.limit;
  const limit = typeof limitQuery === 'string' ? parseInt(limitQuery, 10) : 50;
  const history = telemetryService.getHistory(limit);

  res.status(200).json({
    success: true,
    count: history.length,
    data: history,
  });
};
