import React, { useState, useEffect, useRef } from 'react';
import {
  DownloadItem
} from '../types';
import {
  formatBytes,
  formatSpeed,
  formatEta,
  formatDate
} from '../utils';
import {
  ChevronDown,
  ChevronUp,
  Folder,
  FileVideo,
  ExternalLink,
  Copy,
  Info,
  Check,
  Play,
  Pause,
  RotateCw
} from 'lucide-react';

interface DetailPanelProps {
  item: DownloadItem | null;
  onClose: () => void;
  onOpenFile: (item: DownloadItem) => void;
  onOpenFolder: (item: DownloadItem) => void;
  onOpenProperties: (item: DownloadItem) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onRetry: (id: string) => void;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({
  item,
  onClose,
  onOpenFile,
  onOpenFolder,
  onOpenProperties,
  onPause,
  onResume,
  onRetry
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [speedHistory, setSpeedHistory] = useState<number[]>([]);
  const prevIdRef = useRef<string | null>(null);

  // Track REAL speed data points over time for the active item
  useEffect(() => {
    if (!item) {
      setSpeedHistory([]);
      return;
    }

    if (prevIdRef.current !== item.id) {
      prevIdRef.current = item.id;
      setSpeedHistory(item.speed ? [item.speed] : [0]);
      return;
    }

    if (item.status === 'DOWNLOADING') {
      setSpeedHistory((prev) => {
        const next = [...prev, item.speed || 0];
        return next.slice(-40); // keep last 40 data points
      });
    } else {
      setSpeedHistory((prev) => (prev.length > 0 ? [...prev.slice(-39), 0] : [0]));
    }
  }, [item?.id, item?.speed, item?.status]);

  if (!item) return null;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(item.url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const isCompleted = item.status === 'COMPLETED';
  const isDownloading = item.status === 'DOWNLOADING';
  const isPaused = item.status === 'PAUSED';

  // Calculate SVG coordinates for real-time speed chart
  const maxSpeed = Math.max(...speedHistory, 1024 * 100); // minimum scale 100 KB/s
  const chartHeight = 44;
  const chartWidth = 240;
  const points = speedHistory.map((val, idx) => {
    const x = speedHistory.length <= 1 ? 0 : (idx / (speedHistory.length - 1)) * chartWidth;
    const y = chartHeight - (val / maxSpeed) * (chartHeight - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const pointsStr = points.join(' ');
  const areaPoints = points.length > 0 ? `0,${chartHeight} ${pointsStr} ${chartWidth},${chartHeight}` : '';

  return (
    <section aria-label="Download details panel" className="border-t border-slate-800 bg-[#0c1220] select-none text-xs shrink-0 font-sans">
      {/* Panel Header */}
      <div className="h-7 bg-[#090d16] px-3 flex items-center justify-between border-b border-slate-800/80 text-slate-300">
        <div className="flex items-center space-x-2 min-w-0">
          <span className="font-semibold text-slate-200 text-[11px] truncate">
            {item.title}
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
            {item.status}
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
            title={isCollapsed ? 'Expand details' : 'Collapse details'}
          >
            {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
            title="Close details"
          >
            ×
          </button>
        </div>
      </div>

      {/* Panel Body */}
      {!isCollapsed && (
        <div className="p-3 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Column 1: Info */}
          <div className="space-y-1.5 min-w-0 md:col-span-2 lg:col-span-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">URL:</span>
              <button
                onClick={handleCopyUrl}
                className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 text-[10px]"
              >
                {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
              </button>
            </div>
            <div className="font-mono text-[11px] text-slate-300 truncate bg-slate-900/80 px-2 py-1 rounded border border-slate-800">
              {item.url}
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div>
                <span className="text-slate-400">Downloaded: </span>
                <span className="font-mono text-slate-200 font-medium">
                  {formatBytes(item.downloadedBytes)} / {formatBytes(item.totalBytes)}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Speed: </span>
                <span className="font-mono text-cyan-300 font-medium">
                  {isDownloading ? formatSpeed(item.speed) : '--'}
                </span>
              </div>
              <div>
                <span className="text-slate-400">ETA: </span>
                <span className="font-mono text-slate-200">
                  {isDownloading ? formatEta(item.eta) : isCompleted ? 'Finished' : '--'}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Quality: </span>
                <span className="font-mono text-slate-200">{item.quality || 'Auto'}</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="pt-1.5 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>Progress: {item.progress.toFixed(1)}%</span>
                <span>{item.fileName || item.title}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-500'
                      : item.status === 'FAILED'
                      ? 'bg-rose-500'
                      : 'bg-cyan-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, item.progress))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Column 2: Speed Graph */}
          <div className="bg-[#090d16] p-2 rounded border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
              <span>Real-time Speed</span>
              <span className="text-cyan-400 font-semibold">{formatSpeed(item.speed)}</span>
            </div>

            {/* Speed SVG Chart */}
            <div className="w-full h-11 bg-slate-950/80 rounded border border-slate-900 flex items-center justify-center relative overflow-hidden">
              {speedHistory.length > 1 ? (
                <svg className="w-full h-full" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
                  <polygon points={areaPoints} fill="rgba(6, 182, 212, 0.15)" />
                  <polyline
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={pointsStr}
                  />
                </svg>
              ) : (
                <span className="text-[10px] text-slate-600 font-mono">No transfer stream active</span>
              )}
            </div>

            <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono mt-1">
              <span>Peak: {formatSpeed(maxSpeed)}</span>
              <span>Last 60s</span>
            </div>
          </div>

          {/* Column 3: Quick Action Buttons */}
          <div className="flex flex-col justify-between space-y-1.5">
            <div className="text-[10px] font-semibold text-slate-400 tracking-wider">
              ACTIONS
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {isCompleted ? (
                <button
                  onClick={() => onOpenFile(item)}
                  className="flex items-center justify-center space-x-1 px-2 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-[11px] transition-colors"
                >
                  <FileVideo className="w-3.5 h-3.5" />
                  <span>Open File</span>
                </button>
              ) : isDownloading ? (
                <button
                  onClick={() => onPause(item.id)}
                  className="flex items-center justify-center space-x-1 px-2 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-medium text-[11px] transition-colors"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </button>
              ) : (
                <button
                  onClick={() => onResume(item.id)}
                  className="flex items-center justify-center space-x-1 px-2 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Resume</span>
                </button>
              )}

              <button
                onClick={() => onOpenFolder(item)}
                className="flex items-center justify-center space-x-1 px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] border border-slate-700 transition-colors"
              >
                <Folder className="w-3.5 h-3.5 text-cyan-400" />
                <span>Open Folder</span>
              </button>

              <button
                onClick={() => onRetry(item.id)}
                className="flex items-center justify-center space-x-1 px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] border border-slate-700 transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5 text-slate-400" />
                <span>Restart</span>
              </button>

              <button
                onClick={() => onOpenProperties(item)}
                className="flex items-center justify-center space-x-1 px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] border border-slate-700 transition-colors"
              >
                <Info className="w-3.5 h-3.5 text-slate-400" />
                <span>Properties</span>
              </button>
            </div>
            <div className="text-[10px] text-slate-400 font-mono truncate">
              {item.outputPath || 'Destination: Auto'}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
