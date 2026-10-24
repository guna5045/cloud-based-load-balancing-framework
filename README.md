# Cloud-Based Load Balancing Framework

An academic Computer Networks project implementing a cloud load balancer with a dynamic, hierarchical tree topology and load-driven automatic scaling.

---

## 1. Project Overview

The **Cloud-Based Load Balancing Framework** simulates a cloud infrastructure where:
- Incoming client traffic is distributed using a **Round-Robin** scheduling algorithm.
- Initial topology starts with 3 root server instances: **S1, S2, and S3**.
- Server health and traffic load are monitored continuously.
- When **any** active server in the tree crosses the configured overload threshold, that specific server node dynamically creates **exactly 3 child instances** beneath it (e.g., `S1` creates `S1.1`, `S1.2`, `S1.3`).
- Scaling is tree-based and decentralized across any branch in the topology.

---

## 2. Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Socket.IO Client, Lucide React
- **Backend**: Node.js, Express, TypeScript, Socket.IO Server, CORS, Dotenv
- **Real-Time Communication**: Socket.IO (WebSocket + HTTP long-polling fallback)
- **Tooling & Code Quality**: npm, ESLint, Prettier, tsx

---

## 3. Project Structure

```text
cloud-based-load-balancing-framework/
│
├── frontend/                  # React + TypeScript + Vite + Tailwind CSS application
│   ├── src/
│   │   ├── components/        # UI components (Header, TopologyPreview, ConnectionStatus)
│   │   ├── pages/             # Dashboard and views
│   │   ├── hooks/             # Custom React hooks (useSocket)
│   │   ├── services/          # REST API & Socket.IO clients
│   │   ├── types/             # Shared TypeScript models and interfaces
│   │   ├── utils/             # Helper utilities
│   │   ├── App.tsx            # Main application component
│   │   └── main.tsx           # Application entry point
│   ├── .env.example           # Frontend environment template
│   ├── tailwind.config.js     # Tailwind CSS configuration
│   ├── vite.config.ts         # Vite bundler configuration
│   └── package.json
│
├── backend/                   # Node.js + Express + TypeScript API server
│   ├── src/
│   │   ├── controllers/       # Route controllers (health, server, topology, metrics)
│   │   ├── routes/            # Express routers (/api/health, /api/servers, etc.)
│   │   ├── models/            # Tree data structure and server topology model
│   │   ├── websocket/         # Socket.IO connection and event handlers
│   │   ├── middlewares/       # Request logger and error handlers
│   │   ├── config/            # Environment variable loading
│   │   ├── types/             # Backend TypeScript interfaces
│   │   ├── utils/             # Logger and utility functions
│   │   ├── app.ts             # Express application setup
│   │   └── server.ts          # Server entry point & HTTP listener
│   ├── .env.example           # Backend environment template
│   ├── tsconfig.json          # TypeScript compiler configuration
│   └── package.json
│
├── servers/                   # Server topology reference and documentation
│   └── README.md
│
├── docs/                      # Architectural specifications and diagrams
│   └── architecture.md
│
├── .gitignore                 # Git ignore rules
├── README.md                  # Project documentation (this file)
└── package.json               # Root orchestrator scripts
```

---

## 4. Current Phase: Phase 6 (Real-Time Server Monitoring & Overload Detection)

### Completed in Phase 6:
- **Real Server Telemetry**: Server instances (`S1`, `S2`, `S3`) expose live operational telemetry through `GET /telemetry`, including in-flight `activeRequests`, rolling `requestsPerSecond` (5s sliding window), bounded `averageProcessingTime`, Node.js heap memory, process CPU usage, and uptime.
- **Accurate Active Request Tracking**: Execution wrapped in `try/finally` blocks so concurrency counters strictly track actual in-flight HTTP requests.
- **Deterministic Utilization Formula**: Dedicated `utilizationService.ts` computing a normalized `[0, 100]%` score derived from active concurrency pressure (40%), request rate pressure (35%), execution latency pressure (15%), and heap memory pressure (10%). Absolutely NO `Math.random()` or fake load values.
- **Server Load States**: Standardized states — `healthy` (0–59%), `warning` (60–79%), `overloaded` (80–100%), and `offline` (unreachable).
- **Hysteresis & Flapping Protection**: Configurable confirmation samples (2 consecutive samples `>= 80%` required to enter `overloaded`; 2 consecutive samples `< 70%` required to confirm recovery). Eliminates duplicate overload transition events.
- **Centralized Cluster Monitoring Engine**: Single unified `monitoringService.ts` running at a configurable interval (default 5000ms), maintaining bounded history (last 60 samples/server), updating registry state, and broadcasting Socket.IO events.
- **Socket.IO Event Pipeline**:
  - `server:metrics`: Real-time telemetry broadcast on every monitoring cycle.
  - `server:overloaded`: High-priority alert emitted strictly on transition into overloaded state.
  - `server:status`: Preserved from Phase 5 for health, failure, and recovery state changes.
