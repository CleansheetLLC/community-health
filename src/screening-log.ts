// ─── Screening Log ───────────────────────────────────────────────────────────
// Stores de-identified screening results in localStorage.
// No PII -- only date, instrument, domain scores, risk level, and Z codes.

export interface ReferralLogEntry {
  zCode: string;
  categoryId: string;
  categoryLabel: string;
  action: "viewed" | "clicked_211" | "clicked_hotline" | "clicked_online" | "declined";
  timestamp: string;
}

export interface ScreeningLogEntry {
  id: string;
  date: string;             // ISO date string
  instrument: "PRAPARE" | "AHC-HRSN";
  overallRisk: string;      // "Low" | "Moderate" | "High" | "Medium"
  domainsWithFlags: number;
  totalFlags: number;
  domains: {
    domain: string;
    flagCount: number;
    flags: string[];
  }[];
  suggestedZCodes: string[];
  // Optional geographic tagging (opt-in per screening)
  // Census tract FIPS (11 digits) only - never lat/lon.
  // HIPAA Safe Harbor de-identifiable (tracts ~4,000 people).
  censusTract?: string;
  county?: string;
  state?: string;
  // Referral actions captured as the worker interacts with resource links.
  // Logged automatically when the worker clicks 211/hotline/online links.
  referrals?: ReferralLogEntry[];
}

// ─── Census Tract Geocoding ──────────────────────────────────────────────────

export interface TractInfo {
  fips: string;    // 11-digit tract FIPS (e.g., "39049000100")
  county: string;  // County name
  state: string;   // State name
}

// State FIPS → name (fallback when geocoder doesn't return state name)
const STATE_FIPS_TO_NAME: Record<string, string> = {
  "01": "Alabama", "02": "Alaska", "04": "Arizona", "05": "Arkansas", "06": "California",
  "08": "Colorado", "09": "Connecticut", "10": "Delaware", "11": "District of Columbia",
  "12": "Florida", "13": "Georgia", "15": "Hawaii", "16": "Idaho", "17": "Illinois",
  "18": "Indiana", "19": "Iowa", "20": "Kansas", "21": "Kentucky", "22": "Louisiana",
  "23": "Maine", "24": "Maryland", "25": "Massachusetts", "26": "Michigan", "27": "Minnesota",
  "28": "Mississippi", "29": "Missouri", "30": "Montana", "31": "Nebraska", "32": "Nevada",
  "33": "New Hampshire", "34": "New Jersey", "35": "New Mexico", "36": "New York",
  "37": "North Carolina", "38": "North Dakota", "39": "Ohio", "40": "Oklahoma", "41": "Oregon",
  "42": "Pennsylvania", "44": "Rhode Island", "45": "South Carolina", "46": "South Dakota",
  "47": "Tennessee", "48": "Texas", "49": "Utah", "50": "Vermont", "51": "Virginia",
  "53": "Washington", "54": "West Virginia", "55": "Wisconsin", "56": "Wyoming",
  "72": "Puerto Rico",
};

// ─── Cache ───────────────────────────────────────────────────────────────────
// Cache successful tract lookups keyed by coordinates rounded to ~300m.
// A clinic doing many screenings at the same location only hits the API once.

const TRACT_CACHE_KEY = "cleansheet-tract-cache";
const CACHE_PRECISION = 1000; // ~110m per 0.001 degree latitude

interface TractCacheEntry {
  lat: number;
  lon: number;
  tract: TractInfo;
  cachedAt: number;
}

function cacheKey(lat: number, lon: number): string {
  const roundedLat = Math.round(lat * CACHE_PRECISION) / CACHE_PRECISION;
  const roundedLon = Math.round(lon * CACHE_PRECISION) / CACHE_PRECISION;
  return `${roundedLat},${roundedLon}`;
}

function getCachedTract(lat: number, lon: number): TractInfo | null {
  try {
    const raw = localStorage.getItem(TRACT_CACHE_KEY);
    if (!raw) return null;
    const cache: Record<string, TractCacheEntry> = JSON.parse(raw);
    const entry = cache[cacheKey(lat, lon)];
    // Entries expire after 30 days
    if (entry && Date.now() - entry.cachedAt < 30 * 24 * 60 * 60 * 1000) {
      return entry.tract;
    }
  } catch { /* ignore */ }
  return null;
}

function setCachedTract(lat: number, lon: number, tract: TractInfo): void {
  try {
    const raw = localStorage.getItem(TRACT_CACHE_KEY);
    const cache: Record<string, TractCacheEntry> = raw ? JSON.parse(raw) : {};
    cache[cacheKey(lat, lon)] = { lat, lon, tract, cachedAt: Date.now() };
    localStorage.setItem(TRACT_CACHE_KEY, JSON.stringify(cache));
  } catch { /* ignore (storage full) */ }
}

