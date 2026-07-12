import { useState } from 'react'
import { useT } from '../i18n'
import type { Scenario } from './ScenarioPanel'

interface Props {
  scenario: Scenario
  onApply: (patch: Partial<Scenario>) => void
  onClose: () => void
}

/**
 * First-visit (and re-openable) prompt for the user's own situation. Captures the
 * handful of inputs that drive the "Mein Szenario" layers; the full set (Warmmiete,
 * financing, …) stays in the inline ScenarioPanel. Values persist via the normal
 * scenario localStorage path once applied.
 */
export default function ScenarioIntro({ scenario, onApply, onClose }: Props) {
  const t = useT()
  const [m2, setM2] = useState(scenario.m2)
  const [income, setIncome] = useState(scenario.income)
  const [basis, setBasis] = useState<Scenario['basis']>(scenario.basis)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="detail-close" onClick={onClose} aria-label={t('close')}>
          ×
        </button>
        <h2>{t('introTitle')}</h2>
        <p className="modal-intro">{t('introText')}</p>

        <div className="scenario-row">
          <div className="scenario-row-label">
            <span>{t('sFlatSize')}</span>
            <span className="scenario-row-value">{m2} m²</span>
          </div>
          <input type="range" min={20} max={200} step={5} value={m2} onChange={(e) => setM2(Number(e.target.value))} />
        </div>

        <div className="scenario-row">
          <div className="scenario-row-label">
            <span>{t('sIncomeMonthly')}</span>
          </div>
          <div className="scenario-income-input">
            <input
              type="number"
              min={500}
              max={10000}
              step={50}
              value={income}
              onChange={(e) => {
                const v = Number(e.target.value)
                if (Number.isFinite(v)) setIncome(v)
              }}
            />
            <span>€</span>
          </div>
        </div>

        <div className="scenario-toggle">
          <button className={`metric-btn ${basis === 'bestand' ? 'active' : ''}`} onClick={() => setBasis('bestand')}>
            {t('sExisting')}
          </button>
          <button className={`metric-btn ${basis === 'neu' ? 'active' : ''}`} onClick={() => setBasis('neu')}>
            {t('sNew')}
          </button>
        </div>
        <div className="legend-note">{t('introBasisHint')}</div>

        <div className="modal-actions">
          <button className="modal-secondary" onClick={onClose}>
            {t('introSkip')}
          </button>
          <button className="modal-primary" onClick={() => onApply({ m2, income, basis })}>
            {t('introApply')}
          </button>
        </div>
      </div>
    </div>
  )
}
