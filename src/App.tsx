import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ActiveTab,
  DashboardStats,
  DownloadItem,
  AppSettings,
  LogEntry,
  SortField,
  SortDirection,
  SidebarFilter,
  MainView
} from './types';
import { TitleBar } from './components/TitleBar';
import { MenuBar } from './components/MenuBar';
import { Toolbar } from './components/Toolbar';
import { CategorySidebar } from './components/CategorySidebar';
import { DownloadTable } from './components/DownloadTable';
import { DetailPanel } from './components/DetailPanel';
import { StatusBar } from './components/StatusBar';
import { ContextMenu } from './components/ContextMenu';
import { AddUrlDialog } from './components/AddUrlDialog';
import { AddBatchDialog } from './components/AddBatchDialog';
import { PropertiesDialog } from './components/PropertiesDialog';
import { RenameDialog } from './components/RenameDialog';
import { BatchRenameDialog } from './components/BatchRenameDialog';
import { ColumnChooserDialog } from './components/ColumnChooserDialog';
import { SchedulerDialog } from './components/SchedulerDialog';
import { ShortcutsDialog } from './components/ShortcutsDialog';
import { AboutDialog } from './components/AboutDialog';
import { SettingsView } from './components/SettingsView';
import { QueueView } from './components/QueueView';
import { HistoryView } from './components/HistoryView';
import { LogsView } from './components/LogsView';
import { FilePreviewModal } from './components/FilePreviewModal';
import { FolderRevealModal } from './components/FolderRevealModal';
import { VideoPlayerView } from './components/VideoPlayerView';
import { ArchiveManagerModal } from './components/ArchiveManagerModal';
import { AudioExtractorModal } from './components/AudioExtractorModal';
import { Copy, Plus, X } from 'lucide-react';
import { getCategory } from './utils';

const DEFAULT_STATS: DashboardStats = {
  activeCount: 0,
  queuedCount: 0,
  completedCount: 0,
  failedCount: 0,
  totalDownloadedBytes: 0,
  currentSpeed: 0
};

const DEFAULT_SETTINGS: AppSettings = {
  downloadDirectory: 'downloads',
  maxConcurrentDownloads: 3,
  retryCount: 3,
  retryDelay: 5,
  autoResume: true,
  startAutomatically: true,
  askBeforeDownloading: false,
  startOnStartup: false,
  organizeByChannel: true,
  organizeByYear: false,
  sanitizeFilenames: true,
  preventDuplicates: true,
  theme: 'dark',
  compactMode: false,
  notifyOnComplete: true,
  notifyOnFail: true,
  notifyOnPause: false,
  debugMode: false,
  speedLimitKBps: 0,
  monitorClipboard: true,
  schedulerEnabled: false,
  schedulerStartTime: '23:00',
  schedulerStopTime: '07:00',
  schedulerStartQueued: true,
  schedulerPauseAfter: true
};

const DEFAULT_VISIBLE_COLUMNS: Record<string, boolean> = {
  statusIcon: true,
  title: true,
  source: true,
  category: true,
  status: true,
  size: true,
  progress: true,
  downloaded: true,
  speed: true,
  eta: true,
  date: true,
  location: false
};

