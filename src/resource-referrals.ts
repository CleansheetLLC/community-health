// ─── Community Resource Referral Mapping ─────────────────────────────────────
// Maps ICD-10 Z codes from PRAPARE/AHC-HRSN screenings to community resource
// categories with 211 search terms, national hotlines, and online resources.
//
// Live integration: 211 National Data Platform Search API v2
// Endpoint: GET https://api.211.org/resources/v2/search/keyword
// Auth: Ocp-Apim-Subscription-Key header (Azure APIM)
// Fallback: tel:211 (universal, always works)

export interface ResourceCategory {
  /** Unique category identifier */
  id: string;
  /** Display name (English) */
  label: string;
  /** Display name (Spanish) */
  labelEs: string;
  /** Brief description of what services this covers */
  description: string;
  descriptionEs: string;
  /** Keywords sent to the 211 Search API v2 for this category */
  searchKeywords: string;
  /** 211.org URL path segment for deep-linking (fallback if API unavailable) */
  search211Slug: string;
  /** National hotline phone number, if applicable */
  hotline?: string;
  /** Hotline label (e.g., "National DV Hotline") */
  hotlineLabel?: string;
  hotlineLabelEs?: string;
  /** National online resource URL */
  onlineUrl?: string;
  onlineLabel?: string;
  onlineLabelEs?: string;
}

// ─── 211 API response types ──────────────────────────────────────────────────

export interface ServiceListing {
  nameOrganization: string;
  nameService: string;
  descriptionService: string;
  address: {
    streetAddress: string;
    city: string;
    stateProvince: string;
    postalCode: string;
    latitude?: string;
    longitude?: string;
  };
  taxonomyTerms: string[];
  dataOwner: string;
}

export interface SearchApiResponse {
  count: number | null;
  location: {
    city?: string;
    state?: string;
    postalCode?: string;
  } | null;
  results: Array<{
    nameOrganization?: string;
    nameService?: string;
    descriptionService?: string;
    address?: {
      streetAddress?: string;
      city?: string;
      stateProvince?: string;
      postalCode?: string;
      latitude?: string;
      longitude?: string;
    };
    taxonomy?: Array<{ taxonomyTerm?: string }>;
    dataOwnerDisplayName?: string;
  }>;
}

export interface ZCodeResourceMapping {
  /** ICD-10 Z code or code prefix (e.g., "Z59.00" or "Z59.0" for range) */
  zCode: string;
  /** Resource category ID */
  categoryId: string;
}

// ─── Resource Categories ─────────────────────────────────────────────────────

