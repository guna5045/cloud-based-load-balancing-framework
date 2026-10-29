# Cloud-Based Load Balancing Framework

An academic Computer Networks and Distributed Systems research framework implementing an authoritative Round Robin cloud load balancer with a dynamic, hierarchical tree topology, real-time telemetry monitoring, and load-driven automatic recursive 3-child server scaling.

---

## 1. Overview

The **Cloud-Based Load Balancing Framework** is an academic software testbed designed to demonstrate the fundamentals of distributed systems, server clustering, dynamic traffic routing, real-time telemetry-driven health monitoring, and decentralized recursive auto-scaling.

The system models a cloud load-balancing tier that dynamically manages a hierarchical fleet of independent Express HTTP server processes. Incoming HTTP client requests are received by the centralized Load Balancer (`:5000`), scheduled deterministically via Round Robin, and forwarded over actual HTTP connections to active, healthy leaf servers. Real-time operational state, topology mutations, latency metrics, and scaling operations are synchronized with a high-fidelity React dashboard via bi-directional WebSockets (Socket.IO).

---

## 2. Problem Statement

Traditional static load balancing architectures rely on fixed server pools (`S1, S2, S3`) provisioned for average load. During sustained traffic surges:
1. Individual server instances experience queue congestion, resource exhaustion, and high processing latency.
2. Monolithic horizontal scaling provisions large server instances globally, resulting in resource waste and slow provisioning cycles.
3. Centralized failure detection often flaps between healthy and unhealthy states due to transient network spikes.
4. Distributed state divergence occurs when frontends fabricate or estimate cluster status without authoritative backend truth.

This framework addresses these challenges by introducing **localized, decentralized, recursive 3-child auto-scaling**, where only the specific overloaded server branch expands, while unburdened servers continue operating normally.

---

## 3. Objectives

- **Authoritative Scheduling**: Implement deterministic Round Robin request distribution across active leaf servers.
- **Genuine Process Orchestration**: Operate real, independent Node.js HTTP server processes on distinct TCP ports.
- **Deterministic Telemetry Monitoring**: Calculate utilization derived from real active request concurrency, request throughput (RPS), execution latency, and heap memory—with zero simulated randomness.
- **Hysteresis Flapping Protection**: Require consecutive confirmation samples (2 samples $\ge 80\%$ to scale; 2 samples $< 70\%$ to recover) to prevent rapid status oscillation.
- **Recursive 3-Child Auto-Scaling**: Atomically spawn exactly 3 dynamic child instances (`S1.1`, `S1.2`, `S1.3`) beneath any overloaded server node.
- **Multi-Level Tree Recursion**: Support arbitrary recursive expansion (e.g. `S1.2` $\rightarrow$ `S1.2.1`, `S1.2.2`, `S1.2.3`) bounded by strict safety limits (`MAX_SCALING_DEPTH=10`, `MAX_SERVER_PROCESSES=50`).
- **Resilient Failure Handling**: Gracefully handle server crashes, health check timeouts, scaling failures with atomic rollback, and complete cluster blackouts (HTTP 503 `SERVICE_UNAVAILABLE`).
- **Authoritative Real-Time Frontend**: Maintain bi-directional Socket.IO synchronization and REST re-synchronization on reconnect/refresh without page reloads.

---

## 4. Key Features

- **Round Robin Scheduler**: Persistent in-memory routing pointer advancing sequentially ($S_1 \rightarrow S_2 \rightarrow S_3 \rightarrow S_1\dots$).
- **Independent Server Processes**: Root instances S1 (:3001), S2 (:3002), S3 (:3003) running independent HTTP listeners.
- **Real-Time Telemetry**: Each server exposes `GET /telemetry` tracking in-flight concurrency wrapped in `try/finally` blocks.
- **Mathematical Utilization Model**: Multi-factor utilization score:
  $$\text{Utilization} = \min\left(100, \left(40 \cdot \frac{\text{active}}{10}\right) + \left(35 \cdot \frac{\text{RPS}}{20}\right) + \left(15 \cdot \frac{\text{latency}}{200}\right) + \left(10 \cdot \frac{\text{heapUsed}}{\text{heapTotal}}\right)\right)$$
