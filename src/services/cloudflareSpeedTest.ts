import SpeedTest, { type Results } from '@cloudflare/speedtest';
import type { SpeedTestMetrics } from '../types';

export interface SpeedTestCallbacks {
  onRunningChange?: (running: boolean) => void;
  onStageChange?: (stage: string, progressPct: number) => void;
  onMetricsUpdate?: (metrics: SpeedTestMetrics) => void;
  onFinish?: (metrics: SpeedTestMetrics) => void;
  onError?: (message: string) => void;
}

function toMbps(bps: number | undefined | null): number | null {
  if (typeof bps !== 'number' || !Number.isFinite(bps)) return null;
  return Number((bps / 1_000_000).toFixed(2));
}

function toMs(ms: number | undefined | null): number | null {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return null;
  return Number(ms.toFixed(1));
}

export function extractMetrics(results: Results): SpeedTestMetrics {
  const s = results.getSummary();
  const hasPacketLoss = typeof s.packetLoss === 'number' && Number.isFinite(s.packetLoss);
  return {
    downloadMbps: toMbps(s.download),
    uploadMbps: toMbps(s.upload),
    unloadedLatencyMs: toMs(s.latency),
    unloadedJitterMs: toMs(s.jitter),
    downLoadedLatencyMs: toMs(s.downLoadedLatency),
    downLoadedJitterMs: toMs(s.downLoadedJitter),
    upLoadedLatencyMs: toMs(s.upLoadedLatency),
    upLoadedJitterMs: toMs(s.upLoadedJitter),
    packetLossPercent: hasPacketLoss ? Number(((s.packetLoss as number) * 100).toFixed(2)) : null,
    packetLossSupported: hasPacketLoss,
    totalDurationMs: toMs(s.totalDurationMs),
  };
}

export class CloudflareSpeedTestRunner {
  private engine: SpeedTest | null = null;
  private cancelled = false;

  start(callbacks: SpeedTestCallbacks) {
    this.cancel();
    this.cancelled = false;

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      callbacks.onError?.('Your device appears to be offline. Reconnect to run a real speed test.');
      return;
    }

    const engine = new SpeedTest({
      autoStart: false,
      measureDownloadLoadedLatency: true,
      measureUploadLoadedLatency: true,
      logAimApiUrl: null,
    });

    const totalPhases = 14;
    let phaseCount = 0;

    engine.onRunningChange = (running) => {
      if (!this.cancelled) {
        callbacks.onRunningChange?.(running);
      }
    };

    engine.onPhaseChange = ({ measurement }) => {
      if (this.cancelled) return;
      phaseCount += 1;
      const pct = Math.min(95, Math.max(5, Math.round((phaseCount / totalPhases) * 92)));
      const label =
        measurement.type === 'latency'
          ? 'Measuring Unloaded Latency & Jitter'
          : measurement.type === 'download'
            ? 'Measuring Download Throughput & Loaded Latency'
            : measurement.type === 'upload'
              ? 'Measuring Upload Throughput & Loaded Latency'
              : 'Running Diagnostic Phase';
      callbacks.onStageChange?.(label, pct);
    };

    engine.onResultsChange = () => {
      if (this.cancelled) return;
      callbacks.onMetricsUpdate?.(extractMetrics(engine.results));
    };

    engine.onError = (message) => {
      if (this.cancelled) return;
      callbacks.onError?.(message || 'Cloudflare speed test request failed.');
    };

    engine.onFinish = (results) => {
      if (this.cancelled) return;
      const metrics = extractMetrics(results);
      callbacks.onStageChange?.('Complete', 100);
      callbacks.onMetricsUpdate?.(metrics);
      callbacks.onFinish?.(metrics);
    };

    this.engine = engine;
    callbacks.onStageChange?.('Connecting to Cloudflare Edge...', 4);
    engine.play();
  }

  cancel() {
    this.cancelled = true;
    if (this.engine) {
      try {
        this.engine.pause();
      } catch {
        // ignore pause cleanup error
      }
      this.engine = null;
    }
  }
}
