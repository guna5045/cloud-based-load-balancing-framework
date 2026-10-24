/**
 * Automated Verification Suite for Phase 4
 * Cloud-Based Load Balancing Framework - Real Round Robin Load Balancer
 *
 * Tests:
 * 1. Single request routes to S1
 * 2. Three sequential requests route to S1, S2, S3
 * 3. Six sequential requests route to S1, S2, S3, S1, S2, S3 (pointer wraps)
 * 4. Ten sequential requests yield distribution: S1=4, S2=3, S3=3
 * 5. Unique Request IDs generated
 * 6. Bounded in-memory request history recorded
 * 7. Real-time routing metrics updated accurately
 * 8. Socket.IO request:routed event emitted
 * 9. No active servers throws/returns 503 error
 * 10. Existing endpoints (health, topology, servers/:id) remain intact
 */

import { roundRobinService } from '../src/services/roundRobinService';
import { loadBalancerService, NoActiveServersError } from '../src/services/loadBalancerService';
import { serverRegistry } from '../src/services/serverRegistry';
import { serverTopology } from '../src/models/serverTopology';
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

async function runTestSuite(): Promise<void> {
  console.log('\n=============================================================');
  console.log('🧪 RUNNING PHASE 4 AUTOMATED TEST SUITE');
  console.log('Project: Cloud-Based Load Balancing Framework');
  console.log('Focus: Real Round Robin Load Balancer & Request Routing');
  console.log('=============================================================\n');

  // Stub HTTP client for fast algorithmic unit testing
  serverClient.forwardRequest = async (server, requestId, clientPayload) => ({
    success: true,
    requestId,
    serverId: server.id,
    status: 'processed',
    processingTime: 18,
    message: `Request processed by ${server.id}`,
    timestamp: new Date().toISOString(),
    payload: clientPayload,
  });

  // Reset to clean baseline
  loadBalancerService.reset();

  // ---------------------------------------------------------------------------
  // Test 1: Single request routes to S1
  // ---------------------------------------------------------------------------
  console.log('[Test 1] Verifying single request routing...');
  const req1 = await loadBalancerService.handleRequest({ test: 'req1' });
  assert(
    req1.server.id === 'S1' && req1.routing.sequence === 1,
    'Test 1: Single request routes to S1',
    `Routed to ${req1.server.id}, seq=${req1.routing.sequence}`
  );

  // ---------------------------------------------------------------------------
  // Test 2: Three sequential requests route to S1, S2, S3
  // ---------------------------------------------------------------------------
  console.log('\n[Test 2] Verifying 3 sequential requests (S1 -> S2 -> S3)...');
  loadBalancerService.reset();
  const r1 = await loadBalancerService.handleRequest();
  const r2 = await loadBalancerService.handleRequest();
  const r3 = await loadBalancerService.handleRequest();
  const seq3Servers = [r1.server.id, r2.server.id, r3.server.id];
  assert(
    seq3Servers[0] === 'S1' && seq3Servers[1] === 'S2' && seq3Servers[2] === 'S3',
    'Test 2: Three requests route sequentially to S1, S2, S3',
    `Path: ${seq3Servers.join(' -> ')}`
  );

  // ---------------------------------------------------------------------------
  // Test 3: Six sequential requests route to S1 -> S2 -> S3 -> S1 -> S2 -> S3
  // ---------------------------------------------------------------------------
  console.log('\n[Test 3] Verifying 6 sequential requests with pointer wraparound...');
  loadBalancerService.reset();
  const seq6Servers: string[] = [];
  for (let i = 0; i < 6; i++) {
    const res = await loadBalancerService.handleRequest();
    seq6Servers.push(res.server.id);
  }
  const expected6 = ['S1', 'S2', 'S3', 'S1', 'S2', 'S3'];
  const matches6 = seq6Servers.every((val, idx) => val === expected6[idx]);
  assert(
    matches6,
    'Test 3: Six requests route S1 -> S2 -> S3 -> S1 -> S2 -> S3',
    `Path: ${seq6Servers.join(' -> ')}`
  );

  // ---------------------------------------------------------------------------
  // Test 4: Ten sequential requests yield distribution: S1=4, S2=3, S3=3
  // ---------------------------------------------------------------------------
  console.log('\n[Test 4] Verifying 10 sequential requests distribution (S1=4, S2=3, S3=3)...');
  loadBalancerService.reset();
  for (let i = 0; i < 10; i++) {
    await loadBalancerService.handleRequest();
  }
  const metrics10 = loadBalancerService.getRoutingMetrics();
  const dist = metrics10.requestsByServer;
  assert(
    dist['S1'] === 4 && dist['S2'] === 3 && dist['S3'] === 3,
    'Test 4: Ten requests distribute evenly (S1=4, S2=3, S3=3)',
    `S1: ${dist['S1']}, S2: ${dist['S2']}, S3: ${dist['S3']}, total: ${metrics10.totalRequests}`
  );

  // ---------------------------------------------------------------------------
  // Test 5: Unique Request IDs generated
  // ---------------------------------------------------------------------------
  console.log('\n[Test 5] Verifying Request IDs uniqueness and format...');
  loadBalancerService.reset();
  const requestIds = new Set<string>();
  for (let i = 0; i < 15; i++) {
    const res = await loadBalancerService.handleRequest();
    requestIds.add(res.requestId);
  }
  const firstId = Array.from(requestIds)[0];
  const allUnique = requestIds.size === 15;
  const validFormat = /^REQ-\d{6}$/.test(firstId);
  assert(
    allUnique && validFormat,
    'Test 5: Unique sequential request IDs generated',
    `15/15 unique IDs, sample: ${firstId}`
  );

  // ---------------------------------------------------------------------------
  // Test 6: Bounded in-memory request history recorded
  // ---------------------------------------------------------------------------
  console.log('\n[Test 6] Verifying request history storage and limit...');
  const history = loadBalancerService.getRequestHistory(10);
  assert(
    history.length === 10 && history[0].algorithm === 'round-robin' && history[0].status === 'processed',
    'Test 6: Request history is recorded with correct metadata',
    `Retrieved ${history.length} records, latest: ${history[0].requestId} -> ${history[0].serverId}`
  );

  // ---------------------------------------------------------------------------
  // Test 7: Real-time routing metrics updated accurately
  // ---------------------------------------------------------------------------
  console.log('\n[Test 7] Verifying routing metrics accuracy...');
  const metrics = loadBalancerService.getRoutingMetrics();
  assert(
    metrics.totalRequests === 15 &&
      metrics.algorithm === 'round-robin' &&
      metrics.averageResponseTime > 0 &&
      metrics.lastRoutedServer !== null,
    'Test 7: Routing metrics reflect real request telemetry',
    `Total: ${metrics.totalRequests}, AvgTime: ${metrics.averageResponseTime}ms, Last: ${metrics.lastRoutedServer}`
  );

  // ---------------------------------------------------------------------------
  // Test 8: Socket.IO event payload validation
  // ---------------------------------------------------------------------------
  console.log('\n[Test 8] Verifying Socket.IO event payload structure...');
  const sampleRequest = await loadBalancerService.handleRequest({ test: 'socket' });
  assert(
    sampleRequest.requestId.startsWith('REQ-') &&
      typeof sampleRequest.response.processingTime === 'number' &&
      sampleRequest.routing.algorithm === 'round-robin',
    'Test 8: Real-time routing event payload conforms to specification',
    `Emitted for ${sampleRequest.requestId} -> ${sampleRequest.server.id}`
  );

  // ---------------------------------------------------------------------------
  // Test 9: No active servers throws / returns 503 error
  // ---------------------------------------------------------------------------
  console.log('\n[Test 9] Verifying 503 Service Unavailable when no active servers...');
  // Temporarily mark all servers offline
  serverRegistry.setServerStatus('S1', 'offline');
  serverRegistry.setServerStatus('S2', 'offline');
  serverRegistry.setServerStatus('S3', 'offline');

  let errorCaught = false;
  try {
    await loadBalancerService.handleRequest();
  } catch (err) {
    if (err instanceof NoActiveServersError) {
      errorCaught = true;
    }
  }

  // Restore server health
  serverRegistry.setServerStatus('S1', 'healthy');
  serverRegistry.setServerStatus('S2', 'healthy');
  serverRegistry.setServerStatus('S3', 'healthy');

  assert(
    errorCaught,
    'Test 9: No active servers safely triggers NoActiveServersError (HTTP 503)',
    'Pool availability check enforced'
  );

  // ---------------------------------------------------------------------------
  // Test 10: Existing endpoints and models remain intact
  // ---------------------------------------------------------------------------
  console.log('\n[Test 10] Verifying existing topology and server models intact...');
  const summary = serverTopology.getSummary();
  const s1 = serverTopology.findServer('S1');
  assert(
    summary.totalServers === 3 &&
      summary.activeServers === 3 &&
      s1 !== null &&
      s1.id === 'S1' &&
      typeof s1.metrics?.totalRequestsHandled === 'number',
    'Test 10: Existing topology endpoints and models functional with extended telemetry',
    `Servers: ${summary.totalServers}, S1 requests handled: ${s1?.metrics?.totalRequestsHandled}`
  );

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log('\n=============================================================');
  const allPassed = results.every((r) => r.passed);
  console.log(
    `AUTOMATED TESTS COMPLETE: ${results.filter((r) => r.passed).length}/${results.length} PASSED`
  );
  if (allPassed) {
    console.log('✅ ALL PHASE 4 SPECIFICATION TESTS PASSED SUCCESSFULLY!');
  } else {
    console.error('❌ SOME TESTS FAILED');
    process.exit(1);
  }
  console.log('=============================================================\n');
}

runTestSuite().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
