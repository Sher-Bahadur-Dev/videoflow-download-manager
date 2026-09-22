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
  Info
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
  onProperties
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

  const isDownloading = item.status === 'DOWNLOADING';
  const isPaused = item.status === 'PAUSED';
  const isCompleted = item.status === 'COMPLETED';

  // Keep menu within viewport
  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.min(y, window.innerHeight - 340);

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      className="fixed z-50 w-52 bg-[#121929] border border-slate-700/80 rounded shadow-2xl py-1 text-slate-200 text-xs select-none font-sans"
    >
      {/* Start / Resume */}
      {!isDownloading && (
        <button
          onClick={() => handleAction(() => onResume(item.id))}
          className="w-full text-left px-3 py-1.5 hover:bg-cyan-900/40 hover:text-cyan-200 flex items-center space-x-2"
        >
          <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" />
          <span>{isPaused ? 'Resume' : 'Start'}</span>
        </button>
      )}

      {/* Pause */}
      {isDownloading && (
        <button
          onClick={() => handleAction(() => onPause(item.id))}
          className="w-full text-left px-3 py-1.5 hover:bg-amber-900/40 hover:text-amber-200 flex items-center space-x-2"
        >
          <Pause className="w-3.5 h-3.5 text-amber-400 fill-current" />
          <span>Pause</span>
        </button>
      )}

      {/* Stop */}
      {(isDownloading || item.status === 'QUEUED') && (
        <button
          onClick={() => handleAction(() => onStop(item.id))}
          className="w-full text-left px-3 py-1.5 hover:bg-rose-900/40 hover:text-rose-200 flex items-center space-x-2"
        >
          <Square className="w-3.5 h-3.5 text-rose-400 fill-current" />
          <span>Stop</span>
        </button>
      )}

      {/* Restart */}
      <button
        onClick={() => handleAction(() => onRetry(item.id))}
        className="w-full text-left px-3 py-1.5 hover:bg-cyan-900/40 hover:text-cyan-200 flex items-center space-x-2"
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
          !isCompleted ? 'opacity-40 cursor-not-allowed' : 'hover:bg-cyan-900/40 hover:text-cyan-200'
        }`}
      >
        <FileVideo className="w-3.5 h-3.5 text-cyan-400" />
        <span>Open File</span>
      </button>

      {/* Open Folder */}
      <button
        onClick={() => handleAction(() => onOpenFolder(item))}
        className="w-full text-left px-3 py-1.5 hover:bg-cyan-900/40 hover:text-cyan-200 flex items-center space-x-2"
      >
        <Folder className="w-3.5 h-3.5 text-amber-400" />
        <span>Open Folder</span>
      </button>

      {/* Copy URL */}
      <button
        onClick={() =>
          handleAction(() => {
            navigator.clipboard.writeText(item.url);
          })
        }
        className="w-full text-left px-3 py-1.5 hover:bg-cyan-900/40 hover:text-cyan-200 flex items-center space-x-2"
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
          className="w-full text-left px-3 py-1.5 hover:bg-cyan-900/40 hover:text-cyan-200 flex items-center space-x-2"
        >
          <Copy className="w-3.5 h-3.5 text-slate-400" />
          <span>Copy File Path</span>
        </button>
      )}

      <div className="h-px bg-slate-800 my-1" />

      {/* Rename */}
      <button
        onClick={() => handleAction(() => onRename(item))}
        className="w-full text-left px-3 py-1.5 hover:bg-cyan-900/40 hover:text-cyan-200 flex items-center space-x-2"
      >
        <Edit2 className="w-3.5 h-3.5 text-slate-400" />
        <span>Rename...</span>
      </button>

      {/* Remove from list */}
      <button
        onClick={() => handleAction(() => onDelete(item.id, false))}
        className="w-full text-left px-3 py-1.5 hover:bg-rose-900/40 hover:text-rose-200 flex items-center space-x-2"
      >
        <ListX className="w-3.5 h-3.5 text-rose-400" />
        <span>Remove from List</span>
      </button>

      {/* Delete file and record */}
      <button
        onClick={() => handleAction(() => onDelete(item.id, true))}
        className="w-full text-left px-3 py-1.5 hover:bg-rose-900/60 hover:text-rose-200 flex items-center space-x-2 text-rose-300"
      >
        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
        <span>Delete File from Disk</span>
      </button>

      <div className="h-px bg-slate-800 my-1" />

      {/* Properties */}
      <button
        onClick={() => handleAction(() => onProperties(item))}
        className="w-full text-left px-3 py-1.5 hover:bg-cyan-900/40 hover:text-cyan-200 flex items-center space-x-2"
      >
        <Info className="w-3.5 h-3.5 text-slate-400" />
        <span>Properties...</span>
      </button>
    </div>
  );
};
