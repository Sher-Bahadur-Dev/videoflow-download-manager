import React from 'react';
import {
  ListOrdered,
  ArrowUp,
  ArrowDown,
  Play,
  XCircle,
  Clock,
  Zap,
  CheckCircle2,
  Film,
  Music
} from 'lucide-react';
import { DownloadItem } from '../types';
import { formatBytes } from '../utils';

interface QueueViewProps {
  downloads: DownloadItem[];
  concurrencyLimit: number;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onReorder: (newOrderIds: string[]) => void;
  onOpenAddModal: () => void;
}

export const QueueView: React.FC<QueueViewProps> = ({
  downloads,
  concurrencyLimit,
  onResume,
  onCancel,
  onReorder,
  onOpenAddModal
}) => {
  const activeDownloads = downloads.filter(d => d.status === 'DOWNLOADING');
  const queuedDownloads = downloads.filter(d => d.status === 'QUEUED');

  const moveQueueItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === queuedDownloads.length - 1) return;

    const newQueued = [...queuedDownloads];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const temp = newQueued[index];
    newQueued[index] = newQueued[targetIdx];
    newQueued[targetIdx] = temp;

    // Combine with rest of downloads to preserve full order
    const nonQueued = downloads.filter(d => d.status !== 'QUEUED');
    const fullOrder = [...nonQueued.map(d => d.id), ...newQueued.map(d => d.id)];
    onReorder(fullOrder);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-bold text-slate-100">Queue Manager</h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              {queuedDownloads.length} Queued
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Reorder download priority and inspect active concurrency dispatching
          </p>
        </div>

        {/* Concurrency Indicator Card */}
        <div className="px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5 text-cyan-400">
            <Zap className="w-4 h-4" />
            <span className="font-semibold">Simultaneous Limit:</span>
          </div>
          <span className="font-mono text-slate-100 font-bold bg-slate-800 px-2 py-0.5 rounded">
            {concurrencyLimit} active
          </span>
        </div>
      </div>

      {/* Active Slots Status */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-200">Active Execution Slots</span>
          <span className="font-mono text-slate-400">
            {activeDownloads.length} of {concurrencyLimit} slots occupied
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {Array.from({ length: concurrencyLimit }).map((_, slotIdx) => {
            const activeItem = activeDownloads[slotIdx];
            return (
              <div
                key={slotIdx}
                className={`p-3 rounded-lg border text-xs flex items-center space-x-2.5 ${
                  activeItem
                    ? 'bg-cyan-950/20 border-cyan-800/40 text-slate-200'
                    : 'bg-slate-900/40 border-dashed border-slate-800 text-slate-500'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px] font-bold ${
                    activeItem ? 'bg-cyan-500 text-black' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {slotIdx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  {activeItem ? (
                    <>
                      <p className="font-semibold truncate text-cyan-200">{activeItem.title}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {activeItem.progress.toFixed(1)}% • {activeItem.quality}
                      </p>
                    </>
                  ) : (
                    <p className="text-[11px] italic">Idle Slot</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Queued Downloads Table / List */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Pending Queue Order
        </h2>

        {queuedDownloads.length === 0 ? (
          <div className="p-10 border border-dashed border-slate-800 rounded-xl text-center space-y-2 bg-slate-900/20">
            <Clock className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-300">Queue is currently empty</p>
            <p className="text-[11px] text-slate-500">
              When all active download slots are busy, new downloads automatically wait here.
            </p>
            <button
              onClick={onOpenAddModal}
              className="mt-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg text-xs font-medium border border-slate-700 cursor-pointer"
            >
              Add URL to Queue
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {queuedDownloads.map((item, idx) => (
              <div
                key={item.id}
                className="p-3 bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center justify-between gap-3 transition-colors"
              >
                {/* Index & Media Info */}
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center font-mono text-xs font-bold text-slate-400 shrink-0">
                    #{idx + 1}
                  </div>

                  <div className="w-12 h-9 bg-slate-800 rounded overflow-hidden shrink-0 relative flex items-center justify-center border border-slate-700">
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : item.format === 'mp3' ? (
                      <Music className="w-4 h-4 text-slate-500" />
                    ) : (
                      <Film className="w-4 h-4 text-slate-500" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-xs font-semibold text-slate-100 truncate max-w-md">
                      {item.title}
                    </h3>
                    <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                      <span className="truncate">{item.uploader}</span>
                      <span>•</span>
                      <span className="font-mono text-cyan-400">{item.quality}</span>
                      <span>•</span>
                      <span className="uppercase font-mono">{item.format}</span>
                    </div>
                  </div>
                </div>

                {/* Reorder and action buttons */}
                <div className="flex items-center space-x-1.5 shrink-0">
                  {/* Move Up */}
                  <button
                    disabled={idx === 0}
                    onClick={() => moveQueueItem(idx, 'up')}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer"
                    title="Move up in priority"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  {/* Move Down */}
                  <button
                    disabled={idx === queuedDownloads.length - 1}
                    onClick={() => moveQueueItem(idx, 'down')}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer"
                    title="Move down in priority"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Force Start */}
                  <button
                    onClick={() => onResume(item.id)}
                    className="px-2 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium flex items-center space-x-1 transition-colors cursor-pointer"
                    title="Start immediately"
                  >
                    <Play className="w-3 h-3" />
                    <span className="hidden sm:inline">Start</span>
                  </button>

                  {/* Remove from Queue */}
                  <button
                    onClick={() => onCancel(item.id)}
                    className="p-1.5 rounded hover:bg-rose-950/60 text-slate-500 hover:text-rose-300 transition-colors cursor-pointer"
                    title="Remove from queue"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
