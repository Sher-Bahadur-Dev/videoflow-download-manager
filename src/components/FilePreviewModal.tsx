import React from 'react';
import { X, Film, Music, Download, FolderOpen, CheckCircle2 } from 'lucide-react';
import { DownloadItem } from '../types';
import { formatBytes } from '../utils';

interface FilePreviewModalProps {
  item: DownloadItem | null;
  onClose: () => void;
  onRevealFolder: (id: string) => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  item,
  onClose,
  onRevealFolder
}) => {
  if (!item) return null;

  const streamUrl = `/api/downloads/${item.id}/file`;
  const isAudio = item.format === 'mp3' || item.format === 'm4a';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            {isAudio ? (
              <Music className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Film className="w-4 h-4 text-cyan-400 shrink-0" />
            )}
            <h3 className="text-xs font-semibold text-slate-100 truncate" title={item.title}>
              {item.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Player Media Container */}
        <div className="bg-black/90 flex items-center justify-center p-2 min-h-[260px] max-h-[460px]">
          {isAudio ? (
            <div className="p-8 text-center space-y-4 w-full max-w-md">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                <Music className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-200">{item.title}</h4>
                <p className="text-xs text-slate-500">{item.uploader}</p>
              </div>
              <audio
                controls
                autoPlay
                src={streamUrl}
                className="w-full mt-2"
              />
            </div>
          ) : (
            <video
              controls
              autoPlay
              src={streamUrl}
              className="max-h-[440px] max-w-full rounded-lg shadow-lg"
            />
          )}
        </div>

        {/* Footer Details & Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5 min-w-0">
            <p className="font-mono text-slate-300 text-[11px] truncate">
              {item.outputPath || item.fileName}
            </p>
            <div className="flex items-center space-x-2 text-[10px] text-slate-500">
              <span>{formatBytes(item.totalBytes || item.downloadedBytes)}</span>
              <span>•</span>
              <span className="uppercase font-mono">{item.format}</span>
              <span>•</span>
              <span>{item.quality}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => onRevealFolder(item.id)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Location</span>
            </button>

            <a
              href={streamUrl}
              download={item.fileName || 'video'}
              className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save File</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
