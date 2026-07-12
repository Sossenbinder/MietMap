"""Join all metric sources and emit web/public/data/metrics.json (Gemeinde) and
web/public/data/metrics_kreise.json (Kreis, for the zoom-dependent map layer).

Sources: data/out/zensus_gemeinden.csv, data/out/zensus_kreise.csv (fallback,
         and the Kreis-native source for the Kreis dataset),
         data/out/amenities.csv (optional, from build_amenities.py),
         data/out/deutschlandatlas_kreise.csv (income / asking rent / safety, Kreis level),
         data/out/bauland_kreise.csv (building-land prices, Kreis level),
         data/out/erreichbarkeit_kreise.csv (travel time to Mittel-/Oberzentrum, Kreis level),
         data/out/gemeinden.geojsonl (authoritative ARS list + population)
         data/out/kreise.geojsonl (authoritative Kreis ARS list + population)

Output schema (keyed by 12-digit ARS for Gemeinde, 5-digit for Kreis):
  { "<ars>": { "n": name, "b": bez, "e": ewz,
               "m": { metric: value, ... },
               "k": [metrics filled from Kreis level] } }
Composite score `score` = mean of percentile ranks:
  affordability (1 - pct(qm_miete)), market looseness (pct(leerstand)),
  amenity density (pct(amenities_per_1k)) when available.
Percentile ranks are also exposed per-entry as "p" = [affordability,
market, amenities] so the frontend can recompute the composite client-side.
For the Kreis dataset, amenity metrics are population-weighted aggregates of
the underlying Gemeinde rates (rate = sum(gem_rate * gem_ewz) / sum(gem_ewz)),
percentile ranks are computed within the ~400-Kreis set, and "k" is always
empty since every value there is Kreis-native.
"""

import json
from pathlib import Path

import pandas as pd

HERE = Path(__file__).parent
OUT = HERE / "data" / "out"
WEB_DATA = HERE.parent / "web" / "public" / "data"

METRICS = ["qm_miete", "leerstand", "eigentum"]
AMENITY_METRICS = ["supermaerkte_1k", "aerzte_1k", "apotheken_1k", "schulen_1k", "oepnv_1k"]
DEUTSCHLANDATLAS_METRICS = ["einkommen", "angebotsmiete", "miet_gap", "mietbelastung"]
DEUTSCHLANDATLAS_EXTRA_METRICS = ["straft", "einbr", "alq", "v_harzt", "kbtr_pers"]
BAULAND_METRICS = ["bauland"]
ERREICHBARKEIT_METRICS = ["fz_mz", "fz_oz"]


def load_gemeinden() -> pd.DataFrame:
    rows = []
    with open(OUT / "gemeinden.geojsonl") as f:
        for line in f:
            feat = json.loads(line)
            p = feat["properties"]
            xs, ys = [], []
            def walk(c):
                if isinstance(c[0], (int, float)):
                    xs.append(c[0]); ys.append(c[1])
                else:
                    for sub in c:
                        walk(sub)
            walk(feat["geometry"]["coordinates"])
            cx = round((min(xs) + max(xs)) / 2, 4)
            cy = round((min(ys) + max(ys)) / 2, 4)
            rows.append((p["ars"], p["name"], p["bez"], p["ewz"], p["kfl"], cx, cy))
    df = pd.DataFrame(rows, columns=["ars", "name", "bez", "ewz", "kfl", "cx", "cy"])
    return df.drop_duplicates(subset="ars")


def load_kreise_geom() -> pd.DataFrame:
    rows = []
    with open(OUT / "kreise.geojsonl") as f:
        for line in f:
            feat = json.loads(line)
            p = feat["properties"]
            xs, ys = [], []
            def walk(c):
                if isinstance(c[0], (int, float)):
                    xs.append(c[0]); ys.append(c[1])
                else:
                    for sub in c:
                        walk(sub)
            walk(feat["geometry"]["coordinates"])
            cx = round((min(xs) + max(xs)) / 2, 4)
            cy = round((min(ys) + max(ys)) / 2, 4)
            rows.append((p["ars"], p["name"], p["bez"], p["ewz"], cx, cy))
    df = pd.DataFrame(rows, columns=["ars", "name", "bez", "ewz", "cx", "cy"])
    return df.drop_duplicates(subset="ars")


