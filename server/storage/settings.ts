import fs from 'fs';
import path from 'path';
import { AppSettings } from '../types';
import { log } from '../logger';

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

/**
 * Determine default download directory depending on OS platform.
 * Windows: C:\Downloads
 * Linux / POSIX: path.join(process.cwd(), 'downloads')
 */
export function getDefaultDownloadDirectory(): string {
  if (process.platform === 'win32') {
    return 'C:\\Downloads';
  }
  return path.resolve(process.cwd(), 'downloads');
}

/**
 * Validate, resolve, and verify write permissions for a target directory.
 */
export function verifyAndResolveDirectory(requestedDir?: string): {
  valid: boolean;
  resolvedPath: string;
  error?: string;
} {
  let target = (requestedDir && requestedDir.trim()) ? requestedDir.trim() : getDefaultDownloadDirectory();

  // On non-Windows platforms, translate Windows-style drive paths (e.g. C:\Downloads) to local path
  if (process.platform !== 'win32' && /^[a-zA-Z]:[/\\]/.test(target)) {
    const sub = target.replace(/^[a-zA-Z]:[/\\]/, '');
    target = path.resolve(process.cwd(), sub || 'downloads');
  } else {
    target = path.resolve(target);
  }

  try {
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }

    // Verify write permissions with a temporary test file
    const probeFile = path.join(target, `.videoflow_perm_test_${Date.now()}`);
    fs.writeFileSync(probeFile, 'ok', 'utf-8');
    fs.unlinkSync(probeFile);

    return {
      valid: true,
      resolvedPath: target
    };
  } catch (err: any) {
    // If fallback needed on Windows if C:\ root is restricted
    if (process.platform === 'win32' && target.toLowerCase() === 'c:\\downloads') {
      try {
        const fallback = path.join(process.env.USERPROFILE || process.cwd(), 'Downloads');
        if (!fs.existsSync(fallback)) fs.mkdirSync(fallback, { recursive: true });
        return { valid: true, resolvedPath: fallback };
      } catch {
        // continue to return error
      }
    }

    return {
      valid: false,
      resolvedPath: target,
      error: `Directory "${target}" is not writable: ${err.message}`
    };
  }
}

const DEFAULT_SETTINGS: AppSettings = {
  downloadDirectory: getDefaultDownloadDirectory(),
  maxConcurrentDownloads: 3,
  retryCount: 3,
  retryDelay: 5,
  autoResume: true,
  startAutomatically: true,
  askBeforeDownloading: false,
  startOnStartup: true,
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
  schedulerEnabled: false,
  schedulerStartTime: '23:00',
  schedulerStopTime: '07:00',
  schedulerStartQueued: true,
  schedulerPauseAfter: true
};

let currentSettings: AppSettings = { ...DEFAULT_SETTINGS };

export function loadSettings(): AppSettings {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      currentSettings = { ...DEFAULT_SETTINGS, ...parsed };
    } else {
      currentSettings = { ...DEFAULT_SETTINGS };
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(currentSettings, null, 2), 'utf-8');
    }
  } catch (err: any) {
    log('ERROR', `Failed to read settings file: ${err.message}`);
    currentSettings = { ...DEFAULT_SETTINGS };
  }

  // Ensure download folder is resolved and verified
  const check = verifyAndResolveDirectory(currentSettings.downloadDirectory);
  currentSettings.downloadDirectory = check.resolvedPath;

  return currentSettings;
}

export function saveSettings(newSettings: Partial<AppSettings>): {
  success: boolean;
  settings: AppSettings;
  error?: string;
} {
  try {
    if (newSettings.downloadDirectory) {
      const check = verifyAndResolveDirectory(newSettings.downloadDirectory);
      if (!check.valid) {
        return {
          success: false,
          settings: currentSettings,
          error: check.error || 'Download directory is invalid or not writable'
        };
      }
      newSettings.downloadDirectory = check.resolvedPath;
    }

    if (newSettings.maxConcurrentDownloads !== undefined) {
      newSettings.maxConcurrentDownloads = Math.max(1, Math.min(10, Math.floor(newSettings.maxConcurrentDownloads)));
    }

    currentSettings = { ...currentSettings, ...newSettings };
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(currentSettings, null, 2), 'utf-8');
    log('INFO', 'Settings updated successfully');
    return { success: true, settings: currentSettings };
  } catch (err: any) {
    log('ERROR', `Failed to save settings: ${err.message}`);
    return { success: false, settings: currentSettings, error: err.message };
  }
}

export function getSettings(): AppSettings {
  return currentSettings;
}

export function resetSettings(): AppSettings {
  currentSettings = { ...DEFAULT_SETTINGS };
  const check = verifyAndResolveDirectory(currentSettings.downloadDirectory);
  currentSettings.downloadDirectory = check.resolvedPath;
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(currentSettings, null, 2), 'utf-8');
  } catch (err: any) {
    log('ERROR', `Failed to reset settings: ${err.message}`);
  }
  return currentSettings;
}

export function ensureDirectory(dir: string): string {
  const check = verifyAndResolveDirectory(dir);
  return check.resolvedPath;
}
