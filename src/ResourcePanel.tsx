// ResourcePanel — renders local resource links for Z codes produced by a screening.
// Displayed inline below Z codes in the screening results view.
// On-click: queries the 211 National Data Platform Search API v2 for live service listings.
// Fallback: tel:211 (always works, even if the API is down).

import { useMemo, useCallback, useState } from "react";
import {
  getResourcesForZCodes,
  type ResourceCategory,
  type ReferralAction,
  type ServiceListing,
} from "./resource-referrals";
import { use211Search, is211Configured } from "./use211Search";
import type { Lang } from "./prapare";

function t(en: string, es?: string, lang?: Lang): string {
  return lang === "es" && es ? es : en;
}

// ─── Service card (single 211 result) ────────────────────────────────────────

function ServiceCard({ service, lang }: { service: ServiceListing; lang?: Lang }) {
  const addr = service.address;
  const addressLine = [addr.streetAddress, addr.city, addr.stateProvince, addr.postalCode]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="rounded-md border border-cs-border bg-white p-2.5 space-y-1">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-body text-xs font-medium text-cs-text">
            {service.nameOrganization}
          </p>
          {service.nameService && service.nameService !== service.nameOrganization && (
            <p className="font-body text-[11px] text-cs-blue">{service.nameService}</p>
          )}
        </div>
      </div>
      {service.descriptionService && (
        <p className="font-body text-[10px] text-cs-text/60 line-clamp-2">
          {service.descriptionService}
        </p>
      )}
      {addressLine && (
        <p className="font-body text-[10px] text-cs-text/50">{addressLine}</p>
      )}
      {service.taxonomyTerms.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {service.taxonomyTerms.slice(0, 3).map((term, i) => (
            <span key={i} className="text-[9px] bg-cs-bg text-cs-text/40 px-1.5 py-0.5 rounded">
              {term}
            </span>
          ))}
        </div>
      )}
      {service.dataOwner && (
        <p className="font-body text-[9px] text-cs-text/30">
          {lang === "es" ? "Datos de" : "Data from"} {service.dataOwner}
        </p>
      )}
    </div>
  );
}

// ─── Resource category panel (one per matched category) ──────────────────────

