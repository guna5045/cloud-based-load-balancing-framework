import { Request, Response } from 'express';
import { topologyService } from '../services/topologyService';
import { serverRegistry } from '../services/serverRegistry';
import { serverTopology } from '../models/serverTopology';
import { serverProcessManager } from '../services/serverProcessManager';
import { portAllocator } from '../services/portAllocator';
import { config } from '../config/environment';
import { logger } from '../utils/logger';
import { getIO } from '../websocket/socketHandler';
import { ServerNode } from '../types/server.types';

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

/**
 * Creates and registers a new root server instance.
 * Spawns a real Node.js process, validates health readiness, registers it into
 * the topology and active routing pool, and broadcasts real-time Socket.IO events.
 */
export const createServer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: rawId, port: rawPort, parentId, capacity } = req.body || {};

    // 1. Validation: parentId
    if (parentId !== undefined && parentId !== null && String(parentId).trim() !== '') {
      res.status(400).json({
        success: false,
        error: 'Manual child creation is not permitted; children are automatically spawned by the recursive scaling engine',
      });
      return;
    }

    // 2. Maximum server limit
    const allServers = serverRegistry.getAllServers();
    if (allServers.length >= config.maxServerProcesses) {
      res.status(429).json({
        success: false,
        error: `Maximum server process limit (${config.maxServerProcesses}) reached`,
      });
      return;
    }

    // 3. Server ID validation / generation
    let serverId: string;
    if (rawId !== undefined && rawId !== null) {
      if (typeof rawId !== 'string' || !/^[A-Za-z0-9_-]+$/.test(rawId.trim())) {
        res.status(400).json({
          success: false,
          error: 'Invalid server ID format. Must contain only alphanumeric characters, underscores, or dashes (1-30 chars)',
        });
        return;
      }
      serverId = rawId.trim();
      if (serverId.length > 30) {
        res.status(400).json({
          success: false,
          error: 'Server ID must not exceed 30 characters',
        });
        return;
      }
      if (serverRegistry.getServer(serverId)) {
        res.status(409).json({
          success: false,
          error: `Server instance with id '${serverId}' already exists`,
        });
        return;
      }
    } else {
      // Auto-generate next root ID (e.g., S4, S5, ...)
      let maxNum = 0;
      for (const s of allServers) {
        const match = /^S(\d+)$/i.exec(s.id);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      let counter = Math.max(maxNum + 1, 4);
      while (serverRegistry.getServer(`S${counter}`)) {
        counter++;
      }
      serverId = `S${counter}`;
    }

    // 4. Port validation / allocation
    let port: number;
    let autoAllocated = false;

    if (rawPort !== undefined && rawPort !== null) {
      port = Number(rawPort);
      if (!Number.isInteger(port) || port < 1024 || port > 65535) {
        res.status(400).json({
          success: false,
          error: 'Invalid port: must be an integer between 1024 and 65535',
        });
        return;
      }

      // Check if port is already configured or used in registry
      const portConflict = allServers.find((s) => s.port === port);
      if (portConflict) {
        res.status(409).json({
          success: false,
          error: `Port ${port} is already in use by server '${portConflict.id}'`,
        });
        return;
      }

      // Check if reserved
      if (portAllocator.getAllocatedPorts().includes(port)) {
        res.status(409).json({
          success: false,
          error: `Port ${port} is currently reserved in the port allocator pool`,
        });
        return;
      }

      // Check OS-level availability
      const isFree = await portAllocator.isPortAvailable(port);
      if (!isFree) {
        res.status(409).json({
          success: false,
          error: `Port ${port} is not available on the host system (already bound by another process)`,
        });
        return;
      }
    } else {
      // Find an available port starting from 3004
      const usedPorts = new Set(allServers.map((s) => s.port).filter(Boolean) as number[]);
      portAllocator.getAllocatedPorts().forEach((p) => usedPorts.add(p));
      usedPorts.add(config.port); // 5000

      let candidate = 3004;
      while (usedPorts.has(candidate) || !(await portAllocator.isPortAvailable(candidate))) {
        candidate++;
        if (candidate > 3999) {
          res.status(500).json({
            success: false,
            error: 'No available ports found for new server process',
          });
          return;
        }
      }
      port = candidate;
      autoAllocated = true;
    }

    // 5. Spawn Real Server Process
    try {
      await serverProcessManager.spawnServer(serverId, port);
    } catch (spawnErr) {
      logger.error(`[ServerController] Failed to spawn process for ${serverId}:`, spawnErr);
      res.status(500).json({
        success: false,
        error: `Failed to spawn process for server '${serverId}': ${
          spawnErr instanceof Error ? spawnErr.message : String(spawnErr)
        }`,
      });
      return;
    }

    // 6. Wait for Health Readiness (poll /health)
    const timeoutMs = config.childStartupTimeoutMs || 5000;
    const start = Date.now();
    let isHealthy = false;

    while (Date.now() - start < timeoutMs) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/health`, {
          signal: AbortSignal.timeout(400),
        });
        if (response.ok) {
          const body = (await response.json()) as { status?: string; serverId?: string };
          if (body.status === 'ok') {
            isHealthy = true;
            break;
          }
        }
      } catch {
        // Retry
      }
      await new Promise((r) => setTimeout(r, 150));
    }

    // 7. Rollback if process failed to become healthy
    if (!isHealthy) {
      logger.error(
        `[ServerController] Server '${serverId}' on port ${port} failed health readiness check. Rolling back...`
      );
      await serverProcessManager.terminateServer(serverId);
      if (autoAllocated) {
        portAllocator.releasePort(port);
      }
      res.status(500).json({
        success: false,
        error: `Server process '${serverId}' started but failed health readiness check within ${timeoutMs}ms. Spawn rolled back.`,
      });
      return;
    }

    // 8. Register Server in Topology & Registry
    const timestamp = new Date().toISOString();
    const serverCapacity = typeof capacity === 'number' && capacity > 0 ? capacity : 100;
    const serverNode: ServerNode = {
      id: serverId,
      parentId: null,
      status: 'healthy',
      load: 0,
      capacity: serverCapacity,
      children: [],
      createdAt: timestamp,
      host: config.serverHost,
      port,
      baseUrl: `http://${config.serverHost}:${port}`,
      metrics: {
        activeConnections: 0,
        totalRequestsHandled: 0,
        cpuUsagePercent: 5,
        memoryUsagePercent: 12,
        responseTimeMs: 15,
        requestCount: 0,
        requestsPerSecond: 0,
        lastRequestAt: null,
      },
      requestCount: 0,
      requestsPerSecond: 0,
      lastRequestAt: null,
    };

    serverRegistry.registerServer(serverNode);
    config.serverPorts[serverId] = port;

    // 9. Emit Socket.IO Events
    try {
      const io = getIO();
      if (io) {
        io.emit('server:status', {
          serverId,
          status: 'healthy',
          reason: 'manual_creation',
          timestamp,
        });
        io.emit('topology:updated', {
          action: 'status_change',
          parentId: '',
          children: [serverId],
          servers: serverTopology.getRootServers(),
          summary: serverTopology.getSummary(),
          timestamp,
        });
      }
    } catch {
      // Socket may not be initialized in test environments
    }

    logger.info(
      `[ServerController] Successfully created and registered server '${serverId}' on port ${port}`
    );

    res.status(201).json({
      success: true,
      message: `Server instance '${serverId}' created and online on port ${port}`,
      data: serverNode,
    });
  } catch (err: unknown) {
    logger.error('[ServerController] Unexpected error in createServer:', err);
    res.status(500).json({
      success: false,
      error: `Internal server error creating server: ${
        err instanceof Error ? err.message : String(err)
      }`,
    });
  }
};

