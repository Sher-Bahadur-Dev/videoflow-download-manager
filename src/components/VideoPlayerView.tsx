import React, { useState, useEffect } from 'react';
import {
  Play,
  Download,
  Film,
  Music,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Tv,
  CheckCircle2,
  RefreshCw,
  Bookmark,
  Share2,
  Info,
  Maximize2
} from 'lucide-react';
import { VideoMetadata, FormatOption, DownloadItem } from '../types';
import { IdmVideoBar } from './IdmVideoBar';

interface VideoPlayerViewProps {
  onQueueDownload: (item: Partial<DownloadItem>) => Promise<void>;
  initialUrl?: string;
}

const SAMPLE_VIDEOS = [
  {
    name: 'YouTube: Never Gonna Give You Up',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    tag: 'YouTube Music'
  },
  {
    name: 'YouTube: Big Buck Bunny (Blender)',
    url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    tag: 'YouTube 4K'
  },
  {
    name: 'Direct Stream: MDN CC0 Flower',
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    tag: 'Direct MP4'
  },
  {
    name: 'Direct Stream: Big Buck Bunny (HTML5)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    tag: 'Progressive Stream'
  }
];

export const VideoPlayerView: React.FC<VideoPlayerViewProps> = ({
  onQueueDownload,
  initialUrl = ''
}) => {
  const [inputUrl, setInputUrl] = useState(initialUrl || SAMPLE_VIDEOS[0].url);
  const [activeUrl, setActiveUrl] = useState(initialUrl || SAMPLE_VIDEOS[0].url);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [barPosition, setBarPosition] = useState<'top-right' | 'top-left' | 'bottom-right' | 'side-right'>('top-right');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeViewMode, setActiveViewMode] = useState<'embed' | 'direct' | 'cinema'>('embed');

  // Trigger analysis whenever activeUrl changes
  useEffect(() => {
    if (activeUrl) {
      handleAnalyzeUrl(activeUrl);
    }
  }, [activeUrl]);

  const handleAnalyzeUrl = async (urlToAnalyze: string) => {
    if (!urlToAnalyze.trim()) return;
    setIsAnalyzing(true);
    setError(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlToAnalyze.trim() })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to inspect media stream');
      }

      const data: VideoMetadata = await res.json();
      setMetadata(data);
    } catch (err: any) {
      setError(err.message || 'Stream analyzer error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.startsWith('http')) {
        setInputUrl(text);
        setActiveUrl(text);
      }
    } catch {
      // clipboard read failed or not permitted
    }
  };

  const handleDownloadFormat = async (format: FormatOption, meta: VideoMetadata) => {
    try {
      await onQueueDownload({
        url: meta.url,
        title: meta.title,
        uploader: meta.uploader,
        thumbnail: meta.thumbnail,
        quality: format.resolution,
        format: format.ext,
        formatId: format.formatId
      });
      setToastMessage(`Added "${meta.title} (${format.resolution})" to Download Queue`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      alert(`Could not start download: ${err.message}`);
    }
  };

  // Generate bookmarklet code for real browser integration
  const bookmarkletCode = `javascript:(function(){var u=window.location.href;window.open('${window.location.origin}/?grab='+encodeURIComponent(u),'_blank');})();`;

  // Determine player embed source
  const isDirectVideo = activeUrl.endsWith('.mp4') || activeUrl.endsWith('.webm') || activeUrl.includes('googleusercontent') || metadata?.source === 'direct';
  const embedSrc = metadata?.embedUrl || (metadata?.videoId ? `https://www.youtube-nocookie.com/embed/${metadata.videoId}?autoplay=1&enablejsapi=1` : activeUrl);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#0a0f1d] text-slate-200 font-sans select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg bg-cyan-950/90 border border-cyan-400 text-cyan-200 text-xs font-semibold shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Search & Stream Sniffer Bar */}
      <div className="p-3 bg-[#0d1424] border-b border-slate-800 shrink-0">
        <div className="max-w-6xl mx-auto space-y-2">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setActiveUrl(inputUrl);
                }}
                placeholder="Paste any YouTube URL, shorts, Vimeo, or direct media stream..."
                className="w-full px-3.5 py-2 pl-9 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
              />
              <Tv className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            <button
              onClick={handlePasteClipboard}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors cursor-pointer"
              title="Paste from clipboard"
            >
              Paste
            </button>

            <button
              onClick={() => setActiveUrl(inputUrl)}
              disabled={isAnalyzing}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sniffing...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sniff & Play</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Preset Sample Chips */}
          <div className="flex items-center space-x-1.5 overflow-x-auto text-[11px] py-0.5 text-slate-400">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
              Try Samples:
            </span>
            {SAMPLE_VIDEOS.map((s, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInputUrl(s.url);
                  setActiveUrl(s.url);
                }}
                className={`px-2 py-0.5 rounded border text-[11px] whitespace-nowrap transition-colors cursor-pointer ${
                  activeUrl === s.url
                    ? 'bg-cyan-950/70 border-cyan-500/60 text-cyan-200'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Workspace */}
      <div className="flex-1 p-4 max-w-6xl mx-auto w-full flex flex-col lg:flex-row gap-4 overflow-hidden">
        {/* Left Column: Video Viewport with Floating IDM Bar */}
        <div className="flex-1 flex flex-col space-y-3 min-w-0">
          {/* Video Player Box with Attached IDM Bar */}
          <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center group">
            {/* The Floating IDM Download Bar */}
            <IdmVideoBar
              metadata={metadata}
              isLoading={isAnalyzing}
              onDownloadFormat={handleDownloadFormat}
              position={barPosition}
              onPositionChange={setBarPosition}
            />

            {/* Video Element or YouTube Embed */}
            {isDirectVideo ? (
              <video
                key={activeUrl}
                src={activeUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            ) : embedSrc ? (
              <iframe
                key={embedSrc}
                src={embedSrc}
                title="Video Stream"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full border-0"
              />
            ) : (
              <div className="text-center p-6 space-y-3">
                <Tv className="w-12 h-12 text-slate-600 mx-auto" />
                <p className="text-sm text-slate-400">Enter a video URL to stream and capture formats</p>
              </div>
            )}
          </div>

          {/* Under Player Stream Badges & Position Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
            <div className="flex items-center space-x-2">
              <span className="flex items-center space-x-1.5 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>IDM Stream Sniffer Active</span>
              </span>

              {metadata?.isRestricted ? (
                <span className="flex items-center space-x-1.5 px-2 py-1 rounded bg-amber-950/70 border border-amber-600/50 text-amber-200 text-[11px]">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>YouTube Fallback Mode</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1.5 px-2 py-1 rounded bg-emerald-950/70 border border-emerald-600/50 text-emerald-200 text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>YouTube Stream Verified</span>
                </span>
              )}
            </div>

            <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
              <span>Bar Position:</span>
              <button
                onClick={() => setBarPosition('top-right')}
                className={`px-1.5 py-0.5 rounded cursor-pointer ${
                  barPosition === 'top-right' ? 'bg-cyan-600 text-white' : 'hover:bg-slate-800'
                }`}
              >
                Top-Right
              </button>
              <button
                onClick={() => setBarPosition('top-left')}
                className={`px-1.5 py-0.5 rounded cursor-pointer ${
                  barPosition === 'top-left' ? 'bg-cyan-600 text-white' : 'hover:bg-slate-800'
                }`}
              >
                Top-Left
              </button>
              <button
                onClick={() => setBarPosition('bottom-right')}
                className={`px-1.5 py-0.5 rounded cursor-pointer ${
                  barPosition === 'bottom-right' ? 'bg-cyan-600 text-white' : 'hover:bg-slate-800'
                }`}
              >
                Bottom-Right
              </button>
            </div>
          </div>

          {/* Error Banner if any */}
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Formats Table (Full View) */}
          {metadata && (
            <div className="bg-[#0e1628] rounded-xl border border-slate-800/80 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Film className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-semibold text-slate-100 text-xs">
                    All YouTube Allowed Formats ({metadata.availableFormats.length})
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400">
                  Click any row to download instantly
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {metadata.availableFormats.map((fmt) => (
                  <div
                    key={fmt.formatId}
                    className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/60 transition-all flex items-center justify-between group"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-semibold text-slate-200 text-xs truncate">
                          {fmt.resolution}
                        </span>
                        <span className="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-mono uppercase">
                          {fmt.ext}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                        {fmt.filesizeFormatted || '~Auto size'} • {fmt.note || 'Direct stream'}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownloadFormat(fmt, metadata)}
                      className="px-2.5 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white text-xs font-medium flex items-center space-x-1 cursor-pointer transition-colors shadow-xs shrink-0"
                    >
                      <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Download</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Video Details & IDM Browser Helper */}
        <div className="w-full lg:w-80 shrink-0 space-y-3 flex flex-col">
          {/* Metadata Card */}
          <div className="bg-[#0e1628] rounded-xl border border-slate-800/80 p-4 space-y-3">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              <span>Media Stream Info</span>
            </h4>

            {metadata ? (
              <div className="space-y-2 text-xs">
                {metadata.thumbnail && (
                  <img
                    src={metadata.thumbnail}
                    alt={metadata.title}
                    className="w-full h-32 object-cover rounded-lg border border-slate-800 shadow-md"
                  />
                )}
                <div>
                  <h3 className="font-bold text-slate-100 text-sm line-clamp-2" title={metadata.title}>
                    {metadata.title}
                  </h3>
                  <p className="text-cyan-400 text-xs mt-0.5">{metadata.uploader}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">DURATION</span>
                    <span className="font-mono text-slate-200">{metadata.durationFormatted}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">SOURCE</span>
                    <span className="capitalize text-slate-200">{metadata.source}</span>
                  </div>
                  {metadata.viewCount !== undefined && (
                    <div>
                      <span className="text-slate-400 block text-[10px]">VIEWS</span>
                      <span className="font-mono text-slate-200">
                        {metadata.viewCount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {metadata.uploadDate && (
                    <div>
                      <span className="text-slate-400 block text-[10px]">PUBLISHED</span>
                      <span className="font-mono text-slate-200">{metadata.uploadDate}</span>
                    </div>
                  )}
                </div>

                {metadata.descriptionPreview && (
                  <p className="text-[11px] text-slate-400 italic line-clamp-3 pt-2 border-t border-slate-800/60">
                    "{metadata.descriptionPreview}"
                  </p>
                )}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs">
                Stream details will appear here once analyzed.
              </div>
            )}
          </div>

          {/* Quick 1-Click Action Card */}
          {metadata && (
            <div className="bg-[#0e1628] rounded-xl border border-slate-800/80 p-3 space-y-2">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Quick 1-Click Actions
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  onClick={() => {
                    const best = metadata.availableFormats.find(f => f.hasVideo) || metadata.availableFormats[0];
                    if (best) handleDownloadFormat(best, metadata);
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Best Video (1080p)</span>
                </button>

                <button
                  onClick={() => {
                    const audio = metadata.availableFormats.find(f => !f.hasVideo && f.hasAudio) || metadata.availableFormats[0];
                    if (audio) handleDownloadFormat(audio, metadata);
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-sm"
                >
                  <Music className="w-4 h-4" />
                  <span>Download Audio (MP3 320k)</span>
                </button>
              </div>
            </div>
          )}

          {/* IDM Browser Integration Helper Card */}
          <div className="bg-gradient-to-br from-[#0c1626] to-[#0a1120] rounded-xl border border-cyan-500/30 p-4 space-y-2.5 shadow-lg">
            <div className="flex items-center space-x-2 text-cyan-300">
              <Bookmark className="w-4 h-4" />
              <h4 className="text-xs font-bold tracking-tight">IDM Browser Bookmarklet</h4>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Drag this button to your browser bookmarks bar. While viewing any YouTube video in Chrome, Firefox, or Edge, click it to instantly send the video to VideoFlow with the IDM Bar!
            </p>

            <div className="pt-1">
              <a
                href={bookmarkletCode}
                onClick={(e) => {
                  // Prevent immediate navigation if clicked
                  e.preventDefault();
                  alert('Drag this button to your browser bookmarks bar (Ctrl+Shift+B to show bookmarks bar).');
                }}
                className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-md cursor-grab active:cursor-grabbing border border-cyan-400/40"
                title="Drag to your Bookmarks Bar"
              >
                <Download className="w-3.5 h-3.5" />
                <span>⚡ Drag: Download with VideoFlow</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
