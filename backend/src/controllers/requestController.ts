/**
 * RequestController
 * Phase 4: Real Round Robin Load Balancer & Request Routing
 *
 * Handles incoming client requests, feeds them to the Round Robin load balancer,
 * and exposes recent routing history.
 */

import { Request, Response, NextFunction } from 'express';
import { loadBalancerService, NoActiveServersError } from '../services/loadBalancerService';
import { logger } from '../utils/logger';

/**
 * POST /api/requests
 * Dispatches an incoming client request through the Round Robin load balancer.
 */
export const submitRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payload = req.body;

    logger.info(`[RequestController] Received POST /api/requests with payload: ${JSON.stringify(payload)}`);

    const result = await loadBalancerService.handleRequest(payload);

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof NoActiveServersError) {
      res.status(503).json({
        success: false,
        error: error.message,
        code: 'SERVICE_UNAVAILABLE',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    logger.error('[RequestController] Error routing request:', error);
    next(error);
  }
};

/**
 * GET /api/requests
 * Returns recent routing history with optional limit query parameter (?limit=50).
 */
export const getRequests = (req: Request, res: Response): void => {
  try {
    const limitQuery = req.query.limit;
    const limit = typeof limitQuery === 'string' ? parseInt(limitQuery, 10) : 50;
    const safeLimit = isNaN(limit) ? 50 : limit;

    const history = loadBalancerService.getRequestHistory(safeLimit);

    res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    logger.error('[RequestController] Error retrieving request history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve request history',
    });
  }
};
