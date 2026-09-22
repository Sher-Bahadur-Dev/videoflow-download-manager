import React from 'react';
import { DownloadItem } from '../types';
import { formatBytes, formatDate } from '../utils';
import { Info, X, FileVideo, Folder, ExternalLink, Copy } from 'lucide-react';

interface PropertiesDialogProps {
  item: DownloadItem | null;
  onClose: () => void;
  onOpenFile: (item: DownloadItem) => void;
  onOpenFolder: (item: DownloadItem) => void;
}

export const PropertiesDialog: React.FC<PropertiesDialogProps> = ({
  item,
  onClose,
  onOpenFile,
  onOpenFolder
}) => {
  if (!item) return null;

  const isCompleted = item.status === 'COMPLETED';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs font-sans">
      <div className="bg-[#121929] border border-slate-700 rounded-lg shadow-2xl w-full max-w-lg overflow-hidden flex flex-col text-xs text-slate-200">
        {/* Header */}
        <div className="h-9 bg-[#0b101c] px-3.5 flex items-center justify-between border-b border-slate-800 text-slate-300 select-none">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-slate-100 text-xs">Download Properties</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Property Grid */}
        <div className="p-4 space-y-3 max-h-[80vh] overflow-y-auto">
          <div className="flex items-start space-x-3 pb-3 border-b border-slate-800">
            {item.thumbnail ? (
              <img
                src={item.thumbnail}
                alt={item.title}
                className="w-20 h-14 object-cover rounded bg-slate-900 border border-slate-800 shrink-0"
              />
            ) : (
              <div className="w-20 h-14 rounded bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 shrink-0">
                <FileVideo className="w-6 h-6" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-slate-100 text-sm truncate">{item.title}</h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">{item.fileName || '--'}</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div>
              <div className="flex justify-between items-center text-[11px] text-slate-400">
                <span>Source URL:</span>
                <button
                  onClick={() => copyToClipboard(item.url)}
                  className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 text-[10px]"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </button>
              </div>
              <div className="font-mono text-[11px] text-slate-300 bg-slate-900/80 p-1.5 rounded border border-slate-800 break-all select-all mt-0.5">
                {item.url}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-[11px] text-slate-400 block">Status:</span>
                <span className="font-medium text-slate-200">{item.status}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Progress:</span>
                <span className="font-mono text-slate-200">{item.progress.toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Total File Size:</span>
                <span className="font-mono text-slate-200">{formatBytes(item.totalBytes)}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Downloaded:</span>
                <span className="font-mono text-slate-200">{formatBytes(item.downloadedBytes)}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Format / Container:</span>
                <span className="font-mono text-slate-200 uppercase">{item.format || 'MP4'}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Quality:</span>
                <span className="font-mono text-slate-200">{item.quality || 'Auto'}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Date Added:</span>
                <span className="font-mono text-slate-200 text-[11px]">{formatDate(item.createdAt)}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Date Completed:</span>
                <span className="font-mono text-slate-200 text-[11px]">
                  {item.completedAt ? formatDate(item.completedAt) : '--'}
                </span>
              </div>
            </div>

            {item.error && (
              <div className="p-2 rounded bg-rose-950/40 border border-rose-800/80 text-rose-300 text-[11px]">
                <span className="font-semibold block mb-0.5">Error detail:</span>
                <span>{item.error}</span>
              </div>
            )}

            <div>
              <div className="flex justify-between items-center text-[11px] text-slate-400">
                <span>Save Location on Disk:</span>
                {item.outputPath && (
                  <button
                    onClick={() => copyToClipboard(item.outputPath!)}
                    className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 text-[10px]"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy Path</span>
                  </button>
                )}
              </div>
              <div className="font-mono text-[11px] text-slate-300 bg-slate-900/80 p-1.5 rounded border border-slate-800 break-all select-all mt-0.5">
                {item.outputPath || 'In transit / Not yet finalized'}
              </div>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="h-11 bg-[#090d16] px-4 flex items-center justify-between border-t border-slate-800 shrink-0">
          <div className="flex items-center space-x-2">
            <button
              disabled={!isCompleted}
              onClick={() => onOpenFile(item)}
              className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium flex items-center space-x-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileVideo className="w-3.5 h-3.5" />
              <span>Open File</span>
            </button>
            <button
              onClick={() => onOpenFolder(item)}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition-colors"
            >
              <Folder className="w-3.5 h-3.5 text-cyan-400" />
              <span>Open Folder</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
