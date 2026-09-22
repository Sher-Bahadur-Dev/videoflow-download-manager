import React, { useState } from 'react';
import { ListPlus, X, Loader2, Play } from 'lucide-react';

interface AddBatchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBatch: (urls: string[], format: string, quality: string) => Promise<void>;
}

export const AddBatchDialog: React.FC<AddBatchDialogProps> = ({
  isOpen,
  onClose,
  onAddBatch
}) => {
  const [urlsText, setUrlsText] = useState('');
  const [format, setFormat] = useState('mp4');
  const [quality, setQuality] = useState('Best Available');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const urls = urlsText
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (urls.length === 0) {
      setError('Please paste at least one valid URL.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onAddBatch(urls, format, quality);
      onClose();
      setUrlsText('');
    } catch (err: any) {
      setError(err.message || 'Batch queueing failed');
    } finally {
      setLoading(false);
    }
  };

  const urlCount = urlsText
    .split('\n')
    .map((u) => u.trim())
    .filter((u) => u.length > 0).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs font-sans">
      <div className="bg-[#121929] border border-slate-700 rounded-lg shadow-2xl w-full max-w-lg overflow-hidden flex flex-col text-xs text-slate-200">
        {/* Header */}
        <div className="h-9 bg-[#0b101c] px-3.5 flex items-center justify-between border-b border-slate-800 text-slate-300 select-none">
          <div className="flex items-center space-x-2">
            <ListPlus className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-slate-100 text-xs">Batch Download URLs</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[11px] text-slate-300">
              <label>Enter URLs (one per line):</label>
              <span className="text-slate-400 font-mono">{urlCount} links detected</span>
            </div>
            <textarea
              rows={7}
              required
              placeholder="https://www.youtube.com/watch?v=...&#10;https://www.youtube.com/watch?v=...&#10;https://example.com/video.mp4"
              value={urlsText}
              onChange={(e) => setUrlsText(e.target.value)}
              className="w-full bg-[#090d16] border border-slate-700 rounded p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono resize-none leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Quality:</label>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                className="w-full bg-[#121927] border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-cyan-500"
              >
                <option value="Best Available">Best Available</option>
                <option value="1080p">1080p FHD</option>
                <option value="720p">720p HD</option>
                <option value="480p">480p SD</option>
                <option value="audio only">Audio Only</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Format Container:</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full bg-[#121927] border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-cyan-500"
              >
                <option value="mp4">MP4 Video</option>
                <option value="mkv">MKV Video</option>
                <option value="webm">WebM Video</option>
                <option value="mp3">MP3 Audio</option>
                <option value="m4a">M4A Audio</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="p-2 rounded bg-rose-950/50 border border-rose-800 text-rose-300 text-[11px]">
              {error}
            </div>
          )}

          <div className="h-10 -mx-4 -mb-4 mt-4 bg-[#090d16] px-4 flex items-center justify-end space-x-2 border-t border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || urlCount === 0}
              className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium flex items-center space-x-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>Queue {urlCount} Downloads</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
