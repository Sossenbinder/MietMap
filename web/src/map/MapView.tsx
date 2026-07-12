import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Protocol } from 'pmtiles'
import { useEffect, useRef } from 'react'
import { SCENARIO_METRIC_IDS, fmtMetric, metricById, scenarioBoundPrefix } from '../metrics'
import { fillColorExpression, type Scale } from '../scale'
import type { Dataset } from '../types'

maplibregl.addProtocol('pmtiles', new Protocol().tile)

const SOURCE = 'gemeinden'
const LAYER_FILL = 'gemeinden-fill'
const LAYER_LINE = 'gemeinden-line'
const LAYER_SELECTED = 'gemeinden-selected'

interface Props {
  data: Dataset
  metricId: string
  scale: Scale | null
  selected: string | null
  flyTarget: { center: [number, number]; ts: number } | null
  onSelect: (ars: string | null) => void
}

export default function MapView({ data, metricId, scale, selected, flyTarget, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const loadedRef = useRef(false)
  const hoverArs = useRef<string | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const metricRef = useRef(metricId)
  metricRef.current = metricId
  const dataRef = useRef(data)
  dataRef.current = data
  const scaleRef = useRef(scale)
  scaleRef.current = scale

  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current!,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [10.45, 51.2],
      zoom: 5.6,
      minZoom: 4.5,
      maxZoom: 13,
      attributionControl: false,
    })
    mapRef.current = map

    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution:
          'Daten: © <a href="https://www.bkg.bund.de">BKG</a>, ' +
          '<a href="https://www.zensus2022.de">Zensus 2022</a>, ' +
          '<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · ' +
          'Karte: <a href="https://openfreemap.org">OpenFreeMap</a>',
      }),
    )
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')

    map.on('load', () => {
      map.addSource(SOURCE, {
        type: 'vector',
        url: `pmtiles://${location.origin}${import.meta.env.BASE_URL}data/gemeinden.pmtiles`,
        promoteId: 'ars',
      })

      // paint below the basemap's labels so place names stay readable
      const firstSymbol = map.getStyle().layers.find((l) => l.type === 'symbol')?.id

      map.addLayer(
        {
          id: LAYER_FILL,
          type: 'fill',
          source: SOURCE,
          'source-layer': 'gemeinden',
          paint: {
            'fill-color': 'rgba(0,0,0,0)',
            'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.95, 0.78],
          },
        },
        firstSymbol,
      )
      map.addLayer(
        {
          id: LAYER_LINE,
          type: 'line',
          source: SOURCE,
          'source-layer': 'gemeinden',
          paint: {
            'line-color': '#ffffff',
            'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.1, 9, 0.6, 12, 1.2],
            'line-opacity': 0.5,
          },
        },
        firstSymbol,
      )
      map.addLayer({
        id: LAYER_SELECTED,
        type: 'line',
        source: SOURCE,
        'source-layer': 'gemeinden',
        paint: { 'line-color': '#1d4ed8', 'line-width': 2.5 },
        filter: ['==', ['get', 'ars'], ''],
      })

      map.on('mousemove', LAYER_FILL, (e) => {
        const f = e.features?.[0]
        if (!f) return
        const ars = f.id as string
        if (hoverArs.current && hoverArs.current !== ars) {
          map.setFeatureState({ source: SOURCE, sourceLayer: 'gemeinden', id: hoverArs.current }, { hover: false })
        }
        map.setFeatureState({ source: SOURCE, sourceLayer: 'gemeinden', id: ars }, { hover: true })
        hoverArs.current = ars
        map.getCanvas().style.cursor = 'pointer'

        const tip = tooltipRef.current!
        const g = dataRef.current[ars]
        if (g) {
          const m = metricById(metricRef.current)
          const v = g.m[metricRef.current]
          const geqPrefix =
            g.geq && SCENARIO_METRIC_IDS.has(metricRef.current) ? scenarioBoundPrefix(metricRef.current) : ''
          tip.innerHTML =
            `<strong>${g.n}</strong>` +
            `<span>${v != null ? geqPrefix + fmtMetric(v, m) : 'keine Daten'}${g.k?.includes(metricRef.current) ? ' · Kreiswert' : ''}</span>`
          tip.style.display = 'block'
          tip.style.transform = `translate(${e.point.x + 14}px, ${e.point.y + 14}px)`
        }
      })
      map.on('mouseleave', LAYER_FILL, () => {
        if (hoverArs.current) {
          map.setFeatureState({ source: SOURCE, sourceLayer: 'gemeinden', id: hoverArs.current }, { hover: false })
          hoverArs.current = null
        }
        map.getCanvas().style.cursor = ''
        tooltipRef.current!.style.display = 'none'
      })
      map.on('click', LAYER_FILL, (e) => {
        const f = e.features?.[0]
        onSelect(f ? (f.id as string) : null)
      })

      loadedRef.current = true
      applyFeatureState(map, dataRef.current)
      applyPaint(map)
    })

    return () => {
      map.remove()
      mapRef.current = null
      loadedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyPaint = (map: maplibregl.Map) => {
    const s = scaleRef.current
    if (s) map.setPaintProperty(LAYER_FILL, 'fill-color', fillColorExpression(metricRef.current, s) as never)
  }

  useEffect(() => {
    const map = mapRef.current
    if (map && loadedRef.current) applyPaint(map)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metricId, scale])

  // re-sync feature-state when the dataset changes in place (e.g. recomputed composite score)
  useEffect(() => {
    const map = mapRef.current
    if (map && loadedRef.current) applyFeatureState(map, data)
  }, [data])

  useEffect(() => {
    const map = mapRef.current
    if (map && loadedRef.current) {
      map.setFilter(LAYER_SELECTED, ['==', ['get', 'ars'], selected ?? ''])
    }
  }, [selected])

  useEffect(() => {
    const map = mapRef.current
    if (map && flyTarget) map.flyTo({ center: flyTarget.center, zoom: 9.5, duration: 1600 })
  }, [flyTarget])

  return (
    <div className="map-wrap">
      <div ref={containerRef} className="map" />
      <div ref={tooltipRef} className="tooltip" />
    </div>
  )
}

function applyFeatureState(map: maplibregl.Map, data: Dataset) {
  for (const [ars, g] of Object.entries(data)) {
    map.setFeatureState({ source: SOURCE, sourceLayer: 'gemeinden', id: ars }, g.m)
  }
}
