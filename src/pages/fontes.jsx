import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useReferenceData } from '../context/ReferenceDataContext'
import MultiSelect from '../components/MultiSelect'

const TIPO_COLORS = {
  'CRM':              { bg: 'rgba(161,181,216,0.18)', color: '#5A7BA8' },
  'BI':               { bg: 'rgba(194,216,185,0.2)',  color: '#4A7A5A' },
  'ERP':              { bg: 'rgba(201,151,74,0.15)',  color: '#9A6E20' },
  'Plataforma':       { bg: 'rgba(115,130,144,0.15)', color: '#4A5A68' },
  'Ficheiro Excel':   { bg: 'rgba(92,143,106,0.15)',  color: '#3A7050' },
  'Lista SharePoint': { bg: 'rgba(161,181,216,0.25)', color: '#3A5A8A' },
}

function TipoBadge({ tipo }) {
  const s = TIPO_COLORS[tipo] || { bg: 'rgba(115,130,144,0.12)', color: '#738290' }
  return <span style={{ background: s.bg, color: s.color, borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' }}>{tipo || '—'}</span>
}

const COLUMNS = [
  { key: 'nome_fonte',             label: 'Nome Fonte',  width: '180px' },
  { key: 'tipo_fonte',             label: 'Tipo',        width: '140px' },
  { key: 'formato_dados',          label: 'Formato',     width: '140px' },
  { key: 'descricao',              label: 'Descrição',   width: '260px' },
  { key: 'dominio',                label: 'Domínio',     width: '200px' },
  { key: 'responsavel',            label: 'Responsável', width: '140px' },
  { key: 'frequencia_atualizacao', label: 'Frequência',  width: '110px' },
  { key: 'localizacao',            label: 'Localização', width: '220px' },
  { key: 'observacoes',            label: 'Observações', width: '200px' },
]

const SELECT_COLS = new Set(['tipo_fonte', 'dominio', 'formato_dados', 'frequencia_atualizacao'])

const inputStyle = {
  padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #E0E5EC',
  fontSize: '13px', color: '#2C3A42', background: '#FFFFFF', outline: 'none',
  fontFamily: 'Inter, sans-serif', width: '100%', boxSizing: 'border-box',
}

const cellInputStyle = {
  padding: '5px 8px', borderRadius: '6px', border: '1.5px solid #A1B5D8',
  fontSize: '12px', color: '#2C3A42', background: '#FFFFFF', outline: 'none',
  fontFamily: 'Inter, sans-serif', width: '100%', boxSizing: 'border-box',
}

const emptyForm = { nome_fonte: '', tipo_fonte: '', formato_dados: '', descricao: '', dominio: '', responsavel: '', frequencia_atualizacao: '', localizacao: '', observacoes: '' }

function FonteModal({ isOpen, onClose, onSave, selectOptions }) {
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  useEffect(() => { if (isOpen) { setForm(emptyForm); setError('') } }, [isOpen])
  if (!isOpen) return null

  const handleSave = () => {
    if (!form.nome_fonte.trim()) { setError('O Nome da Fonte é obrigatório.'); return }
    onSave(form)
  }

  function Field({ label, required, children }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <label style={{ fontSize: '11px', fontWeight: '500', color: '#738290', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label}{required && <span style={{ color: '#C0544C', marginLeft: '3px' }}>*</span>}
        </label>
        {children}
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(44,58,66,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#FFFFFF', borderRadius: '16px', width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(100,140,180,0.18)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid #ECEEF2', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 1, borderRadius: '16px 16px 0 0' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#2C3A42', margin: 0 }}>Nova Fonte de Dados</h2>
            <p style={{ fontSize: '12px', color: '#738290', margin: '3px 0 0' }}>Preenche o nome para criar. Os restantes campos são opcionais.</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#738290', padding: '4px', display: 'flex' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Field label="Nome Fonte" required>
            <input style={inputStyle} value={form.nome_fonte} onChange={e => setForm(p => ({ ...p, nome_fonte: e.target.value }))} placeholder="ex: Salesforce CRM" />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field label="Tipo de Fonte">
              <select style={inputStyle} value={form.tipo_fonte} onChange={e => setForm(p => ({ ...p, tipo_fonte: e.target.value }))}>
                <option value="">— selecionar —</option>
                {(selectOptions.tipo_fonte || []).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Formato de Dados">
              <select style={inputStyle} value={form.formato_dados} onChange={e => setForm(p => ({ ...p, formato_dados: e.target.value }))}>
                <option value="">— selecionar —</option>
                {(selectOptions.formato_dados || []).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Descrição">
            <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '72px', lineHeight: '1.5' }} value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Descreve a fonte de dados..." />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field label="Domínio">
              <select style={inputStyle} value={form.dominio} onChange={e => setForm(p => ({ ...p, dominio: e.target.value }))}>
                <option value="">— selecionar —</option>
                {(selectOptions.dominio || []).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Responsável">
              <input style={inputStyle} value={form.responsavel} onChange={e => setForm(p => ({ ...p, responsavel: e.target.value }))} placeholder="Nome do responsável" />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field label="Frequência de Atualização">
              <select style={inputStyle} value={form.frequencia_atualizacao} onChange={e => setForm(p => ({ ...p, frequencia_atualizacao: e.target.value }))}>
                <option value="">— selecionar —</option>
                {(selectOptions.frequencia || []).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Localização">
              <input style={inputStyle} value={form.localizacao} onChange={e => setForm(p => ({ ...p, localizacao: e.target.value }))} placeholder="URL ou path" />
            </Field>
          </div>

          <Field label="Observações">
            <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '60px', lineHeight: '1.5' }} value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} placeholder="Observações adicionais..." />
          </Field>

          {error && <p style={{ fontSize: '12px', color: '#C0544C', margin: 0 }}>{error}</p>}
        </div>

        <div style={{ padding: '16px 28px', borderTop: '1px solid #ECEEF2', display: 'flex', justifyContent: 'flex-end', gap: '10px', position: 'sticky', bottom: 0, background: '#FFFFFF', borderRadius: '0 0 16px 16px' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: '8px', border: '1.5px solid #E0E5EC', background: '#FFFFFF', color: '#738290', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Cancelar</button>
          <button onClick={handleSave} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: '#A1B5D8', color: '#FFFFFF', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Gravar</button>
        </div>
      </div>
    </div>
  )
}

export default function Fontes() {
  const { enumeracoes, dominios } = useReferenceData()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCell, setEditingCell] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [filterDominio, setFilterDominio] = useState([])
  const [filterTipo, setFilterTipo] = useState([])
  const [filterFormato, setFilterFormato] = useState([])
  const [filterResponsavel, setFilterResponsavel] = useState([])
  const [filterFrequencia, setFilterFrequencia] = useState([])
  const topScrollRef = useRef(null)
  const tableWrapRef = useRef(null)

  useEffect(() => {
    supabase.from('d_fontes').select('*').order('dominio').order('nome_fonte').then(({ data: rows, error }) => {
      if (!error) setData(rows || [])
      setLoading(false)
    })
  }, [])

  const selectOptions = {
    tipo_fonte: enumeracoes.tipo_fonte || [],
    dominio: dominios,
    formato_dados: enumeracoes.formato_dados || [],
    frequencia: enumeracoes.frequencia || [],
  }

  const baseFiltered = data.filter(r => !filterDominio.length || filterDominio.includes(r.dominio))
  const tipoOptions = [...new Set(baseFiltered.map(r => r.tipo_fonte).filter(Boolean))].sort()
  const formatoOptions = [...new Set(baseFiltered.map(r => r.formato_dados).filter(Boolean))].sort()
  const responsavelOptions = [...new Set(baseFiltered.map(r => r.responsavel).filter(Boolean))].sort()
  const frequenciaOptions = [...new Set(baseFiltered.map(r => r.frequencia_atualizacao).filter(Boolean))].sort()

  const filtered = data.filter(r => {
    if (filterDominio.length && !filterDominio.includes(r.dominio)) return false
    if (filterTipo.length && !filterTipo.includes(r.tipo_fonte)) return false
    if (filterFormato.length && !filterFormato.includes(r.formato_dados)) return false
    if (filterResponsavel.length && !filterResponsavel.includes(r.responsavel)) return false
    if (filterFrequencia.length && !filterFrequencia.includes(r.frequencia_atualizacao)) return false
    return true
  })

  const hasFilters = !!(filterDominio.length || filterTipo.length || filterFormato.length || filterResponsavel.length || filterFrequencia.length)
  const clearFilters = () => { setFilterDominio([]); setFilterTipo([]); setFilterFormato([]); setFilterResponsavel([]); setFilterFrequencia([]) }
  const syncScroll = (src, tgt) => { if (tgt.current) tgt.current.scrollLeft = src.current.scrollLeft }

  const handleSave = async (form) => {
    const { error, data: newRow } = await supabase.from('d_fontes').insert([form]).select().single()
    if (!error) setData(prev => [...prev, newRow])
    setModalOpen(false)
  }

  const handleCellSave = async (id, field, value) => {
    setEditingCell(null); setEditValue('')
    const clean = value?.trim() === '' ? null : value?.trim()
    await supabase.from('d_fontes').update({ [field]: clean }).eq('id', id)
    setData(prev => prev.map(r => r.id === id ? { ...r, [field]: clean } : r))
  }

  const renderCell = (row, col) => {
    const isEditing = editingCell?.id === row.id && editingCell?.field === col.key
    const val = row[col.key]
    if (isEditing) {
      if (SELECT_COLS.has(col.key)) {
        const opts = col.key === 'frequencia_atualizacao' ? selectOptions.frequencia : selectOptions[col.key] || []
        return (
          <select autoFocus style={cellInputStyle} value={editValue}
            onChange={e => handleCellSave(row.id, col.key, e.target.value)}
            onBlur={() => { setEditingCell(null); setEditValue('') }}>
            <option value="">— selecionar —</option>
            {opts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        )
      }
      return (
        <input autoFocus style={cellInputStyle} value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={() => handleCellSave(row.id, col.key, editValue)}
          onKeyDown={e => { if (e.key === 'Enter') handleCellSave(row.id, col.key, editValue); if (e.key === 'Escape') { setEditingCell(null); setEditValue('') } }} />
      )
    }
    if (col.key === 'tipo_fonte') return <TipoBadge tipo={val} />
    return val || <span style={{ color: '#C8D0DA', fontSize: '11px' }}>—</span>
  }

  return (
    <div style={{ padding: '32px 36px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#2C3A42', margin: 0 }}>Catálogo — Sistemas Fonte (BU)</h1>
          <p style={{ fontSize: '13px', color: '#738290', margin: '4px 0 0' }}>Mapa de sistemas e plataformas fonte por domínio. Clica numa célula para editar.</p>
        </div>
        <button onClick={() => setModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#A1B5D8', color: '#FFFFFF', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
          onMouseEnter={e => e.currentTarget.style.background = '#8DA4CC'}
          onMouseLeave={e => e.currentTarget.style.background = '#A1B5D8'}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Adicionar
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <MultiSelect options={dominios} value={filterDominio} onChange={v => { setFilterDominio(v); setFilterTipo([]); setFilterFormato([]); setFilterResponsavel([]); setFilterFrequencia([]) }} placeholder="Domínio" />
        <MultiSelect options={tipoOptions} value={filterTipo} onChange={setFilterTipo} placeholder="Tipo de Fonte" />
        <MultiSelect options={formatoOptions} value={filterFormato} onChange={setFilterFormato} placeholder="Formato" />
        <MultiSelect options={frequenciaOptions} value={filterFrequencia} onChange={setFilterFrequencia} placeholder="Frequência" />
        <MultiSelect options={responsavelOptions} value={filterResponsavel} onChange={setFilterResponsavel} placeholder="Responsável" />
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
            <div style={{ height: '1px', minWidth: '2000px' }} />
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
                    <tr><td colSpan={COLUMNS.length} style={{ padding: '48px 24px', textAlign: 'center', color: '#738290', fontSize: '13px' }}>Nenhuma fonte encontrada.</td></tr>
                  )}
                  {filtered.map((row, idx) => (
                    <tr key={row.id}
                      style={{ background: idx % 2 === 0 ? '#FFFFFF' : '#FAFBFC', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F3F6FB'}
                      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#FFFFFF' : '#FAFBFC'}
                    >
                      {COLUMNS.map(col => (
                        <td key={col.key}
                          onClick={() => { setEditingCell({ id: row.id, field: col.key }); setEditValue(row[col.key] || '') }}
                          style={{ padding: editingCell?.id === row.id && editingCell?.field === col.key ? '6px 8px' : '10px 14px', maxWidth: col.width, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: editingCell?.id === row.id && editingCell?.field === col.key ? 'normal' : 'nowrap', cursor: 'text', color: ['nome_fonte', 'dominio'].includes(col.key) ? '#2C3A42' : '#4A5568', fontWeight: ['nome_fonte', 'dominio'].includes(col.key) ? '500' : '400' }}>
                          {renderCell(row, col)}
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

      <FonteModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} selectOptions={selectOptions} />
    </div>
  )
}