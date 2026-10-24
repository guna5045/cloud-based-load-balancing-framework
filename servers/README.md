# Server Instances Architecture Reference
## Cloud-Based Load Balancing Framework

## Overview
This directory contains the independent server instance implementation for the **Cloud-Based Load Balancing Framework**.
In **Phase 5**, actual independent HTTP processes are launched on dedicated ports (`:3001`, `:3002`, `:3003`), and the Load Balancer (`:5000`) forwards requests to them over genuine HTTP.

```text
                         ┌───────────────┐
                         │    Client     │
                         └───────┬───────┘
                                 │
                                 ▼
                    ┌──────────────────────┐
                    │    Load Balancer     │
                    │       :5000          │
                    │   Round Robin        │
                    └───────┬──────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │    S1    │  │    S2    │  │    S3    │
        │   :3001  │  │   :3002  │  │   :3003  │
        └──────────┘  └──────────┘  └──────────┘
```

---

## Server Ports & Topology

| Server ID | Port | Base URL | Status | Health Endpoint | Process Endpoint |
|---|---|---|---|---|---|
| **S1** | 3001 | `http://localhost:3001` | Active Root | `GET /health` | `POST /process` |
| **S2** | 3002 | `http://localhost:3002` | Active Root | `GET /health` | `POST /process` |
| **S3** | 3003 | `http://localhost:3003` | Active Root | `GET /health` | `POST /process` |

---

## Server Process API

Each independent server instance exposes the following HTTP endpoints:

### 1. `GET /health`
Returns server identity, operational status, port, and uptime:
```json
{
  "status": "ok",
  "serverId": "S1",
  "port": 3001,
  "uptime": 45.2,
  "timestamp": "2026-10-24T12:00:00.000Z"
}
```

### 2. `POST /process`
Accepts a forwarded request, measures genuine execution latency, updates local telemetry, and returns the processed response:
```bash
curl -X POST http://localhost:3001/process \
  -H "Content-Type: application/json" \
  -d '{"requestId": "REQ-000001", "payload": {"source": "client"}}'
```
Response:
```json
{
  "success": true,
  "requestId": "REQ-000001",
  "serverId": "S1",
  "status": "processed",
  "processingTime": 24,
  "message": "Request processed by S1",
  "timestamp": "2026-10-24T12:00:00.024Z",
  "payload": {"source": "client"}
}
```

### 3. `GET /telemetry`
Returns local server performance metrics and request throughput:
```json
{
  "success": true,
  "data": {
    "serverId": "S1",
    "port": 3001,
    "status": "healthy",
    "requestCount": 12,
    "requestsPerSecond": 2.4,
    "averageProcessingTime": 21.5,
    "lastRequestAt": "2026-10-24T12:00:00.024Z",
    "uptime": 120.5
  }
}
```

### 4. `GET /requests?limit=50`
Returns bounded local in-memory request history (last 100 records).

### 5. `POST /shutdown`
Triggers a clean graceful shutdown of the individual server process.

---

## How to Run Server Instances

From the project root:

### Run Individual Servers
```bash
# Launch S1 on port 3001
npm run server:s1

# Launch S2 on port 3002
npm run server:s2

# Launch S3 on port 3003
npm run server:s3
```

### Run All 3 Servers Concurrently
```bash
npm run servers
```

### Full Development Stack (Load Balancer + Frontend + Servers S1, S2, S3)
```bash
npm run dev:all
```

---

## Testing Server Processes Directly

```bash
# Verify Health
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health

# Direct Request Processing
curl -X POST http://localhost:3001/process -H "Content-Type: application/json" -d '{"requestId":"TEST-1"}'
```

---

## Phase Status
- **Phase 1**: Initial Project Foundation.
- **Phase 2**: Professional UI/UX Design.
- **Phase 3**: Interactive Live Topology & Simulation.
- **Phase 4**: Real Round Robin Load Balancer & Scheduling.
- **Phase 5 (Completed)**: Real Independent HTTP Server Instances, Process Lifecycle, and Genuine Request Forwarding over HTTP.
- **Phase 6 (Upcoming)**: Metrics Monitoring & 80% Overload Detection.
- **Phase 7 (Upcoming)**: Automatic 3-Child Recursive Scaling.
