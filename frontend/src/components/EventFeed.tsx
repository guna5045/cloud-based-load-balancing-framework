import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, Zap, ArrowRight, AlertCircle, List } from 'lucide-react';
import { LiveEvent, EventType } from '../data/mockData';

interface EventFeedProps {
  events: LiveEvent[];
}

const EVENT_CONFIG: Record<
  EventType,
  { icon: React.FC<{ className?: string }>; color: string; bg: string }
> = {
  request: {
    icon: ArrowRight,
    color: 'text-slate-400',
    bg: 'bg-slate-800',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  scaling: {
    icon: Zap,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  success: {
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  error: {
    icon: AlertCircle,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
  },
  info: {
    icon: Info,
    color: 'text-slate-400',
    bg: 'bg-slate-800',
  },
};

function relativeTime(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export const EventFeed: React.FC<EventFeedProps> = ({ events }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  return (
    <div className="card flex flex-col overflow-hidden" style={{ maxHeight: 320 }}>
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
        <span className="ml-auto text-[10px] text-slate-600">{events.length} events</span>
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        <AnimatePresence initial={false}>
          {events.map((event) => {
            const cfg = EVENT_CONFIG[event.type];
            const Icon = cfg.icon;
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg ${cfg.bg} border border-white/5`}
              >
                <div className={`mt-0.5 shrink-0 ${cfg.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs leading-snug ${cfg.color === 'text-slate-400' ? 'text-slate-300' : cfg.color}`}>
                    {event.message}
                  </p>
                  {event.serverId && (
                    <span className="text-[10px] font-mono text-slate-500 mt-0.5 block">
                      → {event.serverId}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-600 shrink-0 mt-0.5 tabular-nums">
                  {relativeTime(event.timestamp)}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
