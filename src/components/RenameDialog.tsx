import React, { useState } from 'react';
import { DownloadItem } from '../types';
import { Edit2, X, Check } from 'lucide-react';

interface RenameDialogProps {
  item: DownloadItem | null;
  onClose: () => void;
  onRename: (id: string, newTitle: string) => Promise<void>;
}

export const RenameDialog: React.FC<RenameDialogProps> = ({
  item,
  onClose,
  onRename
}) => {
  const [newTitle, setNewTitle] = useState(item?.title || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setSaving(true);
    setError(null);
    try {
      await onRename(item.id, newTitle.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to rename item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs font-sans">
      <div className="bg-[#121929] border border-slate-700 rounded-lg shadow-2xl w-full max-w-md overflow-hidden flex flex-col text-xs text-slate-200">
        <div className="h-9 bg-[#0b101c] px-3.5 flex items-center justify-between border-b border-slate-800 text-slate-300 select-none">
          <div className="flex items-center space-x-2">
            <Edit2 className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-slate-100 text-xs">Rename Download</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Title / Display Name:</label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full bg-[#090d16] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-sans"
            />
          </div>

          {error && (
            <div className="p-2 rounded bg-rose-950/50 border border-rose-800 text-rose-300 text-[11px]">
              {error}
            </div>
          )}

          <div className="h-10 -mx-4 -mb-4 mt-4 bg-[#090d16] px-4 flex items-center justify-end space-x-2 border-t border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !newTitle.trim()}
              className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium flex items-center space-x-1.5 transition-colors disabled:opacity-40 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
