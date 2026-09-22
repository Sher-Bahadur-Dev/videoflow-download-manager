import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  Search,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Download,
  AlertTriangle,
  Info,
  Bug,
  AlertCircle,
  FileText
} from 'lucide-react';
import { LogEntry } from '../types';

interface LogsViewProps {
  logs: LogEntry[];
  onClearLogs: () => Promise<void> | void;
  onRefreshLogs: () => Promise<void> | void;
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
  const [exported, setExported] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
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

  // Copy logs to clipboard
  const handleCopyLogs = () => {
    const text = filteredLogs
      .map(
        (l) =>
          `[${l.timestamp}] [${l.level.padEnd(5)}] ${l.message} ${
            l.details ? JSON.stringify(l.details) : ''
          }`
      )
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export current logs to a text file
  const handleExportLogs = () => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const filename = `videoflow_logs_${dateStr}_${timeStr}.txt`;

    const header = [
      '================================================================================',
      ' VIDEOFLOW IDM - APPLICATION DIAGNOSTICS & SYSTEM EVENT LOGS',
      ` Exported: ${now.toLocaleString()}`,
      ` Total Buffer Entries: ${logs.length}`,
      ` Filtered Count: ${filteredLogs.length}`,
      ` Active Level Filter: ${levelFilter}`,
      search.trim() ? ` Search Filter: "${search.trim()}"` : '',
      '================================================================================\n'
    ]
      .filter(Boolean)
      .join('\n');

    const logLines = filteredLogs
      .map(
        (l) =>
          `[${l.timestamp}] [${l.level.padEnd(5)}] ${l.message} ${
            l.details ? JSON.stringify(l.details) : ''
          }`
      )
      .join('\n');

    const fullContent = header + logLines;

    const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExported(true);
    setTimeout(() => setExported(false), 2500);
  };

  // Clear logs buffer
  const handleConfirmClear = async () => {
    try {
      setClearing(true);
      await onClearLogs();
      setShowClearConfirm(false);
    } finally {
      setClearing(false);
    }
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

  // Counts by level
  const errorCount = logs.filter((l) => l.level === 'ERROR').length;
  const warnCount = logs.filter((l) => l.level === 'WARN').length;
  const infoCount = logs.filter((l) => l.level === 'INFO').length;
  const debugCount = logs.filter((l) => l.level === 'DEBUG').length;

  return (
    <div className="p-4 sm:p-6 space-y-3 max-w-6xl mx-auto flex flex-col h-[calc(100vh-5rem)] font-sans">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <h1 className="text-base font-bold text-slate-100">
              System Diagnostics & Event Logs
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
              Buffer: {logs.length} / 1000 slots
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time event capture from yt-dlp processes, stream analyzer, and download engine
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Refresh */}
          <button
            onClick={onRefreshLogs}
            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer border border-slate-700"
            title="Refresh logs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Copy Logs */}
          <button
            onClick={handleCopyLogs}
            className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer border border-slate-700"
            title="Copy filtered logs to clipboard"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Export to Text File */}
          <button
            onClick={handleExportLogs}
            className="px-3 py-1.5 rounded-md bg-cyan-950 hover:bg-cyan-900/80 text-cyan-300 hover:text-cyan-200 text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer border border-cyan-800/80 shadow-xs"
            title="Export logs buffer to a text file (.txt)"
          >
            {exported ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Download className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span>{exported ? 'Exported .txt!' : 'Export Logs (.txt)'}</span>
          </button>

          {/* Clear Buffer */}
          <button
            onClick={() => setShowClearConfirm(true)}
            className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer border border-slate-700 hover:border-rose-800/60"
            title="Clear the logs buffer and wipe log file"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Clear Buffer</span>
          </button>
        </div>
      </div>

      {/* Confirmation Dialog for Clearing Buffer */}
      {showClearConfirm && (
        <div className="bg-rose-950/40 border border-rose-700/60 rounded-lg p-3 text-xs flex items-center justify-between animate-in fade-in duration-100 shrink-0">
          <div className="flex items-center space-x-2 text-rose-200">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              Clear all <strong>{logs.length}</strong> log entries from memory buffer and app.log?
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowClearConfirm(false)}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              disabled={clearing}
              onClick={handleConfirmClear}
              className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-colors cursor-pointer flex items-center space-x-1"
            >
              <span>{clearing ? 'Clearing...' : 'Confirm Clear'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-[#0e1628] p-2 rounded-lg border border-slate-800 shrink-0">
        {/* Level filter tabs with badges */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setLevelFilter('ALL')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              levelFilter === 'ALL'
                ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            ALL ({logs.length})
          </button>
          <button
            onClick={() => setLevelFilter('INFO')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              levelFilter === 'INFO'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 shadow-xs'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800/40'
            }`}
          >
            INFO ({infoCount})
          </button>
          <button
            onClick={() => setLevelFilter('WARN')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              levelFilter === 'WARN'
                ? 'bg-amber-950 text-amber-300 border border-amber-800 shadow-xs'
                : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800/40'
            }`}
          >
            WARN ({warnCount})
          </button>
          <button
            onClick={() => setLevelFilter('ERROR')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              levelFilter === 'ERROR'
                ? 'bg-rose-950 text-rose-300 border border-rose-800 shadow-xs'
                : 'text-slate-400 hover:text-rose-300 hover:bg-slate-800/40'
            }`}
          >
            ERROR ({errorCount})
          </button>
          <button
            onClick={() => setLevelFilter('DEBUG')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              levelFilter === 'DEBUG'
                ? 'bg-purple-950 text-purple-300 border border-purple-800 shadow-xs'
                : 'text-slate-400 hover:text-purple-300 hover:bg-slate-800/40'
            }`}
          >
            DEBUG ({debugCount})
          </button>
        </div>

        {/* Auto-scroll & Search input */}
        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-1.5 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
            />
            <span>Auto-scroll</span>
          </label>

          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search logs or parameters..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-md text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* 3. Log Stream Terminal */}
      <div className="flex-1 bg-[#050811] border border-slate-800 rounded-lg p-3 font-mono text-[11px] overflow-y-auto space-y-1 shadow-inner select-text">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-1 select-none">
            <FileText className="w-8 h-8 text-slate-700 stroke-1" />
            <p className="text-xs">No log entries matching filter</p>
            {logs.length === 0 && (
              <p className="text-[10px] text-slate-700">Buffer is currently empty</p>
            )}
          </div>
        ) : (
          filteredLogs.map((l) => (
            <div
              key={l.id}
              className="flex items-start space-x-2.5 hover:bg-slate-900/60 p-1 rounded transition-colors group leading-tight"
            >
              <span className="text-slate-500 shrink-0 select-none text-[10px]">
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
