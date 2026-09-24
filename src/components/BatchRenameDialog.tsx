import React, { useState, useMemo } from 'react';
import { DownloadItem } from '../types';
import {
  Edit3,
  X,
  Check,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  FileText,
  Sliders,
  Hash,
  ArrowRight,
  Info,
  CheckSquare,
  Square
} from 'lucide-react';

interface BatchRenameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  items: DownloadItem[];
  onBatchRename: (renames: { id: string; newTitle: string }[]) => Promise<void>;
}

type RenameMode = 'regex' | 'prefix_suffix' | 'format';

export const BatchRenameDialog: React.FC<BatchRenameDialogProps> = ({
  isOpen,
  onClose,
  items,
  onBatchRename
}) => {
  const [mode, setMode] = useState<RenameMode>('regex');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(items.map((i) => i.id)));

  // Regex mode states
  const [findPattern, setFindPattern] = useState<string>('');
  const [replacePattern, setReplacePattern] = useState<string>('');
  const [isCaseInsensitive, setIsCaseInsensitive] = useState<boolean>(true);
  const [isGlobal, setIsGlobal] = useState<boolean>(true);

  // Prefix & Suffix mode states
  const [prefix, setPrefix] = useState<string>('');
  const [suffix, setSuffix] = useState<string>('');

  // Format & Sequence mode states
  const [caseTransform, setCaseTransform] = useState<'none' | 'upper' | 'lower' | 'title' | 'kebab' | 'snake'>('none');
  const [addNumbering, setAddNumbering] = useState<boolean>(false);
  const [numberPosition, setNumberPosition] = useState<'prefix' | 'suffix'>('prefix');
  const [startNumber, setStartNumber] = useState<number>(1);
  const [numberDigits, setNumberDigits] = useState<number>(2);
  const [numberSeparator, setNumberSeparator] = useState<string>(' - ');

  // Global options
  const [preserveExtension, setPreserveExtension] = useState<boolean>(true);
  const [sanitizeIllegalChars, setSanitizeIllegalChars] = useState<boolean>(true);

  // Status & execution
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sync selectedIds when items change or dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(items.map((i) => i.id)));
      setError(null);
    }
  }, [isOpen, items]);

  // Quick regex presets
  const presets = [
    { label: 'Underscores -> Spaces', find: '_', replace: ' ', isRegex: true },
    { label: 'Dots -> Spaces', find: '\\.', replace: ' ', isRegex: true },
    { label: 'Remove [Brackets]', find: '\\[.*?\\]\\s*', replace: '', isRegex: true },
    { label: 'Remove (Parens)', find: '\\(.*?\\)\\s*', replace: '', isRegex: true },
    { label: 'Remove Leading Digits', find: '^\\d+[\\s.-]*', replace: '', isRegex: true },
    { label: 'Clean Extra Spaces', find: '\\s{2,}', replace: ' ', isRegex: true }
  ];

  // Helper for case conversion
  const applyCaseConversion = (text: string, transform: string): string => {
    switch (transform) {
      case 'upper':
        return text.toUpperCase();
      case 'lower':
        return text.toLowerCase();
      case 'title':
        return text.replace(
          /\w\S*/g,
          (w) => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase()
        );
      case 'kebab':
        return text
          .trim()
          .replace(/\s+/g, '-')
          .toLowerCase();
      case 'snake':
        return text
          .trim()
          .replace(/\s+/g, '_')
          .toLowerCase();
      default:
        return text;
    }
  };

  // Compute preview for all items
  const previewResults = useMemo(() => {
    let regexObj: RegExp | null = null;
    let regexError: string | null = null;

    if (mode === 'regex' && findPattern) {
      try {
        let flags = '';
        if (isGlobal) flags += 'g';
        if (isCaseInsensitive) flags += 'i';
        regexObj = new RegExp(findPattern, flags);
      } catch (err: any) {
        regexError = err.message || 'Invalid regular expression';
      }
    }

    let activeIndex = 0;
    const computed = items.map((item) => {
      const isIncluded = selectedIds.has(item.id);
      const originalTitle = item.title || '';

      if (!isIncluded) {
        return {
          id: item.id,
          originalTitle,
          newTitle: originalTitle,
          isChanged: false,
          isIncluded: false,
          error: null
        };
      }

      // Split filename into base and extension if preserving extension
      let baseName = originalTitle;
      let ext = '';
      if (preserveExtension) {
        const lastDot = originalTitle.lastIndexOf('.');
        if (lastDot > 0 && lastDot < originalTitle.length - 1) {
          baseName = originalTitle.substring(0, lastDot);
          ext = originalTitle.substring(lastDot);
        }
      }

      let transformed = baseName;

      // 1. Regex Mode
      if (mode === 'regex') {
        if (regexError) {
          return {
            id: item.id,
            originalTitle,
            newTitle: originalTitle,
            isChanged: false,
            isIncluded: true,
            error: regexError
          };
        }
        if (regexObj) {
          try {
            transformed = transformed.replace(regexObj, replacePattern);
          } catch (e: any) {
            return {
              id: item.id,
              originalTitle,
              newTitle: originalTitle,
              isChanged: false,
              isIncluded: true,
              error: e.message
            };
          }
        }
      }

      // 2. Prefix & Suffix Mode
      if (mode === 'prefix_suffix') {
        transformed = `${prefix}${transformed}${suffix}`;
      }

      // 3. Format & Numbering Mode
      if (mode === 'format') {
        if (caseTransform !== 'none') {
          transformed = applyCaseConversion(transformed, caseTransform);
        }

        if (addNumbering) {
          const currentNum = startNumber + activeIndex;
          const formattedNum = String(currentNum).padStart(numberDigits, '0');
          if (numberPosition === 'prefix') {
            transformed = `${formattedNum}${numberSeparator}${transformed}`;
          } else {
            transformed = `${transformed}${numberSeparator}${formattedNum}`;
          }
          activeIndex++;
        }
      }

      // Reattach extension if preserved
      let finalTitle = `${transformed}${ext}`.trim();

      // Clean illegal characters if requested
      if (sanitizeIllegalChars) {
        finalTitle = finalTitle.replace(/[<>:"/\\|?*]/g, '_').trim();
      }

      const isChanged = finalTitle !== originalTitle;
      const isEmpty = !finalTitle.length;

      return {
        id: item.id,
        originalTitle,
        newTitle: finalTitle || originalTitle,
        isChanged,
        isIncluded: true,
        error: isEmpty ? 'Title cannot be empty' : null
      };
    });

    return { items: computed, regexError };
  }, [
    items,
    selectedIds,
    mode,
    findPattern,
    replacePattern,
    isCaseInsensitive,
    isGlobal,
    prefix,
    suffix,
    caseTransform,
    addNumbering,
    numberPosition,
    startNumber,
    numberDigits,
    numberSeparator,
    preserveExtension,
    sanitizeIllegalChars
  ]);

  if (!isOpen) return null;

  const changedCount = previewResults.items.filter((i) => i.isIncluded && i.isChanged && !i.error).length;
  const hasErrors = previewResults.items.some((i) => i.isIncluded && !!i.error) || !!previewResults.regexError;

  const handleToggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const handleToggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleResetPatterns = () => {
    setFindPattern('');
    setReplacePattern('');
    setPrefix('');
    setSuffix('');
    setCaseTransform('none');
    setAddNumbering(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (changedCount === 0 || hasErrors) return;

    const toRename = previewResults.items
      .filter((i) => i.isIncluded && i.isChanged && !i.error)
      .map((i) => ({ id: i.id, newTitle: i.newTitle }));

    if (toRename.length === 0) return;

    setSaving(true);
    setError(null);
    try {
      await onBatchRename(toRename);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to batch rename items');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-5 backdrop-blur-xs font-sans select-none">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-lg shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden text-xs text-slate-200">
        {/* Title Bar */}
        <div className="h-10 bg-[#090d16] px-4 flex items-center justify-between border-b border-slate-800 text-slate-300 shrink-0">
          <div className="flex items-center space-x-2.5">
            <Edit3 className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-slate-100 text-sm">Batch Rename Downloads</span>
            <span className="px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-[10px] text-cyan-300 font-mono">
              {items.length} item{items.length > 1 ? 's' : ''} selected
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-slate-800 bg-[#0c121e] px-4 pt-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setMode('regex')}
            className={`pb-2 px-3 text-xs font-medium border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer ${
              mode === 'regex'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Regex / Pattern Match</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('prefix_suffix')}
            className={`pb-2 px-3 text-xs font-medium border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer ${
              mode === 'prefix_suffix'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Prefix & Suffix</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('format')}
            className={`pb-2 px-3 text-xs font-medium border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer ${
              mode === 'format'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            <span>Case & Numbering</span>
          </button>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: REGEX MODE */}
          {mode === 'regex' && (
            <div className="space-y-3 bg-[#0a0f1d] border border-slate-800/80 rounded-md p-3.5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1 font-medium">
                    Find Pattern (Regex / Text):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. \d+ or \[.*?\] or _"
                    value={findPattern}
                    onChange={(e) => setFindPattern(e.target.value)}
                    className="w-full bg-[#050811] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1 font-medium">
                    Replace With:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. $1 or space or empty"
                    value={replacePattern}
                    onChange={(e) => setReplacePattern(e.target.value)}
                    className="w-full bg-[#050811] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Flags & Presets */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                <div className="flex items-center space-x-4 text-[11px] text-slate-400">
                  <label className="flex items-center space-x-1.5 cursor-pointer hover:text-slate-200">
                    <input
                      type="checkbox"
                      checked={isGlobal}
                      onChange={(e) => setIsGlobal(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                    />
                    <span>Global Match (g)</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer hover:text-slate-200">
                    <input
                      type="checkbox"
                      checked={isCaseInsensitive}
                      onChange={(e) => setIsCaseInsensitive(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                    />
                    <span>Case Insensitive (i)</span>
                  </label>
                </div>

                {/* Preset Chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-500">Quick Presets:</span>
                  {presets.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setFindPattern(p.find);
                        setReplacePattern(p.replace);
                      }}
                      className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-cyan-900/40 text-[10px] text-slate-300 hover:text-cyan-200 border border-slate-700/60 transition-colors cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {previewResults.regexError && (
                <div className="flex items-center space-x-2 text-[11px] text-rose-400 bg-rose-950/40 border border-rose-900 rounded p-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{previewResults.regexError}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PREFIX & SUFFIX MODE */}
          {mode === 'prefix_suffix' && (
            <div className="space-y-3 bg-[#0a0f1d] border border-slate-800/80 rounded-md p-3.5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1 font-medium">
                    Prepend Prefix:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. [Documentary] or Course_"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    className="w-full bg-[#050811] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1 font-medium">
                    Append Suffix (before extension):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. _1080p or [HQ]"
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value)}
                    className="w-full bg-[#050811] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FORMAT & NUMBERING MODE */}
          {mode === 'format' && (
            <div className="space-y-3.5 bg-[#0a0f1d] border border-slate-800/80 rounded-md p-3.5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1 font-medium">
                    Case Transformation:
                  </label>
                  <select
                    value={caseTransform}
                    onChange={(e) => setCaseTransform(e.target.value as any)}
                    className="w-full bg-[#050811] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="none">Keep Original Case</option>
                    <option value="title">Title Case (Capitalize Every Word)</option>
                    <option value="upper">UPPERCASE</option>
                    <option value="lower">lowercase</option>
                    <option value="kebab">kebab-case-slug</option>
                    <option value="snake">snake_case_slug</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center space-x-1.5 text-[11px] text-slate-300 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addNumbering}
                      onChange={(e) => setAddNumbering(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                    />
                    <span>Add Sequential Numbering</span>
                  </label>

                  {addNumbering && (
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">Position:</span>
                        <select
                          value={numberPosition}
                          onChange={(e) => setNumberPosition(e.target.value as any)}
                          className="w-full bg-[#050811] border border-slate-700 rounded px-2 py-1 text-xs text-slate-100"
                        >
                          <option value="prefix">Prefix (#01)</option>
                          <option value="suffix">Suffix (01#)</option>
                        </select>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">Start At:</span>
                        <input
                          type="number"
                          min="0"
                          value={startNumber}
                          onChange={(e) => setStartNumber(parseInt(e.target.value, 10) || 1)}
                          className="w-full bg-[#050811] border border-slate-700 rounded px-2 py-1 text-xs text-slate-100"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">Padding:</span>
                        <select
                          value={numberDigits}
                          onChange={(e) => setNumberDigits(parseInt(e.target.value, 10))}
                          className="w-full bg-[#050811] border border-slate-700 rounded px-2 py-1 text-xs text-slate-100"
                        >
                          <option value="1">1, 2, 3</option>
                          <option value="2">01, 02, 03</option>
                          <option value="3">001, 002, 003</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Global Safety Options */}
          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 bg-slate-900/60 px-3 py-2 rounded border border-slate-800">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-1.5 cursor-pointer hover:text-slate-200">
                <input
                  type="checkbox"
                  checked={preserveExtension}
                  onChange={(e) => setPreserveExtension(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                />
                <span>Preserve File Extension (.mp4, .mkv, etc.)</span>
              </label>
              <label className="flex items-center space-x-1.5 cursor-pointer hover:text-slate-200">
                <input
                  type="checkbox"
                  checked={sanitizeIllegalChars}
                  onChange={(e) => setSanitizeIllegalChars(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                />
                <span>Auto-clean Illegal Filename Characters</span>
              </label>
            </div>

            <button
              type="button"
              onClick={handleResetPatterns}
              className="flex items-center space-x-1 text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Rules</span>
            </button>
          </div>

          {/* Live Preview Section */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  Live Preview:
                </span>
                <span className="text-[10px] text-cyan-400 font-mono">
                  {changedCount} of {selectedIds.size} will change
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 cursor-pointer"
              >
                {selectedIds.size === items.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {/* Preview Table */}
            <div className="border border-slate-800 rounded bg-[#070b13] overflow-hidden max-h-56 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#0b101c] text-[10px] font-semibold text-slate-400 border-b border-slate-800 sticky top-0 z-10">
                  <tr>
                    <th className="py-1.5 px-2.5 w-7 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === items.length && items.length > 0}
                        onChange={handleToggleSelectAll}
                        className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                      />
                    </th>
                    <th className="py-1.5 px-2.5">Original Title</th>
                    <th className="py-1.5 px-2 w-6 text-center"></th>
                    <th className="py-1.5 px-2.5">Renamed Title</th>
                    <th className="py-1.5 px-2.5 w-20 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans text-[11px]">
                  {previewResults.items.map((row) => (
                    <tr
                      key={row.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        !row.isIncluded ? 'opacity-40' : ''
                      }`}
                    >
                      <td className="py-1.5 px-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={row.isIncluded}
                          onChange={() => handleToggleItem(row.id)}
                          className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                        />
                      </td>
                      <td className="py-1.5 px-2.5 text-slate-300 truncate max-w-xs" title={row.originalTitle}>
                        {row.originalTitle}
                      </td>
                      <td className="py-1.5 px-2 text-center text-slate-500">
                        <ArrowRight className="w-3 h-3 inline-block" />
                      </td>
                      <td
                        className={`py-1.5 px-2.5 truncate max-w-xs font-medium ${
                          row.error
                            ? 'text-rose-400'
                            : row.isChanged
                            ? 'text-cyan-300 bg-cyan-950/20'
                            : 'text-slate-400'
                        }`}
                        title={row.newTitle}
                      >
                        {row.newTitle}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono text-[10px]">
                        {row.error ? (
                          <span className="text-rose-400 font-semibold" title={row.error}>
                            Error
                          </span>
                        ) : row.isChanged ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                            Changed
                          </span>
                        ) : (
                          <span className="text-slate-500">Unchanged</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded bg-rose-950/50 border border-rose-800 text-rose-300 text-[11px] flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="h-11 bg-[#090d16] px-4 flex items-center justify-between border-t border-slate-800 shrink-0">
          <div className="text-[11px] text-slate-400">
            {changedCount > 0 ? (
              <span>Ready to rename <strong className="text-cyan-300">{changedCount}</strong> item{changedCount > 1 ? 's' : ''}</span>
            ) : (
              <span>No modifications pending</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || changedCount === 0 || hasErrors}
              className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium flex items-center space-x-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-cyan-950"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{saving ? 'Renaming...' : `Apply Batch Rename (${changedCount})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
