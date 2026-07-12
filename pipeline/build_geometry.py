"""Convert VG250-EW Gemeinde and Kreis boundaries to web-ready PMTiles tilesets.

Input:  data/vg250/.../VG250_GEM.shp (EPSG:25832)
        data/vg250/.../VG250_KRS.shp (EPSG:25832)
Output: data/out/gemeinden.geojsonl (WGS84, line-delimited)
        data/out/kreise.geojsonl    (WGS84, line-delimited)
        ../web/public/data/gemeinden.pmtiles
        ../web/public/data/kreise.pmtiles
"""

import subprocess
from pathlib import Path

import duckdb

HERE = Path(__file__).parent
GEM_SHP = next(HERE.glob("data/vg250/**/VG250_GEM.shp"))
KRS_SHP = next(HERE.glob("data/vg250/**/VG250_KRS.shp"))
OUT = HERE / "data" / "out"
WEB_DATA = HERE.parent / "web" / "public" / "data"


def tile(geojsonl: Path, pmtiles: Path, layer: str, min_zoom: str, max_zoom: str) -> None:
    subprocess.run(
        [
            "tippecanoe",
            "-o", str(pmtiles),
            "--force",
            "--layer", layer,
            "--minimum-zoom", min_zoom,
            "--maximum-zoom", max_zoom,
            "--detect-shared-borders",
            "--coalesce-smallest-as-needed",
            "--extend-zooms-if-still-dropping",
            str(geojsonl),
        ],
        check=True,
    )
    print("wrote", pmtiles)


def build_gemeinden(con: duckdb.DuckDBPyConnection) -> None:
    geojsonl = OUT / "gemeinden.geojsonl"
    # GF=4: land with settlement structure (drops waterbodies / gemeindefreie Gebiete)
    con.sql(
        f"""
        COPY (
            SELECT ARS AS ars, GEN AS name, BEZ AS bez, EWZ AS ewz, KFL AS kfl,
                   ST_Transform(geom, 'EPSG:25832', 'EPSG:4326', always_xy := true) AS geom
            FROM ST_Read('{GEM_SHP}')
            WHERE GF = 4
        ) TO '{geojsonl}'
        WITH (FORMAT gdal, DRIVER 'GeoJSONSeq')
        """
    )
    tile(geojsonl, WEB_DATA / "gemeinden.pmtiles", "gemeinden", "4", "12")


def build_kreise(con: duckdb.DuckDBPyConnection) -> None:
    geojsonl = OUT / "kreise.geojsonl"
    con.sql(
        f"""
        COPY (
            SELECT SUBSTR(ARS, 1, 5) AS ars, GEN AS name, BEZ AS bez, EWZ AS ewz,
                   ST_Transform(geom, 'EPSG:25832', 'EPSG:4326', always_xy := true) AS geom
            FROM ST_Read('{KRS_SHP}')
            WHERE GF = 4
        ) TO '{geojsonl}'
        WITH (FORMAT gdal, DRIVER 'GeoJSONSeq')
        """
    )
    tile(geojsonl, WEB_DATA / "kreise.pmtiles", "kreise", "4", "10")


def main() -> None:
    OUT.mkdir(exist_ok=True)
    WEB_DATA.mkdir(parents=True, exist_ok=True)

    con = duckdb.connect()
    con.sql("INSTALL spatial; LOAD spatial;")

    build_gemeinden(con)
    build_kreise(con)


if __name__ == "__main__":
    main()
