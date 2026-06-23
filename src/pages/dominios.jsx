import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import MultiSelect from '../components/MultiSelect'

const COLUMNS = [
  { key: 'dominio',        label: 'Domínio',          width: '200px' },
  { key: 'subdominio',     label: 'Sub-Domínio',       width: '200px' },
  { key: 'descricao',      label: 'Descrição',         width: '260px' },
  { key: 'exemplos',       label: 'Exemplos',          width: '220px' },
  { key: 'tm_forum_map',   label: 'TM Forum Map',      width: '140px' },
  { key: 'tmforum_map',    label: 'TMForum (DS)',      width: '140px' },
  { key: 'area_ownership', label: 'Área Ownership',    width: '200px' },
  { key: 'business_owner', label: 'Business Owner',    width: '160px' },
  { key: 'data_steward',   label: 'Data Steward',      width: '160px' },
  { key: 'data_owner',     label: 'Data Owner',        width: '160px' },
]

export default function Dominios() {
  const [data, setData] = useState([])  
  const [loading, setLoading] = useState(true)
  const [filterDominio, setFilterDominio] = useState([])
  const [filterSubdominio, setFilterSubdominio] = useState([])
  const [filterBusinessOwner, setFilterBusinessOwner] = useState([])
  const [filterDataSteward, setFilterDataSteward] = useState([])
  const [filterDataOwner, setFilterDataOwner] = useState([])
  const topScrollRef = useRef(null)
  const tableWrapRef = useRef(null)

  useEffect(() => {
    supabase.from('d_dominio_do').select('*').order('dominio').order('subdominio').then(({ data: rows, error }) => {
      if (!error) setData(rows || [])
      setLoading(false)
    })
  }, [])

  const dominioOptions = [...new Set(data.map(r => r.dominio).filter(Boolean))].sort()
  const subdominioOptions = [...new Set(data.filter(r => !filterDominio.length || filterDominio.includes(r.dominio)).map(r => r.subdominio).filter(Boolean))].sort()
  const businessOwnerOptions = [...new Set(data.filter(r => !filterDominio.length || filterDominio.includes(r.dominio)).filter(r => !filterSubdominio.length || filterSubdominio.includes(r.subdominio)).map(r => r.business_owner).filter(Boolean))].sort()
  const dataStewardOptions = [...new Set(data.filter(r => !filterDominio.length || filterDominio.includes(r.dominio)).filter(r => !filterSubdominio.length || filterSubdominio.includes(r.subdominio)).map(r => r.data_steward).filter(Boolean))].sort()
  const dataOwnerOptions = [...new Set(data.filter(r => !filterDominio.length || filterDominio.includes(r.dominio)).filter(r => !filterSubdominio.length || filterSubdominio.includes(r.subdominio)).map(r => r.data_owner).filter(Boolean))].sort()

  const filtered = data.filter(r => {
    if (filterDominio.length && !filterDominio.includes(r.dominio)) return false
    if (filterSubdominio.length && !filterSubdominio.includes(r.subdominio)) return false
    if (filterBusinessOwner.length && !filterBusinessOwner.includes(r.business_owner)) return false
    if (filterDataSteward.length && !filterDataSteward.includes(r.data_steward)) return false
    if (filterDataOwner.length && !filterDataOwner.includes(r.data_owner)) return false
    return true
  })

  const hasFilters = !!(filterDominio.length || filterSubdominio.length || filterBusinessOwner.length || filterDataSteward.length || filterDataOwner.length)
  const clearFilters = () => { setFilterDominio([]); setFilterSubdominio([]); setFilterBusinessOwner([]); setFilterDataSteward([]); setFilterDataOwner([]) }
  const syncScroll = (src, tgt) => { if (tgt.current) tgt.current.scrollLeft = src.current.scrollLeft }

  return (
    <div style={{ padding: '32px 36px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#2C3A42', margin: 0 }}>Catálogo — Domínios</h1>
        <p style={{ fontSize: '13px', color: '#738290', margin: '4px 0 0' }}>Mapa de domínios e sub-domínios de informação</p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <MultiSelect options={dominioOptions} value={filterDominio} onChange={v => { setFilterDominio(v); setFilterSubdominio([]); setFilterBusinessOwner([]); setFilterDataSteward([]); setFilterDataOwner([]) }} placeholder="Domínio" />
        <MultiSelect options={subdominioOptions} value={filterSubdominio} onChange={v => { setFilterSubdominio(v); setFilterBusinessOwner([]); setFilterDataSteward([]); setFilterDataOwner([]) }} placeholder="Sub-Domínio" />
        <MultiSelect options={businessOwnerOptions} value={filterBusinessOwner} onChange={setFilterBusinessOwner} placeholder="Business Owner" />
        <MultiSelect options={dataStewardOptions} value={filterDataSteward} onChange={setFilterDataSteward} placeholder="Data Steward" />
        <MultiSelect options={dataOwnerOptions} value={filterDataOwner} onChange={setFilterDataOwner} placeholder="Data Owner" />
        {hasFilters && (
          <button onClick={clearFilters} style={{ padding: '7px 14px', borderRadius: '8px', border: '1.5px solid #E0E5EC', background: '#FFFFFF', color: '#738290', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
            Limpar filtros
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '48px', textAlign: 'center', color: '#738290', fontSize: '13px' }}>A carregar dados...</div>
      ) : (
        <>
          <div ref={topScrollRef} onScroll={() => syncScroll(topScrollRef, tableWrapRef)} style={{ overflowX: 'auto', marginBottom: '4px' }}>
            <div style={{ height: '1px', minWidth: '2000px' }} />
          </div>
          <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <div ref={tableWrapRef} onScroll={() => syncScroll(tableWrapRef, topScrollRef)} style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: '#2C3A42', fontFamily: 'Inter, sans-serif' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #ECEEF2' }}>
                    {COLUMNS.map(col => (
                      <th key={col.key} style={{ padding: '11px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#738290', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap', minWidth: col.width, background: '#FFFFFF' }}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={COLUMNS.length} style={{ padding: '48px 24px', textAlign: 'center', color: '#738290', fontSize: '13px' }}>Nenhum registo encontrado.</td></tr>
                  )}
                  {filtered.map((row, idx) => (
                    <tr key={row.id}
                      style={{ background: idx % 2 === 0 ? '#FFFFFF' : '#FAFBFC', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F3F6FB'}
                      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#FFFFFF' : '#FAFBFC'}
                    >
                      {COLUMNS.map(col => (
                        <td key={col.key} style={{ padding: '10px 14px', maxWidth: col.width, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: ['dominio', 'subdominio'].includes(col.key) ? '#2C3A42' : '#4A5568', fontWeight: ['dominio', 'subdominio'].includes(col.key) ? '500' : '400' }}>
                          {row[col.key] || <span style={{ color: '#C8D0DA' }}>—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}