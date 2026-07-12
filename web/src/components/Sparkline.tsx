import { fmtNumber } from '../metrics'

const WIDTH = 260
const HEIGHT = 48
const PAD_Y = 4

interface Props {
  /** Ascending [year, value] pairs. */
  data: [number, number][]
}

export default function Sparkline({ data }: Props) {
  if (data.length < 2) return null

  const values = data.map(([, v]) => v)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1

  const points = data
    .map(([, v], i) => {
      const x = (i / (data.length - 1)) * WIDTH
      const y = HEIGHT - PAD_Y - ((v - min) / span) * (HEIGHT - PAD_Y * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const firstYear = data[0][0]
  const lastYear = data[data.length - 1][0]

  return (
    <div className="sparkline">
      <div className="sparkline-labels">
        <span>{fmtNumber(min, 0)} €/m²</span>
        <span>{fmtNumber(max, 0)} €/m²</span>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT} className="sparkline-svg">
        <polyline
          points={points}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <div className="sparkline-ticks">
        <span>{firstYear}</span>
        <span>{lastYear}</span>
      </div>
    </div>
  )
}
