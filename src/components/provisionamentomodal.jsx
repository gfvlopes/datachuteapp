import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useReferenceData } from '../context/referencedatacontext'

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

const inputStyle = { padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #E0E5EC', fontSize: '13px', color: '#2C3A42', background: '#FFFFFF', outline: 'none', fontFamily: 'Inter, sans-serif', width: '100%', boxSizing: 'border-box' }
const textareaStyle = { ...inputStyle, resize: 'vertical', minHeight: '72px', lineHeight: '1.5' }

const emptyForm = {
  // contexto hierárquico
  iniciativa_id: '', use_case_id: '',
  // produto
  productMode: 'novo',
  produto_dados_id: '',
  id_produto_dados: '', nome_produto_dados: '',
  dominio_id: '', dominio_requisitante: '',
  status: '', tipologia: '', localizacao_fabric: '',
  descricao: '', filtros: '', historico: '', update_info: '', frequencia: '', volumes: '',
}

export default function ProvisionamentoModal({ isOpen, onClose, onSave, initialData }) {
  const { enumeracoes, dominios, iniciativas, useCases, produtosDados } = useReferenceData()
  const [form, setForm]                   = useState(emptyForm)
  const [originalStatus, setOriginalStatus] = useState('')
  const [statusChanged, setStatusChanged] = useState(false)
  const [registering, setRegistering]     = useState(false)
  const [registered, setRegistered]       = useState(false)
  const [siblingCount, setSiblingCount]   = useState(0)
  const [error, setError]                 = useState('')

  // Use cases filtrados pela iniciativa seleccionada
  const ucsFiltrados = form.iniciativa_id
    ? useCases.filter(uc => uc.iniciativa_id === form.iniciativa_id)
    : useCases

  // Iniciativas disponíveis — todas do contexto
  const iniciativasOpts = iniciativas

  useEffect(() => {
    if (!isOpen) return
    if (initialData) {
      // Modo edição — preencher com dados da linha
      setForm({
        ...emptyForm,
        productMode:          'edicao',
        produto_dados_id:     initialData.produto_dados_id || '',
        id_produto_dados:     initialData.id_produto_dados || '',
        nome_produto_dados:   initialData.nome_produto_dados || '',
        dominio_id:           dominios.find(d => d.nome === initialData.owner)?.id || '',
        dominio_requisitante: initialData.dominio_requisitante || '',
        tipologia:            initialData.tipologia || '',
        localizacao_fabric:   initialData.localizacao_fabric || '',
        descricao:            initialData.descricao || '',
        filtros:              initialData.filtros || '',
        historico:            initialData.historico || '',
        update_info:          initialData.update_info || '',
        frequencia:           initialData.frequencia || '',
        volumes:              initialData.volumes || '',
        status:               initialData.status || '',
        use_case_id:          initialData.use_case_id || '',
        iniciativa_id:        useCases.find(uc => uc.id === initialData.use_case_id)?.iniciativa_id || '',
      })
      setOriginalStatus(initialData.status || '')
    } else {
      setForm(emptyForm)
      setOriginalStatus('')
    }
    setStatusChanged(false)
    setRegistered(false)
    setError('')
  }, [isOpen, initialData])

  if (!isOpen) return null

  const sel = (v) => enumeracoes[v] || []

  const handleChange = (field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value }

      // Ao mudar domínio owner → reset iniciativa e use case
      // Se produto novo, pré-preenche domínio requisitante com o mesmo valor
      if (field === 'dominio_id') {
        next.iniciativa_id = ''
        next.use_case_id   = ''
        if (prev.productMode === 'novo') {
          const dom = dominios.find(d => d.id === value)
          next.dominio_requisitante = dom?.nome || ''
        }
      }

      // Ao mudar iniciativa → filtrar use cases, auto-select se só 1; preencher domínio se vazio
      if (field === 'iniciativa_id') {
        const ucs = useCases.filter(uc => uc.iniciativa_id === value)
        next.use_case_id = ucs.length === 1 ? ucs[0].id : ''
        // Preencher domínio owner a partir da iniciativa
        if (value && !prev.dominio_id) {
          const ini = iniciativas.find(i => i.id === value)
          if (ini?.dominio_id) {
            next.dominio_id = ini.dominio_id
            // Também preenche requisitante se produto novo
            if (prev.productMode === 'novo' && !prev.dominio_requisitante) {
              const dom = dominios.find(d => d.id === ini.dominio_id)
              next.dominio_requisitante = dom?.nome || ''
            }
          }
        }
      }

      // Ao mudar use case → preencher iniciativa e domínio
      if (field === 'use_case_id') {
        const uc = useCases.find(uc => uc.id === value)
        if (uc) {
          if (!prev.iniciativa_id) next.iniciativa_id = uc.iniciativa_id
          if (!prev.dominio_id) {
            const ini = iniciativas.find(i => i.id === uc.iniciativa_id)
            if (ini?.dominio_id) {
              next.dominio_id = ini.dominio_id
              // Também preenche requisitante se produto novo
              if (prev.productMode === 'novo' && !prev.dominio_requisitante) {
                const dom = dominios.find(d => d.id === ini.dominio_id)
                next.dominio_requisitante = dom?.nome || ''
              }
            }
          }
        }
      }

      return next
    })

    // Ao mudar status — verificar irmãos
    if (field === 'status') {
      setStatusChanged(value !== originalStatus)
      setRegistered(false)
      if (value !== originalStatus && form.produto_dados_id) {
        supabase.from('produto_use_case').select('id', { count: 'exact', head: false })
          .eq('produto_dados_id', form.produto_dados_id)
          .then(({ data }) => {
            const others = (data || []).filter(r => !initialData || r.id !== initialData.id)
            setSiblingCount(others.length)
          })
      } else { setSiblingCount(0) }
    }
  }

  const handleSelectExisting = (prodId) => {
    if (!prodId) { setForm(prev => ({ ...prev, produto_dados_id: '', id_produto_dados: '', nome_produto_dados: '', dominio_id: '', tipologia: '', localizacao_fabric: '', descricao: '', filtros: '', historico: '', update_info: '', frequencia: '', volumes: '', status: '' })); return }
    const pd = produtosDados.find(p => p.id === prodId)
    if (!pd) return
    setForm(prev => ({
      ...prev,
      produto_dados_id:   pd.id,
      id_produto_dados:   pd.id_produto_dados,
      nome_produto_dados: pd.nome_produto_dados,
      dominio_id:         pd.dominio_id || '',
      tipologia:          pd.tipologia || '',
      localizacao_fabric: pd.localizacao_fabric || '',
      descricao:          pd.descricao || '',
      filtros:            pd.filtros || '',
      historico:          pd.historico || '',
      update_info:        pd.update_info || '',
      frequencia:         pd.frequencia || '',
      volumes:            pd.volumes || '',
      status:             pd.status || '',
    }))
    setOriginalStatus(pd.status || '')
  }

  const handleRegistarAlteracao = async () => {
    if (!form.produto_dados_id) { setError('Grava o Produto de Dados antes de registar a alteração.'); return }
    setRegistering(true)
    const today = new Date().toISOString().split('T')[0]

    // Propagar status a todos os produto_use_case do mesmo produto
    await supabase.from('d_produtos_dados').update({ status: form.status }).eq('id', form.produto_dados_id)

    // Registar alteração com produto_id
    await supabase.from('registo_alteracoes').insert([{ produto_id: form.produto_dados_id, status: form.status, data_inicio: today }])

    setRegistering(false)
    setRegistered(true)
    setStatusChanged(false)
    setOriginalStatus(form.status)
    setSiblingCount(0)
  }

  const handleSave = () => {
    if (!form.use_case_id)        { setError('Selecciona um Use Case.'); return }
    if (form.productMode === 'novo') {
      if (!form.id_produto_dados.trim())   { setError('O ID do Produto de Dados é obrigatório.'); return }
      if (!form.nome_produto_dados.trim()) { setError('O Nome do Produto de Dados é obrigatório.'); return }
    }
    if (form.productMode === 'existente' && !form.produto_dados_id) { setError('Selecciona um Produto de Dados.'); return }
    setError('')
    onSave(form)
  }

  const readOnly   = form.productMode === 'existente'
  const roStyle    = readOnly ? { ...inputStyle, background: '#F7F7F7' } : inputStyle

  // Domínio do use case seleccionado (para mostrar business_owner)
  const ucSel      = useCases.find(uc => uc.id === form.use_case_id)
  const iniSel     = iniciativas.find(i => i.id === (form.iniciativa_id || ucSel?.iniciativa_id))
  const dominioSel = dominios.find(d => d.id === form.dominio_id)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(44,58,66,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#FFFFFF', borderRadius: '16px', width: '100%', maxWidth: '760px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(100,140,180,0.18)', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid #ECEEF2', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 1, borderRadius: '16px 16px 0 0' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#2C3A42', margin: 0 }}>
              {initialData ? 'Editar Associação' : 'Nova Associação'}
            </h2>
            <p style={{ fontSize: '12px', color: '#738290', margin: '3px 0 0' }}>
              {initialData ? 'Edita os campos e grava as alterações.' : 'Associa um Use Case a um Produto de Dados.'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#738290', padding: '4px', borderRadius: '6px', display: 'flex' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Origem do produto — só em criação */}
          {!initialData && (
            <div>
              <p style={{ fontSize: '11px', fontWeight: '600', color: '#738290', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Origem do Produto de Dados</p>
              <div style={{ display: 'flex', background: '#F0F2F5', borderRadius: '8px', padding: '3px', width: 'fit-content' }}>
                {['novo','existente'].map(mode => (
                  <button key={mode} onClick={() => { setForm({ ...emptyForm, productMode: mode }); setError('') }}
                    style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: form.productMode === mode ? '#FFFFFF' : 'transparent', color: form.productMode === mode ? '#2C3A42' : '#738290', fontSize: '12px', fontWeight: form.productMode === mode ? '600' : '500', cursor: 'pointer', fontFamily: 'Inter, sans-serif', boxShadow: form.productMode === mode ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                    {mode === 'novo' ? 'Novo Produto de Dados' : 'Produto de Dados Existente'}
                  </button>
                ))}
              </div>
              {form.productMode === 'existente' && (
                <div style={{ marginTop: '12px' }}>
                  <Field label="Selecionar Produto de Dados">
                    <select style={inputStyle} value={form.produto_dados_id} onChange={e => handleSelectExisting(e.target.value)}>
                      <option value="">— selecionar —</option>
                      {produtosDados.map(p => <option key={p.id} value={p.id}>{p.id_produto_dados} — {p.nome_produto_dados}</option>)}
                    </select>
                  </Field>
                </div>
              )}
            </div>
          )}

          {/* Identificação */}
          <p style={{ fontSize: '11px', fontWeight: '600', color: '#738290', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Identificação</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field label="Domínio Owner">
              <select style={readOnly ? { ...inputStyle, background: '#F7F7F7' } : inputStyle} value={form.dominio_id} onChange={e => handleChange('dominio_id', e.target.value)} disabled={readOnly}>
                <option value="">— selecionar —</option>
                {dominios.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
              </select>
            </Field>
            <Field label="Domínio Requisitante">
              <select style={inputStyle} value={form.dominio_requisitante} onChange={e => handleChange('dominio_requisitante', e.target.value)}>
                <option value="">— selecionar —</option>
                {dominios.map(d => <option key={d.id} value={d.nome}>{d.nome}</option>)}
              </select>
            </Field>
          </div>

          {dominioSel?.business_owner && (
            <div style={{ background: '#F7F9FC', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#738290', marginTop: '-12px' }}>
              <span style={{ fontWeight: '600', color: '#2C3A42' }}>Business Owner: </span>{dominioSel.business_owner}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field label="Iniciativa">
              <select style={inputStyle} value={form.iniciativa_id} onChange={e => handleChange('iniciativa_id', e.target.value)}>
                <option value="">— selecionar —</option>
                {(form.dominio_id
                  ? iniciativas.filter(i => i.dominio_id === form.dominio_id)
                  : iniciativas
                ).map(i => <option key={i.id} value={i.id}>{i.id_iniciativa} — {i.nome_iniciativa}</option>)}
              </select>
            </Field>
            <Field label="Use Case" required>
              <select style={inputStyle} value={form.use_case_id} onChange={e => handleChange('use_case_id', e.target.value)}>
                <option value="">— selecionar —</option>
                {(form.iniciativa_id
                  ? useCases.filter(uc => uc.iniciativa_id === form.iniciativa_id)
                  : form.dominio_id
                    ? useCases.filter(uc => iniciativas.find(i => i.id === uc.iniciativa_id)?.dominio_id === form.dominio_id)
                    : useCases
                ).map(uc => <option key={uc.id} value={uc.id}>{uc.id_use_case} — {uc.nome_use_case}</option>)}
              </select>
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
            <Field label="ID Produto de Dados" required>
              <input style={roStyle} value={form.id_produto_dados} onChange={e => handleChange('id_produto_dados', e.target.value)} placeholder="ex: PD-001" readOnly={readOnly} />
            </Field>
            <Field label="Nome Produto de Dados" required>
              <input style={roStyle} value={form.nome_produto_dados} onChange={e => handleChange('nome_produto_dados', e.target.value)} placeholder="Nome do produto de dados" readOnly={readOnly} />
            </Field>
          </div>

          {/* Status */}
          <p style={{ fontSize: '11px', fontWeight: '600', color: '#738290', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '4px 0 0' }}>Status</p>
          <div style={{ background: '#F7F9FC', border: '1.5px solid #E0E5EC', borderRadius: '10px', padding: '16px 18px', display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#738290', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>Status</label>
              <select style={inputStyle} value={form.status} onChange={e => handleChange('status', e.target.value)}>
                <option value="">— selecionar —</option>
                {sel('status').map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            {registered && (
              <span style={{ fontSize: '12px', color: '#5C8F6A', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Registado
              </span>
            )}
          </div>

          {statusChanged && siblingCount > 0 && (
            <div style={{ background: '#FBF6EC', border: '1.5px solid #E8D9B8', borderRadius: '8px', padding: '10px 14px', marginTop: '-12px' }}>
              <p style={{ fontSize: '12px', color: '#7A5A1E', margin: 0, lineHeight: '1.5' }}>
                Este Produto de Dados está associado a mais <strong>{siblingCount} Use Case{siblingCount !== 1 ? 's' : ''}</strong>. Ao registar, o status será actualizado em <strong>todas as associações</strong>.
              </p>
            </div>
          )}

          <Field label="Tipologia">
            <select style={readOnly ? { ...inputStyle, background: '#F7F7F7' } : inputStyle} value={form.tipologia} onChange={e => handleChange('tipologia', e.target.value)} disabled={readOnly}>
              <option value="">— selecionar —</option>
              {sel('tipologia').map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>

          <p style={{ fontSize: '11px', fontWeight: '600', color: '#738290', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '4px 0 0' }}>Detalhe</p>

          <Field label="Localização em Fabric">
            <input style={roStyle} value={form.localizacao_fabric} onChange={e => handleChange('localizacao_fabric', e.target.value)} placeholder="ex: Workspace / Lakehouse" readOnly={readOnly} />
          </Field>

          <Field label="Descrição">
            <textarea style={readOnly ? { ...textareaStyle, background: '#F7F7F7' } : textareaStyle} value={form.descricao} onChange={e => handleChange('descricao', e.target.value)} placeholder="Descreve o produto de dados..." readOnly={readOnly} />
          </Field>

          <p style={{ fontSize: '11px', fontWeight: '600', color: '#738290', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '4px 0 0' }}>Técnico</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <Field label="Filtros">
              <input style={roStyle} value={form.filtros} onChange={e => handleChange('filtros', e.target.value)} placeholder="ex: Ano, Região" readOnly={readOnly} />
            </Field>
            <Field label="Frequência de Update">
              <select style={readOnly ? { ...inputStyle, background: '#F7F7F7' } : inputStyle} value={form.frequencia} onChange={e => handleChange('frequencia', e.target.value)} disabled={readOnly}>
                <option value="">— selecionar —</option>
                {sel('frequencia').map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Volumes">
              <input style={roStyle} value={form.volumes} onChange={e => handleChange('volumes', e.target.value)} placeholder="ex: ~2M rows/mês" readOnly={readOnly} />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field label="Histórico">
              <select style={readOnly ? { ...inputStyle, background: '#F7F7F7' } : inputStyle} value={form.historico} onChange={e => handleChange('historico', e.target.value)} disabled={readOnly}>
                <option value="">— selecionar —</option>
                {sel('historico').map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Update">
              <input style={roStyle} value={form.update_info} onChange={e => handleChange('update_info', e.target.value)} placeholder="ex: Full load / Incremental" readOnly={readOnly} />
            </Field>
          </div>

          {error && <p style={{ fontSize: '12px', color: '#C0544C', margin: 0 }}>{error}</p>}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px', borderTop: '1px solid #ECEEF2', display: 'flex', justifyContent: 'flex-end', gap: '10px', position: 'sticky', bottom: 0, background: '#FFFFFF', borderRadius: '0 0 16px 16px' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: '8px', border: '1.5px solid #E0E5EC', background: '#FFFFFF', color: '#738290', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Cancelar</button>
          {statusChanged && (
            <button onClick={async () => { await handleRegistarAlteracao(); handleSave() }} disabled={registering}
              style={{ padding: '9px 20px', borderRadius: '8px', border: '1.5px solid rgba(92,143,106,0.35)', background: 'rgba(92,143,106,0.12)', color: '#2A6040', fontSize: '13px', fontWeight: '600', cursor: registering ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '7px', opacity: registering ? 0.7 : 1 }}
              onMouseEnter={e => { e.currentTarget.style.background = '#5C8F6A'; e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.borderColor = '#5C8F6A' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(92,143,106,0.12)'; e.currentTarget.style.color = '#2A6040'; e.currentTarget.style.borderColor = 'rgba(92,143,106,0.35)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
              {registering ? 'A registar...' : 'Gravar e Registar Alteração'}
            </button>
          )}
          <button onClick={handleSave}
            style={{ padding: '9px 20px', borderRadius: '8px', border: '1.5px solid rgba(92,143,106,0.35)', background: 'rgba(92,143,106,0.12)', color: '#2A6040', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#5C8F6A'; e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.borderColor = '#5C8F6A' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(92,143,106,0.12)'; e.currentTarget.style.color = '#2A6040'; e.currentTarget.style.borderColor = 'rgba(92,143,106,0.35)' }}>
            Gravar
          </button>
        </div>
      </div>
    </div>
  )
}