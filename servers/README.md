# Server Instances Topology Reference

## Overview
This directory documents and defines the server instance architecture for the **Cloud-Based Load Balancing Framework**.

## Initial Server Configuration (Baseline)
The system initializes with three root-level server nodes:
- **S1** (Root Server 1)
- **S2** (Root Server 2)
- **S3** (Root Server 3)

```text
Load Balancer
├── S1
├── S2
└── S3
```

Each server instance tracks:
- `id`: Unique identifier (e.g., `S1`, `S2`, `S3`, `S1.1`, `S3.2.1`)
- `parentId`: Pointer to parent server node (`null` for root servers)
- `status`: Server state (`healthy`, `warning`, `overloaded`, `offline`)
- `load`: Current percentage capacity utilization (0–100%)
- `capacity`: Maximum concurrent request threshold
- `children`: Recursive array of subordinate child server nodes
- `createdAt`: ISO 8601 creation timestamp
- `metrics`: CPU, memory, active connections, response latency

---

## Recursive Hierarchical Scaling (Architecture Rule)
When any active server in the topology reaches the configured overload threshold (default: 80% load), that **specific** server node dynamically creates **exactly 3 child instances** beneath it.

### Example Evolution:
1. Initial Topology:
   ```text
   Load Balancer
   ├── S1
   ├── S2
   └── S3
   ```
2. S1 becomes overloaded:
   ```text
   Load Balancer
   ├── S1
   │   ├── S1.1
   │   ├── S1.2
   │   └── S1.3
   ├── S2
   └── S3
   ```
3. S3 later becomes overloaded:
   ```text
   Load Balancer
   ├── S1
   │   ├── S1.1
   │   ├── S1.2
   │   └── S1.3
   ├── S2
   └── S3
       ├── S3.1
       ├── S3.2
       └── S3.3
   ```
4. S1.2 later becomes overloaded:
   ```text
   S1.2
   ├── S1.2.1
   ├── S1.2.2
   └── S1.2.3
   ```

## Phase Status
- **Phase 1 (Current)**: Data model, tree representation, and query interfaces established.
- **Phase 2 (Upcoming)**: Automated Round Robin request forwarding, simulated load generation, and dynamic child spawning execution.
