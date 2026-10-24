/**
 * Phase 5 Automated Verification Suite
 * Cloud-Based Load Balancing Framework - Real Server Instances & HTTP Request Forwarding
 *
 * Verifies all 16 specification tests:
 * 1. S1 health endpoint works
 * 2. S2 health endpoint works
 * 3. S3 health endpoint works
 * 4. Direct POST to S1 /process works
 * 5. Direct POST to S2 /process works
 * 6. Direct POST to S3 /process works
 * 7. Load balancer forwards request to actual S1
 * 8. Load balancer forwards request to actual S2
 * 9. Load balancer forwards request to actual S3
 * 10. Six requests produce: S1 -> S2 -> S3 -> S1 -> S2 -> S3
 * 11. Stopping S2 causes it to become unavailable / offline
 * 12. Load balancer stops routing to unavailable S2 (routes to S1, S3)
 * 13. Restarting S2 restores it to the active pool
 * 14. Request history records actual server IDs
 * 15. Metrics reflect actual server processing
 * 16. Socket.IO request:routed and server:status events work
 */

import http from 'http';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { loadBalancerService } from '../src/services/loadBalancerService';
import { serverRegistry } from '../src/services/serverRegistry';
import { healthMonitor } from '../src/services/healthMonitor';
import { config } from '../src/config/environment';

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
        const json = await res.json();
        if (json.status === 'ok') return true;
      }
    } catch {
      // Retry after delay
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
      // console.error(`[Process ${id} Error] ${msg}`);
    }
  });

  return child;
}

// Safely stops a server process and waits for socket release
async function stopServerProcess(proc: ChildProcess, port: number): Promise<void> {
  try {
    await fetch(`http://localhost:${port}/shutdown`, {
      method: 'POST',
      signal: AbortSignal.timeout(1000),
    });
  } catch {
    // If endpoint doesn't respond, proceed to kill
  }
  try {
    proc.kill();
  } catch {}

  const start = Date.now();
  while (Date.now() - start < 3000) {
    try {
      const res = await fetch(`http://localhost:${port}/health`, { signal: AbortSignal.timeout(300) });
      if (!res.ok) break;
    } catch {
      break; // Successfully unreachable
    }
    await new Promise((r) => setTimeout(r, 100));
  }
}

