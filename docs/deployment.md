# Cloud-Based Load Balancing Framework: Deployment & Operations Guide

## 1. Overview
This guide provides complete instructions for setting up, running, demonstrating, and operating the **Cloud-Based Load Balancing Framework** in local, academic demonstration, and multi-process development environments.

---

## 2. System Requirements
- **Operating System**: Windows 10/11, macOS 12+, or Ubuntu Linux 20.04+
- **Runtime**: Node.js v18.0.0 or higher (Node.js v20+ recommended)
- **Package Manager**: npm v9.0.0 or higher
- **Network Ports**:
  - `5000`: Load Balancer & WebSocket Gateway
  - `5173`: React Frontend (Vite)
  - `3001, 3002, 3003`: Root Server Instances (S1, S2, S3)
  - `3100–3999`: Dynamic Child Server Port Allocation Pool

---

## 3. Installation
Clone or unpack the project folder and run:
```bash
# Install dependencies across root, backend, frontend, and servers
npm run install:all
```

---

## 4. Environment Configuration
Copy the template configuration files:
```bash
# Root & backend environment templates
cp .env.example .env
cp backend/.env.example backend/.env
```
Default parameters in `.env`:
- `PORT=5000`
- `NODE_ENV=development`
- `FRONTEND_URL=http://localhost:5173`
- `INITIAL_SERVERS=S1,S2,S3`
- `MONITOR_INTERVAL_MS=5000`
- `OVERLOAD_THRESHOLD=80`
- `RECOVERY_THRESHOLD=70`
- `WARNING_THRESHOLD=60`
- `CHILD_SERVER_PORT_START=3100`
- `CHILD_SERVER_PORT_END=3999`
- `MAX_SCALING_DEPTH=10`
- `MAX_SERVER_PROCESSES=50`

---

## 5. Running the Application

### Option A: Unified Concurrent Run (Recommended for Demo)
Starts Load Balancer, Web Dashboard, and Root Servers S1, S2, S3 simultaneously in a single terminal:
```bash
npm run dev:all
```

### Option B: Modular Multi-Terminal Run
- **Terminal 1: Root Servers**
  ```bash
  npm run servers
  ```
- **Terminal 2: Load Balancer**
  ```bash
  npm run dev:backend
  ```
- **Terminal 3: Frontend Dashboard**
  ```bash
  npm run dev:frontend
  ```

---

## 6. Accessing the Dashboard
Open your browser and navigate to:
**`http://localhost:5173`**

- Verify top header shows `Phase 9 Reliability` with a green `Real-time` status pill.
- Ensure the mode toggle is set to **Real Mode**.

---

## 7. Operational Health Checks
Verify all services are responsive via HTTP curl or browser:
- Load Balancer: `http://localhost:5000/api/health`
- Server S1: `http://localhost:3001/health`
- Server S2: `http://localhost:3002/health`
- Server S3: `http://localhost:3003/health`

---

## 8. Graceful Shutdown & Cleanup
To cleanly shut down the entire system:
1. Press `Ctrl+C` in the terminal running `npm run dev:all` or the respective terminal windows.
2. If any child server processes were left running, they can be cleaned up using:
   ```powershell
   # Windows PowerShell port inspection
   Get-NetTCPConnection -LocalPort 3001,3002,3003,5000 -ErrorAction SilentlyContinue
   ```
   Or simply execute `npm run test:all --prefix backend` which automatically calls `scalingService.terminateAll()` and frees all ports.

