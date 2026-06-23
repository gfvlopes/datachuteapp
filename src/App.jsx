import React, { useState, useRef } from 'react'
import { ReferenceDataProvider } from './context/referencedatacontext'
import Sidebar from './components/sidebar'
import HomePage from './pages/homepage'
import Dominios from './pages/dominios'
import Iniciativas from './pages/iniciativas'
import Fontes from './pages/fontes'
import CatalogoProdutosDados from './pages/catalogoprodutosdados'
import Provisionamento from './pages/provisionamento'
import DashboardPage from './pages/dashboardpage'
import RegistoAlteracoes from './pages/registoalteracoes'
import Atributos from './pages/atributos'
import CadernoRequisitos from './pages/cadernorequisitos'

export default function App() {
  const [activePage, setActivePage] = useState('home')
  const [selectedCaderno, setSelectedCaderno] = useState(null)
  const [cadernos, setCadernos] = useState([])

  // Refs para disparar abertura de modais nas páginas filhas
  const provisionamentoRef = useRef(null)
  const cadernoRef = useRef(null)

  const [filterDominio, setFilterDominio] = useState([])
  const [filterIniciativa, setFilterIniciativa] = useState([])
  const [filterUseCase, setFilterUseCase] = useState([])
  const [filterProduto, setFilterProduto] = useState([])

  const sharedFilters = {
    filterDominio, setFilterDominio,
    filterIniciativa, setFilterIniciativa,
    filterUseCase, setFilterUseCase,
    filterProduto, setFilterProduto,
  }

  const sidebarWidth = activePage === 'caderno-requisitos' ? '300px' : '220px'

  const renderPage = () => {
    switch (activePage) {
      case 'home':                           return (
        <HomePage
          onNavigate={setActivePage}
          onOpenProvisionamento={() => provisionamentoRef.current && provisionamentoRef.current()}
          onOpenCaderno={() => cadernoRef.current && cadernoRef.current()}
        />
      )
      case 'dominios':                       return <Dominios />
      case 'iniciativas':                    return <Iniciativas />
      case 'fontes':                         return <Fontes />
      case 'atributos':                      return <Atributos />
      case 'catalogo-produtos-dados':        return <CatalogoProdutosDados />
      case 'provisionamento-acompanhamento': return (
        <Provisionamento
          {...sharedFilters}
          onRegisterOpenModal={(fn) => { provisionamentoRef.current = fn }}
          onNavigate={setActivePage}
        />
      )
      case 'caderno-requisitos':             return (
        <CadernoRequisitos
          selectedCaderno={selectedCaderno}
          onSelectCaderno={setSelectedCaderno}
          cadernos={cadernos}
          onCadernosChange={setCadernos}
          onRegisterOpenModal={(fn) => { cadernoRef.current = fn }}
        />
      )
      case 'dashboard':                      return <DashboardPage />
      case 'registo-alteracoes':             return (
        <div>
          <div style={{ padding: '24px 36px 0', fontFamily: 'Inter, sans-serif' }}>
            <button
              onClick={() => setActivePage('provisionamento-acompanhamento')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#738290', fontSize: '13px', fontWeight: '500', cursor: 'pointer', padding: 0, fontFamily: 'Inter, sans-serif' }}
              onMouseEnter={e => e.currentTarget.style.color = '#2C3A42'}
              onMouseLeave={e => e.currentTarget.style.color = '#738290'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
              </svg>
              Produto de Dados
            </button>
          </div>
          <RegistoAlteracoes {...sharedFilters} />
        </div>
      )
      default:                               return null
    }
  }

  return (
    <ReferenceDataProvider>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#F7F7F7', fontFamily: 'Inter, sans-serif' }}>
        <Sidebar
          activePage={activePage}
          onNavigate={setActivePage}
          onSelectCaderno={setSelectedCaderno}
          selectedCadernoId={selectedCaderno?.id}
          cadernos={cadernos}
        />
        <main style={{ marginLeft: sidebarWidth, flex: 1, minHeight: '100vh', overflowX: 'hidden', transition: 'margin-left 0.2s' }}>
          {renderPage()}
        </main>
      </div>
    </ReferenceDataProvider>
  )
}