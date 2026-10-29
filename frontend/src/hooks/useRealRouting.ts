/**
 * useRealRouting.ts
 * Phase 4, Phase 7, Phase 8: Real Round Robin Load Balancer & Real-Time Synchronization
 *
 * Re-exports the shared real routing singleton context hook.
 */

export {
  useRealRoutingContext as useRealRouting,
  RealRoutingProvider,
  type ScalingKPIs,
  type UseRealRoutingReturn,
} from '../context/RealRoutingContext';
