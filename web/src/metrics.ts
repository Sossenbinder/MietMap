export interface MetricDef {
  id: string
  label: string
  unit: string
  group: string
  desc: string
  /** Sequential palette, light → dark */
  palette: string[]
  /** Meaning of high values, drives legend endpoint labels */
  lowLabel: string
  highLabel: string
  decimals: number
  /** Fixed break values instead of quantiles; length must equal palette.length */
  breaks?: number[]
}

const ORRD = ['#fef0d9', '#fdd49e', '#fdbb84', '#fc8d59', '#ef6548', '#d7301f', '#990000']
const GNBU = ['#f0f9e8', '#ccebc5', '#a8ddb5', '#7bccc4', '#4eb3d3', '#2b8cbe', '#08589e']
const GREENS = ['#edf8e9', '#c7e9c0', '#a1d99b', '#74c476', '#41ab5d', '#238b45', '#005a32']
const BUPU = ['#f7fcfd', '#e0ecf4', '#bfd3e6', '#9ebcda', '#8c96c6', '#8856a7', '#810f7c']
const RDYLGN = ['#d73027', '#fc8d59', '#fee08b', '#ffffbf', '#d9ef8b', '#91cf60', '#1a9850']
const RDYLGN_REV = [...RDYLGN].reverse()
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

