/**
 * useTopologySimulation.ts
 *
 * Phase 3: Central simulation state hook for the Cloud-Based Load Balancing Framework.
 * All topology mutations, traffic generation, and scaling happen here.
 * No backend calls — pure frontend simulation state.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { ServerNode } from '../types/server.types';
import { LiveEvent } from '../data/mockData';
import {
  TrafficRate,
  TRAFFIC_RATE_MS,
  RequestParticle,
  SimulationMetrics,
  buildInitialTopology,
  cloneTree,
  findNode,
  pickRouteTarget,
  getHierarchyPath,
  applyOverload,
  spawnChildren,
  nudgeLoads,
  countNodes,
  getMaxDepth,
  makeEvent,
} from '../data/topologySimulation';

// ─── Scaling sequence steps ──────────────────────────────────────────────────

type ScalingStep = 'idle' | 'overloading' | 'scaling' | 'spawning' | 'stabilizing';

export interface ScalingState {
  serverId: string | null;
  step: ScalingStep;
}

// ─── Hook return ─────────────────────────────────────────────────────────────

export interface UseTopologySimulationReturn {
  // ── Topology
  servers: ServerNode[];
  resetTopology: () => void;

  // ── Selection
  selectedServerId: string | null;
  setSelectedServerId: (id: string | null) => void;
  selectedServer: ServerNode | null;

  // ── Traffic simulation
  isRunning: boolean;
  trafficRate: TrafficRate;
  startTraffic: () => void;
  pauseTraffic: () => void;
  setTrafficRate: (rate: TrafficRate) => void;

  // ── Request particles
  particles: RequestParticle[];

  // ── Scaling
  scaling: ScalingState;
  triggerScaling: (serverId: string) => void;
  canScale: (serverId: string) => boolean;

  // ── Events & metrics
  events: LiveEvent[];
  metrics: SimulationMetrics;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useTopologySimulation(): UseTopologySimulationReturn {
  const [servers, setServers] = useState<ServerNode[]>(() => buildInitialTopology());
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [trafficRate, setTrafficRate] = useState<TrafficRate>('medium');
  const [particles, setParticles] = useState<RequestParticle[]>([]);
  const [events, setEvents] = useState<LiveEvent[]>([
    makeEvent('info', 'Simulation initialized — Load Balancer ready'),
    makeEvent('success', 'S1, S2, S3 online and healthy'),
  ]);
  const [scaling, setScaling] = useState<ScalingState>({ serverId: null, step: 'idle' });
  const [requestCounter, setRequestCounter] = useState(1000);

  const trafficTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadNudgeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scalingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serversRef = useRef(servers);
  const particlesRef = useRef(particles);
  const requestCounterRef = useRef(requestCounter);
  const isRunningRef = useRef(isRunning);
  const trafficRateRef = useRef(trafficRate);
  const scalingRef = useRef(scaling);

  // Keep refs in sync
  useEffect(() => { serversRef.current = servers; }, [servers]);
  useEffect(() => { particlesRef.current = particles; }, [particles]);
  useEffect(() => { requestCounterRef.current = requestCounter; }, [requestCounter]);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
  useEffect(() => { trafficRateRef.current = trafficRate; }, [trafficRate]);
  useEffect(() => { scalingRef.current = scaling; }, [scaling]);

  // ── Derived: selected server ────────────────────────────────────────────────

  const selectedServer = selectedServerId
    ? findNode(serversRef.current, selectedServerId)
    : null;

  // ── Derived: simulation metrics ─────────────────────────────────────────────

  const metrics: SimulationMetrics = {
    totalRequests: requestCounter,
    scalingEvents: events.filter((e) => e.type === 'scaling').length,
    activeNodes: countNodes(servers),
    maxDepth: getMaxDepth(servers),
    isRunning,
    trafficRate,
  };

  // ── Add event helper ────────────────────────────────────────────────────────

  const addEvent = useCallback((e: LiveEvent) => {
    setEvents((prev) => [e, ...prev.slice(0, 99)]);
  }, []);

  // ── Emit one request particle ───────────────────────────────────────────────

  const emitParticle = useCallback(() => {
    const target = pickRouteTarget(serversRef.current);
    if (!target) return;

    const pathIds = ['__lb__', ...getHierarchyPath(serversRef.current, target.id)];
    const reqNum = requestCounterRef.current + 1;
    setRequestCounter(reqNum);

    const particle: RequestParticle = {
      id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      path: pathIds,
      segmentIndex: 0,
      createdAt: Date.now(),
      targetServerId: target.id,
      requestNumber: reqNum,
    };

    setParticles((prev) => [...prev.slice(-8), particle]); // max 9 particles

    // Add event for significant requests (every 10th)
    if (reqNum % 10 === 0) {
      addEvent(
        makeEvent('request', `[SIM] Request #${reqNum} dispatched → ${target.id}`, target.id)
      );
    }

    // Auto-remove particle after animation completes
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id !== particle.id));
    }, 1800);
  }, [addEvent]);

  // ── Start traffic timer ─────────────────────────────────────────────────────

  const startTrafficTimer = useCallback(
    (rate: TrafficRate) => {
      if (trafficTimerRef.current) clearInterval(trafficTimerRef.current);
      trafficTimerRef.current = setInterval(emitParticle, TRAFFIC_RATE_MS[rate]);
    },
    [emitParticle]
  );

  // ── Start/pause controls ────────────────────────────────────────────────────

  const startTraffic = useCallback(() => {
    setIsRunning(true);
    startTrafficTimer(trafficRateRef.current);
    addEvent(makeEvent('info', '[SIM] Traffic simulation started'));
  }, [startTrafficTimer, addEvent]);

  const pauseTraffic = useCallback(() => {
    setIsRunning(false);
    if (trafficTimerRef.current) {
      clearInterval(trafficTimerRef.current);
      trafficTimerRef.current = null;
    }
    addEvent(makeEvent('info', '[SIM] Traffic simulation paused'));
  }, [addEvent]);

  const setTrafficRateFn = useCallback(
    (rate: TrafficRate) => {
      setTrafficRate(rate);
      trafficRateRef.current = rate;
      if (isRunningRef.current) {
        startTrafficTimer(rate);
      }
    },
    [startTrafficTimer]
  );

  // ── Reset topology ──────────────────────────────────────────────────────────

  const resetTopology = useCallback(() => {
    if (trafficTimerRef.current) clearInterval(trafficTimerRef.current);
    if (scalingTimeoutRef.current) clearTimeout(scalingTimeoutRef.current);
    trafficTimerRef.current = null;
    setIsRunning(false);
    setParticles([]);
    setServers(buildInitialTopology());
    setSelectedServerId(null);
    setScaling({ serverId: null, step: 'idle' });
    setRequestCounter(1000);
    addEvent(makeEvent('info', '[SIM] Simulation reset — topology restored to S1, S2, S3'));
  }, [addEvent]);

  // ── Load nudge timer (runs independently of traffic) ───────────────────────

  useEffect(() => {
    loadNudgeTimerRef.current = setInterval(() => {
      // Only nudge when no scaling is in progress
      if (scalingRef.current.step === 'idle') {
        setServers((prev) => nudgeLoads(cloneTree(prev)));
      }
    }, 4000);
    return () => {
      if (loadNudgeTimerRef.current) clearInterval(loadNudgeTimerRef.current);
    };
  }, []);

  // ── Can scale check ─────────────────────────────────────────────────────────

  const canScale = useCallback(
    (serverId: string): boolean => {
      if (scaling.step !== 'idle') return false;
      const node = findNode(serversRef.current, serverId);
      if (!node) return false;
      // A server can only scale if it has 0 children currently
      return node.children.length === 0;
    },
    [scaling.step]
  );

  // ── Trigger scaling sequence ────────────────────────────────────────────────

  const triggerScaling = useCallback(
    (serverId: string) => {
      if (!canScale(serverId)) return;

      setScaling({ serverId, step: 'overloading' });
      addEvent(makeEvent('warning', `[SIM] ${serverId} load increasing...`, serverId));

      // Step 1 (500ms): apply overload status
      scalingTimeoutRef.current = setTimeout(() => {
        setServers((prev) => applyOverload(cloneTree(prev), serverId));
        setScaling({ serverId, step: 'scaling' });
        addEvent(makeEvent('warning', `[SIM] ${serverId} OVERLOADED — scaling triggered!`, serverId));

        // Step 2 (1200ms): show scaling state
        scalingTimeoutRef.current = setTimeout(() => {
          setScaling({ serverId, step: 'spawning' });
          addEvent(makeEvent('scaling', `[SIM] Spawning 3 child instances for ${serverId}...`, serverId));

          // Step 3 (800ms): spawn children
          scalingTimeoutRef.current = setTimeout(() => {
            setServers((prev) => spawnChildren(cloneTree(prev), serverId));
            setScaling({ serverId, step: 'stabilizing' });
            addEvent(
              makeEvent(
                'success',
                `[SIM] ${serverId}.1, ${serverId}.2, ${serverId}.3 created — scaling complete`,
                serverId
              )
            );

            // Step 4 (600ms): back to idle
            scalingTimeoutRef.current = setTimeout(() => {
              setScaling({ serverId: null, step: 'idle' });
            }, 600);
          }, 800);
        }, 1200);
      }, 500);
    },
    [canScale, addEvent]
  );

  // ── Cleanup on unmount ──────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (trafficTimerRef.current) clearInterval(trafficTimerRef.current);
      if (loadNudgeTimerRef.current) clearInterval(loadNudgeTimerRef.current);
      if (scalingTimeoutRef.current) clearTimeout(scalingTimeoutRef.current);
    };
  }, []);

  return {
    servers,
    resetTopology,
    selectedServerId,
    setSelectedServerId,
    selectedServer: selectedServer ?? null,
    isRunning,
    trafficRate,
    startTraffic,
    pauseTraffic,
    setTrafficRate: setTrafficRateFn,
    particles,
    scaling,
    triggerScaling,
    canScale,
    events,
    metrics,
  };
}
