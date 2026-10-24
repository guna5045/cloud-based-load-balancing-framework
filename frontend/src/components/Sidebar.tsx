import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  GitBranch,
  Server,
  Send,
  Zap,
  BarChart2,
  List,
  Activity,
  Radio,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { UseSocketReturn } from '../hooks/useSocket';

interface SidebarProps {
  socket: UseSocketReturn;
  collapsed: boolean;
  onToggle: () => void;
}

const NAV_ITEMS = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/topology', icon: GitBranch, label: 'Live Topology' },
  { path: '/servers', icon: Server, label: 'Servers' },
  { path: '/requests', icon: Send, label: 'Requests' },
  { path: '/autoscaling', icon: Zap, label: 'Auto Scaling' },
  { path: '/analytics', icon: BarChart2, label: 'Analytics' },
  { path: '/events', icon: List, label: 'Events' },
] as const;

export const Sidebar: React.FC<SidebarProps> = ({ socket, collapsed, onToggle }) => {
  const location = useLocation();
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 220 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="relative flex flex-col bg-slate-950 border-r border-slate-800/80 shrink-0 overflow-hidden z-20"
      style={{ minHeight: '100vh' }}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-800/60 shrink-0">
        <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow">
          <Activity className="w-4 h-4 text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <p className="text-[11px] font-bold leading-tight text-slate-200 whitespace-nowrap">
                Cloud-Based
              </p>
              <p className="text-[11px] font-bold leading-tight text-slate-200 whitespace-nowrap">
                Load Balancing
              </p>
              <p className="text-[10px] leading-tight text-slate-500 whitespace-nowrap">
                Framework
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 space-y-0.5 px-2">
        {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <div
              key={path}
              className="relative"
              onMouseEnter={() => collapsed && setHovered(label)}
              onMouseLeave={() => setHovered(null)}
            >
              <NavLink
                to={path}
                className={`flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all duration-150 group
                  ${isActive
                    ? 'bg-blue-600/20 text-blue-300'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }
                `}
              >
                <Icon
                  className={`w-4.5 h-4.5 shrink-0 transition-colors ${
                    isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                  style={{ width: 18, height: 18 }}
                />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                      className="text-xs font-medium overflow-hidden whitespace-nowrap"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-400 rounded-r-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </NavLink>

              {/* Tooltip on collapse */}
              <AnimatePresence>
                {collapsed && hovered === label && (
                  <motion.div
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute left-14 top-1/2 -translate-y-1/2 z-50 px-2.5 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-xs text-slate-200 whitespace-nowrap shadow-lg pointer-events-none"
                  >
                    {label}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* Bottom status */}
      <div className="border-t border-slate-800/60 p-3 space-y-2 shrink-0">
        {/* Backend connection */}
        <div className="flex items-center gap-2.5 px-1">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              socket.isConnected ? 'bg-emerald-400' : 'bg-rose-500'
            }`}
          />
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col min-w-0"
              >
                <span className="text-[10px] text-slate-400 truncate">
                  Socket.IO
                </span>
                <span
                  className={`text-[10px] font-semibold ${
                    socket.isConnected ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {socket.isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Backend REST */}
        <div className="flex items-center gap-2.5 px-1">
          <Radio className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col min-w-0"
              >
                <span className="text-[10px] text-slate-400">REST API</span>
                <span className="text-[10px] font-semibold text-blue-400">:5000</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-5 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors shadow z-30"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>
    </motion.aside>
  );
};
