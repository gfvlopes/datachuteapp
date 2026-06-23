import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useReferenceData } from '../context/referencedatacontext'
import confirmdialog from './confirmdialog'

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

const READONLY_DIM_FIELDS = new Set(['tipologia', 'localizacao_fabric', 'descricao', 'owner', 'filtros', 'historico', 'update_info', 'frequencia', 'volumes'])

const COLUMNS = [
  { key: 'id_iniciativa',        label: 'ID Iniciativa',         width: '100px' },
  { key: 'nome_iniciativa',      label: 'Nome Iniciativa',       width: '180px' },
  { key: 'id_usecase_ai',        label: 'ID Use Case',           width: '100px' },
  { key: 'nome_use_case',        label: 'Nome Use Case',         width: '180px' },
  { key: 'id_produto_dados',     label: 'ID Produto de Dados',   width: '150px' },
  { key: 'nome_produto_dados',   label: 'Nome Produto de Dados', width: '260px' },
  { key: 'status',               label: 'Status',                width: '160px' },
  { key: 'tipologia',            label: 'Tipologia',             width: '120px' },
  { key: 'localizacao_fabric',   label: 'Localização Fabric',    width: '150px' },
  { key: 'descricao',            label: 'Descrição',             width: '180px' },
  { key: 'owner',                label: 'Domínio Owner',         width: '160px' },
  { key: 'dominio_requisitante', label: 'Domínio Requisitante',  width: '180px' },
  { key: 'filtros',              label: 'Filtros',               width: '120px' },
  { key: 'historico',            label: 'Histórico',             width: '110px' },
  { key: 'update_info',          label: 'Update',                width: '120px' },
  { key: 'frequencia',           label: 'Frequência',            width: '110px' },
  { key: 'volumes',              label: 'Volumes',               width: '120px' },
]

const cellInputStyle = {
  padding: '5px 8px', borderRadius: '6px', border: '1.5px solid #A1B5D8',
  fontSize: '12px', color: '#2C3A42', background: '#FFFFFF', outline: 'none',
  fontFamily: 'Inter, sans-serif', width: '100%', boxSizing: 'border-box',
}

