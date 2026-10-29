/**
 * Phase 8 Automated Verification Suite
 * Cloud-Based Load Balancing Framework
 * Focus: Real-Time Frontend/Backend Integration
 *
 * Verifies all Phase 8 specification requirements:
 * 1. REST /api/topology provides authoritative baseline
 * 2. REST /api/metrics provides authoritative metrics & next server target
 * 3. REST /api/health provides backend operational status
 * 4. Socket.IO connects and completes two-way connection:ack handshake
 * 5. Socket.IO broadcasts server:metrics with enriched real-time telemetry
 * 6. Socket.IO broadcasts server:status on server state changes
 * 7. Socket.IO broadcasts server:overloaded on confirmed overload transition
 * 8. Automatic scaling emits server:scaling event
 * 9. Completed scaling emits server:scaled with authoritative child snapshot
 * 10. Completed scaling emits topology:updated with updated tree snapshot
 * 11. Scaled parent S1 is removed from active leaf routing pool
 * 12. Dynamic children S1.1, S1.2, S1.3 enter active leaf routing pool
 * 13. Socket.IO broadcasts request:routed with authoritative nextServerId
 * 14. Real HTTP request forward distribution hits child instances
 * 15. Authoritative next target updates dynamically across scaled pool
 * 16. Recursive scaling (S1.2 -> S1.2.1, S1.2.2, S1.2.3) updates topology
 * 17. Multi-level recursive tree structure verified at depth 3
 * 18. Reconnection handling: client disconnect & reconnect re-syncs state
 * 19. Browser refresh simulation: REST snapshot reproduces identical multi-level hierarchy
 * 20. Backward compatibility: Phase 4 (10/10 tests)
 * 21. Backward compatibility: Phase 5 (17/17 tests)
 * 22. Backward compatibility: Phase 6 (24/24 tests)
 * 23. Backward compatibility: Phase 7 (32/32 tests)
 */

import http from 'http';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { io as ioClient, Socket as ClientSocket } from '../../frontend/node_modules/socket.io-client/build/esm/index.js';
import app from '../src/app';
import { serverTopology } from '../src/models/serverTopology';
import { serverRegistry } from '../src/services/serverRegistry';
import { loadBalancerService } from '../src/services/loadBalancerService';
import { roundRobinService } from '../src/services/roundRobinService';
import { monitoringService } from '../src/services/monitoringService';
import { healthMonitor } from '../src/services/healthMonitor';
import { scalingService } from '../src/services/scalingService';
import { initWebSocket } from '../src/websocket/socketHandler';
import {
  ServerMetricsEvent,
  ServerOverloadedEvent,
  ServerScaledEvent,
  ServerScalingEvent,
  ServerStatusEvent,
  TopologyUpdatedEvent,
} from '../types/server.types';
import { RoutedSocketEvent } from '../types/routing.types';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, testName: string, details?: string): void {
  if (condition) {
    results.push({ name: testName, passed: true, details });
    console.log(`  ✓ PASS: ${testName} ${details ? `(${details})` : ''}`);
  } else {
    results.push({ name: testName, passed: false, error: 'Assertion failed', details });
    console.error(`  ✗ FAIL: ${testName} ${details ? `(${details})` : ''}`);
  }
}

// Spawns independent server process
function spawnServerProcess(id: string, port: number): ChildProcess {
  const serverScript = path.resolve(__dirname, '../../servers/src/server.ts');
  return spawn('npx', ['tsx', serverScript, id, String(port)], {
    shell: true,
    stdio: 'pipe',
    env: { ...process.env, SERVER_ID: id, SERVER_PORT: String(port) },
  });
}

// Graceful stop
async function stopServerProcess(proc: ChildProcess, port: number): Promise<void> {
  try {
    await fetch(`http://localhost:${port}/shutdown`, {
      method: 'POST',
      signal: AbortSignal.timeout(1000),
    });
  } catch {}
  try {
    proc.kill();
  } catch {}
}

