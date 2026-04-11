// PRAPARE Screening Instrument Data
// Source: National Association of Community Health Centers (NACHC)
// LOINC Panel: 93025-5
// Freely available, copyright NACHC 2019

export type QuestionType = "radio" | "checkbox" | "number" | "text";

export type Lang = "en" | "es";

export interface PrapareOption {
  label: string;
  labelEs?: string;
  value: string;
  loinc?: string;
  isPositiveScreen?: boolean;
  isDecline?: boolean;
}

export interface PrapareQuestion {
  id: string;
  domain: string;
  domainLabel: string;
  domainLabelEs?: string;
  loinc: string;
  text: string;
  textEs?: string;
  type: QuestionType;
  options?: PrapareOption[];
  placeholder?: string;
  placeholderEs?: string;
}

export interface ZCodeMapping {
  domain: string;
  trigger: string;
  codes: { code: string; description: string }[];
}

// ─── Domains ──────────────────────────────────────────────────────────────────

export const DOMAINS = [
  { id: "personal", label: "Personal Characteristics", labelEs: "Características Personales", loincGroup: "93043-8" },
  { id: "family-home", label: "Family and Home", labelEs: "Familia y Hogar", loincGroup: "93042-0" },
  { id: "money-resources", label: "Money and Resources", labelEs: "Dinero y Recursos", loincGroup: "93041-2" },
  { id: "social-emotional", label: "Social and Emotional Health", labelEs: "Salud Social y Emocional", loincGroup: "93040-4" },
  { id: "optional", label: "Optional Supplemental", labelEs: "Preguntas Opcionales", loincGroup: "93039-6" },
];

// ─── Questions ────────────────────────────────────────────────────────────────

