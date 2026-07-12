import { fmtNumber, type MetricDef } from '../metrics'
import type { Scale } from '../scale'

interface Props {
  metric: MetricDef
  scale: Scale | null
}

export default function Legend({ metric, scale }: Props) {
  if (!scale) return null
  const min = scale.breaks[0]
  const mid = scale.breaks[Math.floor(scale.breaks.length / 2)]
  const max = scale.breaks[scale.breaks.length - 1]
  return (
    <div className="legend">
      <div className="legend-desc">{metric.desc}</div>
      <div className="legend-bar" style={{ background: `linear-gradient(to right, ${scale.palette.join(', ')})` }} />
      <div className="legend-labels">
        <span>
          {fmtNumber(min, metric.decimals)} <em>{metric.lowLabel}</em>
        </span>
        <span>{fmtNumber(mid, metric.decimals)}</span>
        <span>
          <em>{metric.highLabel}</em> {fmtNumber(max, metric.decimals)} {metric.unit}
        </span>
      </div>
      <div className="legend-note">
        {metric.breaks
          ? 'Farbstufen: feste Schwellenwerte'
          : 'Farbstufen: gleich große Anteile der Gemeinden (Quantile)'}
      </div>
    </div>
  )
}
