export type DownloadStatus = 
  | 'ANALYZING'
  | 'QUEUED'
  | 'DOWNLOADING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type CategoryType = 'all' | 'video' | 'audio' | 'documents' | 'other';

export type ActiveTab = 'dashboard' | 'downloads' | 'queue' | 'history' | 'logs' | 'settings';

export interface FormatOption {
  formatId: string;
  resolution: string;
  qualityLabel?: string;
  ext: string;
  filesize?: number;
  filesizeFormatted?: string;
  note?: string;
  hasVideo: boolean;
  hasAudio: boolean;
  fps?: number;
}

export interface VideoMetadata {
  url: string;
  title: string;
  uploader: string;
  duration: number;
  durationFormatted: string;
  thumbnail: string;
  uploadDate?: string;
  descriptionPreview?: string;
  viewCount?: number;
  source: string;
  availableFormats: FormatOption[];
  defaultFormatId?: string;
}

export interface DownloadItem {
  id: string;
  url: string;
  title: string;
  uploader: string;
  thumbnail: string;
  status: DownloadStatus;
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
  speed: number;
  eta: number;
  quality: string;
  format: string;
  formatId?: string;
  outputPath?: string;
  fileName?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  retryCount?: number;
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

export interface DashboardStats {
  activeCount: number;
  queuedCount: number;
  completedCount: number;
  failedCount: number;
  totalDownloadedBytes: number;
  currentSpeed: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  details?: Record<string, any>;
}

export type SidebarFilter = 
  | 'all'
  | 'downloading'
  | 'queued'
  | 'completed'
  | 'failed'
  | 'paused'
  | 'cat_video'
  | 'cat_audio'
  | 'cat_docs'
  | 'cat_other'
  | 'view_queue'
  | 'view_history'
  | 'view_scheduler'
  | 'view_logs'
  | 'view_settings';

export type SortField = 'title' | 'status' | 'totalBytes' | 'progress' | 'downloadedBytes' | 'speed' | 'eta' | 'createdAt' | 'completedAt' | 'format';
export type SortDirection = 'asc' | 'desc';

export interface ColumnDefinition {
  id: string;
  label: string;
  defaultVisible: boolean;
  sortable: boolean;
  width?: string;
}
