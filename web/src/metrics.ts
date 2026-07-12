import { localeOf, type Lang } from './i18n'

interface Localized {
  de: string
  en: string
}

export interface MetricDef {
  id: string
  label: Localized
  unit: Localized
  /** Stable group key; look up display text via GROUP_LABELS. */
  group: string
  desc: Localized
  /** Sequential palette, light → dark */
  palette: string[]
  /** Meaning of high values, drives legend endpoint labels */
  lowLabel: Localized
  highLabel: Localized
  decimals: number
  /** Fixed break values instead of quantiles; length must equal palette.length */
  breaks?: number[]
}

const ORRD = ['#fef0d9', '#fdd49e', '#fdbb84', '#fc8d59', '#ef6548', '#d7301f', '#990000']
const GNBU = ['#f0f9e8', '#ccebc5', '#a8ddb5', '#7bccc4', '#4eb3d3', '#2b8cbe', '#08589e']
const GREENS = ['#edf8e9', '#c7e9c0', '#a1d99b', '#74c476', '#41ab5d', '#238b45', '#005a32']
const BUPU = ['#f7fcfd', '#e0ecf4', '#bfd3e6', '#9ebcda', '#8c96c6', '#8856a7', '#810f7c']
const RDYLBU = ['#d73027', '#fc8d59', '#fee090', '#ffffbf', '#e0f3f8', '#91bfdb', '#4575b4']
const RDYLBU_REV = [...RDYLBU].reverse()
const RDBU = ['#2166ac', '#67a9cf', '#d1e5f0', '#f7f7f7', '#fddbc7', '#ef8a62', '#b2182b']

/** Metric ids computed client-side from the "Mein Szenario" panel state. */
export const SCENARIO_METRIC_IDS = new Set(['monatsmiete', 'belastung_pers', 'rest_einkommen', 'kauf_vs_miete'])

/**
 * Uncertainty prefix when the asking rent sits in the open-ended top class:
 * rent-derived values are lower bounds, remaining income and the buy/rent gap are upper bounds.
 * (kauf_monat is rent-independent and is never a member of SCENARIO_METRIC_IDS, so it never gets a prefix.)
 */
export const scenarioBoundPrefix = (metricId: string): string =>
  metricId === 'rest_einkommen' || metricId === 'kauf_vs_miete' ? '≤ ' : '≥ '

export const GROUP_ORDER = ['rent', 'quality', 'safety', 'access', 'income', 'overall', 'scenario']

export const GROUP_LABELS: Record<string, Localized> = {
  rent: { de: 'Miete & Markt', en: 'Rent & Market' },
  quality: { de: 'Lebensqualität', en: 'Quality of Life' },
  safety: { de: 'Sicherheit', en: 'Safety' },
  access: { de: 'Erreichbarkeit', en: 'Accessibility' },
  income: { de: 'Einkommen', en: 'Income' },
  overall: { de: 'Gesamt', en: 'Overall' },
  scenario: { de: 'Mein Szenario', en: 'My Scenario' },
}

