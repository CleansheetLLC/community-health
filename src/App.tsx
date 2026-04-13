import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  QUESTIONS, DOMAINS, Z_CODE_MAPPINGS, Z_CODE_CATEGORIES,
  type PrapareQuestion, type Lang,
} from "./prapare";
import {
  AHC_QUESTIONS, AHC_DOMAINS, AHC_Z_CODE_MAPPINGS, getZCodesForAhcAnswer,
  type AhcQuestion,
} from "./ahc-hrsn";
import SVIMapView from "./SVIMap";
import {
  saveScreeningEntry, getScreeningLog, clearScreeningLog,
  exportScreeningLogCSV, downloadCSV, getCurrentTract, testGeocoding,
  type ScreeningLogEntry, type TractTestResult,
} from "./screening-log";

function t(en: string, es: string | undefined, lang: Lang): string {
  return lang === "es" && es ? es : en;
}

// Keywords for matching PRAPARE flags to Z_CODE_MAPPINGS domains.
// The mapping's own domain/trigger text doesn't reliably appear in flag strings
// (which are truncated question text for radio, or checkbox option labels).
// These keywords are chosen to match the actual question/answer text.
const PRAPARE_MAPPING_KEYWORDS: Record<string, string[]> = {
  "Housing": ["housing situation", "not have housing", "homeless"],
  "Housing stability": ["losing your housing", "worried about losing"],
  "Education": ["less than high school", "highest level of school"],
  "Employment": ["unemployed", "current work situation"],
  "Food insecurity": ["food"],
  "Utilities": ["utilit"],
  "Transportation": ["transportation", "transport"],
  "Social isolation": ["see or talk", "people that you care", "once a week"],
  "Stress": ["stress"],
  "Incarceration": ["jail", "prison", "detention", "correctional"],
  "Safety": ["physically and emotionally safe", "safe where you"],
  "Healthcare access": ["medicine", "health care", "medical appointments"],
};

function getMatchingZCodesForPrapare(flags: string[]): string[] {
  if (flags.length === 0) return [];
  const flagsText = flags.join(" ").toLowerCase();
  const matched: string[] = [];
  for (const mapping of Z_CODE_MAPPINGS) {
    const keywords = PRAPARE_MAPPING_KEYWORDS[mapping.domain] || [mapping.domain.toLowerCase()];
    if (keywords.some((k) => flagsText.includes(k.toLowerCase()))) {
      matched.push(...mapping.codes.map((c) => c.code));
    }
  }
  return [...new Set(matched)];
}

// ─── Tract Location Test ─────────────────────────────────────────────────────

