import fs from 'fs';
import path from 'path';
import { DownloadItem } from '../types';
import { log } from '../logger';

const DATA_DIR = path.join(process.cwd(), 'data');
const DOWNLOADS_FILE = path.join(DATA_DIR, 'downloads.json');

/**
 * Sanitize a string to be a valid Windows / POSIX filename.
 * Strips illegal characters: < > : " / \ | ? * and ASCII control characters.
 * Guards against reserved Windows device names.
 */
export function sanitizeFilename(input: string, fallback = 'download'): string {
  if (!input) return fallback;

  // Replace invalid characters with underscore
  let cleaned = input.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();

  // Strip trailing periods and spaces (Windows file naming restriction)
  cleaned = cleaned.replace(/[. ]+$/, '');

  // Guard against Windows reserved names (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
  const reservedRegex = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i;
  if (reservedRegex.test(cleaned) || !cleaned) {
    cleaned = `_${cleaned || fallback}`;
  }

  // Maximum filename length is 240 chars
  if (cleaned.length > 240) {
    cleaned = cleaned.slice(0, 240);
  }

  return cleaned || fallback;
}

let downloads: DownloadItem[] = [];

export function loadDownloads(): DownloadItem[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DOWNLOADS_FILE)) {
      const data = fs.readFileSync(DOWNLOADS_FILE, 'utf-8');
      downloads = JSON.parse(data);

      // Verify and sanitize downloads on startup
      for (const item of downloads) {
        if (item.status === 'DOWNLOADING' || item.status === 'ANALYZING') {
          item.status = 'PAUSED';
          item.error = 'Download was paused when application closed.';
        } else if (item.status === 'COMPLETED') {
          // Verify physical file actually exists on disk (Phase 4 audit)
          if (item.outputPath) {
            if (!fs.existsSync(item.outputPath)) {
              item.status = 'FAILED';
              item.error = 'Physical file missing or deleted from disk.';
            } else {
              try {
                const stat = fs.statSync(item.outputPath);
                item.downloadedBytes = stat.size;
                item.totalBytes = stat.size;
              } catch {
                // Keep recorded sizes
              }
            }
          }
        }
      }
      persistDownloads();
    } else {
      downloads = [];
      persistDownloads();
    }
  } catch (err: any) {
    log('ERROR', `Failed to load downloads file: ${err.message}`);
    downloads = [];
  }
  return downloads;
}

export function persistDownloads() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DOWNLOADS_FILE, JSON.stringify(downloads, null, 2), 'utf-8');
  } catch (err: any) {
    log('ERROR', `Failed to persist downloads: ${err.message}`);
  }
}

export function getAllDownloads(): DownloadItem[] {
  return downloads;
}

export function getDownloadById(id: string): DownloadItem | undefined {
  return downloads.find(d => d.id === id);
}

export function addDownload(item: DownloadItem): DownloadItem {
  const existingIdx = downloads.findIndex(d => d.id === item.id);
  if (existingIdx >= 0) {
    downloads[existingIdx] = item;
  } else {
    downloads.unshift(item);
  }
  persistDownloads();
  return item;
}

export function updateDownload(id: string, updates: Partial<DownloadItem>): DownloadItem | undefined {
  const item = downloads.find(d => d.id === id);
  if (!item) return undefined;

  Object.assign(item, updates);
  persistDownloads();
  return item;
}

export function removeDownload(id: string, deleteFile = false): boolean {
  const idx = downloads.findIndex(d => d.id === id);
  if (idx === -1) return false;

  const item = downloads[idx];
  if (deleteFile && item.outputPath) {
    try {
      if (fs.existsSync(item.outputPath)) {
        fs.unlinkSync(item.outputPath);
        log('INFO', `Deleted file on disk: ${item.outputPath}`);
      }
      // Also clean up any partial or segment chunk files
      const partFile = `${item.outputPath}.part`;
      if (fs.existsSync(partFile)) {
        fs.unlinkSync(partFile);
      }
      // Check segment files
      const dir = path.dirname(item.outputPath);
      const baseName = path.basename(item.outputPath);
      if (fs.existsSync(dir)) {
        const dirFiles = fs.readdirSync(dir);
        for (const f of dirFiles) {
          if (f.startsWith(`${baseName}.seg`) || f.startsWith(`${baseName}.part`)) {
            try {
              fs.unlinkSync(path.join(dir, f));
            } catch {
              // ignore
            }
          }
        }
      }
    } catch (e: any) {
      log('WARN', `Could not delete file ${item.outputPath}: ${e.message}`);
    }
  }

  downloads.splice(idx, 1);
  persistDownloads();
  return true;
}

export const deleteDownload = removeDownload;

export function clearCompleted(): number {
  const initial = downloads.length;
  downloads = downloads.filter(d => d.status !== 'COMPLETED');
  persistDownloads();
  return initial - downloads.length;
}

export function clearHistory(): number {
  const initial = downloads.length;
  // Keep only active/pending downloads
  downloads = downloads.filter(
    d => d.status === 'DOWNLOADING' || d.status === 'QUEUED' || d.status === 'PAUSED'
  );
  persistDownloads();
  return initial - downloads.length;
}

export function reorderDownloads(orderedIds: string[]) {
  const idMap = new Map(downloads.map(d => [d.id, d]));
  const reordered: DownloadItem[] = [];

  for (const id of orderedIds) {
    const item = idMap.get(id);
    if (item) {
      reordered.push(item);
      idMap.delete(id);
    }
  }
  for (const item of idMap.values()) {
    reordered.push(item);
  }
  downloads = reordered;
  persistDownloads();
}

/**
 * Renames download record AND safely renames physical file on disk.
 */
export function renameDownload(id: string, newTitle: string): DownloadItem | undefined {
  const item = downloads.find(d => d.id === id);
  if (!item) return undefined;

  const trimmedTitle = newTitle.trim();
  if (!trimmedTitle) return item;

  item.title = trimmedTitle;

  // If there's an existing physical file on disk, rename it safely
  if (item.outputPath && fs.existsSync(item.outputPath)) {
    try {
      const dir = path.dirname(item.outputPath);
      const ext = path.extname(item.outputPath);
      const safeBaseName = sanitizeFilename(trimmedTitle);
      let newFileName = `${safeBaseName}${ext}`;
      let newOutputPath = path.join(dir, newFileName);

      // Prevent accidental overwrite if a different file with this name exists
      if (newOutputPath !== item.outputPath && fs.existsSync(newOutputPath)) {
        let counter = 1;
        while (fs.existsSync(newOutputPath)) {
          newFileName = `${safeBaseName} (${counter})${ext}`;
          newOutputPath = path.join(dir, newFileName);
          counter++;
        }
      }

      if (newOutputPath !== item.outputPath) {
        fs.renameSync(item.outputPath, newOutputPath);
        log('INFO', `Renamed file on disk from "${item.outputPath}" to "${newOutputPath}"`);
        item.outputPath = newOutputPath;
        item.fileName = newFileName;
      }
    } catch (err: any) {
      log('ERROR', `Failed to rename physical file on disk: ${err.message}`);
    }
  } else if (item.fileName) {
    const ext = path.extname(item.fileName);
    const safeBaseName = sanitizeFilename(trimmedTitle);
    item.fileName = `${safeBaseName}${ext}`;
  }

  persistDownloads();
  return item;
}
