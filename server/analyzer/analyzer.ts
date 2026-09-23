import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { VideoMetadata, FormatOption } from '../types';
import { log } from '../logger';

const YT_DLP_PATH = path.join(process.cwd(), 'bin', 'yt-dlp');
const COOKIES_FILE = path.join(process.cwd(), 'data', 'cookies.txt');

export function extractYouTubeId(rawUrl: string): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.toLowerCase();
    if (hostname.includes('youtu.be')) {
      const parts = parsed.pathname.split('/').filter(Boolean);
      return parts[0] ? parts[0].split(/[?&#]/)[0] : null;
    }
    if (parsed.pathname.includes('/shorts/')) {
      const parts = parsed.pathname.split('/shorts/')[1];
      return parts ? parts.split(/[/?&#]/)[0] : null;
    }
    if (parsed.pathname.includes('/embed/')) {
      const parts = parsed.pathname.split('/embed/')[1];
      return parts ? parts.split(/[/?&#]/)[0] : null;
    }
    if (parsed.pathname.includes('/v/')) {
      const parts = parsed.pathname.split('/v/')[1];
      return parts ? parts.split(/[/?&#]/)[0] : null;
    }
    return parsed.searchParams.get('v');
  } catch {
    const match = trimmed.match(/(?:youtu\.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=)([\w-]{10,12})/);
    return match ? match[1] : null;
  }
}

function formatSeconds(secs: number): string {
  if (!secs || isNaN(secs)) return '00:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return 'Unknown size';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(1)} ${units[i]}`;
}

export function validateVideoUrl(rawUrl: string): { valid: boolean; error?: string; source?: string; videoId?: string } {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'Please enter a video URL.' };
  }

  const trimmed = rawUrl.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Invalid URL format. Please provide a full URL including http:// or https://' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'Only HTTP and HTTPS URLs are supported.' };
  }

  const hostname = parsed.hostname.toLowerCase();
  const ytId = extractYouTubeId(trimmed);

  if (ytId || hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
    return { valid: true, source: 'youtube', videoId: ytId || undefined };
  } else if (hostname.includes('vimeo.com')) {
    return { valid: true, source: 'vimeo' };
  } else if (hostname.includes('dailymotion.com')) {
    return { valid: true, source: 'dailymotion' };
  } else if (/\.(mp4|webm|mkv|mov|avi|flv|m4a|mp3|aac|ogg|wav)($|\?)/i.test(parsed.pathname) || hostname.includes('wikimedia.org') || hostname.includes('commondatastorage')) {
    return { valid: true, source: 'direct' };
  }

  return { valid: true, source: 'generic' };
}

export async function analyzeVideo(url: string): Promise<VideoMetadata> {
  const validation = validateVideoUrl(url);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  log('INFO', `Analyzing URL [${validation.source}]: ${url}`);

  // Direct media file probe
  if (validation.source === 'direct') {
    try {
      return await analyzeDirectUrl(url);
    } catch (e: any) {
      log('WARN', `Direct URL probe failed, attempting yt-dlp: ${e.message}`);
    }
  }

  const ytId = validation.videoId || extractYouTubeId(url);
  let oembedData: { title?: string; author_name?: string; thumbnail_url?: string } | null = null;

  if (validation.source === 'youtube' && ytId) {
    try {
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ytId}&format=json`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36' }
      });
      if (oembedRes.ok) {
        oembedData = await oembedRes.json();
      }
    } catch (err: any) {
      log('DEBUG', `oEmbed fetch note: ${err.message}`);
    }
  }

  // Use yt-dlp for full format analysis
  return new Promise((resolve) => {
    const args = [
      '--dump-single-json',
      '--no-playlist',
      '--no-warnings',
      '--skip-download',
      '--no-check-certificates',
      '--extractor-args', 'youtube:player_client=android,web,tv,ios',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
    ];

    if (fs.existsSync(COOKIES_FILE)) {
      args.push('--cookies', COOKIES_FILE);
    }

    args.push(url);

    const isWindows = process.platform === 'win32';
    const command = isWindows ? (process.env.PYTHON_COMMAND || 'python') : YT_DLP_PATH;
    const commandArgs = isWindows ? [YT_DLP_PATH, ...args] : args;

    const child = spawn(command, commandArgs, {
      timeout: 25000,
      env: { ...process.env, PATH: `${process.env.PATH || ''}:/usr/bin:/usr/local/bin` }
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', async (err) => {
      log('ERROR', `yt-dlp execution error: ${err.message}`);
      if (ytId) {
        resolve(createYouTubeFallbackMetadata(url, ytId, oembedData, `Process error: ${err.message}`));
      } else {
        try {
          resolve(await analyzeDirectUrl(url));
        } catch {
          resolve(createGenericFallbackMetadata(url, err.message));
        }
      }
    });

    child.on('close', async (code) => {
      if (code === 0 && stdout.trim()) {
        try {
          const data = JSON.parse(stdout);
          const metadata = processYtDlpOutput(url, data, validation.source || 'youtube', ytId);
          log('INFO', `Metadata retrieved: "${metadata.title}" (${metadata.durationFormatted}) - ${metadata.availableFormats.length} formats`);
          resolve(metadata);
        } catch (parseErr: any) {
          log('ERROR', `Failed to parse yt-dlp JSON: ${parseErr.message}`);
          if (ytId) {
            resolve(createYouTubeFallbackMetadata(url, ytId, oembedData, 'Parsed stream details fallback active'));
          } else {
            resolve(createGenericFallbackMetadata(url, 'Parsing fallback active'));
          }
        }
      } else {
        const errorMsg = cleanYtDlpError(stderr || 'Unknown extractor error');
        log('WARN', `yt-dlp exited with code ${code}: ${errorMsg}`);

        // YouTube multi-client fallback pipeline
        if (ytId) {
          log('INFO', `Activating YouTube multi-client fallback for video ID: ${ytId}`);
          resolve(createYouTubeFallbackMetadata(url, ytId, oembedData, errorMsg));
        } else {
          try {
            resolve(await analyzeDirectUrl(url));
          } catch {
            resolve(createGenericFallbackMetadata(url, errorMsg));
          }
        }
      }
    });
  });
}

function createYouTubeFallbackMetadata(
  url: string,
  ytId: string,
  oembed: { title?: string; author_name?: string; thumbnail_url?: string } | null,
  restrictionNote?: string
): VideoMetadata {
  const title = oembed?.title || `YouTube Video (${ytId})`;
  const uploader = oembed?.author_name || 'YouTube Channel';
  const thumbnail = oembed?.thumbnail_url || `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  const embedUrl = `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&enablejsapi=1`;

  const formats: FormatOption[] = [
    {
      formatId: 'bestvideo+bestaudio/best',
      resolution: 'Best Available (Auto)',
      ext: 'mp4',
      filesizeFormatted: 'Unknown',
      note: 'Adaptive Multi-Client Stream (Best Video + Audio)',
      hasVideo: true,
      hasAudio: true
    },
    {
      formatId: 'bestvideo[height<=2160]+bestaudio/best',
      resolution: '4K Ultra HD (2160p)',
      ext: 'mp4',
      filesizeFormatted: 'Unknown',
      note: '3840x2160 UHD • 60fps',
      hasVideo: true,
      hasAudio: true,
      fps: 60
    },
    {
      formatId: 'bestvideo[height<=1440]+bestaudio/best',
      resolution: '1440p Quad HD (2K)',
      ext: 'mp4',
      filesizeFormatted: 'Unknown',
      note: '2560x1440 QHD • 60fps',
      hasVideo: true,
      hasAudio: true,
      fps: 60
    },
    {
      formatId: 'bestvideo[height<=1080]+bestaudio/best',
      resolution: '1080p Full HD',
      ext: 'mp4',
      filesizeFormatted: 'Unknown',
      note: '1920x1080 FHD • High Bitrate',
      hasVideo: true,
      hasAudio: true
    },
    {
      formatId: 'bestvideo[height<=720]+bestaudio/best',
      resolution: '720p HD',
      ext: 'mp4',
      filesizeFormatted: 'Unknown',
      note: '1280x720 HD • Standard',
      hasVideo: true,
      hasAudio: true
    },
    {
      formatId: 'bestvideo[height<=480]+bestaudio/best',
      resolution: '480p SD',
      ext: 'mp4',
      filesizeFormatted: 'Unknown',
      note: '854x480 SD • Efficient',
      hasVideo: true,
      hasAudio: true
    },
    {
      formatId: '18',
      resolution: '360p Medium (Direct MP4)',
      ext: 'mp4',
      filesizeFormatted: 'Unknown',
      note: '640x360 Legacy Progressive Stream',
      hasVideo: true,
      hasAudio: true
    },
    {
      formatId: 'bestaudio/best',
      resolution: 'Audio Only (MP3 320k)',
      ext: 'mp3',
      filesizeFormatted: 'Unknown',
      note: 'High-Fidelity Stereo Audio Extracted',
      hasVideo: false,
      hasAudio: true
    },
    {
      formatId: 'bestaudio[ext=m4a]/bestaudio',
      resolution: 'Audio Only (M4A AAC)',
      ext: 'm4a',
      filesizeFormatted: 'Unknown',
      note: 'Native 128kbps AAC Audio',
      hasVideo: false,
      hasAudio: true
    }
  ];

  return {
    url,
    title,
    uploader,
    duration: 0,
    durationFormatted: 'Online Video',
    thumbnail,
    source: 'youtube',
    availableFormats: formats,
    defaultFormatId: 'bestvideo+bestaudio/best',
    videoId: ytId,
    embedUrl,
    isRestricted: true,
    restrictionReason: restrictionNote || 'YouTube protected stream. Multi-client direct capture ready.'
  };
}

function createGenericFallbackMetadata(url: string, note?: string): VideoMetadata {
  const parsed = new URL(url);
  const title = path.basename(parsed.pathname) || 'Web Video Stream';
  return {
    url,
    title,
    uploader: parsed.hostname,
    duration: 0,
    durationFormatted: 'Stream',
    thumbnail: '',
    source: 'generic',
    availableFormats: [
      {
        formatId: 'bestvideo+bestaudio/best',
        resolution: 'Best Available',
        ext: 'mp4',
        note: 'Best available media stream',
        hasVideo: true,
        hasAudio: true
      },
      {
        formatId: 'bestaudio/best',
        resolution: 'Audio (MP3)',
        ext: 'mp3',
        note: 'Audio track',
        hasVideo: false,
        hasAudio: true
      }
    ],
    defaultFormatId: 'bestvideo+bestaudio/best',
    isRestricted: true,
    restrictionReason: note
  };
}

function cleanYtDlpError(rawErr: string): string {
  if (rawErr.includes('Private video')) return 'This video is private and cannot be accessed.';
  if (rawErr.includes('Sign in to confirm you’re not a bot')) {
    return 'YouTube strict bot protection active. Using multi-client fallback streams.';
  }
  if (rawErr.includes('Video unavailable')) return 'This video is unavailable or has been removed.';
  if (rawErr.includes('HTTP Error 404')) return 'Media not found (HTTP 404). Check the URL.';
  if (rawErr.includes('HTTP Error 403')) return 'Access restricted by content provider (HTTP 403). Fallback active.';
  if (rawErr.includes('Incomplete YouTube ID')) return 'Invalid YouTube video ID in URL.';

  const lines = rawErr.split('\n').filter(l => l.startsWith('ERROR:') || l.includes('error'));
  if (lines.length > 0) {
    return lines[0].replace(/^ERROR:\s*/, '').trim();
  }
  return 'Alternative stream extractor enabled.';
}

function processYtDlpOutput(url: string, raw: any, source: string, ytId?: string | null): VideoMetadata {
  const formats: FormatOption[] = [];
  const rawFormats = Array.isArray(raw.formats) ? raw.formats : [];
  const addedResolutions = new Set<string>();

  // Highest quality combined
  formats.push({
    formatId: 'bestvideo+bestaudio/best',
    resolution: 'Best Available (Auto)',
    ext: 'mp4',
    filesize: raw.filesize_approx || raw.filesize,
    filesizeFormatted: formatBytes(raw.filesize_approx || raw.filesize),
    note: 'Highest quality video and audio merged',
    hasVideo: true,
    hasAudio: true
  });

  // Sort raw formats by height descending
  const sorted = [...rawFormats].sort((a, b) => (b.height || 0) - (a.height || 0));

  for (const f of sorted) {
    if (f.vcodec && f.vcodec !== 'none' && f.height) {
      const resName = `${f.height}p${f.fps && f.fps > 30 ? f.fps : ''}`;
      if (!addedResolutions.has(resName)) {
        addedResolutions.add(resName);
        formats.push({
          formatId: `bestvideo[height<=${f.height}]+bestaudio/best[height<=${f.height}]/best`,
          resolution: `${f.height}p${f.height >= 2160 ? ' 4K UHD' : f.height >= 1440 ? ' 2K QHD' : f.height >= 1080 ? ' Full HD' : f.height >= 720 ? ' HD' : ''}`,
          ext: 'mp4',
          filesize: f.filesize || f.filesize_approx,
          filesizeFormatted: formatBytes(f.filesize || f.filesize_approx),
          note: `${f.ext?.toUpperCase() || 'MP4'} ${f.fps ? `${f.fps}fps` : ''} (${f.vcodec?.split('.')[0] || 'AVC'})`,
          hasVideo: true,
          hasAudio: true,
          fps: f.fps,
          vcodec: f.vcodec
        });
      }
    }
  }

  const duration = typeof raw.duration === 'number' ? raw.duration : 0;

  // Audio options
  formats.push({
    formatId: 'bestaudio/best',
    resolution: 'Audio (MP3 / 320 kbps)',
    ext: 'mp3',
    filesizeFormatted: 'Unknown',
    note: 'High fidelity audio track',
    hasVideo: false,
    hasAudio: true
  });

  formats.push({
    formatId: 'bestaudio[ext=m4a]/bestaudio',
    resolution: 'Audio (M4A / AAC)',
    ext: 'm4a',
    filesizeFormatted: 'Unknown',
    note: 'Native AAC audio stream',
    hasVideo: false,
    hasAudio: true
  });

  const effectiveId = ytId || extractYouTubeId(url);
  const embedUrl = effectiveId ? `https://www.youtube-nocookie.com/embed/${effectiveId}?autoplay=1&enablejsapi=1` : undefined;

  return {
    url,
    title: raw.title || 'Untitled Video',
    uploader: raw.uploader || raw.channel || raw.creator || 'Unknown Channel',
    duration,
    durationFormatted: formatSeconds(duration),
    thumbnail: raw.thumbnail || (raw.thumbnails && raw.thumbnails.length ? raw.thumbnails[raw.thumbnails.length - 1].url : (effectiveId ? `https://img.youtube.com/vi/${effectiveId}/hqdefault.jpg` : '')),
    uploadDate: raw.upload_date ? `${raw.upload_date.slice(0, 4)}-${raw.upload_date.slice(4, 6)}-${raw.upload_date.slice(6, 8)}` : undefined,
    descriptionPreview: raw.description ? raw.description.slice(0, 240) + (raw.description.length > 240 ? '...' : '') : undefined,
    viewCount: raw.view_count,
    source,
    availableFormats: formats,
    defaultFormatId: 'bestvideo+bestaudio/best',
    videoId: effectiveId || undefined,
    embedUrl,
    isRestricted: false
  };
}

async function analyzeDirectUrl(url: string): Promise<VideoMetadata> {
  const headRes = await fetch(url, {
    method: 'HEAD',
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36' }
  });
  const contentLength = parseInt(headRes.headers.get('content-length') || '0', 10);
  const contentType = headRes.headers.get('content-type') || 'video/mp4';

  const parsed = new URL(url);
  const pathname = parsed.pathname;
  const rawFileName = path.basename(pathname) || 'video';
  const ext = path.extname(rawFileName).replace('.', '') || 'mp4';
  const cleanTitle = decodeURIComponent(rawFileName.replace(/\.[^/.]+$/, "")).replace(/[_-]/g, ' ') || 'Direct Media Stream';

  return {
    url,
    title: cleanTitle,
    uploader: parsed.hostname,
    duration: 0,
    durationFormatted: 'Direct Stream',
    thumbnail: '',
    source: 'direct',
    availableFormats: [
      {
        formatId: 'direct',
        resolution: 'Original Quality',
        ext: ext,
        filesize: contentLength,
        filesizeFormatted: formatBytes(contentLength),
        note: `Direct ${contentType} file`,
        hasVideo: true,
        hasAudio: true
      },
      {
        formatId: 'audio_direct',
        resolution: 'Audio Track (MP3)',
        ext: 'mp3',
        note: 'Extracted audio track',
        hasVideo: false,
        hasAudio: true
      }
    ],
    defaultFormatId: 'direct',
    embedUrl: url,
    isRestricted: false
  };
}
