// Reads the current SVI data + dataSource and renders source-appropriate charts.
// Mounts below the map in SVIMap.tsx.

import { useMemo } from "react";
import DonutChart from "./DonutChart";
import HorizontalBarChart from "./HorizontalBarChart";
import GroupedBarChart from "./GroupedBarChart";
import TrendLineChart from "./TrendLineChart";
import {
  SVI_THEMES, SVI_COLORS,
  type SVIFeatureCollection, type SVIProperties,
} from "../svi-data";
import { getScreeningLog } from "../screening-log";

// Mirrors the DataSource type from SVIMap.tsx
type DataSource =
  | { kind: "sample" }
  | { kind: "svi"; filename: string }
  | { kind: "acs"; filename: string; column: string }
  | { kind: "screening"; entries: number; tracts: number };

interface DashboardProps {
  data: SVIFeatureCollection;
  dataSource: DataSource;
}

// ─── SVI / Sample charts ─────────────────────────────────────────────────────

function SviCharts({ features }: { features: SVIFeatureCollection["features"] }) {
  const tracts = features.map((f) => f.properties).filter(Boolean) as SVIProperties[];

  // Donut: vulnerability tier distribution
  const tierCounts = useMemo(() => {
    const tiers = [
      { label: "Very Low (0-0.2)", color: SVI_COLORS[0], count: 0 },
      { label: "Low (0.2-0.4)", color: SVI_COLORS[1], count: 0 },
      { label: "Moderate (0.4-0.6)", color: SVI_COLORS[2], count: 0 },
      { label: "High (0.6-0.8)", color: SVI_COLORS[3], count: 0 },
      { label: "Very High (0.8-1.0)", color: SVI_COLORS[4], count: 0 },
    ];
    for (const t of tracts) {
      const v = t.RPL_THEMES;
      if (v < 0) continue;
      if (v < 0.2) tiers[0].count++;
      else if (v < 0.4) tiers[1].count++;
      else if (v < 0.6) tiers[2].count++;
      else if (v < 0.8) tiers[3].count++;
      else tiers[4].count++;
    }
    return tiers.map((t) => ({ label: t.label, value: t.count, color: t.color }));
  }, [tracts]);

  // Sorted tracts for bar/line charts
  const sorted = useMemo(
    () => [...tracts].filter((t) => t.RPL_THEMES >= 0).sort((a, b) => b.RPL_THEMES - a.RPL_THEMES),
    [tracts],
  );

  // Horizontal bar: tracts ranked by overall SVI
  const rankedTracts = useMemo(
    () => sorted.map((t) => ({ label: t.LOCATION || t.FIPS, value: t.RPL_THEMES, color: undefined })),
    [sorted],
  );

  // Race lines: 4 SVI themes across tracts (sorted by overall)
  const themeLines = useMemo(() => {
    const themeIds = ["RPL_THEME1", "RPL_THEME2", "RPL_THEME3", "RPL_THEME4"] as const;
    return SVI_THEMES.filter((th) => th.id !== "RPL_THEMES").map((th, i) => ({
      label: th.label,
      color: th.color,
      data: sorted.map((t) => ({
        x: t.LOCATION || t.FIPS,
        y: t[themeIds[i]] >= 0 ? t[themeIds[i]] : 0,
      })),
    }));
  }, [sorted]);

  // Grouped bars: 4 themes per tract
  const groupedThemes = useMemo(() => {
    const cats = sorted.slice(0, 12).map((t) => t.LOCATION || t.FIPS);
    const themeIds = ["RPL_THEME1", "RPL_THEME2", "RPL_THEME3", "RPL_THEME4"] as const;
    const ser = SVI_THEMES.filter((th) => th.id !== "RPL_THEMES").map((th, i) => ({
      label: th.label,
      color: th.color,
      values: sorted.slice(0, 12).map((t) => t[themeIds[i]] >= 0 ? t[themeIds[i]] : 0),
    }));
    return { categories: cats, series: ser };
  }, [sorted]);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="border border-cs-border rounded-lg bg-white p-4">
          <DonutChart
            segments={tierCounts}
            title="Vulnerability Distribution"
            centerValue={String(tracts.length)}
            centerLabel="tracts"
          />
        </div>
        <div className="border border-cs-border rounded-lg bg-white p-4">
          <HorizontalBarChart
            items={rankedTracts}
            title="Tracts Ranked by Overall SVI"
            formatValue={(v) => v.toFixed(2)}
            defaultColor="#7b3294"
          />
        </div>
      </div>
      <div className="border border-cs-border rounded-lg bg-white p-4">
        <GroupedBarChart
          categories={groupedThemes.categories}
          series={groupedThemes.series}
          title="SVI Themes by Tract (top 12)"
          yLabel="Percentile (0-1)"
          formatValue={(v) => v.toFixed(2)}
        />
      </div>
      <div className="border border-cs-border rounded-lg bg-white p-4">
        <TrendLineChart
          series={themeLines}
          title="Theme Race Lines (tracts sorted by overall SVI)"
          yLabel="Percentile"
          xLabel="Tracts (high → low overall vulnerability)"
          formatY={(v) => v.toFixed(1)}
        />
      </div>
    </>
  );
}

// ─── Census ACS charts ───────────────────────────────────────────────────────