- **Automatic Recursive Scaling**: Overloaded leaf nodes spawn 3 child processes on dynamic collision-free ports (3100–3999).
- **Scaled Parent Protection**: Scaled parents become logical group nodes and are excluded from the active leaf routing pool; only active leaf servers receive routed traffic.
- **Dynamic Port Allocation**: Socket probe checks ensure dynamically allocated ports are verified free prior to process spawning.
- **Atomic Scaling Rollback**: If child startup or health verification fails, all allocated ports and child processes are terminated, restoring the parent state cleanly.
- **Failure Detection & Failover**: Automatic HTTP forwarding failover to the next healthy server if a target instance crashes mid-request.
- **Two Distinct Modes**:
  - **Real Mode**: Authoritative backend-driven execution with real HTTP forwarding, real child processes, and live Socket.IO events.
  - **Simulation Mode**: Self-contained client-side testbed for visualizing traffic flow, particles, and node expansion without starting backend processes.

---

## 5. Architecture

```text
                           ┌───────────────────────────┐
                           │    React Web Dashboard    │
                           │   (Vite + Tailwind CSS)   │
                           └─────────────┬─────────────┘
                                         │
                                 HTTP / Socket.IO
                                 (Port 5000 / WS)
                                         │
                                         ▼
                           ┌───────────────────────────┐
                           │   Express Load Balancer   │
                           │    & Gateway Service      │
                           └─────────────┬─────────────┘
                                         │
                       Deterministic Round Robin Routing
                                         │
            ┌────────────────────────────┼────────────────────────────┐
            ▼                            ▼                            ▼
     ┌──────────────┐             ┌──────────────┐             ┌──────────────┐
     │ Root Server  │             │ Root Server  │             │ Root Server  │
     │      S1      │             │      S2      │             │      S3      │
     │    :3001     │             │    :3002     │             │    :3003     │
     └──────┬───────┘             └──────────────┘             └──────────────┘
            │ (Overload Trigger: >= 80% load, 2 confirmed samples)
            │ (Spawns 3 child processes on dynamic ports 3100-3999)
            ▼
     ┌─────────────────────────────────────────────────────────┐
     │ Scaled Parent Group (S1) - Excluded from Leaf Routing   │
     │   ├── S1.1 (:3100) ── Active Leaf Server                │
     │   ├── S1.2 (:3101) ── Scaled Parent (Recursive)         │
     │   │     ├── S1.2.1 (:3103) ── Active Leaf Server        │
     │   │     ├── S1.2.2 (:3104) ── Active Leaf Server        │
     │   │     └── S1.2.3 (:3105) ── Active Leaf Server        │
     │   └── S1.3 (:3102) ── Active Leaf Server                │
     └─────────────────────────────────────────────────────────┘
```

---

## 6. Technology Stack

- **Frontend**:
  - React 18
  - TypeScript 5.7
  - Vite 5.4
  - Tailwind CSS 3.4
  - Framer Motion 11
  - React Flow (`@xyflow/react`) 12
  - Socket.IO Client 4.8
  - Lucide React
- **Backend & Gateway**:
  - Node.js 20+
  - Express 4.21
  - TypeScript 5.7
  - Socket.IO Server 4.8
  - CORS, Dotenv
  - TSX (TypeScript Execute) 4.19
- **Server Processes**:
  - Independent Node.js / Express micro-servers
  - Cross-platform child process management (`child_process.spawn`)
- **Testing & Verification**:
  - TSX-driven automated integration and unit test runners
  - Native `fetch` with `AbortController` timeouts

---

## 7. Project Structure

