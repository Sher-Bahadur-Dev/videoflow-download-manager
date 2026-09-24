import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { DashboardStats } from '../types';
import { formatBytes, formatSpeed } from '../utils';
import {
  Activity,
  HardDrive,
  Clock,
  CheckCircle2
} from 'lucide-react';

export interface StatusBarProps {
  stats: DashboardStats;
  concurrencyLimit: number;
  selectedCount: number;
  totalItemsCount: number;
  speedData?: number[];
}

const HISTORY_WINDOW_SECONDS = 60;
const CHART_WIDTH = 136;
const CHART_HEIGHT = 16;

export const StatusBar: React.FC<StatusBarProps> = ({
  stats,
  concurrencyLimit,
  selectedCount,
  totalItemsCount,
  speedData
}) => {
  // Internal fallback buffer in case speedData prop is not supplied
  const [internalSpeedHistory, setInternalSpeedHistory] = useState<number[]>(() =>
    Array(HISTORY_WINDOW_SECONDS).fill(0)
  );
  const [hoveredPoint, setHoveredPoint] = useState<{
    index: number;
    secondsAgo: number;
    speed: number;
    x: number;
  } | null>(null);
  const d3SvgRef = useRef<SVGSVGElement | null>(null);

  // Maintain internal 60-second speed history if speedData prop is not externally controlled
  useEffect(() => {
    if (speedData && speedData.length > 0) return;
    const current = Math.max(0, stats.currentSpeed || 0);
    setInternalSpeedHistory((prev) => {
      const next = [...prev];
      next[next.length - 1] = current;
      return next;
    });
  }, [stats.currentSpeed, speedData]);

  // Periodic rolling interval for internal buffer
  useEffect(() => {
    if (speedData && speedData.length > 0) return;
    const interval = setInterval(() => {
      const current = Math.max(0, stats.currentSpeed || 0);
      setInternalSpeedHistory((prev) => {
        const next = [...prev.slice(1), current];
        return next.length > HISTORY_WINDOW_SECONDS
          ? next.slice(-HISTORY_WINDOW_SECONDS)
          : next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [stats.currentSpeed, speedData]);

  // Determine effective speed data (external prop preferred, guaranteed 60s window)
  const effectiveSpeedData = useMemo(() => {
    if (speedData && speedData.length > 0) {
      if (speedData.length >= HISTORY_WINDOW_SECONDS) {
        return speedData.slice(-HISTORY_WINDOW_SECONDS);
      }
      // Pad to 60 items if smaller
      const pad = Array(HISTORY_WINDOW_SECONDS - speedData.length).fill(0);
      return [...pad, ...speedData];
    }
    return internalSpeedHistory;
  }, [speedData, internalSpeedHistory]);

  const peakSpeed = useMemo(() => {
    return Math.max(...effectiveSpeedData, 0);
  }, [effectiveSpeedData]);

  const avgSpeed = useMemo(() => {
    if (!effectiveSpeedData.length) return 0;
    const sum = effectiveSpeedData.reduce((acc, v) => acc + v, 0);
    return sum / effectiveSpeedData.length;
  }, [effectiveSpeedData]);

  // Render D3-based dynamic line chart representing the last 60 seconds
  useEffect(() => {
    if (!d3SvgRef.current) return;
    const svg = d3.select(d3SvgRef.current);
    svg.selectAll('*').remove();

    const data = effectiveSpeedData;
    if (!data || data.length === 0) return;

    const margin = { top: 2, right: 3, bottom: 2, left: 3 };
    const innerWidth = CHART_WIDTH - margin.left - margin.right;
    const innerHeight = CHART_HEIGHT - margin.top - margin.bottom;

    const maxSpeed = d3.max(data) || 0;
    const yCeiling = Math.max(maxSpeed, 1024); // at least 1 KB/s baseline ceiling

    // Linear scales across the 60-second window
    const xScale = d3
      .scaleLinear()
      .domain([0, Math.max(1, data.length - 1)])
      .range([0, innerWidth]);

    const yScale = d3
      .scaleLinear()
      .domain([0, yCeiling])
      .range([innerHeight, 0]);

    // Gradient definitions
    const defs = svg.append('defs');
    const gradId = 'd3-speed-sparkline-60s-grad';
    const gradient = defs
      .append('linearGradient')
      .attr('id', gradId)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#22d3ee')
      .attr('stop-opacity', 0.45);

    gradient
      .append('stop')
      .attr('offset', '65%')
      .attr('stop-color', '#0891b2')
      .attr('stop-opacity', 0.12);

    gradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#0e7490')
      .attr('stop-opacity', 0.0);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Baseline grid guide
    g.append('line')
      .attr('x1', 0)
      .attr('y1', innerHeight)
      .attr('x2', innerWidth)
      .attr('y2', innerHeight)
      .attr('stroke', '#1e293b')
      .attr('stroke-width', 0.8);

    // Area generator
    const areaGenerator = d3
      .area<number>()
      .x((_, i) => xScale(i))
      .y0(innerHeight)
      .y1((d) => yScale(d))
      .curve(d3.curveMonotoneX);

    // Render area
    g.append('path')
      .datum(data)
      .attr('fill', `url(#${gradId})`)
      .attr('d', areaGenerator);

    // Line generator
    const lineGenerator = d3
      .line<number>()
      .x((_, i) => xScale(i))
      .y((d) => yScale(d))
      .curve(d3.curveMonotoneX);

    // Render sparkline curve
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#22d3ee')
      .attr('stroke-width', 1.2)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('d', lineGenerator);

    // Live leading indicator dot on most recent speed sample (rightmost)
    const lastIdx = data.length - 1;
    const lastVal = data[lastIdx] || 0;
    const lastX = xScale(lastIdx);
    const lastY = yScale(lastVal);

    if (lastVal > 0) {
      g.append('circle')
        .attr('cx', lastX)
        .attr('cy', lastY)
        .attr('r', 2)
        .attr('fill', '#67e8f9');
    }

    // Hover vertical crosshair line
    if (hoveredPoint) {
      const hoverX = xScale(hoveredPoint.index);
      g.append('line')
        .attr('x1', hoverX)
        .attr('y1', 0)
        .attr('x2', hoverX)
        .attr('y2', innerHeight)
        .attr('stroke', '#38bdf8')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2,2');
    }
  }, [effectiveSpeedData, hoveredPoint]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!d3SvgRef.current) return;
    const rect = d3SvgRef.current.getBoundingClientRect();
    const mouseX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const stepX = rect.width / Math.max(1, effectiveSpeedData.length - 1);
    const idx = Math.min(
      effectiveSpeedData.length - 1,
      Math.max(0, Math.round(mouseX / stepX))
    );
    const secondsAgo = effectiveSpeedData.length - 1 - idx;
    setHoveredPoint({
      index: idx,
      secondsAgo,
      speed: effectiveSpeedData[idx] || 0,
      x: idx * (CHART_WIDTH / Math.max(1, effectiveSpeedData.length - 1))
    });
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  const isNetworkActive = stats.currentSpeed > 0 || stats.activeCount > 0;

  return (
    <footer className="h-6 bg-[#080c14] border-t border-slate-800 px-3 flex items-center justify-between text-[11px] text-slate-400 select-none shrink-0 font-sans">
      {/* Left Counters */}
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

      {/* Right Metrics: Total Current Speed Display with Real-time 60s D3 Sparkline Chart */}
      <div className="flex items-center space-x-3 divide-x divide-slate-800/80">
        {/* Total Current Speed Display & 60s D3 Sparkline */}
        <div className="flex items-center space-x-2 pl-3">
          <div className="flex items-center space-x-1.5">
            <Activity
              className={`w-3 h-3 ${
                isNetworkActive ? 'text-cyan-400 animate-pulse' : 'text-slate-500'
              }`}
            />
            <span className="hidden md:inline text-slate-400">Speed:</span>
            <span className="font-mono text-cyan-300 font-semibold">
              {formatSpeed(stats.currentSpeed)}
            </span>
          </div>

          {/* D3-based 60-Second Download Throughput Sparkline */}
          <div className="relative flex items-center group cursor-crosshair">
            <div
              className="relative bg-[#050811] px-1.5 py-0.5 rounded border border-slate-800/90 flex items-center shadow-xs"
              title="Last 60 seconds of download throughput fluctuations (D3.js sparkline)"
            >
              <svg
                ref={d3SvgRef}
                viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                className="w-32 sm:w-36 h-4 overflow-visible"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              />
              <span className="ml-1 text-[9px] font-mono text-slate-500 select-none">
                60s
              </span>
            </div>

            {/* Hover Tooltip displaying point throughput, seconds ago, and 60s stats */}
            {hoveredPoint && (
              <div className="absolute bottom-6 right-0 z-30 bg-[#090d16] border border-cyan-800/80 rounded px-2 py-1 shadow-xl text-[10px] whitespace-nowrap text-slate-200 font-mono pointer-events-none">
                <div className="text-cyan-300 font-semibold flex items-center space-x-1.5">
                  <span>Speed: {formatSpeed(hoveredPoint.speed)}</span>
                  <span className="text-slate-400 text-[9px]">
                    ({hoveredPoint.secondsAgo === 0 ? 'now' : `${hoveredPoint.secondsAgo}s ago`})
                  </span>
                </div>
                <div className="text-slate-400 text-[9px]">
                  60s Peak: {formatSpeed(peakSpeed)} | 60s Avg: {formatSpeed(avgSpeed)}
                </div>
              </div>
            )}
          </div>

          {/* Peak Speed Badge */}
          {peakSpeed > 0 && (
            <span
              className="hidden lg:inline text-[9px] font-mono text-slate-500 bg-slate-900/80 px-1 py-0.5 rounded border border-slate-800"
              title="Peak recorded throughput in last 60 seconds"
            >
              60s Peak: {formatSpeed(peakSpeed)}
            </span>
          )}
        </div>

        {/* Total Transferred Bytes */}
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