// ─── Primary: FCC Block API ──────────────────────────────────────────────────
// Free, US government, generally more reliable than Census Bureau geocoder.
// https://geo.fcc.gov/api/census/block/find
// Block FIPS is 15 digits: state(2) + county(3) + tract(6) + block(4).
// Tract FIPS = first 11 digits.
export async function geocodeToTractFCC(lat: number, lon: number): Promise<TractInfo | null> {
  const url = new URL("https://geo.fcc.gov/api/census/block/find");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("censusYear", "2020");
  url.searchParams.set("format", "json");

  const resp = await fetch(url.toString());
  if (!resp.ok) throw new Error(`FCC geocoder returned ${resp.status}`);
  const data = await resp.json();

  if (data?.status !== "OK") {
    throw new Error(`FCC geocoder status: ${data?.status || "unknown"}`);
  }

  const blockFips = data?.Block?.FIPS;
  if (!blockFips || blockFips.length < 11) return null;

  const tractFips = blockFips.slice(0, 11);
  const stateFips = tractFips.slice(0, 2);

  return {
    fips: tractFips,
    county: data?.County?.name || "",
    state: data?.State?.name || STATE_FIPS_TO_NAME[stateFips] || "",
  };
}

// Combined geocoder: FCC primary, Census Bureau fallback, localStorage cache.
export async function geocodeToTract(lat: number, lon: number): Promise<TractInfo | null> {
  // 1. Check cache first
  const cached = getCachedTract(lat, lon);
  if (cached) return cached;

  const errors: string[] = [];

  // 2. Try FCC (primary)
  try {
    const result = await geocodeToTractFCC(lat, lon);
    if (result) {
      setCachedTract(lat, lon, result);
      return result;
    }
  } catch (err) {
    errors.push(`FCC: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 3. Fall back to Census Bureau
  try {
    const result = await geocodeToTractCensus(lat, lon);
    if (result) {
      setCachedTract(lat, lon, result);
      return result;
    }
  } catch (err) {
    errors.push(`Census: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (errors.length > 0) {
    throw new Error(`All geocoders failed. ${errors.join(" | ")}`);
  }
  return null;
}

// Uses Census Bureau's free public geocoder (fallback only).
// https://geocoding.geo.census.gov
// The public endpoint occasionally returns 503 under load -- retry with backoff.
export async function geocodeToTractCensus(lat: number, lon: number): Promise<TractInfo | null> {
  const url = new URL("https://geocoding.geo.census.gov/geocoder/geographies/coordinates");
  url.searchParams.set("x", String(lon));
  url.searchParams.set("y", String(lat));
  url.searchParams.set("benchmark", "Public_AR_Current");
  url.searchParams.set("vintage", "Current_Current");
  url.searchParams.set("layers", "all");
  url.searchParams.set("format", "json");

  const MAX_ATTEMPTS = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const resp = await fetch(url.toString());
      if (resp.ok) {
        const data = await resp.json();
        return parseGeocodeResponse(data);
      }
      // 503 and 429 are retryable; others fail fast
      if (resp.status !== 503 && resp.status !== 429) {
        throw new Error(`Census geocoder returned ${resp.status}`);
      }
      lastError = new Error(`Census geocoder returned ${resp.status}`);
    } catch (err) {
      // Network errors are retryable
      lastError = err instanceof Error ? err : new Error(String(err));
    }

    if (attempt < MAX_ATTEMPTS) {
      // Exponential backoff: 500ms, 1500ms
      await new Promise((r) => setTimeout(r, 500 * Math.pow(3, attempt - 1)));
    }
  }

  throw new Error(`Census geocoder unavailable after ${MAX_ATTEMPTS} attempts. ${lastError?.message || ""} Try again in a moment.`);
}

function parseGeocodeResponse(data: any): TractInfo | null {

  const geographies = data?.result?.geographies;
  if (!geographies) return null;

  // Layer key names vary by benchmark/vintage. Search defensively.
  const findLayer = (pattern: RegExp): any => {
    for (const key of Object.keys(geographies)) {
      if (pattern.test(key)) {
        const arr = geographies[key];
        if (Array.isArray(arr) && arr.length > 0) return arr[0];
      }
    }
    return null;
  };

  const tract = findLayer(/census\s*tracts?/i);
  if (!tract?.GEOID) return null;

  const county = findLayer(/counties|county/i);
  const state = findLayer(/^states?$/i);

  // Fallback: derive state name from first 2 digits of GEOID (state FIPS)
  const stateFips = tract.GEOID.slice(0, 2);
  const stateName = state?.NAME || state?.BASENAME || STATE_FIPS_TO_NAME[stateFips] || "";

  return {
    fips: tract.GEOID,
    county: county?.NAME || county?.BASENAME || "",
    state: stateName,
  };
}

