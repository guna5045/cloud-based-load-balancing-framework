import { Request, Response } from 'express';
import { topologyService } from '../services/topologyService';

export const getTopology = (_req: Request, res: Response): void => {
  const summary = topologyService.getSummary();
  res.status(200).json({
    success: true,
    data: summary,
  });
};
