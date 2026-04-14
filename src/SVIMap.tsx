import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  SVI_THEMES, SVI_COLORS, SVI_LABELS,
  SAMPLE_SVI_DATA, SAMPLE_FACILITIES,
  sviColor, sviLabel,
  type SVIFeatureCollection, type SVITheme, type FacilityMarker, type SVIProperties,
} from "./svi-data";
import { getScreeningLog } from "./screening-log";
import PopulationHealthDashboard from "./charts/PopulationHealthDashboard";

type DataSource =
  | { kind: "sample" }
  | { kind: "svi"; filename: string }
  | { kind: "acs"; filename: string; column: string }
  | { kind: "screening"; entries: number; tracts: number };

function dataSourceLabel(ds: DataSource): string {
  switch (ds.kind) {
    case "sample": return "Sample data (Franklin County, OH)";
    case "svi": return `CDC SVI: ${ds.filename}`;
    case "acs": return `Census ACS: ${ds.filename} (${ds.column})`;
    case "screening": return `Screening Log (${ds.entries} entries, ${ds.tracts} tracts)`;
  }
}

// ─── Facility icon colors ────────────────────────────────────────────────────

const FACILITY_COLORS: Record<string, string> = {
  FQHC: "#16a34a",
  Hospital: "#0066CC",
  Clinic: "#f59e0b",
};

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend({ theme }: { theme: SVITheme }) {
  return (
    <div className="border border-cs-border rounded-lg bg-white p-3 space-y-2">
      <p className="font-body text-xs font-medium text-cs-text">{theme.label}</p>
      <div className="flex gap-0.5">
        {SVI_COLORS.map((c, i) => (
          <div key={i} className="flex-1">
            <div className="h-3 rounded-sm" style={{ backgroundColor: c }} />
            <p className="font-body text-[9px] text-cs-text/50 mt-0.5 leading-tight">{SVI_LABELS[i].split("(")[0].trim()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Theme Selector ──────────────────────────────────────────────────────────

function ThemeSelector({ active, onChange }: { active: SVITheme; onChange: (t: SVITheme) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {SVI_THEMES.map((th) => (
        <button
          key={th.id}
          onClick={() => onChange(th)}
          className={`px-2.5 py-1 rounded text-xs font-body font-medium transition-colors ${
            active.id === th.id
              ? "text-white"
              : "bg-cs-bg text-cs-text-muted hover:text-cs-text"
          }`}
          style={active.id === th.id ? { backgroundColor: th.color } : undefined}
        >
          {th.label}
        </button>
      ))}
    </div>
  );
}

// ─── Tract Detail Panel ──────────────────────────────────────────────────────

function TractDetail({ properties, onClose }: { properties: SVIProperties; onClose: () => void }) {
  const themes = [
    { key: "RPL_THEME1" as const, label: "Socioeconomic", color: "#d73027" },
    { key: "RPL_THEME2" as const, label: "Household", color: "#fc8d59" },
    { key: "RPL_THEME3" as const, label: "Minority Status", color: "#91bfdb" },
    { key: "RPL_THEME4" as const, label: "Housing/Transport", color: "#4575b4" },
  ];

  return (
    <div className="border border-cs-border rounded-lg bg-white p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-heading text-sm text-cs-text">{properties.LOCATION}</p>
          <p className="font-body text-xs text-cs-text/50">{properties.COUNTY} County, {properties.STATE} &middot; FIPS {properties.FIPS}</p>
        </div>
        <button onClick={onClose} className="text-cs-text/30 hover:text-cs-text p-1" aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center font-heading text-white text-sm font-bold"
          style={{ backgroundColor: sviColor(properties.RPL_THEMES) }}
        >
          {(properties.RPL_THEMES * 100).toFixed(0)}
        </div>
        <div>
          <p className="font-body text-xs font-medium text-cs-text">Overall SVI Percentile</p>
          <p className="font-body text-xs text-cs-text/50">{sviLabel(properties.RPL_THEMES)} &middot; Pop. {properties.E_TOTPOP.toLocaleString()}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        {themes.map((th) => {
          const val = properties[th.key];
          return (
            <div key={th.key}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-body text-[11px] text-cs-text/70">{th.label}</span>
                <span className="font-mono text-[11px] text-cs-text/50">{(val * 100).toFixed(0)}%</span>
              </div>
              <div className="h-1.5 bg-cs-bg rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${val * 100}%`, backgroundColor: th.color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Stats Summary ───────────────────────────────────────────────────────────

function StatsSummary({ data }: { data: SVIFeatureCollection }) {
  const stats = useMemo(() => {
    const features = data.features.filter((f) => f.properties.RPL_THEMES >= 0);
    const totalPop = features.reduce((s, f) => s + f.properties.E_TOTPOP, 0);
    const highVuln = features.filter((f) => f.properties.RPL_THEMES >= 0.75);
    const highVulnPop = highVuln.reduce((s, f) => s + f.properties.E_TOTPOP, 0);
    const avgSvi = features.reduce((s, f) => s + f.properties.RPL_THEMES, 0) / features.length;
    return { tracts: features.length, totalPop, highVuln: highVuln.length, highVulnPop, avgSvi };
  }, [data]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: "Census Tracts", value: stats.tracts.toLocaleString() },
        { label: "Total Population", value: stats.totalPop.toLocaleString() },
        { label: "High Vulnerability", value: `${stats.highVuln} tracts (${((stats.highVuln / stats.tracts) * 100).toFixed(0)}%)` },
        { label: "Avg SVI Percentile", value: `${(stats.avgSvi * 100).toFixed(1)}%` },
      ].map((s) => (
        <div key={s.label} className="border border-cs-border rounded-lg bg-white p-3">
          <p className="font-body text-[11px] text-cs-text/50">{s.label}</p>
          <p className="font-heading text-base text-cs-text">{s.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Main SVI Map Component ──────────────────────────────────────────────────

export default function SVIMapView() {
  const [data, setData] = useState<SVIFeatureCollection>(SAMPLE_SVI_DATA);
  const [activeTheme, setActiveTheme] = useState<SVITheme>(SVI_THEMES[0]);
  const [selectedTract, setSelectedTract] = useState<SVIProperties | null>(null);
  const [showFacilities, setShowFacilities] = useState(true);
  const [facilities] = useState<FacilityMarker[]>(SAMPLE_FACILITIES);
  const [dataSource, setDataSource] = useState<DataSource>({ kind: "sample" });
  // Census ACS column picker state
  const [acsColumns, setAcsColumns] = useState<string[]>([]);
  const [acsSelectedColumn, setAcsSelectedColumn] = useState<string>("");
  const [acsRawRows, setAcsRawRows] = useState<Record<string, string>[] | null>(null);
  const [acsFilename, setAcsFilename] = useState("");

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const geoJsonLayer = useRef<L.GeoJSON | null>(null);
  const facilityLayer = useRef<L.LayerGroup | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: true,
    });
    mapInstance.current = map;

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    // Default view: continental US
    map.setView([39.97, -82.97], 12);

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Update GeoJSON layer when data or theme changes
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    if (geoJsonLayer.current) {
      map.removeLayer(geoJsonLayer.current);
    }

    const themeKey = activeTheme.id;

    geoJsonLayer.current = L.geoJSON(data as GeoJSON.FeatureCollection, {
      style: (feature) => {
        const val = feature?.properties?.[themeKey] as number | undefined;
        return {
          fillColor: sviColor(val),
          color: "#333",
          weight: 1,
          opacity: 0.6,
          fillOpacity: 0.65,
        };
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties as SVIProperties;
        layer.on("click", () => setSelectedTract(props));
        layer.on("mouseover", (e) => {
          const l = e.target;
          l.setStyle({ weight: 2, color: "#000", fillOpacity: 0.85 });
          l.bringToFront();
        });
        layer.on("mouseout", (e) => {
          geoJsonLayer.current?.resetStyle(e.target);
        });

        const val = props[themeKey];
        layer.bindTooltip(
          `<strong>${props.LOCATION}</strong><br>${activeTheme.label}: ${(val * 100).toFixed(0)}%`,
          { sticky: true, className: "svi-tooltip" }
        );
      },
    }).addTo(map);

    if (data.features.length > 0) {
      map.fitBounds(geoJsonLayer.current.getBounds(), { padding: [30, 30] });
    }
  }, [data, activeTheme]);

  // Update facility markers
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    if (facilityLayer.current) {
      map.removeLayer(facilityLayer.current);
    }

    if (!showFacilities) return;

    facilityLayer.current = L.layerGroup();

    for (const f of facilities) {
      const color = FACILITY_COLORS[f.type] || "#666";
      L.circleMarker([f.lat, f.lon], {
        radius: 7,
        fillColor: color,
        color: "#fff",
        weight: 2,
        fillOpacity: 0.9,
      })
        .bindPopup(
          `<div style="font-family:Barlow,sans-serif;font-size:12px;line-height:1.4">
            <strong>${f.name}</strong><br>
            <span style="color:${color};font-weight:600">${f.type}</span><br>
            <span style="color:#666">${f.address || ""}</span>
          </div>`,
          { closeButton: false, maxWidth: 250 }
        )
        .addTo(facilityLayer.current!);
    }

    facilityLayer.current.addTo(map);
  }, [showFacilities, facilities]);

  const [loadStatus, setLoadStatus] = useState<string | null>(null);

  // Parse CSV text into array of objects
  const parseCSV = useCallback((text: string): Record<string, string>[] => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    return lines.slice(1).map((line) => {
      const values: string[] = [];
      let current = "";
      let inQuotes = false;
      for (const ch of line) {
        if (ch === '"') { inQuotes = !inQuotes; continue; }
        if (ch === "," && !inQuotes) { values.push(current.trim()); current = ""; continue; }
        current += ch;
      }
      values.push(current.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = values[i] || ""; });
      return row;
    });
  }, []);

  // Normalize a FIPS string: strip trailing decimals (.0, .00), strip
  // GEO_ID prefixes (1400000US...), zero-pad to 11 digits. This handles
  // CDC SVI float storage, Census ACS prefix, and Excel leading-zero loss.
  const normalizeFips = useCallback((raw: string): string => {
    let s = raw.trim()
      .replace(/\.0+$/, "")           // "39049000100.00" → "39049000100"
      .replace(/^1400000US/, "")       // Census ACS prefix
      .replace(/^.*US/, "");           // Other Census prefixes
    // Zero-pad to 11 digits if it looks like a short FIPS
    if (/^\d+$/.test(s) && s.length < 11 && s.length >= 5) {
      s = s.padStart(11, "0");
    }
    return s;
  }, []);

  // Fetch Census tract boundaries from TIGERweb and join with SVI CSV data
  const loadCSVWithBoundaries = useCallback(async (rows: Record<string, string>[]) => {
    // Find the state FIPS from the data
    const fipsCol = Object.keys(rows[0]).find((k) => k.toUpperCase() === "FIPS") || "";
    const stCol = Object.keys(rows[0]).find((k) => k.toUpperCase() === "ST") || "";

    // Determine state from ST column or first 2 digits of normalized FIPS
    const firstFips = normalizeFips(rows[0][fipsCol] || "");
    const rawSt = rows[0][stCol] || "";
    const stateFips = rawSt.padStart(2, "0").slice(0, 2) || firstFips.slice(0, 2);
    if (!stateFips || !/^\d{2}$/.test(stateFips)) {
      setLoadStatus("Could not determine state FIPS code from CSV. Expected an ST or FIPS column.");
      return;
    }

    const stateName = rows[0][Object.keys(rows[0]).find((k) => k.toUpperCase() === "STATE") || ""] || `State ${stateFips}`;
    setLoadStatus(`Loading tract boundaries for ${stateName}...`);

    // Build a lookup from normalized FIPS → SVI row
    const sviByFips: Record<string, Record<string, string>> = {};
    for (const row of rows) {
      const fips = normalizeFips(row[fipsCol]);
      if (fips && fips.length === 11) sviByFips[fips] = row;
    }

    // Fetch boundaries from Census TIGERweb (paginated, 2000 per request)
    const baseUrl = "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2020/MapServer/8/query";
    const allFeatures: GeoJSON.Feature[] = [];
    let offset = 0;
    const pageSize = 2000;

    try {
      while (true) {
        const params = new URLSearchParams({
          where: `STATE='${stateFips}'`,
          outFields: "GEOID,STATE,COUNTY,BASENAME",
          f: "geojson",
          returnGeometry: "true",
          resultOffset: String(offset),
          resultRecordCount: String(pageSize),
        });

        const resp = await fetch(`${baseUrl}?${params}`);
        if (!resp.ok) throw new Error(`Census API returned ${resp.status}`);

        const geojson = await resp.json();
        if (!geojson.features || geojson.features.length === 0) break;

        allFeatures.push(...geojson.features);
        setLoadStatus(`Loading tract boundaries for ${stateName}... ${allFeatures.length} tracts`);

        if (geojson.features.length < pageSize) break;
        offset += pageSize;
      }
    } catch (err) {
      setLoadStatus(`Failed to fetch tract boundaries from Census Bureau. ${err instanceof Error ? err.message : ""} Try uploading a GeoJSON file instead.`);
      return;
    }

    if (allFeatures.length === 0) {
      setLoadStatus("No tract boundaries found for this state.");
      return;
    }

    // Join: attach SVI data from CSV to each tract boundary
    const getNum = (row: Record<string, string>, key: string) => {
      const k = Object.keys(row).find((h) => h.toUpperCase() === key.toUpperCase()) || key;
      const v = parseFloat(row[k]);
      return isNaN(v) ? -999 : v;
    };

    let matched = 0;
    const joinedFeatures = allFeatures
      .map((feature) => {
        const rawGeoid = feature.properties?.GEOID || "";
        // TIGERweb Census 2020 layer 8 returns block-group GEOIDs (12 digits).
        // Truncate to 11 digits (tract level) for the join. Block groups within
        // the same tract will share the parent tract's data values.
        const geoid = rawGeoid.length === 12 ? rawGeoid.slice(0, 11) : rawGeoid;
        const svi = sviByFips[geoid];
        if (!svi) return null;
        matched++;
        const countyCol = Object.keys(svi).find((k) => k.toUpperCase() === "COUNTY") || "COUNTY";
        const locCol = Object.keys(svi).find((k) => k.toUpperCase() === "LOCATION") || "LOCATION";
        const props: SVIProperties = {
          FIPS: geoid,
          STATE: stateName,
          COUNTY: svi[countyCol] || feature.properties?.COUNTY || "",
          LOCATION: svi[locCol] || `Tract ${feature.properties?.BASENAME || geoid}`,
          E_TOTPOP: getNum(svi, "E_TOTPOP"),
          RPL_THEMES: getNum(svi, "RPL_THEMES"),
          RPL_THEME1: getNum(svi, "RPL_THEME1"),
          RPL_THEME2: getNum(svi, "RPL_THEME2"),
          RPL_THEME3: getNum(svi, "RPL_THEME3"),
          RPL_THEME4: getNum(svi, "RPL_THEME4"),
          F_TOTAL: getNum(svi, "F_TOTAL"),
        };
        return { ...feature, properties: props };
      })
      .filter(Boolean) as SVIFeatureCollection["features"];

    if (matched === 0) {
      const sampleCsvFips = Object.keys(sviByFips).slice(0, 3).join(", ") || "(none)";
      const sampleGeoId = allFeatures.slice(0, 3).map((f) => f.properties?.GEOID).join(", ") || "(none)";
      setLoadStatus(
        `Loaded ${allFeatures.length} tract boundaries but matched 0 rows. ` +
        `CSV FIPS samples: [${sampleCsvFips}]. TIGERweb GEOID samples: [${sampleGeoId}]. ` +
        `Both should be 11-digit strings (e.g., 39049000100). If your CSV stores FIPS as a number, Excel may have stripped leading zeros.`
      );
      return;
    }

    setData({ type: "FeatureCollection", features: joinedFeatures });
    setSelectedTract(null);
    setLoadStatus(`Loaded ${matched} tracts (${allFeatures.length} boundaries, ${rows.length} CSV rows)`);
  }, []);

  // ─── Load from screening log ──────────────────────────────────────────────
  const loadFromScreeningLog = useCallback(() => {
    const log = getScreeningLog();
    const tractEntries = log.filter((e) => e.censusTract);
    if (tractEntries.length === 0) {
      setLoadStatus("No tract-tagged screening entries found. Run a screening with location tagging enabled first.");
      return;
    }

    // Group by tract
    const byTract = new Map<string, typeof tractEntries>();
    for (const entry of tractEntries) {
      const fips = entry.censusTract!;
      const arr = byTract.get(fips) || [];
      arr.push(entry);
      byTract.set(fips, arr);
    }

    // Build synthetic CSV-like rows
    const rows: Record<string, string>[] = [];
    for (const [fips, entries] of byTract) {
      const high = entries.filter((e) => e.overallRisk === "High").length;
      const mod = entries.filter((e) => ["Moderate", "Medium"].includes(e.overallRisk)).length;
      const riskRatio = entries.length > 0 ? high / entries.length : 0;
      rows.push({
        FIPS: fips,
        ST: fips.slice(0, 2),
        STATE: entries[0].state || "",
        COUNTY: entries[0].county || "",
        LOCATION: `Tract ${fips.slice(5)} (${entries.length} screenings)`,
        E_TOTPOP: String(entries.length),
        RPL_THEMES: riskRatio.toFixed(4),
        RPL_THEME1: riskRatio.toFixed(4),
        RPL_THEME2: String(mod / entries.length),
        RPL_THEME3: "0",
        RPL_THEME4: "0",
        F_TOTAL: String(high + mod),
      });
    }

    setDataSource({ kind: "screening", entries: tractEntries.length, tracts: byTract.size });
    setAcsColumns([]);
    setAcsRawRows(null);
    setLoadStatus(`Loading ${byTract.size} tracts from ${tractEntries.length} screening entries...`);
    loadCSVWithBoundaries(rows);
  }, [loadCSVWithBoundaries]);

  // ─── ACS normalization helper ──────────────────────────────────────────────
  const loadAcsColumn = useCallback((rows: Record<string, string>[], column: string, filename: string) => {
    // Find FIPS from GEO_ID / GEOID column, strip prefix
    const geoCol = Object.keys(rows[0]).find((k) => k.replace(/_/g, "").toUpperCase() === "GEOID")
      || Object.keys(rows[0]).find((k) => k.toUpperCase() === "GEO_ID") || "";

    // Parse values, compute min/max for normalization.
    // Census ACS CSVs from data.census.gov often have a description row
    // as the first data row (e.g., "Estimate!!Total:!!Population...").
    // Skip rows where the GEO_ID value doesn't look like a FIPS after normalization.
    const parsed: { fips: string; st: string; value: number; row: Record<string, string> }[] = [];
    let min = Infinity, max = -Infinity;
    for (const row of rows) {
      const rawGeo = row[geoCol] || "";
      const fips = normalizeFips(rawGeo);
      if (!fips || !/^\d{11}$/.test(fips)) continue; // skip description rows and garbage
      const v = parseFloat(row[column]);
      if (isNaN(v)) continue;
      if (v < min) min = v;
      if (v > max) max = v;
      parsed.push({ fips, st: fips.slice(0, 2), value: v, row });
    }

    if (parsed.length === 0) {
      setLoadStatus(`No valid numeric values found in column "${column}".`);
      return;
    }

    const range = max - min || 1;

    // Find population column by common names
    const popColNames = ["total_population", "E_TOTPOP", "B01003_001E", "B01001_001E", "population", "pop", "TOTPOP"];
    const findCol = (row: Record<string, string>, candidates: string[]) => {
      for (const c of candidates) {
        const match = Object.keys(row).find((k) => k.toLowerCase() === c.toLowerCase());
        if (match && row[match]) return row[match];
      }
      return "0";
    };

    // Find name/label column
    const nameColNames = ["NAME", "name", "Name", "NAMELSAD", "tract_name", "label"];

    const syntheticRows: Record<string, string>[] = parsed.map((p) => {
      const popVal = findCol(p.row, popColNames);
      const nameVal = findCol(p.row, nameColNames) || `Tract ${p.fips.slice(5)}`;
      return {
        FIPS: p.fips,
        ST: p.st,
        STATE: "",
        COUNTY: "",
        LOCATION: nameVal,
        E_TOTPOP: popVal,
        RPL_THEMES: ((p.value - min) / range).toFixed(6),
        RPL_THEME1: ((p.value - min) / range).toFixed(6),
        RPL_THEME2: "0", RPL_THEME3: "0", RPL_THEME4: "0",
        F_TOTAL: "0",
      };
    });

    setDataSource({ kind: "acs", filename, column });
    setLoadStatus(`Loading ${syntheticRows.length} tracts for "${column}"...`);
    loadCSVWithBoundaries(syntheticRows);
  }, [loadCSVWithBoundaries]);

  // Handle file upload (CSV or GeoJSON)
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoadStatus("Reading file...");

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;

      // Try GeoJSON first
      if (file.name.endsWith(".json") || file.name.endsWith(".geojson")) {
        try {
          const json = JSON.parse(text);
          if (json.type === "FeatureCollection" && json.features?.length > 0) {
            setData(json as SVIFeatureCollection);
            setSelectedTract(null);
            setLoadStatus(`Loaded ${json.features.length} features from GeoJSON`);
            return;
          }
        } catch { /* not valid JSON, try CSV */ }
      }

      // Parse as CSV
      const rows = parseCSV(text);
      if (rows.length === 0) {
        setLoadStatus("Could not parse file. Expected a CSV with SVI columns or a GeoJSON FeatureCollection.");
        return;
      }

      // Check for expected SVI columns
      const headers = Object.keys(rows[0]).map((h) => h.toUpperCase());
      if (headers.includes("FIPS") || headers.includes("ST")) {
        // CDC SVI format
        setDataSource({ kind: "svi", filename: file.name });
        setAcsColumns([]);
        setAcsRawRows(null);
        loadCSVWithBoundaries(rows);
        return;
      }

      // Census ACS format: look for GEO_ID / GEOID column
      const geoCol = Object.keys(rows[0]).find((k) => k.replace(/_/g, "").toUpperCase() === "GEOID")
        || Object.keys(rows[0]).find((k) => k.toUpperCase() === "GEO_ID");
      if (geoCol) {
        // Skip the Census description row (first data row where GEO_ID doesn't look like a FIPS)
        const dataRows = rows.filter((r) => /^\d{11}$/.test(normalizeFips(r[geoCol] || "")));
        if (dataRows.length === 0) {
          setLoadStatus("Census CSV detected but no valid tract-level GEO_ID values found after stripping prefixes.");
          return;
        }

        // Identify numeric columns (exclude ID / name columns)
        const skipPatterns = /^(geo_?id|geoid|name|state|county|fips|st|sumlev|geocomp|region|division)$/i;
        const numericCols = Object.keys(dataRows[0]).filter((col) => {
          if (skipPatterns.test(col)) return false;
          // Check first few non-empty rows for numeric values
          const sample = dataRows.slice(0, 10).map((r) => r[col]).filter(Boolean);
          return sample.length > 0 && sample.every((v) => !isNaN(parseFloat(v)));
        });

        if (numericCols.length === 0) {
          setLoadStatus("Census CSV detected (found GEO_ID column) but no numeric data columns found.");
          return;
        }

        // Store filtered data rows (description row stripped) for the column picker
        setAcsColumns(numericCols);
        setAcsRawRows(dataRows);
        setAcsFilename(file.name);
        setAcsSelectedColumn(numericCols[0]);
        // Auto-load first column
        loadAcsColumn(dataRows, numericCols[0], file.name);
        return;
      }

      setLoadStatus("CSV format not recognized. Expected CDC SVI columns (FIPS, ST, RPL_THEMES) or Census ACS columns (GEO_ID + data).");
    };
    reader.readAsText(file);
  }, [parseCSV, loadCSVWithBoundaries, loadAcsColumn]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="space-y-3">
        {/* Theme selector — only meaningful for CDC SVI data */}
        {dataSource.kind === "svi" || dataSource.kind === "sample" ? (
          <ThemeSelector active={activeTheme} onChange={setActiveTheme} />
        ) : null}

        {/* Source badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-body text-[0.625rem] font-medium text-cs-text/50 uppercase tracking-wider">Source:</span>
          <span className="font-body text-xs text-cs-text bg-cs-badge px-2 py-0.5 rounded">
            {dataSourceLabel(dataSource)}
          </span>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showFacilities}
              onChange={(e) => setShowFacilities(e.target.checked)}
              className="accent-cs-blue rounded"
            />
            <span className="font-body text-xs text-cs-text">Show health facilities</span>
            {showFacilities && (
              <span className="flex items-center gap-2 ml-2">
                {Object.entries(FACILITY_COLORS).map(([type, color]) => (
                  <span key={type} className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="font-body text-[10px] text-cs-text/40">{type}</span>
                  </span>
                ))}
              </span>
            )}
          </label>

          <div className="flex items-center gap-3">
            <button
              onClick={loadFromScreeningLog}
              className="font-body text-xs text-cs-blue hover:text-cs-blue-dark font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={getScreeningLog().filter((e) => e.censusTract).length === 0}
              title="Load tract-tagged screening results from the screening log"
            >
              Load from Screening Log
            </button>
            <label className="font-body text-xs text-cs-blue hover:text-cs-blue-dark cursor-pointer font-medium">
              Load CSV / GeoJSON...
              <input type="file" accept=".csv,.json,.geojson" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>

        {/* Census ACS column picker */}
        {acsColumns.length > 0 && acsRawRows && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-body text-xs text-cs-text/60">Visualize column:</span>
            <select
              value={acsSelectedColumn}
              onChange={(e) => {
                setAcsSelectedColumn(e.target.value);
                loadAcsColumn(acsRawRows, e.target.value, acsFilename);
              }}
              className="font-mono text-xs px-2 py-1 rounded border border-cs-border bg-white text-cs-text focus:outline-none focus:border-cs-blue"
            >
              {acsColumns.map((col) => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
            <span className="font-body text-[10px] text-cs-text/40">
              ({acsColumns.length} numeric columns available)
            </span>
          </div>
        )}

        {loadStatus && (
          <div className={`rounded-md px-3 py-2 font-body text-xs ${
            loadStatus.startsWith("Failed") || loadStatus.startsWith("Could not") || loadStatus.startsWith("CSV does not")
              ? "bg-red-50 text-red-700 border border-red-200"
              : loadStatus.startsWith("Loading") || loadStatus.startsWith("Reading")
              ? "bg-cs-badge text-cs-blue-dark border border-cs-blue/20"
              : "bg-green-50 text-green-700 border border-green-200"
          }`}>
            {loadStatus}
          </div>
        )}
      </div>

      {/* Map */}
      <div
        ref={mapRef}
        className="w-full rounded-lg border border-cs-border overflow-hidden"
        style={{ height: 480 }}
      />

      {/* Legend + Tract Detail */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Legend theme={activeTheme} />
        {selectedTract ? (
          <TractDetail properties={selectedTract} onClose={() => setSelectedTract(null)} />
        ) : (
          <div className="border border-cs-border rounded-lg bg-white p-4 flex items-center justify-center">
            <p className="font-body text-xs text-cs-text/40">Click a census tract for detail</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <StatsSummary data={data} />

      {/* Population health analytics charts */}
      <PopulationHealthDashboard data={data} dataSource={dataSource} acsRawRows={acsRawRows} acsColumns={acsColumns} />

      {/* Data source notice */}
      <div className="rounded-lg bg-cs-bg p-4 space-y-3">
        <p className="font-body text-xs text-cs-text/50">
          <strong className="text-cs-text/70">Data:</strong> {dataSourceLabel(dataSource)}.
        </p>
        <div className="font-body text-xs text-cs-text/50 space-y-2">
          <p className="font-medium text-cs-text/60">Load data from any of these sources:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>
              <strong>Screening log</strong> — click "Load from Screening Log" above to visualize tract-tagged PRAPARE / AHC-HRSN screenings on the map.
            </li>
            <li>
              <strong>CDC SVI</strong> — go to the{" "}
              <a href="https://www.atsdr.cdc.gov/place-health/php/svi/svi-interactive-map.html" target="_blank" rel="noopener noreferrer" className="text-cs-blue hover:underline">
                CDC SVI Interactive Map
              </a>
              , filter by state/county, download as CSV, then click "Load CSV / GeoJSON" above.
            </li>
            <li>
              <strong>Census ACS</strong> — go to{" "}
              <a href="https://data.census.gov" target="_blank" rel="noopener noreferrer" className="text-cs-blue hover:underline">
                data.census.gov
              </a>
              , search by topic (poverty, insurance, education), filter to tract-level geography, download CSV. Upload here and pick which column to visualize.
            </li>
          </ol>
        </div>
        <p className="font-body text-xs text-cs-text/50">
          Accepted formats: CDC SVI CSV (<code className="font-mono text-[10px] bg-cs-border/30 px-1 rounded">FIPS</code> + <code className="font-mono text-[10px] bg-cs-border/30 px-1 rounded">RPL_THEMES</code>),
          Census ACS CSV (<code className="font-mono text-[10px] bg-cs-border/30 px-1 rounded">GEO_ID</code> + numeric columns),
          GeoJSON with SVI properties, or directly from your screening log.
        </p>
        <p className="font-body text-xs text-cs-text/50">
          <strong className="text-cs-text/70">Privacy:</strong> Your CSV is parsed in the browser. Tract boundaries are
          fetched from the{" "}
          <a href="https://tigerweb.geo.census.gov" target="_blank" rel="noopener noreferrer" className="text-cs-blue hover:underline">
            Census TIGERweb API
          </a>
          {" "}(public, no account needed). No SVI data leaves your browser.
        </p>
      </div>
    </div>
  );
}
