import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Gauge,
  Info,
  Play,
  RotateCcw,
  Square,
} from 'lucide-react';
import { SpeedometerGauge } from '../components/SpeedometerGauge';
import { CloudflareSpeedTestRunner } from '../services/cloudflareSpeedTest';
import type { SpeedTestMetrics } from '../types';

const EMPTY_METRICS: SpeedTestMetrics = {
  downloadMbps: null,
  uploadMbps: null,
  unloadedLatencyMs: null,
  unloadedJitterMs: null,
  downLoadedLatencyMs: null,
  downLoadedJitterMs: null,
  upLoadedLatencyMs: null,
  upLoadedJitterMs: null,
  packetLossPercent: null,
  packetLossSupported: false,
  totalDurationMs: null,
};

function fmtNum(val: number | null, unit: string): string {
  if (val === null || !Number.isFinite(val)) return '—';
  return `${val} ${unit}`;
}

export function SpeedTestPage() {
  const runnerRef = useRef<CloudflareSpeedTestRunner | null>(null);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [stage, setStage] = useState('Ready to measure');
  const [progress, setProgress] = useState(0);
  const [metrics, setMetrics] = useState<SpeedTestMetrics>(EMPTY_METRICS);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const runner = new CloudflareSpeedTestRunner();
    runnerRef.current = runner;
    return () => {
      runner.cancel();
    };
  }, []);

  const startTest = () => {
    setError(null);
    setFinished(false);
    setMetrics(EMPTY_METRICS);
    setProgress(2);
    setRunning(true);

    runnerRef.current?.start({
      onRunningChange: (isRunning) => setRunning(isRunning),
      onStageChange: (label, pct) => {
        setStage(label);
        setProgress(pct);
      },
      onMetricsUpdate: (next) => setMetrics(next),
      onFinish: (finalMetrics) => {
        setMetrics(finalMetrics);
        setRunning(false);
        setFinished(true);
        setProgress(100);
        setStage('Complete');
      },
      onError: (msg) => {
        setError(msg);
        setRunning(false);
        setStage('Stopped');
      },
    });
  };

  const cancelTest = () => {
    runnerRef.current?.cancel();
    setRunning(false);
    setStage('Cancelled by user');
  };

  const primaryMbps =
    metrics.downloadMbps !== null ? metrics.downloadMbps : metrics.uploadMbps;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="text-xs font-mono-tabular uppercase tracking-[0.14em] text-[var(--accent-secondary)]">
          Service 2 · @cloudflare/speedtest
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
          Cloudflare Public Speed Test
        </h1>
        <p className="text-sm text-[var(--text-secondary)] max-w-2xl">
          Live browser-side connection measurement directly against Cloudflare&apos;s public edge
          endpoints. No Cloudflare API token is required, and no values are simulated.
        </p>
      </div>

      {/* Distinction Notice */}
      <div className="surface-card rounded-lg p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-[var(--accent-secondary)] shrink-0 mt-0.5" />
        <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
          This tests <strong className="text-[var(--text-primary)]">your visitor connection</strong>{' '}
          to Cloudflare. To view historical site speed reports for a hosted webpage, use the
          separate <strong className="text-[var(--text-primary)]">Website Speed Analyzer</strong>.
        </p>
      </div>

      {error && (
        <div className="surface-card rounded-xl p-4 border border-red-500/40 flex items-start gap-2.5 text-sm text-red-400">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Gauge & Controls */}
      <section className="surface-card rounded-xl p-6 sm:p-8 flex flex-col items-center gap-6">
        <SpeedometerGauge
          valueMbps={primaryMbps}
          phaseLabel={stage}
          isRunning={running}
          latencyMs={metrics.unloadedLatencyMs}
        />

        {/* Progress Bar */}
        <div className="w-full max-w-md space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-mono-tabular">
            <span>{stage}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
            <div
              className="h-full bg-[var(--accent-primary)] transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {!running ? (
            <button
              type="button"
              onClick={startTest}
              className="btn-amber-primary inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-md text-sm font-semibold"
            >
              {finished ? (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>Retest Connection</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Start Speed Test</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={cancelTest}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-md text-sm font-semibold bg-red-600/20 text-red-300 border border-red-500/40 hover:bg-red-600/30 transition-colors"
            >
              <Square className="w-4 h-4" />
              <span>Cancel Test</span>
            </button>
          )}
        </div>
      </section>

      {/* All 10 Measured Metrics */}
      <section aria-labelledby="metrics-heading" className="space-y-4">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-[var(--accent-secondary)]" />
          <h2
            id="metrics-heading"
            className="font-display text-lg font-semibold text-[var(--text-primary)]"
          >
            Measured Connection Metrics (10 Parameters)
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="surface-card rounded-lg p-4 space-y-1">
            <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
              Download
            </div>
            <div className="font-mono-tabular text-lg font-semibold text-[var(--text-primary)]">
              {fmtNum(metrics.downloadMbps, 'Mbps')}
            </div>
          </div>

          <div className="surface-card rounded-lg p-4 space-y-1">
            <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
              Upload
            </div>
            <div className="font-mono-tabular text-lg font-semibold text-[var(--text-primary)]">
              {fmtNum(metrics.uploadMbps, 'Mbps')}
            </div>
          </div>

          <div className="surface-card rounded-lg p-4 space-y-1">
            <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
              Unloaded Latency
            </div>
            <div className="font-mono-tabular text-lg font-semibold text-[var(--text-primary)]">
              {fmtNum(metrics.unloadedLatencyMs, 'ms')}
            </div>
          </div>

          <div className="surface-card rounded-lg p-4 space-y-1">
            <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
              Unloaded Jitter
            </div>
            <div className="font-mono-tabular text-lg font-semibold text-[var(--text-primary)]">
              {fmtNum(metrics.unloadedJitterMs, 'ms')}
            </div>
          </div>

          <div className="surface-card rounded-lg p-4 space-y-1">
            <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
              Total Duration
            </div>
            <div className="font-mono-tabular text-lg font-semibold text-[var(--text-primary)]">
              {metrics.totalDurationMs !== null
                ? `${(metrics.totalDurationMs / 1000).toFixed(1)} s`
                : '—'}
            </div>
          </div>

          <div className="surface-card rounded-lg p-4 space-y-1">
            <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
              Download Latency
            </div>
            <div className="font-mono-tabular text-base font-semibold text-[var(--text-primary)]">
              {fmtNum(metrics.downLoadedLatencyMs, 'ms')}
            </div>
          </div>

          <div className="surface-card rounded-lg p-4 space-y-1">
            <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
              Download Jitter
            </div>
            <div className="font-mono-tabular text-base font-semibold text-[var(--text-primary)]">
              {fmtNum(metrics.downLoadedJitterMs, 'ms')}
            </div>
          </div>

          <div className="surface-card rounded-lg p-4 space-y-1">
            <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
              Upload Latency
            </div>
            <div className="font-mono-tabular text-base font-semibold text-[var(--text-primary)]">
              {fmtNum(metrics.upLoadedLatencyMs, 'ms')}
            </div>
          </div>

          <div className="surface-card rounded-lg p-4 space-y-1">
            <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
              Upload Jitter
            </div>
            <div className="font-mono-tabular text-base font-semibold text-[var(--text-primary)]">
              {fmtNum(metrics.upLoadedJitterMs, 'ms')}
            </div>
          </div>

          <div className="surface-card rounded-lg p-4 space-y-1">
            <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
              Packet Loss
            </div>
            <div className="font-mono-tabular text-sm font-semibold text-[var(--text-primary)]">
              {metrics.packetLossSupported && metrics.packetLossPercent !== null
                ? `${metrics.packetLossPercent}%`
                : finished
                  ? 'N/A (No TURN)'
                  : '—'}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
