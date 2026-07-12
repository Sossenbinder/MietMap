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
import { mapDataset, recomputeScenario, recomputeScore } from './recompute'
import { computeScale } from './scale'
import type { Dataset, Gemeinde } from './types'

const SCENARIO_STORAGE_KEY = 'mietmap.scenario'
const DEFAULT_SCENARIO: Scenario = {
  m2: 70,
  income: 2800,
  basis: 'bestand',
  warm: false,
  nk: 3.5,
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

type BaseScenario = Pick<Scenario, 'm2' | 'income' | 'basis' | 'warm' | 'nk'>
type BauScenario = Pick<Scenario, 'plot' | 'baukosten' | 'eigenkapital' | 'zins' | 'jahre' | 'nebenkosten'>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateBaseScenario(v: any): BaseScenario | null {
  if (
    typeof v?.m2 !== 'number' ||
    typeof v?.income !== 'number' ||
    (v?.basis !== 'bestand' && v?.basis !== 'neu') ||
    typeof v?.warm !== 'boolean' ||
    typeof v?.nk !== 'number'
  ) {
    return null
  }
  if (v.m2 < 20 || v.m2 > 200 || v.income < 500 || v.income > 10000 || v.nk < 2 || v.nk > 6) return null
  return { m2: v.m2, income: v.income, basis: v.basis, warm: v.warm, nk: v.nk }
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
  const [m2Str, incomeStr, basisStr, warmStr, nkStr] = s.split(',')
  return validateBaseScenario({
    m2: Number(m2Str),
    income: Number(incomeStr),
    basis: basisStr === 'n' ? 'neu' : basisStr === 'b' ? 'bestand' : undefined,
    warm: warmStr === 'w' ? true : warmStr === 'k' ? false : undefined,
    nk: Number(nkStr),
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
  // Kreis-level overlay for low zoom; defaults to "loaded but empty" so a missing/failed fetch
  // degrades to simply no Kreis layer instead of blocking or crashing the rest of the app.
  const [dataK, setDataK] = useState<Dataset>({})
  const [dataKLoaded, setDataKLoaded] = useState(false)
  const [metricId, setMetricId] = useState(() =>
    initialMetric && METRICS.some((m) => m.id === initialMetric) ? initialMetric : 'qm_miete',
  )
  const [selected, setSelected] = useState<string | null>(() => initialArs || null)
  const [panelOpen, setPanelOpen] = useState(() => window.innerWidth > 720)
  const [flyTarget, setFlyTarget] = useState<{ center: [number, number]; ts: number } | null>(null)
  const [weights, setWeights] = useState<Weights>([33, 33, 33])
  const [scenario, setScenario] = useState<Scenario>(initialScenario)

  // Kreis ars codes are 5 digits (a prefix of the 12-digit Gemeinde ars); Gemeinde/Kreis ids never collide.
  function getEntry(ars: string): Gemeinde | undefined {
    return ars.length === 5 ? dataK[ars] : (data?.[ars] ?? undefined)
  }

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/metrics.json`)
      .then((r) => r.json())
      .then(setData)
  }, [])

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/metrics_kreise.json`)
      .then((r) => (r.ok ? r.json() : {}))
      .then(setDataK)
      .catch(() => setDataK({}))
      .finally(() => setDataKLoaded(true))
  }, [])

  // resolve the hash-provided selection once the dataset(s) it could refer to are available
  const initSelectionRef = useRef(false)
  useEffect(() => {
    if (!data || initSelectionRef.current) return
    if (selected && selected.length === 5 && !dataKLoaded) return // could be a Kreis ars — wait for it
    initSelectionRef.current = true
    const entry = selected ? getEntry(selected) : undefined
    if (selected && entry) {
      setFlyTarget({ center: entry.c, ts: Date.now() })
    } else if (selected) {
      setSelected(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, dataK, dataKLoaded, selected])

  // keep the URL hash in sync with the current metric/selection/scenario
  useEffect(() => {
    const params = new URLSearchParams()
    params.set('m', metricId)
    if (selected) params.set('g', selected)
    params.set(
      's',
      `${scenario.m2},${scenario.income},${scenario.basis === 'neu' ? 'n' : 'b'},${scenario.warm ? 'w' : 'k'},${scenario.nk}`,
    )
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
  // (applies to both the Gemeinde and Kreis datasets — Kreis entries carry "p" too, percentiles are
  // computed within the Kreis set, which is intended)
  useEffect(() => {
    const t = setTimeout(() => {
      setData((prev) => (prev ? mapDataset(prev, (g) => recomputeScore(g, weights)) : prev))
      setDataK((prev) => mapDataset(prev, (g) => recomputeScore(g, weights)))
    }, 150)
    return () => clearTimeout(t)
  }, [weights])

  // recompute the "Mein Szenario" metrics client-side, on load and whenever the scenario changes.
  // Gemeinde data gates the effect (it's the primary dataset); dataKLoaded is also a dependency so
  // the Kreis dataset gets its first pass once its own fetch settles, even without a scenario change.
  const dataLoaded = data != null
  useEffect(() => {
    if (!dataLoaded) return
    const t = setTimeout(() => {
      setData((prev) => (prev ? mapDataset(prev, (g) => recomputeScenario(g, scenario)) : prev))
      setDataK((prev) => mapDataset(prev, (g) => recomputeScenario(g, scenario)))
    }, 150)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario, dataLoaded, dataKLoaded])

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

  const isMobile = () => window.innerWidth <= 720

  const pick = (ars: string) => {
    setSelected(ars)
    setFlyTarget({ center: data[ars].c, ts: Date.now() })
    if (isMobile()) setPanelOpen(false)
  }

  // On mobile, collapse the metric panel when a feature is selected so the detail
  // sheet and the map aren't buried under it.
  const handleSelect = (ars: string | null) => {
    setSelected(ars)
    if (ars && isMobile()) setPanelOpen(false)
  }

  const showContext = panelOpen && (metric.group === 'Mein Szenario' || metricId === 'score')

  const selectedEntry = selected ? getEntry(selected) : undefined

  return (
    <div className="app">
      <MapView
        data={data}
        dataK={dataK}
        metricId={metricId}
        scale={scale}
        selected={selected}
        flyTarget={flyTarget}
        onSelect={handleSelect}
      />

      <header className="panel">
        <div className="panel-header">
          <h1>Mietmap</h1>
          <button
            className="panel-toggle"
            aria-label="Kennzahlen ein-/ausklappen"
            onClick={() => setPanelOpen((v) => !v)}
          >
            {panelOpen ? '▾' : '▸'}
          </button>
        </div>
        <p className="tagline">Mieten, Wohnungsmarkt & Lebensqualität in {Object.keys(data).length.toLocaleString('de-DE')} Gemeinden</p>
        <div className={`panel-scroll ${panelOpen ? '' : 'collapsed'}`}>
          <MetricPicker metricId={metricId} available={available} onChange={setMetricId} />
        </div>
        {showContext && (
          <div className="panel-context">
            {metric.group === 'Mein Szenario' && (
              <ScenarioPanel scenario={scenario} metricId={metricId} onChange={setScenario} />
            )}
            {metricId === 'score' && <WeightPanel weights={weights} onChange={setWeights} />}
            {metricId === 'score' && <Ranking data={data} onPick={pick} />}
          </div>
        )}
        <Legend metric={metric} scale={scale} />
      </header>

      <div className="topright">
        <SearchBox
          data={data}
          onPick={pick}
        />
      </div>

      {selected && selectedEntry && (
        <DetailPanel gemeinde={selectedEntry} ars={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
