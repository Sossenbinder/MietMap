import type { Scenario } from './components/ScenarioPanel'
import type { Weights } from './components/WeightPanel'
import type { Dataset, Gemeinde } from './types'

/** Apply `fn` to every entry; returns the very same object reference if nothing actually changed. */
export function mapDataset(data: Dataset, fn: (g: Gemeinde) => Gemeinde): Dataset {
  let changed = false
  const next: Dataset = {}
  for (const [ars, g] of Object.entries(data)) {
    const ng = fn(g)
    next[ars] = ng
    if (ng !== g) changed = true
  }
  return changed ? next : data
}

/** Composite score from percentile ranks + adjustable weights (0..100 each). */
export function recomputeScore(g: Gemeinde, weights: Weights): Gemeinde {
  if (!g.p) return g
  const sum = weights[0] + weights[1] + weights[2]
  const w: Weights = sum === 0 ? [1, 1, 1] : weights
  const wsum = w[0] + w[1] + w[2]
  const score = Math.round(((w[0] * g.p[0] + w[1] * g.p[1] + w[2] * g.p[2]) / wsum) * 100 * 10) / 10
  if (g.m.score === score) return g
  return { ...g, m: { ...g.m, score } }
}

/** "Mein Szenario" metrics (rent, buy-vs-rent) derived client-side from the scenario panel state. */
export function recomputeScenario(g: Gemeinde, scenario: Scenario): Gemeinde {
  const rentPerM2 = scenario.basis === 'bestand' ? g.m.qm_miete : g.m.angebotsmiete
  const validInputs = scenario.m2 > 0 && Number.isFinite(scenario.income) && scenario.income > 0
  const validBauInputs = scenario.m2 > 0 && Number.isFinite(scenario.eigenkapital)

  const m = { ...g.m }
  let monatsmiete: number | undefined
  let belastung_pers: number | undefined
  let rest_einkommen: number | undefined
  let kauf_monat: number | undefined
  let kauf_vs_miete: number | undefined

  // asking rent in the open-ended top class is a lower bound on the true rent, independent of
  // which downstream metrics can actually be computed from the current income/m2 inputs
  const geq = rentPerM2 != null && scenario.basis === 'neu' && g.m.angebotsmiete === 12.5

  // cold (Kaltmiete) monthly rent, kept separate from the possibly warm-adjusted display value —
  // kauf_vs_miete always compares financing against the cold rent, never the warm one
  const coldMonatsmiete = scenario.m2 > 0 && rentPerM2 != null ? Math.round(rentPerM2 * scenario.m2) : undefined

  if (validInputs && rentPerM2 != null) {
    const effRentPerM2 = rentPerM2 + (scenario.warm ? scenario.nk : 0)
    monatsmiete = Math.round(effRentPerM2 * scenario.m2)
    belastung_pers = Math.round((monatsmiete / scenario.income) * 1000) / 10
    rest_einkommen = Math.round(scenario.income - monatsmiete)
    m.monatsmiete = monatsmiete
    m.belastung_pers = belastung_pers
    m.rest_einkommen = rest_einkommen
  } else {
    delete m.monatsmiete
    delete m.belastung_pers
    delete m.rest_einkommen
  }

  if (validBauInputs && g.m.bauland != null) {
    const price = g.m.bauland * scenario.plot + scenario.baukosten * scenario.m2
    const loan = Math.max(0, price * (1 + scenario.nebenkosten / 100) - scenario.eigenkapital)
    const r = scenario.zins / 100 / 12
    const n = scenario.jahre * 12
    kauf_monat = Math.round(loan === 0 ? 0 : (loan * r) / (1 - Math.pow(1 + r, -n)))
    m.kauf_monat = kauf_monat
    if (coldMonatsmiete != null) {
      kauf_vs_miete = kauf_monat - coldMonatsmiete
      m.kauf_vs_miete = kauf_vs_miete
    } else {
      delete m.kauf_vs_miete
    }
  } else {
    delete m.kauf_monat
    delete m.kauf_vs_miete
  }

  const same =
    g.m.monatsmiete === monatsmiete &&
    g.m.belastung_pers === belastung_pers &&
    g.m.rest_einkommen === rest_einkommen &&
    g.m.kauf_monat === kauf_monat &&
    g.m.kauf_vs_miete === kauf_vs_miete &&
    !!g.geq === geq
  if (same) return g
  return { ...g, m, geq }
}
