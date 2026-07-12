"""Extract Kreis-level income and asking-rent metrics from the Deutschlandatlas.

Input:  data/deutschlandatlas_krs1224.csv (hh_veink: disposable income per
            inhabitant, 1000 EUR/year)
        data/deutschlandatlas_krs1222.csv (preis_miet: asking-rent class,
            e.g. "8,50 bis unter 10,00"; plus straft/einbr/alq/v_harzt/kbtr_pers)
Output: data/out/deutschlandatlas_kreise.csv
        (ars, einkommen, angebotsmiete, angebotsmiete_top,
         straft, einbr, alq, v_harzt, kbtr_pers)
        angebotsmiete_top = 1 when the Kreis's class is the open-ended top
        bucket ("11,50 und mehr"), whose midpoint understates true asking
        rents in hot markets; downstream consumers should suppress any
        gap computed against it.
"""

from pathlib import Path

import pandas as pd

DATA = Path(__file__).parent / "data"
OUT = DATA / "out"

# preis_miet is a class string; map to its midpoint (EUR/m^2).
MIET_MIDPOINTS = {
    "bis unter 5,50": 4.75,
    "unter 5,50": 4.75,
    "5,50 bis unter 7,00": 6.25,
    "7,00 bis unter 8,50": 7.75,
    "8,50 bis unter 10,00": 9.25,
    "10,00 bis unter 11,50": 10.75,
    "11,50 und mehr": 12.50,
}

# Open-ended top bucket: its midpoint is a floor, not a real center.
TOP_CLASS = "11,50 und mehr"

# Additional numeric krs1222 columns (decimal comma -> float), passed through as-is.
EXTRA_COLS = ["straft", "einbr", "alq", "v_harzt", "kbtr_pers"]


def to_num(s: pd.Series) -> pd.Series:
    return pd.to_numeric(s.astype(str).str.replace(",", ".", regex=False), errors="coerce")


def kreis_key(s: pd.Series) -> pd.Series:
    return s.astype(str).str.zfill(8).str[:5]


def main() -> None:
    OUT.mkdir(exist_ok=True)

    krs1224 = pd.read_csv(DATA / "deutschlandatlas_krs1224.csv", sep=";", encoding="utf-8")
    krs1222 = pd.read_csv(DATA / "deutschlandatlas_krs1222.csv", sep=";", encoding="utf-8")

    print("preis_miet unique values:", sorted(krs1222.preis_miet.unique()))
    unknown = sorted(set(krs1222.preis_miet.unique()) - set(MIET_MIDPOINTS))
    if unknown:
        raise SystemExit(f"Unknown preis_miet class(es), refusing to invent a midpoint: {unknown}")

    einkommen = pd.DataFrame(
        {
            "ars": kreis_key(krs1224["KRS12224"]),
            "einkommen": to_num(krs1224["hh_veink"]),
        }
    )

    angebotsmiete = pd.DataFrame(
        {
            "ars": kreis_key(krs1222["KRS1222"]),
            "angebotsmiete": krs1222["preis_miet"].map(MIET_MIDPOINTS),
            "angebotsmiete_top": (krs1222["preis_miet"] == TOP_CLASS).astype(int),
            **{c: to_num(krs1222[c]) for c in EXTRA_COLS},
        }
    )

    df = einkommen.merge(angebotsmiete, on="ars", how="outer")
    df.to_csv(OUT / "deutschlandatlas_kreise.csv", index=False)
    print(f"kreise: {len(df)} (einkommen missing: {df.einkommen.isna().sum()}, "
          f"angebotsmiete missing: {df.angebotsmiete.isna().sum()}, "
          f"top-class: {int(df.angebotsmiete_top.sum())})")


if __name__ == "__main__":
    main()
