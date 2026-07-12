import { useEffect, useState } from 'react'
import { METRICS, SCENARIO_METRIC_IDS, fmtMetric, fmtNumber, scenarioBoundPrefix } from '../metrics'
import type { Gemeinde } from '../types'
import Sparkline from './Sparkline'

interface Props {
  gemeinde: Gemeinde
  ars: string
  onClose: () => void
}

type BaulandHistory = Record<string, [number, number][]>

const SCORE_COMPONENTS: { label: string; idx: 0 | 1 | 2 }[] = [
  { label: 'Bezahlbarkeit', idx: 0 },
  { label: 'Marktentspannung', idx: 1 },
  { label: 'Nahversorgung', idx: 2 },
]

// fetched lazily, once, and cached across every DetailPanel mount
let baulandHistoryPromise: Promise<BaulandHistory> | null = null
function loadBaulandHistory(): Promise<BaulandHistory> {
  if (!baulandHistoryPromise) {
    baulandHistoryPromise = fetch(`${import.meta.env.BASE_URL}data/bauland_history.json`)
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}))
  }
  return baulandHistoryPromise
}

export default function DetailPanel({ gemeinde: g, ars, onClose }: Props) {
  const groups = [...new Set(METRICS.map((m) => m.group))]
  const [history, setHistory] = useState<BaulandHistory | null>(null)

  useEffect(() => {
    let cancelled = false
    loadBaulandHistory().then((h) => {
      if (!cancelled) setHistory(h)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const baulandSeries = history?.[ars.slice(0, 5)]

  return (
    <aside className="detail">
      <button className="detail-close" onClick={onClose} aria-label="Schließen">
        ×
      </button>
      <h2>{g.n}</h2>
      <div className="detail-sub">
        {g.b} · {g.kr}
      </div>
      <div className="detail-pop">{fmtNumber(g.e, 0)} Einwohner</div>

      {groups.map((group) => {
        const metrics = METRICS.filter((m) => m.group === group && g.m[m.id] != null)
        if (!metrics.length) return null
        return (
          <section key={group}>
            <h3>{group}</h3>
            <dl>
              {metrics.map((m) => (
                <div key={m.id} className="detail-row">
                  <dt>{m.label}</dt>
                  <dd>
                    {g.geq && SCENARIO_METRIC_IDS.has(m.id) ? scenarioBoundPrefix(m.id) : ''}
                    {fmtMetric(g.m[m.id], m)}
                    {g.k?.includes(m.id) && (
                      <sup className="kreis-mark" title="Kreiswert — kein gemeindespezifischer Wert verfügbar">
                        °
                      </sup>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            {group === 'Gesamt' && g.p && (
              <div className="score-breakdown">
                {SCORE_COMPONENTS.map(({ label, idx }) => {
                  const p = g.p?.[idx]
                  if (p == null) return null
                  return (
                    <div key={label} className="score-breakdown-row">
                      <div className="score-breakdown-label">{label}</div>
                      <div className="score-bar-track">
                        <div className="score-bar" style={{ width: `${p * 100}%` }} />
                      </div>
                      <div className="score-breakdown-value">besser als {Math.round(p * 100)} %</div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}

      {g.k && g.k.length > 0 && <div className="legend-note">° Kreiswert — kein gemeindespezifischer Wert</div>}

      {baulandSeries && baulandSeries.length > 1 && (
        <section>
          <h3>
            Baulandpreis {baulandSeries[0][0]}–{baulandSeries[baulandSeries.length - 1][0]} (Kreis)
          </h3>
          <Sparkline data={baulandSeries} />
        </section>
      )}
    </aside>
  )
}
