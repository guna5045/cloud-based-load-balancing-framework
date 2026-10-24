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

### Phase 1: Project Foundation (Current Phase)
- [x] Node.js + Express + TypeScript backend initialized.
- [x] React + Vite + TypeScript + Tailwind CSS frontend initialized.
- [x] Socket.IO real-time bi-directional connection pipeline established.
- [x] Server topology model with recursive tree data structure and traversal utilities.
- [x] Foundational API endpoints (`/api/health`, `/api/servers`, `/api/topology`, `/api/requests`, `/api/metrics`).
- [x] Clean architecture and documentation ready for subsequent phases.

### Phase 2: Load Balancer & Dynamic Scaling Engine (Postponed to Phase 2)
- Round-Robin distribution algorithm implementation.
- Simulated client traffic and burst generators.
- Threshold detection and automatic 3-child branching engine.
- Real-time event broadcasting over Socket.IO (`server:spawn`, `server:overload`, `request:routed`).
- Interactive visualization dashboard with tree graph view.
