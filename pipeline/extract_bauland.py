"""Extract Kreis-level building-land (Bauland) prices from INKAR (BBSR).

Input:  data/inkar_baulandpreise_kreise.csv (long format:
            AGS;Kreisname;Jahr;Baulandpreis_EUR_m2)
Output: data/out/bauland_kreise.csv (ars, bauland)
"""

from pathlib import Path

import pandas as pd

DATA = Path(__file__).parent / "data"
OUT = DATA / "out"

YEAR = 2022


def kreis_key(s: pd.Series) -> pd.Series:
    return s.astype(str).str.zfill(8).str[:5]


def to_num(s: pd.Series) -> pd.Series:
    return pd.to_numeric(s.astype(str).str.replace(",", ".", regex=False), errors="coerce")


def main() -> None:
    OUT.mkdir(exist_ok=True)

    df = pd.read_csv(DATA / "inkar_baulandpreise_kreise.csv", sep=";", encoding="utf-8")
    df = df[df["Jahr"] == YEAR]

    out = pd.DataFrame(
        {
            "ars": kreis_key(df["AGS"]),
            "bauland": to_num(df["Baulandpreis_EUR_m2"]),
        }
    )
    out.to_csv(OUT / "bauland_kreise.csv", index=False)
    print(f"kreise ({YEAR}): {len(out)} (min: {out.bauland.min()}, max: {out.bauland.max()})")


if __name__ == "__main__":
    main()
