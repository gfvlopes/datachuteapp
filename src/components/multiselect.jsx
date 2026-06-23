import React, { useState, useRef, useEffect } from 'react'

export default function multiselect({ options, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (opt) => {
    if (value.includes(opt)) onChange(value.filter(v => v !== opt))
    else onChange([...value, opt])
  }

  const label = value.length === 0
    ? placeholder
    : value.length === 1
    ? value[0]
    : `${value.length} selecionados`

  return (
    <div ref={ref} style={{ position: 'relative', minWidth: '160px', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          padding: '7px 28px 7px 10px',
          borderRadius: '8px',
          border: `1.5px solid ${value.length > 0 ? '#A1B5D8' : '#E0E5EC'}`,
          background: value.length > 0 ? '#EBF1FA' : '#FFFFFF',
          color: value.length > 0 ? '#2C3A42' : '#738290',
          fontSize: '12px',
          fontWeight: value.length > 0 ? '500' : '400',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'Inter, sans-serif',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          boxSizing: 'border-box',
        }}
      >
        {label}
        <span style={{
          position: 'absolute', right: '8px', top: '50%',
          transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`,
          transition: 'transform 0.15s', pointerEvents: 'none',
          color: '#B0BCC8',
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0,
          background: '#FFFFFF', borderRadius: '8px',
          border: '1.5px solid #E0E5EC',
          boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
          zIndex: 200, minWidth: '220px', maxHeight: '260px',
          overflowY: 'auto', padding: '4px',
        }}>
          {options.map(opt => {
            const selected = value.includes(opt)
            return (
              <div
                key={opt}
                onClick={() => toggle(opt)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '7px 10px', borderRadius: '6px', cursor: 'pointer',
                  background: selected ? '#EBF1FA' : 'transparent',
                  fontSize: '12px', color: '#2C3A42',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#F7F7F7' }}
                onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{
                  width: '14px', height: '14px', borderRadius: '4px', flexShrink: 0,
                  border: `1.5px solid ${selected ? '#A1B5D8' : '#C8D0DA'}`,
                  background: selected ? '#A1B5D8' : '#FFFFFF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {selected && (
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <span style={{ whiteSpace: 'nowrap' }}>{opt}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}