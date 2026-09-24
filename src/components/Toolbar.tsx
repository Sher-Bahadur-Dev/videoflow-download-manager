import React, { useRef, useEffect } from 'react';
import {
  Plus,
  ListPlus,
  Play,
  Pause,
  Square,
  Trash2,
  Settings,
  Search,
  SlidersHorizontal,
  Gauge,
  Tv,
  Music,
  Archive,
  FileArchive
} from 'lucide-react';
import { DownloadItem } from '../types';

interface ToolbarProps {
  selectedItem: DownloadItem | null;
  selectedCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  speedLimitKBps: number;
  onSpeedLimitChange: (kbps: number) => void;
  onOpenAddUrl: () => void;
  onOpenAddBatch: () => void;
  onOpenGrabber?: () => void;
  onOpenArchiveModal?: () => void;
  onOpenAudioModal?: () => void;
  onStartSelected: () => void;
  onPauseSelected: () => void;
  onStopSelected: () => void;
  onDeleteSelected: () => void;
  onOpenSettings: () => void;
  onOpenColumnChooser: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  selectedItem,
  selectedCount,
  searchQuery,
  onSearchChange,
  speedLimitKBps,
  onSpeedLimitChange,
  onOpenAddUrl,
  onOpenAddBatch,
  onOpenGrabber,
  onOpenArchiveModal,
  onOpenAudioModal,
  onStartSelected,
  onPauseSelected,
  onStopSelected,
  onDeleteSelected,
  onOpenSettings,
  onOpenColumnChooser
}) => {
  const isDownloading = selectedItem?.status === 'DOWNLOADING';
  const isPaused = selectedItem?.status === 'PAUSED';
  const hasSelection = selectedCount > 0;

  const isLimiterActive = speedLimitKBps > 0;
  const lastLimitRef = useRef<number>(speedLimitKBps > 0 ? speedLimitKBps : 2048);

  useEffect(() => {
    if (speedLimitKBps > 0) {
      lastLimitRef.current = speedLimitKBps;
    }
  }, [speedLimitKBps]);

  const handleToggleLimiter = () => {
    if (isLimiterActive) {
      onSpeedLimitChange(0);
    } else {
      onSpeedLimitChange(lastLimitRef.current || 2048);
    }
  };

  const getSpeedLabel = (kbps: number) => {
    if (!kbps || kbps === 0) return 'Unlimited';
    if (kbps < 1024) return `${kbps} KB/s`;
    return `${(kbps / 1024).toFixed(0)} MB/s`;
  };

  return (
    <div className="h-10 bg-[#0c121e] border-b border-slate-800/90 px-2.5 flex items-center justify-between text-xs select-none shrink-0 gap-2 font-sans">
      {/* Left Action Buttons */}
      <div className="flex items-center space-x-1 shrink-0 overflow-x-auto py-1">
        {/* + Add URL */}
        <button
          onClick={onOpenAddUrl}
          title="Add single URL download (Ctrl+N)"
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span className="font-semibold text-[11px] whitespace-nowrap">Add URL</span>
        </button>

        {/* Add Batch */}
        <button
          onClick={onOpenAddBatch}
          title="Add multiple URLs simultaneously"
          className="flex items-center space-x-1.5 px-2 py-1.5 rounded bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60 transition-colors cursor-pointer"
        >
          <ListPlus className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[11px] whitespace-nowrap hidden sm:inline">Add Batch</span>
        </button>

        {/* Video Sniffer (IDM Bar) */}
        {onOpenGrabber && (
          <button
            onClick={onOpenGrabber}
            title="Open Video Sniffer & Player with IDM Bar"
            className="flex items-center space-x-1.5 px-2 py-1.5 rounded bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-200 border border-cyan-700/60 transition-colors cursor-pointer"
          >
            <Tv className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-medium whitespace-nowrap hidden lg:inline">IDM Video Bar</span>
          </button>
        )}

        {/* Audio Extractor */}
        {onOpenAudioModal && (
          <button
            onClick={onOpenAudioModal}
            title="Extract audio from any video/audio stream URL"
            className="flex items-center space-x-1.5 px-2 py-1.5 rounded bg-purple-950/60 hover:bg-purple-900/60 text-purple-200 border border-purple-700/60 transition-colors cursor-pointer"
          >
            <Music className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[11px] font-medium whitespace-nowrap hidden lg:inline">Audio Extract</span>
          </button>
        )}

        {/* Archive / Compress */}
        {onOpenArchiveModal && (
          <button
            onClick={onOpenArchiveModal}
            title="Compress files into ZIP or extract archives"
            className="flex items-center space-x-1.5 px-2 py-1.5 rounded bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60 transition-colors cursor-pointer"
          >
            <Archive className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] whitespace-nowrap hidden lg:inline">Compress/Zip</span>
          </button>
        )}

        <div className="h-4 w-px bg-slate-800 mx-1 shrink-0" />

        {/* Start / Resume */}
        <button
          disabled={!hasSelection || isDownloading}
          onClick={onStartSelected}
          title="Start / Resume selected download (Space)"
          className={`flex items-center space-x-1 px-2 py-1.5 rounded text-slate-200 border border-transparent transition-colors ${
            !hasSelection || isDownloading
              ? 'opacity-35 cursor-not-allowed text-slate-500'
              : 'hover:bg-slate-800 hover:border-slate-700 hover:text-emerald-400 cursor-pointer'
          }`}
        >
          <Play className="w-3.5 h-3.5 fill-current text-emerald-400" />
          <span className="text-[11px] whitespace-nowrap hidden md:inline">Start</span>
        </button>

        {/* Pause */}
        <button
          disabled={!hasSelection || !isDownloading}
          onClick={onPauseSelected}
          title="Pause selected download"
          className={`flex items-center space-x-1 px-2 py-1.5 rounded text-slate-200 border border-transparent transition-colors ${
            !hasSelection || !isDownloading
              ? 'opacity-35 cursor-not-allowed text-slate-500'
              : 'hover:bg-slate-800 hover:border-slate-700 hover:text-amber-400 cursor-pointer'
          }`}
        >
          <Pause className="w-3.5 h-3.5 fill-current text-amber-400" />
          <span className="text-[11px] whitespace-nowrap hidden md:inline">Pause</span>
        </button>

        {/* Stop / Cancel */}
        <button
          disabled={!hasSelection || (!isDownloading && selectedItem?.status !== 'QUEUED')}
          onClick={onStopSelected}
          title="Stop / Cancel selected download"
          className={`flex items-center space-x-1 px-2 py-1.5 rounded text-slate-200 border border-transparent transition-colors ${
            !hasSelection
              ? 'opacity-35 cursor-not-allowed text-slate-500'
              : 'hover:bg-slate-800 hover:border-slate-700 hover:text-rose-400 cursor-pointer'
          }`}
        >
          <Square className="w-3.5 h-3.5 fill-current text-rose-400" />
          <span className="text-[11px] whitespace-nowrap hidden md:inline">Stop</span>
        </button>

        {/* Delete */}
        <button
          disabled={!hasSelection}
          onClick={onDeleteSelected}
          title="Delete selected download (Del)"
          className={`flex items-center space-x-1 px-2 py-1.5 rounded text-slate-200 border border-transparent transition-colors ${
            !hasSelection
              ? 'opacity-35 cursor-not-allowed text-slate-500'
              : 'hover:bg-slate-800 hover:border-slate-700 hover:text-rose-400 cursor-pointer'
          }`}
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
          <span className="text-[11px] whitespace-nowrap hidden md:inline">Delete</span>
        </button>

        <div className="h-4 w-px bg-slate-800 mx-1 shrink-0" />

        {/* Global Download Speed Limiter Switch & Preset Dropdown */}
        <div className="flex items-center space-x-1.5 text-slate-300 bg-[#090e18]/80 px-2 py-1 rounded border border-slate-800/90 shadow-xs" title="Download Speed Limiter">
          <label className="flex items-center space-x-1.5 cursor-pointer select-none">
            <Gauge className={`w-3.5 h-3.5 ${isLimiterActive ? 'text-cyan-400 animate-pulse' : 'text-slate-400'}`} />
            <span className="hidden sm:inline font-mono text-[11px] font-medium text-slate-300 whitespace-nowrap">
              Speed Limiter:
            </span>
            {/* Download Speed Limiter Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={isLimiterActive}
              onClick={handleToggleLimiter}
              title={
                isLimiterActive
                  ? `Download Speed Limiter is ON (${getSpeedLabel(speedLimitKBps)} global cap). Click to turn OFF (Unlimited).`
                  : 'Download Speed Limiter is OFF. Click to turn ON.'
              }
              className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border transition-colors duration-150 ease-in-out focus:outline-none ${
                isLimiterActive ? 'bg-cyan-600 border-cyan-400 ring-1 ring-cyan-500/30' : 'bg-slate-700/80 border-slate-600'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs transition duration-150 ease-in-out mt-[0.5px] ${
                  isLimiterActive ? 'translate-x-3 bg-cyan-100' : 'translate-x-0.5 bg-slate-300'
                }`}
              />
            </button>
            <span className={`text-[10px] font-mono font-semibold hidden md:inline ${isLimiterActive ? 'text-emerald-400' : 'text-slate-500'}`}>
              {isLimiterActive ? 'ON' : 'OFF'}
            </span>
          </label>

          {/* Download Speed Limiter Preset Dropdown */}
          <select
            value={speedLimitKBps}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (val > 0) lastLimitRef.current = val;
              onSpeedLimitChange(val);
            }}
            title="Download Speed Limiter presets (e.g. 50KB/s, 100KB/s, Unlimited)"
            aria-label="Download Speed Limiter preset"
            className="bg-[#121927] border border-slate-700 text-slate-200 rounded px-1.5 py-0.5 text-[11px] focus:outline-none focus:border-cyan-500 cursor-pointer font-mono"
          >
            <option value={0}>Unlimited</option>
            <option value={50}>50 KB/s</option>
            <option value={100}>100 KB/s</option>
            <option value={256}>256 KB/s</option>
            <option value={500}>500 KB/s</option>
            <option value={1024}>1 MB/s</option>
            <option value={2048}>2 MB/s</option>
            <option value={5120}>5 MB/s</option>
            <option value={10240}>10 MB/s</option>
            <option value={20480}>20 MB/s</option>
            <option value={51200}>50 MB/s</option>
            {speedLimitKBps > 0 && ![50, 100, 256, 500, 1024, 2048, 5120, 10240, 20480, 51200].includes(speedLimitKBps) && (
              <option value={speedLimitKBps}>Custom ({getSpeedLabel(speedLimitKBps)})</option>
            )}
          </select>
        </div>
      </div>

      {/* Right Toolbar: Search & Settings */}
      <div className="flex items-center space-x-2 shrink-0">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search downloads..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-36 sm:w-48 md:w-56 bg-[#121826] border border-slate-700/80 rounded pl-8 pr-2.5 py-1 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
            >
              ×
            </button>
          )}
        </div>

        {/* Columns chooser button */}
        <button
          onClick={onOpenColumnChooser}
          title="Customize table columns"
          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors border border-transparent hover:border-slate-700"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>

        {/* Options / Settings */}
        <button
          onClick={onOpenSettings}
          title="Settings / Options (Ctrl+,)"
          className="flex items-center space-x-1 px-2 py-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-300 transition-colors border border-transparent hover:border-slate-700"
        >
          <Settings className="w-3.5 h-3.5" />
          <span className="text-[11px] hidden sm:inline">Options</span>
        </button>
      </div>
    </div>
  );
};
