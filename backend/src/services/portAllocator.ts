/**
 * Port Allocator Service
 * Phase 7: Automatic Recursive 3-Child Server Scaling
 *
 * Dynamically allocates and releases unique, collision-free TCP ports for
 * child server instances within a configured port range (3100-3999).
 */

import net from 'net';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

export class PortAllocationError extends Error {
  constructor(message: string) {
    super(`[PortAllocator] ${message}`);
    this.name = 'PortAllocationError';
  }
}

export class PortAllocator {
  private allocatedPorts: Set<number> = new Set();
  private portRangeStart: number;
  private portRangeEnd: number;

  constructor(rangeStart?: number, rangeEnd?: number) {
    this.portRangeStart = rangeStart ?? config.childServerPortStart;
    this.portRangeEnd = rangeEnd ?? config.childServerPortEnd;
  }

  /**
   * Checks if a port is currently free on the operating system.
   */
  public async isPortAvailable(port: number): Promise<boolean> {
    if (this.allocatedPorts.has(port)) {
      return false;
    }

    return new Promise<boolean>((resolve) => {
      const server = net.createServer();

      server.once('error', () => {
        resolve(false);
      });

      server.once('listening', () => {
        server.close(() => {
          resolve(true);
        });
      });

      server.listen(port, '127.0.0.1');
    });
  }

  /**
   * Dynamically allocates N available ports in sequence.
   * Reserves the ports to prevent concurrent allocation collisions.
   *
   * @param count Number of ports requested (default 3)
   * @returns Array of allocated port numbers
   * @throws PortAllocationError if not enough ports are available
   */
  public async allocatePorts(count: number = 3): Promise<number[]> {
    const allocated: number[] = [];

    for (let port = this.portRangeStart; port <= this.portRangeEnd; port++) {
      if (allocated.length === count) break;

      if (!this.allocatedPorts.has(port)) {
        const free = await this.isPortAvailable(port);
        if (free) {
          this.allocatedPorts.add(port);
          allocated.push(port);
        }
      }
    }

    if (allocated.length < count) {
      // Rollback any partially allocated ports
      for (const p of allocated) {
        this.allocatedPorts.delete(p);
      }
      throw new PortAllocationError(
        `Unable to allocate ${count} available ports in range ${this.portRangeStart}-${this.portRangeEnd}`
      );
    }

    logger.info(`[PortAllocator] Allocated ${count} ports: [${allocated.join(', ')}]`);
    return allocated;
  }

  /**
   * Releases an allocated port back to the pool.
   */
  public releasePort(port: number): void {
    if (this.allocatedPorts.has(port)) {
      this.allocatedPorts.delete(port);
      logger.info(`[PortAllocator] Released port ${port}`);
    }
  }

  /**
   * Releases multiple allocated ports.
   */
  public releasePorts(ports: number[]): void {
    for (const port of ports) {
      this.releasePort(port);
    }
  }

  /**
   * Returns list of currently allocated ports.
   */
  public getAllocatedPorts(): number[] {
    return Array.from(this.allocatedPorts);
  }

  /**
   * Resets all allocated ports (for tests and teardown).
   */
  public reset(): void {
    this.allocatedPorts.clear();
    logger.info('[PortAllocator] Port allocation pool reset');
  }
}

export const portAllocator = new PortAllocator();
