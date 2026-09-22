import React from 'react';
import { ALL_COLUMNS } from './DownloadTable';
import { SlidersHorizontal, X, Check } from 'lucide-react';

interface ColumnChooserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  visibleColumns: Record<string, boolean>;
  onToggleColumn: (colId: string) => void;
  onResetColumns: () => void;
}

export const ColumnChooserDialog: React.FC<ColumnChooserDialogProps> = ({
  isOpen,
  onClose,
  visibleColumns,
  onToggleColumn,
  onResetColumns
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs font-sans">
      <div className="bg-[#121929] border border-slate-700 rounded-lg shadow-2xl w-full max-w-sm overflow-hidden flex flex-col text-xs text-slate-200">
        <div className="h-9 bg-[#0b101c] px-3.5 flex items-center justify-between border-b border-slate-800 text-slate-300 select-none">
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-slate-100 text-xs">Table Columns Customizer</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-2 max-h-[70vh] overflow-y-auto">
          <p className="text-[11px] text-slate-400 mb-2">
            Choose which columns appear in the main download table:
          </p>

          <div className="space-y-1.5 divide-y divide-slate-800/60">
            {ALL_COLUMNS.filter((col) => col.id !== 'statusIcon').map((col) => {
              const isChecked = visibleColumns[col.id] !== false;
              const isRequired = col.id === 'title';

              return (
                <label
                  key={col.id}
                  className={`flex items-center justify-between pt-1.5 pb-0.5 cursor-pointer ${
                    isRequired ? 'opacity-60 cursor-not-allowed' : 'hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <input
                      type="checkbox"
                      disabled={isRequired}
                      checked={isChecked}
                      onChange={() => onToggleColumn(col.id)}
                      className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-cyan-600 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-slate-200 text-xs">{col.label}</span>
                  </div>
                  {isRequired && (
                    <span className="text-[10px] text-slate-500 font-mono">Required</span>
                  )}
                </label>
              );
            })}
          </div>
        </div>

        <div className="h-10 bg-[#090d16] px-4 flex items-center justify-between border-t border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onResetColumns}
            className="text-[11px] text-slate-400 hover:text-cyan-300 transition-colors"
          >
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
