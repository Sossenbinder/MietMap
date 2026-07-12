"""Extract Kreis-level building-land (Bauland) prices from INKAR (BBSR).

Input:  data/inkar_baulandpreise_kreise.csv (long format:
            AGS;Kreisname;Jahr;Baulandpreis_EUR_m2)
Output: data/out/bauland_kreise.csv (ars, bauland, bauland_jahr) -- latest
        available year per Kreis (not every Kreis has a 2022 row)
        ../web/public/data/bauland_history.json
            {"<kreis5>": [[year, value], ...], ...} -- full time series,
            sorted by year, values rounded to 1 decimal, NaN/zero rows dropped
            (INKAR encodes "no transactions" as 0,00, which is not a real price)
"""

import json
from pathlib import Path

import pandas as pd

HERE = Path(__file__).parent
DATA = HERE / "data"
OUT = DATA / "out"
WEB_DATA = HERE.parent / "web" / "public" / "data"

YEAR = 2022


def kreis_key(s: pd.Series) -> pd.Series:
    return s.astype(str).str.zfill(8).str[:5]


def to_num(s: pd.Series) -> pd.Series:
    return pd.to_numeric(s.astype(str).str.replace(",", ".", regex=False), errors="coerce")


def main() -> None:
    OUT.mkdir(exist_ok=True)
    WEB_DATA.mkdir(parents=True, exist_ok=True)

    raw = pd.read_csv(DATA / "inkar_baulandpreise_kreise.csv", sep=";", encoding="utf-8")
    raw = raw.assign(ars=kreis_key(raw["AGS"]), bauland=to_num(raw["Baulandpreis_EUR_m2"]))

    # INKAR encodes "no transactions" as 0,00 -- not a real price, drop like NaN
    valid = raw[raw["bauland"].notna() & (raw["bauland"] != 0)]

    latest = valid.sort_values("Jahr").groupby("ars", as_index=False).last()
    latest = latest.rename(columns={"Jahr": "bauland_jahr"})
    out = latest[["ars", "bauland", "bauland_jahr"]]
    out.to_csv(OUT / "bauland_kreise.csv", index=False)
    non_target_year = int((out["bauland_jahr"] != YEAR).sum())
    print(
        f"kreise (latest available year): {len(out)} (min: {out.bauland.min()}, "
        f"max: {out.bauland.max()}), {non_target_year} use a year != {YEAR}"
    )

    hist_rows = valid.sort_values("Jahr")
    history: dict[str, list[list]] = {}
    for r in hist_rows.itertuples():
        history.setdefault(r.ars, []).append([int(r.Jahr), round(r.bauland, 1)])

    hist_path = WEB_DATA / "bauland_history.json"
    with open(hist_path, "w") as f:
        json.dump(history, f, ensure_ascii=False, separators=(",", ":"))
    print(f"bauland_history: {len(history)} kreise, size: {hist_path.stat().st_size / 1e3:.1f} KB")


if __name__ == "__main__":
    main()
