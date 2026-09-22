import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { VideoMetadata, FormatOption } from '../types';
import { log } from '../logger';

const YT_DLP_PATH = path.join(process.cwd(), 'bin', 'yt-dlp');
const COOKIES_FILE = path.join(process.cwd(), 'data', 'cookies.txt');

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

export function validateVideoUrl(rawUrl: string): { valid: boolean; error?: string; source?: string } {
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

  if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
    return { valid: true, source: 'youtube' };
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

  // If YouTube, query official oEmbed metadata first for guaranteed high-fidelity title, channel, and thumbnail
  let oembedData: { title?: string; author_name?: string; thumbnail_url?: string } | null = null;
  if (validation.source === 'youtube') {
    try {
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) VideoFlow/1.0' }
      });
      if (oembedRes.ok) {
        oembedData = await oembedRes.json();
      }
    } catch (err: any) {
      log('DEBUG', `oEmbed fetch note: ${err.message}`);
    }
  }

  // Use yt-dlp for full format analysis
  return new Promise((resolve, reject) => {
    const args = [
      '--dump-single-json',
      '--no-playlist',
      '--no-warnings',
      '--skip-download',
      '--no-check-certificates',
      '--user-agent', 'VideoFlow/1.0 (Desktop Download Manager; https://videoflow.app)'
    ];

    if (fs.existsSync(COOKIES_FILE)) {
      args.push('--cookies', COOKIES_FILE);
    }

    args.push(url);

    // The bundled yt-dlp file is a Python script. On Windows, spawning it
    // directly causes ENOENT because the #!/usr/bin/env shebang is not an
    // executable association. Run it through Python instead.
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
      if (oembedData && oembedData.title) {
        resolve(createFallbackFromOembed(url, oembedData));
      } else {
        try {
          const directMeta = await analyzeDirectUrl(url);
          resolve(directMeta);
        } catch {
          reject(new Error(`Failed to inspect media: ${err.message}`));
        }
      }
    });

    child.on('close', async (code) => {
      if (code === 0 && stdout.trim()) {
        try {
          const data = JSON.parse(stdout);
          const metadata = processYtDlpOutput(url, data, validation.source || 'youtube');
          log('INFO', `Metadata retrieved: "${metadata.title}" (${metadata.durationFormatted})`);
          resolve(metadata);
        } catch (parseErr: any) {
          log('ERROR', `Failed to parse yt-dlp JSON: ${parseErr.message}`);
          if (oembedData && oembedData.title) {
            resolve(createFallbackFromOembed(url, oembedData));
          } else {
            reject(new Error('Failed to parse video information from server response.'));
          }
        }
      } else {
        const errorMsg = cleanYtDlpError(stderr || 'Unknown extractor error');
        log('WARN', `yt-dlp exited with code ${code}: ${errorMsg}`);

        // If we have oEmbed data, construct a reliable metadata object with standard available tiers
        if (oembedData && oembedData.title) {
          log('INFO', `Using verified oEmbed metadata for: "${oembedData.title}"`);
          resolve(createFallbackFromOembed(url, oembedData));
        } else {
          try {
            const directMeta = await analyzeDirectUrl(url);
            resolve(directMeta);
          } catch {
            reject(new Error(errorMsg));
          }
        }
      }
    });
  });
}

function createFallbackFromOembed(url: string, oembed: { title?: string; author_name?: string; thumbnail_url?: string }): VideoMetadata {
  const formats: FormatOption[] = [
    {
      formatId: 'bestvideo+bestaudio/best',
      resolution: 'Best Available (Up to 1080p)',
      ext: 'mp4',
      note: 'Highest quality video stream',
      hasVideo: true,
      hasAudio: true
    },
    {
      formatId: 'bestvideo[height<=1080]+bestaudio/best',
      resolution: '1080p FHD',
      ext: 'mp4',
      note: 'High Definition 1920x1080',
      hasVideo: true,
      hasAudio: true
    },
    {
      formatId: 'bestvideo[height<=720]+bestaudio/best',
      resolution: '720p HD',
      ext: 'mp4',
      note: 'Standard HD 1280x720',
      hasVideo: true,
      hasAudio: true
    },
    {
      formatId: 'bestvideo[height<=480]+bestaudio/best',
      resolution: '480p SD',
      ext: 'mp4',
      note: 'Standard Definition',
      hasVideo: true,
      hasAudio: true
    },
    {
      formatId: 'bestaudio/best',
      resolution: 'Audio (MP3 / High Quality)',
      ext: 'mp3',
      note: 'Extracted audio track',
      hasVideo: false,
      hasAudio: true
    },
    {
      formatId: 'bestaudio[ext=m4a]/bestaudio',
      resolution: 'Audio (M4A / AAC)',
      ext: 'm4a',
      note: 'Native AAC audio stream',
      hasVideo: false,
      hasAudio: true
    }
  ];

  return {
    url,
    title: oembed.title || 'YouTube Video',
    uploader: oembed.author_name || 'YouTube Channel',
    duration: 0,
    durationFormatted: 'Online Video',
    thumbnail: oembed.thumbnail_url || '',
    source: 'youtube',
    availableFormats: formats,
    defaultFormatId: 'bestvideo+bestaudio/best'
  };
}

