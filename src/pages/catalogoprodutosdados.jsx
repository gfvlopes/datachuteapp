import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useReferenceData } from '../context/referencedatacontext'
import multiselect from '../components/multiselect'
import provisionamentomodal from '../components/provisionamentomodal'

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

const sortByStatusOrder = (values) =>
  [...values].sort((a, b) => {
    const ia = STATUS_ORDER.indexOf(a)
    const ib = STATUS_ORDER.indexOf(b)
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
  })

const COLUMNS = [
  { key: 'id_produto_dados',   label: 'ID Produto de Dados',  width: '150px' },
  { key: 'nome_produto_dados', label: 'Nome Produto de Dados',width: '260px' },
  { key: 'status',             label: 'Status',               width: '160px' },
  { key: 'tipologia',          label: 'Tipologia',            width: '160px' },
  { key: 'owner',              label: 'Domínio Owner',        width: '220px' },
  { key: 'qtd_use_cases',      label: 'Qtd Use Cases',        width: '130px' },
  { key: 'localizacao_fabric', label: 'Localização Fabric',   width: '200px' },
  { key: 'descricao',          label: 'Descrição',            width: '260px' },
  { key: 'historico',          label: 'Histórico',            width: '110px' },
  { key: 'frequencia',         label: 'Frequência',           width: '110px' },
  { key: 'volumes',            label: 'Volumes',              width: '120px' },
]