export const METRICS: MetricDef[] = [
  {
    id: 'qm_miete',
    label: 'Nettokaltmiete',
    unit: '€/m²',
    group: 'Miete & Markt',
    desc: 'Durchschnittliche Nettokaltmiete je m² (Zensus 2022, Bestandsmieten)',
    palette: ORRD,
    lowLabel: 'günstig',
    highLabel: 'teuer',
    decimals: 2,
  },
  {
    id: 'leerstand',
    label: 'Leerstandsquote',
    unit: '%',
    group: 'Miete & Markt',
    desc: 'Anteil leerstehender Wohnungen — niedriger Leerstand bedeutet einen angespannten Markt',
    palette: GNBU,
    lowLabel: 'angespannt',
    highLabel: 'entspannt',
    decimals: 1,
  },
  {
    id: 'eigentum',
    label: 'Eigentümerquote',
    unit: '%',
    group: 'Miete & Markt',
    desc: 'Anteil selbstgenutzten Wohneigentums (Zensus 2022)',
    palette: GREENS,
    lowLabel: 'Mietermarkt',
    highLabel: 'Eigentümermarkt',
    decimals: 1,
  },
  {
    id: 'angebotsmiete',
    label: 'Angebotsmiete',
    unit: '€/m²',
    group: 'Miete & Markt',
    desc: 'Angebotsmieten inserierter Wohnungen, Klassenmitte (BBSR 2023, Kreisebene)',
    palette: ORRD,
    lowLabel: 'günstig',
    highLabel: 'teuer',
    decimals: 2,
  },
  {
    id: 'miet_gap',
    label: 'Miet-Gap',
    unit: '€/m²',
    group: 'Miete & Markt',
    desc: 'Differenz Angebotsmiete minus Bestandsmiete — großer Abstand deutet auf einen erhitzten Markt',
    palette: RDBU,
    lowLabel: 'Bestand teurer',
    highLabel: 'Angebot teurer',
    decimals: 2,
  },
  {
    id: 'amenities_1k',
    label: 'Nahversorgung gesamt',
    unit: 'je 1.000 Einw.',
    group: 'Lebensqualität',
    desc: 'Supermärkte, Ärzte, Apotheken, Schulen und ÖPNV-Halte je 1.000 Einwohner (OpenStreetMap)',
    palette: BUPU,
    lowLabel: 'wenig',
    highLabel: 'viel',
    decimals: 1,
  },
  {
    id: 'supermaerkte_1k',
    label: 'Supermärkte',
    unit: 'je 1.000 Einw.',
    group: 'Lebensqualität',
    desc: 'Supermärkte und Discounter je 1.000 Einwohner (OpenStreetMap)',
    palette: BUPU,
    lowLabel: 'wenig',
    highLabel: 'viel',
    decimals: 2,
  },
  {
    id: 'aerzte_1k',
    label: 'Ärzte',
    unit: 'je 1.000 Einw.',
    group: 'Lebensqualität',
    desc: 'Arztpraxen und Kliniken je 1.000 Einwohner (OpenStreetMap)',
    palette: BUPU,
    lowLabel: 'wenig',
    highLabel: 'viel',
    decimals: 2,
  },
  {
    id: 'schulen_1k',
    label: 'Schulen & Kitas',
    unit: 'je 1.000 Einw.',
    group: 'Lebensqualität',
    desc: 'Schulen und Kindergärten je 1.000 Einwohner (OpenStreetMap)',
    palette: BUPU,
    lowLabel: 'wenig',
    highLabel: 'viel',
    decimals: 2,
  },
  {
    id: 'oepnv_1k',
    label: 'ÖPNV-Halte',
    unit: 'je 1.000 Einw.',
    group: 'Lebensqualität',
    desc: 'Bus-, Tram- und Bahnhalte je 1.000 Einwohner (OpenStreetMap)',
    palette: BUPU,
    lowLabel: 'wenig',
    highLabel: 'viel',
    decimals: 1,
  },
  {
    id: 'v_harzt',
    label: 'Hausärzte',
    unit: 'je 100.000 Einw.',
    group: 'Lebensqualität',
    desc: 'Hausärztinnen und -ärzte je 100.000 Einwohner (2022, Kreisebene)',
    palette: BUPU,
    lowLabel: 'wenig',
    highLabel: 'viel',
    decimals: 0,
  },
  {
    id: 'kbtr_pers',
    label: 'Kita: Plätze je Fachkraft',
    unit: 'Plätze',
    group: 'Lebensqualität',
    desc: 'Kita-Plätze je pädagogisch tätiger Person (2024, Kreisebene) — weniger Plätze je Fachkraft bedeuten intensivere Betreuung',
    palette: ORRD,
    lowLabel: 'gute Betreuung',
    highLabel: 'hohe Belastung',
    decimals: 1,
  },
  {
    id: 'straft',
    label: 'Straftaten',
    unit: 'je 100.000 Einw.',
    group: 'Sicherheit',
    desc: 'Straftaten insgesamt je 100.000 Einwohner (2023, Kreisebene)',
    palette: ORRD,
    lowLabel: 'sicher',
    highLabel: 'belastet',
    decimals: 0,
  },
  {
    id: 'einbr',
    label: 'Wohnungseinbrüche',
    unit: 'je 100.000 Einw.',
    group: 'Sicherheit',
    desc: 'Wohnungseinbruchdiebstahl je 100.000 Einwohner (2023, Kreisebene)',
    palette: ORRD,
    lowLabel: 'selten',
    highLabel: 'häufig',
    decimals: 0,
  },
  {
    id: 'fz_mz',
    label: 'Fahrzeit Mittelzentrum',
    unit: 'Pkw-Min.',
    group: 'Erreichbarkeit',
    desc: 'Pkw-Fahrzeit zum nächsten Mittelzentrum (INKAR 2021, Kreisebene)',
    palette: ORRD,
    lowLabel: 'nah',
    highLabel: 'fern',
    decimals: 0,
  },
  {
    id: 'fz_oz',
    label: 'Fahrzeit Oberzentrum',
    unit: 'Pkw-Min.',
    group: 'Erreichbarkeit',
    desc: 'Pkw-Fahrzeit zum nächsten Oberzentrum (INKAR 2021, Kreisebene)',
    palette: ORRD,
    lowLabel: 'nah',
    highLabel: 'fern',
    decimals: 0,
  },
  {
    id: 'einkommen',
    label: 'Verfügbares Einkommen',
    unit: 'Tsd. €/Jahr',
    group: 'Einkommen',
    desc: 'Verfügbares Einkommen je Einwohner (Deutschlandatlas, Kreisebene)',
    palette: GREENS,
    lowLabel: 'niedrig',
    highLabel: 'hoch',
    decimals: 1,
  },
  {
    id: 'alq',
    label: 'Arbeitslosenquote',
    unit: '%',
    group: 'Einkommen',
    desc: 'Arbeitslosenquote bezogen auf zivile Erwerbspersonen (2023, Kreisebene)',
    palette: ORRD,
    lowLabel: 'niedrig',
    highLabel: 'hoch',
    decimals: 1,
  },
  {
    id: 'mietbelastung',
    label: 'Mietbelastung',
    unit: '%',
    group: 'Einkommen',
    desc: 'Anteil des Pro-Kopf-Einkommens für die Bestandsmiete einer 70-m²-Wohnung',
    palette: ORRD,
    lowLabel: 'gering',
    highLabel: 'hoch',
    decimals: 1,
  },
  {
    id: 'score',
    label: 'Gesamtindex',
    unit: '/ 100',
    group: 'Gesamt',
    desc: 'Kombiniert Bezahlbarkeit, Marktentspannung und Nahversorgung (Perzentil-Mittel)',
    palette: RDYLGN,
    lowLabel: 'ungünstig',
    highLabel: 'attraktiv',
    decimals: 0,
  },
  {
    id: 'monatsmiete',
    label: 'Monatsmiete',
    unit: '€/Monat',
    group: 'Mein Szenario',
    desc: 'Monatliche Kaltmiete für die gewählte Wohnungsgröße',
    palette: ORRD,
    lowLabel: 'günstig',
    highLabel: 'teuer',
    decimals: 0,
  },
  {
    id: 'belastung_pers',
    label: 'Deine Mietbelastung',
    unit: '%',
    group: 'Mein Szenario',
    desc: 'Anteil deines Nettoeinkommens für die Kaltmiete — ab 30 % gilt Wohnen als teuer',
    palette: RDYLGN_REV,
    lowLabel: 'leistbar',
    highLabel: 'überlastet',
    decimals: 1,
    breaks: [10, 15, 20, 25, 30, 35, 45],
  },
  {
    id: 'rest_einkommen',
    label: 'Resteinkommen',
    unit: '€/Monat',
    group: 'Mein Szenario',
    desc: 'Nettoeinkommen minus Kaltmiete',
    palette: RDYLGN,
    lowLabel: 'wenig übrig',
    highLabel: 'viel übrig',
    decimals: 0,
  },
  {
    id: 'kauf_monat',
    label: 'Bauen: Monatsrate',
    unit: '€/Monat',
    group: 'Mein Szenario',
    desc: 'Annuität für Grundstück + Neubau nach Eigenkapital (Baulandpreise 2022, Baukosten pauschal)',
    palette: ORRD,
    lowLabel: 'günstig',
    highLabel: 'teuer',
    decimals: 0,
  },
  {
    id: 'kauf_vs_miete',
    label: 'Bauen vs. Mieten',
    unit: '€/Monat',
    group: 'Mein Szenario',
    desc: 'Monatsrate Neubau minus Kaltmiete für dieselbe Wohnfläche — unter 0 ist Bauen günstiger',
    palette: RDBU,
    lowLabel: 'Bauen günstiger',
    highLabel: 'Mieten günstiger',
    decimals: 0,
    breaks: [-500, -200, 0, 300, 800, 1500, 3000],
  },
]

export const metricById = (id: string): MetricDef => {
  const m = METRICS.find((m) => m.id === id)
  if (!m) throw new Error(`unknown metric ${id}`)
  return m
}

export const fmtNumber = (v: number, decimals: number): string =>
  v.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

export const fmtMetric = (v: number, m: MetricDef): string => `${fmtNumber(v, m.decimals)} ${m.unit}`
