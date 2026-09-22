import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  Search,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Filter,
  ArrowDown
} from 'lucide-react';
import { LogEntry } from '../types';

interface LogsViewProps {
  logs: LogEntry[];
  onClearLogs: () => void;
  onRefreshLogs: () => void;
}

export const LogsView: React.FC<LogsViewProps> = ({
  logs,
  onClearLogs,
  onRefreshLogs
}) => {
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const filteredLogs = logs.filter((l) => {
    if (levelFilter !== 'ALL' && l.level !== levelFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        l.message.toLowerCase().includes(q) ||
        (l.details && JSON.stringify(l.details).toLowerCase().includes(q))
      );
    }
    return true;
  });

  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs, autoScroll]);

  const handleCopyLogs = () => {
    const text = filteredLogs
      .map(l => `[${l.timestamp}] [${l.level}] ${l.message} ${l.details ? JSON.stringify(l.details) : ''}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR':
        return 'text-rose-400 bg-rose-950/40 border-rose-800/60';
      case 'WARN':
        return 'text-amber-400 bg-amber-950/40 border-amber-800/60';
      case 'DEBUG':
        return 'text-purple-400 bg-purple-950/40 border-purple-800/60';
      default:
        return 'text-cyan-400 bg-cyan-950/40 border-cyan-800/60';
    }
  };

  return (
    <div className="p-6 space-y-4 max-w-6xl mx-auto flex flex-col h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-bold text-slate-100">Application Diagnostics & Logs</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              {logs.length} entries
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Real-time event streaming from yt-dlp child processes and download pipeline
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onRefreshLogs}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title="Refresh logs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleCopyLogs}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Logs'}</span>
          </button>

          <button
            onClick={onClearLogs}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/50 hover:text-rose-300 text-slate-400 text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-2 rounded-xl border border-slate-800 shrink-0">
        <div className="flex items-center space-x-1 w-full sm:w-auto">
          {['ALL', 'INFO', 'WARN', 'ERROR', 'DEBUG'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                levelFilter === lvl
                  ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <label className="flex items-center space-x-1.5 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 w-3.5 h-3.5"
            />
            <span>Auto-scroll</span>
          </label>

          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search in logs..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Terminal View */}
      <div className="flex-1 bg-[#060910] border border-slate-800/90 rounded-xl p-3.5 font-mono text-[11px] overflow-y-auto space-y-1.5 shadow-inner">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-600 italic">
            No log events to display
          </div>
        ) : (
          filteredLogs.map((l) => (
            <div key={l.id} className="flex items-start space-x-2.5 hover:bg-slate-900/50 p-1 rounded transition-colors">
              <span className="text-slate-500 shrink-0 select-none">
                {l.timestamp.split('T')[1]?.replace('Z', '') || l.timestamp}
              </span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.2 rounded border shrink-0 ${getLevelColor(
                  l.level
                )}`}
              >
                {l.level}
              </span>
              <span className="text-slate-300 break-all leading-relaxed">
                {l.message}
                {l.details && (
                  <span className="text-slate-500 ml-2 text-[10px]">
                    {JSON.stringify(l.details)}
                  </span>
                )}
              </span>
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};
