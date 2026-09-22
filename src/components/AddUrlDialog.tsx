import React, { useState } from 'react';
import {
  VideoMetadata,
  FormatOption
} from '../types';
import {
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Video,
  Music,
  Folder,
  X,
  Play
} from 'lucide-react';

interface AddUrlDialogProps {
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
  defaultDirectory?: string;
}

const SAMPLE_URLS = [
  {
    label: 'MDN CC0 Flower (Direct MP4)',
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    title: 'MDN CC0 Flower Video'
  },
  {
    label: 'Big Buck Bunny (Direct MP4)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    title: 'Big Buck Bunny'
  },
  {
    label: 'YouTube: Rick Astley - Never Gonna Give You Up (Official)',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    title: 'Rick Astley - Never Gonna Give You Up'
  }
];

export const AddUrlDialog: React.FC<AddUrlDialogProps> = ({
  isOpen,
  onClose,
  onAddDownload,
  defaultDirectory = 'downloads/'
}) => {
  const [url, setUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);

  const [selectedFormatId, setSelectedFormatId] = useState<string>('');
  const [selectedContainer, setSelectedContainer] = useState<string>('mp4');
  const [selectedQuality, setSelectedQuality] = useState<string>('Best Available');
  const [startImmediately, setStartImmediately] = useState<boolean>(true);
  const [adding, setAdding] = useState(false);

  if (!isOpen) return null;

const handleGetInfo = async () => {
    if (!trimmed) {
      setError('Please paste or type a media URL.');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setMetadata(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to inspect media URL.');
      }

      setMetadata(data);

      if (data.availableFormats && data.availableFormats.length > 0) {
        const first = data.availableFormats[0];
        setSelectedFormatId(first.formatId);
        setSelectedContainer(first.ext);
        setSelectedQuality(first.qualityLabel || first.resolution);
      } else {
        setSelectedFormatId('bestvideo+bestaudio/best');
        setSelectedContainer('mp4');
        setSelectedQuality('Best Available');
      }
    } catch (err: any) {
      setError(err.message || 'Media analyzer returned an error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFormatChange = (fmtId: string) => {
    setSelectedFormatId(fmtId);
    if (!metadata) return;
    const found = metadata.availableFormats.find((f) => f.formatId === fmtId);
    if (found) {
      setSelectedContainer(found.ext);
      setSelectedQuality(found.qualityLabel || found.resolution);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setAdding(true);
    setError(null);

    try {
      await onAddDownload({
        url: url.trim(),
        title: metadata?.title || 'Media Download',
        uploader: metadata?.uploader || 'Web Media',
        thumbnail: metadata?.thumbnail || '',
        quality: selectedQuality,
        format: selectedContainer,
        formatId: selectedFormatId || undefined
      });

      onClose();
      // Reset dialog state
      setUrl('');
      setMetadata(null);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Could not queue download');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center p-4 font-sans">
      <div className="bg-white border border-[#8b8b8b] rounded-sm shadow-2xl w-full max-w-xl overflow-hidden flex flex-col text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="h-9 bg-[#e9eef5] px-3.5 flex items-center justify-between border-b border-[#b9c2cc] text-[#1f2937] select-none">
          <div className="flex items-center space-x-2">
            <Video className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-[#111827] text-xs">Add New Download</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded text-[#4b5563] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-3.5 max-h-[82vh] overflow-y-auto">
          {/* Quick Presets */}
          <div className="flex items-center space-x-1 text-[11px] overflow-x-auto pb-1">
            <span className="text-[#4b5563] whitespace-nowrap">Presets:</span>
            {SAMPLE_URLS.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setUrl(sample.url)}
                className="px-2 py-0.5 rounded bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#374151] hover:text-[#0b5cab] text-[10px] whitespace-nowrap border border-[#9ca3af] transition-colors"
              >
                {sample.label}
              </button>
            ))}
          </div>

          {/* URL Input & Get Info Button */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-300">
              Media URL (YouTube, Vimeo, Direct Video/Audio):
            </label>
            <div className="flex space-x-2">
              <input
                type="url"
                required
                placeholder="https://www.youtube.com/watch?v=... or https://example.com/video.mp4"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleGetInfo();
                  }
                }}
                className="flex-1 bg-white border border-[#9ca3af] rounded px-2.5 py-1.5 text-xs text-[#111827] placeholder-[#6b7280] focus:outline-none focus:border-cyan-500 font-mono"
              />
              <button
                type="button"
                onClick={handleGetInfo}
                disabled={analyzing || !url.trim()}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-[#9ca3af] font-medium flex items-center space-x-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" /> : <Search className="w-3.5 h-3.5 text-cyan-400" />}
                <span>Get Info</span>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-2.5 rounded bg-[#fff1f2] border border-[#fda4af] text-[#9f1239] text-[11px] flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-[#e11d48] shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Metadata Preview if Get Infod */}
          {metadata && (
            <div className="p-3 bg-white border border-slate-800 rounded-lg space-y-3">
              <div className="flex space-x-3">
                {metadata.thumbnail ? (
                  <img
                    src={metadata.thumbnail}
                    alt={metadata.title}
                    className="w-24 h-16 object-cover rounded bg-slate-900 border border-slate-800 shrink-0"
                  />
                ) : (
                  <div className="w-24 h-16 rounded bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 shrink-0">
                    <Video className="w-6 h-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <h4 className="font-semibold text-[#111827] text-xs line-clamp-2">
                    {metadata.title}
                  </h4>
                  <div className="flex items-center space-x-3 text-[10px] text-[#4b5563]">
                    <span>{metadata.uploader}</span>
                    <span>•</span>
                    <span>{metadata.durationFormatted}</span>
                    <span>•</span>
                    <span className="uppercase text-cyan-400 font-mono">{metadata.source}</span>
                  </div>
                </div>
              </div>

              {/* Format & Quality Pickers */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                <div>
                  <label className="text-[11px] text-[#4b5563] block mb-1">Quality / Resolution:</label>
                  <select
                    value={selectedFormatId}
                    onChange={(e) => handleFormatChange(e.target.value)}
                    className="w-full bg-[#121927] border border-[#9ca3af] text-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-cyan-500"
                  >
                    {metadata.availableFormats && metadata.availableFormats.length > 0 ? (
                      metadata.availableFormats.map((fmt) => (
                        <option key={fmt.formatId} value={fmt.formatId}>
                          {fmt.qualityLabel || fmt.resolution} ({fmt.ext.toUpperCase()}) {fmt.filesizeFormatted ? `~${fmt.filesizeFormatted}` : ''}
                        </option>
                      ))
                    ) : (
                      <option value="bestvideo+bestaudio/best">Best Available Quality</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-[#4b5563] block mb-1">Format Container:</label>
                  <select
                    value={selectedContainer}
                    onChange={(e) => setSelectedContainer(e.target.value)}
                    className="w-full bg-[#121927] border border-[#9ca3af] text-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="mp4">MP4 Video</option>
                    <option value="webm">WebM Video</option>
                    <option value="mkv">MKV Video</option>
                    <option value="mp3">MP3 Audio</option>
                    <option value="m4a">M4A Audio</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Save Location & Preferences */}
          <div className="space-y-2 pt-1">
            <div>
              <label className="text-[11px] text-[#4b5563] block mb-1">Save to:</label>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-white border border-[#9ca3af] rounded px-2.5 py-1 text-[11px] font-mono text-slate-300 truncate">
                  {defaultDirectory}
                </div>
                <button
                  type="button"
                  onClick={() => alert(`Downloads are saved to: ${defaultDirectory}`)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-[#9ca3af] text-xs"
                >
                  Browse...
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="startImmediately"
                checked={startImmediately}
                onChange={(e) => setStartImmediately(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-slate-900 border-[#9ca3af] text-cyan-600 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="startImmediately" className="text-slate-300 text-xs cursor-pointer">
                Start downloading immediately
              </label>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="h-11 bg-white px-4 flex items-center justify-end space-x-2 border-t border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-[#9ca3af] font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={adding || !url.trim()}
            className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium flex items-center space-x-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {adding ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Add Download</span>
          </button>
        </div>
      </div>
    </div>
  );
};
