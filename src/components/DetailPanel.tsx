import React, { useState, useEffect, useRef } from 'react';
import {
  DownloadItem
} from '../types';
import {
  formatBytes,
  formatExactKiloBytes,
  formatExactBytes,
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
  RotateCw,
  Archive,
  Music,
  Activity,
  Layers,
  FileArchive
} from 'lucide-react';
import { IdmSegmentBar } from './IdmSegmentBar';

interface DetailPanelProps {
  item: DownloadItem | null;
  onClose: () => void;
  onOpenFile: (item: DownloadItem) => void;
  onOpenFolder: (item: DownloadItem) => void;
  onOpenProperties: (item: DownloadItem) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onRetry: (id: string) => void;
  onOpenArchiveModal?: (item: DownloadItem, tab: 'compress' | 'extract' | 'inspect') => void;
  onOpenAudioModal?: (item: DownloadItem) => void;
}

interface TransferLogEntry {
  timestamp: string;
  bytesDelta: number;
  totalKB: number;
  speedKB: number;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({
  item,
  onClose,
  onOpenFile,
  onOpenFolder,
  onOpenProperties,
  onPause,
  onResume,
  onRetry,
  onOpenArchiveModal,
  onOpenAudioModal
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'segments' | 'ledger' | 'graph'>('segments');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [speedHistory, setSpeedHistory] = useState<number[]>([]);
  const [transferLedger, setTransferLedger] = useState<TransferLogEntry[]>([]);
  const prevIdRef = useRef<string | null>(null);
  const prevBytesRef = useRef<number>(0);

  // Track speed and per-KB ledger entries
  useEffect(() => {
    if (!item) {
      setSpeedHistory([]);
      setTransferLedger([]);
      return;
    }

    if (prevIdRef.current !== item.id) {
      prevIdRef.current = item.id;
      prevBytesRef.current = item.downloadedBytes || 0;
      setSpeedHistory(item.speed ? [item.speed] : [0]);
      setTransferLedger([]);
      return;
    }

    if (item.status === 'DOWNLOADING') {
      const currentBytes = item.downloadedBytes || 0;
      const delta = currentBytes - prevBytesRef.current;
      prevBytesRef.current = currentBytes;

      if (delta > 0) {
        const now = new Date();
        const timeStr = now.toTimeString().slice(0, 8);
        setTransferLedger((prev) => [
          {
            timestamp: timeStr,
            bytesDelta: delta,
            totalKB: Math.round(currentBytes / 1024),
            speedKB: Math.round((item.speed || 0) / 1024)
          },
          ...prev.slice(0, 24)
        ]);
      }

      setSpeedHistory((prev) => {
        const next = [...prev, item.speed || 0];
        return next.slice(-40);
      });
    } else {
      setSpeedHistory((prev) => (prev.length > 0 ? [...prev.slice(-39), 0] : [0]));
    }
  }, [item?.id, item?.speed, item?.downloadedBytes, item?.status]);

  if (!item) return null;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(item.url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const isCompleted = item.status === 'COMPLETED';
  const isDownloading = item.status === 'DOWNLOADING';
  const isPaused = item.status === 'PAUSED';

  // SVG speed chart coordinates
  const maxSpeed = Math.max(...speedHistory, 1024 * 100);
  const chartHeight = 44;
  const chartWidth = 240;
  const points = speedHistory.map((val, idx) => {
    const x = speedHistory.length <= 1 ? 0 : (idx / (speedHistory.length - 1)) * chartWidth;
    const y = chartHeight - (val / maxSpeed) * (chartHeight - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const pointsStr = points.join(' ');
  const areaPoints = points.length > 0 ? `0,${chartHeight} ${pointsStr} ${chartWidth},${chartHeight}` : '';

  const isArchiveFile =
    item.isCompressedArchive ||
    ['zip', 'rar', '7z', 'tar', 'gz'].includes(item.format?.toLowerCase() || '') ||
    (item.fileName && /\.(zip|rar|7z|tar|gz)$/i.test(item.fileName));

  return (
    <section aria-label="Download details panel" className="border-t border-slate-800 bg-[#0c1220] select-none text-xs shrink-0 font-sans shadow-lg">
      {/* Panel Header */}
      <div className="h-7 bg-[#090d16] px-3 flex items-center justify-between border-b border-slate-800/80 text-slate-300">
        <div className="flex items-center space-x-2 min-w-0">
          <span className="font-semibold text-slate-200 text-[11px] truncate">
            {item.title}
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-cyan-400 font-mono border border-slate-700">
            {item.status}
          </span>
          {isDownloading && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 font-mono border border-cyan-800">
              8 Threads Active
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Quick tab switch */}
          <div className="flex items-center bg-slate-900 rounded p-0.5 border border-slate-800 text-[10px]">
            <button
              onClick={() => setActiveTab('segments')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                activeTab === 'segments' ? 'bg-cyan-950 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              IDM Segments
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                activeTab === 'ledger' ? 'bg-cyan-950 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Live KB Ledger
            </button>
            <button
              onClick={() => setActiveTab('graph')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                activeTab === 'graph' ? 'bg-cyan-950 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Speed Graph
            </button>
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title={isCollapsed ? 'Expand details' : 'Collapse details'}
          >
            {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="Close details"
          >
            ×
          </button>
        </div>
      </div>

      {/* Panel Body */}
      {!isCollapsed && (
        <div className="p-3 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Left Columns (Col 1-3): Precision Info & Action Toolbar */}
          <div className="space-y-2 min-w-0 md:col-span-2 lg:col-span-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Stream Source URL:</span>
              <button
                onClick={handleCopyUrl}
                className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 text-[10px] cursor-pointer"
              >
                {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
              </button>
            </div>
            <div className="font-mono text-[11px] text-slate-300 truncate bg-slate-900/90 px-2 py-1 rounded border border-slate-800">
              {item.url}
            </div>

            {/* Precision Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-0.5">
              <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800/80">
                <span className="text-slate-400 block text-[10px]">Exact KB Progress</span>
                <span className="font-mono text-cyan-300 font-semibold text-[11px]">
                  {formatExactKiloBytes(item.downloadedBytes)}
                </span>
                <span className="text-[10px] text-slate-500 block truncate">
                  of {formatExactKiloBytes(item.totalBytes)}
                </span>
              </div>

              <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800/80">
                <span className="text-slate-400 block text-[10px]">Exact Bytes</span>
                <span className="font-mono text-slate-200 font-semibold text-[11px]">
                  {formatExactBytes(item.downloadedBytes)}
                </span>
                <span className="text-[10px] text-slate-500 block truncate">
                  of {formatExactBytes(item.totalBytes)}
                </span>
              </div>

              <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800/80">
                <span className="text-slate-400 block text-[10px]">Real-time Speed</span>
                <span className="font-mono text-emerald-400 font-semibold text-[11px]">
                  {isDownloading ? formatSpeed(item.speed) : '--'}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {isDownloading ? `${((item.speed || 0) / 1024).toFixed(1)} KB/s` : 'Standby'}
                </span>
              </div>

              <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800/80">
                <span className="text-slate-400 block text-[10px]">ETA / Time Left</span>
                <span className="font-mono text-amber-300 font-semibold text-[11px]">
                  {isDownloading ? formatEta(item.eta) : isCompleted ? 'Finished' : '--'}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {isCompleted ? 'Complete' : `${item.progress.toFixed(1)}% done`}
                </span>
              </div>
            </div>

            {/* Precision Progress Bar with Stripes */}
            <div className="pt-1 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span className="text-slate-300 font-semibold">
                  Progress: {item.progress.toFixed(1)}% ({formatExactKiloBytes(item.downloadedBytes)} / {formatExactKiloBytes(item.totalBytes)})
                </span>
                <span>{item.fileName || item.title}</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800 p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-150 ${
                    isCompleted
                      ? 'bg-emerald-500'
                      : item.status === 'FAILED'
                      ? 'bg-rose-500'
                      : 'bg-gradient-to-r from-cyan-600 to-cyan-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, item.progress))}%` }}
                />
              </div>
            </div>

            {/* Quick Desktop Actions for File */}
            <div className="flex items-center space-x-1.5 pt-1 overflow-x-auto">
              {isDownloading ? (
                <button
                  onClick={() => onPause(item.id)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center space-x-1 border border-slate-700 cursor-pointer"
                >
                  <Pause className="w-3 h-3 text-amber-400" />
                  <span>Pause</span>
                </button>
              ) : isPaused ? (
                <button
                  onClick={() => onResume(item.id)}
                  className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium flex items-center space-x-1 cursor-pointer"
                >
                  <Play className="w-3 h-3" />
                  <span>Resume</span>
                </button>
              ) : item.status === 'FAILED' ? (
                <button
                  onClick={() => onRetry(item.id)}
                  className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium flex items-center space-x-1 cursor-pointer"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              ) : null}

              {isCompleted && (
                <>
                  <button
                    onClick={() => onOpenFile(item)}
                    className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium flex items-center space-x-1 cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open File</span>
                  </button>

                  <button
                    onClick={() => onOpenFolder(item)}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center space-x-1 border border-slate-700 cursor-pointer"
                  >
                    <Folder className="w-3 h-3 text-cyan-400" />
                    <span>Open Folder</span>
                  </button>
                </>
              )}

              {/* Compress to ZIP Action */}
              {onOpenArchiveModal && isCompleted && (
                <button
                  onClick={() => onOpenArchiveModal(item, 'compress')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center space-x-1 border border-slate-700 cursor-pointer"
                  title="Bundle this file into a ZIP archive"
                >
                  <FileArchive className="w-3 h-3 text-cyan-400" />
                  <span>Compress (ZIP)</span>
                </button>
              )}

              {/* Extract Archive Action */}
              {onOpenArchiveModal && isCompleted && isArchiveFile && (
                <button
                  onClick={() => onOpenArchiveModal(item, 'extract')}
                  className="px-2.5 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-200 text-xs font-medium flex items-center space-x-1 border border-emerald-700/80 cursor-pointer"
                  title="Extract contents of this archive"
                >
                  <Archive className="w-3 h-3 text-emerald-400" />
                  <span>Extract Archive</span>
                </button>
              )}

              {/* Audio Extractor Action */}
              {onOpenAudioModal && (
                <button
                  onClick={() => onOpenAudioModal(item)}
                  className="px-2.5 py-1 rounded bg-purple-950/80 hover:bg-purple-900/80 text-purple-200 text-xs font-medium flex items-center space-x-1 border border-purple-700/80 cursor-pointer"
                  title="Extract audio track from this stream"
                >
                  <Music className="w-3 h-3 text-purple-400" />
                  <span>Extract Audio</span>
                </button>
              )}

              <button
                onClick={() => onOpenProperties(item)}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center space-x-1 border border-slate-700 cursor-pointer"
              >
                <Info className="w-3 h-3" />
                <span>Properties</span>
              </button>
            </div>
          </div>

          {/* Right Columns (Col 4-5): IDM Dynamic Segments or Live KB Ledger */}
          <div className="md:col-span-1 lg:col-span-2">
            {activeTab === 'segments' && (
              <IdmSegmentBar
                segments={item.segments}
                connectionsCount={item.connectionsCount || 8}
                totalBytes={item.totalBytes}
                downloadedBytes={item.downloadedBytes}
                speed={item.speed}
                isDownloading={isDownloading}
              />
            )}

            {activeTab === 'ledger' && (
              <div className="bg-[#070b14] border border-slate-800 rounded-lg p-2.5 flex flex-col h-full justify-between font-mono text-[10px]">
                <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-1 mb-1">
                  <span className="font-semibold text-cyan-300">Live Byte Recording Ledger</span>
                  <span className="text-[9px] text-slate-500">Every KB recorded live</span>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-0.5 divide-y divide-slate-800/40">
                  {transferLedger.length === 0 ? (
                    <div className="text-center py-6 text-slate-600">
                      {isDownloading ? 'Recording incoming KB packets...' : 'Start download to record live KB ledger'}
                    </div>
                  ) : (
                    transferLedger.map((entry, idx) => (
                      <div key={idx} className="flex items-center justify-between py-0.5 text-slate-300">
                        <span className="text-slate-500">{entry.timestamp}</span>
                        <span className="text-emerald-400 font-semibold">
                          +{formatExactKiloBytes(entry.bytesDelta)}
                        </span>
                        <span className="text-slate-400">Total: {entry.totalKB.toLocaleString()} KB</span>
                        <span className="text-cyan-400">{entry.speedKB.toLocaleString()} KB/s</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'graph' && (
              <div className="bg-[#070b14] border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                  <span>Transfer Rate Oscilloscope</span>
                  <span className="text-cyan-400 font-semibold">{formatSpeed(item.speed)}</span>
                </div>

                <div className="w-full h-24 bg-slate-950 rounded border border-slate-900 flex items-center justify-center relative overflow-hidden">
                  {speedHistory.length > 1 ? (
                    <svg className="w-full h-full" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
                      <polygon points={areaPoints} fill="rgba(6, 182, 212, 0.2)" />
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
                    <span className="text-[10px] text-slate-600 font-mono">No active transfer stream</span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono mt-1">
                  <span>Peak: {formatSpeed(maxSpeed)}</span>
                  <span>Avg: {formatSpeed(item.speed)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
