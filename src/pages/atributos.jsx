import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import MultiSelect from '../components/multiselect'
import { useReferenceData } from '../context/referencedatacontext'

const STATUS_ORDER = [
  'Mapeamento Sistema Fonte UN',
  'Mapeamento Sistema Fonte DIT',
  'Pendente Ingestão em Fabric DIT',
  'Disponível',
]

const STATUS_COLORS = {
  'Mapeamento Sistema Fonte UN':     { bg: 'rgba(192,84,76,0.12)',   color: '#C0544C' },
  'Mapeamento Sistema Fonte DIT':    { bg: 'rgba(201,151,74,0.15)',  color: '#9A6E20' },
  'Pendente Ingestão em Fabric DIT': { bg: 'rgba(161,181,216,0.20)', color: '#5A7BA8' },
  'Disponível':                      { bg: 'rgba(92,143,106,0.18)',  color: '#2A6040' },
}

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || { bg: 'rgba(115,130,144,0.12)', color: '#738290' }
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' }}>
      {status || '—'}
    </span>
  )
}

const GROUP_HEADERS = [
  { label: 'DSG',                                                           span: 5,  color: '#5A7BA8', bg: 'rgba(161,181,216,0.15)' },
  { label: 'Unidade de Negócio (Data Steward)',                             span: 7,  color: '#4A7A5A', bg: 'rgba(194,216,185,0.15)' },
  { label: 'Detalhe dos dados no Sistema Fonte (DIT)',                      span: 6,  color: '#9A6E20', bg: 'rgba(201,151,74,0.10)'  },
  { label: 'Detalhe dados em Fabric (DIT Data Engineer/Data Custodian)',  span: 20, color: '#738290', bg: 'rgba(115,130,144,0.10)' },
]

const COLUMNS = [
  // DSG (group 0)
  { key: 'nome_atributo_gold',              label: 'Nome atributo (Gold)',                                          width: '200px', group: 0 },
  { key: 'descricao_atributo_gold',         label: 'Descrição do atributo necessário',                              width: '240px', group: 0 },
  { key: 'sistema_referencia_gold',         label: 'Sistema de Referência (quando aplicável)',                      width: '200px', group: 0 },
  { key: 'nome_dominio',                    label: 'Domínios',                                                      width: '140px', group: 0 },
  { key: 'nome_subdominio',                 label: 'Sub Domínios',                                                  width: '140px', group: 0 },
  // UN (group 1)
  { key: 'sistema_un',                      label: 'Sistema Unidade Negócio*',                                      width: '160px', group: 1 },
  { key: 'tabela_un',                       label: 'Tabela Unidade Negócio*',                                       width: '160px', group: 1 },
  { key: 'nome_atributo_un',               label: 'Nome atributo*',                                                width: '160px', group: 1 },
  { key: 'descricao_atributo_un',           label: 'Descrição Atributo*',                                           width: '220px', group: 1 },
  { key: 'tipologia_atributo',              label: 'Tipologia Atributo*',                                           width: '130px', group: 1 },
  { key: 'formula_calculo',                 label: 'Fórmula de cálculo / Regra de negócio',                         width: '260px', group: 1 },
  { key: 'data_type_un',                    label: 'Data Type',                                                     width: '130px', group: 1 },
  // DIT Fonte (group 2)
  { key: 'sistema_fonte_dit',               label: 'Sistema Fonte DIT',                                             width: '150px', group: 2 },
  { key: 'tabela_fonte_dit',                label: 'Tabela Sistema Fonte DIT',                                      width: '170px', group: 2 },
  { key: 'nome_atributo_fonte_dit',         label: 'Nome no Sistema Fonte DIT',                                     width: '180px', group: 2 },
  { key: 'descricao_atributo_fonte_dit',    label: 'Descrição Atributo Sistema Fonte DIT',                          width: '240px', group: 2 },
  { key: 'mapeamento_dit',                  label: 'Mapeamento / Joins / Regras / Transformações / Query DIT',      width: '280px', group: 2 },
  { key: 'formato_atributo_dit',            label: 'Formato Atributo',                                              width: '130px', group: 2 },
  // DIT Fabric (group 3)
  { key: 'campo_em_fabric',                 label: 'Campo em Fabric (S/N)',                                         width: '140px', group: 3 },
  { key: 'sistema_ingerido_fabric',         label: 'Sistema Ingerido',                                              width: '150px', group: 3 },
  { key: 'tabela_fabric_dit',               label: 'Tabela de Fabric (DIT)',                                        width: '170px', group: 3 },
  { key: 'nome_atributo_fabric_dit',        label: 'Nome Atributo em Fabric (DIT)',                                 width: '190px', group: 3 },
  { key: 'descricao_atributo_fabric_dit',   label: 'Descrição Atributo em Fabric (DIT)',                            width: '220px', group: 3 },
  { key: 'mapeamento_fabric',               label: 'Mapeamento / Joins / Regras / Transformações / Query (Fabric)', width: '280px', group: 3 },
  { key: 'data_type_fabric',                label: 'Data Type (Date, Varchar(x)...)',                               width: '180px', group: 3 },
  { key: 'chave_primaria_fabric',           label: 'Chave Primária (S/N)',                                          width: '130px', group: 3 },
  { key: 'chave_estrangeira_fabric',        label: 'Chave Estrangeira (S/N)',                                       width: '140px', group: 3 },
  { key: 'tabela_referencia_fabric',        label: 'Tabela de referência',                                          width: '150px', group: 3 },
  { key: 'atributo_referencia_fabric',      label: 'Atributo de referência',                                        width: '150px', group: 3 },
  { key: 'permite_nulos_fabric',            label: 'Permite Nulos (S/N)',                                           width: '130px', group: 3 },
  { key: 'codigo_lista_valores_fabric',     label: 'É código / lista de valores (S/N)',                             width: '180px', group: 3 },
  { key: 'regra_referencia_codigo_fabric',  label: 'Regra de Referência de Código',                                 width: '200px', group: 3 },
  { key: 'classificacao_dados_fabric',      label: 'Classificação de Dados',                                        width: '150px', group: 3 },
  { key: 'estado_confidencial_fabric',      label: 'Estado Dados Confidênciais',                                    width: '160px', group: 3 },
  { key: 'dado_mestre_transacional_fabric', label: 'Dado Mestre / Transacional',                                    width: '160px', group: 3 },
  { key: 'notas_fabric',                    label: 'Notas',                                                         width: '180px', group: 3 },
]

