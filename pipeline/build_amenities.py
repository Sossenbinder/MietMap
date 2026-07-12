"""Count OSM amenities per Gemeinde and emit per-1k-resident densities.

Input:  data/germany-latest.osm.pbf, data/out/gemeinden.geojsonl
Output: data/out/amenities.csv (ars, supermaerkte_1k, aerzte_1k, apotheken_1k, schulen_1k, oepnv_1k)

POIs mapped as ways (e.g. school grounds, supermarket buildings) are located via
their first node — precise enough for municipal counting.
"""

from pathlib import Path

import duckdb

HERE = Path(__file__).parent
PBF = HERE / "data" / "germany-latest.osm.pbf"
GEOJSONL = HERE / "data" / "out" / "gemeinden.geojsonl"
OUT = HERE / "data" / "out" / "amenities.csv"

CATEGORY_SQL = """
    CASE
        WHEN tags['shop'] IN ('supermarket') THEN 'supermaerkte'
        WHEN tags['amenity'] IN ('doctors', 'clinic', 'hospital') THEN 'aerzte'
        WHEN tags['amenity'] = 'pharmacy' THEN 'apotheken'
        WHEN tags['amenity'] IN ('school', 'kindergarten') THEN 'schulen'
        WHEN tags['highway'] = 'bus_stop'
             OR tags['railway'] IN ('station', 'halt', 'tram_stop') THEN 'oepnv'
    END
"""

TAG_FILTER = """
    tags['shop'] IN ('supermarket')
    OR tags['amenity'] IN ('doctors', 'clinic', 'hospital', 'pharmacy', 'school', 'kindergarten')
    OR tags['highway'] = 'bus_stop'
    OR tags['railway'] IN ('station', 'halt', 'tram_stop')
"""


def main() -> None:
    con = duckdb.connect()
    con.sql("INSTALL spatial; LOAD spatial;")
    con.sql(f"SET threads TO 16;")

    print("extracting tagged nodes …")
    con.sql(
        f"""
        CREATE TABLE pois AS
        SELECT {CATEGORY_SQL} AS category, lon, lat
        FROM st_readosm('{PBF}')
        WHERE kind = 'node' AND lat IS NOT NULL AND ({TAG_FILTER})
        """
    )

    print("extracting tagged ways (located via first node) …")
    con.sql(
        f"""
        INSERT INTO pois
        WITH tagged_ways AS (
            SELECT {CATEGORY_SQL} AS category, refs[1] AS first_ref
            FROM st_readosm('{PBF}')
            WHERE kind = 'way' AND ({TAG_FILTER})
        )
        SELECT w.category, n.lon, n.lat
        FROM tagged_ways w
        JOIN (SELECT id, lon, lat FROM st_readosm('{PBF}') WHERE kind = 'node') n
          ON w.first_ref = n.id
        """
    )
    print(con.sql("SELECT category, count(*) FROM pois GROUP BY category ORDER BY 1").df().to_string())

    print("spatial join against Gemeinden …")
    con.sql(
        f"""
        CREATE TABLE gem AS
        SELECT ars, ewz, geom FROM ST_Read('{GEOJSONL}')
        """
    )
    con.sql(
        f"""
        COPY (
            WITH counts AS (
                SELECT g.ars, any_value(g.ewz) AS ewz, p.category, count(*) AS n
                FROM gem g
                JOIN pois p ON ST_Contains(g.geom, ST_Point(p.lon, p.lat))
                GROUP BY g.ars, p.category
            )
            SELECT ars,
                round(1000.0 * coalesce(max(n) FILTER (category = 'supermaerkte'), 0) / max(ewz), 3) AS supermaerkte_1k,
                round(1000.0 * coalesce(max(n) FILTER (category = 'aerzte'), 0) / max(ewz), 3) AS aerzte_1k,
                round(1000.0 * coalesce(max(n) FILTER (category = 'apotheken'), 0) / max(ewz), 3) AS apotheken_1k,
                round(1000.0 * coalesce(max(n) FILTER (category = 'schulen'), 0) / max(ewz), 3) AS schulen_1k,
                round(1000.0 * coalesce(max(n) FILTER (category = 'oepnv'), 0) / max(ewz), 3) AS oepnv_1k
            FROM counts
            WHERE ewz > 0
            GROUP BY ars
        ) TO '{OUT}' WITH (FORMAT csv, HEADER)
        """
    )
    print("wrote", OUT)


if __name__ == "__main__":
    main()
