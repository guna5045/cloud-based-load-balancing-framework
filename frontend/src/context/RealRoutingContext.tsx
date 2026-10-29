/**
 * RealRoutingContext.tsx
 * Phase 8: Real-Time Frontend/Backend Integration
 *
 * Provides application-wide singleton real-time synchronization between
 * the authoritative backend and the frontend React components:
 * - Subscribes to Socket.IO events (metrics, status, overload, scaling, routing)
 * - Automatically resynchronizes authoritative REST state on mount and on reconnect
 * - Maintains bounded live time series, recent request history, and cluster KPIs
 * - Prevents state destruction on page navigation
 * - Preserves complete separation between Real Mode and Simulation Mode
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../services/api';
import { getSocket } from '../services/socket';
import {
  RoutingResult,
  RequestRecord,
  RoutingMetrics,
  RoutedSocketEvent,
  ServerStatusEvent,
  ServerMetricsEvent,
  ServerOverloadedEvent,
  ClusterMetricsSummary,
  ServerScalingEvent,
  ServerScaledEvent,
  ServerScaleFailedEvent,
  TopologyUpdatedEvent,
  ServerNode,
} from '../types/server.types';
import { TimeSeriesPoint } from '../data/mockData';
import { useSimulation } from './SimulationContext';
import { makeEvent } from '../data/topologySimulation';

export interface ScalingKPIs {
  totalServers: number;
  activeLeafServers: number;
  rootServers: number;
  scaledServers: number;
  scalingOperations: number;
  maxTopologyDepth: number;
}

export interface UseRealRoutingReturn {
  mode: 'real' | 'simulation';
  setMode: (mode: 'real' | 'simulation') => void;
  isSending: boolean;
  lastResult: RoutingResult | null;
  metrics: RoutingMetrics | null;
  clusterSummary: ClusterMetricsSummary;
  scalingKPIs: ScalingKPIs;
  liveTimeSeries: TimeSeriesPoint[];
  recentRequests: RequestRecord[];
  isAutoTrafficRunning: boolean;
  socketConnected: boolean;
  sendSingleRequest: (payload?: unknown) => Promise<RoutingResult | null>;
  sendBurstRequests: (count?: number) => Promise<void>;
  toggleAutoTraffic: () => void;
  refreshData: () => Promise<void>;
  nextExpectedServer: string;
}

const RealRoutingContext = createContext<UseRealRoutingReturn | null>(null);

export const RealRoutingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const sim = useSimulation();
  const simRef = useRef(sim);
  useEffect(() => {
    simRef.current = sim;
  }, [sim]);

  const [mode, setModeState] = useState<'real' | 'simulation'>('real');
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const [isSending, setIsSending] = useState(false);
  const [lastResult, setLastResult] = useState<RoutingResult | null>(null);
  const [metrics, setMetrics] = useState<RoutingMetrics | null>(null);
  const [clusterSummary, setClusterSummary] = useState<ClusterMetricsSummary>({
    healthyServers: 3,
    warningServers: 0,
    overloadedServers: 0,
    offlineServers: 0,
    averageUtilization: 0,
    totalRequests: 0,
  });
  const [scalingKPIs, setScalingKPIs] = useState<ScalingKPIs>({
    totalServers: 3,
    activeLeafServers: 3,
    rootServers: 3,
    scaledServers: 0,
    scalingOperations: 0,
    maxTopologyDepth: 1,
  });
  const [liveTimeSeries, setLiveTimeSeries] = useState<TimeSeriesPoint[]>([]);
  const [recentRequests, setRecentRequests] = useState<RequestRecord[]>([]);
  const [isAutoTrafficRunning, setIsAutoTrafficRunning] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  const autoTrafficTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAutoTrafficRunningRef = useRef(isAutoTrafficRunning);
  const processedRequestIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    isAutoTrafficRunningRef.current = isAutoTrafficRunning;
  }, [isAutoTrafficRunning]);

  // ── Authoritative State Refresh ───────────────────────────────────────────

  const refreshData = useCallback(async () => {
    try {
      const [metricsRes, requestsRes, topologyRes] = await Promise.all([
        apiService.getMetrics().catch(() => null),
        apiService.getRequests(25).catch(() => null),
        apiService.getTopology().catch(() => null),
      ]);

      if (
        modeRef.current === 'real' &&
        topologyRes?.data?.servers &&
        Array.isArray(topologyRes.data.servers) &&
        topologyRes.data.servers.length > 0
      ) {
        simRef.current.setAuthoritativeTopology(topologyRes.data.servers);
      }

      if (metricsRes?.data) {
        if (metricsRes.data.routing) {
          setMetrics(metricsRes.data.routing);
        }
        setClusterSummary({
          healthyServers: metricsRes.data.healthyServers ?? 0,
          warningServers: metricsRes.data.warningServers ?? 0,
          overloadedServers: metricsRes.data.overloadedServers ?? 0,
          offlineServers: metricsRes.data.offlineServers ?? 0,
          averageUtilization: metricsRes.data.averageUtilization ?? 0,
          totalRequests: metricsRes.data.routing?.totalRequests ?? 0,
        });

        const m = metricsRes.data as unknown as Record<string, unknown> & {
          totalServers?: number;
          activeLeafServers?: number;
          rootServers?: number;
          scaledServers?: number;
          scalingOperations?: number;
          maxTopologyDepth?: number;
          topology?: Record<string, number>;
        };

        setScalingKPIs({
          totalServers: m.totalServers ?? m.topology?.totalServers ?? 3,
          activeLeafServers: m.activeLeafServers ?? m.topology?.activeLeafServers ?? 3,
          rootServers: m.rootServers ?? m.topology?.rootServers ?? 3,
          scaledServers: m.scaledServers ?? m.topology?.scaledServers ?? 0,
          scalingOperations: m.scalingOperations ?? m.topology?.scalingOperations ?? 0,
          maxTopologyDepth: m.maxTopologyDepth ?? m.topology?.maxDepth ?? 1,
        });
      }

      if (requestsRes?.data) {
        setRecentRequests(requestsRes.data);
      }
    } catch (err) {
      console.warn('[RealRoutingContext] Failed to refresh authoritative data:', err);
    }
  }, []);

  const setMode = useCallback((newMode: 'real' | 'simulation') => {
    setModeState(newMode);
    modeRef.current = newMode;
    if (newMode === 'real') {
      refreshData();
    }
  }, [refreshData]);

  // Initial fetch on mount
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // ── Socket.IO Real-Time Synchronization ───────────────────────────────────

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => {
      setSocketConnected(true);
      simRef.current.addEvent(makeEvent('info', '[REAL] Connected to Load Balancer WebSocket'));
      // Synchronize authoritative state on initial connection and on reconnect
      refreshData();
    };

    const onDisconnect = (reason: string) => {
      setSocketConnected(false);
      simRef.current.addEvent(makeEvent('warning', `[REAL] Disconnected from WebSocket: ${reason}`));
    };

    const onRouted = (data: RoutedSocketEvent) => {
      // Only process if not already handled locally (e.g. from sendSingleRequest)
      if (!processedRequestIdsRef.current.has(data.requestId)) {
        processedRequestIdsRef.current.add(data.requestId);

        if (modeRef.current === 'real') {
          // Trigger particle animation to the real server
          simRef.current.emitRealParticle(data.serverId, data.requestId, data.sequence);
          simRef.current.recordRealServerHit(data.serverId);
        }

        simRef.current.addEvent(
          makeEvent(
            'request',
            `[REAL] Request ${data.requestId} routed → ${data.serverId} (${data.processingTime}ms, Round Robin)`,
            data.serverId
          )
        );

        setRecentRequests((prev) => {
          const item: RequestRecord = {
            requestId: data.requestId,
            sequence: data.sequence,
            serverId: data.serverId,
            algorithm: data.algorithm,
            processingTime: data.processingTime,
            status: 'processed',
            timestamp: data.timestamp,
          };
          return [item, ...prev.filter((r) => r.requestId !== data.requestId).slice(0, 24)];
        });
      }

      // Optimistically update routing metrics with authoritative next target
      setMetrics((prev) => {
        if (!prev) return null;
        const currentServerHits = prev.requestsByServer[data.serverId] || 0;
        return {
          ...prev,
          totalRequests: prev.totalRequests + 1,
          lastRoutedServer: data.serverId,
          lastRequestAt: data.timestamp,
          nextServerId: data.nextServerId ?? prev.nextServerId,
          requestsByServer: {
            ...prev.requestsByServer,
            [data.serverId]: currentServerHits + 1,
          },
        };
      });
    };

    const onServerStatus = (data: ServerStatusEvent) => {
      if (modeRef.current === 'real') {
        simRef.current.updateServerStatus(data.serverId, data.status);
      }
      const isHealthy = data.status === 'healthy';
      simRef.current.addEvent(
        makeEvent(
          isHealthy ? 'success' : 'error',
          `[REAL] Server ${data.serverId} is now ${data.status.toUpperCase()}${data.reason ? ` (${data.reason})` : ''}`,
          data.serverId
        )
      );
      refreshData();
    };

    const onServerMetrics = (data: ServerMetricsEvent) => {
      if (modeRef.current === 'real') {
        simRef.current.updateServerMetrics(data);
      }
      const timeStr = new Date(data.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setLiveTimeSeries((prev) => {
        const newPoint: TimeSeriesPoint = {
          time: timeStr,
          load: data.load,
          requests: data.requestsPerSecond,
          latency: Math.round(data.averageProcessingTime),
        };
        const updated = [...prev, newPoint];
        return updated.length > 25 ? updated.slice(updated.length - 25) : updated;
      });
    };

    const onServerOverloaded = (data: ServerOverloadedEvent) => {
      if (modeRef.current === 'real') {
        simRef.current.updateServerStatus(data.serverId, 'overloaded');
      }
      simRef.current.addEvent(
        makeEvent(
          'warning',
          `🚨 [OVERLOAD] Server ${data.serverId} reached ${data.utilization}% load (threshold: ${data.threshold}%)`,
          data.serverId
        )
      );
      refreshData();
    };

    const onServerScaling = (data: ServerScalingEvent) => {
      if (modeRef.current === 'real') {
        simRef.current.setRealScalingState(data.serverId, 'scaling');
        simRef.current.updateServerStatus(data.serverId, 'scaling');
      }
      simRef.current.addEvent(
        makeEvent(
          'info',
          `🔄 [SCALING] Server ${data.serverId} scaling initiated — spawning 3 real child instances`,
          data.serverId
        )
      );
      refreshData();
    };

    const onServerScaled = (data: ServerScaledEvent) => {
      if (modeRef.current === 'real') {
        simRef.current.setRealScalingState(null, 'idle');
        if (data.servers && Array.isArray(data.servers) && data.servers.length > 0) {
          simRef.current.setAuthoritativeTopology(data.servers);
        }
      }
      simRef.current.addEvent(
        makeEvent(
          'success',
          `✅ [SCALED] Server ${data.serverId} scaling completed → Children: [${data.children.join(', ')}]`,
          data.serverId
        )
      );
      refreshData();
    };

    const onServerScaleFailed = (data: ServerScaleFailedEvent) => {
      if (modeRef.current === 'real') {
        simRef.current.setRealScalingState(null, 'idle');
      }
      simRef.current.addEvent(
        makeEvent(
          'error',
          `❌ [SCALE FAILED] Server ${data.serverId} scaling failed: ${data.reason}`,
          data.serverId
        )
      );
      refreshData();
    };

    const onTopologyUpdated = (data: TopologyUpdatedEvent) => {
      if (modeRef.current === 'real' && data.servers && Array.isArray(data.servers) && data.servers.length > 0) {
        simRef.current.setAuthoritativeTopology(data.servers);
      }
      simRef.current.addEvent(
        makeEvent(
          'info',
          `🌐 [TOPOLOGY] Topology updated: ${data.action} on ${data.parentId} ([${data.children.join(', ')}])`,
          data.parentId
        )
      );
      refreshData();
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('request:routed', onRouted);
    socket.on('server:status', onServerStatus);
    socket.on('server:metrics', onServerMetrics);
    socket.on('server:overloaded', onServerOverloaded);
    socket.on('server:scaling', onServerScaling);
    socket.on('server:scaled', onServerScaled);
    socket.on('server:scale_failed', onServerScaleFailed);
    socket.on('topology:updated', onTopologyUpdated);

    if (socket.connected) {
      setSocketConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('request:routed', onRouted);
      socket.off('server:status', onServerStatus);
      socket.off('server:metrics', onServerMetrics);
      socket.off('server:overloaded', onServerOverloaded);
      socket.off('server:scaling', onServerScaling);
      socket.off('server:scaled', onServerScaled);
      socket.off('server:scale_failed', onServerScaleFailed);
      socket.off('topology:updated', onTopologyUpdated);
    };
  }, [refreshData]);

  // ── Dispatch single real request ──────────────────────────────────────────

  const sendSingleRequest = useCallback(
    async (payload?: unknown): Promise<RoutingResult | null> => {
      setIsSending(true);
      try {
        const result = await apiService.submitRequest(payload ?? { source: 'dashboard-ui' });

        setLastResult(result);
        processedRequestIdsRef.current.add(result.requestId);

        // Animate particle to the actual server selected by Round Robin
        simRef.current.emitRealParticle(result.server.id, result.requestId, result.routing.sequence);
        simRef.current.recordRealServerHit(result.server.id);

        // Add real event to the feed
        simRef.current.addEvent(
          makeEvent(
            'request',
            `[REAL] Request ${result.requestId} routed → ${result.server.id} (${result.response.processingTime}ms, Round Robin)`,
            result.server.id
          )
        );

        // Prepend to recent requests
        const newRecord: RequestRecord = {
          requestId: result.requestId,
          sequence: result.routing.sequence,
          serverId: result.server.id,
          algorithm: result.routing.algorithm,
          processingTime: result.response.processingTime,
          status: 'processed',
          timestamp: result.timestamp,
          clientPayload: payload,
        };

        setRecentRequests((prev) => [newRecord, ...prev.slice(0, 24)]);

        return result;
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        simRef.current.addEvent(makeEvent('error', `[REAL] Request failed: ${errorMsg}`));
        return null;
      } finally {
        setIsSending(false);
      }
    },
    [refreshData]
  );

  // ── Dispatch burst requests ───────────────────────────────────────────────

  const sendBurstRequests = useCallback(
    async (count: number = 5) => {
      setIsSending(true);
      for (let i = 0; i < count; i++) {
        await sendSingleRequest({ burstIndex: i + 1, totalBurst: count });
        if (i < count - 1) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }
      setIsSending(false);
    },
    [sendSingleRequest]
  );

  // ── Auto-Traffic Generator ────────────────────────────────────────────────

  const toggleAutoTraffic = useCallback(() => {
    if (isAutoTrafficRunningRef.current) {
      if (autoTrafficTimerRef.current) {
        clearInterval(autoTrafficTimerRef.current);
        autoTrafficTimerRef.current = null;
      }
      setIsAutoTrafficRunning(false);
      simRef.current.addEvent(makeEvent('info', '[REAL] Controlled auto-traffic stopped'));
    } else {
      setIsAutoTrafficRunning(true);
      simRef.current.addEvent(makeEvent('info', '[REAL] Controlled auto-traffic started (1 req/1.2s)'));
      autoTrafficTimerRef.current = setInterval(() => {
        sendSingleRequest({ type: 'auto-traffic', timestamp: Date.now() });
      }, 1200);
    }
  }, [sendSingleRequest]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (autoTrafficTimerRef.current) {
        clearInterval(autoTrafficTimerRef.current);
      }
    };
  }, []);

  // ── Authoritative Round Robin Next Target Calculation ─────────────────────

  const nextExpectedServer = (() => {
    // Dynamic active leaves from authoritative topology
    const leaves: string[] = [];
    const walk = (nodes: ServerNode[]) => {
      for (const n of nodes) {
        if (!n.children || n.children.length === 0) {
          if (n.status !== 'offline' && n.status !== 'scaling') {
            leaves.push(n.id);
          }
        } else {
          walk(n.children);
        }
      }
    };
    walk(sim.servers);

    if (leaves.length === 0) return 'No healthy servers available';

    // If backend provided authoritative nextServerId and it's active, use it directly
    if (metrics?.nextServerId && leaves.includes(metrics.nextServerId)) {
      return metrics.nextServerId;
    }

    const lastServerId = lastResult?.server?.id || metrics?.lastRoutedServer;
    const idx = lastServerId ? leaves.indexOf(lastServerId) : -1;
    if (idx === -1) return leaves[0];
    return leaves[(idx + 1) % leaves.length];
  })();

  const value: UseRealRoutingReturn = {
    mode,
    setMode,
    isSending,
    lastResult,
    metrics,
    clusterSummary,
    scalingKPIs,
    liveTimeSeries,
    recentRequests,
    isAutoTrafficRunning,
    socketConnected,
    sendSingleRequest,
    sendBurstRequests,
    toggleAutoTraffic,
    refreshData,
    nextExpectedServer,
  };

  return <RealRoutingContext.Provider value={value}>{children}</RealRoutingContext.Provider>;
};

export function useRealRoutingContext(): UseRealRoutingReturn {
  const ctx = useContext(RealRoutingContext);
  if (!ctx) {
    throw new Error('useRealRoutingContext must be used within a RealRoutingProvider');
  }
  return ctx;
}

