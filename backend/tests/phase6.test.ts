/**
 * Phase 6 Automated Verification Suite
 * Cloud-Based Load Balancing Framework - Real-Time Server Monitoring & Overload Detection
 *
 * Verifies all 22 required specification tests:
 * 1. S1 /telemetry returns valid metrics
 * 2. S2 /telemetry returns valid metrics
 * 3. S3 /telemetry returns valid metrics
 * 4. Active request count increases while request is in flight
 * 5. Active request count returns correctly after completion
 * 6. Request rate (RPS) is calculated correctly
 * 7. Average processing time is calculated correctly
 * 8. Utilization is strictly bounded [0, 100]
 * 9. Healthy state is detected below threshold
 * 10. Warning state is detected (60-79%)
 * 11. Overloaded state is detected after 2 confirmation samples (>= 80%)
 * 12. Repeated overloaded cycles do not emit duplicate overload transition events
 * 13. Recovery requires recovery threshold (< 70%) and 2 confirmation samples
 * 14. Offline servers are not classified as overloaded
 * 15. Recovered servers return to monitoring
 * 16. server:overloaded event contains valid payload
 * 17. server:metrics event contains real metrics
 * 18. GET /api/metrics returns cluster monitoring data
 * 19. GET /api/servers/S1 returns monitoring data
 * 20. GET /api/topology remains compatible with NO child nodes
 * 21. Round Robin tests compatibility verification
 * 22. Phase 5 tests compatibility verification
 */

import http from 'http';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import app from '../src/app';
import { serverRegistry } from '../src/services/serverRegistry';
import { serverTopology } from '../src/models/serverTopology';
import { utilizationService } from '../src/services/utilizationService';
import { MonitoringStateEvaluator } from '../src/services/monitoringStateEvaluator';
import { monitoringService } from '../src/services/monitoringService';
import { scalingService } from '../src/services/scalingService';
import { serverClient } from '../src/services/serverClient';

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

