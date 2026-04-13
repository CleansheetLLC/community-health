// AHC-HRSN Screening Instrument Data
// Source: CMS Accountable Health Communities Health-Related Social Needs Screening Tool
// LOINC Panel: 96777-8
// Public domain (CMS-developed instrument)

import type { Lang } from "./prapare";

export type AhcQuestionType = "radio" | "checkbox";

export interface AhcOption {
  label: string;
  labelEs?: string;
  value: string;
  loinc?: string;
  isPositiveScreen?: boolean;
}

export interface AhcQuestion {
  id: string;
  domain: string;
  loinc: string;
  text: string;
  textEs?: string;
  type: AhcQuestionType;
  options: AhcOption[];
}

export interface AhcDomain {
  id: string;
  label: string;
  labelEs?: string;
  description: string;
  descriptionEs?: string;
  loincGroup?: string;
}

export interface AhcZCodeMapping {
  domain: string;
  trigger: string;
  codes: { code: string; description: string }[];
}

// ─── Domains ──────────────────────────────────────────────────────────────────

export const AHC_DOMAINS: AhcDomain[] = [
  {
    id: "housing",
    label: "Housing Instability",
    labelEs: "Inestabilidad de Vivienda",
    description: "Living situation and housing quality concerns",
    descriptionEs: "Situación de vivienda y preocupaciones de calidad",
  },
  {
    id: "food",
    label: "Food Insecurity",
    labelEs: "Inseguridad Alimentaria",
    description: "Access to adequate food and nutrition",
    descriptionEs: "Acceso a alimentación y nutrición adecuada",
  },
  {
    id: "transportation",
    label: "Transportation Problems",
    labelEs: "Problemas de Transporte",
    description: "Reliable transportation access for daily needs",
    descriptionEs: "Acceso a transporte confiable para necesidades diarias",
  },
  {
    id: "utilities",
    label: "Utility Help Needs",
    labelEs: "Necesidades de Servicios Públicos",
    description: "Ability to maintain essential utility services",
    descriptionEs: "Capacidad para mantener servicios públicos esenciales",
  },
  {
    id: "safety",
    label: "Interpersonal Safety",
    labelEs: "Seguridad Interpersonal",
    description: "Physical and emotional safety in relationships",
    descriptionEs: "Seguridad física y emocional en las relaciones",
  },
];

// ─── Questions (10 Core Items) ───────────────────────────────────────────────

