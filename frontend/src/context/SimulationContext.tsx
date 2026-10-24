/**
 * SimulationContext.tsx
 *
 * Phase 3: React context that makes the simulation state available
 * to all pages without prop-drilling.
 * DashboardPage and TopologyPage both consume this context.
 */

import React, { createContext, useContext } from 'react';
import { useTopologySimulation, UseTopologySimulationReturn } from '../hooks/useTopologySimulation';

// ─── Context ──────────────────────────────────────────────────────────────────

const SimulationContext = createContext<UseTopologySimulationReturn | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const simulation = useTopologySimulation();
  return (
    <SimulationContext.Provider value={simulation}>
      {children}
    </SimulationContext.Provider>
  );
};

// ─── Consumer hook ────────────────────────────────────────────────────────────

export function useSimulation(): UseTopologySimulationReturn {
  const ctx = useContext(SimulationContext);
  if (!ctx) {
    throw new Error('useSimulation must be used inside <SimulationProvider>');
  }
  return ctx;
}
