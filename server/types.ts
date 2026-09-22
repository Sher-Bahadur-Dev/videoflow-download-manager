export type DownloadStatus = 
  | 'ANALYZING'
  | 'QUEUED'
  | 'DOWNLOADING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface FormatOption {
  formatId: string;
  resolution: string; // e.g., "1080p", "720p", "audio only"
  ext: string;        // "mp4", "webm", "mkv", "mp3", "m4a"
  filesize?: number;  // bytes if known
  filesizeFormatted?: string;
  note?: string;
  hasVideo: boolean;
  hasAudio: boolean;
  qualityLabel?: string;
  fps?: number;
  vcodec?: string;
  acodec?: string;
}

export interface VideoMetadata {
  url: string;
  title: string;
  uploader: string;
  duration: number; // in seconds
  durationFormatted: string;
  thumbnail: string;
  uploadDate?: string;
  descriptionPreview?: string;
  viewCount?: number;
  source: string; // 'youtube' | 'direct' | 'vimeo' | 'generic'
  availableFormats: FormatOption[];
  defaultFormatId?: string;
  videoId?: string;
  embedUrl?: string;
  isRestricted?: boolean;
  restrictionReason?: string;
}

export interface DownloadSegment {
  id: number;
  start: number;
  end: number;
  downloaded: number;
  total: number;
  speed: number;
  status: 'connecting' | 'downloading' | 'completed' | 'idle';
}

export interface DownloadItem {
  id: string;
  url: string;
  title: string;
  uploader: string;
  thumbnail: string;
  status: DownloadStatus;
  progress: number; // 0 - 100
  downloadedBytes: number;
  totalBytes: number;
  speed: number; // bytes per second
  eta: number; // seconds remaining
  quality: string; // e.g. "1080p"
  format: string; // "mp4", "webm", "mp3", "zip"
  formatId?: string;
  outputPath?: string;
  fileName?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  retryCount?: number;
  segments?: DownloadSegment[];
  connectionsCount?: number;
  isCompressedArchive?: boolean;
  isAudioExtracted?: boolean;
}

export interface AppSettings {
  downloadDirectory: string;
  maxConcurrentDownloads: number;
  retryCount: number;
  retryDelay: number;
  autoResume: boolean;
  startAutomatically: boolean;
  askBeforeDownloading: boolean;
  startOnStartup: boolean;
  organizeByChannel: boolean;
  organizeByYear: boolean;
  sanitizeFilenames: boolean;
  preventDuplicates: boolean;
  theme: 'dark' | 'light' | 'system';
  compactMode: boolean;
  notifyOnComplete: boolean;
  notifyOnFail: boolean;
  notifyOnPause: boolean;
  debugMode: boolean;
  speedLimitKBps: number; // 0 = unlimited
  schedulerEnabled: boolean;
  schedulerStartTime: string;
  schedulerStopTime: string;
  schedulerStartQueued: boolean;
  schedulerPauseAfter: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  details?: Record<string, any>;
}

export interface DownloadEvent {
  type: 'PROGRESS' | 'STATUS_CHANGE' | 'ADDED' | 'REMOVED' | 'COMPLETED' | 'ERROR' | 'SETTINGS_UPDATED';
  item?: DownloadItem;
  stats?: DashboardStats;
  message?: string;
}

export interface DashboardStats {
  activeCount: number;
  queuedCount: number;
  completedCount: number;
  failedCount: number;
  totalDownloadedBytes: number;
  currentSpeed: number; // bytes/sec across all active downloads
}
