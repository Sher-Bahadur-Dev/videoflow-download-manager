import React, { useState, useEffect } from 'react';
import { DownloadItem } from '../types';
import { formatBytes, formatDate } from '../utils';
import {
  Info,
  X,
  FileVideo,
  Folder,
  Copy,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Hash,
  Check
} from 'lucide-react';

interface PropertiesDialogProps {
  item: DownloadItem | null;
  onClose: () => void;
  onOpenFile: (item: DownloadItem) => void;
  onOpenFolder: (item: DownloadItem) => void;
  initialTab?: 'general' | 'integrity';
}

export const PropertiesDialog: React.FC<PropertiesDialogProps> = ({
  item,
  onClose,
  onOpenFile,
  onOpenFolder,
  initialTab = 'general'
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'integrity'>(initialTab);
  const [selectedAlgo, setSelectedAlgo] = useState<'md5' | 'sha256' | 'sha1'>('sha256');
  const [calculatedHash, setCalculatedHash] = useState<string | null>(null);
  const [isHashing, setIsHashing] = useState<boolean>(false);
  const [hashError, setHashError] = useState<string | null>(null);
  const [expectedHash, setExpectedHash] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
    setCalculatedHash(null);
    setHashError(null);
    setExpectedHash('');
  }, [item?.id, initialTab]);

  if (!item) return null;

  const isCompleted = item.status === 'COMPLETED';

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const handleComputeChecksum = async (algo: 'md5' | 'sha256' | 'sha1' = selectedAlgo) => {
    if (!item.id || !isCompleted) return;

    setIsHashing(true);
    setHashError(null);
    try {
      const res = await fetch(`/api/downloads/${item.id}/checksum?algo=${algo}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to calculate checksum');
      }
      setCalculatedHash(data.hash);
    } catch (err: any) {
      setHashError(err.message || 'Error computing hash');
      setCalculatedHash(null);
    } finally {
      setIsHashing(false);
    }
  };

  const cleanExpected = expectedHash.trim().toLowerCase();
  const cleanCalculated = (calculatedHash || '').trim().toLowerCase();
  const isMatch = cleanExpected.length > 0 && cleanCalculated.length > 0 && cleanExpected === cleanCalculated;
  const isMismatch = cleanExpected.length > 0 && cleanCalculated.length > 0 && cleanExpected !== cleanCalculated;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs font-sans select-none">
      <div className="bg-[#121929] border border-slate-700 rounded-lg shadow-2xl w-full max-w-lg overflow-hidden flex flex-col text-xs text-slate-200">
        {/* Header */}
        <div className="h-9 bg-[#0b101c] px-3.5 flex items-center justify-between border-b border-slate-800 text-slate-300">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-slate-100 text-xs">Download Properties</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-[#0e1422] px-4 pt-2 gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`pb-2 px-2 text-xs font-medium border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'general'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>General Details</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('integrity');
              if (!calculatedHash && isCompleted && !isHashing) {
                handleComputeChecksum(selectedAlgo);
              }
            }}
            className={`pb-2 px-2 text-xs font-medium border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'integrity'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>File Integrity & Checksum</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 space-y-3 max-h-[75vh] overflow-y-auto">
          {/* Top File Summary Card */}
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
              <h3 className="font-semibold text-slate-100 text-sm truncate" title={item.title}>
                {item.title}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate" title={item.fileName || '--'}>
                {item.fileName || '--'}
              </p>
              <div className="flex items-center space-x-2 mt-1">
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-medium uppercase font-mono ${
                    isCompleted
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/80'
                      : 'bg-cyan-950 text-cyan-300 border border-cyan-800/80'
                  }`}
                >
                  {item.status}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {formatBytes(item.totalBytes || item.downloadedBytes)}
                </span>
              </div>
            </div>
          </div>

          {/* TAB 1: GENERAL PROPERTIES */}
          {activeTab === 'general' && (
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between items-center text-[11px] text-slate-400">
                  <span>Source URL:</span>
                  <button
                    onClick={() => copyToClipboard(item.url, 'url')}
                    className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 text-[10px] cursor-pointer"
                  >
                    {copiedKey === 'url' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'url' ? 'Copied' : 'Copy Download URL'}</span>
                  </button>
                </div>
                <div className="font-mono text-[11px] text-slate-300 bg-slate-900/80 p-1.5 rounded border border-slate-800 break-all select-all mt-0.5 max-h-16 overflow-y-auto">
                  {item.url}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
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
                  <span className="text-[11px] text-slate-400 block">Active Connections:</span>
                  <span className="font-mono text-cyan-300">
                    {item.connectionsCount || (item.status === 'DOWNLOADING' ? 8 : 1)} multi-thread streams
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Format / Container:</span>
                  <span className="font-mono text-slate-200 uppercase">{item.format || 'MP4'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Quality Preset:</span>
                  <span className="font-mono text-slate-200">{item.quality || 'Auto / Best'}</span>
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
                      onClick={() => copyToClipboard(item.outputPath!, 'path')}
                      className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 text-[10px] cursor-pointer"
                    >
                      {copiedKey === 'path' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'path' ? 'Copied' : 'Copy Path'}</span>
                    </button>
                  )}
                </div>
                <div className="font-mono text-[11px] text-slate-300 bg-slate-900/80 p-1.5 rounded border border-slate-800 break-all select-all mt-0.5">
                  {item.outputPath || 'In transit / Not yet finalized'}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FILE INTEGRITY & CHECKSUM VERIFICATION */}
          {activeTab === 'integrity' && (
            <div className="space-y-3.5 text-xs">
              {!isCompleted ? (
                <div className="p-3 bg-amber-950/30 border border-amber-800/60 rounded text-amber-300 flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Download in Progress</span>
                    <span className="text-[11px] text-slate-300">
                      File integrity checksum calculation requires a completed download file on disk. Please wait until the download finishes.
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  {/* Algorithm selection and calculate button */}
                  <div className="bg-[#0b101d] border border-slate-800 rounded p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-medium text-slate-300 flex items-center space-x-1.5">
                        <Hash className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Select Hash Algorithm:</span>
                      </label>
                      <button
                        onClick={() => handleComputeChecksum(selectedAlgo)}
                        disabled={isHashing}
                        className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium flex items-center space-x-1 text-[11px] transition-colors disabled:opacity-40 cursor-pointer shadow-xs"
                      >
                        <RotateCw className={`w-3 h-3 ${isHashing ? 'animate-spin' : ''}`} />
                        <span>{isHashing ? 'Calculating...' : 'Calculate Checksum'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {(['sha256', 'md5', 'sha1'] as const).map((algo) => (
                        <button
                          key={algo}
                          type="button"
                          onClick={() => {
                            setSelectedAlgo(algo);
                            handleComputeChecksum(algo);
                          }}
                          className={`py-1.5 px-2 rounded border text-center transition-all cursor-pointer font-mono text-[11px] ${
                            selectedAlgo === algo
                              ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 font-semibold shadow-xs'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          {algo.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Calculated Checksum Output */}
                  <div>
                    <div className="flex justify-between items-center text-[11px] text-slate-400 mb-1">
                      <span>Calculated {selectedAlgo.toUpperCase()} Checksum:</span>
                      {calculatedHash && (
                        <button
                          onClick={() => copyToClipboard(calculatedHash, 'hash')}
                          className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 text-[10px] cursor-pointer"
                        >
                          {copiedKey === 'hash' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey === 'hash' ? 'Copied' : 'Copy Hash'}</span>
                        </button>
                      )}
                    </div>

                    <div className="font-mono text-[11px] text-cyan-200 bg-[#070b13] p-2 rounded border border-slate-800 break-all select-all min-h-[38px] flex items-center">
                      {isHashing ? (
                        <span className="text-slate-500 flex items-center space-x-1.5">
                          <RotateCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                          <span>Streaming file bytes and generating {selectedAlgo.toUpperCase()} digest...</span>
                        </span>
                      ) : calculatedHash ? (
                        calculatedHash
                      ) : (
                        <span className="text-slate-500">Click &quot;Calculate Checksum&quot; above to verify file</span>
                      )}
                    </div>
                  </div>

                  {/* Expected Hash Compare Box */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] text-slate-300 block font-medium">
                      Compare with Expected Hash (from release / website):
                    </label>
                    <input
                      type="text"
                      placeholder={`Paste official ${selectedAlgo.toUpperCase()} hash here to verify...`}
                      value={expectedHash}
                      onChange={(e) => setExpectedHash(e.target.value)}
                      className="w-full bg-[#070b13] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                    />

                    {/* Comparison result banner */}
                    {isMatch && (
                      <div className="p-2 rounded bg-emerald-950/60 border border-emerald-600 text-emerald-200 text-[11px] flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <strong className="font-semibold block">Checksum Verified: Perfect Match!</strong>
                          <span className="text-[10px] text-emerald-300/90">
                            The downloaded file is authentic, complete, and has not been altered.
                          </span>
                        </div>
                      </div>
                    )}

                    {isMismatch && (
                      <div className="p-2 rounded bg-rose-950/60 border border-rose-600 text-rose-200 text-[11px] flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <div>
                          <strong className="font-semibold block">Hash Mismatch Detected!</strong>
                          <span className="text-[10px] text-rose-300/90">
                            The calculated checksum does not match the expected hash. The file may be corrupt or tampered with.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {hashError && (
                    <div className="p-2 rounded bg-rose-950/50 border border-rose-800 text-rose-300 text-[11px] flex items-center space-x-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{hashError}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="h-11 bg-[#090d16] px-4 flex items-center justify-between border-t border-slate-800 shrink-0">
          <div className="flex items-center space-x-2">
            <button
              disabled={!isCompleted}
              onClick={() => onOpenFile(item)}
              className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium flex items-center space-x-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <FileVideo className="w-3.5 h-3.5" />
              <span>Open File</span>
            </button>
            <button
              onClick={() => onOpenFolder(item)}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Folder className="w-3.5 h-3.5 text-cyan-400" />
              <span>Open Folder</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