export const AHC_QUESTIONS: AhcQuestion[] = [
  // Domain: Housing Instability
  {
    id: "ahc1",
    domain: "housing",
    loinc: "71802-3",
    text: "What is your living situation today?",
    textEs: "¿Cuál es su situación de vivienda hoy?",
    type: "radio",
    options: [
      { label: "I have a steady place to live", labelEs: "Tengo un lugar estable donde vivir", value: "steady", loinc: "LA31993-1" },
      { label: "I have a place to live today, but I am worried about losing it in the future", labelEs: "Tengo un lugar donde vivir hoy, pero me preocupa perderlo en el futuro", value: "worried", loinc: "LA31994-9", isPositiveScreen: true },
      { label: "I do not have a steady place to live (I am staying with others, in a hotel, in a shelter, living outside on the street, on a beach, in a car, abandoned building, bus or train station, or in a park)", labelEs: "No tengo un lugar estable donde vivir (me quedo con otros, en un hotel, en un refugio, viviendo en la calle, en la playa, en un carro, edificio abandonado, estación de autobús o tren, o en un parque)", value: "unsteady", loinc: "LA31995-6", isPositiveScreen: true },
    ],
  },
  {
    id: "ahc2",
    domain: "housing",
    loinc: "93033-9",
    text: "Think about the place you live. Do you have problems with any of the following? (Check all that apply)",
    textEs: "Piense en el lugar donde vive. ¿Tiene problemas con alguno de los siguientes? (Marque todos los que apliquen)",
    type: "checkbox",
    options: [
      { label: "Pests such as bugs, ants, or mice", labelEs: "Plagas como insectos, hormigas o ratones", value: "pests", isPositiveScreen: true },
      { label: "Mold", labelEs: "Moho", value: "mold", isPositiveScreen: true },
      { label: "Lead paint or pipes", labelEs: "Pintura o tuberías de plomo", value: "lead", isPositiveScreen: true },
      { label: "Lack of heat", labelEs: "Falta de calefacción", value: "heat", isPositiveScreen: true },
      { label: "Oven or stove not working", labelEs: "Horno o estufa que no funciona", value: "oven", isPositiveScreen: true },
      { label: "Smoke detectors missing or not working", labelEs: "Detectores de humo faltantes o que no funcionan", value: "smoke", isPositiveScreen: true },
      { label: "Water leaks", labelEs: "Fugas de agua", value: "leaks", isPositiveScreen: true },
      { label: "None of the above", labelEs: "Ninguna de las anteriores", value: "none" },
    ],
  },

  // Domain: Food Insecurity (USDA 2-item screener)
  {
    id: "ahc3",
    domain: "food",
    loinc: "88122-7",
    text: "Within the past 12 months, you worried that your food would run out before you got money to buy more.",
    textEs: "En los últimos 12 meses, le preocupó que su comida se acabara antes de tener dinero para comprar más.",
    type: "radio",
    options: [
      { label: "Often true", labelEs: "Frecuentemente cierto", value: "often", loinc: "LA28397-0", isPositiveScreen: true },
      { label: "Sometimes true", labelEs: "A veces cierto", value: "sometimes", loinc: "LA6729-3", isPositiveScreen: true },
      { label: "Never true", labelEs: "Nunca cierto", value: "never", loinc: "LA28398-8" },
    ],
  },
  {
    id: "ahc4",
    domain: "food",
    loinc: "88123-5",
    text: "Within the past 12 months, the food you bought just didn't last and you didn't have money to get more.",
    textEs: "En los últimos 12 meses, la comida que compró simplemente no le alcanzó y no tenía dinero para conseguir más.",
    type: "radio",
    options: [
      { label: "Often true", labelEs: "Frecuentemente cierto", value: "often", loinc: "LA28397-0", isPositiveScreen: true },
      { label: "Sometimes true", labelEs: "A veces cierto", value: "sometimes", loinc: "LA6729-3", isPositiveScreen: true },
      { label: "Never true", labelEs: "Nunca cierto", value: "never", loinc: "LA28398-8" },
    ],
  },

  // Domain: Transportation Problems
  {
    id: "ahc5",
    domain: "transportation",
    loinc: "93030-5",
    text: "In the past 12 months, has lack of reliable transportation kept you from medical appointments, meetings, work, or from getting things needed for daily living?",
    textEs: "En los últimos 12 meses, ¿la falta de transporte confiable le ha impedido asistir a citas médicas, reuniones, trabajo o conseguir cosas necesarias para la vida diaria?",
    type: "radio",
    options: [
      { label: "Yes, it has kept me from medical appointments or from getting my medications", labelEs: "Sí, me ha impedido asistir a citas médicas o conseguir mis medicamentos", value: "yes-medical", loinc: "LA31976-6", isPositiveScreen: true },
      { label: "Yes, it has kept me from non-medical meetings, appointments, work, or from getting things that I need", labelEs: "Sí, me ha impedido asistir a reuniones no médicas, citas, trabajo o conseguir cosas que necesito", value: "yes-nonmedical", loinc: "LA31977-4", isPositiveScreen: true },
      { label: "No", labelEs: "No", value: "no", loinc: "LA32-8" },
    ],
  },

  // Domain: Utility Help Needs
  {
    id: "ahc6",
    domain: "utilities",
    loinc: "93033-9",
    text: "In the past 12 months, has the electric, gas, oil, or water company threatened to shut off services in your home?",
    textEs: "En los últimos 12 meses, ¿la compañía de electricidad, gas, petróleo o agua ha amenazado con cortar los servicios en su hogar?",
    type: "radio",
    options: [
      { label: "Yes", labelEs: "Sí", value: "yes", loinc: "LA33-6", isPositiveScreen: true },
      { label: "No", labelEs: "No", value: "no", loinc: "LA32-8" },
      { label: "Already shut off", labelEs: "Ya me los cortaron", value: "shutoff", loinc: "LA31981-6", isPositiveScreen: true },
    ],
  },

  // Domain: Interpersonal Safety (HITS tool - Hurt, Insult, Threaten, Scream)
  {
    id: "ahc7",
    domain: "safety",
    loinc: "95618-5",
    text: "How often does anyone, including family and friends, physically hurt you?",
    textEs: "¿Con qué frecuencia alguien, incluyendo familiares y amigos, le hace daño físicamente?",
    type: "radio",
    options: [
      { label: "Never", labelEs: "Nunca", value: "never", loinc: "LA6270-8" },
      { label: "Rarely", labelEs: "Raramente", value: "rarely", loinc: "LA10066-1", isPositiveScreen: true },
      { label: "Sometimes", labelEs: "A veces", value: "sometimes", loinc: "LA10082-8", isPositiveScreen: true },
      { label: "Fairly often", labelEs: "Con bastante frecuencia", value: "fairly-often", loinc: "LA10044-8", isPositiveScreen: true },
      { label: "Frequently", labelEs: "Frecuentemente", value: "frequently", loinc: "LA6482-9", isPositiveScreen: true },
    ],
  },
  {
    id: "ahc8",
    domain: "safety",
    loinc: "95617-7",
    text: "How often does anyone, including family and friends, insult or talk down to you?",
    textEs: "¿Con qué frecuencia alguien, incluyendo familiares y amigos, le insulta o le habla con desprecio?",
    type: "radio",
    options: [
      { label: "Never", labelEs: "Nunca", value: "never", loinc: "LA6270-8" },
      { label: "Rarely", labelEs: "Raramente", value: "rarely", loinc: "LA10066-1", isPositiveScreen: true },
      { label: "Sometimes", labelEs: "A veces", value: "sometimes", loinc: "LA10082-8", isPositiveScreen: true },
      { label: "Fairly often", labelEs: "Con bastante frecuencia", value: "fairly-often", loinc: "LA10044-8", isPositiveScreen: true },
      { label: "Frequently", labelEs: "Frecuentemente", value: "frequently", loinc: "LA6482-9", isPositiveScreen: true },
    ],
  },
  {
    id: "ahc9",
    domain: "safety",
    loinc: "95616-9",
    text: "How often does anyone, including family and friends, threaten you with harm?",
    textEs: "¿Con qué frecuencia alguien, incluyendo familiares y amigos, le amenaza con hacerle daño?",
    type: "radio",
    options: [
      { label: "Never", labelEs: "Nunca", value: "never", loinc: "LA6270-8" },
      { label: "Rarely", labelEs: "Raramente", value: "rarely", loinc: "LA10066-1", isPositiveScreen: true },
      { label: "Sometimes", labelEs: "A veces", value: "sometimes", loinc: "LA10082-8", isPositiveScreen: true },
      { label: "Fairly often", labelEs: "Con bastante frecuencia", value: "fairly-often", loinc: "LA10044-8", isPositiveScreen: true },
      { label: "Frequently", labelEs: "Frecuentemente", value: "frequently", loinc: "LA6482-9", isPositiveScreen: true },
    ],
  },
  {
    id: "ahc10",
    domain: "safety",
    loinc: "95615-1",
    text: "How often does anyone, including family and friends, scream or curse at you?",
    textEs: "¿Con qué frecuencia alguien, incluyendo familiares y amigos, le grita o le maldice?",
    type: "radio",
    options: [
      { label: "Never", labelEs: "Nunca", value: "never", loinc: "LA6270-8" },
      { label: "Rarely", labelEs: "Raramente", value: "rarely", loinc: "LA10066-1", isPositiveScreen: true },
      { label: "Sometimes", labelEs: "A veces", value: "sometimes", loinc: "LA10082-8", isPositiveScreen: true },
      { label: "Fairly often", labelEs: "Con bastante frecuencia", value: "fairly-often", loinc: "LA10044-8", isPositiveScreen: true },
      { label: "Frequently", labelEs: "Frecuentemente", value: "frequently", loinc: "LA6482-9", isPositiveScreen: true },
    ],
  },
];

