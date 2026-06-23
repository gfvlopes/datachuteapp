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
  { key: 'expand',          label: '',                width: '36px'  },
  { key: 'dominio_owner',   label: 'Domínio Owner',   width: '200px' },
  { key: 'id_iniciativa',   label: 'ID Iniciativa',   width: '100px' },
  { key: 'nome_iniciativa', label: 'Nome Iniciativa', width: '280px' },
  { key: 'ucs_entregues',   label: 'UCs Entregues',   width: '130px' },
  { key: 'ini_status',      label: 'Status',          width: '200px' },
]

export default function Iniciativas() {
  const { iniciativas } = useReferenceData()
  const [dataProducts, setDataProducts] = useState([])
  const [expanded, setExpanded] = useState(new Set())
  const [filterDominio, setFilterDominio] = useState([])
  const [filterIniciativa, setFilterIniciativa] = useState([])
  const [filterUcStatus, setFilterUcStatus] = useState([])

  useEffect(() => {
    supabase.from('data_products').select('id_usecase_ai,status,nome_produto_dados').then(({ data }) => {
      if (data) setDataProducts(data)
    })
  }, [])

  const enrichedUCs = iniciativas.map(r => {
    const assocProducts = dataProducts.filter(dp => String(dp.id_usecase_ai) === String(r.id_use_case))
    const statuses = assocProducts.map(dp => dp.status)
    const uc_status = computeUseCaseStatus(statuses)
    const qtd_produtos = assocProducts.length
    return { ...r, uc_status, qtd_produtos }
  })

  const iniciativaMap = new Map()
  enrichedUCs.forEach(uc => {
    const key = String(uc.id_iniciativa)
    if (!iniciativaMap.has(key)) {
      iniciativaMap.set(key, {
        id_iniciativa: uc.id_iniciativa,
        nome_iniciativa: uc.nome_iniciativa,
        dominio_owner: uc.dominio_owner,
        ucs: [],
      })
    }
    iniciativaMap.get(key).ucs.push(uc)
  })

  const iniciativaRows = Array.from(iniciativaMap.values()).map(ini => {
    const ucStatuses = ini.ucs.map(uc => uc.uc_status)
    const entregues = ini.ucs.filter(uc => uc.uc_status === 'Entregue').length
    const allEntregues = entregues === ini.ucs.length
    return {
      ...ini,
      ucs_entregues: `${entregues}/${ini.ucs.length}`,
      allEntregues,
      ini_status: computeIniciativaStatus(ucStatuses),
    }
  })

  const dominioOptions = [...new Set(iniciativaRows.map(r => r.dominio_owner).filter(Boolean))].sort()
  const baseFiltered = iniciativaRows.filter(r => !filterDominio.length || filterDominio.includes(r.dominio_owner))
  const iniciativaOptions = baseFiltered.map(r => `${r.id_iniciativa} — ${r.nome_iniciativa}`)

  const UC_STATUS_ORDER = ['Sem produto de dados', 'Aguarda submissão pela BS', 'Por iniciar', 'Em curso', 'Com bloqueios', 'Entregue']
  const ucStatusOptions = [...new Set(iniciativaRows.map(r => r.ini_status))].sort(
    (a, b) => UC_STATUS_ORDER.indexOf(a) - UC_STATUS_ORDER.indexOf(b)
  )

  const filtered = iniciativaRows.filter(r => {
    if (filterDominio.length && !filterDominio.includes(r.dominio_owner)) return false
    if (filterIniciativa.length) {
      const ids = filterIniciativa.map(s => s.split(' — ')[0])
      if (!ids.includes(String(r.id_iniciativa))) return false
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

  const hasFilters = !!(filterDominio.length || filterIniciativa.length || filterUcStatus.length)
  const clearFilters = () => { setFilterDominio([]); setFilterIniciativa([]); setFilterUcStatus([]) }

  return (
    <div style={{ padding: '32px 36px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#2C3A42', margin: 0 }}>Catálogo — Iniciativas</h1>
        <p style={{ fontSize: '13px', color: '#738290', margin: '4px 0 0' }}>
          Mapa de iniciativas. Clica numa linha para ver os use cases associados.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <MultiSelect options={dominioOptions} value={filterDominio} onChange={v => { setFilterDominio(v); setFilterIniciativa([]) }} placeholder="Domínio Owner" />
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
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: '#2C3A42', fontFamily: 'Inter, sans-serif' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ECEEF2' }}>
                {INICIATIVA_COLUMNS.map(col => (
                  <th key={col.key} style={{
                    padding: col.key === 'expand' ? '11px 0 11px 14px' : '11px 14px',
                    textAlign: 'left', fontSize: '11px', fontWeight: '500',
                    color: '#738290', textTransform: 'uppercase', letterSpacing: '0.08em',
                    whiteSpace: 'nowrap', minWidth: col.width, background: '#FFFFFF',
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
              {filtered.map((ini, idx) => {
                const isExpanded = expanded.has(String(ini.id_iniciativa))
                const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#FAFBFC'
                return (
                  <React.Fragment key={ini.id_iniciativa}>
                    {/* Linha iniciativa */}
                    <tr
                      onClick={() => toggleExpand(String(ini.id_iniciativa))}
                      style={{ background: isExpanded ? '#EBF1FA' : rowBg, cursor: 'pointer', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F3F6FB'}
                      onMouseLeave={e => e.currentTarget.style.background = isExpanded ? '#EBF1FA' : rowBg}
                    >
                      {INICIATIVA_COLUMNS.map(col => (
                        <td key={col.key} style={{
                          padding: col.key === 'expand' ? '10px 0 10px 14px' : '10px 14px',
                          maxWidth: col.width, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          color: ['nome_iniciativa', 'dominio_owner'].includes(col.key) ? '#2C3A42' : '#4A5568',
                          fontWeight: col.key === 'nome_iniciativa' ? '500' : '400',
                        }}>
                          {col.key === 'expand' ? (
                            <span style={{ color: '#A1B5D8', display: 'flex', alignItems: 'center' }}>
                              <ChevronIcon expanded={isExpanded} />
                            </span>
                          ) : col.key === 'ini_status' ? (
                            <StatusBadge status={ini.ini_status} />
                          ) : col.key === 'ucs_entregues' ? (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              background: ini.allEntregues ? 'rgba(92,143,106,0.15)' : '#EBF1FA',
                              color: ini.allEntregues ? '#2A6040' : '#5A7BA8',
                              borderRadius: '20px', padding: '2px 10px',
                              fontSize: '11px', fontWeight: '600',
                            }}>
                              {ini.ucs_entregues}
                            </span>
                          ) : (
                            ini[col.key] || <span style={{ color: '#C8D0DA' }}>—</span>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Drilldown UC — cada UC é uma tr própria, sem afectar larguras do grupo */}
                    {isExpanded && ini.ucs.map((uc, ucIdx) => (
                      <tr key={`uc-${uc.id_use_case}`} style={{ background: ucIdx % 2 === 0 ? '#F7FAFD' : '#F0F5FB' }}>
                        <td colSpan={INICIATIVA_COLUMNS.length} style={{ padding: '0', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '86px', paddingTop: '7px', paddingBottom: '7px', gap: '32px' }}>
                            <span style={{ color: '#738290', fontSize: '11px', whiteSpace: 'nowrap', width: '90px', flexShrink: 0 }}>
                              {uc.id_use_case}
                            </span>
                            <span style={{ color: '#2C3A42', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '320px', flexShrink: 0 }}>
                              {uc.nome_use_case}
                            </span>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center',
                              background: '#EBF1FA', color: '#5A7BA8',
                              borderRadius: '20px', padding: '2px 10px',
                              fontSize: '11px', fontWeight: '600',
                              whiteSpace: 'nowrap', flexShrink: 0,
                            }}>
                              {uc.qtd_produtos} {uc.qtd_produtos === 1 ? 'produto de dados' : 'produtos de dados'}
                            </span>
                            <span style={{ flexShrink: 0 }}>
                              <StatusBadge status={uc.uc_status} />
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}

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
      </div>
    </div>
  )
}