```text
cloudtree/
│
├── frontend/                      # React 18 + Vite + Tailwind CSS Dashboard
│   ├── src/
│   │   ├── components/            # UI components (TopologyGraph, AppHeader, EventFeed, etc.)
│   │   ├── context/               # RealRoutingContext, SimulationContext
│   │   ├── hooks/                 # Custom React hooks (useRealRouting, useSocket)
│   │   ├── pages/                 # Dashboard, Servers, Requests, AutoScaling, Analytics, Events
│   │   ├── services/              # REST API client (api.ts) & Socket.IO client (socket.ts)
│   │   ├── types/                 # Shared TypeScript models and interfaces
│   │   ├── utils/                 # Layout engines, environment helpers
│   │   ├── App.tsx                # App root wrapped in Context Providers
│   │   └── main.tsx               # DOM entry point
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── backend/                       # Node.js + Express + Socket.IO Load Balancer
│   ├── src/
│   │   ├── config/                # Environment configuration & safety limits
│   │   ├── controllers/           # HTTP controllers (request, server, topology, metrics)
│   │   ├── middlewares/           # Request logger, CORS, global error handler
│   │   ├── models/                # Hierarchical ServerTopology n-ary tree model
│   │   ├── routes/                # Express API routes (/api/requests, /api/topology, etc.)
│   │   ├── services/              # LoadBalancer, RoundRobin, Monitoring, Scaling, PortAllocator
│   │   ├── types/                 # Backend interfaces (ServerNode, RoutingResult, events)
│   │   ├── utils/                 # Academic structured logger
│   │   ├── websocket/             # Socket.IO WebSocket broadcast engine
│   │   ├── app.ts                 # Express application configuration
│   │   └── server.ts              # HTTP listener entry point (:5000)
│   ├── tests/                     # Automated Test Suites (Phases 4 through 9)
│   │   ├── roundRobin.test.ts     # Phase 4 Test Suite (10 tests)
│   │   ├── phase5.test.ts         # Phase 5 Test Suite (17 tests)
│   │   ├── phase6.test.ts         # Phase 6 Test Suite (24 tests)
│   │   ├── phase7.test.ts         # Phase 7 Test Suite (32 tests)
│   │   ├── phase8.test.ts         # Phase 8 Test Suite (23 tests)
│   │   └── phase9.test.ts         # Phase 9 Test Suite (29 tests)
│   └── package.json
│
├── servers/                       # Independent Server Process Implementation
│   ├── src/
│   │   └── server.ts              # Express server instance process (:3001, :3002, :3003, dynamic)
│   ├── package.json
│   └── tsconfig.json
│
├── docs/                          # Academic Specifications & Demonstration Guides
│   ├── architecture.md            # Complete Architectural Specification
│   ├── deployment.md              # Demonstration & Local Deployment Guide
│   └── viva-guide.md              # Oral Defense & College Viva Walkthrough
│
├── .env.example                   # Clean environment configuration template
├── .gitignore                     # Git ignore rules
├── package.json                   # Monorepo root orchestrator scripts
└── README.md                      # Comprehensive project documentation
```

---

## 8. How It Works

### Request Ingress & Forwarding Pipeline
1. **Client Request**: Client submits `POST /api/requests` to Load Balancer (`:5000`).
2. **Payload Validation**: Controller validates payload structure and assigns a sequential Request ID (`REQ-000001`).
3. **Round Robin Selection**: `roundRobinService.getNextServer()` queries `serverRegistry.getActiveServers()` (filtering for `status !== 'offline' && status !== 'scaling' && children.length === 0`). Pointer advances atomically modulo pool size.
4. **HTTP Forwarding**: `serverClient.forwardRequest()` dispatches HTTP `POST http://localhost:<port>/process` with an `AbortController` timeout (3000ms).
5. **Server Processing**: Target server instance increments active concurrency, simulates computational workload, decrements concurrency in `finally`, and returns normalized execution response.
6. **Telemetry & Real-Time Broadcast**: Load Balancer logs metrics, records in-memory request history, and emits `request:routed` via Socket.IO containing target `serverId`, latency, and authoritative `nextServerId`.
7. **Response to Client**: Returns HTTP 200 with complete routing metadata.

### Monitoring & Overload Transition Pipeline
1. **Periodic Inspection**: `monitoringService.ts` executes every 5000ms, polling `GET /telemetry` from each registered server instance.
2. **Deterministic Utilization**: Computes multi-factor load percentage ($0-100\%$).
3. **Hysteresis Evaluation**:
   - Sample 1 above $80\%$: Server transitions to `warning` status.
   - Sample 2 consecutively above $80\%$: Server transitions to `overloaded` status; emits `server:overloaded`.
4. **Auto-Scaling Handshake**: `scalingService.handleOverload()` evaluates scaling eligibility.
5. **Port Allocation**: `portAllocator.allocatePorts(3)` allocates 3 collision-free ports in range 3100–3999.
6. **Process Spawning**: Spawns 3 child processes (`S1.1`, `S1.2`, `S1.3`) using `child_process.spawn`.
7. **Health Verification**: Polls `GET /health` on each child port until all respond with status `ok`.
8. **Topology Mutation**: Parent node status updated to `scaled`; children registered as active leaves.
9. **Cluster Broadcast**: Emits `server:scaled` and `topology:updated` with authoritative tree snapshots.

---

## 9. Recursive Scaling

Scaling is strictly tree-recursive and branch-independent:

```text
Level 1 (Root):              S1
                             │ (Overload >= 80%)
Level 2 (Children):    ┌─────┼─────┐
                      S1.1  S1.2  S1.3
                             │ (S1.2 Overload >= 80%)
Level 3 (Recursive):   ┌─────┼─────┐
                    S1.2.1 S1.2.2 S1.2.3
```