const FLAG_KEYS = ['campo_em_fabric', 'chave_primaria_fabric', 'chave_estrangeira_fabric', 'permite_nulos_fabric', 'codigo_lista_valores_fabric']

function FlagBadge({ value }) {
  if (!value) return <span style={{ color: '#C8D0DA' }}>—</span>
  const isS = value.toUpperCase() === 'S'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: isS ? 'rgba(92,143,106,0.15)' : 'rgba(115,130,144,0.10)', color: isS ? '#2A6040' : '#738290', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: '600' }}>
      {value.toUpperCase()}
    </span>
  )
}

// Campos obrigatórios para ATINGIR cada estado (os da fase anterior têm de estar preenchidos)
const CAMPOS_UN     = ['sistema_un', 'tabela_un', 'nome_atributo_un', 'descricao_atributo_un']
const CAMPOS_DIT    = ['sistema_fonte_dit', 'tabela_fonte_dit', 'nome_atributo_fonte_dit']
const CAMPOS_FABRIC = ['campo_em_fabric', 'sistema_ingerido_fabric', 'tabela_fabric_dit', 'nome_atributo_fabric_dit']

const LABEL_MAP = {
  sistema_un:               'Sistema Unidade Negócio',
  tabela_un:                'Tabela Unidade Negócio',
  nome_atributo_un:         'Nome atributo',
  descricao_atributo_un:    'Descrição Atributo',
  sistema_fonte_dit:        'Sistema Fonte DIT',
  tabela_fonte_dit:         'Tabela Sistema Fonte DIT',
  nome_atributo_fonte_dit:  'Nome no Sistema Fonte DIT',
  campo_em_fabric:          'Campo em Fabric (S/N)',
  sistema_ingerido_fabric:  'Sistema Ingerido',
  tabela_fabric_dit:        'Tabela de Fabric (DIT)',
  nome_atributo_fabric_dit: 'Nome Atributo em Fabric (DIT)',
}

function validarTransicao(atributo, novoStatus) {
  const vazio = c => !atributo[c] || String(atributo[c]).trim() === ''
  // Mapeamento Sistema Fonte DIT exige campos UN preenchidos
  if (novoStatus === 'Mapeamento Sistema Fonte DIT') {
    const faltam = CAMPOS_UN.filter(vazio)
    if (faltam.length > 0) return { ok: false, campos: faltam }
  }
  // Pendente Ingestão em Fabric DIT exige campos Sistema Fonte DIT preenchidos
  if (novoStatus === 'Pendente Ingestão em Fabric DIT') {
    const faltam = CAMPOS_DIT.filter(vazio)
    if (faltam.length > 0) return { ok: false, campos: faltam }
  }
  // Disponível exige campos Fabric preenchidos
  if (novoStatus === 'Disponível') {
    const faltam = CAMPOS_FABRIC.filter(vazio)
    if (faltam.length > 0) return { ok: false, campos: faltam }
  }
  // Mapeamento Sistema Fonte UN é o estado por defeito — sem pré-requisitos
  return { ok: true }
}

