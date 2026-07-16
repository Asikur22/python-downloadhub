import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { 
  RefreshCw, 
  Search, 
  ArrowDownCircle, 
  Terminal, 
  AlertCircle, 
  Info,
  Layers,
  ChevronDown
} from 'lucide-react';
import { LogFile, LogContent } from '../types';
import { formatBytes } from '../utils/format';

export default function LogViewer() {
  const [selectedLog, setSelectedLog] = useState<string>('');
  const [linesLimit, setLinesLimit] = useState<number>(200);
  const [filterKeyword, setFilterKeyword] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);

  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Fetch list of available logs
  const { data: logFiles, isLoading: isLoadingFiles, error: filesError } = useQuery<LogFile[]>({
    queryKey: ['log-files'],
    queryFn: async () => {
      const res = await axios.get('/api/settings/logs');
      return res.data;
    }
  });

  // Set default log file once list is loaded
  useEffect(() => {
    if (logFiles && logFiles.length > 0 && !selectedLog) {
      // Find backend.log if available, otherwise default to first file
      const defaultLog = logFiles.find(f => f.name === 'backend.log') || logFiles[0];
      setSelectedLog(defaultLog.name);
    }
  }, [logFiles, selectedLog]);

  // Fetch content of selected log file
  const { 
    data: logContent, 
    isLoading: isLoadingContent, 
    isFetching: isFetchingContent, 
    error: contentError, 
    refetch: refetchContent 
  } = useQuery<LogContent>({
    queryKey: ['log-content', selectedLog, linesLimit],
    queryFn: async () => {
      if (!selectedLog) return { name: '', lines: [], total_lines: 0 };
      const res = await axios.get(`/api/settings/logs/${selectedLog}?lines=${linesLimit}`);
      return res.data;
    },
    enabled: !!selectedLog,
    refetchInterval: autoRefresh ? 5000 : false,
  });

  // Handle auto scroll to bottom
  useEffect(() => {
    if (autoScroll && logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logContent?.lines, filterKeyword, autoScroll]);

  // Trigger manual scroll to bottom
  const handleScrollToBottom = () => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTo({
        top: logsContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // Helper to escape regex special characters
  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // Highlight search keyword in log message
  const highlightKeyword = (text: string, keyword: string) => {
    if (!keyword) return text;
    const parts = text.split(new RegExp(`(${escapeRegExp(keyword)})`, 'gi'));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === keyword.toLowerCase() ? (
            <mark key={i} className="bg-sky-500/30 text-sky-200 rounded px-0.5 border border-sky-500/20 font-medium">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  // Parse log line and return beautiful colored span markup
  const renderLogLine = (line: string, index: number, keyword: string) => {
    // Basic level class determinations
    let levelClass = 'text-slate-300';
    const upperLine = line.toUpperCase();
    
    if (upperLine.includes('ERROR') || upperLine.includes('CRITICAL') || upperLine.includes('FATAL') || upperLine.includes('FAIL')) {
      levelClass = 'text-rose-400 font-bold bg-rose-500/5 px-1 rounded border border-rose-500/10';
    } else if (upperLine.includes('WARN') || upperLine.includes('WARNING')) {
      levelClass = 'text-amber-400 font-semibold bg-amber-500/5 px-1 rounded border border-amber-500/10';
    } else if (upperLine.includes('INFO')) {
      levelClass = 'text-emerald-400 font-medium';
    } else if (upperLine.includes('DEBUG')) {
      levelClass = 'text-sky-400';
    }

    // Regex to match timestamp at starting: 2026-07-16 10:29:54,123
    const dateRegex = /^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:[,\.]\d{3})?Z?)/;
    const dateMatch = line.match(dateRegex);
    
    if (dateMatch) {
      const dateStr = dateMatch[1];
      const rest = line.substring(dateStr.length);
      
      // Match level indicator like [INFO] or INFO:
      const levelRegex = /^\s*\[(INFO|ERROR|WARN|WARNING|DEBUG|CRITICAL)\]/;
      const levelMatch = rest.match(levelRegex);
      
      if (levelMatch) {
        const fullLevelStr = levelMatch[0];
        const message = rest.substring(fullLevelStr.length);
        return (
          <div key={index} className="flex py-1 px-3 border-b border-slate-900/20 hover:bg-white/5 font-mono text-xs items-start leading-relaxed whitespace-pre-wrap transition-colors">
            <span className="text-slate-500 select-none mr-3 shrink-0 font-semibold">{dateStr}</span>
            <span className={`${levelClass} mr-3 shrink-0 text-[10px] tracking-wider uppercase`}>{fullLevelStr.replace(/[\[\]]/g, '').trim()}</span>
            <span className="text-slate-300 break-all">{highlightKeyword(message, keyword)}</span>
          </div>
        );
      }
      
      return (
        <div key={index} className="flex py-1 px-3 border-b border-slate-900/20 hover:bg-white/5 font-mono text-xs items-start leading-relaxed whitespace-pre-wrap transition-colors">
          <span className="text-slate-500 select-none mr-3 shrink-0 font-semibold">{dateStr}</span>
          <span className="text-slate-300 break-all">{highlightKeyword(rest, keyword)}</span>
        </div>
      );
    }
    
    return (
      <div key={index} className="py-1 px-3 border-b border-slate-900/20 hover:bg-white/5 font-mono text-xs leading-relaxed whitespace-pre-wrap transition-colors text-slate-300 break-all">
        {highlightKeyword(line, keyword)}
      </div>
    );
  };

  // Filter lines locally on client
  const filteredLines = logContent?.lines.filter(line => 
    line.toLowerCase().includes(filterKeyword.toLowerCase())
  ) || [];

  const selectedLogDetails = logFiles?.find(f => f.name === selectedLog);

  return (
    <div className="space-y-6">
      
      {/* Control Panel Grid */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          
          {/* Left: Log File Selector & Metadata */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-56">
              <select
                id="log-select"
                value={selectedLog}
                onChange={(e) => {
                  setSelectedLog(e.target.value);
                  setFilterKeyword('');
                }}
                disabled={isLoadingFiles}
                className="w-full pl-3 pr-10 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white text-sm font-semibold focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 cursor-pointer appearance-none"
              >
                {isLoadingFiles && <option>Loading log files...</option>}
                {logFiles?.map(f => (
                  <option key={f.name} value={f.name}>
                    {f.name} ({formatBytes(f.size)})
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-500">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>

            {/* Log Details Label */}
            {selectedLogDetails && (
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/5">
                Size: {formatBytes(selectedLogDetails.size)} | Updated:{' '}
                {new Date(selectedLogDetails.modified * 1000).toLocaleTimeString()}
              </span>
            )}
          </div>

          {/* Right: Actions, Auto Scroll, Refresh */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            
            {/* Limit Lines Select */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lines:</span>
              <select
                value={linesLimit}
                onChange={(e) => setLinesLimit(Number(e.target.value))}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-white font-bold focus:outline-none cursor-pointer"
              >
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
                <option value={1000}>1000</option>
                <option value={2000}>2000</option>
              </select>
            </div>

            {/* Auto Refresh Switch */}
            <label className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 px-3 py-1.5 rounded-xl cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-sky-500 focus:ring-sky-500/20 cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-500 dark:text-gray-300">Auto Refresh (5s)</span>
            </label>

            {/* Auto Scroll Switch */}
            <label className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 px-3 py-1.5 rounded-xl cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-sky-500 focus:ring-sky-500/20 cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-500 dark:text-gray-300">Auto Scroll</span>
            </label>

            {/* Refresh Button */}
            <button
              onClick={() => refetchContent()}
              disabled={isLoadingContent || isFetchingContent}
              className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 disabled:border-slate-800 disabled:bg-slate-800 text-sky-500 dark:text-sky-400 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetchingContent ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

        </div>

        {/* Lower Row: Search Bar / Client-side Filter */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search and filter logs dynamically..."
            value={filterKeyword}
            onChange={(e) => setFilterKeyword(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all font-medium"
          />
          <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400 dark:text-slate-500" />
        </div>
      </div>

      {/* Terminal Viewport */}
      <div className="relative group">
        
        {/* Terminal Header */}
        <div className="flex justify-between items-center bg-slate-900 dark:bg-slate-950 px-4 py-2 border-b border-slate-800 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-sky-400" />
            <span className="text-xs font-bold font-mono text-slate-300">{selectedLog || 'system_console.log'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-slate-800 border border-slate-700"></span>
            <span className="h-3 w-3 rounded-full bg-slate-800 border border-slate-700"></span>
            <span className="h-3 w-3 rounded-full bg-slate-800 border border-slate-700"></span>
          </div>
        </div>

        {/* Console Box */}
        <div 
          ref={logsContainerRef}
          className="h-[520px] overflow-y-auto bg-slate-950 text-slate-200 border border-slate-900 rounded-b-2xl shadow-inner scrollbar-color scrollbar-thin select-text p-2"
          style={{ scrollbarWidth: 'thin' }}
        >
          {/* Fetching overlay (subtle top indicator) */}
          {isFetchingContent && !isLoadingContent && (
            <div className="absolute top-10 right-4 bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] px-2 py-1 rounded font-bold animate-pulse z-10">
              Syncing...
            </div>
          )}

          {/* Loading state */}
          {isLoadingContent ? (
            <div className="flex flex-col justify-center items-center h-full space-y-3">
              <div className="h-8 w-8 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs text-slate-500 font-mono">Loading console contents...</span>
            </div>
          ) : contentError ? (
            <div className="flex flex-col justify-center items-center h-full text-center p-6 space-y-2">
              <AlertCircle className="h-8 w-8 text-rose-500" />
              <span className="text-sm font-semibold text-rose-400">Failed to fetch logs</span>
              <span className="text-xs text-slate-500 max-w-md font-mono">{(contentError as any).message}</span>
            </div>
          ) : filteredLines.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-full text-center p-6 space-y-2 select-none">
              <Layers className="h-8 w-8 text-slate-700" />
              <span className="text-xs font-semibold text-slate-500 font-mono">No matching console logs found</span>
              {filterKeyword && (
                <span className="text-[11px] text-slate-400 font-mono bg-slate-900 px-2.5 py-1 rounded">
                  Query: "{filterKeyword}"
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-col min-w-full">
              {filteredLines.map((line, i) => renderLogLine(line, i, filterKeyword))}
            </div>
          )}
        </div>

        {/* Floating Quick Action: Scroll to Bottom */}
        {!autoScroll && (
          <button
            onClick={handleScrollToBottom}
            className="absolute bottom-4 right-4 flex items-center justify-center p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 text-sky-400 dark:text-sky-300 rounded-full shadow-xl transition-all cursor-pointer group-hover:scale-105 active:scale-95"
            title="Scroll to Bottom"
          >
            <ArrowDownCircle className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Footer Info Box */}
      <div className="p-4 rounded-2xl bg-sky-500/5 border border-sky-500/10 flex gap-3 text-sky-850 dark:text-sky-305 text-xs">
        <Info className="h-5 w-5 text-sky-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold">Log View Diagnostics</p>
          <p className="text-slate-500">
            This display shows the last {linesLimit} lines from the file. For performance reasons, we cap the maximum tail request to 2000 lines. The search query performs case-insensitive filtering client-side.
          </p>
        </div>
      </div>

    </div>
  );
}
