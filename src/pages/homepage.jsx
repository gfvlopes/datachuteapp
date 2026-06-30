import React from 'react'

const CARDS = [
  {
    id: 'iniciativas',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    ),
    label: 'Catálogo de Iniciativas',
    description: 'Consulta toda a hierarquia de artefactos: iniciativas, use cases e produtos de dados. O ponto de entrada para perceber o que existe e como está organizado.',
    accent: '#A1B5D8',
    accentBg: 'rgba(161,181,216,0.10)',
    accentBorder: 'rgba(161,181,216,0.35)',
    accentText: '#5A7BA8',
  },
  {
    id: 'provisionamento-acompanhamento',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>
      </svg>
    ),
    label: 'Gerir Produtos de Dados',
    description: 'Acompanha o estado de todos os produtos de dados por iniciativa e use case. Actualiza status e regista alterações. Clica num produto para ver o seu detalhe completo.',
    accent: '#B5A8D8',
    accentBg: 'rgba(181,168,216,0.10)',
    accentBorder: 'rgba(181,168,216,0.35)',
    accentText: '#7A5BA8',
    action: 'navigate',
  },
  {
    id: 'novo-produto',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
    ),
    label: 'Criar Produto de Dados',
    description: 'Associa um novo produto de dados a um use case. Define tipologia, owner, localização em Fabric e restante metadata.',
    accent: '#A8C8D8',
    accentBg: 'rgba(168,200,216,0.10)',
    accentBorder: 'rgba(168,200,216,0.35)',
    accentText: '#3A7A98',
    action: 'openProvisionamento',
  },
  {
    id: 'atributos',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
        <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
      </svg>
    ),
    label: 'Gerir Atributos em Catálogo',
    description: 'Gere o estado de catalogação dos atributos gold. Avança atributos de "Mapeamento Sistema Fonte UN" até "Disponível" com validação de cada camada.',
    accent: '#D8B5A8',
    accentBg: 'rgba(216,181,168,0.10)',
    accentBorder: 'rgba(216,181,168,0.35)',
    accentText: '#9A5A3A',
  },
]

export default function HomePage({ onNavigate, onOpenProvisionamento }) {
  const handleCard = (card) => {
    if (card.action === 'openProvisionamento') {
      onNavigate('provisionamento-acompanhamento')
      setTimeout(() => onOpenProvisionamento && onOpenProvisionamento(), 100)
    } else {
      onNavigate(card.id)
    }
  }

  return (
    <div style={{ padding: '48px 40px', fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#F7F7F7' }}>

      {/* Saudação */}
      <div style={{ marginBottom: '48px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#2C3A42', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Olá, Gonçalo 👋
        </h1>
        <p style={{ fontSize: '17px', color: '#738290', margin: 0, fontWeight: '600' }}>
          Pronto para abrir o pára-quedas?
        </p>
      </div>

      {/* Separador */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <span style={{ fontSize: '11px', fontWeight: '700', color: '#B0BCC8', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
          Por onde queres começar?
        </span>
        <div style={{ flex: 1, height: '1px', background: '#ECEEF2' }} />
      </div>

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
        {CARDS.map(card => (
          <button
            key={card.id}
            onClick={() => handleCard(card)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
              padding: '24px 20px', borderRadius: '14px', cursor: 'pointer',
              border: `1.5px solid ${card.accentBorder}`,
              background: '#FFFFFF',
              textAlign: 'left', fontFamily: 'Inter, sans-serif',
              transition: 'all 0.15s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = card.accentBg
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#FFFFFF'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            {/* Ícone */}
            <div style={{
              width: '44px', height: '44px', borderRadius: '10px',
              background: card.accentBg, border: `1.5px solid ${card.accentBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: card.accentText, marginBottom: '16px', flexShrink: 0,
            }}>
              {card.icon}
            </div>

            {/* Label */}
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#2C3A42', margin: '0 0 8px', lineHeight: '1.3' }}>
              {card.label}
            </p>

            {/* Descrição */}
            <p style={{ fontSize: '12px', color: '#738290', margin: '0 0 20px', lineHeight: '1.6', flex: 1 }}>
              {card.description}
            </p>

            {/* CTA */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '600', color: card.accentText }}>
              <span>Ir para</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </div>
          </button>
        ))}
      </div>

      {/* Footer info */}
      <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid #ECEEF2', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#5C8F6A' }} />
        <span style={{ fontSize: '11px', color: '#B0BCC8' }}>
          DataChute — Open the chute before impact
        </span>
      </div>
    </div>
  )
}