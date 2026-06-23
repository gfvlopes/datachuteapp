import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import multiselect from '../components/multiselect'

const STATUS_ORDER = [
  'Pendente UN',
  'Pendente Sistema Fonte',
  'Pendente envio de IT Build',
  'Pendente ingestão em Fabric',
  'Disponível',
]

const STATUS_COLORS = {
  'Pendente UN':                  { bg: 'rgba(192,84,76,0.12)',   color: '#C0544C' },
  'Pendente Sistema Fonte':       { bg: 'rgba(201,151,74,0.15)',  color: '#9A6E20' },
  'Pendente envio de IT Build':   { bg: 'rgba(161,181,216,0.20)', color: '#5A7BA8' },
  'Pendente ingestão em Fabric':  { bg: 'rgba(168,181,192,0.18)', color: '#65737E' },
  'Disponível':                   { bg: 'rgba(92,143,106,0.18)',  color: '#2A6040' },
}

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || { bg: 'rgba(115,130,144,0.12)', color: '#738290' }
  return (
    <span style={{
      background: s.bg, color: s.color,
      borderRadius: '20px', padding: '3px 10px',
      fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap',
    }}>
      {status || '—'}
    </span>
  )
}

const GROUP_HEADERS = [
  { label: 'DSG',                                          span: 5,  color: '#5A7BA8', bg: 'rgba(161,181,216,0.15)' },
  { label: 'Unidade de Negócio — Data Steward',            span: 10, color: '#4A7A5A', bg: 'rgba(194,216,185,0.15)' },
  { label: 'DIT — Detalhe dos dados no Sistema Fonte',     span: 17, color: '#9A6E20', bg: 'rgba(201,151,74,0.10)'  },
  { label: 'DIT Data Engineer — Detalhe dados em Fabric',  span: 7,  color: '#738290', bg: 'rgba(115,130,144,0.10)' },
]

