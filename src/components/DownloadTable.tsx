import React, { useState, useEffect, useRef } from 'react';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  PauseCircle,
  Video,
  Music,
  FileText,
  FileQuestion,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Archive,
  Box
} from 'lucide-react';
import {
  DownloadItem,
  SortField,
  SortDirection,
  ColumnDefinition
} from '../types';
import {
  formatBytes,
  formatExactKiloBytes,
  formatSpeed,
  formatEta,
  formatDate,
  getCategory
} from '../utils';

interface DownloadTableProps {
  downloads: DownloadItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string, shiftKey?: boolean, ctrlKey?: boolean) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onRowDoubleClick: (item: DownloadItem) => void;
  onContextMenu: (e: React.MouseEvent, item: DownloadItem, effectiveSelection?: Set<string>) => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  visibleColumns: Record<string, boolean>;
}

export const ALL_COLUMNS: ColumnDefinition[] = [
  { id: 'statusIcon', label: '', defaultVisible: true, sortable: false, width: 'w-8' },
  { id: 'title', label: 'File Name', defaultVisible: true, sortable: true },
  { id: 'source', label: 'Source', defaultVisible: true, sortable: false, width: 'w-24' },
  { id: 'category', label: 'Category', defaultVisible: true, sortable: true, width: 'w-20' },
  { id: 'status', label: 'Status', defaultVisible: true, sortable: true, width: 'w-28' },
  { id: 'size', label: 'Size', defaultVisible: true, sortable: true, width: 'w-24' },
  { id: 'progress', label: 'Progress', defaultVisible: true, sortable: true, width: 'w-40' },
  { id: 'downloaded', label: 'Downloaded', defaultVisible: true, sortable: true, width: 'w-28' },
  { id: 'speed', label: 'Speed', defaultVisible: true, sortable: true, width: 'w-24' },
  { id: 'eta', label: 'ETA', defaultVisible: true, sortable: true, width: 'w-20' },
  { id: 'date', label: 'Date Added', defaultVisible: true, sortable: true, width: 'w-36' },
  { id: 'location', label: 'Location', defaultVisible: false, sortable: false, width: 'w-48' }
];

