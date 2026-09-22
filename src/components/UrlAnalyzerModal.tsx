import React, { useState } from 'react';
import {
  X,
  Search,
  Film,
  Music,
  Check,
  AlertCircle,
  Clock,
  User,
    Play,
  Download,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { VideoMetadata, FormatOption } from '../types';

interface UrlAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDownload: (item: {
    url: string;
    title: string;
    uploader: string;
    thumbnail: string;
    quality: string;
    format: string;
    formatId?: string;
  }) => Promise<void>;
}

const SAMPLE_URLS = [
  {
    name: 'MDN Flower CC0 Video (1.1 MB)',
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    type: 'Direct MP4'
  },
  {
    name: 'W3Schools BBB Clip (0.8 MB)',
    url: 'https://www.w3schools.com/html/mov_bbb.mp4',
    type: 'Direct MP4'
  },
  {
    name: 'Blender Foundation Short (YouTube)',
    url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    type: 'YouTube Video'
  }
];

export const UrlAnalyzerModal: React.FC<UrlAnalyzerModalProps> = ({
  isOpen,
  onClose,
  onAddDownload
}) => {
  const [url, setUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);

  // Format selection state
  const [selectedQuality, setSelectedQuality] = useState<string>('Best Available');
  const [selectedFormat, setSelectedFormat] = useState<string>('mp4');
  const [selectedFormatId, setSelectedFormatId] = useState<string>('bestvideo+bestaudio/best');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAnalyze = async (targetUrl?: string) => {
    const toAnalyze = (targetUrl || url).trim();
    if (!toAnalyze) {
      setError('Please enter a valid video URL.');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setMetadata(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: toAnalyze })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze video URL');
      }

      setMetadata(data);
      if (data.availableFormats && data.availableFormats.length > 0) {
        const first = data.availableFormats[0];
        setSelectedQuality(first.resolution);
        setSelectedFormat(first.ext || 'mp4');
        setSelectedFormatId(first.formatId);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while analyzing the URL');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSelectFormat = (fmt: FormatOption) => {
    setSelectedQuality(fmt.resolution);
    setSelectedFormat(fmt.ext);
    setSelectedFormatId(fmt.formatId);
  };

  const handleSubmit = async () => {
    if (!metadata) return;
    setSubmitting(true);
    try {
      await onAddDownload({
        url: metadata.url,
        title: metadata.title,
        uploader: metadata.uploader,
        thumbnail: metadata.thumbnail,
        quality: selectedQuality,
        format: selectedFormat,
        formatId: selectedFormatId
      });
      onClose();
      // Reset
      setUrl('');
      setMetadata(null);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to queue download');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Add New Download</h2>
              <p className="text-xs text-slate-400">Paste a supported video or audio URL to analyze</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Input & Get Info Bar */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Video URL</label>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <input
                  id="input-video-url"
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                  placeholder="https://www.youtube.com/watch?v=... or direct MP4 URL"
                  className="w-full px-3 py-2 pl-9 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
              </div>
              <button
                id="btn-analyze-url"
                onClick={() => handleAnalyze()}
                disabled={analyzing || !url.trim()}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-medium rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Reading link...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Analyze</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick sample URLs for zero-effort testing */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-500 font-medium">Quick Test:</span>
            {SAMPLE_URLS.map((sample) => (
              <button
                key={sample.name}
                onClick={() => {
                  setUrl(sample.url);
                  handleAnalyze(sample.url);
                }}
                className="text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700/60 transition-colors cursor-pointer"
              >
                {sample.name}
              </button>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-lg flex items-start space-x-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-200">Link Error</p>
                <p className="text-slate-300 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Loading Skeleton */}
          {analyzing && (
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-3 animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-24 h-16 bg-slate-800 rounded-md"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-800 rounded w-1/2"></div>
                </div>
              </div>
              <div className="h-10 bg-slate-800 rounded"></div>
            </div>
          )}

          {/* Get Infod Media Preview */}
          {metadata && !analyzing && (
            <div className="space-y-4 pt-1">
              {/* Media Card */}
              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg flex space-x-3">
                <div className="w-28 h-20 bg-slate-800 rounded-md overflow-hidden shrink-0 relative flex items-center justify-center border border-slate-700/60">
                  {metadata.thumbnail ? (
                    <img
                      src={metadata.thumbnail}
                      alt={metadata.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Film className="w-8 h-8 text-slate-600" />
                  )}
                  {metadata.durationFormatted && (
                    <span className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/80 rounded text-[9px] font-mono text-white">
                      {metadata.durationFormatted}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-semibold text-slate-100 truncate" title={metadata.title}>
                    {metadata.title}
                  </h3>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-1">
                    <span className="flex items-center space-x-1">
                      <User className="w-3 h-3 text-slate-500" />
                      <span className="truncate">{metadata.uploader}</span>
                    </span>
                    <span>•</span>
                    <span className="capitalize px-1.5 py-0.2 rounded bg-slate-800 text-cyan-400 text-[10px] font-medium border border-slate-700">
                      {metadata.source}
                    </span>
                  </div>

                  {metadata.descriptionPreview && (
                    <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                      {metadata.descriptionPreview}
                    </p>
                  )}
                </div>
              </div>

              {/* Format & Quality Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Select Video Quality & Format
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {metadata.availableFormats.map((fmt, idx) => {
                    const isSelected = selectedQuality === fmt.resolution && selectedFormat === fmt.ext;
                    return (
                      <button
                        key={`${fmt.formatId}-${idx}`}
                        type="button"
                        onClick={() => handleSelectFormat(fmt)}
                        className={`p-2.5 rounded-lg border text-left flex items-start justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-950/40 border-cyan-500/80 ring-1 ring-cyan-500/50 text-slate-100'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5">
                            {fmt.hasVideo ? (
                              <Film className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            ) : (
                              <Music className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            )}
                            <span className="text-xs font-semibold text-slate-200">
                              {fmt.resolution}
                            </span>
                            <span className="text-[10px] uppercase font-mono px-1 py-0.2 bg-slate-800 rounded text-slate-400 border border-slate-700">
                              {fmt.ext}
                            </span>
                          </div>
                          {fmt.note && (
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate">{fmt.note}</p>
                          )}
                        </div>

                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-2.5 h-2.5 text-black" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/40 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>

          <button
            id="btn-add-to-queue"
            disabled={!metadata || submitting}
            onClick={handleSubmit}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:from-cyan-600 active:to-blue-700 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-md shadow-cyan-900/20 transition-all cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Queueing...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Add to Download Queue</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
