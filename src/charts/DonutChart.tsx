// Pure SVG donut/doughnut chart. No charting library dependencies.

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  innerRadius?: number;
  centerLabel?: string;
  centerValue?: string;
  title?: string;
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const sweep = endAngle - startAngle;
  const largeArc = sweep > Math.PI ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export default function DonutChart({
  segments,
  size = 180,
  innerRadius = 0.55,
  centerLabel,
  centerValue,
  title,
}: DonutChartProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 2;
  const innerR = outerR * innerRadius;
  const strokeWidth = outerR - innerR;
  const midR = (outerR + innerR) / 2;

  // Build arcs
  let cumAngle = -Math.PI / 2; // start at 12 o'clock
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((seg) => {
      const sweep = (seg.value / total) * Math.PI * 2;
      // Clamp to avoid full-circle arc rendering issues
      const clampedSweep = Math.min(sweep, Math.PI * 2 - 0.001);
      const path = arcPath(cx, cy, midR, cumAngle, cumAngle + clampedSweep);
      const result = { ...seg, path, pct: (seg.value / total) * 100 };
      cumAngle += sweep;
      return result;
    });

  return (
    <div className="space-y-2">
      {title && (
        <p className="font-heading text-sm text-cs-text">{title}</p>
      )}
      <div className="flex items-start gap-4">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
          {arcs.map((arc, i) => (
            <path
              key={i}
              d={arc.path}
              fill="none"
              stroke={arc.color}
              strokeWidth={strokeWidth}
              strokeLinecap="butt"
            />
          ))}
          {(centerLabel || centerValue) && (
            <g>
              {centerValue && (
                <text x={cx} y={cy - 4} textAnchor="middle" className="fill-cs-text font-heading text-lg">
                  {centerValue}
                </text>
              )}
              {centerLabel && (
                <text x={cx} y={cy + 12} textAnchor="middle" className="fill-cs-text/50 font-body" style={{ fontSize: 10 }}>
                  {centerLabel}
                </text>
              )}
            </g>
          )}
        </svg>

        {/* Legend */}
        <div className="space-y-1 pt-1">
          {arcs.map((arc, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: arc.color }} />
              <span className="font-body text-[11px] text-cs-text/70">
                {arc.label}
              </span>
              <span className="font-mono text-[10px] text-cs-text/40 ml-auto">
                {arc.value} ({arc.pct.toFixed(0)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
