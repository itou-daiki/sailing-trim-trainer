import { BOATS } from '../data/boats'
import type { BoatClass } from '../domain/types'

type MastheadProps = {
  boat: BoatClass
  onBoatChange: (boat: BoatClass) => void
}

export function Masthead({ boat, onBoatChange }: MastheadProps) {
  return (
    <header className="masthead">
      <a className="brand" href="#top" aria-label="TRIM NOTE ホーム">
        <span className="brand-mark" aria-hidden="true">
          <span />
        </span>
        <span>
          <strong>TRIM NOTE</strong>
          <small>420 / 470 SAIL LAB</small>
        </span>
      </a>

      <div className="masthead-center">
        <span className="eyebrow">LESSON 01</span>
        <span>クローズからベアする</span>
      </div>

      <div className="boat-switch" aria-label="艇種を選ぶ">
        {(Object.keys(BOATS) as BoatClass[]).map((id) => (
          <button
            type="button"
            className={boat === id ? 'is-active' : ''}
            aria-pressed={boat === id}
            onClick={() => onBoatChange(id)}
            key={id}
          >
            <span>{id}</span>
            <small>{id === '420' ? 'YOUTH' : 'PERFORMANCE'}</small>
          </button>
        ))}
      </div>
    </header>
  )
}
