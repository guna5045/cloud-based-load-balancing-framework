/**
 * TopologyPage.tsx
 * Phase 4: Real Round Robin Load Balancer & Request Routing
 *
 * Central interactive hub for the Cloud-Based Load Balancing Framework.
 * Integrates:
 * - Real Mode: dispatches actual backend requests (POST /api/requests), listens to
 *   Socket.IO events, and traces the true Round Robin routing path across the topology.
 * - Simulation Mode: preserves the Phase 3 recursive overload scaling demonstration.
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
import { getHierarchyPath } from '../data/topologySimulation';
import { Globe, FlaskConical, Info } from 'lucide-react';

export const TopologyPage: React.FC = () => {
  const sim = useSimulation();
  const real = useRealRouting();

  // The active request path: IDs of nodes the latest particle is traversing
  const activePath = useMemo(() => {
    if (sim.particles.length === 0) return [];
    const latest = sim.particles[sim.particles.length - 1];
    return latest?.path ?? [];
  }, [sim.particles]);

  // Hierarchy path for the selected server
  const hierarchyPath = useMemo(() => {
    if (!sim.selectedServerId) return [];
    return getHierarchyPath(sim.servers, sim.selectedServerId);
  }, [sim.selectedServerId, sim.servers]);

  return (
    <div className="flex flex-col gap-4 p-4 h-full overflow-y-auto">
      {/* Mode Switcher & Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800">
        <div className="flex items-center gap-2">
          {/* Mode Pill Toggle */}
          <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs font-medium">
            <button
              onClick={() => real.setMode('real')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                real.mode === 'real'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-blue-300" />
              <span>Real Backend Mode</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-blue-700/80 font-mono">P4</span>
            </button>

            <button
              onClick={() => real.setMode('simulation')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                real.mode === 'simulation'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5 text-indigo-300" />
              <span>Simulation Mode</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-indigo-700/80 font-mono">P3</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 pl-2 text-xs text-slate-400 border-l border-slate-800">
            <Info className="w-3.5 h-3.5 text-blue-400" />
            <span>
              {real.mode === 'real'
                ? 'Live HTTP & WebSocket Round Robin routing through backend service'
                : 'Frontend mock traffic & interactive recursive overload scaling demo'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Algorithm: Round Robin
          </span>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono text-slate-400 bg-slate-800/80 border border-slate-700">
            Initial Pool: S1, S2, S3
          </span>
        </div>
      </div>

      {/* Control Station (Switchable based on Mode) */}
      <div className="card px-4 py-3 border border-slate-800 bg-slate-900/50 backdrop-blur-sm">
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

      {/* Main topology + Server Details panel */}
      <div className="flex gap-4 flex-1 min-h-0">
        <div className="flex-1 min-w-0">
          <TopologyGraph
            servers={sim.servers}
            selectedServerId={sim.selectedServerId}
            onSelectServer={sim.setSelectedServerId}
            activePath={activePath}
            scaling={sim.scaling}
            particles={sim.particles}
            height={520}
          />
        </div>

        {/* Server inspector slide-in */}
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

      {/* Live status bar */}
      <SimulationStatusBar metrics={sim.metrics} />

      {/* Real-time event feed */}
      <EventFeed events={sim.events} />
    </div>
  );
};
