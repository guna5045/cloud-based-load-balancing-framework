/**
 * EventFeed.tsx  (R1 — deduplication + better UX)
 *
 * R1 Changes:
 * - Deduplicate consecutive identical messages (same type + same message text within 5s)
 * - Show newest events at TOP (reverse order) — no auto-scroll confusion
 * - Keep event count capped at 60 to prevent unbounded growth
 * - Better empty state
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, Zap, ArrowRight, AlertCircle, List } from 'lucide-react';
import { LiveEvent, EventType } from '../data/mockData';

interface EventFeedProps {
  events: LiveEvent[];
}

const EVENT_CONFIG: Record<
  EventType,
  { icon: React.FC<{ className?: string }>; color: string; bg: string; border: string }
> = {
  request: {
    icon: ArrowRight,
    color: 'text-slate-300',
    bg: 'bg-slate-800/60',
    border: 'border-slate-700/40',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-400',
    bg: 'bg-amber-500/8',
    border: 'border-amber-500/20',
  },
  scaling: {
    icon: Zap,
    color: 'text-blue-400',
    bg: 'bg-blue-500/8',
    border: 'border-blue-500/20',
  },
  success: {
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/8',
    border: 'border-emerald-500/20',
  },
  error: {
    icon: AlertCircle,
    color: 'text-rose-400',
    bg: 'bg-rose-500/8',
    border: 'border-rose-500/20',
  },
  info: {
    icon: Info,
    color: 'text-slate-400',
    bg: 'bg-slate-800/40',
    border: 'border-slate-700/30',
  },
};

function relativeTime(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export const EventFeed: React.FC<EventFeedProps> = ({ events }) => {
  // Deduplicate: collapse consecutive identical events (same type + message within 5s)
  const deduped = useMemo(() => {
    const WINDOW_MS = 5000;
    const result: (LiveEvent & { count?: number })[] = [];

    // Take most recent 60
    const slice = events.slice(-60);

    for (const ev of slice) {
      const prev = result[result.length - 1];
      if (
        prev &&
        prev.type === ev.type &&
        prev.message === ev.message &&
        Math.abs(new Date(ev.timestamp).getTime() - new Date(prev.timestamp).getTime()) < WINDOW_MS
      ) {
        // Merge: increment count on previous
        result[result.length - 1] = {
          ...prev,
          count: (prev.count ?? 1) + 1,
          timestamp: ev.timestamp, // update to latest timestamp
        };
      } else {
        result.push({ ...ev, count: 1 });
      }
    }

    // Reverse so newest is at top
    return result.reverse();
  }, [events]);

  return (
    <div className="card flex flex-col overflow-hidden" style={{ maxHeight: 300 }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800/80 shrink-0">
        <List className="w-4 h-4 text-blue-400" />
        <span className="font-semibold text-sm text-slate-200">Live Events</span>
        <span className="ml-1 flex items-center gap-1.5 text-emerald-400 text-xs">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          Live
        </span>
        <span className="ml-auto text-[10px] text-slate-600 font-mono">{events.length} total</span>
      </div>

      {/* Event list — newest at top */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {deduped.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center text-slate-500 text-xs">
            <Info className="w-5 h-5 mb-2 text-slate-600" />
            <span className="font-medium text-slate-400">No recent events</span>
            <span className="text-[10px] text-slate-600 mt-0.5">Events from load balancer and server instances will appear here</span>
          </div>
        )}
        <AnimatePresence initial={false}>
          {deduped.map((event) => {
            const cfg = EVENT_CONFIG[event.type];
            const Icon = cfg.icon;
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${cfg.bg} ${cfg.border}`}
              >
                <div className={`mt-0.5 shrink-0 ${cfg.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs leading-snug ${cfg.color}`}>
                    {event.message}
                  </p>
                  {event.serverId && (
                    <span className="text-[10px] font-mono text-slate-500 mt-0.5 block">
                      → {event.serverId}
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] text-slate-600 tabular-nums">
                    {relativeTime(event.timestamp)}
                  </span>
                  {(event.count ?? 1) > 1 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-slate-700 text-slate-400">
                      ×{event.count}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
