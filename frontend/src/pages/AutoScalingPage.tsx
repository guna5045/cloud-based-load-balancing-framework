import React from 'react';
import { motion } from 'framer-motion';
import { Zap, GitBranch, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ScaleStep {
  label: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  description: string;
}

const STEPS: ScaleStep[] = [
  {
    label: '1. Monitor Load',
    icon: AlertTriangle,
    color: 'text-amber-400',
    description: 'Continuously monitor each server node\'s load percentage.',
  },
  {
    label: '2. Threshold Detection',
    icon: Zap,
    color: 'text-rose-400',
    description: 'When any node exceeds 80% load, auto-scaling is triggered for that specific server.',
  },
  {
    label: '3. Spawn 3 Children',
    icon: GitBranch,
    color: 'text-blue-400',
    description: 'The overloaded node creates exactly 3 child servers (e.g., S2 → S2.1, S2.2, S2.3).',
  },
  {
    label: '4. Resume Normal Operation',
    icon: CheckCircle2,
    color: 'text-emerald-400',
    description: 'Requests are redistributed to children. The parent node returns to healthy state.',
  },
];

export const AutoScalingPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-5 p-5 h-full overflow-y-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-5 h-5 text-violet-400" />
          <h2 className="text-base font-bold text-slate-100">Auto Scaling Engine</h2>
        </div>
        <p className="text-xs text-slate-400">
          Hierarchical load-driven auto-scaling. Any node can independently trigger expansion.
        </p>
      </motion.div>

      {/* Workflow steps */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="card p-5 space-y-3"
            >
              <div className={`w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center ${step.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-slate-200">{step.label}</p>
              <p className="text-xs text-slate-400 leading-relaxed">{step.description}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Tree expansion example */}
      <div className="card p-6 max-w-lg">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
          Example Expansion: S2 Overloaded
        </p>
        <div className="font-mono text-sm text-slate-300 space-y-1">
          <p>Load Balancer</p>
          <p className="ml-4">├── S1 <span className="text-emerald-400 text-xs">● healthy</span></p>
          <p className="ml-4">├── S2 <span className="text-rose-400 text-xs">⚠ overloaded → scaling</span></p>
          <p className="ml-8">│   ├── S2.1 <span className="text-blue-400 text-xs">● spawning</span></p>
          <p className="ml-8">│   ├── S2.2 <span className="text-blue-400 text-xs">● spawning</span></p>
          <p className="ml-8">│   └── S2.3 <span className="text-blue-400 text-xs">● spawning</span></p>
          <p className="ml-4">└── S3 <span className="text-emerald-400 text-xs">● healthy</span></p>
        </div>
      </div>

      <div className="card p-5 bg-violet-950/20 border-violet-800/30 max-w-lg">
        <div className="flex items-start gap-3">
          <Zap className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-violet-300">Phase 3 Implementation</p>
            <p className="text-xs text-slate-400 mt-1">
              The actual recursive child-spawning algorithm, threshold detection, and
              real-time topology mutation will be implemented in Phase 3 when the backend
              load balancing engine is wired up.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
