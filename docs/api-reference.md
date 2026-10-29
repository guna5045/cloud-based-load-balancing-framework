# Cloud-Based Load Balancing Framework - REST & WebSocket API Reference

This document provides a comprehensive technical reference for all REST endpoints and Socket.IO real-time event contracts implemented in the backend load balancer service.

---

## 1. REST API Endpoints

### 1.1 System Health

#### `GET /api/health`
Returns the operational health status and uptime of the backend load balancer.

- **Request**: No parameters
- **Response**: HTTP 200 OK
  ```json
  {
    "status": "ok",
    "service": "cloud-based-load-balancing-framework",
    "version": "1.0.0",
    "timestamp": "2026-10-29T08:10:41.358Z",
    "uptimeSeconds": 468,
    "environment": "development"
  }
  ```

---

### 1.2 Server Instance Management

#### `GET /api/servers`
Retrieves a flat list of all registered server instances across all hierarchy levels.

- **Response**: HTTP 200 OK
  ```json
  {
    "success": true,
    "count": 3,
    "data": [
      {
        "id": "S1",
        "parentId": null,
        "status": "healthy",
        "load": 24,
        "capacity": 100,
        "children": [],
        "createdAt": "2026-10-29T08:00:00.000Z",
        "host": "localhost",
        "port": 3001,
        "baseUrl": "http://localhost:3001"
      }
    ]
  }
  ```

#### `GET /api/servers/:id`
Retrieves detailed metadata, load, and metrics for a specific server instance.

- **Parameters**: `id` (e.g. `S1`, `S1.2`)
- **Response**: HTTP 200 OK or HTTP 404 Not Found

#### `POST /api/servers` (New in R2)
Explicitly creates and launches a new root server instance, starting a real Node.js process and integrating it into the active Round Robin routing pool.

- **Request Body**:
  ```json
  {
    "id": "S4",
    "port": 3004,
    "capacity": 100
  }
  ```
  *(Note: `port` and `id` are optional; the backend will auto-allocate safe unused values if omitted. `parentId` must be null or omitted to prevent bypassing recursive scaling rules).*
- **Validation Rules**:
  - `id`: Alphanumeric, underscores, hyphens, 1-30 chars, must be unique.
  - `port`: Integer between 1024-65535, must be free on OS and not already registered.
  - `parentId`: Must not be provided (automatic recursive children are managed by the scaling service).
- **Process Lifecycle**:
  - Spawns real HTTP server process.
  - Polls `/health` endpoint until 200 OK readiness confirmed.
  - On failure, triggers atomic rollback (kills process, releases port, returns HTTP 500).
- **Response**: HTTP 201 Created
  ```json
  {
    "success": true,
    "message": "Server instance 'S4' created and online on port 3004",
    "data": {
      "id": "S4",
      "parentId": null,
      "status": "healthy",
      "load": 0,
      "capacity": 100,
      "port": 3004
    }
  }
  ```

#### `DELETE /api/servers/:id` (New in R2)
Safely removes a server instance from the cluster.

- **Parameters**: `id` (e.g. `S4`)
- **Safety Checks**:
  - Cannot remove scaled parent servers with active child branches (HTTP 400).
  - Cannot remove the last active server in the load balancer pool (HTTP 400).
- **Execution Flow**:
  1. Sets server status to `offline` to immediately exclude it from Round Robin routing.
  2. Sends graceful `/shutdown` HTTP request or terminates child process.
  3. Removes from `ServerRegistry` and `ServerTopology`.
  4. Releases allocated port back to pool.
  5. Emits `server:status` and `topology:updated` over Socket.IO.
- **Response**: HTTP 200 OK
  ```json
  {
    "success": true,
    "message": "Server instance 'S4' removed successfully",
    "data": { "id": "S4" }
  }
  ```

---

### 1.3 Topology & Telemetry

#### `GET /api/topology`
Returns the hierarchical tree structure of the cluster along with summary statistics.

- **Response**: HTTP 200 OK
  ```json
  {
    "success": true,
    "data": {
      "totalServers": 3,
      "activeServers": 3,
      "activeLeafServers": 3,
      "rootServers": 3,
      "scaledServers": 0,
      "maxDepth": 1,
      "averageLoad": 24,
      "servers": [...]
    }
  }
  ```

#### `GET /api/metrics`
Returns aggregate routing metrics, cluster summary, and the next scheduled Round Robin server target.

#### `GET /api/metrics/history`
Returns historical monitoring samples for visualization. Query parameters: `serverId`, `limit`.

---

### 1.4 Request Routing

#### `POST /api/requests`
Forwards an HTTP request through the load balancer using Round Robin to the selected healthy active leaf server.

- **Request Body**:
  ```json
  {
    "client": "web-dashboard",
    "customData": "example"
  }
  ```
- **Response**: HTTP 200 OK
  ```json
  {
    "success": true,
    "requestId": "REQ-000001",
    "server": {
      "id": "S1",
      "port": 3001,
      "status": "healthy",
      "load": 28
    },
    "routing": {
      "algorithm": "round-robin",
      "sequence": 1,
      "timestamp": "2026-10-29T08:24:00.000Z"
    },
    "response": {
      "processingTime": 24,
      "message": "Request processed by S1"
    }
  }
  ```
- **Error Condition**: Returns HTTP 503 Service Unavailable if no healthy active leaf servers exist.

---

## 2. WebSocket (Socket.IO) Event Contracts

All real-time events adhere strictly to the following contracts:

| Event Name | Direction | Payload Description |
|------------|-----------|---------------------|
| `connection:ack` | Server → Client | Confirms handshake with connection ID and cluster summary |
| `request:routed` | Server → Client | Emitted every time a request is forwarded to an active server |
| `server:metrics` | Server → Client | Emitted periodically with real-time server utilization and telemetry |
| `server:status` | Server → Client | Emitted on server state transitions (`healthy`, `warning`, `overloaded`, `offline`, `scaling`, `scaled`) |
| `server:overloaded` | Server → Client | Emitted when a server confirms overload after 2 samples >= 80% |
| `server:scaling` | Server → Client | Emitted when 3-child expansion begins |
| `server:scaled` | Server → Client | Emitted when 3 child processes are online and attached to topology |
| `server:scale_failed` | Server → Client | Emitted if child process startup fails and triggers rollback |
| `topology:updated` | Server → Client | Emitted whenever topology hierarchy or node membership changes |

