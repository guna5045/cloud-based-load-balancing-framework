import { Request, Response } from 'express';
import { topologyService } from '../services/topologyService';

export const getServers = (_req: Request, res: Response): void => {
  const servers = topologyService.getAllServers();
  res.status(200).json({
    success: true,
    count: servers.length,
    data: servers,
  });
};

export const getServerById = (req: Request, res: Response): void => {
  const { id } = req.params;
  const server = topologyService.getServerById(id);

  if (!server) {
    res.status(404).json({
      success: false,
      error: `Server instance with id '${id}' not found`,
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: server,
  });
};
