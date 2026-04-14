// Pure SVG horizontal bar chart — ranked items with labels and values.

export interface HBarItem {
  label: string;
  value: number;
  color?: string;
}

interface HorizontalBarChartProps {
  items: HBarItem[];
  maxItems?: number;
  showPercent?: boolean;
  title?: string;
  defaultColor?: string;
  formatValue?: (v: number) => string;
}

export default function HorizontalBarChart({
  items,
  maxItems = 12,
  showPercent = false,
  title,
  defaultColor = "#0066CC",
  formatValue,
}: HorizontalBarChartProps) {
  if (items.length === 0) return null;

  const sorted = [...items].sort((a, b) => b.value - a.value);
  const shown = sorted.slice(0, maxItems);
  const maxVal = shown[0]?.value || 1;
  const total = items.reduce((s, i) => s + i.value, 0);

  const fmt = formatValue ?? ((v: number) =>
    showPercent && total > 0
      ? `${((v / total) * 100).toFixed(0)}%`
      : v % 1 === 0
        ? String(v)
        : v.toFixed(2)
  );

  return (
    <div className="space-y-2">
      {title && (
        <p className="font-heading text-sm text-cs-text">{title}</p>
      )}
      <div className="space-y-1.5">
        {shown.map((item, i) => {
          const pct = (item.value / maxVal) * 100;
          return (
            <div key={i} className="flex items-center gap-2">
              <div className="w-24 sm:w-32 text-[11px] text-cs-text/60 truncate shrink-0 font-body text-right">
                {item.label}
              </div>
              <div className="flex-1 h-4 rounded bg-cs-bg overflow-hidden">
                <div
                  className="h-full rounded"
                  style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: item.color || defaultColor }}
                />
              </div>
              <div className="w-16 text-right text-[11px] font-mono text-cs-text/50 shrink-0">
                {fmt(item.value)}
              </div>
            </div>
          );
        })}
        {items.length > maxItems && (
          <p className="font-body text-[10px] text-cs-text/30 pl-24 sm:pl-32">
            +{items.length - maxItems} more
          </p>
        )}
      </div>
    </div>
  );
}
