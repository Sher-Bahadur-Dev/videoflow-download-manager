import { DownloadItem, CategoryType } from './types';

export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0 || isNaN(bytes)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(val >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatExactKiloBytes(bytes?: number): string {
  if (!bytes || bytes <= 0 || isNaN(bytes)) return '0.0 KB';
  const kb = bytes / 1024;
  return `${kb.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} KB`;
}

export function formatExactBytes(bytes?: number): string {
  if (!bytes || bytes <= 0 || isNaN(bytes)) return '0 B';
  return `${bytes.toLocaleString('en-US')} B`;
}

export function formatBytesDetailed(downloaded?: number, total?: number): string {
  const d = downloaded || 0;
  const t = total || 0;
  if (t > 0) {
    const pct = ((d / t) * 100).toFixed(1);
    return `${formatExactKiloBytes(d)} / ${formatExactKiloBytes(t)} (${pct}%)`;
  }
  return `${formatExactKiloBytes(d)} / Unknown`;
}

export function formatSpeed(bytesPerSec?: number): string {
  if (!bytesPerSec || bytesPerSec <= 0 || isNaN(bytesPerSec)) return '0 KB/s';
  if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s`;
}

export function formatEta(seconds?: number): string {
  if (!seconds || seconds <= 0 || isNaN(seconds)) return '--';
  if (seconds > 86400) return '> 1d';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatDate(isoString?: string): string {
  if (!isoString) return '--';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch {
    return isoString;
  }
}

export function getCategory(item: DownloadItem): CategoryType {
  if (item.isCompressedArchive) return 'compressed';
  if (item.isAudioExtracted) return 'audio';

  const ext = (
    item.format ||
    (item.fileName ? item.fileName.split('.').pop() : '') ||
    (item.url ? item.url.split('?')[0].split('.').pop() : '') ||
    ''
  ).toLowerCase();

  // Compressed Archives
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'iso', 'dmg', 'tgz', 'xz', 'cab'].includes(ext)) {
    return 'compressed';
  }

  // Programs & Binaries
  if (['exe', 'msi', 'apk', 'bin', 'app', 'deb', 'rpm', 'sh', 'bat', 'cmd'].includes(ext)) {
    return 'programs';
  }

  // Videos
  if (['mp4', 'webm', 'mkv', 'avi', 'mov', 'flv', 'wmv', 'm4v', 'ts', '3gp'].includes(ext)) {
    return 'video';
  }

  // Audio
  if (['mp3', 'm4a', 'wav', 'flac', 'aac', 'ogg', 'opus', 'wma', 'm4r'].includes(ext)) {
    return 'audio';
  }

  // Documents
  if (['pdf', 'doc', 'docx', 'txt', 'epub', 'rtf', 'odt', 'csv', 'xlsx', 'xls', 'pptx', 'ppt'].includes(ext)) {
    return 'documents';
  }

  return 'other';
}
