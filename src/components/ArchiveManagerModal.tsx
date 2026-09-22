import React, { useState, useEffect } from 'react';
import {
  Archive,
  X,
  FileArchive,
  Download,
  Check,
  AlertCircle,
  Folder,
  Layers,
  FileCheck,
  Trash2,
  FolderOpen
} from 'lucide-react';
import { DownloadItem } from '../types';
import { formatBytes, formatExactKiloBytes, getCategory } from '../utils';

interface ArchiveManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  downloads: DownloadItem[];
  selectedIds: Set<string>;
  onRefreshDownloads: () => Promise<void>;
  initialTab?: 'compress' | 'extract' | 'inspect';
  targetArchiveItem?: DownloadItem | null;
}

export const ArchiveManagerModal: React.FC<ArchiveManagerModalProps> = ({
  isOpen,
  onClose,
  downloads,
  selectedIds,
  onRefreshDownloads,
  initialTab = 'compress',
  targetArchiveItem = null
}) => {
  const [tab, setTab] = useState<'compress' | 'extract' | 'inspect'>(initialTab);
  const [archiveName, setArchiveName] = useState('MyArchive');
  const [compressionLevel, setCompressionLevel] = useState<number>(6);
  const [selectedForZip, setSelectedForZip] = useState<Set<string>>(new Set());
  const [selectedArchiveForExtract, setSelectedArchiveForExtract] = useState<string>('');
  const [deleteSource, setDeleteSource] = useState(false);
  const [inspectEntries, setInspectEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Initialize selected files
  useEffect(() => {
    if (isOpen) {
      if (targetArchiveItem) {
        setSelectedArchiveForExtract(targetArchiveItem.id);
        setTab('extract');
        handleInspect(targetArchiveItem.id);
      } else if (selectedIds.size > 0) {
        setSelectedForZip(new Set(selectedIds));
        setTab('compress');
      } else {
        // default select first 2 completed downloads
        const completed = downloads.filter((d) => d.status === 'COMPLETED');
        if (completed.length > 0) {
          setSelectedForZip(new Set([completed[0].id]));
        }
      }
      setStatusMessage(null);
    }
  }, [isOpen, targetArchiveItem, selectedIds]);

  if (!isOpen) return null;

  // Completed files that can be compressed
  const completedDownloads = downloads.filter((d) => d.status === 'COMPLETED');

  // Archive files that can be extracted or inspected
  const archiveDownloads = downloads.filter(
    (d) =>
      d.status === 'COMPLETED' &&
      (d.isCompressedArchive ||
        getCategory(d) === 'compressed' ||
        ['zip', 'rar', '7z', 'tar', 'gz'].includes(d.format?.toLowerCase() || ''))
  );

  const toggleSelectForZip = (id: string) => {
    setSelectedForZip((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCompress = async () => {
    if (selectedForZip.size === 0) {
      setStatusMessage({ type: 'error', text: 'Select at least one completed file to compress' });
      return;
    }
    try {
      setLoading(true);
      setStatusMessage(null);
      const res = await fetch('/api/archive/compress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileIds: Array.from(selectedForZip),
          archiveName: archiveName.trim() || 'MyArchive',
          level: compressionLevel
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Compression failed');

      await onRefreshDownloads();
      setStatusMessage({
        type: 'success',
        text: `Created ${data.item.title} (${formatExactKiloBytes(data.size)}) containing ${data.fileCount} files!`
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleExtract = async () => {
    if (!selectedArchiveForExtract) {
      setStatusMessage({ type: 'error', text: 'Select an archive file to extract' });
      return;
    }
    try {
      setLoading(true);
      setStatusMessage(null);
      const res = await fetch('/api/archive/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: selectedArchiveForExtract,
          deleteSource
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Extraction failed');

      await onRefreshDownloads();
      setStatusMessage({
        type: 'success',
        text: `Extracted ${data.entryCount} items to: ${data.extractedTo}`
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleInspect = async (id?: string) => {
    const fileId = id || selectedArchiveForExtract;
    if (!fileId) return;
    try {
      setLoading(true);
      const res = await fetch('/api/archive/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Inspection failed');
      setInspectEntries(data.entries || []);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs font-sans">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-100 max-h-[85vh]">
        {/* Header */}
        <div className="h-10 bg-[#0b1120] px-4 flex items-center justify-between border-b border-slate-800 text-slate-200 select-none">
          <div className="flex items-center space-x-2">
            <Archive className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-sm text-slate-100">
              Free Download Manager — Archive Manager
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-[#0a0f1d] px-4 pt-2 gap-2">
          <button
            onClick={() => {
              setTab('compress');
              setStatusMessage(null);
            }}
            className={`px-3 py-1.5 rounded-t font-medium text-xs transition-colors cursor-pointer flex items-center space-x-1.5 ${
              tab === 'compress'
                ? 'bg-[#0f172a] text-cyan-300 border-t-2 border-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileArchive className="w-3.5 h-3.5" />
            <span>Create ZIP Archive</span>
          </button>

          <button
            onClick={() => {
              setTab('extract');
              setStatusMessage(null);
            }}
            className={`px-3 py-1.5 rounded-t font-medium text-xs transition-colors cursor-pointer flex items-center space-x-1.5 ${
              tab === 'extract'
                ? 'bg-[#0f172a] text-cyan-300 border-t-2 border-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Extract Archive</span>
          </button>

          <button
            onClick={() => {
              setTab('inspect');
              setStatusMessage(null);
              if (selectedArchiveForExtract) handleInspect(selectedArchiveForExtract);
            }}
            className={`px-3 py-1.5 rounded-t font-medium text-xs transition-colors cursor-pointer flex items-center space-x-1.5 ${
              tab === 'inspect'
                ? 'bg-[#0f172a] text-cyan-300 border-t-2 border-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Inspect Contents</span>
          </button>
        </div>

        {/* Body content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-2.5 rounded text-xs flex items-center space-x-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/40 border border-emerald-700/60 text-emerald-300'
                  : 'bg-rose-950/40 border border-rose-700/60 text-rose-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* TAB 1: COMPRESS */}
          {tab === 'compress' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Archive File Name
                  </label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={archiveName}
                      onChange={(e) => setArchiveName(e.target.value)}
                      placeholder="MyArchive"
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-l text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                    <span className="px-2.5 py-1.5 bg-slate-800 border border-l-0 border-slate-700 rounded-r text-slate-400 text-xs font-mono">
                      .zip
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Compression Level
                  </label>
                  <select
                    value={compressionLevel}
                    onChange={(e) => setCompressionLevel(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100 focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value={1}>1 - Fastest (Minimal Compression)</option>
                    <option value={4}>4 - Fast</option>
                    <option value={6}>6 - Normal (Balanced Recommended)</option>
                    <option value={9}>9 - Maximum (Smallest Size)</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-semibold text-slate-300">
                    Select Completed Files to Bundle ({selectedForZip.size} selected)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedForZip.size === completedDownloads.length) {
                        setSelectedForZip(new Set());
                      } else {
                        setSelectedForZip(new Set(completedDownloads.map((d) => d.id)));
                      }
                    }}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                  >
                    {selectedForZip.size === completedDownloads.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-800 rounded bg-[#090d16] p-1 divide-y divide-slate-800/60">
                  {completedDownloads.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-xs">
                      No completed downloads available to compress
                    </div>
                  ) : (
                    completedDownloads.map((d) => {
                      const isChecked = selectedForZip.has(d.id);
                      return (
                        <label
                          key={d.id}
                          className={`flex items-center space-x-2.5 p-2 rounded hover:bg-slate-800/40 transition-colors cursor-pointer select-none ${
                            isChecked ? 'bg-cyan-950/20' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectForZip(d.id)}
                            className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-200 font-medium truncate">{d.title}</p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {formatExactKiloBytes(d.downloadedBytes)} • {d.format}
                            </p>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EXTRACT */}
          {tab === 'extract' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Choose Archive to Extract
                </label>
                <select
                  value={selectedArchiveForExtract}
                  onChange={(e) => {
                    setSelectedArchiveForExtract(e.target.value);
                    handleInspect(e.target.value);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="">-- Choose an archive file --</option>
                  {archiveDownloads.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} ({formatExactKiloBytes(d.downloadedBytes)})
                    </option>
                  ))}
                </select>
                {archiveDownloads.length === 0 && (
                  <p className="text-[10px] text-amber-400 mt-1">
                    No completed archive files (.zip, .tar, .gz) found in downloads.
                  </p>
                )}
              </div>

              <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 space-y-2">
                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deleteSource}
                    onChange={(e) => setDeleteSource(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-rose-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>Delete source archive file after successful extraction</span>
                </label>
                <p className="text-[10px] text-slate-400">
                  Files will be extracted into a dedicated subfolder inside your primary download directory.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: INSPECT */}
          {tab === 'inspect' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-300">
                  Archive File Listing (Preview without Extracting)
                </span>
                <button
                  onClick={() => handleInspect()}
                  disabled={!selectedArchiveForExtract || loading}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer disabled:text-slate-600"
                >
                  Refresh Listing
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto border border-slate-800 rounded bg-[#090d16] font-mono text-[11px] divide-y divide-slate-800/60">
                {inspectEntries.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-xs">
                    {selectedArchiveForExtract
                      ? 'No entries or archive not yet inspected'
                      : 'Select an archive file from the Extract tab first'}
                  </div>
                ) : (
                  inspectEntries.map((e, idx) => (
                    <div key={idx} className="p-1.5 flex items-center justify-between hover:bg-slate-800/40">
                      <span className="truncate text-slate-200">
                        {e.isDirectory ? '📁 ' : '📄 '}
                        {e.name}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                        {e.isDirectory ? 'DIR' : formatExactKiloBytes(e.size)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-12 bg-[#090d16] px-4 flex items-center justify-between border-t border-slate-800 shrink-0">
          <div className="text-[10px] text-slate-400 font-mono">
            Pure native streaming engine (zero external API keys)
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
            >
              Close
            </button>

            {tab === 'compress' && (
              <button
                disabled={loading || selectedForZip.size === 0}
                onClick={handleCompress}
                className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-xs shadow-sm transition-colors cursor-pointer flex items-center space-x-1.5"
              >
                <FileArchive className="w-3.5 h-3.5" />
                <span>{loading ? 'Compressing...' : 'Create ZIP'}</span>
              </button>
            )}

            {tab === 'extract' && (
              <button
                disabled={loading || !selectedArchiveForExtract}
                onClick={handleExtract}
                className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-xs shadow-sm transition-colors cursor-pointer flex items-center space-x-1.5"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>{loading ? 'Extracting...' : 'Extract All'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
