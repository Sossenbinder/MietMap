import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from 'react'

export type Lang = 'de' | 'en'

const LANG_STORAGE_KEY = 'mietmap.lang'

function detectInitialLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY)
    if (stored === 'de' || stored === 'en') return stored
    return navigator.language?.toLowerCase().startsWith('de') ? 'de' : 'en'
  } catch {
    return 'de'
  }
}

interface LangContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
}

const LangContext = createContext<LangContextValue | null>(null)

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectInitialLang)

  // keeps <html lang> in sync on both the initial value and every later change
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = (next: Lang) => {
    setLangState(next)
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }

  return createElement(LangContext.Provider, { value: { lang, setLang } }, children)
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used within a LangProvider')
  return ctx
}

/** BCP-47 locale used for Intl/toLocaleString number formatting. */
export const localeOf = (lang: Lang) => (lang === 'de' ? 'de-DE' : 'en-GB')

export const STRINGS = {
  tagline: {
    de: 'Mieten, Wohnungsmarkt & Lebensqualität in {n} Gemeinden',
    en: 'Rents, housing market & quality of life across {n} municipalities',
  },
  loading: { de: 'Lade Daten …', en: 'Loading data …' },
  myDetails: { de: '🏠 Meine Angaben (Wohnung & Einkommen)', en: '🏠 Your details (flat & income)' },
  panelToggle: { de: 'Kennzahlen ein-/ausklappen', en: 'Show/hide metrics' },
  scenarioHint: {
    de: 'Kennzahl wählen, dann Wohnungsgröße, Einkommen & Finanzierung unten eingeben.',
    en: 'Pick a metric, then enter flat size, income & financing below.',
  },
  legendQuantile: {
    de: 'Farbstufen: gleich große Anteile der Gemeinden (Quantile)',
    en: 'Colour steps: equal shares of municipalities (quantiles)',
  },
  legendFixed: { de: 'Farbstufen: feste Schwellenwerte', en: 'Colour steps: fixed thresholds' },
  searchPlaceholder: { de: 'Gemeinde suchen …', en: 'Search municipality …' },
  residents: { de: '{n} Einwohner', en: '{n} residents' },
  kreiswert: { de: 'Kreiswert', en: 'district value' },
  kreiswertTitle: {
    de: 'Kreiswert — kein gemeindespezifischer Wert verfügbar',
    en: 'District value — no municipality-specific figure available',
  },
  kreiswertFootnote: {
    de: '° Kreiswert — kein gemeindespezifischer Wert',
    en: '° District value — no municipality-specific figure',
  },
  noData: { de: 'keine Daten', en: 'no data' },
  weightsTitle: { de: 'Gewichtung', en: 'Weighting' },
  wAfford: { de: 'Bezahlbarkeit', en: 'Affordability' },
  wMarket: { de: 'Marktentspannung', en: 'Market slack' },
  wAmenities: { de: 'Nahversorgung', en: 'Amenities' },
  betterThan: { de: 'besser als {x} %', en: 'better than {x}%' },
  rankingTitle: { de: 'Top 10', en: 'Top 10' },
  close: { de: 'Schließen', en: 'Close' },
  sparklineTitle: { de: 'Baulandpreis {a}–{b} (Kreis)', en: 'Land price {a}–{b} (district)' },
  scenarioAdjust: { de: 'Szenario anpassen', en: 'Adjust scenario' },
  sFlatSize: { de: 'Wohnungsgröße', en: 'Flat size' },
  sIncome: { de: 'Nettoeinkommen', en: 'Net income' },
  sIncomeMonthly: { de: 'Nettoeinkommen (monatlich)', en: 'Net income (monthly)' },
  sExisting: { de: 'Bestandsmiete', en: 'Existing rent' },
  sNew: { de: 'Neuvermietung', en: 'New lease' },
  sCold: { de: 'Kaltmiete', en: 'Cold rent' },
  sWarm: { de: 'Warmmiete', en: 'Warm rent' },
  sNkFlat: { de: 'Nebenkosten-Pauschale', en: 'Utilities flat rate' },
  sNewHint: {
    de: 'Neuvermietung basiert auf Kreis-Klassenmitten (BBSR); in Hochpreis-Kreisen (Klasse „11,50 € und mehr“) ist die echte Miete meist höher.',
    en: 'New-lease rent uses district class midpoints (BBSR); in high-price districts (class "€11.50 and above") the real rent is usually higher.',
  },
  sWarmHint: {
    de: 'Warmmiete = Kaltmiete + Pauschale; Angaben ohne Heizkosten-Garantie.',
    en: 'Warm rent = cold rent + flat rate; no guarantee on heating costs.',
  },
  sBauTitle: { de: 'Bauen & Finanzierung', en: 'Building & Financing' },
  sPlot: { de: 'Grundstück', en: 'Plot' },
  sBuildCost: { de: 'Baukosten', en: 'Construction cost' },
  sEquity: { de: 'Eigenkapital', en: 'Equity' },
  sRate: { de: 'Zins', en: 'Interest' },
  sTerm: { de: 'Laufzeit', en: 'Term' },
  sBuyCosts: { de: 'Kaufnebenkosten', en: 'Purchase fees' },
  sYears: { de: 'Jahre', en: 'years' },
  sBauHint: {
    de: 'Modell: Neubau auf gekauftem Grundstück. Echte Kaufpreise für Bestandsimmobilien sind nicht frei verfügbar.',
    en: 'Model: new build on a purchased plot. Real purchase prices for existing homes are not freely available.',
  },
  introTitle: { de: 'Deine Situation', en: 'Your situation' },
  introText: {
    de: 'Gib deine Wohnung und dein Einkommen ein — die Karte zeigt dann Miete, Mietbelastung und Baukosten für deinen Fall. Alles bleibt jederzeit änderbar.',
    en: 'Enter your flat and income — the map then shows rent, rent burden and building costs for your case. Everything stays editable.',
  },
  introBasisHint: {
    de: 'Bestandsmiete = laufende Verträge (Zensus). Neuvermietung = aktuelle Angebotsmieten (höher).',
    en: 'Existing rent = ongoing contracts (census). New lease = current asking rents (higher).',
  },
  introSkip: { de: 'Überspringen', en: 'Skip' },
  introApply: { de: 'Karte anpassen', en: 'Personalise map' },
} satisfies Record<string, { de: string; en: string }>

export function useT() {
  const { lang } = useLang()
  return (key: keyof typeof STRINGS): string => STRINGS[key][lang]
}

/** Translations for common `Gemeinde.b` / `Kreis.b` designators; unknown values pass through untouched. */
const BEZ_LABELS: Record<string, { de: string; en: string }> = {
  Stadt: { de: 'Stadt', en: 'City' },
  Landkreis: { de: 'Landkreis', en: 'District' },
  'Kreisfreie Stadt': { de: 'Kreisfreie Stadt', en: 'Urban district' },
  Stadtkreis: { de: 'Stadtkreis', en: 'Urban district' },
  Gemeinde: { de: 'Gemeinde', en: 'Municipality' },
  Markt: { de: 'Markt', en: 'Market town' },
  Kreis: { de: 'Kreis', en: 'District' },
}

export function bezLabel(b: string, lang: Lang): string {
  return BEZ_LABELS[b]?.[lang] ?? b
}
