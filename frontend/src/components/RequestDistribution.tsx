import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Share2 } from 'lucide-react';
import { RequestDistributionEntry } from '../data/mockData';

interface RequestDistributionProps {
  data: RequestDistributionEntry[];
}

const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#a78bfa'];

const TOOLTIP = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: RequestDistributionEntry }[];
}) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-mono font-bold text-slate-200 mb-1">{d.serverId}</p>
      <p className="text-slate-400">
        {d.requests.toLocaleString()} requests
      </p>
      <p className="text-slate-400">{d.percentage}% share</p>
    </div>
  );
};

export const RequestDistribution: React.FC<RequestDistributionProps> = ({ data }) => {
  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Share2 className="w-4 h-4 text-indigo-400" />
        <span className="font-semibold text-sm text-slate-200">Request Distribution</span>
        <span className="ml-auto text-[10px] text-slate-500 font-mono uppercase tracking-wider">
          Round Robin
        </span>
      </div>

      {/* Bar chart */}
      <div style={{ height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
            barCategoryGap="30%"
          >
            <XAxis
              type="number"
              hide
              domain={[0, Math.max(...data.map((d) => d.requests)) * 1.15]}
            />
            <YAxis
              dataKey="serverId"
              type="category"
              width={36}
              tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<TOOLTIP />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar dataKey="requests" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Percentage strip */}
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={d.serverId} className="flex items-center gap-3">
            <span
              className="font-mono text-xs font-semibold"
              style={{ color: COLORS[i % COLORS.length], minWidth: 32 }}
            >
              {d.serverId}
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
                initial={{ width: 0 }}
                animate={{ width: `${d.percentage}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.08 }}
              />
            </div>
            <span className="text-xs text-slate-400 tabular-nums w-8 text-right">
              {d.percentage}%
            </span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-slate-600 pt-1">
        * Mock data — live Round Robin routing in Phase 3
      </p>
    </div>
  );
};
