import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { X, Plus, Sparkles, FolderPlus, Link, FileText, Info, AlertCircle } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md transition-all duration-350">
      <div className="w-full max-w-lg bg-[#ffffff] dark:bg-[#0c0e17] border border-slate-200 dark:border-[#1e2338] rounded-2xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Colorful gradient accent line at the very top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500"></div>
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-[#1c2033] flex items-center justify-between bg-slate-50/70 dark:bg-[#121624]/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0 shadow-inner">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-slate-800 dark:text-[#f3f4f6]">Add New Download</h2>
              <p className="text-[10px] font-bold text-slate-400 dark:text-indigo-400/80 uppercase tracking-wider mt-0.5">downloader engine connection</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-xl text-slate-400 dark:text-gray-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#181d30] transition-all duration-200 border border-transparent hover:border-slate-200 dark:hover:border-white/5"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {validationError && (
            <div className="flex items-start gap-2.5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold leading-relaxed">
              <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {/* URL Input */}
          <div className="space-y-2">
            <label htmlFor="url" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#9ca3af] select-none">
              <Link className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
              Download URL <span className="text-rose-500 font-bold">*</span>
            </label>
            <textarea
              id="url"
              rows={3}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste HTTP, HTTPS, or FTP link here..."
              required
              disabled={mutation.isPending}
              className="w-full px-4 py-3 bg-white dark:bg-[#101422] border border-slate-200 dark:border-[#1e2338] rounded-xl text-slate-800 dark:text-[#f3f4f6] placeholder-slate-400 dark:placeholder-[#4b5563] text-sm focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/15 focus:bg-white dark:focus:bg-[#101422] shadow-sm transition-all resize-none font-sans"
            />
          </div>

          {/* Destination & Filename Inputs */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            
            {/* Custom Filename */}
            <div className="space-y-2">
              <label htmlFor="filename" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#9ca3af] select-none">
                <FileText className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                Custom Filename
              </label>
              <input
                type="text"
                id="filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="e.g. ubuntu-desktop.iso"
                disabled={mutation.isPending}
                className="w-full px-4 py-2.5 bg-white dark:bg-[#101422] border border-slate-200 dark:border-[#1e2338] rounded-xl text-slate-800 dark:text-[#f3f4f6] placeholder-slate-400 dark:placeholder-[#4b5563] text-sm focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/15 focus:bg-white dark:focus:bg-[#101422] shadow-sm transition-all"
              />
            </div>

            {/* Destination Folder */}
            <div className="space-y-2">
              <label htmlFor="destination" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#9ca3af] select-none">
                <FolderPlus className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                Subfolder (Optional)
              </label>
              <input
                type="text"
                id="destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. ISOs/Linux"
                disabled={mutation.isPending}
                className="w-full px-4 py-2.5 bg-white dark:bg-[#101422] border border-slate-200 dark:border-[#1e2338] rounded-xl text-slate-800 dark:text-[#f3f4f6] placeholder-slate-400 dark:placeholder-[#4b5563] text-sm focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/15 focus:bg-white dark:focus:bg-[#101422] shadow-sm transition-all"
              />
            </div>
          </div>

          {/* Tips Info Panel */}
          <div className="flex gap-3.5 p-4 bg-indigo-500/5 dark:bg-indigo-500/5 border border-indigo-500/10 dark:border-indigo-500/10 rounded-2xl">
            <Info className="h-5 w-5 text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-600 dark:text-[#9ca3af] leading-relaxed">
              Downloads are saved under the default folder config. Specifying a subfolder will append it dynamically (e.g. <code className="px-1.5 py-0.5 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/10 rounded font-mono text-[10px]">/downloads/completed/ISOs/Linux</code>).
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-[#1c2033] bg-slate-50/50 dark:bg-[#121624]/10 -mx-6 -mb-6 px-6 pb-6 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold text-slate-550 dark:text-[#9ca3af] hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#181d30] border border-transparent hover:border-slate-200 dark:hover:border-white/5 rounded-xl transition-all duration-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 active:scale-98 disabled:from-slate-700 disabled:to-slate-800 disabled:text-slate-400 rounded-xl transition-all shadow-lg shadow-indigo-500/25 disabled:shadow-none cursor-pointer"
            >
              {mutation.isPending ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Adding...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 animate-pulse" />
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