// ─── Z Code Mapping (per positive screen domain) ─────────────────────────────

export const AHC_Z_CODE_MAPPINGS: AhcZCodeMapping[] = [
  {
    domain: "Housing Instability",
    trigger: "No steady housing or worried about losing housing",
    codes: [
      { code: "Z59.00", description: "Homelessness, unspecified" },
      { code: "Z59.811", description: "Housing instability, housed, with risk of homelessness" },
      { code: "Z59.19", description: "Other inadequate housing" },
    ],
  },
  {
    domain: "Food Insecurity",
    trigger: "Worried food would run out or food didn't last",
    codes: [
      { code: "Z59.41", description: "Food insecurity" },
      { code: "Z59.48", description: "Other specified lack of adequate food" },
    ],
  },
  {
    domain: "Transportation Problems",
    trigger: "Lack of reliable transportation",
    codes: [
      { code: "Z59.82", description: "Transportation insecurity" },
    ],
  },
  {
    domain: "Utility Help Needs",
    trigger: "Utilities threatened or shut off",
    codes: [
      { code: "Z59.19", description: "Other inadequate housing" },
      { code: "Z58.81", description: "Basic services unavailable in physical environment" },
    ],
  },
  {
    domain: "Interpersonal Safety",
    trigger: "Physical hurt, insult, threat, or verbal abuse",
    codes: [
      { code: "Z65.4", description: "Victim of crime and terrorism" },
      { code: "Z63.0", description: "Problems in relationship with spouse or partner" },
      { code: "Z63.8", description: "Other specified problems related to primary support group" },
    ],
  },
];

