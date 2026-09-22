import React, { useEffect, useRef } from 'react';
import { DownloadItem } from '../types';
import {
  Play,
  Pause,
  Square,
  RotateCw,
  FileVideo,
  Folder,
  Copy,
  Edit2,
  Trash2,
  ListX,
  Info,
  Tv,
  Layers,
  CheckSquare,
  XSquare,
  Archive,
  FileArchive,
  Music
} from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  item: DownloadItem;
  onClose: () => void;
  onStart: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onStop: (id: string) => void;
  onRetry: (id: string) => void;
  onOpenFile: (item: DownloadItem) => void;
  onOpenFolder: (item: DownloadItem) => void;
  onRename: (item: DownloadItem) => void;
  onDelete: (id: string, deleteFile: boolean) => void;
  onProperties: (item: DownloadItem) => void;
  onOpenInGrabber?: (url: string) => void;
  onCompress?: (items: DownloadItem[]) => void;
  onExtract?: (item: DownloadItem) => void;
  onExtractAudio?: (item: DownloadItem) => void;
  // Batch operation props for multiple selection (consistent with IDM)
  selectedCount?: number;
  selectedItems?: DownloadItem[];
  onBatchResume?: () => void;
  onBatchPause?: () => void;
  onBatchStop?: () => void;
  onBatchRetry?: () => void;
  onBatchDelete?: (deleteFile: boolean) => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  item,
  onClose,
  onStart,
  onPause,
  onResume,
  onStop,
  onRetry,
  onOpenFile,
  onOpenFolder,
  onRename,
  onDelete,
  onProperties,
  onOpenInGrabber,
  onCompress,
  onExtract,
  onExtractAudio,
  selectedCount = 1,
  selectedItems = [],
  onBatchResume,
  onBatchPause,
  onBatchStop,
  onBatchRetry,
  onBatchDelete,
  onSelectAll,
  onClearSelection
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const isBatch = selectedCount > 1;

  // Batch item counts
  const downloadingCount = selectedItems.filter((i) => i.status === 'DOWNLOADING').length;
  const resumableCount = selectedItems.filter(
    (i) => i.status === 'PAUSED' || i.status === 'FAILED' || i.status === 'QUEUED'
  ).length;
  const stoppableCount = selectedItems.filter(
    (i) => i.status === 'DOWNLOADING' || i.status === 'QUEUED'
  ).length;

  const isDownloading = item.status === 'DOWNLOADING';
  const isPaused = item.status === 'PAUSED';
  const isCompleted = item.status === 'COMPLETED';

  // Keep menu within viewport
  const estimatedHeight = isBatch ? 440 : 360;
  const adjustedX = Math.max(8, Math.min(x, window.innerWidth - 240));
  const adjustedY = Math.max(8, Math.min(y, window.innerHeight - estimatedHeight));

  const handleAction = (action?: () => void) => {
    if (action) action();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      className="fixed z-50 w-56 bg-[#121929] border border-slate-700/90 rounded-md shadow-2xl py-1 text-slate-200 text-xs select-none font-sans overflow-hidden animate-in fade-in zoom-in-95 duration-100"
    >
      {/* 1. BATCH MODE MENU (Consistent with IDM right-click multi-selection) */}
      {isBatch ? (
        <>
          {/* Header Banner */}
          <div className="px-3 py-1.5 bg-gradient-to-r from-blue-950 via-[#0d2242] to-slate-900 border-b border-cyan-800/40 flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-cyan-300 font-semibold text-[11px]">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>BATCH ACTIONS</span>
            </div>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-cyan-900/80 text-cyan-200 border border-cyan-700/50 font-mono font-bold">
              {selectedCount} items
            </span>
          </div>

          {/* Batch Resume / Start All */}
          <button
            disabled={resumableCount === 0 && downloadingCount > 0}
            onClick={() => handleAction(onBatchResume)}
            className={`w-full text-left px-3 py-1.5 flex items-center justify-between ${
              resumableCount === 0 && downloadingCount > 0
                ? 'opacity-40 cursor-not-allowed text-slate-500'
                : 'hover:bg-cyan-900/40 hover:text-cyan-200 text-slate-200 cursor-pointer'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" />
              <span>Resume / Start All</span>
            </div>
            {resumableCount > 0 && (
              <span className="text-[10px] font-mono text-emerald-400">({resumableCount})</span>
            )}
          </button>

          {/* Batch Pause All */}
          <button
            disabled={downloadingCount === 0}
            onClick={() => handleAction(onBatchPause)}
            className={`w-full text-left px-3 py-1.5 flex items-center justify-between ${
              downloadingCount === 0
                ? 'opacity-40 cursor-not-allowed text-slate-500'
                : 'hover:bg-amber-900/40 hover:text-amber-200 text-slate-200 cursor-pointer'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Pause className="w-3.5 h-3.5 text-amber-400 fill-current" />
              <span>Pause All</span>
            </div>
            {downloadingCount > 0 && (
              <span className="text-[10px] font-mono text-amber-400">({downloadingCount})</span>
            )}
          </button>

          {/* Batch Stop All */}
          <button
            disabled={stoppableCount === 0}
            onClick={() => handleAction(onBatchStop)}
            className={`w-full text-left px-3 py-1.5 flex items-center justify-between ${
              stoppableCount === 0
                ? 'opacity-40 cursor-not-allowed text-slate-500'
                : 'hover:bg-rose-900/40 hover:text-rose-200 text-slate-200 cursor-pointer'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Square className="w-3.5 h-3.5 text-rose-400 fill-current" />
              <span>Stop All</span>
            </div>
            {stoppableCount > 0 && (
              <span className="text-[10px] font-mono text-rose-400">({stoppableCount})</span>
            )}
          </button>

          {/* Batch Restart / Redownload */}
          {onBatchRetry && (
            <button
              onClick={() => handleAction(onBatchRetry)}
              className="w-full text-left px-3 py-1.5 hover:bg-cyan-900/40 hover:text-cyan-200 flex items-center space-x-2 text-slate-200 cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Restart All Selected</span>
            </button>
          )}

          <div className="h-px bg-slate-800 my-1" />

          {/* Batch Remove from List */}
          <button
            onClick={() => handleAction(() => onBatchDelete?.(false))}
            className="w-full text-left px-3 py-1.5 hover:bg-rose-900/40 hover:text-rose-200 flex items-center justify-between text-slate-200 cursor-pointer"
          >
            <div className="flex items-center space-x-2">
              <ListX className="w-3.5 h-3.5 text-rose-400" />
              <span>Remove from List</span>
            </div>
            <span className="text-[10px] font-mono text-rose-400">({selectedCount})</span>
          </button>

          {/* Batch Delete from Disk */}
          <button
            onClick={() => handleAction(() => onBatchDelete?.(true))}
            className="w-full text-left px-3 py-1.5 hover:bg-rose-900/60 hover:text-rose-200 flex items-center justify-between text-rose-300 font-medium cursor-pointer"
          >
            <div className="flex items-center space-x-2">
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Delete Files from Disk</span>
            </div>
            <span className="text-[10px] font-mono text-rose-400">({selectedCount})</span>
          </button>

          {/* Batch Compress to ZIP */}
          {onCompress && (
            <button
              onClick={() => handleAction(() => onCompress(selectedItems))}
              className="w-full text-left px-3 py-1.5 hover:bg-cyan-900/40 hover:text-cyan-200 flex items-center justify-between text-slate-200 cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <FileArchive className="w-3.5 h-3.5 text-cyan-400" />
                <span>Compress Selected to ZIP...</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-400">({selectedCount})</span>
            </button>
          )}

          <div className="h-px bg-slate-800 my-1" />

          {/* Selection Helpers */}
          {onSelectAll && (
            <button
              onClick={() => handleAction(onSelectAll)}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800 hover:text-slate-100 flex items-center space-x-2 text-slate-300 cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
              <span>Select All</span>
            </button>
          )}
          {onClearSelection && (
            <button
              onClick={() => handleAction(onClearSelection)}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800 hover:text-slate-100 flex items-center space-x-2 text-slate-300 cursor-pointer"
            >
              <XSquare className="w-3.5 h-3.5 text-slate-400" />
              <span>Clear Selection</span>
            </button>
          )}

          {/* Active Target Item Info & Quick Actions */}
          <div className="h-px bg-slate-800 my-1" />
          <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">
            Target: {item.title}
          </div>
          {isCompleted && (
            <button
              onClick={() => handleAction(() => onOpenFile(item))}
              className="w-full text-left px-3 py-1.5 hover:bg-cyan-900/40 hover:text-cyan-200 flex items-center space-x-2 text-slate-200 cursor-pointer"
            >
              <FileVideo className="w-3.5 h-3.5 text-cyan-400" />
              <span>Open File</span>
            </button>
          )}
          <button
            onClick={() => handleAction(() => onOpenFolder(item))}
            className="w-full text-left px-3 py-1.5 hover:bg-cyan-900/40 hover:text-cyan-200 flex items-center space-x-2 text-slate-200 cursor-pointer"
          >
            <Folder className="w-3.5 h-3.5 text-amber-400" />
            <span>Open Folder</span>
          </button>
          {onOpenInGrabber && item.url && (
            <button
              onClick={() => handleAction(() => onOpenInGrabber(item.url))}
              className="w-full text-left px-3 py-1.5 hover:bg-cyan-900/40 hover:text-cyan-200 flex items-center space-x-2 text-cyan-300 cursor-pointer"
            >
              <Tv className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sniff in IDM Video Bar</span>
            </button>
          )}
          <button
            onClick={() => handleAction(() => onProperties(item))}
            className="w-full text-left px-3 py-1.5 hover:bg-cyan-900/40 hover:text-cyan-200 flex items-center space-x-2 text-slate-200 cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Properties...</span>
          </button>
        </>
      ) : (
        /* 2. SINGLE ITEM MODE MENU */
        <>
          {/* Start / Resume */}
          {!isDownloading && (
            <button
              onClick={() => handleAction(() => onResume(item.id))}
              className="w-full text-left px-3 py-1.5 hover:bg-cyan-900/40 hover:text-cyan-200 flex items-center space-x-2 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" />
              <span>{isPaused ? 'Resume' : 'Start'}</span>
            </button>
          )}

          {/* Pause */}
          {isDownloading && (
            <button
              onClick={() => handleAction(() => onPause(item.id))}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-900/40 hover:text-amber-200 flex items-center space-x-2 cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5 text-amber-400 fill-current" />
              <span>Pause</span>
            </button>
          )}

          {/* Stop */}
          {(isDownloading || item.status === 'QUEUED') && (
            <button
              onClick={() => handleAction(() => onStop(item.id))}
              className="w-full text-left px-3 py-1.5 hover:bg-rose-900/40 hover:text-rose-200 flex items-center space-x-2 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 text-rose-400 fill-current" />
              <span>Stop</span>
            </button>
          )}

          {/* Restart */}
          <button
            onClick={() => handleAction(() => onRetry(item.id))}
            className="w-full text-left px-3 py-1.5 hover:bg-cyan-900/40 hover:text-cyan-200 flex items-center space-x-2 cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Restart / Retry</span>
          </button>

          <div className="h-px bg-slate-800 my-1" />

          {/* Open File */}
          <button
            disabled={!isCompleted}
            onClick={() => handleAction(() => onOpenFile(item))}
            className={`w-full text-left px-3 py-1.5 flex items-center space-x-2 ${
              !isCompleted
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:bg-cyan-900/40 hover:text-cyan-200 cursor-pointer'
            }`}
          >
            <FileVideo className="w-3.5 h-3.5 text-cyan-400" />
            <span>Open File</span>
          </button>

          {/* Open in Video Sniffer (IDM Bar) */}
          {onOpenInGrabber && item.url && (
            <button
              onClick={() => handleAction(() => onOpenInGrabber(item.url))}
              className="w-full text-left px-3 py-1.5 hover:bg-cyan-900/40 hover:text-cyan-200 flex items-center space-x-2 text-cyan-300 cursor-pointer"
            >
              <Tv className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sniff in IDM Video Bar</span>
            </button>
          )}

          {/* Open Folder */}
          <button
            onClick={() => handleAction(() => onOpenFolder(item))}
            className="w-full text-left px-3 py-1.5 hover:bg-cyan-900/40 hover:text-cyan-200 flex items-center space-x-2 cursor-pointer"
          >
            <Folder className="w-3.5 h-3.5 text-amber-400" />
            <span>Open Folder</span>
          </button>

          {/* Compress to ZIP */}
          {onCompress && isCompleted && (
            <button
              onClick={() => handleAction(() => onCompress([item]))}
              className="w-full text-left px-3 py-1.5 hover:bg-cyan-900/40 hover:text-cyan-200 flex items-center space-x-2 cursor-pointer"
            >
              <FileArchive className="w-3.5 h-3.5 text-cyan-400" />
              <span>Compress to ZIP...</span>
            </button>
          )}

          {/* Extract Archive */}
          {onExtract && isCompleted && (
            <button
              onClick={() => handleAction(() => onExtract(item))}
              className="w-full text-left px-3 py-1.5 hover:bg-emerald-900/40 hover:text-emerald-200 flex items-center space-x-2 text-emerald-300 cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5 text-emerald-400" />
              <span>Extract Archive...</span>
            </button>
          )}

          {/* Extract Audio */}
          {onExtractAudio && item.url && (
            <button
              onClick={() => handleAction(() => onExtractAudio(item))}
              className="w-full text-left px-3 py-1.5 hover:bg-purple-900/40 hover:text-purple-200 flex items-center space-x-2 text-purple-300 cursor-pointer"
            >
              <Music className="w-3.5 h-3.5 text-purple-400" />
              <span>Extract Audio (MP3/FLAC)...</span>
            </button>
          )}

          {/* Copy URL */}
          <button
            onClick={() =>
              handleAction(() => {
                navigator.clipboard.writeText(item.url);
              })
            }
            className="w-full text-left px-3 py-1.5 hover:bg-cyan-900/40 hover:text-cyan-200 flex items-center space-x-2 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            <span>Copy URL</span>
          </button>

          {/* Copy File Path */}
          {item.outputPath && (
            <button
              onClick={() =>
                handleAction(() => {
                  if (item.outputPath) navigator.clipboard.writeText(item.outputPath);
                })
              }
              className="w-full text-left px-3 py-1.5 hover:bg-cyan-900/40 hover:text-cyan-200 flex items-center space-x-2 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Copy File Path</span>
            </button>
          )}

          <div className="h-px bg-slate-800 my-1" />

          {/* Rename */}
          <button
            onClick={() => handleAction(() => onRename(item))}
            className="w-full text-left px-3 py-1.5 hover:bg-cyan-900/40 hover:text-cyan-200 flex items-center space-x-2 cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Rename...</span>
          </button>

          {/* Remove from list */}
          <button
            onClick={() => handleAction(() => onDelete(item.id, false))}
            className="w-full text-left px-3 py-1.5 hover:bg-rose-900/40 hover:text-rose-200 flex items-center space-x-2 cursor-pointer"
          >
            <ListX className="w-3.5 h-3.5 text-rose-400" />
            <span>Remove from List</span>
          </button>

          {/* Delete file and record */}
          <button
            onClick={() => handleAction(() => onDelete(item.id, true))}
            className="w-full text-left px-3 py-1.5 hover:bg-rose-900/60 hover:text-rose-200 flex items-center space-x-2 text-rose-300 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Delete File from Disk</span>
          </button>

          <div className="h-px bg-slate-800 my-1" />

          {/* Properties */}
          <button
            onClick={() => handleAction(() => onProperties(item))}
            className="w-full text-left px-3 py-1.5 hover:bg-cyan-900/40 hover:text-cyan-200 flex items-center space-x-2 cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Properties...</span>
          </button>
        </>
      )}
    </div>
  );
};
