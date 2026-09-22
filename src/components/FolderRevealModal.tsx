import React, { useState } from 'react';
import { X, FolderOpen, Copy, Check, HardDrive, FileText, CheckCircle2 } from 'lucide-react';
import { formatBytes } from '../utils';

interface RevealInfo {
  outputPath: string;
  directory: string;
  fileName: string;
  exists: boolean;
  size: number;
  status: string;
}

interface FolderRevealModalProps {
  info: RevealInfo | null;
  onClose: () => void;
}

export const FolderRevealModal: React.FC<FolderRevealModalProps> = ({ info, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!info) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(info.outputPath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">File Storage Location</h3>
              <p className="text-xs text-slate-400">Local disk location and destination structure</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* File Name Card */}
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="flex items-center space-x-1">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span>File Name</span>
              </span>
              {info.exists && (
                <span className="flex items-center space-x-1 text-emerald-400 text-[10px]">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Verified on disk</span>
                </span>
              )}
            </div>
            <p className="font-semibold text-slate-100 text-xs break-all">{info.fileName}</p>
          </div>

          {/* Directory */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-400">Folder Directory</label>
            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg font-mono text-[11px] text-slate-300 break-all">
              {info.directory}
            </div>
          </div>

          {/* Full Path with Copy Button */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-400">Absolute File Path</label>
            <div className="flex items-center space-x-2">
              <div className="flex-1 p-2.5 bg-slate-950 border border-slate-800 rounded-lg font-mono text-[11px] text-cyan-300 break-all select-all">
                {info.outputPath}
              </div>
              <button
                onClick={handleCopy}
                className="px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center space-x-1 transition-colors cursor-pointer shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Disk Status */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-0.5">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">File Size</span>
              <p className="text-xs font-mono font-bold text-slate-200">{formatBytes(info.size)}</p>
            </div>

            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-0.5">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Status</span>
              <p className="text-xs font-mono font-bold text-cyan-400">{info.status}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
