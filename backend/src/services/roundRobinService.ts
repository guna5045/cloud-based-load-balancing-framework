/**
 * RoundRobinService
 * Phase 4: Real Round Robin Load Balancer & Request Routing
 *
 * Implements the deterministic Round Robin scheduling algorithm.
 * Maintains persistent routing pointer across requests and handles
 * active server filtering.
 */

import { ServerNode } from '../types/server.types';
import { serverRegistry } from './serverRegistry';
import { logger } from '../utils/logger';

export interface NextServerSelection {
  server: ServerNode;
  sequence: number;
  pointerBefore: number;
  pointerAfter: number;
}

class RoundRobinService {
  private currentIndex: number = 0;
  private totalRoutedSequence: number = 0;

  /**
   * Selects the next active server using the Round Robin algorithm.
   * Atomically advances the pointer to ensure sequential distribution:
   * S1 -> S2 -> S3 -> S1 -> S2 -> S3...
   *
   * @returns NextServerSelection or null if no active servers exist.
   */
  public getNextServer(): NextServerSelection | null {
    const activeServers = serverRegistry.getActiveServers();

    if (activeServers.length === 0) {
      logger.warn('[RoundRobin] No active servers available in the pool');
      return null;
    }

    // Ensure index is within current active bounds (safe if active pool changes)
    const pointerBefore = this.currentIndex % activeServers.length;
    const selectedServer = activeServers[pointerBefore];

    // Increment pointer sequentially and wrap around
    this.currentIndex = (pointerBefore + 1) % activeServers.length;
    this.totalRoutedSequence += 1;

    const pointerAfter = this.currentIndex;

    logger.info(
      `[RoundRobin] Sequence #${this.totalRoutedSequence}: Selected ${selectedServer.id} (pointer: ${pointerBefore} -> ${pointerAfter}, pool size: ${activeServers.length})`
    );

    return {
      server: selectedServer,
      sequence: this.totalRoutedSequence,
      pointerBefore,
      pointerAfter,
    };
  }

  /**
   * Peeks the next server that would be chosen without advancing the pointer.
   */
  public peekNextServer(): ServerNode | null {
    const activeServers = serverRegistry.getActiveServers();
    if (activeServers.length === 0) return null;
    const idx = this.currentIndex % activeServers.length;
    return activeServers[idx];
  }

  /**
   * Returns current internal pointer index.
   */
  public getCurrentIndex(): number {
    return this.currentIndex;
  }

  /**
   * Returns total cumulative routing sequence count.
   */
  public getSequence(): number {
    return this.totalRoutedSequence;
  }

  /**
   * Resets pointer and sequence (useful for testing and simulation resets).
   */
  public reset(): void {
    this.currentIndex = 0;
    this.totalRoutedSequence = 0;
    logger.info('[RoundRobin] Pointer reset to 0');
  }

  /**
   * Returns the canonical algorithm identifier.
   */
  public getAlgorithmName(): 'round-robin' {
    return 'round-robin';
  }
}

export const roundRobinService = new RoundRobinService();
