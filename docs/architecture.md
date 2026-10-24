# Cloud-Based Load Balancing Framework: Architecture Specification

## 1. Executive Summary
The **Cloud-Based Load Balancing Framework** is a web-based distributed systems simulator and load balancing testbed designed for academic Computer Networks research.

It demonstrates:
1. Client request handling and distribution.
2. Round-Robin scheduling across a dynamic server pool.
3. Hierarchical tree-based cloud server topology.
4. Localized, load-driven auto-scaling (spawning 3 child nodes per overloaded server).
5. Real-time topology synchronization using WebSocket/Socket.IO.

---

## 2. System Flow

```text
       [ Clients / Web Dashboard ]
                   │
                   │ HTTP / Socket.IO
                   ▼
         [ Frontend Web App ]
         (React + TypeScript + Vite)
                   │
                   │ REST API / WebSocket
                   ▼
          [ Backend Gateway ]
         (Node.js + Express API)
                   │
                   ▼
          [ Load Balancer ]
        (Round-Robin Distribution)
                   │
                   ▼
        [ Server Topology Tree ]
     ├── S1 (Root)
     │   ├── S1.1 (Child)
     │   ├── S1.2 (Child)
     │   └── S1.3 (Child)
     ├── S2 (Root)
     └── S3 (Root)
                   │
                   ▼
        [ Real-Time Monitoring ]
    (Load, Latency, CPU, Scaling Events)
                   │
                   ▼
    [ Dynamic Hierarchical Scaling ]
 (Threshold check -> Spawn 3 child nodes)
```

---

## 3. Core Architectural Rules

### 3.1 Recursive Tree Representation
Rather than treating the server fleet as a static flat array, the topology is modeled as an n-ary tree:

```typescript
interface ServerNode {
  id: string;                    // e.g., 'S1', 'S1.2', 'S1.2.3'
  parentId: string | null;       // null for root nodes
  status: ServerStatus;          // 'healthy' | 'warning' | 'overloaded' | 'offline'
  load: number;                  // 0 to 100 percentage
  capacity: number;              // Request throughput quota
  children: ServerNode[];        // Arbitrary depth child nodes
  createdAt: string;             // Timestamp
  metrics?: ServerMetrics;       // CPU, Memory, Latency, Active connections
}
```

### 3.2 Load Balancing & Scaling Strategy
- **Initial State**: S1, S2, and S3 are active root servers.
- **Distribution Algorithm**: Round-Robin request scheduling.
- **Overload Trigger**: Any individual node crossing the overload threshold (e.g. 80% load) initiates an expansion.
- **Branch Independence**: Any node anywhere in the tree can independently branch into 3 sub-servers (`<id>.1`, `<id>.2`, `<id>.3`).
- Expansion is NOT restricted to a single branch; multiple branches can grow concurrently based on localized traffic.

---

## 4. Phase Breakdown

### Phase 1: Project Foundation (Completed)
- [x] Node.js + Express + TypeScript backend initialized.
- [x] React + Vite + TypeScript + Tailwind CSS frontend initialized.
- [x] Socket.IO real-time bi-directional connection pipeline established.
- [x] Server topology model with recursive tree data structure and traversal utilities.
- [x] Foundational API endpoints (`/api/health`, `/api/servers`, `/api/topology`, `/api/requests`, `/api/metrics`).
- [x] Clean architecture and documentation ready for subsequent phases.

### Phase 2: Professional UI/UX Design (Completed)
- [x] Modern cloud infrastructure dashboard theme and design system.
- [x] Real-time metrics visualization (throughput, latency, active connections).
- [x] Event feed, topology preview, and status telemetry badges.
- [x] Responsive layout with collapsible drawers and dark aesthetic.

### Phase 3: Interactive Live Topology & Request Flow Simulation (Completed)
- [x] Interactive React Flow topology visualizer with recursive node rendering.
- [x] Animated request flow particles along edges.
- [x] Traffic simulation controls with overload and branch expansion demo.
- [x] SimulationContext with decoupled simulation and real-routing modes.

### Phase 4: Real Round Robin Load Balancer & Request Routing (Completed)
- [x] Real Round Robin algorithm with persistent routing pointer.
- [x] Server Registry managing active and offline servers.
- [x] Request routing pipeline with unique request ID generation.
- [x] Backend request history and routing metrics tracking.
- [x] Real-time Socket.IO `request:routed` event broadcasting.
- [x] 10/10 automated Round Robin unit tests passing.

### Phase 5: Real Server Instances & HTTP Forwarding (Completed)
- [x] Real independent Express HTTP server instances (`S1: 3001`, `S2: 3002`, `S3: 3003`).
- [x] Genuine HTTP forwarding from Load Balancer (`:5000`) using native `fetch` with 3000ms timeout.
- [x] Real failure detection and automatic failover to healthy servers.
- [x] Background active health monitoring loop (every 5s) with automatic recovery.
- [x] Dedicated endpoints per server instance: `GET /health`, `POST /process`, `GET /telemetry`, `GET /requests`, `POST /shutdown`.
- [x] Frontend port chips, Socket.IO `server:status` listener, and real-routing updates.
- [x] 27/27 automated unit and integration tests passing (`npm run test:all`).

### Phase 6: Automatic Scaling Engine & Dynamic Child Spawning (Upcoming)
- Overload threshold detection (e.g. 80% sustained load).
- Dynamic 3-child server branching (`S1.1`, `S1.2`, `S1.3`).
- Hierarchical load distribution and child routing algorithms.
- Automatic scale-down and node cleanup.
