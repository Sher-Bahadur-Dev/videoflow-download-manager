import React from 'react';
import { Download, Minus, Square, X, Wifi } from 'lucide-react';
import { DashboardStats } from '../types';
import { formatSpeed } from '../utils';

interface TitleBarProps {
  stats: DashboardStats;
  connected: boolean;
  onOpenAddModal?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({ stats, connected, onOpenAddModal }) => {
  return (
    <header className="h-8 bg-[#090d16] border-b border-slate-800 px-2.5 flex items-center justify-between select-none shrink-0 z-40 text-xs">
      {/* Brand & Window Title */}
      <div className="flex items-center space-x-2 min-w-0">
        <div className="w-4 h-4 rounded bg-cyan-600 flex items-center justify-center shrink-0">
          <Download className="w-2.5 h-2.5 text-white stroke-[2.5]" />
        </div>
        <span className="font-semibold text-slate-200 tracking-tight text-[12px] truncate">
          Free Download Manager (FDM High-Speed Edition)
        </span>
        {stats.activeCount > 0 && (
          <span className="hidden sm:inline-flex items-center space-x-1 px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-mono text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>{stats.activeCount} active ({formatSpeed(stats.currentSpeed)})</span>
          </span>
        )}
      </div>

      {/* Right: Sync Status & Windows Controls */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1.5 text-slate-400 text-[11px]">
          <Wifi className={`w-3 h-3 ${connected ? 'text-emerald-400' : 'text-amber-400'}`} />
          <span className="hidden md:inline text-[10px] text-slate-400">
            {connected ? 'Connected' : 'Reconnecting...'}
          </span>
        </div>

        {/* Windows-style Window Control Buttons */}
        <div className="flex items-center space-x-0.5">
          <button
            title="Minimize"
            className="w-6 h-5 flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors rounded-xs"
          >
            <Minus className="w-3 h-3" />
          </button>
          <button
            title="Maximize"
            className="w-6 h-5 flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors rounded-xs"
          >
            <Square className="w-2.5 h-2.5" />
          </button>
          <button
            title="Close"
            className="w-6 h-5 flex items-center justify-center hover:bg-rose-900/80 text-slate-400 hover:text-white transition-colors rounded-xs"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </header>
  );
};