- When `S1` scales, its status becomes `scaled`. It is removed from the active routing pool.
- When `S1.2` scales, `S1.2` becomes a scaled parent. Its children `S1.2.1`, `S1.2.2`, `S1.2.3` enter the active routing pool.
- Active leaf servers after recursive scaling: `[S1.1, S1.3, S1.2.1, S1.2.2, S1.2.3, S2, S3]`.
- Requests automatically distribute across all 7 active leaves via Round Robin.

---

## 10. Failure Handling

1. **Root Server Failure**:
   - When S1 process terminates, `inspectServer` detects unreachability and marks S1 `offline`.
   - `serverRegistry.getActiveServers()` immediately excludes S1.
   - Traffic seamlessly routes through remaining healthy instances (`[S2, S3]`).
2. **Failover Mid-Request**:
   - If a server crashes during request forwarding, `loadBalancerService` catches `ServerCommunicationError`, marks the server `offline`, emits `server:status`, and immediately retries the request with the next healthy server.
3. **Total Cluster Outage (No Active Servers)**:
   - When all servers are offline, incoming requests return a controlled `HTTP 503 SERVICE_UNAVAILABLE` with error message `"No active servers available in the load balancing pool"`. The backend does not crash.
   - Restoring any server immediately resumes request routing without restarting the load balancer.
4. **Child Server Failure**:
   - If dynamic child `S1.2` crashes, it is marked `offline`. Parent `S1` remains `scaled`. Siblings `S1.1` and `S1.3` continue handling traffic.
5. **Child Recovery**:
   - When `S1.2` recovers, health monitoring detects its recovery and restores it to `healthy`. It rejoins the active pool without duplicate node creation or topology corruption.
6. **Atomic Scaling Rollback**:
   - If child process spawning or health checks fail during scaling, any started processes are terminated, allocated ports are released, parent status reverts to its prior state, and `server:scale_failed` is broadcast.
7. **Safety Limits**:
   - `MAX_SCALING_DEPTH=10`: Prevents infinite recursive descent.
   - `MAX_SERVER_PROCESSES=50`: Prevents OS process table exhaustion.
   - `scalingLocks`: Prevents duplicate concurrent scaling operations on the same parent.

---

## 11. Running Locally

### Prerequisites
- Node.js 18+ (Node.js 20+ recommended)
- npm 9+
- Windows, macOS, or Linux

### Installation
Clone the repository and install all dependencies:
```bash
# Install root, backend, frontend, and servers dependencies
npm run install:all
```

### Starting the System
Open your terminal and run the complete cluster concurrently:
```bash
# Option 1: Start everything in one command (Load Balancer, UI, S1, S2, S3)
npm run dev:all

# Option 2: Start components in separate terminal windows
# Terminal 1: Root Servers (S1 :3001, S2 :3002, S3 :3003)
npm run servers

# Terminal 2: Backend Load Balancer (:5000)
npm run dev:backend

# Terminal 3: Frontend Dashboard (:5173)
npm run dev:frontend
```

Open your browser to: **`http://localhost:5173`**

---

## 12. Testing

The framework includes a comprehensive, automated test suite spanning Phases 4 through 9:

```bash
# Run the complete test suite across all phases (135 tests)
npm run test:all --prefix backend

# Run individual phase suites
npm run test --prefix backend         # Phase 4: Round Robin (10 tests)
npm run test:phase5 --prefix backend  # Phase 5: Real Server Forwarding (17 tests)
npm run test:phase6 --prefix backend  # Phase 6: Telemetry Monitoring (24 tests)
npm run test:phase7 --prefix backend  # Phase 7: Recursive Auto-Scaling (32 tests)
npm run test:phase8 --prefix backend  # Phase 8: Real-Time Frontend Sync (23 tests)
npm run test:phase9 --prefix backend  # Phase 9: Resilience & Failure Handling (29 tests)
```

### Verified Test Results
```text
=============================================================
Phase 4 (Round Robin Routing):         10 / 10 PASSED
Phase 5 (HTTP Forwarding & Servers):   17 / 17 PASSED
Phase 6 (Monitoring & Overload):       24 / 24 PASSED
Phase 7 (Recursive 3-Child Scaling):   32 / 32 PASSED
Phase 8 (Real-Time Frontend Sync):     23 / 23 PASSED
Phase 9 (Resilience & Failure Tests):  29 / 29 PASSED
=============================================================
TOTAL TEST SUITE PASS RATE:           135 / 135 PASSED (100%)
=============================================================
```

---

