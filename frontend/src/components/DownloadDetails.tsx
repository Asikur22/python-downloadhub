import React from 'react';
import { Download } from '../types';
import { formatBytes, formatSpeed, formatDuration } from '../utils/format';
import { X, Copy, Calendar, Server, Info, AlertTriangle } from 'lucide-react';

interface DownloadDetailsProps {
  download: Download | null;
  onClose: () => void;
}

export default function DownloadDetails({ download, onClose }: DownloadDetailsProps) {
  if (!download) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const statusColors: Record<string, string> = {
    Waiting: 'text-amber-500 bg-amber-500/10 border-amber-500/20 dark:text-amber-400',
    Downloading: 'text-sky-500 bg-sky-500/10 border-sky-500/20 dark:text-sky-400 animate-pulse-slow',
    Paused: 'text-slate-500 bg-slate-500/10 border-slate-500/20 dark:text-zinc-400',
    Stopped: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20 dark:text-indigo-400',
    Failed: 'text-rose-500 bg-rose-500/10 border-rose-500/20 dark:text-rose-400',
    Completed: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl glass-card rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-sky-500" />
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Download Details</h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg text-slate-400 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          
          {/* Status and Filename */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className={`inline-flex items-center px-2.5 py-1.5 rounded-lg border text-xs font-bold ${statusColors[download.status] || 'text-gray-400 bg-gray-400/10'}`}>
                {download.status}
              </span>
              <h3 className="mt-2 text-lg font-bold text-slate-800 dark:text-white break-all">
                {download.filename}
              </h3>
            </div>
            
            {/* Download percentage */}
            <div className="text-left sm:text-right">
              <span className="text-3xl font-extrabold text-slate-800 dark:text-white">{download.progress}%</span>
              <p className="text-xs text-slate-500 dark:text-gray-400">Progress</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-200 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                download.status === 'Completed' ? 'bg-emerald-500' : 
                download.status === 'Failed' ? 'bg-rose-500' : 'bg-sky-500'
              }`}
              style={{ width: `${download.progress}%` }}
            ></div>
          </div>

          {/* Size metrics */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-500">Downloaded</span>
              <p className="mt-1 text-sm font-bold text-slate-800 dark:text-white">{formatBytes(download.downloaded_bytes)}</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-500">Total Size</span>
              <p className="mt-1 text-sm font-bold text-slate-800 dark:text-white">{formatBytes(download.total_bytes)}</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-500">Current Speed</span>
              <p className="mt-1 text-sm font-bold text-slate-800 dark:text-white">{download.status === 'Downloading' ? formatSpeed(download.speed) : '0 B/s'}</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-500">ETA</span>
              <p className="mt-1 text-sm font-bold text-slate-800 dark:text-white">{download.status === 'Downloading' ? formatDuration(download.eta) : '--'}</p>
            </div>
          </div>

          {/* Error Message Section */}
          {download.status === 'Failed' && download.error_message && (
            <div className="flex gap-2.5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider">Error Details</span>
                <p className="text-xs leading-relaxed">{download.error_message}</p>
              </div>
            </div>
          )}

          {/* File Paths & Links */}
          <div className="space-y-4 border-t border-slate-200 dark:border-white/5 pt-5">
            {/* Original URL */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-500 flex items-center gap-1.5">
                Source URL
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={download.url}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white placeholder-gray-500 text-xs focus:outline-none"
                />
                <button
                  onClick={() => copyToClipboard(download.url)}
                  title="Copy URL"
                  className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-400 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white transition-colors"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Destination Paths */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-500 flex items-center gap-1.5">
                  <Server className="h-3 w-3" /> Subfolder
                </span>
                <p className="text-xs font-semibold text-slate-800 dark:text-white px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl break-all">
                  {download.destination || 'root (default Completed)'}
                </p>
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-500">Download ID</span>
                <p className="text-xs font-semibold text-slate-800 dark:text-white px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl select-all font-mono">
                  {download.id}
                </p>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="space-y-3 border-t border-slate-200 dark:border-white/5 pt-5">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-500 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> History Timeline
            </span>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
              <div className="flex justify-between sm:flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-transparent">
                <span className="text-slate-500 dark:text-gray-400">Created Time</span>
                <span className="font-semibold text-slate-850 dark:text-white">{formatDate(download.created_at)}</span>
              </div>
              <div className="flex justify-between sm:flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-transparent">
                <span className="text-slate-500 dark:text-gray-400">Started Time</span>
                <span className="font-semibold text-slate-850 dark:text-white">{formatDate(download.started_at)}</span>
              </div>
              <div className="flex justify-between sm:flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-transparent">
                <span className="text-slate-500 dark:text-gray-400">Completed Time</span>
                <span className="font-semibold text-slate-850 dark:text-white">{formatDate(download.completed_at)}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-white/5 flex items-center justify-end bg-slate-50 dark:bg-slate-900/20">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-bold text-gray-950 bg-sky-400 hover:bg-sky-300 rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
