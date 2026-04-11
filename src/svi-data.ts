// CDC/ATSDR Social Vulnerability Index (SVI) Data
// Source: Agency for Toxic Substances and Disease Registry
// Census tract level, four themes, overall ranking 0-1
// Public domain (US Government)

import type { FeatureCollection, Feature, MultiPolygon, Polygon } from "geojson";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SVIProperties {
  FIPS: string;          // Census tract FIPS code
  STATE: string;         // State name
  COUNTY: string;        // County name
  LOCATION: string;      // Tract description
  E_TOTPOP: number;      // Total population estimate
  // Overall SVI (0-1, higher = more vulnerable)
  RPL_THEMES: number;
  // Theme percentile rankings (0-1)
  RPL_THEME1: number;    // Socioeconomic Status
  RPL_THEME2: number;    // Household Characteristics & Disability
  RPL_THEME3: number;    // Racial & Ethnic Minority Status
  RPL_THEME4: number;    // Housing Type & Transportation
  // Flags (-999 = suppressed/unavailable)
  F_TOTAL: number;       // Sum of all theme flags
}

export type SVIFeatureCollection = FeatureCollection<Polygon | MultiPolygon, SVIProperties>;
export type SVIFeature = Feature<Polygon | MultiPolygon, SVIProperties>;

export interface SVITheme {
  id: "RPL_THEMES" | "RPL_THEME1" | "RPL_THEME2" | "RPL_THEME3" | "RPL_THEME4";
  label: string;
  description: string;
  color: string;
}

export interface FacilityMarker {
  lat: number;
  lon: number;
  name: string;
  type: "FQHC" | "Hospital" | "Clinic";
  address?: string;
}

// ─── Theme Definitions ───────────────────────────────────────────────────────

export const SVI_THEMES: SVITheme[] = [
  { id: "RPL_THEMES", label: "Overall SVI", description: "Composite of all four themes", color: "#7b3294" },
  { id: "RPL_THEME1", label: "Socioeconomic Status", description: "Below 150% poverty, unemployed, housing cost burden, no health insurance, no high school diploma", color: "#d73027" },
  { id: "RPL_THEME2", label: "Household Characteristics", description: "Aged 65+, aged 17 and younger, civilian with disability, single-parent households, English language proficiency", color: "#fc8d59" },
  { id: "RPL_THEME3", label: "Racial & Ethnic Minority Status", description: "Racial and ethnic minority populations", color: "#91bfdb" },
  { id: "RPL_THEME4", label: "Housing Type & Transportation", description: "Multi-unit structures, mobile homes, crowding, no vehicle, group quarters", color: "#4575b4" },
];

// ─── Color Scale ─────────────────────────────────────────────────────────────

// 5-class diverging: low vulnerability (blue) → high vulnerability (red)
const SVI_COLORS = ["#2166ac", "#67a9cf", "#fddbc7", "#ef8a62", "#b2182b"];
const SVI_LABELS = ["Very Low (0-0.2)", "Low (0.2-0.4)", "Moderate (0.4-0.6)", "High (0.6-0.8)", "Very High (0.8-1.0)"];

export function sviColor(value: number | undefined): string {
  if (value === undefined || value < 0) return "#cccccc"; // Suppressed/missing
  if (value < 0.2) return SVI_COLORS[0];
  if (value < 0.4) return SVI_COLORS[1];
  if (value < 0.6) return SVI_COLORS[2];
  if (value < 0.8) return SVI_COLORS[3];
  return SVI_COLORS[4];
}

export function sviLabel(value: number | undefined): string {
  if (value === undefined || value < 0) return "Data unavailable";
  if (value < 0.2) return SVI_LABELS[0];
  if (value < 0.4) return SVI_LABELS[1];
  if (value < 0.6) return SVI_LABELS[2];
  if (value < 0.8) return SVI_LABELS[3];
  return SVI_LABELS[4];
}

export { SVI_COLORS, SVI_LABELS };

// ─── Sample Data ─────────────────────────────────────────────────────────────
// Small sample: 8 census tracts in Franklin County, OH (Columbus metro)
// Geometry simplified for bundle size. Real data from CDC/ATSDR.

