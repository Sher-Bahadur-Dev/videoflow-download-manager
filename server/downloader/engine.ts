import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import { DownloadItem, DownloadEvent, DashboardStats, DownloadSegment } from '../types';
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

  public resolveDestinationFolder(item: DownloadItem): string {
    const settings = getSettings();
    let baseDir = settings.downloadDirectory;
    ensureDirectory(baseDir);

    if (settings.organizeByChannel && item.uploader) {
      const cleanUploader = history.sanitizeFilename(item.uploader);
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

    // Determine target output file and path safely
    const destDir = this.resolveDestinationFolder(item);
    const cleanTitle = history.sanitizeFilename(item.title);
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
    const isDirect =
      item.formatId === 'direct' ||
      /\.(mp4|webm|mkv|avi|mov|mp3|m4a|flac|wav|zip|tar|gz|rar|7z|exe|iso|bin)(\?|$)/i.test(item.url);

    if (isDirect && (item.url.startsWith('http://') || item.url.startsWith('https://'))) {
      this.startHttpDownload(item, targetFilePath, destDir);
    } else {
      this.startYtDlpDownload(item, targetFilePath, destDir, cleanTitle, ext);
    }

    return true;
  }

  private startYtDlpDownload(
    item: DownloadItem,
    targetFilePath: string,
    destDir: string,
    cleanTitle: string,
    ext: string
  ) {
    const isAudioOnly =
      ext === 'mp3' ||
      ext === 'm4a' ||
      ext === 'flac' ||
      ext === 'wav' ||
      ext === 'aac' ||
      ext === 'ogg' ||
      item.quality.toLowerCase().includes('audio') ||
      item.isAudioExtracted;

    // Single adaptive pipeline (honest representation, no fake 8-thread ranges)
    item.connectionsCount = 1;
    item.segments = undefined;

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
      '--progress-template',
      'DOWNLOAD:%(progress.downloaded_bytes)s/%(progress.total_bytes)s/%(progress.speed)s/%(progress.eta)s/%(progress._percent_str)s',
      '-o',
      outputTemplate,
      '--no-playlist',
      '--no-warnings',
      '--no-check-certificates',
      '--geo-bypass',
      '--extractor-args',
      'youtube:player_client=android,web,tv,ios',
      '--user-agent',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      '--referer',
      'https://www.youtube.com/'
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

    const isWindows = process.platform === 'win32';
    const command = isWindows ? process.env.PYTHON_COMMAND || 'python' : YT_DLP_PATH;
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
        return;
      }

      if (code === 0) {
        // Verify physical file on disk (Phase 4 requirement)
        let resolvedPath: string | null = null;
        if (fs.existsSync(targetFilePath)) {
          resolvedPath = targetFilePath;
        } else {
          // Check if file with same base name exists in destDir
          if (fs.existsSync(destDir)) {
            const files = fs.readdirSync(destDir);
            const found = files.find(f => f.startsWith(cleanTitle));
            if (found) {
              resolvedPath = path.join(destDir, found);
            }
          }
        }

        if (resolvedPath && fs.existsSync(resolvedPath)) {
          const stat = fs.statSync(resolvedPath);
          if (stat.size > 0) {
            item.outputPath = resolvedPath;
            item.fileName = path.basename(resolvedPath);
            item.downloadedBytes = stat.size;
            item.totalBytes = stat.size;
            item.status = 'COMPLETED';
            item.progress = 100;
            item.speed = 0;
            item.eta = 0;
            item.completedAt = new Date().toISOString();
            history.updateDownload(item.id, item);
            log('INFO', `Download completed successfully: "${item.title}" (${stat.size} bytes)`);
            this.emitEvent({ type: 'COMPLETED', item, stats: this.getStats() });
          } else {
            this.handleDownloadFailed(item, 'Downloaded file on disk is empty (0 bytes).');
          }
        } else {
          // File missing from disk - report error rather than falsely showing Completed!
          this.handleDownloadFailed(item, 'Download process finished but the file was not found on disk.');
        }
      } else {
        const errorDetail =
          stderrBuffer
            .split('\n')
            .filter(l => l.includes('ERROR:') || l.includes('Error'))
            .join(' ') || `Download exited with error code ${code}`;
        this.handleDownloadFailed(item, errorDetail);
      }

      this.checkAndProcessQueue();
    });
  }

  private parseYtDlpOutput(item: DownloadItem, text: string, task: ActiveTask) {
    const lines = text.split('\n');
    let updated = false;

    for (const line of lines) {
      if (line.startsWith('DOWNLOAD:')) {
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
      const now = Date.now();
      if (now - task.lastEmitTime >= 120) {
        task.lastEmitTime = now;
        history.updateDownload(item.id, item);
        this.emitEvent({ type: 'PROGRESS', item, stats: this.getStats() });
      }
    }
  }

  /**
   * Direct HTTP Download Engine with real Range multi-segment acceleration.
   */
  private async startHttpDownload(item: DownloadItem, targetFilePath: string, destDir: string) {
    const abortController = new AbortController();
    const activeTask: ActiveTask = {
      item,
      type: 'http',
      abortController,
      lastEmitTime: Date.now()
    };
    this.activeTasks.set(item.id, activeTask);

    try {
      // 1. Probe the remote file for Content-Length and Range support
      let supportsRange = false;
      let totalBytes = item.totalBytes || 0;

      try {
        const probeRes = await fetch(item.url, {
          method: 'HEAD',
          headers: { 'User-Agent': 'Mozilla/5.0 VideoFlow/1.0' },
          signal: abortController.signal
        });

        if (probeRes.ok) {
          const cl = probeRes.headers.get('content-length');
          if (cl) totalBytes = parseInt(cl, 10);
          const acceptRanges = probeRes.headers.get('accept-ranges');
          if (acceptRanges === 'bytes' || probeRes.status === 206) {
            supportsRange = true;
          }
        }
      } catch {
        // If HEAD fails, try small range probe
      }

      // If HEAD didn't confirm ranges, test with Range: bytes=0-0
      if (!supportsRange && totalBytes === 0) {
        try {
          const testRangeRes = await fetch(item.url, {
            headers: { 'Range': 'bytes=0-0', 'User-Agent': 'Mozilla/5.0 VideoFlow/1.0' },
            signal: abortController.signal
          });
          if (testRangeRes.status === 206) {
            supportsRange = true;
            const cr = testRangeRes.headers.get('content-range');
            if (cr) {
              const match = cr.match(/\/(\d+)/);
              if (match) totalBytes = parseInt(match[1], 10);
            }
          }
        } catch {}
      }

      if (totalBytes > 0) {
        item.totalBytes = totalBytes;
      }

      // Decide segment count: 4 parallel connections if Range supported and file > 512KB
      const numSegments = supportsRange && totalBytes > 512 * 1024 ? 4 : 1;
      item.connectionsCount = numSegments;

      if (numSegments > 1) {
        // Genuine segmented download
        await this.downloadWithSegments(item, targetFilePath, totalBytes, numSegments, activeTask);
      } else {
        // Single connection stream
        await this.downloadSingleStream(item, targetFilePath, activeTask);
      }

      this.activeTasks.delete(item.id);

      // Verify physical file exists and size
      if (fs.existsSync(targetFilePath)) {
        const stat = fs.statSync(targetFilePath);
        if (stat.size > 0) {
          item.status = 'COMPLETED';
          item.progress = 100;
          item.downloadedBytes = stat.size;
          item.totalBytes = stat.size;
          item.speed = 0;
          item.eta = 0;
          item.completedAt = new Date().toISOString();
          history.updateDownload(item.id, item);
          log('INFO', `Direct download completed: "${item.title}" (${stat.size} bytes)`);
          this.emitEvent({ type: 'COMPLETED', item, stats: this.getStats() });
        } else {
          this.handleDownloadFailed(item, 'Downloaded file on disk is empty (0 bytes).');
        }
      } else {
        this.handleDownloadFailed(item, 'File was not created on disk after download.');
      }

      this.checkAndProcessQueue();
    } catch (err: any) {
      this.activeTasks.delete(item.id);
      if (abortController.signal.aborted) return;
      log('ERROR', `Direct download error: ${err.message}`);
      this.handleDownloadFailed(item, err.message);
      this.checkAndProcessQueue();
    }
  }

  /**
   * Real segmented downloading: splits file into N parts with exact byte ranges,
   * tracks each segment independently, and stitches them upon completion.
   */
  private async downloadWithSegments(
    item: DownloadItem,
    targetFilePath: string,
    totalBytes: number,
    numSegments: number,
    activeTask: ActiveTask
  ) {
    const chunkSize = Math.floor(totalBytes / numSegments);
    const segments: DownloadSegment[] = [];

    for (let i = 0; i < numSegments; i++) {
      const start = i * chunkSize;
      const end = i === numSegments - 1 ? totalBytes - 1 : (i + 1) * chunkSize - 1;
      const partPath = `${targetFilePath}.seg${i}`;
      let downloaded = 0;
      if (fs.existsSync(partPath)) {
        downloaded = fs.statSync(partPath).size;
      }
      segments.push({
        id: i + 1,
        start,
        end,
        total: end - start + 1,
        downloaded,
        speed: 0,
        status: downloaded >= (end - start + 1) ? 'completed' : 'idle'
      });
    }

    item.segments = segments;
    history.updateDownload(item.id, item);

    // Run parallel segment workers
    const workerPromises = segments.map((seg, idx) => {
      return this.downloadSegmentWorker(item, targetFilePath, seg, idx, activeTask);
    });

    await Promise.all(workerPromises);

    // Concatenate segments into targetFilePath
    const finalOut = fs.createWriteStream(targetFilePath, { flags: 'w' });
    for (let i = 0; i < numSegments; i++) {
      const partPath = `${targetFilePath}.seg${i}`;
      if (!fs.existsSync(partPath)) {
        throw new Error(`Missing segment chunk: ${partPath}`);
      }
      const data = fs.readFileSync(partPath);
      finalOut.write(data);
      try {
        fs.unlinkSync(partPath);
      } catch {}
    }
    await new Promise((res) => finalOut.end(res));
  }

  private async downloadSegmentWorker(
    item: DownloadItem,
    targetFilePath: string,
    seg: DownloadSegment,
    index: number,
    activeTask: ActiveTask
  ) {
    const partPath = `${targetFilePath}.seg${index}`;
    let existingBytes = 0;
    if (fs.existsSync(partPath)) {
      existingBytes = fs.statSync(partPath).size;
    }

    if (existingBytes >= seg.total) {
      seg.downloaded = seg.total;
      seg.status = 'completed';
      return;
    }

    seg.status = 'connecting';
    const rangeStart = seg.start + existingBytes;
    const rangeEnd = seg.end;

    const res = await fetch(item.url, {
      headers: {
        'Range': `bytes=${rangeStart}-${rangeEnd}`,
        'User-Agent': 'Mozilla/5.0 VideoFlow/1.0'
      },
      signal: activeTask.abortController?.signal
    });

    if (!res.ok && res.status !== 206) {
      throw new Error(`Segment #${seg.id} HTTP error: ${res.status}`);
    }

    if (!res.body) {
      throw new Error(`Segment #${seg.id} empty response body`);
    }

    seg.status = 'downloading';
    const writeStream = fs.createWriteStream(partPath, { flags: existingBytes > 0 ? 'a' : 'w' });
    const reader = res.body.getReader();

    let segDownloaded = existingBytes;
    let lastCalcTime = Date.now();
    let bytesSinceCalc = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          writeStream.write(Buffer.from(value));
          segDownloaded += value.length;
          bytesSinceCalc += value.length;
          seg.downloaded = segDownloaded;

          const now = Date.now();
          const elapsed = (now - lastCalcTime) / 1000;
          if (elapsed >= 0.5) {
            seg.speed = Math.round(bytesSinceCalc / elapsed);
            lastCalcTime = now;
            bytesSinceCalc = 0;
          }

          if (now - activeTask.lastEmitTime >= 100) {
            this.aggregateAndEmitProgress(item, activeTask);
          }
        }
      }
      seg.status = 'completed';
      seg.speed = 0;
    } finally {
      writeStream.end();
    }
  }

  private async downloadSingleStream(item: DownloadItem, targetFilePath: string, activeTask: ActiveTask) {
    let startByte = 0;
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 VideoFlow/1.0'
    };

    if (fs.existsSync(targetFilePath) && item.downloadedBytes > 0) {
      const existingSize = fs.statSync(targetFilePath).size;
      if (existingSize > 0) {
        startByte = existingSize;
        headers['Range'] = `bytes=${startByte}-`;
      }
    }

    const res = await fetch(item.url, {
      headers,
      signal: activeTask.abortController?.signal
    });

    if (!res.ok && res.status !== 206) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    const cl = res.headers.get('content-length');
    if (cl) {
      item.totalBytes = parseInt(cl, 10) + startByte;
    }

    if (!res.body) {
      throw new Error('Response body is empty');
    }

    const fileStream = fs.createWriteStream(targetFilePath, {
      flags: startByte > 0 ? 'a' : 'w'
    });

    const reader = res.body.getReader();
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
          item.speed = Math.round(bytesSinceLastCalc / elapsed);
          speedCalcTime = now;
          bytesSinceLastCalc = 0;

          if (item.totalBytes > 0) {
            item.progress = Math.min(99.9, Number(((downloaded / item.totalBytes) * 100).toFixed(1)));
            const remaining = item.totalBytes - downloaded;
            if (item.speed > 0) {
              item.eta = Math.max(0, Math.round(remaining / item.speed));
            }
          }
        }

        if (now - activeTask.lastEmitTime >= 100) {
          activeTask.lastEmitTime = now;
          history.updateDownload(item.id, item);
          this.emitEvent({ type: 'PROGRESS', item, stats: this.getStats() });
        }
      }
    }

    fileStream.end();
  }

  private aggregateAndEmitProgress(item: DownloadItem, activeTask: ActiveTask) {
    if (!item.segments) return;

    let totalDown = 0;
    let totalSpeed = 0;

    for (const seg of item.segments) {
      totalDown += seg.downloaded;
      totalSpeed += seg.speed;
    }

    item.downloadedBytes = totalDown;
    item.speed = totalSpeed;

    if (item.totalBytes > 0) {
      item.progress = Math.min(99.9, Number(((totalDown / item.totalBytes) * 100).toFixed(1)));
      const remaining = item.totalBytes - totalDown;
      if (totalSpeed > 0) {
        item.eta = Math.max(0, Math.round(remaining / totalSpeed));
      }
    }

    activeTask.lastEmitTime = Date.now();
    history.updateDownload(item.id, item);
    this.emitEvent({ type: 'PROGRESS', item, stats: this.getStats() });
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
    if (item.outputPath) {
      const partFile = `${item.outputPath}.part`;
      if (fs.existsSync(partFile)) {
        try {
          fs.unlinkSync(partFile);
        } catch {}
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
        totalBytes += d.totalBytes || d.downloadedBytes || 0;
      }
    }

    for (const task of this.activeTasks.values()) {
      combinedSpeed += task.item.speed || 0;
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
    for (const [, task] of this.activeTasks.entries()) {
      if (task.process) task.process.kill();
      if (task.abortController) task.abortController.abort();
    }
    this.activeTasks.clear();
  }
}

export const downloadEngine = new DownloadEngine();
