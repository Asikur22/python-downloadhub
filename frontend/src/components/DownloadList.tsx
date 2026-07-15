import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Download } from '../types';
import { formatBytes, formatSpeed, formatDuration } from '../utils/format';
import AddDownloadForm from './AddDownloadForm';
import DownloadDetails from './DownloadDetails';
import { 
  Search, 
  Plus, 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  RefreshCw, 
  Trash2, 
  SlidersHorizontal,
  ChevronDown,
  ExternalLink,
  AlertCircle
} from 'lucide-react';

export default function DownloadList() {
  const queryClient = useQueryClient();
  
  // State for modals and panels
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedDownload, setSelectedDownload] = useState<Download | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [alsoDeleteFile, setAlsoDeleteFile] = useState(false);

  // Filter, Search, and Sort state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [sortOrder, setSortOrder] = useState('desc');

  // Query downloads with filtering parameters
  const { data: downloads = [], isLoading } = useQuery<Download[]>({
    queryKey: ['downloads', search, statusFilter, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter !== 'All') params.append('status', statusFilter);
      if (sortBy) params.append('sort_by', sortBy);
      if (sortOrder) params.append('sort_order', sortOrder);
      
      const res = await axios.get(`/api/downloads?${params.toString()}`);
      return res.data;
    },
    refetchInterval: 1000, // Refresh downloads every 1s
  });

  // Action Mutations
  const pauseMutation = useMutation({
    mutationFn: (id: string) => axios.post(`/api/downloads/${id}/pause`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['downloads'] }),
  });

  const resumeMutation = useMutation({
    mutationFn: (id: string) => axios.post(`/api/downloads/${id}/resume`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['downloads'] }),
  });

  const stopMutation = useMutation({
    mutationFn: (id: string) => axios.post(`/api/downloads/${id}/stop`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['downloads'] }),
  });

  const restartMutation = useMutation({
    mutationFn: (id: string) => axios.post(`/api/downloads/${id}/restart`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['downloads'] }),
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => axios.post(`/api/downloads/${id}/retry`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['downloads'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, deleteFile }: { id: string; deleteFile: boolean }) => 
      axios.delete(`/api/downloads/${id}?delete_file=${deleteFile}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['downloads'] });
      setDeleteConfirmId(null);
      setAlsoDeleteFile(false);
    },
  });

  // Helper stats status colors
  const badgeColors: Record<string, string> = {
    Waiting: 'text-amber-500 bg-amber-500/10 border-amber-500/20 dark:text-amber-400',
    Downloading: 'text-sky-500 bg-sky-500/10 border-sky-500/20 dark:text-sky-400',
    Paused: 'text-slate-500 bg-slate-500/10 border-slate-500/20 dark:text-zinc-400',
    Stopped: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20 dark:text-indigo-400',
    Failed: 'text-rose-500 bg-rose-500/10 border-rose-500/20 dark:text-rose-400',
    Completed: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400',
  };

  const tabs = ['All', 'Downloading', 'Waiting', 'Paused', 'Stopped', 'Completed', 'Failed'];

  const sortingOptions = [
    { label: 'Newest First', value: 'newest', order: 'desc' },
    { label: 'Oldest First', value: 'oldest', order: 'asc' },
    { label: 'Filename A-Z', value: 'filename', order: 'asc' },
    { label: 'Filename Z-A', value: 'filename', order: 'desc' },
    { label: 'Size (Large First)', value: 'size', order: 'desc' },
    { label: 'Size (Small First)', value: 'size', order: 'asc' },
    { label: 'Progress', value: 'progress', order: 'desc' },
    { label: 'Completion Time', value: 'completion_time', order: 'desc' },
  ];

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = sortingOptions.find(o => o.label === e.target.value || `${o.value}-${o.order}` === e.target.value);
    if (selected) {
      setSortBy(selected.value);
      setSortOrder(selected.order);
    }
  };

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation(); // Prevent opening download details modal
    action();
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white">Downloads</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">Manage active downloads and download history.</p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center justify-center gap-1.5 px-5 py-2.5 text-sm font-bold text-gray-950 bg-sky-400 hover:bg-sky-300 rounded-xl transition-all shadow-lg shadow-sky-500/10 cursor-pointer"
        >
          <Plus className="h-4.5 w-4.5" />
          Add Download
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card rounded-2xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 dark:text-gray-400" />
            <input
              type="text"
              placeholder="Search by filename or URL..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white placeholder-gray-500 text-sm focus:outline-none focus:border-sky-500 transition-all"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <SlidersHorizontal className="h-4 w-4 text-slate-400 dark:text-gray-400 shrink-0" />
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={handleSortChange}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white text-sm focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              {sortingOptions.map(opt => (
                <option key={`${opt.value}-${opt.order}`} value={`${opt.value}-${opt.order}`}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-thin">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === tab
                  ? 'bg-sky-500/10 dark:bg-sky-500/15 border border-sky-500/20 dark:border-sky-500/30 text-sky-600 dark:text-sky-400 shadow-sm'
                  : 'bg-transparent text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white border border-transparent'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Downloads List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="glass-card rounded-2xl p-5 shimmer h-32"></div>
          ))}
        </div>
      ) : downloads.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
          <AlertCircle className="h-12 w-12 text-slate-400 dark:text-gray-500 animate-pulse-slow" />
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">No downloads found</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
              Submit a URL to start a background download task.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {downloads.map((download) => (
            <div
              key={download.id}
              onClick={() => setSelectedDownload(download)}
              className="glass-card rounded-2xl p-5 hover:bg-white dark:hover:bg-slate-800/20 transition-all cursor-pointer border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 group flex flex-col justify-between space-y-3"
            >
              {/* Item Info Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white truncate break-all group-hover:text-sky-500 transition-colors">
                    {download.filename}
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-gray-500 truncate font-mono mt-0.5 max-w-lg">
                    {download.url}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded border text-[10px] font-bold tracking-wide uppercase shrink-0 ${badgeColors[download.status] || 'text-gray-400 border-gray-400/20 bg-gray-400/5'}`}>
                  {download.status}
                </span>
              </div>

              {/* Progress and Stats */}
              <div className="space-y-2">
                {/* Progress details */}
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
                  <span className="font-semibold text-slate-800 dark:text-white">{download.progress}%</span>
                  <div className="flex items-center gap-3">
                    <span>{formatBytes(download.downloaded_bytes)} / {formatBytes(download.total_bytes)}</span>
                    {download.status === 'Downloading' && (
                      <>
                        <span className="h-1 w-1 bg-slate-300 dark:bg-gray-600 rounded-full"></span>
                        <span className="text-sky-600 dark:text-sky-400 font-semibold">{formatSpeed(download.speed)}</span>
                        <span className="h-1 w-1 bg-slate-300 dark:bg-gray-600 rounded-full"></span>
                        <span>ETA: {formatDuration(download.eta)}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 dark:bg-gray-900/60 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      download.status === 'Completed' ? 'bg-emerald-500' :
                      download.status === 'Failed' ? 'bg-rose-500' : 'bg-sky-500'
                    }`}
                    style={{ width: `${download.progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Controls bar */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-white/5">
                <span className="text-[10px] text-slate-500 dark:text-gray-500">
                  Created: {new Date(download.created_at).toLocaleString()}
                </span>
                
                {/* Dynamic Controls Buttons */}
                <div className="flex items-center gap-2">
                  
                  {/* Pause / Resume Toggles */}
                  {download.status === 'Downloading' && (
                    <button
                      onClick={(e) => handleActionClick(e, () => pauseMutation.mutate(download.id))}
                      title="Pause"
                      className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      <Pause className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {download.status === 'Waiting' && (
                    <button
                      onClick={(e) => handleActionClick(e, () => pauseMutation.mutate(download.id))}
                      title="Pause"
                      className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      <Pause className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {download.status === 'Paused' && (
                    <button
                      onClick={(e) => handleActionClick(e, () => resumeMutation.mutate(download.id))}
                      title="Resume"
                      className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 rounded-lg text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      <Play className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {download.status === 'Stopped' && (
                    <button
                      onClick={(e) => handleActionClick(e, () => resumeMutation.mutate(download.id))}
                      title="Resume"
                      className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 rounded-lg text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      <Play className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {/* Stop Control */}
                  {['Downloading', 'Waiting', 'Paused'].includes(download.status) && (
                    <button
                      onClick={(e) => handleActionClick(e, () => stopMutation.mutate(download.id))}
                      title="Stop Download"
                      className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 rounded-lg text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      <Square className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {/* Restart Control */}
                  {['Completed', 'Stopped', 'Failed'].includes(download.status) && (
                    <button
                      onClick={(e) => handleActionClick(e, () => restartMutation.mutate(download.id))}
                      title="Restart from zero"
                      className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 rounded-lg text-amber-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {/* Retry Control */}
                  {download.status === 'Failed' && (
                    <button
                      onClick={(e) => handleActionClick(e, () => retryMutation.mutate(download.id))}
                      title="Retry failed download"
                      className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 rounded-lg text-emerald-500 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {/* Delete Control */}
                  <button
                    onClick={(e) => handleActionClick(e, () => setDeleteConfirmId(download.id))}
                    title="Delete download task"
                    className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 rounded-lg text-rose-500 dark:text-rose-400 hover:text-white hover:bg-rose-500/10 dark:hover:bg-rose-500/10 transition-all cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>

                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/70 backdrop-blur-sm">
          <div className="w-full max-w-md glass-card rounded-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Download Task</h3>
            <p className="text-sm text-slate-500 dark:text-gray-400">
              Are you sure you want to delete this task from history? This action is permanent.
            </p>
            
            {/* Delete file checkbox */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 rounded-xl">
              <input
                type="checkbox"
                id="delete-file"
                checked={alsoDeleteFile}
                onChange={(e) => setAlsoDeleteFile(e.target.checked)}
                className="h-4.5 w-4.5 rounded border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-sky-500 focus:ring-sky-500/20 cursor-pointer"
              />
              <label htmlFor="delete-file" className="text-xs font-semibold text-slate-800 dark:text-white cursor-pointer select-none">
                Also delete completed/partial files from disk
              </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setDeleteConfirmId(null);
                  setAlsoDeleteFile(false);
                }}
                className="px-4 py-2 text-sm font-semibold text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate({ id: deleteConfirmId, deleteFile: alsoDeleteFile })}
                className="px-5 py-2 text-sm font-bold text-white bg-rose-500 hover:bg-rose-400 rounded-xl transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddDownloadForm
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />
      <DownloadDetails
        download={selectedDownload}
        onClose={() => setSelectedDownload(null)}
      />
    </div>
  );
}
