import React, { useState } from 'react';
import { AppSettings } from '../types';
import { Calendar, Clock, X, Check } from 'lucide-react';

interface SchedulerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: Partial<AppSettings>) => Promise<void>;
}

export const SchedulerDialog: React.FC<SchedulerDialogProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings
}) => {
  const [enabled, setEnabled] = useState(settings.schedulerEnabled || false);
  const [startTime, setStartTime] = useState(settings.schedulerStartTime || '23:00');
  const [stopTime, setStopTime] = useState(settings.schedulerStopTime || '07:00');
  const [startQueued, setStartQueued] = useState(settings.schedulerStartQueued ?? true);
  const [pauseAfter, setPauseAfter] = useState(settings.schedulerPauseAfter ?? true);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveSettings({
        schedulerEnabled: enabled,
        schedulerStartTime: startTime,
        schedulerStopTime: stopTime,
        schedulerStartQueued: startQueued,
        schedulerPauseAfter: pauseAfter
      });
      onClose();
    } catch (err: any) {
      alert(`Could not save scheduler: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs font-sans">
      <div className="bg-[#121929] border border-slate-700 rounded-lg shadow-2xl w-full max-w-md overflow-hidden flex flex-col text-xs text-slate-200">
        <div className="h-9 bg-[#0b101c] px-3.5 flex items-center justify-between border-b border-slate-800 text-slate-300 select-none">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-slate-100 text-xs">Download Scheduler</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Enable Toggle */}
          <div className="flex items-center space-x-2 p-2.5 bg-slate-900/90 rounded border border-slate-800">
            <input
              type="checkbox"
              id="enableScheduler"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-cyan-600 focus:ring-0 cursor-pointer"
            />
            <label htmlFor="enableScheduler" className="font-medium text-slate-200 cursor-pointer">
              Enable automated download scheduler
            </label>
          </div>

          {/* Time pickers */}
          <div className={`grid grid-cols-2 gap-3 ${!enabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Start Time (Daily):</label>
              <div className="flex items-center space-x-2 bg-[#090d16] border border-slate-700 rounded px-2 py-1">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="bg-transparent text-slate-200 text-xs focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Stop Time (Daily):</label>
              <div className="flex items-center space-x-2 bg-[#090d16] border border-slate-700 rounded px-2 py-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <input
                  type="time"
                  value={stopTime}
                  onChange={(e) => setStopTime(e.target.value)}
                  className="bg-transparent text-slate-200 text-xs focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* Action checkboxes */}
          <div className={`space-y-2 pt-1 ${!enabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <span className="text-[11px] font-medium text-slate-400 block">Actions:</span>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="startQueued"
                checked={startQueued}
                onChange={(e) => setStartQueued(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-700 text-cyan-600 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="startQueued" className="text-slate-300 cursor-pointer">
                Start queued downloads when schedule window opens
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="pauseAfter"
                checked={pauseAfter}
                onChange={(e) => setPauseAfter(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-700 text-cyan-600 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="pauseAfter" className="text-slate-300 cursor-pointer">
                Pause all active downloads when schedule window closes
              </label>
            </div>
          </div>
        </div>

        <div className="h-10 bg-[#090d16] px-4 flex items-center justify-end space-x-2 border-t border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply Schedule</span>
          </button>
        </div>
      </div>
    </div>
  );
};
