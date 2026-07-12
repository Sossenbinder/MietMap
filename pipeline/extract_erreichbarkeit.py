"""Extract Kreis-level travel-time accessibility from INKAR (BBSR).

Input:  data/inkar_erreichbarkeit.csv (AGS;Kreisname;Jahr;
            Fahrzeit_Mittelzentrum_Pkw_min;Fahrzeit_Oberzentrum_Pkw_min),
            one row per Kreis, year 2021 only
Output: data/out/erreichbarkeit_kreise.csv (ars, fz_mz, fz_oz)
        fz_mz = car travel time to nearest Mittelzentrum (minutes)
        fz_oz = car travel time to nearest Oberzentrum (minutes)
"""

from pathlib import Path

import pandas as pd

DATA = Path(__file__).parent / "data"
OUT = DATA / "out"


def kreis_key(s: pd.Series) -> pd.Series:
    return s.astype(str).str.zfill(8).str[:5]


def to_num(s: pd.Series) -> pd.Series:
    return pd.to_numeric(s.astype(str).str.replace(",", ".", regex=False), errors="coerce")


def main() -> None:
    OUT.mkdir(exist_ok=True)

    raw = pd.read_csv(DATA / "inkar_erreichbarkeit.csv", sep=";", encoding="utf-8")
    out = pd.DataFrame(
        {
            "ars": kreis_key(raw["AGS"]),
            "fz_mz": to_num(raw["Fahrzeit_Mittelzentrum_Pkw_min"]),
            "fz_oz": to_num(raw["Fahrzeit_Oberzentrum_Pkw_min"]),
        }
    )
    out.to_csv(OUT / "erreichbarkeit_kreise.csv", index=False)
    print(
        f"kreise: {len(out)} "
        f"(fz_mz min: {out.fz_mz.min()}, max: {out.fz_mz.max()}; "
        f"fz_oz min: {out.fz_oz.min()}, max: {out.fz_oz.max()})"
    )


if __name__ == "__main__":
    main()
