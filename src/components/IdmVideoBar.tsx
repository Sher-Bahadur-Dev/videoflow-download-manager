import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Film,
  Music,
  ChevronDown,
  Sparkles,
  CheckCircle,
  ExternalLink,
  ShieldAlert,
  Sliders,
  Volume2,
  Copy,
  Check
} from 'lucide-react';
import { VideoMetadata, FormatOption } from '../types';

interface IdmVideoBarProps {
  metadata: VideoMetadata | null;
  isLoading?: boolean;
  onDownloadFormat: (format: FormatOption, metadata: VideoMetadata) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'side-right';
  className?: string;
  onPositionChange?: (pos: 'top-right' | 'top-left' | 'bottom-right' | 'side-right') => void;
}

export const IdmVideoBar: React.FC<IdmVideoBarProps> = ({
  metadata,
  isLoading = false,
  onDownloadFormat,
  position = 'top-right',
  className = '',
  onPositionChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloadingFormatId, setDownloadingFormatId] = useState<string | null>(null);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectFormat = (format: FormatOption) => {
    if (!metadata) return;
    setDownloadingFormatId(format.formatId);
    onDownloadFormat(format, metadata);
    setDownloadSuccessToast(`Queued ${format.resolution} for download!`);

    setTimeout(() => {
      setDownloadingFormatId(null);
    }, 1500);

    setTimeout(() => {
      setDownloadSuccessToast(null);
    }, 3500);
  };

  const handleCopyUrl = () => {
    if (!metadata) return;
    navigator.clipboard.writeText(metadata.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formats = metadata?.availableFormats || [];
  const videoFormats = formats.filter(f => f.hasVideo);
  const audioFormats = formats.filter(f => !f.hasVideo && f.hasAudio);

  // Position classes
  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-3 left-3 items-start';
      case 'bottom-right':
        return 'bottom-4 right-4 items-end';
      case 'side-right':
        return 'top-1/2 -translate-y-1/2 right-3 items-end';
      case 'top-right':
      default:
        return 'top-3 right-3 items-end';
    }
  };

  const bestVideoFormat = videoFormats[0] || formats[0];

  return (
    <div
      ref={dropdownRef}
      className={`absolute z-30 flex flex-col pointer-events-auto select-none font-sans ${getPositionClasses()} ${className}`}
    >
      {/* Toast notification when download queued from IDM bar */}
      {downloadSuccessToast && (
        <div className="mb-2 px-3 py-1.5 rounded-lg bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 text-xs font-medium shadow-xl flex items-center space-x-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{downloadSuccessToast}</span>
        </div>
      )}

      {/* Main IDM Floating Button Bar */}
      <div className="flex items-center shadow-2xl rounded-md overflow-hidden border border-cyan-400/50 bg-gradient-to-r from-[#0d3b66] via-[#094074] to-[#002f5a] text-white hover:brightness-110 transition-all duration-150">
        {/* Left IDM Icon & Main Action */}
        <button
          onClick={() => {
            if (bestVideoFormat && metadata) {
              handleSelectFormat(bestVideoFormat);
            } else {
              setIsOpen(!isOpen);
            }
          }}
          className="flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer group"
          title="Download this video with VideoFlow IDM engine"
        >
          {/* Authentic IDM/XDM Style Badge */}
          <div className="relative flex items-center justify-center w-5 h-5 rounded-full bg-cyan-400 text-slate-950 shadow-sm shrink-0 font-bold text-[10px]">
            <Download className="w-3 h-3 stroke-[2.8]" />
            {isLoading && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </div>

          <div className="flex flex-col items-start leading-tight">
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] font-bold tracking-tight text-white drop-shadow-xs">
                DOWNLOAD THIS VIDEO
              </span>
              {metadata?.isRestricted && (
                <span
                  title="YouTube restricted stream detected. Fallback capture engine ready."
                  className="px-1 py-0.2 rounded text-[9px] bg-amber-500/30 text-amber-200 border border-amber-400/40 uppercase font-mono"
                >
                  Fallback
                </span>
              )}
            </div>
            <span className="text-[9px] text-cyan-200 font-normal">
              {isLoading
                ? 'Sniffing streams...'
                : metadata
                ? `${formats.length} formats available`
                : 'IDM Video Bar Ready'}
            </span>
          </div>
        </button>

        {/* Separator Line */}
        <div className="h-6 w-[1px] bg-cyan-400/30" />

        {/* Dropdown Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`px-2 py-2 hover:bg-white/15 active:bg-white/25 transition-colors cursor-pointer flex items-center justify-center ${
            isOpen ? 'bg-white/20' : ''
          }`}
          title="View all video and audio formats allowed by YouTube"
        >
          <ChevronDown
            className={`w-3.5 h-3.5 text-cyan-200 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* Dropdown Flyout Panel */}
      {isOpen && (
        <div
          className={`mt-1.5 w-80 sm:w-96 rounded-lg bg-[#0a1120]/95 backdrop-blur-md border border-cyan-500/40 shadow-2xl overflow-hidden flex flex-col text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[420px]`}
        >
          {/* Header */}
          <div className="px-3 py-2 bg-gradient-to-r from-slate-900 to-[#0e1d35] border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-semibold text-slate-100 text-[11px]">
                Available Formats & Streams
              </span>
            </div>
            <div className="flex items-center space-x-1">
              {onPositionChange && (
                <button
                  onClick={() => {
                    const next =
                      position === 'top-right'
                        ? 'top-left'
                        : position === 'top-left'
                        ? 'bottom-right'
                        : 'top-right';
                    onPositionChange(next);
                  }}
                  title="Cycle IDM bar position (Top-Right, Top-Left, Bottom-Right)"
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <Sliders className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={handleCopyUrl}
                title="Copy video URL"
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>

          {/* YouTube Restriction Notice if applicable */}
          {metadata?.isRestricted && (
            <div className="px-3 py-1.5 bg-amber-950/40 border-b border-amber-800/40 text-[10px] text-amber-200/90 flex items-start space-x-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-amber-300">YouTube Stream Protection: </span>
                <span>{metadata.restrictionReason || 'Standard direct access restricted. Multi-client direct capture ready in any view.'}</span>
              </div>
            </div>
          )}

          {/* Formats List */}
          <div className="overflow-y-auto divide-y divide-slate-800/60 flex-1 p-1">
            {/* Video Streams */}
            {videoFormats.length > 0 && (
              <div className="py-1">
                <div className="px-2 py-0.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                  <Film className="w-2.5 h-2.5 text-cyan-400" />
                  <span>Video Quality ({videoFormats.length})</span>
                </div>
                <div className="space-y-0.5 mt-0.5">
                  {videoFormats.map((fmt) => {
                    const isBusy = downloadingFormatId === fmt.formatId;
                    const is4kOr2k = fmt.resolution.includes('2160') || fmt.resolution.includes('1440') || fmt.resolution.includes('4K');
                    const isHD = fmt.resolution.includes('1080') || fmt.resolution.includes('720');

                    return (
                      <div
                        key={fmt.formatId}
                        className="group flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-slate-800/80 transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center space-x-1.5">
                            <span
                              className={`text-[11px] font-semibold truncate ${
                                is4kOr2k
                                  ? 'text-amber-300'
                                  : isHD
                                  ? 'text-cyan-300'
                                  : 'text-slate-200'
                              }`}
                            >
                              {fmt.resolution}
                            </span>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-mono uppercase">
                              {fmt.ext}
                            </span>
                            {fmt.fps && fmt.fps > 30 && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 font-mono">
                                {fmt.fps}fps
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center space-x-2 mt-0.5">
                            {fmt.filesizeFormatted && (
                              <span>{fmt.filesizeFormatted}</span>
                            )}
                            {fmt.note && (
                              <span className="text-slate-400 truncate max-w-[150px]">
                                {fmt.note}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleSelectFormat(fmt)}
                          disabled={isBusy}
                          className="shrink-0 px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-medium text-[11px] flex items-center space-x-1 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          {isBusy ? (
                            <Check className="w-3 h-3 text-white" />
                          ) : (
                            <Download className="w-3 h-3 stroke-[2.5]" />
                          )}
                          <span>{isBusy ? 'Queued' : 'Download'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Audio Streams */}
            {audioFormats.length > 0 && (
              <div className="py-1">
                <div className="px-2 py-0.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                  <Music className="w-2.5 h-2.5 text-purple-400" />
                  <span>Audio Only ({audioFormats.length})</span>
                </div>
                <div className="space-y-0.5 mt-0.5">
                  {audioFormats.map((fmt) => {
                    const isBusy = downloadingFormatId === fmt.formatId;
                    return (
                      <div
                        key={fmt.formatId}
                        className="group flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-slate-800/80 transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center space-x-1.5">
                            <Volume2 className="w-3 h-3 text-purple-400 shrink-0" />
                            <span className="text-[11px] font-semibold text-purple-200 truncate">
                              {fmt.resolution}
                            </span>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-purple-950 text-purple-300 font-mono uppercase">
                              {fmt.ext}
                            </span>
                          </div>
                          {fmt.filesizeFormatted && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {fmt.filesizeFormatted}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleSelectFormat(fmt)}
                          disabled={isBusy}
                          className="shrink-0 px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-medium text-[11px] flex items-center space-x-1 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          {isBusy ? (
                            <Check className="w-3 h-3 text-white" />
                          ) : (
                            <Download className="w-3 h-3 stroke-[2.5]" />
                          )}
                          <span>{isBusy ? 'Queued' : 'Download'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {formats.length === 0 && (
              <div className="p-4 text-center text-slate-400 text-xs">
                No streams detected yet. Paste a video URL to sniff formats.
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="px-3 py-1.5 bg-[#070d18] border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span className="truncate">
              {metadata?.title ? `Target: ${metadata.title}` : 'VideoFlow IDM Grabber'}
            </span>
            <button
              onClick={() => {
                if (bestVideoFormat && metadata) {
                  handleSelectFormat(bestVideoFormat);
                }
              }}
              className="text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer underline flex items-center space-x-1"
            >
              <span>Download Best</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
