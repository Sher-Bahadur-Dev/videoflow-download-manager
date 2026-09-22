import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  XCircle,
  FolderOpen,
  Film,
  Music,
  ExternalLink,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye
} from 'lucide-react';
import { DownloadItem } from '../types';
import { formatBytes, formatSpeed, formatEta } from '../utils';

interface DownloadCardProps {
  item: DownloadItem;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onDelete: (id: string, deleteFile?: boolean) => void;
  onRevealFolder: (id: string) => void;
  onPreviewFile?: (item: DownloadItem) => void;
}

export const DownloadCard: React.FC<DownloadCardProps> = ({
  item,
  onPause,
  onResume,
  onCancel,
  onRetry,
  onDelete,
  onRevealFolder,
  onPreviewFile
}) => {
  const isDownloading = item.status === 'DOWNLOADING';
  const isPaused = item.status === 'PAUSED';
  const isQueued = item.status === 'QUEUED';
  const isCompleted = item.status === 'COMPLETED';
  const isFailed = item.status === 'FAILED';
  const isCancelled = item.status === 'CANCELLED';

  const getStatusBadge = () => {
    switch (item.status) {
      case 'DOWNLOADING':
        return (
          <span className="flex items-center space-x-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>Downloading</span>
          </span>
        );
      case 'QUEUED':
        return (
          <span className="flex items-center space-x-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Clock className="w-2.5 h-2.5" />
            <span>Queued</span>
          </span>
        );
      case 'PAUSED':
        return (
          <span className="flex items-center space-x-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300 border border-slate-600">
            <Pause className="w-2.5 h-2.5" />
            <span>Paused</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="flex items-center space-x-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-2.5 h-2.5" />
            <span>Completed</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="flex items-center space-x-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <AlertTriangle className="w-2.5 h-2.5" />
            <span>Failed</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  const getProgressBarColor = () => {
    if (isCompleted) return 'bg-emerald-500';
    if (isFailed) return 'bg-rose-500';
    if (isPaused) return 'bg-amber-500';
    return 'bg-gradient-to-r from-cyan-500 to-blue-500';
  };

  return (
    <div
      id={`download-card-${item.id}`}
      className="p-3.5 bg-slate-900/70 border border-slate-800/90 hover:border-slate-700/80 rounded-xl transition-all duration-200 space-y-3 group"
    >
      <div className="flex items-start justify-between gap-3">
        {/* Thumbnail and metadata */}
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-20 h-14 bg-slate-800 rounded-lg overflow-hidden shrink-0 border border-slate-700/60 relative flex items-center justify-center">
            {item.thumbnail ? (
              <img
                src={item.thumbnail}
                alt={item.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : item.format === 'mp3' || item.format === 'm4a' ? (
              <Music className="w-6 h-6 text-slate-500" />
            ) : (
              <Film className="w-6 h-6 text-slate-500" />
            )}

            {isCompleted && (
              <div className="absolute inset-0 bg-emerald-950/40 backdrop-blur-[1px] flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-semibold text-slate-100 truncate group-hover:text-cyan-300 transition-colors" title={item.title}>
              {item.title}
            </h4>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400 mt-1">
              <span className="text-slate-300 truncate max-w-[140px]">{item.uploader}</span>
              <span>•</span>
              <span className="font-mono text-cyan-400">{item.quality}</span>
              <span>•</span>
              <span className="uppercase font-mono text-slate-400 text-[10px] px-1 bg-slate-800 rounded border border-slate-700">
                {item.format}
              </span>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="shrink-0">{getStatusBadge()}</div>
      </div>

      {/* Real Progress Bar */}
      <div className="space-y-1.5">
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/40">
          <div
            className={`h-full rounded-full transition-all duration-300 ${getProgressBarColor()}`}
            style={{ width: `${Math.max(2, Math.min(100, item.progress))}%` }}
          ></div>
        </div>

        {/* Metrics line: Downloaded / Total, Percentage, Speed, ETA */}
        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono">
          <div className="flex items-center space-x-2">
            <span className="text-slate-200 font-semibold">{item.progress.toFixed(1)}%</span>
            <span>•</span>
            <span>
              {formatBytes(item.downloadedBytes)}
              {item.totalBytes > 0 ? ` / ${formatBytes(item.totalBytes)}` : ''}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {isDownloading && item.speed > 0 && (
              <>
                <span className="text-cyan-400 font-medium">{formatSpeed(item.speed)}</span>
                <span>•</span>
                <span>{formatEta(item.eta)}</span>
              </>
            )}
            {isPaused && <span className="text-amber-400/80">Paused</span>}
            {isQueued && <span className="text-slate-500">Waiting for slot...</span>}
            {isCompleted && <span className="text-emerald-400">Finished</span>}
            {isFailed && <span className="text-rose-400 truncate max-w-[180px]">{item.error || 'Failed'}</span>}
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs">
        {/* Left file info */}
        <div className="text-[11px] text-slate-500 truncate max-w-[200px]" title={item.outputPath}>
          {item.fileName || 'Pending destination'}
        </div>

        {/* Action button cluster */}
        <div className="flex items-center space-x-1.5">
          {isDownloading && (
            <button
              onClick={() => onPause(item.id)}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center space-x-1 transition-colors cursor-pointer"
              title="Pause Download"
            >
              <Pause className="w-3 h-3" />
              <span>Pause</span>
            </button>
          )}

          {isPaused && (
            <button
              onClick={() => onResume(item.id)}
              className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white flex items-center space-x-1 transition-colors cursor-pointer"
              title="Resume Download"
            >
              <Play className="w-3 h-3" />
              <span>Resume</span>
            </button>
          )}

          {(isDownloading || isQueued) && (
            <button
              onClick={() => onCancel(item.id)}
              className="px-2 py-1 rounded bg-slate-800/80 hover:bg-rose-950 hover:text-rose-300 text-slate-400 flex items-center space-x-1 transition-colors cursor-pointer"
              title="Cancel Download"
            >
              <XCircle className="w-3 h-3" />
              <span>Cancel</span>
            </button>
          )}

          {isFailed && (
            <button
              onClick={() => onRetry(item.id)}
              className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white flex items-center space-x-1 transition-colors cursor-pointer"
              title="Retry Download"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          )}

          {isCompleted && (
            <>
              {onPreviewFile && (
                <button
                  onClick={() => onPreviewFile(item)}
                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-1 transition-colors cursor-pointer"
                  title="Play / View File"
                >
                  <Eye className="w-3 h-3" />
                  <span>Play</span>
                </button>
              )}

              <a
                href={`/api/downloads/${item.id}/file`}
                download={item.fileName || 'download'}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center space-x-1 transition-colors"
                title="Save file to browser"
              >
                <Film className="w-3 h-3" />
                <span>Save</span>
              </a>
            </>
          )}

          <button
            onClick={() => onRevealFolder(item.id)}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="Reveal file location on disk"
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onDelete(item.id, isCompleted)}
            className="p-1.5 rounded hover:bg-rose-950/60 text-slate-500 hover:text-rose-300 transition-colors cursor-pointer"
            title="Remove from list"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