export const QUESTIONS: PrapareQuestion[] = [
  // Domain 1: Personal Characteristics
  {
    id: "q1", domain: "personal", domainLabel: "Personal Characteristics", domainLabelEs: "Características Personales",
    loinc: "56051-6", text: "Are you Hispanic or Latino?", textEs: "¿Es usted hispano/a o latino/a?", type: "radio",
    options: [
      { label: "Yes", labelEs: "Sí", value: "yes", loinc: "LA33-6" },
      { label: "No", labelEs: "No", value: "no", loinc: "LA32-8" },
      { label: "I choose not to answer this question", labelEs: "Prefiero no contestar esta pregunta", value: "decline", loinc: "LA30122-8", isDecline: true },
    ],
  },
  {
    id: "q2", domain: "personal", domainLabel: "Personal Characteristics", domainLabelEs: "Características Personales",
    loinc: "32624-9", text: "Which race(s) are you? (Check all that apply)", textEs: "¿Cuál(es) es/son su(s) raza(s)? (Marque todas las que apliquen)", type: "checkbox",
    options: [
      { label: "American Indian/Alaskan Native", labelEs: "Indígena americano/nativo de Alaska", value: "aian" },
      { label: "Asian", labelEs: "Asiático/a", value: "asian" },
      { label: "Black/African American", labelEs: "Negro/afroamericano", value: "black" },
      { label: "Native Hawaiian", labelEs: "Nativo de Hawái", value: "nhpi" },
      { label: "Pacific Islander", labelEs: "Isleño del Pacífico", value: "pi" },
      { label: "White", labelEs: "Blanco/a", value: "white" },
      { label: "Other", labelEs: "Otro", value: "other" },
      { label: "I choose not to answer", labelEs: "Prefiero no contestar", value: "decline", isDecline: true },
    ],
  },
  {
    id: "q3", domain: "personal", domainLabel: "Personal Characteristics", domainLabelEs: "Características Personales",
    loinc: "93035-4", text: "At any point in the past 2 years, has season or migrant farm work been your or your family's main source of income?", textEs: "¿En algún momento en los últimos 2 años, el trabajo agrícola de temporada o migrante ha sido la principal fuente de ingresos para usted o su familia?", type: "radio",
    options: [
      { label: "Yes", labelEs: "Sí", value: "yes", isPositiveScreen: true },
      { label: "No", labelEs: "No", value: "no" },
      { label: "I choose not to answer", labelEs: "Prefiero no contestar", value: "decline", isDecline: true },
    ],
  },
  {
    id: "q4", domain: "personal", domainLabel: "Personal Characteristics", domainLabelEs: "Características Personales",
    loinc: "93034-7", text: "Have you been discharged from the armed forces of the United States?", textEs: "¿Ha sido dado/a de baja de las fuerzas armadas de los Estados Unidos?", type: "radio",
    options: [
      { label: "Yes", labelEs: "Sí", value: "yes" },
      { label: "No", labelEs: "No", value: "no" },
      { label: "I choose not to answer", labelEs: "Prefiero no contestar", value: "decline", isDecline: true },
    ],
  },
  {
    id: "q5", domain: "personal", domainLabel: "Personal Characteristics", domainLabelEs: "Características Personales",
    loinc: "54899-0", text: "What language are you most comfortable speaking?", textEs: "¿Qué idioma le resulta más cómodo hablar?", type: "radio",
    options: [
      { label: "English", labelEs: "Inglés", value: "english" },
      { label: "Language other than English", labelEs: "Otro idioma que no sea inglés", value: "other", isPositiveScreen: true },
      { label: "I choose not to answer", labelEs: "Prefiero no contestar", value: "decline", isDecline: true },
    ],
  },

  // Domain 2: Family and Home
  {
    id: "q6", domain: "family-home", domainLabel: "Family and Home", domainLabelEs: "Familia y Hogar",
    loinc: "63512-8", text: "How many family members, including yourself, do you currently live with?", textEs: "¿Cuántos miembros de su familia, incluyéndose usted, viven actualmente con usted?", type: "number",
    placeholder: "Number of people", placeholderEs: "Número de personas",
  },
  {
    id: "q7", domain: "family-home", domainLabel: "Family and Home", domainLabelEs: "Familia y Hogar",
    loinc: "71802-3", text: "What is your housing situation today?", textEs: "¿Cuál es su situación de vivienda hoy?", type: "radio",
    options: [
      { label: "I have housing", labelEs: "Tengo vivienda", value: "housed" },
      { label: "I do not have housing (staying with others, in a hotel, in a shelter, living outside on the street, on a beach, in a car, or in a park)", labelEs: "No tengo vivienda (me quedo con otros, en un hotel, en un refugio, viviendo en la calle, en la playa, en un carro o en un parque)", value: "unhoused", isPositiveScreen: true },
      { label: "I choose not to answer", labelEs: "Prefiero no contestar", value: "decline", isDecline: true },
    ],
  },
  {
    id: "q8", domain: "family-home", domainLabel: "Family and Home", domainLabelEs: "Familia y Hogar",
    loinc: "93033-9", text: "Are you worried about losing your housing?", textEs: "¿Le preocupa perder su vivienda?", type: "radio",
    options: [
      { label: "Yes", labelEs: "Sí", value: "yes", isPositiveScreen: true },
      { label: "No", labelEs: "No", value: "no" },
      { label: "I choose not to answer", labelEs: "Prefiero no contestar", value: "decline", isDecline: true },
    ],
  },

  // Domain 3: Money and Resources
  {
    id: "q10", domain: "money-resources", domainLabel: "Money and Resources", domainLabelEs: "Dinero y Recursos",
    loinc: "82589-3", text: "What is the highest level of school that you have finished?", textEs: "¿Cuál es el nivel más alto de escuela que ha completado?", type: "radio",
    options: [
      { label: "Less than high school degree", labelEs: "Menos que un diploma de escuela secundaria", value: "less-hs", isPositiveScreen: true },
      { label: "High school diploma or GED", labelEs: "Diploma de escuela secundaria o GED", value: "hs" },
      { label: "More than high school", labelEs: "Más que escuela secundaria", value: "more-hs" },
      { label: "I choose not to answer", labelEs: "Prefiero no contestar", value: "decline", isDecline: true },
    ],
  },
  {
    id: "q11", domain: "money-resources", domainLabel: "Money and Resources", domainLabelEs: "Dinero y Recursos",
    loinc: "67875-5", text: "What is your current work situation?", textEs: "¿Cuál es su situación laboral actual?", type: "radio",
    options: [
      { label: "Unemployed", labelEs: "Desempleado/a", value: "unemployed", isPositiveScreen: true },
      { label: "Part-time or temporary work", labelEs: "Trabajo a tiempo parcial o temporal", value: "part-time" },
      { label: "Full-time work", labelEs: "Trabajo a tiempo completo", value: "full-time" },
      { label: "Otherwise unemployed but not seeking work (student, retired, disabled, unpaid primary care giver)", labelEs: "Desempleado/a pero no buscando trabajo (estudiante, jubilado/a, discapacitado/a, cuidador/a principal no remunerado/a)", value: "not-seeking" },
      { label: "I choose not to answer", labelEs: "Prefiero no contestar", value: "decline", isDecline: true },
    ],
  },
  {
    id: "q14", domain: "money-resources", domainLabel: "Money and Resources", domainLabelEs: "Dinero y Recursos",
    loinc: "93031-3", text: "In the past year, have you or any family members you live with been unable to get any of the following when it was really needed? (Check all that apply)", textEs: "¿En el último año, usted o algún miembro de su familia con quien vive no ha podido obtener alguna de las siguientes cosas cuando realmente la necesitaba? (Marque todas las que apliquen)", type: "checkbox",
    options: [
      { label: "Food", labelEs: "Comida", value: "food", isPositiveScreen: true },
      { label: "Clothing", labelEs: "Ropa", value: "clothing", isPositiveScreen: true },
      { label: "Utilities", labelEs: "Servicios públicos", value: "utilities", isPositiveScreen: true },
      { label: "Child care", labelEs: "Cuidado de niños", value: "childcare", isPositiveScreen: true },
      { label: "Medicine or Any Health Care", labelEs: "Medicamentos o cualquier atención médica", value: "healthcare", isPositiveScreen: true },
      { label: "Phone", labelEs: "Teléfono", value: "phone", isPositiveScreen: true },
      { label: "Other", labelEs: "Otro", value: "other", isPositiveScreen: true },
      { label: "I choose not to answer", labelEs: "Prefiero no contestar", value: "decline", isDecline: true },
    ],
  },
  {
    id: "q15", domain: "money-resources", domainLabel: "Money and Resources", domainLabelEs: "Dinero y Recursos",
    loinc: "93030-5", text: "Has lack of transportation kept you from medical appointments, meetings, work, or from getting things needed for daily living?", textEs: "¿La falta de transporte le ha impedido asistir a citas médicas, reuniones, trabajo o conseguir cosas necesarias para la vida diaria?", type: "checkbox",
    options: [
      { label: "Yes, it has kept me from medical appointments or from getting my medications", labelEs: "Sí, me ha impedido asistir a citas médicas o conseguir mis medicamentos", value: "medical", isPositiveScreen: true },
      { label: "Yes, it has kept me from non-medical meetings, appointments, work, or from getting things that I need", labelEs: "Sí, me ha impedido asistir a reuniones, citas, trabajo o conseguir cosas que necesito", value: "non-medical", isPositiveScreen: true },
      { label: "No", labelEs: "No", value: "no" },
    ],
  },

  // Domain 4: Social and Emotional Health
  {
    id: "q16", domain: "social-emotional", domainLabel: "Social and Emotional Health", domainLabelEs: "Salud Social y Emocional",
    loinc: "93029-7", text: "How often do you see or talk to people that you care about and feel close to? (For example: talking to friends on the phone, visiting friends or family, going to church or club meetings)", textEs: "¿Con qué frecuencia ve o habla con personas que le importan y con las que se siente cercano/a? (Por ejemplo: hablar con amigos por teléfono, visitar amigos o familiares, ir a la iglesia o reuniones de clubes)", type: "radio",
    options: [
      { label: "Less than once a week", labelEs: "Menos de una vez a la semana", value: "less-1", isPositiveScreen: true },
      { label: "1 or 2 times a week", labelEs: "1 o 2 veces a la semana", value: "1-2" },
      { label: "3 to 5 times a week", labelEs: "3 a 5 veces a la semana", value: "3-5" },
      { label: "5 or more times a week", labelEs: "5 o más veces a la semana", value: "5+" },
      { label: "I choose not to answer", labelEs: "Prefiero no contestar", value: "decline", isDecline: true },
    ],
  },
  {
    id: "q17", domain: "social-emotional", domainLabel: "Social and Emotional Health", domainLabelEs: "Salud Social y Emocional",
    loinc: "93038-8", text: "Stress is when someone feels tense, nervous, anxious or can't sleep at night because their mind is troubled. How stressed are you?", textEs: "El estrés es cuando alguien se siente tenso/a, nervioso/a, ansioso/a o no puede dormir por la noche porque su mente está preocupada. ¿Qué tan estresado/a está usted?", type: "radio",
    options: [
      { label: "Not at all", labelEs: "Para nada", value: "none" },
      { label: "A little bit", labelEs: "Un poco", value: "little" },
      { label: "Somewhat", labelEs: "Algo", value: "somewhat" },
      { label: "Quite a bit", labelEs: "Bastante", value: "quite", isPositiveScreen: true },
      { label: "Very much", labelEs: "Mucho", value: "very", isPositiveScreen: true },
      { label: "I choose not to answer", labelEs: "Prefiero no contestar", value: "decline", isDecline: true },
    ],
  },

  // Domain 5: Optional
  {
    id: "q18", domain: "optional", domainLabel: "Optional Supplemental", domainLabelEs: "Preguntas Opcionales",
    loinc: "93028-9", text: "In the past year, have you spent more than 2 nights in a row in a jail, prison, detention center, or juvenile correctional facility?", textEs: "¿En el último año, ha pasado más de 2 noches seguidas en una cárcel, prisión, centro de detención o centro correccional juvenil?", type: "radio",
    options: [
      { label: "Yes", labelEs: "Sí", value: "yes", isPositiveScreen: true },
      { label: "No", labelEs: "No", value: "no" },
      { label: "I choose not to answer", labelEs: "Prefiero no contestar", value: "decline", isDecline: true },
    ],
  },
  {
    id: "q20", domain: "optional", domainLabel: "Optional Supplemental", domainLabelEs: "Preguntas Opcionales",
    loinc: "93026-3", text: "Do you feel physically and emotionally safe where you currently live?", textEs: "¿Se siente física y emocionalmente seguro/a donde vive actualmente?", type: "radio",
    options: [
      { label: "Yes", labelEs: "Sí", value: "yes" },
      { label: "No", labelEs: "No", value: "no", isPositiveScreen: true },
      { label: "Unsure", labelEs: "No estoy seguro/a", value: "unsure", isPositiveScreen: true },
      { label: "I choose not to answer", labelEs: "Prefiero no contestar", value: "decline", isDecline: true },
    ],
  },
];

