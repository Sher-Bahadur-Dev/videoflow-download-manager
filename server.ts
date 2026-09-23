import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { ZipArchive } from 'archiver';
import AdmZip from 'adm-zip';
import { log, getLogs, clearLogs, onLog } from './server/logger';
import { analyzeVideo } from './server/analyzer/analyzer';
import { downloadEngine } from './server/downloader/engine';
import {
  loadSettings,
  saveSettings,
  getSettings,
  resetSettings,
  verifyAndResolveDirectory
} from './server/storage/settings';
import {
  loadDownloads,
  getAllDownloads,
  getDownloadById,
  addDownload,
  updateDownload,
  removeDownload,
  deleteDownload,
  clearCompleted,
  clearHistory,
  reorderDownloads,
  renameDownload,
  sanitizeFilename
} from './server/storage/history';
import { DownloadItem, DownloadEvent } from './server/types';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Initialize persistent data layers and audit existing downloads
  loadSettings();
  loadDownloads();

  app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
    if (_req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Keep track of connected SSE clients
  const sseClients: Set<express.Response> = new Set();

  const broadcastEvent = (type: string, data: any) => {
    const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(payload);
      } catch {
        sseClients.delete(client);
      }
    }
  };

  // Wire DownloadEngine events directly to SSE clients
  downloadEngine.addEventListener((event: DownloadEvent) => {
    const eventName = event.type.toLowerCase();
    const itemData = event.item || event;
    const namedPayload = `event: ${eventName}\ndata: ${JSON.stringify(itemData)}\n\n`;
    const genericPayload = `event: message\ndata: ${JSON.stringify(event)}\n\n`;

    for (const client of sseClients) {
      try {
        client.write(namedPayload);
        client.write(genericPayload);
      } catch {
        sseClients.delete(client);
      }
    }
  });

  // Forward internal logger messages to connected SSE clients
  onLog((entry) => {
    broadcastEvent('log', entry);
  });

  // ==========================================
  // API ROUTES
  // ==========================================

  // 1. SSE Events Endpoint
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    sseClients.add(res);

    // Send complete initial snapshot on connect
    const initialStats = downloadEngine.getStats();
    const allDownloads = getAllDownloads();
    const settings = getSettings();
    const initPayload = JSON.stringify({
      type: 'INIT',
      downloads: allDownloads,
      stats: initialStats,
      settings: settings
    });

    res.write(`event: init\ndata: ${initPayload}\n\n`);
    res.write(`data: ${initPayload}\n\n`);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // 2. Analyzer Endpoint
  app.post('/api/analyze', async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }

      const metadata = await analyzeVideo(url);
      res.json(metadata);
    } catch (err: any) {
      log('WARN', `Analysis failed: ${err.message}`);
      res.status(422).json({ error: err.message || 'Failed to analyze video URL' });
    }
  });

  // 3. Downloads Endpoints
  app.get('/api/downloads', (req, res) => {
    res.json(getAllDownloads());
  });

  app.post('/api/downloads', async (req, res) => {
    try {
      const { url, title, uploader, thumbnail, quality, format, formatId } = req.body;
      if (!url || !title) {
        return res.status(400).json({ error: 'URL and title are required' });
      }

      const id = 'dl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const item: DownloadItem = {
        id,
        url,
        title: title.trim(),
        uploader: uploader || 'Unknown',
        thumbnail: thumbnail || '',
        status: 'QUEUED',
        progress: 0,
        downloadedBytes: 0,
        totalBytes: 0,
        speed: 0,
        eta: 0,
        quality: quality || 'Best Available',
        format: format || 'mp4',
        formatId: formatId || 'bestvideo+bestaudio/best',
        createdAt: new Date().toISOString()
      };

      await downloadEngine.queueDownload(item);
      res.status(201).json(item);
    } catch (err: any) {
      log('ERROR', `Failed to queue download: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/downloads/:id/pause', async (req, res) => {
    const success = await downloadEngine.pauseJob(req.params.id);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Download not found' });
    }
  });

  app.post('/api/downloads/:id/resume', async (req, res) => {
    const success = await downloadEngine.resumeJob(req.params.id);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Download not found' });
    }
  });

  app.post('/api/downloads/:id/cancel', async (req, res) => {
    const success = await downloadEngine.cancelJob(req.params.id);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Download not found' });
    }
  });

  app.post('/api/downloads/:id/retry', async (req, res) => {
    const success = await downloadEngine.retryJob(req.params.id);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Download not found' });
    }
  });

  app.post('/api/downloads/:id/rename', (req, res) => {
    const { newTitle } = req.body;
    if (!newTitle || typeof newTitle !== 'string') {
      return res.status(400).json({ error: 'newTitle is required' });
    }

    const updated = downloadEngine.renameJob(req.params.id, newTitle);
    if (updated) {
      res.json(updated);
    } else {
      res.status(404).json({ error: 'Download not found' });
    }
  });

  // Batch queuing
  app.post('/api/downloads/batch', async (req, res) => {
    try {
      const { urls, format = 'mp4', quality = 'Best Available' } = req.body;
      if (!Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ error: 'Array of URLs is required' });
      }

      const queuedList: DownloadItem[] = [];
      for (const rawUrl of urls) {
        const u = typeof rawUrl === 'string' ? rawUrl.trim() : rawUrl?.url?.trim();
        if (!u) continue;

        let parsedTitle = 'Download ' + new Date().toISOString().slice(11, 19);
        try {
          const urlObj = new URL(u);
          const pathBase = path.basename(urlObj.pathname);
          if (pathBase) parsedTitle = pathBase;
        } catch {}

        const id = 'dl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const item: DownloadItem = {
          id,
          url: u,
          title: parsedTitle,
          uploader: 'Batch Queue',
          thumbnail: '',
          status: 'QUEUED',
          progress: 0,
          downloadedBytes: 0,
          totalBytes: 0,
          speed: 0,
          eta: 0,
          quality: quality || 'Best Available',
          format: format || 'mp4',
          formatId: 'bestvideo+bestaudio/best',
          createdAt: new Date().toISOString()
        };

        await downloadEngine.queueDownload(item);
        queuedList.push(item);
      }

      res.status(201).json({ success: true, count: queuedList.length, items: queuedList });
    } catch (err: any) {
      log('ERROR', `Batch queue failed: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/downloads/export', (req, res) => {
    const all = getAllDownloads();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="videoflow-downloads.json"');
    res.send(JSON.stringify(all, null, 2));
  });

  app.post('/api/downloads/import', (req, res) => {
    try {
      const items = req.body.items || req.body.downloads || (Array.isArray(req.body) ? req.body : []);
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Expected items or downloads array' });
      }
      let importedCount = 0;
      for (const raw of items) {
        if (raw && raw.url && raw.title) {
          const id = 'dl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
          const item: DownloadItem = {
            ...raw,
            id,
            status: 'QUEUED',
            progress: 0,
            speed: 0,
            eta: 0
          };
          downloadEngine.queueDownload(item);
          importedCount++;
        }
      }
      res.json({ success: true, count: importedCount, imported: importedCount });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/downloads/:id', async (req, res) => {
    const deleteFile = req.query.deleteFile === 'true' || req.body?.deleteFile === true;
    const success = await downloadEngine.removeJob(req.params.id, deleteFile);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Download not found' });
    }
  });

  app.post('/api/downloads/clear-completed', (req, res) => {
    const count = clearCompleted();
    broadcastEvent('stats', downloadEngine.getStats());
    res.json({ success: true, count });
  });

  app.post('/api/history/clear', (req, res) => {
    const count = clearHistory();
    broadcastEvent('stats', downloadEngine.getStats());
    res.json({ success: true, count, cleared: count });
  });

  app.post('/api/downloads/reorder', (req, res) => {
    const { order } = req.body;
    if (Array.isArray(order)) {
      reorderDownloads(order);
      const all = getAllDownloads();
      broadcastEvent('queue_updated', all);
      res.json({ success: true, downloads: all });
    } else {
      res.status(400).json({ error: 'Invalid order array' });
    }
  });

  // 4. File Streaming / In-browser Playback Endpoint with HTTP Range support
  app.get('/api/downloads/:id/file', (req, res) => {
    const item = getDownloadById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Download record not found' });
    }

    if (!item.outputPath || !fs.existsSync(item.outputPath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    const stat = fs.statSync(item.outputPath);
    const fileSize = stat.size;
    const range = req.headers.range;
    const ext = path.extname(item.outputPath).toLowerCase();

    let contentType = 'application/octet-stream';
    if (ext === '.mp4') contentType = 'video/mp4';
    else if (ext === '.webm') contentType = 'video/webm';
    else if (ext === '.mkv') contentType = 'video/x-matroska';
    else if (ext === '.mp3') contentType = 'audio/mpeg';
    else if (ext === '.m4a') contentType = 'audio/mp4';
    else if (ext === '.flac') contentType = 'audio/flac';
    else if (ext === '.wav') contentType = 'audio/wav';
    else if (ext === '.ogg') contentType = 'audio/ogg';
    else if (ext === '.zip') contentType = 'application/zip';

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(item.outputPath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Content-Disposition': `inline; filename="${encodeURIComponent(item.fileName || path.basename(item.outputPath))}"`
      });
      fs.createReadStream(item.outputPath).pipe(res);
    }
  });

  // 5. Reveal / Information about Download File Location
  app.get('/api/downloads/:id/reveal', (req, res) => {
    const item = getDownloadById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Download not found' });
    }

    const exists = item.outputPath ? fs.existsSync(item.outputPath) : false;
    let size = 0;
    if (exists && item.outputPath) {
      try {
        size = fs.statSync(item.outputPath).size;
      } catch {}
    }

    res.json({
      outputPath: item.outputPath || 'Not created yet',
      directory: item.outputPath ? path.dirname(item.outputPath) : getSettings().downloadDirectory,
      fileName: item.fileName || (item.outputPath ? path.basename(item.outputPath) : ''),
      exists,
      size,
      status: item.status
    });
  });

  // 6. Settings Endpoints
  app.get('/api/settings', (req, res) => {
    res.json(getSettings());
  });

  app.post('/api/settings', (req, res) => {
    const result = saveSettings(req.body);
    if (result.success) {
      broadcastEvent('settings_updated', result.settings);
      res.json(result.settings);
    } else {
      res.status(400).json({ error: result.error || 'Failed to update settings' });
    }
  });

  app.post('/api/settings/reset', (req, res) => {
    const settings = resetSettings();
    broadcastEvent('settings_updated', settings);
    res.json(settings);
  });

  // 7. System & Folder Validation
  app.post('/api/system/check-folder', (req, res) => {
    const folderPath = req.body.folderPath || req.body.directory || req.body.path;
    if (!folderPath) {
      return res.status(400).json({ valid: false, error: 'Path is required' });
    }

    const check = verifyAndResolveDirectory(folderPath);
    res.json(check);
  });

  // 8. Stats Endpoint
  app.get('/api/stats', (req, res) => {
    res.json(downloadEngine.getStats());
  });

  // 9. Logs Endpoints
  app.get('/api/logs', (req, res) => {
    res.json(getLogs());
  });

  app.post('/api/logs/clear', (req, res) => {
    clearLogs();
    broadcastEvent('logs_cleared', {});
    res.json({ success: true });
  });

  // 10. Cookies Management
  const COOKIES_PATH = path.join(process.cwd(), 'data', 'cookies.txt');

  app.get('/api/cookies', (req, res) => {
    const exists = fs.existsSync(COOKIES_PATH);
    if (exists) {
      const stat = fs.statSync(COOKIES_PATH);
      res.json({
        hasCookies: true,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString()
      });
    } else {
      res.json({ hasCookies: false, size: 0 });
    }
  });

  app.post('/api/cookies', (req, res) => {
    try {
      const { content } = req.body;
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ error: 'Cookie content is required' });
      }

      fs.writeFileSync(COOKIES_PATH, content, 'utf-8');
      log('INFO', 'cookies.txt updated');
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/cookies', (req, res) => {
    try {
      if (fs.existsSync(COOKIES_PATH)) {
        fs.unlinkSync(COOKIES_PATH);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 11. Archive Management (Compression / Extraction / Inspection)
  app.post('/api/archive/compress', async (req, res) => {
    try {
      const { fileIds, archiveName = 'MyArchive', level = 6 } = req.body;
      if (!Array.isArray(fileIds) || fileIds.length === 0) {
        return res.status(400).json({ error: 'At least one file ID is required' });
      }

      const settings = getSettings();
      const destDir = settings.downloadDirectory;
      const safeArchiveName = sanitizeFilename(archiveName, 'Archive');
      const zipFileName = `${safeArchiveName}.zip`;
      const zipFilePath = path.join(destDir, zipFileName);

      const itemsToZip: { path: string; name: string }[] = [];
      for (const id of fileIds) {
        const item = getDownloadById(id);
        if (item && item.outputPath && fs.existsSync(item.outputPath)) {
          itemsToZip.push({
            path: item.outputPath,
            name: item.fileName || path.basename(item.outputPath)
          });
        }
      }

      if (itemsToZip.length === 0) {
        return res.status(404).json({ error: 'No existing downloaded files found for the given IDs' });
      }

      log('INFO', `Creating ZIP archive "${zipFileName}" with ${itemsToZip.length} files...`);

      const output = fs.createWriteStream(zipFilePath);
      const archive = new ZipArchive({
        zlib: { level: Math.min(9, Math.max(0, level)) }
      });

      await new Promise<void>((resolve, reject) => {
        output.on('close', () => resolve());
        archive.on('error', (err: any) => reject(err));
        archive.pipe(output);

        for (const f of itemsToZip) {
          archive.file(f.path, { name: f.name });
        }

        archive.finalize();
      });

      const stat = fs.statSync(zipFilePath);
      const zipItem: DownloadItem = {
        id: `archive_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        url: `file://${zipFilePath}`,
        title: zipFileName,
        uploader: 'VideoFlow Archive Manager',
        thumbnail: '',
        status: 'COMPLETED',
        progress: 100,
        downloadedBytes: stat.size,
        totalBytes: stat.size,
        speed: 0,
        eta: 0,
        quality: 'Compressed Archive',
        format: 'zip',
        outputPath: zipFilePath,
        fileName: zipFileName,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        isCompressedArchive: true
      };

      addDownload(zipItem);
      broadcastEvent('download_added', zipItem);
      broadcastEvent('stats', downloadEngine.getStats());

      log('INFO', `ZIP archive created successfully: ${zipFileName} (${stat.size} bytes)`);
      res.json({ success: true, item: zipItem, size: stat.size, fileCount: itemsToZip.length });
    } catch (err: any) {
      log('ERROR', `Compression failed: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/archive/extract', (req, res) => {
    try {
      const { fileId, outputDir, deleteSource = false } = req.body;
      const item = getDownloadById(fileId);
      if (!item || !item.outputPath || !fs.existsSync(item.outputPath)) {
        return res.status(404).json({ error: 'Archive file not found on disk' });
      }

      const zip = new AdmZip(item.outputPath);
      const destDir = outputDir || path.join(path.dirname(item.outputPath), path.parse(item.outputPath).name);
      const resolvedDest = path.resolve(destDir);

      if (!fs.existsSync(resolvedDest)) {
        fs.mkdirSync(resolvedDest, { recursive: true });
      }

      // Security: Zip Slip path traversal check
      const entries = zip.getEntries();
      for (const entry of entries) {
        const entryDest = path.resolve(resolvedDest, entry.entryName);
        if (!entryDest.startsWith(resolvedDest)) {
          return res.status(400).json({
            error: `Security violation: Archive entry "${entry.entryName}" attempts path traversal outside target directory.`
          });
        }
      }

      zip.extractAllTo(resolvedDest, true);

      if (deleteSource) {
        try {
          fs.unlinkSync(item.outputPath);
          deleteDownload(item.id);
          broadcastEvent('download_deleted', { id: item.id });
        } catch (e: any) {
          log('WARN', `Could not delete source archive: ${e.message}`);
        }
      }

      log('INFO', `Extracted ${entries.length} items from "${item.title}" to ${resolvedDest}`);
      res.json({
        success: true,
        extractedTo: resolvedDest,
        entryCount: entries.length,
        entries: entries.map(e => ({ name: e.entryName, isDirectory: e.isDirectory, size: e.header.size }))
      });
    } catch (err: any) {
      log('ERROR', `Extraction failed: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/archive/inspect', (req, res) => {
    try {
      const { fileId } = req.body;
      const item = getDownloadById(fileId);
      if (!item || !item.outputPath || !fs.existsSync(item.outputPath)) {
        return res.status(404).json({ error: 'Archive file not found' });
      }

      const zip = new AdmZip(item.outputPath);
      const entries = zip.getEntries().map(e => ({
        name: e.entryName,
        isDirectory: e.isDirectory,
        size: e.header.size,
        compressedSize: e.header.compressedSize
      }));

      res.json({ success: true, fileName: item.fileName, entries });
    } catch (err: any) {
      res.status(500).json({ error: `Cannot inspect archive: ${err.message}` });
    }
  });

  // 12. Audio Extractor & Direct Stream Tool
  app.post('/api/audio/extract', async (req, res) => {
    try {
      const { url, title, format = 'mp3', quality = '320 kbps (High)' } = req.body;
      if (!url) {
        return res.status(400).json({ error: 'URL is required for audio extraction' });
      }

      let audioTitle = title?.trim();
      if (!audioTitle) {
        try {
          const parsed = new URL(url);
          audioTitle = path.basename(parsed.pathname) || 'Extracted Audio Track';
        } catch {
          audioTitle = 'Extracted Audio Track';
        }
      }

      const newItem: DownloadItem = {
        id: `audio_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        url,
        title: audioTitle,
        uploader: 'Audio Extraction Pipeline',
        thumbnail: '',
        status: 'QUEUED',
        progress: 0,
        downloadedBytes: 0,
        totalBytes: 0,
        speed: 0,
        eta: 0,
        quality: quality || 'Audio High (320 kbps)',
        format: format || 'mp3',
        createdAt: new Date().toISOString(),
        isAudioExtracted: true
      };

      await downloadEngine.queueDownload(newItem);
      res.status(201).json({ success: true, item: newItem });
    } catch (err: any) {
      log('ERROR', `Audio extraction setup failed: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  // Mount Vite development middlewares in dev mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });
  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    log('INFO', `VideoFlow Download Manager server listening on http://0.0.0.0:${PORT}`);
    log('INFO', `Active download directory: ${getSettings().downloadDirectory}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup failure:', err);
  process.exit(1);
});
