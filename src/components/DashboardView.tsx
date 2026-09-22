import React, { useState } from 'react';
import {
  Download,
  Clock,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Zap,
  Plus,
  ArrowRight,
  Sparkles,
  Layers
} from 'lucide-react';
import { DashboardStats, DownloadItem } from '../types';
import { DownloadCard } from './DownloadCard';
import { formatBytes, formatSpeed } from '../utils';

interface DashboardViewProps {
  stats: DashboardStats;
  downloads: DownloadItem[];
  onOpenAddModal: () => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onDelete: (id: string, deleteFile?: boolean) => void;
  onRevealFolder: (id: string) => void;
  onPreviewFile: (item: DownloadItem) => void;
  onNavigateTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  downloads,
  onOpenAddModal,
  onPause,
  onResume,
  onCancel,
  onRetry,
  onDelete,
  onRevealFolder,
  onPreviewFile,
  onNavigateTab
}) => {
  const activeDownloads = downloads.filter(d => d.status === 'DOWNLOADING' || d.status === 'PAUSED');
  const queuedDownloads = downloads.filter(d => d.status === 'QUEUED');
  const completedRecent = downloads.filter(d => d.status === 'COMPLETED').slice(0, 4);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Quick Action Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0d1527] to-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start space-x-2">
            <h1 className="text-lg font-bold text-white tracking-tight">
              VideoFlow Download Hub
            </h1>
            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Live Engine
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Real-time media stream analyzer & multi-threaded video download pipeline.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            id="btn-dash-add-download"
            onClick={onOpenAddModal}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:from-cyan-600 text-white text-xs font-semibold rounded-lg flex items-center space-x-2 shadow-md shadow-cyan-900/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Download</span>
          </button>
        </div>
      </div>

      {/* Primary Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Active */}
        <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium">Active</span>
            <Download className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-slate-100 font-mono">
            {stats.activeCount}
          </div>
          <div className="text-[10px] text-slate-500">Currently processing</div>
        </div>

        {/* Queued */}
        <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium">Queued</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-slate-100 font-mono">
            {stats.queuedCount}
          </div>
          <div className="text-[10px] text-slate-500">Waiting for slot</div>
        </div>

        {/* Completed */}
        <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium">Completed</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-slate-100 font-mono">
            {stats.completedCount}
          </div>
          <div className="text-[10px] text-slate-500">Saved to disk</div>
        </div>

        {/* Failed */}
        <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium">Failed</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-bold text-slate-100 font-mono">
            {stats.failedCount}
          </div>
          <div className="text-[10px] text-slate-500">Need review</div>
        </div>

        {/* Total Downloaded */}
        <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium">Total Size</span>
            <HardDrive className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-base font-bold text-slate-100 font-mono truncate">
            {formatBytes(stats.totalDownloadedBytes)}
          </div>
          <div className="text-[10px] text-slate-500">Delivered data</div>
        </div>

        {/* Current Speed */}
        <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium">Live Speed</span>
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-base font-bold text-cyan-400 font-mono truncate">
            {formatSpeed(stats.currentSpeed)}
          </div>
          <div className="text-[10px] text-slate-500">Across active tasks</div>
        </div>
      </div>

      {/* Active Downloads Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-semibold text-slate-200">Active Downloads</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {activeDownloads.length}
            </span>
          </div>

          {downloads.length > 0 && (
            <button
              onClick={() => onNavigateTab('downloads')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {activeDownloads.length === 0 ? (
          <div className="p-8 border border-dashed border-slate-800 rounded-xl text-center space-y-3 bg-slate-900/30">
            <div className="w-10 h-10 mx-auto rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500">
              <Download className="w-5 h-5" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="text-xs font-semibold text-slate-200">No active downloads</h3>
              <p className="text-[11px] text-slate-500">
                Paste a video URL or pick one of the sample test videos to begin downloading with real-time speed and progress.
              </p>
            </div>
            <button
              onClick={onOpenAddModal}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-medium rounded-lg border border-slate-700 transition-colors cursor-pointer"
            >
              Add Video URL
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {activeDownloads.map((item) => (
              <DownloadCard
                key={item.id}
                item={item}
                onPause={onPause}
                onResume={onResume}
                onCancel={onCancel}
                onRetry={onRetry}
                onDelete={onDelete}
                onRevealFolder={onRevealFolder}
                onPreviewFile={onPreviewFile}
              />
            ))}
          </div>
        )}
      </div>

      {/* Queued Items Notice if any */}
      {queuedDownloads.length > 0 && (
        <div className="p-3.5 bg-amber-950/20 border border-amber-800/40 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-amber-300">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>
              <strong>{queuedDownloads.length}</strong> items waiting in the download queue.
            </span>
          </div>
          <button
            onClick={() => onNavigateTab('queue')}
            className="text-xs text-amber-400 hover:text-amber-200 font-medium flex items-center space-x-1 cursor-pointer"
          >
            <span>Manage Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Recent Completed Downloads */}
      {completedRecent.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">Recently Completed</h2>
            <button
              onClick={() => onNavigateTab('history')}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center space-x-1 cursor-pointer"
            >
              <span>Full History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {completedRecent.map((item) => (
              <DownloadCard
                key={item.id}
                item={item}
                onPause={onPause}
                onResume={onResume}
                onCancel={onCancel}
                onRetry={onRetry}
                onDelete={onDelete}
                onRevealFolder={onRevealFolder}
                onPreviewFile={onPreviewFile}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