function CategoryPanel({
  category,
  lang,
  zip,
  onReferralAction,
}: {
  category: ResourceCategory;
  lang?: Lang;
  zip?: string;
  onReferralAction?: (action: ReferralAction) => void;
}) {
  const { results, loading, error, search } = use211Search();
  const [searched, setSearched] = useState(false);
  const configured = is211Configured();

  const handleFindNearby = useCallback(() => {
    if (!zip && !configured) return;
    const location = zip || "United States";
    search(category.searchKeywords, location);
    setSearched(true);
    if (onReferralAction) {
      onReferralAction({
        zCode: "",
        categoryId: category.id,
        action: "clicked_211",
        timestamp: new Date().toISOString(),
      });
    }
  }, [category, zip, search, configured, onReferralAction]);

  const logAction = useCallback(
    (action: ReferralAction["action"]) => {
      if (onReferralAction) {
        onReferralAction({
          zCode: "",
          categoryId: category.id,
          action,
          timestamp: new Date().toISOString(),
        });
      }
    },
    [category.id, onReferralAction],
  );

  return (
    <div className="rounded-md bg-blue-50 border border-blue-100 p-3 space-y-2">
      <p className="font-body text-xs font-medium text-cs-text">
        {t(category.label, category.labelEs, lang)}
      </p>
      <p className="font-body text-[11px] text-cs-text/60">
        {t(category.description, category.descriptionEs, lang)}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {/* Find nearby — queries 211 API */}
        {configured && !searched && (
          <button
            onClick={handleFindNearby}
            className="inline-flex items-center gap-1 font-body text-[11px] font-medium text-white bg-cs-blue hover:bg-cs-blue-dark px-2.5 py-1 rounded transition-colors"
          >
            {lang === "es" ? "Buscar servicios cercanos" : "Find nearby services"}
          </button>
        )}

        {/* Hotline — always available */}
        {category.hotline && (
          <a
            href={`tel:${category.hotline}`}
            onClick={() => logAction("clicked_hotline")}
            className="inline-flex items-center gap-1 font-body text-[11px] font-medium text-cs-blue border border-cs-blue/30 hover:border-cs-blue px-2.5 py-1 rounded transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className="opacity-60">
              <path d="M2 1a1 1 0 00-1 1v.5C1 6.09 3.91 9 7.5 9H8a1 1 0 001-1V7a.5.5 0 00-.5-.5L7 6a.5.5 0 00-.45.28l-.3.6a.5.5 0 01-.55.27A4 4 0 012.85 4.3a.5.5 0 01.27-.55l.6-.3A.5.5 0 004 3L3.5 1.5A.5.5 0 003 1H2z" />
            </svg>
            {t(category.hotlineLabel || `Call ${category.hotline}`, category.hotlineLabelEs, lang)}
          </a>
        )}

        {/* Online resource */}
        {category.onlineUrl && (
          <a
            href={category.onlineUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => logAction("clicked_online")}
            className="inline-flex items-center gap-1 font-body text-[11px] text-cs-blue hover:underline"
          >
            {t(category.onlineLabel || category.onlineUrl, category.onlineLabelEs, lang)}
            <svg width="8" height="8" viewBox="0 0 10 10" fill="none" className="opacity-50">
              <path d="M3 1h6v6M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        )}

        {/* Fallback: tel:211 always present */}
        {!category.hotline && (
          <a
            href="tel:211"
            onClick={() => logAction("clicked_hotline")}
            className="inline-flex items-center gap-1 font-body text-[11px] text-cs-text/50 hover:text-cs-blue"
          >
            {lang === "es" ? "Llame al 2-1-1" : "Call 2-1-1"}
          </a>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center gap-2 py-2">
          <div className="w-3 h-3 border-2 border-cs-blue/30 border-t-cs-blue rounded-full animate-spin" />
          <span className="font-body text-[11px] text-cs-text/50">
            {lang === "es" ? "Buscando servicios cercanos..." : "Searching for nearby services..."}
          </span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-2.5 py-2 space-y-1">
          <p className="font-body text-[11px] text-red-700">{error}</p>
          <a href="tel:211" className="font-body text-[11px] font-medium text-cs-blue hover:underline">
            {lang === "es" ? "Llame al 2-1-1 para asistencia" : "Call 2-1-1 for assistance"}
          </a>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-1.5">
          {results.map((service, i) => (
            <ServiceCard key={i} service={service} lang={lang} />
          ))}
          <p className="font-body text-[9px] text-cs-text/30 pt-1">
            {lang === "es"
              ? "Datos de la Plataforma Nacional de Datos 211. Llame al 2-1-1 para más opciones."
              : "Data from the 211 National Data Platform. Call 2-1-1 for more options."}
          </p>
        </div>
      )}

      {/* No results */}
      {searched && !loading && !error && results.length === 0 && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-2.5 py-2">
          <p className="font-body text-[11px] text-amber-800">
            {lang === "es"
              ? "No se encontraron servicios cercanos. Llame al 2-1-1 para asistencia."
              : "No services found nearby. Call 2-1-1 for assistance."}
          </p>
          <a href="tel:211" className="font-body text-[11px] font-medium text-cs-blue hover:underline">
            {lang === "es" ? "Llame al 2-1-1" : "Call 2-1-1"}
          </a>
        </div>
      )}

      {/* Not configured — show static fallback */}
      {!configured && !searched && (
        <div className="rounded-md bg-cs-bg px-2.5 py-1.5">
          <p className="font-body text-[10px] text-cs-text/40">
            {lang === "es"
              ? "Configure su clave API de 211 para buscar servicios en línea, o llame al 2-1-1."
              : "Configure your 211 API key to search services online, or call 2-1-1."}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main panel ──────────────────────────────────────────────────────────────

interface ResourcePanelProps {
  zCodes: string[];
  lang?: Lang;
  zip?: string;
  onReferralAction?: (action: ReferralAction) => void;
}

export default function ResourcePanel({ zCodes, lang = "en", zip, onReferralAction }: ResourcePanelProps) {
  const resources = useMemo(() => getResourcesForZCodes(zCodes), [zCodes]);

  if (resources.length === 0) return null;

  return (
    <div className="border-t border-cs-blue/20 pt-3 mt-3 space-y-3">
      <p className="font-body text-xs font-medium text-cs-blue">
        {lang === "es" ? "Recursos locales disponibles:" : "Local resources available:"}
      </p>
      {resources.map((cat) => (
        <CategoryPanel
          key={cat.id}
          category={cat}
          lang={lang}
          zip={zip}
          onReferralAction={onReferralAction}
        />
      ))}
    </div>
  );
}
