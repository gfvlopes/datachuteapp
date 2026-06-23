import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useReferenceData } from '../context/referencedatacontext'

// ─── Status do catálogo de atributos ───────────────────────────────────────────
const ATR_STATUS_COLORS = {
  'Pendente UN':                  { bg: 'rgba(192,84,76,0.12)',   color: '#C0544C' },
  'Pendente Sistema Fonte':       { bg: 'rgba(201,151,74,0.15)',  color: '#9A6E20' },
  'Pendente envio de IT Build':   { bg: 'rgba(161,181,216,0.20)', color: '#5A7BA8' },
  'Pendente ingestão em Fabric':  { bg: 'rgba(168,181,192,0.18)', color: '#65737E' },
  'Disponível':                   { bg: 'rgba(92,143,106,0.18)',  color: '#2A6040' },
}

function AtrStatusBadge({ status }) {
  const s = ATR_STATUS_COLORS[status] || { bg: 'rgba(115,130,144,0.12)', color: '#738290' }
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

// ─── Modal Criar Caderno ───────────────────────────────────────────────────────
function CriarCadernoModal({ onClose, onSave, produtosDados, cadernos }) {
  const [modo, setModo] = useState('novo') // 'novo' | 'existente'
  const [nomeCaderno, setNomeCaderno] = useState('')
  const [focalPoint, setFocalPoint] = useState('')
  const [idProduto, setIdProduto] = useState('')
  const [nomeProduto, setNomeProduto] = useState('')
  const [cadernoOrigem, setCadernoOrigem] = useState('')
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  const handleProdutoIdChange = (val) => {
    setIdProduto(val)
    const found = produtosDados.find(p => p.id_produto_dados === val)
    setNomeProduto(found ? found.nome_produto_dados : '')
  }
  const handleProdutoNomeChange = (val) => {
    setNomeProduto(val)
    const found = produtosDados.find(p => p.nome_produto_dados === val)
    setIdProduto(found ? found.id_produto_dados : '')
  }

  const handleSubmit = async () => {
    if (!nomeCaderno.trim()) { setErro('O nome do caderno é obrigatório.'); return }
    if (!idProduto) { setErro('Associa um produto de dados.'); return }
    if (modo === 'existente' && !cadernoOrigem) { setErro('Selecciona o caderno de origem.'); return }
    setSaving(true); setErro('')

    const { count } = await supabase
      .from('cadernos_requisitos')
      .select('id', { count: 'exact', head: true })
      .eq('id_produto_dados', idProduto)

    const seq = (count || 0) + 1
    const nomeSlug = idProduto.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()
    const idCaderno = `CD_${seq}_${nomeSlug}`
    const prod = produtosDados.find(p => p.id_produto_dados === idProduto)

    const { data: novoCaderno, error } = await supabase.from('cadernos_requisitos').insert([{
      id_caderno: idCaderno,
      nome_caderno: nomeCaderno.trim(),
      focal_point: focalPoint.trim() || null,
      id_produto_dados: idProduto,
      nome_produto_dados: nomeProduto,
      dominio_owner: prod?.owner || null,
    }]).select()

    if (error) { setSaving(false); setErro(error.message); return }

    // Se modo existente, copiar atributos do caderno de origem
    if (modo === 'existente' && novoCaderno?.[0]) {
      const origem = cadernos.find(c => c.id_caderno === cadernoOrigem)
      if (origem) {
        const { data: atributosOrigem, error: errFetch } = await supabase
          .from('caderno_atributos')
          .select('nome_atributo,descricao_atributo,sistema_referencia,dominio_atributo,subdominio_atributo,nome_atributo_gold,descricao_atributo_gold,id_catalogo_atributo')
          .eq('id_caderno_fk', origem.id)

        if (errFetch) { console.error('Erro ao ler atributos de origem:', errFetch); }

        if (atributosOrigem?.length) {
          const copia = atributosOrigem.map(r => ({
            id_caderno_fk: novoCaderno[0].id,
            nome_atributo:            r.nome_atributo || null,
            descricao_atributo:       r.descricao_atributo || null,
            sistema_referencia:       r.sistema_referencia || null,
            dominio_atributo:         r.dominio_atributo || null,
            subdominio_atributo:      r.subdominio_atributo || null,
            nome_atributo_gold:       r.nome_atributo_gold || null,
            descricao_atributo_gold:  r.descricao_atributo_gold || null,
            id_catalogo_atributo:     r.id_catalogo_atributo || null,
          }))
          const { error: errInsert } = await supabase.from('caderno_atributos').insert(copia)
          if (errInsert) { console.error('Erro ao copiar atributos:', errInsert); alert('Caderno criado mas erro ao copiar atributos: ' + errInsert.message) }
        }
      }
    }

    setSaving(false)
    onSave()
  }

  const inputStyle = {
    width: '100%', padding: '8px 12px', borderRadius: '8px',
    border: '1.5px solid #E0E5EC', fontSize: '13px', color: '#2C3A42',
    background: '#FFFFFF', outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
  }
  const labelStyle = {
    fontSize: '11px', fontWeight: '600', color: '#738290',
    textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(44,58,66,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '28px 32px', width: '520px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#2C3A42', margin: '0 0 4px' }}>Criar Ficha Técnica</h3>
        <p style={{ fontSize: '12px', color: '#738290', margin: '0 0 20px' }}>O ID do caderno será gerado automaticamente.</p>

        {/* Toggle Novo / Existente */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '11px', fontWeight: '600', color: '#738290', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>
            Origem do Caderno
          </p>
          <div style={{ display: 'flex', background: '#F0F2F5', borderRadius: '8px', padding: '3px', width: 'fit-content' }}>
            {[{ id: 'novo', label: 'Novo Caderno' }, { id: 'existente', label: 'Baseado em Caderno Existente' }].map(op => (
              <button key={op.id} onClick={() => { setModo(op.id); setCadernoOrigem(''); setErro('') }}
                style={{
                  padding: '8px 16px', borderRadius: '6px', border: 'none',
                  background: modo === op.id ? '#FFFFFF' : 'transparent',
                  color: modo === op.id ? '#2C3A42' : '#738290',
                  fontSize: '12px', fontWeight: modo === op.id ? '600' : '500',
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  boxShadow: modo === op.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}>
                {op.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Caderno de origem — só no modo existente */}
          {modo === 'existente' && (
            <div>
              <label style={labelStyle}>Caderno de Origem</label>
              <select style={inputStyle} value={cadernoOrigem} onChange={e => setCadernoOrigem(e.target.value)}>
                <option value="">— selecionar caderno —</option>
                {cadernos.map(c => (
                  <option key={c.id} value={c.id_caderno}>{c.id_caderno} — {c.nome_caderno}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={labelStyle}>Nome do Caderno</label>
            <input style={inputStyle} placeholder="Ex: Ficha Técnica — NIF Cliente" value={nomeCaderno} onChange={e => setNomeCaderno(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Focal Point</label>
            <input style={inputStyle} placeholder="Nome do responsável" value={focalPoint} onChange={e => setFocalPoint(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Produto de Dados</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select style={{ ...inputStyle, flex: '0 0 140px' }} value={idProduto} onChange={e => handleProdutoIdChange(e.target.value)}>
                <option value="">ID Produto</option>
                {produtosDados.map(p => <option key={p.id_produto_dados} value={p.id_produto_dados}>{p.id_produto_dados}</option>)}
              </select>
              <select style={{ ...inputStyle, flex: 1 }} value={nomeProduto} onChange={e => handleProdutoNomeChange(e.target.value)}>
                <option value="">Nome Produto</option>
                {produtosDados.map(p => <option key={p.id_produto_dados} value={p.nome_produto_dados}>{p.nome_produto_dados}</option>)}
              </select>
            </div>
          </div>
        </div>

        {modo === 'existente' && cadernoOrigem && (
          <div style={{ marginTop: '16px', background: 'rgba(92,143,106,0.08)', border: '1.5px solid #B5D0BE', borderRadius: '8px', padding: '10px 14px' }}>
            <p style={{ fontSize: '12px', color: '#4A7A5A', margin: 0, lineHeight: '1.6' }}>
              Todos os atributos do caderno <strong>{cadernoOrigem}</strong> serão copiados para o novo caderno — levantamento de alto nível, secção DSG e associações ao catálogo.
            </p>
          </div>
        )}

        {erro && <p style={{ fontSize: '12px', color: '#C0544C', margin: '16px 0 0', background: 'rgba(192,84,76,0.08)', padding: '8px 12px', borderRadius: '6px' }}>{erro}</p>}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: '8px', border: '1.5px solid #E0E5EC', background: '#FFFFFF', color: '#738290', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#A1B5D8', color: '#FFFFFF', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
            {saving ? 'A criar...' : 'Criar Caderno'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal Editar Caderno ──────────────────────────────────────────────────────
function EditarCadernoModal({ caderno, onClose, onSave, produtosDados }) {
  const { dominios } = useReferenceData()
  const [nomeCaderno, setNomeCaderno] = useState(caderno.nome_caderno || '')
  const [focalPoint, setFocalPoint] = useState(caderno.focal_point || '')
  const [idProduto, setIdProduto] = useState(caderno.id_produto_dados || '')
  const [nomeProduto, setNomeProduto] = useState(caderno.nome_produto_dados || '')
  const [dominioOwner, setDominioOwner] = useState(caderno.dominio_owner || '')
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  const handleProdutoIdChange = (val) => {
    setIdProduto(val)
    const found = produtosDados.find(p => p.id_produto_dados === val)
    if (found) { setNomeProduto(found.nome_produto_dados); setDominioOwner(found.owner || '') }
    else setNomeProduto('')
  }
  const handleProdutoNomeChange = (val) => {
    setNomeProduto(val)
    const found = produtosDados.find(p => p.nome_produto_dados === val)
    if (found) { setIdProduto(found.id_produto_dados); setDominioOwner(found.owner || '') }
    else setIdProduto('')
  }

  const handleSubmit = async () => {
    if (!nomeCaderno.trim()) { setErro('O nome do caderno é obrigatório.'); return }
    setSaving(true); setErro('')
    const { error } = await supabase.from('cadernos_requisitos').update({
      nome_caderno:      nomeCaderno.trim(),
      focal_point:       focalPoint.trim() || null,
      id_produto_dados:  idProduto || null,
      nome_produto_dados: nomeProduto || null,
      dominio_owner:     dominioOwner || null,
    }).eq('id', caderno.id)
    setSaving(false)
    if (error) { setErro(error.message); return }
    onSave({ ...caderno, nome_caderno: nomeCaderno.trim(), focal_point: focalPoint.trim() || null, id_produto_dados: idProduto, nome_produto_dados: nomeProduto, dominio_owner: dominioOwner })
  }

  const inputStyle = {
    width: '100%', padding: '8px 12px', borderRadius: '8px',
    border: '1.5px solid #E0E5EC', fontSize: '13px', color: '#2C3A42',
    background: '#FFFFFF', outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
  }
  const labelStyle = {
    fontSize: '11px', fontWeight: '600', color: '#738290',
    textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(44,58,66,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '28px 32px', width: '520px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#2C3A42', margin: '0 0 6px' }}>Editar Caderno</h3>
            <span style={{ background: 'rgba(92,143,106,0.15)', color: '#2A6040', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: '700' }}>
              {caderno.id_caderno}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#738290', padding: '4px', borderRadius: '6px', display: 'flex' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Nome do Caderno</label>
            <input style={inputStyle} value={nomeCaderno} onChange={e => setNomeCaderno(e.target.value)} placeholder="Nome do caderno" />
          </div>
          <div>
            <label style={labelStyle}>Focal Point</label>
            <input style={inputStyle} value={focalPoint} onChange={e => setFocalPoint(e.target.value)} placeholder="Nome do responsável" />
          </div>
          <div>
            <label style={labelStyle}>Produto de Dados</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select style={{ ...inputStyle, flex: '0 0 140px' }} value={idProduto} onChange={e => handleProdutoIdChange(e.target.value)}>
                <option value="">ID Produto</option>
                {produtosDados.map(p => <option key={p.id_produto_dados} value={p.id_produto_dados}>{p.id_produto_dados}</option>)}
              </select>
              <select style={{ ...inputStyle, flex: 1 }} value={nomeProduto} onChange={e => handleProdutoNomeChange(e.target.value)}>
                <option value="">Nome Produto</option>
                {produtosDados.map(p => <option key={p.id_produto_dados} value={p.nome_produto_dados}>{p.nome_produto_dados}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Domínio Owner</label>
            <select style={inputStyle} value={dominioOwner} onChange={e => setDominioOwner(e.target.value)}>
              <option value="">— selecionar —</option>
              {dominios.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {erro && <p style={{ fontSize: '12px', color: '#C0544C', margin: '16px 0 0', background: 'rgba(192,84,76,0.08)', padding: '8px 12px', borderRadius: '6px' }}>{erro}</p>}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: '8px', border: '1.5px solid #E0E5EC', background: '#FFFFFF', color: '#738290', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#A1B5D8', color: '#FFFFFF', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
            {saving ? 'A guardar...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}


function BannerField({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <span style={{ fontSize: '10px', fontWeight: '600', color: '#B0BCC8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      <span style={{ fontSize: '13px', color: value ? '#2C3A42' : '#D0D8E0', fontWeight: value ? '500' : '300' }}>{value || '—'}</span>
    </div>
  )
}

// ─── Detalhe do Caderno ────────────────────────────────────────────────────────
function CadernoDetalhe({ caderno, onDelete, onUpdate, produtosDados }) {
  const [atributos, setAtributos] = useState([])
  const [loadingAtr, setLoadingAtr] = useState(false)
  const [dominioSubMap, setDominioSubMap] = useState({})
  const [catalogoNomes, setCatalogoNomes] = useState([])
  const [catalogoDescricoes, setCatalogoDescricoes] = useState([])
  const [nomeDescMap, setNomeDescMap] = useState({})
  const [descNomeMap, setDescNomeMap] = useState({})
  const [nomeStatusMap, setNomeStatusMap] = useState({})
  const [nomeIdMap, setNomeIdMap] = useState({})
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [catalogoTarget, setCatalogoTarget] = useState(null)
  const [editarOpen, setEditarOpen] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)

  useEffect(() => {
    supabase.from('d_dominio_do').select('dominio,subdominio').then(({ data }) => {
      if (data) {
        const map = {}
        data.forEach(r => {
          if (!r.dominio) return
          if (!map[r.dominio]) map[r.dominio] = new Set()
          if (r.subdominio) map[r.dominio].add(r.subdominio)
        })
        const obj = {}
        Object.keys(map).forEach(d => { obj[d] = [...map[d]].sort() })
        setDominioSubMap(obj)
      }
    })
    supabase.from('d_catalogo_atributos').select('id,nome_atributo_gold,descricao_atributo_gold,status').then(({ data }) => {
      if (data) {
        setCatalogoNomes([...new Set(data.map(r => r.nome_atributo_gold).filter(Boolean))].sort())
        setCatalogoDescricoes([...new Set(data.map(r => r.descricao_atributo_gold).filter(Boolean))].sort())
        const map = {}, inv = {}, stat = {}, idMap = {}
        data.forEach(r => {
          if (r.nome_atributo_gold && !map[r.nome_atributo_gold]) map[r.nome_atributo_gold] = r.descricao_atributo_gold || ''
          if (r.descricao_atributo_gold && !inv[r.descricao_atributo_gold]) inv[r.descricao_atributo_gold] = r.nome_atributo_gold || ''
          if (r.nome_atributo_gold) { stat[r.nome_atributo_gold] = r.status || null; idMap[r.nome_atributo_gold] = r.id }
        })
        setNomeDescMap(map); setDescNomeMap(inv); setNomeStatusMap(stat); setNomeIdMap(idMap)
      }
    })
  }, [])

  useEffect(() => { if (caderno) fetchAtributos() }, [caderno?.id])

  const fetchAtributos = async () => {
    setLoadingAtr(true)
    const { data } = await supabase.from('caderno_atributos').select('*').eq('id_caderno_fk', caderno.id).order('created_at')
    setAtributos(data || [])
    setLoadingAtr(false)
  }

  const addLinha = async () => {
    const { data, error } = await supabase.from('caderno_atributos').insert([{ id_caderno_fk: caderno.id }]).select()
    if (!error && data) setAtributos(prev => [...prev, data[0]])
  }

  const updateLinha = async (id, field, value) => {
    setAtributos(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
    await supabase.from('caderno_atributos').update({ [field]: value }).eq('id', id)
  }

  const updateDominio = async (id, value) => {
    setAtributos(prev => prev.map(r => r.id === id ? { ...r, dominio_atributo: value, subdominio_atributo: null } : r))
    await supabase.from('caderno_atributos').update({ dominio_atributo: value, subdominio_atributo: null }).eq('id', id)
  }

  const removeLinha = async (id) => {
    setAtributos(prev => prev.filter(r => r.id !== id))
    await supabase.from('caderno_atributos').delete().eq('id', id)
  }

  const handleDeleteClick = (row) => {
    const dataFields = ['nome_atributo', 'descricao_atributo', 'sistema_referencia', 'dominio_atributo', 'subdominio_atributo', 'nome_atributo_gold', 'descricao_atributo_gold']
    const temInfo = dataFields.some(f => row[f] && String(row[f]).trim() !== '')
    if (temInfo) setDeleteTarget(row.id)
    else removeLinha(row.id)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    await removeLinha(deleteTarget)
    setDeleteTarget(null)
  }

  const addAoCatalogo = async (row) => {
    const nome = row.nome_atributo_gold?.trim()
    const desc = row.descricao_atributo_gold?.trim()
    if (!nome) return
    const { data: insertedRows, error } = await supabase.from('d_catalogo_atributos').insert([{
      nome_atributo_gold: nome,
      descricao_atributo_gold: desc || null,
      sistema_referencia_gold: row.sistema_referencia?.trim() || null,
      dominio_atributo: row.dominio_atributo || null,
      subdominio_atributo: row.subdominio_atributo || null,
      status: 'Pendente UN',
    }]).select()
    if (error) {
      console.error('Erro ao adicionar ao catálogo:', error)
      alert('Não foi possível adicionar ao catálogo: ' + error.message)
      return
    }
    const novoId = insertedRows?.[0]?.id || null
    // Guardar id_catalogo_atributo na linha do caderno
    if (novoId) {
      await supabase.from('caderno_atributos').update({ id_catalogo_atributo: novoId }).eq('id', row.id)
      setAtributos(prev => prev.map(r => r.id === row.id ? { ...r, id_catalogo_atributo: novoId } : r))
    }
    setNomeStatusMap(prev => ({ ...prev, [nome]: 'Pendente UN' }))
    setNomeIdMap(prev => ({ ...prev, [nome]: novoId }))
    setNomeDescMap(prev => ({ ...prev, [nome]: desc || '' }))
    if (desc) setDescNomeMap(prev => ({ ...prev, [desc]: nome }))
    setCatalogoNomes(prev => prev.includes(nome) ? prev : [...prev, nome].sort())
    if (desc) setCatalogoDescricoes(prev => prev.includes(desc) ? prev : [...prev, desc].sort())
    setCatalogoTarget(null)
  }

  if (!caderno) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', color: '#B0BCC8', fontSize: '13px', flexDirection: 'column', gap: '8px', minHeight: '400px' }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D0D8E0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
      </svg>
      Selecciona um ficha técnica para ver o detalhe
    </div>
  )

  const dominioOptions = Object.keys(dominioSubMap).sort()
  const inputStyle = {
    width: '100%', padding: '6px 9px', borderRadius: '6px', border: '1.5px solid #E0E5EC',
    fontSize: '12px', color: '#2C3A42', background: '#FFFFFF', outline: 'none',
    fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
  }

  const UN_COLUMNS = [
    { key: 'nome_atributo',       label: 'Nome Atributo',         width: '180px', type: 'text' },
    { key: 'descricao_atributo',  label: 'Descrição Atributo',    width: '240px', type: 'text' },
    { key: 'sistema_referencia',  label: 'Sistema de Referência', width: '180px', type: 'text' },
    { key: 'dominio_atributo',    label: 'Domínios',              width: '190px', type: 'dominio' },
    { key: 'subdominio_atributo', label: 'Sub Domínios',          width: '190px', type: 'subdominio' },
  ]
  const DSG_COLUMNS = [
    { key: 'nome_atributo_gold',      label: 'Nome atributo (Gold)',              width: '200px', type: 'combo', list: 'nomes' },
    { key: 'descricao_atributo_gold', label: 'Descrição do atributo necessário',  width: '260px', type: 'combo', list: 'descricoes' },
    { key: '_catalogo',               label: 'Catálogo',                          width: '200px', type: 'catalogo' },
  ]
  const ALL_COLUMNS = [...UN_COLUMNS, ...DSG_COLUMNS]
  const deleteColWidth = 34
  const tableWidth = ALL_COLUMNS.reduce((s, c) => s + parseInt(c.width), 0)

  const renderCell = (row, col) => {
    if (col.type === 'text') {
      return (
        <input style={inputStyle} value={row[col.key] || ''}
          onChange={e => setAtributos(prev => prev.map(r => r.id === row.id ? { ...r, [col.key]: e.target.value } : r))}
          onBlur={e => updateLinha(row.id, col.key, e.target.value.trim() || null)} placeholder="—" />
      )
    }
    if (col.type === 'dominio') {
      return (
        <select style={inputStyle} value={row.dominio_atributo || ''} onChange={e => updateDominio(row.id, e.target.value || null)}>
          <option value="">—</option>
          {dominioOptions.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      )
    }
    if (col.type === 'subdominio') {
      return (
        <select style={inputStyle} value={row.subdominio_atributo || ''} onChange={e => updateLinha(row.id, 'subdominio_atributo', e.target.value || null)} disabled={!row.dominio_atributo}>
          <option value="">—</option>
          {(dominioSubMap[row.dominio_atributo] || []).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      )
    }
    if (col.type === 'combo') {
      const listId = `list-${col.list}`
      const options = col.list === 'nomes' ? catalogoNomes : catalogoDescricoes
      const isNomeGold = col.key === 'nome_atributo_gold'
      const isDescGold = col.key === 'descricao_atributo_gold'
      const handleComboChange = (val) => {
        if (isNomeGold && Object.prototype.hasOwnProperty.call(nomeDescMap, val)) {
          const desc = nomeDescMap[val] || ''
          const idCatalogo = nomeIdMap[val] || null
          setAtributos(prev => prev.map(r => r.id === row.id ? { ...r, nome_atributo_gold: val, descricao_atributo_gold: desc, id_catalogo_atributo: idCatalogo } : r))
          updateLinha(row.id, 'nome_atributo_gold', val || null)
          updateLinha(row.id, 'descricao_atributo_gold', desc || null)
          if (idCatalogo) updateLinha(row.id, 'id_catalogo_atributo', idCatalogo)
        } else if (isDescGold && Object.prototype.hasOwnProperty.call(descNomeMap, val)) {
          const nome = descNomeMap[val] || ''
          const idCatalogo = nomeIdMap[nome] || null
          setAtributos(prev => prev.map(r => r.id === row.id ? { ...r, descricao_atributo_gold: val, nome_atributo_gold: nome, id_catalogo_atributo: idCatalogo } : r))
          updateLinha(row.id, 'descricao_atributo_gold', val || null)
          updateLinha(row.id, 'nome_atributo_gold', nome || null)
          if (idCatalogo) updateLinha(row.id, 'id_catalogo_atributo', idCatalogo)
        } else {
          setAtributos(prev => prev.map(r => r.id === row.id ? { ...r, [col.key]: val } : r))
        }
      }
      return (
        <>
          <input style={inputStyle} list={listId} value={row[col.key] || ''}
            onChange={e => handleComboChange(e.target.value)}
            onInput={e => handleComboChange(e.target.value)}
            onBlur={e => updateLinha(row.id, col.key, e.target.value.trim() || null)}
            placeholder="Selecciona ou escreve…" />
          <datalist id={listId}>{options.map(o => <option key={o} value={o} />)}</datalist>
        </>
      )
    }
    if (col.type === 'catalogo') {
      const nome = row.nome_atributo_gold?.trim()
      const desc = row.descricao_atributo_gold?.trim()
      const existeNoCatalogo = nome && Object.prototype.hasOwnProperty.call(nomeStatusMap, nome)
      if (existeNoCatalogo) return <AtrStatusBadge status={nomeStatusMap[nome]} />
      if (nome && desc) {
        return (
          <button onClick={() => setCatalogoTarget(row)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 11px', borderRadius: '7px', border: '1.5px solid #B5D0BE', background: 'rgba(92,143,106,0.10)', color: '#4A7A5A', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(92,143,106,0.18)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(92,143,106,0.10)'}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Adicionar ao catálogo
          </button>
        )
      }
      return <span style={{ color: '#D0D8E0', fontSize: '11px' }}>—</span>
    }
    return null
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>

      {/* Banner */}
      <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ background: 'rgba(92,143,106,0.15)', color: '#2A6040', borderRadius: '6px', padding: '3px 10px', fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em' }}>
              {caderno.id_caderno}
            </span>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#2C3A42', margin: 0 }}>{caderno.nome_caderno}</h2>
          </div>
          {/* Botões */}
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button onClick={() => setEditarOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: '1.5px solid #C8D5E8', background: 'rgba(161,181,216,0.12)', color: '#5A7BA8', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(161,181,216,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(161,181,216,0.12)'}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Editar
            </button>
            <button onClick={() => setDeleteModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: '1.5px solid #E8C8C6', background: 'rgba(192,84,76,0.08)', color: '#C0544C', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(192,84,76,0.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(192,84,76,0.08)'}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Eliminar Caderno
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
          <BannerField label="Focal Point" value={caderno.focal_point} />
          <BannerField label="Produto de Dados" value={caderno.nome_produto_dados} />
          <BannerField label="Domínio Owner" value={caderno.dominio_owner} />
          <BannerField label="Criado em" value={caderno.created_at ? new Date(caderno.created_at).toLocaleDateString('pt-PT') : null} />
        </div>
      </div>

      {/* Botão adicionar linha */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
          <button onClick={addLinha}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #B5D0BE', background: 'rgba(92,143,106,0.10)', color: '#4A7A5A', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(92,143,106,0.18)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(92,143,106,0.10)'}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" opacity="0.4" />
              <line x1="3" y1="12" x2="21" y2="12" opacity="0.4" />
              <line x1="3" y1="18" x2="13" y2="18" opacity="0.4" />
              <line x1="18" y1="15" x2="18" y2="21" />
              <line x1="15" y1="18" x2="21" y2="18" />
            </svg>
            Adicionar linha
          </button>
        </div>

        {/* Tabela — recua deleteColWidth para o delete cair na margem; scroll começa na tabela */}
        {/* Flex: coluna de deletes (fora do scroll) + tabela (com scroll) */}
        <div style={{ display: 'flex', alignItems: 'flex-start', marginLeft: `-${deleteColWidth}px` }}>
          {/* Deletes — alinhados por linha, fora do scroll */}
          <div style={{ flexShrink: 0, width: `${deleteColWidth}px` }}>
            {/* Espaço dos 2 headers */}
            <div style={{ height: '63px' }} />
            {atributos.map((row) => (
              <div key={row.id} style={{ height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button onClick={() => handleDeleteClick(row)}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '5px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#C8A09C' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(192,84,76,0.12)'; e.currentTarget.style.color = '#C0544C' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#C8A09C' }}
                  title="Eliminar linha">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Tabela com scroll próprio */}
          <div style={{ overflowX: 'auto', flex: 1, minWidth: 0 }}>
            <table style={{ borderCollapse: 'collapse', fontSize: '12px', color: '#2C3A42', fontFamily: 'Inter, sans-serif', tableLayout: 'fixed', width: `${tableWidth}px` }}>
            <colgroup>
              {ALL_COLUMNS.map(c => <col key={c.key} style={{ width: c.width }} />)}
            </colgroup>
            <thead>
              <tr>
                <th colSpan={UN_COLUMNS.length} style={{ padding: '7px 14px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: '#4A7A5A', background: 'rgba(194,216,185,0.15)', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '2px solid rgba(74,122,90,0.2)', borderTopLeftRadius: '8px', borderRight: '2px solid rgba(74,122,90,0.18)' }}>
                  UN Business Owner — Levantamento dados alto nível
                </th>
                <th colSpan={DSG_COLUMNS.length} style={{ padding: '7px 14px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: '#5A7BA8', background: 'rgba(161,181,216,0.15)', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '2px solid rgba(90,123,168,0.25)', borderTopRightRadius: '8px' }}>
                  DSG
                </th>
              </tr>
              <tr style={{ borderBottom: '1px solid #ECEEF2' }}>
                {ALL_COLUMNS.map((col, i) => {
                  const isLastUN = i === UN_COLUMNS.length - 1
                  return (
                    <th key={col.key} style={{ padding: '9px 12px', textAlign: 'left', fontSize: '10px', fontWeight: '600', color: '#738290', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', background: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', borderRight: isLastUN ? '2px solid #ECEEF2' : 'none' }}>
                      {col.label}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {loadingAtr && (
                <tr><td colSpan={ALL_COLUMNS.length} style={{ padding: '32px', textAlign: 'center', color: '#738290', fontSize: '13px' }}>A carregar...</td></tr>
              )}
              {!loadingAtr && atributos.length === 0 && (
                <tr><td colSpan={ALL_COLUMNS.length} style={{ padding: '40px 24px', textAlign: 'center', color: '#B0BCC8', fontSize: '13px' }}>Nenhum atributo levantado. Clica em "Adicionar linha" para começar.</td></tr>
              )}
              {atributos.map((row, idx) => (
                <tr key={row.id} style={{ background: idx % 2 === 0 ? '#FFFFFF' : '#FAFBFC' }}>
                  {ALL_COLUMNS.map((col, i) => {
                    const isLastUN = i === UN_COLUMNS.length - 1
                    return (
                      <td key={col.key} style={{ padding: '6px 8px', height: '45px', boxSizing: 'border-box', borderRight: isLastUN ? '2px solid #ECEEF2' : 'none' }}>
                        {renderCell(row, col)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* Popup delete */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(44,58,66,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '28px 32px', width: '380px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
            <p style={{ fontSize: '14px', color: '#2C3A42', margin: '0 0 24px', lineHeight: '1.6' }}>
              Tens a certeza que queres eliminar esta linha do levantamento? Esta acção não pode ser revertida.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteTarget(null)} style={{ padding: '8px 18px', borderRadius: '8px', border: '1.5px solid #E0E5EC', background: '#FFFFFF', color: '#738290', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={confirmDelete} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#C0544C', color: '#FFFFFF', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Popup adicionar ao catálogo */}
      {catalogoTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(44,58,66,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '28px 32px', width: '440px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#2C3A42', margin: '0 0 12px' }}>Adicionar atributo ao catálogo</h3>
            <p style={{ fontSize: '13px', color: '#4A5568', margin: '0 0 16px', lineHeight: '1.6' }}>
              O atributo <strong style={{ color: '#2C3A42' }}>{catalogoTarget.nome_atributo_gold}</strong> vai ser integrado no catálogo de atributos com o status:
            </p>
            <div style={{ marginBottom: '20px' }}><AtrStatusBadge status="Pendente UN" /></div>
            <p style={{ fontSize: '12px', color: '#738290', margin: '0 0 24px', lineHeight: '1.6' }}>
              Apenas a secção DSG ficará preenchida. As restantes camadas (UN, DIT Fonte, Fabric) ficam por completar.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setCatalogoTarget(null)} style={{ padding: '8px 18px', borderRadius: '8px', border: '1.5px solid #E0E5EC', background: '#FFFFFF', color: '#738290', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => addAoCatalogo(catalogoTarget)} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#5C8F6A', color: '#FFFFFF', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Adicionar ao catálogo</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar caderno */}
      {editarOpen && (
        <EditarCadernoModal
          caderno={caderno}
          onClose={() => setEditarOpen(false)}
          onSave={(updated) => { setEditarOpen(false); onUpdate && onUpdate(updated) }}
          produtosDados={produtosDados}
        />
      )}

      {/* Popup eliminar caderno */}
      {deleteModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(44,58,66,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '28px 32px', width: '400px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#2C3A42', margin: '0 0 12px' }}>Eliminar Caderno</h3>
            <p style={{ fontSize: '13px', color: '#4A5568', margin: '0 0 8px', lineHeight: '1.6' }}>
              Tens a certeza que queres eliminar o caderno <strong style={{ color: '#2C3A42' }}>{caderno.id_caderno}</strong>?
            </p>
            <p style={{ fontSize: '12px', color: '#738290', margin: '0 0 24px', lineHeight: '1.6' }}>
              Todos os atributos levantados neste caderno serão também eliminados. Esta acção não pode ser revertida.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteModal(false)} style={{ padding: '8px 18px', borderRadius: '8px', border: '1.5px solid #E0E5EC', background: '#FFFFFF', color: '#738290', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={async () => {
                await supabase.from('caderno_atributos').delete().eq('id_caderno_fk', caderno.id)
                await supabase.from('cadernos_requisitos').delete().eq('id', caderno.id)
                setDeleteModal(false)
                onDelete && onDelete(caderno.id)
              }} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#C0544C', color: '#FFFFFF', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────────
export default function CadernoRequisitos({ selectedCaderno, onSelectCaderno, cadernos, onCadernosChange, onRegisterOpenModal }) {
  const { produtosDados } = useReferenceData()
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    fetchCadernos()
    if (onRegisterOpenModal) onRegisterOpenModal(() => setModalOpen(true))
  }, [])

  const fetchCadernos = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('cadernos_requisitos').select('*').order('created_at', { ascending: false })
    if (!error && data) onCadernosChange(data)
    setLoading(false)
  }

  const handleSave = async () => { setModalOpen(false); await fetchCadernos() }

  return (
    <div style={{ padding: '32px 36px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#2C3A42', margin: 0 }}>Ficha Técnica</h1>
          <p style={{ fontSize: '13px', color: '#738290', margin: '4px 0 0' }}>Repositório de fichas técnicas por produto de dados.</p>
        </div>
        <button onClick={() => setModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#A1B5D8', color: '#FFFFFF', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
          onMouseEnter={e => e.currentTarget.style.background = '#8DA4CC'}
          onMouseLeave={e => e.currentTarget.style.background = '#A1B5D8'}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Criar Ficha Técnica
        </button>
      </div>

      {loading ? (
        <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '48px', textAlign: 'center', color: '#738290', fontSize: '13px' }}>A carregar...</div>
      ) : (
        <CadernoDetalhe
          caderno={selectedCaderno}
          produtosDados={produtosDados}
          onDelete={(id) => {
            onCadernosChange(prev => prev.filter(c => c.id !== id))
            onSelectCaderno(null)
          }}
          onUpdate={(updated) => {
            onCadernosChange(prev => prev.map(c => c.id === updated.id ? updated : c))
            onSelectCaderno(updated)
          }}
        />
      )}

      {modalOpen && (
        <CriarCadernoModal onClose={() => setModalOpen(false)} onSave={handleSave} produtosDados={produtosDados} cadernos={cadernos} />
      )}
    </div>
  )
}