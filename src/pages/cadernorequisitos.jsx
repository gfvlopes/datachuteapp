import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useReferenceData } from '../context/referencedatacontext'
import MultiSelect from '../components/multiselect'

// ─── Status do catálogo de atributos ───────────────────────────────────────────
const ATR_STATUS_COLORS = {
  'Mapeamento Sistema Fonte UN':     { bg: 'rgba(192,84,76,0.12)',   color: '#C0544C' },
  'Mapeamento Sistema Fonte DIT':    { bg: 'rgba(201,151,74,0.15)',  color: '#9A6E20' },
  'Pendente Ingestão em Fabric DIT': { bg: 'rgba(161,181,216,0.20)', color: '#5A7BA8' },
  'Disponível':                      { bg: 'rgba(92,143,106,0.18)',  color: '#2A6040' },
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
  const [nomeFicha, setNomeFicha] = useState('')
  const [focalPoint, setFocalPoint] = useState('')
  const [produtoId, setProdutoId] = useState('')   // UUID de d_produtos_dados
  const [fichaOrigem, setFichaOrigem] = useState('')
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  const handleProdutoIdChange = (val) => {
    const found = produtosDados.find(p => p.id_produto_dados === val)
    setProdutoId(found?.id || '')
  }
  const handleProdutoNomeChange = (val) => {
    const found = produtosDados.find(p => p.nome_produto_dados === val)
    setProdutoId(found?.id || '')
  }

  const handleSubmit = async () => {
    if (!nomeFicha.trim()) { setErro('O nome da ficha técnica é obrigatório.'); return }
    if (!produtoId) { setErro('Associa um produto de dados.'); return }
    if (modo === 'existente' && !fichaOrigem) { setErro('Selecciona a ficha técnica de origem.'); return }
    setSaving(true); setErro('')

    const { count } = await supabase
      .from('d_fichas_tecnicas')
      .select('id', { count: 'exact', head: true })
      .eq('produto_dados_id', produtoId)

    if (count && count > 0) {
      setErro('Este produto já tem uma Ficha Técnica. Cada produto só pode ter uma.')
      setSaving(false); return
    }

    const prod = produtosDados.find(p => p.id === produtoId)
    const slug = (prod?.id_produto_dados || '').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()
    const idFicha = `FT_1_${slug}`

    const { data: novoCaderno, error } = await supabase.from('d_fichas_tecnicas').insert([{
      id_ficha_tecnica:   idFicha,
      nome_ficha_tecnica: nomeFicha.trim(),
      focal_point:        focalPoint.trim() || null,
      produto_dados_id:   produtoId,
    }]).select()

    if (error) { setSaving(false); setErro(error.message); return }

    // Se modo existente, copiar atributos do caderno de origem
    if (modo === 'existente' && novoCaderno?.[0]) {
      const origem = cadernos.find(c => c.id_ficha_tecnica === fichaOrigem)
      if (origem) {
        const { data: atributosOrigem, error: errFetch } = await supabase
          .from('d_ficha_atributos')
          .select('nome_atributo,descricao_atributo,sistema_referencia,sub_dominio_id,nome_atributo_gold,descricao_atributo_gold,id_catalogo_atributo')
          .eq('ficha_tecnica_id', origem.id)

        if (errFetch) { console.error('Erro ao ler atributos de origem:', errFetch); }

        if (atributosOrigem?.length) {
          const copia = atributosOrigem.map(r => ({
            ficha_tecnica_id: novoCaderno[0].id,
            nome_atributo:            r.nome_atributo || null,
            descricao_atributo:       r.descricao_atributo || null,
            sistema_referencia:       r.sistema_referencia || null,
            sub_dominio_id:           r.sub_dominio_id || null,
            nome_atributo_gold:       r.nome_atributo_gold || null,
            descricao_atributo_gold:  r.descricao_atributo_gold || null,
            id_catalogo_atributo:     r.id_catalogo_atributo || null,
          }))
          const { error: errInsert } = await supabase.from('d_ficha_atributos').insert(copia)
          if (errInsert) { console.error('Erro ao copiar atributos:', errInsert); alert('Ficha criada mas erro ao copiar atributos: ' + errInsert.message) }
        }
      }
    }

    setSaving(false)
    onSave(novoCaderno?.[0]?.id || null)
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
              <button key={op.id} onClick={() => { setModo(op.id); setFichaOrigem(''); setErro('') }}
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
              <select style={inputStyle} value={fichaOrigem} onChange={e => setFichaOrigem(e.target.value)}>
                <option value="">— selecionar caderno —</option>
                {cadernos.map(c => (
                  <option key={c.id} value={c.id_ficha_tecnica}>{c.id_ficha_tecnica} — {c.nome_ficha_tecnica}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={labelStyle}>Nome da Ficha Técnica</label>
            <input style={inputStyle} placeholder="Ex: Ficha Técnica — NIF Cliente" value={nomeFicha} onChange={e => setNomeFicha(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Focal Point</label>
            <input style={inputStyle} placeholder="Nome do responsável" value={focalPoint} onChange={e => setFocalPoint(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Produto de Dados</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select style={{ ...inputStyle, flex: '0 0 140px' }} value={produtosDados.find(p => p.id === produtoId)?.id_produto_dados || ''} onChange={e => handleProdutoIdChange(e.target.value)}>
                <option value="">ID Produto</option>
                {produtosDados.map(p => <option key={p.id} value={p.id_produto_dados}>{p.id_produto_dados}</option>)}
              </select>
              <select style={{ ...inputStyle, flex: 1 }} value={produtosDados.find(p => p.id === produtoId)?.nome_produto_dados || ''} onChange={e => handleProdutoNomeChange(e.target.value)}>
                <option value="">Nome Produto</option>
                {produtosDados.map(p => <option key={p.id} value={p.nome_produto_dados}>{p.nome_produto_dados}</option>)}
              </select>
            </div>
          </div>
        </div>

        {modo === 'existente' && fichaOrigem && (
          <div style={{ marginTop: '16px', background: 'rgba(92,143,106,0.08)', border: '1.5px solid #B5D0BE', borderRadius: '8px', padding: '10px 14px' }}>
            <p style={{ fontSize: '12px', color: '#4A7A5A', margin: 0, lineHeight: '1.6' }}>
              Todos os atributos do caderno <strong>{fichaOrigem}</strong> serão copiados para o novo caderno — levantamento de alto nível, secção DSG e associações ao catálogo.
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

// ─── Modal Editar Ficha Técnica ──────────────────────────────────────────────────────
function EditarCadernoModal({ caderno, onClose, onSave, produtosDados }) {
  const { dominios } = useReferenceData()
  const [nomeFicha, setNomeFicha] = useState(caderno.nome_ficha_tecnica || '')
  const [focalPoint, setFocalPoint] = useState(caderno.focal_point || '')
  const [produtoId, setProdutoId] = useState(caderno.produto_dados_id || '')
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  const handleProdutoIdChange = (val) => {
    const found = produtosDados.find(p => p.id_produto_dados === val)
    setProdutoId(found?.id || '')
  }
  const handleProdutoNomeChange = (val) => {
    const found = produtosDados.find(p => p.nome_produto_dados === val)
    setProdutoId(found?.id || '')
  }

  const handleSubmit = async () => {
    if (!nomeFicha.trim()) { setErro('O nome da ficha técnica é obrigatório.'); return }
    setSaving(true); setErro('')
    const { error } = await supabase.from('d_fichas_tecnicas').update({
      nome_ficha_tecnica:      nomeFicha.trim(),
      focal_point:       focalPoint.trim() || null,
      produto_dados_id: produtoId || null,
    }).eq('id', caderno.id)
    setSaving(false)
    if (error) { setErro(error.message); return }
    onSave({ ...caderno, nome_ficha_tecnica: nomeFicha.trim(), focal_point: focalPoint.trim() || null, produto_dados_id: produtoId })
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
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#2C3A42', margin: '0 0 6px' }}>Editar Ficha Técnica</h3>
            <span style={{ background: 'rgba(92,143,106,0.15)', color: '#2A6040', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: '700' }}>
              {caderno.id_ficha_tecnica}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#738290', padding: '4px', borderRadius: '6px', display: 'flex' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Nome da Ficha Técnica</label>
            <input style={inputStyle} value={nomeFicha} onChange={e => setNomeFicha(e.target.value)} placeholder="Nome da ficha técnica" />
          </div>
          <div>
            <label style={labelStyle}>Focal Point</label>
            <input style={inputStyle} value={focalPoint} onChange={e => setFocalPoint(e.target.value)} placeholder="Nome do responsável" />
          </div>
          <div>
            <label style={labelStyle}>Produto de Dados</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select style={{ ...inputStyle, flex: '0 0 140px' }} value={produtosDados.find(p => p.id === produtoId)?.id_produto_dados || ''} onChange={e => handleProdutoIdChange(e.target.value)}>
                <option value="">ID Produto</option>
                {produtosDados.map(p => <option key={p.id} value={p.id_produto_dados}>{p.id_produto_dados}</option>)}
              </select>
              <select style={{ ...inputStyle, flex: 1 }} value={produtosDados.find(p => p.id === produtoId)?.nome_produto_dados || ''} onChange={e => handleProdutoNomeChange(e.target.value)}>
                <option value="">Nome Produto</option>
                {produtosDados.map(p => <option key={p.id} value={p.nome_produto_dados}>{p.nome_produto_dados}</option>)}
              </select>
            </div>
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
export function CadernoDetalhe({ caderno, onDelete, onUpdate, produtosDados, modo = 'completo' }) {
  // ID do produto de dados — núcleo da ligação dos atributos (d_ficha_atributos.produto_dados_id)
  // No modo levantamento, caderno traz produto_dados_id; no modo completo, caderno.produto_dados_id também existe (d_fichas_tecnicas tem-no)
  const produtoId = caderno?.produto_dados_id || caderno?.id
  const [atributos, setAtributos] = useState([])
  const [visibleCount, setVisibleCount] = useState(50)
  // Filtros (modo levantamento)
  const [filtroSistemaRef, setFiltroSistemaRef] = useState([])
  const [filtroDominio, setFiltroDominio]       = useState([])
  const [filtroSubdominio, setFiltroSubdominio] = useState([])
  useEffect(() => { setVisibleCount(50) }, [filtroSistemaRef, filtroDominio, filtroSubdominio])
  const [loadingAtr, setLoadingAtr] = useState(false)
  const [editingCell, setEditingCell] = useState(null) // `${rowId}:${colKey}` em edição
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

  // catalogo completo — array de objectos com todos os campos
  const [catalogo, setCatalogo] = useState([])

  useEffect(() => {
    // Carregar d_sub_dominios para as dropdowns de domínio/sub-domínio
    supabase.from('d_sub_dominios').select('id, nome, d_dominios(id, nome)').then(({ data }) => {
      if (data) {
        const obj = {}
        data.forEach(r => {
          const dom = r.d_dominios?.nome
          if (!dom) return
          if (!obj[dom]) obj[dom] = []
          obj[dom].push({ id: r.id, nome: r.nome })
        })
        Object.keys(obj).forEach(d => obj[d].sort((a, b) => a.nome.localeCompare(b.nome)))
        setDominioSubMap(obj)
      }
    })
    // Carregar catálogo completo com sub_dominio e domínio
    supabase.from('d_catalogo_atributos')
      .select('*, d_sub_dominios(id, nome, d_dominios(id, nome))')
      .then(({ data }) => {
        if (data) {
          const enriched = data.map(r => ({
            ...r,
            dominio_nome:    r.d_sub_dominios?.d_dominios?.nome || null,
            subdominio_nome: r.d_sub_dominios?.nome || null,
          }))
          setCatalogo(enriched)
          // Manter maps para compatibilidade
          const map = {}, inv = {}, stat = {}, idMap = {}
          enriched.forEach(r => {
            if (r.nome_atributo_gold && !map[r.nome_atributo_gold]) map[r.nome_atributo_gold] = r.descricao_atributo_gold || ''
            if (r.descricao_atributo_gold && !inv[r.descricao_atributo_gold]) inv[r.descricao_atributo_gold] = r.nome_atributo_gold || ''
            if (r.nome_atributo_gold) { stat[r.nome_atributo_gold] = r.status || null; idMap[r.nome_atributo_gold] = r.id }
          })
          setNomeDescMap(map); setDescNomeMap(inv); setNomeStatusMap(stat); setNomeIdMap(idMap)
          setCatalogoNomes([...new Set(enriched.map(r => r.nome_atributo_gold).filter(Boolean))].sort())
          setCatalogoDescricoes([...new Set(enriched.map(r => r.descricao_atributo_gold).filter(Boolean))].sort())
        }
      })
  }, [])

  useEffect(() => { if (caderno) fetchAtributos() }, [caderno?.id])

  const fetchAtributos = async () => {
    setLoadingAtr(true)
    const { data } = await supabase
      .from('d_ficha_atributos')
      .select('*, sub_dominio:sub_dominio_id(id, nome, d_dominios(id, nome)), d_catalogo_atributos(*, d_sub_dominios(id, nome, d_dominios(id, nome)))')
      .eq('produto_dados_id', produtoId)
      .order('created_at')
    if (data) {
      setAtributos(data.map(r => {
        const cat = r.d_catalogo_atributos
        // Domínio/sub-domínio materializado na própria d_ficha_atributos (prioritário)
        const subProprio    = r.sub_dominio
        const dominioProprio = subProprio?.d_dominios?.nome || null
        const subIdProprio   = subProprio?.id || null
        return {
          ...r,
          // popular campos do catálogo se estiver ligado
          ...(cat ? {
            nome_atributo_gold:              cat.nome_atributo_gold,
            descricao_atributo_gold:         cat.descricao_atributo_gold,
            sistema_referencia_gold:         cat.sistema_referencia_gold,
            sistema_un:                      cat.sistema_un,
            tabela_un:                       cat.tabela_un,
            nome_atributo_un:                cat.nome_atributo_un,
            descricao_atributo_un:           cat.descricao_atributo_un,
            tipologia_atributo:              cat.tipologia_atributo,
            formula_calculo:                 cat.formula_calculo,
            data_type_un:                    cat.data_type_un,
            sistema_fonte_dit:               cat.sistema_fonte_dit,
            tabela_fonte_dit:                cat.tabela_fonte_dit,
            nome_atributo_fonte_dit:         cat.nome_atributo_fonte_dit,
            descricao_atributo_fonte_dit:    cat.descricao_atributo_fonte_dit,
            mapeamento_dit:                  cat.mapeamento_dit,
            formato_atributo_dit:            cat.formato_atributo_dit,
            campo_em_fabric:                 cat.campo_em_fabric,
            sistema_ingerido_fabric:         cat.sistema_ingerido_fabric,
            tabela_fabric_dit:               cat.tabela_fabric_dit,
            nome_atributo_fabric_dit:        cat.nome_atributo_fabric_dit,
            descricao_atributo_fabric_dit:   cat.descricao_atributo_fabric_dit,
            mapeamento_fabric:               cat.mapeamento_fabric,
            data_type_fabric:                cat.data_type_fabric,
            chave_primaria_fabric:           cat.chave_primaria_fabric,
            chave_estrangeira_fabric:        cat.chave_estrangeira_fabric,
            tabela_referencia_fabric:        cat.tabela_referencia_fabric,
            atributo_referencia_fabric:      cat.atributo_referencia_fabric,
            permite_nulos_fabric:            cat.permite_nulos_fabric,
            codigo_lista_valores_fabric:     cat.codigo_lista_valores_fabric,
            regra_referencia_codigo_fabric:  cat.regra_referencia_codigo_fabric,
            classificacao_dados_fabric:      cat.classificacao_dados_fabric,
            estado_confidencial_fabric:      cat.estado_confidencial_fabric,
            dado_mestre_transacional_fabric: cat.dado_mestre_transacional_fabric,
            notas_fabric:                    cat.notas_fabric,
          } : {}),
          // Domínio/sub-domínio: prioriza o materializado; se não houver, deriva do catálogo
          dominio_atributo: dominioProprio || cat?.d_sub_dominios?.d_dominios?.nome || null,
          sub_dominio_id:   subIdProprio   || cat?.d_sub_dominios?.id || null,
        }
      }))
    }
    setLoadingAtr(false)
  }

  const addLinha = async () => {
    const { data, error } = await supabase.from('d_ficha_atributos').insert([{ produto_dados_id: produtoId }]).select()
    if (!error && data) setAtributos(prev => [...prev, data[0]])
  }

  const DSG_FIELDS = ['nome_atributo_gold', 'descricao_atributo_gold', 'sistema_referencia_gold']

  const updateLinha = async (id, field, value) => {
    // Atualiza o campo localmente
    let novaLinha = null
    setAtributos(prev => prev.map(r => {
      if (r.id !== id) return r
      novaLinha = { ...r, [field]: value }
      return novaLinha
    }))
    await supabase.from('d_ficha_atributos').update({ [field]: value }).eq('id', id)

    // Se é um campo DSG, reavaliar o vínculo ao catálogo
    if (DSG_FIELDS.includes(field) && novaLinha) {
      const nome = novaLinha.nome_atributo_gold?.trim()
      const sis  = novaLinha.sistema_referencia_gold?.trim()
      const match = (nome && sis)
        ? catalogo.find(c => c.nome_atributo_gold === nome && c.sistema_referencia_gold === sis)
        : null
      const novoIdCat = match ? match.id : null
      if ((novaLinha.id_catalogo_atributo || null) !== novoIdCat) {
        setAtributos(prev => prev.map(r => r.id === id ? { ...r, id_catalogo_atributo: novoIdCat } : r))
        await supabase.from('d_ficha_atributos').update({ id_catalogo_atributo: novoIdCat }).eq('id', id)
      }
    }
  }

  const updateDominio = async (id, value) => {
    setAtributos(prev => prev.map(r => r.id === id ? { ...r, dominio_atributo: value, sub_dominio_id: null } : r))
    await supabase.from('d_ficha_atributos').update({ sub_dominio_id: null }).eq('id', id)
  }

  const removeLinha = async (id) => {
    setAtributos(prev => prev.filter(r => r.id !== id))
    await supabase.from('d_ficha_atributos').delete().eq('id', id)
  }

  const handleDeleteClick = (row) => {
    const dataFields = ['nome_atributo', 'descricao_atributo', 'sistema_referencia', 'nome_atributo_gold', 'descricao_atributo_gold']
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
      nome_atributo_gold:      nome,
      descricao_atributo_gold: desc || null,
      sistema_referencia_gold: row.sistema_referencia_gold?.trim() || null,
      sub_dominio_id:          row.sub_dominio_id || null,
      status:                  'Mapeamento Sistema Fonte UN',
    }]).select()
    if (error) {
      console.error('Erro ao adicionar ao catálogo:', error)
      alert('Não foi possível adicionar ao catálogo: ' + error.message)
      return
    }
    const novoId = insertedRows?.[0]?.id || null
    // Guardar id_catalogo_atributo na linha do caderno
    if (novoId) {
      await supabase.from('d_ficha_atributos').update({ id_catalogo_atributo: novoId }).eq('id', row.id)
      setAtributos(prev => prev.map(r => r.id === row.id ? { ...r, id_catalogo_atributo: novoId } : r))
    }
    setNomeStatusMap(prev => ({ ...prev, [nome]: 'Mapeamento Sistema Fonte UN' }))
    setNomeIdMap(prev => ({ ...prev, [nome]: novoId }))
    setNomeDescMap(prev => ({ ...prev, [nome]: desc || '' }))
    if (desc) setDescNomeMap(prev => ({ ...prev, [desc]: nome }))
    setCatalogoNomes(prev => prev.includes(nome) ? prev : [...prev, nome].sort())
    if (desc) setCatalogoDescricoes(prev => prev.includes(desc) ? prev : [...prev, desc].sort())
    setCatalogoTarget(null)
  }

  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null) // { ok, erros }

  const importExcel = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImporting(true); setImportResult(null)

    try {
      // Ler CSV como texto
      const text = await file.text()

      // Remover BOM e normalizar line endings
      const clean = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')

      // Parser CSV simples com suporte a campos entre aspas (que podem ter \n internos)
      const parseCSV = (str, sep = ';') => {
        const rows = []
        let cur = [], field = '', inQ = false
        for (let i = 0; i < str.length; i++) {
          const ch = str[i]
          if (inQ) {
            if (ch === '"' && str[i+1] === '"') { field += '"'; i++ }
            else if (ch === '"') inQ = false
            else field += ch
          } else if (ch === '"') {
            inQ = true
          } else if (ch === sep) {
            cur.push(field.trim()); field = ''
          } else if (ch === '\n') {
            cur.push(field.trim()); field = ''
            // Só adiciona linha se não estiver dentro de campo com quotes
            rows.push(cur); cur = []
          } else {
            field += ch
          }
        }
        if (field || cur.length) { cur.push(field.trim()); if (cur.some(c => c)) rows.push(cur) }
        return rows
      }

      const rows = parseCSV(clean)

      // Linha 0: título — ignorar
      // Linha 1: headers — ignorar
      // Linha 2+: dados
      // Colunas: A=Nome, B=Descrição, C=Sistema Referência, D=Domínio, E=Sub-Domínio
      const dataRows = rows.slice(2).filter(r => {
        const nome = String(r[0] || '').trim()
        const desc = String(r[1] || '').trim()
        return nome && desc
          && nome !== '<selecionar>' && desc !== '<selecionar>'
      })

      if (dataRows.length === 0) {
        setImportResult({ ok: 0, erros: ['Nenhuma linha com Nome e Descrição preenchidos encontrada.'] })
        setImporting(false); return
      }

      const toInsert = []
      const meta     = []  // guardar dominio/subdominio do template por linha
      const erros    = []

      dataRows.forEach((r) => {
        const nome    = String(r[0] || '').trim()
        const desc    = String(r[1] || '').trim() || null
        const sistema = String(r[2] || '').trim()
        const dom     = String(r[3] || '').trim()
        const sub     = String(r[4] || '').trim()
        const sistemaVal = (sistema && sistema !== '<selecionar>') ? sistema : null
        const domVal     = (dom && dom !== '<selecionar>') ? dom : ''
        const subVal     = (sub && sub !== '<selecionar>') ? sub : ''

        toInsert.push({
          produto_dados_id:   produtoId,
          nome_atributo:      nome,
          descricao_atributo: desc,
          sistema_referencia: sistemaVal,
        })
        meta.push({ dominio: domVal, subdominio: subVal })
      })

      const { data: inserted, error } = await supabase.from('d_ficha_atributos').insert(toInsert).select()
      if (error) {
        setImportResult({ ok: 0, erros: [`Erro Supabase: ${error.message}`] })
        setImporting(false); return
      }

      // Popular dominio_atributo + sub_dominio_id (estado local) a partir do template
      // E materializar o sub_dominio_id na BD
      const updates = []
      const enriched = (inserted || []).map((row, idx) => {
        const m = meta[idx] || {}
        let dominio_atributo = null, sub_dominio_id = null
        if (m.dominio) {
          const domKey = Object.keys(dominioSubMap).find(d => d.toLowerCase() === m.dominio.toLowerCase())
          if (domKey) {
            dominio_atributo = domKey
            if (m.subdominio) {
              const subMatch = (dominioSubMap[domKey] || []).find(s => s.nome.toLowerCase() === m.subdominio.toLowerCase())
              if (subMatch) {
                sub_dominio_id = subMatch.id
                updates.push({ id: row.id, sub_dominio_id })
              }
            }
          }
        }
        return { ...row, dominio_atributo, sub_dominio_id }
      })

      // Materializar sub_dominio_id na d_ficha_atributos
      await Promise.all(updates.map(u =>
        supabase.from('d_ficha_atributos').update({ sub_dominio_id: u.sub_dominio_id }).eq('id', u.id)
      ))

      setAtributos(prev => [...prev, ...enriched])
      setImportResult({ ok: enriched.length, erros })
    } catch (err) {
      setImportResult({ ok: 0, erros: [`Erro ao processar o ficheiro: ${err.message}`] })
    }
    setImporting(false)
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

  // ─── Filtros (modo levantamento) ───────────────────────────────────────
  // Mapa id sub-domínio → nome
  const subNomeById = {}
  Object.values(dominioSubMap).forEach(arr => arr.forEach(s => { subNomeById[s.id] = s.nome }))

  // Opções de filtro derivadas dos atributos
  const fSistemaRefOpts = [...new Set(atributos.map(a => a.sistema_referencia).filter(Boolean))].sort()
  const fDominioOpts    = [...new Set(atributos.map(a => a.dominio_atributo).filter(Boolean))].sort()
  const fSubdominioOpts = [...new Set(atributos.map(a => subNomeById[a.sub_dominio_id]).filter(Boolean))].sort()

  const atributosFiltrados = atributos.filter(a => {
    if (filtroSistemaRef.length && !filtroSistemaRef.includes(a.sistema_referencia)) return false
    if (filtroDominio.length    && !filtroDominio.includes(a.dominio_atributo))      return false
    if (filtroSubdominio.length && !filtroSubdominio.includes(subNomeById[a.sub_dominio_id])) return false
    return true
  })
  const visibleAtrFiltrado = atributosFiltrados.slice(0, visibleCount)
  const temFiltrosLev = !!(filtroSistemaRef.length || filtroDominio.length || filtroSubdominio.length)
  const limparFiltrosLev = () => { setFiltroSistemaRef([]); setFiltroDominio([]); setFiltroSubdominio([]) }

  const inputStyle = {
    width: '100%', padding: '6px 9px', borderRadius: '6px', border: '1.5px solid #E0E5EC',
    fontSize: '12px', color: '#2C3A42', background: '#FFFFFF', outline: 'none',
    fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
  }

  // Estilo do texto da célula em modo leitura (sem caixa) — edição só ao clicar
  const cellDisplayStyle = (hasValue) => ({
    width: '100%', padding: '6px 9px', borderRadius: '6px', border: '1.5px solid transparent',
    fontSize: '12px', color: hasValue ? '#2C3A42' : '#C8D0DA', background: 'transparent',
    fontFamily: 'Inter, sans-serif', boxSizing: 'border-box', cursor: 'text',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minHeight: '26px',
    display: 'flex', alignItems: 'center', transition: 'background 0.1s',
  })
  const isEditing = (rowId, colKey) => editingCell === `${rowId}:${colKey}`

  const UN_COLUMNS = [
    { key: 'nome_atributo',       label: 'Nome Atributo',         width: '180px', type: 'text' },
    { key: 'descricao_atributo',  label: 'Descrição Atributo',    width: '240px', type: 'text' },
    { key: 'sistema_referencia',  label: 'Sistema de Referência', width: '180px', type: 'text' },
    { key: 'dominio_atributo',    label: 'Domínios',              width: '190px', type: 'dominio' },
    { key: 'subdominio_atributo', label: 'Sub Domínios',          width: '190px', type: 'subdominio' },
  ]
  const DSG_COLUMNS = [
    { key: 'nome_atributo_gold',      label: 'Nome atributo (Gold)',              width: '200px', type: 'combo', list: 'nomes' },
    { key: 'descricao_atributo_gold', label: 'Descrição*',                        width: '260px', type: 'combo', list: 'descricoes' },
    { key: 'sistema_referencia_gold', label: 'Sistema de Referência',             width: '180px', type: 'catalogo_text', cat_key: 'sistema_referencia_gold' },
    { key: '_catalogo',               label: 'Catálogo',                          width: '200px', type: 'catalogo' },
  ]
  const UN_CAT_COLUMNS = [
    { key: 'cat_sistema_un',         label: 'Sistema Unidade Negócio*',           width: '160px', type: 'catalogo_text', cat_key: 'sistema_un' },
    { key: 'cat_tabela_un',          label: 'Tabela Unidade Negócio*',            width: '160px', type: 'catalogo_text', cat_key: 'tabela_un' },
    { key: 'cat_nome_atributo_un',   label: 'Nome atributo*',                     width: '160px', type: 'catalogo_text', cat_key: 'nome_atributo_un' },
    { key: 'cat_descricao_un',       label: 'Descrição Atributo*',                width: '220px', type: 'catalogo_text', cat_key: 'descricao_atributo_un' },
    { key: 'cat_tipologia',          label: 'Tipologia Atributo*',                width: '130px', type: 'catalogo_text', cat_key: 'tipologia_atributo' },
    { key: 'cat_formula',            label: 'Fórmula de cálculo / Regra negócio', width: '240px', type: 'catalogo_text', cat_key: 'formula_calculo' },
    { key: 'cat_data_type_un',       label: 'Data Type',                          width: '120px', type: 'catalogo_text', cat_key: 'data_type_un' },
  ]
  const DIT_FONTE_COLUMNS = [
    { key: 'cat_sistema_fonte_dit',          label: 'Sistema Fonte DIT',                                        width: '150px', type: 'catalogo_text', cat_key: 'sistema_fonte_dit' },
    { key: 'cat_tabela_fonte_dit',           label: 'Tabela Sistema Fonte DIT',                                 width: '170px', type: 'catalogo_text', cat_key: 'tabela_fonte_dit' },
    { key: 'cat_nome_atributo_fonte_dit',    label: 'Nome no Sistema Fonte DIT',                                width: '180px', type: 'catalogo_text', cat_key: 'nome_atributo_fonte_dit' },
    { key: 'cat_descricao_fonte_dit',        label: 'Descrição Atributo Sistema Fonte DIT',                     width: '240px', type: 'catalogo_text', cat_key: 'descricao_atributo_fonte_dit' },
    { key: 'cat_mapeamento_dit',             label: 'Mapeamento / Joins / Regras / Query DIT',                  width: '260px', type: 'catalogo_text', cat_key: 'mapeamento_dit' },
    { key: 'cat_formato_dit',                label: 'Formato Atributo',                                         width: '130px', type: 'catalogo_text', cat_key: 'formato_atributo_dit' },
  ]
  const DIT_FABRIC_COLUMNS = [
    { key: 'cat_campo_em_fabric',            label: 'Campo em Fabric (S/N)',                                    width: '140px', type: 'catalogo_text', cat_key: 'campo_em_fabric' },
    { key: 'cat_sistema_ingerido',           label: 'Sistema Ingerido',                                         width: '150px', type: 'catalogo_text', cat_key: 'sistema_ingerido_fabric' },
    { key: 'cat_tabela_fabric',              label: 'Tabela de Fabric (DIT)',                                   width: '170px', type: 'catalogo_text', cat_key: 'tabela_fabric_dit' },
    { key: 'cat_nome_atributo_fabric',       label: 'Nome Atributo em Fabric (DIT)',                            width: '190px', type: 'catalogo_text', cat_key: 'nome_atributo_fabric_dit' },
    { key: 'cat_descricao_fabric',           label: 'Descrição Atributo em Fabric (DIT)',                       width: '220px', type: 'catalogo_text', cat_key: 'descricao_atributo_fabric_dit' },
    { key: 'cat_mapeamento_fabric',          label: 'Mapeamento / Joins / Regras / Query (Fabric)',             width: '280px', type: 'catalogo_text', cat_key: 'mapeamento_fabric' },
    { key: 'cat_data_type_fabric',           label: 'Data Type (Date, Varchar(x)...)',                          width: '180px', type: 'catalogo_text', cat_key: 'data_type_fabric' },
    { key: 'cat_chave_primaria',             label: 'Chave Primária (S/N)',                                     width: '130px', type: 'catalogo_text', cat_key: 'chave_primaria_fabric' },
    { key: 'cat_chave_estrangeira',          label: 'Chave Estrangeira (S/N)',                                  width: '140px', type: 'catalogo_text', cat_key: 'chave_estrangeira_fabric' },
    { key: 'cat_tabela_ref',                 label: 'Tabela de referência',                                     width: '150px', type: 'catalogo_text', cat_key: 'tabela_referencia_fabric' },
    { key: 'cat_atributo_ref',               label: 'Atributo de referência',                                   width: '150px', type: 'catalogo_text', cat_key: 'atributo_referencia_fabric' },
    { key: 'cat_permite_nulos',              label: 'Permite Nulos (S/N)',                                      width: '130px', type: 'catalogo_text', cat_key: 'permite_nulos_fabric' },
    { key: 'cat_codigo_lista',               label: 'É código / lista de valores (S/N)',                        width: '180px', type: 'catalogo_text', cat_key: 'codigo_lista_valores_fabric' },
    { key: 'cat_regra_ref',                  label: 'Regra de Referência de Código',                            width: '200px', type: 'catalogo_text', cat_key: 'regra_referencia_codigo_fabric' },
    { key: 'cat_classificacao',              label: 'Classificação de Dados',                                   width: '150px', type: 'catalogo_text', cat_key: 'classificacao_dados_fabric' },
    { key: 'cat_estado_confidencial',        label: 'Estado Dados Confidênciais',                               width: '160px', type: 'catalogo_text', cat_key: 'estado_confidencial_fabric' },
    { key: 'cat_dado_mestre',                label: 'Dado Mestre / Transacional',                               width: '160px', type: 'catalogo_text', cat_key: 'dado_mestre_transacional_fabric' },
    { key: 'cat_notas',                      label: 'Notas',                                                    width: '180px', type: 'catalogo_text', cat_key: 'notas_fabric' },
  ]

  const ALL_COLUMNS_FULL = [...UN_COLUMNS, ...DSG_COLUMNS, ...UN_CAT_COLUMNS, ...DIT_FONTE_COLUMNS, ...DIT_FABRIC_COLUMNS]

  const GROUP_HEADERS_FULL = [
    { label: 'UN Business Owner — Levantamento dados alto nível', span: UN_COLUMNS.length,      color: '#4A7A5A', bg: 'rgba(194,216,185,0.15)', border: 'rgba(74,122,90,0.2)' },
    { label: 'DSG',                                               span: DSG_COLUMNS.length,     color: '#5A7BA8', bg: 'rgba(161,181,216,0.15)', border: 'rgba(90,123,168,0.25)' },
    { label: 'Unidade de Negócio — Data Steward',                 span: UN_CAT_COLUMNS.length,  color: '#4A7A5A', bg: 'rgba(194,216,185,0.15)', border: 'rgba(74,122,90,0.2)' },
    { label: 'DIT — Detalhe dos dados no Sistema Fonte',          span: DIT_FONTE_COLUMNS.length, color: '#9A6E20', bg: 'rgba(201,151,74,0.10)', border: 'rgba(154,110,32,0.2)' },
    { label: 'DIT Data Engineer / Data Custodian — Fabric',       span: DIT_FABRIC_COLUMNS.length, color: '#738290', bg: 'rgba(115,130,144,0.10)', border: 'rgba(115,130,144,0.2)' },
  ]

  // Modo "levantamento" → só UN + DSG (com coluna de status no DSG)
  const DSG_COLUMNS_LEV = [
    { key: 'nome_atributo_gold',      label: 'Nome atributo (Gold)',  width: '200px', type: 'combo', list: 'nomes' },
    { key: 'descricao_atributo_gold', label: 'Descrição*',            width: '260px', type: 'combo', list: 'descricoes' },
    { key: 'sistema_referencia_gold', label: 'Sistema de Referência', width: '180px', type: 'combo', list: 'sistemas', cat_key: 'sistema_referencia_gold' },
    { key: '_catalogo',               label: 'Status',                width: '200px', type: 'catalogo' },
  ]

  const isLevantamento = modo === 'levantamento'
  const ALL_COLUMNS = isLevantamento ? [...UN_COLUMNS, ...DSG_COLUMNS_LEV] : ALL_COLUMNS_FULL
  const GROUP_HEADERS_FT = isLevantamento ? [
    { label: 'UN Business Owner — Levantamento dados alto nível', span: UN_COLUMNS.length,     color: '#4A7A5A', bg: 'rgba(194,216,185,0.15)', border: 'rgba(74,122,90,0.2)' },
    { label: 'DSG',                                               span: DSG_COLUMNS_LEV.length, color: '#5A7BA8', bg: 'rgba(161,181,216,0.15)', border: 'rgba(90,123,168,0.25)' },
  ] : GROUP_HEADERS_FULL

  const deleteColWidth = 34
  const tableWidth = ALL_COLUMNS.reduce((s, c) => s + parseInt(c.width), 0)

  // Obter opções do catálogo filtradas pelo que já está preenchido na linha
  const getCatOpts = (row, field) => {
    const filterFields = [
      'nome_atributo_gold', 'descricao_atributo_gold', 'sistema_referencia_gold',
      'sistema_un', 'tabela_un', 'nome_atributo_un', 'descricao_atributo_un', 'tipologia_atributo',
      'formula_calculo', 'data_type_un',
      'sistema_fonte_dit', 'tabela_fonte_dit', 'nome_atributo_fonte_dit',
      'descricao_atributo_fonte_dit', 'mapeamento_dit', 'formato_atributo_dit',
      'campo_em_fabric', 'sistema_ingerido_fabric', 'tabela_fabric_dit',
      'nome_atributo_fabric_dit', 'descricao_atributo_fabric_dit', 'mapeamento_fabric',
      'data_type_fabric', 'chave_primaria_fabric', 'chave_estrangeira_fabric',
      'tabela_referencia_fabric', 'atributo_referencia_fabric', 'permite_nulos_fabric',
      'codigo_lista_valores_fabric', 'regra_referencia_codigo_fabric',
      'classificacao_dados_fabric', 'estado_confidencial_fabric',
      'dado_mestre_transacional_fabric', 'notas_fabric',
    ]

    let filtered = catalogo
    filterFields.forEach(f => {
      const v = row[f]
      if (f !== field && v) {
        const next = filtered.filter(c => c[f] === v)
        // Só aplica o filtro se não zerar os resultados (valor pode ainda não existir no catálogo)
        if (next.length > 0) filtered = next
      }
    })
    return [...new Set(filtered.map(c => c[field]).filter(Boolean))].sort()
  }

  // Pré-preencher todos os campos quando nome_gold + sistema_referencia_gold identificam registo único
  const tryAutoFill = async (id, updatedRow) => {
    const nome = updatedRow.nome_atributo_gold?.trim()
    const sis  = updatedRow.sistema_referencia_gold?.trim()
    if (!nome || !sis) return
    const matches = catalogo.filter(c => c.nome_atributo_gold === nome && c.sistema_referencia_gold === sis)
    if (matches.length !== 1) return
    const cat = matches[0]
    const patch = {
      nome_atributo_gold:              cat.nome_atributo_gold,
      descricao_atributo_gold:         cat.descricao_atributo_gold,
      sistema_referencia_gold:         cat.sistema_referencia_gold,
      id_catalogo_atributo:            cat.id,
      sistema_un:                      cat.sistema_un,
      tabela_un:                       cat.tabela_un,
      nome_atributo_un:                cat.nome_atributo_un,
      descricao_atributo_un:           cat.descricao_atributo_un,
      tipologia_atributo:              cat.tipologia_atributo,
      formula_calculo:                 cat.formula_calculo,
      data_type_un:                    cat.data_type_un,
      sistema_fonte_dit:               cat.sistema_fonte_dit,
      tabela_fonte_dit:                cat.tabela_fonte_dit,
      nome_atributo_fonte_dit:         cat.nome_atributo_fonte_dit,
      descricao_atributo_fonte_dit:    cat.descricao_atributo_fonte_dit,
      mapeamento_dit:                  cat.mapeamento_dit,
      formato_atributo_dit:            cat.formato_atributo_dit,
      campo_em_fabric:                 cat.campo_em_fabric,
      sistema_ingerido_fabric:         cat.sistema_ingerido_fabric,
      tabela_fabric_dit:               cat.tabela_fabric_dit,
      nome_atributo_fabric_dit:        cat.nome_atributo_fabric_dit,
      descricao_atributo_fabric_dit:   cat.descricao_atributo_fabric_dit,
      mapeamento_fabric:               cat.mapeamento_fabric,
      data_type_fabric:                cat.data_type_fabric,
      chave_primaria_fabric:           cat.chave_primaria_fabric,
      chave_estrangeira_fabric:        cat.chave_estrangeira_fabric,
      tabela_referencia_fabric:        cat.tabela_referencia_fabric,
      atributo_referencia_fabric:      cat.atributo_referencia_fabric,
      permite_nulos_fabric:            cat.permite_nulos_fabric,
      codigo_lista_valores_fabric:     cat.codigo_lista_valores_fabric,
      regra_referencia_codigo_fabric:  cat.regra_referencia_codigo_fabric,
      classificacao_dados_fabric:      cat.classificacao_dados_fabric,
      estado_confidencial_fabric:      cat.estado_confidencial_fabric,
      dado_mestre_transacional_fabric: cat.dado_mestre_transacional_fabric,
      notas_fabric:                    cat.notas_fabric,
    }
    setAtributos(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
    // Materializa na d_ficha_atributos: link ao catálogo + os 3 campos DSG
    // NÃO altera domínio/sub-domínio (são definidos pela UN)
    await supabase.from('d_ficha_atributos').update({
      id_catalogo_atributo:    cat.id,
      nome_atributo_gold:      cat.nome_atributo_gold,
      descricao_atributo_gold: cat.descricao_atributo_gold,
      sistema_referencia_gold: cat.sistema_referencia_gold,
    }).eq('id', id)
  }

  const renderCell = (row, col) => {
    if (col.type === 'text') {
      const cellId = `${row.id}:${col.key}`
      if (isEditing(row.id, col.key)) {
        return (
          <input autoFocus style={inputStyle} value={row[col.key] || ''}
            onChange={e => setAtributos(prev => prev.map(r => r.id === row.id ? { ...r, [col.key]: e.target.value } : r))}
            onBlur={e => { updateLinha(row.id, col.key, e.target.value.trim() || null); setEditingCell(null) }}
            placeholder="—" />
        )
      }
      return (
        <div style={cellDisplayStyle(!!row[col.key])} onClick={() => setEditingCell(cellId)}
          onMouseEnter={e => e.currentTarget.style.background = '#F5F8FC'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          {row[col.key] || '—'}
        </div>
      )
    }
    if (col.type === 'dominio') {
      const cellId = `${row.id}:${col.key}`
      if (isEditing(row.id, col.key)) {
        return (
          <select autoFocus style={inputStyle} value={row.dominio_atributo || ''}
            onChange={e => updateDominio(row.id, e.target.value || null)}
            onBlur={() => setEditingCell(null)}>
            <option value="">—</option>
            {Object.keys(dominioSubMap).sort().map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )
      }
      return (
        <div style={cellDisplayStyle(!!row.dominio_atributo)} onClick={() => setEditingCell(cellId)}
          onMouseEnter={e => e.currentTarget.style.background = '#F5F8FC'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          {row.dominio_atributo || '—'}
        </div>
      )
    }
    if (col.type === 'subdominio') {
      const cellId = `${row.id}:${col.key}`
      const subOpts = dominioSubMap[row.dominio_atributo] || []
      const subNome = (subOpts.find(s => s.id === row.sub_dominio_id) || {}).nome
      if (isEditing(row.id, col.key)) {
        return (
          <select autoFocus style={inputStyle} value={row.sub_dominio_id || ''}
            onChange={e => updateLinha(row.id, 'sub_dominio_id', e.target.value || null)}
            onBlur={() => setEditingCell(null)} disabled={!row.dominio_atributo}>
            <option value="">—</option>
            {subOpts.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        )
      }
      return (
        <div style={{ ...cellDisplayStyle(!!subNome), cursor: row.dominio_atributo ? 'text' : 'not-allowed' }}
          onClick={() => { if (row.dominio_atributo) setEditingCell(cellId) }}
          onMouseEnter={e => { if (row.dominio_atributo) e.currentTarget.style.background = '#F5F8FC' }}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          {subNome || '—'}
        </div>
      )
    }
    if (col.type === 'catalogo_text') {
      const catKey = col.cat_key
      const val = row[catKey]
      const isBloqueado = !!row.id_catalogo_atributo
      if (isBloqueado) {
        return (
          <div title="Editável em Provisionamento > Atributos"
            style={{ padding: '4px 0', fontSize: '12px', cursor: 'not-allowed', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#C8D0DA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: val ? '#4A5568' : '#C8D0DA' }}>{val || '—'}</span>
          </div>
        )
      }
      // Combobox filtrado pelo catálogo
      const opts = getCatOpts(row, catKey)
      const listId = `list-${catKey}-${row.id}`
      const cellId = `${row.id}:${col.key}`
      if (isEditing(row.id, col.key)) {
        return (
          <>
            <input autoFocus style={inputStyle} list={listId} value={val || ''}
              onChange={e => {
                const newVal = e.target.value
                const updatedRow = { ...row, [catKey]: newVal }
                setAtributos(prev => prev.map(r => r.id === row.id ? updatedRow : r))
                tryAutoFill(row.id, updatedRow)
              }}
              onBlur={e => { updateLinha(row.id, catKey, e.target.value.trim() || null); setEditingCell(null) }}
              placeholder="—" />
            <datalist id={listId}>{opts.map(o => <option key={o} value={o} />)}</datalist>
          </>
        )
      }
      return (
        <div style={cellDisplayStyle(!!val)} onClick={() => setEditingCell(cellId)}
          onMouseEnter={e => e.currentTarget.style.background = '#F5F8FC'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          {val || '—'}
        </div>
      )
    }
    if (col.type === 'combo') {
      const listId = `list-${col.list}-${row.id}`
      const catKey = col.cat_key || col.key  // de onde vêm as opções no catálogo
      const opts = getCatOpts(row, catKey)
      const cellId = `${row.id}:${col.key}`
      if (isEditing(row.id, col.key)) {
        return (
          <>
            <input autoFocus style={inputStyle} list={listId} value={row[col.key] || ''}
              onChange={e => {
                const newVal = e.target.value
                const updatedRow = { ...row, [col.key]: newVal }
                setAtributos(prev => prev.map(r => r.id === row.id ? updatedRow : r))
                tryAutoFill(row.id, updatedRow)
              }}
              onBlur={e => { updateLinha(row.id, col.key, e.target.value.trim() || null); setEditingCell(null) }}
              placeholder="Selecciona ou escreve…" />
            <datalist id={listId}>{opts.map(o => <option key={o} value={o} />)}</datalist>
          </>
        )
      }
      return (
        <div style={cellDisplayStyle(!!row[col.key])} onClick={() => setEditingCell(cellId)}
          onMouseEnter={e => e.currentTarget.style.background = '#F5F8FC'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          {row[col.key] || '—'}
        </div>
      )
    }
    if (col.type === 'catalogo') {
      const nome = row.nome_atributo_gold?.trim()
      const desc = row.descricao_atributo_gold?.trim()
      const sis  = row.sistema_referencia_gold?.trim()
      // Se já está ligado ao catálogo, mostra o status do registo ligado
      if (row.id_catalogo_atributo) {
        const ligado = catalogo.find(c => c.id === row.id_catalogo_atributo)
        if (ligado) return <AtrStatusBadge status={ligado.status || 'Mapeamento Sistema Fonte UN'} />
      }
      // Identificação no catálogo só com a combinação Nome + Sistema de Referência
      const catMatch = (nome && sis)
        ? catalogo.find(c => c.nome_atributo_gold === nome && c.sistema_referencia_gold === sis)
        : null
      if (catMatch) return <AtrStatusBadge status={catMatch.status || 'Mapeamento Sistema Fonte UN'} />
      if (nome && desc && sis) {
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

      {/* Banner — só no modo completo (Ficha Técnica) */}
      {!isLevantamento && (
      <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ background: 'rgba(92,143,106,0.15)', color: '#2A6040', borderRadius: '6px', padding: '3px 10px', fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em' }}>
              {caderno.id_ficha_tecnica}
            </span>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#2C3A42', margin: 0 }}>{caderno.nome_ficha_tecnica}</h2>
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
          <BannerField label="Produto de Dados" value={caderno.produto_nome || caderno.id_produto_dados} />
          <BannerField label="Criado em" value={caderno.created_at ? new Date(caderno.created_at).toLocaleDateString('pt-PT') : null} />
        </div>
      </div>
      )}

      {/* Barra: filtros (esq, modo levantamento) + botões (dir) */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
          {/* Filtros — só no modo levantamento */}
          {isLevantamento ? (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <MultiSelect options={fSistemaRefOpts} value={filtroSistemaRef} onChange={setFiltroSistemaRef} placeholder="Sistema Referência" />
              <MultiSelect options={fDominioOpts} value={filtroDominio} onChange={setFiltroDominio} placeholder="Domínio" />
              <MultiSelect options={fSubdominioOpts} value={filtroSubdominio} onChange={setFiltroSubdominio} placeholder="Sub Domínio" />
              {temFiltrosLev && <button onClick={limparFiltrosLev} style={{ padding: '7px 14px', borderRadius: '8px', border: '1.5px solid #E0E5EC', background: '#FFFFFF', color: '#738290', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>Limpar filtros</button>}
            </div>
          ) : <div />}

          {/* Botões — à direita */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
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

          {/* Botão Import Excel */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #C8D5E8', background: 'rgba(161,181,216,0.10)', color: '#5A7BA8', fontSize: '12px', fontWeight: '600', cursor: importing ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', opacity: importing ? 0.6 : 1 }}
            onMouseEnter={e => { if (!importing) e.currentTarget.style.background = 'rgba(161,181,216,0.20)' }}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(161,181,216,0.10)'}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            {importing ? 'A importar...' : 'Importar CSV'}
            <input type="file" accept=".csv" onChange={importExcel} style={{ display: 'none' }} disabled={importing} />
          </label>
          </div>
        </div>

        {/* Resultado import */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          {importResult && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
              {importResult.ok > 0 && (
                <span style={{ color: '#2A6040', background: 'rgba(92,143,106,0.12)', borderRadius: '6px', padding: '4px 10px', fontWeight: '600' }}>
                  ✓ {importResult.ok} linha{importResult.ok !== 1 ? 's' : ''} importada{importResult.ok !== 1 ? 's' : ''}
                </span>
              )}
              {importResult.ok === 0 && importResult.erros.length === 0 && (
                <span style={{ color: '#738290', background: 'rgba(115,130,144,0.10)', borderRadius: '6px', padding: '4px 10px', fontWeight: '500' }}>
                  Nenhuma linha para importar
                </span>
              )}
              {importResult.erros.length > 0 && (
                <span style={{ color: '#C0544C', background: 'rgba(192,84,76,0.08)', borderRadius: '6px', padding: '4px 10px', fontWeight: '500', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  title={importResult.erros.join('\n')}>
                  ⚠ {importResult.erros[0]}{importResult.erros.length > 1 ? ` (+${importResult.erros.length - 1})` : ''}
                </span>
              )}
              <button onClick={() => setImportResult(null)} style={{ background: 'none', border: 'none', color: '#B0BCC8', cursor: 'pointer', fontSize: '14px', padding: '0 4px' }}>×</button>
            </div>
          )}
        </div>

        {/* Tabela — recua deleteColWidth para o delete cair na margem; scroll começa na tabela */}
        {/* Flex: coluna de deletes (fora do scroll) + tabela (com scroll) */}
        <div style={{ display: 'flex', alignItems: 'flex-start', marginLeft: `-${deleteColWidth}px` }}>
          {/* Deletes — alinhados por linha, fora do scroll */}
          <div style={{ flexShrink: 0, width: `${deleteColWidth}px` }}>
            {/* Espaço dos 2 headers */}
            <div style={{ height: '63px' }} />
            {visibleAtrFiltrado.map((row) => (
              <div key={row.id} style={{ height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button onClick={() => handleDeleteClick(row)}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '5px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#C8A09C' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(192,84,76,0.12)'; e.currentTarget.style.color = '#C0544C' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#C8A09C' }}
                  title="Eliminar linha">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                {GROUP_HEADERS_FT.map((g, i) => (
                  <th key={i} colSpan={g.span} style={{ padding: '7px 14px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: g.color, background: g.bg, textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: `2px solid ${g.border}`, borderRight: i < GROUP_HEADERS_FT.length - 1 ? `2px solid ${g.border}` : 'none' }}>
                    {g.label}
                  </th>
                ))}
              </tr>
              <tr style={{ borderBottom: '1px solid #ECEEF2' }}>
                {ALL_COLUMNS.map((col, i) => {
                  const groupIdx = col.type === 'text' || col.type === 'dominio' || col.type === 'subdominio'
                    ? 0 : col.type === 'combo' || col.type === 'catalogo' ? 1
                    : col.key?.startsWith('cat_sistema_un') || col.key?.startsWith('cat_tabela_un') || col.key?.startsWith('cat_nome_atributo_un') || col.key?.startsWith('cat_descricao') && !col.key?.includes('dit') && !col.key?.includes('fabric') || col.key?.startsWith('cat_tipologia') || col.key?.startsWith('cat_formula') || col.key?.startsWith('cat_data_type_un') ? 2
                    : col.key?.startsWith('cat_sistema_fonte') || col.key?.startsWith('cat_tabela_fonte') || col.key?.startsWith('cat_nome_atributo_fonte') || col.key?.startsWith('cat_descricao_fonte') || col.key?.startsWith('cat_mapeamento_dit') || col.key?.startsWith('cat_formato') ? 3 : 4
                  const groupColors = ['rgba(74,122,90,0.2)', 'rgba(90,123,168,0.25)', 'rgba(74,122,90,0.2)', 'rgba(154,110,32,0.2)', 'rgba(115,130,144,0.2)']
                  const nextCol = ALL_COLUMNS[i + 1]
                  const isLastInGroup = !nextCol || (
                    (groupIdx === 0 && (nextCol.type === 'combo' || nextCol.type === 'catalogo')) ||
                    (groupIdx === 1 && nextCol.type === 'catalogo_text' && nextCol.key?.startsWith('cat_sistema_un')) ||
                    (groupIdx === 2 && nextCol.key?.startsWith('cat_sistema_fonte')) ||
                    (groupIdx === 3 && nextCol.key?.startsWith('cat_campo_em_fabric'))
                  )
                  return (
                    <th key={col.key} style={{ padding: '9px 12px', textAlign: 'left', fontSize: '10px', fontWeight: '600', color: '#738290', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', background: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', borderRight: isLastInGroup && i < ALL_COLUMNS.length - 1 ? `2px solid ${groupColors[groupIdx]}` : 'none' }}>
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
              {visibleAtrFiltrado.map((row, idx) => (
                <tr key={row.id} style={{ background: idx % 2 === 0 ? '#FFFFFF' : '#FAFBFC' }}>
                  {ALL_COLUMNS.map((col, i) => {
                    const isLastUN = i === UN_COLUMNS.length - 1
                    return (
                      <td key={col.key} style={{ padding: '3px 8px', height: '34px', boxSizing: 'border-box', borderRight: isLastUN ? '2px solid #ECEEF2' : 'none' }}>
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
        {atributosFiltrados.length > visibleCount && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '14px' }}>
            <button onClick={() => setVisibleCount(c => c + 50)}
              style={{ padding: '9px 20px', borderRadius: '8px', border: '1.5px solid #E0E5EC', background: '#FFFFFF', color: '#5A7BA8', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
              onMouseEnter={e => e.currentTarget.style.background = '#F5F8FC'}
              onMouseLeave={e => e.currentTarget.style.background = '#FFFFFF'}>
              Mostrar mais ({atributosFiltrados.length - visibleCount} restantes)
            </button>
          </div>
        )}
        {atributosFiltrados.length > 0 && (
          <p style={{ fontSize: '11px', color: '#B0BCC8', marginTop: '8px', textAlign: 'center' }}>
            A mostrar {visibleAtrFiltrado.length} de {atributosFiltrados.length} atributos{temFiltrosLev ? ' filtrados' : ''}
          </p>
        )}
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
            <div style={{ marginBottom: '20px' }}><AtrStatusBadge status="Mapeamento Sistema Fonte UN" /></div>
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
              Tens a certeza que queres eliminar o caderno <strong style={{ color: '#2C3A42' }}>{caderno.id_ficha_tecnica}</strong>?
            </p>
            <p style={{ fontSize: '12px', color: '#738290', margin: '0 0 24px', lineHeight: '1.6' }}>
              Todos os atributos levantados neste caderno serão também eliminados. Esta acção não pode ser revertida.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteModal(false)} style={{ padding: '8px 18px', borderRadius: '8px', border: '1.5px solid #E0E5EC', background: '#FFFFFF', color: '#738290', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={async () => {
                await supabase.from('d_ficha_atributos').delete().eq('produto_dados_id', produtoId)
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
export default function CadernoRequisitos({ selectedFicha, onSelectFicha, fichas, onFichasChange, onRegisterOpenModal }) {
  const { produtosDados } = useReferenceData()
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    fetchCadernos()
    if (onRegisterOpenModal) onRegisterOpenModal(() => setModalOpen(true))
  }, [])

  const fetchCadernos = async (autoSelectId = null) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('d_fichas_tecnicas')
      .select(`
        id, id_ficha_tecnica, nome_ficha_tecnica, focal_point, created_at, produto_dados_id,
        d_produtos_dados (
          id, id_produto_dados, nome_produto_dados, dominio_id,
          d_dominios ( id, nome )
        )
      `)
      .order('created_at', { ascending: false })
    if (!error && data) {
      const enriched = data.map(r => ({
        ...r,
        produto_nome:     r.d_produtos_dados?.nome_produto_dados || '(Sem produto)',
        dominio_nome:     r.d_produtos_dados?.d_dominios?.nome   || '(Sem domínio)',
        id_produto_dados: r.d_produtos_dados?.id_produto_dados   || '',
      }))
      onFichasChange(enriched)
      // Auto-seleccionar a ficha recém criada
      if (autoSelectId) {
        const nova = enriched.find(f => f.id === autoSelectId)
        if (nova) onSelectFicha(nova)
      }
    }
    setLoading(false)
  }

  const handleSave = async (novaFichaId = null) => {
    setModalOpen(false)
    await fetchCadernos(novaFichaId)
  }

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
      ) : !selectedFicha ? (
        <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '48px', textAlign: 'center', color: '#738290', fontSize: '13px' }}>
          {fichas.length === 0
            ? 'Nenhuma ficha técnica criada. Clica em "Criar Ficha Técnica" para começar.'
            : 'Selecciona uma ficha técnica na sidebar para ver o detalhe.'
          }
        </div>
      ) : (
        <CadernoDetalhe
          caderno={selectedFicha}
          produtosDados={produtosDados}
          onDelete={(id) => {
            onFichasChange(prev => prev.filter(c => c.id !== id))
            onSelectFicha(null)
          }}
          onUpdate={(updated) => {
            onFichasChange(prev => prev.map(c => c.id === updated.id ? updated : c))
            onSelectFicha(updated)
          }}
        />
      )}

      {modalOpen && (
        <CriarCadernoModal onClose={() => setModalOpen(false)} onSave={handleSave} produtosDados={produtosDados} cadernos={fichas} />
      )}
    </div>
  )
}