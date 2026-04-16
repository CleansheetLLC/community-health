// Hook for querying the 211 National Data Platform Search API v2.
// Endpoint: GET https://api.211.org/resources/v2/search/keyword
// Auth: Ocp-Apim-Subscription-Key header (Azure APIM)
// Dev: proxied through Vite (/api-211 → https://api.211.org)

import { useState, useCallback } from "react";
import type { ServiceListing, SearchApiResponse } from "./resource-referrals";

const STORAGE_KEY = "cleansheet-211-key";
const ENV_KEY = (import.meta as any).env?.VITE_211_API_KEY ?? "";

export function get211ApiKey(): string {
  return ENV_KEY || localStorage.getItem(STORAGE_KEY) || "";
}

export function set211ApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEY, key);
}

export function is211Configured(): boolean {
  return Boolean(get211ApiKey());
}

function getBaseUrl(): string {
  // In dev, Vite proxy rewrites /api-211 → https://api.211.org
  if (import.meta.env.DEV) return "/api-211";
  // In prod, use the direct URL (requires CORS or a worker proxy)
  return "https://api.211.org";
}

function parseResults(data: SearchApiResponse): ServiceListing[] {
  if (!data.results) return [];
  return data.results.map((r) => ({
    nameOrganization: r.nameOrganization || "",
    nameService: r.nameService || "",
    descriptionService: r.descriptionService || "",
    address: {
      streetAddress: r.address?.streetAddress || "",
      city: r.address?.city || "",
      stateProvince: r.address?.stateProvince || "",
      postalCode: r.address?.postalCode || "",
      latitude: r.address?.latitude,
      longitude: r.address?.longitude,
    },
    taxonomyTerms: (r.taxonomy || []).map((t) => t.taxonomyTerm || "").filter(Boolean),
    dataOwner: r.dataOwnerDisplayName || "",
  }));
}

export interface Use211SearchResult {
  results: ServiceListing[];
  loading: boolean;
  error: string | null;
  totalCount: number | null;
  search: (keywords: string, location: string) => Promise<void>;
  clear: () => void;
}

export function use211Search(): Use211SearchResult {
  const [results, setResults] = useState<ServiceListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const search = useCallback(async (keywords: string, location: string) => {
    const apiKey = get211ApiKey();
    if (!apiKey) {
      setError("211 API key not configured. Enter your key in the settings.");
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);
    setTotalCount(null);

    try {
      const base = getBaseUrl();
      const url = `${base}/resources/v2/search/keyword?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Ocp-Apim-Subscription-Key": apiKey,
          "locationMode": "Near",
          "distance": "25",
          "size": "5",
          "orderByDistance": "true",
          "searchMode": "Any",
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        if (res.status === 401 || res.status === 403) {
          throw new Error("Invalid or expired 211 API key. Check your subscription in the 211 portal.");
        }
        throw new Error(`211 API error (${res.status}): ${body.slice(0, 200)}`);
      }

      const data: SearchApiResponse = await res.json();
      const parsed = parseResults(data);
      setResults(parsed);
      setTotalCount(data.count);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("211 API request timed out. Try again or call 2-1-1 directly.");
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
    setTotalCount(null);
  }, []);

  return { results, loading, error, totalCount, search, clear };
}