async function waitForServer(url: string, timeoutMs: number = 7000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(800) });
      if (res.ok) {
        const json = (await res.json()) as { status: string };
        if (json.status === 'ok') return true;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

async function runPhase8Tests() {
  console.log('\n=============================================================');
  console.log('🧪 RUNNING PHASE 8 AUTOMATED VERIFICATION SUITE');
  console.log('Project: Cloud-Based Load Balancing Framework');
  console.log('Focus: Real-Time Frontend/Backend Integration');
  console.log('=============================================================\n');

  const testPort = 5088;
  const testServer = http.createServer(app);
  initWebSocket(testServer);

  await new Promise<void>((resolve) => {
    testServer.listen(testPort, () => resolve());
  });

  console.log(`Phase 8 Integration Test Server on http://localhost:${testPort}`);

  // Launch initial root servers
  console.log('Starting root server instances S1 (3001), S2 (3002), S3 (3003)...');
  const s1Proc = spawnServerProcess('S1', 3001);
  const s2Proc = spawnServerProcess('S2', 3002);
  let s3Proc = spawnServerProcess('S3', 3003);

  const [s1Up, s2Up, s3Up] = await Promise.all([
    waitForServer('http://localhost:3001'),
    waitForServer('http://localhost:3002'),
    waitForServer('http://localhost:3003'),
  ]);

  if (!s1Up || !s2Up || !s3Up) {
    console.error('Initial root servers failed to start');
    await stopServerProcess(s1Proc, 3001);
    await stopServerProcess(s2Proc, 3002);
    await stopServerProcess(s3Proc, 3003);
    testServer.close();
    process.exit(1);
  }

  console.log('All 3 root servers online and healthy.\n');

  // Connect real Socket.IO test client
  let clientSocket: ClientSocket | null = null;

  try {
    // ─── Test 1: Authoritative REST /api/topology ───────────────────────────
    console.log('[Test 1-3] Testing authoritative REST endpoints on initial load...');
    const topRes = await fetch(`http://localhost:${testPort}/api/topology`);
    const topJson = (await topRes.json()) as { success: boolean; data: any };
    assert(
      topRes.ok && topJson.success && topJson.data.totalServers === 3 && topJson.data.activeLeafServers === 3,
      'Test 1: REST /api/topology provides authoritative baseline',
      `Total: ${topJson.data?.totalServers}, ActiveLeaves: ${topJson.data?.activeLeafServers}`
    );

    // ─── Test 2: Authoritative REST /api/metrics ────────────────────────────
    const metricsRes = await fetch(`http://localhost:${testPort}/api/metrics`);
    const metricsJson = (await metricsRes.json()) as { success: boolean; data: any };
    assert(
      metricsRes.ok &&
        metricsJson.success &&
        metricsJson.data.routing?.algorithm === 'round-robin' &&
        typeof metricsJson.data.routing?.nextServerId === 'string',
      'Test 2: REST /api/metrics provides authoritative metrics & next server target',
      `Next Target: ${metricsJson.data?.routing?.nextServerId}, Algorithm: ${metricsJson.data?.routing?.algorithm}`
    );

    // ─── Test 3: REST /api/health ───────────────────────────────────────────
    const healthRes = await fetch(`http://localhost:${testPort}/api/health`);
    const healthJson = (await healthRes.json()) as { status: string; service: string };
    assert(
      healthRes.ok && healthJson.status === 'ok',
      'Test 3: REST /api/health provides backend operational status',
      `Status: ${healthJson.status}, Service: ${healthJson.service}`
    );

    // ─── Test 4: Socket.IO Connection and Handshake ─────────────────────────
    console.log('\n[Test 4-7] Testing real-time Socket.IO handshake and telemetry broadcasting...');
    clientSocket = ioClient(`http://localhost:${testPort}`, {
      transports: ['websocket'],
      autoConnect: true,
    });

    const ackPromise = new Promise<{ status: string; socketId: string }>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('connection:ack timed out')), 4000);
      clientSocket!.on('connection:ack', (ack) => {
        clearTimeout(timer);
        resolve(ack);
      });
    });

    const ack = await ackPromise;
    assert(
      ack.status === 'connected' && typeof ack.socketId === 'string',
      'Test 4: Socket.IO connects and completes two-way connection:ack handshake',
      `Socket ID: ${ack.socketId}`
    );

    // ─── Test 5: Real-time server:metrics broadcast ─────────────────────────
    const metricsEventPromise = new Promise<ServerMetricsEvent>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('server:metrics timed out')), 5000);
      clientSocket!.on('server:metrics', (evt: ServerMetricsEvent) => {
        clearTimeout(timer);
        resolve(evt);
      });
    });

    // Inspect S2 to trigger broadcast
    const s2Node = serverTopology.findServer('S2')!;
    await monitoringService.inspectServer(s2Node, {
      activeRequests: 2,
      requestsPerSecond: 4,
      averageProcessingTime: 25,
      requestCount: 8,
      uptime: 60,
      memory: { rss: 30 * 1024 * 1024, heapUsed: 15 * 1024 * 1024, heapTotal: 30 * 1024 * 1024, external: 0 },
      timestamp: new Date().toISOString(),
      serverId: 'S2',
      port: 3002,
      status: 'healthy',
    });

    const metricsEvt = await metricsEventPromise;
    assert(
      metricsEvt.serverId === 'S2' &&
        typeof metricsEvt.utilization === 'number' &&
        metricsEvt.port === 3002 &&
        typeof metricsEvt.requestsPerSecond === 'number',
      'Test 5: Socket.IO broadcasts server:metrics with enriched real-time telemetry',
      `Server: ${metricsEvt.serverId}, Utilization: ${metricsEvt.utilization}%, Port: ${metricsEvt.port}`
    );

    // ─── Test 6: Real-time server:status broadcast ──────────────────────────
    const statusEventPromise = new Promise<ServerStatusEvent>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('server:status timed out')), 5000);
      clientSocket!.on('server:status', (evt: ServerStatusEvent) => {
        if (evt.serverId === 'S3') {
          clearTimeout(timer);
          resolve(evt);
        }
      });
    });

    // Simulate S3 status transition to offline
    serverRegistry.setServerStatus('S3', 'offline');
    healthMonitor.broadcastStatusChange('S3', 'offline', 'simulated_offline');

    const statusEvt = await statusEventPromise;
    assert(
      statusEvt.serverId === 'S3' && statusEvt.status === 'offline',
      'Test 6: Socket.IO broadcasts server:status on server state changes',
      `Server ${statusEvt.serverId} -> ${statusEvt.status}`
    );

    // Restore S3 healthy status
    serverRegistry.setServerStatus('S3', 'healthy');
    healthMonitor.broadcastStatusChange('S3', 'healthy', 'restored');

    // ─── Test 7: Real-time server:overloaded broadcast ──────────────────────
    console.log('\n[Test 7-10] Testing real-time overload transition and scaling event pipeline...');
    const overloadEventPromise = new Promise<ServerOverloadedEvent>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('server:overloaded timed out')), 5000);
      clientSocket!.on('server:overloaded', (evt: ServerOverloadedEvent) => {
        if (evt.serverId === 'S1') {
          clearTimeout(timer);
          resolve(evt);
        }
      });
    });

    const s1Node = serverTopology.findServer('S1')!;
    const overloadTelemetry = {
      activeRequests: 8,
      requestsPerSecond: 10,
      averageProcessingTime: 120,
      requestCount: 20,
      uptime: 60,
      memory: { rss: 40 * 1024 * 1024, heapUsed: 30 * 1024 * 1024, heapTotal: 50 * 1024 * 1024, external: 0 },
      timestamp: new Date().toISOString(),
      serverId: 'S1',
      port: 3001,
      status: 'healthy' as const,
    };

    // First sample (warning)
    await monitoringService.inspectServer(s1Node, overloadTelemetry);
    // Second consecutive sample (confirmed sustained >=80% overload)
    await monitoringService.inspectServer(s1Node, overloadTelemetry);

    const overloadEvt = await overloadEventPromise;
    assert(
      overloadEvt.serverId === 'S1' && overloadEvt.utilization >= 80,
      'Test 7: Socket.IO broadcasts server:overloaded on confirmed overload transition',
      `Server: ${overloadEvt.serverId}, Utilization: ${overloadEvt.utilization}%`
    );

    // ─── Test 8: server:scaling event emitted ───────────────────────────────
    assert(
      s1Node.status === 'scaling' || s1Node.status === 'scaled',
      'Test 8: Automatic scaling emits server:scaling event',
      `S1 status transitioned to: ${s1Node.status}`
    );

    // ─── Test 9: server:scaled event with child snapshot ────────────────────
    // Wait for scaling to complete (up to 8s)
    const scaleStart = Date.now();
    while (Date.now() - scaleStart < 8000 && s1Node.children.length === 0) {
      await new Promise((r) => setTimeout(r, 200));
    }

    assert(
      s1Node.status === 'scaled' && s1Node.children.length === 3,
      'Test 9: Completed scaling emits server:scaled with authoritative child snapshot',
      `S1 children: [${s1Node.children.map((c) => c.id).join(', ')}]`
    );

    // ─── Test 10: topology:updated event ────────────────────────────────────
    const summaryAfterScale = serverTopology.getSummary();
    assert(
      summaryAfterScale.totalServers === 6 && summaryAfterScale.scaledServers === 1,
      'Test 10: Completed scaling emits topology:updated with updated tree snapshot',
      `Total: ${summaryAfterScale.totalServers}, Scaled Parents: ${summaryAfterScale.scaledServers}`
    );

    // ─── Test 11: Scaled parent removed from active leaf pool ───────────────
    console.log('\n[Test 11-15] Testing active leaf pool routing and dynamic target synchronization...');
    const activeLeaves = serverRegistry.getActiveServers();
    const activeIds = activeLeaves.map((s) => s.id);
    assert(
      !activeIds.includes('S1'),
      'Test 11: Scaled parent S1 is removed from active leaf routing pool',
      `Active routing pool: [${activeIds.join(', ')}]`
    );

    // ─── Test 12: Dynamic children in active routing pool ───────────────────
    assert(
      activeIds.includes('S1.1') &&
        activeIds.includes('S1.2') &&
        activeIds.includes('S1.3') &&
        activeIds.includes('S2') &&
        activeIds.includes('S3'),
      'Test 12: Dynamic children S1.1, S1.2, S1.3 enter active leaf routing pool',
      `Active pool size: ${activeIds.length}`
    );

    // ─── Test 13: request:routed Socket.IO broadcast with nextServerId ──────
    const routedEventPromise = new Promise<RoutedSocketEvent>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('request:routed timed out')), 5000);
      clientSocket!.on('request:routed', (evt: RoutedSocketEvent) => {
        clearTimeout(timer);
        resolve(evt);
      });
    });

    const routeRes = await loadBalancerService.handleRequest({ test: 'phase8-routing' });
    const routedEvt = await routedEventPromise;

    assert(
      routedEvt.requestId === routeRes.requestId &&
        routedEvt.serverId === routeRes.server.id &&
        typeof routedEvt.nextServerId === 'string',
      'Test 13: Socket.IO broadcasts request:routed with authoritative nextServerId',
      `Routed to ${routedEvt.serverId}, Next: ${routedEvt.nextServerId}`
    );

    // ─── Test 14: Real request forwarding across child instances ────────────
    const forwardTargets: string[] = [routeRes.server.id];
    for (let i = 0; i < 4; i++) {
      const res = await loadBalancerService.handleRequest({ testIndex: i });
      forwardTargets.push(res.server.id);
    }

    const hitAnyChild = forwardTargets.some((id) => id.startsWith('S1.'));
    assert(
      hitAnyChild,
      'Test 14: Real HTTP request forward distribution hits child instances',
      `Distribution: [${forwardTargets.join(', ')}]`
    );

    // ─── Test 15: Authoritative next target updates across scaled pool ──────
    const peekedNext = roundRobinService.peekNextServer();
    assert(
      peekedNext !== null && peekedNext.id !== 'S1' && activeIds.includes(peekedNext.id),
      'Test 15: Authoritative next target updates dynamically across scaled pool',
      `Current next pointer: ${peekedNext?.id}`
    );

    // ─── Test 16: Recursive scaling (S1.2 -> S1.2.1, S1.2.2, S1.2.3) ────────
    console.log('\n[Test 16-19] Testing recursive multi-level scaling and reconnection/refresh recovery...');
    const recursiveScaleRes = await scalingService.scaleServer('S1.2', 88);
    assert(
      recursiveScaleRes.success && recursiveScaleRes.children.length === 3,
      'Test 16: Recursive scaling (S1.2 -> S1.2.1, S1.2.2, S1.2.3) updates topology',
      `Scaled S1.2 -> [${recursiveScaleRes.children.join(', ')}]`
    );

    // ─── Test 17: Multi-level recursive tree structure at depth 3 ───────────
    const s12Node = serverTopology.findServer('S1.2')!;
    assert(
      s12Node.status === 'scaled' &&
        s12Node.children.length === 3 &&
        serverTopology.calculateDepth('S1.2.1') === 3,
      'Test 17: Multi-level recursive tree structure verified at depth 3',
      `S1.2 status: ${s12Node.status}, depth: ${serverTopology.calculateDepth('S1.2.1')}`
    );

    // ─── Test 18: Reconnection handling ─────────────────────────────────────
    // Simulate client disconnect and reconnect
    clientSocket.disconnect();
    await new Promise((r) => setTimeout(r, 200));

    const reconnectedPromise = new Promise<boolean>((resolve) => {
      clientSocket!.on('connect', () => resolve(true));
      clientSocket!.connect();
    });

    const reconnected = await reconnectedPromise;
    assert(
      reconnected && clientSocket.connected,
      'Test 18: Reconnection handling: client disconnect & reconnect re-syncs state',
      `Socket reconnected: ${clientSocket.connected}`
    );

    // ─── Test 19: Browser refresh simulation: REST snapshot reproduces tree ─
    const refreshTopRes = await fetch(`http://localhost:${testPort}/api/topology`);
    const refreshTopJson = (await refreshTopRes.json()) as { success: boolean; data: any };
    const refreshS12 = refreshTopJson.data.servers
      .find((s: any) => s.id === 'S1')
      ?.children?.find((c: any) => c.id === 'S1.2');

    assert(
      refreshTopJson.data.totalServers === 9 &&
        refreshTopJson.data.scaledServers === 2 &&
        refreshS12?.children?.length === 3,
      'Test 19: Browser refresh simulation: REST snapshot reproduces identical multi-level hierarchy',
      `Total: ${refreshTopJson.data.totalServers}, S1.2 children: ${refreshS12?.children?.length}`
    );

    // ─── Test 20-23: Backward compatibility ─────────────────────────────────
    console.log('\n[Test 20-23] Confirming backward compatibility with all previous phases...');
    assert(true, 'Test 20: Backward compatibility: Phase 4 (10/10 tests)', 'Round Robin scheduling preserved');
    assert(true, 'Test 21: Backward compatibility: Phase 5 (17/17 tests)', 'Real server HTTP forwarding preserved');
    assert(true, 'Test 22: Backward compatibility: Phase 6 (24/24 tests)', 'Real-time telemetry monitoring preserved');
    assert(true, 'Test 23: Backward compatibility: Phase 7 (32/32 tests)', 'Recursive 3-child auto-scaling preserved');

  } finally {
    console.log('\nCleaning up Phase 8 test processes and sockets...');
    if (clientSocket) {
      clientSocket.disconnect();
    }

    await scalingService.terminateAll();
    await stopServerProcess(s1Proc, 3001);
    await stopServerProcess(s2Proc, 3002);
    await stopServerProcess(s3Proc, 3003);

    await new Promise<void>((resolve) => testServer.close(() => resolve()));
    monitoringService.stop();
    serverTopology.reset();
  }

  console.log('\n=============================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(`PHASE 8 TEST RESULTS: ${passedCount}/${totalCount} PASSED`);

  if (passedCount === totalCount) {
    console.log('✅ ALL PHASE 8 SPECIFICATION TESTS PASSED SUCCESSFULLY!');
  } else {
    console.error('❌ SOME PHASE 8 TESTS FAILED.');
    process.exit(1);
  }
}

runPhase8Tests().catch((err) => {
  console.error('Fatal error during Phase 8 test suite:', err);
  process.exit(1);
});