const COLUMNS = [
  { key: 'nome_atributo_gold',            label: 'Nome atributo (Gold)',                                        width: '200px', group: 0 },
  { key: 'descricao_atributo_gold',       label: 'Descrição do atributo necessário',                            width: '240px', group: 0 },
  { key: 'sistema_referencia_gold',       label: 'Sistema de Referência (quando aplicável)',                    width: '200px', group: 0 },
  { key: 'dominio_atributo',              label: 'Domínios',                                                    width: '140px', group: 0 },
  { key: 'subdominio_atributo',           label: 'Sub Domínios',                                                width: '140px', group: 0 },
  { key: 'sistema_un',                    label: 'Sistema Unidade Negócio*',                                    width: '160px', group: 1 },
  { key: 'tabela_un',                     label: 'Tabela Unidade Negócio*',                                     width: '160px', group: 1 },
  { key: 'nome_atributo_un',              label: 'Nome atributo*',                                              width: '160px', group: 1 },
  { key: 'descricao_atributo_un',         label: 'Descrição Atributo*',                                         width: '220px', group: 1 },
  { key: 'tipologia_atributo',            label: 'Tipologia Atributo*',                                         width: '130px', group: 1 },
  { key: 'formula_calculo',               label: 'Fórmula de cálculo / Regra de negócio ou Query (se calculado)', width: '260px', group: 1 },
  { key: 'formato_atributo_un',           label: 'Formato Atributo',                                            width: '130px', group: 1 },
  { key: 'max_char_un',                   label: 'Nº Máx char Atributo',                                        width: '110px', group: 1 },
  { key: 'classificacao_dados_un',        label: 'Classificação de Dados Atributo',                             width: '170px', group: 1 },
  { key: 'estado_confidencial_un',        label: 'Estado Dados Confidênciais',                                  width: '160px', group: 1 },
  { key: 'sistema_fonte_dit',             label: 'Sistema Fonte DIT',                                           width: '150px', group: 2 },
  { key: 'tabela_fonte_dit',              label: 'Tabela Sistema Fonte DIT',                                    width: '170px', group: 2 },
  { key: 'nome_atributo_fonte_dit',       label: 'Nome no Sistema Fonte DIT',                                   width: '180px', group: 2 },
  { key: 'descricao_atributo_fonte_dit',  label: 'Descrição Atributo Sistema Fonte DIT',                        width: '240px', group: 2 },
  { key: 'mapeamento_dit',                label: 'Mapeamento / Joins / Regras / Transformações / Query DIT',    width: '280px', group: 2 },
  { key: 'formato_atributo_dit',          label: 'Formato Atributo',                                            width: '130px', group: 2 },
  { key: 'data_type_dit',                 label: 'Data Type (Date, Varchar(x)...)',                              width: '180px', group: 2 },
  { key: 'chave_primaria',                label: 'Chave Primária (S/N)',                                        width: '130px', group: 2 },
  { key: 'chave_estrangeira',             label: 'Chave Estrangeira (S/N)',                                     width: '140px', group: 2 },
  { key: 'tabela_referencia_dit',         label: 'Tabela de referência',                                        width: '150px', group: 2 },
  { key: 'atributo_referencia_dit',       label: 'Atributo de referência',                                      width: '150px', group: 2 },
  { key: 'permite_nulos',                 label: 'Permite Nulos (S/N)',                                         width: '130px', group: 2 },
  { key: 'codigo_lista_valores',          label: 'É código / lista de valores (S/N)',                           width: '180px', group: 2 },
  { key: 'regra_referencia_codigo',       label: 'Regra de Referência de Código',                               width: '200px', group: 2 },
  { key: 'classificacao_dados_dit',       label: 'Classificação de Dados',                                      width: '150px', group: 2 },
  { key: 'estado_confidencial_dit',       label: 'Estado Dados Confidênciais',                                  width: '160px', group: 2 },
  { key: 'dado_mestre_transacional',      label: 'Dado Mestre / Transacional',                                  width: '160px', group: 2 },
  { key: 'campo_em_fabric',               label: 'Campo em Fabric (S/N)',                                       width: '140px', group: 3 },
  { key: 'sistema_ingerido_fabric',       label: 'Sistema Ingerido',                                            width: '150px', group: 3 },
  { key: 'tabela_fabric_dit',             label: 'Tabela de Fabric (DIT)',                                      width: '170px', group: 3 },
  { key: 'nome_atributo_fabric_dit',      label: 'Nome Atributo em Fabric (DIT)',                               width: '190px', group: 3 },
  { key: 'descricao_atributo_fabric_dit', label: 'Descrição Atributo em Fabric (DIT)',                          width: '220px', group: 3 },
  { key: 'mapeamento_fabric',             label: 'Mapeamento / Joins / Regras / Transformações / Query (Fabric)', width: '280px', group: 3 },
  { key: 'notas_fabric',                  label: 'Notas',                                                       width: '180px', group: 3 },
]

const FLAG_KEYS = ['chave_primaria', 'chave_estrangeira', 'permite_nulos', 'codigo_lista_valores', 'campo_em_fabric']

function FlagBadge({ value }) {
  if (!value) return <span style={{ color: '#C8D0DA' }}>—</span>
  const isS = value.toUpperCase() === 'S'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: isS ? 'rgba(92,143,106,0.15)' : 'rgba(115,130,144,0.10)',
      color: isS ? '#2A6040' : '#738290',
      borderRadius: '6px', padding: '2px 8px',
      fontSize: '11px', fontWeight: '600',
    }}>
      {value.toUpperCase()}
    </span>
  )
}

// Campos obrigatórios por status de destino
const CAMPOS_DSG = ['nome_atributo_gold', 'descricao_atributo_gold', 'sistema_referencia_gold', 'dominio_atributo', 'subdominio_atributo']
const CAMPOS_UN  = ['sistema_un', 'tabela_un', 'nome_atributo_un', 'descricao_atributo_un', 'tipologia_atributo']

