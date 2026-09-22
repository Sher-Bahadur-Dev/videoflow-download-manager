import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Keyboard,
  X,
  Search,
  Play,
  Pause,
  Trash2,
  Settings,
  FolderOpen,
  Plus,
  Layers,
  RefreshCw,
  Tv,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Command,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { MainView } from '../types';

export interface ShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  // Interactive action triggers
  onOpenAddUrl?: () => void;
  onOpenAddBatch?: () => void;
  onFocusSearch?: () => void;
  onOpenSettings?: () => void;
  onRefresh?: () => void;
  onTogglePauseResume?: () => void;
  onDeleteSelected?: (deleteFile?: boolean) => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
  onSwitchView?: (view: MainView) => void;
  // Contextual status
  selectedCount?: number;
  selectedItemName?: string;
  canTogglePauseResume?: boolean;
  currentView?: MainView;
}

interface ShortcutItem {
  id: string;
  keys: string[];
  title: string;
  description: string;
  category: 'General' | 'Downloads' | 'Selection' | 'Views' | 'Grabber';
  actionName?: string;
  action?: () => void;
  isAvailable?: boolean;
  availabilityHint?: string;
}

export const ShortcutsDialog: React.FC<ShortcutsDialogProps> = ({
  isOpen,
  onClose,
  onOpenAddUrl,
  onOpenAddBatch,
  onFocusSearch,
  onOpenSettings,
  onRefresh,
  onTogglePauseResume,
  onDeleteSelected,
  onSelectAll,
  onClearSelection,
  onSwitchView,
  selectedCount = 0,
  selectedItemName,
  canTogglePauseResume = false,
  currentView = 'downloads'
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [pressedKeys, setPressedKeys] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) {
      setPressedKeys([]);
      setSearch('');
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Capture live keys for the visual key tester
      const currentKeys: string[] = [];
      if (e.ctrlKey || e.metaKey) currentKeys.push('Ctrl');
      if (e.altKey) currentKeys.push('Alt');
      if (e.shiftKey) currentKeys.push('Shift');

      const keyName = e.key;
      if (!['Control', 'Alt', 'Shift', 'Meta'].includes(keyName)) {
        if (keyName === ' ') currentKeys.push('Space');
        else if (keyName === 'Escape') {
          onClose();
          return;
        } else if (keyName === 'F1') {
          e.preventDefault();
          onClose();
          return;
        } else {
          currentKeys.push(keyName.length === 1 ? keyName.toUpperCase() : keyName);
        }
      }

      if (currentKeys.length > 0) {
        setPressedKeys(currentKeys);
      }
    };

    const handleKeyUp = () => {
      // reset key tester after brief delay
      setTimeout(() => setPressedKeys([]), 800);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isOpen, onClose]);

  const allShortcuts: ShortcutItem[] = useMemo(() => {
    return [
      // 1. General & Help
      {
        id: 'help',
        keys: ['F1'],
        title: 'Open Keyboard Shortcuts HUD',
        description: 'Toggle this interactive keyboard cheat sheet from any view',
        category: 'General',
        isAvailable: true,
        availabilityHint: 'Always available'
      },
      {
        id: 'help_alt',
        keys: ['?'],
        title: 'Quick Shortcuts Overlay',
        description: 'Alternative instant trigger for keyboard shortcuts overlay',
        category: 'General',
        isAvailable: true,
        availabilityHint: 'Press Shift + / when not in text input'
      },
      {
        id: 'add_url',
        keys: ['Ctrl', 'N'],
        title: 'Add Single Download URL',
        description: 'Open the Add URL dialog to analyze and download a video or file',
        category: 'General',
        actionName: 'Open Add URL',
        action: onOpenAddUrl,
        isAvailable: true
      },
      {
        id: 'add_batch',
        keys: ['Ctrl', 'B'],
        title: 'Add Batch URLs',
        description: 'Queue multiple links or a text list of URLs simultaneously',
        category: 'General',
        actionName: 'Open Batch Dialog',
        action: onOpenAddBatch,
        isAvailable: true
      },
      {
        id: 'search',
        keys: ['Ctrl', 'F'],
        title: 'Focus Download Search',
        description: 'Instantly jump to search bar to filter downloads by name or author',
        category: 'General',
        actionName: 'Focus Search',
        action: onFocusSearch,
        isAvailable: true
      },
      {
        id: 'settings',
        keys: ['Ctrl', ','],
        title: 'Open Settings & Options',
        description: 'Configure directories, speed limits, network retry policy, and theme',
        category: 'General',
        actionName: 'Open Settings',
        action: onOpenSettings,
        isAvailable: true
      },
      {
        id: 'refresh',
        keys: ['Ctrl', 'R'],
        title: 'Refresh Data & Engine Stats',
        description: 'Fetch latest server state, SSE connections, and speed metrics',
        category: 'General',
        actionName: 'Refresh Now',
        action: onRefresh,
        isAvailable: true
      },
      {
        id: 'esc',
        keys: ['Escape'],
        title: 'Close Dialog / Deselect All',
        description: 'Dismiss open dialogs or clear selected items in download table',
        category: 'General',
        actionName: 'Clear Selection',
        action: onClearSelection,
        isAvailable: true
      },

      // 2. Download Control & Queue
      {
        id: 'pause_resume',
        keys: ['Space'],
        title: 'Start / Pause / Resume Download',
        description: 'Toggle active downloading state for the selected item',
        category: 'Downloads',
        actionName: 'Toggle Start/Pause',
        action: onTogglePauseResume,
        isAvailable: canTogglePauseResume,
        availabilityHint: selectedItemName
          ? `Target: "${selectedItemName}"`
          : 'Select a download row first'
      },
      {
        id: 'delete',
        keys: ['Delete'],
        title: 'Remove from List',
        description: 'Remove selected download(s) from table without deleting disk files',
        category: 'Downloads',
        actionName: 'Remove Selected',
        action: () => onDeleteSelected?.(false),
        isAvailable: selectedCount > 0,
        availabilityHint: selectedCount > 0 ? `${selectedCount} item(s) selected` : 'Requires selection'
      },
      {
        id: 'delete_disk',
        keys: ['Shift', 'Delete'],
        title: 'Delete from Disk & List',
        description: 'Permanently erase physical downloaded file from disk and remove record',
        category: 'Downloads',
        actionName: 'Delete from Disk',
        action: () => onDeleteSelected?.(true),
        isAvailable: selectedCount > 0,
        availabilityHint: selectedCount > 0 ? `${selectedCount} item(s) selected` : 'Requires selection'
      },
      {
        id: 'open_file',
        keys: ['Enter'],
        title: 'Open Media / Properties',
        description: 'Play completed video/audio or open download properties dialog',
        category: 'Downloads',
        isAvailable: selectedCount === 1,
        availabilityHint: selectedCount === 1 ? '1 item selected' : 'Requires single selection'
      },

      // 3. Selection & Batch
      {
        id: 'select_all',
        keys: ['Ctrl', 'A'],
        title: 'Select All Downloads',
        description: 'Select every download in the current filtered table view',
        category: 'Selection',
        actionName: 'Select All',
        action: onSelectAll,
        isAvailable: true
      },
      {
        id: 'range_select',
        keys: ['Shift', 'Click'],
        title: 'Range Select Rows',
        description: 'Select all download rows between previous selection and clicked row',
        category: 'Selection',
        isAvailable: true,
        availabilityHint: 'Hold Shift and click another row'
      },
      {
        id: 'toggle_select',
        keys: ['Ctrl', 'Click'],
        title: 'Toggle Individual Row',
        description: 'Add or remove specific row from current multi-selection',
        category: 'Selection',
        isAvailable: true,
        availabilityHint: 'Hold Ctrl/Cmd and click'
      },
      {
        id: 'context_menu',
        keys: ['Right-Click'],
        title: 'Open IDM Context Menu',
        description: 'Context-aware menu showing single or batch pause/resume/delete actions',
        category: 'Selection',
        isAvailable: true,
        availabilityHint: 'Dynamic Batch Mode when >1 item selected'
      },

      // 4. View Switching
      {
        id: 'view_downloads',
        keys: ['Alt', '1'],
        title: 'Switch to Main Downloads View',
        description: 'View the primary download table with active speeds and progress',
        category: 'Views',
        actionName: 'Go to Downloads',
        action: () => onSwitchView?.('downloads'),
        isAvailable: currentView !== 'downloads'
      },
      {
        id: 'view_queue',
        keys: ['Alt', '2'],
        title: 'Switch to Queue Priority View',
        description: 'Manage download queue order and reorder pending jobs',
        category: 'Views',
        actionName: 'Go to Queue',
        action: () => onSwitchView?.('queue'),
        isAvailable: currentView !== 'queue'
      },
      {
        id: 'view_history',
        keys: ['Alt', '3'],
        title: 'Switch to History View',
        description: 'Review finished downloads and open output directories',
        category: 'Views',
        actionName: 'Go to History',
        action: () => onSwitchView?.('history'),
        isAvailable: currentView !== 'history'
      },
      {
        id: 'view_grabber',
        keys: ['Alt', '4'],
        title: 'Switch to Video Sniffer & Grabber',
        description: 'Sniff embedded videos and capture formats with IDM video bar',
        category: 'Views',
        actionName: 'Go to Grabber',
        action: () => onSwitchView?.('grabber'),
        isAvailable: currentView !== 'grabber'
      },
      {
        id: 'view_logs',
        keys: ['Alt', '5'],
        title: 'Switch to Diagnostics & Logs View',
        description: 'Real-time yt-dlp terminal stream, export logs, and clear buffer',
        category: 'Views',
        actionName: 'Go to Logs',
        action: () => onSwitchView?.('logs'),
        isAvailable: currentView !== 'logs'
      },
      {
        id: 'view_settings',
        keys: ['Alt', '6'],
        title: 'Switch to Settings View',
        description: 'Configure directories, speed limits, network retry policy, and theme',
        category: 'Views',
        actionName: 'Go to Settings',
        action: () => onSwitchView?.('settings'),
        isAvailable: currentView !== 'settings'
      },

      // 5. Media Grabber & Sniffer
      {
        id: 'grabber_sniff',
        keys: ['G'],
        title: 'Quick Launch Video Sniffer',
        description: 'Jump straight into the video sniffer and test direct or YouTube streams',
        category: 'Grabber',
        actionName: 'Open Grabber',
        action: () => onSwitchView?.('grabber'),
        isAvailable: true
      }
    ];
  }, [
    onOpenAddUrl,
    onOpenAddBatch,
    onFocusSearch,
    onOpenSettings,
    onRefresh,
    onTogglePauseResume,
    onDeleteSelected,
    onSelectAll,
    onClearSelection,
    onSwitchView,
    selectedCount,
    selectedItemName,
    canTogglePauseResume,
    currentView
  ]);

  // Filter shortcuts
  const filteredShortcuts = useMemo(() => {
    return allShortcuts.filter((s) => {
      if (selectedCategory !== 'ALL' && s.category !== selectedCategory) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = s.title.toLowerCase().includes(q);
        const matchDesc = s.description.toLowerCase().includes(q);
        const matchKeys = s.keys.some((k) => k.toLowerCase().includes(q));
        const matchCat = s.category.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchKeys && !matchCat) return false;
      }
      return true;
    });
  }, [allShortcuts, selectedCategory, search]);

  // Match live pressed keys to a shortcut
  const matchedLiveShortcut = useMemo(() => {
    if (pressedKeys.length === 0) return null;
    const pressedSet = new Set(pressedKeys.map((k) => k.toUpperCase()));
    return allShortcuts.find((s) => {
      if (s.keys.length !== pressedSet.size) return false;
      return s.keys.every((k) => pressedSet.has(k.toUpperCase()));
    });
  }, [pressedKeys, allShortcuts]);

  if (!isOpen) return null;

  const categories = [
    { id: 'ALL', label: 'All Shortcuts', count: allShortcuts.length },
    { id: 'General', label: 'General & Navigation', count: allShortcuts.filter((s) => s.category === 'General').length },
    { id: 'Downloads', label: 'Download Control', count: allShortcuts.filter((s) => s.category === 'Downloads').length },
    { id: 'Selection', label: 'Selection & Batch', count: allShortcuts.filter((s) => s.category === 'Selection').length },
    { id: 'Views', label: 'View Switching', count: allShortcuts.filter((s) => s.category === 'Views').length },
    { id: 'Grabber', label: 'Media Grabber', count: allShortcuts.filter((s) => s.category === 'Grabber').length }
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-overlay-title"
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-6 backdrop-blur-xs font-sans animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#0b101c] border border-cyan-800/50 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-xs text-slate-200">
        {/* Top Header Bar */}
        <div className="h-12 bg-gradient-to-r from-[#0d1627] via-[#101b33] to-[#0c1424] px-4 flex items-center justify-between border-b border-cyan-900/40 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-950/70 border border-cyan-700/50 text-cyan-400">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 id="shortcuts-overlay-title" className="font-bold text-slate-100 text-sm tracking-tight flex items-center space-x-2">
                <span>Active Keyboard Shortcuts</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-semibold">
                  F1 Cheat Sheet
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Execute actions directly or press physical keys on your keyboard
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <kbd className="hidden sm:inline-flex items-center px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-400 font-mono text-[10px]">
              ESC to close
            </kbd>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Keypress Tester & Status Banner */}
        <div className="px-4 py-2 bg-[#080d17] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 text-slate-400 text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Live Key Tester:</span>
            </div>

            {pressedKeys.length === 0 ? (
              <span className="text-[11px] text-slate-500 italic">
                Press any key combination on your keyboard (e.g. Space, Ctrl+N)...
              </span>
            ) : (
              <div className="flex items-center space-x-1.5 animate-in fade-in zoom-in-95 duration-100">
                {pressedKeys.map((k, i) => (
                  <React.Fragment key={i}>
                    <kbd className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500 text-cyan-200 font-mono text-[11px] font-bold shadow-xs">
                      {k}
                    </kbd>
                    {i < pressedKeys.length - 1 && <span className="text-slate-500">+</span>}
                  </React.Fragment>
                ))}

                {matchedLiveShortcut && (
                  <span className="ml-2 text-emerald-400 font-medium text-[11px] flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Matched: {matchedLiveShortcut.title}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Context state badge */}
          <div className="text-[11px] text-slate-400 flex items-center space-x-1.5">
            <span>Selection:</span>
            {selectedCount > 0 ? (
              <span className="text-cyan-300 font-medium font-mono">
                {selectedCount} item{selectedCount > 1 ? 's' : ''} active
              </span>
            ) : (
              <span className="text-slate-500">None selected</span>
            )}
          </div>
        </div>

        {/* Controls: Search & Category Filters */}
        <div className="p-3 bg-[#0c1220] border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search shortcuts by key, name, or action (e.g. Space, pause, batch)..."
              className="w-full pl-9 pr-8 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0 cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-cyan-950 text-cyan-200 border border-cyan-700/70 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {cat.label} ({cat.count})
              </button>
            ))}
          </div>
        </div>

        {/* Shortcuts Content Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-800/60">
          {filteredShortcuts.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 space-y-2">
              <Command className="w-8 h-8 text-slate-600 stroke-1" />
              <p className="text-sm font-medium text-slate-400">No matching shortcuts found</p>
              <p className="text-xs text-slate-600">
                Try searching for "Ctrl", "Space", "batch", or clear the filter
              </p>
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('ALL');
                }}
                className="mt-2 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            filteredShortcuts.map((item) => {
              const isMatched = pressedKeys.length > 0 && item.keys.every((k) =>
                pressedKeys.map((p) => p.toUpperCase()).includes(k.toUpperCase())
              );

              return (
                <div
                  key={item.id}
                  className={`pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded-lg transition-colors group ${
                    isMatched
                      ? 'bg-cyan-950/70 border border-cyan-500 shadow-sm'
                      : 'hover:bg-slate-900/60'
                  }`}
                >
                  {/* Left: Description & Status */}
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-100 text-xs group-hover:text-cyan-200 transition-colors">
                        {item.title}
                      </span>

                      {/* Category tag */}
                      <span className="text-[10px] text-slate-500 font-mono">
                        · {item.category}
                      </span>

                      {/* Dynamic availability tag */}
                      {item.availabilityHint && (
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                            item.isAvailable
                              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
                              : 'bg-slate-900 text-slate-500 border-slate-800'
                          }`}
                        >
                          {item.availabilityHint}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Right: Key Badges & Interactive Trigger */}
                  <div className="flex items-center space-x-3 shrink-0 self-end sm:self-center">
                    {/* Keys Display */}
                    <div className="flex items-center space-x-1">
                      {item.keys.map((k, idx) => (
                        <React.Fragment key={idx}>
                          <kbd className="px-2.5 py-1 rounded bg-[#131d33] border border-cyan-800/60 text-cyan-300 font-mono text-[11px] font-bold shadow-xs min-w-[24px] text-center tracking-wide">
                            {k}
                          </kbd>
                          {idx < item.keys.length - 1 && (
                            <span className="text-slate-500 text-xs font-mono">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>

                    {/* Interactive Action Button */}
                    {item.action && (
                      <button
                        disabled={item.isAvailable === false}
                        onClick={() => {
                          item.action?.();
                          onClose();
                        }}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center space-x-1 transition-all cursor-pointer ${
                          item.isAvailable === false
                            ? 'opacity-30 cursor-not-allowed bg-slate-900 text-slate-600'
                            : 'bg-slate-800 hover:bg-cyan-900/60 text-slate-300 hover:text-cyan-200 border border-slate-700 hover:border-cyan-700 shadow-xs'
                        }`}
                        title={`Click to execute: ${item.title}`}
                      >
                        <span>{item.actionName || 'Run'}</span>
                        <ArrowRight className="w-3 h-3 text-cyan-400" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Bar */}
        <div className="h-11 bg-[#080d17] px-4 flex items-center justify-between border-t border-slate-800 shrink-0 text-[11px] text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="text-slate-500">Quick tip:</span>
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-mono text-[10px]">F1</kbd> anywhere or click Help → Keyboard Shortcuts.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition-colors cursor-pointer"
          >
            Close Cheat Sheet
          </button>
        </div>
      </div>
    </div>
  );
};
