# Outline: Germany Rent & Quality-of-Life Map (Mietmap)

## Context

Greenfield project. Goal: a website showing an interactive map of Germany with choropleth overlays for rental-market heat, financial affordability, and public offerings / quality of life — at Gemeinde (municipality, ~11,000 units) granularity.

## Scope

**In scope:**

- Interactive map of Germany (MapLibre GL) with toggleable choropleth layers per metric
- Gemeinde-level metrics: net cold rent €/m², vacancy rate, rent-burden ratio (rent vs. local income), OSM-derived amenity densities (supermarkets, doctors, pharmacies, schools, transit stops per 1k residents)
- Kreis-level metrics filled down to Gemeinden (with a "district-level data" UI hint): childcare coverage, physicians per capita, and similar INKAR indicators
- A simple composite score layer (fixed weights, v1)
- Click → detail panel with all metrics for a Gemeinde; name search
- Re-runnable static data pipeline; fully static hosting

**Out of scope:**

- Live/scraped listing data (ImmoScout etc.) — ToS-problematic, brittle
- Backend, accounts, user-adjustable score weights (possible later)
- Zoom-dependent Kreis↔Gemeinde level switching
- Historical time series / trend animation

## Approach

Two halves: an offline **data pipeline** and a static **frontend**. The pipeline output is the only contract between them.

**Data pipeline (`pipeline/`, Python: geopandas, DuckDB spatial, osmium/pyrosm):**

1. **Boundaries**: BKG VG250 Gemeinde geometries (open data, dl-de/by-2-0). Simplify, then `tippecanoe` → **PMTiles** vector tileset (11k polygons is too heavy as raw GeoJSON).
2. **Official stats**: CSV exports from the Zensus 2022 database (Nettokaltmiete/m², Leerstandsquote per Gemeinde — verified available), Regionalstatistik (income-tax income per Gemeinde), INKAR (Kreis-level QoL indicators). Join on AGS key; Kreis values fill down to member Gemeinden, flagged `source: "kreis"`.
3. **OSM amenities**: Geofabrik Germany extract → filter amenity POIs → spatial join against Gemeinde polygons → counts per 1k residents.
4. **Output**: one `gemeinden.pmtiles` (geometry only) + `metrics.json` keyed by AGS (values + per-metric source level + precomputed composite score). Frontend joins via MapLibre `feature-state`.

**Frontend (`web/`, Vite + React + MapLibre GL, German UI):**

- Basemap: OpenFreeMap (free, keyless); choropleth layer from the PMTiles source, colored via feature-state
- Layer switcher (metric radio group grouped by theme: Miete / Markt / Angebot & Lebensqualität), legend with quantile breaks, hover tooltip
- Click opens a side panel: all metrics for the Gemeinde, each marked Gemeinde- vs Kreis-level
- Gemeinde name search (client-side index from metrics.json)

**Hosting:** Cloudflare Pages (static; supports the HTTP range requests PMTiles needs).

## Key Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Granularity | Gemeinden (~11k) | User choice; Zensus 2022 provides rent + vacancy at this level |
| Kreis-only metrics | Fill down to Gemeinden, flagged in UI | Complete map beats missing layers; honesty via source hint |
| "Offerings" data | OSM amenity densities | Only true Gemeinde-level source for public offerings |
| Stack | Vite + React + MapLibre GL | User choice; MapLibre handles vector tiles + feature-state joins |
| Geometry delivery | PMTiles vector tiles | 11k polygons as GeoJSON would be tens of MB; PMTiles streams over static hosting |
| Data strategy | Static pipeline, re-run ~yearly | Matches source update cadence; zero hosting cost |
| Pipeline language | Python | Strongest geospatial ecosystem (geopandas, osmium, tippecanoe glue) |
| Data/geometry contract | Geometry tiles + separate `metrics.json` joined client-side | Metrics can be re-published without rebuilding tiles |
| Composite score | Fixed weights in v1 | Adjustable-weight sliders are a clean later addition |
| UI language | German | Target audience is people navigating the German rental market |

## Trade-offs

- **Gemeinde granularity over data completeness**: finest useful resolution, accepting that several QoL layers are visibly blocky (Kreis-filled).
- **Snapshot freshness**: Zensus 2022 rents are a census snapshot, not live asking rents — accepting staleness to stay legal and maintenance-free.
- **OSM data quality varies** by region (rural undertagging); accepting some noise in amenity layers for true Gemeinde resolution.
- **Static-only** keeps cost/ops at zero, accepting no server-side features later without rework.

## Open Questions

- Exact INKAR indicator selection for the QoL theme — _best chosen while inspecting the actual INKAR export during pipeline implementation; availability/vintage varies per indicator._
