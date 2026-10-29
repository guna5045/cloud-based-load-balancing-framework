# Cloud-Based Load Balancing Framework: Demonstration & Defense Guide

## 1. Executive Summary for Presentation
The **Cloud-Based Load Balancing Framework** is a distributed systems testbed demonstrating how localized, load-driven recursive auto-scaling and Round Robin traffic scheduling can optimize cluster resource utilization in modern cloud networks.

---

## 2. Recommended 17-Step Demonstration Flow

| Step | Action | Expected Visual & Behavioral Result |
|---|---|---|
| **1** | Execute `npm run dev:all` | Load balancer (:5000), root servers (:3001, :3002, :3003), and Vite (:5173) start up. |
| **2** | Open `http://localhost:5173` | Dark infrastructure dashboard loads with green `System Operational` & `Real-time` badges. |
| **3** | Observe Topology Graph | Shows Load Balancer at the root connected to 3 initial active leaf nodes: **S1, S2, S3**. |
| **4** | Click **Send Real Request** | Particle flows along edge; S1 handles request; latency is logged; Next Target advances to S2. |
| **5** | Click **Send Real Request** x2 | Requests route sequentially: S2 $\rightarrow$ S3 $\rightarrow$ S1 (verifying Round Robin wraparound). |
| **6** | Click **Burst (5x)** | 5 requests are rapidly dispatched and distributed evenly across S1, S2, and S3. |
| **7** | Navigate to **Requests Page** | Inspect live request history table with request IDs, target servers, and response latencies. |
| **8** | Navigate to **Servers Page** | View process port chips (`:3001`, `:3002`, `:3003`), active requests, and memory usage. |
| **9** | Generate Sustained Load | Use **Auto-Traffic (1.2s)** on S1 or trigger sustained burst traffic. |
| **10** | Observe Overload Detection | When S1 load $\ge 80\%$ for 2 consecutive samples, S1 status changes to `overloaded`. |
| **11** | Automatic 3-Child Scaling | S1 enters `scaling`, allocates ports (3100–3102), spawns **S1.1, S1.2, S1.3**, and completes scale. |
| **12** | Inspect Dynamic Topology | S1 transitions to a scaled parent badge; children S1.1, S1.2, S1.3 appear as active leaves. |
| **13** | Send Traffic across Scaled Pool | Requests now route across `[S1.1, S1.2, S1.3, S2, S3]`. Scaled parent S1 receives zero traffic. |
| **14** | Demonstrate Recursive Scaling | Overloading child S1.2 triggers recursive branching into **S1.2.1, S1.2.2, S1.2.3** at depth 3. |
| **15** | Demonstrate Server Failure | Terminate S2 process; S2 is immediately marked `offline` and excluded from routing. |
| **16** | Demonstrate Recovery | Restart S2; health monitor detects recovery, restores `healthy` status, and S2 rejoins pool. |
| **17** | Browser Refresh Verification | Refresh dashboard (`F5`); REST `/api/topology` reconstructs the identical multi-level hierarchy. |

---

## 3. Anticipated Viva / Examination Questions & Answers

### Q1: Why is Round Robin used instead of Least Connections?
> **Answer**: Round Robin provides deterministic, starvation-free scheduling with minimal algorithmic overhead ($O(1)$). In our framework, Round Robin demonstrates predictable request distribution across active leaves while isolating scheduling from telemetry computation.

### Q2: How does the system calculate server utilization without using random numbers?
> **Answer**: We use a deterministic multi-factor formula in `utilizationService.ts`:
> - Concurrency pressure (active requests / 10): 40% weight
> - Throughput pressure (requests per second / 20): 35% weight
> - Latency pressure (average response time / 200ms): 15% weight
> - Memory pressure (heapUsed / heapTotal): 10% weight
> Every variable is directly measured from the running Node.js process.

### Q3: Why does scaling produce exactly three children instead of one or two?
> **Answer**: Branching factor 3 ($k=3$) represents an optimal balance between rapid capacity expansion (tripling branch capacity) and process spawning overhead. It models a ternary tree hierarchy where a congested node delegates its workload to a dedicated sub-cluster.

### Q4: Why are scaled parent servers excluded from the active routing pool?
> **Answer**: If a parent continued to receive traffic while its children also received traffic, the parent would remain congested. By designating the parent as a logical group node, all subsequent requests are handled exclusively by its active child leaves.

### Q5: How does the system prevent flapping between healthy and overloaded states?
> **Answer**: Hysteresis with confirmation samples:
> - Entering overload requires 2 consecutive samples $\ge 80\%$.
> - Recovering requires 2 consecutive samples $< 70\%$.
> A single transient spike will only move the server to `warning` without triggering unnecessary process scaling.

### Q6: What safety guards prevent runaway recursive scaling?
> **Answer**: Three strict safety boundaries:
> 1. `MAX_SCALING_DEPTH=10`: Tree depth is capped at 10 generations.
> 2. `MAX_SERVER_PROCESSES=50`: Process creation halts before exceeding host capacity.
> 3. Concurrency Lock (`scalingLocks`): A server node currently undergoing scaling cannot accept a second concurrent scaling trigger.

