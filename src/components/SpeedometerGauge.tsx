import React from 'react';

interface SpeedometerGaugeProps {
  valueMbps: number | null;
  phaseLabel: string;
  isRunning: boolean;
  latencyMs: number | null;
}

export function SpeedometerGauge({
  valueMbps,
  phaseLabel,
  isRunning,
  latencyMs,
}: SpeedometerGaugeProps) {
  const mbps = valueMbps !== null && Number.isFinite(valueMbps) ? Math.max(0, valueMbps) : 0;
  const clampedMbps = Math.min(1000, mbps);
  const normalized =
    clampedMbps === 0 ? 0 : Math.min(1, Math.log10(clampedMbps + 1) / Math.log10(1001));

  const radius = 116;
  const cx = 150;
  const cy = 148;
  const startAngle = 150;
  const sweepAngle = 240;
  const endAngle = startAngle + sweepAngle;
  const activeAngle = startAngle + sweepAngle * normalized;

  const polarToCartesian = (deg: number, r: number) => {
    const rad = (deg * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  const describeArc = (startDeg: number, endDeg: number, r: number) => {
    const start = polarToCartesian(startDeg, r);
    const end = polarToCartesian(endDeg, r);
    const largeArc = endDeg - startDeg <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  const needleTip = polarToCartesian(activeAngle, radius - 14);
  const ticks = [0, 5, 25, 100, 300, 1000];

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      <svg
        viewBox="0 0 300 255"
        className="w-full max-w-[320px] overflow-visible"
        role="img"
        aria-label={`Speedometer gauge reading ${mbps.toFixed(2)} Mbps`}
      >
        <defs>
          <linearGradient id="amberArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d97706" />
            <stop offset="65%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>

        <path
          d={describeArc(startAngle, endAngle, radius + 12)}
          fill="none"
          stroke="var(--border-hairline)"
          strokeWidth="1"
          strokeDasharray="3 5"
        />

        <path
          d={describeArc(startAngle, endAngle, radius)}
          fill="none"
          stroke="var(--border-hairline)"
          strokeWidth="10"
          strokeLinecap="round"
        />

        {normalized > 0 && (
          <path
            d={describeArc(startAngle, activeAngle, radius)}
            fill="none"
            stroke="url(#amberArcGrad)"
            strokeWidth="10"
            strokeLinecap="round"
          />
        )}

        {ticks.map((tickMbps) => {
          const tickNorm =
            tickMbps === 0 ? 0 : Math.log10(tickMbps + 1) / Math.log10(1001);
          const deg = startAngle + sweepAngle * tickNorm;
          const inner = polarToCartesian(deg, radius - 18);
          const outer = polarToCartesian(deg, radius - 10);
          const labelPos = polarToCartesian(deg, radius - 31);
          return (
            <g key={tickMbps}>
              <line
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke="var(--text-muted)"
                strokeWidth="1.4"
              />
              <text
                x={labelPos.x}
                y={labelPos.y + 3}
                textAnchor="middle"
                fill="var(--text-muted)"
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
              >
                {tickMbps}
              </text>
            </g>
          );
        })}

        <line
          x1={cx}
          y1={cy}
          x2={needleTip.x}
          y2={needleTip.y}
          stroke="var(--text-primary)"
          strokeWidth="2.2"
          strokeLinecap="round"
          style={{ transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
        <circle
          cx={cx}
          cy={cy}
          r="5"
          fill="var(--bg-surface)"
          stroke="var(--accent-secondary)"
          strokeWidth="2"
        />

        <text
          x={cx}
          y={cy + 46}
          textAnchor="middle"
          fill="var(--text-primary)"
          fontSize="36"
          fontWeight="600"
          fontFamily="JetBrains Mono, monospace"
        >
          {valueMbps === null ? '0.00' : mbps >= 100 ? mbps.toFixed(1) : mbps.toFixed(2)}
        </text>
        <text
          x={cx}
          y={cy + 66}
          textAnchor="middle"
          fill="var(--accent-secondary)"
          fontSize="12"
          fontFamily="JetBrains Mono, monospace"
          letterSpacing="2"
        >
          Mbps
        </text>
        <text
          x={cx}
          y={cy + 92}
          textAnchor="middle"
          fill={isRunning ? 'var(--text-primary)' : 'var(--text-muted)'}
          fontSize="11"
          fontFamily="Plus Jakarta Sans, sans-serif"
          fontWeight="500"
        >
          {phaseLabel}
          {latencyMs !== null ? ` · ${latencyMs.toFixed(1)} ms` : ''}
        </text>
      </svg>
    </div>
  );
}
