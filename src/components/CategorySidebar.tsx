import React from 'react';
import {
  Download,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  Video,
  Music,
  FileText,
  FileQuestion,
  ListOrdered,
  History,
  Calendar,
  Terminal,
  Settings,
  Folder
} from 'lucide-react';
import { DownloadItem, SidebarFilter } from '../types';
import { getCategory } from '../utils';

interface CategorySidebarProps {
  currentFilter: SidebarFilter;
  onSelectFilter: (filter: SidebarFilter) => void;
  downloads: DownloadItem[];
  downloadDirectory: string;
}

export const CategorySidebar: React.FC<CategorySidebarProps> = ({
  currentFilter,
  onSelectFilter,
  downloads,
  downloadDirectory
}) => {
  // Compute dynamic counts
  const totalCount = downloads.length;
  const downloadingCount = downloads.filter(d => d.status === 'DOWNLOADING').length;
  const queuedCount = downloads.filter(d => d.status === 'QUEUED').length;
  const completedCount = downloads.filter(d => d.status === 'COMPLETED').length;
  const failedCount = downloads.filter(d => d.status === 'FAILED').length;
  const pausedCount = downloads.filter(d => d.status === 'PAUSED').length;

  const videoCount = downloads.filter(d => getCategory(d) === 'video').length;
  const audioCount = downloads.filter(d => getCategory(d) === 'audio').length;
  const docCount = downloads.filter(d => getCategory(d) === 'documents').length;
  const otherCount = downloads.filter(d => getCategory(d) === 'other').length;

  const renderItem = (
    filter: SidebarFilter,
    label: string,
    Icon: React.ComponentType<{ className?: string }>,
    count?: number,
    iconColor?: string
  ) => {
    const isActive = currentFilter === filter;
    return (
      <button
        onClick={() => onSelectFilter(filter)}
        className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded transition-colors group cursor-pointer ${
          isActive
            ? 'bg-cyan-600/20 text-cyan-200 border-l-2 border-cyan-400 font-medium pl-2'
            : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
        }`}
      >
        <div className="flex items-center space-x-2 min-w-0">
          <Icon className={`w-3.5 h-3.5 shrink-0 ${iconColor || (isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200')}`} />
          <span className="truncate">{label}</span>
        </div>
        {count !== undefined && (
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
              isActive
                ? 'bg-cyan-500/30 text-cyan-200'
                : count > 0
                ? 'bg-slate-800 text-slate-400 group-hover:text-slate-300'
                : 'text-slate-600'
            }`}
          >
            {count}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside className="w-52 bg-[#0a0f19] border-r border-slate-800/80 flex flex-col justify-between select-none shrink-0 overflow-y-auto font-sans text-xs">
      <div className="p-2 space-y-4">
        {/* DOWNLOADS Section */}
        <div>
          <div className="px-2 pb-1 text-[10px] font-semibold text-slate-400 tracking-wider">
            DOWNLOADS
          </div>
          <div className="space-y-0.5">
            {renderItem('all', 'All Downloads', Download, totalCount)}
            {renderItem('downloading', 'Downloading', Loader2, downloadingCount, downloadingCount > 0 ? 'text-cyan-400 animate-spin' : undefined)}
            {renderItem('queued', 'Queued', Clock, queuedCount, queuedCount > 0 ? 'text-amber-400' : undefined)}
            {renderItem('completed', 'Completed', CheckCircle2, completedCount, completedCount > 0 ? 'text-emerald-400' : undefined)}
            {renderItem('failed', 'Failed', AlertCircle, failedCount, failedCount > 0 ? 'text-rose-400' : undefined)}
            {renderItem('paused', 'Paused', PauseCircle, pausedCount, pausedCount > 0 ? 'text-slate-300' : undefined)}
          </div>
        </div>

        {/* CATEGORIES Section */}
        <div>
          <div className="px-2 pb-1 text-[10px] font-semibold text-slate-400 tracking-wider">
            CATEGORIES
          </div>
          <div className="space-y-0.5">
            {renderItem('cat_video', 'Video', Video, videoCount, 'text-cyan-400')}
            {renderItem('cat_audio', 'Audio', Music, audioCount, 'text-purple-400')}
            {renderItem('cat_docs', 'Documents', FileText, docCount, 'text-amber-400')}
            {renderItem('cat_other', 'Other', FileQuestion, otherCount, 'text-slate-400')}
          </div>
        </div>

        {/* OTHER Section */}
        <div>
          <div className="px-2 pb-1 text-[10px] font-semibold text-slate-400 tracking-wider">
            MANAGEMENT
          </div>
          <div className="space-y-0.5">
            {renderItem('view_queue', 'Queue Order', ListOrdered)}
            {renderItem('view_history', 'History Log', History)}
            {renderItem('view_scheduler', 'Scheduler', Calendar)}
            {renderItem('view_logs', 'Engine Logs', Terminal)}
            {renderItem('view_settings', 'Settings', Settings)}
          </div>
        </div>
      </div>

      {/* Bottom Save Directory Notice */}
      <div className="p-2 border-t border-slate-800/80 bg-[#080c14]/60">
        <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 mb-1">
          <Folder className="w-3 h-3 text-cyan-400" />
          <span className="font-medium text-slate-300">Save Directory</span>
        </div>
        <div
          title={downloadDirectory}
          className="text-[10px] text-slate-400 font-mono truncate px-1.5 py-1 bg-slate-900/90 rounded border border-slate-800"
        >
          {downloadDirectory || 'downloads/'}
        </div>
      </div>
    </aside>
  );
};
