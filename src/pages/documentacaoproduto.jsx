import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useReferenceData } from '../context/referencedatacontext'
import { CadernoDetalhe } from './cadernorequisitos'
import Atributos from './atributos'

const STATUS_ORDER = [
  'A aguardar submissão pela BS', 'Por iniciar (DSG)', 'Levantamento de requisitos (DSG)',
  'Ingestão (DIT)', 'Desenvolvimento (DSG)', 'Validação dos Dados (BO)',
  'Bloqueado (DSG)', 'Bloqueado (DIT)', 'Bloqueado (BS)', 'Entrega parcial', 'Entregue',
]

const MILESTONES = [
  { key: 'submissao',      label: 'Submissão do formulário',           statuses: ['A aguardar submissão pela BS'] },
  { key: 'por_iniciar',    label: 'Por iniciar DSG',                   statuses: ['Por iniciar (DSG)'] },
  { key: 'levantamento',   label: 'Levantamento de requisitos DSG',    statuses: ['Levantamento de requisitos (DSG)'] },
  { key: 'ingestao',       label: 'Ingestão DIT',                      statuses: ['Ingestão (DIT)'] },
  { key: 'desenvolvimento',label: 'Desenvolvimento Data Engineer DSG', statuses: ['Desenvolvimento (DSG)'] },
  { key: 'validacao',      label: 'Validação de dados',                statuses: ['Validação dos Dados (BO)'] },
  { key: 'entregue',       label: 'Entregue',                          statuses: ['Entregue', 'Entrega parcial'] },
]

// Status que avança o fluxo (índice do milestone "atual" a partir do status corrente)
const STATUS_TO_MILESTONE = {
  'A aguardar submissão pela BS':     0,
  'Por iniciar (DSG)':                1,
  'Levantamento de requisitos (DSG)': 2,
  'Ingestão (DIT)':                   3,
  'Desenvolvimento (DSG)':            4,
  'Validação dos Dados (BO)':         5,
  'Entrega parcial':                  6,
  'Entregue':                         6,
}

function milestoneIndexFromStatus(status) {
  if (!status) return -1
  return STATUS_TO_MILESTONE[status] ?? -1
}

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

const SECOES_COMPLETUDE = [
  { key: 'un',     label: 'Mapeamento Sistema Fonte UN',  campos: ['sistema_un', 'tabela_un', 'nome_atributo_un', 'descricao_atributo_un', 'tipologia_atributo'] },
  { key: 'dit',    label: 'Mapeamento Sistema Fonte DIT', campos: ['sistema_fonte_dit', 'tabela_fonte_dit', 'nome_atributo_fonte_dit'] },
  { key: 'fabric', label: 'Ingestão Fabric DIT',          campos: ['campo_em_fabric', 'sistema_ingerido_fabric', 'tabela_fabric_dit', 'nome_atributo_fabric_dit'] },
]

// ─── Ponto pulsante (estado em curso) ───────────────────────────────────────────
const PULSE_CSS = `
@keyframes docPulse {
  0%   { transform: scale(0.9); opacity: 1; }
  70%  { transform: scale(2.2); opacity: 0; }
  100% { transform: scale(2.2); opacity: 0; }
}`
function PulsingDot({ color = '#5A7BA8' }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '10px', height: '10px' }}>
      <span style={{ position: 'absolute', width: '10px', height: '10px', borderRadius: '50%', background: color, opacity: 0.4, animation: 'docPulse 1.8s ease-out infinite' }} />
      <span style={{ position: 'relative', width: '8px', height: '8px', borderRadius: '50%', background: color }} />
    </span>
  )
}