def build_kreise(
    gem_df: pd.DataFrame,
    kreise: pd.DataFrame,
    da: pd.DataFrame,
    bauland: pd.DataFrame,
    erreichbarkeit: pd.DataFrame,
    has_amenities: bool,
) -> dict:
    """Kreis-native dataset: same metrics as the Gemeinde output, but sourced
    directly from the Kreis-level CSVs (no fallback bookkeeping needed) plus
    population-weighted aggregates of the Gemeinde amenity rates."""
    kdf = load_kreise_geom().set_index("ars")

    for m in METRICS:
        kdf[m] = kdf.index.map(kreise[m])

    for m in ["einkommen", "angebotsmiete"] + DEUTSCHLANDATLAS_EXTRA_METRICS:
        kdf[m] = kdf.index.map(da[m])
    angebotsmiete_top = kdf.index.map(da["angebotsmiete_top"]) == 1
    kdf["miet_gap"] = (kdf["angebotsmiete"] - kdf["qm_miete"]).round(2)
    kdf.loc[angebotsmiete_top, "miet_gap"] = float("nan")
    kdf["mietbelastung"] = ((kdf["qm_miete"] * 70 * 12) / (kdf["einkommen"] * 1000) * 100).round(1)

    kdf["bauland"] = kdf.index.map(bauland["bauland"])

    for m in ERREICHBARKEIT_METRICS:
        kdf[m] = kdf.index.map(erreichbarkeit[m])

    if has_amenities:
        weight = gem_df["ewz"]
        for m in AMENITY_METRICS + ["amenities_1k"]:
            weighted_sum = (gem_df[m] * weight).groupby(gem_df["kreis_key"]).sum()
            weight_sum = weight.groupby(gem_df["kreis_key"]).sum()
            kdf[m] = kdf.index.map(weighted_sum / weight_sum)

    pct_affordability = 1 - kdf["qm_miete"].rank(pct=True)
    pct_market = kdf["leerstand"].rank(pct=True)
    pct_amenities = kdf["amenities_1k"].rank(pct=True) if has_amenities else pd.Series(float("nan"), index=kdf.index)
    parts = [pct_affordability, pct_market]
    if has_amenities:
        parts.append(pct_amenities)
    kdf["score"] = (sum(parts) / len(parts) * 100).round(1)
    kdf["p_affordability"] = pct_affordability.round(3)
    kdf["p_market"] = pct_market.round(3)
    kdf["p_amenities"] = pct_amenities.round(3)

    all_metrics = (
        METRICS
        + (AMENITY_METRICS + ["amenities_1k"] if has_amenities else [])
        + DEUTSCHLANDATLAS_METRICS
        + DEUTSCHLANDATLAS_EXTRA_METRICS
        + BAULAND_METRICS
        + ERREICHBARKEIT_METRICS
        + ["score"]
    )
    out: dict[str, dict] = {}
    for r in kdf.reset_index().itertuples():
        values = {
            m: round(v, 2)
            for m in all_metrics
            if pd.notna(v := getattr(r, m))
        }
        entry = {"n": r.name, "b": r.bez, "e": int(r.ewz), "kr": r.name, "c": [r.cx, r.cy], "m": values, "k": []}
        entry["p"] = [
            v if pd.notna(v := getattr(r, attr)) else None
            for attr in ("p_affordability", "p_market", "p_amenities")
        ]
        out[r.ars] = entry
    return out