export const RESOURCE_CATEGORIES: ResourceCategory[] = [
  {
    id: "housing-emergency",
    label: "Emergency Housing & Shelter",
    labelEs: "Vivienda de Emergencia y Refugio",
    description: "Emergency shelters, transitional housing, rapid rehousing programs, homeless outreach.",
    descriptionEs: "Refugios de emergencia, vivienda de transición, programas de reubicación rápida, alcance a personas sin hogar.",
    searchKeywords: "emergency shelter,homeless shelter,transitional housing",
    search211Slug: "housing",
    hotline: "211",
    hotlineLabel: "Call 2-1-1",
    hotlineLabelEs: "Llame al 2-1-1",
  },
  {
    id: "housing-stability",
    label: "Housing Stability & Repair",
    labelEs: "Estabilidad de Vivienda y Reparaciones",
    description: "Rental assistance, eviction prevention, home repair, housing counseling.",
    descriptionEs: "Asistencia de alquiler, prevención de desalojo, reparación del hogar, asesoría de vivienda.",
    searchKeywords: "rental assistance,eviction prevention,housing counseling",
    search211Slug: "housing",
  },
  {
    id: "food",
    label: "Food Assistance",
    labelEs: "Asistencia Alimentaria",
    description: "Food pantries, SNAP/food stamps enrollment, community meals, WIC.",
    descriptionEs: "Bancos de alimentos, inscripción a SNAP/cupones, comidas comunitarias, WIC.",
    searchKeywords: "food pantry,food bank,SNAP,food stamps,WIC",
    search211Slug: "food",
    onlineUrl: "https://www.fns.usda.gov/snap/recipient/eligibility",
    onlineLabel: "Check SNAP eligibility",
    onlineLabelEs: "Verificar elegibilidad de SNAP",
  },
  {
    id: "insurance",
    label: "Health Insurance Enrollment",
    labelEs: "Inscripción en Seguro de Salud",
    description: "Medicaid enrollment, ACA marketplace navigators, CHIP for children.",
    descriptionEs: "Inscripción a Medicaid, navegadores del mercado ACA, CHIP para niños.",
    searchKeywords: "health insurance,Medicaid enrollment,marketplace navigator",
    search211Slug: "health-care",
    onlineUrl: "https://www.healthcare.gov/",
    onlineLabel: "HealthCare.gov",
    onlineLabelEs: "HealthCare.gov",
  },
  {
    id: "healthcare-access",
    label: "Health Care Access",
    labelEs: "Acceso a Atención Médica",
    description: "Community health centers, free clinics, sliding-scale providers, prescription assistance.",
    descriptionEs: "Centros de salud comunitarios, clínicas gratuitas, proveedores de escala móvil, asistencia con recetas.",
    searchKeywords: "community health center,free clinic,prescription assistance",
    search211Slug: "health-care",
    onlineUrl: "https://findahealthcenter.hrsa.gov/",
    onlineLabel: "Find a Health Center (HRSA)",
    onlineLabelEs: "Encontrar un Centro de Salud (HRSA)",
  },
  {
    id: "transportation",
    label: "Transportation Assistance",
    labelEs: "Asistencia de Transporte",
    description: "Medical transport, bus passes, ride programs, non-emergency medical transportation (NEMT).",
    descriptionEs: "Transporte médico, pases de autobús, programas de transporte, transporte médico no emergencia.",
    searchKeywords: "medical transportation,bus pass,ride program,NEMT",
    search211Slug: "transportation",
  },
  {
    id: "financial",
    label: "Financial Assistance",
    labelEs: "Asistencia Financiera",
    description: "Emergency funds, utility payment assistance, TANF, financial counseling.",
    descriptionEs: "Fondos de emergencia, asistencia de pagos de servicios, TANF, asesoría financiera.",
    searchKeywords: "financial assistance,emergency funds,TANF,financial counseling",
    search211Slug: "money",
  },
  {
    id: "employment",
    label: "Employment & Job Training",
    labelEs: "Empleo y Capacitación Laboral",
    description: "Job placement, skills training, resume assistance, workforce development.",
    descriptionEs: "Colocación laboral, capacitación, asistencia con currículum, desarrollo de la fuerza laboral.",
    searchKeywords: "job training,employment assistance,workforce development",
    search211Slug: "work",
    onlineUrl: "https://www.careeronestop.org/",
    onlineLabel: "CareerOneStop",
    onlineLabelEs: "CareerOneStop",
  },
  {
    id: "education",
    label: "Education & Literacy",
    labelEs: "Educación y Alfabetización",
    description: "GED programs, adult education, ESL classes, health literacy, tutoring.",
    descriptionEs: "Programas de GED, educación para adultos, clases de ESL, alfabetización en salud, tutorías.",
    searchKeywords: "GED,adult education,ESL classes,literacy program",
    search211Slug: "education",
  },
  {
    id: "social-support",
    label: "Social Support & Senior Services",
    labelEs: "Apoyo Social y Servicios para Adultos Mayores",
    description: "Senior centers, social groups, home visiting programs, companionship services, faith-based outreach.",
    descriptionEs: "Centros para adultos mayores, grupos sociales, programas de visitas domiciliarias, servicios de compañía.",
    searchKeywords: "senior center,social support,companionship,home visiting",
    search211Slug: "social-support",
  },
  {
    id: "mental-health",
    label: "Mental Health & Counseling",
    labelEs: "Salud Mental y Consejería",
    description: "Counseling services, crisis intervention, stress management, support groups.",
    descriptionEs: "Servicios de consejería, intervención en crisis, manejo del estrés, grupos de apoyo.",
    searchKeywords: "mental health counseling,crisis intervention,support group",
    search211Slug: "mental-health",
    hotline: "988",
    hotlineLabel: "988 Suicide & Crisis Lifeline",
    hotlineLabelEs: "Línea 988 de Prevención del Suicidio y Crisis",
  },
  {
    id: "family-counseling",
    label: "Family Counseling & Mediation",
    labelEs: "Consejería Familiar y Mediación",
    description: "Family therapy, relationship counseling, parenting support, child welfare.",
    descriptionEs: "Terapia familiar, consejería de relaciones, apoyo parental, bienestar infantil.",
    searchKeywords: "family counseling,family therapy,parenting support",
    search211Slug: "mental-health",
  },
  {
    id: "legal-reentry",
    label: "Legal Aid & Reentry Services",
    labelEs: "Asistencia Legal y Servicios de Reintegración",
    description: "Legal aid, expungement clinics, reentry case management, employment after incarceration.",
    descriptionEs: "Asistencia legal, clínicas de eliminación de antecedentes, gestión de casos de reintegración.",
    searchKeywords: "legal aid,reentry services,expungement",
    search211Slug: "legal-aid",
  },
  {
    id: "victim-services",
    label: "Victim Services",
    labelEs: "Servicios para Víctimas",
    description: "Crime victim assistance, victim advocacy, compensation programs.",
    descriptionEs: "Asistencia a víctimas de delitos, defensa de víctimas, programas de compensación.",
    searchKeywords: "victim services,victim advocacy,crime victim assistance",
    search211Slug: "safety",
  },
  {
    id: "domestic-violence",
    label: "Domestic Violence Services",
    labelEs: "Servicios de Violencia Doméstica",
    description: "Safety planning, DV shelters, protective orders, crisis counseling, hotline.",
    descriptionEs: "Planificación de seguridad, refugios de VD, órdenes de protección, consejería de crisis, línea de ayuda.",
    searchKeywords: "domestic violence shelter,domestic violence hotline,protective order",
    search211Slug: "safety",
    hotline: "1-800-799-7233",
    hotlineLabel: "National DV Hotline",
    hotlineLabelEs: "Línea Nacional de Violencia Doméstica",
  },
  {
    id: "utilities",
    label: "Utility Assistance",
    labelEs: "Asistencia de Servicios Públicos",
    description: "LIHEAP, utility payment programs, weatherization, shutoff prevention.",
    descriptionEs: "LIHEAP, programas de pago de servicios, climatización, prevención de cortes.",
    searchKeywords: "utility assistance,LIHEAP,utility payment,weatherization",
    search211Slug: "money",
    onlineUrl: "https://www.acf.hhs.gov/ocs/low-income-home-energy-assistance-program-liheap",
    onlineLabel: "LIHEAP (federal)",
    onlineLabelEs: "LIHEAP (federal)",
  },
];

