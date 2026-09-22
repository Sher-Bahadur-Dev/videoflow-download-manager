import React from 'react';
import { Download, X, ExternalLink, ShieldCheck } from 'lucide-react';

interface AboutDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutDialog: React.FC<AboutDialogProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs font-sans">
      <div className="bg-[#121929] border border-slate-700 rounded-lg shadow-2xl w-full max-w-md overflow-hidden flex flex-col text-xs text-slate-200">
        <div className="h-9 bg-[#0b101c] px-3.5 flex items-center justify-between border-b border-slate-800 text-slate-300 select-none">
          <div className="flex items-center space-x-2">
            <Download className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-slate-100 text-xs">About Free Download Manager</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 mx-auto flex items-center justify-center shadow-lg shadow-cyan-900/30">
            <Download className="w-6 h-6 text-white stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-100">Free Download Manager</h3>
            <p className="text-[11px] text-cyan-400 font-mono mt-0.5">Version 6.22 (IDM Turbo Edition)</p>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed max-w-sm mx-auto">
            High-speed multi-threaded download orchestrator with 8-connection segmentation, instant audio demuxing, integrated archive compression (.zip), and real-time KB progress recording.
          </p>

          <div className="p-2.5 bg-slate-900/90 rounded border border-slate-800 text-left space-y-1 text-[10px] font-mono text-slate-400">
            <div className="flex justify-between">
              <span>Acceleration Engine:</span>
              <span className="text-slate-300">IDM 8-Thread Multi-Segment Pipeline</span>
            </div>
            <div className="flex justify-between">
              <span>Streaming Demuxer:</span>
              <span className="text-slate-300">yt-dlp Native Streaming + Archiver</span>
            </div>
            <div className="flex justify-between">
              <span>Progress Resolution:</span>
              <span className="text-slate-300">High-Precision Per-KB Live Ledger</span>
            </div>
            <div className="flex justify-between">
              <span>Archive Engine:</span>
              <span className="text-slate-300">ZIP Compression (Archiver) & Extraction (AdmZip)</span>
            </div>
          </div>
        </div>

        <div className="h-10 bg-[#090d16] px-4 flex items-center justify-end border-t border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
