export interface Scenario {
  m2: number
  income: number
  basis: 'bestand' | 'neu'
  warm: boolean
  nk: number
  plot: number
  baukosten: number
  eigenkapital: number
  zins: number
  jahre: number
  nebenkosten: number
}

interface Props {
  scenario: Scenario
  metricId: string
  onChange: (scenario: Scenario) => void
}

export default function ScenarioPanel({ scenario, metricId, onChange }: Props) {
  const showBau = metricId === 'kauf_monat' || metricId === 'kauf_vs_miete'

  return (
    <div className="scenario-panel">
      <div className="metric-group-title">Szenario anpassen</div>

      <div className="scenario-row">
        <div className="scenario-row-label">
          <span>Wohnungsgröße</span>
          <span className="scenario-row-value">{scenario.m2} m²</span>
        </div>
        <input
          type="range"
          min={20}
          max={200}
          step={5}
          value={scenario.m2}
          onChange={(e) => onChange({ ...scenario, m2: Number(e.target.value) })}
        />
      </div>

      <div className="scenario-row">
        <div className="scenario-row-label">
          <span>Nettoeinkommen</span>
        </div>
        <div className="scenario-income-input">
          <input
            type="number"
            min={500}
            max={10000}
            step={50}
            value={scenario.income}
            onChange={(e) => {
              const v = Number(e.target.value)
              if (Number.isFinite(v)) onChange({ ...scenario, income: v })
            }}
          />
          <span>€</span>
        </div>
      </div>

      <div className="scenario-toggle">
        <button
          className={`metric-btn ${scenario.basis === 'bestand' ? 'active' : ''}`}
          onClick={() => onChange({ ...scenario, basis: 'bestand' })}
        >
          Bestandsmiete
        </button>
        <button
          className={`metric-btn ${scenario.basis === 'neu' ? 'active' : ''}`}
          onClick={() => onChange({ ...scenario, basis: 'neu' })}
        >
          Neuvermietung
        </button>
      </div>

      {scenario.basis === 'neu' && (
        <div className="legend-note">
          Neuvermietung basiert auf Kreis-Klassenmitten (BBSR); in Hochpreis-Kreisen (Klasse „11,50 € und mehr“) ist
          die echte Miete meist höher.
        </div>
      )}

      <div className="scenario-toggle">
        <button
          className={`metric-btn ${!scenario.warm ? 'active' : ''}`}
          onClick={() => onChange({ ...scenario, warm: false })}
        >
          Kaltmiete
        </button>
        <button
          className={`metric-btn ${scenario.warm ? 'active' : ''}`}
          onClick={() => onChange({ ...scenario, warm: true })}
        >
          Warmmiete
        </button>
      </div>

      {scenario.warm && (
        <>
          <div className="scenario-row">
            <div className="scenario-row-label">
              <span>Nebenkosten-Pauschale</span>
              <span className="scenario-row-value">{scenario.nk.toFixed(1)} €/m²</span>
            </div>
            <input
              type="range"
              min={2}
              max={6}
              step={0.25}
              value={scenario.nk}
              onChange={(e) => onChange({ ...scenario, nk: Number(e.target.value) })}
            />
          </div>
          <div className="legend-note">Warmmiete = Kaltmiete + Pauschale; Angaben ohne Heizkosten-Garantie.</div>
        </>
      )}

      {showBau && (
        <>
          <div className="metric-group-title scenario-subtitle">Bauen & Finanzierung</div>

          <div className="scenario-row">
            <div className="scenario-row-label">
              <span>Grundstück</span>
              <span className="scenario-row-value">{scenario.plot} m²</span>
            </div>
            <input
              type="range"
              min={200}
              max={1500}
              step={50}
              value={scenario.plot}
              onChange={(e) => onChange({ ...scenario, plot: Number(e.target.value) })}
            />
          </div>

          <div className="scenario-row">
            <div className="scenario-row-label">
              <span>Baukosten</span>
              <span className="scenario-row-value">{scenario.baukosten} €/m²</span>
            </div>
            <input
              type="range"
              min={2000}
              max={5000}
              step={100}
              value={scenario.baukosten}
              onChange={(e) => onChange({ ...scenario, baukosten: Number(e.target.value) })}
            />
          </div>

          <div className="scenario-row">
            <div className="scenario-row-label">
              <span>Eigenkapital</span>
            </div>
            <div className="scenario-income-input">
              <input
                type="number"
                min={0}
                max={1000000}
                step={10000}
                value={scenario.eigenkapital}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  if (Number.isFinite(v)) onChange({ ...scenario, eigenkapital: v })
                }}
              />
              <span>€</span>
            </div>
          </div>

          <div className="scenario-row">
            <div className="scenario-row-label">
              <span>Zins</span>
              <span className="scenario-row-value">{scenario.zins.toFixed(1)} %</span>
            </div>
            <input
              type="range"
              min={1}
              max={7}
              step={0.1}
              value={scenario.zins}
              onChange={(e) => onChange({ ...scenario, zins: Number(e.target.value) })}
            />
          </div>

          <div className="scenario-row">
            <div className="scenario-row-label">
              <span>Laufzeit</span>
              <span className="scenario-row-value">{scenario.jahre} Jahre</span>
            </div>
            <input
              type="range"
              min={10}
              max={40}
              step={5}
              value={scenario.jahre}
              onChange={(e) => onChange({ ...scenario, jahre: Number(e.target.value) })}
            />
          </div>

          <div className="scenario-row">
            <div className="scenario-row-label">
              <span>Kaufnebenkosten</span>
              <span className="scenario-row-value">{scenario.nebenkosten.toFixed(1)} %</span>
            </div>
            <input
              type="range"
              min={5}
              max={15}
              step={0.5}
              value={scenario.nebenkosten}
              onChange={(e) => onChange({ ...scenario, nebenkosten: Number(e.target.value) })}
            />
          </div>

          <div className="legend-note">
            Modell: Neubau auf gekauftem Grundstück. Echte Kaufpreise für Bestandsimmobilien sind nicht frei
            verfügbar.
          </div>
        </>
      )}
    </div>
  )
}
