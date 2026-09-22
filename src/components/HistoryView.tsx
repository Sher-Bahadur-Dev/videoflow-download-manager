import React, { useState } from 'react';
import {
  History,
  Search,
  FolderOpen,
  Film,
  Music,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Eye,
  Download
} from 'lucide-react';
import { DownloadItem } from '../types';
import { formatBytes, formatDate } from '../utils';

interface HistoryViewProps {
  downloads: DownloadItem[];
  onRetry: (id: string) => void;
  onDelete: (id: string, deleteFile?: boolean) => void;
  onRevealFolder: (id: string) => void;
  onPreviewFile: (item: DownloadItem) => void;
  onClearHistory: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  downloads,
  onRetry,
  onDelete,
  onRevealFolder,
  onPreviewFile,
  onClearHistory
}) => {
  const [filter, setFilter] = useState<'ALL' | 'COMPLETED' | 'FAILED' | 'CANCELLED'>('ALL');
  const [search, setSearch] = useState('');

  const historyItems = downloads.filter((item) => {
    if (item.status === 'DOWNLOADING' || item.status === 'QUEUED') return false;
    if (filter !== 'ALL' && item.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.uploader.toLowerCase().includes(q) ||
        (item.fileName && item.fileName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-100">Download History</h1>
          <p className="text-xs text-slate-400">Historical records of finished, failed, and aborted downloads</p>
        </div>

        {downloads.length > 0 && (
          <button
            onClick={onClearHistory}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/50 hover:text-rose-300 text-slate-400 text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Completed History</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/50 p-2 rounded-xl border border-slate-800">
        <div className="flex items-center space-x-1 w-full sm:w-auto">
          {(['ALL', 'COMPLETED', 'FAILED', 'CANCELLED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filter === st
                  ? 'bg-slate-800 text-cyan-400 border border-slate-700/80 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {st === 'ALL' ? 'All' : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search history..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>

      {/* History Table */}
      {historyItems.length === 0 ? (
        <div className="p-12 border border-dashed border-slate-800 rounded-2xl text-center space-y-2 bg-slate-900/20">
          <History className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-xs font-semibold text-slate-300">Your download history is empty.</p>
          <p className="text-[11px] text-slate-500">
            Finished downloads will be recorded here with metadata, file sizes, and quick open actions.
          </p>
        </div>
      ) : (
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase bg-slate-900/80 tracking-wider">
                  <th className="p-3 w-12"></th>
                  <th className="p-3">Title & Source</th>
                  <th className="p-3">Quality</th>
                  <th className="p-3">Format</th>
                  <th className="p-3">Size</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {historyItems.map((item) => {
                  const isCompleted = item.status === 'COMPLETED';
                  const isFailed = item.status === 'FAILED';

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Thumbnail */}
                      <td className="p-3">
                        <div className="w-10 h-8 bg-slate-800 rounded overflow-hidden flex items-center justify-center border border-slate-700 shrink-0">
                          {item.thumbnail ? (
                            <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                          ) : item.format === 'mp3' ? (
                            <Music className="w-3.5 h-3.5 text-slate-500" />
                          ) : (
                            <Film className="w-3.5 h-3.5 text-slate-500" />
                          )}
                        </div>
                      </td>

                      {/* Title & Uploader */}
                      <td className="p-3 max-w-xs">
                        <p className="font-medium text-slate-200 truncate" title={item.title}>
                          {item.title}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">{item.uploader}</p>
                      </td>

                      {/* Quality */}
                      <td className="p-3 font-mono text-cyan-400 text-[11px]">
                        {item.quality}
                      </td>

                      {/* Format */}
                      <td className="p-3">
                        <span className="uppercase font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {item.format}
                        </span>
                      </td>

                      {/* Size */}
                      <td className="p-3 font-mono text-slate-300 text-[11px]">
                        {formatBytes(item.totalBytes || item.downloadedBytes)}
                      </td>

                      {/* Date */}
                      <td className="p-3 text-slate-400 text-[11px]">
                        {formatDate(item.completedAt || item.createdAt)}
                      </td>

                      {/* Status Badge */}
                      <td className="p-3">
                        {isCompleted && (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>Done</span>
                          </span>
                        )}
                        {isFailed && (
                          <span
                            className="inline-flex items-center space-x-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            title={item.error}
                          >
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>Failed</span>
                          </span>
                        )}
                        {item.status === 'CANCELLED' && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                            Cancelled
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {isCompleted && (
                            <>
                              <button
                                onClick={() => onPreviewFile(item)}
                                className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                                title="Play file in app"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <a
                                href={`/api/downloads/${item.id}/file`}
                                download={item.fileName || 'video'}
                                className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors"
                                title="Download file to computer"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            </>
                          )}

                          {isFailed && (
                            <button
                              onClick={() => onRetry(item.id)}
                              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                              title="Retry download"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => onRevealFolder(item.id)}
                            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                            title="Reveal folder location on disk"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onDelete(item.id, isCompleted)}
                            className="p-1.5 rounded hover:bg-rose-950/60 text-slate-500 hover:text-rose-300 transition-colors cursor-pointer"
                            title="Remove record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
