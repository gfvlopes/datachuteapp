import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import multiselect from '../components/multiselect'
import { useReferenceData } from '../context/referencedatacontext'

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

const inputStyle = {
  padding: '6px 9px', borderRadius: '7px', border: '1.5px solid #E0E5EC',
  fontSize: '12px', color: '#2C3A42', background: '#FFFFFF', outline: 'none',
  fontFamily: 'Inter, sans-serif', width: '100%', boxSizing: 'border-box',
}

const filterStyle = {
  padding: '7px 10px', borderRadius: '8px', border: '1.5px solid #E0E5EC',
  fontSize: '12px', color: '#2C3A42', background: '#FFFFFF', outline: 'none',
  fontFamily: 'Inter, sans-serif', boxSizing: 'border-box', minWidth: '200px',
}

const COLUMNS = [
  { key: 'id_alteracao',  label: 'ID Registo',    width: '90px'  },
  { key: 'data_product',  label: 'Produto de Dados', width: '220px' },
  { key: 'status',        label: 'Status',        width: '180px' },
  { key: 'quem',          label: 'Quem',          width: '140px' },
  { key: 'data_inicio',   label: 'Data Início',   width: '120px' },
  { key: 'data_conclusao',label: 'Data Conclusão',width: '130px' },
  { key: 'observacoes',   label: 'Observações',   width: '320px' },
]

const DATE_FIELDS = ['data_inicio', 'data_conclusao']
const READONLY = ['id_alteracao', 'data_product', 'status']