/**
 * Gracefully removes a server instance from the cluster.
 * Ensures the server is marked offline first, terminates its running process,
 * cleans up registry/topology entries, and emits real-time status/topology events.
 */
export const deleteServer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const server = serverRegistry.getServer(id);

    if (!server) {
      res.status(404).json({
        success: false,
        error: `Server instance with id '${id}' not found`,
      });
      return;
    }

    // Cannot remove scaled parent with children
    if ((server.children && server.children.length > 0) || server.status === 'scaled') {
      res.status(400).json({
        success: false,
        error: `Cannot remove scaled parent server '${id}' with active child nodes. Scaled parent servers cannot be removed while children exist.`,
      });
      return;
    }

    // Prevent removing the last active server in the cluster
    const activeLeaves = serverRegistry.getActiveServers();
    if (activeLeaves.length <= 1 && activeLeaves.some((s) => s.id === id)) {
      res.status(400).json({
        success: false,
        error: `Cannot remove the last active server in the load balancer pool. At least one server must remain.`,
      });
      return;
    }

    logger.info(`[ServerController] Initiating removal of server '${id}' on port ${server.port}...`);

    // 1. Immediately mark offline so it is removed from active routing pool
    serverRegistry.setServerStatus(id, 'offline');

    // 2. Terminate the process if managed by ServerProcessManager
    if (serverProcessManager.getProcess(id)) {
      await serverProcessManager.terminateServer(id);
    } else if (server.port) {
      // Attempt HTTP /shutdown for statically started server
      try {
        await fetch(`http://${config.serverHost}:${server.port}/shutdown`, {
          method: 'POST',
          signal: AbortSignal.timeout(1000),
        });
      } catch {
        // Fallback: ignore if already unreachable
      }
    }

    // 3. Remove from topology and registry
    serverRegistry.removeServer(id);
    if (server.port) {
      portAllocator.releasePort(server.port);
    }

    // 4. Emit Socket.IO Events
    const timestamp = new Date().toISOString();
    try {
      const io = getIO();
      if (io) {
        io.emit('server:status', {
          serverId: id,
          status: 'offline',
          reason: 'manual_removal',
          timestamp,
        });
        io.emit('topology:updated', {
          action: 'status_change',
          parentId: '',
          children: [],
          servers: serverTopology.getRootServers(),
          summary: serverTopology.getSummary(),
          timestamp,
        });
      }
    } catch {
      // Ignore if socket not ready
    }

    logger.info(`[ServerController] Successfully removed server '${id}'`);

    res.status(200).json({
      success: true,
      message: `Server instance '${id}' removed successfully`,
      data: { id },
    });
  } catch (err: unknown) {
    logger.error(`[ServerController] Error deleting server '${req.params.id}':`, err);
    res.status(500).json({
      success: false,
      error: `Internal server error deleting server: ${
        err instanceof Error ? err.message : String(err)
      }`,
    });
  }
};
