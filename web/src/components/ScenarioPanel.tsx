import { useT } from '../i18n'

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
  const t = useT()
  const showBau = metricId === 'kauf_monat' || metricId === 'kauf_vs_miete'

  return (
    <div className="scenario-panel">
      <div className="metric-group-title">{t('scenarioAdjust')}</div>

      <div className="scenario-row">
        <div className="scenario-row-label">
          <span>{t('sFlatSize')}</span>
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
          <span>{t('sIncome')}</span>
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
          {t('sExisting')}
        </button>
        <button
          className={`metric-btn ${scenario.basis === 'neu' ? 'active' : ''}`}
          onClick={() => onChange({ ...scenario, basis: 'neu' })}
        >
          {t('sNew')}
        </button>
      </div>

      {scenario.basis === 'neu' && <div className="legend-note">{t('sNewHint')}</div>}

      <div className="scenario-toggle">
        <button
          className={`metric-btn ${!scenario.warm ? 'active' : ''}`}
          onClick={() => onChange({ ...scenario, warm: false })}
        >
          {t('sCold')}
        </button>
        <button
          className={`metric-btn ${scenario.warm ? 'active' : ''}`}
          onClick={() => onChange({ ...scenario, warm: true })}
        >
          {t('sWarm')}
        </button>
      </div>

      {scenario.warm && (
        <>
          <div className="scenario-row">
            <div className="scenario-row-label">
              <span>{t('sNkFlat')}</span>
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
          <div className="legend-note">{t('sWarmHint')}</div>
        </>
      )}

      {showBau && (
        <>
          <div className="metric-group-title scenario-subtitle">{t('sBauTitle')}</div>

          <div className="scenario-row">
            <div className="scenario-row-label">
              <span>{t('sPlot')}</span>
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
              <span>{t('sBuildCost')}</span>
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
              <span>{t('sEquity')}</span>
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
              <span>{t('sRate')}</span>
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
              <span>{t('sTerm')}</span>
              <span className="scenario-row-value">
                {scenario.jahre} {t('sYears')}
              </span>
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
              <span>{t('sBuyCosts')}</span>
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

          <div className="legend-note">{t('sBauHint')}</div>
        </>
      )}
    </div>
  )
}