function AcsCharts({ features, column }: { features: SVIFeatureCollection["features"]; column: string }) {
  const tracts = features.map((f) => f.properties).filter(Boolean) as SVIProperties[];
  const sorted = useMemo(
    () => [...tracts].filter((t) => t.RPL_THEMES >= 0).sort((a, b) => b.RPL_THEMES - a.RPL_THEMES),
    [tracts],
  );

  // For ACS data, RPL_THEMES holds the normalized selected column value
  const rankedTracts = useMemo(
    () => sorted.map((t) => ({ label: t.LOCATION || t.FIPS, value: t.RPL_THEMES })),
    [sorted],
  );

  // Population distribution donut
  const popDonut = useMemo(
    () => sorted.slice(0, 12).map((t) => ({
      label: t.LOCATION || t.FIPS,
      value: Math.max(t.E_TOTPOP, 0),
      color: `hsl(${210 + sorted.indexOf(t) * 12}, 60%, 55%)`,
    })),
    [sorted],
  );

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="border border-cs-border rounded-lg bg-white p-4">
          <DonutChart
            segments={popDonut}
            title="Population by Tract"
            centerValue={String(tracts.reduce((s, t) => s + Math.max(t.E_TOTPOP, 0), 0).toLocaleString())}
            centerLabel="total pop."
          />
        </div>
        <div className="border border-cs-border rounded-lg bg-white p-4">
          <HorizontalBarChart
            items={rankedTracts}
            title={`Tracts Ranked by ${column} (normalized)`}
            formatValue={(v) => v.toFixed(3)}
            defaultColor="#0066CC"
          />
        </div>
      </div>
    </>
  );
}

// ─── Screening log charts ────────────────────────────────────────────────────

function ScreeningCharts({ features }: { features: SVIFeatureCollection["features"] }) {
  const log = useMemo(() => getScreeningLog(), []);
  const tractEntries = useMemo(() => log.filter((e) => e.censusTract), [log]);

  // Risk distribution donut
  const riskDonut = useMemo(() => [
    { label: "High", value: tractEntries.filter((e) => e.overallRisk === "High").length, color: "#dc2626" },
    { label: "Moderate", value: tractEntries.filter((e) => ["Moderate", "Medium"].includes(e.overallRisk)).length, color: "#d97706" },
    { label: "Low", value: tractEntries.filter((e) => e.overallRisk === "Low").length, color: "#16a34a" },
  ], [tractEntries]);

  // Domain flags — aggregate across all entries
  const domainBars = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of tractEntries) {
      for (const d of entry.domains) {
        if (d.flagCount > 0) {
          counts.set(d.domain, (counts.get(d.domain) || 0) + d.flagCount);
        }
      }
    }
    return [...counts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [tractEntries]);

  // Time series: screenings per day by risk level
  const timeSeries = useMemo(() => {
    const byDate = new Map<string, { high: number; mod: number; low: number }>();
    for (const e of tractEntries) {
      const date = e.date.slice(0, 10);
      const bucket = byDate.get(date) || { high: 0, mod: 0, low: 0 };
      if (e.overallRisk === "High") bucket.high++;
      else if (["Moderate", "Medium"].includes(e.overallRisk)) bucket.mod++;
      else bucket.low++;
      byDate.set(date, bucket);
    }
    const dates = [...byDate.keys()].sort();
    return [
      { label: "High", color: "#dc2626", data: dates.map((d) => ({ x: d, y: byDate.get(d)!.high })) },
      { label: "Moderate", color: "#d97706", data: dates.map((d) => ({ x: d, y: byDate.get(d)!.mod })) },
      { label: "Low", color: "#16a34a", data: dates.map((d) => ({ x: d, y: byDate.get(d)!.low })) },
    ];
  }, [tractEntries]);

  // Tracts ranked by screening count
  const tractRank = useMemo(() => {
    const tracts = features.map((f) => f.properties).filter(Boolean) as SVIProperties[];
    return tracts
      .map((t) => ({ label: t.LOCATION || t.FIPS, value: Math.max(t.E_TOTPOP, 0) }))
      .sort((a, b) => b.value - a.value);
  }, [features]);

  if (tractEntries.length === 0) {
    return (
      <p className="font-body text-xs text-cs-text/40 text-center py-4">
        No tract-tagged screening entries. Run a screening with location tagging to see analytics.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="border border-cs-border rounded-lg bg-white p-4">
          <DonutChart
            segments={riskDonut}
            title="Risk Level Distribution"
            centerValue={String(tractEntries.length)}
            centerLabel="screenings"
          />
        </div>
        <div className="border border-cs-border rounded-lg bg-white p-4">
          <HorizontalBarChart
            items={domainBars}
            title="Domain Flags (all screenings)"
            defaultColor="#dc2626"
          />
        </div>
      </div>
      {timeSeries[0].data.length > 1 && (
        <div className="border border-cs-border rounded-lg bg-white p-4">
          <TrendLineChart
            series={timeSeries}
            title="Screenings Over Time"
            xLabel="Date"
            yLabel="Count"
          />
        </div>
      )}
      <div className="border border-cs-border rounded-lg bg-white p-4">
        <HorizontalBarChart
          items={tractRank}
          title="Tracts by Screening Count"
          defaultColor="#0066CC"
        />
      </div>
    </>
  );
}

// ─── Main composer ───────────────────────────────────────────────────────────

export default function PopulationHealthDashboard({ data, dataSource }: DashboardProps) {
  if (!data.features || data.features.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="font-heading text-base text-cs-text border-b border-cs-border pb-1">
        Population Health Analytics
      </h3>
      {(dataSource.kind === "svi" || dataSource.kind === "sample") && (
        <SviCharts features={data.features} />
      )}
      {dataSource.kind === "acs" && (
        <AcsCharts features={data.features} column={dataSource.column} />
      )}
      {dataSource.kind === "screening" && (
        <ScreeningCharts features={data.features} />
      )}
    </div>
  );
}
