import { ServerNode, TopologySummary } from '../types/server.types';
import { config, getServerBaseUrl } from '../config/environment';

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
    this.rootServers = config.initialServers.map((id) => {
      const port = config.serverPorts[id] || 3001;
      return {
        id,
        parentId: null,
        status: 'healthy',
        load: 0,
        capacity: 100,
        children: [],
        createdAt: timestamp,
        host: config.serverHost,
        port,
        baseUrl: getServerBaseUrl(id),
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
    });
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
   * Returns all leaf servers (servers with zero children).
   */
  public getLeafServers(nodes: ServerNode[] = this.rootServers): ServerNode[] {
    const leaves: ServerNode[] = [];
    for (const node of nodes) {
      if (!node.children || node.children.length === 0) {
        leaves.push(node);
      } else {
        leaves.push(...this.getLeafServers(node.children));
      }
    }
    return leaves;
  }

  /**
   * Returns all scaled/parent servers (servers with one or more children, or marked scaled).
   */
  public getScaledServers(nodes: ServerNode[] = this.rootServers): ServerNode[] {
    const scaled: ServerNode[] = [];
    for (const node of nodes) {
      if (node.status === 'scaled' || (node.children && node.children.length > 0)) {
        scaled.push(node);
      }
      if (node.children && node.children.length > 0) {
        scaled.push(...this.getScaledServers(node.children));
      }
    }
    return scaled;
  }

  /**
   * Calculates the hierarchical depth of a specific node (Root = 1, S1.1 = 2, S1.1.1 = 3).
   */
  public calculateDepth(nodeId: string): number {
    return nodeId.split('.').length;
  }

  /**
   * Atomically attaches child server nodes to a parent and updates parent status to 'scaled'.
   */
  public attachChildren(parentId: string, children: ServerNode[]): boolean {
    const parent = this.findServer(parentId);
    if (!parent) return false;

    parent.children = children;
    parent.status = 'scaled';
    return true;
  }

  /**
   * Removes a server node from the topology tree by ID.
   */
  public removeServer(id: string): boolean {
    const rootIndex = this.rootServers.findIndex((s) => s.id === id);
    if (rootIndex !== -1) {
      this.rootServers.splice(rootIndex, 1);
      return true;
    }

    const removeRecursive = (nodes: ServerNode[]): boolean => {
      for (const node of nodes) {
        if (node.children && node.children.length > 0) {
          const idx = node.children.findIndex((c) => c.id === id);
          if (idx !== -1) {
            node.children.splice(idx, 1);
            return true;
          }
          if (removeRecursive(node.children)) {
            return true;
          }
        }
      }
      return false;
    };

    return removeRecursive(this.rootServers);
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
    const leafServers = this.getLeafServers();
    const activeServers = allServers.filter((s) => s.status !== 'offline');
    const activeLeafServers = leafServers.filter(
      (s) => s.status !== 'offline' && s.status !== 'scaling'
    );
    const scaledServers = this.getScaledServers();
    const totalLoad = allServers.reduce((sum, s) => sum + s.load, 0);
    const averageLoad =
      allServers.length > 0 ? Math.round((totalLoad / allServers.length) * 100) / 100 : 0;

    return {
      totalServers: allServers.length,
      activeServers: activeServers.length,
      activeLeafServers: activeLeafServers.length,
      rootServers: this.rootServers.length,
      scaledServers: scaledServers.length,
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
