import { METRICS, SCENARIO_METRIC_IDS, fmtMetric, fmtNumber, scenarioBoundPrefix } from '../metrics'
import type { Gemeinde } from '../types'

interface Props {
  gemeinde: Gemeinde
  onClose: () => void
}

export default function DetailPanel({ gemeinde: g, onClose }: Props) {
  const groups = [...new Set(METRICS.map((m) => m.group))]
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
    </aside>
  )
}
