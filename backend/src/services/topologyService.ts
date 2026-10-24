import { serverTopology } from '../models/serverTopology';
import { ServerNode, TopologySummary } from '../types/server.types';

/**
 * TopologyService
 * Service layer coordinating server topology operations and metrics.
 * Load balancing algorithm and dynamic scaling logic will be wired here in Phase 2.
 */
export const topologyService = {
  getSummary(): TopologySummary {
    return serverTopology.getSummary();
  },

  getAllServers(): ServerNode[] {
    return serverTopology.getAllServers();
  },

  getServerById(id: string): ServerNode | null {
    return serverTopology.findServer(id);
  },

  getRootServers(): ServerNode[] {
    return serverTopology.getRootServers();
  },
};