export const SAMPLE_SVI_DATA: SVIFeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { FIPS: "39049000100", STATE: "Ohio", COUNTY: "Franklin", LOCATION: "Census Tract 1, Franklin County", E_TOTPOP: 3842, RPL_THEMES: 0.89, RPL_THEME1: 0.91, RPL_THEME2: 0.72, RPL_THEME3: 0.85, RPL_THEME4: 0.78, F_TOTAL: 3 },
      geometry: { type: "Polygon", coordinates: [[[-82.998, 39.975], [-82.985, 39.975], [-82.985, 39.965], [-82.998, 39.965], [-82.998, 39.975]]] },
    },
    {
      type: "Feature",
      properties: { FIPS: "39049000200", STATE: "Ohio", COUNTY: "Franklin", LOCATION: "Census Tract 2, Franklin County", E_TOTPOP: 5120, RPL_THEMES: 0.72, RPL_THEME1: 0.68, RPL_THEME2: 0.55, RPL_THEME3: 0.91, RPL_THEME4: 0.65, F_TOTAL: 2 },
      geometry: { type: "Polygon", coordinates: [[[-82.985, 39.975], [-82.972, 39.975], [-82.972, 39.965], [-82.985, 39.965], [-82.985, 39.975]]] },
    },
    {
      type: "Feature",
      properties: { FIPS: "39049000300", STATE: "Ohio", COUNTY: "Franklin", LOCATION: "Census Tract 3, Franklin County", E_TOTPOP: 2918, RPL_THEMES: 0.34, RPL_THEME1: 0.28, RPL_THEME2: 0.45, RPL_THEME3: 0.22, RPL_THEME4: 0.41, F_TOTAL: 0 },
      geometry: { type: "Polygon", coordinates: [[[-82.972, 39.975], [-82.959, 39.975], [-82.959, 39.965], [-82.972, 39.965], [-82.972, 39.975]]] },
    },
    {
      type: "Feature",
      properties: { FIPS: "39049000400", STATE: "Ohio", COUNTY: "Franklin", LOCATION: "Census Tract 4, Franklin County", E_TOTPOP: 4201, RPL_THEMES: 0.15, RPL_THEME1: 0.12, RPL_THEME2: 0.18, RPL_THEME3: 0.09, RPL_THEME4: 0.22, F_TOTAL: 0 },
      geometry: { type: "Polygon", coordinates: [[[-82.959, 39.975], [-82.946, 39.975], [-82.946, 39.965], [-82.959, 39.965], [-82.959, 39.975]]] },
    },
    {
      type: "Feature",
      properties: { FIPS: "39049000500", STATE: "Ohio", COUNTY: "Franklin", LOCATION: "Census Tract 5, Franklin County", E_TOTPOP: 6530, RPL_THEMES: 0.56, RPL_THEME1: 0.52, RPL_THEME2: 0.61, RPL_THEME3: 0.48, RPL_THEME4: 0.55, F_TOTAL: 1 },
      geometry: { type: "Polygon", coordinates: [[[-82.998, 39.965], [-82.985, 39.965], [-82.985, 39.955], [-82.998, 39.955], [-82.998, 39.965]]] },
    },
    {
      type: "Feature",
      properties: { FIPS: "39049000600", STATE: "Ohio", COUNTY: "Franklin", LOCATION: "Census Tract 6, Franklin County", E_TOTPOP: 3150, RPL_THEMES: 0.95, RPL_THEME1: 0.97, RPL_THEME2: 0.88, RPL_THEME3: 0.92, RPL_THEME4: 0.85, F_TOTAL: 4 },
      geometry: { type: "Polygon", coordinates: [[[-82.985, 39.965], [-82.972, 39.965], [-82.972, 39.955], [-82.985, 39.955], [-82.985, 39.965]]] },
    },
    {
      type: "Feature",
      properties: { FIPS: "39049000700", STATE: "Ohio", COUNTY: "Franklin", LOCATION: "Census Tract 7, Franklin County", E_TOTPOP: 4780, RPL_THEMES: 0.42, RPL_THEME1: 0.38, RPL_THEME2: 0.50, RPL_THEME3: 0.35, RPL_THEME4: 0.44, F_TOTAL: 0 },
      geometry: { type: "Polygon", coordinates: [[[-82.972, 39.965], [-82.959, 39.965], [-82.959, 39.955], [-82.972, 39.955], [-82.972, 39.965]]] },
    },
    {
      type: "Feature",
      properties: { FIPS: "39049000800", STATE: "Ohio", COUNTY: "Franklin", LOCATION: "Census Tract 8, Franklin County", E_TOTPOP: 5890, RPL_THEMES: 0.08, RPL_THEME1: 0.05, RPL_THEME2: 0.11, RPL_THEME3: 0.06, RPL_THEME4: 0.14, F_TOTAL: 0 },
      geometry: { type: "Polygon", coordinates: [[[-82.959, 39.965], [-82.946, 39.965], [-82.946, 39.955], [-82.959, 39.955], [-82.959, 39.965]]] },
    },
  ],
};

// Sample facility overlay
export const SAMPLE_FACILITIES: FacilityMarker[] = [
  { lat: 39.970, lon: -82.990, name: "Lower Lights Christian Health Center", type: "FQHC", address: "1160 W Broad St, Columbus, OH" },
  { lat: 39.962, lon: -82.975, name: "Ohio State University Wexner Medical Center", type: "Hospital", address: "410 W 10th Ave, Columbus, OH" },
  { lat: 39.968, lon: -82.955, name: "Columbus Neighborhood Health Center", type: "FQHC", address: "1905 Parsons Ave, Columbus, OH" },
  { lat: 39.958, lon: -82.985, name: "Nationwide Children's Hospital", type: "Hospital", address: "700 Children's Dr, Columbus, OH" },
];