- **Frontend Real-Time Monitoring Integration**: Live cluster monitoring status bar, live telemetry area chart with `● LIVE TELEMETRY` pulse badge, animated node load bars, and real-time inspector in `ServerDetailsPanel`.
- **Automated Verification Suites**: 51/51 total tests passing (10/10 Round Robin unit tests, 17/17 Phase 5 integration tests, 24/24 Phase 6 monitoring tests).

> **Important Scope Notice:** Automatic child-server creation (`S1.1`, `S1.2`, `S1.3`, etc.) and recursive scaling have NOT been implemented yet. Phase 6 detects overload; Phase 7 will react to overload.

---

## 5. Architecture & Ports

```text
                      ┌───────────────┐
                      │    Client     │
                      └───────┬───────┘
                              │ HTTP / Socket.IO
                              ▼
                 ┌───────────────────────────┐
                 │       Frontend UI         │
                 │   http://localhost:5173   │
                 └─────────────┬─────────────┘
                               │ REST / WS
                               ▼
                 ┌───────────────────────────┐
                 │   Backend Load Balancer   │
                 │   http://localhost:5000   │
                 │   (Round Robin Scheduler) │
                 └──────┬──────┬──────┬──────┘
                        │      │      │ HTTP POST /process
         ┌──────────────┘      │      └──────────────┐
         ▼                     ▼                     ▼
   ┌───────────┐         ┌───────────┐         ┌───────────┐
   │    S1     │         │    S2     │         │    S3     │
   │   :3001   │         │   :3002   │         │   :3003   │
   └───────────┘         └───────────┘         └───────────┘
```

| Service | Port | Base URL | Responsibilities |
|---|---|---|---|
| **Frontend** | 5173 | `http://localhost:5173` | Dashboard, React Flow topology, interactive simulation & real routing modes |
| **Load Balancer** | 5000 | `http://localhost:5000` | Round Robin scheduling, HTTP request forwarding, health monitoring, WebSocket broadcasting |
| **Server S1** | 3001 | `http://localhost:3001` | Independent HTTP server process, `/process`, `/health`, `/telemetry` |
| **Server S2** | 3002 | `http://localhost:3002` | Independent HTTP server process, `/process`, `/health`, `/telemetry` |
| **Server S3** | 3003 | `http://localhost:3003` | Independent HTTP server process, `/process`, `/health`, `/telemetry` |

---

## 6. Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or later (v24 recommended)
- **npm**: v9.0.0 or later

### Installation

```bash
# Install root dependencies
npm install

# Install all subproject dependencies (frontend, backend, servers)
npm run install:all
```

---

## 7. Running the Framework

### Option A: Run Full Stack Concurrently (Recommended)
From the root directory:
```bash
npm run dev:all
```
This boots all 5 services concurrently:
- Load Balancer on `http://localhost:5000`
- Frontend Dashboard on `http://localhost:5173`
- Server S1 on `http://localhost:3001`
- Server S2 on `http://localhost:3002`
- Server S3 on `http://localhost:3003`

### Option B: Run Services Separately

**Terminal 1 — Server Instances (`S1`, `S2`, `S3`):**
```bash
npm run servers
# Or individually:
# npm run server:s1   (port 3001)
# npm run server:s2   (port 3002)
# npm run server:s3   (port 3003)
```

**Terminal 2 — Backend Load Balancer:**
```bash
cd backend
npm run dev
```

**Terminal 3 — Frontend Dashboard:**
```bash
cd frontend
npm run dev
```

---

## 8. Verification & API Endpoints

### Load Balancer Endpoints (`:5000`):
- **Health check**: `GET http://localhost:5000/api/health`
- **Topology snapshot**: `GET http://localhost:5000/api/topology`
- **All servers list**: `GET http://localhost:5000/api/servers`
- **Single server**: `GET http://localhost:5000/api/servers/S1`
- **Route request**: `POST http://localhost:5000/api/requests` with `{"payload": { ... }}`
- **Request history**: `GET http://localhost:5000/api/requests`
- **System metrics**: `GET http://localhost:5000/api/metrics`

### Direct Server Instance Endpoints (`:3001`, `:3002`, `:3003`):
- **Server Health**: `GET http://localhost:3001/health`
- **Direct Process**: `POST http://localhost:3001/process`
- **Server Telemetry**: `GET http://localhost:3001/telemetry`
- **Server Requests**: `GET http://localhost:3001/requests`

---

## 9. Running Tests

```bash
# Run all backend tests (Round Robin unit tests + Phase 5 integration tests)
cd backend
npm run test:all

# Run Phase 5 integration tests specifically
npm run test:phase5

# Run Round Robin unit tests
npm run test:rr
```

---

## 10. License
Academic Project - Computer Networks Course.
