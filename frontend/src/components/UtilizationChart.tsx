import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { BarChart2 } from 'lucide-react';
import { TimeSeriesPoint } from '../data/mockData';

interface UtilizationChartProps {
  data: TimeSeriesPoint[];
}

const CUSTOM_TOOLTIP = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-slate-400 mb-1.5 font-mono">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value}
          {p.name === 'load' || p.name === 'cpu' ? '%' : p.name === 'latency' ? ' ms' : ''}
        </p>
      ))}
    </div>
  );
};

export const UtilizationChart: React.FC<UtilizationChartProps> = ({ data }) => {
  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-blue-400" />
        <span className="font-semibold text-sm text-slate-200">System Utilization</span>
        <span className="ml-auto text-[10px] text-slate-500 font-mono">last 10 min</span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px]">
        <span className="flex items-center gap-1.5 text-slate-400">
          <span className="w-3 h-0.5 rounded bg-blue-400 inline-block" />
          Load %
        </span>
        <span className="flex items-center gap-1.5 text-slate-400">
          <span className="w-3 h-0.5 rounded bg-indigo-400 inline-block" />
          Latency ms
        </span>
        <span className="flex items-center gap-1.5 text-slate-400">
          <span className="w-3 h-0.5 rounded bg-emerald-400 inline-block" />
          Req/s
        </span>
      </div>

      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          style={{ height: 180 }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="gradLoad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradLatency" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradRequests" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fill: '#475569', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: '#475569', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CUSTOM_TOOLTIP />} />
              <Area
                type="monotone"
                dataKey="load"
                stroke="#3b82f6"
                strokeWidth={1.5}
                fill="url(#gradLoad)"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="latency"
                stroke="#818cf8"
                strokeWidth={1.5}
                fill="url(#gradLatency)"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="requests"
                stroke="#34d399"
                strokeWidth={1.5}
                fill="url(#gradRequests)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
