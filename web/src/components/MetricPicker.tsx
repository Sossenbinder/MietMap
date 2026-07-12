import { METRICS } from '../metrics'

interface Props {
  metricId: string
  available: Set<string>
  onChange: (id: string) => void
}

export default function MetricPicker({ metricId, available, onChange }: Props) {
  const groups = [...new Set(METRICS.map((m) => m.group))]
  return (
    <div className="metric-picker">
      {groups.map((group) => {
        const metrics = METRICS.filter((m) => m.group === group && available.has(m.id))
        if (!metrics.length) return null
        return (
          <div key={group} className="metric-group">
            <div className="metric-group-title">{group}</div>
            {group === 'Mein Szenario' && (
              <div className="metric-group-hint">
                Kennzahl wählen, dann Wohnungsgröße, Einkommen &amp; Finanzierung unten eingeben.
              </div>
            )}
            {metrics.map((m) => (
              <button
                key={m.id}
                className={`metric-btn ${m.id === metricId ? 'active' : ''}`}
                onClick={() => onChange(m.id)}
                title={m.desc}
              >
                <span className="metric-swatch" style={{ background: m.palette[4] }} />
                {m.label}
              </button>
            ))}
          </div>
        )
      })}
    </div>
  )
}
