import { useEffect, useState } from 'react'
import { bezLabel, STRINGS, useLang, useT } from '../i18n'
import { GROUP_LABELS, GROUP_ORDER, METRICS, SCENARIO_METRIC_IDS, fmtMetric, fmtNumber, scenarioBoundPrefix } from '../metrics'
import type { Gemeinde } from '../types'
import Sparkline from './Sparkline'

interface Props {
  gemeinde: Gemeinde
  ars: string
  onClose: () => void
}

type BaulandHistory = Record<string, [number, number][]>

const SCORE_COMPONENTS: { key: keyof typeof STRINGS; idx: 0 | 1 | 2 }[] = [
  { key: 'wAfford', idx: 0 },
  { key: 'wMarket', idx: 1 },
  { key: 'wAmenities', idx: 2 },
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
  const { lang } = useLang()
  const t = useT()
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
      <button className="detail-close" onClick={onClose} aria-label={t('close')}>
        ×
      </button>
      <h2>{g.n}</h2>
      <div className="detail-sub">
        {bezLabel(g.b, lang)} · {g.kr}
      </div>
      <div className="detail-pop">{t('residents').replace('{n}', fmtNumber(g.e, 0, lang))}</div>

      {GROUP_ORDER.map((group) => {
        const metrics = METRICS.filter((m) => m.group === group && g.m[m.id] != null)
        if (!metrics.length) return null
        return (
          <section key={group}>
            <h3>{GROUP_LABELS[group][lang]}</h3>
            <dl>
              {metrics.map((m) => (
                <div key={m.id} className="detail-row">
                  <dt>{m.label[lang]}</dt>
                  <dd>
                    {g.geq && SCENARIO_METRIC_IDS.has(m.id) ? scenarioBoundPrefix(m.id) : ''}
                    {fmtMetric(g.m[m.id], m, lang)}
                    {g.k?.includes(m.id) && (
                      <sup className="kreis-mark" title={t('kreiswertTitle')}>
                        °
                      </sup>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            {group === 'overall' && g.p && (
              <div className="score-breakdown">
                {SCORE_COMPONENTS.map(({ key, idx }) => {
                  const p = g.p?.[idx]
                  if (p == null) return null
                  return (
                    <div key={key} className="score-breakdown-row">
                      <div className="score-breakdown-label">{t(key)}</div>
                      <div className="score-bar-track">
                        <div className="score-bar" style={{ width: `${p * 100}%` }} />
                      </div>
                      <div className="score-breakdown-value">
                        {t('betterThan').replace('{x}', String(Math.round(p * 100)))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}

      {g.k && g.k.length > 0 && <div className="legend-note">{t('kreiswertFootnote')}</div>}

      {baulandSeries && baulandSeries.length > 1 && (
        <section>
          <h3>
            {t('sparklineTitle')
              .replace('{a}', String(baulandSeries[0][0]))
              .replace('{b}', String(baulandSeries[baulandSeries.length - 1][0]))}
          </h3>
          <Sparkline data={baulandSeries} lang={lang} />
        </section>
      )}
    </aside>
  )
}