const STATUS_COLORS = {
  'A aguardar submissão pela BS':     { bg: 'rgba(115,130,144,0.12)', color: '#738290' },
  'Por iniciar (DSG)':                { bg: 'rgba(168,181,192,0.18)', color: '#65737E' },
  'Levantamento de requisitos (DSG)': { bg: 'rgba(161,181,216,0.18)', color: '#5A7BA8' },
  'Ingestão (DIT)':                   { bg: 'rgba(194,216,185,0.2)',  color: '#4A7A5A' },
  'Desenvolvimento (DSG)':            { bg: 'rgba(201,151,74,0.15)',  color: '#9A6E20' },
  'Validação dos Dados (BO)':         { bg: 'rgba(92,143,106,0.15)',  color: '#3A7050' },
  'Bloqueado (DSG)':                  { bg: 'rgba(192,84,76,0.12)',   color: '#C0544C' },
  'Bloqueado (DIT)':                  { bg: 'rgba(176,71,63,0.12)',   color: '#B0473F' },
  'Bloqueado (BS)':                   { bg: 'rgba(154,59,51,0.12)',   color: '#9A3B33' },
  'Entrega parcial':                  { bg: 'rgba(161,181,216,0.25)', color: '#3A5A8A' },
  'Entregue':                         { bg: 'rgba(92,143,106,0.2)',   color: '#2A6040' },
}

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || { bg: 'rgba(115,130,144,0.12)', color: '#738290' }
  return <span style={{ background: s.bg, color: s.color, borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' }}>{status || '—'}</span>
}

export default function CatalogoProdutosDados() {
  const { produtosDados, refetchProdutosDados, loading } = useReferenceData()
  const [statusMap, setStatusMap] = useState({})
  const [useCaseCounts, setUseCaseCounts] = useState({})
  const [modalOpen, setModalOpen] = useState(false)
  const [filterDominio, setFilterDominio] = useState([])
  const [filterTipologia, setFilterTipologia] = useState([])
  const [filterProduto, setFilterProduto] = useState([])
  const [filterStatus, setFilterStatus] = useState([])
  const topScrollRef = useRef(null)
  const tableWrapRef = useRef(null)

  useEffect(() => {
    supabase.from('data_products').select('id_produto_dados,status,created_at').order('created_at', { ascending: false }).then(({ data }) => {
      if (data) {
        // Most recent status per id_produto_dados (a product has exactly one status)
        const statusByProduct = {}
        data.forEach(r => {
          if (r.id_produto_dados && !statusByProduct[r.id_produto_dados]) {
            statusByProduct[r.id_produto_dados] = r.status
          }
        })
        setStatusMap(statusByProduct)

        // Quantidade de use cases associados (nº de linhas em data_products por id_produto_dados)
        const counts = {}
        data.forEach(r => {
          if (r.id_produto_dados) {
            counts[r.id_produto_dados] = (counts[r.id_produto_dados] || 0) + 1
          }
        })
        setUseCaseCounts(counts)
      }
    })
  }, [])

  const enriched = produtosDados.map(r => ({
    ...r,
    status: statusMap[r.id_produto_dados] || null,
    qtd_use_cases: useCaseCounts[r.id_produto_dados] || 0,
  }))

  const syncScroll = (src, tgt) => { if (tgt.current) tgt.current.scrollLeft = src.current.scrollLeft }

  const dominioOptions = [...new Set(enriched.map(r => r.owner).filter(Boolean))].sort()
  const tipologiaOptions = [...new Set(enriched.map(r => r.tipologia).filter(Boolean))].sort()
  const produtoOptions = [...new Set(enriched.map(r => r.nome_produto_dados).filter(Boolean))].sort()
  const statusOptions = sortByStatusOrder([...new Set(enriched.map(r => r.status).filter(Boolean))])

  const filtered = enriched.filter(r => {
    if (filterDominio.length && !filterDominio.includes(r.owner)) return false
    if (filterTipologia.length && !filterTipologia.includes(r.tipologia)) return false
    if (filterProduto.length && !filterProduto.includes(r.nome_produto_dados)) return false
    if (filterStatus.length && !filterStatus.includes(r.status)) return false
    return true
  })

  const hasFilters = !!(filterDominio.length || filterTipologia.length || filterProduto.length || filterStatus.length)
  const clearFilters = () => { setFilterDominio([]); setFilterTipologia([]); setFilterProduto([]); setFilterStatus([]) }

  const handleAdd = () => { setModalOpen(true) }

  const handleSave = async (form) => {
    const dimFields = {
      tipologia: form.tipologia, localizacao_fabric: form.localizacao_fabric,
      descricao: form.descricao, owner: form.owner, filtros: form.filtros,
      historico: form.historico, update_info: form.update_info,
      frequencia: form.frequencia, volumes: form.volumes,
    }

    const assocFields = {
      id_iniciativa: form.id_iniciativa, nome_iniciativa: form.nome_iniciativa,
      id_usecase_ai: form.id_usecase_ai, nome_use_case: form.nome_use_case,
      id_produto_dados: form.id_produto_dados, nome_produto_dados: form.nome_produto_dados,
      status: form.status, casos_uso_suportados: form.casos_uso_suportados,
      dominio_requisitante: form.dominio_requisitante,
    }

    const existingDim = produtosDados.find(p => p.id_produto_dados === form.id_produto_dados)
    if (existingDim) {
      await supabase.from('d_produtos_dados').update(dimFields).eq('id', existingDim.id)
    } else if (form.id_produto_dados) {
      await supabase.from('d_produtos_dados').insert([{ id_produto_dados: form.id_produto_dados, nome_produto_dados: form.nome_produto_dados, ...dimFields }])
    }
    await refetchProdutosDados()

    await supabase.from('data_products').insert([assocFields])

    setModalOpen(false)
  }

  return (
    <div style={{ padding: '32px 36px', fontFamily: 'Inter, sans-serif' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#2C3A42', margin: 0 }}>
            Catálogo — Produtos de Dados
          </h1>
          <p style={{ fontSize: '13px', color: '#738290', margin: '4px 0 0' }}>
            Catálogo de produtos de dados disponíveis para consumo ou reaproveitamento.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <multiselect options={dominioOptions} value={filterDominio} onChange={setFilterDominio} placeholder="Domínio Owner" />
        <multiselect options={tipologiaOptions} value={filterTipologia} onChange={setFilterTipologia} placeholder="Tipologia" />
        <multiselect options={produtoOptions} value={filterProduto} onChange={setFilterProduto} placeholder="Produto de Dados" />
        <multiselect options={statusOptions} value={filterStatus} onChange={setFilterStatus} placeholder="Status" />
        {hasFilters && (
          <button onClick={clearFilters} style={{ padding: '7px 14px', borderRadius: '8px', border: '1.5px solid #E0E5EC', background: '#FFFFFF', color: '#738290', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
            Limpar filtros
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '48px', textAlign: 'center', color: '#738290', fontSize: '13px' }}>
          A carregar dados...
        </div>
      ) : (
        <>
          <div ref={topScrollRef} onScroll={() => syncScroll(topScrollRef, tableWrapRef)} style={{ overflowX: 'auto', marginBottom: '4px' }}>
            <div style={{ height: '1px', minWidth: '1600px' }} />
          </div>
          <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <div ref={tableWrapRef} onScroll={() => syncScroll(tableWrapRef, topScrollRef)} style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: '#2C3A42', fontFamily: 'Inter, sans-serif' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #ECEEF2' }}>
                    {COLUMNS.map(col => (
                      <th key={col.key} style={{ padding: '11px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#738290', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap', minWidth: col.width, background: '#FFFFFF' }}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={COLUMNS.length} style={{ padding: '48px 24px', textAlign: 'center', color: '#738290', fontSize: '13px' }}>Nenhum produto de dados no catálogo.</td></tr>
                  )}
                  {filtered.map((row, idx) => (
                    <tr key={row.id}
                      style={{ background: idx % 2 === 0 ? '#FFFFFF' : '#FAFBFC', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F3F6FB'}
                      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#FFFFFF' : '#FAFBFC'}
                    >
                      {COLUMNS.map(col => (
                        <td key={col.key} style={{ padding: '10px 14px', maxWidth: col.width, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: ['id_produto_dados', 'nome_produto_dados'].includes(col.key) ? '#2C3A42' : '#4A5568', fontWeight: col.key === 'nome_produto_dados' ? '500' : '400' }}>
                          {col.key === 'status'
                            ? <StatusBadge status={row.status} />
                            : col.key === 'qtd_use_cases'
                            ? row.qtd_use_cases
                            : (row[col.key] || <span style={{ color: '#C8D0DA' }}>—</span>)
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <provisionamentomodal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} initialData={null} />
    </div>
  )
}