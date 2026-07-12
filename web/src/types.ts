export interface Gemeinde {
  /** Name */
  n: string
  /** Bezeichnung (Stadt, Gemeinde, Markt, …) */
  b: string
  /** Einwohnerzahl */
  e: number
  /** Kreis name */
  kr: string
  /** Centroid [lng, lat] */
  c: [number, number]
  /** Metric values */
  m: Record<string, number>
  /** Metrics filled from Kreis level */
  k?: string[]
  /** Percentile ranks 0..1 for the composite score: [affordability, market, amenities] */
  p?: [number, number, number]
  /** True when the scenario metrics for this entry are a lower bound (open-ended top rent class) */
  geq?: boolean
}

export type Dataset = Record<string, Gemeinde>
