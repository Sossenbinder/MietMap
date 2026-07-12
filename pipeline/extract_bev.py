"""Extract Gemeinde-level population trend from the Deutschlandatlas GEM table.

Input:  data/deutschlandatlas_gem1224.csv (bev_entw: avg. annual population
        change 2019-2024 in %, keyed by 8-digit AGS; -9999 = no data)
        data/vg250/.../VG250_GEM.shp (AGS -> ARS mapping)
Output: data/out/bev_gemeinden.csv (ars, bev_entw)
"""

from pathlib import Path

import duckdb
import pandas as pd

HERE = Path(__file__).parent
SHP = next(HERE.glob("data/vg250/**/VG250_GEM.shp"))
OUT = HERE / "data" / "out"


def main() -> None:
    OUT.mkdir(exist_ok=True)
    df = pd.read_csv(HERE / "data" / "deutschlandatlas_gem1224.csv", sep=";", decimal=",")
    df["ags"] = df["GKZ1224"].astype(str).str.zfill(8)
    df["bev_entw"] = pd.to_numeric(df["bev_entw"], errors="coerce")
    df.loc[df["bev_entw"] <= -999, "bev_entw"] = float("nan")

    con = duckdb.connect()
    con.sql("INSTALL spatial; LOAD spatial;")
    mapping = con.sql(f"SELECT AGS AS ags, ARS AS ars FROM ST_Read('{SHP}') WHERE GF = 4").df()
    mapping = mapping.drop_duplicates(subset="ags")

    out = df.merge(mapping, on="ags", how="inner")[["ars", "bev_entw"]].dropna()
    out.to_csv(OUT / "bev_gemeinden.csv", index=False)
    print(f"gemeinden: {len(out)} (min: {out.bev_entw.min()}, max: {out.bev_entw.max()}, "
          f"unmatched: {df['ags'].nunique() - out['ars'].nunique()})")


if __name__ == "__main__":
    main()
