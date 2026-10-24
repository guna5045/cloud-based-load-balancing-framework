/**
 * TopologyPage.tsx  (Phase 3 — main interactive simulation hub)
 *
 * This page is the central experience of the Cloud-Based Load Balancing Framework.
 * Shows the live interactive topology with request particles, scaling triggers,
 * and real-time status. All state comes from the shared SimulationContext.
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TopologyGraph } from '../components/TopologyGraph';
import { ServerDetailsPanel } from '../components/ServerDetailsPanel';
import { SimulationControls } from '../components/SimulationControls';
import { SimulationStatusBar } from '../components/SimulationStatusBar';
import { EventFeed } from '../components/EventFeed';
import { useSimulation } from '../context/SimulationContext';
import { getHierarchyPath } from '../data/topologySimulation';
import { Info } from 'lucide-react';

export const TopologyPage: React.FC = () => {
  const sim = useSimulation();

  // The active request path: IDs of nodes the latest particle is traversing
  const activePath = useMemo(() => {
    if (sim.particles.length === 0) return [];
    // Use the most recent particle
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
      {/* Header info */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3 p-3 rounded-xl bg-blue-950/30 border border-blue-800/30"
      >
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-blue-300">
            Interactive Topology Simulation — Cloud-Based Load Balancing Framework
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Click any server to inspect it. Use <strong className="text-slate-300">Simulate Overload</strong> in the details panel
            to trigger recursive scaling. Any server can expand into 3 children independently.
          </p>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-600/20 text-blue-300 border border-blue-600/30 shrink-0">
          [SIM] Phase 3
        </span>
      </motion.div>

      {/* Simulation controls */}
      <div className="card px-4 py-3">
        <SimulationControls
          isRunning={sim.isRunning}
          trafficRate={sim.trafficRate}
          onStart={sim.startTraffic}
          onPause={sim.pauseTraffic}
          onSetRate={sim.setTrafficRate}
          onReset={sim.resetTopology}
          scalingInProgress={sim.scaling.step !== 'idle'}
        />
      </div>

      {/* Main topology + details */}
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

        {/* Details panel */}
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

      {/* Status bar */}
      <SimulationStatusBar metrics={sim.metrics} />

      {/* Event feed */}
      <EventFeed events={sim.events} />
    </div>
  );
};