const CATEGORY_MAP = new Map(RESOURCE_CATEGORIES.map((c) => [c.id, c]));

// ─── Z Code → Resource Category Mappings ─────────────────────────────────────

export const Z_CODE_RESOURCE_MAPPINGS: ZCodeResourceMapping[] = [
  // Housing
  { zCode: "Z59.00", categoryId: "housing-emergency" },
  { zCode: "Z59.01", categoryId: "housing-emergency" },
  { zCode: "Z59.02", categoryId: "housing-emergency" },
  { zCode: "Z59.811", categoryId: "housing-stability" },
  { zCode: "Z59.89", categoryId: "housing-stability" },
  { zCode: "Z59.19", categoryId: "housing-stability" },
  { zCode: "Z59.11", categoryId: "utilities" },
  // Food
  { zCode: "Z59.41", categoryId: "food" },
  { zCode: "Z59.48", categoryId: "food" },
  // Insurance & healthcare access
  { zCode: "Z59.71", categoryId: "insurance" },
  { zCode: "Z75.3", categoryId: "healthcare-access" },
  // Transportation
  { zCode: "Z59.82", categoryId: "transportation" },
  // Financial
  { zCode: "Z59.86", categoryId: "financial" },
  { zCode: "Z59.7", categoryId: "financial" },
  // Employment
  { zCode: "Z56.0", categoryId: "employment" },
  // Education
  { zCode: "Z55.0", categoryId: "education" },
  { zCode: "Z55.5", categoryId: "education" },
  { zCode: "Z55.6", categoryId: "education" },
  { zCode: "Z55.8", categoryId: "education" },
  { zCode: "Z55.9", categoryId: "education" },
  // Social isolation
  { zCode: "Z60.2", categoryId: "social-support" },
  { zCode: "Z60.4", categoryId: "social-support" },
  // Stress / mental health
  { zCode: "Z73.3", categoryId: "mental-health" },
  // Family / relationship
  { zCode: "Z63.0", categoryId: "family-counseling" },
  { zCode: "Z63.8", categoryId: "family-counseling" },
  // Incarceration / reentry
  { zCode: "Z65.1", categoryId: "legal-reentry" },
  { zCode: "Z65.2", categoryId: "legal-reentry" },
  // Victim services
  { zCode: "Z65.4", categoryId: "victim-services" },
  // IPV / domestic violence
  { zCode: "Z69.11", categoryId: "domestic-violence" },
  { zCode: "T74.11XA", categoryId: "domestic-violence" },
  // Utilities
  { zCode: "Z58.81", categoryId: "utilities" },
  // Lead exposure (housing-adjacent)
  { zCode: "Z77.011", categoryId: "housing-stability" },
];

// ─── Lookup helpers ──────────────────────────────────────────────────────────

/** Given a list of Z codes, return the unique resource categories that apply. */
export function getResourcesForZCodes(zCodes: string[]): ResourceCategory[] {
  const categoryIds = new Set<string>();
  for (const code of zCodes) {
    for (const mapping of Z_CODE_RESOURCE_MAPPINGS) {
      if (code === mapping.zCode || code.startsWith(mapping.zCode)) {
        categoryIds.add(mapping.categoryId);
      }
    }
  }
  const results: ResourceCategory[] = [];
  for (const id of categoryIds) {
    const cat = CATEGORY_MAP.get(id);
    if (cat) results.push(cat);
  }
  return results;
}

/** Build a 211.org search URL for a given category, optionally scoped to a ZIP code. */
export function build211Url(category: ResourceCategory, zip?: string): string {
  const base = `https://www.211.org/get-help/${category.search211Slug}`;
  return zip ? `${base}?zipCode=${zip}` : base;
}

// ─── Referral tracking ───────────────────────────────────────────────────────

export interface ReferralAction {
  zCode: string;
  categoryId: string;
  action: "viewed" | "clicked_211" | "clicked_hotline" | "clicked_online" | "declined";
  timestamp: string;
}
