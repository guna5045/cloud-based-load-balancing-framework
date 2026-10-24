/**
 * useRealRouting.ts
 * Phase 4: Real Round Robin Load Balancer & Request Routing
 *
 * Connects the frontend to the backend Round Robin load balancer:
 * - Dispatches real HTTP requests (POST /api/requests)
 * - Listens to real-time Socket.IO events ('request:routed')
 * - Fetches real routing metrics and request history
 * - Animates particles across the topology graph to the actual selected server
 * - Feeds real routing events into the Event Feed
 */

import { useState, useEffect, useCallback, useRef } from 'react';
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
} from '../types/server.types';
import { TimeSeriesPoint } from '../data/mockData';
import { useSimulation } from '../context/SimulationContext';
import { makeEvent } from '../data/topologySimulation';

export interface UseRealRoutingReturn {
  mode: 'real' | 'simulation';
  setMode: (mode: 'real' | 'simulation') => void;
  isSending: boolean;
  lastResult: RoutingResult | null;
  metrics: RoutingMetrics | null;
  clusterSummary: ClusterMetricsSummary;
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

export function useRealRouting(): UseRealRoutingReturn {
  const sim = useSimulation();

  const [mode, setMode] = useState<'real' | 'simulation'>('real');
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

  // ── Fetch metrics & recent requests ─────────────────────────────────────────

  const refreshData = useCallback(async () => {
    try {
      const [metricsRes, requestsRes] = await Promise.all([
        apiService.getMetrics().catch(() => null),
        apiService.getRequests(15).catch(() => null),
      ]);

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
      }
      if (requestsRes?.data) {
        setRecentRequests(requestsRes.data);
      }
    } catch (err) {
      console.warn('[useRealRouting] Failed to refresh data:', err);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // ── Socket.IO Real-time Connection ──────────────────────────────────────────

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => {
      setSocketConnected(true);
      sim.addEvent(makeEvent('info', '[REAL] Connected to Load Balancer WebSocket'));
    };

    const onDisconnect = () => {
      setSocketConnected(false);
    };

    const onRouted = (data: RoutedSocketEvent) => {
      // Avoid duplicate handling if locally initiated
      if (processedRequestIdsRef.current.has(data.requestId)) {
        return;
      }
      processedRequestIdsRef.current.add(data.requestId);

      // Trigger particle animation to the real server
      sim.emitRealParticle(data.serverId, data.requestId, data.sequence);
      sim.recordRealServerHit(data.serverId);

      // Log real routing event in feed
      sim.addEvent(
        makeEvent(
          'request',
          `[REAL] Request ${data.requestId} routed → ${data.serverId} (${data.processingTime}ms, Round Robin)`,
          data.serverId
        )
      );

      // Update recent requests list
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
        return [item, ...prev.filter((r) => r.requestId !== data.requestId).slice(0, 19)];
      });

      // Optimistically update routing metrics
      setMetrics((prev) => {
        if (!prev) return null;
        const currentServerHits = prev.requestsByServer[data.serverId] || 0;
        return {
          ...prev,
          totalRequests: prev.totalRequests + 1,
          lastRoutedServer: data.serverId,
          lastRequestAt: data.timestamp,
          requestsByServer: {
            ...prev.requestsByServer,
            [data.serverId]: currentServerHits + 1,
          },
        };
      });
    };

    const onServerStatus = (data: ServerStatusEvent) => {
      sim.updateServerStatus(data.serverId, data.status);
      const isHealthy = data.status === 'healthy';
      sim.addEvent(
        makeEvent(
          isHealthy ? 'success' : 'error',
          `[REAL] Server ${data.serverId} is now ${data.status.toUpperCase()}${data.reason ? ` (${data.reason})` : ''}`,
          data.serverId
        )
      );
      refreshData();
    };

    const onServerMetrics = (data: ServerMetricsEvent) => {
      sim.updateServerMetrics(data);
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
      sim.updateServerStatus(data.serverId, 'overloaded');
      sim.addEvent(
        makeEvent(
          'warning',
          `🚨 [OVERLOAD] Server ${data.serverId} reached ${data.utilization}% load (threshold: ${data.threshold}%)`,
          data.serverId
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
    };
  }, [sim, refreshData]);

  // ── Send single real request (POST /api/requests) ───────────────────────────

  const sendSingleRequest = useCallback(
    async (payload?: unknown): Promise<RoutingResult | null> => {
      setIsSending(true);
      try {
        const result = await apiService.submitRequest(payload ?? { source: 'dashboard-ui' });

        setLastResult(result);
        processedRequestIdsRef.current.add(result.requestId);

        // Animate particle to the actual server selected by Round Robin
        sim.emitRealParticle(result.server.id, result.requestId, result.routing.sequence);
        sim.recordRealServerHit(result.server.id);

        // Add real event to the feed
        sim.addEvent(
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

        setRecentRequests((prev) => [newRecord, ...prev.slice(0, 19)]);

        // Refresh metrics periodically
        refreshData();

        return result;
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        sim.addEvent(makeEvent('error', `[REAL] Request failed: ${errorMsg}`));
        return null;
      } finally {
        setIsSending(false);
      }
    },
    [sim, refreshData]
  );

  // ── Send burst requests (e.g. 3 or 5 requests in sequence) ──────────────────

  const sendBurstRequests = useCallback(
    async (count: number = 3) => {
      setIsSending(true);
      for (let i = 0; i < count; i++) {
        await sendSingleRequest({ burstIndex: i + 1, totalBurst: count });
        // Small delay between burst requests for visual flow
        if (i < count - 1) {
          await new Promise((resolve) => setTimeout(resolve, 220));
        }
      }
      setIsSending(false);
    },
    [sendSingleRequest]
  );

  // ── Auto-Traffic Generator (controlled, low-rate ~1.2s per request) ──────────

  const toggleAutoTraffic = useCallback(() => {
    if (isAutoTrafficRunningRef.current) {
      if (autoTrafficTimerRef.current) {
        clearInterval(autoTrafficTimerRef.current);
        autoTrafficTimerRef.current = null;
      }
      setIsAutoTrafficRunning(false);
      sim.addEvent(makeEvent('info', '[REAL] Controlled auto-traffic stopped'));
    } else {
      setIsAutoTrafficRunning(true);
      sim.addEvent(makeEvent('info', '[REAL] Controlled auto-traffic started (1 req/1.2s)'));
      autoTrafficTimerRef.current = setInterval(() => {
        sendSingleRequest({ type: 'auto-traffic', timestamp: Date.now() });
      }, 1200);
    }
  }, [sendSingleRequest, sim]);

  // Clean up auto traffic timer on unmount
  useEffect(() => {
    return () => {
      if (autoTrafficTimerRef.current) {
        clearInterval(autoTrafficTimerRef.current);
      }
    };
  }, []);

  // ── Calculate next expected server based on last routed server ──────────────

  const nextExpectedServer = (() => {
    const servers = ['S1', 'S2', 'S3'];
    if (!lastResult && (!metrics || !metrics.lastRoutedServer)) {
      return 'S1';
    }
    const lastServerId = lastResult?.server?.id || metrics?.lastRoutedServer;
    const idx = servers.indexOf(lastServerId || 'S1');
    if (idx === -1) return 'S1';
    return servers[(idx + 1) % servers.length];
  })();

  return {
    mode,
    setMode,
    isSending,
    lastResult,
    metrics,
    clusterSummary,
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
}
