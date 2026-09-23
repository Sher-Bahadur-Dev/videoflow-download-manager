import React from 'react';
import { DownloadSegment } from '../types';
import { formatBytes, formatSpeed } from '../utils';
import { Layers, Activity, CheckCircle, Wifi } from 'lucide-react';

interface IdmSegmentBarProps {
  segments?: DownloadSegment[];
  connectionsCount?: number;
  totalBytes?: number;
  downloadedBytes?: number;
  speed?: number;
  isDownloading?: boolean;
}

export const IdmSegmentBar: React.FC<IdmSegmentBarProps> = ({
  segments,
  connectionsCount = 8,
  totalBytes = 0,
  downloadedBytes = 0,
  speed = 0,
  isDownloading = false
}) => {
  const activeSegments: DownloadSegment[] = React.useMemo(() => {
    if (segments && segments.length > 0) return segments;

    const count = connectionsCount || 1;
    const total = totalBytes || 1;
    const downloaded = downloadedBytes || 0;

    if (count === 1) {
      const isDone = total > 0 && downloaded >= total;
      return [
        {
          id: 1,
          start: 0,
          end: total,
          downloaded,
          total,
          speed,
          status: isDone ? 'completed' : isDownloading ? 'downloading' : 'idle'
        }
      ];
    }

    const segSize = Math.max(1, Math.floor(total / count));
    const list: DownloadSegment[] = [];
    for (let i = 0; i < count; i++) {
      const start = i * segSize;
      const end = i === count - 1 ? total : (i + 1) * segSize;
      const segTotal = Math.max(1, end - start);

      let segDownloaded = 0;
      let status: DownloadSegment['status'] = 'idle';

      if (downloaded >= end) {
        segDownloaded = segTotal;
        status = 'completed';
      } else if (downloaded > start) {
        segDownloaded = downloaded - start;
        status = isDownloading ? 'downloading' : 'idle';
      } else {
        segDownloaded = 0;
        status = isDownloading && i <= Math.floor((downloaded / total) * count) + 1 ? 'connecting' : 'idle';
      }

      list.push({
        id: i + 1,
        start,
        end,
        downloaded: segDownloaded,
        total: segTotal,
        speed: status === 'downloading' ? Math.round(speed / Math.max(1, count / 2)) : 0,
        status
      });
    }
    return list;
  }, [segments, connectionsCount, totalBytes, downloadedBytes, speed, isDownloading]);

  const activeThreadsCount = activeSegments.filter((s) => s.status === 'downloading' || s.status === 'connecting').length;

  return (
    <div className="bg-[#070b14] border border-slate-800 rounded-lg p-2.5 space-y-2 select-none font-sans text-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-800/80">
        <div className="flex items-center space-x-1.5 text-cyan-300 font-medium">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>IDM Multi-Threaded Acceleration</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-mono">
            {activeSegments.length} Connections
          </span>
        </div>
        <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono">
          <span className="flex items-center space-x-1">
            <span className={`w-1.5 h-1.5 rounded-full ${isDownloading ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`} />
            <span>{isDownloading ? `${activeThreadsCount} active threads` : 'Idle'}</span>
          </span>
        </div>
      </div>

      {/* Unified IDM Segmented Connection Bar */}
      <div className="w-full h-3 bg-slate-900 rounded-xs flex overflow-hidden border border-slate-800 p-0.5 gap-0.5 shadow-inner">
        {activeSegments.map((seg) => {
          const pct = Math.min(100, Math.max(0, (seg.downloaded / seg.total) * 100));
          return (
            <div
              key={seg.id}
              className="h-full flex-1 bg-slate-950 relative overflow-hidden rounded-2xs"
              title={`Thread #${seg.id}: ${formatBytes(seg.downloaded)} / ${formatBytes(seg.total)} (${pct.toFixed(0)}%) - ${seg.status}`}
            >
              <div
                className={`h-full transition-all duration-150 ${
                  seg.status === 'completed'
                    ? 'bg-emerald-500'
                    : seg.status === 'downloading'
                    ? 'bg-gradient-to-r from-cyan-600 to-cyan-400 animate-pulse'
                    : seg.status === 'connecting'
                    ? 'bg-amber-500/70 animate-pulse'
                    : 'bg-slate-800'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          );
        })}
      </div>

      {/* Individual Thread Connection Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-0.5">
        {activeSegments.map((seg) => {
          const pct = Math.min(100, Math.max(0, (seg.downloaded / seg.total) * 100));
          const isDone = seg.status === 'completed';
          const isBusy = seg.status === 'downloading';

          return (
            <div
              key={seg.id}
              className={`p-1.5 rounded border transition-colors ${
                isBusy
                  ? 'bg-cyan-950/30 border-cyan-700/60'
                  : isDone
                  ? 'bg-slate-900/40 border-slate-800 text-slate-400'
                  : 'bg-slate-950/60 border-slate-800/60 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono leading-tight mb-1">
                <span className={`font-semibold ${isBusy ? 'text-cyan-300' : isDone ? 'text-emerald-400' : 'text-slate-400'}`}>
                  Thread {seg.id}
                </span>
                <span className="text-[9px]">
                  {isBusy ? formatSpeed(seg.speed) : isDone ? '100%' : `${pct.toFixed(0)}%`}
                </span>
              </div>

              {/* Progress track */}
              <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    isDone
                      ? 'bg-emerald-500'
                      : isBusy
                      ? 'bg-cyan-400'
                      : 'bg-slate-700'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 mt-1">
                <span className="truncate">{formatBytes(seg.downloaded)}</span>
                <span className="truncate text-slate-500">/ {formatBytes(seg.total)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
