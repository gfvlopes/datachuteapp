import React, { useState, useRef, useEffect } from 'react'

export default function SingleSelect({ options, value, onChange, placeholder = 'Seleccionar', minWidth = '180px' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const pick = (opt) => { onChange(opt); setOpen(false) }
  const hasValue = value !== null && value !== undefined && value !== ''
  const label = hasValue ? value : placeholder

  return (
    <div ref={ref} style={{ position: 'relative', minWidth, flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          padding: '7px 28px 7px 10px',
          borderRadius: '8px',
          border: `1.5px solid ${hasValue ? '#A1B5D8' : '#E0E5EC'}`,
          background: hasValue ? '#EBF1FA' : '#FFFFFF',
          color: hasValue ? '#2C3A42' : '#738290',
          fontSize: '12px',
          fontWeight: hasValue ? '500' : '400',
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
          zIndex: 200, minWidth: '240px', maxHeight: '280px',
          overflowY: 'auto', padding: '4px',
        }}>
          {options.map(opt => {
            const selected = opt === value
            return (
              <div
                key={opt}
                onClick={() => pick(opt)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 10px', borderRadius: '6px', cursor: 'pointer',
                  background: selected ? '#EBF1FA' : 'transparent',
                  fontSize: '12px', color: '#2C3A42',
                  fontWeight: selected ? '600' : '400',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#F7F7F7' }}
                onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ width: '16px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {selected && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5A7BA8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                <span style={{ whiteSpace: 'nowrap' }}>{opt}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}