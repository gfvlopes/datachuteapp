import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useReferenceData } from '../context/referencedatacontext'
import MultiSelect from '../components/multiselect'

const STATUS_ORDER = [
  'A aguardar submissão pela BS', 'Por iniciar (DSG)', 'Levantamento de requisitos (DSG)',
  'Ingestão (DIT)', 'Desenvolvimento (DSG)', 'Validação dos Dados (BO)',
  'Bloqueado (DSG)', 'Bloqueado (DIT)', 'Bloqueado (BS)', 'Entrega parcial', 'Entregue',
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

const COLUMNS = [
  { key: 'id_produto_dados',   label: 'ID',                 width: '120px' },
  { key: 'nome_produto_dados', label: 'Nome Produto',       width: '240px' },
  { key: 'status',             label: 'Status',             width: '200px' },
  { key: 'tipologia',          label: 'Tipologia',          width: '140px' },
  { key: 'dominio_nome',       label: 'Domínio',            width: '220px' },
  { key: 'localizacao_fabric', label: 'Localização Fabric', width: '200px' },
  { key: 'descricao',          label: 'Descrição',          width: '260px' },
  { key: 'frequencia',         label: 'Frequência',         width: '120px' },
  { key: 'volumes',            label: 'Volumes',            width: '120px' },
]

const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #E0E5EC', fontSize: '13px', color: '#2C3A42', background: '#FFFFFF', outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }
const labelStyle = { fontSize: '11px', fontWeight: '600', color: '#738290', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }

// ─── Modal criar/editar produto ────────────────────────────────────────────────
function ProdutoModal({ produto, onClose, onSave, dominios, enumeracoes, iniciativas, useCases }) {
  const isEdit = !!produto
  const [modo, setModo] = useState('novo')  // 'novo' | 'existente'
  const [produtoExistenteId, setProdutoExistenteId] = useState('')

  // Cascata bidireccional
  const [dominioNome, setDominioNome]   = useState('')
  const [iniciativaId, setIniciativaId] = useState('')
  const [useCaseId, setUseCaseId]       = useState('')

  const [form, setForm] = useState({
    nome_produto_dados: produto?.nome_produto_dados || '',
    tipologia:          produto?.tipologia || '',
    localizacao_fabric: produto?.localizacao_fabric || '',
    descricao:          produto?.descricao || '',
    frequencia:         produto?.frequencia || '',
    volumes:            produto?.volumes || '',
    status:             produto?.status || 'A aguardar submissão pela BS',
  })
  const [saving, setSaving] = useState(false)
  const [erro, setErro]     = useState('')

  const statusOpts    = enumeracoes?.status_produto || STATUS_ORDER
  const tipologiaOpts = enumeracoes?.tipologia || ['Dimensão', 'Facto', 'Métrica', 'KPI', 'Relatório']

  // ─── Cascata bidireccional ───────────────────────────────────────────────
  // Filtrar use cases com base no que está seleccionado
  const ucsFiltrados = useCases.filter(uc => {
    if (useCaseId)    return uc.id === useCaseId
    if (iniciativaId) return uc.iniciativa_id === iniciativaId
    if (dominioNome)  return uc.dominio_nome === dominioNome
    return true
  })

  // Iniciativas disponíveis com base no domínio e/ou use case escolhido
  const inisFiltradas = iniciativas.filter(ini => {
    if (iniciativaId) return ini.id === iniciativaId
    if (useCaseId) {
      const uc = useCases.find(u => u.id === useCaseId)
      return uc && ini.id === uc.iniciativa_id
    }
    if (dominioNome) return ini.dominio_nome === dominioNome
    return true
  })

  // Domínios disponíveis
  const domsFiltrados = dominios.filter(d => {
    if (dominioNome) return d.nome === dominioNome
    if (iniciativaId) {
      const ini = iniciativas.find(i => i.id === iniciativaId)
      return ini && d.nome === ini.dominio_nome
    }
    if (useCaseId) {
      const uc = useCases.find(u => u.id === useCaseId)
      return uc && d.nome === uc.dominio_nome
    }
    return true
  })

  // Auto-selecção quando resta 1 opção
  useEffect(() => {
    if (!dominioNome && domsFiltrados.length === 1) setDominioNome(domsFiltrados[0].nome)
  }, [domsFiltrados.length])

  useEffect(() => {
    if (!iniciativaId && inisFiltradas.length === 1) setIniciativaId(inisFiltradas[0].id)
  }, [inisFiltradas.length])

  useEffect(() => {
    if (!useCaseId && ucsFiltrados.length === 1) setUseCaseId(ucsFiltrados[0].id)
  }, [ucsFiltrados.length])

  // Quando escolhe use case, preencher iniciativa e domínio
  const handleUseCaseChange = (id) => {
    setUseCaseId(id)
    if (id) {
      const uc = useCases.find(u => u.id === id)
      if (uc) {
        setIniciativaId(uc.iniciativa_id)
        setDominioNome(uc.dominio_nome)
      }
    }
  }
  // Quando escolhe iniciativa, preencher domínio e limpar use case se incompatível
  const handleIniciativaChange = (id) => {
    setIniciativaId(id)
    if (id) {
      const ini = iniciativas.find(i => i.id === id)
      if (ini) setDominioNome(ini.dominio_nome)
      const uc = useCases.find(u => u.id === useCaseId)
      if (uc && uc.iniciativa_id !== id) setUseCaseId('')
    }
  }
  const handleDominioChange = (nome) => {
    setDominioNome(nome)
    // Limpar selecções incompatíveis
    const ini = iniciativas.find(i => i.id === iniciativaId)
    if (ini && ini.dominio_nome !== nome) { setIniciativaId(''); setUseCaseId('') }
  }

  const handleSubmit = async () => {
    if (!useCaseId) { setErro('Selecciona o Use Case ao qual associar o produto.'); return }
    setSaving(true); setErro('')

    let produtoId = null
    const dominioId = dominios.find(d => d.nome === dominioNome)?.id || null

    if (modo === 'existente') {
      if (!produtoExistenteId) { setErro('Selecciona um produto de dados.'); setSaving(false); return }
      produtoId = produtoExistenteId
    } else {
      if (!form.nome_produto_dados.trim()) { setErro('O nome do produto é obrigatório.'); setSaving(false); return }
      // Gerar ID baseado no MAIOR número existente + 1 (robusto a eliminações no meio da sequência)
      const { data: existentes } = await supabase.from('d_produtos_dados').select('id_produto_dados')
      let maxNum = 0
      ;(existentes || []).forEach(p => {
        const m = String(p.id_produto_dados || '').match(/(\d+)/)
        if (m) { const n = parseInt(m[1], 10); if (n > maxNum) maxNum = n }
      })
      const idProduto = `PD_${String(maxNum + 1).padStart(3, '0')}`
      const { data: novoProduto, error } = await supabase.from('d_produtos_dados').insert([{
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
      if (error) { setErro(error.message); setSaving(false); return }
      produtoId = novoProduto?.[0]?.id

      // Registo inicial em registo_alteracoes
      if (produtoId) {
        await supabase.from('registo_alteracoes').insert([{
          produto_id: produtoId, status: form.status,
          data_inicio: new Date().toISOString().slice(0, 10),
        }])
      }
    }

    // Associar ao use case (evitar duplicados)
    const { count: existe } = await supabase.from('produto_use_case')
      .select('id', { count: 'exact', head: true })
      .eq('use_case_id', useCaseId).eq('produto_dados_id', produtoId)
    if (!existe || existe === 0) {
      const { error: errAssoc } = await supabase.from('produto_use_case').insert([{
        use_case_id: useCaseId, produto_dados_id: produtoId,
      }])
      if (errAssoc) { setErro(errAssoc.message); setSaving(false); return }
    }

    setSaving(false)
    onSave()
  }

  // ─── Modal de EDIÇÃO (produto já existe) ─────────────────────────────────
  const handleEditSubmit = async () => {
    if (!form.nome_produto_dados.trim()) { setErro('O nome do produto é obrigatório.'); return }
    setSaving(true); setErro('')
    const statusMudou = produto.status !== form.status
    const { error } = await supabase.from('d_produtos_dados').update({
      nome_produto_dados: form.nome_produto_dados.trim(),
      tipologia:          form.tipologia || null,
      localizacao_fabric: form.localizacao_fabric.trim() || null,
      descricao:          form.descricao.trim() || null,
      frequencia:         form.frequencia.trim() || null,
      volumes:            form.volumes.trim() || null,
      status:             form.status,
    }).eq('id', produto.id)
    if (error) { setErro(error.message); setSaving(false); return }
    if (statusMudou) {
      await supabase.from('registo_alteracoes').insert([{
        produto_id: produto.id, status: form.status,
        data_inicio: new Date().toISOString().slice(0, 10),
      }])
    }
    setSaving(false)
    onSave()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(44,58,66,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '28px 32px', width: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#2C3A42', margin: '0 0 4px' }}>{isEdit ? 'Editar Produto de Dados' : 'Criar Produto de Dados'}</h3>
        <p style={{ fontSize: '12px', color: '#738290', margin: '0 0 20px' }}>{isEdit ? produto.id_produto_dados : 'O ID será gerado automaticamente.'}</p>

        {!isEdit && (
          <>
            {/* Toggle modo */}
            <div style={{ display: 'flex', background: '#F0F2F5', borderRadius: '8px', padding: '3px', width: 'fit-content', marginBottom: '20px' }}>
              {[{ id: 'novo', label: 'Novo Produto' }, { id: 'existente', label: 'Associar Existente' }].map(op => (
                <button key={op.id} onClick={() => { setModo(op.id); setErro('') }}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: modo === op.id ? '#FFFFFF' : 'transparent', color: modo === op.id ? '#2C3A42' : '#738290', fontSize: '12px', fontWeight: modo === op.id ? '600' : '500', cursor: 'pointer', fontFamily: 'Inter, sans-serif', boxShadow: modo === op.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                  {op.label}
                </button>
              ))}
            </div>

            {/* Cascata Domínio → Iniciativa → Use Case */}
            <div style={{ background: '#F7F9FC', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
              <p style={{ fontSize: '11px', fontWeight: '700', color: '#5A7BA8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>Associar a Use Case</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Domínio</label>
                  <select style={inputStyle} value={dominioNome} onChange={e => handleDominioChange(e.target.value)}>
                    <option value="">— selecionar —</option>
                    {domsFiltrados.map(d => <option key={d.id} value={d.nome}>{d.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Iniciativa</label>
                  <select style={inputStyle} value={iniciativaId} onChange={e => handleIniciativaChange(e.target.value)}>
                    <option value="">— selecionar —</option>
                    {inisFiltradas.map(i => <option key={i.id} value={i.id}>{i.id_iniciativa} — {i.nome_iniciativa}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Use Case</label>
                  <select style={inputStyle} value={useCaseId} onChange={e => handleUseCaseChange(e.target.value)}>
                    <option value="">— selecionar —</option>
                    {ucsFiltrados.map(uc => <option key={uc.id} value={uc.id}>{uc.id_use_case} — {uc.nome_use_case}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </>
        )}

        {modo === 'existente' && !isEdit ? (
          <div>
            <label style={labelStyle}>Produto de Dados a Associar</label>
            <ProdutoExistenteSelect value={produtoExistenteId} onChange={setProdutoExistenteId} />
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
          <button onClick={isEdit ? handleEditSubmit : handleSubmit} disabled={saving} style={{ padding: '8px 18px', borderRadius: '8px', border: '1.5px solid rgba(92,143,106,0.35)', background: 'rgba(92,143,106,0.12)', color: '#2A6040', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#5C8F6A'; e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.borderColor = '#5C8F6A' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(92,143,106,0.12)'; e.currentTarget.style.color = '#2A6040'; e.currentTarget.style.borderColor = 'rgba(92,143,106,0.35)' }}>
            {saving ? 'A guardar...' : (isEdit ? 'Guardar' : (modo === 'existente' ? 'Associar' : 'Criar e Associar'))}
          </button>
        </div>
      </div>
    </div>
  )
}

// Dropdown de produtos existentes
function ProdutoExistenteSelect({ value, onChange }) {
  const { produtosDados } = useReferenceData()
  return (
    <select style={inputStyle} value={value} onChange={e => onChange(e.target.value)}>
      <option value="">— selecionar produto —</option>
      {produtosDados.map(p => <option key={p.id} value={p.id}>{p.id_produto_dados} — {p.nome_produto_dados}</option>)}
    </select>
  )
}

export default function Provisionamento(props) {
  const { dominios, enumeracoes, iniciativas, useCases, refetchProdutosDados } = useReferenceData()
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen]   = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteUseCases, setDeleteUseCases] = useState([]) // use cases associados ao produto a eliminar
  const [filterDominio,    setFilterDominio]    = useState([])
  const [filterIniciativa, setFilterIniciativa] = useState([])
  const [filterUseCase,    setFilterUseCase]    = useState([])
  const [filterProduto,    setFilterProduto]    = useState([])
  const [filterTipologia,  setFilterTipologia]  = useState([])
  const [filterStatus,     setFilterStatus]     = useState([])
  const [produtoUseCase,   setProdutoUseCase]   = useState([]) // {produto_dados_id, use_case_id}
  const topScrollRef = useRef(null)
  const tableWrapRef = useRef(null)

  useEffect(() => {
    fetchData()
    supabase.from('produto_use_case').select('produto_dados_id, use_case_id').then(({ data }) => {
      if (data) setProdutoUseCase(data)
    })
    if (props.onRegisterOpenModal) props.onRegisterOpenModal(() => { setEditingRow(null); setModalOpen(true) })
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: rows, error } = await supabase
      .from('d_produtos_dados')
      .select('*, d_dominios(id, nome)')
      .order('nome_produto_dados')
    if (!error && rows) setData(rows.map(r => ({ ...r, dominio_nome: r.d_dominios?.nome || '—' })))
    setLoading(false)
  }

  const handleSave = async () => { setModalOpen(false); setEditingRow(null); await fetchData(); refetchProdutosDados && refetchProdutosDados() }

  const abrirDelete = async (row) => {
    setDeleteTarget(row)
    setDeleteUseCases([])
    const { data } = await supabase
      .from('produto_use_case')
      .select('use_case_id, d_use_cases(id_use_case, nome_use_case)')
      .eq('produto_dados_id', row.id)
    setDeleteUseCases((data || []).map(p => p.d_use_cases).filter(Boolean))
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const pid = deleteTarget.id
    // Apagar em cascata (explícito)
    await supabase.from('d_ficha_atributos').delete().eq('produto_dados_id', pid)
    await supabase.from('produto_use_case').delete().eq('produto_dados_id', pid)
    await supabase.from('registo_alteracoes').delete().eq('produto_id', pid)
    await supabase.from('d_produtos_dados').delete().eq('id', pid)
    setData(prev => prev.filter(r => r.id !== pid))
    setDeleteTarget(null)
    setDeleteUseCases([])
    refetchProdutosDados && refetchProdutosDados()
  }

  const dominioOptions   = [...new Set(data.map(r => r.dominio_nome).filter(d => d && d !== '—'))].sort()
  const tipologiaOptions = [...new Set(data.map(r => r.tipologia).filter(Boolean))].sort()
  const statusOptions    = STATUS_ORDER.filter(s => data.some(r => r.status === s))

  // Cascata Iniciativa → Use Case → Produto
  const iniciativaOptions = iniciativas.map(i => `${i.id_iniciativa} — ${i.nome_iniciativa}`).sort()

  const ucsFiltradosPorIni = filterIniciativa.length
    ? useCases.filter(uc => {
        const ini = iniciativas.find(i => i.id === uc.iniciativa_id)
        return ini && filterIniciativa.includes(`${ini.id_iniciativa} — ${ini.nome_iniciativa}`)
      })
    : useCases
  const useCaseOptions = ucsFiltradosPorIni.map(uc => `${uc.id_use_case} — ${uc.nome_use_case}`).sort()

  // IDs de use case selecionados (por filtro UC direto ou derivados da iniciativa)
  const ucIdsSelecionados = filterUseCase.length
    ? useCases.filter(uc => filterUseCase.includes(`${uc.id_use_case} — ${uc.nome_use_case}`)).map(uc => uc.id)
    : (filterIniciativa.length ? ucsFiltradosPorIni.map(uc => uc.id) : null)

  // Produtos válidos pela cascata (via produto_use_case)
  const produtoIdsValidos = ucIdsSelecionados
    ? [...new Set(produtoUseCase.filter(p => ucIdsSelecionados.includes(p.use_case_id)).map(p => p.produto_dados_id))]
    : null

  const produtoOptions = [...new Set(
    (produtoIdsValidos ? data.filter(r => produtoIdsValidos.includes(r.id)) : data)
      .map(r => r.nome_produto_dados).filter(Boolean)
  )].sort()

  const filtered = data.filter(r => {
    if (filterDominio.length   && !filterDominio.includes(r.dominio_nome)) return false
    if (filterTipologia.length && !filterTipologia.includes(r.tipologia)) return false
    if (filterStatus.length    && !filterStatus.includes(r.status))       return false
    if (filterProduto.length   && !filterProduto.includes(r.nome_produto_dados)) return false
    // Cascata iniciativa/use case → produto
    if (produtoIdsValidos !== null && !produtoIdsValidos.includes(r.id)) return false
    return true
  })

  const hasFilters = !!(filterDominio.length || filterIniciativa.length || filterUseCase.length || filterProduto.length || filterTipologia.length || filterStatus.length)
  const clearFilters = () => { setFilterDominio([]); setFilterIniciativa([]); setFilterUseCase([]); setFilterProduto([]); setFilterTipologia([]); setFilterStatus([]) }

  const [visibleCount, setVisibleCount] = useState(50)
  useEffect(() => { setVisibleCount(50) }, [filterDominio, filterIniciativa, filterUseCase, filterProduto, filterTipologia, filterStatus])
  const visible = filtered.slice(0, visibleCount)
  const syncScroll = (src, tgt) => { if (tgt.current) tgt.current.scrollLeft = src.current.scrollLeft }

  return (
    <div style={{ padding: '32px 36px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#2C3A42', margin: 0 }}>Produto de Dados</h1>
          <p style={{ fontSize: '13px', color: '#738290', margin: '4px 0 0' }}>Listagem de produtos de dados. Clica numa linha para editar.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => { setEditingRow(null); setModalOpen(true) }}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 18px', borderRadius: '8px', border: '1.5px solid rgba(92,143,106,0.35)', background: 'rgba(92,143,106,0.12)', color: '#2A6040', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#5C8F6A'; e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.borderColor = '#5C8F6A' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(92,143,106,0.12)'; e.currentTarget.style.color = '#2A6040'; e.currentTarget.style.borderColor = 'rgba(92,143,106,0.35)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Criar Produto de Dados
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <MultiSelect options={dominioOptions} value={filterDominio} onChange={setFilterDominio} placeholder="Domínio" />
        <MultiSelect options={iniciativaOptions} value={filterIniciativa} onChange={v => { setFilterIniciativa(v); setFilterUseCase([]); setFilterProduto([]) }} placeholder="Iniciativa" />
        <MultiSelect options={useCaseOptions} value={filterUseCase} onChange={v => { setFilterUseCase(v); setFilterProduto([]) }} placeholder="Use Case" />
        <MultiSelect options={produtoOptions} value={filterProduto} onChange={setFilterProduto} placeholder="Produto de Dados" />
        <MultiSelect options={tipologiaOptions} value={filterTipologia} onChange={setFilterTipologia} placeholder="Tipologia" />
        <MultiSelect options={statusOptions} value={filterStatus} onChange={setFilterStatus} placeholder="Status" />
        {hasFilters && (
          <button onClick={clearFilters} style={{ padding: '7px 14px', borderRadius: '8px', border: '1.5px solid #E0E5EC', background: '#FFFFFF', color: '#738290', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>Limpar filtros</button>
        )}
      </div>

      {loading ? (
        <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '48px', textAlign: 'center', color: '#738290', fontSize: '13px' }}>A carregar dados...</div>
      ) : (
        <>
          <div ref={topScrollRef} onScroll={() => syncScroll(topScrollRef, tableWrapRef)} style={{ overflowX: 'auto', marginBottom: '4px' }}>
            <div style={{ height: '1px', minWidth: '1620px' }} />
          </div>
          <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <div ref={tableWrapRef} onScroll={() => syncScroll(tableWrapRef, topScrollRef)} style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: '#2C3A42', fontFamily: 'Inter, sans-serif' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #ECEEF2' }}>
                    {COLUMNS.map(col => (
                      <th key={col.key} style={{ padding: '11px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#738290', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap', minWidth: col.width, background: '#FFFFFF' }}>{col.label}</th>
                    ))}
                    <th style={{ width: '50px', background: '#FFFFFF' }} />
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={COLUMNS.length + 1} style={{ padding: '48px 24px', textAlign: 'center', color: '#738290', fontSize: '13px' }}>Nenhum produto de dados encontrado.</td></tr>
                  )}
                  {visible.map((row, idx) => (
                    <tr key={row.id}
                      onClick={() => { props.onOpenProduto ? props.onOpenProduto(row) : (setEditingRow(row), setModalOpen(true)) }}
                      style={{ background: idx % 2 === 0 ? '#FFFFFF' : '#FAFBFC', cursor: 'pointer', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F3F6FB'}
                      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#FFFFFF' : '#FAFBFC'}>
                      {COLUMNS.map(col => (
                        <td key={col.key} style={{ padding: '10px 14px', maxWidth: col.width, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: ['id_produto_dados','nome_produto_dados'].includes(col.key) ? '#2C3A42' : '#4A5568', fontWeight: col.key === 'nome_produto_dados' ? '500' : '400' }}>
                          {col.key === 'status' ? <StatusBadge status={row.status} /> : (row[col.key] || <span style={{ color: '#C8D0DA' }}>—</span>)}
                        </td>
                      ))}
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <button onClick={(e) => { e.stopPropagation(); abrirDelete(row) }}
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#C8A09C' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(192,84,76,0.12)'; e.currentTarget.style.color = '#C0544C' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#C8A09C' }}
                          title="Eliminar">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </td>
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
          <p style={{ fontSize: '11px', color: '#B0BCC8', marginTop: '8px' }}>
            A mostrar {visible.length} de {filtered.length} produto{filtered.length !== 1 ? 's' : ''} de dados {hasFilters ? 'filtrados' : ''}
          </p>
        </>
      )}

      {modalOpen && (
        <ProdutoModal
          produto={editingRow}
          dominios={dominios}
          enumeracoes={enumeracoes}
          iniciativas={iniciativas}
          useCases={useCases}
          onClose={() => { setModalOpen(false); setEditingRow(null) }}
          onSave={handleSave}
        />
      )}

      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(44,58,66,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '28px 32px', width: '460px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(192,84,76,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C0544C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#2C3A42', margin: 0 }}>Eliminar Produto de Dados</h3>
            </div>
            <p style={{ fontSize: '13px', color: '#4A5568', margin: '0 0 16px', lineHeight: '1.6' }}>
              Vais eliminar <strong style={{ color: '#2C3A42' }}>{deleteTarget.id_produto_dados} — {deleteTarget.nome_produto_dados}</strong> em todo o lado: os atributos do levantamento, as associações a use cases e o histórico de alterações. <strong>Esta acção não pode ser revertida.</strong>
            </p>

            {deleteUseCases.length > 0 && (
              <div style={{ background: 'rgba(201,151,74,0.08)', border: '1px solid rgba(201,151,74,0.25)', borderRadius: '8px', padding: '12px 14px', marginBottom: '20px' }}>
                <p style={{ fontSize: '12px', fontWeight: '600', color: '#9A6E20', margin: '0 0 8px' }}>
                  Este produto está associado a {deleteUseCases.length} use case{deleteUseCases.length !== 1 ? 's' : ''}:
                </p>
                <ul style={{ margin: 0, padding: '0 0 0 4px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {deleteUseCases.map((uc, i) => (
                    <li key={i} style={{ fontSize: '12px', color: '#4A5568', display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <span style={{ background: 'rgba(161,181,216,0.20)', color: '#5A7BA8', borderRadius: '5px', padding: '1px 7px', fontSize: '10.5px', fontWeight: '700', flexShrink: 0 }}>{uc.id_use_case}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{uc.nome_use_case}</span>
                    </li>
                  ))}
                </ul>
                <p style={{ fontSize: '11.5px', color: '#9A6E20', margin: '10px 0 0', lineHeight: '1.5' }}>
                  As associações a estes use cases serão removidas.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setDeleteTarget(null); setDeleteUseCases([]) }} style={{ padding: '8px 18px', borderRadius: '8px', border: '1.5px solid #E0E5EC', background: '#FFFFFF', color: '#738290', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleDelete} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#C0544C', color: '#FFFFFF', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Eliminar em todo o lado</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 