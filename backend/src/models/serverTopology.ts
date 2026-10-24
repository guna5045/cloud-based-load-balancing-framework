import { ServerNode, TopologySummary } from '../types/server.types';
import { config } from '../config/environment';

/**
 * ServerTopologyModel
 * 
 * Represents the cloud server topology as a hierarchical tree data structure.
 * Initial state contains root servers (S1, S2, S3).
 * Recursive children can be attached to any active server node.
 * 
 * NOTE: Automatic load balancing and dynamic recursive child creation
 * will be fully implemented in subsequent phases.
 */
class ServerTopologyModel {
  private rootServers: ServerNode[] = [];

  constructor() {
    this.initialize();
  }

  /**
   * Initializes the root servers based on environment configuration (default: S1, S2, S3)
   */
  public initialize(): void {
    const timestamp = new Date().toISOString();
    this.rootServers = config.initialServers.map((id) => ({
      id,
      parentId: null,
      status: 'healthy',
      load: 0,
      capacity: 100,
      children: [],
      createdAt: timestamp,
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
    }));
  }

  /**
   * Returns root level server nodes
   */
  public getRootServers(): ServerNode[] {
    return this.rootServers;
  }

  /**
   * Recursively finds a server node by ID anywhere in the hierarchy
   */
  public findServer(id: string, nodes: ServerNode[] = this.rootServers): ServerNode | null {
    for (const node of nodes) {
      if (node.id === id) {
        return node;
      }
      if (node.children && node.children.length > 0) {
        const found = this.findServer(id, node.children);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  /**
   * Flattens the recursive server tree into a single list
   */
  public getAllServers(nodes: ServerNode[] = this.rootServers): ServerNode[] {
    const result: ServerNode[] = [];
    for (const node of nodes) {
      result.push(node);
      if (node.children && node.children.length > 0) {
        result.push(...this.getAllServers(node.children));
      }
    }
    return result;
  }

  /**
   * Calculates maximum tree depth
   */
  public calculateMaxDepth(nodes: ServerNode[] = this.rootServers): number {
    if (nodes.length === 0) return 0;
    let maxChildDepth = 0;
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        const childDepth = this.calculateMaxDepth(node.children);
        if (childDepth > maxChildDepth) {
          maxChildDepth = childDepth;
        }
      }
    }
    return 1 + maxChildDepth;
  }

  /**
   * Returns an aggregated summary of the current topology
   */
  public getSummary(): TopologySummary {
    const allServers = this.getAllServers();
    const activeServers = allServers.filter((s) => s.status !== 'offline');
    const totalLoad = allServers.reduce((sum, s) => sum + s.load, 0);
    const averageLoad = allServers.length > 0 ? Math.round((totalLoad / allServers.length) * 100) / 100 : 0;

    return {
      totalServers: allServers.length,
      activeServers: activeServers.length,
      maxDepth: this.calculateMaxDepth(),
      averageLoad,
      servers: this.rootServers,
    };
  }

  /**
   * Resets the topology to its initial state
   */
  public reset(): void {
    this.initialize();
  }
}

export const serverTopology = new ServerTopologyModel();