export default function RegistoAlteracoes({ filterDominio, setFilterDominio, filterIniciativa, setFilterIniciativa, filterUseCase, setFilterUseCase, filterProduto, setFilterProduto }) {
  const { produtosDados } = useReferenceData()
  const [data, setData] = useState([])
  const [dataProducts, setDataProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingCell, setEditingCell] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [iniciativas, setIniciativas] = useState([])
  const topScrollRef = useRef(null)
  const tableWrapRef = useRef(null)

  const syncScroll = (src, tgt) => { if (tgt.current) tgt.current.scrollLeft = src.current.scrollLeft }

  useEffect(() => {
    fetchData()
    supabase.from('d_iniciativas').select('id_iniciativa,nome_iniciativa,id_use_case,nome_use_case').order('id_iniciativa').then(({ data }) => { if (data) setIniciativas(data) })
    supabase.from('data_products').select('id,nome_produto_dados,id_iniciativa,id_usecase_ai,id_produto_dados').then(({ data }) => { if (data) setDataProducts(data) })
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: rows, error } = await supabase.from('registo_alteracoes').select('*').order('id_alteracao', { ascending: false })
    if (!error) setData(rows)
    setLoading(false)
  }

  const handleCellClick = (id, field, currentValue) => {
    if (READONLY.includes(field)) return
    setEditingCell({ id, field })
    setEditValue(currentValue || '')
  }

  const handleCellSave = async () => {
    if (!editingCell) return
    const { id, field } = editingCell
    const value = editValue.trim() === '' ? null : editValue.trim()
    const { error } = await supabase.from('registo_alteracoes').update({ [field]: value }).eq('id', id)
    if (!error) setData(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
    setEditingCell(null); setEditValue('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleCellSave()
    if (e.key === 'Escape') { setEditingCell(null); setEditValue('') }
  }

  const formatDate = (val) => val ? val.substring(0, 10) : '—'

  // Filter options
  const getOwner = (dp) => produtosDados.find(p => p.id_produto_dados === dp?.id_produto_dados)?.owner
  const dominioOptions = [...new Set(dataProducts.map(getOwner).filter(Boolean))].sort()
  const iniciativaOptions = Array.from(new Map(iniciativas.map(r => [r.id_iniciativa, r.nome_iniciativa])).entries())
  const useCaseOptions = filterIniciativa.length
    ? iniciativas.filter(r => filterIniciativa.includes(String(r.id_iniciativa))).map(r => ({ id: String(r.id_use_case), nome: r.nome_use_case }))
    : Array.from(new Map(iniciativas.map(r => [r.id_use_case, r.nome_use_case])).entries()).map(([id, nome]) => ({ id: String(id), nome }))
  const produtoOptions = [...new Set(dataProducts.map(r => r.nome_produto_dados).filter(Boolean))]

  const filtered = data.filter(r => {
    const dp = dataProducts.find(d => d.nome_produto_dados === r.data_product)
    if (filterDominio.length && !filterDominio.includes(getOwner(dp))) return false
    if (filterIniciativa.length && !filterIniciativa.includes(String(dp?.id_iniciativa))) return false
    if (filterUseCase.length && !filterUseCase.includes(String(dp?.id_usecase_ai))) return false
    if (filterProduto.length && !filterProduto.includes(r.data_product)) return false
    return true
  })

  const hasFilters = !!(filterDominio.length || filterIniciativa.length || filterUseCase.length || filterProduto.length)
  const clearFilters = () => { setFilterDominio([]); setFilterIniciativa([]); setFilterUseCase([]); setFilterProduto([]) }

  return (
    <div style={{ padding: '32px 36px', fontFamily: 'Inter, sans-serif' }}>

      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#2C3A42', margin: 0 }}>Provisionamento - Registo de Alterações</h1>
        <p style={{ fontSize: '13px', color: '#738290', margin: '4px 0 0' }}>Histórico de alterações de status. Clica numa célula para editar.</p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <multiselect options={dominioOptions} value={filterDominio} onChange={setFilterDominio} placeholder="Domínio" />
        <multiselect options={iniciativaOptions.map(([id, nome]) => `${id} — ${nome}`)} value={filterIniciativa.map(id => { const f = iniciativaOptions.find(([i]) => String(i) === id); return f ? `${f[0]} — ${f[1]}` : id })} onChange={v => setFilterIniciativa(v.map(s => s.split(' — ')[0]))} placeholder="Iniciativa" />
        <multiselect options={useCaseOptions.map(o => `${o.id} — ${o.nome}`)} value={filterUseCase.map(id => { const f = useCaseOptions.find(o => o.id === id); return f ? `${f.id} — ${f.nome}` : id })} onChange={v => setFilterUseCase(v.map(s => s.split(' — ')[0]))} placeholder="Use Case" />
        <multiselect options={produtoOptions} value={filterProduto} onChange={setFilterProduto} placeholder="Data Product" />
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
                    <tr><td colSpan={COLUMNS.length} style={{ padding: '48px 24px', textAlign: 'center', color: '#738290', fontSize: '13px' }}>Nenhuma alteração registada ainda.</td></tr>
                  )}
                  {filtered.map((row, idx) => (
                    <tr key={row.id}
                      style={{ background: idx % 2 === 0 ? '#FFFFFF' : '#FAFBFC', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F3F6FB'}
                      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#FFFFFF' : '#FAFBFC'}
                    >
                      {COLUMNS.map(col => {
                        const isEditing = editingCell?.id === row.id && editingCell?.field === col.key
                        const isEditable = !READONLY.includes(col.key)
                        const isDate = DATE_FIELDS.includes(col.key)
                        const val = row[col.key]
                        return (
                          <td key={col.key}
                            onClick={() => handleCellClick(row.id, col.key, val)}
                            style={{ padding: isEditing ? '6px 8px' : '10px 14px', maxWidth: col.width, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: isEditing ? 'normal' : 'nowrap', cursor: isEditable ? 'text' : 'default', color: col.key === 'data_product' ? '#2C3A42' : '#4A5568', fontWeight: col.key === 'data_product' ? '500' : '400' }}
                            title={isEditable && !isEditing ? 'Clica para editar' : undefined}
                          >
                            {isEditing ? (
                              <input autoFocus type={isDate ? 'date' : 'text'} value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={handleCellSave} onKeyDown={handleKeyDown} style={inputStyle} />
                            ) : col.key === 'status' ? (
                              <StatusBadge status={val} />
                            ) : isDate ? (
                              formatDate(val)
                            ) : (
                              val || (isEditable ? <span style={{ color: '#C0C8D0', fontSize: '11px' }}>—</span> : '—')
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}