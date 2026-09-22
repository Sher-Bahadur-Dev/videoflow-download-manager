import React, { useState, useEffect, useRef } from 'react';
import {
  DownloadItem,
  SidebarFilter
} from '../types';

interface MenuBarProps {
  selectedItem: DownloadItem | null;
  onOpenAddUrl: () => void;
  onOpenAddBatch: () => void;
  onOpenExport: () => void;
  onOpenImport: () => void;
  onStartSelected: () => void;
  onPauseSelected: () => void;
  onResumeSelected: () => void;
  onStopSelected: () => void;
  onRetrySelected: () => void;
  onDeleteSelected: () => void;
  onOpenFile: (item: DownloadItem) => void;
  onOpenFolder: (item: DownloadItem) => void;
  onOpenProperties: (item: DownloadItem) => void;
  onSelectFilter: (filter: SidebarFilter) => void;
  onOpenSettings: () => void;
  onOpenScheduler: () => void;
  onOpenSpeedLimiter: () => void;
  onOpenColumnChooser: () => void;
  onClearCompleted: () => void;
  onClearHistory: () => void;
  onOpenShortcuts: () => void;
  onOpenAbout: () => void;
  onOpenArchiveModal?: () => void;
  onOpenAudioModal?: () => void;
}

export const MenuBar: React.FC<MenuBarProps> = ({
  selectedItem,
  onOpenAddUrl,
  onOpenAddBatch,
  onOpenExport,
  onOpenImport,
  onStartSelected,
  onPauseSelected,
  onResumeSelected,
  onStopSelected,
  onRetrySelected,
  onDeleteSelected,
  onOpenFile,
  onOpenFolder,
  onOpenProperties,
  onSelectFilter,
  onOpenSettings,
  onOpenScheduler,
  onOpenSpeedLimiter,
  onOpenColumnChooser,
  onClearCompleted,
  onClearHistory,
  onOpenShortcuts,
  onOpenAbout,
  onOpenArchiveModal,
  onOpenAudioModal
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = (menuName: string) => {
    setActiveMenu(activeMenu === menuName ? null : menuName);
  };

  const handleItemClick = (action: () => void) => {
    action();
    setActiveMenu(null);
  };

  const isCompleted = selectedItem?.status === 'COMPLETED';
  const isDownloading = selectedItem?.status === 'DOWNLOADING';
  const isPaused = selectedItem?.status === 'PAUSED';

  return (
    <nav
      ref={menuBarRef}
      aria-label="Desktop menu bar"
      className="h-6 bg-[#0e1422] border-b border-slate-800/80 px-2 flex items-center text-[11px] text-slate-300 select-none relative z-30 font-sans"
    >
      {/* File Menu */}
      <div className="relative">
        <button
          onClick={() => toggleMenu('file')}
          className={`px-2 py-0.5 rounded-xs hover:bg-slate-800 ${activeMenu === 'file' ? 'bg-slate-800 text-white' : ''}`}
        >
          File
        </button>
        {activeMenu === 'file' && (
          <div className="absolute left-0 top-full mt-0.5 w-52 bg-[#121929] border border-slate-700 rounded-xs shadow-xl py-1 z-50 text-slate-200">
            <button
              onClick={() => handleItemClick(onOpenAddUrl)}
              className="w-full text-left px-3 py-1 hover:bg-cyan-900/40 hover:text-cyan-200 flex items-center justify-between"
            >
              <span>Add URL...</span>
              <span className="text-[10px] text-slate-500 font-mono">Ctrl+N</span>
            </button>
            <button
              onClick={() => handleItemClick(onOpenAddBatch)}
              className="w-full text-left px-3 py-1 hover:bg-cyan-900/40 hover:text-cyan-200 flex items-center justify-between"
            >
              <span>Add Multiple URLs (Batch)...</span>
            </button>
            <div className="h-px bg-slate-800 my-1" />
            <button
              onClick={() => handleItemClick(onOpenImport)}
              className="w-full text-left px-3 py-1 hover:bg-cyan-900/40 hover:text-cyan-200"
            >
              Import Downloads...
            </button>
            <button
              onClick={() => handleItemClick(onOpenExport)}
              className="w-full text-left px-3 py-1 hover:bg-cyan-900/40 hover:text-cyan-200"
            >
              Export Downloads...
            </button>
            <div className="h-px bg-slate-800 my-1" />
            <button
              onClick={() => handleItemClick(() => window.close())}
              className="w-full text-left px-3 py-1 hover:bg-rose-900/40 hover:text-rose-200"
            >
              Exit
            </button>
          </div>
        )}
      </div>

      {/* Downloads Menu */}
      <div className="relative">
        <button
          onClick={() => toggleMenu('downloads')}
          className={`px-2 py-0.5 rounded-xs hover:bg-slate-800 ${activeMenu === 'downloads' ? 'bg-slate-800 text-white' : ''}`}
        >
          Downloads
        </button>
        {activeMenu === 'downloads' && (
          <div className="absolute left-0 top-full mt-0.5 w-52 bg-[#121929] border border-slate-700 rounded-xs shadow-xl py-1 z-50 text-slate-200">
            <button
              disabled={!selectedItem || isDownloading}
              onClick={() => handleItemClick(onResumeSelected)}
              className={`w-full text-left px-3 py-1 flex items-center justify-between ${!selectedItem || isDownloading ? 'opacity-40 cursor-not-allowed' : 'hover:bg-cyan-900/40 hover:text-cyan-200'}`}
            >
              <span>Start</span>
              <span className="text-[10px] text-slate-500 font-mono">Space</span>
            </button>
            <button
              disabled={!selectedItem || !isDownloading}
              onClick={() => handleItemClick(onPauseSelected)}
              className={`w-full text-left px-3 py-1 ${!selectedItem || !isDownloading ? 'opacity-40 cursor-not-allowed' : 'hover:bg-cyan-900/40 hover:text-cyan-200'}`}
            >
              Pause
            </button>
            <button
              disabled={!selectedItem || !isPaused}
              onClick={() => handleItemClick(onResumeSelected)}
              className={`w-full text-left px-3 py-1 ${!selectedItem || !isPaused ? 'opacity-40 cursor-not-allowed' : 'hover:bg-cyan-900/40 hover:text-cyan-200'}`}
            >
              Resume
            </button>
            <button
              disabled={!selectedItem || (!isDownloading && selectedItem.status !== 'QUEUED')}
              onClick={() => handleItemClick(onStopSelected)}
              className={`w-full text-left px-3 py-1 ${!selectedItem ? 'opacity-40 cursor-not-allowed' : 'hover:bg-cyan-900/40 hover:text-cyan-200'}`}
            >
              Stop
            </button>
            <button
              disabled={!selectedItem}
              onClick={() => handleItemClick(onRetrySelected)}
              className={`w-full text-left px-3 py-1 ${!selectedItem ? 'opacity-40 cursor-not-allowed' : 'hover:bg-cyan-900/40 hover:text-cyan-200'}`}
            >
              Restart / Retry
            </button>
            <button
              disabled={!selectedItem}
              onClick={() => handleItemClick(onDeleteSelected)}
              className={`w-full text-left px-3 py-1 flex items-center justify-between ${!selectedItem ? 'opacity-40 cursor-not-allowed' : 'hover:bg-rose-900/40 hover:text-rose-200'}`}
            >
              <span>Delete</span>
              <span className="text-[10px] text-slate-500 font-mono">Del</span>
            </button>
            <div className="h-px bg-slate-800 my-1" />
            <button
              disabled={!selectedItem || !isCompleted}
              onClick={() => selectedItem && handleItemClick(() => onOpenFile(selectedItem))}
              className={`w-full text-left px-3 py-1 flex items-center justify-between ${!selectedItem || !isCompleted ? 'opacity-40 cursor-not-allowed' : 'hover:bg-cyan-900/40 hover:text-cyan-200'}`}
            >
              <span>Open File</span>
              <span className="text-[10px] text-slate-500 font-mono">Enter</span>
            </button>
            <button
              disabled={!selectedItem}
              onClick={() => selectedItem && handleItemClick(() => onOpenFolder(selectedItem))}
              className={`w-full text-left px-3 py-1 ${!selectedItem ? 'opacity-40 cursor-not-allowed' : 'hover:bg-cyan-900/40 hover:text-cyan-200'}`}
            >
              Open Folder
            </button>
            <div className="h-px bg-slate-800 my-1" />
            <button
              disabled={!selectedItem}
              onClick={() => selectedItem && handleItemClick(() => onOpenProperties(selectedItem))}
              className={`w-full text-left px-3 py-1 ${!selectedItem ? 'opacity-40 cursor-not-allowed' : 'hover:bg-cyan-900/40 hover:text-cyan-200'}`}
            >
              Properties...
            </button>
          </div>
        )}
      </div>

      {/* View Menu */}
      <div className="relative">
        <button
          onClick={() => toggleMenu('view')}
          className={`px-2 py-0.5 rounded-xs hover:bg-slate-800 ${activeMenu === 'view' ? 'bg-slate-800 text-white' : ''}`}
        >
          View
        </button>
        {activeMenu === 'view' && (
          <div className="absolute left-0 top-full mt-0.5 w-52 bg-[#121929] border border-slate-700 rounded-xs shadow-xl py-1 z-50 text-slate-200">
            <button
              onClick={() => handleItemClick(() => onSelectFilter('all'))}
              className="w-full text-left px-3 py-1 hover:bg-cyan-900/40 hover:text-cyan-200"
            >
              All Downloads
            </button>
            <button
              onClick={() => handleItemClick(() => onSelectFilter('view_grabber'))}
              className="w-full text-left px-3 py-1 hover:bg-cyan-900/40 hover:text-cyan-200 flex items-center justify-between"
            >
              <span>Video Sniffer & Player</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 font-mono">IDM Bar</span>
            </button>
            <button
              onClick={() => handleItemClick(() => onSelectFilter('view_queue'))}
              className="w-full text-left px-3 py-1 hover:bg-cyan-900/40 hover:text-cyan-200"
            >
              Queue Manager
            </button>
            <button
              onClick={() => handleItemClick(() => onSelectFilter('view_history'))}
              className="w-full text-left px-3 py-1 hover:bg-cyan-900/40 hover:text-cyan-200"
            >
              History
            </button>
            <button
              onClick={() => handleItemClick(() => onSelectFilter('view_logs'))}
              className="w-full text-left px-3 py-1 hover:bg-cyan-900/40 hover:text-cyan-200"
            >
              Logs Console
            </button>
            <div className="h-px bg-slate-800 my-1" />
            <button
              onClick={() => handleItemClick(onOpenColumnChooser)}
              className="w-full text-left px-3 py-1 hover:bg-cyan-900/40 hover:text-cyan-200"
            >
              Customize Columns...
            </button>
          </div>
        )}
      </div>

      {/* Tools Menu */}
      <div className="relative">
        <button
          onClick={() => toggleMenu('tools')}
          className={`px-2 py-0.5 rounded-xs hover:bg-slate-800 ${activeMenu === 'tools' ? 'bg-slate-800 text-white' : ''}`}
        >
          Tools
        </button>
        {activeMenu === 'tools' && (
          <div className="absolute left-0 top-full mt-0.5 w-60 bg-[#121929] border border-slate-700 rounded-xs shadow-xl py-1 z-50 text-slate-200">
            <button
              onClick={() => handleItemClick(() => onSelectFilter('view_grabber'))}
              className="w-full text-left px-3 py-1 hover:bg-cyan-900/40 hover:text-cyan-200 flex items-center justify-between"
            >
              <span>Capture Streams (IDM Bar)</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 font-mono">Sniffer</span>
            </button>
            {onOpenAudioModal && (
              <button
                onClick={() => handleItemClick(onOpenAudioModal)}
                className="w-full text-left px-3 py-1 hover:bg-cyan-900/40 hover:text-cyan-200 flex items-center justify-between"
              >
                <span>Audio Extractor & Converter...</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-purple-950 text-purple-300 font-mono">Audio</span>
              </button>
            )}
            {onOpenArchiveModal && (
              <button
                onClick={() => handleItemClick(onOpenArchiveModal)}
                className="w-full text-left px-3 py-1 hover:bg-cyan-900/40 hover:text-cyan-200 flex items-center justify-between"
              >
                <span>Archive Manager (ZIP)...</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 font-mono">Archive</span>
              </button>
            )}
            <div className="h-px bg-slate-800 my-1" />
            <button
              onClick={() => handleItemClick(onOpenSettings)}
              className="w-full text-left px-3 py-1 hover:bg-cyan-900/40 hover:text-cyan-200 flex items-center justify-between"
            >
              <span>Options / Settings...</span>
              <span className="text-[10px] text-slate-500 font-mono">Ctrl+,</span>
            </button>
            <button
              onClick={() => handleItemClick(onOpenScheduler)}
              className="w-full text-left px-3 py-1 hover:bg-cyan-900/40 hover:text-cyan-200"
            >
              Download Scheduler...
            </button>
            <button
              onClick={() => handleItemClick(onOpenSpeedLimiter)}
              className="w-full text-left px-3 py-1 hover:bg-cyan-900/40 hover:text-cyan-200"
            >
              Speed Limiter...
            </button>
            <div className="h-px bg-slate-800 my-1" />
            <button
              onClick={() => handleItemClick(onClearCompleted)}
              className="w-full text-left px-3 py-1 hover:bg-cyan-900/40 hover:text-cyan-200"
            >
              Clear Completed Downloads
            </button>
            <button
              onClick={() => handleItemClick(onClearHistory)}
              className="w-full text-left px-3 py-1 hover:bg-rose-900/40 hover:text-rose-200"
            >
              Clear Download History
            </button>
          </div>
        )}
      </div>

      {/* Help Menu */}
      <div className="relative">
        <button
          onClick={() => toggleMenu('help')}
          className={`px-2 py-0.5 rounded-xs hover:bg-slate-800 ${activeMenu === 'help' ? 'bg-slate-800 text-white' : ''}`}
        >
          Help
        </button>
        {activeMenu === 'help' && (
          <div className="absolute left-0 top-full mt-0.5 w-48 bg-[#121929] border border-slate-700 rounded-xs shadow-xl py-1 z-50 text-slate-200">
            <button
              onClick={() => handleItemClick(onOpenShortcuts)}
              className="w-full text-left px-3 py-1 hover:bg-cyan-900/40 hover:text-cyan-200 flex items-center justify-between"
            >
              <span>Keyboard Shortcuts</span>
              <kbd className="text-[10px] text-cyan-400 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">F1</kbd>
            </button>
            <div className="h-px bg-slate-800 my-1" />
            <button
              onClick={() => handleItemClick(onOpenAbout)}
              className="w-full text-left px-3 py-1 hover:bg-cyan-900/40 hover:text-cyan-200"
            >
              About VideoFlow
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};
