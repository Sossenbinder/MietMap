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
                      <span className="badge" title="Für diese Gemeinde liegt kein eigener Wert vor; angezeigt wird der Wert des Kreises.">
                        Kreiswert
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )
      })}

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
