import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { log, getLogs, clearLogs } from './server/logger';
import { loadSettings, getSettings, saveSettings, resetSettings } from './server/storage/settings';
import { loadDownloads, getAllDownloads, getDownloadById, clearCompleted, reorderDownloads } from './server/storage/history';
import { analyzeVideo } from './server/analyzer/analyzer';
import { downloadEngine } from './server/downloader/engine';
import { DownloadItem, DownloadEvent } from './server/types';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize storage
  loadSettings();
  loadDownloads();
  log('INFO', 'VideoFlow Download Manager server initializing...');

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // SSE client connections for real-time progress updates
  const sseClients = new Set<express.Response>();

  downloadEngine.addEventListener((event: DownloadEvent) => {
    const payload = `data: ${JSON.stringify(event)}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(payload);
      } catch {
        sseClients.delete(client);
      }
    }
  });

  // 1. SSE Events Endpoint
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    sseClients.add(res);

    // Send initial snapshot
    const initialStats = downloadEngine.getStats();
    res.write(`data: ${JSON.stringify({ type: 'INIT', stats: initialStats })}\n\n`);

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
        createdAt: new Date().toISOString(),
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
      return res.status(400).json({ error: 'New title is required' });
    }
    const updated = downloadEngine.renameJob(req.params.id, newTitle);
    if (updated) {
      res.json(updated);
    } else {
      res.status(404).json({ error: 'Download not found' });
    }
  });

  app.post('/api/downloads/batch', async (req, res) => {
    try {
      const { urls, quality, format } = req.body;
      if (!Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ error: 'URLs array is required' });
      }

      const addedItems: DownloadItem[] = [];
      for (const rawUrl of urls) {
        const u = typeof rawUrl === 'string' ? rawUrl.trim() : '';
        if (!u) continue;

        let title = path.basename(new URL(u).pathname) || 'Media Download';
        let uploader = 'Web Media';
        let thumb = '';

        try {
          const meta = await analyzeVideo(u);
          if (meta) {
            title = meta.title;
            uploader = meta.uploader;
            thumb = meta.thumbnail;
          }
        } catch {
          // fallback to URL basename
        }

        const id = 'dl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const item: DownloadItem = {
          id,
          url: u,
          title: title.replace(/[<>:"/\\|?*]/g, '_').trim(),
          uploader,
          thumbnail: thumb,
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
        addedItems.push(item);
      }

      res.status(201).json({ success: true, count: addedItems.length, items: addedItems });
    } catch (err: any) {
      log('ERROR', `Batch download error: ${err.message}`);
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
      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Expected items array' });
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
      res.json({ success: true, count: importedCount });
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
    res.json({ success: true, count });
  });

  app.post('/api/downloads/reorder', (req, res) => {
    const { order } = req.body;
    if (Array.isArray(order)) {
      reorderDownloads(order);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Invalid order array' });
    }
  });

  // 4. File Streaming / In-browser Playback Endpoint
  app.get('/api/downloads/:id/file', (req, res) => {
    const item = getDownloadById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Download record not found' });
    }

    if (!item.outputPath || !fs.existsSync(item.outputPath)) {
      return res.status(404).json({ error: 'File not found on disk or still downloading' });
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

    // Support partial range for video scrubbing
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(item.outputPath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(item.fileName || path.basename(item.outputPath))}"`,
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

  // 6. Stats Endpoint
  app.get('/api/stats', (req, res) => {
    res.json(downloadEngine.getStats());
  });

  // 7. Settings Endpoints
  app.get('/api/settings', (req, res) => {
    res.json(getSettings());
  });

  app.post('/api/settings', (req, res) => {
    const result = saveSettings(req.body);
    if (result.success) {
      downloadEngine.checkAndProcessQueue();
      res.json(result.settings);
    } else {
      res.status(400).json({ error: result.error });
    }
  });

  app.post('/api/settings/reset', (req, res) => {
    const reset = resetSettings();
    res.json(reset);
  });

  // 8. Logs Endpoints
  app.get('/api/logs', (req, res) => {
    const limit = parseInt(req.query.limit as string) || 200;
    const level = req.query.level as string;
    const search = req.query.search as string;
    res.json(getLogs(limit, level, search));
  });

  app.delete('/api/logs', (req, res) => {
    clearLogs();
    res.json({ success: true });
  });

  // 9. Folder Verification
  app.post('/api/system/check-folder', (req, res) => {
    const { folderPath } = req.body;
    if (!folderPath) {
      return res.status(400).json({ valid: false, error: 'Path required' });
    }

    try {
      const resolved = path.resolve(folderPath);
      if (!fs.existsSync(resolved)) {
        fs.mkdirSync(resolved, { recursive: true });
      }
      // Test write permission
      const testFile = path.join(resolved, `.write_test_${Date.now()}`);
      fs.writeFileSync(testFile, 'ok');
      fs.unlinkSync(testFile);

      res.json({ valid: true, path: resolved });
    } catch (err: any) {
      res.status(400).json({ valid: false, error: `Invalid folder or permission denied: ${err.message}` });
    }
  });

  // 10. Cookies Management for YouTube Auth
  const COOKIES_PATH = path.join(process.cwd(), 'data', 'cookies.txt');
  app.get('/api/cookies', (req, res) => {
    const exists = fs.existsSync(COOKIES_PATH);
    let size = 0;
    let modifiedAt: string | undefined;
    if (exists) {
      const stat = fs.statSync(COOKIES_PATH);
      size = stat.size;
      modifiedAt = stat.mtime.toISOString();
    }
    res.json({ hasCookies: exists, size, modifiedAt });
  });

  app.post('/api/cookies', (req, res) => {
    try {
      const { content } = req.body;
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ error: 'Cookie content is required' });
      }
      fs.writeFileSync(COOKIES_PATH, content.trim(), 'utf-8');
      log('INFO', `Custom cookies.txt saved (${content.length} characters)`);
      res.json({ success: true, size: fs.statSync(COOKIES_PATH).size });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/cookies', (req, res) => {
    try {
      if (fs.existsSync(COOKIES_PATH)) {
        fs.unlinkSync(COOKIES_PATH);
        log('INFO', 'Custom cookies.txt removed');
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 11. Vite Middleware (Dev vs Prod)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    log('INFO', `VideoFlow Server running on http://0.0.0.0:${PORT}`);
  });

  process.on('SIGTERM', () => {
    log('INFO', 'SIGTERM received, shutting down gracefully...');
    downloadEngine.shutdown();
    server.close();
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