export const METRICS: MetricDef[] = [
  {
    id: 'qm_miete',
    label: { de: 'Nettokaltmiete', en: 'Net cold rent' },
    unit: { de: '€/m²', en: '€/m²' },
    group: 'rent',
    desc: {
      de: 'Durchschnittliche Nettokaltmiete je m² (Zensus 2022, Bestandsmieten)',
      en: 'Average net cold rent per m² (2022 census, existing tenancies)',
    },
    palette: ORRD,
    lowLabel: { de: 'günstig', en: 'cheap' },
    highLabel: { de: 'teuer', en: 'expensive' },
    decimals: 2,
  },
  {
    id: 'leerstand',
    label: { de: 'Leerstandsquote', en: 'Vacancy rate' },
    unit: { de: '%', en: '%' },
    group: 'rent',
    desc: {
      de: 'Anteil leerstehender Wohnungen — niedriger Leerstand bedeutet einen angespannten Markt',
      en: 'Share of vacant dwellings — low vacancy means a tight market',
    },
    palette: GNBU,
    lowLabel: { de: 'angespannt', en: 'tight' },
    highLabel: { de: 'entspannt', en: 'relaxed' },
    decimals: 1,
  },
  {
    id: 'eigentum',
    label: { de: 'Eigentümerquote', en: 'Ownership rate' },
    unit: { de: '%', en: '%' },
    group: 'rent',
    desc: {
      de: 'Anteil selbstgenutzten Wohneigentums (Zensus 2022)',
      en: 'Share of owner-occupied housing (2022 census)',
    },
    palette: GREENS,
    lowLabel: { de: 'Mietermarkt', en: 'renter market' },
    highLabel: { de: 'Eigentümermarkt', en: 'owner market' },
    decimals: 1,
  },
  {
    id: 'angebotsmiete',
    label: { de: 'Angebotsmiete', en: 'Asking rent' },
    unit: { de: '€/m²', en: '€/m²' },
    group: 'rent',
    desc: {
      de: 'Angebotsmieten inserierter Wohnungen, Klassenmitte (BBSR 2023, Kreisebene)',
      en: 'Advertised asking rents, class midpoint (BBSR 2023, district level)',
    },
    palette: ORRD,
    lowLabel: { de: 'günstig', en: 'cheap' },
    highLabel: { de: 'teuer', en: 'expensive' },
    decimals: 2,
  },
  {
    id: 'miet_gap',
    label: { de: 'Miet-Gap', en: 'Rent gap' },
    unit: { de: '€/m²', en: '€/m²' },
    group: 'rent',
    desc: {
      de: 'Differenz Angebotsmiete minus Bestandsmiete — großer Abstand deutet auf einen erhitzten Markt',
      en: 'Asking minus existing rent — a large gap signals an overheated market',
    },
    palette: RDBU,
    lowLabel: { de: 'Bestand teurer', en: 'existing higher' },
    highLabel: { de: 'Angebot teurer', en: 'asking higher' },
    decimals: 2,
  },
  {
    id: 'bev_entw',
    label: { de: 'Bevölkerungsentwicklung', en: 'Population change' },
    unit: { de: '% p. a.', en: '% p.a.' },
    group: 'rent',
    desc: {
      de: 'Durchschnittliche jährliche Bevölkerungsentwicklung 2019–2024 (Deutschlandatlas, Gemeindeebene)',
      en: 'Average annual population change 2019–2024 (Deutschlandatlas, municipality level)',
    },
    palette: [...RDBU].reverse(),
    lowLabel: { de: 'schrumpft', en: 'shrinking' },
    highLabel: { de: 'wächst', en: 'growing' },
    decimals: 2,
    breaks: [-2, -1, -0.5, 0, 0.5, 1, 2],
  },
  {
    id: 'amenities_1k',
    label: { de: 'Nahversorgung gesamt', en: 'Local amenities (total)' },
    unit: { de: 'je 1.000 Einw.', en: 'per 1,000 pop.' },
    group: 'quality',
    desc: {
      de: 'Supermärkte, Ärzte, Apotheken, Schulen und ÖPNV-Halte je 1.000 Einwohner (OpenStreetMap)',
      en: 'Supermarkets, doctors, pharmacies, schools and transit stops per 1,000 residents (OpenStreetMap)',
    },
    palette: BUPU,
    lowLabel: { de: 'wenig', en: 'few' },
    highLabel: { de: 'viel', en: 'many' },
    decimals: 1,
  },
  {
    id: 'supermaerkte_1k',
    label: { de: 'Supermärkte', en: 'Supermarkets' },
    unit: { de: 'je 1.000 Einw.', en: 'per 1,000 pop.' },
    group: 'quality',
    desc: {
      de: 'Supermärkte und Discounter je 1.000 Einwohner (OpenStreetMap)',
      en: 'Supermarkets and discounters per 1,000 residents (OpenStreetMap)',
    },
    palette: BUPU,
    lowLabel: { de: 'wenig', en: 'few' },
    highLabel: { de: 'viel', en: 'many' },
    decimals: 2,
  },
  {
    id: 'aerzte_1k',
    label: { de: 'Ärzte', en: 'Doctors' },
    unit: { de: 'je 1.000 Einw.', en: 'per 1,000 pop.' },
    group: 'quality',
    desc: {
      de: 'Arztpraxen und Kliniken je 1.000 Einwohner (OpenStreetMap)',
      en: "Doctor's practices and clinics per 1,000 residents (OpenStreetMap)",
    },
    palette: BUPU,
    lowLabel: { de: 'wenig', en: 'few' },
    highLabel: { de: 'viel', en: 'many' },
    decimals: 2,
  },
  {
    id: 'schulen_1k',
    label: { de: 'Schulen & Kitas', en: 'Schools & daycare' },
    unit: { de: 'je 1.000 Einw.', en: 'per 1,000 pop.' },
    group: 'quality',
    desc: {
      de: 'Schulen und Kindergärten je 1.000 Einwohner (OpenStreetMap)',
      en: 'Schools and kindergartens per 1,000 residents (OpenStreetMap)',
    },
    palette: BUPU,
    lowLabel: { de: 'wenig', en: 'few' },
    highLabel: { de: 'viel', en: 'many' },
    decimals: 2,
  },
  {
    id: 'oepnv_1k',
    label: { de: 'ÖPNV-Halte', en: 'Transit stops' },
    unit: { de: 'je 1.000 Einw.', en: 'per 1,000 pop.' },
    group: 'quality',
    desc: {
      de: 'Bus-, Tram- und Bahnhalte je 1.000 Einwohner (OpenStreetMap)',
      en: 'Bus, tram and rail stops per 1,000 residents (OpenStreetMap)',
    },
    palette: BUPU,
    lowLabel: { de: 'wenig', en: 'few' },
    highLabel: { de: 'viel', en: 'many' },
    decimals: 1,
  },
  {
    id: 'v_harzt',
    label: { de: 'Hausärzte', en: 'GPs' },
    unit: { de: 'je 100.000 Einw.', en: 'per 100,000 pop.' },
    group: 'quality',
    desc: {
      de: 'Hausärztinnen und -ärzte je 100.000 Einwohner (2022, Kreisebene)',
      en: 'General practitioners per 100,000 residents (2022, district level)',
    },
    palette: BUPU,
    lowLabel: { de: 'wenig', en: 'few' },
    highLabel: { de: 'viel', en: 'many' },
    decimals: 0,
  },
  {
    id: 'kbtr_pers',
    label: { de: 'Kita: Plätze je Fachkraft', en: 'Daycare: slots per staff' },
    unit: { de: 'Plätze', en: 'slots' },
    group: 'quality',
    desc: {
      de: 'Kita-Plätze je pädagogisch tätiger Person (2024, Kreisebene) — weniger Plätze je Fachkraft bedeuten intensivere Betreuung',
      en: 'Daycare slots per pedagogical staff member (2024, district level) — fewer slots per staff means more individual care',
    },
    palette: ORRD,
    lowLabel: { de: 'gute Betreuung', en: 'good ratio' },
    highLabel: { de: 'hohe Belastung', en: 'high load' },
    decimals: 1,
  },
  {
    id: 'straft',
    label: { de: 'Straftaten', en: 'Crimes' },
    unit: { de: 'je 100.000 Einw.', en: 'per 100,000 pop.' },
    group: 'safety',
    desc: {
      de: 'Straftaten insgesamt je 100.000 Einwohner (2023, Kreisebene)',
      en: 'Total recorded crimes per 100,000 residents (2023, district level)',
    },
    palette: ORRD,
    lowLabel: { de: 'sicher', en: 'safe' },
    highLabel: { de: 'belastet', en: 'high' },
    decimals: 0,
  },
  {
    id: 'einbr',
    label: { de: 'Wohnungseinbrüche', en: 'Burglaries' },
    unit: { de: 'je 100.000 Einw.', en: 'per 100,000 pop.' },
    group: 'safety',
    desc: {
      de: 'Wohnungseinbruchdiebstahl je 100.000 Einwohner (2023, Kreisebene)',
      en: 'Residential burglaries per 100,000 residents (2023, district level)',
    },
    palette: ORRD,
    lowLabel: { de: 'selten', en: 'rare' },
    highLabel: { de: 'häufig', en: 'frequent' },
    decimals: 0,
  },
  {
    id: 'fz_mz',
    label: { de: 'Fahrzeit Mittelzentrum', en: 'Drive to town centre' },
    unit: { de: 'Pkw-Min.', en: 'car-min' },
    group: 'access',
    desc: {
      de: 'Pkw-Fahrzeit zum nächsten Mittelzentrum (INKAR 2021, Kreisebene)',
      en: 'Car travel time to the nearest medium-order centre (INKAR 2021, district level)',
    },
    palette: ORRD,
    lowLabel: { de: 'nah', en: 'near' },
    highLabel: { de: 'fern', en: 'far' },
    decimals: 0,
  },
  {
    id: 'fz_oz',
    label: { de: 'Fahrzeit Oberzentrum', en: 'Drive to city centre' },
    unit: { de: 'Pkw-Min.', en: 'car-min' },
    group: 'access',
    desc: {
      de: 'Pkw-Fahrzeit zum nächsten Oberzentrum (INKAR 2021, Kreisebene)',
      en: 'Car travel time to the nearest higher-order centre (INKAR 2021, district level)',
    },
    palette: ORRD,
    lowLabel: { de: 'nah', en: 'near' },
    highLabel: { de: 'fern', en: 'far' },
    decimals: 0,
  },
  {
    id: 'einkommen',
    label: { de: 'Verfügbares Einkommen', en: 'Disposable income' },
    unit: { de: 'Tsd. €/Jahr', en: 'k€/year' },
    group: 'income',
    desc: {
      de: 'Verfügbares Einkommen je Einwohner (Deutschlandatlas, Kreisebene)',
      en: 'Disposable income per resident (Deutschlandatlas, district level)',
    },
    palette: GREENS,
    lowLabel: { de: 'niedrig', en: 'low' },
    highLabel: { de: 'hoch', en: 'high' },
    decimals: 1,
  },
  {
    id: 'alq',
    label: { de: 'Arbeitslosenquote', en: 'Unemployment rate' },
    unit: { de: '%', en: '%' },
    group: 'income',
    desc: {
      de: 'Arbeitslosenquote bezogen auf zivile Erwerbspersonen (2023, Kreisebene)',
      en: 'Unemployment rate of the civilian labour force (2023, district level)',
    },
    palette: ORRD,
    lowLabel: { de: 'niedrig', en: 'low' },
    highLabel: { de: 'hoch', en: 'high' },
    decimals: 1,
  },
  {
    id: 'mietbelastung',
    label: { de: 'Mietbelastung (Bestand)', en: 'Rent burden (existing)' },
    unit: { de: '%', en: '%' },
    group: 'income',
    desc: {
      de: 'Bestandsmiete (70 m²) im Verhältnis zum örtlichen Pro-Kopf-Einkommen. Einkommensstarke Städte wirken dadurch moderat; Neuvermietungen liegen deutlich höher — für eine persönliche Rechnung siehe „Mein Szenario → Deine Mietbelastung".',
      en: 'Existing rent (70 m²) relative to local per-capita income. High-income cities look moderate; new leases are higher — see "My Scenario → Your rent burden".',
    },
    palette: ORRD,
    lowLabel: { de: 'gering', en: 'low' },
    highLabel: { de: 'hoch', en: 'high' },
    decimals: 1,
  },
  {
    id: 'score',
    label: { de: 'Gesamtindex', en: 'Overall index' },
    unit: { de: '/ 100', en: '/ 100' },
    group: 'overall',
    desc: {
      de: 'Kombiniert Bezahlbarkeit, Marktentspannung und Nahversorgung (Perzentil-Mittel)',
      en: 'Combines affordability, market slack and amenities (percentile mean)',
    },
    palette: RDYLBU,
    lowLabel: { de: 'ungünstig', en: 'poor' },
    highLabel: { de: 'attraktiv', en: 'attractive' },
    decimals: 0,
  },
  {
    id: 'monatsmiete',
    label: { de: 'Monatsmiete', en: 'Monthly rent' },
    unit: { de: '€/Monat', en: '€/month' },
    group: 'scenario',
    desc: {
      de: 'Monatliche Kaltmiete für die gewählte Wohnungsgröße',
      en: 'Monthly cold rent for the chosen flat size',
    },
    palette: ORRD,
    lowLabel: { de: 'günstig', en: 'cheap' },
    highLabel: { de: 'teuer', en: 'expensive' },
    decimals: 0,
  },
  {
    id: 'belastung_pers',
    label: { de: 'Deine Mietbelastung', en: 'Your rent burden' },
    unit: { de: '%', en: '%' },
    group: 'scenario',
    desc: {
      de: 'Anteil deines Nettoeinkommens für die Kaltmiete — ab 30 % gilt Wohnen als teuer',
      en: 'Share of your net income for cold rent — above 30% housing is considered expensive',
    },
    palette: RDYLBU_REV,
    lowLabel: { de: 'leistbar', en: 'affordable' },
    highLabel: { de: 'überlastet', en: 'overburdened' },
    decimals: 1,
    breaks: [10, 15, 20, 25, 30, 35, 45],
  },
  {
    id: 'rest_einkommen',
    label: { de: 'Resteinkommen', en: 'Income left' },
    unit: { de: '€/Monat', en: '€/month' },
    group: 'scenario',
    desc: { de: 'Nettoeinkommen minus Kaltmiete', en: 'Net income minus cold rent' },
    palette: RDYLBU,
    lowLabel: { de: 'wenig übrig', en: 'little left' },
    highLabel: { de: 'viel übrig', en: 'much left' },
    decimals: 0,
  },
  {
    id: 'kauf_monat',
    label: { de: 'Bauen: Monatsrate', en: 'Build: monthly rate' },
    unit: { de: '€/Monat', en: '€/month' },
    group: 'scenario',
    desc: {
      de: 'Annuität für Grundstück + Neubau nach Eigenkapital (Baulandpreise 2022, Baukosten pauschal)',
      en: 'Annuity for land + new build after equity (land prices 2022, flat construction cost)',
    },
    palette: ORRD,
    lowLabel: { de: 'günstig', en: 'cheap' },
    highLabel: { de: 'teuer', en: 'expensive' },
    decimals: 0,
  },
  {
    id: 'kauf_vs_miete',
    label: { de: 'Bauen vs. Mieten', en: 'Build vs. rent' },
    unit: { de: '€/Monat', en: '€/month' },
    group: 'scenario',
    desc: {
      de: 'Monatsrate Neubau minus Kaltmiete für dieselbe Wohnfläche — unter 0 ist Bauen günstiger',
      en: 'New-build monthly rate minus cold rent for the same floor area — below 0 building is cheaper',
    },
    palette: RDBU,
    lowLabel: { de: 'Bauen günstiger', en: 'building cheaper' },
    highLabel: { de: 'Mieten günstiger', en: 'renting cheaper' },
    decimals: 0,
    breaks: [-500, -200, 0, 300, 800, 1500, 3000],
  },
]

export const metricById = (id: string): MetricDef => {
  const m = METRICS.find((m) => m.id === id)
  if (!m) throw new Error(`unknown metric ${id}`)
  return m
}

export const fmtNumber = (v: number, decimals: number, lang: Lang): string =>
  v.toLocaleString(localeOf(lang), { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

export const fmtMetric = (v: number, m: MetricDef, lang: Lang): string =>
  `${fmtNumber(v, m.decimals, lang)} ${m.unit[lang]}`
