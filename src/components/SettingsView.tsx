import React, { useState, useEffect } from 'react';
import {
  Settings,
  FolderOpen,
  Zap,
  RotateCcw,
  Sliders,
  Check,
  AlertCircle,
  FileText,
  KeyRound,
  ShieldCheck,
  HardDrive,
  Trash2,
  RefreshCw,
  Save,
  Globe,
  Palette,
  Bell,
  Cpu,
  Gauge
} from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsViewProps {
  settings: AppSettings;
  onSaveSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  onResetSettings: () => Promise<void>;
}

type SettingsTab =
  | 'general'
  | 'downloads'
  | 'connection'
  | 'browser'
  | 'appearance'
  | 'notifications'
  | 'advanced';

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  onResetSettings
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [folderCheckResult, setFolderCheckResult] = useState<{ valid?: boolean; path?: string; error?: string } | null>(null);
  const [checkingFolder, setCheckingFolder] = useState(false);

  // Cookie management state
  const [cookieInfo, setCookieInfo] = useState<{ hasCookies: boolean; size: number; modifiedAt?: string }>({
    hasCookies: false,
    size: 0
  });
  const [cookieContent, setCookieContent] = useState('');
  const [showCookieEditor, setShowCookieEditor] = useState(false);
  const [cookieSaving, setCookieSaving] = useState(false);
  const [cookieMsg, setCookieMsg] = useState<string | null>(null);

  useEffect(() => {
    setFormData(settings);
    fetchCookieStatus();
  }, [settings]);

  const fetchCookieStatus = async () => {
    try {
      const res = await fetch('/api/cookies');
      const data = await res.json();
      setCookieInfo(data);
    } catch {
      // ignore
    }
  };

  const handleChange = (key: keyof AppSettings, val: any) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveSettings(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleCheckFolder = async () => {
    setCheckingFolder(true);
    setFolderCheckResult(null);
    try {
      const res = await fetch('/api/system/check-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directory: formData.downloadDirectory })
      });
      const data = await res.json();
      setFolderCheckResult(data);
    } catch (err: any) {
      setFolderCheckResult({ valid: false, error: err.message });
    } finally {
      setCheckingFolder(false);
    }
  };

  const handleSaveCookies = async () => {
    if (!cookieContent.trim()) return;
    setCookieSaving(true);
    setCookieMsg(null);
    try {
      const res = await fetch('/api/cookies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: cookieContent })
      });
      const data = await res.json();
      if (res.ok) {
        setCookieMsg('Cookies saved successfully.');
        setShowCookieEditor(false);
        setCookieContent('');
        fetchCookieStatus();
      } else {
        setCookieMsg(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setCookieMsg(`Error: ${err.message}`);
    } finally {
      setCookieSaving(false);
    }
  };

  const handleDeleteCookies = async () => {
    if (!confirm('Are you sure you want to remove cookies.txt?')) return;
    try {
      await fetch('/api/cookies', { method: 'DELETE' });
      fetchCookieStatus();
      setCookieMsg('cookies.txt removed.');
    } catch (err: any) {
      setCookieMsg(`Error: ${err.message}`);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0b0f19] text-xs font-sans select-none overflow-hidden">
      {/* Header bar */}
      <div className="h-10 bg-[#0e1422] border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <Settings className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-100 text-xs">VideoFlow Preferences & Options</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onResetSettings}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-1 px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium shadow-sm transition-colors cursor-pointer"
          >
            {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saved ? 'Saved!' : 'Save Options'}</span>
          </button>
        </div>
      </div>

      {/* Two-column desktop layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Categories List */}
        <aside className="w-48 bg-[#090d16] border-r border-slate-800 p-2 space-y-1 shrink-0 overflow-y-auto">
          {[
            { id: 'general', label: 'General', icon: Sliders },
            { id: 'downloads', label: 'Downloads', icon: HardDrive },
            { id: 'connection', label: 'Connection & Speed', icon: Gauge },
            { id: 'browser', label: 'Browser Integration', icon: Globe },
            { id: 'appearance', label: 'Appearance', icon: Palette },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'advanced', label: 'Advanced & Cookies', icon: Cpu }
          ].map((cat) => {
            const Icon = cat.icon;
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id as SettingsTab)}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded text-left text-xs transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-cyan-600/20 text-cyan-200 border-l-2 border-cyan-400 font-medium pl-2.5'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Right Settings Content */}
        <div className="flex-1 p-5 overflow-y-auto space-y-6 max-w-3xl">
          {/* 1. GENERAL TAB */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-100 border-b border-slate-800 pb-2">
                General Application Behavior
              </h3>

              <div className="space-y-3">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.startOnStartup}
                    onChange={(e) => handleChange('startOnStartup', e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="text-slate-200 font-medium">Launch VideoFlow on Windows startup</span>
                    <p className="text-[11px] text-slate-400">Silently start background transfer engine on boot</p>
                  </div>
                </label>

                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.startAutomatically}
                    onChange={(e) => handleChange('startAutomatically', e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="text-slate-200 font-medium">Start downloads immediately upon queueing</span>
                    <p className="text-[11px] text-slate-400">Trigger transfers automatically when added</p>
                  </div>
                </label>

                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.askBeforeDownloading}
                    onChange={(e) => handleChange('askBeforeDownloading', e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="text-slate-200 font-medium">Prompt for format confirmation before starting</span>
                    <p className="text-[11px] text-slate-400">Always inspect stream tracks prior to dispatching worker</p>
                  </div>
                </label>

                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.preventDuplicates}
                    onChange={(e) => handleChange('preventDuplicates', e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="text-slate-200 font-medium">Prevent duplicate URL downloads</span>
                    <p className="text-[11px] text-slate-400">Warn if an identical URL is already present in queue or completed</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* 2. DOWNLOADS TAB */}
          {activeTab === 'downloads' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-100 border-b border-slate-800 pb-2">
                Download Directory & Organization
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    Default Download Folder:
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={formData.downloadDirectory}
                      onChange={(e) => handleChange('downloadDirectory', e.target.value)}
                      className="flex-1 bg-[#090d16] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={handleCheckFolder}
                      disabled={checkingFolder}
                      className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium flex items-center space-x-1 cursor-pointer"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Verify</span>
                    </button>
                  </div>
                  {folderCheckResult && (
                    <div className={`mt-1 text-[11px] ${folderCheckResult.valid ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {folderCheckResult.valid ? '✓ Folder exists and is writable' : `✕ ${folderCheckResult.error}`}
                    </div>
                  )}
                </div>

                <div className="pt-2 space-y-2.5">
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.organizeByChannel}
                      onChange={(e) => handleChange('organizeByChannel', e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-600 focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <span className="text-slate-200 font-medium">Organize by channel / creator subfolder</span>
                      <p className="text-[11px] text-slate-400">Creates a subfolder named after the video author</p>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.organizeByYear}
                      onChange={(e) => handleChange('organizeByYear', e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-600 focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <span className="text-slate-200 font-medium">Organize by upload year</span>
                      <p className="text-[11px] text-slate-400">Places files in year subdirectories (e.g., 2026/)</p>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.sanitizeFilenames}
                      onChange={(e) => handleChange('sanitizeFilenames', e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-600 focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <span className="text-slate-200 font-medium">Sanitize filenames for Windows compatibility</span>
                      <p className="text-[11px] text-slate-400">Replaces invalid characters (: / \ ? * &quot; &lt; &gt; |) with underscores</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* 3. CONNECTION & SPEED TAB */}
          {activeTab === 'connection' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-100 border-b border-slate-800 pb-2">
                Network & Concurrency Settings
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    Max Concurrent Downloads:
                  </label>
                  <select
                    value={formData.maxConcurrentDownloads}
                    onChange={(e) => handleChange('maxConcurrentDownloads', parseInt(e.target.value, 10))}
                    className="w-full bg-[#090d16] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    <option value={1}>1 download at a time</option>
                    <option value={2}>2 simultaneous downloads</option>
                    <option value={3}>3 simultaneous downloads (recommended)</option>
                    <option value={4}>4 simultaneous downloads</option>
                    <option value={5}>5 simultaneous downloads</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    Download Speed Limiter:
                  </label>
                  <select
                    value={formData.speedLimitKBps || 0}
                    onChange={(e) => handleChange('speedLimitKBps', parseInt(e.target.value, 10))}
                    className="w-full bg-[#090d16] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    <option value={0}>Unlimited Bandwidth</option>
                    <option value={500}>500 KB/s</option>
                    <option value={1024}>1 MB/s</option>
                    <option value={2048}>2 MB/s</option>
                    <option value={5120}>5 MB/s</option>
                    <option value={10240}>10 MB/s</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    Auto-retry Failed Downloads:
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={formData.retryCount}
                    onChange={(e) => handleChange('retryCount', parseInt(e.target.value, 10))}
                    className="w-full bg-[#090d16] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    Retry Delay (Seconds):
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={formData.retryDelay}
                    onChange={(e) => handleChange('retryDelay', parseInt(e.target.value, 10))}
                    className="w-full bg-[#090d16] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4. BROWSER INTEGRATION TAB */}
          {activeTab === 'browser' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-100 border-b border-slate-800 pb-2">
                Browser Integration & Extensions
              </h3>

              <div className="p-3 bg-slate-900/90 rounded border border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 text-cyan-400 font-medium">
                  <Globe className="w-4 h-4" />
                  <span>External Download Interceptor</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  VideoFlow exposes an HTTP API endpoint at <code className="text-cyan-300 font-mono">POST /api/downloads</code> for browser extensions (Chrome, Firefox, Edge) to dispatch download URLs directly into the native queue.
                </p>
                <div className="pt-2 text-[10px] font-mono text-slate-500">
                  Status: Extension bridge ready on port 3000
                </div>
              </div>
            </div>
          )}

          {/* 5. APPEARANCE TAB */}
          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-100 border-b border-slate-800 pb-2">
                User Interface Theme & Density
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Theme Mode:</label>
                  <div className="flex space-x-3">
                    {['dark', 'light', 'system'].map((t) => (
                      <label key={t} className="flex items-center space-x-2 cursor-pointer capitalize">
                        <input
                          type="radio"
                          name="theme"
                          value={t}
                          checked={formData.theme === t}
                          onChange={() => handleChange('theme', t)}
                          className="text-cyan-600 focus:ring-0 cursor-pointer"
                        />
                        <span className="text-slate-200">{t}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <label className="flex items-center space-x-2.5 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={formData.compactMode}
                    onChange={(e) => handleChange('compactMode', e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="text-slate-200 font-medium">High Density Table Mode</span>
                    <p className="text-[11px] text-slate-400">Reduces row padding to fit more downloads per screen</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* 6. NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-100 border-b border-slate-800 pb-2">
                Desktop Notifications
              </h3>

              <div className="space-y-3">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.notifyOnComplete}
                    onChange={(e) => handleChange('notifyOnComplete', e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="text-slate-200 font-medium">Notify when a download completes</span>
                    <p className="text-[11px] text-slate-400">Shows desktop banner with direct file/folder shortcuts</p>
                  </div>
                </label>

                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.notifyOnFail}
                    onChange={(e) => handleChange('notifyOnFail', e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="text-slate-200 font-medium">Notify when a download fails</span>
                    <p className="text-[11px] text-slate-400">Alerts you immediately if a network transfer errors</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* 7. ADVANCED TAB */}
          {activeTab === 'advanced' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-100 border-b border-slate-800 pb-2">
                Advanced Diagnostics & YouTube Authentication
              </h3>

              <div className="p-3 bg-slate-900/90 rounded border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <KeyRound className="w-4 h-4 text-cyan-400" />
                    <span className="font-semibold text-slate-200 text-xs">YouTube Authentication (cookies.txt)</span>
                  </div>
                  {cookieInfo.hasCookies && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/80 font-mono">
                      Active ({(cookieInfo.size / 1024).toFixed(1)} KB)
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Export your Netscape cookies using a browser extension (e.g. "Get cookies.txt LOCALLY") and paste them here to bypass YouTube bot blocks and access age-restricted videos.
                </p>

                {cookieMsg && (
                  <div className="p-2 rounded bg-slate-800 border border-slate-700 text-cyan-300 text-[11px]">
                    {cookieMsg}
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowCookieEditor(!showCookieEditor)}
                    className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition-colors cursor-pointer"
                  >
                    {showCookieEditor ? 'Close Editor' : cookieInfo.hasCookies ? 'Update Cookies' : 'Add Cookies'}
                  </button>

                  {cookieInfo.hasCookies && (
                    <button
                      onClick={handleDeleteCookies}
                      className="px-3 py-1.5 rounded bg-rose-900/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800 text-xs flex items-center space-x-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete cookies.txt</span>
                    </button>
                  )}
                </div>

                {showCookieEditor && (
                  <div className="pt-2 space-y-2">
                    <textarea
                      rows={6}
                      value={cookieContent}
                      onChange={(e) => setCookieContent(e.target.value)}
                      placeholder="# Netscape HTTP Cookie File&#10;.youtube.com    TRUE    /   TRUE    176...  LOGIN_INFO  ..."
                      className="w-full bg-[#090d16] border border-slate-700 rounded p-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 resize-none"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveCookies}
                        disabled={cookieSaving || !cookieContent.trim()}
                        className="px-3.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs disabled:opacity-40 cursor-pointer"
                      >
                        {cookieSaving ? 'Saving...' : 'Apply Cookies'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
