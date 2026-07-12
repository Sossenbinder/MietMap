import { useMemo, useRef, useState } from 'react'
import type { Dataset } from '../types'

interface Props {
  data: Dataset
  onPick: (ars: string) => void
}

export default function SearchBox({ data, onPick }: Props) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const index = useMemo(
    () =>
      Object.entries(data).map(([ars, g]) => ({ ars, name: g.n, norm: g.n.toLowerCase(), kr: g.kr, e: g.e })),
    [data],
  )

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (needle.length < 2) return []
    return index
      .filter((g) => g.norm.includes(needle))
      .sort((a, b) => Number(b.norm.startsWith(needle)) - Number(a.norm.startsWith(needle)) || b.e - a.e)
      .slice(0, 8)
  }, [q, index])

  return (
    <div className="search">
      <input
        ref={inputRef}
        value={q}
        placeholder="Gemeinde suchen …"
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && matches.length > 0 && (
        <div className="search-results">
          {matches.map((m) => (
            <button
              key={m.ars}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onPick(m.ars)
                setQ('')
                setOpen(false)
                inputRef.current?.blur()
              }}
            >
              <strong>{m.name}</strong>
              <span>{m.kr}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