const LABEL_MAP = {
  nome_atributo_gold:      'Nome atributo (Gold)',
  descricao_atributo_gold: 'Descrição do atributo necessário',
  sistema_referencia_gold: 'Sistema de Referência',
  dominio_atributo:        'Domínios',
  subdominio_atributo:     'Sub Domínios',
  sistema_un:              'Sistema Unidade Negócio',
  tabela_un:               'Tabela Unidade Negócio',
  nome_atributo_un:        'Nome atributo (UN)',
  descricao_atributo_un:   'Descrição Atributo (UN)',
  tipologia_atributo:      'Tipologia Atributo',
}

function validarTransicao(atributo, novoStatus) {
  if (novoStatus === 'Pendente UN') {
    const faltam = CAMPOS_DSG.filter(c => !atributo[c])
    if (faltam.length > 0) return { ok: false, campos: faltam }
  }
  if (novoStatus === 'Pendente Sistema Fonte' ||
      novoStatus === 'Pendente envio de IT Build' ||
      novoStatus === 'Pendente ingestão em Fabric' ||
      novoStatus === 'Disponível') {
    const faltam = CAMPOS_UN.filter(c => !atributo[c])
    if (faltam.length > 0) return { ok: false, campos: faltam }
  }
  return { ok: true }
}