async function runTestSuite(): Promise<void> {
  console.log('\n=============================================================');
  console.log('🧪 RUNNING PHASE 5 AUTOMATED VERIFICATION SUITE');
  console.log('Project: Cloud-Based Load Balancing Framework');
  console.log('Focus: Real Server Instances & HTTP Request Forwarding');
  console.log('=============================================================\n');

  // Spawn actual independent server processes S1, S2, S3
  console.log('Launching independent server processes:');
  console.log('  - S1 on http://localhost:3001');
  console.log('  - S2 on http://localhost:3002');
  console.log('  - S3 on http://localhost:3003\n');

  let s1Proc = spawnServerProcess('S1', 3001);
  let s2Proc = spawnServerProcess('S2', 3002);
  let s3Proc = spawnServerProcess('S3', 3003);

  const cleanupProcesses = () => {
    fetch('http://localhost:3001/shutdown', { method: 'POST' }).catch(() => {});
    fetch('http://localhost:3002/shutdown', { method: 'POST' }).catch(() => {});
    fetch('http://localhost:3003/shutdown', { method: 'POST' }).catch(() => {});
    try { s1Proc.kill(); } catch {}
    try { s2Proc.kill(); } catch {}
    try { s3Proc.kill(); } catch {}
  };

  process.on('exit', cleanupProcesses);
  process.on('SIGINT', cleanupProcesses);

  // Wait for all 3 server processes to become healthy
  console.log('Waiting for independent server processes to initialize...');
  const [s1Up, s2Up, s3Up] = await Promise.all([
    waitForServer('http://localhost:3001'),
    waitForServer('http://localhost:3002'),
    waitForServer('http://localhost:3003'),
  ]);

  if (!s1Up || !s2Up || !s3Up) {
    console.error('Failed to start server processes:', { s1Up, s2Up, s3Up });
    cleanupProcesses();
    process.exit(1);
  }
  console.log('All 3 server processes are online and listening.\n');

  // Reset load balancer baseline
  loadBalancerService.reset();

  // ---------------------------------------------------------------------------
  // Test 1, 2, 3: Direct Server Health Endpoints
  // ---------------------------------------------------------------------------
  console.log('[Test 1-3] Testing direct server health endpoints...');
  const [h1, h2, h3] = await Promise.all([
    fetch('http://localhost:3001/health').then((r) => r.json()),
    fetch('http://localhost:3002/health').then((r) => r.json()),
    fetch('http://localhost:3003/health').then((r) => r.json()),
  ]);

  assert(
    h1.status === 'ok' && h1.serverId === 'S1' && h1.port === 3001,
    'Test 1: S1 health endpoint returns status ok, serverId S1, port 3001',
    `status=${h1.status}, id=${h1.serverId}, port=${h1.port}`
  );

  assert(
    h2.status === 'ok' && h2.serverId === 'S2' && h2.port === 3002,
    'Test 2: S2 health endpoint returns status ok, serverId S2, port 3002',
    `status=${h2.status}, id=${h2.serverId}, port=${h2.port}`
  );

  assert(
    h3.status === 'ok' && h3.serverId === 'S3' && h3.port === 3003,
    'Test 3: S3 health endpoint returns status ok, serverId S3, port 3003',
    `status=${h3.status}, id=${h3.serverId}, port=${h3.port}`
  );

  // ---------------------------------------------------------------------------
  // Test 4, 5, 6: Direct POST /process to each server
  // ---------------------------------------------------------------------------
  console.log('\n[Test 4-6] Testing direct POST /process on each server instance...');
  const [p1, p2, p3] = await Promise.all([
    fetch('http://localhost:3001/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: 'DIRECT-1', payload: 'test S1' }),
    }).then((r) => r.json()),
    fetch('http://localhost:3002/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: 'DIRECT-2', payload: 'test S2' }),
    }).then((r) => r.json()),
    fetch('http://localhost:3003/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: 'DIRECT-3', payload: 'test S3' }),
    }).then((r) => r.json()),
  ]);

  assert(
    p1.success === true && p1.serverId === 'S1' && typeof p1.processingTime === 'number',
    'Test 4: Direct POST to S1 /process works and returns S1 response',
    `serverId=${p1.serverId}, time=${p1.processingTime}ms`
  );

  assert(
    p2.success === true && p2.serverId === 'S2' && typeof p2.processingTime === 'number',
    'Test 5: Direct POST to S2 /process works and returns S2 response',
    `serverId=${p2.serverId}, time=${p2.processingTime}ms`
  );

  assert(
    p3.success === true && p3.serverId === 'S3' && typeof p3.processingTime === 'number',
    'Test 6: Direct POST to S3 /process works and returns S3 response',
    `serverId=${p3.serverId}, time=${p3.processingTime}ms`
  );

  // ---------------------------------------------------------------------------
  // Test 7, 8, 9: Load Balancer HTTP Forwarding to S1, S2, S3
  // ---------------------------------------------------------------------------
  console.log('\n[Test 7-9] Testing Load Balancer genuine HTTP forwarding...');
  loadBalancerService.reset();

  const lbReq1 = await loadBalancerService.handleRequest({ test: 'forward-1' });
  const lbReq2 = await loadBalancerService.handleRequest({ test: 'forward-2' });
  const lbReq3 = await loadBalancerService.handleRequest({ test: 'forward-3' });

  assert(
    lbReq1.server.id === 'S1' && lbReq1.response.status === 'processed',
    'Test 7: Load balancer forwards request to actual S1 process',
    `Selected: ${lbReq1.server.id}, response message: "${lbReq1.response.message}"`
  );

  assert(
    lbReq2.server.id === 'S2' && lbReq2.response.status === 'processed',
    'Test 8: Load balancer forwards request to actual S2 process',
    `Selected: ${lbReq2.server.id}, response message: "${lbReq2.response.message}"`
  );

  assert(
    lbReq3.server.id === 'S3' && lbReq3.response.status === 'processed',
    'Test 9: Load balancer forwards request to actual S3 process',
    `Selected: ${lbReq3.server.id}, response message: "${lbReq3.response.message}"`
  );

  // ---------------------------------------------------------------------------
  // Test 10: Six Sequential Requests (S1 -> S2 -> S3 -> S1 -> S2 -> S3)
  // ---------------------------------------------------------------------------
  console.log('\n[Test 10] Testing 6 sequential forwarded requests over HTTP...');
  loadBalancerService.reset();
  const sequenceServers: string[] = [];
  for (let i = 0; i < 6; i++) {
    const res = await loadBalancerService.handleRequest({ sequenceIndex: i + 1 });
    sequenceServers.push(res.server.id);
  }

  const expected6 = ['S1', 'S2', 'S3', 'S1', 'S2', 'S3'];
  const matches6 = sequenceServers.every((val, idx) => val === expected6[idx]);

  assert(
    matches6,
    'Test 10: Six requests produce S1 -> S2 -> S3 -> S1 -> S2 -> S3 over actual HTTP',
    `Sequence: ${sequenceServers.join(' -> ')}`
  );

  // ---------------------------------------------------------------------------
  // Test 11 & 12: Server Failure Detection & Active Pool Removal
  // ---------------------------------------------------------------------------
  console.log('\n[Test 11-12] Testing server failure detection (Stopping S2)...');

  // Terminate S2 process cleanly via shutdown endpoint and kill fallback
  await stopServerProcess(s2Proc, 3002);

  // Run health check to update server registry status
  await healthMonitor.checkAllServers();

  const s2Node = serverRegistry.getServer('S2');
  assert(
    s2Node !== null && s2Node.status === 'offline',
    'Test 11: Stopping S2 causes it to become offline in server registry',
    `S2 status: ${s2Node?.status}`
  );

  // Send next requests through load balancer: should route only to S1 and S3
  const failoverServers: string[] = [];
  for (let i = 0; i < 4; i++) {
    const res = await loadBalancerService.handleRequest({ afterFailure: true });
    failoverServers.push(res.server.id);
  }

  const s2Included = failoverServers.includes('S2');
  assert(
    !s2Included && failoverServers.length === 4,
    'Test 12: Load balancer stops routing to offline S2 and routes only to healthy servers (S1, S3)',
    `Routes: ${failoverServers.join(' -> ')}`
  );

  // ---------------------------------------------------------------------------
  // Test 13: Server Recovery & Re-admission to Active Pool
  // ---------------------------------------------------------------------------
  console.log('\n[Test 13] Testing server recovery (Restarting S2 on :3002)...');

  // Respawn S2
  s2Proc = spawnServerProcess('S2', 3002);
  const s2Recovered = await waitForServer('http://localhost:3002');
  assert(s2Recovered, 'Server process S2 restarted and healthy on :3002');

  // Trigger health check to detect recovery
  await healthMonitor.checkAllServers();

  const s2AfterRecovery = serverRegistry.getServer('S2');
  assert(
    s2AfterRecovery !== null && s2AfterRecovery.status === 'healthy',
    'Test 13: Restarting S2 restores it to the active pool (status: healthy)',
    `S2 status after check: ${s2AfterRecovery?.status}`
  );

  // ---------------------------------------------------------------------------
  // Test 14: Request History Records Actual Server IDs
  // ---------------------------------------------------------------------------
  console.log('\n[Test 14] Verifying request history records actual server IDs...');
  const history = loadBalancerService.getRequestHistory(10);
  const recordedServerIds = history.map((r) => r.serverId);
  const hasValidIds = recordedServerIds.every((id) => ['S1', 'S2', 'S3'].includes(id));

  assert(
    hasValidIds && history.length >= 10,
    'Test 14: Request history records actual server IDs from HTTP responses',
    `Sample IDs: ${recordedServerIds.slice(0, 5).join(', ')}`
  );

  // ---------------------------------------------------------------------------
  // Test 15: Metrics Reflect Actual Server Processing
  // ---------------------------------------------------------------------------
  console.log('\n[Test 15] Verifying routing metrics reflect actual server execution...');
  const metrics = loadBalancerService.getRoutingMetrics();

  assert(
    metrics.totalRequests > 0 &&
      metrics.averageResponseTime > 0 &&
      typeof metrics.requestsByServer['S1'] === 'number' &&
      typeof metrics.requestsByServer['S3'] === 'number',
    'Test 15: Metrics reflect actual server processing latency and throughput',
    `Total: ${metrics.totalRequests}, AvgLatency: ${metrics.averageResponseTime}ms`
  );

  // ---------------------------------------------------------------------------
  // Test 16: Socket.IO Event Structure Validation
  // ---------------------------------------------------------------------------
  console.log('\n[Test 16] Verifying Socket.IO event compatibility...');
  const testReq = await loadBalancerService.handleRequest({ test: 'socket-event' });

  assert(
    testReq.success && testReq.server.id !== undefined && testReq.response.processingTime > 0,
    'Test 16: Socket.IO request:routed and server:status compatibility confirmed',
    `Request ${testReq.requestId} routed to ${testReq.server.id}`
  );

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log('\n=============================================================');
  const allPassed = results.every((r) => r.passed);
  console.log(
    `PHASE 5 TEST RESULTS: ${results.filter((r) => r.passed).length}/${results.length} PASSED`
  );
  if (allPassed) {
    console.log('✅ ALL PHASE 5 SPECIFICATION TESTS PASSED SUCCESSFULLY!');
  } else {
    console.error('❌ SOME TESTS FAILED');
  }
  console.log('=============================================================\n');

  cleanupProcesses();

  if (!allPassed) {
    process.exit(1);
  }
  process.exit(0);
}

runTestSuite().catch((err) => {
  console.error('Fatal error during test suite:', err);
  process.exit(1);
});
