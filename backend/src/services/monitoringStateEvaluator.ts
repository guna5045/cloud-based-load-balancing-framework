/**
 * Monitoring State Evaluator
 * Phase 6: Real-Time Server Monitoring & Overload Detection
 *
 * Implements deterministic state machine transitions with hysteresis / confirmation
 * sample tracking to prevent flapping between healthy, warning, and overloaded states.
 */

import { ServerStatus } from '../types/server.types';
import { config } from '../config/environment';

export interface StateEvaluationResult {
  previousStatus: ServerStatus;
  newStatus: ServerStatus;
  statusChanged: boolean;
  overloadTransition: boolean; // True ONLY on transition INTO overloaded
  recoveryTransition: boolean; // True on transition OUT OF overloaded or offline
  utilization: number;
}

export interface ServerStateTracker {
  status: ServerStatus;
  consecutiveOverloadCount: number;
  consecutiveRecoveryCount: number;
}

export class MonitoringStateEvaluator {
  private overloadThreshold: number;
  private warningThreshold: number;
  private recoveryThreshold: number;
  private overloadConfirmationSamples: number;
  private recoveryConfirmationSamples: number;

  private serverStates: Map<string, ServerStateTracker> = new Map();

  constructor(options?: {
    overloadThreshold?: number;
    warningThreshold?: number;
    recoveryThreshold?: number;
    overloadConfirmationSamples?: number;
    recoveryConfirmationSamples?: number;
  }) {
    this.overloadThreshold = options?.overloadThreshold ?? config.overloadThreshold;
    this.warningThreshold = options?.warningThreshold ?? config.warningThreshold;
    this.recoveryThreshold = options?.recoveryThreshold ?? config.recoveryThreshold;
    this.overloadConfirmationSamples =
      options?.overloadConfirmationSamples ?? config.overloadConfirmationSamples;
    this.recoveryConfirmationSamples =
      options?.recoveryConfirmationSamples ?? config.recoveryConfirmationSamples;
  }

  /**
   * Resets internal tracker for all servers (or a specific server).
   */
  public reset(serverId?: string): void {
    if (serverId) {
      this.serverStates.delete(serverId);
    } else {
      this.serverStates.clear();
    }
  }

  /**
   * Returns tracker state for testing or inspection.
   */
  public getTracker(serverId: string): ServerStateTracker {
    let tracker = this.serverStates.get(serverId);
    if (!tracker) {
      tracker = {
        status: 'healthy',
        consecutiveOverloadCount: 0,
        consecutiveRecoveryCount: 0,
      };
      this.serverStates.set(serverId, tracker);
    }
    return tracker;
  }

  /**
   * Evaluates next status for a reachable server given its current utilization.
   *
   * @param serverId Server identifier
   * @param utilization Normalized utilization (0 - 100)
   * @param currentKnownStatus Current status from registry
   */
  public evaluateStatus(
    serverId: string,
    utilization: number,
    currentKnownStatus?: ServerStatus
  ): StateEvaluationResult {
    const tracker = this.getTracker(serverId);
    if (currentKnownStatus && currentKnownStatus !== tracker.status) {
      tracker.status = currentKnownStatus;
    }

    const prevStatus = tracker.status;
    let nextStatus = prevStatus;
    let overloadTransition = false;
    let recoveryTransition = false;

    // Scaled parent servers remain in 'scaled' state (scale-down is not supported)
    if (prevStatus === 'scaled' || currentKnownStatus === 'scaled') {
      tracker.status = 'scaled';
      return {
        previousStatus: 'scaled',
        newStatus: 'scaled',
        statusChanged: false,
        overloadTransition: false,
        recoveryTransition: false,
        utilization,
      };
    }

    // If server was offline and is now being evaluated with valid utilization, it has recovered
    if (prevStatus === 'offline') {
      nextStatus =
        utilization >= this.overloadThreshold
          ? 'overloaded'
          : utilization >= this.warningThreshold
          ? 'warning'
          : 'healthy';
      tracker.status = nextStatus;
      tracker.consecutiveOverloadCount = utilization >= this.overloadThreshold ? 1 : 0;
      tracker.consecutiveRecoveryCount = 0;
      return {
        previousStatus: prevStatus,
        newStatus: nextStatus,
        statusChanged: true,
        overloadTransition: nextStatus === 'overloaded',
        recoveryTransition: true,
        utilization,
      };
    }

    // 1. Current state is OVERLOADED
    if (prevStatus === 'overloaded') {
      if (utilization < this.recoveryThreshold) {
        tracker.consecutiveRecoveryCount += 1;
        if (tracker.consecutiveRecoveryCount >= this.recoveryConfirmationSamples) {
          // Exiting overloaded state
          nextStatus = utilization >= this.warningThreshold ? 'warning' : 'healthy';
          tracker.status = nextStatus;
          tracker.consecutiveRecoveryCount = 0;
          tracker.consecutiveOverloadCount = 0;
          recoveryTransition = true;
        }
      } else {
        // Still at or above recovery threshold -> reset recovery counter
        tracker.consecutiveRecoveryCount = 0;
      }
    }
    // 2. Current state is HEALTHY or WARNING
    else {
      // Check for overload condition
      if (utilization >= this.overloadThreshold) {
        tracker.consecutiveOverloadCount += 1;
        tracker.consecutiveRecoveryCount = 0;

        if (tracker.consecutiveOverloadCount >= this.overloadConfirmationSamples) {
          nextStatus = 'overloaded';
          tracker.status = nextStatus;
          tracker.consecutiveOverloadCount = 0;
          overloadTransition = true;
        } else {
          // If 1st sample above overload threshold, transition to warning if not already
          if (prevStatus === 'healthy') {
            nextStatus = 'warning';
            tracker.status = nextStatus;
          }
        }
      }
      // Check for warning condition (between warning and overload)
      else if (utilization >= this.warningThreshold) {
        tracker.consecutiveOverloadCount = 0;
        tracker.consecutiveRecoveryCount = 0;
        nextStatus = 'warning';
        tracker.status = nextStatus;
      }
      // Below warning threshold -> healthy
      else {
        tracker.consecutiveOverloadCount = 0;
        tracker.consecutiveRecoveryCount = 0;
        nextStatus = 'healthy';
        tracker.status = nextStatus;
      }
    }

    return {
      previousStatus: prevStatus,
      newStatus: nextStatus,
      statusChanged: prevStatus !== nextStatus,
      overloadTransition,
      recoveryTransition,
      utilization,
    };
  }

  /**
   * Directly marks a server as offline.
   */
  public markOffline(serverId: string): StateEvaluationResult {
    const tracker = this.getTracker(serverId);
    const prevStatus = tracker.status;
    tracker.status = 'offline';
    tracker.consecutiveOverloadCount = 0;
    tracker.consecutiveRecoveryCount = 0;

    return {
      previousStatus: prevStatus,
      newStatus: 'offline',
      statusChanged: prevStatus !== 'offline',
      overloadTransition: false,
      recoveryTransition: false,
      utilization: 0,
    };
  }
}

export const monitoringStateEvaluator = new MonitoringStateEvaluator();