function TractLocationTest({ lang }: { lang: Lang }) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TractTestResult | null>(null);

  const runTest = useCallback(async () => {
    setTesting(true);
    setResult(null);
    try {
      const r = await testGeocoding();
      setResult(r);
    } catch (err) {
      setResult({ ok: false, geolocationError: err instanceof Error ? err.message : String(err) });
    } finally {
      setTesting(false);
    }
  }, []);

  return (
    <div className="flex items-start gap-2 mt-2">
      <button
        onClick={runTest}
        disabled={testing}
        className="font-body text-xs font-medium text-cs-blue border border-cs-blue/30 hover:border-cs-blue px-3 py-1.5 rounded-md transition-colors disabled:opacity-40"
      >
        {testing
          ? (lang === "es" ? "Probando..." : "Testing...")
          : (lang === "es" ? "Probar ubicación" : "Test location")}
      </button>
      {result && (
        <div className="flex-1 text-xs font-body space-y-1">
          {result.ok && result.tract ? (
            <p className="text-green-700">
              {lang === "es" ? "✓ Éxito" : "✓ Success"}: {result.tract.fips}
              {result.tract.county && ` (${result.tract.county}, ${result.tract.state})`}
              {result.cached && (lang === "es" ? " — desde caché" : " — from cache")}
              {result.fccResult === "success" && (lang === "es" ? " — vía FCC" : " — via FCC")}
              {result.censusResult === "success" && (lang === "es" ? " — vía Census (FCC falló)" : " — via Census (FCC failed)")}
            </p>
          ) : (
            <>
              {result.geolocationError && (
                <p className="text-red-700">{lang === "es" ? "Geolocalización" : "Geolocation"}: {result.geolocationError}</p>
              )}
              {result.fccError && (
                <p className="text-red-700">FCC: {result.fccError}</p>
              )}
              {result.censusError && (
                <p className="text-red-700">Census: {result.censusError}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Text-to-Speech ──────────────────────────────────────────────────────────

const LANG_VOICE_MAP: Record<Lang, string> = { en: "en-US", es: "es-MX" };

export interface SpeakSegment {
  id: string;      // conceptual id for this segment (e.g. "q1" or "q1:unhoused")
  start: number;   // char offset where segment begins in the utterance
  end: number;     // char offset where segment ends (exclusive)
}

function useTTS() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [charIndex, setCharIndex] = useState(-1);
  const [segments, setSegments] = useState<SpeakSegment[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((id: string, text: string, lang: Lang, segs: SpeakSegment[] = []) => {
    // If already speaking this item, stop
    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      setCharIndex(-1);
      setSegments([]);
      return;
    }
    // Cancel anything in progress
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANG_VOICE_MAP[lang];
    utterance.rate = 0.9;
    utterance.onstart = () => setCharIndex(0);
    utterance.onboundary = (e) => {
      if (e.name === "word") setCharIndex(e.charIndex);
    };
    utterance.onend = () => {
      setSpeakingId(null);
      setCharIndex(-1);
      setSegments([]);
    };
    utterance.onerror = () => {
      setSpeakingId(null);
      setCharIndex(-1);
      setSegments([]);
    };
    utteranceRef.current = utterance;
    setSpeakingId(id);
    setCharIndex(0);
    setSegments(segs);
    window.speechSynthesis.speak(utterance);
  }, [speakingId]);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeakingId(null);
    setCharIndex(-1);
    setSegments([]);
  }, []);

  return { speak, stop, speakingId, charIndex, segments };
}

type TTS = ReturnType<typeof useTTS>;

// For a given target id, compute whether its text is currently being highlighted
// and the local character index within that text.
function getHighlightPosition(targetId: string, tts: TTS): number {
  if (tts.charIndex < 0) return -1;
  // Direct speak: speakingId matches target
  if (tts.speakingId === targetId) return tts.charIndex;
  // Segment speak ("Read all"): find segment and compute local offset
  const seg = tts.segments.find((s) => s.id === targetId);
  if (seg && tts.charIndex >= seg.start && tts.charIndex < seg.end) {
    return tts.charIndex - seg.start;
  }
  return -1;
}

// Render text with karaoke-style word highlighting.
// `localCharIndex` is the position within `text` being spoken (-1 = not active).
function HighlightedText({ text, localCharIndex, className = "" }: {
  text: string;
  localCharIndex: number;
  className?: string;
}) {
  if (localCharIndex < 0) {
    return <span className={className}>{text}</span>;
  }
  // Split text into alternating word and whitespace tokens, preserving original spacing
  const tokens: { text: string; start: number; end: number; isWord: boolean }[] = [];
  let i = 0;
  while (i < text.length) {
    const start = i;
    const isWord = !/\s/.test(text[i]);
    while (i < text.length && !/\s/.test(text[i]) === isWord) i++;
    tokens.push({ text: text.slice(start, i), start, end: i, isWord });
  }

  return (
    <span className={className}>
      {tokens.map((tok, idx) => {
        if (!tok.isWord) return <span key={idx}>{tok.text}</span>;
        const active = localCharIndex >= tok.start && localCharIndex < tok.end;
        return (
          <span
            key={idx}
            className={active ? "bg-cs-blue/25 text-cs-text rounded-sm px-0.5 -mx-0.5 transition-colors" : ""}
          >
            {tok.text}
          </span>
        );
      })}
    </span>
  );
}

function SpeakerButton({ isActive, onClick, size = "md" }: { isActive: boolean; onClick: (e: React.MouseEvent) => void; size?: "sm" | "md" }) {
  const pad = size === "sm" ? "p-1" : "p-1.5";
  const dim = size === "sm" ? 13 : 16;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isActive ? "Stop reading" : "Read aloud"}
      className={`shrink-0 ${pad} rounded-md transition-colors ${
        isActive
          ? "text-cs-blue bg-cs-blue/10"
          : "text-cs-text/30 hover:text-cs-blue hover:bg-cs-blue/5"
      }`}
    >
      <svg width={dim} height={dim} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {isActive ? (
          <>
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </>
        ) : (
          <>
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </>
        )}
      </svg>
    </button>
  );
}

// ─── PRAPARE Screening Tool ───────────────────────────────────────────────────

type Answers = Record<string, string | string[] | number>;

function PrapareScreening() {
  const [answers, setAnswers] = useState<Answers>({});
  const [showResults, setShowResults] = useState(false);
  const [activeDomain, setActiveDomain] = useState(DOMAINS[0].id);
  const [lang, setLang] = useState<Lang>("en");
  const tts = useTTS();

  const setAnswer = useCallback((qId: string, value: string | string[] | number) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  }, []);

  const toggleCheckbox = useCallback((qId: string, value: string) => {
    setAnswers((prev) => {
      const current = (prev[qId] as string[]) || [];
      // "decline" and "no" are mutually exclusive with all other options
      const EXCLUSIVE = new Set(["decline", "no"]);
      if (EXCLUSIVE.has(value)) {
        return { ...prev, [qId]: current.includes(value) ? [] : [value] };
      }
      const filtered = current.filter((v) => !EXCLUSIVE.has(v));
      const next = filtered.includes(value)
        ? filtered.filter((v) => v !== value)
        : [...filtered, value];
      return { ...prev, [qId]: next };
    });
  }, []);

  const domainQuestions = useMemo(
    () => QUESTIONS.filter((q) => q.domain === activeDomain),
    [activeDomain],
  );

  // Compute risk flags per domain
  const riskFlags = useMemo(() => {
    const flags: Record<string, string[]> = {};
    for (const q of QUESTIONS) {
      const answer = answers[q.id];
      if (!answer) continue;
      if (!flags[q.domain]) flags[q.domain] = [];

      if (q.type === "radio" && q.options) {
        const selected = q.options.find((o) => o.value === answer);
        if (selected?.isPositiveScreen) {
          flags[q.domain].push(q.text.slice(0, 60) + (q.text.length > 60 ? "..." : ""));
        }
      }
      if (q.type === "checkbox" && q.options && Array.isArray(answer)) {
        for (const val of answer) {
          const opt = q.options.find((o) => o.value === val);
          if (opt?.isPositiveScreen) {
            flags[q.domain].push(opt.label);
          }
        }
      }
    }
    return flags;
  }, [answers]);

  const totalFlags = Object.values(riskFlags).reduce((s, f) => s + f.length, 0);
  const domainsWithFlags = Object.keys(riskFlags).filter((d) => riskFlags[d].length > 0).length;
  const riskLevel = domainsWithFlags === 0 ? "Low" : domainsWithFlags <= 2 ? "Moderate" : "High";
  const riskColor = riskLevel === "Low" ? "text-green-600" : riskLevel === "Moderate" ? "text-amber-600" : "text-red-600";

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = QUESTIONS.length;
  const [saved, setSaved] = useState(false);
  const [tagTract, setTagTract] = useState(false);
  const [savingTract, setSavingTract] = useState(false);
  const [tractError, setTractError] = useState<string | null>(null);

  const handleSaveResult = useCallback(async () => {
    // Collect all positive-screen flags across all domains, then match Z codes
    const allFlags: string[] = [];
    for (const d of DOMAINS) {
      allFlags.push(...(riskFlags[d.id] || []));
    }
    const zCodes = getMatchingZCodesForPrapare(allFlags);
    const entry: ScreeningLogEntry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      instrument: "PRAPARE",
      overallRisk: riskLevel,
      domainsWithFlags,
      totalFlags,
      domains: DOMAINS.map((d) => ({
        domain: d.label,
        flagCount: (riskFlags[d.id] || []).length,
        flags: riskFlags[d.id] || [],
      })),
      suggestedZCodes: zCodes,
    };

    if (tagTract) {
      setSavingTract(true);
      setTractError(null);
      try {
        const tract = await getCurrentTract();
        if (!tract) {
          setTractError(lang === "es"
            ? "No se pudo determinar el tracto censal. Puede intentar de nuevo o desmarcar la casilla para guardar sin tracto."
            : "Could not determine census tract. Try again, or uncheck the box to save without tract.");
          setSavingTract(false);
          return; // Do not save -- user explicitly opted in and failed
        }
        entry.censusTract = tract.fips;
        entry.county = tract.county;
        entry.state = tract.state;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setTractError(lang === "es"
          ? `Ubicación falló: ${msg} Puede intentar de nuevo o desmarcar la casilla para guardar sin tracto.`
          : `Location failed: ${msg} Try again, or uncheck the box to save without tract.`);
        setSavingTract(false);
        return; // Do not save -- user explicitly opted in and failed
      } finally {
        setSavingTract(false);
      }
    }

    saveScreeningEntry(entry);
    setSaved(true);
  }, [riskFlags, riskLevel, domainsWithFlags, totalFlags, tagTract, lang]);

  return (
    <div>
      {!showResults ? (
        <>
          {/* Language toggle */}
          <div className="flex items-center gap-2 mb-4">
            <span className="font-body text-xs text-cs-text/50">{lang === "en" ? "Language:" : "Idioma:"}</span>
            <button
              onClick={() => { tts.stop(); setLang("en"); }}
              className={`px-2.5 py-1 rounded text-xs font-body font-medium transition-colors ${lang === "en" ? "bg-cs-blue text-white" : "bg-cs-bg text-cs-text-muted hover:text-cs-text"}`}
            >
              English
            </button>
            <button
              onClick={() => { tts.stop(); setLang("es"); }}
              className={`px-2.5 py-1 rounded text-xs font-body font-medium transition-colors ${lang === "es" ? "bg-cs-blue text-white" : "bg-cs-bg text-cs-text-muted hover:text-cs-text"}`}
            >
              Español
            </button>
          </div>

          {/* Domain tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {DOMAINS.map((d) => {
              const flagCount = (riskFlags[d.id] || []).length;
              return (
                <button
                  key={d.id}
                  onClick={() => setActiveDomain(d.id)}
                  className={`px-3 py-1.5 rounded-md text-sm font-body transition-colors ${
                    activeDomain === d.id
                      ? "bg-cs-blue text-white"
                      : "bg-cs-bg text-cs-text-muted hover:text-cs-text"
                  }`}
                >
                  {t(d.label, d.labelEs, lang)}
                  {flagCount > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                      {flagCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Questions */}
          <div className="space-y-6">
            {domainQuestions.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                answer={answers[q.id]}
                onAnswer={setAnswer}
                onToggle={toggleCheckbox}
                lang={lang}
                tts={tts}
              />
            ))}
          </div>

          {/* Domain navigation */}
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => {
                tts.stop();
                const idx = DOMAINS.findIndex((d) => d.id === activeDomain);
                if (idx > 0) { setActiveDomain(DOMAINS[idx - 1].id); window.scrollTo({ top: 0, behavior: "smooth" }); }
              }}
              disabled={DOMAINS.findIndex((d) => d.id === activeDomain) === 0}
              className="font-body text-sm font-medium text-cs-blue border border-cs-blue/30 hover:border-cs-blue px-4 py-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              &larr; Previous
            </button>
            <span className="font-body text-xs text-cs-text/40">
              {DOMAINS.findIndex((d) => d.id === activeDomain) + 1} of {DOMAINS.length}
            </span>
            <button
              onClick={() => {
                tts.stop();
                const idx = DOMAINS.findIndex((d) => d.id === activeDomain);
                if (idx < DOMAINS.length - 1) { setActiveDomain(DOMAINS[idx + 1].id); window.scrollTo({ top: 0, behavior: "smooth" }); }
              }}
              disabled={DOMAINS.findIndex((d) => d.id === activeDomain) === DOMAINS.length - 1}
              className="font-body text-sm font-medium text-cs-blue border border-cs-blue/30 hover:border-cs-blue px-4 py-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next &rarr;
            </button>
          </div>

          {/* Progress + submit */}
          <div className="mt-4 flex items-center justify-between flex-wrap gap-4">
            <p className="font-body text-sm text-cs-text/60">
              {answeredCount} {lang === "es" ? "de" : "of"} {totalQuestions} {lang === "es" ? "preguntas contestadas" : "questions answered"}
            </p>
            <button
              onClick={() => setShowResults(true)}
              disabled={answeredCount === 0}
              className="font-body text-sm font-medium text-white bg-cs-blue hover:bg-cs-blue-dark px-5 py-2.5 rounded-lg transition-colors disabled:opacity-40"
            >
              {lang === "es" ? "Ver Resumen de Resultados" : "View Results Summary"}
            </button>
          </div>
        </>
      ) : (
        /* Results */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading text-xl text-cs-text">{lang === "es" ? "Resultados de la Evaluación" : "Screening Results"}</h3>
              <p className="font-body text-sm text-cs-text/60 mt-1">
                {domainsWithFlags} {lang === "es" ? "dominio" : "domain"}{domainsWithFlags !== 1 ? "s" : ""} {lang === "es" ? "con resultados positivos" : "with positive screens"}
                &middot; {totalFlags} {lang === "es" ? "factor" : "risk factor"}{totalFlags !== 1 ? (lang === "es" ? "es de riesgo" : "s") : (lang === "es" ? " de riesgo" : "")} {lang === "es" ? "identificado" : "identified"}{totalFlags !== 1 ? "s" : ""}
              </p>
            </div>
            <div className={`font-heading text-2xl ${riskColor}`}>
              {lang === "es" ? (riskLevel === "Low" ? "Riesgo Bajo" : riskLevel === "Moderate" ? "Riesgo Moderado" : "Riesgo Alto") : `${riskLevel} Risk`}
            </div>
          </div>

          {DOMAINS.map((d) => {
            const flags = riskFlags[d.id] || [];
            return (
              <div key={d.id} className={`border rounded-lg p-5 ${flags.length > 0 ? "border-red-300 bg-red-50" : "border-cs-border bg-white"}`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-heading text-base text-cs-text">{t(d.label, d.labelEs, lang)}</h4>
                  {flags.length > 0 ? (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                      {flags.length} {lang === "es" ? "factor" : "risk factor"}{flags.length !== 1 ? (lang === "es" ? "es de riesgo" : "s") : (lang === "es" ? " de riesgo" : "")}
                    </span>
                  ) : (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      {lang === "es" ? "Sin preocupaciones" : "No concerns"}
                    </span>
                  )}
                </div>
                {flags.length > 0 && (
                  <ul className="space-y-1 mb-3">
                    {flags.map((f, i) => (
                      <li key={i} className="font-body text-sm text-cs-text/80 flex items-start gap-2">
                        <span className="text-red-500 mt-0.5">&#9679;</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
                {flags.length > 0 && (
                  <div className="border-t border-cs-border pt-3 mt-3">
                    <p className="font-body text-xs text-cs-text/50 mb-1">Suggested ICD-10 Z codes:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(() => {
                        const codes = getMatchingZCodesForPrapare(flags);
                        return Z_CODE_MAPPINGS
                          .flatMap((m) => m.codes)
                          .filter((c) => codes.includes(c.code))
                          .filter((c, i, arr) => arr.findIndex((x) => x.code === c.code) === i)
                          .slice(0, 4)
                          .map((c) => (
                            <span key={c.code} className="font-mono text-xs bg-cs-badge text-cs-blue-dark px-2 py-0.5 rounded">
                              {c.code} {c.description}
                            </span>
                          ));
                      })()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div className="border-t border-cs-border pt-6 flex gap-4">
            <button
              onClick={() => setShowResults(false)}
              className="font-body text-sm font-medium text-cs-blue border border-cs-blue/30 hover:border-cs-blue px-5 py-2.5 rounded-lg transition-colors"
            >
              {lang === "es" ? "Volver a las Preguntas" : "Back to Questions"}
            </button>
            <button
              onClick={() => { setAnswers({}); setShowResults(false); setActiveDomain(DOMAINS[0].id); setSaved(false); setTagTract(false); setTractError(null); }}
              className="font-body text-sm font-medium text-cs-text-muted border border-cs-text/20 hover:border-cs-text/40 px-5 py-2.5 rounded-lg transition-colors"
            >
              {lang === "es" ? "Comenzar de Nuevo" : "Start Over"}
            </button>
            <button
              onClick={handleSaveResult}
              disabled={saved || savingTract}
              className={`font-body text-sm font-medium px-5 py-2.5 rounded-lg transition-colors ${
                saved
                  ? "bg-green-100 text-green-700 border border-green-200"
                  : "text-white bg-cs-blue hover:bg-cs-blue-dark disabled:opacity-60"
              }`}
            >
              {savingTract
                ? (lang === "es" ? "Obteniendo ubicación..." : "Getting location...")
                : saved
                ? (lang === "es" ? "Guardado en el registro" : "Saved to Log")
                : (lang === "es" ? "Guardar Resultado" : "Save to Screening Log")}
            </button>
          </div>

          {!saved && (
            <div className="rounded-lg border border-cs-border bg-white p-3 space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tagTract}
                  onChange={(e) => { setTagTract(e.target.checked); setTractError(null); }}
                  className="accent-cs-blue mt-0.5"
                />
                <div className="flex-1">
                  <p className="font-body text-sm text-cs-text">
                    {lang === "es" ? "Etiquetar con tracto censal (anónimo)" : "Tag with census tract (anonymous)"}
                  </p>
                  <p className="font-body text-xs text-cs-text/50 mt-0.5">
                    {lang === "es"
                      ? "Usa la ubicación del dispositivo para identificar el tracto censal de EE. UU. Solo se guarda el código FIPS del tracto (desidentificado por estándar HIPAA). No se almacena latitud/longitud."
                      : "Uses device location to identify the US Census tract. Only the tract FIPS code is saved (HIPAA Safe Harbor de-identified). No lat/lon is stored."}
                  </p>
                </div>
              </label>
              <TractLocationTest lang={lang} />
              {tractError && (
                <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-600 shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p className="font-body text-xs text-red-700">{tractError}</p>
                </div>
              )}
            </div>
          )}

          <div className="rounded-lg bg-cs-bg p-4">
            <p className="font-body text-xs text-cs-text/50">
              <strong className="text-cs-text/70">Disclaimer:</strong> This tool implements the published
              PRAPARE screening instrument (NACHC, 2019). Results saved to the screening log are stored in
              your browser's local storage only. No data is transmitted to Cleansheet. If you opt in to
              census tract tagging, your browser's location is sent to a public US government geocoder
              (FCC primary, US Census Bureau fallback) to determine the tract FIPS code; the lat/lon is
              not retained. Consult your clinical team for interpretation and care planning. This is not
              a medical device.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionCard({ question, answer, onAnswer, onToggle, lang = "en", tts }: {
  question: PrapareQuestion;
  answer: string | string[] | number | undefined;
  onAnswer: (qId: string, value: string | string[] | number) => void;
  onToggle: (qId: string, value: string) => void;
  lang?: Lang;
  tts: ReturnType<typeof useTTS>;
}) {
  const questionText = t(question.text, question.textEs, lang);
  const hasOptions = (question.type === "radio" || question.type === "checkbox") && question.options && question.options.length > 0;
  const readAllId = `${question.id}:all`;

  // Build "read all" text and compute char-offset segments for highlighting sync
  let readAllText = questionText;
  const readAllSegments: SpeakSegment[] = [];
  if (hasOptions) {
    readAllSegments.push({ id: question.id, start: 0, end: questionText.length });
    let cursor = questionText.length;
    const parts: string[] = [questionText];
    for (const opt of question.options!) {
      const optText = t(opt.label, opt.labelEs, lang);
      const sep = ". ";
      const segStart = cursor + sep.length;
      parts.push(optText);
      readAllSegments.push({ id: `${question.id}:${opt.value}`, start: segStart, end: segStart + optText.length });
      cursor = segStart + optText.length;
    }
    readAllText = parts.join(". ");
  }

  return (
    <div className="border border-cs-border rounded-lg p-5 bg-white">
      <div className="flex items-start gap-2 mb-3">
        <p className="font-body text-sm text-cs-text flex-1">
          <HighlightedText text={questionText} localCharIndex={getHighlightPosition(question.id, tts)} />
        </p>
        {hasOptions && (
          <button
            type="button"
            onClick={() => tts.speak(readAllId, readAllText, lang, readAllSegments)}
            className={`shrink-0 px-2 py-1 rounded-md text-[11px] font-body font-medium transition-colors ${
              tts.speakingId === readAllId
                ? "text-cs-blue bg-cs-blue/10"
                : "text-cs-text/40 hover:text-cs-blue hover:bg-cs-blue/5"
            }`}
            aria-label={lang === "es" ? "Leer pregunta y opciones" : "Read question and options"}
          >
            {tts.speakingId === readAllId
              ? (lang === "es" ? "Detener" : "Stop")
              : (lang === "es" ? "Leer todo" : "Read all")}
          </button>
        )}
        <SpeakerButton
          isActive={tts.speakingId === question.id}
          onClick={() => tts.speak(question.id, questionText, lang)}
        />
      </div>

      {question.type === "radio" && question.options && (
        <div className="space-y-2">
          {question.options.map((opt) => {
            const optText = t(opt.label, opt.labelEs, lang);
            const optId = `${question.id}:${opt.value}`;
            return (
              <div key={opt.value} className="flex items-center gap-1">
                <label className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors flex-1 ${
                  answer === opt.value
                    ? opt.isPositiveScreen ? "bg-red-50 border border-red-200" : "bg-cs-badge border border-cs-blue/20"
                    : "hover:bg-cs-bg border border-transparent"
                }`}>
                  <input
                    type="radio"
                    name={question.id}
                    value={opt.value}
                    checked={answer === opt.value}
                    onChange={() => onAnswer(question.id, opt.value)}
                    className="accent-cs-blue"
                  />
                  <HighlightedText
                    text={optText}
                    localCharIndex={getHighlightPosition(optId, tts)}
                    className={`font-body text-sm ${opt.isDecline ? "text-cs-text/40 italic" : "text-cs-text"}`}
                  />
                </label>
                <SpeakerButton
                  size="sm"
                  isActive={tts.speakingId === optId}
                  onClick={(e) => { e.preventDefault(); tts.speak(optId, optText, lang); }}
                />
              </div>
            );
          })}
        </div>
      )}

      {question.type === "checkbox" && question.options && (
        <div className="space-y-2">
          {question.options.map((opt) => {
            const checked = Array.isArray(answer) && answer.includes(opt.value);
            const optText = t(opt.label, opt.labelEs, lang);
            const optId = `${question.id}:${opt.value}`;
            return (
              <div key={opt.value} className="flex items-center gap-1">
                <label className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors flex-1 ${
                  checked
                    ? opt.isPositiveScreen ? "bg-red-50 border border-red-200" : "bg-cs-badge border border-cs-blue/20"
                    : "hover:bg-cs-bg border border-transparent"
                }`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(question.id, opt.value)}
                    className="accent-cs-blue rounded"
                  />
                  <HighlightedText
                    text={optText}
                    localCharIndex={getHighlightPosition(optId, tts)}
                    className={`font-body text-sm ${opt.isDecline ? "text-cs-text/40 italic" : "text-cs-text"}`}
                  />
                </label>
                <SpeakerButton
                  size="sm"
                  isActive={tts.speakingId === optId}
                  onClick={(e) => { e.preventDefault(); tts.speak(optId, optText, lang); }}
                />
              </div>
            );
          })}
        </div>
      )}

      {question.type === "number" && (
        <input
          type="number"
          value={answer as number ?? ""}
          onChange={(e) => onAnswer(question.id, parseInt(e.target.value) || 0)}
          placeholder={t(question.placeholder ?? "", question.placeholderEs, lang)}
          min={0}
          max={20}
          className="w-32 px-3 py-2 text-sm rounded-md border border-cs-border text-cs-text placeholder:text-cs-text/30 focus:outline-none focus:ring-1 focus:ring-cs-blue"
        />
      )}
    </div>
  );
}

// ─── AHC-HRSN Screening Tool ─────────────────────────────────────────────────

function AhcHrsnScreening() {
  const [answers, setAnswers] = useState<Answers>({});
  const [showResults, setShowResults] = useState(false);
  const [activeDomain, setActiveDomain] = useState(AHC_DOMAINS[0].id);
  const [lang, setLang] = useState<Lang>("en");
  const tts = useTTS();

  const setAnswer = useCallback((qId: string, value: string | string[] | number) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  }, []);

  const toggleCheckbox = useCallback((qId: string, value: string) => {
    setAnswers((prev) => {
      const current = (prev[qId] as string[]) || [];
      // "none" is mutually exclusive with all other options
      if (value === "none") {
        return { ...prev, [qId]: current.includes("none") ? [] : ["none"] };
      }
      const withoutNone = current.filter((v) => v !== "none");
      const next = withoutNone.includes(value)
        ? withoutNone.filter((v) => v !== value)
        : [...withoutNone, value];
      return { ...prev, [qId]: next };
    });
  }, []);

  const domainQuestions = useMemo(
    () => AHC_QUESTIONS.filter((q) => q.domain === activeDomain),
    [activeDomain],
  );

  // Compute risk flags per domain
  const riskFlags = useMemo(() => {
    const flags: Record<string, string[]> = {};
    for (const q of AHC_QUESTIONS) {
      const answer = answers[q.id];
      if (!answer) continue;
      if (!flags[q.domain]) flags[q.domain] = [];

      if (q.type === "radio") {
        const selected = q.options.find((o) => o.value === answer);
        if (selected?.isPositiveScreen) {
          flags[q.domain].push(t(selected.label, selected.labelEs, lang));
        }
      }
      if (q.type === "checkbox" && Array.isArray(answer)) {
        for (const val of answer) {
          const opt = q.options.find((o) => o.value === val);
          if (opt?.isPositiveScreen) {
            flags[q.domain].push(t(opt.label, opt.labelEs, lang));
          }
        }
      }
    }
    return flags;
  }, [answers, lang]);

  // Risk level per domain
  const domainRiskLevel = useCallback((domainId: string): "low" | "medium" | "high" => {
    const flags = riskFlags[domainId] || [];
    if (flags.length === 0) return "low";
    if (flags.length === 1) return "medium";
    return "high";
  }, [riskFlags]);

  const totalFlags = Object.values(riskFlags).reduce((s, f) => s + f.length, 0);
  const domainsWithFlags = Object.keys(riskFlags).filter((d) => riskFlags[d].length > 0).length;
  const overallRisk = domainsWithFlags === 0 ? "Low" : domainsWithFlags <= 2 ? "Medium" : "High";
  const riskColor = overallRisk === "Low" ? "text-green-600" : overallRisk === "Medium" ? "text-amber-600" : "text-red-600";

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = AHC_QUESTIONS.length;
  const [saved, setSaved] = useState(false);
  const [tagTract, setTagTract] = useState(false);
  const [savingTract, setSavingTract] = useState(false);
  const [tractError, setTractError] = useState<string | null>(null);

  const handleSaveResult = useCallback(async () => {
    // Answer-specific Z code collection (more precise than domain-level mapping)
    const zCodeSet = new Set<string>();
    for (const q of AHC_QUESTIONS) {
      const codes = getZCodesForAhcAnswer(q.id, answers[q.id] as string | string[] | undefined);
      codes.forEach((c) => zCodeSet.add(c.code));
    }
    const entry: ScreeningLogEntry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      instrument: "AHC-HRSN",
      overallRisk: overallRisk,
      domainsWithFlags,
      totalFlags,
      domains: AHC_DOMAINS.map((d) => ({
        domain: d.label,
        flagCount: (riskFlags[d.id] || []).length,
        flags: riskFlags[d.id] || [],
      })),
      suggestedZCodes: [...zCodeSet],
    };

    if (tagTract) {
      setSavingTract(true);
      setTractError(null);
      try {
        const tract = await getCurrentTract();
        if (!tract) {
          setTractError(lang === "es"
            ? "No se pudo determinar el tracto censal. Puede intentar de nuevo o desmarcar la casilla para guardar sin tracto."
            : "Could not determine census tract. Try again, or uncheck the box to save without tract.");
          setSavingTract(false);
          return;
        }
        entry.censusTract = tract.fips;
        entry.county = tract.county;
        entry.state = tract.state;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setTractError(lang === "es"
          ? `Ubicación falló: ${msg} Puede intentar de nuevo o desmarcar la casilla para guardar sin tracto.`
          : `Location failed: ${msg} Try again, or uncheck the box to save without tract.`);
        setSavingTract(false);
        return;
      } finally {
        setSavingTract(false);
      }
    }

    saveScreeningEntry(entry);
    setSaved(true);
  }, [answers, riskFlags, overallRisk, domainsWithFlags, totalFlags, tagTract, lang]);

  return (
    <div>
      {!showResults ? (
        <>
          {/* Language toggle */}
          <div className="flex items-center gap-2 mb-4">
            <span className="font-body text-xs text-cs-text/50">{lang === "en" ? "Language:" : "Idioma:"}</span>
            <button
              onClick={() => { tts.stop(); setLang("en"); }}
              className={`px-2.5 py-1 rounded text-xs font-body font-medium transition-colors ${lang === "en" ? "bg-cs-blue text-white" : "bg-cs-bg text-cs-text-muted hover:text-cs-text"}`}
            >
              English
            </button>
            <button
              onClick={() => { tts.stop(); setLang("es"); }}
              className={`px-2.5 py-1 rounded text-xs font-body font-medium transition-colors ${lang === "es" ? "bg-cs-blue text-white" : "bg-cs-bg text-cs-text-muted hover:text-cs-text"}`}
            >
              Español
            </button>
          </div>

          {/* Domain tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {AHC_DOMAINS.map((d) => {
              const flagCount = (riskFlags[d.id] || []).length;
              const risk = domainRiskLevel(d.id);
              return (
                <button
                  key={d.id}
                  onClick={() => { tts.stop(); setActiveDomain(d.id); }}
                  className={`px-3 py-1.5 rounded-md text-sm font-body transition-colors ${
                    activeDomain === d.id
                      ? "bg-cs-blue text-white"
                      : "bg-cs-bg text-cs-text-muted hover:text-cs-text"
                  }`}
                >
                  {t(d.label, d.labelEs, lang)}
                  {flagCount > 0 && (
                    <span className={`ml-1.5 inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full text-white text-[10px] font-bold ${
                      risk === "high" ? "bg-red-500" : "bg-amber-500"
                    }`}>
                      {flagCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Questions */}
          <div className="space-y-6">
            {domainQuestions.map((q) => (
              <AhcQuestionCard
                key={q.id}
                question={q}
                answer={answers[q.id] as string | string[] | undefined}
                onAnswer={setAnswer}
                onToggle={toggleCheckbox}
                lang={lang}
                tts={tts}
              />
            ))}
          </div>

          {/* Domain navigation */}
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => {
                tts.stop();
                const idx = AHC_DOMAINS.findIndex((d) => d.id === activeDomain);
                if (idx > 0) { setActiveDomain(AHC_DOMAINS[idx - 1].id); window.scrollTo({ top: 0, behavior: "smooth" }); }
              }}
              disabled={AHC_DOMAINS.findIndex((d) => d.id === activeDomain) === 0}
              className="font-body text-sm font-medium text-cs-blue border border-cs-blue/30 hover:border-cs-blue px-4 py-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              &larr; {lang === "es" ? "Anterior" : "Previous"}
            </button>
            <span className="font-body text-xs text-cs-text/40">
              {AHC_DOMAINS.findIndex((d) => d.id === activeDomain) + 1} {lang === "es" ? "de" : "of"} {AHC_DOMAINS.length}
            </span>
            <button
              onClick={() => {
                tts.stop();
                const idx = AHC_DOMAINS.findIndex((d) => d.id === activeDomain);
                if (idx < AHC_DOMAINS.length - 1) { setActiveDomain(AHC_DOMAINS[idx + 1].id); window.scrollTo({ top: 0, behavior: "smooth" }); }
              }}
              disabled={AHC_DOMAINS.findIndex((d) => d.id === activeDomain) === AHC_DOMAINS.length - 1}
              className="font-body text-sm font-medium text-cs-blue border border-cs-blue/30 hover:border-cs-blue px-4 py-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {lang === "es" ? "Siguiente" : "Next"} &rarr;
            </button>
          </div>

          {/* Progress + submit */}
          <div className="mt-4 flex items-center justify-between flex-wrap gap-4">
            <p className="font-body text-sm text-cs-text/60">
              {answeredCount} {lang === "es" ? "de" : "of"} {totalQuestions} {lang === "es" ? "preguntas contestadas" : "questions answered"}
            </p>
            <button
              onClick={() => setShowResults(true)}
              disabled={answeredCount === 0}
              className="font-body text-sm font-medium text-white bg-cs-blue hover:bg-cs-blue-dark px-5 py-2.5 rounded-lg transition-colors disabled:opacity-40"
            >
              {lang === "es" ? "Ver Resultados" : "View Results"}
            </button>
          </div>
        </>
      ) : (
        /* Results */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading text-xl text-cs-text">{lang === "es" ? "Resultados de la Evaluación" : "Screening Results"}</h3>
              <p className="font-body text-sm text-cs-text/60 mt-1">
                {domainsWithFlags} {lang === "es" ? "dominio" : "domain"}{domainsWithFlags !== 1 ? "s" : ""} {lang === "es" ? "con necesidades identificadas" : "with identified needs"}
              </p>
            </div>
            <div className={`font-heading text-2xl ${riskColor}`}>
              {lang === "es"
                ? (overallRisk === "Low" ? "Riesgo Bajo" : overallRisk === "Medium" ? "Riesgo Medio" : "Riesgo Alto")
                : `${overallRisk} Risk`}
            </div>
          </div>

          {AHC_DOMAINS.map((d) => {
            const flags = riskFlags[d.id] || [];
            const risk = domainRiskLevel(d.id);
            const riskBadge = risk === "low"
              ? { bg: "bg-green-100 text-green-700", label: lang === "es" ? "Sin necesidad" : "No need identified" }
              : risk === "medium"
              ? { bg: "bg-amber-100 text-amber-700", label: lang === "es" ? "Riesgo medio" : "Medium risk" }
              : { bg: "bg-red-100 text-red-700", label: lang === "es" ? "Riesgo alto" : "High risk" };

            return (
              <div key={d.id} className={`border rounded-lg p-5 ${flags.length > 0 ? (risk === "high" ? "border-red-300 bg-red-50" : "border-amber-300 bg-amber-50") : "border-cs-border bg-white"}`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-heading text-base text-cs-text">{t(d.label, d.labelEs, lang)}</h4>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${riskBadge.bg}`}>
                    {riskBadge.label}
                  </span>
                </div>
                <p className="font-body text-xs text-cs-text/50 mb-2">{t(d.description, d.descriptionEs, lang)}</p>
                {flags.length > 0 && (
                  <ul className="space-y-1 mb-3">
                    {flags.map((f, i) => (
                      <li key={i} className="font-body text-sm text-cs-text/80 flex items-start gap-2">
                        <span className={risk === "high" ? "text-red-500 mt-0.5" : "text-amber-500 mt-0.5"}>&#9679;</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
                {flags.length > 0 && (() => {
                  // Answer-specific Z codes for this domain's questions
                  const domainQs = AHC_QUESTIONS.filter((q) => q.domain === d.id);
                  const allCodes = domainQs.flatMap((q) =>
                    getZCodesForAhcAnswer(q.id, answers[q.id] as string | string[] | undefined)
                  );
                  const uniqueCodes = allCodes.filter(
                    (c, i, arr) => arr.findIndex((x) => x.code === c.code) === i
                  );
                  if (uniqueCodes.length === 0) return null;
                  return (
                    <div className="border-t border-cs-border pt-3 mt-3">
                      <p className="font-body text-xs text-cs-text/50 mb-1">{lang === "es" ? "Códigos Z del ICD-10 sugeridos:" : "Suggested ICD-10 Z codes:"}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {uniqueCodes.map((c) => (
                          <span key={c.code} className="font-mono text-xs bg-cs-badge text-cs-blue-dark px-2 py-0.5 rounded">
                            {c.code} {c.description}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })}

          <div className="border-t border-cs-border pt-6 flex gap-4">
            <button
              onClick={() => setShowResults(false)}
              className="font-body text-sm font-medium text-cs-blue border border-cs-blue/30 hover:border-cs-blue px-5 py-2.5 rounded-lg transition-colors"
            >
              {lang === "es" ? "Volver a las Preguntas" : "Back to Questions"}
            </button>
            <button
              onClick={() => { setAnswers({}); setShowResults(false); setActiveDomain(AHC_DOMAINS[0].id); setSaved(false); setTagTract(false); setTractError(null); }}
              className="font-body text-sm font-medium text-cs-text-muted border border-cs-text/20 hover:border-cs-text/40 px-5 py-2.5 rounded-lg transition-colors"
            >
              {lang === "es" ? "Comenzar de Nuevo" : "Start Over"}
            </button>
            <button
              onClick={handleSaveResult}
              disabled={saved || savingTract}
              className={`font-body text-sm font-medium px-5 py-2.5 rounded-lg transition-colors ${
                saved
                  ? "bg-green-100 text-green-700 border border-green-200"
                  : "text-white bg-cs-blue hover:bg-cs-blue-dark disabled:opacity-60"
              }`}
            >
              {savingTract
                ? (lang === "es" ? "Obteniendo ubicación..." : "Getting location...")
                : saved
                ? (lang === "es" ? "Guardado en el registro" : "Saved to Log")
                : (lang === "es" ? "Guardar Resultado" : "Save to Screening Log")}
            </button>
          </div>

          {!saved && (
            <div className="rounded-lg border border-cs-border bg-white p-3 space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tagTract}
                  onChange={(e) => { setTagTract(e.target.checked); setTractError(null); }}
                  className="accent-cs-blue mt-0.5"
                />
                <div className="flex-1">
                  <p className="font-body text-sm text-cs-text">
                    {lang === "es" ? "Etiquetar con tracto censal (anónimo)" : "Tag with census tract (anonymous)"}
                  </p>
                  <p className="font-body text-xs text-cs-text/50 mt-0.5">
                    {lang === "es"
                      ? "Usa la ubicación del dispositivo para identificar el tracto censal de EE. UU. Solo se guarda el código FIPS del tracto (desidentificado por estándar HIPAA). No se almacena latitud/longitud."
                      : "Uses device location to identify the US Census tract. Only the tract FIPS code is saved (HIPAA Safe Harbor de-identified). No lat/lon is stored."}
                  </p>
                </div>
              </label>
              <TractLocationTest lang={lang} />
              {tractError && (
                <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-600 shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p className="font-body text-xs text-red-700">{tractError}</p>
                </div>
              )}
            </div>
          )}

          <div className="rounded-lg bg-cs-bg p-4">
            <p className="font-body text-xs text-cs-text/50">
              <strong className="text-cs-text/70">{lang === "es" ? "Aviso:" : "Disclaimer:"}</strong>{" "}
              {lang === "es"
                ? "Esta herramienta implementa el instrumento de evaluación AHC-HRSN desarrollado por CMS. Los resultados guardados se almacenan solo en el almacenamiento local de su navegador. No se transmiten datos a Cleansheet. Si opta por etiquetar el tracto censal, la ubicación de su navegador se envía a un geocodificador público del gobierno de EE. UU. (FCC primario, US Census Bureau como respaldo) para determinar el código FIPS del tracto; no se conserva la latitud/longitud. Consulte a su equipo clínico para la interpretación y planificación del cuidado. Esto no es un dispositivo médico."
                : "This tool implements the CMS-developed AHC-HRSN screening instrument. Results saved to the screening log are stored in your browser's local storage only. No data is transmitted to Cleansheet. If you opt in to census tract tagging, your browser's location is sent to a public US government geocoder (FCC primary, US Census Bureau fallback) to determine the tract FIPS code; the lat/lon is not retained. Consult your clinical team for interpretation and care planning. This is not a medical device."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function AhcQuestionCard({ question, answer, onAnswer, onToggle, lang = "en", tts }: {
  question: AhcQuestion;
  answer: string | string[] | undefined;
  onAnswer: (qId: string, value: string | string[] | number) => void;
  onToggle: (qId: string, value: string) => void;
  lang?: Lang;
  tts: ReturnType<typeof useTTS>;
}) {
  const questionText = t(question.text, question.textEs, lang);
  const readAllId = `${question.id}:all`;

  // Build "read all" text + segments for karaoke-style highlighting sync
  const readAllSegments: SpeakSegment[] = [
    { id: question.id, start: 0, end: questionText.length },
  ];
  const parts: string[] = [questionText];
  let cursor = questionText.length;
  for (const opt of question.options) {
    const optText = t(opt.label, opt.labelEs, lang);
    const sep = ". ";
    const segStart = cursor + sep.length;
    parts.push(optText);
    readAllSegments.push({ id: `${question.id}:${opt.value}`, start: segStart, end: segStart + optText.length });
    cursor = segStart + optText.length;
  }
  const readAllText = parts.join(". ");

  return (
    <div className="border border-cs-border rounded-lg p-5 bg-white">
      <div className="flex items-start gap-2 mb-3">
        <p className="font-body text-sm text-cs-text flex-1">
          <HighlightedText text={questionText} localCharIndex={getHighlightPosition(question.id, tts)} />
        </p>
        <button
          type="button"
          onClick={() => tts.speak(readAllId, readAllText, lang, readAllSegments)}
          className={`shrink-0 px-2 py-1 rounded-md text-[11px] font-body font-medium transition-colors ${
            tts.speakingId === readAllId
              ? "text-cs-blue bg-cs-blue/10"
              : "text-cs-text/40 hover:text-cs-blue hover:bg-cs-blue/5"
          }`}
          aria-label={lang === "es" ? "Leer pregunta y opciones" : "Read question and options"}
        >
          {tts.speakingId === readAllId
            ? (lang === "es" ? "Detener" : "Stop")
            : (lang === "es" ? "Leer todo" : "Read all")}
        </button>
        <SpeakerButton
          isActive={tts.speakingId === question.id}
          onClick={() => tts.speak(question.id, questionText, lang)}
        />
      </div>

      {question.type === "radio" && (
        <div className="space-y-2">
          {question.options.map((opt) => {
            const optText = t(opt.label, opt.labelEs, lang);
            const optId = `${question.id}:${opt.value}`;
            return (
              <div key={opt.value} className="flex items-center gap-1">
                <label className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors flex-1 ${
                  answer === opt.value
                    ? opt.isPositiveScreen ? "bg-red-50 border border-red-200" : "bg-cs-badge border border-cs-blue/20"
                    : "hover:bg-cs-bg border border-transparent"
                }`}>
                  <input
                    type="radio"
                    name={question.id}
                    value={opt.value}
                    checked={answer === opt.value}
                    onChange={() => onAnswer(question.id, opt.value)}
                    className="accent-cs-blue"
                  />
                  <HighlightedText
                    text={optText}
                    localCharIndex={getHighlightPosition(optId, tts)}
                    className="font-body text-sm text-cs-text"
                  />
                </label>
                <SpeakerButton
                  size="sm"
                  isActive={tts.speakingId === optId}
                  onClick={(e) => { e.preventDefault(); tts.speak(optId, optText, lang); }}
                />
              </div>
            );
          })}
        </div>
      )}

      {question.type === "checkbox" && (
        <div className="space-y-2">
          {question.options.map((opt) => {
            const checked = Array.isArray(answer) && answer.includes(opt.value);
            const optText = t(opt.label, opt.labelEs, lang);
            const optId = `${question.id}:${opt.value}`;
            return (
              <div key={opt.value} className="flex items-center gap-1">
                <label className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors flex-1 ${
                  checked
                    ? opt.isPositiveScreen ? "bg-red-50 border border-red-200" : "bg-cs-badge border border-cs-blue/20"
                    : "hover:bg-cs-bg border border-transparent"
                }`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(question.id, opt.value)}
                    className="accent-cs-blue rounded"
                  />
                  <HighlightedText
                    text={optText}
                    localCharIndex={getHighlightPosition(optId, tts)}
                    className="font-body text-sm text-cs-text"
                  />
                </label>
                <SpeakerButton
                  size="sm"
                  isActive={tts.speakingId === optId}
                  onClick={(e) => { e.preventDefault(); tts.speak(optId, optText, lang); }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Z Code Reference ─────────────────────────────────────────────────────────

function ZCodeReference() {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return Z_CODE_CATEGORIES;
    const q = search.toLowerCase();
    return Z_CODE_CATEGORIES.map((cat) => ({
      ...cat,
      codes: cat.codes.filter(
        (c) => c.code.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.codes.length > 0);
  }, [search]);

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search Z codes by code or description..."
        className="w-full px-4 py-2.5 text-sm rounded-lg border border-cs-border text-cs-text placeholder:text-cs-text/30 focus:outline-none focus:ring-1 focus:ring-cs-blue mb-6"
      />

      <div className="space-y-3">
        {filtered.map((cat) => (
          <div key={cat.range} className="border border-cs-border rounded-lg overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === cat.range ? null : cat.range)}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-cs-bg transition-colors text-left"
            >
              <div>
                <span className="font-heading text-base text-cs-text">{cat.range}</span>
                <span className="font-body text-sm text-cs-text/60 ml-2">{cat.title}</span>
              </div>
              <span className="font-body text-xs text-cs-text/40">{cat.codes.length} codes</span>
            </button>
            {(expanded === cat.range || search.trim()) && (
              <div className="border-t border-cs-border">
                {cat.codes.map((c) => (
                  <div key={c.code} className="flex items-baseline gap-3 px-5 py-2 border-b border-cs-border last:border-b-0 hover:bg-cs-bg/50">
                    <span className="font-mono text-sm text-cs-blue font-medium shrink-0">{c.code}</span>
                    <span className="font-body text-sm text-cs-text/80">{c.description}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Screening Log ───────────────────────────────────────────────────────────

function ScreeningLogView() {
  const [log, setLog] = useState<ScreeningLogEntry[]>(getScreeningLog);
  const [confirmClear, setConfirmClear] = useState(false);

  // Refresh log when tab becomes visible (in case screenings were saved in another tab)
  useEffect(() => {
    setLog(getScreeningLog());
  }, []);

  const handleExport = useCallback(() => {
    const csv = exportScreeningLogCSV();
    if (!csv) return;
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadCSV(csv, `screening-log-${timestamp}.csv`);
  }, []);

  const handleClear = useCallback(() => {
    clearScreeningLog();
    setLog([]);
    setConfirmClear(false);
  }, []);

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="font-body text-sm text-cs-text/60">
          {log.length} screening{log.length !== 1 ? "s" : ""} saved
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={log.length === 0}
            className="font-body text-sm font-medium text-white bg-cs-blue hover:bg-cs-blue-dark px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
          >
            Export CSV
          </button>
          {!confirmClear ? (
            <button
              onClick={() => setConfirmClear(true)}
              disabled={log.length === 0}
              className="font-body text-sm font-medium text-cs-text-muted border border-cs-text/20 hover:border-red-300 hover:text-red-600 px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
            >
              Clear All
            </button>
          ) : (
            <button
              onClick={handleClear}
              className="font-body text-sm font-medium text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
            >
              Confirm Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {log.length > 0 ? (
        <div className="overflow-x-auto border border-cs-border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-cs-bg">
              <tr>
                <th className="text-left px-4 py-2 font-body font-medium text-cs-text">Date</th>
                <th className="text-left px-4 py-2 font-body font-medium text-cs-text">Instrument</th>
                <th className="text-left px-4 py-2 font-body font-medium text-cs-text">Risk</th>
                <th className="text-left px-4 py-2 font-body font-medium text-cs-text">Domains</th>
                <th className="text-left px-4 py-2 font-body font-medium text-cs-text">Flags</th>
                <th className="text-left px-4 py-2 font-body font-medium text-cs-text">Tract</th>
                <th className="text-left px-4 py-2 font-body font-medium text-cs-text">Z Codes</th>
              </tr>
            </thead>
            <tbody>
              {log.slice().reverse().map((entry) => (
                <tr key={entry.id} className="border-t border-cs-border hover:bg-cs-bg/50">
                  <td className="px-4 py-2 font-body text-cs-text whitespace-nowrap">{new Date(entry.date).toLocaleDateString()}</td>
                  <td className="px-4 py-2">
                    <span className={`font-body text-xs font-medium px-2 py-0.5 rounded-full ${
                      entry.instrument === "PRAPARE" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                    }`}>
                      {entry.instrument}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`font-body text-xs font-medium ${
                      entry.overallRisk === "Low" ? "text-green-600" :
                      entry.overallRisk === "Moderate" || entry.overallRisk === "Medium" ? "text-amber-600" :
                      "text-red-600"
                    }`}>
                      {entry.overallRisk}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-body text-cs-text/70">{entry.domainsWithFlags}/{entry.domains.length}</td>
                  <td className="px-4 py-2 font-body text-cs-text/70">{entry.totalFlags}</td>
                  <td className="px-4 py-2 font-mono text-xs text-cs-text/70" title={entry.county && entry.state ? `${entry.county}, ${entry.state}` : ""}>
                    {entry.censusTract || <span className="text-cs-text/30">—</span>}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1">
                      {entry.suggestedZCodes.slice(0, 3).map((z) => (
                        <span key={z} className="font-mono text-[10px] bg-cs-badge text-cs-blue-dark px-1.5 py-0.5 rounded">{z}</span>
                      ))}
                      {entry.suggestedZCodes.length > 3 && (
                        <span className="font-body text-[10px] text-cs-text/40">+{entry.suggestedZCodes.length - 3}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border border-cs-border rounded-lg bg-white p-12 text-center">
          <p className="font-body text-sm text-cs-text/40 mb-2">No screenings saved yet</p>
          <p className="font-body text-xs text-cs-text/30">Complete a PRAPARE or AHC-HRSN screening and click "Save to Screening Log" on the results page.</p>
        </div>
      )}

      {/* Summary stats */}
      {log.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(() => {
            const prapare = log.filter((e) => e.instrument === "PRAPARE");
            const ahc = log.filter((e) => e.instrument === "AHC-HRSN");
            const highRisk = log.filter((e) => e.overallRisk === "High");
            const tagged = log.filter((e) => e.censusTract).length;
            const uniqueTracts = new Set(log.map((e) => e.censusTract).filter(Boolean)).size;
            return [
              { label: "PRAPARE", value: String(prapare.length) },
              { label: "AHC-HRSN", value: String(ahc.length) },
              { label: "High Risk", value: String(highRisk.length) },
              { label: "Unique Tracts", value: tagged > 0 ? `${uniqueTracts} of ${tagged} tagged` : "—" },
            ];
          })().map((s) => (
            <div key={s.label} className="border border-cs-border rounded-lg bg-white p-3">
              <p className="font-body text-[11px] text-cs-text/50">{s.label}</p>
              <p className="font-heading text-lg text-cs-text">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg bg-cs-bg p-4">
        <p className="font-body text-xs text-cs-text/50">
          <strong className="text-cs-text/70">Storage:</strong> All screening log data is stored in your browser's
          local storage. Nothing is transmitted to Cleansheet. Export as CSV to open in Excel, Google Sheets, or
          any spreadsheet application. No patient-identifying information is stored -- only dates, risk levels,
          domain scores, suggested Z codes, and optionally a census tract FIPS code if you opted in at save time
          (tract codes are HIPAA Safe Harbor de-identifiable; lat/lon is never retained).
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "about" | "prapare" | "ahc-hrsn" | "zcodes" | "svi-map" | "log";
const VALID_TABS: Tab[] = ["about", "prapare", "ahc-hrsn", "zcodes", "svi-map", "log"];

function parseHash(): Tab {
  const hash = window.location.hash.replace("#", "");
  return VALID_TABS.includes(hash as Tab) ? (hash as Tab) : "about";
}

function ShareButton({ tab }: { tab: Tab }) {
  const [copied, setCopied] = useState(false);

  const share = useCallback(() => {
    const url = `${window.location.origin}${window.location.pathname}#${tab}`;
    const titles: Record<Tab, string> = { about: "Community Health Tools", prapare: "PRAPARE Screening Tool", "ahc-hrsn": "AHC-HRSN Screening Tool", zcodes: "ICD-10 Z Code Reference", "svi-map": "CDC Social Vulnerability Index Map", log: "Screening Log" };
    if (navigator.share) {
      navigator.share({ title: titles[tab], url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }, [tab]);

  return (
    <button
      onClick={share}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-body font-medium text-cs-text-muted hover:text-cs-blue hover:bg-cs-blue/5 transition-colors"
      aria-label="Share link"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <polyline points="16 6 12 2 8 6" />
        <line x1="12" y1="2" x2="12" y2="15" />
      </svg>
      {copied ? "Copied!" : "Share"}
    </button>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>(parseHash);

  // Sync hash → state
  useEffect(() => {
    const onHash = () => setActiveTab(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Sync state → hash
  const navigate = useCallback((tab: Tab) => {
    window.location.hash = tab;
    setActiveTab(tab);
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="bg-cs-dark text-white px-6 py-20">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block font-body text-xs font-medium tracking-wider uppercase bg-white/10 text-white/80 px-3 py-1 rounded-full mb-6">
            Open Source &middot; Apache 2.0
          </span>
          <h1 className="font-heading text-3xl mb-4">
            Community Health Tools
          </h1>
          <p className="font-body font-light text-xl text-white/90 leading-snug mb-6">
            Free SDOH screening, Z code documentation, and population health
            resources. Built for community health centers, public health
            departments, and anyone working to address social determinants.
          </p>
          <p className="font-body font-light text-sm text-white/60 leading-relaxed">
            No accounts. No data collection. No cost. These tools run entirely
            in your browser. Nothing is transmitted or stored. Built on the
            Cleansheet clinical design system.
          </p>
        </div>
      </section>

      {/* Tab navigation */}
      <section className="bg-white border-b border-cs-border sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex items-center">
            <div className="flex gap-1 flex-1">
              {[
                { id: "about" as const, label: "About" },
                { id: "prapare" as const, label: "PRAPARE" },
                { id: "ahc-hrsn" as const, label: "AHC-HRSN" },
                // { id: "svi-map" as const, label: "SVI Map" }, // hidden pending data pipeline
                { id: "zcodes" as const, label: "Z Codes" },
                { id: "log" as const, label: "Log" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => navigate(tab.id)}
                  className={`px-4 py-3 text-sm font-body font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-cs-blue text-cs-blue"
                      : "border-transparent text-cs-text-muted hover:text-cs-text"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {activeTab !== "about" && <ShareButton tab={activeTab} />}
          </div>
        </div>
      </section>

      {/* About tab */}
      {activeTab === "about" && (
        <>
          <section className="bg-cs-bg px-6 py-20">
            <div className="max-w-3xl mx-auto">
              <h2 className="font-heading text-2xl text-cs-text mb-6">
                Why These Tools Exist
              </h2>
              <div className="space-y-6 font-body font-light text-lg text-cs-text leading-relaxed">
                <p>
                  Social determinants of health account for 30-55% of health outcomes.
                  Housing, food access, transportation, employment, and social connection
                  drive more outcomes than clinical care alone. Yet most clinical environments
                  lack good tools for screening and documenting these factors.
                </p>
                <p>
                  PRAPARE is the most widely adopted SDOH screening instrument, used by
                  community health centers nationwide. ICD-10 Z codes (Z55-Z65) are how
                  social determinants are documented in the medical record. Both are
                  critical for CMS quality reporting, HEDIS measures, and value-based
                  care contracts. Both are typically implemented as paper forms or
                  clunky EHR builds.
                </p>
                <p>
                  These tools are free, open source (Apache 2.0), and designed to work
                  on any device with a browser. They are published by Cleansheet LLC as
                  a community service.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white px-6 py-20">
            <div className="max-w-3xl mx-auto">
              <h2 className="font-heading text-2xl text-cs-text mb-8">
                Available Tools
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => navigate("prapare")}
                  className="border border-cs-text/10 rounded-lg p-6 text-left hover:border-cs-blue/30 transition-colors"
                >
                  <h3 className="font-heading text-lg text-cs-text mb-1">
                    PRAPARE Screening
                  </h3>
                  <p className="font-body text-sm text-cs-text/60 leading-relaxed">
                    15-item SDOH screening (NACHC). Domain-level risk identification,
                    auto-suggested Z codes. Bilingual English/Spanish with text-to-speech.
                  </p>
                </button>
                <button
                  onClick={() => navigate("ahc-hrsn")}
                  className="border border-cs-text/10 rounded-lg p-6 text-left hover:border-cs-blue/30 transition-colors"
                >
                  <h3 className="font-heading text-lg text-cs-text mb-1">
                    AHC-HRSN Screening
                  </h3>
                  <p className="font-body text-sm text-cs-text/60 leading-relaxed">
                    10-item brief screening (CMS). Risk stratification by domain,
                    Z code mapping. Suitable for universal screening at intake.
                  </p>
                </button>
                {/* SVI Map card hidden pending data pipeline research
                <button
                  onClick={() => navigate("svi-map")}
                  className="border border-cs-text/10 rounded-lg p-6 text-left hover:border-cs-blue/30 transition-colors"
                >
                  <h3 className="font-heading text-lg text-cs-text mb-1">
                    CDC SVI Map
                  </h3>
                  <p className="font-body text-sm text-cs-text/60 leading-relaxed">
                    Interactive Social Vulnerability Index map at census tract level.
                    Four themes, facility overlay, upload your own data.
                  </p>
                </button>
                */}
                <button
                  onClick={() => navigate("zcodes")}
                  className="border border-cs-text/10 rounded-lg p-6 text-left hover:border-cs-blue/30 transition-colors"
                >
                  <h3 className="font-heading text-lg text-cs-text mb-1">
                    ICD-10 Z Code Reference
                  </h3>
                  <p className="font-body text-sm text-cs-text/60 leading-relaxed">
                    Searchable reference for SDOH codes (Z55-Z65). 70+ codes with
                    screening-to-Z-code mapping tables.
                  </p>
                </button>
              </div>
            </div>
          </section>

          {/* Beyond the self-service tools */}
          <section className="bg-cs-dark text-white px-6 py-20">
            <div className="max-w-3xl mx-auto">
              <h2 className="font-heading text-2xl mb-3">
                Beyond the Self-Service Tools
              </h2>
              <p className="font-body font-light text-sm text-white/70 leading-relaxed mb-8">
                These tools are designed to be self-deploy and self-operate. If that's not
                what you need, here are the options.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Self-host */}
                <a
                  href="https://github.com/CleansheetLLC/community-health"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-white/15 bg-white/5 p-5 hover:border-white/40 hover:bg-white/10 transition-colors"
                >
                  <div className="font-body text-[10px] uppercase tracking-wider text-white/50 mb-2">Free · Apache 2.0</div>
                  <h3 className="font-heading text-base mb-2">Self-host or fork</h3>
                  <p className="font-body font-light text-xs text-white/70 leading-relaxed mb-4">
                    Clone the repo, deploy on Cloudflare Pages, Azure Static Web Apps, or any
                    static host. Deploy guide in the README. Bug reports and questions welcome
                    as GitHub issues.
                  </p>
                  <span className="font-body text-xs font-medium text-cs-blue">View on GitHub →</span>
                </a>

                {/* Custom instruments */}
                <a
                  href="mailto:hello@cleansheet.dev?subject=Custom%20screening%20instrument"
                  className="rounded-lg border border-white/15 bg-white/5 p-5 hover:border-white/40 hover:bg-white/10 transition-colors"
                >
                  <div className="font-body text-[10px] uppercase tracking-wider text-white/50 mb-2">Scoped engagement</div>
                  <h3 className="font-heading text-base mb-2">Additional screening instruments</h3>
                  <p className="font-body font-light text-xs text-white/70 leading-relaxed mb-4">
                    PHQ-9, GAD-7, ACEs, or a facility-specific instrument built on the same
                    foundation (bilingual, TTS, Z code mapping, CSV export). Fixed scope and
                    fixed cost. We build it, you host it.
                  </p>
                  <span className="font-body text-xs font-medium text-cs-blue">Email us to scope →</span>
                </a>

                {/* Platform integration */}
                <a
                  href="#about"
                  className="rounded-lg border border-white/15 bg-white/5 p-5 hover:border-white/40 hover:bg-white/10 transition-colors"
                >
                  <div className="font-body text-[10px] uppercase tracking-wider text-white/50 mb-2">Clinical platform</div>
                  <h3 className="font-heading text-base mb-2">EHR integration &amp; population analytics</h3>
                  <p className="font-body font-light text-xs text-white/70 leading-relaxed mb-4">
                    Aggregate SDOH dashboards across facilities, FHIR DocumentReference
                    write-back to your EHR, attestation-gated clinician review, and CIP-level
                    population health reporting. This is the Cleansheet clinical platform.
                  </p>
                  <span className="font-body text-xs font-medium text-cs-blue">Learn more →</span>
                </a>
              </div>

              <p className="font-body text-xs text-white/40 mt-6 leading-relaxed">
                We're a small team building tools, not a managed service provider. For hands-on
                deployment, day-to-day operations, or round-the-clock support of a self-hosted
                instance, you'll want a local IT partner alongside us. Happy to suggest one if
                it helps.
              </p>
            </div>
          </section>

          <section className="bg-cs-bg px-6 py-20">
            <div className="max-w-3xl mx-auto">
              <h2 className="font-heading text-2xl text-cs-text mb-6">
                Privacy
              </h2>
              <div className="space-y-4 font-body font-light text-lg text-cs-text leading-relaxed">
                <p>
                  These tools run entirely in your browser. No data is transmitted
                  to Cleansheet or any third party. There are no cookies, no
                  analytics on screening content, and no accounts.
                </p>
                <p>
                  When you save a screening result to the log, it is stored in your
                  browser's local storage on your device only. No patient-identifying
                  information is saved -- only dates, risk levels, domain scores, and
                  suggested Z codes. You can export the log as CSV and clear it at
                  any time. Unsaved screening responses are discarded when you close
                  the page.
                </p>
                <p>
                  <strong>Optional census tract tagging:</strong> When saving a
                  screening you can opt in to tag the result with a US Census tract
                  FIPS code. If you do, your browser's location is sent once to a
                  public US government geocoder (FCC Block API as primary, US
                  Census Bureau geocoder as fallback) to look up the tract; the
                  lat/lon coordinates are discarded and only the tract FIPS (HIPAA
                  Safe Harbor de-identifiable, ~4,000 people per tract) is stored.
                  Successful lookups are cached in your browser for 30 days so
                  repeated screenings at the same location don't re-query the API.
                  This enables cross-referencing with CDC SVI scores and aggregate
                  geographic reporting for community needs assessments.
                </p>
                <p>
                  If your organization needs EHR integration or population-level
                  SDOH dashboards, those capabilities are available through the{" "}
                  <a href="#about" className="text-cs-blue hover:underline">Cleansheet clinical platform</a>.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white px-6 py-20">
            <div className="max-w-3xl mx-auto text-center">
              <p className="font-body text-sm text-cs-text/40">
                PRAPARE instrument copyright NACHC 2019. Freely available for use.
                AHC-HRSN screening tool developed by CMS (public domain).
                ICD-10-CM codes are public domain. These tools are published under
                the Apache 2.0 license. Source code available on{" "}
                <a href="https://github.com/CleansheetLLC/community-health" target="_blank" rel="noopener noreferrer" className="text-cs-blue hover:underline">
                  GitHub
                </a>.
              </p>
              <p className="font-body text-xs text-cs-text/30 mt-4">
                Built by{" "}
                <a href="#home" className="hover:text-cs-text/50">Cleansheet LLC</a>
                {" "}&middot; Delaware, 2025
              </p>
            </div>
          </section>
        </>
      )}

      {/* PRAPARE tab */}
      {activeTab === "prapare" && (
        <section className="bg-cs-bg px-6 py-12">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <h2 className="font-heading text-2xl text-cs-text mb-2">
                PRAPARE Screening Tool
              </h2>
              <p className="font-body text-sm text-cs-text/60">
                Protocol for Responding to and Assessing Patients' Assets, Risks, and Experiences
                (NACHC, 2019). LOINC Panel 93025-5.
              </p>
            </div>
            <PrapareScreening />
          </div>
        </section>
      )}

      {/* AHC-HRSN tab */}
      {activeTab === "ahc-hrsn" && (
        <section className="bg-cs-bg px-6 py-12">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <h2 className="font-heading text-2xl text-cs-text mb-2">
                AHC-HRSN Screening Tool
              </h2>
              <p className="font-body text-sm text-cs-text/60">
                Accountable Health Communities Health-Related Social Needs Screening.
                CMS-developed instrument. LOINC Panel 96777-8. 10 core items across
                5 domains.
              </p>
            </div>
            <AhcHrsnScreening />
          </div>
        </section>
      )}

      {/* SVI Map tab */}
      {activeTab === "svi-map" && (
        <section className="bg-cs-bg px-6 py-12">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <h2 className="font-heading text-2xl text-cs-text mb-2">
                CDC Social Vulnerability Index Map
              </h2>
              <p className="font-body text-sm text-cs-text/60">
                Census tract-level social vulnerability data from CDC/ATSDR. Four themes:
                socioeconomic status, household characteristics, minority status, and housing/transportation.
              </p>
            </div>
            <SVIMapView />
          </div>
        </section>
      )}

      {/* Screening Log tab */}
      {activeTab === "log" && (
        <section className="bg-cs-bg px-6 py-12">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <h2 className="font-heading text-2xl text-cs-text mb-2">
                Screening Log
              </h2>
              <p className="font-body text-sm text-cs-text/60">
                Accumulated screening results from PRAPARE and AHC-HRSN. Export as CSV
                for population health reporting, grant applications, and community needs assessments.
              </p>
            </div>
            <ScreeningLogView />
          </div>
        </section>
      )}

      {/* Z Codes tab */}
      {activeTab === "zcodes" && (
        <section className="bg-cs-bg px-6 py-12">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <h2 className="font-heading text-2xl text-cs-text mb-2">
                ICD-10 Z Code Reference
              </h2>
              <p className="font-body text-sm text-cs-text/60">
                Social Determinants of Health codes (Z55-Z65). Use these codes to document
                social risk factors identified through SDOH screening.
              </p>
            </div>
            <ZCodeReference />

            {/* PRAPARE to Z Code mapping */}
            <div className="mt-12">
              <h3 className="font-heading text-lg text-cs-text mb-4">
                PRAPARE Screening to Z Code Mapping
              </h3>
              <p className="font-body text-sm text-cs-text/60 mb-4">
                When a PRAPARE screening identifies a positive risk factor, these are the
                corresponding Z codes for clinical documentation.
              </p>
              <div className="border border-cs-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-cs-bg">
                    <tr>
                      <th className="text-left px-4 py-2 font-body font-medium text-cs-text">Domain</th>
                      <th className="text-left px-4 py-2 font-body font-medium text-cs-text">Positive Screen</th>
                      <th className="text-left px-4 py-2 font-body font-medium text-cs-text">Z Code(s)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Z_CODE_MAPPINGS.map((m) => (
                      <tr key={m.domain} className="border-t border-cs-border">
                        <td className="px-4 py-2 font-body font-medium text-cs-text">{m.domain}</td>
                        <td className="px-4 py-2 font-body text-cs-text/70">{m.trigger}</td>
                        <td className="px-4 py-2">
                          {m.codes.map((c) => (
                            <div key={c.code} className="font-mono text-xs text-cs-blue">
                              {c.code} <span className="text-cs-text/50 font-body">{c.description}</span>
                            </div>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
