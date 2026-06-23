import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const ChevronDown = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

const ChevronRight = ({ open }) => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round"
    style={{ transition: 'transform 0.15s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

const FolderIcon = ({ open }) => (
  <svg width="13" height="13" viewBox="0 0 24 24"
    fill={open ? 'rgba(92,143,106,0.25)' : 'none'}
    stroke="#5C8F6A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
)

const FileIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#5C8F6A" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
)

const navItems = [
  {
    id: 'home',
    label: 'Home',
  },
  {
    id: 'catalogo',
    label: 'Catálogo',
    children: [
      { id: 'dominios',                label: 'Domínios' },
      { id: 'iniciativas',             label: 'Iniciativas' },
      { id: 'catalogo-produtos-dados', label: 'Produtos de Dados' },
      { id: 'fontes',                  label: 'Sistema UN' },
    ],
  },
  {
    id: 'provisionamento',
    label: 'Provisionamento',
    children: [
      { id: 'provisionamento-acompanhamento', label: 'Produto de Dados' },
      { id: 'caderno-requisitos',             label: 'Ficha Técnica' },
      { id: 'atributos',                      label: 'Atributos' },
    ],
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
  },
]

// Árvore de pastas de cadernos
function CadernoTree({ onSelectCaderno, selectedCadernoId, cadernos = [] }) {
  const [expandedDominios, setExpandedDominios] = useState(new Set())
  const [expandedProdutos, setExpandedProdutos] = useState(new Set())

  const tree = {}
  cadernos.forEach(c => {
    const dom = c.dominio_owner || '(Sem domínio)'
    const prod = c.nome_produto_dados
    if (!tree[dom]) tree[dom] = {}
    if (!tree[dom][prod]) tree[dom][prod] = []
    tree[dom][prod].push(c)
  })

  const toggleDominio = (dom) => setExpandedDominios(prev => {
    const n = new Set(prev); n.has(dom) ? n.delete(dom) : n.add(dom); return n
  })
  const toggleProduto = (key) => setExpandedProdutos(prev => {
    const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n
  })

  if (cadernos.length === 0) return (
    <p style={{ fontSize: '11px', color: '#C0C8D0', padding: '8px 10px', margin: 0 }}>
      Nenhum caderno criado.
    </p>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '4px' }}>
      {Object.keys(tree).sort().map(dom => {
        const domOpen = expandedDominios.has(dom)
        return (
          <div key={dom}>
            <div
              onClick={() => toggleDominio(dom)}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '5px 8px', borderRadius: '6px', cursor: 'pointer',
                fontSize: '11px', fontWeight: '600', color: '#2C3A42',
                userSelect: 'none',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#F3F6FB'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <ChevronRight open={domOpen} />
              <FolderIcon open={domOpen} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dom}</span>
            </div>

            {domOpen && Object.keys(tree[dom]).sort().map(prod => {
              const prodKey = `${dom}__${prod}`
              const prodOpen = expandedProdutos.has(prodKey)
              return (
                <div key={prod} style={{ marginLeft: '14px' }}>
                  <div
                    onClick={() => toggleProduto(prodKey)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '5px 8px', borderRadius: '6px', cursor: 'pointer',
                      fontSize: '11px', fontWeight: '500', color: '#4A5568',
                      userSelect: 'none',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F3F6FB'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <ChevronRight open={prodOpen} />
                    <FolderIcon open={prodOpen} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{prod}</span>
                    <span style={{
                      flexShrink: 0, background: 'rgba(92,143,106,0.15)', color: '#2A6040',
                      borderRadius: '20px', padding: '1px 6px',
                      fontSize: '10px', fontWeight: '600',
                    }}>
                      {tree[dom][prod].length}
                    </span>
                  </div>

                  {prodOpen && tree[dom][prod].map(c => {
                    const isActive = selectedCadernoId === c.id
                    return (
                      <div
                        key={c.id}
                        onClick={() => onSelectCaderno(c)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '5px',
                          padding: '5px 8px', marginLeft: '14px',
                          borderRadius: '6px', cursor: 'pointer',
                          background: isActive ? 'rgba(92,143,106,0.15)' : 'transparent',
                          fontSize: '11px', fontWeight: isActive ? '600' : '400',
                          color: isActive ? '#2A6040' : '#738290',
                          userSelect: 'none',
                        }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F3F6FB' }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                      >
                        <FileIcon />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.id_caderno}</span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

export default function Sidebar({ activePage, onNavigate, onSelectCaderno, selectedCadernoId, cadernos = [] }) {
  const [expanded, setExpanded] = useState({ 'catalogo': true, 'provisionamento': true })
  const sidebarWidth = activePage === 'caderno-requisitos' ? '300px' : '220px'

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const isChildActive = (item) =>
    item.children?.some(c => c.id === activePage)

  return (
    <aside style={{
      width: sidebarWidth,
      minHeight: '100vh',
      background: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 12px',
      position: 'fixed',
      left: 0, top: 0, bottom: 0,
      zIndex: 100,
      transition: 'width 0.2s',
      overflowY: 'auto',
    }}>
      <div style={{ marginBottom: '32px', paddingLeft: '8px' }}>
        <span style={{ fontSize: '15px', fontWeight: '700', color: '#2C3A42', letterSpacing: '-0.01em' }}>
          DataChute
        </span>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {navItems.map(item => {
          const hasChildren = !!item.children
          const isOpen = !!expanded[item.id]
          const hasActiveChild = isChildActive(item)
          const isDirectActive = !hasChildren && activePage === item.id

          if (!hasChildren) {
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', padding: '8px 10px',
                  borderRadius: '8px', border: 'none',
                  background: isDirectActive ? '#EBF1FA' : 'transparent',
                  color: isDirectActive ? '#2C3A42' : '#738290',
                  fontSize: '13px', fontWeight: isDirectActive ? '600' : '500',
                  cursor: 'pointer', width: '100%', textAlign: 'left',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { if (!isDirectActive) e.currentTarget.style.background = '#F7F7F7' }}
                onMouseLeave={e => { if (!isDirectActive) e.currentTarget.style.background = 'transparent' }}
              >
                {item.label}
              </button>
            )
          }

          return (
            <div key={item.id}>
              <button
                onClick={() => toggleExpand(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 10px', borderRadius: '8px', border: 'none',
                  background: hasActiveChild ? '#EBF1FA' : 'transparent',
                  color: hasActiveChild ? '#2C3A42' : '#738290',
                  fontSize: '13px', fontWeight: hasActiveChild ? '600' : '500',
                  cursor: 'pointer', width: '100%', textAlign: 'left',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { if (!hasActiveChild) e.currentTarget.style.background = '#F7F7F7' }}
                onMouseLeave={e => { if (!hasActiveChild) e.currentTarget.style.background = 'transparent' }}
              >
                {item.label}
                <span style={{
                  transition: 'transform 0.2s',
                  transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                  display: 'flex', alignItems: 'center', color: '#B0BCC8',
                }}>
                  <ChevronDown />
                </span>
              </button>

              {isOpen && (
                <div style={{
                  marginLeft: '12px', paddingLeft: '10px',
                  borderLeft: '1.5px solid #ECEEF2',
                  marginTop: '2px', marginBottom: '4px',
                  display: 'flex', flexDirection: 'column', gap: '2px',
                }}>
                  {item.children.map(child => {
                    const isActive = activePage === child.id
                    return (
                      <React.Fragment key={child.id}>
                        <button
                          onClick={() => onNavigate(child.id)}
                          style={{
                            display: 'flex', alignItems: 'center',
                            padding: '7px 10px', borderRadius: '7px', border: 'none',
                            background: isActive ? '#F7F7F7' : 'transparent',
                            color: isActive ? '#2C3A42' : '#738290',
                            fontSize: '12px', fontWeight: isActive ? '600' : '400',
                            cursor: 'pointer', width: '100%', textAlign: 'left',
                            transition: 'background 0.15s, color 0.15s',
                          }}
                          onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F7F7F7' }}
                          onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                        >
                          {child.label}
                        </button>

                        {/* Árvore de cadernos — só sob "Ficha Técnica" quando activo */}
                        {child.id === 'caderno-requisitos' && activePage === 'caderno-requisitos' && (
                          <div style={{
                            marginLeft: '8px', paddingLeft: '8px',
                            borderLeft: '1.5px solid #EBF1FA',
                            marginBottom: '4px',
                          }}>
                            <CadernoTree
                              onSelectCaderno={onSelectCaderno}
                              selectedCadernoId={selectedCadernoId}
                              cadernos={cadernos}
                            />
                          </div>
                        )}
                      </React.Fragment>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}