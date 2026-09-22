import React from 'react';
import { DashboardStats } from '../types';
import { formatBytes, formatSpeed } from '../utils';
import { DownloadCloud, CheckCircle2, Clock, Activity, HardDrive } from 'lucide-react';

interface StatusBarProps {
  stats: DashboardStats;
  concurrencyLimit: number;
  selectedCount: number;
  totalItemsCount: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  stats,
  concurrencyLimit,
  selectedCount,
  totalItemsCount
}) => {
  return (
    <footer className="h-6 bg-[#080c14] border-t border-slate-800 px-3 flex items-center justify-between text-[11px] text-slate-400 select-none shrink-0 font-sans">
      {/* Left counters */}
      <div className="flex items-center space-x-3 divide-x divide-slate-800/80">
        <div className="flex items-center space-x-1.5 pr-3">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span className="text-slate-300 font-medium">Active:</span>
          <span className="font-mono text-cyan-300 font-semibold">{stats.activeCount}</span>
          <span className="text-slate-500 font-mono">/ {concurrencyLimit} max</span>
        </div>

        <div className="flex items-center space-x-1.5 px-3">
          <Clock className="w-3 h-3 text-amber-400" />
          <span>Queued:</span>
          <span className="font-mono text-amber-300">{stats.queuedCount}</span>
        </div>

        <div className="flex items-center space-x-1.5 px-3 hidden sm:flex">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>Completed:</span>
          <span className="font-mono text-emerald-300">{stats.completedCount}</span>
        </div>

        {selectedCount > 0 && (
          <div className="flex items-center space-x-1 px-3 text-cyan-400 font-medium">
            <span>{selectedCount} of {totalItemsCount} selected</span>
          </div>
        )}
      </div>

      {/* Right transfer metrics */}
      <div className="flex items-center space-x-4 divide-x divide-slate-800/80">
        <div className="flex items-center space-x-1.5">
          <Activity className="w-3 h-3 text-cyan-400" />
          <span className="hidden md:inline">Live Speed:</span>
          <span className="font-mono text-cyan-300 font-semibold">
            {formatSpeed(stats.currentSpeed)}
          </span>
        </div>

        <div className="flex items-center space-x-1.5 pl-3 hidden sm:flex">
          <HardDrive className="w-3 h-3 text-slate-400" />
          <span className="hidden md:inline">Total Transferred:</span>
          <span className="font-mono text-slate-200">
            {formatBytes(stats.totalDownloadedBytes)}
          </span>
        </div>
      </div>
    </footer>
  );
};
