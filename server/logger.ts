import fs from 'fs';
import path from 'path';
import { LogEntry } from './types';

const MAX_LOGS = 1000;
const logBuffer: LogEntry[] = [];
const DATA_DIR = path.join(process.cwd(), 'data');
const LOG_FILE = path.join(DATA_DIR, 'app.log');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.error('Failed to create data dir', e);
}

function formatLogLine(entry: LogEntry): string {
  return `${entry.timestamp} [${entry.level}] ${entry.message} ${entry.details ? JSON.stringify(entry.details) : ''}\n`;
}

const logListeners: Set<(entry: LogEntry) => void> = new Set();

export function onLog(listener: (entry: LogEntry) => void) {
  logListeners.add(listener);
  return () => logListeners.delete(listener);
}

export function log(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string, details?: Record<string, any>) {
  const entry: LogEntry = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    level,
    message,
    details
  };

  logBuffer.unshift(entry);
  if (logBuffer.length > MAX_LOGS) {
    logBuffer.pop();
  }

  // Console output
  const color = level === 'ERROR' ? '\x1b[31m' : level === 'WARN' ? '\x1b[33m' : level === 'DEBUG' ? '\x1b[90m' : '\x1b[32m';
  console.log(`${color}[${entry.level}]\x1b[0m ${entry.timestamp} ${message}`);

  // Notify listeners
  for (const listener of logListeners) {
    try {
      listener(entry);
    } catch {}
  }

  // Async append to file
  try {
    fs.appendFile(LOG_FILE, formatLogLine(entry), () => {});
  } catch {}
}

export function getLogs(limit = 200, level?: string, search?: string): LogEntry[] {
  let filtered = logBuffer;
  if (level && level !== 'ALL') {
    filtered = filtered.filter(l => l.level === level);
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(l => l.message.toLowerCase().includes(q) || (l.details && JSON.stringify(l.details).toLowerCase().includes(q)));
  }
  return filtered.slice(0, limit);
}

export function clearLogs() {
  logBuffer.length = 0;
  try {
    fs.writeFileSync(LOG_FILE, '');
  } catch {}
}
