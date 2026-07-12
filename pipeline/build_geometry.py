"""Convert VG250-EW Gemeinde boundaries to a web-ready PMTiles tileset.

Input:  data/vg250/.../VG250_GEM.shp (EPSG:25832)
Output: data/out/gemeinden.geojsonl (WGS84, line-delimited)
        ../web/public/data/gemeinden.pmtiles
"""

import subprocess
from pathlib import Path

import duckdb

HERE = Path(__file__).parent
SHP = next(HERE.glob("data/vg250/**/VG250_GEM.shp"))
OUT = HERE / "data" / "out"
WEB_DATA = HERE.parent / "web" / "public" / "data"


def main() -> None:
    OUT.mkdir(exist_ok=True)
    WEB_DATA.mkdir(parents=True, exist_ok=True)
    geojsonl = OUT / "gemeinden.geojsonl"

    con = duckdb.connect()
    con.sql("INSTALL spatial; LOAD spatial;")
    # GF=4: land with settlement structure (drops waterbodies / gemeindefreie Gebiete)
    con.sql(
        f"""
        COPY (
            SELECT ARS AS ars, GEN AS name, BEZ AS bez, EWZ AS ewz, KFL AS kfl,
                   ST_Transform(geom, 'EPSG:25832', 'EPSG:4326', always_xy := true) AS geom
            FROM ST_Read('{SHP}')
            WHERE GF = 4
        ) TO '{geojsonl}'
        WITH (FORMAT gdal, DRIVER 'GeoJSONSeq')
        """
    )

    subprocess.run(
        [
            "tippecanoe",
            "-o", str(WEB_DATA / "gemeinden.pmtiles"),
            "--force",
            "--layer", "gemeinden",
            "--minimum-zoom", "4",
            "--maximum-zoom", "12",
            "--detect-shared-borders",
            "--coalesce-smallest-as-needed",
            "--extend-zooms-if-still-dropping",
            str(geojsonl),
        ],
        check=True,
    )
    print("wrote", WEB_DATA / "gemeinden.pmtiles")


if __name__ == "__main__":
    main()
