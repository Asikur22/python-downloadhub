import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { X, Plus, Sparkles, FolderPlus } from 'lucide-react';

interface AddDownloadFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddDownloadForm({ isOpen, onClose }: AddDownloadFormProps) {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState('');
  const [destination, setDestination] = useState('');
  const [filename, setFilename] = useState('');
  const [validationError, setValidationError] = useState('');

  // Mutation to add download
  const mutation = useMutation({
    mutationFn: async (data: { url: string; destination?: string; filename?: string }) => {
      const response = await axios.post('/api/downloads', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['downloads'] });
      // Reset form
      setUrl('');
      setDestination('');
      setFilename('');
      setValidationError('');
      onClose();
    },
    onError: (error: any) => {
      const errMsg = error.response?.data?.detail || 'An error occurred while adding the download.';
      setValidationError(errMsg);
    }
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    // Client-side URL check
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setValidationError('URL is required.');
      return;
    }

    const urlPattern = /^(https?|ftp):\/\/[^\s$.?#].[^\s]*$/i;
    if (!urlPattern.test(trimmedUrl)) {
      setValidationError('Please enter a valid URL starting with http://, https://, or ftp://');
      return;
    }

    // Client-side directory traversal check
    if (destination.includes('..') || destination.startsWith('/')) {
      setValidationError("Destination folder must be relative and cannot contain '..'");
      return;
    }

    mutation.mutate({
      url: trimmedUrl,
      destination: destination.trim() || undefined,
      filename: filename.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/70 backdrop-blur-sm">
      <div className="w-full max-w-lg glass-card rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-sky-500" />
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Add New Download</h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg text-slate-400 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {validationError && (
            <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-xs font-medium">
              {validationError}
            </div>
          )}

          {/* URL Input */}
          <div className="space-y-1.5">
            <label htmlFor="url" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
              Download URL <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="url"
              rows={3}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste HTTP, HTTPS, or FTP link here..."
              required
              disabled={mutation.isPending}
              className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white placeholder-gray-500 text-sm focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all resize-none"
            />
          </div>

          {/* Destination & Filename Inputs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Custom Filename */}
            <div className="space-y-1.5">
              <label htmlFor="filename" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                Custom Filename (Optional)
              </label>
              <input
                type="text"
                id="filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="e.g. ubuntu-desktop.iso"
                disabled={mutation.isPending}
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white placeholder-gray-500 text-sm focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
              />
            </div>

            {/* Destination Folder */}
            <div className="space-y-1.5">
              <label htmlFor="destination" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                Subfolder (Optional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="destination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. ISOs/Linux"
                  disabled={mutation.isPending}
                  className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white placeholder-gray-500 text-sm focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                />
                <FolderPlus className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400 dark:text-gray-500" />
              </div>
            </div>
          </div>

          {/* Tips Info */}
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Downloads will be saved under the default folder config. Specifying a subfolder will append it dynamically (e.g. <code>/downloads/completed/ISOs/Linux</code>).
          </p>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-bold text-gray-950 bg-sky-400 hover:bg-sky-300 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl transition-all shadow-lg shadow-sky-500/10 cursor-pointer"
            >
              {mutation.isPending ? (
                <>
                  <div className="h-4 w-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                  Adding...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Start Download
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