def main() -> None:
    gem = load_gemeinden()
    zensus = pd.read_csv(OUT / "zensus_gemeinden.csv", dtype={"ars": str})
    kreise = pd.read_csv(OUT / "zensus_kreise.csv", dtype={"ars": str}).set_index("ars")

    df = gem.merge(zensus.drop(columns="name"), on="ars", how="left")

    # Kreis fallback for missing values; track which metrics were filled
    df["kreis_key"] = df["ars"].str[:5]
    df["kreis_name"] = df["kreis_key"].map(kreise["name"])
    filled: dict[str, list[str]] = {}
    for m in METRICS:
        missing = df[m].isna()
        df.loc[missing, m] = df.loc[missing, "kreis_key"].map(kreise[m])
        for ars in df.loc[missing & df[m].notna(), "ars"]:
            filled.setdefault(ars, []).append(m)

    # Deutschlandatlas Kreis-level income / asking-rent metrics, joined onto every Gemeinde
    da = pd.read_csv(OUT / "deutschlandatlas_kreise.csv", dtype={"ars": str}).set_index("ars")
    df["einkommen"] = df["kreis_key"].map(da["einkommen"])
    df["angebotsmiete"] = df["kreis_key"].map(da["angebotsmiete"])
    angebotsmiete_top = df["kreis_key"].map(da["angebotsmiete_top"]) == 1
    df["miet_gap"] = (df["angebotsmiete"] - df["qm_miete"]).round(2)
    # Open-ended top rent class understates true asking rents in hot markets
    # (e.g. München) — its midpoint is a floor, so the gap it implies is not honest.
    df.loc[angebotsmiete_top, "miet_gap"] = float("nan")
    df["mietbelastung"] = ((df["qm_miete"] * 70 * 12) / (df["einkommen"] * 1000) * 100).round(1)
    for m in DEUTSCHLANDATLAS_EXTRA_METRICS:
        df[m] = df["kreis_key"].map(da[m])
    for m in DEUTSCHLANDATLAS_METRICS + DEUTSCHLANDATLAS_EXTRA_METRICS:
        for ars in df.loc[df[m].notna(), "ars"]:
            filled.setdefault(ars, []).append(m)

    # INKAR (BBSR) Kreis-level building-land prices, joined onto every Gemeinde
    bauland = pd.read_csv(OUT / "bauland_kreise.csv", dtype={"ars": str}).set_index("ars")
    df["bauland"] = df["kreis_key"].map(bauland["bauland"])
    for m in BAULAND_METRICS:
        for ars in df.loc[df[m].notna(), "ars"]:
            filled.setdefault(ars, []).append(m)

    # INKAR (BBSR) Kreis-level travel-time accessibility, joined onto every Gemeinde
    erreichbarkeit = pd.read_csv(OUT / "erreichbarkeit_kreise.csv", dtype={"ars": str}).set_index("ars")
    for m in ERREICHBARKEIT_METRICS:
        df[m] = df["kreis_key"].map(erreichbarkeit[m])
        for ars in df.loc[df[m].notna(), "ars"]:
            filled.setdefault(ars, []).append(m)

    amenities_path = OUT / "amenities.csv"
    has_amenities = amenities_path.exists()
    if has_amenities:
        am = pd.read_csv(amenities_path, dtype={"ars": str})
        df = df.merge(am, on="ars", how="left")
        for m in AMENITY_METRICS:
            df[m] = df[m].fillna(0.0)
        df["amenities_1k"] = df[AMENITY_METRICS].sum(axis=1)

    kreise_out = build_kreise(df, kreise, da, bauland, erreichbarkeit, has_amenities)
    WEB_DATA.mkdir(parents=True, exist_ok=True)
    with open(WEB_DATA / "metrics_kreise.json", "w") as f:
        json.dump(kreise_out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"kreise: {len(kreise_out)}, size: {(WEB_DATA / 'metrics_kreise.json').stat().st_size / 1e3:.1f} KB")

    # Composite score: mean of percentile ranks, 0-100
    pct_affordability = 1 - df["qm_miete"].rank(pct=True)
    pct_market = df["leerstand"].rank(pct=True)
    pct_amenities = df["amenities_1k"].rank(pct=True) if has_amenities else pd.Series(float("nan"), index=df.index)
    parts = [pct_affordability, pct_market]
    if has_amenities:
        parts.append(pct_amenities)
    df["score"] = (sum(parts) / len(parts) * 100).round(1)
    df["p_affordability"] = pct_affordability.round(3)
    df["p_market"] = pct_market.round(3)
    df["p_amenities"] = pct_amenities.round(3)

    all_metrics = (
        METRICS
        + (AMENITY_METRICS + ["amenities_1k"] if has_amenities else [])
        + DEUTSCHLANDATLAS_METRICS
        + DEUTSCHLANDATLAS_EXTRA_METRICS
        + BAULAND_METRICS
        + ERREICHBARKEIT_METRICS
        + ["score"]
    )
    out: dict[str, dict] = {}
    for r in df.itertuples():
        values = {
            m: round(v, 2)
            for m in all_metrics
            if pd.notna(v := getattr(r, m))
        }
        entry = {"n": r.name, "b": r.bez, "e": int(r.ewz), "kr": r.kreis_name, "c": [r.cx, r.cy], "m": values}
        if r.ars in filled:
            entry["k"] = filled[r.ars]
        entry["p"] = [
            v if pd.notna(v := getattr(r, attr)) else None
            for attr in ("p_affordability", "p_market", "p_amenities")
        ]
        out[r.ars] = entry

    WEB_DATA.mkdir(parents=True, exist_ok=True)
    with open(WEB_DATA / "metrics.json", "w") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    print(f"gemeinden: {len(out)}, kreis-filled: {len(filled)}, amenities: {has_amenities}")
    print(f"size: {(WEB_DATA / 'metrics.json').stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