export default function provisionamentotable(props) {
  const data = props.data || []
  const onEdit = props.onEdit || (() => {})
  const onDelete = props.onDelete || (() => {})
  const onInlineUpdate = props.onInlineUpdate || (() => {})
  const tableWrapRef = props.tableWrapRef
  const onTableScroll = props.onTableScroll

  const refData = useReferenceData() || {}
  const enumeracoes = refData.enumeracoes || {}
  const iniciativas = refData.iniciativas || []
  const dominios = refData.dominios || []

  const [editingCell, setEditingCell] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [statusConfirm, setStatusConfirm] = useState(null)

  const iniciativaOptions = Array.from(
    new Map(iniciativas.map(r => [String(r.id_iniciativa), r.nome_iniciativa])).entries()
  ).map(([id, nome]) => ({ id, nome }))

  const getUseCaseOptions = (idIniciativa) =>
    iniciativas.filter(r => String(r.id_iniciativa) === String(idIniciativa))
      .map(r => ({ id: String(r.id_use_case), nome: r.nome_use_case }))

  const selectOptions = {
    status: enumeracoes.status || [],
    dominio_requisitante: dominios,
  }

  const handleCellClick = (row, field) => {
    if (READONLY_DIM_FIELDS.has(field)) return
    setEditingCell({ id: row.id, field })
    setEditValue(row[field] || '')
  }

  const saveField = async (id, fieldOrObj, value) => {
    const payload = typeof fieldOrObj === 'object' ? fieldOrObj : { [fieldOrObj]: value }
    await supabase.from('data_products').update(payload).eq('id', id)
  }

  const handleCellSave = async (rowId, field, value) => {
    setEditingCell(null); setEditValue('')
    const clean = value && value.trim() === '' ? null : value && value.trim ? value.trim() : value

    if (field === 'status') {
      const row = data.find(r => r.id === rowId)
      if (clean && clean !== row?.status) {
        const siblingsRes = await supabase
          .from('data_products')
          .select('id,nome_produto_dados,nome_use_case')
          .eq('id_produto_dados', row.id_produto_dados)
        const siblings = siblingsRes.data || []
        const others = siblings.filter(s => s.id !== rowId)

        setStatusConfirm({
          rowId,
          newStatus: clean,
          dataProduct: row?.nome_produto_dados,
          idProdutoDados: row?.id_produto_dados,
          otherCount: others.length,
          otherIds: others.map(s => s.id),
        })
        return
      }
    }

    await saveField(rowId, field, clean)
    onInlineUpdate(rowId, field, clean)
  }

  const handleKeyDown = (e, rowId, field) => {
    if (e.key === 'Enter') handleCellSave(rowId, field, editValue)
    if (e.key === 'Escape') { setEditingCell(null); setEditValue('') }
  }

  const handleStatusConfirmYes = async () => {
    if (!statusConfirm) return
    const rowId = statusConfirm.rowId
    const newStatus = statusConfirm.newStatus
    const dataProduct = statusConfirm.dataProduct
    const otherIds = statusConfirm.otherIds || []
    const today = new Date().toISOString().split('T')[0]

    const allIds = [rowId].concat(otherIds)
    await supabase.from('data_products').update({ status: newStatus }).in('id', allIds)

    allIds.forEach(id => onInlineUpdate(id, 'status', newStatus))

    await supabase.from('registo_alteracoes').insert([{ data_product: dataProduct, status: newStatus, data_inicio: today }])

    setStatusConfirm(null)
  }

  const renderCell = (row, col) => {
    const isEditing = editingCell && editingCell.id === row.id && editingCell.field === col.key
    const val = row[col.key]

    if (READONLY_DIM_FIELDS.has(col.key)) {
      return val || <span style={{ color: '#C8D0DA', fontSize: '11px' }}>—</span>
    }

    if (isEditing) {
      if (col.key === 'id_iniciativa' || col.key === 'nome_iniciativa') {
        return (
          <select autoFocus style={cellInputStyle} value={row.id_iniciativa || ''}
            onChange={e => {
              const newVal = e.target.value
              const ucOpts = getUseCaseOptions(newVal)
              const nomeIniciativa = iniciativaOptions.find(o => o.id === newVal)?.nome || ''
              const payload = ucOpts.length === 1
                ? { id_iniciativa: newVal, nome_iniciativa: nomeIniciativa, id_usecase_ai: ucOpts[0].id, nome_use_case: ucOpts[0].nome, casos_uso_suportados: ucOpts[0].nome }
                : { id_iniciativa: newVal, nome_iniciativa: nomeIniciativa, id_usecase_ai: null, nome_use_case: null, casos_uso_suportados: null }
              saveField(row.id, payload)
              Object.keys(payload).forEach(k => onInlineUpdate(row.id, k, payload[k]))
              setEditingCell(null); setEditValue('')
            }}
            onBlur={() => { setEditingCell(null); setEditValue('') }}
          >
            <option value="">— selecionar —</option>
            {iniciativaOptions.map(o => <option key={o.id} value={o.id}>{o.id} — {o.nome}</option>)}
          </select>
        )
      }

      if (col.key === 'id_usecase_ai' || col.key === 'nome_use_case') {
        const ucOpts = getUseCaseOptions(row.id_iniciativa)
        return (
          <select autoFocus style={cellInputStyle} value={row.id_usecase_ai || ''}
            onChange={e => {
              const newVal = e.target.value
              const match = ucOpts.find(o => o.id === newVal)
              const payload = { id_usecase_ai: newVal, nome_use_case: match ? match.nome : null, casos_uso_suportados: match ? match.nome : null }
              saveField(row.id, payload)
              Object.keys(payload).forEach(k => onInlineUpdate(row.id, k, payload[k]))
              setEditingCell(null); setEditValue('')
            }}
            onBlur={() => { setEditingCell(null); setEditValue('') }}
            disabled={getUseCaseOptions(row.id_iniciativa).length === 0}
          >
            <option value="">— selecionar —</option>
            {ucOpts.map(o => <option key={o.id} value={o.id}>{o.id} — {o.nome}</option>)}
          </select>
        )
      }

      if (selectOptions[col.key]) {
        return (
          <select autoFocus style={cellInputStyle} value={editValue}
            onChange={e => handleCellSave(row.id, col.key, e.target.value)}
            onBlur={() => handleCellSave(row.id, col.key, editValue)}
          >
            <option value="">— selecionar —</option>
            {selectOptions[col.key].map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        )
      }

      return (
        <input
          autoFocus style={cellInputStyle} value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={() => handleCellSave(row.id, col.key, editValue)}
          onKeyDown={e => handleKeyDown(e, row.id, col.key)}
        />
      )
    }

    if (col.key === 'status') return <StatusBadge status={val} />
    return val || <span style={{ color: '#C8D0DA', fontSize: '11px' }}>—</span>
  }

  return (
    <>
      <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <div ref={tableWrapRef} onScroll={onTableScroll} style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: '#2C3A42', fontFamily: 'Inter, sans-serif' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ECEEF2' }}>
                {COLUMNS.map(col => (
                  <th key={col.key} style={{ padding: '11px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#738290', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap', minWidth: col.width, background: '#FFFFFF' }}>
                    {col.label}
                  </th>
                ))}
                <th style={{ padding: '11px 14px', width: '80px', background: '#FFFFFF' }} />
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr><td colSpan={COLUMNS.length + 1} style={{ padding: '48px 24px', textAlign: 'center', color: '#738290', fontSize: '13px' }}>
                  Nenhuma associação criada. Clica em <strong>+ Adicionar</strong> para começar.
                </td></tr>
              )}
              {data.map((row, idx) => (
                <tr key={row.id}
                  style={{ background: idx % 2 === 0 ? '#FFFFFF' : '#FAFBFC', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F3F6FB'}
                  onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#FFFFFF' : '#FAFBFC'}
                >
                  {COLUMNS.map(col => {
                    const isEditingThis = editingCell && editingCell.id === row.id && editingCell.field === col.key
                    return (
                      <td key={col.key} onClick={() => handleCellClick(row, col.key)}
                        style={{ padding: isEditingThis ? '6px 8px' : '10px 14px', maxWidth: col.width, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: isEditingThis ? 'normal' : 'nowrap', cursor: READONLY_DIM_FIELDS.has(col.key) ? 'default' : 'text', color: col.key === 'nome_produto_dados' ? '#2C3A42' : '#4A5568', fontWeight: col.key === 'nome_produto_dados' ? '500' : '400' }}>
                        {renderCell(row, col)}
                      </td>
                    )
                  })}
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button onClick={e => { e.stopPropagation(); onEdit(row) }} title="Editar"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#738290', padding: '4px', borderRadius: '6px', display: 'flex', transition: 'color 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#A1B5D8'}
                        onMouseLeave={e => e.currentTarget.style.color = '#738290'}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                      <button onClick={e => { e.stopPropagation(); setConfirmDeleteId(row.id) }} title="Eliminar"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#738290', padding: '4px', borderRadius: '6px', display: 'flex', transition: 'color 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#C0544C'}
                        onMouseLeave={e => e.currentTarget.style.color = '#738290'}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <confirmdialog isOpen={!!confirmDeleteId}
        message="Tens a certeza que queres eliminar esta associação? Esta ação não pode ser revertida."
        onConfirm={() => { onDelete(confirmDeleteId); setConfirmDeleteId(null) }}
        onCancel={() => setConfirmDeleteId(null)}
      />

      {statusConfirm && (() => {
        const badgeStyle = STATUS_COLORS[statusConfirm.newStatus] || { bg: 'rgba(115,130,144,0.12)', color: '#738290' }
        const otherCount = statusConfirm.otherCount || 0
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(44,58,66,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '28px 32px', width: '640px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#2C3A42', margin: '0 0 10px' }}>Alterar status do Produto de Dados?</p>
              <p style={{ fontSize: '13px', color: '#738290', margin: '0 0 6px', lineHeight: '1.6' }}>
                O status de <strong style={{ color: '#2C3A42' }}>{statusConfirm.dataProduct}</strong> vai passar para{' '}
                <span style={{ background: badgeStyle.bg, color: badgeStyle.color, borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: '600' }}>{statusConfirm.newStatus}</span>
              </p>

              {otherCount > 0 ? (
                <div style={{ background: '#F7F9FC', border: '1.5px solid #E0E5EC', borderRadius: '8px', padding: '12px 14px', margin: '12px 0 20px' }}>
                  <p style={{ fontSize: '13px', color: '#2C3A42', margin: 0, lineHeight: '1.6' }}>
                    Este Produto de Dados está associado a mais <strong>{otherCount} Use Case{otherCount !== 1 ? 's' : ''}</strong>.
                    Esta alteração irá atualizar o status em <strong>todas as {otherCount + 1} associações</strong>. Será criado um único registo no Registo de Alterações, orientado ao Produto de Dados.
                  </p>
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: '#738290', margin: '0 0 24px' }}>
                  Esta alteração será registada no Registo de Alterações.
                </p>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => setStatusConfirm(null)} style={{ padding: '8px 18px', borderRadius: '8px', border: '1.5px solid #E0E5EC', background: '#FFFFFF', color: '#738290', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Cancelar</button>
                <button onClick={handleStatusConfirmYes} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#5C8F6A', color: '#FFFFFF', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
                  Confirmar Alteração
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </>
  )
}