// Get device location, convert to tract, discard lat/lon.
// Returns null if user denies or geocoding fails.
export async function getCurrentTract(): Promise<TractInfo | null> {
  if (!navigator.geolocation) throw new Error("Geolocation not supported in this browser");

  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false, // tract-level doesn't need high accuracy
      timeout: 10000,
      maximumAge: 60000,
    });
  });

  const { latitude, longitude } = position.coords;
  // Immediately convert to tract - lat/lon is not retained
  return geocodeToTract(latitude, longitude);
}

// Detailed diagnostic result for the "Test location" button.
// Returns success/failure info for each geocoder attempted.
export interface TractTestResult {
  ok: boolean;
  tract?: TractInfo;
  cached?: boolean;
  fccResult?: "success" | "failed" | "skipped";
  fccError?: string;
  censusResult?: "success" | "failed" | "skipped";
  censusError?: string;
  geolocationError?: string;
}

export async function testGeocoding(): Promise<TractTestResult> {
  const result: TractTestResult = { ok: false };

  if (!navigator.geolocation) {
    result.geolocationError = "Geolocation not supported in this browser";
    return result;
  }

  let position: GeolocationPosition;
  try {
    position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000,
      });
    });
  } catch (err: any) {
    result.geolocationError = err?.message || "Permission denied or timeout";
    return result;
  }

  const { latitude, longitude } = position.coords;

  // Check cache
  const cached = getCachedTract(latitude, longitude);
  if (cached) {
    result.ok = true;
    result.tract = cached;
    result.cached = true;
    result.fccResult = "skipped";
    result.censusResult = "skipped";
    return result;
  }

  // Try FCC
  try {
    const fcc = await geocodeToTractFCC(latitude, longitude);
    if (fcc) {
      result.ok = true;
      result.tract = fcc;
      result.fccResult = "success";
      result.censusResult = "skipped";
      setCachedTract(latitude, longitude, fcc);
      return result;
    }
    result.fccResult = "failed";
    result.fccError = "no tract returned";
  } catch (err) {
    result.fccResult = "failed";
    result.fccError = err instanceof Error ? err.message : String(err);
  }

  // Try Census fallback
  try {
    const census = await geocodeToTractCensus(latitude, longitude);
    if (census) {
      result.ok = true;
      result.tract = census;
      result.censusResult = "success";
      setCachedTract(latitude, longitude, census);
      return result;
    }
    result.censusResult = "failed";
    result.censusError = "no tract returned";
  } catch (err) {
    result.censusResult = "failed";
    result.censusError = err instanceof Error ? err.message : String(err);
  }

  return result;
}

export function clearTractCache(): void {
  localStorage.removeItem(TRACT_CACHE_KEY);
}

const STORAGE_KEY = "cleansheet-screening-log";

export function getScreeningLog(): ScreeningLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveScreeningEntry(entry: ScreeningLogEntry): void {
  const log = getScreeningLog();
  log.push(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
}

export function clearScreeningLog(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function exportScreeningLogCSV(): string {
  const log = getScreeningLog();
  if (log.length === 0) return "";

  // Collect all unique domain names across all entries
  const allDomains = new Set<string>();
  for (const entry of log) {
    for (const d of entry.domains) {
      allDomains.add(d.domain);
    }
  }
  const domainNames = Array.from(allDomains).sort();

  // Build CSV header
  const headers = [
    "Date",
    "Instrument",
    "Overall Risk",
    "Domains with Flags",
    "Total Flags",
    "Census Tract",
    "County",
    "State",
    ...domainNames.map((d) => `${d} (flags)`),
    ...domainNames.map((d) => `${d} (details)`),
    "Suggested Z Codes",
    "Referral Actions",
    "Referral Categories",
  ];

  // Build rows
  const rows = log.map((entry) => {
    const domainMap = new Map(entry.domains.map((d) => [d.domain, d]));
    const refActions = entry.referrals ?? [];
    const refClicked = refActions.filter((r) => r.action.startsWith("clicked_"));
    return [
      entry.date.slice(0, 10), // date only
      entry.instrument,
      entry.overallRisk,
      String(entry.domainsWithFlags),
      String(entry.totalFlags),
      entry.censusTract ?? "",
      entry.county ?? "",
      entry.state ?? "",
      ...domainNames.map((d) => String(domainMap.get(d)?.flagCount ?? 0)),
      ...domainNames.map((d) => {
        const flags = domainMap.get(d)?.flags ?? [];
        return flags.join("; ");
      }),
      entry.suggestedZCodes.join("; "),
      String(refClicked.length),
      [...new Set(refClicked.map((r) => r.categoryLabel))].join("; "),
    ];
  });

  // Escape CSV values
  const escape = (v: string) => {
    if (v.includes(",") || v.includes('"') || v.includes("\n")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };

  return [
    headers.map(escape).join(","),
    ...rows.map((row) => row.map(escape).join(",")),
  ].join("\n");
}

export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
