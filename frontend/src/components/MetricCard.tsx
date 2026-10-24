import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    positive?: boolean;
  };
  accentColor?: string;
  description?: string;
  loading?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  icon: Icon,
  accentColor = 'text-blue-400',
  description,
  loading = false,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="card p-5 flex flex-col gap-3 hover:shadow-card-hover transition-shadow duration-200"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          {title}
        </span>
        <div className={`p-1.5 rounded-lg bg-slate-800/80 ${accentColor}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      {loading ? (
        <div className="h-9 w-24 bg-slate-800 rounded animate-pulse" />
      ) : (
        <div className="flex items-end gap-1.5">
          <span className={`kpi-value ${accentColor}`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>
          {unit && <span className="text-base font-medium text-slate-400 mb-0.5">{unit}</span>}
        </div>
      )}

      {description && (
        <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
      )}
    </motion.div>
  );
};