// ─── Z Code Mapping ───────────────────────────────────────────────────────────

export const Z_CODE_MAPPINGS: ZCodeMapping[] = [
  { domain: "Housing", trigger: "No housing", codes: [
    { code: "Z59.00", description: "Homelessness, unspecified" },
    { code: "Z59.02", description: "Unsheltered homelessness" },
  ]},
  { domain: "Housing stability", trigger: "Worried about losing housing", codes: [
    { code: "Z59.811", description: "Housing instability, housed, with risk of homelessness" },
    { code: "Z59.89", description: "Other problems related to housing and economic circumstances" },
  ]},
  { domain: "Education", trigger: "Less than high school", codes: [
    { code: "Z55.5", description: "Less than a high school diploma" },
    { code: "Z55.0", description: "Illiteracy and low-level literacy" },
  ]},
  { domain: "Employment", trigger: "Unemployed", codes: [
    { code: "Z56.0", description: "Unemployment, unspecified" },
  ]},
  { domain: "Food insecurity", trigger: "Unable to get food", codes: [
    { code: "Z59.41", description: "Food insecurity" },
    { code: "Z59.48", description: "Other specified lack of adequate food" },
  ]},
  { domain: "Utilities", trigger: "Unable to get utilities", codes: [
    { code: "Z59.19", description: "Other inadequate housing" },
    { code: "Z58.81", description: "Basic services unavailable in physical environment" },
  ]},
  { domain: "Transportation", trigger: "Transportation barrier to care", codes: [
    { code: "Z59.82", description: "Transportation insecurity" },
  ]},
  { domain: "Social isolation", trigger: "Social contact less than once per week", codes: [
    { code: "Z60.2", description: "Problems related to living alone" },
    { code: "Z60.4", description: "Social exclusion and rejection" },
  ]},
  { domain: "Stress", trigger: "High stress level", codes: [
    { code: "Z73.3", description: "Stress, not elsewhere classified" },
  ]},
  { domain: "Incarceration", trigger: "Recent incarceration", codes: [
    { code: "Z65.1", description: "Imprisonment and other incarceration" },
    { code: "Z65.2", description: "Problems related to release from prison" },
  ]},
  { domain: "Safety", trigger: "Does not feel safe at home", codes: [
    { code: "Z59.89", description: "Other problems related to housing and economic circumstances" },
  ]},
  { domain: "Healthcare access", trigger: "Unable to get medicine or healthcare", codes: [
    { code: "Z59.71", description: "Insufficient health insurance coverage" },
    { code: "Z75.3", description: "Unavailability and inaccessibility of health-care facilities" },
  ]},
];