// ─── Answer-specific Z code mapping ──────────────────────────────────────────
// More precise than AHC_Z_CODE_MAPPINGS (above), which lumps all codes per domain.
// Keyed by (questionId, answerValue) so each specific response maps to the
// most clinically accurate Z code(s). Used by the results display and save handler.

export interface AhcAnswerZCode {
  code: string;
  description: string;
}

export const AHC_ANSWER_Z_CODES: Record<string, Record<string, AhcAnswerZCode[]>> = {
  // ── ahc1: Living situation ──
  ahc1: {
    worried: [
      { code: "Z59.811", description: "Housing instability, housed, with risk of homelessness" },
    ],
    unsteady: [
      { code: "Z59.00", description: "Homelessness, unspecified" },
      { code: "Z59.02", description: "Unsheltered homelessness" },
    ],
  },
  // ── ahc2: Home quality problems (checkbox) ──
  ahc2: {
    pests: [{ code: "Z59.19", description: "Other inadequate housing" }],
    mold: [{ code: "Z59.19", description: "Other inadequate housing" }],
    lead: [
      { code: "Z77.011", description: "Contact with and (suspected) exposure to lead" },
      { code: "Z59.19", description: "Other inadequate housing" },
    ],
    heat: [
      { code: "Z59.11", description: "Inadequate housing environmental temperature" },
    ],
    oven: [{ code: "Z59.19", description: "Other inadequate housing" }],
    smoke: [{ code: "Z59.19", description: "Other inadequate housing" }],
    leaks: [{ code: "Z59.19", description: "Other inadequate housing" }],
  },
  // ── ahc3, ahc4: Food insecurity (USDA 2-item) ──
  // "Often true" is the more severe indicator; "Sometimes true" also screens positive
  // but maps to the "other specified" code rather than Z59.41.
  ahc3: {
    often: [{ code: "Z59.41", description: "Food insecurity" }],
    sometimes: [
      { code: "Z59.48", description: "Other specified lack of adequate food" },
    ],
  },
  ahc4: {
    often: [{ code: "Z59.41", description: "Food insecurity" }],
    sometimes: [
      { code: "Z59.48", description: "Other specified lack of adequate food" },
    ],
  },
  // ── ahc5: Transportation ──
  ahc5: {
    "yes-medical": [{ code: "Z59.82", description: "Transportation insecurity" }],
    "yes-nonmedical": [{ code: "Z59.82", description: "Transportation insecurity" }],
  },
  // ── ahc6: Utilities ──
  // "Threatened" vs "Already shut off" are materially different clinical situations.
  ahc6: {
    yes: [
      { code: "Z59.19", description: "Other inadequate housing" },
    ],
    shutoff: [
      { code: "Z59.19", description: "Other inadequate housing" },
      { code: "Z58.81", description: "Basic services unavailable in physical environment" },
    ],
  },
  // ── ahc7-ahc10: Interpersonal safety (HITS subscale) ──
  // Any positive response warrants clinical attention. At higher frequencies ("Fairly often",
  // "Frequently") we add a second code to reflect the more sustained pattern.
  // ahc7: physical hurt
  ahc7: {
    rarely: [{ code: "Z65.4", description: "Victim of crime and terrorism" }],
    sometimes: [{ code: "Z65.4", description: "Victim of crime and terrorism" }],
    "fairly-often": [
      { code: "Z65.4", description: "Victim of crime and terrorism" },
      { code: "Z63.0", description: "Problems in relationship with spouse or partner" },
    ],
    frequently: [
      { code: "Z65.4", description: "Victim of crime and terrorism" },
      { code: "Z63.0", description: "Problems in relationship with spouse or partner" },
    ],
  },
  // ahc8: insult/talk down (emotional abuse indicator)
  ahc8: {
    rarely: [{ code: "Z63.8", description: "Other specified problems related to primary support group" }],
    sometimes: [{ code: "Z63.8", description: "Other specified problems related to primary support group" }],
    "fairly-often": [{ code: "Z63.8", description: "Other specified problems related to primary support group" }],
    frequently: [{ code: "Z63.8", description: "Other specified problems related to primary support group" }],
  },
  // ahc9: threaten with harm
  ahc9: {
    rarely: [{ code: "Z65.4", description: "Victim of crime and terrorism" }],
    sometimes: [{ code: "Z65.4", description: "Victim of crime and terrorism" }],
    "fairly-often": [
      { code: "Z65.4", description: "Victim of crime and terrorism" },
      { code: "Z63.0", description: "Problems in relationship with spouse or partner" },
    ],
    frequently: [
      { code: "Z65.4", description: "Victim of crime and terrorism" },
      { code: "Z63.0", description: "Problems in relationship with spouse or partner" },
    ],
  },
  // ahc10: scream/curse (verbal abuse indicator)
  ahc10: {
    rarely: [{ code: "Z63.8", description: "Other specified problems related to primary support group" }],
    sometimes: [{ code: "Z63.8", description: "Other specified problems related to primary support group" }],
    "fairly-often": [{ code: "Z63.8", description: "Other specified problems related to primary support group" }],
    frequently: [{ code: "Z63.8", description: "Other specified problems related to primary support group" }],
  },
};

// Get Z codes for a specific question+answer. For checkbox questions, pass the
// answer array; for radio, pass the single value. Returns empty array if no
// positive screen or no mapping defined.
export function getZCodesForAhcAnswer(
  qId: string,
  answer: string | string[] | undefined
): AhcAnswerZCode[] {
  if (!answer) return [];
  const q = AHC_QUESTIONS.find((x) => x.id === qId);
  if (!q) return [];
  const values = Array.isArray(answer) ? answer : [answer];
  const codes: AhcAnswerZCode[] = [];
  for (const v of values) {
    const opt = q.options.find((o) => o.value === v);
    if (!opt?.isPositiveScreen) continue;
    const mapped = AHC_ANSWER_Z_CODES[qId]?.[v] || [];
    codes.push(...mapped);
  }
  return codes;
}
