import type { MetricDef } from './metrics'
import type { Dataset } from './types'

export interface Scale {
  /** Break values, same length as the palette; strictly increasing */
  breaks: number[]
  palette: string[]
}

/**
 * Quantile-based breaks so every palette step covers an equal share of Gemeinden —
 * unless the metric defines fixed breaks (e.g. a metric with a natural, non-relative scale).
 */
export function computeScale(data: Dataset, def: MetricDef): Scale | null {
  const values = Object.values(data)
    .map((g) => g.m[def.id])
    .filter((v): v is number => v != null)
  if (values.length === 0) return null

  if (def.breaks) return { breaks: def.breaks, palette: def.palette }

  values.sort((a, b) => a - b)
  if (values.length < def.palette.length) return null

  const breaks: number[] = []
  for (let i = 0; i < def.palette.length; i++) {
    const q = values[Math.floor((i / (def.palette.length - 1)) * (values.length - 1))]
    // interpolate expressions need strictly increasing stops
    breaks.push(breaks.length && q <= breaks[breaks.length - 1] ? breaks[breaks.length - 1] + 1e-6 : q)
  }
  return { breaks, palette: def.palette }
}

/** MapLibre paint expression: color by feature-state value, transparent when unset. */
export function fillColorExpression(metricId: string, scale: Scale): unknown[] {
  const stops = scale.breaks.flatMap((b, i) => [b, scale.palette[i]])
  return [
    'case',
    ['==', ['feature-state', metricId], null],
    'rgba(200,200,200,0.25)',
    ['interpolate', ['linear'], ['feature-state', metricId], ...stops],
  ]
}
