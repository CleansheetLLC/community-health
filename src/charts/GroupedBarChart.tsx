// Pure SVG grouped/clustered vertical bar chart — multiple series side-by-side per category.

export interface BarSeries {
  label: string;
  color: string;
  values: number[];
}

interface GroupedBarChartProps {
  categories: string[];
  series: BarSeries[];
  yLabel?: string;
  title?: string;
  height?: number;
  showValues?: boolean;
  formatValue?: (v: number) => string;
}

export default function GroupedBarChart({
  categories,
  series,
  yLabel,
  title,
  height = 220,
  showValues = true,
  formatValue,
}: GroupedBarChartProps) {
  if (categories.length === 0 || series.length === 0) return null;

  const marginTop = 12;
  const marginBottom = 60;
  const marginLeft = yLabel ? 40 : 28;
  const marginRight = 12;
  const legendHeight = 24;
  const svgHeight = height + legendHeight;
  const svgWidth = Math.max(categories.length * series.length * 18 + marginLeft + marginRight, 320);
  const plotW = svgWidth - marginLeft - marginRight;
  const plotH = height - marginTop - marginBottom;

  // Compute max value across all series
  const allVals = series.flatMap((s) => s.values);
  const maxVal = Math.max(...allVals, 0.001);
  const niceMax = Math.ceil(maxVal * 1.15 * 100) / 100; // 15% headroom, round up

  // Bar geometry
  const groupWidth = plotW / categories.length;
  const barWidth = Math.min(Math.max(groupWidth / (series.length + 1), 6), 32);
  const groupInnerWidth = barWidth * series.length;

  const toY = (v: number) => marginTop + plotH - (v / niceMax) * plotH;
  const fmt = formatValue ?? ((v: number) => v % 1 === 0 ? String(v) : v.toFixed(2));

  // Y-axis grid lines (4 lines)
  const gridLines = Array.from({ length: 5 }, (_, i) => (niceMax / 4) * i);

  return (
    <div className="space-y-2">
      {title && (
        <p className="font-heading text-sm text-cs-text">{title}</p>
      )}
      <div className="overflow-x-auto">
        <svg width={svgWidth} height={svgHeight} className="block">
          {/* Grid lines */}
          {gridLines.map((v, i) => (
            <g key={i}>
              <line
                x1={marginLeft} y1={toY(v)} x2={svgWidth - marginRight} y2={toY(v)}
                stroke="currentColor" className="text-cs-border" strokeWidth={0.5}
              />
              <text x={marginLeft - 4} y={toY(v) + 3} textAnchor="end"
                className="fill-cs-text/30 font-mono" style={{ fontSize: 9 }}>
                {fmt(v)}
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

          {/* Bars */}
          {categories.map((cat, ci) => {
            const groupX = marginLeft + ci * groupWidth + (groupWidth - groupInnerWidth) / 2;
            return (
              <g key={ci}>
                {series.map((s, si) => {
                  const val = s.values[ci] ?? 0;
                  const barH = (val / niceMax) * plotH;
                  const x = groupX + si * barWidth;
                  const y = toY(val);
                  return (
                    <g key={si}>
                      <rect
                        x={x} y={y} width={barWidth - 1} height={Math.max(barH, 1)}
                        fill={s.color} rx={1.5}
                      />
                      {showValues && val > 0 && (
                        <text x={x + barWidth / 2 - 0.5} y={y - 3}
                          textAnchor="middle" className="fill-cs-text/40 font-mono"
                          style={{ fontSize: 8 }}>
                          {fmt(val)}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Category label */}
                <text
                  x={marginLeft + ci * groupWidth + groupWidth / 2}
                  y={marginTop + plotH + 12}
                  textAnchor="end"
                  transform={`rotate(-35, ${marginLeft + ci * groupWidth + groupWidth / 2}, ${marginTop + plotH + 12})`}
                  className="fill-cs-text/50 font-body" style={{ fontSize: 9 }}
                >
                  {cat.length > 14 ? cat.slice(0, 12) + "..." : cat}
                </text>
              </g>
            );
          })}

          {/* Legend */}
          {series.length > 1 && (
            <g transform={`translate(${marginLeft}, ${svgHeight - 14})`}>
              {series.map((s, i) => {
                const x = i * 100;
                return (
                  <g key={i} transform={`translate(${x}, 0)`}>
                    <rect width={8} height={8} rx={1.5} fill={s.color} y={-1} />
                    <text x={12} y={7} className="fill-cs-text/50 font-body" style={{ fontSize: 10 }}>
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
