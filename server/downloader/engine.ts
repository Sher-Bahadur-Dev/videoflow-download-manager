import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import { DownloadItem, DownloadEvent, DashboardStats, DownloadStatus, DownloadSegment } from '../types';
import { log } from '../logger';
import { getSettings, ensureDirectory } from '../storage/settings';
import * as history from '../storage/history';

const YT_DLP_PATH = path.join(process.cwd(), 'bin', 'yt-dlp');

interface ActiveTask {
  item: DownloadItem;
  type: 'ytdl' | 'http';
  process?: ChildProcess;
  abortController?: AbortController;
  lastEmitTime: number;
}

export class DownloadEngine {
  private activeTasks: Map<string, ActiveTask> = new Map();
  private listeners: Set<(event: DownloadEvent) => void> = new Set();
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.checkInterval = setInterval(() => {
      this.checkAndProcessQueue();
    }, 1500);
  }

  public addEventListener(listener: (event: DownloadEvent) => void) {
    this.listeners.add(listener);
  }

  public removeEventListener(listener: (event: DownloadEvent) => void) {
    this.listeners.delete(listener);
  }

  public emitEvent(event: DownloadEvent) {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err: any) {
        log('ERROR', `Error in download listener: ${err.message}`);
      }
    }
  }

  public sanitizeFileName(name: string): string {
    return name
      .replace(/[/\\?%*:|"<>]/g, '_')
      .replace(/[\x00-\x1f\x80-\x9f]/g, '')
      .replace(/\.+/g, '.')
      .trim()
      .slice(0, 150) || 'download';
  }

  public resolveDestinationFolder(item: DownloadItem): string {
    const settings = getSettings();
    let baseDir = settings.downloadDirectory;
    ensureDirectory(baseDir);

    if (settings.organizeByChannel && item.uploader) {
      const cleanUploader = this.sanitizeFileName(item.uploader);
      baseDir = path.join(baseDir, cleanUploader);
      ensureDirectory(baseDir);
    }

    if (settings.organizeByYear) {
      const year = new Date().getFullYear().toString();
      baseDir = path.join(baseDir, year);
      ensureDirectory(baseDir);
    }

    return baseDir;
  }

  public async queueDownload(item: DownloadItem): Promise<DownloadItem> {
    const settings = getSettings();
    const existing = history.getDownloadById(item.id);

    if (!existing) {
      history.addDownload(item);
    }

    log('INFO', `Job queued: "${item.title}" [${item.quality} - ${item.format}]`);
    this.emitEvent({ type: 'ADDED', item, stats: this.getStats() });

    if (settings.startAutomatically) {
      this.checkAndProcessQueue();
    }

    return item;
  }

  public checkAndProcessQueue() {
    const settings = getSettings();
    const maxActive = settings.maxConcurrentDownloads || 3;
    const currentActiveCount = this.activeTasks.size;

    if (currentActiveCount >= maxActive) {
      return;
    }

    const availableSlots = maxActive - currentActiveCount;
    const allDownloads = history.getAllDownloads();
    const queuedItems = allDownloads.filter(d => d.status === 'QUEUED');

    const toStart = queuedItems.slice(0, availableSlots);
    for (const item of toStart) {
      this.startJob(item);
    }
  }

  public async startJob(item: DownloadItem): Promise<boolean> {
    if (this.activeTasks.has(item.id)) {
      return false; // Already running
    }

    // Determine target output file and path
    const destDir = this.resolveDestinationFolder(item);
    const cleanTitle = this.sanitizeFileName(item.title);
    const ext = item.format || 'mp4';
    let targetFileName = `${cleanTitle}.${ext}`;

    const settings = getSettings();
    if (settings.preventDuplicates) {
      let counter = 1;
      while (fs.existsSync(path.join(destDir, targetFileName))) {
        targetFileName = `${cleanTitle} (${counter}).${ext}`;
        counter++;
      }
    }

    const targetFilePath = path.join(destDir, targetFileName);

    item.status = 'DOWNLOADING';
    item.outputPath = targetFilePath;
    item.fileName = targetFileName;
    item.startedAt = item.startedAt || new Date().toISOString();
    item.error = undefined;
    history.updateDownload(item.id, item);

    log('INFO', `Starting download: "${item.title}" -> ${targetFilePath}`);
    this.emitEvent({ type: 'STATUS_CHANGE', item, stats: this.getStats() });

    // Decide between direct HTTP download and yt-dlp
    const isDirect = item.url.includes('.mp4') || item.url.includes('.webm') || item.url.includes('.mkv') || item.formatId === 'direct';

    if (isDirect && item.url.startsWith('http')) {
      this.startHttpDownload(item, targetFilePath);
    } else {
      this.startYtDlpDownload(item, targetFilePath, destDir, cleanTitle, ext);
    }

    return true;
  }

  private startYtDlpDownload(item: DownloadItem, targetFilePath: string, destDir: string, cleanTitle: string, ext: string) {
    const isAudioOnly = ext === 'mp3' || ext === 'm4a' || item.quality.toLowerCase().includes('audio');
    
    // Choose format selector
    let formatArg = item.formatId || 'bestvideo+bestaudio/best';
    if (formatArg === 'bestvideo+bestaudio/best' || !formatArg) {
      if (item.quality && item.quality !== 'Best Available' && !isAudioOnly) {
        const hMatch = item.quality.match(/(\d+)p/);
        if (hMatch) {
          const h = hMatch[1];
          formatArg = `bestvideo[height<=${h}]+bestaudio/best[height<=${h}]/best`;
        }
      }
    }

    const outputTemplate = path.join(destDir, `${cleanTitle}.%(ext)s`);

    const args = [
      '--newline',
      '--progress-template', 'DOWNLOAD:%(progress.downloaded_bytes)s/%(progress.total_bytes)s/%(progress.speed)s/%(progress.eta)s/%(progress._percent_str)s',
      '-o', outputTemplate,
      '--no-playlist',
      '--no-warnings',
      '--no-check-certificates',
      '--geo-bypass',
      '--extractor-args', 'youtube:player_client=android,web,tv,ios',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      '--referer', 'https://www.youtube.com/'
    ];

    const cookiesPath = path.join(process.cwd(), 'data', 'cookies.txt');
    if (fs.existsSync(cookiesPath)) {
      args.push('--cookies', cookiesPath);
    }

    const settings = getSettings();
    if (settings.speedLimitKBps && settings.speedLimitKBps > 0) {
      args.push('--limit-rate', `${settings.speedLimitKBps}K`);
    }

    if (isAudioOnly) {
      args.push('-x', '--audio-format', ext, '--audio-quality', '0');
    } else {
      args.push('-f', formatArg);
      args.push('--merge-output-format', ext);
    }

    args.push(item.url);

    // yt-dlp in this project is bundled as a Python script. Windows cannot
    // execute the Unix shebang directly, so invoke it with Python.
    const isWindows = process.platform === 'win32';
    const command = isWindows ? (process.env.PYTHON_COMMAND || 'python') : YT_DLP_PATH;
    const commandArgs = isWindows ? [YT_DLP_PATH, ...args] : args;

    const child = spawn(command, commandArgs, {
      env: { ...process.env, PATH: `${process.env.PATH || ''}:/usr/bin:/usr/local/bin` }
    });

    const activeTask: ActiveTask = {
      item,
      type: 'ytdl',
      process: child,
      lastEmitTime: Date.now()
    };
    this.activeTasks.set(item.id, activeTask);

    let stderrBuffer = '';

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      this.parseYtDlpOutput(item, text, activeTask);
    });

    child.stderr.on('data', (chunk) => {
      stderrBuffer += chunk.toString();
    });

    child.on('error', (err) => {
      log('ERROR', `Process spawn error for ${item.id}: ${err.message}`);
      this.handleDownloadFailed(item, `Process execution failed: ${err.message}`);
    });

    child.on('close', (code) => {
      this.activeTasks.delete(item.id);

      if (item.status === 'PAUSED' || item.status === 'CANCELLED') {
        // Already handled by pause/cancel methods
        return;
      }

      if (code === 0) {
        // Look for the actual file created (yt-dlp may have used the exact ext or merged)
        const expectedFile = targetFilePath;
        if (fs.existsSync(expectedFile)) {
          const stat = fs.statSync(expectedFile);
          item.downloadedBytes = stat.size;
          item.totalBytes = stat.size;
          item.outputPath = expectedFile;
        } else {
          // Check if file with same base name exists in folder
          const files = fs.readdirSync(destDir);
          const found = files.find(f => f.startsWith(cleanTitle));
          if (found) {
            const actualPath = path.join(destDir, found);
            const stat = fs.statSync(actualPath);
            item.outputPath = actualPath;
            item.fileName = found;
            item.downloadedBytes = stat.size;
            item.totalBytes = stat.size;
          }
        }

        item.status = 'COMPLETED';
        item.progress = 100;
        item.speed = 0;
        item.eta = 0;
        item.completedAt = new Date().toISOString();
        history.updateDownload(item.id, item);
        log('INFO', `Download completed successfully: "${item.title}"`);
        this.emitEvent({ type: 'COMPLETED', item, stats: this.getStats() });
      } else {
        const errorDetail = stderrBuffer.split('\n').filter(l => l.includes('ERROR:') || l.includes('Error')).join(' ') || `Download exited with error code ${code}`;
        this.handleDownloadFailed(item, errorDetail);
      }

      // Check next
      this.checkAndProcessQueue();
    });
  }

  private parseYtDlpOutput(item: DownloadItem, text: string, task: ActiveTask) {
    const lines = text.split('\n');
    let updated = false;

    for (const line of lines) {
      if (line.startsWith('DOWNLOAD:')) {
        // Parsed template: DOWNLOAD:downloaded/total/speed/eta/percent
        const parts = line.replace('DOWNLOAD:', '').trim().split('/');
        if (parts.length >= 4) {
          const downloaded = parseInt(parts[0], 10);
          const total = parseInt(parts[1], 10);
          const speed = parseFloat(parts[2]);
          const eta = parseInt(parts[3], 10);

          if (!isNaN(downloaded) && downloaded > 0) item.downloadedBytes = downloaded;
          if (!isNaN(total) && total > 0) item.totalBytes = total;
          if (!isNaN(speed) && speed > 0) item.speed = speed;
          if (!isNaN(eta) && eta >= 0) item.eta = eta;

          if (item.totalBytes > 0 && item.downloadedBytes > 0) {
            item.progress = Math.min(99.9, Number(((item.downloadedBytes / item.totalBytes) * 100).toFixed(1)));
          }
          updated = true;
        }
      } else if (line.includes('[download]') && line.includes('%')) {
        // Fallback standard regex parser
        // e.g. [download]  45.2% of 120.00MiB at  2.45MiB/s ETA 00:23
        const percentMatch = line.match(/(\d+(?:\.\d+)?)%/);
        if (percentMatch) {
          item.progress = Math.min(99.9, parseFloat(percentMatch[1]));
          updated = true;
        }

        const speedMatch = line.match(/at\s+([0-9.]+)\s*([KMGT]?i?B)\/s/i);
        if (speedMatch) {
          const val = parseFloat(speedMatch[1]);
          const unit = speedMatch[2].toUpperCase();
          let mult = 1;
          if (unit.startsWith('K')) mult = 1024;
          else if (unit.startsWith('M')) mult = 1024 * 1024;
          else if (unit.startsWith('G')) mult = 1024 * 1024 * 1024;
          item.speed = val * mult;
          updated = true;
        }

        const etaMatch = line.match(/ETA\s+(\d+):(\d+)(?::(\d+))?/);
        if (etaMatch) {
          if (etaMatch[3]) {
            item.eta = parseInt(etaMatch[1], 10) * 3600 + parseInt(etaMatch[2], 10) * 60 + parseInt(etaMatch[3], 10);
          } else {
            item.eta = parseInt(etaMatch[1], 10) * 60 + parseInt(etaMatch[2], 10);
          }
          updated = true;
        }
      }
    }

    if (updated) {
      // Calculate realistic IDM connection segments
      this.updateItemSegments(item, 8);
      const now = Date.now();
      // Fast throttle for real-time per-KB UI recording (120ms)
      if (now - task.lastEmitTime >= 120) {
        task.lastEmitTime = now;
        history.updateDownload(item.id, item);
        this.emitEvent({ type: 'PROGRESS', item, stats: this.getStats() });
      }
    }
  }

  public updateItemSegments(item: DownloadItem, count = 8) {
    item.connectionsCount = count;
    const total = item.totalBytes || 1;
    const downloaded = item.downloadedBytes || 0;
    const segSize = Math.max(1, Math.floor(total / count));

    const segments: DownloadSegment[] = [];
    for (let i = 0; i < count; i++) {
      const start = i * segSize;
      const end = i === count - 1 ? total : (i + 1) * segSize;
      const segTotal = Math.max(1, end - start);

      let segDownloaded = 0;
      let status: 'connecting' | 'downloading' | 'completed' | 'idle' = 'idle';

      if (downloaded >= end) {
        segDownloaded = segTotal;
        status = 'completed';
      } else if (downloaded > start) {
        segDownloaded = downloaded - start;
        status = 'downloading';
      } else {
        segDownloaded = 0;
        status = i <= Math.min(count - 1, Math.floor((downloaded / total) * count) + 1) ? 'connecting' : 'idle';
      }

      segments.push({
        id: i + 1,
        start,
        end,
        downloaded: segDownloaded,
        total: segTotal,
        speed: status === 'downloading' ? Math.round(item.speed / Math.max(1, count / 2)) : 0,
        status
      });
    }
    item.segments = segments;
  }

  private async startHttpDownload(item: DownloadItem, targetFilePath: string) {
    const abortController = new AbortController();
    const activeTask: ActiveTask = {
      item,
      type: 'http',
      abortController,
      lastEmitTime: Date.now()
    };
    this.activeTasks.set(item.id, activeTask);

    try {
      // Support HTTP Range resume if partially downloaded
      let startByte = 0;
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*'
      };

      if (fs.existsSync(targetFilePath) && item.downloadedBytes > 0) {
        const existingSize = fs.statSync(targetFilePath).size;
        if (existingSize > 0) {
          startByte = existingSize;
          headers['Range'] = `bytes=${startByte}-`;
          log('INFO', `Resuming direct download from byte ${startByte}`);
        }
      }

      const response = await fetch(item.url, {
        headers,
        signal: abortController.signal
      });

      if (!response.ok && response.status !== 206) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        const total = parseInt(contentLength, 10) + startByte;
        item.totalBytes = total;
      }

      if (!response.body) {
        throw new Error('Response body is empty');
      }

      const fileStream = fs.createWriteStream(targetFilePath, {
        flags: startByte > 0 ? 'a' : 'w'
      });

      const reader = response.body.getReader();
      let downloaded = startByte;
      item.downloadedBytes = downloaded;

      let speedCalcTime = Date.now();
      let bytesSinceLastCalc = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
          fileStream.write(Buffer.from(value));
          downloaded += value.length;
          bytesSinceLastCalc += value.length;
          item.downloadedBytes = downloaded;

          const now = Date.now();
          const elapsed = (now - speedCalcTime) / 1000;

          if (elapsed >= 0.5) {
            item.speed = bytesSinceLastCalc / elapsed;
            speedCalcTime = now;
            bytesSinceLastCalc = 0;

            if (item.totalBytes > 0) {
              item.progress = Math.min(99.9, Number(((downloaded / item.totalBytes) * 100).toFixed(1)));
              const remainingBytes = item.totalBytes - downloaded;
              if (item.speed > 0) {
                item.eta = Math.max(0, Math.round(remainingBytes / item.speed));
              }
            }
          }

          if (now - activeTask.lastEmitTime >= 100) {
            this.updateItemSegments(item, 8);
            activeTask.lastEmitTime = now;
            history.updateDownload(item.id, item);
            this.emitEvent({ type: 'PROGRESS', item, stats: this.getStats() });
          }
        }
      }

      fileStream.end();

      this.activeTasks.delete(item.id);
      item.status = 'COMPLETED';
      item.progress = 100;
      item.downloadedBytes = downloaded;
      item.totalBytes = downloaded;
      item.speed = 0;
      item.eta = 0;
      item.completedAt = new Date().toISOString();
      history.updateDownload(item.id, item);
      log('INFO', `Direct download completed: "${item.title}" (${downloaded} bytes)`);
      this.emitEvent({ type: 'COMPLETED', item, stats: this.getStats() });
      this.checkAndProcessQueue();

    } catch (err: any) {
      this.activeTasks.delete(item.id);

      if (abortController.signal.aborted) {
        // Paused or cancelled intentionally
        return;
      }

      log('ERROR', `Direct download error: ${err.message}`);
      this.handleDownloadFailed(item, err.message);
      this.checkAndProcessQueue();
    }
  }

  private handleDownloadFailed(item: DownloadItem, errorMsg: string) {
    const settings = getSettings();
    item.retryCount = (item.retryCount || 0) + 1;

    if (item.retryCount < (settings.retryCount || 3)) {
      log('WARN', `Retrying ${item.title} (attempt ${item.retryCount + 1}/${settings.retryCount})...`);
      item.status = 'QUEUED';
      item.error = `Retrying: ${errorMsg}`;
      history.updateDownload(item.id, item);
      this.emitEvent({ type: 'STATUS_CHANGE', item, stats: this.getStats() });
      setTimeout(() => {
        this.checkAndProcessQueue();
      }, (settings.retryDelay || 5) * 1000);
      return;
    }

    item.status = 'FAILED';
    item.error = errorMsg;
    item.speed = 0;
    item.eta = 0;
    history.updateDownload(item.id, item);
    log('ERROR', `Download permanently failed: "${item.title}" - ${errorMsg}`);
    this.emitEvent({ type: 'ERROR', item, stats: this.getStats(), message: errorMsg });
  }

  public async pauseJob(id: string): Promise<boolean> {
    const item = history.getDownloadById(id);
    if (!item) return false;

    const task = this.activeTasks.get(id);
    if (task) {
      if (task.type === 'ytdl' && task.process) {
        task.process.kill('SIGTERM');
      } else if (task.type === 'http' && task.abortController) {
        task.abortController.abort();
      }
      this.activeTasks.delete(id);
    }

    item.status = 'PAUSED';
    item.speed = 0;
    item.eta = 0;
    history.updateDownload(item.id, item);
    log('INFO', `Download paused: "${item.title}"`);
    this.emitEvent({ type: 'STATUS_CHANGE', item, stats: this.getStats() });
    this.checkAndProcessQueue();
    return true;
  }

  public async resumeJob(id: string): Promise<boolean> {
    const item = history.getDownloadById(id);
    if (!item) return false;

    item.status = 'QUEUED';
    item.error = undefined;
    history.updateDownload(item.id, item);
    log('INFO', `Download resumed into queue: "${item.title}"`);
    this.emitEvent({ type: 'STATUS_CHANGE', item, stats: this.getStats() });
    this.checkAndProcessQueue();
    return true;
  }

  public async cancelJob(id: string): Promise<boolean> {
    const item = history.getDownloadById(id);
    if (!item) return false;

    const task = this.activeTasks.get(id);
    if (task) {
      if (task.type === 'ytdl' && task.process) {
        task.process.kill('SIGKILL');
      } else if (task.type === 'http' && task.abortController) {
        task.abortController.abort();
      }
      this.activeTasks.delete(id);
    }

    item.status = 'CANCELLED';
    item.speed = 0;
    item.eta = 0;
    history.updateDownload(item.id, item);

    // Clean up partial file on cancel
    if (item.outputPath && fs.existsSync(item.outputPath)) {
      try {
        fs.unlinkSync(item.outputPath);
      } catch {}
    }
    // Also check for partial yt-dlp file (.part)
    if (item.outputPath) {
      const partFile = `${item.outputPath}.part`;
      if (fs.existsSync(partFile)) {
        try { fs.unlinkSync(partFile); } catch {}
      }
    }

    log('INFO', `Download cancelled: "${item.title}"`);
    this.emitEvent({ type: 'STATUS_CHANGE', item, stats: this.getStats() });
    this.checkAndProcessQueue();
    return true;
  }

  public async retryJob(id: string): Promise<boolean> {
    const item = history.getDownloadById(id);
    if (!item) return false;

    item.status = 'QUEUED';
    item.error = undefined;
    item.retryCount = 0;
    item.progress = 0;
    item.downloadedBytes = 0;
    history.updateDownload(item.id, item);
    log('INFO', `Download retried: "${item.title}"`);
    this.emitEvent({ type: 'STATUS_CHANGE', item, stats: this.getStats() });
    this.checkAndProcessQueue();
    return true;
  }

  public async removeJob(id: string, deleteFile = false): Promise<boolean> {
    await this.cancelJob(id);
    const removed = history.removeDownload(id, deleteFile);
    if (removed) {
      this.emitEvent({ type: 'REMOVED', stats: this.getStats() });
    }
    return removed;
  }

  public getStats(): DashboardStats {
    const all = history.getAllDownloads();
    let totalBytes = 0;
    let combinedSpeed = 0;

    for (const d of all) {
      if (d.status === 'COMPLETED') {
        totalBytes += (d.totalBytes || d.downloadedBytes || 0);
      }
    }

    for (const task of this.activeTasks.values()) {
      combinedSpeed += (task.item.speed || 0);
    }

    return {
      activeCount: this.activeTasks.size,
      queuedCount: all.filter(d => d.status === 'QUEUED').length,
      completedCount: all.filter(d => d.status === 'COMPLETED').length,
      failedCount: all.filter(d => d.status === 'FAILED').length,
      totalDownloadedBytes: totalBytes,
      currentSpeed: combinedSpeed
    };
  }

  public renameJob(id: string, newTitle: string): DownloadItem | undefined {
    const updated = history.renameDownload(id, newTitle);
    if (updated) {
      this.emitEvent({ type: 'STATUS_CHANGE', item: updated });
    }
    return updated;
  }

  public shutdown() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    for (const [id, task] of this.activeTasks.entries()) {
      if (task.process) task.process.kill();
      if (task.abortController) task.abortController.abort();
    }
    this.activeTasks.clear();
  }
}

export const downloadEngine = new DownloadEngine();
