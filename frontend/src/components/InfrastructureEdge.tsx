/**
 * InfrastructureEdge.tsx
 *
 * High-visibility enterprise cloud infrastructure topology edge component.
 * Architecture:
 * - Layer 0: Dark physical conduit channel (#1e293b, width 6px) providing high-contrast base
 * - Layer 1: Permanent physical rail (high-contrast electric sky blue #60a5fa, width 2.5px, 100% opacity)
 *            NEVER disappears under ANY condition.
 * - Layer 2: Neon energy beam & flowing energy dashes when isActive is true
 * - Layer 3: High-visibility multi-stage glowing SVG energy orb (<animateMotion>) gliding along the exact edge path
 */

import { memo } from 'react';
import { getSmoothStepPath, EdgeProps } from '@xyflow/react';

export interface InfrastructureEdgeData {
  isActive?: boolean;
  isScaling?: boolean;
  targetStatus?: string;
  sourceType?: 'lb' | 'server';
}

export const InfrastructureEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) => {
  const edgeData = (data as InfrastructureEdgeData) || {};
  const isActive = !!edgeData.isActive;
  const isScaling = !!edgeData.isScaling;
  const targetStatus = edgeData.targetStatus || 'healthy';

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 14,
  });

  // High-contrast, bright luminous stroke colors for 100% visibility on dark background
  const railStroke =
    targetStatus === 'offline'
      ? '#94a3b8' // Slate 400 (dashed)
      : targetStatus === 'overloaded'
      ? '#f87171' // Bright Coral Red
      : targetStatus === 'warning'
      ? '#fbbf24' // Bright Amber
      : '#60a5fa'; // Bright Electric Sky Blue (high contrast against #050a12)

  return (
    <g className="infrastructure-edge-group" style={{ pointerEvents: 'none' }}>
      {/* ── 0. Base Physical Conduit Channel (Dark backing track for maximum contrast) ── */}
      <path
        id={`${id}-conduit`}
        d={edgePath}
        fill="none"
        stroke="#0f172a"
        strokeWidth={7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* ── 1. Permanent Architecture Rail (Always 100% visible, never disappears) ── */}
      <path
        id={`${id}-base`}
        d={edgePath}
        fill="none"
        stroke={railStroke}
        strokeWidth={2.5}
        strokeOpacity={targetStatus === 'offline' ? 0.5 : 0.95}
        strokeDasharray={targetStatus === 'offline' ? '6 6' : undefined}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          filter: isActive
            ? 'none'
            : targetStatus !== 'offline'
            ? 'drop-shadow(0 0 3px rgba(96, 165, 250, 0.4))'
            : 'none',
        }}
      />

      {/* ── 2. Active Request Traffic Glow & Flowing Chevrons ── */}
      {isActive && (
        <>
          {/* Intense neon core beam */}
          <path
            id={`${id}-active-core`}
            d={edgePath}
            fill="none"
            stroke="#38bdf8"
            strokeWidth={4}
            strokeOpacity={1}
            strokeLinecap="round"
            style={{
              filter: 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.9)) drop-shadow(0 0 16px rgba(56, 189, 248, 0.5))',
            }}
          />

          {/* Flowing energy pulse overlay */}
          <path
            id={`${id}-active-dash`}
            d={edgePath}
            fill="none"
            stroke="#ffffff"
            strokeWidth={2}
            strokeDasharray="8 12"
            className="edge-animated"
            strokeLinecap="round"
          />

          {/* ── 3. Prominent, Highly Visible Travelling Energy Orb along Edge Path ── */}
          <g className="traffic-energy-packet">
            {/* Outer pulsating halo */}
            <circle r="12" fill="#38bdf8" opacity="0.35">
              <animateMotion
                path={edgePath}
                dur="0.85s"
                repeatCount="indefinite"
                rotate="auto"
              />
              <animate
                attributeName="r"
                values="10;14;10"
                dur="0.85s"
                repeatCount="indefinite"
              />
            </circle>

            {/* Trailing secondary energy packet */}
            <circle r="5" fill="#60a5fa" opacity="0.8">
              <animateMotion
                path={edgePath}
                dur="0.85s"
                begin="0.10s"
                repeatCount="indefinite"
                rotate="auto"
              />
            </circle>

            {/* Main luminous neon cyan orb */}
            <circle
              r="7.5"
              fill="#38bdf8"
              style={{ filter: 'drop-shadow(0 0 8px #38bdf8)' }}
            >
              <animateMotion
                path={edgePath}
                dur="0.85s"
                repeatCount="indefinite"
                rotate="auto"
              />
            </circle>

            {/* Bright diamond white core */}
            <circle r="3.5" fill="#ffffff">
              <animateMotion
                path={edgePath}
                dur="0.85s"
                repeatCount="indefinite"
                rotate="auto"
              />
            </circle>
          </g>
        </>
      )}

      {/* ── 4. Scaling Animation Beam ── */}
      {isScaling && (
        <path
          d={edgePath}
          fill="none"
          stroke="#60a5fa"
          strokeWidth={3}
          strokeDasharray="6 8"
          className="edge-animated"
          style={{ filter: 'drop-shadow(0 0 6px #60a5fa)' }}
        />
      )}
    </g>
  );
});

InfrastructureEdge.displayName = 'InfrastructureEdge';
