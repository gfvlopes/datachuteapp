import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useReferenceData } from '../context/referencedatacontext'
import MultiSelect from '../components/multiselect'

const COLUMNS = [
  { key: 'id_produto_dados',   label: 'ID',                   width: '140px' },
  { key: 'nome_produto_dados', label: 'Nome Produto de Dados',width: '260px' },
  { key: 'status',             label: 'Status',               width: '180px' },
  { key: 'tipologia',          label: 'Tipologia',            width: '160px' },
  { key: 'dominio_nome',       label: 'Domínio Owner',        width: '240px' },
  { key: 'qtd_use_cases',      label: 'Qtd Use Cases',        width: '120px' },
  { key: 'localizacao_fabric', label: 'Localização Fabric',   width: '200px' },
  { key: 'descricao',          label: 'Descrição',            width: '260px' },
  { key: 'frequencia',         label: 'Frequência',           width: '120px' },
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
  const { dominios, useCases } = useReferenceData()
  const [data, setData]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [filterDominio,   setFilterDominio]   = useState([])
  const [filterUseCase,   setFilterUseCase]   = useState([])
  const [filterProduto,   setFilterProduto]   = useState([])
  const [filterTipologia, setFilterTipologia] = useState([])
  const [filterStatus,    setFilterStatus]    = useState([])
  const topScrollRef = useRef(null)
  const tableWrapRef = useRef(null)

  useEffect(() => {
    supabase
      .from('d_produtos_dados')
      .select(`
        id, id_produto_dados, nome_produto_dados, tipologia,
        localizacao_fabric, descricao, frequencia, volumes, status,
        dominio_id,
        d_dominios ( id, nome ),
        produto_use_case ( use_case_id )
      `)
      .order('nome_produto_dados')
      .then(({ data: rows, error }) => {
        if (!error && rows) {
          setData(rows.map(r => ({
            ...r,
            dominio_nome:  r.d_dominios?.nome || '—',
            qtd_use_cases: r.produto_use_case?.length || 0,
            use_case_ids:  (r.produto_use_case || []).map(p => p.use_case_id),
          })))
        }
        setLoading(false)
      })
  }, [])

  const syncScroll = (src, tgt) => { if (tgt.current) tgt.current.scrollLeft = src.current.scrollLeft }

  // Opções de filtro
  const dominioOptions   = [...new Set(data.map(r => r.dominio_nome).filter(d => d && d !== '—'))].sort()
  const produtoOptions   = [...new Set(data.map(r => r.nome_produto_dados).filter(Boolean))].sort()
  const tipologiaOptions = [...new Set(data.map(r => r.tipologia).filter(Boolean))].sort()
  const statusOptions    = [...new Set(data.map(r => r.status).filter(Boolean))]

  // Use Cases filtrados pelo domínio seleccionado
  const ucOptions = (filterDominio.length
    ? useCases.filter(uc => {
        const prod = data.find(p => p.use_case_ids.includes(uc.id))
        return prod && filterDominio.includes(prod.dominio_nome)
      })
    : useCases
  ).map(uc => `${uc.id_use_case} — ${uc.nome_use_case}`)

  const filtered = data.filter(r => {
    if (filterDominio.length   && !filterDominio.includes(r.dominio_nome))      return false
    if (filterUseCase.length) {
      const ucIds = filterUseCase.map(s => {
        const uc = useCases.find(u => `${u.id_use_case} — ${u.nome_use_case}` === s)
        return uc?.id
      }).filter(Boolean)
      if (!ucIds.some(id => r.use_case_ids.includes(id))) return false
    }
    if (filterProduto.length   && !filterProduto.includes(r.nome_produto_dados)) return false
    if (filterTipologia.length && !filterTipologia.includes(r.tipologia))        return false
    if (filterStatus.length    && !filterStatus.includes(r.status))              return false
    return true
  })

  const hasFilters = !!(filterDominio.length || filterUseCase.length || filterProduto.length || filterTipologia.length || filterStatus.length)
  const clearFilters = () => { setFilterDominio([]); setFilterUseCase([]); setFilterProduto([]); setFilterTipologia([]); setFilterStatus([]) }

  const [visibleCount, setVisibleCount] = useState(50)
  useEffect(() => { setVisibleCount(50) }, [filterDominio, filterUseCase, filterProduto, filterTipologia, filterStatus])
  const visible = filtered.slice(0, visibleCount)

  return (
    <div style={{ padding: '32px 36px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#2C3A42', margin: 0 }}>Catálogo — Produtos de Dados</h1>
        <p style={{ fontSize: '13px', color: '#738290', margin: '4px 0 0' }}>Catálogo de produtos de dados disponíveis para consumo ou reaproveitamento.</p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <MultiSelect options={dominioOptions} value={filterDominio} onChange={v => { setFilterDominio(v); setFilterUseCase([]) }} placeholder="Domínio" />
        <MultiSelect options={ucOptions} value={filterUseCase} onChange={setFilterUseCase} placeholder="Use Case" />
        <MultiSelect options={produtoOptions} value={filterProduto} onChange={setFilterProduto} placeholder="Produto de Dados" />
        <MultiSelect options={tipologiaOptions} value={filterTipologia} onChange={setFilterTipologia} placeholder="Tipologia" />
        <MultiSelect options={statusOptions} value={filterStatus} onChange={setFilterStatus} placeholder="Status" />
        {hasFilters && (
          <button onClick={clearFilters} style={{ padding: '7px 14px', borderRadius: '8px', border: '1.5px solid #E0E5EC', background: '#FFFFFF', color: '#738290', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
            Limpar filtros
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '48px', textAlign: 'center', color: '#738290', fontSize: '13px' }}>A carregar dados...</div>
      ) : (
        <>
          <div ref={topScrollRef} onScroll={() => syncScroll(topScrollRef, tableWrapRef)} style={{ overflowX: 'auto', marginBottom: '4px' }}>
            <div style={{ height: '1px', minWidth: '1900px' }} />
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
                    <tr><td colSpan={COLUMNS.length} style={{ padding: '48px 24px', textAlign: 'center', color: '#738290', fontSize: '13px' }}>Nenhum produto de dados encontrado.</td></tr>
                  )}
                  {visible.map((row, idx) => (
                    <tr key={row.id}
                      style={{ background: idx % 2 === 0 ? '#FFFFFF' : '#FAFBFC', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F3F6FB'}
                      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#FFFFFF' : '#FAFBFC'}>
                      {COLUMNS.map(col => (
                        <td key={col.key} style={{ padding: '10px 14px', maxWidth: col.width, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: ['id_produto_dados','nome_produto_dados'].includes(col.key) ? '#2C3A42' : '#4A5568', fontWeight: col.key === 'nome_produto_dados' ? '500' : '400' }}>
                          {col.key === 'status' ? (
                            <StatusBadge status={row.status} />
                          ) : col.key === 'qtd_use_cases' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', background: '#EBF1FA', color: '#5A7BA8', borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: '600' }}>
                              {row.qtd_use_cases}
                            </span>
                          ) : (
                            row[col.key] || <span style={{ color: '#C8D0DA' }}>—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {filtered.length > visibleCount && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '14px' }}>
              <button onClick={() => setVisibleCount(c => c + 50)}
                style={{ padding: '9px 20px', borderRadius: '8px', border: '1.5px solid #E0E5EC', background: '#FFFFFF', color: '#5A7BA8', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F5F8FC'}
                onMouseLeave={e => e.currentTarget.style.background = '#FFFFFF'}>
                Mostrar mais ({filtered.length - visibleCount} restantes)
              </button>
            </div>
          )}
          <p style={{ fontSize: '11px', color: '#B0BCC8', marginTop: '8px', textAlign: 'center' }}>
            A mostrar {visible.length} de {filtered.length}
          </p>
        </>
      )}
    </div>
  )
}