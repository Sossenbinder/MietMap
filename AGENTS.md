# Mietmap — Agent Notes

## Workflow: delegate execution to cheap models

Implementation work should be dispatched to cost-appropriate executor subagents (haiku for mechanical tasks, sonnet for well-specified work) with precise briefs and a stop-and-report rule. Keep in the main session: data-source judgment, design decisions, diff review, and browser verification. This mirrors the tier-routing philosophy of the /outline skill.

Caveat: follow-up tasks sent to a warm agent via SendMessage may not preserve the `model` override. Prefer spawning a fresh agent with the intended model per task batch, unless context carry-over clearly outweighs the model cost.

## Data sources

- **INKAR bulk download** (free, no login): `https://www.bbr-server.de/imagemap/inkar/download/inkar_2025.zip` (~433 MB) → `inkar_2025.csv` (6.6 GB, long format `Bereich;ID;Kuerzel;Indikator;Raumbezug;Kennziffer;Name;Zeitbezug;Wert`, decimal comma). Hundreds of numeric indicators at `Raumbezug=Kreise` — the right source for official quality-of-life layers (childcare, physicians, etc.).
- **Numeric Angebotsmieten (asking rents) are NOT freely available anywhere.** They are not in INKAR (grepping the full CSV for "miete" yields zero matches); BBSR licenses that data from IDN ImmoDaten GmbH and cannot redistribute raw values. Deutschlandatlas publishes only 6 class buckets (`preis_miet`, 2023; also `preis_miet_best` for existing rents).
- Mietmap therefore uses class midpoints and suppresses `miet_gap` in the open-ended top class. Numeric asking rents would require a commercial license (IDN ImmoDaten, empirica regio, etc.).