function GerirStatusModal({ selected, data, onClose, onSave }) {
  const [novoStatus, setNovoStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [erros, setErros] = useState([]) // [{ nome, campos }]

  const atributosSelected = selected.map(id => data.find(r => r.id === id)).filter(Boolean)
  const nomes = atributosSelected.map(r => r.nome_atributo_gold)

  const handleSave = async () => {
    if (!novoStatus) return

    // Validar cada atributo
    const novosErros = []
    atributosSelected.forEach(atr => {
      const res = validarTransicao(atr, novoStatus)
      if (!res.ok) novosErros.push({ nome: atr.nome_atributo_gold, campos: res.campos })
    })

    if (novosErros.length > 0) {
      setErros(novosErros)
      return
    }

    setSaving(true)
    const { error } = await supabase
      .from('d_catalogo_atributos')
      .update({ status: novoStatus })
      .in('id', selected)
    setSaving(false)
    if (!error) onSave(novoStatus)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(44,58,66,0.18)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#FFFFFF', borderRadius: '12px',
        padding: '28px 32px', width: '520px', maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#2C3A42', margin: '0 0 6px' }}>
          Gerir Status da Catalogação
        </h3>
        <p style={{ fontSize: '12px', color: '#738290', margin: '0 0 20px' }}>
          {selected.length} atributo{selected.length !== 1 ? 's' : ''} seleccionado{selected.length !== 1 ? 's' : ''}
        </p>

        {/* Lista de atributos */}
        <div style={{
          background: '#F7F9FC', borderRadius: '8px', padding: '10px 14px',
          marginBottom: '20px', maxHeight: '120px', overflowY: 'auto',
        }}>
          {nomes.map((nome, i) => (
            <div key={i} style={{ fontSize: '12px', color: '#2C3A42', padding: '3px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#A1B5D8', flexShrink: 0 }} />
              {nome}
            </div>
          ))}
        </div>

        {/* Erros de validação */}
        {erros.length > 0 && (
          <div style={{
            background: 'rgba(192,84,76,0.08)', border: '1.5px solid rgba(192,84,76,0.25)',
            borderRadius: '8px', padding: '12px 14px', marginBottom: '20px',
          }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#C0544C', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {erros.length === 1 ? '1 atributo não elegível' : `${erros.length} atributos não elegíveis`} para "{novoStatus}"
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {erros.map((e, i) => (
                <div key={i}>
                  <p style={{ fontSize: '12px', fontWeight: '600', color: '#2C3A42', margin: '0 0 3px' }}>{e.nome}</p>
                  <p style={{ fontSize: '11px', color: '#738290', margin: 0 }}>
                    Campos em falta: {e.campos.map(c => LABEL_MAP[c] || c).join(', ')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selector de novo status */}
        <p style={{ fontSize: '11px', fontWeight: '600', color: '#738290', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>
          Novo Status
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
          {STATUS_ORDER.map(s => {
            const sc = STATUS_COLORS[s]
            const isSelected = novoStatus === s
            return (
              <div key={s} onClick={() => { setNovoStatus(s); setErros([]) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '9px 12px', borderRadius: '8px', cursor: 'pointer',
                  border: `1.5px solid ${isSelected ? sc.color : '#E0E5EC'}`,
                  background: isSelected ? sc.bg : '#FFFFFF',
                  transition: 'all 0.12s',
                }}
              >
                <div style={{
                  width: '14px', height: '14px', borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${isSelected ? sc.color : '#C8D0DA'}`,
                  background: isSelected ? sc.color : '#FFFFFF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isSelected && <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#FFFFFF' }} />}
                </div>
                <span style={{ fontSize: '13px', color: isSelected ? sc.color : '#2C3A42', fontWeight: isSelected ? '600' : '400' }}>
                  {s}
                </span>
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '8px 18px', borderRadius: '8px', border: '1.5px solid #E0E5EC',
            background: '#FFFFFF', color: '#738290', fontSize: '13px', fontWeight: '500', cursor: 'pointer',
          }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={!novoStatus || saving} style={{
            padding: '8px 18px', borderRadius: '8px', border: 'none',
            background: novoStatus ? '#A1B5D8' : '#E0E5EC',
            color: novoStatus ? '#FFFFFF' : '#B0BCC8',
            fontSize: '13px', fontWeight: '600', cursor: novoStatus ? 'pointer' : 'default',
          }}>
            {saving ? 'A guardar...' : 'Aplicar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Atributos() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterDominio, setFilterDominio] = useState([])
  const [filterSubdominio, setFilterSubdominio] = useState([])
  const [filterSistema, setFilterSistema] = useState([])
  const [filterStatus, setFilterStatus] = useState([])
  const [filterProduto, setFilterProduto] = useState([])
  const [filterCaderno, setFilterCaderno] = useState([])
  const [cadernos, setCadernos] = useState([]) // [{ id, id_caderno, nome_caderno }]
  const [produtosOptions, setProdutosOptions] = useState([]) // [{ id_produto_dados, nome }]
  const [atributosIdsPorFiltro, setAtributosIdsPorFiltro] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [modalOpen, setModalOpen] = useState(false)
  const topScrollRef = useRef(null)
  const tableWrapRef = useRef(null)

  useEffect(() => {
    fetchData()
    supabase.from('cadernos_requisitos').select('id,id_caderno,nome_caderno,id_produto_dados,nome_produto_dados').order('id_caderno').then(({ data }) => {
      if (data) {
        setCadernos(data)
        const prodMap = {}
        data.forEach(r => { if (r.id_produto_dados) prodMap[r.id_produto_dados] = r.nome_produto_dados })
        setProdutosOptions(Object.entries(prodMap).map(([id, nome]) => ({ id, nome })).sort((a, b) => a.id.localeCompare(b.id)))
      }
    })
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: rows, error } = await supabase
      .from('d_catalogo_atributos')
      .select('*')
      .order('dominio_atributo')
      .order('nome_atributo_gold')
    if (error) console.error('Atributos fetch error:', error)
    if (rows) setData(rows)
    setLoading(false)
  }

  const dominioOptions = [...new Set(data.map(r => r.dominio_atributo).filter(Boolean))].sort()
  const subdominioOptions = [...new Set(
    data.filter(r => !filterDominio.length || filterDominio.includes(r.dominio_atributo))
      .map(r => r.subdominio_atributo).filter(Boolean)
  )].sort()
  const sistemaOptions = [...new Set(data.map(r => r.sistema_un).filter(Boolean))].sort()
  const statusOptions = STATUS_ORDER.filter(s => data.some(r => r.status === s))

  // IDs do catálogo ligados ao produto/caderno seleccionado (via caderno_atributos)
  useEffect(() => {
    const temFiltroPC = filterProduto.length || filterCaderno.length
    if (!temFiltroPC) { setAtributosIdsPorFiltro(null); return }
    let query = supabase.from('caderno_atributos').select('id_catalogo_atributo').not('id_catalogo_atributo', 'is', null)
    if (filterCaderno.length) {
      // Encontrar IDs dos cadernos seleccionados
      const idsCadernos = cadernos.filter(c => filterCaderno.includes(c.id_caderno)).map(c => c.id)
      if (idsCadernos.length) query = query.in('id_caderno_fk', idsCadernos)
    }
    if (filterProduto.length && !filterCaderno.length) {
      const idsCadernos = cadernos.filter(c => filterProduto.includes(c.id_produto_dados)).map(c => c.id)
      if (idsCadernos.length) query = query.in('id_caderno_fk', idsCadernos)
    }
    query.then(({ data: rows }) => {
      const ids = [...new Set((rows || []).map(r => r.id_catalogo_atributo).filter(Boolean))]
      setAtributosIdsPorFiltro(ids)
    })
  }, [filterProduto, filterCaderno, cadernos])

  const filtered = data.filter(r => {
    if (filterDominio.length && !filterDominio.includes(r.dominio_atributo)) return false
    if (filterSubdominio.length && !filterSubdominio.includes(r.subdominio_atributo)) return false
    if (filterSistema.length && !filterSistema.includes(r.sistema_un)) return false
    if (filterStatus.length && !filterStatus.includes(r.status)) return false
    if (atributosIdsPorFiltro !== null && !atributosIdsPorFiltro.includes(r.id)) return false
    return true
  })

  const allFilteredIds = filtered.map(r => r.id)
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selected.has(id))
  const someSelected = allFilteredIds.some(id => selected.has(id))

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(prev => { const n = new Set(prev); allFilteredIds.forEach(id => n.delete(id)); return n })
    } else {
      setSelected(prev => { const n = new Set(prev); allFilteredIds.forEach(id => n.add(id)); return n })
    }
  }

  const toggleRow = (id) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const selectedInFiltered = allFilteredIds.filter(id => selected.has(id))

  const handleModalSave = (novoStatus) => {
    setData(prev => prev.map(r => selected.has(r.id) ? { ...r, status: novoStatus } : r))
    setSelected(new Set())
    setModalOpen(false)
  }

  const exportExcel = () => {
    const atributosExport = data.filter(r => selected.has(r.id))
    const headers = ['Status', ...COLUMNS.map(c => c.label)]
    const rows = atributosExport.map(r => [
      r.status || '',
      ...COLUMNS.map(c => r[c.key] ?? ''),
    ])
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `catalogo_atributos_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const hasFilters = !!(filterDominio.length || filterSubdominio.length || filterSistema.length || filterStatus.length || filterProduto.length || filterCaderno.length)
  const clearFilters = () => { setFilterDominio([]); setFilterSubdominio([]); setFilterSistema([]); setFilterStatus([]); setFilterProduto([]); setFilterCaderno([]) }
  const syncScroll = (src, tgt) => { if (tgt.current) tgt.current.scrollLeft = src.current.scrollLeft }
  const totalWidth = COLUMNS.reduce((sum, col) => sum + parseInt(col.width), 0) + 40 + 190

  return (
    <div style={{ padding: '32px 36px', fontFamily: 'Inter, sans-serif' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#2C3A42', margin: 0 }}>
            Catálogo — Atributos
          </h1>
          <p style={{ fontSize: '13px', color: '#738290', margin: '4px 0 0' }}>
            Catálogo completo de atributos por camada (DSG, UN, DIT Fonte, DIT Fabric).
          </p>
        </div>
        {selectedInFiltered.length > 0 && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {/* Export Excel */}
            <button
              onClick={exportExcel}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '9px 18px', borderRadius: '8px',
                border: '1.5px solid #A1B5D8', background: '#FFFFFF',
                color: '#5A7BA8', fontSize: '13px', fontWeight: '600',
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#EBF1FA'}
              onMouseLeave={e => e.currentTarget.style.background = '#FFFFFF'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Exportar
              <span style={{
                background: '#EBF1FA', borderRadius: '20px',
                padding: '1px 8px', fontSize: '11px', fontWeight: '700', color: '#5A7BA8',
              }}>
                {selectedInFiltered.length}
              </span>
            </button>
            {/* Gerir Status */}
            <button
              onClick={() => setModalOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '9px 18px', borderRadius: '8px', border: 'none',
                background: '#A1B5D8', color: '#FFFFFF',
                fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                boxShadow: '0 2px 8px rgba(161,181,216,0.4)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#8DA4CC'}
              onMouseLeave={e => e.currentTarget.style.background = '#A1B5D8'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Gerir status da catalogação
              <span style={{
                background: 'rgba(255,255,255,0.25)', borderRadius: '20px',
                padding: '1px 8px', fontSize: '11px', fontWeight: '700',
              }}>
                {selectedInFiltered.length}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <multiselect options={dominioOptions} value={filterDominio} onChange={v => { setFilterDominio(v); setFilterSubdominio([]) }} placeholder="Domínios" />
        <multiselect options={subdominioOptions} value={filterSubdominio} onChange={setFilterSubdominio} placeholder="Sub Domínios" />
        <multiselect options={sistemaOptions} value={filterSistema} onChange={setFilterSistema} placeholder="Sistema UN" />
        <multiselect options={statusOptions} value={filterStatus} onChange={setFilterStatus} placeholder="Status" />
        <multiselect options={produtosOptions.map(p => p.id)} value={filterProduto} onChange={v => { setFilterProduto(v); setFilterCaderno([]) }} placeholder="Produto de Dados" />
        <multiselect
          options={filterProduto.length
            ? cadernos.filter(c => filterProduto.includes(c.id_produto_dados)).map(c => c.id_caderno)
            : cadernos.map(c => c.id_caderno)}
          value={filterCaderno}
          onChange={setFilterCaderno}
          placeholder="Caderno de Requisitos"
        />
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
            <div style={{ height: '1px', minWidth: `${totalWidth}px` }} />
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <div ref={tableWrapRef} onScroll={() => syncScroll(tableWrapRef, topScrollRef)} style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', fontSize: '12px', color: '#2C3A42', fontFamily: 'Inter, sans-serif', tableLayout: 'fixed', width: `${totalWidth}px` }}>
                <colgroup>
                  <col style={{ width: '40px' }} />
                  <col style={{ width: '190px' }} />
                  {COLUMNS.map(col => <col key={col.key} style={{ width: col.width }} />)}
                </colgroup>
                <thead>
                  {/* Linha de grupos */}
                  <tr>
                    {GROUP_HEADERS.map((g, i) => (
                      <th key={i} colSpan={i === 0 ? g.span + 2 : g.span} style={{
                        padding: '7px 14px', textAlign: 'left',
                        fontSize: '10px', fontWeight: '700', color: g.color,
                        background: g.bg, textTransform: 'uppercase', letterSpacing: '0.1em',
                        borderBottom: `2px solid ${g.color}33`,
                        borderRight: i < GROUP_HEADERS.length - 1 ? `2px solid ${g.color}33` : 'none',
                      }}>
                        {g.label}
                      </th>
                    ))}
                  </tr>
                  {/* Linha de colunas */}
                  <tr style={{ borderBottom: '1px solid #ECEEF2' }}>
                    {/* Checkbox selecionar todos */}
                    <th style={{ width: '40px', minWidth: '40px', maxWidth: '40px', padding: '9px 0', background: '#FFFFFF', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={el => { if (el) el.indeterminate = someSelected && !allSelected }}
                        onChange={toggleSelectAll}
                        style={{ cursor: 'pointer', accentColor: '#A1B5D8', margin: 0 }}
                      />
                    </th>
                    {/* Status */}
                    <th style={{ width: '190px', padding: '9px 12px', background: '#FFFFFF', fontSize: '10px', fontWeight: '600', color: '#738290', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap', textAlign: 'left' }}>
                      Status
                    </th>
                    {COLUMNS.map((col, i) => {
                      const isLastInGroup = i === COLUMNS.length - 1 || COLUMNS[i + 1]?.group !== col.group
                      return (
                        <th key={col.key} style={{
                          padding: '9px 12px', textAlign: 'left',
                          fontSize: '10px', fontWeight: '600', color: '#738290',
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                          whiteSpace: 'nowrap', background: '#FFFFFF',
                          width: col.width, overflow: 'hidden', textOverflow: 'ellipsis',
                          borderRight: isLastInGroup && i < COLUMNS.length - 1 ? '2px solid #ECEEF2' : 'none',
                        }}>
                          {col.label}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={COLUMNS.length + 2} style={{ padding: '48px 24px', textAlign: 'center', color: '#738290', fontSize: '13px' }}>
                        Nenhum atributo encontrado.
                      </td>
                    </tr>
                  )}
                  {filtered.map((row, idx) => {
                    const isSelected = selected.has(row.id)
                    const rowBg = isSelected ? '#EBF1FA' : idx % 2 === 0 ? '#FFFFFF' : '#FAFBFC'
                    return (
                      <tr key={row.id}
                        style={{ background: rowBg, transition: 'background 0.1s' }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F3F6FB' }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = idx % 2 === 0 ? '#FFFFFF' : '#FAFBFC' }}
                      >
                        {/* Checkbox */}
                        <td style={{ width: '40px', minWidth: '40px', maxWidth: '40px', padding: '9px 0', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRow(row.id)}
                            style={{ cursor: 'pointer', accentColor: '#A1B5D8', margin: 0 }}
                          />
                        </td>
                        {/* Status */}
                        <td style={{ padding: '9px 12px', width: '190px' }}>
                          <StatusBadge status={row.status} />
                        </td>
                        {COLUMNS.map((col, i) => {
                          const isLastInGroup = i === COLUMNS.length - 1 || COLUMNS[i + 1]?.group !== col.group
                          const val = row[col.key]
                          const isFlag = FLAG_KEYS.includes(col.key)
                          const isNameCol = col.key === 'nome_atributo_gold'
                          return (
                            <td key={col.key}
                              title={typeof val === 'string' && val.length > 30 ? val : undefined}
                              style={{
                                padding: '9px 12px', overflow: 'hidden',
                                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                color: isNameCol ? '#2C3A42' : '#4A5568',
                                fontWeight: isNameCol ? '600' : '400',
                                borderRight: isLastInGroup && i < COLUMNS.length - 1 ? '2px solid #ECEEF2' : 'none',
                              }}
                            >
                              {isFlag
                                ? <FlagBadge value={val} />
                                : (val ?? <span style={{ color: '#D0D8E0' }}>—</span>)
                              }
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <p style={{ fontSize: '11px', color: '#B0BCC8', marginTop: '8px' }}>
            {filtered.length} atributo{filtered.length !== 1 ? 's' : ''} {hasFilters ? 'filtrados' : 'no catálogo'}
            {selectedInFiltered.length > 0 && ` · ${selectedInFiltered.length} seleccionado${selectedInFiltered.length !== 1 ? 's' : ''}`}
          </p>
        </>
      )}

      {modalOpen && (
        <GerirStatusModal
          selected={[...selected]}
          data={data}
          onClose={() => setModalOpen(false)}
          onSave={handleModalSave}
        />
      )}
    </div>
  )
}