import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useReferenceData } from '../context/ReferenceDataContext'

const emptyForm = {
  id_iniciativa: '', nome_iniciativa: '',
  id_usecase_ai: '', nome_use_case: '',
  id_produto_dados: '', nome_produto_dados: '',
  status: '', tipologia: '', localizacao_fabric: '',
  descricao: '', owner: '', dominio_requisitante: '',
  casos_uso_suportados: '',
  filtros: '', historico: '',
  update_info: '', frequencia: '', volumes: '',
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

const inputStyle = {
  padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #E0E5EC',
  fontSize: '13px', color: '#2C3A42', background: '#FFFFFF', outline: 'none',
  fontFamily: 'Inter, sans-serif', width: '100%', boxSizing: 'border-box',
}

const textareaStyle = { ...inputStyle, resize: 'vertical', minHeight: '72px', lineHeight: '1.5' }

export default function ProvisionamentoModal({ isOpen, onClose, onSave, initialData }) {
  const { enumeracoes, dominios, iniciativas, produtosDados } = useReferenceData()
  const [form, setForm] = useState(emptyForm)
  const [originalStatus, setOriginalStatus] = useState('')
  const [statusChanged, setStatusChanged] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [registered, setRegistered] = useState(false)
  const [siblingCount, setSiblingCount] = useState(0)
  const [useCaseOptions, setUseCaseOptions] = useState([])
  const [error, setError] = useState('')
  const [productMode, setProductMode] = useState('novo') // 'novo' | 'existente' | 'edicao'
  const [allDataProducts, setAllDataProducts] = useState([])
  const [existingProductStatuses, setExistingProductStatuses] = useState({})

  const iniciativaOptions = Array.from(
    new Map(iniciativas.map(r => [String(r.id_iniciativa), r.nome_iniciativa])).entries()
  ).map(([id, nome]) => ({ id, nome }))

  useEffect(() => {
    if (isOpen && !initialData) {
      supabase.from('data_products').select('id,id_usecase_ai,nome_produto_dados,id_produto_dados,status,created_at').then(({ data }) => {
        if (data) {
          setAllDataProducts(data)
          // Status mais recente por id_produto_dados (um produto tem sempre um único status)
          const sorted = [...data].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          const map = {}
          sorted.forEach(r => {
            if (r.id_produto_dados && !(r.id_produto_dados in map)) {
              map[r.id_produto_dados] = r.status
            }
          })
          setExistingProductStatuses(map)
        }
      })
    }
  }, [isOpen, initialData])

  useEffect(() => {
    if (isOpen) {
      const data = initialData ? { ...emptyForm, ...initialData } : emptyForm
      setForm(data)
      setOriginalStatus(data.status)
      setStatusChanged(false)
      setRegistered(false)
      setError('')
      setProductMode(initialData ? 'edicao' : 'novo')
      if (data.id_iniciativa) {
        const matches = iniciativas.filter(r => String(r.id_iniciativa) === String(data.id_iniciativa))
        setUseCaseOptions(matches.map(r => ({ id: String(r.id_use_case), nome: r.nome_use_case })))
      } else {
        setUseCaseOptions([])
      }
    }
  }, [isOpen, initialData, iniciativas])

  if (!isOpen) return null

  const handleChange = (field, value) => {
    if (field === 'id_iniciativa') {
      const matches = iniciativas.filter(r => String(r.id_iniciativa) === String(value))
      const ucOpts = matches.map(r => ({ id: String(r.id_use_case), nome: r.nome_use_case }))
      const nomeIniciativa = matches[0]?.nome_iniciativa || ''
      const dominioOwner = matches[0]?.dominio_owner || ''
      setUseCaseOptions(ucOpts)
      const autoUC = ucOpts.length === 1 ? ucOpts[0] : null
      setForm(prev => ({
        ...prev,
        id_iniciativa: value,
        nome_iniciativa: nomeIniciativa,
        owner: dominioOwner || prev.owner,
        id_usecase_ai: autoUC ? autoUC.id : '',
        nome_use_case: autoUC ? autoUC.nome : '',
        casos_uso_suportados: autoUC ? autoUC.nome : '',
      }))
      return
    }
    if (field === 'id_usecase_ai') {
      const match = useCaseOptions.find(r => r.id === value)
      const inic = iniciativas.find(r => String(r.id_use_case) === String(value))
      if (inic && !form.id_iniciativa) {
        const nomeIniciativa = inic.nome_iniciativa
        const dominioOwner = inic.dominio_owner || ''
        const ucOpts = iniciativas.filter(r => String(r.id_iniciativa) === String(inic.id_iniciativa)).map(r => ({ id: String(r.id_use_case), nome: r.nome_use_case }))
        setUseCaseOptions(ucOpts)
        setForm(prev => ({
          ...prev,
          id_iniciativa: String(inic.id_iniciativa),
          nome_iniciativa: nomeIniciativa,
          owner: dominioOwner || prev.owner,
          id_usecase_ai: value,
          nome_use_case: (match?.nome) || inic.nome_use_case || '',
          casos_uso_suportados: (match?.nome) || inic.nome_use_case || '',
        }))
        return
      }
      // Iniciativa já escolhida → preenche também o owner se ainda vazio
      const dominioOwner = inic?.dominio_owner || ''
      setForm(prev => ({
        ...prev,
        id_usecase_ai: value,
        nome_use_case: match?.nome || '',
        owner: prev.owner || dominioOwner,
        casos_uso_suportados: match?.nome || '',
      }))
      return
    }
    setForm(prev => ({ ...prev, [field]: value }))
    if (field === 'status') {
      setStatusChanged(value !== originalStatus)
      setRegistered(false)
      if (value !== originalStatus && form.id_produto_dados) {
        supabase.from('data_products').select('id', { count: 'exact', head: false }).eq('id_produto_dados', form.id_produto_dados).then(({ data }) => {
          const others = initialData ? (data || []).filter(r => r.id !== initialData.id) : (data || [])
          setSiblingCount(others.length)
        })
      } else {
        setSiblingCount(0)
      }
    }
  }

  const handleSelectExisting = (productName) => {
    if (!productName) {
      setForm(emptyForm)
      return
    }
    const template = produtosDados.find(p => p.nome_produto_dados === productName)
    if (!template) return
    // Reaproveitar assume o status ATUAL do produto (já não força "DP reaproveitado")
    const currentStatus = existingProductStatuses[template.id_produto_dados] || ''
    setForm(prev => ({
      ...prev,
      nome_produto_dados: template.nome_produto_dados,
      id_produto_dados: template.id_produto_dados,
      tipologia: template.tipologia,
      localizacao_fabric: template.localizacao_fabric,
      descricao: template.descricao,
      owner: template.owner,
      filtros: template.filtros,
      historico: template.historico,
      update_info: template.update_info,
      frequencia: template.frequencia,
      volumes: template.volumes,
      status: currentStatus,
    }))
  }

  const handleRegistarAlteracao = async () => {
    if (!form.nome_produto_dados.trim()) { setError('Grava o Produto de Dados antes de registar a alteração.'); return }
    setRegistering(true)
    const today = new Date().toISOString().split('T')[0]

    // Encontra todas as outras associações deste mesmo Produto de Dados
    const { data: siblings } = await supabase
      .from('data_products')
      .select('id')
      .eq('id_produto_dados', form.id_produto_dados)
    const otherIds = (siblings || []).filter(s => !initialData || s.id !== initialData.id).map(s => s.id)

    // Propaga o novo status para as outras associações
    if (otherIds.length > 0) {
      await supabase.from('data_products').update({ status: form.status }).in('id', otherIds)
    }

    // O Registo de Alterações é orientado ao Produto de Dados — um único registo,
    // independentemente de quantos use cases o produto serve.
    await supabase.from('registo_alteracoes').insert([{ data_product: form.nome_produto_dados, status: form.status, data_inicio: today }])

    setRegistering(false)
    setRegistered(true)
    setStatusChanged(false)
    setOriginalStatus(form.status)
    setSiblingCount(0)
  }

  const handleSave = () => {
    if (!form.id_produto_dados.trim()) { setError('O ID Produto de Dados é obrigatório.'); return }
    if (!form.nome_produto_dados.trim()) { setError('O Nome do Produto de Dados é obrigatório.'); return }

    if (form.id_usecase_ai) {
      const duplicate = allDataProducts.find(p =>
        String(p.id_usecase_ai) === String(form.id_usecase_ai) &&
        p.nome_produto_dados === form.nome_produto_dados &&
        (!initialData || p.id !== initialData.id)
      )
      if (duplicate) {
        setError('Este Produto de Dados já está associado a este Use Case.')
        return
      }
    }

    onSave(form)
  }

  const sel = (v) => enumeracoes[v] || []
  const existingProducts = produtosDados

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
              {initialData ? 'Edita os campos e grava as alterações.' : 'Associa um Use Case a um Produto de Dados, novo ou existente.'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#738290', padding: '4px', borderRadius: '6px', display: 'flex' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Novo vs Existente — sempre em primeiro lugar */}
          {!initialData && (
            <div>
              <p style={{ fontSize: '11px', fontWeight: '600', color: '#738290', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>
                Origem do Produto de Dados
              </p>
              <div style={{ display: 'flex', background: '#F0F2F5', borderRadius: '8px', padding: '3px', width: 'fit-content' }}>
                <button
                  onClick={() => { setProductMode('novo'); setForm(emptyForm) }}
                  style={{
                    padding: '8px 16px', borderRadius: '6px', border: 'none',
                    background: productMode === 'novo' ? '#FFFFFF' : 'transparent',
                    color: productMode === 'novo' ? '#2C3A42' : '#738290',
                    fontSize: '12px', fontWeight: productMode === 'novo' ? '600' : '500',
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    boxShadow: productMode === 'novo' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  Novo Produto de Dados
                </button>
                <button
                  onClick={() => { setProductMode('existente'); setForm(emptyForm) }}
                  style={{
                    padding: '8px 16px', borderRadius: '6px', border: 'none',
                    background: productMode === 'existente' ? '#FFFFFF' : 'transparent',
                    color: productMode === 'existente' ? '#2C3A42' : '#738290',
                    fontSize: '12px', fontWeight: productMode === 'existente' ? '600' : '500',
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    boxShadow: productMode === 'existente' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  Produto de Dados Existente
                </button>
              </div>

              {productMode === 'existente' && (
                <div style={{ marginTop: '12px' }}>
                  <Field label="Selecionar Produto de Dados">
                    <select style={inputStyle} value={form.nome_produto_dados} onChange={e => handleSelectExisting(e.target.value)}>
                      <option value="">— selecionar —</option>
                      {existingProducts.map(p => (
                        <option key={p.id} value={p.nome_produto_dados}>{p.id_produto_dados} — {p.nome_produto_dados}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}
            </div>
          )}

          {/* Resto do formulário — só aparece depois de escolher Novo/Existente (ou em edição) */}
          {(initialData || productMode) && (
            <>

          {/* Identificação */}
          <p style={{ fontSize: '11px', fontWeight: '600', color: '#738290', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Identificação</p>

          <div style={{ display: 'grid', gridTemplateColumns: productMode === 'novo' ? '1fr' : '1fr 1fr', gap: '16px' }}>
            <Field label="Domínio Owner">
              <select style={inputStyle} value={form.owner} onChange={e => handleChange('owner', e.target.value)} disabled={productMode === 'existente'}>
                <option value="">— selecionar —</option>
                {dominios.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            {productMode !== 'novo' && (
              <Field label="Domínio Requisitante">
                <select style={inputStyle} value={form.dominio_requisitante} onChange={e => handleChange('dominio_requisitante', e.target.value)}>
                  <option value="">— selecionar —</option>
                  {dominios.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field label="Iniciativa">
              <select style={inputStyle} value={form.id_iniciativa} onChange={e => handleChange('id_iniciativa', e.target.value)}>
                <option value="">— selecionar —</option>
                {iniciativaOptions
                  .filter(o => !form.owner || iniciativas.some(r => String(r.id_iniciativa) === o.id && r.dominio_owner === form.owner))
                  .map(o => <option key={o.id} value={o.id}>{o.id} — {o.nome}</option>)}
              </select>
            </Field>
            <Field label="Use Case">
              <select style={inputStyle} value={form.id_usecase_ai} onChange={e => handleChange('id_usecase_ai', e.target.value)}>
                <option value="">— selecionar —</option>
                {(form.id_iniciativa
                  ? useCaseOptions
                  : Array.from(new Map(
                      iniciativas
                        .filter(r => !form.owner || r.dominio_owner === form.owner)
                        .map(r => [String(r.id_use_case), r.nome_use_case])
                    ).entries()).map(([id, nome]) => ({ id, nome }))
                ).map(o => <option key={o.id} value={o.id}>{o.id} — {o.nome}</option>)}
              </select>
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
            <Field label="ID Produto de Dados" required>
              <input style={{ ...inputStyle, background: productMode === 'existente' ? '#F7F7F7' : '#FFFFFF' }} value={form.id_produto_dados} onChange={e => handleChange('id_produto_dados', e.target.value)} placeholder="ex: PD-001" readOnly={productMode === 'existente'} />
            </Field>
            <Field label="Nome Produto de Dados" required>
              <input style={{ ...inputStyle, background: productMode === 'existente' ? '#F7F7F7' : '#FFFFFF' }} value={form.nome_produto_dados} onChange={e => handleChange('nome_produto_dados', e.target.value)} placeholder="Nome do produto de dados" readOnly={productMode === 'existente'} />
            </Field>
          </div>

          {/* Status */}
          <p style={{ fontSize: '11px', fontWeight: '600', color: '#738290', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '4px 0 0' }}>Status</p>
          <div style={{ background: '#F7F9FC', border: '1.5px solid #E0E5EC', borderRadius: '10px', padding: '16px 18px', display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#738290', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>Status</label>
              <select style={{ ...inputStyle, background: productMode === 'existente' ? '#F7F7F7' : '#FFFFFF' }} value={form.status} onChange={e => handleChange('status', e.target.value)} disabled={productMode === 'existente'}>
                <option value="">— selecionar —</option>
                {sel('status').map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            {statusChanged && (
              <button onClick={handleRegistarAlteracao} disabled={registering}
                style={{ padding: '9px 16px', borderRadius: '8px', border: 'none', background: '#5C8F6A', color: '#FFFFFF', fontSize: '12px', fontWeight: '600', cursor: registering ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px', opacity: registering ? 0.7 : 1, flexShrink: 0 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
                {registering ? 'A registar...' : 'Registar Alteração'}
              </button>
            )}
            {registered && (
              <span style={{ fontSize: '12px', color: '#5C8F6A', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                Registado
              </span>
            )}
          </div>

          {statusChanged && siblingCount > 0 && (
            <div style={{ background: '#FBF6EC', border: '1.5px solid #E8D9B8', borderRadius: '8px', padding: '10px 14px', marginTop: '-12px' }}>
              <p style={{ fontSize: '12px', color: '#7A5A1E', margin: 0, lineHeight: '1.5' }}>
                Este Produto de Dados está associado a mais <strong>{siblingCount} Use Case{siblingCount !== 1 ? 's' : ''}</strong>. Ao registar a alteração, o status será atualizado em <strong>todas as {siblingCount + 1} associações</strong>, com um único registo no Registo de Alterações.
              </p>
            </div>
          )}

          <Field label="Tipologia">
            <select style={inputStyle} value={form.tipologia} onChange={e => handleChange('tipologia', e.target.value)} disabled={productMode === 'existente'}>
              <option value="">— selecionar —</option>
              {sel('tipologia').map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>

          {/* Detalhe */}
          <p style={{ fontSize: '11px', fontWeight: '600', color: '#738290', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '4px 0 0' }}>Detalhe</p>

          <Field label="Localização em Fabric">
            <input style={{ ...inputStyle, background: productMode === 'existente' ? '#F7F7F7' : '#FFFFFF' }} value={form.localizacao_fabric} onChange={e => handleChange('localizacao_fabric', e.target.value)} placeholder="ex: Workspace / Lakehouse" readOnly={productMode === 'existente'} />
          </Field>

          <Field label="Descrição">
            <textarea style={{ ...textareaStyle, background: productMode === 'existente' ? '#F7F7F7' : '#FFFFFF' }} value={form.descricao} onChange={e => handleChange('descricao', e.target.value)} placeholder="Descreve o produto de dados..." readOnly={productMode === 'existente'} />
          </Field>

          <Field label="Casos de Uso Suportados">
            <textarea style={textareaStyle} value={form.casos_uso_suportados} onChange={e => handleChange('casos_uso_suportados', e.target.value)} placeholder="Lista os use cases suportados..." />
          </Field>

          {/* Técnico */}
          <p style={{ fontSize: '11px', fontWeight: '600', color: '#738290', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '4px 0 0' }}>Técnico</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <Field label="Filtros">
              <input style={{ ...inputStyle, background: productMode === 'existente' ? '#F7F7F7' : '#FFFFFF' }} value={form.filtros} onChange={e => handleChange('filtros', e.target.value)} placeholder="ex: Ano, Região, Entidade" readOnly={productMode === 'existente'} />
            </Field>
            <Field label="Frequência de Update">
              <select style={inputStyle} value={form.frequencia} onChange={e => handleChange('frequencia', e.target.value)} disabled={productMode === 'existente'}>
                <option value="">— selecionar —</option>
                {sel('frequencia').map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Volumes">
              <input style={{ ...inputStyle, background: productMode === 'existente' ? '#F7F7F7' : '#FFFFFF' }} value={form.volumes} onChange={e => handleChange('volumes', e.target.value)} placeholder="ex: ~2M rows/mês" readOnly={productMode === 'existente'} />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field label="Histórico">
              <select style={inputStyle} value={form.historico} onChange={e => handleChange('historico', e.target.value)} disabled={productMode === 'existente'}>
                <option value="">— selecionar —</option>
                {sel('historico').map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Update">
              <input style={{ ...inputStyle, background: productMode === 'existente' ? '#F7F7F7' : '#FFFFFF' }} value={form.update_info} onChange={e => handleChange('update_info', e.target.value)} placeholder="ex: Full load / Incremental" readOnly={productMode === 'existente'} />
            </Field>
          </div>

            </>
          )}

          {error && <p style={{ fontSize: '12px', color: '#C0544C', margin: 0 }}>{error}</p>}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px', borderTop: '1px solid #ECEEF2', display: 'flex', justifyContent: 'flex-end', gap: '10px', position: 'sticky', bottom: 0, background: '#FFFFFF', borderRadius: '0 0 16px 16px' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: '8px', border: '1.5px solid #E0E5EC', background: '#FFFFFF', color: '#738290', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Cancelar</button>
          <button onClick={handleSave} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: '#A1B5D8', color: '#FFFFFF', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Gravar</button>
        </div>
      </div>
    </div>
  )
}