## 13. REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Backend operational health and uptime |
| `GET` | `/api/topology` | Full hierarchical server tree, active leaves, scaled counts |
| `GET` | `/api/servers` | Flat list of all registered server instances |
| `GET` | `/api/servers/:id` | Detailed metadata and metrics for a specific server |
| `POST` | `/api/requests` | Dispatches client request through Round Robin load balancer |
| `GET` | `/api/requests?limit=50` | Recent request routing history |
| `GET` | `/api/metrics` | Cluster throughput, latencies, request distribution, next target |
| `GET` | `/api/metrics/history/:id` | Bounded telemetry time-series samples for a server |
| `GET` | `/api/metrics/scaling/history`| Audit log of all completed scaling operations |

---

## 14. Socket.IO Real-Time Events

| Event Name | Direction | Payload Description |
|---|---|---|
| `connection:ack` | Server $\rightarrow$ Client | Handshake acknowledging real-time connection and socket ID |
| `request:routed` | Server $\rightarrow$ Client | Dispatched request ID, target server ID, latency, nextServerId |
| `server:metrics` | Server $\rightarrow$ Client | Live telemetry tick (utilization, activeRequests, RPS, latency) |
| `server:status` | Server $\rightarrow$ Client | Status transition event (`healthy`, `warning`, `overloaded`, `offline`) |
| `server:overloaded`| Server $\rightarrow$ Client | High-priority alert when server confirms $\ge 80\%$ sustained load |
| `server:scaling` | Server $\rightarrow$ Client | Scale operation started; parent status set to `scaling` |
| `server:scaled` | Server $\rightarrow$ Client | Scale completed; 3 child IDs and updated tree snapshot attached |
| `server:scale_failed`| Server $\rightarrow$ Client | Scale operation aborted; rollback details and reason |
| `topology:updated` | Server $\rightarrow$ Client | Authoritative topology snapshot after any tree mutation |

---

## 15. Limitations

- **No Automatic Scale-Down**: Per academic project specifications, automatic termination of child servers upon load recovery is not implemented. Scaling is additive for testing and demonstration stability.
- **Single Host Execution**: All server instances run as independent processes on a single physical host binding to `localhost` on distinct ports.
- **In-Memory Volatility**: Topology state, routing pointers, and metrics history are maintained in memory; restarting the load balancer resets the cluster to initial baseline root servers (`S1`, `S2`, `S3`).
- **Local Process Limits**: Maximum process count is bounded at 50 processes to prevent host operating system exhaustion.

---

## 16. Future Enhancements

- **Hysteresis Scale-Down**: Implement automated scale-down when child server utilization remains $< 30\%$ for 3 consecutive monitoring intervals.
- **Containerized Multi-Host Deployment**: Package individual server instances into lightweight Docker containers orchestrated via Docker Compose.
- **Weighted & Least-Connections Scheduling**: Introduce selectable alternative load-balancing algorithms alongside Round Robin.
- **Distributed Shared State**: Back server registry and metrics history with a distributed in-memory cache (e.g. Redis) for multi-gateway clustering.

---

## 17. Production Deployment (Render)

This project is fully configured for production deployment on [Render](https://render.com).

### Backend (Web Service)
Deploy the load balancer backend and internal server cluster as a Render Web Service:

- **Service Type**: Web Service
- **Root Directory**: `backend`
- **Environment**: Node
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Health Check Path**: `/api/health`
- **Environment Variables**:
  | Variable | Value | Description |
  |---|---|---|
  | `PORT` | *(Provided by Render)* | Render dynamically injects the public port |
  | `HOST` | `0.0.0.0` | Binds to all network interfaces |
  | `NODE_ENV` | `production` | Production execution mode |
  | `FRONTEND_URL` | `https://<your-frontend>.onrender.com` | Allowed CORS origin for web dashboard |

> **Internal Process Architecture Note**: The backend web service binds publicly to Render's dynamic port while automatically managing root servers (`S1:3001`, `S2:3002`, `S3:3003`) and dynamic children internally over `localhost`. Internal ports are never exposed to the public internet.

---

### Frontend (Static Site)
Deploy the React dashboard as a Render Static Site:

- **Service Type**: Static Site
- **Root Directory**: `frontend`
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`
- **Environment Variables**:
  | Variable | Value | Description |
  |---|---|---|
  | `VITE_API_URL` | `https://<your-backend>.onrender.com` | URL of the deployed Backend Web Service |
  | `VITE_WS_URL` | `https://<your-backend>.onrender.com` | URL of the WebSocket / Socket.IO server |
  | `VITE_APP_TITLE` | `Cloud-Based Load Balancing Framework` | Application title |

> **Single Page Application (SPA) Routing**: Direct navigation to client-side routes (e.g. `/topology`, `/servers`, `/analytics`) is pre-configured via `public/_redirects` (`/* /index.html 200`), ensuring zero 404 errors on browser reload.
