import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Protocol } from 'pmtiles'
import { useEffect, useRef } from 'react'
import { SCENARIO_METRIC_IDS, fmtMetric, metricById, scenarioBoundPrefix } from '../metrics'
import { fillColorExpression, type Scale } from '../scale'
import type { Dataset } from '../types'

maplibregl.addProtocol('pmtiles', new Protocol().tile)

// sharp zoom handoff between the two source layers: Kreis polygons below, Gemeinde polygons above
const ZOOM_HANDOFF = 7.5

const SOURCE_GEMEINDEN = 'gemeinden'
const LAYER_FILL_GEMEINDEN = 'gemeinden-fill'
const LAYER_LINE_GEMEINDEN = 'gemeinden-line'
const LAYER_SELECTED_GEMEINDEN = 'gemeinden-selected'

const SOURCE_KREISE = 'kreise'
const LAYER_FILL_KREISE = 'kreise-fill'
const LAYER_LINE_KREISE = 'kreise-line'
const LAYER_SELECTED_KREISE = 'kreise-selected'

interface Props {
  data: Dataset
  dataK: Dataset
  metricId: string
  scale: Scale | null
  selected: string | null
  flyTarget: { center: [number, number]; ts: number } | null
  onSelect: (ars: string | null) => void
}

export default function MapView({ data, dataK, metricId, scale, selected, flyTarget, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const loadedRef = useRef(false)
  const hoverRef = useRef<{ ars: string; source: string; sourceLayer: string } | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const metricRef = useRef(metricId)
  metricRef.current = metricId
  const dataRef = useRef(data)
  dataRef.current = data
  const dataKRef = useRef(dataK)
  dataKRef.current = dataK
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
      map.addSource(SOURCE_GEMEINDEN, {
        type: 'vector',
        url: `pmtiles://${location.origin}${import.meta.env.BASE_URL}data/gemeinden.pmtiles`,
        promoteId: 'ars',
      })
      // Kreis pmtiles may legitimately be missing (parallel pipeline task) — MapLibre tolerates a
      // source whose tiles 404 by simply rendering nothing for it, so no extra guarding is needed here.
      map.addSource(SOURCE_KREISE, {
        type: 'vector',
        url: `pmtiles://${location.origin}${import.meta.env.BASE_URL}data/kreise.pmtiles`,
        promoteId: 'ars',
      })

      // paint below the basemap's labels so place names stay readable
      const firstSymbol = map.getStyle().layers.find((l) => l.type === 'symbol')?.id

      map.addLayer(
        {
          id: LAYER_FILL_KREISE,
          type: 'fill',
          source: SOURCE_KREISE,
          'source-layer': 'kreise',
          maxzoom: ZOOM_HANDOFF,
          paint: {
            'fill-color': 'rgba(0,0,0,0)',
            'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.95, 0.78],
          },
        },
        firstSymbol,
      )
      map.addLayer(
        {
          id: LAYER_LINE_KREISE,
          type: 'line',
          source: SOURCE_KREISE,
          'source-layer': 'kreise',
          maxzoom: ZOOM_HANDOFF,
          paint: {
            'line-color': '#ffffff',
            'line-width': ['interpolate', ['linear'], ['zoom'], 4.5, 0.2, 7.5, 0.8],
            'line-opacity': 0.5,
          },
        },
        firstSymbol,
      )
      map.addLayer({
        id: LAYER_SELECTED_KREISE,
        type: 'line',
        source: SOURCE_KREISE,
        'source-layer': 'kreise',
        paint: { 'line-color': '#1d4ed8', 'line-width': 2.5 },
        filter: ['==', ['get', 'ars'], ''],
      })

      map.addLayer(
        {
          id: LAYER_FILL_GEMEINDEN,
          type: 'fill',
          source: SOURCE_GEMEINDEN,
          'source-layer': 'gemeinden',
          minzoom: ZOOM_HANDOFF,
          paint: {
            'fill-color': 'rgba(0,0,0,0)',
            'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.95, 0.78],
          },
        },
        firstSymbol,
      )
      map.addLayer(
        {
          id: LAYER_LINE_GEMEINDEN,
          type: 'line',
          source: SOURCE_GEMEINDEN,
          'source-layer': 'gemeinden',
          minzoom: ZOOM_HANDOFF,
          paint: {
            'line-color': '#ffffff',
            'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.1, 9, 0.6, 12, 1.2],
            'line-opacity': 0.5,
          },
        },
        firstSymbol,
      )
      map.addLayer({
        id: LAYER_SELECTED_GEMEINDEN,
        type: 'line',
        source: SOURCE_GEMEINDEN,
        'source-layer': 'gemeinden',
        paint: { 'line-color': '#1d4ed8', 'line-width': 2.5 },
        filter: ['==', ['get', 'ars'], ''],
      })

      registerLayerHandlers(map, LAYER_FILL_GEMEINDEN, SOURCE_GEMEINDEN, 'gemeinden')
      registerLayerHandlers(map, LAYER_FILL_KREISE, SOURCE_KREISE, 'kreise')

      // The layer 'mousemove' doesn't fire while the map is being panned, so the tooltip
      // would otherwise freeze mid-drag. Hide it (and clear hover) when a drag starts; it
      // reappears on the next hover after the drag ends.
      map.on('dragstart', () => {
        if (hoverRef.current) {
          map.setFeatureState(
            { source: hoverRef.current.source, sourceLayer: hoverRef.current.sourceLayer, id: hoverRef.current.ars },
            { hover: false },
          )
          hoverRef.current = null
        }
        tooltipRef.current!.style.display = 'none'
      })

      loadedRef.current = true
      applyFeatureState(map, SOURCE_GEMEINDEN, 'gemeinden', dataRef.current)
      applyFeatureState(map, SOURCE_KREISE, 'kreise', dataKRef.current)
      applyPaint(map)
    })

    function registerLayerHandlers(map: maplibregl.Map, layerId: string, sourceId: string, sourceLayer: string) {
      map.on('mousemove', layerId, (e) => {
        const f = e.features?.[0]
        if (!f) return
        const ars = f.id as string
        if (hoverRef.current && (hoverRef.current.ars !== ars || hoverRef.current.source !== sourceId)) {
          map.setFeatureState(
            { source: hoverRef.current.source, sourceLayer: hoverRef.current.sourceLayer, id: hoverRef.current.ars },
            { hover: false },
          )
        }
        map.setFeatureState({ source: sourceId, sourceLayer, id: ars }, { hover: true })
        hoverRef.current = { ars, source: sourceId, sourceLayer }
        map.getCanvas().style.cursor = 'pointer'

        const tip = tooltipRef.current!
        const g = ars.length === 5 ? dataKRef.current[ars] : dataRef.current[ars]
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
      map.on('mouseleave', layerId, () => {
        if (hoverRef.current) {
          map.setFeatureState(
            { source: hoverRef.current.source, sourceLayer: hoverRef.current.sourceLayer, id: hoverRef.current.ars },
            { hover: false },
          )
          hoverRef.current = null
        }
        map.getCanvas().style.cursor = ''
        tooltipRef.current!.style.display = 'none'
      })
      map.on('click', layerId, (e) => {
        const f = e.features?.[0]
        onSelect(f ? (f.id as string) : null)
      })
    }

    return () => {
      map.remove()
      mapRef.current = null
      loadedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyPaint = (map: maplibregl.Map) => {
    const s = scaleRef.current
    if (s) {
      // same scale for both layers (computed from the Gemeinde dataset) so color reads consistently
      // across the zoom handoff between Kreis and Gemeinde polygons
      const expr = fillColorExpression(metricRef.current, s) as never
      map.setPaintProperty(LAYER_FILL_GEMEINDEN, 'fill-color', expr)
      map.setPaintProperty(LAYER_FILL_KREISE, 'fill-color', expr)
    }
  }

  useEffect(() => {
    const map = mapRef.current
    if (map && loadedRef.current) applyPaint(map)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metricId, scale])

  // re-sync feature-state when a dataset changes in place (e.g. recomputed composite score)
  useEffect(() => {
    const map = mapRef.current
    if (map && loadedRef.current) applyFeatureState(map, SOURCE_GEMEINDEN, 'gemeinden', data)
  }, [data])

  useEffect(() => {
    const map = mapRef.current
    if (map && loadedRef.current) applyFeatureState(map, SOURCE_KREISE, 'kreise', dataK)
  }, [dataK])

  useEffect(() => {
    const map = mapRef.current
    if (map && loadedRef.current) {
      // a 5-digit Kreis ars never matches a Gemeinde feature and vice versa, so applying the same
      // filter to both selected-outline layers is safe — only the relevant one ever lights up
      map.setFilter(LAYER_SELECTED_GEMEINDEN, ['==', ['get', 'ars'], selected ?? ''])
      map.setFilter(LAYER_SELECTED_KREISE, ['==', ['get', 'ars'], selected ?? ''])
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

function applyFeatureState(map: maplibregl.Map, source: string, sourceLayer: string, data: Dataset) {
  for (const [ars, g] of Object.entries(data)) {
    map.setFeatureState({ source, sourceLayer, id: ars }, g.m)
  }
}
