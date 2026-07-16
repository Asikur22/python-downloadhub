import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Settings } from '../types';
import { Save, Eye, EyeOff, ShieldCheck, RefreshCw, Terminal, Settings as SettingsIcon } from 'lucide-react';
import LogViewer from './LogViewer';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Local state form fields
  const [defaultDownloadDir, setDefaultDownloadDir] = useState('/downloads/completed');
  const [maxConcurrentDownloads, setMaxConcurrentDownloads] = useState(5);
  const [connectionsPerDownload, setConnectionsPerDownload] = useState(5);
  const [globalMaxDownloadLimit, setGlobalMaxDownloadLimit] = useState('0');
  const [retryAttempts, setRetryAttempts] = useState(5);
  const [retryDelay, setRetryDelay] = useState(60);
  const [autoResume, setAutoResume] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [refreshInterval, setRefreshInterval] = useState(1);
  const [aria2RpcSecret, setAria2RpcSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  const [restartingEngine, setRestartingEngine] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'logs'>('config');

  // Query Settings
  const { data: dbSettings, isLoading } = useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await axios.get('/api/settings');
      return res.data;
    }
  });

  // Populate local state when DB loads
  useEffect(() => {
    if (dbSettings) {
      setDefaultDownloadDir(dbSettings.default_download_dir);
      setMaxConcurrentDownloads(dbSettings.max_concurrent_downloads);
      setConnectionsPerDownload(dbSettings.connections_per_download);
      setGlobalMaxDownloadLimit(dbSettings.global_max_download_limit);
      setRetryAttempts(dbSettings.retry_attempts);
      setRetryDelay(dbSettings.retry_delay);
      setAutoResume(dbSettings.auto_resume);
      setTheme(dbSettings.theme);
      setRefreshInterval(dbSettings.refresh_interval);
      setAria2RpcSecret(dbSettings.aria2_rpc_secret || '');
    }
  }, [dbSettings]);

  // Mutation to save settings
  const mutation = useMutation({
    mutationFn: async (data: Settings) => {
      const res = await axios.put('/api/settings', data);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['settings'], data);
      setSuccessMsg('Settings saved successfully!');
      
      // Update body theme class immediately if theme changes
      if (data.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      setTimeout(() => setSuccessMsg(''), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || 'Failed to save settings.');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    mutation.mutate({
      default_download_dir: defaultDownloadDir.trim(),
      max_concurrent_downloads: Number(maxConcurrentDownloads),
      connections_per_download: Number(connectionsPerDownload),
      global_max_download_limit: globalMaxDownloadLimit.trim(),
      retry_attempts: Number(retryAttempts),
      retry_delay: Number(retryDelay),
      auto_resume: autoResume,
      theme,
      refresh_interval: Number(refreshInterval),
      aria2_rpc_secret: aria2RpcSecret,
    });
  };

  const handleRestartEngine = async () => {
    setRestartingEngine(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await axios.post('/api/settings/restart-engine');
      setSuccessMsg('Downloader engine process restarted successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to restart downloader engine.');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setRestartingEngine(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="h-10 w-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 dark:text-gray-400 text-sm">Loading system settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white sm:text-4xl">
          System Settings
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-gray-400">
          Configure directories, network limits, download concurrency parameters, and UI themes.
        </p>
      </div>

      {/* Tabs Selector Navigation */}
      <div className="flex border-b border-slate-200 dark:border-white/10 space-x-8">
        <button
          type="button"
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-2 pb-3.5 text-sm font-bold border-b-2 transition-all cursor-pointer -mb-[2px] ${
            activeTab === 'config'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          <SettingsIcon className="h-4 w-4" />
          Configuration
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 pb-3.5 text-sm font-bold border-b-2 transition-all cursor-pointer -mb-[2px] ${
            activeTab === 'logs'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          <Terminal className="h-4 w-4" />
          System Logs
        </button>
      </div>

      {activeTab === 'config' ? (
        <>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Directories Group */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-200 dark:border-white/5 pb-2">Directories</h2>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
              Default Completed Download Directory
            </label>
            <input
              type="text"
              required
              value={defaultDownloadDir}
              onChange={(e) => setDefaultDownloadDir(e.target.value)}
              className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white placeholder-gray-500 text-sm focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
            />
            <p className="text-[10px] text-slate-500">
              Files are first downloaded to the incomplete cache (<code>/downloads/incomplete</code>) and moved here upon success.
            </p>
          </div>
        </div>

        {/* Network & Download Limits */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-200 dark:border-white/5 pb-2">Downloads & Engine Limits</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            
            {/* Max Concurrent */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                Max Concurrent Downloads
              </label>
              <input
                type="number"
                min={1}
                max={20}
                required
                value={maxConcurrentDownloads}
                onChange={(e) => setMaxConcurrentDownloads(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white text-sm focus:outline-none focus:border-sky-500 transition-all"
              />
            </div>

            {/* Connections per download */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                Connections Per Download (Split)
              </label>
              <input
                type="number"
                min={1}
                max={16}
                required
                value={connectionsPerDownload}
                onChange={(e) => setConnectionsPerDownload(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white text-sm focus:outline-none focus:border-sky-500 transition-all"
              />
            </div>

            {/* Speed Limit */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                Global Download Speed Limit
              </label>
              <input
                type="text"
                required
                value={globalMaxDownloadLimit}
                onChange={(e) => setGlobalMaxDownloadLimit(e.target.value)}
                placeholder="e.g. 0 (unlimited), 1M, 500K"
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white text-sm focus:outline-none focus:border-sky-500 transition-all"
              />
              <p className="text-[10px] text-slate-500">
                Use 0 for unlimited, or values like 500K, 10M (aria2 syntax).
              </p>
            </div>

            {/* Refresh Interval */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                Dashboard Refresh Interval (seconds)
              </label>
              <input
                type="number"
                min={1}
                max={10}
                required
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white text-sm focus:outline-none focus:border-sky-500 transition-all"
              />
            </div>

          </div>
        </div>

        {/* Retry & Recovery Settings */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-200 dark:border-white/5 pb-2">Retries & Recovery</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            
            {/* Retry attempts */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                Max Retry Attempts
              </label>
              <input
                type="number"
                min={0}
                max={100}
                required
                value={retryAttempts}
                onChange={(e) => setRetryAttempts(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white text-sm focus:outline-none focus:border-sky-500 transition-all"
              />
            </div>

            {/* Retry Delay */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                Retry Delay (seconds)
              </label>
              <input
                type="number"
                min={1}
                max={3600}
                required
                value={retryDelay}
                onChange={(e) => setRetryDelay(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white text-sm focus:outline-none focus:border-sky-500 transition-all"
              />
            </div>

          </div>

          {/* Auto Resume Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 rounded-xl">
            <div className="space-y-0.5">
              <label htmlFor="auto-resume" className="text-sm font-semibold text-slate-850 dark:text-white">Auto Resume Downloads</label>
              <p className="text-[10px] text-slate-500">Automatically recover pending downloads on system/container restarts.</p>
            </div>
            <input
              type="checkbox"
              id="auto-resume"
              checked={autoResume}
              onChange={(e) => setAutoResume(e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-sky-500 focus:ring-sky-500/20 cursor-pointer"
            />
          </div>
        </div>

        {/* Security & Theme */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-200 dark:border-white/5 pb-2">Appearance & Security</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            
            {/* Theme */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                UI Theme
              </label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as 'dark' | 'light')}
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white text-sm focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="dark">Dark Theme (Recommended)</option>
                <option value="light">Light Theme</option>
              </select>
            </div>

            {/* aria2 Secret */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" /> aria2 RPC Secret Token
              </label>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={aria2RpcSecret}
                  onChange={(e) => setAria2RpcSecret(e.target.value)}
                  placeholder="RPC secret token"
                  className="w-full pl-3 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white placeholder-gray-500 text-sm focus:outline-none focus:border-sky-500 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                  {showSecret ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Troubleshooting & Maintenance */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-200 dark:border-white/5 pb-2">
            Troubleshooting & Diagnostics
          </h2>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-slate-800 dark:text-white">Restart Downloader Engine</span>
              <p className="text-[10px] text-slate-500">
                If the downloader is stuck, loses connection, or stops making progress, click here to restart the background aria2c process.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRestartEngine}
              disabled={restartingEngine}
              className="flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 disabled:bg-slate-700 disabled:text-gray-500 rounded-xl transition-all shadow-lg shadow-rose-500/10 cursor-pointer shrink-0"
            >
              {restartingEngine ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Restarting...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin-hover" />
                  Restart aria2 Engine
                </>
              )}
            </button>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end gap-4 pt-2">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex items-center gap-1.5 px-6 py-2.5 text-sm font-bold text-gray-950 bg-sky-400 hover:bg-sky-300 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl transition-all shadow-lg shadow-sky-500/10 cursor-pointer"
          >
            {mutation.isPending ? (
              <div className="h-4 w-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save className="h-4.5 w-4.5" />
            )}
            Save Configuration
          </button>
        </div>

      </form>
      </>
      ) : (
        <LogViewer />
      )}
    </div>
  );
}
