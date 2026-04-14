// Pure SVG multi-series line chart with markers, grid, and legend.
// Supports ordinal (string) or numeric x-axis.

export interface LineSeries {
  label: string;
  color: string;
  data: { x: string | number; y: number }[];
}

interface TrendLineChartProps {
  series: LineSeries[];
  xLabel?: string;
  yLabel?: string;
  title?: string;
  height?: number;
  formatY?: (v: number) => string;
}

export default function TrendLineChart({
  series,
  xLabel,
  yLabel,
  title,
  height = 200,
  formatY,
}: TrendLineChartProps) {
  if (series.length === 0 || series.every((s) => s.data.length === 0)) return null;

  const marginTop = 12;
  const marginBottom = 50;
  const marginLeft = yLabel ? 44 : 32;
  const marginRight = 12;
  const legendHeight = series.length > 1 ? 24 : 0;
  const svgHeight = height + legendHeight;

  // Collect all x values (ordinal) for positioning
  const allX = new Set<string>();
  for (const s of series) {
    for (const pt of s.data) allX.add(String(pt.x));
  }
  const xValues = [...allX].sort();
  const xCount = Math.max(xValues.length, 1);

  // Compute min width so labels don't overlap
  const svgWidth = Math.max(xCount * 40 + marginLeft + marginRight, 320);
  const plotW = svgWidth - marginLeft - marginRight;
  const plotH = height - marginTop - marginBottom;

  // Y range
  const allY = series.flatMap((s) => s.data.map((pt) => pt.y));
  const minY = 0;
  const maxY = Math.max(...allY, 0.001);
  const niceMax = Math.ceil(maxY * 1.15 * 100) / 100;

  const toX = (xVal: string) => marginLeft + (xValues.indexOf(xVal) / Math.max(xCount - 1, 1)) * plotW;
  const toY = (v: number) => marginTop + plotH - ((v - minY) / (niceMax - minY)) * plotH;

  const fmtY = formatY ?? ((v: number) => v % 1 === 0 ? String(v) : v.toFixed(2));

  // Grid lines
  const gridLines = Array.from({ length: 5 }, (_, i) => (niceMax / 4) * i);

  return (
    <div className="space-y-2">
      {title && (
        <p className="font-heading text-sm text-cs-text">{title}</p>
      )}
      <div className="overflow-x-auto">
        <svg width={svgWidth} height={svgHeight} className="block">
          {/* Y grid */}
          {gridLines.map((v, i) => (
            <g key={i}>
              <line
                x1={marginLeft} y1={toY(v)} x2={svgWidth - marginRight} y2={toY(v)}
                stroke="currentColor" className="text-cs-border" strokeWidth={0.5}
              />
              <text x={marginLeft - 4} y={toY(v) + 3} textAnchor="end"
                className="fill-cs-text/30 font-mono" style={{ fontSize: 9 }}>
                {fmtY(v)}
              </text>
            </g>
          ))}

          {/* Y-axis label */}
          {yLabel && (
            <text
              transform={`translate(10, ${marginTop + plotH / 2}) rotate(-90)`}
              textAnchor="middle" className="fill-cs-text/40 font-body" style={{ fontSize: 10 }}
            >
              {yLabel}
            </text>
          )}

          {/* Series lines + dots */}
          {series.map((s, si) => {
            const points = s.data
              .map((pt) => ({ px: toX(String(pt.x)), py: toY(pt.y), val: pt.y }))
              .filter((p) => !isNaN(p.px) && !isNaN(p.py));

            if (points.length === 0) return null;

            const polyline = points.map((p) => `${p.px},${p.py}`).join(" ");

            return (
              <g key={si}>
                <polyline
                  points={polyline}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {points.map((p, pi) => (
                  <g key={pi}>
                    <circle cx={p.px} cy={p.py} r={3} fill={s.color} />
                    <title>{`${s.label}: ${fmtY(p.val)}`}</title>
                  </g>
                ))}
              </g>
            );
          })}

          {/* X-axis labels */}
          {xValues.map((xv, i) => {
            // Show every label if few, or every Nth if many
            const step = xCount > 15 ? Math.ceil(xCount / 12) : 1;
            if (i % step !== 0 && i !== xCount - 1) return null;
            return (
              <text
                key={i}
                x={toX(xv)}
                y={marginTop + plotH + 14}
                textAnchor="end"
                transform={`rotate(-35, ${toX(xv)}, ${marginTop + plotH + 14})`}
                className="fill-cs-text/40 font-body"
                style={{ fontSize: 9 }}
              >
                {xv.length > 12 ? xv.slice(0, 10) + ".." : xv}
              </text>
            );
          })}

          {/* X-axis label */}
          {xLabel && (
            <text
              x={marginLeft + plotW / 2}
              y={height - 4}
              textAnchor="middle"
              className="fill-cs-text/40 font-body" style={{ fontSize: 10 }}
            >
              {xLabel}
            </text>
          )}

          {/* Legend */}
          {series.length > 1 && (
            <g transform={`translate(${marginLeft}, ${svgHeight - 10})`}>
              {series.map((s, i) => {
                const x = i * 110;
                return (
                  <g key={i} transform={`translate(${x}, 0)`}>
                    <line x1={0} y1={0} x2={14} y2={0} stroke={s.color} strokeWidth={2} />
                    <circle cx={7} cy={0} r={2.5} fill={s.color} />
                    <text x={18} y={3.5} className="fill-cs-text/50 font-body" style={{ fontSize: 10 }}>
                      {s.label}
                    </text>
                  </g>
                );
              })}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
