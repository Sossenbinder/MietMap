# Mietmap

Interaktive Karte: Nettokaltmieten, Wohnungsmarkt und Lebensqualität für alle
~11.000 Gemeinden Deutschlands. Statische Website ohne Backend.

![Stack](https://img.shields.io/badge/stack-Vite%20%2B%20React%20%2B%20MapLibre-blue)

## Architektur

- **`pipeline/`** — Python-Datenpipeline. Erzeugt aus offenen Daten zwei Artefakte:
  - `web/public/data/gemeinden.pmtiles` — Vektortiles der Gemeindegrenzen (VG250)
  - `web/public/data/metrics.json` — alle Kennzahlen je Gemeinde (Schlüssel: 12-stelliger ARS)
- **`web/`** — Vite + React + MapLibre GL. Choroplethen via `feature-state`,
  Basiskarte OpenFreeMap (kein API-Key).

## Datenquellen

| Quelle | Inhalt | Ebene |
| --- | --- | --- |
| BKG VG250-EW | Gemeindegrenzen + Einwohnerzahl | Gemeinde |
| Zensus 2022 Regionaltabelle | Nettokaltmiete €/m², Leerstandsquote, Eigentümerquote | Gemeinde (Kreis-Fallback) |
| OpenStreetMap (Geofabrik) | Supermärkte, Ärzte, Apotheken, Schulen/Kitas, ÖPNV-Halte je 1.000 Einw. | Gemeinde |
| Deutschlandatlas (BBSR) | Verfügbares Einkommen, Angebotsmieten (Klassenmitten), daraus Miet-Gap & Mietbelastung | Kreis |
| INKAR (BBSR) | Baulandpreise €/m² (Kaufwerte-Statistik, 2022) | Kreis |

Der Miet-Gap (Angebotsmiete − Bestandsmiete) wird in den 46 Kreisen der offenen
Spitzenklasse („11,50 € und mehr") unterdrückt, weil die Klassenmitte dort die
tatsächlichen Angebotsmieten deutlich unterschätzen würde.

Fehlende Gemeindewerte (Geheimhaltung, Gebietsstandsänderungen) werden mit dem
Kreiswert gefüllt und in der UI als „Kreiswert" markiert. Der Gesamtindex ist das
Perzentil-Mittel aus Bezahlbarkeit (invertierte Miete), Marktentspannung
(Leerstand) und Nahversorgungsdichte.

## Pipeline ausführen

Voraussetzungen: Python ≥3.12, [tippecanoe](https://github.com/felt/tippecanoe) im PATH.

```sh
cd pipeline
python -m venv .venv && .venv/bin/pip install duckdb pandas openpyxl

# Rohdaten herunterladen (~4,4 GB, einmalig)
cd data
curl -LO https://daten.gdz.bkg.bund.de/produkte/vg/vg250-ew_ebenen_1231/aktuell/vg250-ew_12-31.utm32s.shape.ebenen.zip
unzip vg250-ew_12-31.utm32s.shape.ebenen.zip -d vg250
curl -LO https://www.destatis.de/static/DE/zensus/gitterdaten/Regionaltabelle_Gebaeude_Wohnungen.xlsx
curl -LO https://download.geofabrik.de/europe/germany-latest.osm.pbf
cd ..

.venv/bin/python extract_zensus.py           # Zensus-XLSX → CSV
.venv/bin/python extract_deutschlandatlas.py # Einkommen + Angebotsmiete-Klassen → CSV
.venv/bin/python build_geometry.py           # Shapefile → GeoJSONL → PMTiles
.venv/bin/python build_amenities.py          # OSM-POIs → Dichten je Gemeinde (~2 min)
.venv/bin/python build_metrics.py            # Join + Gesamtindex → metrics.json
```

Die Deutschlandatlas-CSVs (`deutschlandatlas_krs1224.csv`, `deutschlandatlas_krs1222.csv`)
liegen hinter einem Cookie-Gate und müssen einmalig manuell von
[deutschlandatlas.bund.de → Downloads](https://www.deutschlandatlas.bund.de/DE/Service/Downloads/downloads_node.html)
nach `pipeline/data/` geladen werden (Dateien `Deutschlandatlas_KRS1224_ZA26.csv`
und `Deutschlandatlas_KRS1222_ZA26.csv`).

## Web-App

```sh
cd web
npm install
npm run dev      # http://localhost:5173
npm run build    # statisches Bundle in dist/
```

Hosting: beliebiger statischer Host mit HTTP-Range-Request-Unterstützung für
PMTiles (z. B. Cloudflare Pages).

## Offen

- **Numerische Angebotsmieten** gibt es nicht frei: BBSR entfernt den Indikator
  aus dem INKAR-Bulk-Export (Lizenz IDN ImmoDaten); Deutschlandatlas liefert nur
  6 Klassen. Numerische Werte erfordern eine kommerzielle Lizenz.
- **Offizielle Lebensqualitäts-Indikatoren** (Kinderbetreuung, Ärztedichte, …):
  der freie INKAR-Gesamtdatensatz
  (`https://www.bbr-server.de/imagemap/inkar/download/inkar_2025.zip`, 6,6 GB CSV,
  hunderte numerische Kreis-Indikatoren) ist die passende Quelle für einen Ausbau.
