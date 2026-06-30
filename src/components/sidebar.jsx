import React from 'react'

const navItems = [
  { id: 'home',                           label: 'Home' },
  { id: 'dominios',                       label: 'Domínios e subdomínios' },
  { id: 'iniciativas',                    label: 'Iniciativas e use cases' },
  { id: 'provisionamento-acompanhamento', label: 'Produto de Dados' },
  { id: 'atributos',                      label: 'Atributos' },
  { id: 'fontes',                         label: 'Sistemas UN' },
  { id: 'dashboard',                      label: 'Dashboard' },
]

export default function Sidebar({ activePage, onNavigate }) {
  return (
    <aside style={{
      width: '220px',
      minHeight: '100vh',
      background: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 12px',
      position: 'fixed',
      left: 0, top: 0, bottom: 0,
      zIndex: 100,
      overflowY: 'auto',
    }}>
      <div style={{ marginBottom: '32px', paddingLeft: '8px' }}>
        <span style={{ fontSize: '15px', fontWeight: '700', color: '#2C3A42', letterSpacing: '-0.01em' }}>
          DataChute
        </span>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {navItems.map(item => {
          const isActive = activePage === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                display: 'flex', alignItems: 'center', padding: '8px 10px',
                borderRadius: '8px', border: 'none',
                background: isActive ? '#EBF1FA' : 'transparent',
                color: isActive ? '#2C3A42' : '#738290',
                fontSize: '13px', fontWeight: isActive ? '600' : '500',
                cursor: 'pointer', width: '100%', textAlign: 'left',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F7F7F7' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
            >
              {item.label}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}