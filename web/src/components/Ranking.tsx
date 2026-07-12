import { useMemo } from 'react'
import { useLang, useT } from '../i18n'
import { fmtNumber } from '../metrics'
import type { Dataset } from '../types'

const MIN_EINWOHNER = 5000

interface Props {
  data: Dataset
  onPick: (ars: string) => void
}

export default function Ranking({ data, onPick }: Props) {
  const { lang } = useLang()
  const t = useT()
  const top = useMemo(() => {
    return Object.entries(data)
      .filter(([, g]) => g.e >= MIN_EINWOHNER && g.m.score != null)
      .sort((a, b) => b[1].m.score - a[1].m.score)
      .slice(0, 10)
  }, [data])

  return (
    <div className="ranking">
      <div className="metric-group-title">{t('rankingTitle')}</div>
      <ol className="ranking-list">
        {top.map(([ars, g], i) => (
          <li key={ars}>
            <button onClick={() => onPick(ars)}>
              <span className="ranking-rank">{i + 1}</span>
              <span className="ranking-name">{g.n}</span>
              <span className="ranking-score">{fmtNumber(g.m.score, 1, lang)}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}
