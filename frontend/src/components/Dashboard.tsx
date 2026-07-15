import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Download, HealthInfo } from '../types';
import { formatBytes, formatSpeed } from '../utils/format';
import AddDownloadForm from './AddDownloadForm';
import { 
  Download as DownloadIcon, 
  Play, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Pause, 
  AlertTriangle, 
  Database, 
  HardDrive,
  Plus
} from 'lucide-react';

export default function Dashboard() {
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Query downloads list
  const { data: downloads = [], isLoading: loadingDownloads } = useQuery<Download[]>({
    queryKey: ['downloads'],
    queryFn: async () => {
      const res = await axios.get('/api/downloads');
      return res.data;
    },
    refetchInterval: 1000, // Refresh every second
  });

  // Query health (for storage info)
  const { data: health, isLoading: loadingHealth } = useQuery<HealthInfo>({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await axios.get('/api/health');
      return res.data;
    },
    refetchInterval: 5000, // Refresh every 5s
  });

  // Calculate statistics
  const total = downloads.length;
  const active = downloads.filter((d) => d.status === 'Downloading').length;
  const waiting = downloads.filter((d) => d.status === 'Waiting').length;
  const completed = downloads.filter((d) => d.status === 'Completed').length;
  const failed = downloads.filter((d) => d.status === 'Failed').length;
  const paused = downloads.filter((d) => d.status === 'Paused').length;
  const stopped = downloads.filter((d) => d.status === 'Stopped').length;

  const currentSpeed = downloads.reduce((acc, d) => acc + (d.status === 'Downloading' ? d.speed : 0), 0);

  const stats = [
    { name: 'Active Downloads', value: active, icon: Play, color: 'text-sky-500 bg-sky-500/10 border-sky-500/20' },
    { name: 'Waiting Downloads', value: waiting, icon: Clock, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
    { name: 'Completed', value: completed, icon: CheckCircle, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
    { name: 'Failed', value: failed, icon: XCircle, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
    { name: 'Paused', value: paused, icon: Pause, color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20' },
    { name: 'Stopped', value: stopped, icon: AlertTriangle, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
  ];

  const storage = health?.storage;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white sm:text-4xl">
            System Dashboard
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-gray-400">
            Real-time summary of download queues, network activity, and storage metrics.
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center justify-center gap-1.5 px-5 py-2.5 text-sm font-bold text-gray-950 bg-sky-400 hover:bg-sky-300 rounded-xl transition-all shadow-lg shadow-sky-500/10 cursor-pointer shrink-0"
        >
          <Plus className="h-4.5 w-4.5" />
          Add Download
        </button>
      </div>

      {/* Hero Speed & Storage Info */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Speed Card */}
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between h-48 group hover:scale-[1.01] transition-transform duration-300">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-sky-500/10 rounded-full blur-xl group-hover:bg-sky-500/25 transition-colors duration-500"></div>
          <div>
            <span className="text-sm font-medium text-slate-500 dark:text-gray-400">Current Download Speed</span>
            <div className="mt-2 flex items-baseline">
              <span className="text-4xl font-extrabold tracking-tight text-slate-800 dark:text-white sm:text-5xl">
                {formatSpeed(currentSpeed)}
              </span>
            </div>
          </div>
          <div className="flex items-center text-xs text-sky-500 dark:text-sky-400 font-semibold gap-1.5 animate-pulse-slow">
            <span className="h-2 w-2 rounded-full bg-sky-500 dark:bg-sky-400"></span>
            Live network activity
          </div>
        </div>

        {/* Storage Card */}
        <div className="glass-card rounded-2xl p-6 flex flex-col justify-between h-48 group hover:scale-[1.01] transition-transform duration-300">
          <div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-500 dark:text-gray-400">Storage Used</span>
              <HardDrive className="h-5 w-5 text-slate-400 group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-colors" />
            </div>
            {storage ? (
              <div className="mt-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white">
                    {storage.used_percent}%
                  </span>
                  <span className="text-xs text-slate-500 dark:text-gray-400">
                    ({formatBytes(storage.used_bytes)} / {formatBytes(storage.total_bytes)})
                  </span>
                </div>
                {/* Custom Gradient Progress Bar */}
                <div className="mt-3 w-full bg-slate-200 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-sky-500 to-indigo-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${storage.used_percent}%` }}
                  ></div>
                </div>
              </div>
            ) : (
              <div className="mt-4 animate-pulse space-y-2">
                <div className="h-4 bg-slate-200 dark:bg-gray-800 rounded w-1/4"></div>
                <div className="h-2 bg-slate-200 dark:bg-gray-800 rounded w-full"></div>
              </div>
            )}
          </div>
          <div className="text-xs text-slate-500 dark:text-gray-400">
            {storage ? `${formatBytes(storage.free_bytes)} remaining space` : 'Calculating...'}
          </div>
        </div>
      </div>

      {/* Grid Statistics */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Queue Summary ({total} total)</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.name} className="glass-card rounded-xl p-4 flex flex-col justify-between hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-gray-400">{stat.name}</span>
                  <div className={`p-1.5 rounded-lg border ${stat.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-2xl font-bold text-slate-800 dark:text-white">{stat.value}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Engine Status & System Info */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="h-5 w-5 text-sky-500" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Engine Integration</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5">
            <span className="text-sm text-slate-600 dark:text-gray-400">SQLite Database Status</span>
            <div className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${health?.database === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              <span className="text-xs font-semibold text-slate-800 dark:text-white">{health?.database === 'connected' ? 'Connected' : 'Offline'}</span>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5">
            <span className="text-sm text-slate-600 dark:text-gray-400">aria2 Downloader status</span>
            <div className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${health?.aria2 === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              <span className="text-xs font-semibold text-slate-800 dark:text-white">{health?.aria2 === 'connected' ? 'Connected' : 'Offline'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add Download Modal */}
      <AddDownloadForm
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />
    </div>
  );
}