// ─── Full Z Code Reference (Z55-Z65) ─────────────────────────────────────────

export interface ZCodeCategory {
  range: string;
  title: string;
  codes: { code: string; description: string }[];
}

export const Z_CODE_CATEGORIES: ZCodeCategory[] = [
  {
    range: "Z55", title: "Problems Related to Education and Literacy",
    codes: [
      { code: "Z55.0", description: "Illiteracy and low-level literacy" },
      { code: "Z55.1", description: "Schooling unavailable and unattainable" },
      { code: "Z55.2", description: "Failed school examinations" },
      { code: "Z55.3", description: "Underachievement in school" },
      { code: "Z55.4", description: "Educational maladjustment and discord with teachers and classmates" },
      { code: "Z55.5", description: "Less than a high school diploma" },
      { code: "Z55.6", description: "Problems related to health literacy" },
      { code: "Z55.8", description: "Other problems related to education and literacy" },
      { code: "Z55.9", description: "Problems related to education and literacy, unspecified" },
    ],
  },
  {
    range: "Z56", title: "Problems Related to Employment and Unemployment",
    codes: [
      { code: "Z56.0", description: "Unemployment, unspecified" },
      { code: "Z56.1", description: "Change of job" },
      { code: "Z56.2", description: "Threat of job loss" },
      { code: "Z56.3", description: "Stressful work schedule" },
      { code: "Z56.4", description: "Discord with boss and workmates" },
      { code: "Z56.5", description: "Uncongenial work environment" },
      { code: "Z56.6", description: "Other physical and mental strain related to work" },
      { code: "Z56.81", description: "Sexual harassment on the job" },
      { code: "Z56.82", description: "Military deployment status" },
      { code: "Z56.89", description: "Other problems related to employment" },
      { code: "Z56.9", description: "Unspecified problems related to employment" },
    ],
  },
  {
    range: "Z58", title: "Problems Related to Physical Environment",
    codes: [
      { code: "Z58.6", description: "Inadequate drinking-water supply" },
      { code: "Z58.81", description: "Basic services unavailable in physical environment" },
      { code: "Z58.89", description: "Other problems related to physical environment" },
    ],
  },
  {
    range: "Z59", title: "Problems Related to Housing and Economic Circumstances",
    codes: [
      { code: "Z59.00", description: "Homelessness, unspecified" },
      { code: "Z59.02", description: "Unsheltered homelessness" },
      { code: "Z59.10", description: "Inadequate housing, unspecified" },
      { code: "Z59.19", description: "Other inadequate housing" },
      { code: "Z59.2", description: "Discord with neighbors, lodgers and landlord" },
      { code: "Z59.3", description: "Problems related to living in residential institution" },
      { code: "Z59.41", description: "Food insecurity" },
      { code: "Z59.48", description: "Other specified lack of adequate food" },
      { code: "Z59.5", description: "Extreme poverty" },
      { code: "Z59.6", description: "Low income" },
      { code: "Z59.71", description: "Insufficient health insurance coverage" },
      { code: "Z59.72", description: "Insufficient welfare support" },
      { code: "Z59.811", description: "Housing instability, housed, with risk of homelessness" },
      { code: "Z59.82", description: "Transportation insecurity" },
      { code: "Z59.89", description: "Other problems related to housing and economic circumstances" },
      { code: "Z59.9", description: "Problem related to housing and economic circumstances, unspecified" },
    ],
  },
  {
    range: "Z60", title: "Problems Related to Social Environment",
    codes: [
      { code: "Z60.0", description: "Problems of adjustment to life-cycle transitions" },
      { code: "Z60.2", description: "Problems related to living alone" },
      { code: "Z60.3", description: "Acculturation difficulty" },
      { code: "Z60.4", description: "Social exclusion and rejection" },
      { code: "Z60.5", description: "Target of (perceived) adverse discrimination and persecution" },
      { code: "Z60.8", description: "Other problems related to social environment" },
      { code: "Z60.9", description: "Problem related to social environment, unspecified" },
    ],
  },
  {
    range: "Z63", title: "Other Problems Related to Primary Support Group",
    codes: [
      { code: "Z63.0", description: "Problems in relationship with spouse or partner" },
      { code: "Z63.1", description: "Problems in relationship with in-laws" },
      { code: "Z63.31", description: "Absence of family member due to military deployment" },
      { code: "Z63.32", description: "Other absence of family member" },
      { code: "Z63.4", description: "Disappearance and death of family member" },
      { code: "Z63.5", description: "Disruption of family by separation and divorce" },
      { code: "Z63.6", description: "Dependent relative needing care at home" },
      { code: "Z63.79", description: "Other stressful life events affecting family and household" },
      { code: "Z63.8", description: "Other specified problems related to primary support group" },
      { code: "Z63.9", description: "Problem related to primary support group, unspecified" },
    ],
  },
  {
    range: "Z65", title: "Problems Related to Other Psychosocial Circumstances",
    codes: [
      { code: "Z65.0", description: "Conviction in civil and criminal proceedings without imprisonment" },
      { code: "Z65.1", description: "Imprisonment and other incarceration" },
      { code: "Z65.2", description: "Problems related to release from prison" },
      { code: "Z65.3", description: "Problems related to other legal circumstances" },
      { code: "Z65.4", description: "Victim of crime and terrorism" },
      { code: "Z65.5", description: "Exposure to disaster, war and other hostilities" },
      { code: "Z65.8", description: "Other problems related to psychosocial circumstances" },
      { code: "Z65.9", description: "Problem related to unspecified psychosocial circumstances" },
    ],
  },
];
