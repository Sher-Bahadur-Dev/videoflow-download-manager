import React, { useState } from 'react';
import {
  Music,
  X,
  Download,
  Check,
  AlertCircle,
  Headphones,
  Sliders,
  Radio,
  FileAudio
} from 'lucide-react';

interface AudioExtractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAudioQueued: () => void;
  initialUrl?: string;
  initialTitle?: string;
}

export const AudioExtractorModal: React.FC<AudioExtractorModalProps> = ({
  isOpen,
  onClose,
  onAudioQueued,
  initialUrl = '',
  initialTitle = ''
}) => {
  const [url, setUrl] = useState(initialUrl);
  const [title, setTitle] = useState(initialTitle);
  const [format, setFormat] = useState<'mp3' | 'm4a' | 'flac' | 'wav' | 'aac' | 'ogg'>('mp3');
  const [quality, setQuality] = useState('320 kbps (High Fidelity)');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      if (initialUrl) setUrl(initialUrl);
      if (initialTitle) setTitle(initialTitle);
      setError(null);
    }
  }, [isOpen, initialUrl, initialTitle]);

  if (!isOpen) return null;

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Please provide a video or audio stream URL');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/audio/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          title: title.trim() || undefined,
          format,
          quality
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Audio extraction request failed');

      onAudioQueued();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs font-sans">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-lg shadow-2xl w-full max-w-lg overflow-hidden flex flex-col text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="h-10 bg-[#0b1120] px-4 flex items-center justify-between border-b border-slate-800 text-slate-200 select-none">
          <div className="flex items-center space-x-2">
            <Headphones className="w-4 h-4 text-purple-400" />
            <span className="font-semibold text-sm text-slate-100">
              Free Download Manager — Audio Extractor
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleExtract} className="p-4 space-y-3.5">
          {error && (
            <div className="p-2.5 rounded bg-rose-950/40 border border-rose-700/60 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Source Video / Audio Stream URL
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... or direct media link"
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Custom Title (Optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Symphony No. 5 In C Minor"
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Output Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100 focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="mp3">MP3 (Universal Compatibility)</option>
                <option value="m4a">M4A / AAC (Apple & Mobile)</option>
                <option value="flac">FLAC (Lossless Studio Audio)</option>
                <option value="wav">WAV (Uncompressed PCM)</option>
                <option value="ogg">OGG (Vorbis Audio)</option>
                <option value="aac">Raw AAC</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Audio Bitrate / Quality
              </label>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100 focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="320 kbps (High Fidelity)">320 kbps (High Fidelity)</option>
                <option value="256 kbps (Standard)">256 kbps (Standard)</option>
                <option value="192 kbps (Medium VBR)">192 kbps (Medium VBR)</option>
                <option value="128 kbps (Compact)">128 kbps (Compact)</option>
              </select>
            </div>
          </div>

          <div className="p-2.5 bg-slate-900/60 rounded border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center space-x-1.5 text-purple-300 font-medium">
              <Radio className="w-3.5 h-3.5 text-purple-400" />
              <span>Smart Audio Demuxer</span>
            </div>
            <p>
              Extracts high-fidelity audio directly from the stream without downloading unnecessary video packets, saving bandwidth and disk space.
            </p>
          </div>

          {/* Footer actions */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-sm transition-colors cursor-pointer flex items-center space-x-1.5 disabled:bg-slate-800 disabled:text-slate-500"
            >
              <Music className="w-3.5 h-3.5" />
              <span>{loading ? 'Queuing Audio...' : 'Start Audio Download'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
