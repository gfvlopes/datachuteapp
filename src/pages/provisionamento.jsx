import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useReferenceData } from '../context/referencedatacontext'
import ProvisionamentoTable from '../components/provisionamentotable'
import ProvisionamentoModal from '../components/provisionamentomodal'
import MultiSelect from '../components/multiselect'

const STATUS_ORDER = [
  'A aguardar submissão pela BS',
  'Por iniciar (DSG)',
  'Levantamento de requisitos (DSG)',
  'Ingestão (DIT)',
  'Desenvolvimento (DSG)',
  'Validação dos Dados (BO)',
  'Bloqueado (DSG)',
  'Bloqueado (DIT)',
  'Bloqueado (BS)',
  'Entrega parcial',
  'Entregue',
]

const sortByStatusOrder = (values) =>
  [...values].sort((a, b) => {
    const ia = STATUS_ORDER.indexOf(a)
    const ib = STATUS_ORDER.indexOf(b)
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
  })

export default function Provisionamento(props) {
  const filterDominio = props.filterDominio || []
  const setFilterDominio = props.setFilterDominio || (() => {})
  const filterIniciativa = props.filterIniciativa || []
  const setFilterIniciativa = props.setFilterIniciativa || (() => {})
  const filterUseCase = props.filterUseCase || []
  const setFilterUseCase = props.setFilterUseCase || (() => {})
  const filterProduto = props.filterProduto || []
  const setFilterProduto = props.setFilterProduto || (() => {})

  const { produtosDados, refetchProdutosDados } = useReferenceData()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [iniciativas, setIniciativas] = useState([])
  const [filterStatus, setFilterStatus] = useState([])
  const topScrollRef = useRef(null)
  const tableWrapRef = useRef(null)

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    if (props.onRegisterOpenModal) {
      props.onRegisterOpenModal(() => { setEditingRow(null); setModalOpen(true) })
    }
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const [dpRes, inicRes] = await Promise.all([
      supabase.from('data_products').select('*').order('created_at', { ascending: true }),
      supabase.from('d_iniciativas').select('id_iniciativa,nome_iniciativa,id_use_case,nome_use_case').order('id_iniciativa'),
    ])
    setData(dpRes.data || [])
    setIniciativas(inicRes.data || [])
    setLoading(false)
  }

  const safeProdutosDados = produtosDados || []

  const enriched = data.map(r => {
    const prod = safeProdutosDados.find(p => p.id_produto_dados === r.id_produto_dados)
    return {
      ...r,
      tipologia: prod ? prod.tipologia : null,
      localizacao_fabric: prod ? prod.localizacao_fabric : null,
      descricao: prod ? prod.descricao : null,
      owner: prod ? prod.owner : null,
      filtros: prod ? prod.filtros : null,
      historico: prod ? prod.historico : null,
      update_info: prod ? prod.update_info : null,
      frequencia: prod ? prod.frequencia : null,
      volumes: prod ? prod.volumes : null,
    }
  })

  const handleAdd = () => { setEditingRow(null); setModalOpen(true) }
  const handleEdit = (row) => {
    const enrichedRow = enriched.find(e => e.id === row.id)
    setEditingRow(enrichedRow || row)
    setModalOpen(true)
  }

  const handleSave = async (form) => {
    const dimFields = {
      tipologia: form.tipologia, localizacao_fabric: form.localizacao_fabric,
      descricao: form.descricao, owner: form.owner, filtros: form.filtros,
      historico: form.historico, update_info: form.update_info,
      frequencia: form.frequencia, volumes: form.volumes,
    }

    const assocFields = {
      id_iniciativa: form.id_iniciativa, nome_iniciativa: form.nome_iniciativa,
      id_usecase_ai: form.id_usecase_ai, nome_use_case: form.nome_use_case,
      id_produto_dados: form.id_produto_dados, nome_produto_dados: form.nome_produto_dados,
      status: form.status, casos_uso_suportados: form.casos_uso_suportados,
      dominio_requisitante: form.dominio_requisitante,
    }

    const existingDim = safeProdutosDados.find(p => p.id_produto_dados === form.id_produto_dados)
    if (existingDim) {
      await supabase.from('d_produtos_dados').update(dimFields).eq('id', existingDim.id)
    } else if (form.id_produto_dados) {
      await supabase.from('d_produtos_dados').insert([{ id_produto_dados: form.id_produto_dados, nome_produto_dados: form.nome_produto_dados, ...dimFields }])
    }
    if (refetchProdutosDados) await refetchProdutosDados()

    if (editingRow) {
      const { error } = await supabase.from('data_products').update(assocFields).eq('id', editingRow.id)
      if (error) { console.error(error); return }
    } else {
      const { error } = await supabase.from('data_products').insert([assocFields])
      if (error) { console.error(error); return }
    }
    await fetchData()
    setModalOpen(false)
    setEditingRow(null)
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('data_products').delete().eq('id', id)
    if (!error) setData(prev => prev.filter(r => r.id !== id))
  }

  const handleInlineUpdate = (id, field, value) => {
    setData(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const syncScroll = (source, target) => {
    if (target.current) target.current.scrollLeft = source.current.scrollLeft
  }

  const filterData = (excludeField) => enriched.filter(r => {
    if (excludeField !== 'dominio'    && filterDominio.length    && !filterDominio.includes(r.owner)) return false
    if (excludeField !== 'iniciativa' && filterIniciativa.length && !filterIniciativa.includes(String(r.id_iniciativa))) return false
    if (excludeField !== 'usecase'    && filterUseCase.length    && !filterUseCase.includes(String(r.id_usecase_ai))) return false
    if (excludeField !== 'produto'    && filterProduto.length    && !filterProduto.includes(r.nome_produto_dados)) return false
    if (excludeField !== 'status'     && filterStatus.length     && !filterStatus.includes(r.status)) return false
    return true
  })

  const dominioOptions = [...new Set(filterData('dominio').map(r => r.owner).filter(Boolean))].sort()

  const iniciativaIds = [...new Set(filterData('iniciativa').map(r => r.id_iniciativa).filter(Boolean))]
  const iniciativaOptions = Array.from(
    new Map(iniciativas.filter(r => iniciativaIds.includes(String(r.id_iniciativa))).map(r => [String(r.id_iniciativa), r.nome_iniciativa])).entries()
  )

  const useCaseIds = [...new Set(filterData('usecase').map(r => r.id_usecase_ai).filter(Boolean))]
  const useCaseOptions = iniciativas
    .filter(r => useCaseIds.includes(String(r.id_use_case)))
    .map(r => ({ id: String(r.id_use_case), nome: r.nome_use_case }))
    .filter((v, i, a) => a.findIndex(x => x.id === v.id) === i)

  const produtoOptions = [...new Set(filterData('produto').map(r => r.nome_produto_dados).filter(Boolean))].sort()
  const statusOptions = sortByStatusOrder([...new Set(filterData('status').map(r => r.status).filter(Boolean))])

  const filtered = enriched.filter(r => {
    if (filterDominio.length    && !filterDominio.includes(r.owner)) return false
    if (filterIniciativa.length && !filterIniciativa.includes(String(r.id_iniciativa))) return false
    if (filterUseCase.length    && !filterUseCase.includes(String(r.id_usecase_ai))) return false
    if (filterProduto.length    && !filterProduto.includes(r.nome_produto_dados)) return false
    if (filterStatus.length     && !filterStatus.includes(r.status)) return false
    return true
  })

  const hasFilters = !!(filterDominio.length || filterIniciativa.length || filterUseCase.length || filterProduto.length || filterStatus.length)
  const clearFilters = () => { setFilterDominio([]); setFilterIniciativa([]); setFilterUseCase([]); setFilterProduto([]); setFilterStatus([]) }

  return (
    <div style={{ padding: '32px 36px', fontFamily: 'Inter, sans-serif' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#2C3A42', margin: 0 }}>
            Provisionamento — Produto de Dados
          </h1>
          <p style={{ fontSize: '13px', color: '#738290', margin: '4px 0 0' }}>
            Associação de Use Cases a Produtos de Dados
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Toggle Registo de Alterações */}
          <button
            onClick={() => props.onNavigate && props.onNavigate('registo-alteracoes')}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '9px 16px', borderRadius: '8px',
              border: '1.5px solid #E0E5EC',
              background: '#FFFFFF', color: '#738290',
              fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(161,181,216,0.10)'; e.currentTarget.style.borderColor = '#A1B5D8'; e.currentTarget.style.color = '#5A7BA8' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = '#E0E5EC'; e.currentTarget.style.color = '#738290' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            Registo de Alterações
          </button>

          <button
            onClick={handleAdd}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#A1B5D8', color: '#FFFFFF', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
            onMouseEnter={e => e.currentTarget.style.background = '#8DA4CC'}
            onMouseLeave={e => e.currentTarget.style.background = '#A1B5D8'}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Adicionar
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <MultiSelect
          options={dominioOptions}
          value={filterDominio}
          onChange={setFilterDominio}
          placeholder="Domínio"
        />
        <MultiSelect
          options={iniciativaOptions.map(([id, nome]) => `${id} — ${nome}`)}
          value={filterIniciativa.map(id => {
            const found = iniciativaOptions.find(([i]) => i === id)
            return found ? `${found[0]} — ${found[1]}` : id
          })}
          onChange={v => setFilterIniciativa(v.map(s => s.split(' — ')[0]))}
          placeholder="Iniciativa"
        />
        <MultiSelect
          options={useCaseOptions.map(o => `${o.id} — ${o.nome}`)}
          value={filterUseCase.map(id => {
            const found = useCaseOptions.find(o => o.id === id)
            return found ? `${found.id} — ${found.nome}` : id
          })}
          onChange={v => setFilterUseCase(v.map(s => s.split(' — ')[0]))}
          placeholder="Use Case"
        />
        <MultiSelect
          options={produtoOptions}
          value={filterProduto}
          onChange={setFilterProduto}
          placeholder="Produto de Dados"
        />
        <MultiSelect
          options={statusOptions}
          value={filterStatus}
          onChange={setFilterStatus}
          placeholder="Status"
        />
        {hasFilters && (
          <button
            onClick={clearFilters}
            style={{ padding: '7px 14px', borderRadius: '8px', border: '1.5px solid #E0E5EC', background: '#FFFFFF', color: '#738290', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}
          >
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
          <div
            ref={topScrollRef}
            onScroll={() => syncScroll(topScrollRef, tableWrapRef)}
            style={{ overflowX: 'auto', marginBottom: '4px' }}
          >
            <div style={{ height: '1px', minWidth: '2800px' }} />
          </div>

          <ProvisionamentoTable
            data={filtered}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onInlineUpdate={handleInlineUpdate}
            tableWrapRef={tableWrapRef}
            onTableScroll={() => syncScroll(tableWrapRef, topScrollRef)}
          />
        </>
      )}

      <ProvisionamentoModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingRow(null); fetchData() }}
        onSave={handleSave}
        initialData={editingRow}
      />
    </div>
  )
}