import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DashboardStats } from '../types';
import { formatBytes, formatSpeed } from '../utils';
import {
  DownloadCloud,
  CheckCircle2,
  Clock,
  Activity,
  HardDrive,
  TrendingUp,
  Radio
} from 'lucide-react';

interface StatusBarProps {
  stats: DashboardStats;
  concurrencyLimit: number;
  selectedCount: number;
  totalItemsCount: number;
}

const MAX_HISTORY_POINTS = 36;
const SVG_WIDTH = 130;
const SVG_HEIGHT = 16;

export const StatusBar: React.FC<StatusBarProps> = ({
  stats,
  concurrencyLimit,
  selectedCount,
  totalItemsCount
}) => {
  // Real-time speed throughput history buffer
  const [speedHistory, setSpeedHistory] = useState<number[]>(() =>
    Array(MAX_HISTORY_POINTS).fill(0)
  );
  const [hoveredPoint, setHoveredPoint] = useState<{ index: number; speed: number; x: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Keep throughput rolling buffer updated with actual current speed
  useEffect(() => {
    const current = Math.max(0, stats.currentSpeed || 0);

    setSpeedHistory((prev) => {
      const next = [...prev.slice(1), current];
      return next;
    });
  }, [stats.currentSpeed]);

  // Regular periodic sample ticker every 1000ms so graph continues rolling smoothly
  useEffect(() => {
    const interval = setInterval(() => {
      const current = Math.max(0, stats.currentSpeed || 0);
      setSpeedHistory((prev) => [...prev.slice(1), current]);
    }, 1000);

    return () => clearInterval(interval);
  }, [stats.currentSpeed]);

  // Calculate throughput metrics for sparkline
  const { peakSpeed, avgSpeed, svgPath, areaPath, lastPoint } = useMemo(() => {
    const peak = Math.max(...speedHistory, 1024); // at least 1 KB/s ceiling
    const sum = speedHistory.reduce((acc, v) => acc + v, 0);
    const avg = sum / speedHistory.length;

    const len = speedHistory.length;
    const stepX = SVG_WIDTH / Math.max(1, len - 1);

    const points = speedHistory.map((val, idx) => {
      const x = idx * stepX;
      // Normalise y: SVG y=0 is top, y=SVG_HEIGHT is bottom. Leave 2px top padding.
      const normalizedHeight = (val / peak) * (SVG_HEIGHT - 3);
      const y = Math.max(1, SVG_HEIGHT - normalizedHeight - 1);
      return { x, y, val };
    });

    const linePoints = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ');
    const linePath = `M ${linePoints}`;
    const area = `M 0,${SVG_HEIGHT} L ${linePoints} L ${SVG_WIDTH},${SVG_HEIGHT} Z`;

    const last = points[points.length - 1];

    return {
      peakSpeed: Math.max(...speedHistory),
      avgSpeed: avg,
      svgPath: linePath,
      areaPath: area,
      lastPoint: last
    };
  }, [speedHistory]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const stepX = rect.width / (speedHistory.length - 1);
    const idx = Math.min(
      speedHistory.length - 1,
      Math.max(0, Math.round(mouseX / stepX))
    );
    setHoveredPoint({
      index: idx,
      speed: speedHistory[idx],
      x: idx * (SVG_WIDTH / (speedHistory.length - 1))
    });
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  const isNetworkActive = stats.currentSpeed > 0 || stats.activeCount > 0;

  return (
    <footer className="h-6 bg-[#080c14] border-t border-slate-800 px-3 flex items-center justify-between text-[11px] text-slate-400 select-none shrink-0 font-sans">
      {/* Left counters */}
      <div className="flex items-center space-x-3 divide-x divide-slate-800/80">
        <div className="flex items-center space-x-1.5 pr-3">
          <span
            className={`w-2 h-2 rounded-full ${
              isNetworkActive
                ? 'bg-cyan-400 animate-pulse ring-2 ring-cyan-500/30'
                : 'bg-slate-600'
            }`}
          />
          <span className="text-slate-300 font-medium">Active:</span>
          <span className="font-mono text-cyan-300 font-semibold">{stats.activeCount}</span>
          <span className="text-slate-500 font-mono">/ {concurrencyLimit} max</span>
        </div>

        <div className="flex items-center space-x-1.5 px-3">
          <Clock className="w-3 h-3 text-amber-400" />
          <span>Queued:</span>
          <span className="font-mono text-amber-300">{stats.queuedCount}</span>
        </div>

        <div className="flex items-center space-x-1.5 px-3 hidden sm:flex">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>Completed:</span>
          <span className="font-mono text-emerald-300">{stats.completedCount}</span>
        </div>

        {selectedCount > 0 && (
          <div className="flex items-center space-x-1 px-3 text-cyan-400 font-medium">
            <span>
              {selectedCount} of {totalItemsCount} selected
            </span>
          </div>
        )}
      </div>

      {/* Right transfer metrics & Real-time Throughput Sparkline */}
      <div className="flex items-center space-x-3 divide-x divide-slate-800/80">
        {/* Real-time Network Throughput Sparkline Chart */}
        <div className="flex items-center space-x-2 pl-2">
          <div className="relative flex items-center group cursor-crosshair">
            {/* Sparkline Canvas / SVG */}
            <div className="relative bg-[#050811] px-1.5 py-0.5 rounded border border-slate-800/90 flex items-center">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                className="w-28 sm:w-32 h-4 overflow-visible"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                <defs>
                  {/* Subtle area gradient */}
                  <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.45} />
                    <stop offset="65%" stopColor="#0891b2" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#0e7490" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                {/* Baseline Guide */}
                <line
                  x1="0"
                  y1={SVG_HEIGHT}
                  x2={SVG_WIDTH}
                  y2={SVG_HEIGHT}
                  stroke="#1e293b"
                  strokeWidth="0.8"
                />

                {/* Area fill */}
                <path d={areaPath} fill="url(#speedGradient)" />

                {/* Sparkline curve */}
                <path
                  d={svgPath}
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Live leading indicator dot */}
                {lastPoint && (
                  <circle
                    cx={lastPoint.x}
                    cy={lastPoint.y}
                    r="2"
                    className={isNetworkActive ? 'fill-cyan-300 animate-ping' : 'fill-slate-500'}
                  />
                )}
                {lastPoint && (
                  <circle
                    cx={lastPoint.x}
                    cy={lastPoint.y}
                    r="1.8"
                    className={isNetworkActive ? 'fill-cyan-300' : 'fill-slate-400'}
                  />
                )}

                {/* Hover vertical crosshair */}
                {hoveredPoint && (
                  <line
                    x1={hoveredPoint.x}
                    y1="0"
                    x2={hoveredPoint.x}
                    y2={SVG_HEIGHT}
                    stroke="#38bdf8"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />
                )}
              </svg>
            </div>

            {/* Hover Tooltip showing exact point throughput and peak */}
            {hoveredPoint && (
              <div className="absolute bottom-6 right-0 z-30 bg-[#090d16] border border-cyan-800/80 rounded px-2 py-1 shadow-xl text-[10px] whitespace-nowrap text-slate-200 font-mono pointer-events-none">
                <div className="text-cyan-300 font-semibold">
                  Speed: {formatSpeed(hoveredPoint.speed)}
                </div>
                <div className="text-slate-400 text-[9px]">
                  Peak: {formatSpeed(peakSpeed)} | Avg: {formatSpeed(avgSpeed)}
                </div>
              </div>
            )}
          </div>

          {/* Peak Speed tag if peak > 0 */}
          {peakSpeed > 0 && (
            <span
              className="hidden lg:inline text-[9px] font-mono text-slate-500 bg-slate-900/80 px-1 py-0.5 rounded border border-slate-800"
              title="Peak recorded throughput session"
            >
              Peak: {formatSpeed(peakSpeed)}
            </span>
          )}
        </div>

        {/* Live Speed Label */}
        <div className="flex items-center space-x-1.5 pl-3">
          <Activity
            className={`w-3 h-3 ${
              isNetworkActive ? 'text-cyan-400 animate-pulse' : 'text-slate-500'
            }`}
          />
          <span className="hidden md:inline">Speed:</span>
          <span className="font-mono text-cyan-300 font-semibold">
            {formatSpeed(stats.currentSpeed)}
          </span>
        </div>

        {/* Total Transferred */}
        <div className="flex items-center space-x-1.5 pl-3 hidden sm:flex">
          <HardDrive className="w-3 h-3 text-slate-400" />
          <span className="hidden md:inline">Transferred:</span>
          <span className="font-mono text-slate-200">
            {formatBytes(stats.totalDownloadedBytes)}
          </span>
        </div>
      </div>
    </footer>
  );
};