function cleanYtDlpError(rawErr: string): string {
  if (rawErr.includes('Private video')) return 'This video is private and cannot be accessed.';
  if (rawErr.includes('Sign in to confirm you’re not a bot')) {
    return 'YouTube requires authentication or cookies for this network request. You can provide cookies.txt in Settings to unlock.';
  }
  if (rawErr.includes('Video unavailable')) return 'This video is unavailable or has been removed.';
  if (rawErr.includes('HTTP Error 404')) return 'Media not found (HTTP 404). Check the URL.';
  if (rawErr.includes('HTTP Error 403')) return 'Access denied by content provider (HTTP 403).';
  if (rawErr.includes('Incomplete YouTube ID')) return 'Invalid YouTube video ID in URL.';

  const lines = rawErr.split('\n').filter(l => l.startsWith('ERROR:') || l.includes('error'));
  if (lines.length > 0) {
    return lines[0].replace(/^ERROR:\s*/, '').trim();
  }
  return 'The video could not be analyzed. Please verify the URL and try again.';
}

function processYtDlpOutput(url: string, raw: any, source: string): VideoMetadata {
  const formats: FormatOption[] = [];
  const rawFormats = Array.isArray(raw.formats) ? raw.formats : [];
  const addedResolutions = new Set<string>();

  formats.push({
    formatId: 'bestvideo+bestaudio/best',
    resolution: 'Best Available',
    ext: 'mp4',
    filesize: raw.filesize_approx || raw.filesize,
    filesizeFormatted: formatBytes(raw.filesize_approx || raw.filesize),
    note: 'Highest quality video and audio merged',
    hasVideo: true,
    hasAudio: true
  });

  for (const f of rawFormats) {
    if (f.vcodec && f.vcodec !== 'none' && f.height) {
      const resName = `${f.height}p`;
      if (!addedResolutions.has(resName)) {
        addedResolutions.add(resName);
        formats.push({
          formatId: `bestvideo[height<=${f.height}]+bestaudio/best[height<=${f.height}]/best`,
          resolution: resName,
          ext: 'mp4',
          filesize: f.filesize || f.filesize_approx,
          filesizeFormatted: formatBytes(f.filesize || f.filesize_approx),
          note: `${f.ext?.toUpperCase()} ${f.fps ? `${f.fps}fps` : ''} (${f.vcodec})`,
          hasVideo: true,
          hasAudio: true,
          fps: f.fps,
          vcodec: f.vcodec
        });
      }
    }
  }

  const duration = typeof raw.duration === 'number' ? raw.duration : 0;

  formats.push({
    formatId: 'bestaudio/best',
    resolution: 'Audio (MP3 / High Quality)',
    ext: 'mp3',
    filesizeFormatted: duration ? formatBytes(duration * 16000) : undefined,
    note: 'Extracted audio track (VBR high)',
    hasVideo: false,
    hasAudio: true
  });

  formats.push({
    formatId: 'bestaudio[ext=m4a]/bestaudio',
    resolution: 'Audio (M4A / AAC)',
    ext: 'm4a',
    note: 'Native AAC audio stream',
    hasVideo: false,
    hasAudio: true
  });

  return {
    url,
    title: raw.title || 'Untitled Video',
    uploader: raw.uploader || raw.channel || raw.creator || 'Unknown Channel',
    duration,
    durationFormatted: formatSeconds(duration),
    thumbnail: raw.thumbnail || (raw.thumbnails && raw.thumbnails.length ? raw.thumbnails[raw.thumbnails.length - 1].url : ''),
    uploadDate: raw.upload_date ? `${raw.upload_date.slice(0, 4)}-${raw.upload_date.slice(4, 6)}-${raw.upload_date.slice(6, 8)}` : undefined,
    descriptionPreview: raw.description ? raw.description.slice(0, 240) + (raw.description.length > 240 ? '...' : '') : undefined,
    viewCount: raw.view_count,
    source,
    availableFormats: formats,
    defaultFormatId: 'bestvideo+bestaudio/best'
  };
}

async function analyzeDirectUrl(url: string): Promise<VideoMetadata> {
  const headRes = await fetch(url, {
    method: 'HEAD',
    headers: { 'User-Agent': 'VideoFlow/1.0 (Desktop Download Manager; https://videoflow.app)' }
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
      }
    ],
    defaultFormatId: 'direct'
  };
}
