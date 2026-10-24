import React, { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { AppHeader } from '../components/AppHeader';
import { useSocket } from '../hooks/useSocket';
import { apiService } from '../services/api';
import { HealthResponse } from '../types/server.types';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/topology': 'Live Topology',
  '/servers': 'Server Instances',
  '/requests': 'Requests',
  '/autoscaling': 'Auto Scaling',
  '/analytics': 'Analytics',
  '/events': 'Events',
};

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const socket = useSocket();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const h = await apiService.getHealth();
      setHealth(h);
    } catch {
      // Backend may be offline
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const title = PAGE_TITLES[location.pathname] ?? 'Dashboard';

  return (
    <div className="flex h-screen overflow-hidden bg-[#050a12]">
      {/* Sidebar */}
      <Sidebar
        socket={socket}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
      />

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <AppHeader
          health={health}
          socket={socket}
          onRefresh={refresh}
          refreshing={refreshing}
          currentPageTitle={title}
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