export function App() {
  // Main data states
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [stats, setStats] = useState<DashboardStats>(DEFAULT_STATS);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);

  // View & Category navigation
  const [mainView, setMainView] = useState<MainView>('downloads');
  const [currentFilter, setCurrentFilter] = useState<SidebarFilter>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [grabUrl, setGrabUrl] = useState<string>('');

  // Table selection, sorting & column visibility
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('videoflow_table_columns');
      return saved ? JSON.parse(saved) : DEFAULT_VISIBLE_COLUMNS;
    } catch {
      return DEFAULT_VISIBLE_COLUMNS;
    }
  });

  // Active item detail panel
  const [activeDetailItem, setActiveDetailItem] = useState<DownloadItem | null>(null);

  // Modals & Dialogs
  const [isAddUrlOpen, setIsAddUrlOpen] = useState(false);
  const [addUrlInitial, setAddUrlInitial] = useState<string>('');
  const [clipboardDetectedUrl, setClipboardDetectedUrl] = useState<string | null>(null);
  const lastClipboardUrlRef = useRef<string>('');
  const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  const [isColumnChooserOpen, setIsColumnChooserOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const [isBatchRenameOpen, setIsBatchRenameOpen] = useState(false);
  const [batchRenameItems, setBatchRenameItems] = useState<DownloadItem[]>([]);
  const [archiveInitialItems, setArchiveInitialItems] = useState<DownloadItem[]>([]);
  const [audioInitialItem, setAudioInitialItem] = useState<DownloadItem | null>(null);

  const [renameItem, setRenameItem] = useState<DownloadItem | null>(null);
  const [propertiesItem, setPropertiesItem] = useState<DownloadItem | null>(null);
  const [propertiesTab, setPropertiesTab] = useState<'general' | 'integrity'>('general');
  const [propertiesAlgo, setPropertiesAlgo] = useState<'md5' | 'sha256' | 'sha1'>('sha256');
  const [previewItem, setPreviewItem] = useState<DownloadItem | null>(null);
  const [revealInfo, setRevealInfo] = useState<any | null>(null);

  // Real-time download throughput array representing the last 60 seconds of speed fluctuations
  const [speedData, setSpeedData] = useState<number[]>(() => Array(60).fill(0));
  const currentSpeedRef = useRef<number>(0);

  useEffect(() => {
    const current = Math.max(0, stats.currentSpeed || 0);
    currentSpeedRef.current = current;
    setSpeedData((prev) => {
      const next = [...prev];
      if (next.length === 0) return [current];
      next[next.length - 1] = current;
      return next;
    });
  }, [stats.currentSpeed]);

  useEffect(() => {
    const interval = setInterval(() => {
      const current = currentSpeedRef.current;
      setSpeedData((prev) => {
        const next = [...prev.slice(1), current];
        return next.length > 60 ? next.slice(-60) : next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Context Menu
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: DownloadItem;
    effectiveSelectedIds?: Set<string>;
  } | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 1. Initial data fetch and SSE connection
  useEffect(() => {
    fetchInitialData();
    connectEventSource();

    // Check for grab URL in query parameters (e.g. from browser bookmarklet)
    try {
      const params = new URLSearchParams(window.location.search);
      const grabParam = params.get('grab');
      if (grabParam) {
        setGrabUrl(decodeURIComponent(grabParam));
        setMainView('grabber');
        setCurrentFilter('view_grabber');
      }
    } catch {
      // ignore
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const handleQueueDownload = async (item: Partial<DownloadItem>) => {
    const res = await fetch('/api/downloads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to queue download');
    }
    const created = await res.json();
    setDownloads((prev) => [created, ...prev]);
  };

  // Save column visibility preferences
  useEffect(() => {
    localStorage.setItem('videoflow_table_columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // Keep activeDetailItem up to date as downloads stream in
  useEffect(() => {
    if (activeDetailItem) {
      const updated = downloads.find((d) => d.id === activeDetailItem.id);
      if (updated) {
        setActiveDetailItem(updated);
      }
    }
  }, [downloads]);

  // IDM Clipboard Monitoring
  useEffect(() => {
    if (!settings.monitorClipboard) return;

    const checkClipboard = async () => {
      try {
        if (!navigator.clipboard || !navigator.clipboard.readText) return;
        const text = await navigator.clipboard.readText();
        const trimmed = text ? text.trim() : '';
        if (
          trimmed &&
          trimmed !== lastClipboardUrlRef.current &&
          (trimmed.startsWith('http://') || trimmed.startsWith('https://')) &&
          !trimmed.includes('\n') &&
          trimmed.length > 10
        ) {
          lastClipboardUrlRef.current = trimmed;
          const exists = downloads.some((d) => d.url === trimmed);
          if (!exists) {
            setClipboardDetectedUrl(trimmed);
          }
        }
      } catch {
        // Tab not focused or user permission pending
      }
    };

    window.addEventListener('focus', checkClipboard);
    const interval = setInterval(checkClipboard, 3500);

    return () => {
      window.removeEventListener('focus', checkClipboard);
      clearInterval(interval);
    };
  }, [settings.monitorClipboard, downloads]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F1 should work even if user is in an input field (standard Help shortcut)
      if (e.key === 'F1') {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }

      // Don't trigger other shortcuts if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') target.blur();
        return;
      }

      // '?' key opens shortcuts cheat sheet
      if (e.key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }

      // Alt + 1-6 view switching
      if (e.altKey && !e.ctrlKey && !e.shiftKey) {
        if (e.key === '1') {
          e.preventDefault();
          handleSelectSidebarFilter('all');
          return;
        } else if (e.key === '2') {
          e.preventDefault();
          handleSelectSidebarFilter('view_queue');
          return;
        } else if (e.key === '3') {
          e.preventDefault();
          handleSelectSidebarFilter('view_history');
          return;
        } else if (e.key === '4') {
          e.preventDefault();
          handleSelectSidebarFilter('view_grabber');
          return;
        } else if (e.key === '5') {
          e.preventDefault();
          handleSelectSidebarFilter('view_logs');
          return;
        } else if (e.key === '6') {
          e.preventDefault();
          handleSelectSidebarFilter('view_settings');
          return;
        }
      }

      // Quick key 'G' for grabber
      if (e.key.toLowerCase() === 'g' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        handleSelectSidebarFilter('view_grabber');
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSelectAll();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsAddUrlOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsAddBatchOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        // focus search
        const el = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        if (el) el.focus();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === ',') {
        e.preventDefault();
        setMainView('settings');
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        fetchInitialData();
      } else if (e.key === 'Delete') {
        if (selectedIds.size > 0) {
          e.preventDefault();
          handleBatchDelete(e.shiftKey);
        }
      } else if (e.key === ' ') {
        if (selectedIds.size === 1) {
          e.preventDefault();
          const id = Array.from(selectedIds)[0];
          const item = downloads.find((d) => d.id === id);
          if (item) {
            if (item.status === 'DOWNLOADING') handlePause(id);
            else handleResume(id);
          }
        }
      } else if (e.key === 'Escape') {
        if (selectedIds.size > 0) {
          handleClearSelection();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, downloads]);

  const fetchInitialData = async () => {
    try {
      const [downloadsRes, statsRes, settingsRes, logsRes] = await Promise.all([
        fetch('/api/downloads').then((r) => r.json()),
        fetch('/api/stats').then((r) => r.json()),
        fetch('/api/settings').then((r) => r.json()),
        fetch('/api/logs').then((r) => r.json())
      ]);

      if (Array.isArray(downloadsRes)) setDownloads(downloadsRes);
      if (statsRes) setStats(statsRes);
      if (settingsRes) setSettings(settingsRes);
      if (Array.isArray(logsRes)) setLogs(logsRes);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  const connectEventSource = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const sse = new EventSource('/api/events');
    eventSourceRef.current = sse;

    sse.onopen = () => {
      setConnected(true);
    };

    sse.onerror = () => {
      setConnected(false);
      sse.close();
      setTimeout(connectEventSource, 3000);
    };

    sse.addEventListener('init', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (Array.isArray(data.downloads)) setDownloads(data.downloads);
        if (data.stats) setStats(data.stats);
        if (data.settings) setSettings(data.settings);
      } catch (err) {
        console.error('SSE init error:', err);
      }
    });

    sse.addEventListener('progress', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setDownloads((prev) =>
          prev.map((d) => (d.id === data.id ? { ...d, ...data } : d))
        );
      } catch (err) {
        console.error('SSE progress error:', err);
      }
    });

    sse.addEventListener('status', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setDownloads((prev) => {
          const exists = prev.find((d) => d.id === data.id);
          if (exists) {
            return prev.map((d) => (d.id === data.id ? { ...d, ...data } : d));
          }
          return [data, ...prev];
        });
      } catch (err) {
        console.error('SSE status error:', err);
      }
    });

    sse.addEventListener('queue_updated', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (Array.isArray(data)) setDownloads(data);
      } catch (err) {
        console.error('SSE queue_updated error:', err);
      }
    });

    sse.addEventListener('stats', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setStats(data);
      } catch (err) {
        console.error('SSE stats error:', err);
      }
    });

    sse.addEventListener('log', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setLogs((prev) => [...prev.slice(-499), data]);
      } catch (err) {
        console.error('SSE log error:', err);
      }
    });

    sse.addEventListener('logs_cleared', () => {
      setLogs([]);
    });
  };

  // Filter & Sort Logic
  const filteredDownloads = useMemo(() => {
    return downloads.filter((item) => {
      // 1. Text Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title?.toLowerCase().includes(q);
        const matchUrl = item.url?.toLowerCase().includes(q);
        const matchAuthor = item.uploader?.toLowerCase().includes(q);
        const matchFile = item.fileName?.toLowerCase().includes(q);
        if (!matchTitle && !matchUrl && !matchAuthor && !matchFile) return false;
      }

      // 2. Category filter
      if (selectedCategory === 'all') return true;

      // Status filters
      if (selectedCategory.startsWith('status:')) {
        const targetStatus = selectedCategory.replace('status:', '');
        return item.status === targetStatus;
      }

      // Format / type filters
      const cat = getCategory(item);
      return cat === selectedCategory;
    });
  }, [downloads, searchQuery, selectedCategory]);

  const sortedDownloads = useMemo(() => {
    return [...filteredDownloads].sort((a, b) => {
      let aVal: any = (a as any)[sortField];
      let bVal: any = (b as any)[sortField];

      if (sortField === 'title') {
        aVal = a.title || '';
        bVal = b.title || '';
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (sortField === 'format') {
        aVal = getCategory(a);
        bVal = getCategory(b);
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (sortField === 'createdAt' || sortField === 'completedAt') {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      aVal = String(aVal || '');
      bVal = String(bVal || '');
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
  }, [filteredDownloads, sortField, sortDirection]);

  // Table selection handlers
  const handleToggleSelect = (id: string, shiftKey?: boolean, ctrlKey?: boolean) => {
    const clickedItem = downloads.find((d) => d.id === id);
    if (clickedItem) {
      setActiveDetailItem(clickedItem);
    }

    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (shiftKey && prev.size > 0) {
        // Range select
        const lastSelectedId = Array.from(prev)[prev.size - 1];
        const lastIdx = sortedDownloads.findIndex((d) => d.id === lastSelectedId);
        const currentIdx = sortedDownloads.findIndex((d) => d.id === id);

        if (lastIdx !== -1 && currentIdx !== -1) {
          const start = Math.min(lastIdx, currentIdx);
          const end = Math.max(lastIdx, currentIdx);
          for (let i = start; i <= end; i++) {
            next.add(sortedDownloads[i].id);
          }
          return next;
        }
      }

      if (ctrlKey) {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      } else {
        // Single row click selects only this row
        next.clear();
        next.add(id);
      }

      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(sortedDownloads.map((d) => d.id)));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Action APIs
  const handleAddDownload = async (item: {
    url: string;
    title: string;
    uploader: string;
    thumbnail: string;
    quality: string;
    format: string;
    formatId?: string;
  }) => {
    const res = await fetch('/api/downloads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add download');
    setDownloads((prev) => [data, ...prev]);
    setSelectedIds(new Set([data.id]));
    setActiveDetailItem(data);
  };

  const handleAddBatch = async (urls: string[], format: string, quality: string) => {
    const res = await fetch('/api/downloads/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls, format, quality })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to queue batch');
    fetchInitialData();
  };

  const handlePause = async (id: string) => {
    await fetch(`/api/downloads/${id}/pause`, { method: 'POST' });
  };

  const handleResume = async (id: string) => {
    await fetch(`/api/downloads/${id}/resume`, { method: 'POST' });
  };

  const handleCancel = async (id: string) => {
    await fetch(`/api/downloads/${id}/cancel`, { method: 'POST' });
  };

  const handleRetry = async (id: string) => {
    await fetch(`/api/downloads/${id}/retry`, { method: 'POST' });
  };

  const handleDelete = async (id: string, deleteFile = false) => {
    await fetch(`/api/downloads/${id}${deleteFile ? '?deleteFile=true' : ''}`, {
      method: 'DELETE'
    });
    setDownloads((prev) => prev.filter((d) => d.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (activeDetailItem?.id === id) {
      setActiveDetailItem(null);
    }
  };

  // Batch actions on selection
  const handleBatchResume = async (ids?: Set<string>) => {
    const targets = ids || selectedIds;
    for (const id of targets) {
      await handleResume(id);
    }
  };

  const handleBatchPause = async (ids?: Set<string>) => {
    const targets = ids || selectedIds;
    for (const id of targets) {
      await handlePause(id);
    }
  };

  const handleBatchStop = async (ids?: Set<string>) => {
    const targets = ids || selectedIds;
    for (const id of targets) {
      await handleCancel(id);
    }
  };

  const handleBatchRetry = async (ids?: Set<string>) => {
    const targets = ids || selectedIds;
    for (const id of targets) {
      await handleRetry(id);
    }
  };

  const handleBatchDelete = async (deleteFile = false, ids?: Set<string>) => {
    const targets = ids || selectedIds;
    const confirmed = confirm(
      `Remove ${targets.size} selected download${targets.size > 1 ? 's' : ''}${
        deleteFile ? ' AND delete file(s) from disk' : ''
      }?`
    );
    if (!confirmed) return;

    for (const id of targets) {
      await handleDelete(id, deleteFile);
    }
  };

  const handleClearCompleted = async () => {
    await fetch('/api/downloads/clear-completed', { method: 'POST' });
    setDownloads((prev) => prev.filter((d) => d.status !== 'COMPLETED'));
  };

  const handleClearHistory = async () => {
    await fetch('/api/history/clear', { method: 'POST' });
    setDownloads((prev) =>
      prev.filter(
        (d) => d.status === 'DOWNLOADING' || d.status === 'QUEUED' || d.status === 'PAUSED'
      )
    );
  };

  const handleRename = async (id: string, newTitle: string) => {
    const res = await fetch(`/api/downloads/${id}/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newTitle })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Rename failed');

    setDownloads((prev) =>
      prev.map((d) => (d.id === id ? { ...d, title: newTitle } : d))
    );
    if (activeDetailItem?.id === id) {
      setActiveDetailItem((prev) => (prev ? { ...prev, title: newTitle } : null));
    }
  };

  const handleBatchRename = async (renames: { id: string; newTitle: string }[]) => {
    const res = await fetch('/api/downloads/batch-rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ renames })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Batch rename failed');

    const renameMap = new Map(renames.map((r) => [r.id, r.newTitle]));
    setDownloads((prev) =>
      prev.map((d) => {
        const newTitle = renameMap.get(d.id);
        return newTitle ? { ...d, title: newTitle } : d;
      })
    );
    if (activeDetailItem && renameMap.has(activeDetailItem.id)) {
      const newTitle = renameMap.get(activeDetailItem.id)!;
      setActiveDetailItem((prev) => (prev ? { ...prev, title: newTitle } : null));
    }
  };

  const handleRevealFolder = async (id: string) => {
    try {
      const res = await fetch(`/api/downloads/${id}/reveal`);
      const data = await res.json();
      setRevealInfo(data);
    } catch (err: any) {
      alert(`Could not reveal folder: ${err.message}`);
    }
  };

  const handleOpenFile = (item: DownloadItem) => {
    setPreviewItem(item);
  };

  const handleExportList = async () => {
    try {
      const res = await fetch('/api/downloads/export');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `videoflow_downloads_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    }
  };

  const handleImportList = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        const res = await fetch('/api/downloads/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ downloads: json.downloads || json })
        });
        const result = await res.json();
        alert(`Imported ${result.imported} items successfully.`);
        fetchInitialData();
      } catch (err: any) {
        alert(`Import failed: ${err.message}`);
      }
    };
    input.click();
  };

  const handleSaveSettings = async (newSettings: Partial<AppSettings>) => {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings)
    });
    const updated = await res.json();
    setSettings(updated);
  };

  const handleResetSettings = async () => {
    const res = await fetch('/api/settings/reset', { method: 'POST' });
    const reset = await res.json();
    setSettings(reset);
  };

  const handleReorderQueue = async (newOrderIds: string[]) => {
    const res = await fetch('/api/downloads/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: newOrderIds })
    });
    const data = await res.json();
    if (data.downloads) setDownloads(data.downloads);
  };

  // Speed limit toggle from Toolbar
  const handleToggleSpeedLimit = async (limitKBps: number) => {
    await handleSaveSettings({ speedLimitKBps: limitKBps });
  };

  const handleSelectSidebarFilter = (filter: SidebarFilter) => {
    setCurrentFilter(filter);
    if (filter === 'view_queue') setMainView('queue');
    else if (filter === 'view_history') setMainView('history');
    else if (filter === 'view_logs') setMainView('logs');
    else if (filter === 'view_settings') setMainView('settings');
    else if (filter === 'view_grabber') setMainView('grabber');
    else if (filter === 'view_scheduler') setIsSchedulerOpen(true);
    else {
      setMainView('downloads');
      if (filter === 'all') setSelectedCategory('all');
      else if (filter === 'downloading') setSelectedCategory('status:DOWNLOADING');
      else if (filter === 'queued') setSelectedCategory('status:QUEUED');
      else if (filter === 'completed') setSelectedCategory('status:COMPLETED');
      else if (filter === 'failed') setSelectedCategory('status:FAILED');
      else if (filter === 'paused') setSelectedCategory('status:PAUSED');
      else if (filter === 'cat_video') setSelectedCategory('video');
      else if (filter === 'cat_audio') setSelectedCategory('audio');
      else if (filter === 'cat_compressed') setSelectedCategory('compressed');
      else if (filter === 'cat_programs') setSelectedCategory('programs');
      else if (filter === 'cat_docs') setSelectedCategory('documents');
      else if (filter === 'cat_other') setSelectedCategory('other');
      else if (filter === 'view_archive') setIsArchiveModalOpen(true);
      else if (filter === 'view_audio_tool') setIsAudioModalOpen(true);
    }
  };

  return (
    <div className="idm-shell h-screen w-screen flex flex-col overflow-hidden font-sans select-none">
      {/* 1. Windows Native-Style TitleBar */}
      <TitleBar
        stats={stats}
        connected={connected}
        onOpenAddModal={() => setIsAddUrlOpen(true)}
      />

      {/* 2. Desktop Dropdown MenuBar */}
      <MenuBar
        selectedItem={activeDetailItem}
        onOpenAddUrl={() => setIsAddUrlOpen(true)}
        onOpenAddBatch={() => setIsAddBatchOpen(true)}
        onOpenExport={handleExportList}
        onOpenImport={handleImportList}
        onStartSelected={handleBatchResume}
        onPauseSelected={handleBatchPause}
        onResumeSelected={handleBatchResume}
        onStopSelected={handleBatchStop}
        onRetrySelected={() => activeDetailItem && handleRetry(activeDetailItem.id)}
        onDeleteSelected={() => handleBatchDelete(false)}
        onOpenFile={handleOpenFile}
        onOpenFolder={(item) => handleRevealFolder(item.id)}
        onOpenProperties={(item) => setPropertiesItem(item)}
        onSelectFilter={handleSelectSidebarFilter}
        onOpenSettings={() => setMainView('settings')}
        onOpenScheduler={() => setIsSchedulerOpen(true)}
        onOpenSpeedLimiter={() => setMainView('settings')}
        onOpenColumnChooser={() => setIsColumnChooserOpen(true)}
        onClearCompleted={handleClearCompleted}
        onClearHistory={handleClearHistory}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenArchiveModal={() => setIsArchiveModalOpen(true)}
        onOpenAudioModal={() => setIsAudioModalOpen(true)}
        onOpenBatchRename={() => {
          const selected = downloads.filter((d) => selectedIds.has(d.id));
          if (selected.length > 0) {
            setBatchRenameItems(selected);
          } else if (activeDetailItem) {
            setBatchRenameItems([activeDetailItem]);
          }
          setIsBatchRenameOpen(true);
        }}
        onOpenIntegrity={(item) => {
          setPropertiesItem(item);
          setPropertiesTab('integrity');
          setPropertiesAlgo('sha256');
        }}
      />

      {/* 3. Utility Toolbar with Speed Limiter & Search */}
      <Toolbar
        selectedItem={activeDetailItem}
        selectedCount={selectedIds.size}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        speedLimitKBps={settings.speedLimitKBps || 0}
        onSpeedLimitChange={handleToggleSpeedLimit}
        onOpenAddUrl={() => setIsAddUrlOpen(true)}
        onOpenAddBatch={() => setIsAddBatchOpen(true)}
        onOpenGrabber={() => {
          setMainView('grabber');
          setCurrentFilter('view_grabber');
        }}
        onOpenArchiveModal={() => setIsArchiveModalOpen(true)}
        onOpenAudioModal={() => setIsAudioModalOpen(true)}
        onStartSelected={handleBatchResume}
        onPauseSelected={handleBatchPause}
        onStopSelected={handleBatchStop}
        onDeleteSelected={() => handleBatchDelete(false)}
        onOpenSettings={() => setMainView('settings')}
        onOpenColumnChooser={() => setIsColumnChooserOpen(true)}
      />

      {/* 4. Main Body: Category Sidebar + Dynamic Center Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Category Sidebar */}
        <CategorySidebar
          currentFilter={currentFilter}
          onSelectFilter={handleSelectSidebarFilter}
          downloads={downloads}
          downloadDirectory={settings.downloadDirectory}
        />

        {/* Center Workspace */}
        <div className="flex-1 flex flex-col overflow-hidden idm-workspace">
          {mainView === 'downloads' && (
            <>
              {/* Main Download Table */}
              <DownloadTable
                downloads={sortedDownloads}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onSelectAll={handleSelectAll}
                onClearSelection={handleClearSelection}
                onRowDoubleClick={(item) => {
                  if (item.status === 'COMPLETED') handleOpenFile(item);
                  else setPropertiesItem(item);
                }}
                onContextMenu={(e, item, effectiveSelection) => {
                  if (effectiveSelection) {
                    setSelectedIds(effectiveSelection);
                  }
                  setContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    item,
                    effectiveSelectedIds: effectiveSelection || selectedIds
                  });
                }}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                visibleColumns={visibleColumns}
              />

              {/* Bottom Selected Download Detail Panel with Real-time Speed Graph */}
              <DetailPanel
                item={activeDetailItem}
                onClose={() => setActiveDetailItem(null)}
                onOpenFile={handleOpenFile}
                onOpenFolder={(item) => handleRevealFolder(item.id)}
                onOpenProperties={(item) => setPropertiesItem(item)}
                onPause={handlePause}
                onResume={handleResume}
                onRetry={handleRetry}
              />
            </>
          )}

          {mainView === 'queue' && (
            <div className="flex-1 overflow-y-auto">
              <QueueView
                downloads={downloads}
                concurrencyLimit={settings.maxConcurrentDownloads}
                onResume={handleResume}
                onCancel={handleCancel}
                onReorder={handleReorderQueue}
                onOpenAddModal={() => setIsAddUrlOpen(true)}
              />
            </div>
          )}

          {mainView === 'history' && (
            <div className="flex-1 overflow-y-auto">
              <HistoryView
                downloads={downloads}
                onRetry={handleRetry}
                onDelete={handleDelete}
                onRevealFolder={handleRevealFolder}
                onPreviewFile={handleOpenFile}
                onClearHistory={handleClearHistory}
              />
            </div>
          )}

          {mainView === 'grabber' && (
            <div className="flex-1 overflow-y-auto">
              <VideoPlayerView
                onQueueDownload={handleQueueDownload}
                initialUrl={grabUrl}
              />
            </div>
          )}

          {mainView === 'logs' && (
            <div className="flex-1 overflow-y-auto">
              <LogsView
                logs={logs}
                onClearLogs={async () => {
                  await fetch('/api/logs', { method: 'DELETE' });
                  setLogs([]);
                }}
                onRefreshLogs={async () => {
                  const res = await fetch('/api/logs');
                  const data = await res.json();
                  if (Array.isArray(data)) setLogs(data);
                }}
              />
            </div>
          )}

          {mainView === 'settings' && (
            <div className="flex-1 overflow-hidden">
              <SettingsView
                settings={settings}
                onSaveSettings={handleSaveSettings}
                onResetSettings={handleResetSettings}
              />
            </div>
          )}
        </div>
      </div>

      {/* 5. Desktop Status Bar */}
      <StatusBar
        stats={stats}
        concurrencyLimit={settings.maxConcurrentDownloads}
        selectedCount={selectedIds.size}
        totalItemsCount={sortedDownloads.length}
        speedData={speedData}
      />

      {/* 6. Context Menu on Right-Click */}
      {contextMenu && (() => {
        const activeIds = contextMenu.effectiveSelectedIds || selectedIds;
        const targetItems = downloads.filter((d) => activeIds.has(d.id));
        const selectedCount = activeIds.size;

        return (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            item={contextMenu.item}
            selectedCount={selectedCount}
            selectedItems={targetItems}
            onClose={() => setContextMenu(null)}
            onStart={handleResume}
            onPause={handlePause}
            onResume={handleResume}
            onStop={handleCancel}
            onRetry={handleRetry}
            onOpenFile={handleOpenFile}
            onOpenFolder={(item) => handleRevealFolder(item.id)}
            onRename={(item) => setRenameItem(item)}
            onDelete={handleDelete}
            onProperties={(item) => {
              setPropertiesItem(item);
              setPropertiesTab('general');
              setPropertiesAlgo('sha256');
            }}
            onVerifyIntegrity={(item, algo) => {
              setPropertiesItem(item);
              setPropertiesTab('integrity');
              if (algo) setPropertiesAlgo(algo);
            }}
            onOpenInGrabber={(url) => {
              setGrabUrl(url);
              setMainView('grabber');
              setCurrentFilter('view_grabber');
            }}
            onCompress={(items) => {
              setArchiveInitialItems(items);
              setIsArchiveModalOpen(true);
            }}
            onExtract={(item) => {
              setArchiveInitialItems([item]);
              setIsArchiveModalOpen(true);
            }}
            onExtractAudio={(item) => {
              setAudioInitialItem(item);
              setIsAudioModalOpen(true);
            }}
            onBatchRename={(items) => {
              setBatchRenameItems(items);
              setIsBatchRenameOpen(true);
            }}
            onBatchResume={() => handleBatchResume(activeIds)}
            onBatchPause={() => handleBatchPause(activeIds)}
            onBatchStop={() => handleBatchStop(activeIds)}
            onBatchRetry={() => handleBatchRetry(activeIds)}
            onBatchDelete={(deleteFile) => handleBatchDelete(deleteFile, activeIds)}
            onSelectAll={handleSelectAll}
            onClearSelection={handleClearSelection}
          />
        );
      })()}

      {/* 7. Dialogs & Modals */}
      <AddUrlDialog
        isOpen={isAddUrlOpen}
        onClose={() => {
          setIsAddUrlOpen(false);
          setAddUrlInitial('');
        }}
        onAddDownload={handleAddDownload}
        defaultDirectory={settings.downloadDirectory}
        initialUrl={addUrlInitial}
      />

      <AddBatchDialog
        isOpen={isAddBatchOpen}
        onClose={() => setIsAddBatchOpen(false)}
        onAddBatch={handleAddBatch}
      />

      <PropertiesDialog
        item={propertiesItem}
        onClose={() => setPropertiesItem(null)}
        onOpenFile={handleOpenFile}
        onOpenFolder={(item) => handleRevealFolder(item.id)}
        initialTab={propertiesTab}
        initialAlgo={propertiesAlgo}
      />

      <RenameDialog
        item={renameItem}
        onClose={() => setRenameItem(null)}
        onRename={handleRename}
      />

      <ColumnChooserDialog
        isOpen={isColumnChooserOpen}
        onClose={() => setIsColumnChooserOpen(false)}
        visibleColumns={visibleColumns}
        onToggleColumn={(colId) =>
          setVisibleColumns((prev) => ({ ...prev, [colId]: !prev[colId] }))
        }
        onResetColumns={() => setVisibleColumns(DEFAULT_VISIBLE_COLUMNS)}
      />

      <SchedulerDialog
        isOpen={isSchedulerOpen}
        onClose={() => setIsSchedulerOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />

      <ShortcutsDialog
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
        onOpenAddUrl={() => setIsAddUrlOpen(true)}
        onOpenAddBatch={() => setIsAddBatchOpen(true)}
        onFocusSearch={() => {
          const el = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
          if (el) el.focus();
        }}
        onOpenSettings={() => {
          setMainView('settings');
          setCurrentFilter('view_settings');
        }}
        onRefresh={fetchInitialData}
        onTogglePauseResume={() => {
          if (selectedIds.size === 1) {
            const id = Array.from(selectedIds)[0];
            const item = downloads.find((d) => d.id === id);
            if (item) {
              if (item.status === 'DOWNLOADING') handlePause(id);
              else handleResume(id);
            }
          }
        }}
        onDeleteSelected={(deleteFile) => handleBatchDelete(deleteFile)}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onSwitchView={(view: MainView) => {
          setMainView(view);
          if (view === 'grabber') setCurrentFilter('view_grabber');
          else if (view === 'history') setCurrentFilter('view_history');
          else if (view === 'logs') setCurrentFilter('view_logs');
          else if (view === 'queue') setCurrentFilter('view_queue');
          else if (view === 'settings') setCurrentFilter('view_settings');
          else if (view === 'archive') setIsArchiveModalOpen(true);
          else if (view === 'audio_tool') setIsAudioModalOpen(true);
          else setCurrentFilter('all');
        }}
        selectedCount={selectedIds.size}
        selectedItemName={
          selectedIds.size === 1
            ? downloads.find((d) => d.id === Array.from(selectedIds)[0])?.title
            : undefined
        }
        canTogglePauseResume={selectedIds.size === 1}
        currentView={mainView}
      />

      <AboutDialog
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      {/* File Preview & Folder Reveal */}
      <FilePreviewModal
        item={previewItem}
        onClose={() => setPreviewItem(null)}
        onRevealFolder={handleRevealFolder}
        onQueueDownload={handleQueueDownload}
      />

      <FolderRevealModal
        info={revealInfo}
        onClose={() => setRevealInfo(null)}
      />

      {/* Archive & Compression Manager Modal */}
      <ArchiveManagerModal
        isOpen={isArchiveModalOpen}
        onClose={() => {
          setIsArchiveModalOpen(false);
          setArchiveInitialItems([]);
        }}
        downloads={downloads}
        selectedIds={new Set(archiveInitialItems.map((i) => i.id))}
        onRefreshDownloads={fetchInitialData}
      />

      {/* Audio Extractor & Demuxer Modal */}
      <AudioExtractorModal
        isOpen={isAudioModalOpen}
        onClose={() => {
          setIsAudioModalOpen(false);
          setAudioInitialItem(null);
        }}
        onAudioQueued={fetchInitialData}
        initialUrl={audioInitialItem?.url}
        initialTitle={audioInitialItem?.title}
      />

      {/* Batch Rename Modal */}
      <BatchRenameDialog
        isOpen={isBatchRenameOpen}
        onClose={() => {
          setIsBatchRenameOpen(false);
          setBatchRenameItems([]);
        }}
        items={
          batchRenameItems.length > 0
            ? batchRenameItems
            : downloads.filter((d) => selectedIds.has(d.id))
        }
        onBatchRename={handleBatchRename}
      />

      {/* IDM Clipboard Monitor Toast */}
      {clipboardDetectedUrl && (
        <div className="fixed bottom-9 right-4 z-40 bg-[#0e1626] border border-cyan-700/80 rounded-lg shadow-2xl p-3 max-w-sm flex flex-col space-y-2 text-xs text-slate-200 animate-in slide-in-from-bottom-2 duration-200 font-sans">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-cyan-400 font-semibold text-[11px]">
              <Copy className="w-3.5 h-3.5" />
              <span>Downloadable URL Copied</span>
            </div>
            <button
              onClick={() => setClipboardDetectedUrl(null)}
              className="p-0.5 text-slate-400 hover:text-white rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] font-mono text-slate-300 truncate bg-slate-900/90 p-1.5 rounded border border-slate-800 select-all">
            {clipboardDetectedUrl}
          </p>
          <div className="flex items-center justify-end space-x-2 pt-1">
            <button
              onClick={() => setClipboardDetectedUrl(null)}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] cursor-pointer"
            >
              Dismiss
            </button>
            <button
              onClick={() => {
                setAddUrlInitial(clipboardDetectedUrl);
                setIsAddUrlOpen(true);
                setClipboardDetectedUrl(null);
              }}
              className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-[11px] flex items-center space-x-1 shadow-sm cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Download</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
