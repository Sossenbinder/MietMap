import { useLang, useT } from '../i18n'
import { fmtNumber, type MetricDef } from '../metrics'
import type { Scale } from '../scale'

interface Props {
  metric: MetricDef
  scale: Scale | null
}

export default function Legend({ metric, scale }: Props) {
  const { lang } = useLang()
  const t = useT()
  if (!scale) return null
  const min = scale.breaks[0]
  const mid = scale.breaks[Math.floor(scale.breaks.length / 2)]
  const max = scale.breaks[scale.breaks.length - 1]
  return (
    <div className="legend">
      <div className="legend-desc">{metric.desc[lang]}</div>
      <div className="legend-bar" style={{ background: `linear-gradient(to right, ${scale.palette.join(', ')})` }} />
      <div className="legend-labels">
        <span>
          {fmtNumber(min, metric.decimals, lang)} <em>{metric.lowLabel[lang]}</em>
        </span>
        <span>{fmtNumber(mid, metric.decimals, lang)}</span>
        <span>
          <em>{metric.highLabel[lang]}</em> {fmtNumber(max, metric.decimals, lang)} {metric.unit[lang]}
        </span>
      </div>
      <div className="legend-note">{metric.breaks ? t('legendFixed') : t('legendQuantile')}</div>
    </div>
  )
}
