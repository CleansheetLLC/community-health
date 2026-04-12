// ─── Screening Log ───────────────────────────────────────────────────────────
// Stores de-identified screening results in localStorage.
// No PII -- only date, instrument, domain scores, risk level, and Z codes.

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
    ...domainNames.map((d) => `${d} (flags)`),
    ...domainNames.map((d) => `${d} (details)`),
    "Suggested Z Codes",
  ];

  // Build rows
  const rows = log.map((entry) => {
    const domainMap = new Map(entry.domains.map((d) => [d.domain, d]));
    return [
      entry.date.slice(0, 10), // date only
      entry.instrument,
      entry.overallRisk,
      String(entry.domainsWithFlags),
      String(entry.totalFlags),
      ...domainNames.map((d) => String(domainMap.get(d)?.flagCount ?? 0)),
      ...domainNames.map((d) => {
        const flags = domainMap.get(d)?.flags ?? [];
        return flags.join("; ");
      }),
      entry.suggestedZCodes.join("; "),
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
