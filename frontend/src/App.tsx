import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import Dashboard from './components/Dashboard';
import DownloadList from './components/DownloadList';
import SettingsPage from './components/SettingsPage';
import { Settings, HealthInfo } from './types';
import { formatBytes } from './utils/format';
import { 
  LayoutDashboard, 
  Download, 
  Settings as SettingsIcon, 
  Database,
  Terminal,
  Server
} from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function MainLayout() {
  // Query health (for indicators in sidebar)
  const { data: health } = useQuery<HealthInfo>({
    queryKey: ['health-status'],
    queryFn: async () => {
      const res = await axios.get('/api/health');
      return res.data;
    },
    refetchInterval: 5000,
  });

  // Query settings (to initialize theme)
  const { data: appSettings } = useQuery<Settings>({
    queryKey: ['settings-init'],
    queryFn: async () => {
      const res = await axios.get('/api/settings');
      return res.data;
    },
  });

  // Handle theme initialization
  useEffect(() => {
    if (appSettings) {
      if (appSettings.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      // Default to light mode if not loaded to prevent black flash
      document.documentElement.classList.remove('dark');
    }
  }, [appSettings]);

  const storage = health?.storage;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-gray-950 text-slate-800 dark:text-gray-100">
      
      {/* Sidebar Layout */}
      <aside className="hidden md:flex md:flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-white/5 flex-shrink-0">
        {/* Branding Title */}
        <div className="flex items-center gap-2 px-6 h-16 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-900/60">
          <div className="p-1 bg-sky-500/10 rounded-lg text-sky-500 dark:text-sky-400">
            <Download className="h-5 w-5" />
          </div>
          <span className="text-lg font-black tracking-wider text-slate-800 dark:text-white">
            DownloadHub
          </span>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive 
                  ? 'bg-sky-500/10 text-sky-500 dark:text-sky-400 border border-sky-500/15' 
                  : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent'
              }`
            }
          >
            <LayoutDashboard className="h-4.5 w-4.5" />
            Dashboard
          </NavLink>
          <NavLink
            to="/downloads"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive 
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/15' 
                  : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent'
              }`
            }
          >
            <Download className="h-4.5 w-4.5" />
            Downloads
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive 
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/15' 
                  : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent'
              }`
            }
          >
            <SettingsIcon className="h-4.5 w-4.5" />
            Settings
          </NavLink>
        </nav>

        {/* Sidebar Footer System Metrics */}
        <div className="p-4 border-t border-slate-200 dark:border-white/5 space-y-4 bg-slate-50 dark:bg-slate-900/40">
          
          {/* Storage stats */}
          {storage && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-gray-500 font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1"><Server className="h-3 w-3" /> Storage</span>
                <span>{storage.used_percent}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-sky-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${storage.used_percent}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-gray-500 text-right font-semibold">
                {formatBytes(storage.free_bytes)} free
              </p>
            </div>
          )}

          {/* Engine indicators */}
          <div className="space-y-2 border-t border-slate-200 dark:border-white/5 pt-3">
            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-gray-500 font-bold uppercase tracking-wider">
              <span>Services</span>
            </div>
            
            {/* DB */}
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-gray-400 font-medium">
                <Database className="h-3.5 w-3.5 text-slate-400" /> Database
              </span>
              <span className={`h-2 w-2 rounded-full ${health?.database === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
            </div>

            {/* aria2 */}
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-gray-400 font-medium">
                <Terminal className="h-3.5 w-3.5 text-slate-400" /> aria2 engine
              </span>
              <span className={`h-2 w-2 rounded-full ${health?.aria2 === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
            </div>
          </div>
          
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Mobile Navbar Header */}
        <header className="flex md:hidden items-center justify-between h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/5 px-6">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-sky-500 dark:text-sky-400" />
            <span className="text-md font-extrabold text-slate-900 dark:text-white">DownloadHub</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-gray-400">
            <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'text-sky-500 dark:text-sky-400' : ''}>Dashboard</NavLink>
            <NavLink to="/downloads" className={({ isActive }) => isActive ? 'text-sky-500 dark:text-sky-400' : ''}>Downloads</NavLink>
            <NavLink to="/settings" className={({ isActive }) => isActive ? 'text-sky-500 dark:text-sky-400' : ''}>Settings</NavLink>
          </div>
        </header>

        {/* Inner Content Panel */}
        <main className="flex-1 overflow-y-auto px-6 py-8 md:px-8">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/downloads" element={<DownloadList />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>

    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <MainLayout />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
