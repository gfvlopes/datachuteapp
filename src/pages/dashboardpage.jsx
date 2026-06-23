import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useReferenceData } from '../context/referencedatacontext'
import multiselect from '../components/multiselect'

const STATUS_COLORS = {
  'A aguardar submissão pela BS':     '#94A3B0',
  'Por iniciar (DSG)':                '#A8B5C0',
  'Levantamento de requisitos (DSG)': '#5A7BA8',
  'Ingestão (DIT)':                   '#4A7A5A',
  'Desenvolvimento (DSG)':            '#9A6E20',
  'Validação dos Dados (BO)':         '#3A7050',
  'Bloqueado (DSG)':                  '#C0544C',
  'Bloqueado (DIT)':                  '#B0473F',
  'Bloqueado (BS)':                   '#9A3B33',
  'Entrega parcial':                  '#3A5A8A',
  'Entregue':                         '#2A6040',
}

const STATUS_ORDER = [
  'A aguardar submissão pela BS',
  'Por iniciar (DSG)',
  'Levantamento de requisitos (DSG)',
  'Ingestão (DIT)',
  'Desenvolvimento (DSG)',
  'Validação dos Dados (BO)',
  'Bloqueado (DSG)',
  'Bloqueado (DIT)',
  'Bloqueado (BS)',
  'Entrega parcial',
  'Entregue',
]

const UC_STATUS_COLORS = {
  'Sem produto de dados':      '#D8DEE5',
  'Aguarda submissão pela BS': '#C8D0DA',
  'Por iniciar':                '#B8C4D2',
  'Em curso':            '#E8C98A',
  'Entregue':                   '#C2D8B9',
  'Com bloqueios':               '#E0A8A2',
}

const UC_STATUS_ORDER = ['Sem produto de dados', 'Aguarda submissão pela BS', 'Por iniciar', 'Em curso', 'Entregue', 'Com bloqueios']

const BLOCKED_STATUSES = ['Bloqueado (DSG)', 'Bloqueado (DIT)', 'Bloqueado (BS)']
const DELIVERED_STATUSES = ['Entregue', 'Entrega parcial']

function computeUseCaseStatus(productStatuses) {
  if (productStatuses.length === 0) return 'Sem produto de dados'
  if (productStatuses.every(s => s === 'A aguardar submissão pela BS')) return 'Aguarda submissão pela BS'
  if (productStatuses.every(s => s === 'Por iniciar (DSG)' || s === 'A aguardar submissão pela BS')) return 'Por iniciar'
  if (productStatuses.every(s => DELIVERED_STATUSES.includes(s))) return 'Entregue'
  if (productStatuses.some(s => BLOCKED_STATUSES.includes(s))) return 'Com bloqueios'
  return 'Em curso'
}

