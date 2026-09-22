import fs from 'fs';
import path from 'path';
import { DownloadItem } from '../types';
import { log } from '../logger';

const DATA_DIR = path.join(process.cwd(), 'data');
const DOWNLOADS_FILE = path.join(DATA_DIR, 'downloads.json');

let downloads: DownloadItem[] = [];

export function loadDownloads(): DownloadItem[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DOWNLOADS_FILE)) {
      const data = fs.readFileSync(DOWNLOADS_FILE, 'utf-8');
      downloads = JSON.parse(data);

      // Sanitize interrupted downloads on startup
      for (const item of downloads) {
        if (item.status === 'DOWNLOADING' || item.status === 'ANALYZING') {
          item.status = 'PAUSED';
          item.error = 'Download was interrupted when the application closed.';
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
  // Prevent duplicate item with same id
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
  if (deleteFile && item.outputPath && fs.existsSync(item.outputPath)) {
    try {
      fs.unlinkSync(item.outputPath);
      log('INFO', `Deleted file on disk: ${item.outputPath}`);
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
  // Append any remaining
  for (const item of idMap.values()) {
    reordered.push(item);
  }
  downloads = reordered;
  persistDownloads();
}

export function renameDownload(id: string, newTitle: string): DownloadItem | undefined {
  const item = downloads.find(d => d.id === id);
  if (!item) return undefined;
  item.title = newTitle.trim();
  if (item.fileName) {
    const ext = path.extname(item.fileName);
    item.fileName = `${newTitle.trim()}${ext}`;
  }
  persistDownloads();
  return item;
}
