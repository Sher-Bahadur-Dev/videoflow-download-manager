import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface ShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsDialog: React.FC<ShortcutsDialogProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Ctrl + N', desc: 'Add new single URL download' },
    { key: 'Ctrl + B', desc: 'Add batch / multiple URLs' },
    { key: 'Ctrl + F', desc: 'Focus download search bar' },
    { key: 'Ctrl + ,', desc: 'Open application Options / Settings' },
    { key: 'Ctrl + R', desc: 'Refresh downloads list & stats' },
    { key: 'Space', desc: 'Start or Pause selected download' },
    { key: 'Enter', desc: 'Open completed file or view properties' },
    { key: 'Delete', desc: 'Remove selected download from list' },
    { key: 'Escape', desc: 'Close open dialog or context menu' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs font-sans">
      <div className="bg-[#121929] border border-slate-700 rounded-lg shadow-2xl w-full max-w-md overflow-hidden flex flex-col text-xs text-slate-200">
        <div className="h-9 bg-[#0b101c] px-3.5 flex items-center justify-between border-b border-slate-800 text-slate-300 select-none">
          <div className="flex items-center space-x-2">
            <Keyboard className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-slate-100 text-xs">Keyboard Shortcuts</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-2 max-h-[70vh] overflow-y-auto divide-y divide-slate-800">
          {shortcuts.map((s, idx) => (
            <div key={idx} className="flex items-center justify-between py-1.5 first:pt-0">
              <span className="text-slate-300 text-[11px]">{s.desc}</span>
              <kbd className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-400 font-mono text-[10px]">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="h-10 bg-[#090d16] px-4 flex items-center justify-end border-t border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
