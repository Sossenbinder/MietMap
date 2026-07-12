import { useEffect, useMemo, useRef, useState } from 'react'
import DetailPanel from './components/DetailPanel'
import Legend from './components/Legend'
import MetricPicker from './components/MetricPicker'
import Ranking from './components/Ranking'
import ScenarioPanel, { type Scenario } from './components/ScenarioPanel'
import SearchBox from './components/SearchBox'
import WeightPanel, { type Weights } from './components/WeightPanel'
import MapView from './map/MapView'
import { METRICS, metricById } from './metrics'
import { computeScale } from './scale'
import type { Dataset } from './types'

const SCENARIO_STORAGE_KEY = 'mietmap.scenario'
const DEFAULT_SCENARIO: Scenario = {
  m2: 70,
  income: 2800,
  basis: 'bestand',
  plot: 500,
  baukosten: 3200,
  eigenkapital: 100000,
  zins: 3.8,
  jahre: 30,
  nebenkosten: 10,
}

const initialHash = new URLSearchParams(location.hash.slice(1))
const initialMetric = initialHash.get('m')
const initialArs = initialHash.get('g')

type BaseScenario = Pick<Scenario, 'm2' | 'income' | 'basis'>
type BauScenario = Pick<Scenario, 'plot' | 'baukosten' | 'eigenkapital' | 'zins' | 'jahre' | 'nebenkosten'>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateBaseScenario(v: any): BaseScenario | null {
  if (typeof v?.m2 !== 'number' || typeof v?.income !== 'number' || (v?.basis !== 'bestand' && v?.basis !== 'neu')) {
    return null
  }
  if (v.m2 < 20 || v.m2 > 200 || v.income < 500 || v.income > 10000) return null
  return { m2: v.m2, income: v.income, basis: v.basis }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateBauScenario(v: any): BauScenario | null {
  if (
    typeof v?.plot !== 'number' ||
    v.plot < 200 ||
    v.plot > 1500 ||
    typeof v?.baukosten !== 'number' ||
    v.baukosten < 2000 ||
    v.baukosten > 5000 ||
    typeof v?.eigenkapital !== 'number' ||
    v.eigenkapital < 0 ||
    v.eigenkapital > 1000000 ||
    typeof v?.zins !== 'number' ||
    v.zins < 1 ||
    v.zins > 7 ||
    typeof v?.jahre !== 'number' ||
    v.jahre < 10 ||
    v.jahre > 40 ||
    typeof v?.nebenkosten !== 'number' ||
    v.nebenkosten < 5 ||
    v.nebenkosten > 15
  ) {
    return null
  }
  return {
    plot: v.plot,
    baukosten: v.baukosten,
    eigenkapital: v.eigenkapital,
    zins: v.zins,
    jahre: v.jahre,
    nebenkosten: v.nebenkosten,
  }
}

function parseScenarioHash(): BaseScenario | null {
  const s = initialHash.get('s')
  if (!s) return null
  const [m2Str, incomeStr, basisStr] = s.split(',')
  return validateBaseScenario({
    m2: Number(m2Str),
    income: Number(incomeStr),
    basis: basisStr === 'n' ? 'neu' : basisStr === 'b' ? 'bestand' : undefined,
  })
}

function parseBauHash(): BauScenario | null {
  const b = initialHash.get('b')
  if (!b) return null
  const [plotStr, baukostenStr, eigenkapitalStr, zinsStr, jahreStr, nebenkostenStr] = b.split(',')
  return validateBauScenario({
    plot: Number(plotStr),
    baukosten: Number(baukostenStr),
    eigenkapital: Number(eigenkapitalStr),
    zins: Number(zinsStr),
    jahre: Number(jahreStr),
    nebenkosten: Number(nebenkostenStr),
  })
}

function readStoredScenarioRaw(): unknown {
  try {
    const raw = localStorage.getItem(SCENARIO_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const storedScenario = readStoredScenarioRaw()
const initialScenario: Scenario = {
  ...DEFAULT_SCENARIO,
  ...(validateBaseScenario(storedScenario) ?? {}),
  ...(validateBauScenario(storedScenario) ?? {}),
  ...(parseScenarioHash() ?? {}),
  ...(parseBauHash() ?? {}),
}

export default function App() {
  const [data, setData] = useState<Dataset | null>(null)
  const [metricId, setMetricId] = useState(() =>
    initialMetric && METRICS.some((m) => m.id === initialMetric) ? initialMetric : 'qm_miete',
  )
  const [selected, setSelected] = useState<string | null>(() => initialArs || null)
  const [flyTarget, setFlyTarget] = useState<{ center: [number, number]; ts: number } | null>(null)
  const [weights, setWeights] = useState<Weights>([33, 33, 33])
  const [scenario, setScenario] = useState<Scenario>(initialScenario)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/metrics.json`)
      .then((r) => r.json())
      .then(setData)
  }, [])

  // resolve the hash-provided selection once the dataset is available
  const initSelectionRef = useRef(false)
  useEffect(() => {
    if (!data || initSelectionRef.current) return
    initSelectionRef.current = true
    if (selected && data[selected]) {
      setFlyTarget({ center: data[selected].c, ts: Date.now() })
    } else if (selected) {
      setSelected(null)
    }
  }, [data, selected])

  // keep the URL hash in sync with the current metric/selection/scenario
  useEffect(() => {
    const params = new URLSearchParams()
    params.set('m', metricId)
    if (selected) params.set('g', selected)
    params.set('s', `${scenario.m2},${scenario.income},${scenario.basis === 'neu' ? 'n' : 'b'}`)
    params.set(
      'b',
      `${scenario.plot},${scenario.baukosten},${scenario.eigenkapital},${scenario.zins},${scenario.jahre},${scenario.nebenkosten}`,
    )
    history.replaceState(null, '', `#${params.toString()}`)
  }, [metricId, selected, scenario])

  // persist the scenario across visits
  useEffect(() => {
    localStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify(scenario))
  }, [scenario])

  // recompute the composite score client-side from percentile ranks whenever the weights change
  useEffect(() => {
    const t = setTimeout(() => {
      setData((prev) => {
        if (!prev) return prev
        const sum = weights[0] + weights[1] + weights[2]
        const w: Weights = sum === 0 ? [1, 1, 1] : weights
        const wsum = w[0] + w[1] + w[2]
        let changed = false
        const next: Dataset = {}
        for (const [ars, g] of Object.entries(prev)) {
          if (!g.p) {
            next[ars] = g
            continue
          }
          const score = Math.round(((w[0] * g.p[0] + w[1] * g.p[1] + w[2] * g.p[2]) / wsum) * 100 * 10) / 10
          if (g.m.score === score) {
            next[ars] = g
            continue
          }
          changed = true
          next[ars] = { ...g, m: { ...g.m, score } }
        }
        return changed ? next : prev
      })
    }, 150)
    return () => clearTimeout(t)
  }, [weights])

  // recompute the "Mein Szenario" metrics client-side, on load and whenever the scenario changes
  const dataLoaded = data != null
  useEffect(() => {
    if (!dataLoaded) return
    const t = setTimeout(() => {
      setData((prev) => {
        if (!prev) return prev
        const validInputs = scenario.m2 > 0 && Number.isFinite(scenario.income) && scenario.income > 0
        const validBauInputs = scenario.m2 > 0 && Number.isFinite(scenario.eigenkapital)
        let changed = false
        const next: Dataset = {}
        for (const [ars, g] of Object.entries(prev)) {
          const rentPerM2 = scenario.basis === 'bestand' ? g.m.qm_miete : g.m.angebotsmiete
          const m = { ...g.m }
          let monatsmiete: number | undefined
          let belastung_pers: number | undefined
          let rest_einkommen: number | undefined
          let kauf_monat: number | undefined
          let kauf_vs_miete: number | undefined
          let geq = false

          if (validInputs && rentPerM2 != null) {
            monatsmiete = Math.round(rentPerM2 * scenario.m2)
            belastung_pers = Math.round((monatsmiete / scenario.income) * 1000) / 10
            rest_einkommen = Math.round(scenario.income - monatsmiete)
            geq = scenario.basis === 'neu' && g.m.angebotsmiete === 12.5
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
            if (monatsmiete != null) {
              kauf_vs_miete = kauf_monat - monatsmiete
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
          if (same) {
            next[ars] = g
            continue
          }
          changed = true
          next[ars] = { ...g, m, geq }
        }
        return changed ? next : prev
      })
    }, 150)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario, dataLoaded])

  const available = useMemo(() => {
    if (!data) return new Set<string>()
    const ids = new Set<string>()
    for (const g of Object.values(data)) for (const id of Object.keys(g.m)) ids.add(id)
    return ids
  }, [data])

  const metric = metricById(metricId)
  const scale = useMemo(() => (data ? computeScale(data, metric) : null), [data, metric])

  if (!data) {
    return (
      <div className="loading">
        <div className="loading-pulse" />
        Lade Daten …
      </div>
    )
  }

  const pick = (ars: string) => {
    setSelected(ars)
    setFlyTarget({ center: data[ars].c, ts: Date.now() })
  }

  return (
    <div className="app">
      <MapView
        data={data}
        metricId={metricId}
        scale={scale}
        selected={selected}
        flyTarget={flyTarget}
        onSelect={setSelected}
      />

      <header className="panel">
        <h1>Mietmap</h1>
        <p className="tagline">Mieten, Wohnungsmarkt & Lebensqualität in {Object.keys(data).length.toLocaleString('de-DE')} Gemeinden</p>
        <MetricPicker metricId={metricId} available={available} onChange={setMetricId} />
        {metric.group === 'Mein Szenario' && (
          <ScenarioPanel scenario={scenario} metricId={metricId} onChange={setScenario} />
        )}
        {metricId === 'score' && <WeightPanel weights={weights} onChange={setWeights} />}
        {metricId === 'score' && <Ranking data={data} onPick={pick} />}
        <Legend metric={metric} scale={scale} />
      </header>

      <div className="topright">
        <SearchBox
          data={data}
          onPick={pick}
        />
      </div>

      {selected && data[selected] && (
        <DetailPanel gemeinde={data[selected]} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