// ─── Campo editável (lista esquerda) ────────────────────────────────────────────
function CampoEditavel({ label, value, onSave, multiline = false, options = null, displayValue = null }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value || '')
  useEffect(() => { setVal(value || '') }, [value])

  const commit = () => { setEditing(false); if (val !== (value || '')) onSave(val) }

  const inputStyle = { width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1.5px solid #A1B5D8', fontSize: '12px', color: '#2C3A42', background: '#FFFFFF', outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '9px 0', borderBottom: '1px solid #F2F4F7' }}>
      <span style={{ fontSize: '9px', fontWeight: '600', color: '#A1AAB5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      {editing ? (
        options ? (
          <select autoFocus style={inputStyle} value={val} onChange={e => setVal(e.target.value)} onBlur={commit}>
            <option value="">—</option>
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : multiline ? (
          <textarea autoFocus style={{ ...inputStyle, resize: 'vertical', minHeight: '48px' }} value={val} onChange={e => setVal(e.target.value)} onBlur={commit} />
        ) : (
          <input autoFocus style={inputStyle} value={val} onChange={e => setVal(e.target.value)} onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter') commit() }} />
        )
      ) : (
        <span onClick={() => setEditing(true)}
          style={{ fontSize: '12.5px', color: (displayValue || value) ? '#2C3A42' : '#C8D0DA', fontWeight: '400', cursor: 'text', minHeight: '17px', borderRadius: '4px', padding: '1px 3px', margin: '-1px -3px', transition: 'background 0.1s' }}
          onMouseEnter={e => e.currentTarget.style.background = '#F5F8FC'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          {displayValue || value || '—'}
        </span>
      )}
    </div>
  )
}

function fmtData(d) {
  if (!d) return null
  try { return new Date(d).toLocaleDateString('pt-PT') } catch { return d }
}

// Célula editável da tabela de registos (texto, data ou textarea)
function RegistoCell({ value, tipo = 'text', onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value || '')
  useEffect(() => { setVal(value || '') }, [value])

  const commit = () => { setEditing(false); if ((val || '') !== (value || '')) onSave(val.trim() === '' ? null : val) }

  const inputStyle = { width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1.5px solid #A1B5D8', fontSize: '12px', color: '#2C3A42', background: '#FFFFFF', outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }
  const display = tipo === 'date' ? (fmtData(value) || '—') : (value || '—')

  if (editing) {
    if (tipo === 'textarea') {
      return <textarea autoFocus style={{ ...inputStyle, resize: 'vertical', minHeight: '48px' }} value={val} onChange={e => setVal(e.target.value)} onBlur={commit} />
    }
    return <input autoFocus type={tipo === 'date' ? 'date' : 'text'} style={inputStyle} value={val} onChange={e => setVal(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter' && tipo !== 'textarea') commit() }} />
  }
  return (
    <span onClick={() => setEditing(true)}
      style={{ display: 'inline-block', minWidth: '40px', minHeight: '17px', color: value ? '#4A5568' : '#C8D0DA', cursor: 'text', borderRadius: '4px', padding: '2px 5px', margin: '-2px -5px', transition: 'background 0.1s' }}
      onMouseEnter={e => e.currentTarget.style.background = '#F5F8FC'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      {display}
    </span>
  )
}

// ─── Página ──────────────────────────────────────────────────────────────────────
export default function DocumentacaoProduto({ produto, onBack }) {
  const { enumeracoes, dominios } = useReferenceData()
  const [aba, setAba] = useState('geral')
  const [status, setStatus] = useState(produto?.status || '')
  const [dados, setDados] = useState(null)
  const [atributos, setAtributos] = useState([])
  const [registos, setRegistos] = useState([])
  const [visibleRegistos, setVisibleRegistos] = useState(50)
  const [numIniciativas, setNumIniciativas] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusPopup, setStatusPopup] = useState(null) // novo status pendente de confirmação
  const [obs, setObs] = useState('')

  const statusOpts    = enumeracoes?.status_produto || STATUS_ORDER
  const tipologiaOpts = enumeracoes?.tipologia || ['Dimensão', 'Facto', 'Métrica', 'KPI', 'Relatório']

  useEffect(() => { if (produto?.id) fetchTudo() }, [produto?.id])

  const fetchTudo = async () => {
    setLoading(true)
    const { data: prod } = await supabase.from('d_produtos_dados').select('*, d_dominios(nome)').eq('id', produto.id).single()
    if (prod) { setDados({ ...prod, dominio_nome: prod.d_dominios?.nome || null }); setStatus(prod.status || '') }

    const { data: atrs } = await supabase
      .from('d_ficha_atributos')
      .select('id, id_catalogo_atributo, d_catalogo_atributos(*)')
      .eq('produto_dados_id', produto.id)
    setAtributos(atrs || [])

    // Nº de iniciativas associadas (via produto_use_case → use_case → iniciativa)
    const { data: pucs } = await supabase
      .from('produto_use_case')
      .select('use_case_id, d_use_cases(iniciativa_id)')
      .eq('produto_dados_id', produto.id)
    const iniIds = new Set((pucs || []).map(p => p.d_use_cases?.iniciativa_id).filter(Boolean))
    setNumIniciativas(iniIds.size)

    await fetchRegistos()
    setLoading(false)
  }

  const fetchRegistos = async () => {
    const { data } = await supabase.from('registo_alteracoes').select('*').eq('produto_id', produto.id).order('id_alteracao', { ascending: false })
    setRegistos(data || [])
  }

  // Guardar campo da informação geral
  const saveCampo = async (campo, valor) => {
    const v = valor?.trim() === '' ? null : valor
    setDados(prev => ({ ...prev, [campo]: v }))
    await supabase.from('d_produtos_dados').update({ [campo]: v }).eq('id', produto.id)
  }

  // Guardar campo editável de um registo de alteração
  const saveRegisto = async (registoId, campo, valor) => {
    setRegistos(prev => prev.map(r => r.id === registoId ? { ...r, [campo]: valor } : r))
    await supabase.from('registo_alteracoes').update({ [campo]: valor }).eq('id', registoId)
  }
  const saveDominio = async (dominioId) => {
    const dom = dominios.find(d => d.id === dominioId)
    setDados(prev => ({ ...prev, dominio_id: dominioId || null, dominio_nome: dom?.nome || null }))
    await supabase.from('d_produtos_dados').update({ dominio_id: dominioId || null }).eq('id', produto.id)
  }

  // Mudança de status → popup
  const pedirMudancaStatus = (novo) => { setStatusPopup(novo); setObs('') }
  const confirmarStatus = async () => {
    const novo = statusPopup
    const hoje = new Date().toISOString().slice(0, 10)
    setStatus(novo)
    setDados(prev => prev ? { ...prev, status: novo } : prev)
    await supabase.from('d_produtos_dados').update({ status: novo }).eq('id', produto.id)

    // Fechar o registo anterior em aberto (data_conclusao = hoje)
    const registoAberto = registos.find(r => !r.data_conclusao)
    if (registoAberto) {
      await supabase.from('registo_alteracoes').update({ data_conclusao: hoje }).eq('id', registoAberto.id)
    }

    // Criar o novo registo (em curso — sem data de conclusão)
    await supabase.from('registo_alteracoes').insert([{
      produto_id: produto.id, status: novo,
      data_inicio: hoje,
      observacoes: obs.trim() || null,
    }])
    setStatusPopup(null); setObs('')
    await fetchRegistos()
  }

  const completude = SECOES_COMPLETUDE.map(sec => {
    const preenchidos = atributos.filter(a => {
      const cat = a.d_catalogo_atributos
      if (!cat) return false
      return sec.campos.every(c => cat[c] && String(cat[c]).trim() !== '')
    }).length
    const total = atributos.length
    return { ...sec, preenchidos, total, pct: total > 0 ? Math.round((preenchidos / total) * 100) : 0 }
  })

  // Nº de sistemas UN distintos
  const numSistemasUN = new Set(
    atributos.map(a => a.d_catalogo_atributos?.sistema_un).filter(s => s && String(s).trim() !== '')
  ).size

  const isBlocked  = status?.startsWith('Bloqueado')
  const currentIdx = isBlocked ? -1 : milestoneIndexFromStatus(status)
  const sc = STATUS_COLORS[status] || { bg: 'rgba(115,130,144,0.12)', color: '#738290' }

  // Data por milestone: data_conclusao (fim de cada fase). 
  // O último (Entregue) não é "fechado" por transição seguinte → usa data_inicio.
  const dataPorMilestone = MILESTONES.map((m, idx) => {
    const isUltimo = idx === MILESTONES.length - 1
    const campo = isUltimo ? 'data_inicio' : 'data_conclusao'
    const datas = registos
      .filter(r => m.statuses.includes(r.status) && r[campo])
      .map(r => r[campo])
      .sort()
    return datas.length ? datas[datas.length - 1] : null
  })

  // Info de bloqueio: data máxima de criação + observação do último registo bloqueado
  const registosBloqueio = registos.filter(r => r.status?.startsWith('Bloqueado'))
  const dataBloqueio = registosBloqueio.length
    ? registosBloqueio.map(r => r.data_inicio).filter(Boolean).sort().slice(-1)[0]
    : null
  const obsBloqueio = registosBloqueio.length ? registosBloqueio[0].observacoes : null

  if (!produto) return null

  return (
    <div style={{ padding: '20px 28px', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: '18px' }}>
        <button onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#738290', fontSize: '12px', fontWeight: '500', cursor: 'pointer', padding: 0, marginBottom: '10px', fontFamily: 'Inter, sans-serif' }}
          onMouseEnter={e => e.currentTarget.style.color = '#2C3A42'}
          onMouseLeave={e => e.currentTarget.style.color = '#738290'}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Voltar
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0 }}>
            <span style={{ flexShrink: 0, background: 'rgba(161,181,216,0.18)', color: '#5A7BA8', borderRadius: '7px', padding: '4px 11px', fontSize: '12.5px', fontWeight: '700' }}>
              {dados?.id_produto_dados || produto.id_produto_dados}
            </span>
            <h1 style={{ fontSize: '19px', fontWeight: '700', color: '#2C3A42', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {dados?.nome_produto_dados || produto.nome_produto_dados}
            </h1>
          </div>

          {/* Toggles — canto superior direito */}
          <div style={{ display: 'flex', background: '#F0F2F5', borderRadius: '9px', padding: '3px', width: 'fit-content', flexShrink: 0 }}>
            {[
              { id: 'geral',        label: 'Informação Geral' },
              { id: 'levantamento', label: 'Levantamento Alto Nível' },
              { id: 'ficha',        label: 'Ficha Técnica de Atributos' },
            ].map(t => (
              <button key={t.id} onClick={() => setAba(t.id)}
                style={{ padding: '8px 16px', borderRadius: '7px', border: 'none', background: aba === t.id ? '#FFFFFF' : 'transparent', color: aba === t.id ? '#2C3A42' : '#738290', fontSize: '12.5px', fontWeight: aba === t.id ? '600' : '500', cursor: 'pointer', fontFamily: 'Inter, sans-serif', boxShadow: aba === t.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', whiteSpace: 'nowrap' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '40px', textAlign: 'center', color: '#738290', fontSize: '13px' }}>A carregar...</div>
      ) : (
        <>
          {aba === 'geral' && (
            <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', alignItems: 'start' }}>
              {/* ESQUERDA */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '20px 24px' }}>
                  <h2 style={{ fontSize: '11px', fontWeight: '700', color: '#A1AAB5', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 6px' }}>Informação Geral</h2>

                  {/* Estado do produto — destacado, em primeiro */}
                  <div style={{ padding: '12px 0 14px', borderBottom: '1px solid #F2F4F7', marginBottom: '2px' }}>
                    <span style={{ fontSize: '9px', fontWeight: '700', color: '#5A7BA8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>Estado do Produto de Dados</span>
                    <select value={status} onChange={e => pedirMudancaStatus(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #E0E5EC', background: '#FFFFFF', fontSize: '13px', fontWeight: '600', color: '#2C3A42', cursor: 'pointer', fontFamily: 'Inter, sans-serif', outline: 'none' }}>
                      {statusOpts.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <CampoEditavel label="ID Produto Dados"     value={dados?.id_produto_dados}   onSave={v => saveCampo('id_produto_dados', v)} />
                  <CampoEditavel label="Nome"                 value={dados?.nome_produto_dados} onSave={v => saveCampo('nome_produto_dados', v)} />
                  <CampoEditavel label="Descrição"            value={dados?.descricao}          onSave={v => saveCampo('descricao', v)} multiline />
                  <CampoEditavel label="Domínio"              value={dados?.dominio_id || ''}   displayValue={dados?.dominio_nome}
                    options={dominios.map(d => ({ value: d.id, label: d.nome }))} onSave={saveDominio} />
                  <CampoEditavel label="Tipologia"            value={dados?.tipologia || ''}    displayValue={dados?.tipologia}
                    options={tipologiaOpts.map(t => ({ value: t, label: t }))} onSave={v => saveCampo('tipologia', v)} />
                  <CampoEditavel label="Localização (Fabric)" value={dados?.localizacao_fabric} onSave={v => saveCampo('localizacao_fabric', v)} />
                  <CampoEditavel label="Filtros"              value={dados?.filtros}            onSave={v => saveCampo('filtros', v)} multiline />
                  <CampoEditavel label="Histórico"            value={dados?.historico}          onSave={v => saveCampo('historico', v)} multiline />
                  <CampoEditavel label="Frequência"           value={dados?.frequencia}         onSave={v => saveCampo('frequencia', v)} />
                  <CampoEditavel label="Volumes"              value={dados?.volumes}            onSave={v => saveCampo('volumes', v)} />
                </div>
              </div>

              {/* DIREITA */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Estado do Provisionamento — timeline */}
                <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '22px 26px' }}>
                  <style>{PULSE_CSS}</style>
                  <h2 style={{ fontSize: '11px', fontWeight: '700', color: '#A1AAB5', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 16px' }}>Estado do Provisionamento</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {MILESTONES.map((m, idx) => {
                      const isEntregueFinal = (status === 'Entregue' || status === 'Entrega parcial')
                      const done    = !isBlocked && (idx < currentIdx || (isEntregueFinal && idx === currentIdx))
                      const current = !isBlocked && idx === currentIdx && !done
                      const dataConcl = dataPorMilestone[idx]
                      return (
                        <div key={m.key} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          {/* Marcador */}
                          <div style={{ flexShrink: 0, width: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {done ? (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5C8F6A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            ) : current ? (
                              <PulsingDot color="#5A7BA8" />
                            ) : (
                              <span style={{ width: '9px', height: '9px', borderRadius: '50%', border: '1.5px solid #DDE3EA', background: '#FFFFFF', boxSizing: 'border-box' }} />
                            )}
                          </div>
                          {/* Conteúdo */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flexWrap: 'wrap' }}>
                            {done ? (
                              <>
                                <span style={{ background: 'rgba(92,143,106,0.12)', color: '#2A6040', borderRadius: '20px', padding: '3px 11px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>{m.label}</span>
                                {dataConcl && <span style={{ fontSize: '10.5px', color: '#A1AAB5', fontWeight: '500' }}>{fmtData(dataConcl)}</span>}
                              </>
                            ) : current ? (
                              <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#5A7BA8' }}>{m.label}</span>
                            ) : (
                              <span style={{ fontSize: '12.5px', fontWeight: '400', color: '#C2C9D2' }}>{m.label}</span>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {/* Bloqueado — em último, com data e observação (único com traço) */}
                    {isBlocked && (
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: '14px' }}>
                          <span style={{ marginTop: '4px', width: '10px', height: '10px', borderRadius: '50%', background: '#C0544C' }} />
                          {obsBloqueio && <div style={{ width: '1.5px', flex: 1, minHeight: '16px', background: '#ECEEF2', marginTop: '4px' }} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <span style={{ background: 'rgba(192,84,76,0.10)', color: '#C0544C', borderRadius: '20px', padding: '3px 11px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>{status}</span>
                            {dataBloqueio && <span style={{ fontSize: '10.5px', color: '#A1AAB5', fontWeight: '500' }}>{fmtData(dataBloqueio)}</span>}
                          </div>
                          {obsBloqueio && <p style={{ fontSize: '11.5px', color: '#738290', margin: '6px 0 0', lineHeight: '1.5' }}>{obsBloqueio}</p>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dashboard de atributos */}
                <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '22px 26px' }}>
                  {/* 3 métricas */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    {[
                      { valor: atributos.length, label: 'Nº Atributos Levantados' },
                      { valor: numSistemasUN,    label: 'Nº Sistemas UN' },
                      { valor: numIniciativas,   label: 'Nº Iniciativas Associadas' },
                    ].map((m, i) => (
                      <div key={i}>
                        <div style={{ fontSize: '10px', fontWeight: '600', color: '#A1AAB5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', lineHeight: '1.3' }}>{m.label}</div>
                        <div style={{ fontSize: '26px', fontWeight: '700', color: '#8A95A1', lineHeight: 1 }}>{m.valor}</div>
                      </div>
                    ))}
                  </div>

                  {/* Barras de completude */}
                  <h2 style={{ fontSize: '11px', fontWeight: '700', color: '#A1AAB5', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 14px' }}>Completude dos Atributos por Fase</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {completude.map(sec => {
                      const completo = sec.total > 0 && sec.pct === 100
                      return (
                        <div key={sec.key}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                            <span style={{ fontSize: '11.5px', fontWeight: '600', color: '#4A5568' }}>{sec.label}</span>
                            <span style={{ fontSize: '10.5px', fontWeight: '600', color: completo ? '#2A6040' : '#738290', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              {sec.pct}% ({sec.preenchidos}/{sec.total})
                              {completo && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#5C8F6A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                              )}
                            </span>
                          </div>
                          <div style={{ height: '7px', background: '#E8EDF3', borderRadius: '20px', overflow: 'hidden' }}>
                            <div style={{ width: `${sec.pct}%`, height: '100%', background: '#5C8F6A', borderRadius: '20px', transition: 'width 0.3s' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabela completa de Registo de Alterações — largura toda */}
            <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginTop: '18px', overflow: 'hidden' }}>
              <div style={{ padding: '18px 24px 12px' }}>
                <h2 style={{ fontSize: '11px', fontWeight: '700', color: '#A1AAB5', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>Registo de Alterações</h2>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: '#2C3A42', fontFamily: 'Inter, sans-serif' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #ECEEF2' }}>
                      {['ID Registo', 'Status', 'Quem', 'Data Início', 'Data Conclusão', 'Observações'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '10px', fontWeight: '600', color: '#738290', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', background: '#FAFBFC' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {registos.length === 0 ? (
                      <tr><td colSpan={6} style={{ padding: '40px 24px', textAlign: 'center', color: '#B0BCC8', fontSize: '13px' }}>Sem registos de alteração.</td></tr>
                    ) : (
                      registos.slice(0, visibleRegistos).map((r, idx) => {
                        const rc = STATUS_COLORS[r.status] || { bg: 'rgba(115,130,144,0.12)', color: '#738290' }
                        return (
                          <tr key={r.id} style={{ background: idx % 2 === 0 ? '#FFFFFF' : '#FAFBFC', borderBottom: '1px solid #F2F4F7' }}>
                            <td style={{ padding: '10px 16px', color: '#738290', fontWeight: '600', whiteSpace: 'nowrap' }}>{r.id_alteracao ?? '—'}</td>
                            <td style={{ padding: '10px 16px' }}>
                              <span style={{ background: rc.bg, color: rc.color, borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' }}>{r.status}</span>
                            </td>
                            <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                              <RegistoCell value={r.quem} tipo="text" onSave={v => saveRegisto(r.id, 'quem', v)} />
                            </td>
                            <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                              <RegistoCell value={r.data_inicio} tipo="date" onSave={v => saveRegisto(r.id, 'data_inicio', v)} />
                            </td>
                            <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                              <RegistoCell value={r.data_conclusao} tipo="date" onSave={v => saveRegisto(r.id, 'data_conclusao', v)} />
                            </td>
                            <td style={{ padding: '10px 16px', maxWidth: '320px' }}>
                              <RegistoCell value={r.observacoes} tipo="textarea" onSave={v => saveRegisto(r.id, 'observacoes', v)} />
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {registos.length > visibleRegistos && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '14px' }}>
                  <button onClick={() => setVisibleRegistos(c => c + 50)}
                    style={{ padding: '9px 20px', borderRadius: '8px', border: '1.5px solid #E0E5EC', background: '#FFFFFF', color: '#5A7BA8', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F5F8FC'}
                    onMouseLeave={e => e.currentTarget.style.background = '#FFFFFF'}>
                    Mostrar mais ({registos.length - visibleRegistos} restantes)
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {aba === 'levantamento' && (
          <CadernoDetalhe
            caderno={{ produto_dados_id: produto.id, produto_nome: dados?.nome_produto_dados, id_produto_dados: dados?.id_produto_dados }}
            modo="levantamento"
            onUpdate={fetchTudo}
            onDelete={() => {}}
            produtosDados={[]}
          />
        )}

        {aba === 'ficha' && (
          <Atributos produtoFilter={produto.id} />
        )}
      </>
      )}

      {/* Popup de mudança de status */}
      {statusPopup && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(44,58,66,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '26px 30px', width: '440px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#2C3A42', margin: '0 0 6px' }}>Registar alteração de status</h3>
            <p style={{ fontSize: '12.5px', color: '#738290', margin: '0 0 18px', lineHeight: '1.5' }}>
              O status vai mudar para <strong style={{ color: (STATUS_COLORS[statusPopup]?.color || '#2C3A42') }}>{statusPopup}</strong>. Adiciona uma observação (opcional).
            </p>
            <textarea value={obs} onChange={e => setObs(e.target.value)} placeholder="Observações sobre esta alteração..."
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #E0E5EC', fontSize: '13px', color: '#2C3A42', background: '#FFFFFF', outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box', resize: 'vertical', minHeight: '70px' }} />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => { setStatusPopup(null); setObs('') }} style={{ padding: '8px 18px', borderRadius: '8px', border: '1.5px solid #E0E5EC', background: '#FFFFFF', color: '#738290', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={confirmarStatus} style={{ padding: '8px 18px', borderRadius: '8px', border: '1.5px solid rgba(92,143,106,0.35)', background: 'rgba(92,143,106,0.12)', color: '#2A6040', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#5C8F6A'; e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.borderColor = '#5C8F6A' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(92,143,106,0.12)'; e.currentTarget.style.color = '#2A6040'; e.currentTarget.style.borderColor = 'rgba(92,143,106,0.35)' }}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}