function MetricCard({ label, value, sublabel, accent }) {
  return (
    <div style={{
      background: '#FFFFFF', borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      padding: '18px 20px', flex: 1, minWidth: '160px',
    }}>
      <p style={{ fontSize: '11px', fontWeight: '500', color: '#738290', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>
        {label}
      </p>
      <p style={{ fontSize: '24px', fontWeight: '700', color: accent || '#2C3A42', margin: 0 }}>
        {value}
      </p>
      {sublabel && (
        <p style={{ fontSize: '12px', color: '#A8B2BC', margin: '4px 0 0' }}>{sublabel}</p>
      )}
    </div>
  )
}

function Bar({ label, count, total, color, showPct = true, valueLabel, noTrack = false, inlineLabel = false }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', color: '#2C3A42', fontWeight: '500' }}>
          {label}{inlineLabel && valueLabel ? <span style={{ color: '#A8B2BC', fontWeight: '400' }}> — {valueLabel}</span> : null}
        </span>
        {!inlineLabel && (
          <span style={{ fontSize: '12px', color: '#738290' }}>{valueLabel ?? (showPct ? `${count} (${pct}%)` : count)}</span>
        )}
      </div>
      <div style={{ background: noTrack ? 'transparent' : '#F0F2F5', borderRadius: '6px', height: '8px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '6px', transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <h2 style={{ fontSize: '14px', fontWeight: '700', color: '#2C3A42', margin: '0 0 16px', paddingBottom: '10px', borderBottom: '2px solid #ECEEF2' }}>
      {children}
    </h2>
  )
}

function CardTitle({ children }) {
  return (
    <p style={{ fontSize: '11px', fontWeight: '600', color: '#738290', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>
      {children}
    </p>
  )
}

function formatDays(days) {
  if (days === null || days === undefined) return '—'
  return `${days} dia${days === 1 ? '' : 's'}`
}

function FilterBar({ children }) {
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' }}>
      {children}
    </div>
  )
}

export default function DashboardPage() {
  const { iniciativas } = useReferenceData()
  const [dataProducts, setDataProducts] = useState([])
  const [registos, setRegistos] = useState([])
  const [loading, setLoading] = useState(true)

  // ---- Filtros: Secção 1 (Iniciativas) ----
  const [filterDominioOwner, setFilterDominioOwner] = useState([])
  const [filterDominioRequisitante, setFilterDominioRequisitante] = useState([])
  const [filterIniciativa, setFilterIniciativa] = useState([])

  // ---- Filtros: Secção 2 (Use Case) ----
  const [filterUseCase, setFilterUseCase] = useState([])
  const [filterUcStatus, setFilterUcStatus] = useState([])

  // ---- Filtros: Secção 3 (Produto de Dados) ----
  const [filterProduto, setFilterProduto] = useState([])
  const [filterDpStatus, setFilterDpStatus] = useState([])

  useEffect(() => {
    Promise.all([
      supabase.from('data_products').select('*'),
      supabase.from('registo_alteracoes').select('data_product,status,data_inicio,data_conclusao'),
    ]).then(([dpRes, regRes]) => {
      setDataProducts(dpRes.data || [])
      setRegistos(regRes.data || [])
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div style={{ padding: '32px 36px', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '48px', textAlign: 'center', color: '#738290', fontSize: '13px' }}>
          A carregar dashboard...
        </div>
      </div>
    )
  }

  // ============================================================
  // BASE DE DADOS UNIFICADA — uma linha por (iniciativa, use case, produto?)
  // ============================================================

  // Junta iniciativas com os produtos associados a cada use case
  const baseRows = iniciativas.map(r => {
    const products = dataProducts.filter(dp => String(dp.id_usecase_ai) === String(r.id_use_case))
    const productStatuses = products.map(p => p.status)
    return {
      idIniciativa: String(r.id_iniciativa),
      nomeIniciativa: r.nome_iniciativa,
      dominioOwner: r.dominio_owner,
      idUseCase: String(r.id_use_case),
      nomeUseCase: r.nome_use_case,
      products, // pode ser [] (sem produto), ou 1+ produtos
      ucStatus: computeUseCaseStatus(productStatuses),
    }
  })

  // dominioRequisitante vem do(s) produto(s) associado(s) — usamos o do primeiro produto, se existir
  baseRows.forEach(row => {
    row.dominioRequisitante = row.products[0]?.dominio_requisitante || null
  })

  // ============================================================
  // CROSS-FILTERING HIERÁRQUICO
  // Hierarquia: Domínio Owner / Domínio Requisitante  →  Iniciativa / Use Case / Status UC  →  Produto / Status Produto
  // Um filtro nunca afeta o que está acima dele na hierarquia.
  // ============================================================

  // --- Nível 1: filtra por Domínio Owner, Domínio Requisitante (cross-filter entre si) ---
  const applyLevel1 = (rows, exclude) => rows.filter(row => {
    if (exclude !== 'dominioOwner' && filterDominioOwner.length && !filterDominioOwner.includes(row.dominioOwner)) return false
    if (exclude !== 'dominioRequisitante' && filterDominioRequisitante.length && !filterDominioRequisitante.includes(row.dominioRequisitante)) return false
    return true
  })

  const dominioOwnerOptions = [...new Set(applyLevel1(baseRows, 'dominioOwner').map(r => r.dominioOwner).filter(Boolean))].sort()
  const dominioRequisitanteOptions = [...new Set(applyLevel1(baseRows, 'dominioRequisitante').map(r => r.dominioRequisitante).filter(Boolean))].sort()

  // Linhas após filtros de Nível 1 (usadas pelas secções 1, 2 e 3)
  const rowsAfterLevel1 = baseRows.filter(row => {
    if (filterDominioOwner.length && !filterDominioOwner.includes(row.dominioOwner)) return false
    if (filterDominioRequisitante.length && !filterDominioRequisitante.includes(row.dominioRequisitante)) return false
    return true
  })

  // --- Nível 2: filtra por Iniciativa, Use Case e Status do Use Case (cross-filter entre si, dentro do que sobrou do Nível 1) ---
  const applyLevel2 = (rows, exclude) => rows.filter(row => {
    if (exclude !== 'iniciativa' && filterIniciativa.length && !filterIniciativa.includes(row.idIniciativa)) return false
    if (exclude !== 'useCase' && filterUseCase.length && !filterUseCase.includes(row.idUseCase)) return false
    if (exclude !== 'ucStatus' && filterUcStatus.length && !filterUcStatus.includes(row.ucStatus)) return false
    return true
  })

  const iniciativaOptionsRaw = applyLevel2(rowsAfterLevel1, 'iniciativa')
  const iniciativaOptions = Array.from(new Map(iniciativaOptionsRaw.map(r => [r.idIniciativa, r.nomeIniciativa])).entries())
  const useCaseOptionsRaw = applyLevel2(rowsAfterLevel1, 'useCase')
  const useCaseOptions = Array.from(new Map(useCaseOptionsRaw.map(r => [r.idUseCase, r.nomeUseCase])).entries())
  const ucStatusOptions = [...new Set(applyLevel2(rowsAfterLevel1, 'ucStatus').map(r => r.ucStatus))]
    .sort((a, b) => UC_STATUS_ORDER.indexOf(a) - UC_STATUS_ORDER.indexOf(b))

  // Linhas após filtros de Nível 2 (usadas pelas secções 2 e 3)
  const rowsAfterLevel2 = rowsAfterLevel1.filter(row => {
    if (filterIniciativa.length && !filterIniciativa.includes(row.idIniciativa)) return false
    if (filterUseCase.length && !filterUseCase.includes(row.idUseCase)) return false
    if (filterUcStatus.length && !filterUcStatus.includes(row.ucStatus)) return false
    return true
  })

  // --- Nível 3: filtra por Produto de Dados e Status do Produto (cross-filter entre si) ---
  const productsAfterLevel2 = rowsAfterLevel2.flatMap(row => row.products)

  const applyLevel3 = (products, exclude) => products.filter(p => {
    if (exclude !== 'produto' && filterProduto.length && !filterProduto.includes(p.nome_produto_dados)) return false
    if (exclude !== 'dpStatus' && filterDpStatus.length && !filterDpStatus.includes(p.status)) return false
    return true
  })

  const produtoOptions = [...new Set(applyLevel3(productsAfterLevel2, 'produto').map(p => p.nome_produto_dados).filter(Boolean))].sort()
  const dpStatusOptions = [...new Set(applyLevel3(productsAfterLevel2, 'dpStatus').map(p => p.status).filter(Boolean))]
    .sort((a, b) => STATUS_ORDER.indexOf(a) - STATUS_ORDER.indexOf(b))

  // Produtos finais (após todos os filtros) — usados na Visão Produto de Dados
  const filteredProducts = productsAfterLevel2.filter(p => {
    if (filterProduto.length && !filterProduto.includes(p.nome_produto_dados)) return false
    if (filterDpStatus.length && !filterDpStatus.includes(p.status)) return false
    return true
  })

  const clearAllFilters = () => {
    setFilterDominioOwner([]); setFilterDominioRequisitante([]); setFilterIniciativa([])
    setFilterUseCase([]); setFilterUcStatus([])
    setFilterProduto([]); setFilterDpStatus([])
  }

  // ============================================================
  // VISÃO INICIATIVAS — usa rowsAfterLevel1 (só filtros de nível 1 fazem sentido aqui)
  // ============================================================

  const iniciativasMap = {}
  rowsAfterLevel1.forEach(row => {
    const key = row.idIniciativa
    if (!iniciativasMap[key]) {
      iniciativasMap[key] = { id: key, nome: row.nomeIniciativa, dominio: row.dominioOwner, useCases: [] }
    }
    iniciativasMap[key].useCases.push({ id: row.idUseCase, nome: row.nomeUseCase, ucStatus: row.ucStatus })
  })
  const iniciativasList = Object.values(iniciativasMap)

  const totalIniciativas = iniciativasList.length
  const iniciativasEntregues = iniciativasList.filter(i => i.useCases.length > 0 && i.useCases.every(uc => uc.ucStatus === 'Entregue')).length
  const pctIniciativasEntregues = totalIniciativas > 0 ? Math.round((iniciativasEntregues / totalIniciativas) * 100) : 0

  const iniciativasPorDominio = iniciativasList.reduce((acc, i) => {
    const d = i.dominio || 'Sem domínio'
    acc[d] = (acc[d] || 0) + 1
    return acc
  }, {})
  const entreguesPorDominio = iniciativasList.reduce((acc, i) => {
    const d = i.dominio || 'Sem domínio'
    const isEntregue = i.useCases.length > 0 && i.useCases.every(uc => uc.ucStatus === 'Entregue')
    if (isEntregue) acc[d] = (acc[d] || 0) + 1
    return acc
  }, {})
  const dominioEntries = Object.entries(iniciativasPorDominio).sort((a, b) => b[1] - a[1])
  const maxDominioCount = dominioEntries.length > 0 ? Math.max(...dominioEntries.map(([, c]) => c)) : 1

  const allUseCasesFlat = iniciativasList.flatMap(i => i.useCases.map(uc => ({ ...uc, dominio: i.dominio })))
  const ucPorDominio = allUseCasesFlat.reduce((acc, uc) => {
    const d = uc.dominio || 'Sem domínio'
    acc[d] = (acc[d] || 0) + 1
    return acc
  }, {})
  const ucEntreguesPorDominio = allUseCasesFlat.reduce((acc, uc) => {
    const d = uc.dominio || 'Sem domínio'
    if (uc.ucStatus === 'Entregue') acc[d] = (acc[d] || 0) + 1
    return acc
  }, {})
  const ucDominioEntries = Object.entries(ucPorDominio).sort((a, b) => b[1] - a[1])
  const maxUcDominioCount = ucDominioEntries.length > 0 ? Math.max(...ucDominioEntries.map(([, c]) => c)) : 1

  // ============================================================
  // VISÃO USE CASE — usa rowsAfterLevel1 mas calcula uc_status com os mesmos dados (nível 1 só)
  // ============================================================

  const allUseCases = rowsAfterLevel1.map(row => ({ id: row.idUseCase, nome: row.nomeUseCase, ucStatus: row.ucStatus, products: row.products }))
  const totalUseCases = allUseCases.length
  const ucStatusCounts = allUseCases.reduce((acc, uc) => {
    acc[uc.ucStatus] = (acc[uc.ucStatus] || 0) + 1
    return acc
  }, {})

  // Lead time por Status de Use Case (nível 1 — antes dos filtros de UC, para contexto completo)
  const leadTimeByUcStatus = {}
  allUseCases.forEach(uc => {
    const productNames = uc.products.map(p => p.nome_produto_dados)
    const recs = registos.filter(r => productNames.includes(r.data_product))
    if (recs.length === 0) return
    const starts = recs.map(r => new Date(r.data_inicio))
    const isEntregue = uc.ucStatus === 'Entregue'
    const allConcluded = isEntregue && recs.every(r => r.data_conclusao)
    const ends = allConcluded ? recs.map(r => new Date(r.data_conclusao)) : recs.map(r => r.data_conclusao ? new Date(r.data_conclusao) : new Date())
    const minStart = new Date(Math.min(...starts))
    const maxEnd = new Date(Math.max(...ends))
    const days = Math.max(0, Math.round((maxEnd - minStart) / (1000 * 60 * 60 * 24)))
    leadTimeByUcStatus[uc.ucStatus] = (leadTimeByUcStatus[uc.ucStatus] || 0) + days
  })
  const leadTimeUcStatusEntries = UC_STATUS_ORDER.filter(s => leadTimeByUcStatus[s] !== undefined).map(s => [s, leadTimeByUcStatus[s]])
  const maxLeadTimeUcStatus = leadTimeUcStatusEntries.length > 0 ? Math.max(...leadTimeUcStatusEntries.map(([, d]) => d)) : 1

  // Use cases agrupados de novo por iniciativa, mas respeitando filtros de Use Case/Status UC (nível 2)
  const iniciativasMap2 = {}
  rowsAfterLevel2.forEach(row => {
    const key = row.idIniciativa
    if (!iniciativasMap2[key]) iniciativasMap2[key] = { id: key, nome: row.nomeIniciativa, useCases: [] }
    iniciativasMap2[key].useCases.push({ id: row.idUseCase, nome: row.nomeUseCase, ucStatus: row.ucStatus })
  })
  const iniciativasListFiltered = Object.values(iniciativasMap2)

  // ============================================================
  // VISÃO PRODUTO DE DADOS — usa filteredProducts (todos os níveis aplicados)
  // ============================================================

  const leadTimes = filteredProducts.map(dp => {
    const recs = registos.filter(r => r.data_product === dp.nome_produto_dados)
    if (recs.length === 0) return { ...dp, leadTimeDays: null, emCurso: false }
    const sorted = recs.sort((a, b) => new Date(a.data_inicio) - new Date(b.data_inicio))
    const firstStart = new Date(sorted[0].data_inicio)
    const isConcluido = dp.status === 'Entregue'
    const lastRecord = sorted[sorted.length - 1]
    const endDate = isConcluido && lastRecord.data_conclusao ? new Date(lastRecord.data_conclusao) : new Date()
    const diffDays = Math.round((endDate - firstStart) / (1000 * 60 * 60 * 24))
    return { ...dp, leadTimeDays: diffDays, emCurso: !isConcluido }
  }).filter(d => d.leadTimeDays !== null)

  const concluidosLT = leadTimes.filter(d => !d.emCurso)
  const emCursoLT = leadTimes.filter(d => d.emCurso)
  const avgLeadTimeConcluidos = concluidosLT.length > 0 ? Math.round(concluidosLT.reduce((s, d) => s + d.leadTimeDays, 0) / concluidosLT.length) : null
  const avgLeadTimeEmCurso = emCursoLT.length > 0 ? Math.round(emCursoLT.reduce((s, d) => s + d.leadTimeDays, 0) / emCursoLT.length) : null

  const dpStatusCounts = filteredProducts.reduce((acc, r) => {
    const s = r.status || 'Sem status'
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})
  const dpStatusEntries = STATUS_ORDER.filter(s => dpStatusCounts[s]).map(s => [s, dpStatusCounts[s]])

  const totalDP = filteredProducts.length
  const dpEntregues = dpStatusCounts['Entregue'] || 0
  const dpBloqueados = (dpStatusCounts['Bloqueado (DSG)'] || 0) + (dpStatusCounts['Bloqueado (DIT)'] || 0) + (dpStatusCounts['Bloqueado (BS)'] || 0)
  const pctDPEntregues = totalDP > 0 ? Math.round((dpEntregues / totalDP) * 100) : 0
  const dpEmCursoCount = totalDP - dpEntregues

  const filteredProductNames = new Set(filteredProducts.map(p => p.nome_produto_dados))
  const leadTimeByStatus = registos.filter(r => filteredProductNames.has(r.data_product)).reduce((acc, r) => {
    const start = new Date(r.data_inicio)
    const end = r.data_conclusao ? new Date(r.data_conclusao) : new Date()
    const days = Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)))
    const s = r.status || 'Sem status'
    acc[s] = (acc[s] || 0) + days
    return acc
  }, {})
  const leadTimeStatusEntries = STATUS_ORDER.filter(s => leadTimeByStatus[s] !== undefined).map(s => [s, leadTimeByStatus[s]])
  const maxLeadTimeStatus = leadTimeStatusEntries.length > 0 ? Math.max(...leadTimeStatusEntries.map(([, d]) => d)) : 1

  const hasAnyFilter = !!(filterDominioOwner.length || filterDominioRequisitante.length || filterIniciativa.length ||
    filterUseCase.length || filterUcStatus.length || filterProduto.length || filterDpStatus.length)

  const clearBtnStyle = { padding: '7px 14px', borderRadius: '8px', border: '1.5px solid #E0E5EC', background: '#FFFFFF', color: '#738290', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }

  return (
    <div style={{ padding: '32px 36px', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', gap: '40px' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#2C3A42', margin: 0 }}>
            Provisionamento - Dashboard
          </h1>
          <p style={{ fontSize: '13px', color: '#738290', margin: '4px 0 0' }}>
            Visão consolidada de iniciativas, use cases e produtos de dados
          </p>
        </div>
        {hasAnyFilter && (
          <button onClick={clearAllFilters} style={clearBtnStyle}>Limpar todos os filtros</button>
        )}
      </div>

      {/* ============== VISÃO INICIATIVAS ============== */}
      <section>
        <SectionTitle>Visão Iniciativas</SectionTitle>

        <FilterBar>
          <multiselect options={dominioOwnerOptions} value={filterDominioOwner} onChange={setFilterDominioOwner} placeholder="Domínio Owner" />
          <multiselect options={dominioRequisitanteOptions} value={filterDominioRequisitante} onChange={setFilterDominioRequisitante} placeholder="Domínio Requisitante" />
        </FilterBar>

        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>

          {/* Coluna Iniciativas por Domínio */}
          <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <MetricCard label="Total Iniciativas" value={totalIniciativas} />
              <MetricCard label="Iniciativas Entregues" value={`${pctIniciativasEntregues}%`} sublabel={`${iniciativasEntregues} de ${totalIniciativas}`} accent="#2A6040" />
            </div>

            <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '20px 22px' }}>
              <CardTitle>Iniciativas por Domínio</CardTitle>
              {dominioEntries.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#A8B2BC' }}>Sem dados</p>
              ) : dominioEntries.map(([dominio, count]) => {
                const entregues = entreguesPorDominio[dominio] || 0
                const pctEntregue = count > 0 ? Math.round((entregues / count) * 100) : 0
                const qtdPct = maxDominioCount > 0 ? Math.round((count / maxDominioCount) * 100) : 0
                return (
                  <div key={dominio} style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#2C3A42', fontWeight: '500' }}>
                        {dominio} <span style={{ color: '#A8B2BC', fontWeight: '400' }}>— {count} iniciativa{count !== 1 ? 's' : ''}</span>
                      </span>
                      <span style={{ fontSize: '11px', color: '#A8B2BC' }}>{pctEntregue}% entregue</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '8px' }}>
                      <div style={{ flex: 3, height: '100%' }}>
                        <div style={{ width: `${qtdPct}%`, height: '100%', background: '#A1B5D8', borderRadius: '6px', transition: 'width 0.3s' }} />
                      </div>
                      <div style={{ flex: 1, background: '#F0F2F5', borderRadius: '6px', height: '100%', overflow: 'hidden' }}>
                        <div style={{ width: `${pctEntregue}%`, height: '100%', background: '#C2D8B9', borderRadius: '6px', transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Coluna Use Cases por Domínio */}
          <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <MetricCard label="Total Use Cases" value={totalUseCases} />
              <MetricCard label="Use Cases Entregues" value={`${totalUseCases > 0 ? Math.round(((ucStatusCounts['Entregue'] || 0) / totalUseCases) * 100) : 0}%`} sublabel={`${ucStatusCounts['Entregue'] || 0} de ${totalUseCases}`} accent="#2A6040" />
            </div>

            <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '20px 22px' }}>
              <CardTitle>Use Cases por Domínio</CardTitle>
              {ucDominioEntries.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#A8B2BC' }}>Sem dados</p>
              ) : ucDominioEntries.map(([dominio, count]) => {
                const entregues = ucEntreguesPorDominio[dominio] || 0
                const pctEntregue = count > 0 ? Math.round((entregues / count) * 100) : 0
                const qtdPct = maxUcDominioCount > 0 ? Math.round((count / maxUcDominioCount) * 100) : 0
                return (
                  <div key={dominio} style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#2C3A42', fontWeight: '500' }}>
                        {dominio} <span style={{ color: '#A8B2BC', fontWeight: '400' }}>— {count} use case{count !== 1 ? 's' : ''}</span>
                      </span>
                      <span style={{ fontSize: '11px', color: '#A8B2BC' }}>{pctEntregue}% entregue</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '8px' }}>
                      <div style={{ flex: 3, height: '100%' }}>
                        <div style={{ width: `${qtdPct}%`, height: '100%', background: '#A1B5D8', borderRadius: '6px', transition: 'width 0.3s' }} />
                      </div>
                      <div style={{ flex: 1, background: '#F0F2F5', borderRadius: '6px', height: '100%', overflow: 'hidden' }}>
                        <div style={{ width: `${pctEntregue}%`, height: '100%', background: '#C2D8B9', borderRadius: '6px', transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ============== VISÃO USE CASE ============== */}
      <section>
        <SectionTitle>Visão Use Case</SectionTitle>

        <FilterBar>
          <multiselect
            options={iniciativaOptions.map(([id, nome]) => `${id} — ${nome}`)}
            value={filterIniciativa.map(id => { const f = iniciativaOptions.find(([i]) => i === id); return f ? `${f[0]} — ${f[1]}` : id })}
            onChange={v => setFilterIniciativa(v.map(s => s.split(' — ')[0]))}
            placeholder="Iniciativa"
          />
          <multiselect
            options={useCaseOptions.map(([id, nome]) => `${id} — ${nome}`)}
            value={filterUseCase.map(id => { const f = useCaseOptions.find(([i]) => i === id); return f ? `${f[0]} — ${f[1]}` : id })}
            onChange={v => setFilterUseCase(v.map(s => s.split(' — ')[0]))}
            placeholder="Use Case"
          />
          <multiselect options={ucStatusOptions} value={filterUcStatus} onChange={setFilterUcStatus} placeholder="Status do Use Case" />
        </FilterBar>

        {/* 6 cards em fluxo, mesmo tamanho, texto e cor alinhados à esquerda */}
        <div style={{ display: 'flex', alignItems: 'stretch', marginBottom: '20px', flexWrap: 'nowrap', overflowX: 'auto' }}>
          {UC_STATUS_ORDER.map((status, idx, arr) => {
            const count = ucStatusCounts[status] || 0
            const pct = totalUseCases > 0 ? Math.round((count / totalUseCases) * 100) : 0
            const isLast = idx === arr.length - 1
            return (
              <div key={status} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                <div style={{
                  background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  padding: '16px 16px', flex: 1, minWidth: 0, textAlign: 'left',
                  borderLeft: `4px solid ${UC_STATUS_COLORS[status]}`,
                }}>
                  <p style={{ fontSize: '10px', fontWeight: '600', color: '#738290', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 10px', minHeight: '26px', lineHeight: '1.3' }}>
                    {status}
                  </p>
                  <p style={{ fontSize: '22px', fontWeight: '700', color: '#2C3A42', margin: 0 }}>{count}</p>
                  <p style={{ fontSize: '11px', color: '#A8B2BC', margin: '2px 0 0' }}>{pct}%</p>
                </div>
                {!isLast && (
                  <div style={{ flexShrink: 0, padding: '0 6px', display: 'flex', alignItems: 'center', color: '#C8D0DA' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                    </svg>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>

          {/* Use Cases por Iniciativa */}
          <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '20px 22px', flex: 1, minWidth: '300px' }}>
            <CardTitle>Use Cases por Iniciativa</CardTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '420px', overflowY: 'auto', paddingRight: '6px', paddingTop: '2px' }}>
              {iniciativasListFiltered.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#A8B2BC' }}>Sem dados</p>
              ) : iniciativasListFiltered.map(i => {
                const entreguesCount = i.useCases.filter(uc => uc.ucStatus === 'Entregue').length
                return (
                  <div key={i.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#2C3A42', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={i.nome}>
                        {i.nome} <span style={{ color: '#A8B2BC', fontWeight: '400' }}>— {i.useCases.length} use case{i.useCases.length !== 1 ? 's' : ''}</span>
                      </span>
                      <span style={{ fontSize: '11px', color: '#A8B2BC', flexShrink: 0, marginLeft: '8px' }}>{entreguesCount}/{i.useCases.length} entregues</span>
                    </div>
                    <div style={{ display: 'flex', gap: '3px', height: '8px' }}>
                      {i.useCases.map(uc => (
                        <div key={uc.id} title={`${uc.nome} — ${uc.ucStatus}`}
                          style={{ flex: 1, height: '100%', borderRadius: '6px', background: UC_STATUS_COLORS[uc.ucStatus] || '#C8D0DA' }} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Lead Time por Status (Use Case) */}
          <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '20px 22px', flex: 1, minWidth: '300px' }}>
            <CardTitle>Lead Time por Status</CardTitle>
            {leadTimeUcStatusEntries.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#A8B2BC' }}>Sem dados</p>
            ) : leadTimeUcStatusEntries.map(([status, days]) => (
              <Bar key={status} label={status} count={days} total={maxLeadTimeUcStatus} color={UC_STATUS_COLORS[status] || '#94A3B0'} showPct={false} valueLabel={formatDays(days)} noTrack inlineLabel />
            ))}
          </div>
        </div>
      </section>

      {/* ============== VISÃO PRODUTO DE DADOS ============== */}
      <section>
        <SectionTitle>Visão Produto de Dados</SectionTitle>

        <FilterBar>
          <multiselect options={produtoOptions} value={filterProduto} onChange={setFilterProduto} placeholder="Produto de Dados" />
          <multiselect options={dpStatusOptions} value={filterDpStatus} onChange={setFilterDpStatus} placeholder="Status do Produto de Dados" />
        </FilterBar>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <MetricCard label="Total Produtos de Dados" value={totalDP} />
          <MetricCard label="Entregues" value={`${pctDPEntregues}%`} sublabel={`${dpEntregues} de ${totalDP} · Lead time médio: ${formatDays(avgLeadTimeConcluidos)}`} accent="#2A6040" />
          <MetricCard label="Em Curso" value={`${totalDP > 0 ? Math.round((dpEmCursoCount / totalDP) * 100) : 0}%`} sublabel={`${dpEmCursoCount} de ${totalDP} · Lead time médio: ${formatDays(avgLeadTimeEmCurso)}`} accent="#9A6E20" />
          <MetricCard label="Bloqueados" value={dpBloqueados} accent={dpBloqueados > 0 ? '#C0544C' : '#2C3A42'} />
        </div>

        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '20px 22px', flex: 1, minWidth: '300px' }}>
            <CardTitle>Distribuição por Status</CardTitle>
            {dpStatusEntries.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#A8B2BC' }}>Sem dados</p>
            ) : dpStatusEntries.map(([status, count]) => (
              <Bar key={status} label={status} count={count} total={totalDP} color={STATUS_COLORS[status] || '#94A3B0'} />
            ))}
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '20px 22px', flex: 1, minWidth: '300px' }}>
            <CardTitle>Lead Time por Status</CardTitle>
            {leadTimeStatusEntries.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#A8B2BC' }}>Sem dados</p>
            ) : leadTimeStatusEntries.map(([status, days]) => (
              <Bar key={status} label={status} count={days} total={maxLeadTimeStatus} color={STATUS_COLORS[status] || '#94A3B0'} showPct={false} valueLabel={formatDays(days)} noTrack inlineLabel />
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}