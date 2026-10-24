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

## 4. Current Phase: Phase 5 (Real Server Instances & HTTP Forwarding)

### Completed in Phase 5:
- **Independent Server Instances**: Dedicated Express HTTP processes for `S1` (:3001), `S2` (:3002), and `S3` (:3003).
- **Genuine HTTP Forwarding**: Backend Load Balancer (`:5000`) dynamically routes incoming requests over HTTP using native `fetch` with 3000ms timeout and abort controllers.
- **Round-Robin Scheduling**: Persistent stateful pointer routing across healthy instances with fallback.
- **Failure Detection & Failover**: Load balancer intercepts communication errors, marks target server `offline`, broadcasts `server:status` over Socket.IO, and automatically reroutes to the next healthy instance.
- **Active Health Monitoring**: Periodic background health check (every 5s) pinging `GET /health` with automatic recovery detection.
- **Local Telemetry & Request History**: Each server instance maintains its own throughput, latency stats, and bounded local request log.
- **Frontend Real-Routing Integration**: Server port badges (`S1:3001`, `S2:3002`, `S3:3003`), real-time status updates via Socket.IO, and live latency feedback.
- **Automated Test Suites**: 10/10 Round Robin unit tests and 17/17 Phase 5 integration tests (27/27 total tests passing).

> **Important Scope Notice:** Automatic scaling and dynamic child server creation (`S1.1`, etc.) have NOT been implemented yet and are intentionally scoped for Phase 6.

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