export const DownloadTable: React.FC<DownloadTableProps> = ({
  downloads,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onRowDoubleClick,
  onContextMenu,
  sortField,
  sortDirection,
  onSort,
  visibleColumns
}) => {
  const tableRef = useRef<HTMLDivElement>(null);
  const isAllSelected = downloads.length > 0 && selectedIds.size === downloads.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < downloads.length;

  const renderStatusIcon = (status: DownloadItem['status']) => {
    switch (status) {
      case 'DOWNLOADING':
        return <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />;
      case 'QUEUED':
        return <Clock className="w-3.5 h-3.5 text-amber-400" />;
      case 'COMPLETED':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'PAUSED':
        return <PauseCircle className="w-3.5 h-3.5 text-slate-400" />;
      case 'FAILED':
        return <AlertCircle className="w-3.5 h-3.5 text-rose-400" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const renderCategoryIcon = (item: DownloadItem) => {
    const cat = getCategory(item);
    switch (cat) {
      case 'video':
        return <Video className="w-3 h-3 text-cyan-400" />;
      case 'audio':
        return <Music className="w-3 h-3 text-purple-400" />;
      case 'compressed':
        return <Archive className="w-3 h-3 text-emerald-400" />;
      case 'programs':
        return <Box className="w-3 h-3 text-blue-400" />;
      case 'documents':
        return <FileText className="w-3 h-3 text-amber-400" />;
      default:
        return <FileQuestion className="w-3 h-3 text-slate-400" />;
    }
  };

  const getSourceLabel = (item: DownloadItem) => {
    if (item.url.includes('youtube.com') || item.url.includes('youtu.be')) return 'YouTube';
    if (item.url.includes('vimeo.com')) return 'Vimeo';
    if (item.uploader && item.uploader !== 'Unknown') return item.uploader;
    try {
      return new URL(item.url).hostname.replace('www.', '');
    } catch {
      return 'Web';
    }
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-2.5 h-2.5 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-3 h-3 text-cyan-400 ml-1" />
    ) : (
      <ChevronDown className="w-3 h-3 text-cyan-400 ml-1" />
    );
  };

  return (
    <div
      ref={tableRef}
      className="flex-1 flex flex-col bg-[#0b0f19] select-none overflow-hidden font-sans text-xs"
    >
      {/* Table Header */}
      <div className="h-7 bg-[#0f1626] border-b border-slate-800 px-2 flex items-center shrink-0 text-slate-300 text-[11px] font-medium sticky top-0 z-20">
        {/* Checkbox Column */}
        <div className="w-7 flex items-center justify-center shrink-0">
          <input
            type="checkbox"
            checked={isAllSelected}
            ref={(el) => {
              if (el) el.indeterminate = isSomeSelected;
            }}
            onChange={() => (isAllSelected ? onClearSelection() : onSelectAll())}
            className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-cyan-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
          />
        </div>

        {/* Status Icon Header */}
        {visibleColumns.statusIcon !== false && (
          <div className="w-7 flex items-center justify-center shrink-0 text-slate-500">
            •
          </div>
        )}

        {/* File Name Header */}
        {visibleColumns.title !== false && (
          <div
            onClick={() => onSort('title')}
            className="flex-1 min-w-[180px] px-2 flex items-center cursor-pointer hover:text-white group truncate"
          >
            <span className="truncate">File Name</span>
            {renderSortIndicator('title')}
          </div>
        )}

        {/* Source Header */}
        {visibleColumns.source !== false && (
          <div className="w-24 px-2 hidden sm:flex items-center shrink-0 text-slate-400 truncate">
            Source
          </div>
        )}

        {/* Category Header */}
        {visibleColumns.category !== false && (
          <div
            onClick={() => onSort('format')}
            className="w-20 px-2 hidden md:flex items-center cursor-pointer hover:text-white group shrink-0"
          >
            <span>Category</span>
            {renderSortIndicator('format')}
          </div>
        )}

        {/* Status Header */}
        {visibleColumns.status !== false && (
          <div
            onClick={() => onSort('status')}
            className="w-28 px-2 flex items-center cursor-pointer hover:text-white group shrink-0"
          >
            <span>Status</span>
            {renderSortIndicator('status')}
          </div>
        )}

        {/* Size Header */}
        {visibleColumns.size !== false && (
          <div
            onClick={() => onSort('totalBytes')}
            className="w-20 px-2 text-right flex items-center justify-end cursor-pointer hover:text-white group shrink-0"
          >
            <span>Size</span>
            {renderSortIndicator('totalBytes')}
          </div>
        )}

        {/* Progress Header */}
        {visibleColumns.progress !== false && (
          <div
            onClick={() => onSort('progress')}
            className="w-36 px-2 flex items-center cursor-pointer hover:text-white group shrink-0"
          >
            <span>Progress</span>
            {renderSortIndicator('progress')}
          </div>
        )}

        {/* Downloaded Header */}
        {visibleColumns.downloaded !== false && (
          <div
            onClick={() => onSort('downloadedBytes')}
            className="w-24 px-2 hidden lg:flex items-center justify-end cursor-pointer hover:text-white group shrink-0 text-right"
          >
            <span>Downloaded</span>
            {renderSortIndicator('downloadedBytes')}
          </div>
        )}

        {/* Speed Header */}
        {visibleColumns.speed !== false && (
          <div
            onClick={() => onSort('speed')}
            className="w-24 px-2 text-right flex items-center justify-end cursor-pointer hover:text-white group shrink-0"
          >
            <span>Speed</span>
            {renderSortIndicator('speed')}
          </div>
        )}

        {/* ETA Header */}
        {visibleColumns.eta !== false && (
          <div
            onClick={() => onSort('eta')}
            className="w-20 px-2 text-right flex items-center justify-end cursor-pointer hover:text-white group shrink-0"
          >
            <span>ETA</span>
            {renderSortIndicator('eta')}
          </div>
        )}

        {/* Date Header */}
        {visibleColumns.date !== false && (
          <div
            onClick={() => onSort('createdAt')}
            className="w-36 px-2 hidden xl:flex items-center justify-end cursor-pointer hover:text-white group shrink-0 text-right"
          >
            <span>Date Added</span>
            {renderSortIndicator('createdAt')}
          </div>
        )}

        {/* Location Header */}
        {visibleColumns.location !== false && (
          <div className="w-48 px-2 hidden 2xl:flex items-center shrink-0 text-slate-400 truncate">
            Location
          </div>
        )}
      </div>

      {/* Table Body */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
        {downloads.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 py-16 px-4">
            <Clock className="w-8 h-8 text-slate-600 mb-2 stroke-[1.5]" />
            <p className="text-sm font-medium text-slate-400">No downloads matching filter</p>
            <p className="text-xs text-slate-600 mt-1">Click "+ Add URL" to start downloading media</p>
          </div>
        ) : (
          downloads.map((item, index) => {
            const isSelected = selectedIds.has(item.id);
            const isDownloading = item.status === 'DOWNLOADING';
            const isCompleted = item.status === 'COMPLETED';
            const isFailed = item.status === 'FAILED';

            return (
              <div
                key={item.id}
                onClick={(e) => onToggleSelect(item.id, e.shiftKey, e.ctrlKey || e.metaKey)}
                onDoubleClick={() => onRowDoubleClick(item)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  const effective = isSelected ? selectedIds : new Set([item.id]);
                  if (!isSelected) {
                    onToggleSelect(item.id);
                  }
                  onContextMenu(e, item, effective);
                }}
                className={`h-9 px-2 flex items-center transition-colors cursor-pointer text-[12px] group ${
                  isSelected
                    ? 'bg-cyan-950/60 text-white border-l-2 border-cyan-400'
                    : index % 2 === 0
                    ? 'bg-[#0b101c] hover:bg-slate-800/60 text-slate-200'
                    : 'bg-[#090e18] hover:bg-slate-800/60 text-slate-200'
                }`}
              >
                {/* Checkbox */}
                <div
                  className="w-7 flex items-center justify-center shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => onToggleSelect(item.id, false, true)}
                    className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-cyan-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                </div>

                {/* Status Icon */}
                {visibleColumns.statusIcon !== false && (
                  <div className="w-7 flex items-center justify-center shrink-0">
                    {renderStatusIcon(item.status)}
                  </div>
                )}

                {/* File Name */}
                {visibleColumns.title !== false && (
                  <div className="flex-1 min-w-[180px] px-2 flex flex-col justify-center min-w-0 pr-3">
                    <div className="font-medium truncate text-slate-100 flex items-center space-x-1.5">
                      <span className="truncate">{item.title}</span>
                      {item.format && (
                        <span className="text-[9px] px-1 py-0.1 bg-slate-800 text-slate-400 rounded uppercase font-mono shrink-0">
                          {item.format}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate flex items-center space-x-2">
                      <span>{item.quality}</span>
                      <span>•</span>
                      <span>{item.uploader || 'Web'}</span>
                    </div>
                  </div>
                )}

                {/* Source */}
                {visibleColumns.source !== false && (
                  <div className="w-24 px-2 hidden sm:flex items-center shrink-0 text-slate-400 text-[11px] truncate">
                    {getSourceLabel(item)}
                  </div>
                )}

                {/* Category */}
                {visibleColumns.category !== false && (
                  <div className="w-20 px-2 hidden md:flex items-center space-x-1.5 shrink-0 text-slate-400 text-[11px] capitalize">
                    {renderCategoryIcon(item)}
                    <span>{getCategory(item)}</span>
                  </div>
                )}

                {/* Status */}
                {visibleColumns.status !== false && (
                  <div className="w-28 px-2 flex items-center shrink-0">
                    <span
                      className={`text-[11px] font-medium truncate ${
                        isDownloading
                          ? 'text-cyan-400 font-semibold'
                          : isCompleted
                          ? 'text-emerald-400'
                          : isFailed
                          ? 'text-rose-400'
                          : item.status === 'QUEUED'
                          ? 'text-amber-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {item.status === 'DOWNLOADING'
                        ? 'Downloading'
                        : item.status === 'QUEUED'
                        ? 'In Queue'
                        : item.status === 'COMPLETED'
                        ? 'Completed'
                        : item.status === 'FAILED'
                        ? 'Failed'
                        : item.status === 'PAUSED'
                        ? 'Paused'
                        : item.status}
                    </span>
                  </div>
                )}

                {/* Size */}
                {visibleColumns.size !== false && (
                  <div className="w-20 px-2 text-right shrink-0 font-mono text-[11px] text-slate-300">
                    {formatBytes(item.totalBytes || item.downloadedBytes)}
                  </div>
                )}

                {/* Progress (compact 6px bar + text) */}
                {visibleColumns.progress !== false && (
                  <div className="w-40 px-2 flex items-center space-x-1.5 shrink-0">
                    <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-150 ${
                          isCompleted
                            ? 'bg-emerald-500'
                            : isFailed
                            ? 'bg-rose-500'
                            : 'bg-cyan-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, item.progress))}%` }}
                      />
                    </div>
                    {isDownloading && (
                      <span className="text-[9px] px-1 py-0.1 bg-cyan-950 text-cyan-300 font-mono rounded border border-cyan-800/60 hidden xl:inline shrink-0">
                        8 conns
                      </span>
                    )}
                    <span className="w-9 text-right font-mono text-[11px] text-slate-300 shrink-0">
                      {item.progress.toFixed(0)}%
                    </span>
                  </div>
                )}

                {/* Downloaded */}
                {visibleColumns.downloaded !== false && (
                  <div className="w-28 px-2 hidden lg:flex items-center justify-end shrink-0 font-mono text-[11px] text-slate-300 text-right">
                    {formatExactKiloBytes(item.downloadedBytes)}
                  </div>
                )}

                {/* Speed */}
                {visibleColumns.speed !== false && (
                  <div className="w-24 px-2 text-right shrink-0 font-mono text-[11px] text-cyan-300">
                    {isDownloading && item.speed > 0 ? formatSpeed(item.speed) : '--'}
                  </div>
                )}

                {/* ETA */}
                {visibleColumns.eta !== false && (
                  <div className="w-20 px-2 text-right shrink-0 font-mono text-[11px] text-slate-400">
                    {isDownloading && item.eta > 0 ? formatEta(item.eta) : isCompleted ? 'Done' : '--'}
                  </div>
                )}

                {/* Date Added */}
                {visibleColumns.date !== false && (
                  <div className="w-36 px-2 hidden xl:flex items-center justify-end shrink-0 font-mono text-[10px] text-slate-400 text-right">
                    {formatDate(item.createdAt)}
                  </div>
                )}

                {/* Location */}
                {visibleColumns.location !== false && (
                  <div
                    title={item.outputPath || ''}
                    className="w-48 px-2 hidden 2xl:flex items-center shrink-0 font-mono text-[10px] text-slate-500 truncate"
                  >
                    {item.outputPath || '--'}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
