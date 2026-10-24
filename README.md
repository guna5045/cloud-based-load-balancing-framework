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

## 4. Current Phase: Phase 1 (Project Foundation)

### Completed in Phase 1:
- Clean project structure and separation of concerns.
- Node.js + Express backend with TypeScript, structured routes, and logging.
- React + Vite + Tailwind CSS frontend with TypeScript.
- Real-time Socket.IO communication bridge between frontend and backend.
- Initial server topology model representing S1, S2, and S3 as a recursive tree data structure.
- REST API structure (`/api/health`, `/api/servers`, `/api/topology`, `/api/requests`, `/api/metrics`).
- Full environment configuration without hardcoded secrets.

### Intentionally Postponed to Phase 2:
- Round-Robin load distribution algorithm execution.
- Recursive child node spawning triggers and burst traffic generation.
- Request flow animations and advanced visualization graphs.
- Production multi-machine deployment and containerization.

---

## 5. Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or later (v24 recommended)
- **npm**: v9.0.0 or later

### Installation

Clone the repository and install all dependencies:

```bash
# 1. Install root dependencies
npm install

# 2. Install backend dependencies
cd backend
npm install
cp .env.example .env
cd ..

# 3. Install frontend dependencies
cd frontend
npm install
cp .env.example .env
cd ..
```

Or run the one-step convenience script from the root:
```bash
npm run install:all
```

---

## 6. Running the Project

### Option A: Run Both Concurrently (Recommended)
From the project root:
```bash
npm run dev
```

### Option B: Run Services Separately

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```
Backend will start at: `http://localhost:5000`  
Health check endpoint: `http://localhost:5000/api/health`

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```
Frontend will start at: `http://localhost:5173`

---

## 7. Verification Endpoints

Once the backend is running, verify with:

- **Health check**: `GET http://localhost:5000/api/health`
- **Topology snapshot**: `GET http://localhost:5000/api/topology`
- **All servers list**: `GET http://localhost:5000/api/servers`
- **Single server**: `GET http://localhost:5000/api/servers/S1`
- **System metrics**: `GET http://localhost:5000/api/metrics`

---

## 8. License
Academic Project - Computer Networks Course.
