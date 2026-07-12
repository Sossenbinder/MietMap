import { useLang, useT } from '../i18n'
import { GROUP_LABELS, GROUP_ORDER, METRICS } from '../metrics'

interface Props {
  metricId: string
  available: Set<string>
  onChange: (id: string) => void
}

export default function MetricPicker({ metricId, available, onChange }: Props) {
  const { lang } = useLang()
  const t = useT()
  return (
    <div className="metric-picker">
      {GROUP_ORDER.map((group) => {
        const metrics = METRICS.filter((m) => m.group === group && available.has(m.id))
        if (!metrics.length) return null
        return (
          <div key={group} className="metric-group">
            <div className="metric-group-title">{GROUP_LABELS[group][lang]}</div>
            {group === 'scenario' && <div className="metric-group-hint">{t('scenarioHint')}</div>}
            {metrics.map((m) => (
              <button
                key={m.id}
                className={`metric-btn ${m.id === metricId ? 'active' : ''}`}
                onClick={() => onChange(m.id)}
                title={m.desc[lang]}
              >
                <span className="metric-swatch" style={{ background: m.palette[4] }} />
                {m.label[lang]}
              </button>
            ))}
          </div>
        )
      })}
    </div>
  )
}
