import { STRINGS, useT } from '../i18n'

export type Weights = [number, number, number]

const SLIDERS: { key: keyof typeof STRINGS; idx: 0 | 1 | 2 }[] = [
  { key: 'wAfford', idx: 0 },
  { key: 'wMarket', idx: 1 },
  { key: 'wAmenities', idx: 2 },
]

interface Props {
  weights: Weights
  onChange: (weights: Weights) => void
}

export default function WeightPanel({ weights, onChange }: Props) {
  const t = useT()
  return (
    <div className="weight-panel">
      <div className="metric-group-title">{t('weightsTitle')}</div>
      {SLIDERS.map(({ key, idx }) => (
        <div key={idx} className="weight-row">
          <div className="weight-row-label">
            <span>{t(key)}</span>
            <span className="weight-row-value">{weights[idx]}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={weights[idx]}
            onChange={(e) => {
              const v = Number(e.target.value)
              const next: Weights = [idx === 0 ? v : weights[0], idx === 1 ? v : weights[1], idx === 2 ? v : weights[2]]
              onChange(next)
            }}
          />
        </div>
      ))}
    </div>
  )
}