function GerirStatusModal({ selected, data, onClose, onSave }) {
  const [novoStatus, setNovoStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [erros, setErros] = useState([])

  const atributosSelected = selected.map(id => data.find(r => r.id === id)).filter(Boolean)
  const nomes = atributosSelected.map(r => r.nome_atributo_gold)

  const handleSave = async () => {
    if (!novoStatus) return
    const novosErros = []
    atributosSelected.forEach(atr => {
      const res = validarTransicao(atr, novoStatus)
      if (!res.ok) novosErros.push({ nome: atr.nome_atributo_gold, campos: res.campos })
    })
    if (novosErros.length > 0) { setErros(novosErros); return }
    setSaving(true)
    const { error } = await supabase.from('d_catalogo_atributos').update({ status: novoStatus }).in('id', selected)
    setSaving(false)
    if (!error) onSave(novoStatus)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(44,58,66,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '28px 32px', width: '520px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#2C3A42', margin: '0 0 6px' }}>Gerir Status da Catalogação</h3>
        <p style={{ fontSize: '12px', color: '#738290', margin: '0 0 20px' }}>{selected.length} atributo{selected.length !== 1 ? 's' : ''} seleccionado{selected.length !== 1 ? 's' : ''}</p>
        <div style={{ background: '#F7F9FC', borderRadius: '8px', padding: '10px 14px', marginBottom: '20px', maxHeight: '120px', overflowY: 'auto' }}>
          {nomes.map((nome, i) => (
            <div key={i} style={{ fontSize: '12px', color: '#2C3A42', padding: '3px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#A1B5D8', flexShrink: 0 }} />{nome}
            </div>
          ))}
        </div>
        {erros.length > 0 && (
          <div style={{ background: 'rgba(192,84,76,0.08)', border: '1.5px solid rgba(192,84,76,0.25)', borderRadius: '8px', padding: '12px 14px', marginBottom: '20px' }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#C0544C', margin: '0 0 10px' }}>
              {erros.length === 1 ? '1 atributo não elegível' : `${erros.length} atributos não elegíveis`} para "{novoStatus}"
            </p>
            {erros.map((e, i) => (
              <div key={i}>
                <p style={{ fontSize: '12px', fontWeight: '600', color: '#2C3A42', margin: '0 0 3px' }}>{e.nome}</p>
                <p style={{ fontSize: '11px', color: '#738290', margin: 0 }}>Campos em falta: {e.campos.map(c => LABEL_MAP[c] || c).join(', ')}</p>
              </div>
            ))}
          </div>
        )}
        <p style={{ fontSize: '11px', fontWeight: '600', color: '#738290', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>Novo Status</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
          {STATUS_ORDER.map(s => {
            const sc = STATUS_COLORS[s]
            const isSel = novoStatus === s
            return (
              <div key={s} onClick={() => { setNovoStatus(s); setErros([]) }}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', cursor: 'pointer', border: `1.5px solid ${isSel ? sc.color : '#E0E5EC'}`, background: isSel ? sc.bg : '#FFFFFF' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '50%', flexShrink: 0, border: `2px solid ${isSel ? sc.color : '#C8D0DA'}`, background: isSel ? sc.color : '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isSel && <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#FFFFFF' }} />}
                </div>
                <span style={{ fontSize: '13px', color: isSel ? sc.color : '#2C3A42', fontWeight: isSel ? '600' : '400' }}>{s}</span>
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: '8px', border: '1.5px solid #E0E5EC', background: '#FFFFFF', color: '#738290', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleSave} disabled={!novoStatus || saving} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: novoStatus ? '#A1B5D8' : '#E0E5EC', color: novoStatus ? '#FFFFFF' : '#B0BCC8', fontSize: '13px', fontWeight: '600', cursor: novoStatus ? 'pointer' : 'default' }}>
            {saving ? 'A guardar...' : 'Aplicar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Atributos({ produtoFilter = null }) {
  const { iniciativas, useCases, produtosDados } = useReferenceData()
  const [data, setData]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [filterDominio,    setFilterDominio]    = useState([])
  const [filterSubdominio, setFilterSubdominio] = useState([])
  const [filterSistema,    setFilterSistema]    = useState([])
  const [filterIniciativa, setFilterIniciativa] = useState([])
  const [filterUseCase,    setFilterUseCase]    = useState([])
  const [filterProduto,    setFilterProduto]    = useState([])
  const [filterStatus,     setFilterStatus]     = useState([])
  const [produtoUseCase,   setProdutoUseCase]   = useState([])   // produto_use_case (produto_dados_id, use_case_id)
  const [atributosIdsPorFiltro, setAtributosIdsPorFiltro] = useState(null)
  const [produtoAtrIds,    setProdutoAtrIds]    = useState(null) // ids do catálogo do produto (quando produtoFilter)
  const [selected,         setSelected]         = useState(new Set())
  const [modalOpen,        setModalOpen]        = useState(false)
  const [confirmDeleteOpen,setConfirmDeleteOpen]= useState(false)
  const [editingCell,      setEditingCell]      = useState(null)
  const [editValue,        setEditValue]        = useState('')
  // Grupos colapsados — por defeito DIT-Fonte (2) e DIT-Fabric (3) fechados
  const [collapsedGroups,  setCollapsedGroups]  = useState(new Set([2, 3]))
  const toggleGroup = (g) => setCollapsedGroups(prev => {
    const next = new Set(prev)
    next.has(g) ? next.delete(g) : next.add(g)
    return next
  })
  const topScrollRef = useRef(null)
  const tableWrapRef = useRef(null)

  const isProdutoMode = !!produtoFilter

  // Colunas visíveis de cada grupo. A DSG (0), quando colapsada, mantém as 2 primeiras colunas
  // (Nome atributo Gold + Descrição); os outros grupos colapsam por inteiro.
  const DSG_KEEP = 1 // nº de colunas da DSG que ficam visíveis quando colapsada
  const colsVisiveisDoGrupo = (gi) => {
    const cols = COLUMNS.filter(c => c.group === gi)
    if (!collapsedGroups.has(gi)) return cols
    if (gi === 0) return cols.slice(0, DSG_KEEP) // DSG colapsada → só as 2 primeiras
    return [] // outros grupos colapsados → nenhuma coluna (mostra só faixa estreita)
  }
  // Um grupo colapsado mostra faixa estreita com o toggle? (todos exceto DSG, que mantém colunas)
  const grupoMostraFaixa = (gi) => collapsedGroups.has(gi) && gi !== 0

  const visibleCols = GROUP_HEADERS.flatMap((g, gi) => colsVisiveisDoGrupo(gi))

  useEffect(() => {
    fetchData()
    if (!isProdutoMode) {
      supabase.from('produto_use_case').select('produto_dados_id, use_case_id').then(({ data }) => {
        if (data) setProdutoUseCase(data)
      })
    }
  }, [])

  // Modo produto — carregar os ids do catálogo associados ao produto
  useEffect(() => {
    if (!isProdutoMode) return
    supabase.from('d_ficha_atributos')
      .select('id_catalogo_atributo')
      .not('id_catalogo_atributo', 'is', null)
      .eq('produto_dados_id', produtoFilter)
      .then(({ data: rows }) => {
        setProdutoAtrIds([...new Set((rows || []).map(r => r.id_catalogo_atributo).filter(Boolean))])
      })
  }, [produtoFilter])

  const fetchData = async () => {
    setLoading(true)
    const { data: rows, error } = await supabase
      .from('d_catalogo_atributos')
      .select('*, d_sub_dominios(id, nome, dominio_id, d_dominios(id, nome))')
      .order('nome_atributo_gold')
    if (error) console.error('Atributos fetch error:', error)
    if (rows) setData(rows.map(r => ({
      ...r,
      nome_subdominio: r.d_sub_dominios?.nome || '—',
      nome_dominio:    r.d_sub_dominios?.d_dominios?.nome || '—',
    })))
    setLoading(false)
  }

  const dominioOptions    = [...new Set(data.map(r => r.nome_dominio).filter(d => d && d !== '—'))].sort()
  const subdominioOptions = [...new Set(data.filter(r => !filterDominio.length || filterDominio.includes(r.nome_dominio)).map(r => r.nome_subdominio).filter(d => d && d !== '—'))].sort()
  const sistemaOptions    = [...new Set(data.map(r => r.sistema_un).filter(Boolean))].sort()
  const statusOptions     = STATUS_ORDER.filter(s => data.some(r => r.status === s))

  // Opções restritas ao produto (modo produto) — só dos atributos associados ao produto
  const dadosProduto = isProdutoMode && produtoAtrIds ? data.filter(r => produtoAtrIds.includes(r.id)) : []
  const pDominioOptions    = [...new Set(dadosProduto.map(r => r.nome_dominio).filter(d => d && d !== '—'))].sort()
  const pSubdominioOptions = [...new Set(dadosProduto.filter(r => !filterDominio.length || filterDominio.includes(r.nome_dominio)).map(r => r.nome_subdominio).filter(d => d && d !== '—'))].sort()
  const pSistemaOptions    = [...new Set(dadosProduto.map(r => r.sistema_un).filter(Boolean))].sort()
  const pStatusOptions     = STATUS_ORDER.filter(s => dadosProduto.some(r => r.status === s))
  const iniciativaOptions = iniciativas.map(i => `${i.id_iniciativa} — ${i.nome_iniciativa}`)
  const ucsFiltrados      = filterIniciativa.length ? useCases.filter(uc => { const ini = iniciativas.find(i => i.id === uc.iniciativa_id); return ini && filterIniciativa.some(s => s.startsWith(ini.id_iniciativa + ' — ')) }) : useCases
  const useCaseOptions    = ucsFiltrados.map(uc => `${uc.id_use_case} — ${uc.nome_use_case}`)

  // Produtos filtrados pela cadeia iniciativa → use case
  const ucIdsSelecionados = filterUseCase.length
    ? useCases.filter(uc => filterUseCase.some(s => s.startsWith(uc.id_use_case + ' — '))).map(uc => uc.id)
    : (filterIniciativa.length ? ucsFiltrados.map(uc => uc.id) : null)

  const produtoIdsValidos = ucIdsSelecionados
    ? [...new Set(produtoUseCase.filter(p => ucIdsSelecionados.includes(p.use_case_id)).map(p => p.produto_dados_id))]
    : null

  const produtoOptions = (produtoIdsValidos
    ? produtosDados.filter(p => produtoIdsValidos.includes(p.id))
    : produtosDados
  ).map(p => p.nome_produto_dados).sort()

  useEffect(() => {
    const temFiltro = filterIniciativa.length || filterUseCase.length || filterProduto.length
    if (!temFiltro) { setAtributosIdsPorFiltro(null); return }

    // Resolver produto_dados_id alvo
    let produtoIds = null
    if (filterProduto.length) {
      produtoIds = produtosDados.filter(p => filterProduto.includes(p.nome_produto_dados)).map(p => p.id)
    } else if (produtoIdsValidos) {
      produtoIds = produtoIdsValidos
    }
    if (!produtoIds || produtoIds.length === 0) { setAtributosIdsPorFiltro([]); return }

    // produto → atributos do catálogo (ligação directa via produto_dados_id)
    supabase.from('d_ficha_atributos')
      .select('id_catalogo_atributo')
      .not('id_catalogo_atributo', 'is', null)
      .in('produto_dados_id', produtoIds)
      .then(({ data: rows }) => {
        setAtributosIdsPorFiltro([...new Set((rows || []).map(r => r.id_catalogo_atributo).filter(Boolean))])
      })
  }, [filterIniciativa, filterUseCase, filterProduto, produtoUseCase, produtosDados])

  const filtered = data.filter(r => {
    // Modo produto — só atributos do catálogo associados ao produto + filtros aplicáveis
    if (isProdutoMode) {
      if (produtoAtrIds === null) return false // ainda a carregar
      if (!produtoAtrIds.includes(r.id)) return false
      if (filterDominio.length    && !filterDominio.includes(r.nome_dominio))       return false
      if (filterSubdominio.length && !filterSubdominio.includes(r.nome_subdominio)) return false
      if (filterSistema.length    && !filterSistema.includes(r.sistema_un))         return false
      if (filterStatus.length     && !filterStatus.includes(r.status))              return false
      return true
    }
    if (filterDominio.length    && !filterDominio.includes(r.nome_dominio))       return false
    if (filterSubdominio.length && !filterSubdominio.includes(r.nome_subdominio)) return false
    if (filterSistema.length    && !filterSistema.includes(r.sistema_un))         return false
    if (filterStatus.length     && !filterStatus.includes(r.status))              return false
    if (atributosIdsPorFiltro !== null && !atributosIdsPorFiltro.includes(r.id))  return false
    return true
  })

  const allFilteredIds  = filtered.map(r => r.id)
  const allSelected     = allFilteredIds.length > 0 && allFilteredIds.every(id => selected.has(id))
  const someSelected    = allFilteredIds.some(id => selected.has(id))
  const selectedInFiltered = allFilteredIds.filter(id => selected.has(id))

  const [visibleCount, setVisibleCount] = useState(50)
  useEffect(() => { setVisibleCount(50) }, [filterDominio, filterSubdominio, filterSistema, filterIniciativa, filterUseCase, filterProduto, filterStatus, produtoFilter])
  const visible = filtered.slice(0, visibleCount)

  const toggleSelectAll = () => {
    if (allSelected) setSelected(prev => { const n = new Set(prev); allFilteredIds.forEach(id => n.delete(id)); return n })
    else             setSelected(prev => { const n = new Set(prev); allFilteredIds.forEach(id => n.add(id));    return n })
  }
  const toggleRow = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const handleModalSave = (novoStatus) => { setData(prev => prev.map(r => selected.has(r.id) ? { ...r, status: novoStatus } : r)); setSelected(new Set()); setModalOpen(false) }

  const eliminarSelecionados = async () => {
    const ids = [...selected].filter(id => allFilteredIds.includes(id))
    if (!ids.length) return
    const { error } = await supabase.from('d_catalogo_atributos').delete().in('id', ids)
    if (!error) { setData(prev => prev.filter(r => !ids.includes(r.id))); setSelected(new Set()) }
    setConfirmDeleteOpen(false)
  }

  const exportExcel = () => {
    const rows = data.filter(r => selected.has(r.id))
    const headers = ['Status', ...COLUMNS.map(c => c.label)]
    const csvContent = [headers, ...rows.map(r => [r.status || '', ...COLUMNS.map(c => r[c.key] ?? '')])]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `catalogo_atributos_${new Date().toISOString().slice(0,10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  // Edição inline
  const handleCellClick = (row, col) => {
    if (col.key === 'nome_dominio' || col.key === 'nome_subdominio') return
    setEditingCell({ id: row.id, key: col.key })
    setEditValue(row[col.key] ?? '')
  }

  const handleCellSave = async (id, key, value) => {
    setEditingCell(null)
    const clean = typeof value === 'string' && value.trim() === '' ? null : (typeof value === 'string' ? value.trim() : value)
    await supabase.from('d_catalogo_atributos').update({ [key]: clean }).eq('id', id)
    setData(prev => prev.map(r => r.id === id ? { ...r, [key]: clean } : r))
    // Propagar nome/descrição gold para todas as fichas
    if (key === 'nome_atributo_gold' || key === 'descricao_atributo_gold') {
      await supabase.from('d_ficha_atributos').update({ [key]: clean }).eq('id_catalogo_atributo', id)
    }
  }

  const hasFilters   = !!(filterDominio.length || filterSubdominio.length || filterSistema.length || filterIniciativa.length || filterUseCase.length || filterProduto.length || filterStatus.length)
  const clearFilters = () => { setFilterDominio([]); setFilterSubdominio([]); setFilterSistema([]); setFilterIniciativa([]); setFilterUseCase([]); setFilterProduto([]); setFilterStatus([]) }
  const syncScroll   = (src, tgt) => { if (tgt.current) tgt.current.scrollLeft = src.current.scrollLeft }
  const faixasCount = GROUP_HEADERS.filter((g, i) => grupoMostraFaixa(i)).length
  const totalWidth   = visibleCols.reduce((s, c) => s + parseInt(c.width), 0) + (faixasCount * 44) + 40 + 190

  return (
    <div style={{ padding: isProdutoMode ? 0 : '32px 36px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isProdutoMode ? '12px' : '20px' }}>
        {!isProdutoMode ? (
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#2C3A42', margin: 0 }}>Atributos</h1>
            <p style={{ fontSize: '13px', color: '#738290', margin: '4px 0 0' }}>Catálogo completo de atributos por camada (DSG, UN, DIT Fonte, DIT Fabric).</p>
          </div>
        ) : <div />}
        {selectedInFiltered.length > 0 && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={exportExcel} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 18px', borderRadius: '8px', border: '1.5px solid #A1B5D8', background: '#FFFFFF', color: '#5A7BA8', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
              onMouseEnter={e => e.currentTarget.style.background = '#EBF1FA'} onMouseLeave={e => e.currentTarget.style.background = '#FFFFFF'}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Exportar <span style={{ background: '#EBF1FA', borderRadius: '20px', padding: '1px 8px', fontSize: '11px', fontWeight: '700', color: '#5A7BA8' }}>{selectedInFiltered.length}</span>
            </button>
            <button onClick={() => setModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 18px', borderRadius: '8px', background: 'rgba(92,143,106,0.12)', color: '#2A6040', border: '1.5px solid rgba(92,143,106,0.35)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#5C8F6A'; e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.borderColor = '#5C8F6A' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(92,143,106,0.12)'; e.currentTarget.style.color = '#2A6040'; e.currentTarget.style.borderColor = 'rgba(92,143,106,0.35)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Gerir status da catalogação <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '20px', padding: '1px 8px', fontSize: '11px', fontWeight: '700' }}>{selectedInFiltered.length}</span>
            </button>
            <button onClick={() => setConfirmDeleteOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 18px', borderRadius: '8px', border: '1.5px solid #E8C8C6', background: 'rgba(192,84,76,0.08)', color: '#C0544C', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(192,84,76,0.15)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(192,84,76,0.08)'}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Eliminar <span style={{ background: 'rgba(192,84,76,0.15)', borderRadius: '20px', padding: '1px 8px', fontSize: '11px', fontWeight: '700', color: '#C0544C' }}>{selectedInFiltered.length}</span>
            </button>
          </div>
        )}
      </div>

      {!isProdutoMode ? (
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <MultiSelect options={dominioOptions} value={filterDominio} onChange={v => { setFilterDominio(v); setFilterSubdominio([]) }} placeholder="Domínio" />
        <MultiSelect options={subdominioOptions} value={filterSubdominio} onChange={setFilterSubdominio} placeholder="Sub Domínio" />
        <MultiSelect options={sistemaOptions} value={filterSistema} onChange={setFilterSistema} placeholder="Sistema UN" />
        <MultiSelect options={iniciativaOptions} value={filterIniciativa} onChange={v => { setFilterIniciativa(v); setFilterUseCase([]); setFilterProduto([]) }} placeholder="Iniciativa" />
        <MultiSelect options={useCaseOptions} value={filterUseCase} onChange={v => { setFilterUseCase(v); setFilterProduto([]) }} placeholder="Use Case" />
        <MultiSelect options={produtoOptions} value={filterProduto} onChange={setFilterProduto} placeholder="Produto de Dados" />
        <MultiSelect options={statusOptions} value={filterStatus} onChange={setFilterStatus} placeholder="Status" />
        {hasFilters && <button onClick={clearFilters} style={{ padding: '7px 14px', borderRadius: '8px', border: '1.5px solid #E0E5EC', background: '#FFFFFF', color: '#738290', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>Limpar filtros</button>}
      </div>
      ) : (
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <MultiSelect options={pSistemaOptions} value={filterSistema} onChange={setFilterSistema} placeholder="Sistema UN" />
        <MultiSelect options={pDominioOptions} value={filterDominio} onChange={v => { setFilterDominio(v); setFilterSubdominio([]) }} placeholder="Domínio" />
        <MultiSelect options={pSubdominioOptions} value={filterSubdominio} onChange={setFilterSubdominio} placeholder="Sub Domínio" />
        <MultiSelect options={pStatusOptions} value={filterStatus} onChange={setFilterStatus} placeholder="Status" />
        {(filterDominio.length || filterSubdominio.length || filterSistema.length || filterStatus.length) > 0 && <button onClick={() => { setFilterDominio([]); setFilterSubdominio([]); setFilterSistema([]); setFilterStatus([]) }} style={{ padding: '7px 14px', borderRadius: '8px', border: '1.5px solid #E0E5EC', background: '#FFFFFF', color: '#738290', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>Limpar filtros</button>}
      </div>
      )}

      {loading ? (
        <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '48px', textAlign: 'center', color: '#738290', fontSize: '13px' }}>A carregar dados...</div>
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
                  {GROUP_HEADERS.map((g, gi) => (
                    grupoMostraFaixa(gi)
                      ? <col key={`cg-${gi}`} style={{ width: '44px' }} />
                      : colsVisiveisDoGrupo(gi).map(col => <col key={col.key} style={{ width: col.width }} />)
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    {GROUP_HEADERS.map((g, i) => {
                      const isCollapsed = collapsedGroups.has(i)
                      const isFaixa = grupoMostraFaixa(i)  // colapsado E não-DSG → faixa estreita
                      const numCols = colsVisiveisDoGrupo(i).length
                      // colSpan: faixa estreita = 1; senão = nº de colunas visíveis (+2 fixas no grupo 0)
                      const colSpan = isFaixa ? 1 : (i === 0 ? numCols + 2 : numCols)
                      // O título mostra-se quando não é faixa (DSG colapsada parcial ainda mostra título)
                      const showLabel = !isFaixa
                      return (
                        <th key={i} colSpan={colSpan} title={isFaixa ? g.label : undefined}
                          style={{ padding: isFaixa ? '7px 4px' : '7px 14px', textAlign: isFaixa ? 'center' : 'left', fontSize: '10px', fontWeight: '700', color: g.color, background: g.bg, textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: `2px solid ${g.color}33`, borderRight: i < GROUP_HEADERS.length - 1 ? `2px solid ${g.color}33` : 'none', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', justifyContent: isFaixa ? 'center' : 'flex-start' }}>
                            <button onClick={() => toggleGroup(i)} title={isCollapsed ? 'Mostrar secção' : 'Esconder secção'}
                              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', borderRadius: '4px', border: 'none', background: 'transparent', cursor: 'pointer', color: g.color, flexShrink: 0, padding: 0 }}
                              onMouseEnter={e => e.currentTarget.style.background = `${g.color}22`}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              {isCollapsed ? (
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                              ) : (
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                              )}
                            </button>
                            {showLabel && g.label}
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                  <tr style={{ borderBottom: '1px solid #ECEEF2' }}>
                    <th style={{ width: '40px', padding: '9px 0', background: '#FFFFFF', textAlign: 'center' }}>
                      <input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected && !allSelected }} onChange={toggleSelectAll} style={{ cursor: 'pointer', accentColor: '#A1B5D8', margin: 0 }} />
                    </th>
                    <th style={{ width: '190px', padding: '9px 12px', background: '#FFFFFF', fontSize: '10px', fontWeight: '600', color: '#738290', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap', textAlign: 'left' }}>Status</th>
                    {GROUP_HEADERS.map((g, gi) => {
                      if (grupoMostraFaixa(gi)) {
                        return <th key={`sc-${gi}`} style={{ width: '44px', padding: '9px 0', background: '#FFFFFF', borderRight: gi < GROUP_HEADERS.length - 1 ? '2px solid #ECEEF2' : 'none' }} />
                      }
                      const groupCols = colsVisiveisDoGrupo(gi)
                      return groupCols.map((col, ci) => {
                        const isLastInGroup = ci === groupCols.length - 1
                        return (
                          <th key={col.key} style={{ padding: '9px 12px', textAlign: 'left', fontSize: '10px', fontWeight: '600', color: '#738290', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', background: '#FFFFFF', width: col.width, overflow: 'hidden', textOverflow: 'ellipsis', borderRight: isLastInGroup && gi < GROUP_HEADERS.length - 1 ? '2px solid #ECEEF2' : 'none' }}>
                            {col.label}
                          </th>
                        )
                      })
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={visibleCols.length + faixasCount + 2} style={{ padding: '48px 24px', textAlign: 'center', color: '#738290', fontSize: '13px' }}>Nenhum atributo encontrado.</td></tr>
                  )}
                  {visible.map((row, idx) => {
                    const isSelected = selected.has(row.id)
                    const rowBg = isSelected ? '#EBF1FA' : idx % 2 === 0 ? '#FFFFFF' : '#FAFBFC'
                    return (
                      <tr key={row.id} style={{ background: rowBg, transition: 'background 0.1s' }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F3F6FB' }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = idx % 2 === 0 ? '#FFFFFF' : '#FAFBFC' }}>
                        <td style={{ width: '40px', padding: '9px 0', textAlign: 'center' }}>
                          <input type="checkbox" checked={isSelected} onChange={() => toggleRow(row.id)} style={{ cursor: 'pointer', accentColor: '#A1B5D8', margin: 0 }} />
                        </td>
                        <td style={{ padding: '9px 12px', width: '190px' }}><StatusBadge status={row.status} /></td>
                        {GROUP_HEADERS.map((g, gi) => {
                          if (grupoMostraFaixa(gi)) {
                            return <td key={`cc-${gi}`} style={{ width: '44px', padding: '9px 0', borderRight: gi < GROUP_HEADERS.length - 1 ? '2px solid #ECEEF2' : 'none' }} />
                          }
                          const groupCols = colsVisiveisDoGrupo(gi)
                          return groupCols.map((col, ci) => {
                          const isLastInGroup = ci === groupCols.length - 1
                          const val = row[col.key]
                          const isFlag = FLAG_KEYS.includes(col.key)
                          const isNameCol = col.key === 'nome_atributo_gold'
                          const isNonEditable = col.key === 'nome_dominio' || col.key === 'nome_subdominio'
                          const isEditing = editingCell?.id === row.id && editingCell?.key === col.key
                          return (
                            <td key={col.key}
                              title={!isEditing && typeof val === 'string' && val.length > 30 ? val : undefined}
                              onClick={() => !isEditing && handleCellClick(row, col)}
                              style={{ padding: isEditing ? '4px 6px' : '9px 12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: isEditing ? 'normal' : 'nowrap', color: isNameCol ? '#2C3A42' : '#4A5568', fontWeight: isNameCol ? '600' : '400', borderRight: isLastInGroup && gi < GROUP_HEADERS.length - 1 ? '2px solid #ECEEF2' : 'none', cursor: isNonEditable ? 'default' : 'text' }}>
                              {isEditing ? (
                                isFlag ? (
                                  <select autoFocus style={{ padding: '4px 6px', borderRadius: '6px', border: '1.5px solid #A1B5D8', fontSize: '12px', color: '#2C3A42', background: '#FFFFFF', fontFamily: 'Inter, sans-serif', width: '100%' }}
                                    value={editValue} onChange={e => setEditValue(e.target.value)}
                                    onBlur={() => handleCellSave(row.id, col.key, editValue)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleCellSave(row.id, col.key, editValue); if (e.key === 'Escape') setEditingCell(null) }}>
                                    <option value="">—</option><option value="S">S</option><option value="N">N</option>
                                  </select>
                                ) : (
                                  <input autoFocus style={{ padding: '4px 6px', borderRadius: '6px', border: '1.5px solid #A1B5D8', fontSize: '12px', color: '#2C3A42', background: '#FFFFFF', fontFamily: 'Inter, sans-serif', width: '100%', boxSizing: 'border-box' }}
                                    value={editValue} onChange={e => setEditValue(e.target.value)}
                                    onBlur={() => handleCellSave(row.id, col.key, editValue)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleCellSave(row.id, col.key, editValue); if (e.key === 'Escape') setEditingCell(null) }} />
                                )
                              ) : isFlag ? <FlagBadge value={val} /> : (val ?? <span style={{ color: '#D0D8E0' }}>—</span>)}
                            </td>
                          )
                        })
                        })}
                      </tr>
                    )
                  })}
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
          <p style={{ fontSize: '11px', color: '#B0BCC8', marginTop: '8px' }}>
            A mostrar {visible.length} de {filtered.length} atributo{filtered.length !== 1 ? 's' : ''} {hasFilters ? 'filtrados' : 'no catálogo'}
            {selectedInFiltered.length > 0 && ` · ${selectedInFiltered.length} seleccionado${selectedInFiltered.length !== 1 ? 's' : ''}`}
          </p>
        </>
      )}

      {modalOpen && <GerirStatusModal selected={[...selected]} data={data} onClose={() => setModalOpen(false)} onSave={handleModalSave} />}

      {confirmDeleteOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(44,58,66,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '28px 32px', width: '420px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#2C3A42', margin: '0 0 12px' }}>Eliminar atributos</h3>
            <p style={{ fontSize: '13px', color: '#4A5568', margin: '0 0 8px', lineHeight: '1.6' }}>Tens a certeza que queres eliminar <strong style={{ color: '#C0544C' }}>{selectedInFiltered.length} atributo{selectedInFiltered.length !== 1 ? 's' : ''}</strong> do catálogo?</p>
            <p style={{ fontSize: '12px', color: '#738290', margin: '0 0 24px', lineHeight: '1.6' }}>Esta acção não pode ser revertida. Os atributos eliminados deixarão de estar disponíveis no catálogo e nas Fichas Técnicas.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDeleteOpen(false)} style={{ padding: '8px 18px', borderRadius: '8px', border: '1.5px solid #E0E5EC', background: '#FFFFFF', color: '#738290', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={eliminarSelecionados} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#C0544C', color: '#FFFFFF', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}