import React from 'react';
import {
  LayoutDashboard,
  Download,
  ListOrdered,
  CheckCircle2,
  History,
  Terminal,
  Settings,
  FolderOpen,
  KeyRound
} from 'lucide-react';
import { ActiveTab, DashboardStats } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  stats: DashboardStats;
  downloadDirectory: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  stats,
  downloadDirectory
}) => {
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number; badgeColor?: string }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />
    },
    {
      id: 'downloads',
      label: 'Downloads',
      icon: <Download className="w-4 h-4" />,
      badge: stats.activeCount,
      badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
    },
    {
      id: 'queue',
      label: 'Queue',
      icon: <ListOrdered className="w-4 h-4" />,
      badge: stats.queuedCount,
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    },
    {
      id: 'history',
      label: 'History',
      icon: <History className="w-4 h-4" />,
      badge: stats.completedCount > 0 ? stats.completedCount : undefined,
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    },
    {
      id: 'logs',
      label: 'Logs',
      icon: <Terminal className="w-4 h-4" />
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />
    }
  ];

  return (
    <aside className="w-56 bg-[#090d15] border-r border-slate-800/80 flex flex-col justify-between select-none shrink-0">
      {/* Navigation Links */}
      <div className="p-3 space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Manager
        </div>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <span className={isActive ? 'text-cyan-400' : 'text-slate-400'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full border ${
                    item.badgeColor || 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Storage & Path Info */}
      <div className="p-3 border-t border-slate-800/80">
        <div className="bg-slate-900/60 rounded-lg p-2.5 border border-slate-800/70 text-xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span className="flex items-center space-x-1">
              <FolderOpen className="w-3 h-3 text-cyan-400" />
              <span>Target Directory</span>
            </span>
          </div>
          <p
            title={downloadDirectory}
            className="text-[11px] font-mono text-slate-300 truncate"
          >
            {downloadDirectory}
          </p>
        </div>
      </div>
    </aside>
  );
};
