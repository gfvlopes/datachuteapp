import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useReferenceData } from '../context/referencedatacontext'
import MultiSelect from '../components/multiselect'

const UC_STATUS_COLORS = {
  'Sem produto de dados':        { bg: 'rgba(115,130,144,0.10)', color: '#9AA5AE' },
  'Aguarda submissão pela BS':   { bg: 'rgba(115,130,144,0.12)', color: '#738290' },
  'Por iniciar':                 { bg: 'rgba(168,181,192,0.18)', color: '#65737E' },
  'Em curso':                    { bg: 'rgba(201,151,74,0.15)',  color: '#9A6E20' },
  'Com bloqueios':               { bg: 'rgba(192,84,76,0.12)',   color: '#C0544C' },
  'Entregue':                    { bg: 'rgba(92,143,106,0.2)',   color: '#2A6040' },
}

function StatusBadge({ status }) {
  const s = UC_STATUS_COLORS[status] || { bg: 'rgba(115,130,144,0.12)', color: '#738290' }
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

function computeIniciativaStatus(ucStatuses) {
  if (ucStatuses.length === 0) return 'Sem produto de dados'
  if (ucStatuses.every(s => s === 'Sem produto de dados')) return 'Sem produto de dados'
  if (ucStatuses.every(s => s === 'Aguarda submissão pela BS' || s === 'Sem produto de dados')) return 'Aguarda submissão pela BS'
  if (ucStatuses.every(s => s === 'Por iniciar' || s === 'Aguarda submissão pela BS' || s === 'Sem produto de dados')) return 'Por iniciar'
  if (ucStatuses.every(s => s === 'Entregue')) return 'Entregue'
  if (ucStatuses.some(s => s === 'Com bloqueios')) return 'Com bloqueios'
  return 'Em curso'
}

const ChevronIcon = ({ expanded }) => (
  <svg
    width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transition: 'transform 0.2s', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

const INICIATIVA_COLUMNS = [
  { key: 'expand',          label: '',          width: '36px'  },
  { key: 'dominio_nome',    label: 'Domínio',   width: '200px' },
  { key: 'iniciativa',      label: 'Iniciativa', width: '360px' },
  { key: 'ini_status',      label: 'Status',    width: '200px' },
  { key: 'ucs_entregues',   label: 'Use Case Entregues', width: '200px' },
  { key: 'acao',            label: '',          width: '120px' },
]

// ─── Modal Criar Iniciativa ────────────────────────────────────────────────────
function CriarIniciativaModal({ onClose, onSave, dominios, iniciativa }) {
  const isEdit = !!iniciativa
  const [idIniciativa, setIdIniciativa] = useState(iniciativa?.id_iniciativa || '')
  const [nome, setNome]         = useState(iniciativa?.nome_iniciativa || '')
  const [dominioId, setDominioId] = useState('')
  const [saving, setSaving]     = useState(false)
  const [erro, setErro]         = useState('')

  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #E0E5EC', fontSize: '13px', color: '#2C3A42', background: '#FFFFFF', outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }
  const labelStyle = { fontSize: '11px', fontWeight: '600', color: '#738290', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }

  const handleSubmit = async () => {
    if (!idIniciativa.trim()) { setErro('O ID da iniciativa é obrigatório.'); return }
    if (!nome.trim())  { setErro('O nome da iniciativa é obrigatório.'); return }
    if (!isEdit && !dominioId) { setErro('Selecciona um domínio.'); return }
    setSaving(true); setErro('')

    if (isEdit) {
      // Editar — só ID e nome (domínio não muda)
      const { error } = await supabase.from('d_iniciativas').update({
        id_iniciativa:   idIniciativa.trim(),
        nome_iniciativa: nome.trim(),
      }).eq('id', iniciativa.id)
      setSaving(false)
      if (error) { setErro(error.message); return }
    } else {
      const { error } = await supabase.from('d_iniciativas').insert([{
        id_iniciativa:   idIniciativa.trim(),
        nome_iniciativa: nome.trim(),
        dominio_id:      dominioId,
      }])
      setSaving(false)
      if (error) { setErro(error.message); return }
    }
    onSave()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(44,58,66,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '28px 32px', width: '480px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#2C3A42', margin: '0 0 4px' }}>{isEdit ? 'Editar Iniciativa' : 'Criar Iniciativa'}</h3>
        <p style={{ fontSize: '12px', color: '#738290', margin: '0 0 20px' }}>{isEdit ? 'Edita o ID e o nome da iniciativa.' : 'Define o ID, nome e domínio da iniciativa.'}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>ID Iniciativa</label>
            <input style={inputStyle} value={idIniciativa} onChange={e => setIdIniciativa(e.target.value)} placeholder="Ex: INI_001" />
          </div>
          <div>
            <label style={labelStyle}>Nome da Iniciativa</label>
            <input style={inputStyle} value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Visão 360 do Cliente" />
          </div>
          {!isEdit && (
            <div>
              <label style={labelStyle}>Domínio Owner</label>
              <select style={inputStyle} value={dominioId} onChange={e => setDominioId(e.target.value)}>
                <option value="">— selecionar —</option>
                {dominios.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
              </select>
            </div>
          )}
        </div>
        {erro && <p style={{ fontSize: '12px', color: '#C0544C', margin: '16px 0 0', background: 'rgba(192,84,76,0.08)', padding: '8px 12px', borderRadius: '6px' }}>{erro}</p>}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: '8px', border: '1.5px solid #E0E5EC', background: '#FFFFFF', color: '#738290', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} style={{ padding: '8px 18px', borderRadius: '8px', border: '1.5px solid rgba(92,143,106,0.35)', background: 'rgba(92,143,106,0.12)', color: '#2A6040', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#5C8F6A'; e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.borderColor = '#5C8F6A' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(92,143,106,0.12)'; e.currentTarget.style.color = '#2A6040'; e.currentTarget.style.borderColor = 'rgba(92,143,106,0.35)' }}>
            {saving ? 'A guardar...' : (isEdit ? 'Guardar' : 'Criar Iniciativa')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal Criar Use Case ──────────────────────────────────────────────────────
function CriarUseCaseModal({ onClose, onSave, iniciativas, dominios, useCase, lockedIniciativa }) {
  const isEdit = !!useCase
  const locked = !isEdit && !!lockedIniciativa
  const [idUseCase, setIdUseCase]   = useState(useCase?.id_use_case || '')
  const [nome, setNome]             = useState(useCase?.nome_use_case || '')
  const [dominioNome, setDominioNome]   = useState(useCase?.dominio_nome || lockedIniciativa?.dominio_nome || '')
  const [iniciativaId, setIniciativaId] = useState(useCase?.iniciativa_id || lockedIniciativa?.id || '')
  const [saving, setSaving]         = useState(false)
  const [erro, setErro]             = useState('')

  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #E0E5EC', fontSize: '13px', color: '#2C3A42', background: '#FFFFFF', outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }
  const labelStyle = { fontSize: '11px', fontWeight: '600', color: '#738290', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }

  // Cascata bidireccional Domínio ↔ Iniciativa
  const inisFiltradas = iniciativas.filter(ini => !dominioNome || ini.dominio_nome === dominioNome)
  const domsFiltrados = dominios.filter(d => {
    if (dominioNome) return d.nome === dominioNome
    if (iniciativaId) { const ini = iniciativas.find(i => i.id === iniciativaId); return ini && d.nome === ini.dominio_nome }
    return true
  })

  const handleIniciativaChange = (id) => {
    setIniciativaId(id)
    if (id) { const ini = iniciativas.find(i => i.id === id); if (ini) setDominioNome(ini.dominio_nome) }
  }
  const handleDominioChange = (nome) => {
    setDominioNome(nome)
    const ini = iniciativas.find(i => i.id === iniciativaId)
    if (ini && ini.dominio_nome !== nome) setIniciativaId('')
  }

  const handleSubmit = async () => {
    if (!idUseCase.trim()) { setErro('O ID do use case é obrigatório.'); return }
    if (!nome.trim())      { setErro('O nome do use case é obrigatório.'); return }
    if (!iniciativaId)     { setErro('Selecciona uma iniciativa.'); return }
    setSaving(true); setErro('')

    if (isEdit) {
      const { error } = await supabase.from('d_use_cases').update({
        id_use_case:   idUseCase.trim(),
        nome_use_case: nome.trim(),
        iniciativa_id: iniciativaId,
      }).eq('id', useCase.id)
      setSaving(false)
      if (error) { setErro(error.message); return }
    } else {
      const { error } = await supabase.from('d_use_cases').insert([{
        id_use_case:   idUseCase.trim(),
        nome_use_case: nome.trim(),
        iniciativa_id: iniciativaId,
      }])
      setSaving(false)
      if (error) { setErro(error.message); return }
    }
    onSave()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(44,58,66,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '28px 32px', width: '480px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#2C3A42', margin: '0 0 4px' }}>{isEdit ? 'Editar Use Case' : 'Criar Use Case'}</h3>
        <p style={{ fontSize: '12px', color: '#738290', margin: '0 0 20px' }}>{isEdit ? 'Edita os dados do use case.' : 'Define o ID e os dados do use case.'}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>ID Use Case</label>
            <input style={inputStyle} value={idUseCase} onChange={e => setIdUseCase(e.target.value)} placeholder="Ex: UC_001" />
          </div>
          <div>
            <label style={labelStyle}>Nome do Use Case</label>
            <input style={inputStyle} value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Segmentação de clientes" />
          </div>
          <div>
            <label style={labelStyle}>Domínio</label>
            <select style={{ ...inputStyle, background: locked ? '#F0F2F5' : '#FFFFFF', color: locked ? '#738290' : '#2C3A42', cursor: locked ? 'not-allowed' : 'pointer' }} value={dominioNome} onChange={e => handleDominioChange(e.target.value)} disabled={locked}>
              <option value="">— selecionar —</option>
              {domsFiltrados.map(d => <option key={d.id} value={d.nome}>{d.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Iniciativa</label>
            <select style={{ ...inputStyle, background: locked ? '#F0F2F5' : '#FFFFFF', color: locked ? '#738290' : '#2C3A42', cursor: locked ? 'not-allowed' : 'pointer' }} value={iniciativaId} onChange={e => handleIniciativaChange(e.target.value)} disabled={locked}>
              <option value="">— selecionar —</option>
              {inisFiltradas.map(i => <option key={i.id} value={i.id}>{i.id_iniciativa} — {i.nome_iniciativa}</option>)}
            </select>
          </div>
        </div>
        {erro && <p style={{ fontSize: '12px', color: '#C0544C', margin: '16px 0 0', background: 'rgba(192,84,76,0.08)', padding: '8px 12px', borderRadius: '6px' }}>{erro}</p>}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: '8px', border: '1.5px solid #E0E5EC', background: '#FFFFFF', color: '#738290', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} style={{ padding: '8px 18px', borderRadius: '8px', border: '1.5px solid rgba(92,143,106,0.35)', background: 'rgba(92,143,106,0.12)', color: '#2A6040', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#5C8F6A'; e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.borderColor = '#5C8F6A' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(92,143,106,0.12)'; e.currentTarget.style.color = '#2A6040'; e.currentTarget.style.borderColor = 'rgba(92,143,106,0.35)' }}>
            {saving ? 'A guardar...' : (isEdit ? 'Guardar' : 'Criar Use Case')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal Criar/Associar Produto de Dados ─────────────────────────────────────
function ProdutoDadosModal({ useCase, onClose, onSave, produtosDados, enumeracoes, dominios }) {
  const [modo, setModo] = useState('novo')  // 'novo' | 'existente'
  const [produtoExistenteId, setProdutoExistenteId] = useState('')
  const [form, setForm] = useState({
    nome_produto_dados: '', tipologia: '', localizacao_fabric: '',
    descricao: '', frequencia: '', volumes: '', status: 'A aguardar submissão pela BS',
  })
  const [saving, setSaving] = useState(false)
  const [erro, setErro]     = useState('')

  const statusOpts    = enumeracoes?.status_produto || ['A aguardar submissão pela BS', 'Por iniciar (DSG)', 'Levantamento de requisitos (DSG)', 'Ingestão (DIT)', 'Desenvolvimento (DSG)', 'Validação dos Dados (BO)', 'Entregue']
  const tipologiaOpts = enumeracoes?.tipologia || ['Dimensão', 'Facto', 'Métrica', 'KPI', 'Relatório']

  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #E0E5EC', fontSize: '13px', color: '#2C3A42', background: '#FFFFFF', outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }
  const labelStyle = { fontSize: '11px', fontWeight: '600', color: '#738290', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }

  const handleSubmit = async () => {
    setSaving(true); setErro('')

    let produtoId = null

    if (modo === 'existente') {
      if (!produtoExistenteId) { setErro('Selecciona um produto de dados.'); setSaving(false); return }
      produtoId = produtoExistenteId
    } else {
      if (!form.nome_produto_dados.trim()) { setErro('O nome do produto é obrigatório.'); setSaving(false); return }
      // Resolver dominio_id a partir do domínio do use case
      const dominioId = dominios.find(d => d.nome === useCase.dominio_nome)?.id || null
      // Gerar id_produto_dados sequencial
      const { data: existentesPD } = await supabase.from('d_produtos_dados').select('id_produto_dados')
      let maxNum = 0
      ;(existentesPD || []).forEach(p => {
        const m = String(p.id_produto_dados || '').match(/(\d+)/)
        if (m) { const n = parseInt(m[1], 10); if (n > maxNum) maxNum = n }
      })
      const idProduto = `PD_${String(maxNum + 1).padStart(3, '0')}`
      const { data: novoProduto, error: errProd } = await supabase.from('d_produtos_dados').insert([{
        id_produto_dados:   idProduto,
        nome_produto_dados: form.nome_produto_dados.trim(),
        tipologia:          form.tipologia || null,
        dominio_id:         dominioId,
        localizacao_fabric: form.localizacao_fabric.trim() || null,
        descricao:          form.descricao.trim() || null,
        frequencia:         form.frequencia.trim() || null,
        volumes:            form.volumes.trim() || null,
        status:             form.status,
      }]).select()
      if (errProd) { setErro(errProd.message); setSaving(false); return }
      produtoId = novoProduto?.[0]?.id

      // Registo inicial em registo_alteracoes
      if (produtoId) {
        await supabase.from('registo_alteracoes').insert([{
          produto_id: produtoId, status: form.status,
          data_inicio: new Date().toISOString().slice(0, 10),
        }])
      }
    }

    if (!produtoId) { setErro('Não foi possível obter o produto de dados.'); setSaving(false); return }

    // Verificar se a associação já existe
    const { data: existentes, error: errCheck } = await supabase.from('produto_use_case')
      .select('id')
      .eq('use_case_id', useCase.id)
      .eq('produto_dados_id', produtoId)

    if (errCheck) { setErro(`Erro ao verificar associação: ${errCheck.message}`); setSaving(false); return }

    if (!existentes || existentes.length === 0) {
      const { error: errAssoc } = await supabase.from('produto_use_case').insert([{
        use_case_id:      useCase.id,
        produto_dados_id: produtoId,
      }])
      if (errAssoc) { setErro(`Erro ao associar: ${errAssoc.message}`); setSaving(false); return }
    } else {
      setErro('Este produto já está associado a este use case.')
      setSaving(false); return
    }

    setSaving(false)
    onSave()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(44,58,66,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '28px 32px', width: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#2C3A42', margin: '0 0 4px' }}>Criar / Associar Produto de Dados</h3>
        <p style={{ fontSize: '12px', color: '#738290', margin: '0 0 20px' }}>
          Use Case: <strong style={{ color: '#2C3A42' }}>{useCase.id_use_case} — {useCase.nome_use_case}</strong>
        </p>

        {/* Toggle modo */}
        <div style={{ display: 'flex', background: '#F0F2F5', borderRadius: '8px', padding: '3px', width: 'fit-content', marginBottom: '20px' }}>
          {[{ id: 'novo', label: 'Novo Produto' }, { id: 'existente', label: 'Associar Existente' }].map(op => (
            <button key={op.id} onClick={() => { setModo(op.id); setErro('') }}
              style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: modo === op.id ? '#FFFFFF' : 'transparent', color: modo === op.id ? '#2C3A42' : '#738290', fontSize: '12px', fontWeight: modo === op.id ? '600' : '500', cursor: 'pointer', fontFamily: 'Inter, sans-serif', boxShadow: modo === op.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
              {op.label}
            </button>
          ))}
        </div>

        {modo === 'existente' ? (
          <div>
            <label style={labelStyle}>Produto de Dados</label>
            <select style={inputStyle} value={produtoExistenteId} onChange={e => setProdutoExistenteId(e.target.value)}>
              <option value="">— selecionar —</option>
              {produtosDados.map(p => <option key={p.id} value={p.id}>{p.id_produto_dados} — {p.nome_produto_dados}</option>)}
            </select>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Nome do Produto de Dados</label>
              <input style={inputStyle} value={form.nome_produto_dados} onChange={e => setForm(p => ({ ...p, nome_produto_dados: e.target.value }))} placeholder="Ex: Dimensão Cliente" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Tipologia</label>
                <select style={inputStyle} value={form.tipologia} onChange={e => setForm(p => ({ ...p, tipologia: e.target.value }))}>
                  <option value="">— selecionar —</option>
                  {tipologiaOpts.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <select style={inputStyle} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  {statusOpts.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Localização Fabric</label>
              <input style={inputStyle} value={form.localizacao_fabric} onChange={e => setForm(p => ({ ...p, localizacao_fabric: e.target.value }))} placeholder="Lakehouse / path" />
            </div>
            <div>
              <label style={labelStyle}>Descrição</label>
              <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '60px' }} value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Frequência</label>
                <input style={inputStyle} value={form.frequencia} onChange={e => setForm(p => ({ ...p, frequencia: e.target.value }))} placeholder="Diária, Mensal..." />
              </div>
              <div>
                <label style={labelStyle}>Volumes</label>
                <input style={inputStyle} value={form.volumes} onChange={e => setForm(p => ({ ...p, volumes: e.target.value }))} placeholder="Ex: 1M linhas" />
              </div>
            </div>
          </div>
        )}

        {erro && <p style={{ fontSize: '12px', color: '#C0544C', margin: '16px 0 0', background: 'rgba(192,84,76,0.08)', padding: '8px 12px', borderRadius: '6px' }}>{erro}</p>}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: '8px', border: '1.5px solid #E0E5EC', background: '#FFFFFF', color: '#738290', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} style={{ padding: '8px 18px', borderRadius: '8px', border: '1.5px solid rgba(92,143,106,0.35)', background: 'rgba(92,143,106,0.12)', color: '#2A6040', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#5C8F6A'; e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.borderColor = '#5C8F6A' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(92,143,106,0.12)'; e.currentTarget.style.color = '#2A6040'; e.currentTarget.style.borderColor = 'rgba(92,143,106,0.35)' }}>
            {saving ? 'A guardar...' : (modo === 'existente' ? 'Associar' : 'Criar e Associar')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Iniciativas({ onOpenProduto }) {
  const { iniciativas, useCases, dominios, produtosDados, enumeracoes, refetchIniciativas, refetchUseCases } = useReferenceData()
  const [produtoUseCase, setProdutoUseCase] = useState([]) // produto_use_case + status do produto
  const [expanded, setExpanded] = useState(new Set())
  const [expandedUC, setExpandedUC] = useState(new Set())  // use cases expandidos (2º nível)
  const [filterDominio, setFilterDominio] = useState([])
  const [filterIniciativa, setFilterIniciativa] = useState([])
  const [filterUcStatus, setFilterUcStatus] = useState([])
  const [iniciativaModalOpen, setIniciativaModalOpen] = useState(false)
  const [useCaseModalOpen, setUseCaseModalOpen]       = useState(false)
  const [editIniciativa, setEditIniciativa]           = useState(null)  // iniciativa a editar
  const [deleteIniciativa, setDeleteIniciativa]       = useState(null)  // iniciativa a eliminar
  const [deleteIniBloqueada, setDeleteIniBloqueada]   = useState(null)  // iniciativa com use cases (não pode eliminar)
  const [criarUCLocked, setCriarUCLocked]             = useState(null)  // criar UC com iniciativa bloqueada
  const [editUseCase, setEditUseCase]                 = useState(null)  // use case a editar
  const [deleteUseCase, setDeleteUseCase]             = useState(null)  // use case a eliminar
  const [deleteBloqueado, setDeleteBloqueado]         = useState(null)  // use case com produtos (não pode eliminar)
  const [produtoModalUC, setProdutoModalUC]           = useState(null) // use case alvo para associar produto
  const [dissociarTarget, setDissociarTarget]         = useState(null) // produto a dissociar de um use case

  const handleDeleteUseCase = async () => {
    if (!deleteUseCase) return
    await supabase.from('d_use_cases').delete().eq('id', deleteUseCase.id)
    setDeleteUseCase(null)
    refetchUseCases()
    refetchProdutoUseCase()
  }

  const handleDissociar = async () => {
    if (!dissociarTarget) return
    // Remove apenas a relação na produto_use_case (produto mantém-se em d_produtos_dados)
    await supabase.from('produto_use_case')
      .delete()
      .eq('produto_dados_id', dissociarTarget.produto_dados_id)
      .eq('use_case_id', dissociarTarget.use_case_id)
    setDissociarTarget(null)
    refetchProdutoUseCase()
  }

  const handleDeleteIniciativa = async () => {
    if (!deleteIniciativa) return
    await supabase.from('d_iniciativas').delete().eq('id', deleteIniciativa.id)
    setDeleteIniciativa(null)
    refetchIniciativas()
  }

  const refetchProdutoUseCase = () => {
    supabase
      .from('produto_use_case')
      .select('use_case_id, produto_dados_id, d_produtos_dados(id, id_produto_dados, nome_produto_dados, status)')
      .then(({ data }) => {
        if (data) setProdutoUseCase(data.map(r => ({
          use_case_id:        r.use_case_id,
          produto_dados_id:   r.produto_dados_id,
          id_produto_dados:   r.d_produtos_dados?.id_produto_dados || null,
          nome_produto_dados: r.d_produtos_dados?.nome_produto_dados || '(produto removido)',
          status:             r.d_produtos_dados?.status || null,
        })))
      })
  }

  useEffect(() => {
    refetchProdutoUseCase()
  }, [])

  // Enriquecer use cases com status calculado + lista de produtos
  const enrichedUCs = useCases.map(uc => {
    const assoc    = produtoUseCase.filter(p => p.use_case_id === uc.id)
    const statuses = assoc.map(p => p.status).filter(Boolean)
    return {
      ...uc,
      uc_status:    computeUseCaseStatus(statuses),
      qtd_produtos: assoc.length,
      produtos:     assoc,
    }
  })

  // Agrupar use cases por iniciativa
  const iniciativaMap = new Map()
  iniciativas.forEach(ini => {
    iniciativaMap.set(ini.id, {
      id:              ini.id,
      id_iniciativa:   ini.id_iniciativa,
      nome_iniciativa: ini.nome_iniciativa,
      dominio_nome:    ini.dominio_nome,
      ucs: [],
    })
  })
  enrichedUCs.forEach(uc => {
    const ini = iniciativaMap.get(uc.iniciativa_id)
    if (ini) ini.ucs.push(uc)
  })

  const iniciativaRows = Array.from(iniciativaMap.values()).map(ini => {
    const ucStatuses = ini.ucs.map(uc => uc.uc_status)
    const entregues  = ini.ucs.filter(uc => uc.uc_status === 'Entregue').length
    const total      = ini.ucs.length
    const allEntregues = total > 0 && entregues === total
    return {
      ...ini,
      ucs_entregues: `${entregues}/${total}`,
      entregues,
      total,
      pct: total > 0 ? Math.round((entregues / total) * 100) : 0,
      allEntregues,
      ini_status: computeIniciativaStatus(ucStatuses),
    }
  })

  const dominioOptions = [...new Set(iniciativaRows.map(r => r.dominio_nome).filter(Boolean))].sort()
  const baseFiltered = iniciativaRows.filter(r => !filterDominio.length || filterDominio.includes(r.dominio_nome))
  const iniciativaOptions = baseFiltered.map(r => `${r.id_iniciativa} — ${r.nome_iniciativa}`)

  const UC_STATUS_ORDER = ['Sem produto de dados', 'Aguarda submissão pela BS', 'Por iniciar', 'Em curso', 'Com bloqueios', 'Entregue']
  const ucStatusOptions = [...new Set(iniciativaRows.map(r => r.ini_status))].sort(
    (a, b) => UC_STATUS_ORDER.indexOf(a) - UC_STATUS_ORDER.indexOf(b)
  )

  const filtered = iniciativaRows.filter(r => {
    if (filterDominio.length && !filterDominio.includes(r.dominio_nome)) return false
    if (filterIniciativa.length) {
      const ids = filterIniciativa.map(s => s.split(' — ')[0])
      if (!ids.includes(r.id_iniciativa)) return false
    }
    if (filterUcStatus.length && !filterUcStatus.includes(r.ini_status)) return false
    return true
  })

  const toggleExpand = (id) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleExpandUC = (id) => {
    setExpandedUC(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const hasFilters = !!(filterDominio.length || filterIniciativa.length || filterUcStatus.length)
  const clearFilters = () => { setFilterDominio([]); setFilterIniciativa([]); setFilterUcStatus([]) }

  const [visibleCount, setVisibleCount] = useState(50)
  useEffect(() => { setVisibleCount(50) }, [filterDominio, filterIniciativa, filterUcStatus])
  const visible = filtered.slice(0, visibleCount)

  return (
    <div style={{ padding: '32px 36px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#2C3A42', margin: 0 }}>Iniciativas e Use Cases</h1>
          <p style={{ fontSize: '13px', color: '#738290', margin: '4px 0 0' }}>
            Mapa de iniciativas. Clica numa linha para ver os use cases associados.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button onClick={() => setUseCaseModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 16px', borderRadius: '8px', border: '1.5px solid #C8D5E8', background: 'rgba(161,181,216,0.12)', color: '#5A7BA8', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(161,181,216,0.22)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(161,181,216,0.12)'}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Criar Use Case
          </button>
          <button onClick={() => setIniciativaModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 16px', borderRadius: '8px', border: '1.5px solid rgba(92,143,106,0.35)', background: 'rgba(92,143,106,0.12)', color: '#2A6040', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#5C8F6A'; e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.borderColor = '#5C8F6A' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(92,143,106,0.12)'; e.currentTarget.style.color = '#2A6040'; e.currentTarget.style.borderColor = 'rgba(92,143,106,0.35)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Criar Iniciativa
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <MultiSelect options={dominioOptions} value={filterDominio} onChange={v => { setFilterDominio(v); setFilterIniciativa([]) }} placeholder="Domínio" />
        <MultiSelect options={iniciativaOptions} value={filterIniciativa} onChange={setFilterIniciativa} placeholder="Iniciativa" />
        <MultiSelect options={ucStatusOptions} value={filterUcStatus} onChange={setFilterUcStatus} placeholder="Status" />
        {hasFilters && (
          <button onClick={clearFilters} style={{ padding: '7px 14px', borderRadius: '8px', border: '1.5px solid #E0E5EC', background: '#FFFFFF', color: '#738290', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
            Limpar filtros
          </button>
        )}
      </div>

      <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: '#2C3A42', fontFamily: 'Inter, sans-serif', tableLayout: 'fixed' }}>
            <colgroup>
              {INICIATIVA_COLUMNS.map(col => <col key={col.key} style={{ width: col.width }} />)}
            </colgroup>
            <thead>
              <tr style={{ borderBottom: '1px solid #ECEEF2' }}>
                {INICIATIVA_COLUMNS.map(col => (
                  <th key={col.key} style={{
                    padding: col.key === 'expand' ? '11px 0 11px 14px' : '11px 14px',
                    textAlign: 'left', fontSize: '11px', fontWeight: '500',
                    color: '#738290', textTransform: 'uppercase', letterSpacing: '0.08em',
                    whiteSpace: 'nowrap', background: '#FFFFFF',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={INICIATIVA_COLUMNS.length} style={{ padding: '48px 24px', textAlign: 'center', color: '#738290', fontSize: '13px' }}>
                    Nenhuma iniciativa encontrada.
                  </td>
                </tr>
              )}
              {visible.map((ini, idx) => {
                const isExpanded = expanded.has(ini.id)
                const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#FAFBFC'
                return (
                  <React.Fragment key={ini.id}>
                    {/* Linha iniciativa */}
                    <tr
                      onClick={() => toggleExpand(ini.id)}
                      style={{ background: isExpanded ? '#EBF1FA' : rowBg, cursor: 'pointer', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F3F6FB'}
                      onMouseLeave={e => e.currentTarget.style.background = isExpanded ? '#EBF1FA' : rowBg}
                    >
                      {INICIATIVA_COLUMNS.map(col => (
                        <td key={col.key} style={{
                          padding: col.key === 'expand' ? '10px 0 10px 14px' : '10px 14px',
                          maxWidth: col.width, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          color: ['iniciativa', 'dominio_nome'].includes(col.key) ? '#2C3A42' : '#4A5568',
                          fontWeight: col.key === 'iniciativa' ? '500' : '400',
                        }}>
                          {col.key === 'expand' ? (
                            <span style={{ color: '#A1B5D8', display: 'flex', alignItems: 'center' }}>
                              <ChevronIcon expanded={isExpanded} />
                            </span>
                          ) : col.key === 'iniciativa' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                              <span style={{ flexShrink: 0, background: 'rgba(161,181,216,0.18)', color: '#5A7BA8', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: '600' }}>
                                {ini.id_iniciativa}
                              </span>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '500', color: '#2C3A42' }}>
                                {ini.nome_iniciativa}
                              </span>
                            </div>
                          ) : col.key === 'ini_status' ? (
                            <StatusBadge status={ini.ini_status} />
                          ) : col.key === 'ucs_entregues' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ flex: 1, height: '7px', background: '#E8EDF3', borderRadius: '20px', overflow: 'hidden', minWidth: '50px' }}>
                                <div style={{ width: `${ini.pct}%`, height: '100%', background: '#5C8F6A', borderRadius: '20px', transition: 'width 0.3s' }} />
                              </div>
                              <span style={{ flexShrink: 0, fontSize: '11px', fontWeight: '600', color: ini.allEntregues ? '#2A6040' : '#738290', whiteSpace: 'nowrap' }}>
                                {ini.pct}% ({ini.ucs_entregues})
                              </span>
                              <span style={{ flexShrink: 0, width: '14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                {ini.allEntregues && (
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5C8F6A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                )}
                              </span>
                            </div>
                          ) : col.key === 'acao' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={e => e.stopPropagation()}>
                              <button onClick={() => setCriarUCLocked(ini)}
                                title="Criar use case"
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '7px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#4A7A5A' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(92,143,106,0.15)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                              </button>
                              <button onClick={() => setEditIniciativa(ini)}
                                title="Editar iniciativa"
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '7px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#5A7BA8' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(161,181,216,0.18)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                              <button onClick={() => ini.total > 0 ? setDeleteIniBloqueada(ini) : setDeleteIniciativa(ini)}
                                title={ini.total > 0 ? `Elimine primeiro os ${ini.total} use cases associados à iniciativa` : 'Eliminar iniciativa'}
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '7px', border: 'none', background: 'transparent', cursor: 'pointer', color: ini.total > 0 ? '#D8C0BC' : '#C8A09C', opacity: ini.total > 0 ? 0.6 : 1 }}
                                onMouseEnter={e => { if (ini.total === 0) { e.currentTarget.style.background = 'rgba(192,84,76,0.12)'; e.currentTarget.style.color = '#C0544C' } }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = ini.total > 0 ? '#D8C0BC' : '#C8A09C' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            ini[col.key] || <span style={{ color: '#C8D0DA' }}>—</span>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Drilldown UC — alinhado com as colunas da tabela */}
                    {isExpanded && ini.ucs.map((uc, ucIdx) => {
                      const ucOpen = expandedUC.has(uc.id)
                      return (
                      <React.Fragment key={`uc-${uc.id}`}>
                      <tr style={{ background: ucOpen ? '#E8F0FA' : (ucIdx % 2 === 0 ? '#F7FAFD' : '#F0F5FB') }}>
                        {/* chevron use case (abre produtos) */}
                        <td style={{ padding: '8px 0', textAlign: 'center', cursor: uc.qtd_produtos > 0 ? 'pointer' : 'default' }}
                          onClick={() => { if (uc.qtd_produtos > 0) toggleExpandUC(uc.id) }}>
                          {uc.qtd_produtos > 0 ? (
                            <span style={{ color: '#A1B5D8', display: 'inline-flex', alignItems: 'center' }}>
                              <ChevronIcon expanded={ucOpen} />
                            </span>
                          ) : (
                            <span style={{ display: 'inline-block', width: '3px', height: '16px', background: '#C8D5E8', borderRadius: '2px' }} />
                          )}
                        </td>
                        {/* domínio (vazio) */}
                        <td style={{ padding: '8px 14px' }} />
                        {/* id + nome use case → coluna Iniciativa */}
                        <td style={{ padding: '8px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', paddingLeft: '12px' }}>
                            <span style={{ flexShrink: 0, background: 'rgba(115,130,144,0.12)', color: '#738290', borderRadius: '6px', padding: '2px 8px', fontSize: '10px', fontWeight: '600' }}>
                              {uc.id_use_case}
                            </span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px', color: '#2C3A42' }}>
                              {uc.nome_use_case}
                            </span>
                          </div>
                        </td>
                        {/* status use case → coluna Status */}
                        <td style={{ padding: '8px 14px' }}>
                          <StatusBadge status={uc.uc_status} />
                        </td>
                        {/* qtd produtos → coluna UCs Entregues */}
                        <td style={{ padding: '8px 14px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', background: '#EBF1FA', color: '#5A7BA8', borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                            {uc.qtd_produtos} {uc.qtd_produtos === 1 ? 'produto de dados' : 'produtos de dados'}
                          </span>
                        </td>
                        {/* botões de acção → coluna acao */}
                        <td style={{ padding: '8px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <button onClick={(e) => { e.stopPropagation(); setProdutoModalUC(uc) }}
                              title="Adicionar produto de dados"
                              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '7px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#4A7A5A' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(92,143,106,0.15)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                              </svg>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setEditUseCase(uc) }}
                              title="Editar use case"
                              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '7px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#5A7BA8' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(161,181,216,0.18)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); uc.qtd_produtos > 0 ? setDeleteBloqueado(uc) : setDeleteUseCase(uc) }}
                              title={uc.qtd_produtos > 0 ? `Elimine primeiro os ${uc.qtd_produtos} produtos de dados associados ao use case` : 'Eliminar use case'}
                              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '7px', border: 'none', background: 'transparent', cursor: 'pointer', color: uc.qtd_produtos > 0 ? '#D8C0BC' : '#C8A09C', opacity: uc.qtd_produtos > 0 ? 0.6 : 1 }}
                              onMouseEnter={e => { if (uc.qtd_produtos === 0) { e.currentTarget.style.background = 'rgba(192,84,76,0.12)'; e.currentTarget.style.color = '#C0544C' } }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = uc.qtd_produtos > 0 ? '#D8C0BC' : '#C8A09C' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* 3º nível — Produtos de Dados do use case */}
                      {ucOpen && uc.produtos.map((pd, pdIdx) => (
                        <tr key={`pd-${pd.produto_dados_id}-${pdIdx}`} style={{ background: '#FCFDFE' }}>
                          {/* expand vazio */}
                          <td style={{ padding: '7px 0', textAlign: 'center' }}>
                            <span style={{ display: 'inline-block', width: '3px', height: '14px', background: '#DDE6F0', borderRadius: '2px' }} />
                          </td>
                          {/* domínio vazio */}
                          <td style={{ padding: '7px 14px' }} />
                          {/* id + nome produto → coluna Iniciativa (mais indentado) */}
                          <td style={{ padding: '7px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', paddingLeft: '36px' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A1B5D8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                              </svg>
                              <span style={{ flexShrink: 0, background: 'rgba(161,181,216,0.15)', color: '#5A7BA8', borderRadius: '6px', padding: '2px 8px', fontSize: '10px', fontWeight: '600' }}>
                                {pd.id_produto_dados}
                              </span>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px', color: '#2C3A42' }}>
                                {pd.nome_produto_dados}
                              </span>
                            </div>
                          </td>
                          {/* status produto → coluna Status */}
                          <td style={{ padding: '7px 14px' }}>
                            <StatusBadge status={pd.status} />
                          </td>
                          {/* coluna UCs Entregues (vazia) */}
                          <td style={{ padding: '7px 14px' }} />
                          {/* botões editar/eliminar produto → coluna acao */}
                          <td style={{ padding: '7px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <button title="Ver detalhe do produto"
                                onClick={(e) => { e.stopPropagation(); onOpenProduto && onOpenProduto({ id: pd.produto_dados_id, id_produto_dados: pd.id_produto_dados, nome_produto_dados: pd.nome_produto_dados, status: pd.status }) }}
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '7px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#5A7BA8' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(161,181,216,0.18)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                                </svg>
                              </button>
                              <button title="Dissociar produto do use case"
                                onClick={(e) => { e.stopPropagation(); setDissociarTarget({ produto_dados_id: pd.produto_dados_id, id_produto_dados: pd.id_produto_dados, nome_produto_dados: pd.nome_produto_dados, use_case_id: uc.id, id_use_case: uc.id_use_case, nome_use_case: uc.nome_use_case }) }}
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '7px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#A89BB5' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(154,110,180,0.12)'; e.currentTarget.style.color = '#8A6BA8' }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#A89BB5' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M9.17 14.83l5.66-5.66" /><path d="M14.83 7.76l.59-.59a4 4 0 0 1 5.66 5.66l-1.41 1.41" /><path d="M9.17 16.24l-1.41 1.41a4 4 0 0 1-5.66-5.66l.59-.59" /><line x1="2" y1="2" x2="22" y2="22" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      </React.Fragment>
                      )
                    })}

                    {/* Separador após drilldown */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={INICIATIVA_COLUMNS.length} style={{ height: '1px', background: '#D8E4F0', padding: 0 }} />
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
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
          A mostrar {visible.length} de {filtered.length} iniciativa{filtered.length !== 1 ? 's' : ''}
        </p>
      </div>

      {dissociarTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(44,58,66,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '28px 32px', width: '460px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(154,110,180,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A6BA8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.17 14.83l5.66-5.66" /><path d="M14.83 7.76l.59-.59a4 4 0 0 1 5.66 5.66l-1.41 1.41" /><path d="M9.17 16.24l-1.41 1.41a4 4 0 0 1-5.66-5.66l.59-.59" /><line x1="2" y1="2" x2="22" y2="22" />
                </svg>
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#2C3A42', margin: 0 }}>Dissociar Produto de Dados</h3>
            </div>
            <p style={{ fontSize: '13px', color: '#4A5568', margin: '0 0 20px', lineHeight: '1.6' }}>
              Vais remover a associação entre o produto <strong style={{ color: '#2C3A42' }}>{dissociarTarget.id_produto_dados} — {dissociarTarget.nome_produto_dados}</strong> e o use case <strong style={{ color: '#2C3A42' }}>{dissociarTarget.id_use_case} — {dissociarTarget.nome_use_case}</strong>.
            </p>
            <div style={{ background: 'rgba(161,181,216,0.10)', border: '1px solid rgba(161,181,216,0.25)', borderRadius: '8px', padding: '12px 14px', marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', color: '#5A7BA8', margin: 0, lineHeight: '1.5' }}>
                O produto de dados <strong>não é eliminado</strong> — apenas deixa de estar associado a este use case. Continua disponível e pode ser associado a outros use cases.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDissociarTarget(null)} style={{ padding: '8px 18px', borderRadius: '8px', border: '1.5px solid #E0E5EC', background: '#FFFFFF', color: '#738290', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleDissociar} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#8A6BA8', color: '#FFFFFF', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Dissociar</button>
            </div>
          </div>
        </div>
      )}

      {iniciativaModalOpen && (
        <CriarIniciativaModal
          dominios={dominios}
          onClose={() => setIniciativaModalOpen(false)}
          onSave={() => { setIniciativaModalOpen(false); refetchIniciativas() }}
        />
      )}
      {useCaseModalOpen && (
        <CriarUseCaseModal
          iniciativas={iniciativas}
          dominios={dominios}
          onClose={() => setUseCaseModalOpen(false)}
          onSave={() => { setUseCaseModalOpen(false); refetchUseCases() }}
        />
      )}
      {criarUCLocked && (
        <CriarUseCaseModal
          iniciativas={iniciativas}
          dominios={dominios}
          lockedIniciativa={criarUCLocked}
          onClose={() => setCriarUCLocked(null)}
          onSave={() => { setCriarUCLocked(null); refetchUseCases() }}
        />
      )}
      {editIniciativa && (
        <CriarIniciativaModal
          iniciativa={editIniciativa}
          dominios={dominios}
          onClose={() => setEditIniciativa(null)}
          onSave={() => { setEditIniciativa(null); refetchIniciativas() }}
        />
      )}
      {deleteIniciativa && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(44,58,66,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '28px 32px', width: '420px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#2C3A42', margin: '0 0 12px' }}>Eliminar Iniciativa</h3>
            <p style={{ fontSize: '13px', color: '#4A5568', margin: '0 0 24px', lineHeight: '1.6' }}>
              Tens a certeza que queres eliminar <strong style={{ color: '#2C3A42' }}>{deleteIniciativa.id_iniciativa} — {deleteIniciativa.nome_iniciativa}</strong>? Esta acção não pode ser revertida.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteIniciativa(null)} style={{ padding: '8px 18px', borderRadius: '8px', border: '1.5px solid #E0E5EC', background: '#FFFFFF', color: '#738290', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleDeleteIniciativa} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#C0544C', color: '#FFFFFF', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
      {deleteIniBloqueada && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(44,58,66,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '28px 32px', width: '440px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(201,151,74,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9A6E20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#2C3A42', margin: 0 }}>Não é possível eliminar</h3>
            </div>
            <p style={{ fontSize: '13px', color: '#4A5568', margin: '0 0 24px', lineHeight: '1.6' }}>
              Elimine primeiro os <strong style={{ color: '#2C3A42' }}>{deleteIniBloqueada.total} use case{deleteIniBloqueada.total !== 1 ? 's' : ''}</strong> associado{deleteIniBloqueada.total !== 1 ? 's' : ''} à iniciativa <strong style={{ color: '#2C3A42' }}>{deleteIniBloqueada.id_iniciativa}</strong>.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteIniBloqueada(null)} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#A1B5D8', color: '#FFFFFF', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Entendido</button>
            </div>
          </div>
        </div>
      )}
      {editUseCase && (
        <CriarUseCaseModal
          useCase={editUseCase}
          iniciativas={iniciativas}
          dominios={dominios}
          onClose={() => setEditUseCase(null)}
          onSave={() => { setEditUseCase(null); refetchUseCases() }}
        />
      )}
      {deleteBloqueado && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(44,58,66,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '28px 32px', width: '440px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(201,151,74,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9A6E20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#2C3A42', margin: 0 }}>Não é possível eliminar</h3>
            </div>
            <p style={{ fontSize: '13px', color: '#4A5568', margin: '0 0 24px', lineHeight: '1.6' }}>
              Elimine primeiro os <strong style={{ color: '#2C3A42' }}>{deleteBloqueado.qtd_produtos} produto{deleteBloqueado.qtd_produtos !== 1 ? 's' : ''} de dados</strong> associado{deleteBloqueado.qtd_produtos !== 1 ? 's' : ''} ao use case <strong style={{ color: '#2C3A42' }}>{deleteBloqueado.id_use_case}</strong>.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteBloqueado(null)} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#A1B5D8', color: '#FFFFFF', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Entendido</button>
            </div>
          </div>
        </div>
      )}
      {deleteUseCase && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(44,58,66,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '28px 32px', width: '420px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#2C3A42', margin: '0 0 12px' }}>Eliminar Use Case</h3>
            <p style={{ fontSize: '13px', color: '#4A5568', margin: '0 0 24px', lineHeight: '1.6' }}>
              Tens a certeza que queres eliminar <strong style={{ color: '#2C3A42' }}>{deleteUseCase.id_use_case} — {deleteUseCase.nome_use_case}</strong>? As associações a produtos de dados também serão removidas. Esta acção não pode ser revertida.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteUseCase(null)} style={{ padding: '8px 18px', borderRadius: '8px', border: '1.5px solid #E0E5EC', background: '#FFFFFF', color: '#738290', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleDeleteUseCase} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#C0544C', color: '#FFFFFF', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
      {produtoModalUC && (
        <ProdutoDadosModal
          useCase={produtoModalUC}
          produtosDados={produtosDados}
          enumeracoes={enumeracoes}
          dominios={dominios}
          onClose={() => setProdutoModalUC(null)}
          onSave={() => { setProdutoModalUC(null); refetchProdutoUseCase() }}
        />
      )}
    </div>
  )
}