import fs from 'fs';
import path from 'path';
import { AppSettings } from '../types';
import { log } from '../logger';

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const DEFAULT_DOWNLOAD_DIR = path.join(process.cwd(), 'downloads');

const DEFAULT_SETTINGS: AppSettings = {
  downloadDirectory: DEFAULT_DOWNLOAD_DIR,
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
  schedulerPauseAfter: true,
};

let currentSettings: AppSettings = { ...DEFAULT_SETTINGS };

export function loadSettings(): AppSettings {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      currentSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    } else {
      currentSettings = { ...DEFAULT_SETTINGS };
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(currentSettings, null, 2), 'utf-8');
    }
  } catch (err: any) {
    log('ERROR', `Failed to read settings file: ${err.message}`);
    currentSettings = { ...DEFAULT_SETTINGS };
  }

  // Ensure download folder exists
  ensureDirectory(currentSettings.downloadDirectory);
  return currentSettings;
}

export function saveSettings(newSettings: Partial<AppSettings>): { success: boolean; settings: AppSettings; error?: string } {
  try {
    // Validate download directory
    if (newSettings.downloadDirectory) {
      const sanitized = path.resolve(newSettings.downloadDirectory);
      ensureDirectory(sanitized);
      newSettings.downloadDirectory = sanitized;
    }

    if (newSettings.maxConcurrentDownloads !== undefined) {
      newSettings.maxConcurrentDownloads = Math.max(1, Math.min(5, Math.floor(newSettings.maxConcurrentDownloads)));
    }

    currentSettings = { ...currentSettings, ...newSettings };
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
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(currentSettings, null, 2), 'utf-8');
    log('INFO', 'Settings reset to default values');
  } catch {}
  return currentSettings;
}

export function ensureDirectory(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
