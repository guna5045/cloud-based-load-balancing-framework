/**
 * TopologyPage.tsx
 *
 * Central interactive visualization hub for the Cloud-Based Load Balancing Framework.
 * Integrates:
 * - Real Mode: dispatches actual backend requests (POST /api/requests), listens to
 *   Socket.IO events, and traces the true Round Robin routing path across the topology.
 * - Simulation Mode: preserves the Phase 3 recursive overload scaling demonstration.
 * - Dynamic tree depth accommodation (expands container height as recursive tree grows).
 * - Live Events completely isolated in a dedicated block underneath Server Topology.
 */

import React, { useMemo } from 'react';
import { TopologyGraph } from '../components/TopologyGraph';
import { ServerDetailsPanel } from '../components/ServerDetailsPanel';
import { SimulationControls } from '../components/SimulationControls';
import { RealRoutingControls } from '../components/RealRoutingControls';
import { SimulationStatusBar } from '../components/SimulationStatusBar';
import { EventFeed } from '../components/EventFeed';
import { useSimulation } from '../context/SimulationContext';
import { useRealRouting } from '../hooks/useRealRouting';
import { getHierarchyPath, getMaxDepth } from '../data/topologySimulation';
import { Globe, FlaskConical, Info, Server, Cpu } from 'lucide-react';

export const TopologyPage: React.FC = () => {
  const sim = useSimulation();
  const real = useRealRouting();

  // The active request path: IDs of all nodes currently traversed by any traveling particle
  const activePath = useMemo(() => {
    if (sim.particles.length === 0) return [];
    const set = new Set<string>();
    sim.particles.forEach((p) => {
      p.path.forEach((id) => set.add(id));
    });
    return Array.from(set);
  }, [sim.particles]);

  // Hierarchy path for the selected server
  const hierarchyPath = useMemo(() => {
    if (!sim.selectedServerId) return [];
    return getHierarchyPath(sim.servers, sim.selectedServerId);
  }, [sim.selectedServerId, sim.servers]);

  // Dynamic canvas height adapting to recursive tree depth
  const treeDepth = useMemo(() => getMaxDepth(sim.servers), [sim.servers]);
  const dynamicHeight = useMemo(() => {
    if (treeDepth <= 1) return 430;
    if (treeDepth === 2) return 550;
    return Math.min(780, 430 + (treeDepth - 1) * 125);
  }, [treeDepth]);

  return (
    <div className="flex flex-col gap-5 p-5 min-h-full pb-10">
      {/* ── Mode Switcher & Technical Status Bar ────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          {/* Mode Pill Toggle */}
          <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs font-medium">
            <button
              onClick={() => real.setMode('real')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                real.mode === 'real'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-blue-300" />
              <span>Real Backend Mode</span>
            </button>

            <button
              onClick={() => real.setMode('simulation')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                real.mode === 'simulation'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5 text-indigo-300" />
              <span>Simulation Mode</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 pl-2 text-xs text-slate-400 border-l border-slate-800">
            <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>
              {real.mode === 'real'
                ? 'Live HTTP & WebSocket Round Robin routing through backend service'
                : 'Frontend mock traffic & interactive recursive overload scaling demo'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Server className="w-3 h-3 text-emerald-400" />
            Algorithm: Round Robin
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono text-slate-300 bg-slate-800/80 border border-slate-700">
            <Cpu className="w-3 h-3 text-slate-400" />
            Tree Depth: {treeDepth}
          </span>
        </div>
      </div>

      {/* ── Control Station (Switchable based on Mode) ──────────────────────── */}
      <div className="card px-4 py-3.5 border border-slate-800 bg-slate-900/60 backdrop-blur-sm shrink-0">
        {real.mode === 'real' ? (
          <RealRoutingControls routing={real} />
        ) : (
          <SimulationControls
            isRunning={sim.isRunning}
            trafficRate={sim.trafficRate}
            onStart={sim.startTraffic}
            onPause={sim.pauseTraffic}
            onSetRate={sim.setTrafficRate}
            onReset={sim.resetTopology}
            scalingInProgress={sim.scaling.step !== 'idle'}
          />
        )}
      </div>

      {/* ── Server Topology Section (Primary Centerpiece) ──────────────────── */}
      <div className="flex gap-4 shrink-0">
        <div className="flex-1 min-w-0">
          <TopologyGraph
            servers={sim.servers}
            selectedServerId={sim.selectedServerId}
            onSelectServer={sim.setSelectedServerId}
            activePath={activePath}
            scaling={sim.scaling}
            particles={sim.particles}
            height={dynamicHeight}
          />
        </div>

        {/* Server Inspector Slide-In Panel */}
        {sim.selectedServer && (
          <ServerDetailsPanel
            server={sim.selectedServer}
            onClose={() => sim.setSelectedServerId(null)}
            hierarchyPath={hierarchyPath}
            onTriggerScaling={sim.triggerScaling}
            canScale={sim.canScale(sim.selectedServerId!)}
            scalingInProgress={sim.scaling.step !== 'idle'}
          />
        )}
      </div>

      {/* ── Live Status Bar ─────────────────────────────────────────────────── */}
      <div className="shrink-0">
        <SimulationStatusBar metrics={sim.metrics} />
      </div>

      {/* ── Live Events Feed (Dedicated Block Underneath Topology) ─────────── */}
      <div className="shrink-0 w-full">
        <EventFeed events={sim.events} />
      </div>
    </div>
  );
};
