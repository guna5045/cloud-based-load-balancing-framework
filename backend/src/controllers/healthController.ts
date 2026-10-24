import { Request, Response } from 'express';
import { HealthResponse } from '../types/server.types';
import { config } from '../config/environment';

export const getHealth = (_req: Request, res: Response<HealthResponse>): void => {
  const healthData: HealthResponse = {
    status: 'ok',
    service: 'cloud-based-load-balancing-framework',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: config.nodeEnv,
  };

  res.status(200).json(healthData);
};
