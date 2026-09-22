import React, { useState } from 'react';
import {
  Download,
  Search,
  Pause,
  Play,
  Trash2,
  Filter,
  Plus
} from 'lucide-react';
import { DownloadItem, DownloadStatus } from '../types';
import { DownloadCard } from './DownloadCard';

interface DownloadsViewProps {
  downloads: DownloadItem[];
  onOpenAddModal: () => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onDelete: (id: string, deleteFile?: boolean) => void;
  onRevealFolder: (id: string) => void;
  onPreviewFile: (item: DownloadItem) => void;
  onClearCompleted: () => void;
}

export const DownloadsView: React.FC<DownloadsViewProps> = ({
  downloads,
  onOpenAddModal,
  onPause,
  onResume,
  onCancel,
  onRetry,
  onDelete,
  onRevealFolder,
  onPreviewFile,
  onClearCompleted
}) => {
  const [filter, setFilter] = useState<'ALL' | DownloadStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = downloads.filter((item) => {
    if (filter !== 'ALL' && item.status !== filter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.uploader.toLowerCase().includes(q) ||
        item.format.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handlePauseAll = () => {
    downloads.filter(d => d.status === 'DOWNLOADING').forEach(d => onPause(d.id));
  };

  const handleResumeAll = () => {
    downloads.filter(d => d.status === 'PAUSED').forEach(d => onResume(d.id));
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header & Controls Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-100">Downloads Center</h1>
          <p className="text-xs text-slate-400">Manage all active, paused, queued, and finished video streams</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handlePauseAll}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
            title="Pause all active downloads"
          >
            <Pause className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pause All</span>
          </button>

          <button
            onClick={handleResumeAll}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
            title="Resume all paused downloads"
          >
            <Play className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Resume All</span>
          </button>

          <button
            onClick={onClearCompleted}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
            title="Clear finished downloads from list"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear Finished</span>
          </button>

          <button
            onClick={onOpenAddModal}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Download</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/50 p-2 rounded-xl border border-slate-800">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1 w-full sm:w-auto">
          {(['ALL', 'DOWNLOADING', 'QUEUED', 'COMPLETED', 'PAUSED', 'FAILED'] as const).map((status) => {
            const isActive = filter === status;
            const count = status === 'ALL'
              ? downloads.length
              : downloads.filter(d => d.status === status).length;

            return (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center space-x-1.5 ${
                  isActive
                    ? 'bg-slate-800 text-cyan-400 border border-slate-700/80 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span className="capitalize">{status === 'ALL' ? 'All' : status.toLowerCase()}</span>
                <span className="text-[10px] font-mono px-1 rounded-full bg-slate-800/80 text-slate-400">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search downloads..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>

      {/* Downloads List */}
      {filtered.length === 0 ? (
        <div className="p-12 border border-dashed border-slate-800 rounded-2xl text-center space-y-3 bg-slate-900/20">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500">
            <Download className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-200">No downloads found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || filter !== 'ALL'
                ? 'No downloads match your search or filter query.'
                : 'Paste a video URL above to start your first download.'}
            </p>
          </div>
          {filter === 'ALL' && !searchQuery && (
            <button
              onClick={onOpenAddModal}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              Add Download
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          {filtered.map((item) => (
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
  );
};
