import React, { useState, useRef } from 'react'
import { ReferenceDataProvider, useReferenceData } from './context/referencedatacontext'
import { supabase } from './lib/supabase'
import Sidebar from './components/sidebar'
import HomePage from './pages/homepage'
import Dominios from './pages/dominios'
import Iniciativas from './pages/iniciativas'
import Fontes from './pages/fontes'
import Provisionamento from './pages/provisionamento'
import DashboardPage from './pages/dashboardpage'
import RegistoAlteracoes from './pages/registoalteracoes'
import Atributos from './pages/atributos'
import DocumentacaoProduto from './pages/documentacaoproduto'

// ─── Popup de alerta de hierarquia ────────────────────────────────────────────
function HierarquiaAlert({ msg, submsg, onClose, onNavigate, navigateLabel, navigateTo }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(44,58,66,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '28px 32px', width: '440px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(201,151,74,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9A6E20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#2C3A42', margin: 0 }}>{msg}</h3>
        </div>
        <p style={{ fontSize: '13px', color: '#4A5568', margin: '0 0 24px', lineHeight: '1.6' }}>{submsg}</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: '8px', border: '1.5px solid #E0E5EC', background: '#FFFFFF', color: '#738290', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
            Fechar
          </button>
          {navigateTo && (
            <button onClick={() => { onClose(); onNavigate(navigateTo) }}
              style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#5C8F6A', color: '#FFFFFF', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
              {navigateLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── App interior (tem acesso ao contexto) ─────────────────────────────────────
function AppInner() {
  const { iniciativas, useCases } = useReferenceData()
  const [activePage, setActivePage] = useState('home')
  const [hierarquiaAlert, setHierarquiaAlert] = useState(null)
  const [docProduto, setDocProduto]       = useState(null)  // produto seleccionado para documentação
  const [docOrigem, setDocOrigem]         = useState('iniciativas')  // página de origem (para o voltar)

  const provisionamentoRef = useRef(null)

  const [filterDominio, setFilterDominio] = useState([])
  const [filterIniciativa, setFilterIniciativa] = useState([])
  const [filterUseCase, setFilterUseCase] = useState([])
  const [filterProduto, setFilterProduto] = useState([])

  const sharedFilters = { filterDominio, setFilterDominio, filterIniciativa, setFilterIniciativa, filterUseCase, setFilterUseCase, filterProduto, setFilterProduto }
  const sidebarWidth = '220px'

  const useCasesCount = useCases.length

  // Abrir documentação de um produto
  const handleOpenProduto = (produto) => {
    setDocProduto(produto)
    setDocOrigem(activePage)  // guarda de onde veio
    setActivePage('documentacao-produto')
  }

  const handleOpenProvisionamento = () => {
    if (useCasesCount === 0) {
      setHierarquiaAlert({
        msg: 'Ainda não existem Use Cases',
        submsg: 'Para criar um Produto de Dados é necessário ter pelo menos um Use Case criado. Cria primeiro uma Iniciativa e o respectivo Use Case no Catálogo de Iniciativas.',
        navigateTo: 'iniciativas',
        navigateLabel: 'Ir para Iniciativas',
      })
      return
    }
    setActivePage('provisionamento-acompanhamento')
    setTimeout(() => provisionamentoRef.current && provisionamentoRef.current(), 100)
  }

  const renderPage = () => {
    switch (activePage) {
      case 'home': return (
        <HomePage onNavigate={setActivePage} onOpenProvisionamento={handleOpenProvisionamento} />
      )
      case 'dominios':                       return <Dominios />
      case 'iniciativas':                    return <Iniciativas onOpenProduto={handleOpenProduto} />
      case 'fontes':                         return <Fontes />
      case 'atributos':                      return <Atributos />
      case 'provisionamento-acompanhamento': return (
        <Provisionamento {...sharedFilters} onRegisterOpenModal={(fn) => { provisionamentoRef.current = fn }} onNavigate={setActivePage} onOpenProduto={handleOpenProduto} />
      )
      case 'documentacao-produto': return (
        <DocumentacaoProduto produto={docProduto} onBack={() => setActivePage(docOrigem)} />
      )
      case 'dashboard': return <DashboardPage />
      case 'registo-alteracoes': return (
        <div>
          <div style={{ padding: '24px 36px 0', fontFamily: 'Inter, sans-serif' }}>
            <button onClick={() => setActivePage('provisionamento-acompanhamento')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#738290', fontSize: '13px', fontWeight: '500', cursor: 'pointer', padding: 0, fontFamily: 'Inter, sans-serif' }}
              onMouseEnter={e => e.currentTarget.style.color = '#2C3A42'}
              onMouseLeave={e => e.currentTarget.style.color = '#738290'}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
              </svg>
              Produto de Dados
            </button>
          </div>
          <RegistoAlteracoes {...sharedFilters} />
        </div>
      )
      default: return null
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F7F7F7', fontFamily: 'Inter, sans-serif' }}>
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main style={{ marginLeft: sidebarWidth, flex: 1, minHeight: '100vh', overflowX: 'hidden', transition: 'margin-left 0.2s' }}>
        {renderPage()}
      </main>
      {hierarquiaAlert && (
        <HierarquiaAlert
          msg={hierarquiaAlert.msg}
          submsg={hierarquiaAlert.submsg}
          navigateTo={hierarquiaAlert.navigateTo}
          navigateLabel={hierarquiaAlert.navigateLabel}
          onClose={() => setHierarquiaAlert(null)}
          onNavigate={setActivePage}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <ReferenceDataProvider>
      <AppInner />
    </ReferenceDataProvider>
  )
}