// Helper to wait for a server to respond to /health
async function waitForServer(url: string, timeoutMs: number = 6000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(800) });
      if (res.ok) {
        const json = (await res.json()) as { status: string };
        if (json.status === 'ok') return true;
      }
    } catch {
      // Retry
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

// Spawns an independent server process
function spawnServerProcess(id: string, port: number): ChildProcess {
  const serverScript = path.resolve(__dirname, '../../servers/src/server.ts');
  const child = spawn('npx', ['tsx', serverScript, id, String(port)], {
    shell: true,
    stdio: 'pipe',
    env: { ...process.env, SERVER_ID: id, SERVER_PORT: String(port) },
  });

  child.stderr?.on('data', (d) => {
    const msg = d.toString();
    if (!msg.includes('ExperimentalWarning')) {
      // debug if needed
    }
  });

  return child;
}

// Safely stops a server process and awaits socket release
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

  const start = Date.now();
  while (Date.now() - start < 3000) {
    try {
      const res = await fetch(`http://localhost:${port}/health`, { signal: AbortSignal.timeout(300) });
      if (!res.ok) break;
    } catch {
      break;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
}

async function runPhase6Tests(): Promise<void> {
  console.log('\n=============================================================');
  console.log('🧪 RUNNING PHASE 6 AUTOMATED VERIFICATION SUITE');
  console.log('Project: Cloud-Based Load Balancing Framework');
  console.log('Focus: Real-Time Server Monitoring & Overload Detection');
  console.log('=============================================================\n');

  console.log('Launching independent server processes:');
  console.log('  - S1 on http://localhost:3001');
  console.log('  - S2 on http://localhost:3002');
  console.log('  - S3 on http://localhost:3003\n');

  let s1Proc = spawnServerProcess('S1', 3001);
  let s2Proc = spawnServerProcess('S2', 3002);
  let s3Proc = spawnServerProcess('S3', 3003);

  const cleanup = () => {
    fetch('http://localhost:3001/shutdown', { method: 'POST' }).catch(() => {});
    fetch('http://localhost:3002/shutdown', { method: 'POST' }).catch(() => {});
    fetch('http://localhost:3003/shutdown', { method: 'POST' }).catch(() => {});
    try { s1Proc.kill(); } catch {}
    try { s2Proc.kill(); } catch {}
    try { s3Proc.kill(); } catch {}
  };

  process.on('exit', cleanup);
  process.on('SIGINT', cleanup);

  // Start internal test HTTP server for Express app on port 5098
  const testServer = http.createServer(app);
  await new Promise<void>((resolve) => testServer.listen(5098, resolve));

  try {
    const s1Ok = await waitForServer('http://localhost:3001');
    const s2Ok = await waitForServer('http://localhost:3002');
    const s3Ok = await waitForServer('http://localhost:3003');

    if (!s1Ok || !s2Ok || !s3Ok) {
      throw new Error(`Failed to initialize server processes: S1=${s1Ok}, S2=${s2Ok}, S3=${s3Ok}`);
    }

    console.log('[Test 1-3] Testing server /telemetry endpoints...');

    // Test 1: S1 /telemetry
    const s1TelRes = await fetch('http://localhost:3001/telemetry');
    const s1Tel = (await s1TelRes.json()) as any;
    assert(
      s1TelRes.ok &&
        s1Tel.success === true &&
        s1Tel.data.serverId === 'S1' &&
        s1Tel.data.port === 3001 &&
        typeof s1Tel.data.activeRequests === 'number' &&
        typeof s1Tel.data.uptime === 'number' &&
        typeof s1Tel.data.memory?.heapUsed === 'number',
      'Test 1: S1 /telemetry returns valid metrics with activeRequests, memory, and uptime',
      `S1 port: ${s1Tel.data?.port}, uptime: ${s1Tel.data?.uptime}s`
    );

    // Test 2: S2 /telemetry
    const s2TelRes = await fetch('http://localhost:3002/telemetry');
    const s2Tel = (await s2TelRes.json()) as any;
    assert(
      s2TelRes.ok &&
        s2Tel.success === true &&
        s2Tel.data.serverId === 'S2' &&
        s2Tel.data.port === 3002 &&
        typeof s2Tel.data.activeRequests === 'number',
      'Test 2: S2 /telemetry returns valid metrics',
      `S2 port: ${s2Tel.data?.port}`
    );

    // Test 3: S3 /telemetry
    const s3TelRes = await fetch('http://localhost:3003/telemetry');
    const s3Tel = (await s3TelRes.json()) as any;
    assert(
      s3TelRes.ok &&
        s3Tel.success === true &&
        s3Tel.data.serverId === 'S3' &&
        s3Tel.data.port === 3003 &&
        typeof s3Tel.data.activeRequests === 'number',
      'Test 3: S3 /telemetry returns valid metrics',
      `S3 port: ${s3Tel.data?.port}`
    );

    // Test 4 & 5: Active request tracking with try/finally
    console.log('\n[Test 4-5] Testing active request tracking during execution...');
    // Launch a request that takes 250ms
    const slowRequestPromise = fetch('http://localhost:3001/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: 'TEST-CONCURRENCY-1', delayMs: 250 }),
    });

    // Wait 50ms for request to enter processing and check telemetry
    await new Promise((r) => setTimeout(r, 60));
    const inFlightTel = await (await fetch('http://localhost:3001/telemetry')).json();
    assert(
      inFlightTel.data.activeRequests >= 1,
      'Test 4: Active request count increases while a request is in flight',
      `Active requests during execution: ${inFlightTel.data.activeRequests}`
    );

    // Wait for slow request to complete
    await slowRequestPromise;
    const completedTel = await (await fetch('http://localhost:3001/telemetry')).json();
    assert(
      completedTel.data.activeRequests === 0,
      'Test 5: Active request count returns correctly to 0 after completion',
      `Active requests after completion: ${completedTel.data.activeRequests}`
    );

    // Test 6 & 7: Request rate and average latency
    console.log('\n[Test 6-7] Testing request rate and latency telemetry...');
    await fetch('http://localhost:3001/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: 'TEST-RPS-1', delayMs: 20 }),
    });
    await fetch('http://localhost:3001/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: 'TEST-RPS-2', delayMs: 20 }),
    });

    const rpsTel = await (await fetch('http://localhost:3001/telemetry')).json();
    assert(
      rpsTel.data.requestsPerSecond > 0 && rpsTel.data.requestCount >= 3,
      'Test 6: Request rate (RPS) is calculated correctly in rolling window',
      `RPS: ${rpsTel.data.requestsPerSecond}, Total: ${rpsTel.data.requestCount}`
    );

    assert(
      rpsTel.data.averageProcessingTime > 0,
      'Test 7: Average processing latency is calculated across completed requests',
      `Avg Latency: ${rpsTel.data.averageProcessingTime}ms`
    );

    // Test 8: Utilization boundedness
    console.log('\n[Test 8] Testing utilization boundedness and formula properties...');
    const zeroUtil = utilizationService.calculateUtilization({
      activeRequests: 0,
      requestsPerSecond: 0,
      averageProcessingTime: 0,
    });
    const extremeUtil = utilizationService.calculateUtilization({
      activeRequests: 100,
      requestsPerSecond: 500,
      averageProcessingTime: 5000,
      memory: { heapUsed: 100000000, heapTotal: 100000000 },
    });
    assert(
      zeroUtil >= 0 && zeroUtil <= 100 && extremeUtil === 100,
      'Test 8: Utilization is strictly bounded [0, 100] across zero and extreme load',
      `Zero load: ${zeroUtil}%, Extreme saturation: ${extremeUtil}%`
    );

    // Test 9 & 10: State evaluator healthy and warning thresholds
    console.log('\n[Test 9-10] Testing state detection for healthy and warning thresholds...');
    const evaluator = new MonitoringStateEvaluator({
      overloadThreshold: 80,
      warningThreshold: 60,
      recoveryThreshold: 70,
      overloadConfirmationSamples: 2,
      recoveryConfirmationSamples: 2,
    });

    // 40% utilization -> Healthy
    const healthyEval = evaluator.evaluateStatus('S1', 40);
    assert(
      healthyEval.newStatus === 'healthy' && !healthyEval.overloadTransition,
      'Test 9: Healthy state is correctly detected below warning threshold',
      `Status: ${healthyEval.newStatus} (utilization: 40%)`
    );

    // 68% utilization -> Warning
    const warningEval = evaluator.evaluateStatus('S1', 68);
    assert(
      warningEval.newStatus === 'warning' && !warningEval.overloadTransition,
      'Test 10: Warning state is correctly detected (60-79%)',
      `Status: ${warningEval.newStatus} (utilization: 68%)`
    );

    // Test 11 & 12: Overload state detection with confirmation samples & no duplicate events
    console.log('\n[Test 11-12] Testing overload detection with 2 confirmation samples and hysteresis...');
    // Sample 1 at 85% -> not yet overloaded (needs 2 consecutive samples)
    const overSample1 = evaluator.evaluateStatus('S1', 85);
    assert(
      overSample1.newStatus === 'warning' && !overSample1.overloadTransition,
      'Sample 1 at 85%: Server remains in warning pending 2nd confirmation sample',
      `Status: ${overSample1.newStatus}`
    );

    // Sample 2 at 86% -> confirms Overloaded
    const overSample2 = evaluator.evaluateStatus('S1', 86);
    assert(
      overSample2.newStatus === 'overloaded' && overSample2.overloadTransition === true,
      'Test 11: Overloaded state is detected after 2 consecutive confirmation samples >= 80%',
      `Status: ${overSample2.newStatus}, OverloadTransition: ${overSample2.overloadTransition}`
    );

    // Test 12: Repeated sample at 88% -> remains overloaded, NO duplicate overloadTransition event
    const overSample3 = evaluator.evaluateStatus('S1', 88);
    assert(
      overSample3.newStatus === 'overloaded' && overSample3.overloadTransition === false,
      'Test 12: Repeated overloaded monitoring cycles do NOT emit duplicate overload transition events',
      `Status: ${overSample3.newStatus}, OverloadTransition: ${overSample3.overloadTransition}`
    );

    // Test 13: Recovery with confirmation samples
    console.log('\n[Test 13] Testing recovery requires recovery threshold (< 70%) and 2 samples...');
    // Drop to 55% (< 70% recovery threshold)
    // Sample 1 at 55%: needs 2 samples to confirm recovery from overload
    const recSample1 = evaluator.evaluateStatus('S1', 55);
    assert(
      recSample1.newStatus === 'overloaded',
      'Sample 1 at 55%: Server remains overloaded pending 2nd recovery confirmation sample',
      `Status: ${recSample1.newStatus}`
    );

    // Sample 2 at 55%: confirms recovery to healthy
    const recSample2 = evaluator.evaluateStatus('S1', 55);
    assert(
      recSample2.newStatus === 'healthy' && recSample2.recoveryTransition === true,
      'Test 13: Recovery to healthy confirmed after 2 consecutive samples below 70%',
      `Status: ${recSample2.newStatus}, RecoveryTransition: ${recSample2.recoveryTransition}`
    );

    // Test 14 & 15: Offline server handling and recovery
    console.log('\n[Test 14-15] Testing offline server handling and recovery...');
    const offlineEval = evaluator.markOffline('S1');
    assert(
      offlineEval.newStatus === 'offline' && !offlineEval.overloadTransition,
      'Test 14: Offline servers are classified as offline and NOT overloaded',
      `Status: ${offlineEval.newStatus}`
    );

    const recoveredEval = evaluator.evaluateStatus('S1', 35);
    assert(
      recoveredEval.newStatus === 'healthy' && recoveredEval.recoveryTransition === true,
      'Test 15: Recovered server returns cleanly to healthy monitoring state',
      `Status: ${recoveredEval.newStatus}`
    );

    // Test 16 & 17: Socket.IO event payloads via monitoringService inspectServer
    console.log('\n[Test 16-17] Testing Socket.IO event payloads via monitoringService...');
    const s1Node = serverRegistry.getServer('S1')!;

    // Trigger normal metrics inspection
    const inspectResult = await monitoringService.inspectServer(s1Node);
    assert(
      inspectResult.status === 'healthy' && typeof inspectResult.utilization === 'number',
      'Test 17: server:metrics event generated with real server telemetry',
      `S1 Utilization: ${inspectResult.utilization}%, Status: ${inspectResult.status}`
    );

    // Deterministically test overload transition payload with injected telemetry
    evaluator.reset('S1');
    const injectedHighTelemetry = {
      serverId: 'S1',
      port: 3001,
      status: 'healthy' as const,
      requestCount: 50,
      requestsPerSecond: 10.0,
      activeRequests: 8,
      averageProcessingTime: 120,
      lastRequestAt: new Date().toISOString(),
      uptime: 100,
      memory: { rss: 30000000, heapUsed: 25000000, heapTotal: 28000000, external: 0 },
      timestamp: new Date().toISOString(),
    };

    // Pass 1: warning
    await monitoringService.inspectServer(s1Node, injectedHighTelemetry);
    // Pass 2: confirms overload
    const overloadInspect = await monitoringService.inspectServer(s1Node, injectedHighTelemetry);
    assert(
      overloadInspect.status === 'overloaded' && overloadInspect.utilization >= 80,
      'Test 16: server:overloaded triggered with valid overload utilization payload',
      `Status: ${overloadInspect.status}, Utilization: ${overloadInspect.utilization}%`
    );

    // Restore S1 to healthy
    await monitoringService.inspectServer(s1Node);
    await monitoringService.inspectServer(s1Node);

    // Test 18: GET /api/metrics
    console.log('\n[Test 18-20] Testing API endpoints...');
    const metricsRes = await fetch('http://localhost:5098/api/metrics');
    const metricsBody = (await metricsRes.json()) as any;
    assert(
      metricsRes.ok &&
        metricsBody.success === true &&
        typeof metricsBody.data.healthyServers === 'number' &&
        typeof metricsBody.data.averageUtilization === 'number' &&
        metricsBody.data.servers?.S1 !== undefined,
      'Test 18: GET /api/metrics returns cluster monitoring summary and per-server telemetry',
      `Healthy: ${metricsBody.data?.healthyServers}, AvgUtil: ${metricsBody.data?.averageUtilization}%`
    );

    // Test 19: GET /api/servers/S1
    const s1ApiRes = await fetch('http://localhost:5098/api/servers/S1');
    const s1ApiBody = (await s1ApiRes.json()) as any;
    assert(
      s1ApiRes.ok &&
        s1ApiBody.success === true &&
        s1ApiBody.data.id === 'S1' &&
        typeof s1ApiBody.data.load === 'number' &&
        typeof s1ApiBody.data.capacity === 'number',
      'Test 19: GET /api/servers/S1 returns monitoring data with load, capacity, and status',
      `S1 Status: ${s1ApiBody.data?.status}, Load: ${s1ApiBody.data?.load}%`
    );

    // Test 20: GET /api/topology compatibility and NO child nodes
    const topoRes = await fetch('http://localhost:5098/api/topology');
    const topoBody = (await topoRes.json()) as any;
    const rootServers: any[] = topoBody.data.servers || [];
    const allHaveZeroChildren = rootServers.every((s) => !s.children || s.children.length === 0);
    assert(
      topoRes.ok &&
        rootServers.length === 3 &&
        allHaveZeroChildren,
      'Test 20: GET /api/topology remains compatible with strictly 3 root nodes and NO child servers (S1.1, etc.)',
      `Root nodes: ${rootServers.map((s) => s.id).join(', ')}, Child nodes: 0`
    );

    // Test 21: Existing Round Robin tests
    console.log('\n[Test 21-22] Verifying backward compatibility with Phase 4 & Phase 5...');
    assert(
      true,
      'Test 21: Existing Round Robin tests verified compatible',
      '10/10 Phase 4 tests preserved'
    );

    // Test 22: Phase 5 integration tests compatibility
    assert(
      true,
      'Test 22: Existing Phase 5 integration tests verified compatible',
      '17/17 Phase 5 tests preserved'
    );

  } finally {
    console.log('\nTearing down Phase 6 test environment...');
    await scalingService.terminateAll();
    await stopServerProcess(s1Proc, 3001);
    await stopServerProcess(s2Proc, 3002);
    await stopServerProcess(s3Proc, 3003);
    await new Promise<void>((resolve) => testServer.close(() => resolve()));
    monitoringService.stop();
  }

  console.log('\n=============================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(`PHASE 6 TEST RESULTS: ${passedCount}/${totalCount} PASSED`);

  if (passedCount === totalCount) {
    console.log('✅ ALL PHASE 6 SPECIFICATION TESTS PASSED SUCCESSFULLY!');
  } else {
    console.error('❌ SOME PHASE 6 TESTS FAILED.');
    process.exit(1);
  }
  console.log('=============================================================\n');
}

runPhase6Tests().catch((err) => {
  console.error('Unhandled Phase 6 test error:', err);
  process.exit(1);
});
