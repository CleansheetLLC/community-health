import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  QUESTIONS, DOMAINS, Z_CODE_MAPPINGS, Z_CODE_CATEGORIES,
  type PrapareQuestion, type Lang,
} from "./prapare";
import {
  AHC_QUESTIONS, AHC_DOMAINS, AHC_Z_CODE_MAPPINGS,
  type AhcQuestion,
} from "./ahc-hrsn";
import SVIMapView from "./SVIMap";

function t(en: string, es: string | undefined, lang: Lang): string {
  return lang === "es" && es ? es : en;
}

// ─── Text-to-Speech ──────────────────────────────────────────────────────────

const LANG_VOICE_MAP: Record<Lang, string> = { en: "en-US", es: "es-MX" };

function useTTS() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((id: string, text: string, lang: Lang) => {
    // If already speaking this item, stop
    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }
    // Cancel anything in progress
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANG_VOICE_MAP[lang];
    utterance.rate = 0.9;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    utteranceRef.current = utterance;
    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  }, [speakingId]);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeakingId(null);
  }, []);

  return { speak, stop, speakingId };
}

function SpeakerButton({ isActive, onClick }: { isActive: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isActive ? "Stop reading" : "Read aloud"}
      className={`shrink-0 p-1.5 rounded-md transition-colors ${
        isActive
          ? "text-cs-blue bg-cs-blue/10"
          : "text-cs-text/30 hover:text-cs-blue hover:bg-cs-blue/5"
      }`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
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
                      {/* Show relevant Z codes for this domain */}
                      {Z_CODE_MAPPINGS
                        .filter((m) => {
                          const domainLower = d.label.toLowerCase();
                          return m.domain.toLowerCase().includes(domainLower.split(" ")[0]) ||
                            flags.some((f) => f.toLowerCase().includes(m.domain.toLowerCase()));
                        })
                        .flatMap((m) => m.codes)
                        .filter((c, i, arr) => arr.findIndex((x) => x.code === c.code) === i)
                        .slice(0, 4)
                        .map((c) => (
                          <span key={c.code} className="font-mono text-xs bg-cs-badge text-cs-blue-dark px-2 py-0.5 rounded">
                            {c.code} {c.description}
                          </span>
                        ))}
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
              onClick={() => { setAnswers({}); setShowResults(false); setActiveDomain(DOMAINS[0].id); }}
              className="font-body text-sm font-medium text-cs-text-muted border border-cs-text/20 hover:border-cs-text/40 px-5 py-2.5 rounded-lg transition-colors"
            >
              {lang === "es" ? "Comenzar de Nuevo" : "Start Over"}
            </button>
          </div>

          <div className="rounded-lg bg-cs-bg p-4">
            <p className="font-body text-xs text-cs-text/50">
              <strong className="text-cs-text/70">Disclaimer:</strong> This tool implements the published
              PRAPARE screening instrument (NACHC, 2019). It does not collect, transmit, or store any data.
              All responses remain in your browser and are cleared when you close this page. Consult your
              clinical team for interpretation and care planning. This is not a medical device.
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

  return (
    <div className="border border-cs-border rounded-lg p-5 bg-white">
      <div className="flex items-start gap-2 mb-3">
        <p className="font-body text-sm text-cs-text flex-1">{questionText}</p>
        <SpeakerButton
          isActive={tts.speakingId === question.id}
          onClick={() => tts.speak(question.id, questionText, lang)}
        />
      </div>

      {question.type === "radio" && question.options && (
        <div className="space-y-2">
          {question.options.map((opt) => (
            <label key={opt.value} className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${
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
              <span className={`font-body text-sm ${opt.isDecline ? "text-cs-text/40 italic" : "text-cs-text"}`}>
                {t(opt.label, opt.labelEs, lang)}
              </span>
            </label>
          ))}
        </div>
      )}

      {question.type === "checkbox" && question.options && (
        <div className="space-y-2">
          {question.options.map((opt) => {
            const checked = Array.isArray(answer) && answer.includes(opt.value);
            return (
              <label key={opt.value} className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${
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
                <span className={`font-body text-sm ${opt.isDecline ? "text-cs-text/40 italic" : "text-cs-text"}`}>
                  {t(opt.label, opt.labelEs, lang)}
                </span>
              </label>
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
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
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
                {flags.length > 0 && (
                  <div className="border-t border-cs-border pt-3 mt-3">
                    <p className="font-body text-xs text-cs-text/50 mb-1">{lang === "es" ? "Códigos Z del ICD-10 sugeridos:" : "Suggested ICD-10 Z codes:"}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {AHC_Z_CODE_MAPPINGS
                        .filter((m) => m.domain.toLowerCase().includes(d.label.toLowerCase().split(" ")[0]))
                        .flatMap((m) => m.codes)
                        .filter((c, i, arr) => arr.findIndex((x) => x.code === c.code) === i)
                        .map((c) => (
                          <span key={c.code} className="font-mono text-xs bg-cs-badge text-cs-blue-dark px-2 py-0.5 rounded">
                            {c.code} {c.description}
                          </span>
                        ))}
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
              onClick={() => { setAnswers({}); setShowResults(false); setActiveDomain(AHC_DOMAINS[0].id); }}
              className="font-body text-sm font-medium text-cs-text-muted border border-cs-text/20 hover:border-cs-text/40 px-5 py-2.5 rounded-lg transition-colors"
            >
              {lang === "es" ? "Comenzar de Nuevo" : "Start Over"}
            </button>
          </div>

          <div className="rounded-lg bg-cs-bg p-4">
            <p className="font-body text-xs text-cs-text/50">
              <strong className="text-cs-text/70">{lang === "es" ? "Aviso:" : "Disclaimer:"}</strong>{" "}
              {lang === "es"
                ? "Esta herramienta implementa el instrumento de evaluación AHC-HRSN desarrollado por CMS. No recopila, transmite ni almacena ningún dato. Todas las respuestas permanecen en su navegador y se eliminan cuando cierra esta página. Consulte a su equipo clínico para la interpretación y planificación del cuidado. Esto no es un dispositivo médico."
                : "This tool implements the CMS-developed AHC-HRSN screening instrument. It does not collect, transmit, or store any data. All responses remain in your browser and are cleared when you close this page. Consult your clinical team for interpretation and care planning. This is not a medical device."}
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

  return (
    <div className="border border-cs-border rounded-lg p-5 bg-white">
      <div className="flex items-start gap-2 mb-3">
        <p className="font-body text-sm text-cs-text flex-1">{questionText}</p>
        <SpeakerButton
          isActive={tts.speakingId === question.id}
          onClick={() => tts.speak(question.id, questionText, lang)}
        />
      </div>

      {question.type === "radio" && (
        <div className="space-y-2">
          {question.options.map((opt) => (
            <label key={opt.value} className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${
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
              <span className="font-body text-sm text-cs-text">
                {t(opt.label, opt.labelEs, lang)}
              </span>
            </label>
          ))}
        </div>
      )}

      {question.type === "checkbox" && (
        <div className="space-y-2">
          {question.options.map((opt) => {
            const checked = Array.isArray(answer) && answer.includes(opt.value);
            return (
              <label key={opt.value} className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${
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
                <span className="font-body text-sm text-cs-text">
                  {t(opt.label, opt.labelEs, lang)}
                </span>
              </label>
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

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "about" | "prapare" | "ahc-hrsn" | "zcodes" | "svi-map";
const VALID_TABS: Tab[] = ["about", "prapare", "ahc-hrsn", "zcodes", "svi-map"];

function parseHash(): Tab {
  const hash = window.location.hash.replace("#", "");
  return VALID_TABS.includes(hash as Tab) ? (hash as Tab) : "about";
}

function ShareButton({ tab }: { tab: Tab }) {
  const [copied, setCopied] = useState(false);

  const share = useCallback(() => {
    const url = `${window.location.origin}${window.location.pathname}#${tab}`;
    const titles: Record<Tab, string> = { about: "Community Health Tools", prapare: "PRAPARE Screening Tool", "ahc-hrsn": "AHC-HRSN Screening Tool", zcodes: "ICD-10 Z Code Reference", "svi-map": "CDC Social Vulnerability Index Map" };
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
                <a
                  href="https://github.com/CleansheetLLC/community-health"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-cs-text/10 rounded-lg p-6 text-left hover:border-cs-blue/30 transition-colors"
                >
                  <h3 className="font-heading text-lg text-cs-text mb-1">
                    Self-Host / Fork
                  </h3>
                  <p className="font-body text-sm text-cs-text/60 leading-relaxed">
                    Apache 2.0 on GitHub. Clone, build, deploy on your own
                    infrastructure. No dependencies on Cleansheet services.
                  </p>
                </a>
              </div>
            </div>
          </section>

          <section className="bg-cs-bg px-6 py-20">
            <div className="max-w-3xl mx-auto">
              <h2 className="font-heading text-2xl text-cs-text mb-6">
                Privacy
              </h2>
              <div className="space-y-4 font-body font-light text-lg text-cs-text leading-relaxed">
                <p>
                  These tools run entirely in your browser. No data is collected,
                  transmitted, or stored by Cleansheet. When you close the page,
                  your screening responses are gone. There are no cookies, no
                  analytics on screening content, and no accounts.
                </p>
                <p>
                  If your organization needs to save screening results, integrate
                  with your EHR, or track population-level SDOH data, those capabilities
                  are available through the{" "}
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
