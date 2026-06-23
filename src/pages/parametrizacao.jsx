import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import * as XLSX from 'xlsx'

const SHEETS_CONFIG = [
  {
    sheetName: '1. Mapa de Domínios e DO',
    table: 'd_dominio_do',
    label: 'Domínios (d_dominio_do)',
    headerRow: 4, // 0-indexed row where headers are
    columns: [
      { excel: 'Domínio',             db: 'dominio' },
      { excel: 'TM Forum - Map',      db: 'tm_forum_map' },
      { excel: 'Descrição',           db: 'descricao' },
      { excel: 'Área com Ownership',  db: 'area_ownership' },
      { excel: 'Data Owner',          db: 'business_owner' },
      { excel: 'Observações',         db: 'observacoes' },
    ],
  },
  {
    sheetName: '2. Mapa de Sub-Dominios e DS',
    table: 'd_dominio_do',
    label: 'Sub-Domínios → d_dominio_do',
    headerRow: 4,
    columns: [
      { excel: 'Domínio',        db: 'dominio' },
      { excel: 'Sub-Domínio',    db: 'subdominio' },
      { excel: 'Descrição',      db: 'descricao' },
      { excel: 'Exemplos',       db: 'exemplos' },
      { excel: 'Data Steward',   db: 'data_steward' },
      { excel: 'Observações',    db: 'observacoes' },
      { excel: 'TMForum - Map',  db: 'tmforum_map' },
    ],
  },
]

const IGNORED_SHEETS = ['3. Mapa de Sistemas e DC', '4. Mapa de Iniciativas']

function StatusBadge({ type, message }) {
  const styles = {
    success: { bg: 'rgba(92,143,106,0.12)', color: '#2A6040' },
    error:   { bg: 'rgba(192,84,76,0.12)',  color: '#C0544C' },
    info:    { bg: 'rgba(161,181,216,0.18)', color: '#5A7BA8' },
  }
  const s = styles[type] || styles.info
  return (
    <span style={{
      background: s.bg, color: s.color,
      borderRadius: '20px', padding: '3px 12px',
      fontSize: '12px', fontWeight: '500',
    }}>
      {message}
    </span>
  )
}

export default function Parametrizacao() {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([]) // [{ label, status, count, error }]
  const [fileName, setFileName] = useState(null)

  const processFile = async (file) => {
    if (!file) return
    setFileName(file.name)
    setLoading(true)
    setResults([])

    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array' })

      const newResults = []

      for (const config of SHEETS_CONFIG) {
        const ws = wb.Sheets[config.sheetName]
        if (!ws) {
          newResults.push({ label: config.label, status: 'error', error: `Sheet "${config.sheetName}" não encontrada no ficheiro.` })
          continue
        }

        // Convert sheet to array of arrays to find header row
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })

        // Find the header row by looking for the first column name
        const firstCol = config.columns[0].excel
        let headerRowIdx = -1
        for (let i = 0; i < raw.length; i++) {
          if (raw[i] && raw[i].includes(firstCol)) {
            headerRowIdx = i
            break
          }
        }

        if (headerRowIdx === -1) {
          newResults.push({ label: config.label, status: 'error', error: `Cabeçalhos não encontrados na sheet "${config.sheetName}".` })
          continue
        }

        const headers = raw[headerRowIdx]
        const dataRows = raw.slice(headerRowIdx + 1).filter(row =>
          row && row.some(cell => cell !== null && cell !== '')
        )

        // Map rows to DB objects
        const records = dataRows.map(row => {
          const obj = {}
          config.columns.forEach(({ excel, db }) => {
            const colIdx = headers.indexOf(excel)
            obj[db] = colIdx >= 0 && row[colIdx] !== null && row[colIdx] !== undefined
              ? String(row[colIdx]).trim()
              : null
          })
          return obj
        }).filter(obj => Object.values(obj).some(v => v !== null && v !== ''))

        // DROP apenas na primeira sheet que usa esta tabela
        const alreadyCleared = newResults.some(r => r.table === config.table)
        if (!alreadyCleared) {
          const { error: delError } = await supabase.from(config.table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
          if (delError) {
            newResults.push({ label: config.label, status: 'error', error: delError.message })
            continue
          }
        }

        if (records.length > 0) {
          const { error: insError } = await supabase.from(config.table).insert(records)
          if (insError) {
            newResults.push({ label: config.label, status: 'error', error: insError.message })
            continue
          }
        }

        newResults.push({ label: config.label, status: 'success', count: records.length, table: config.table })
      }

      setResults(newResults)
    } catch (err) {
      setResults([{ label: 'Erro geral', status: 'error', error: err.message }])
    }

    setLoading(false)
  }

  const handleFileInput = (e) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  return (
    <div style={{ padding: '32px 36px', fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#2C3A42', margin: 0 }}>
          Parametrização
        </h1>
        <p style={{ fontSize: '13px', color: '#738290', margin: '4px 0 0' }}>
          Importa o ficheiro Excel para atualizar as tabelas de referência. A importação substitui toda a informação existente.
        </p>
      </div>

      {/* Info das sheets */}
      <div style={{
        background: '#FFFFFF', borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        padding: '20px 24px', marginBottom: '24px',
      }}>
        <p style={{ fontSize: '11px', fontWeight: '600', color: '#738290', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px' }}>
          Sheets importadas
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {SHEETS_CONFIG.map(c => (
            <div key={c.table} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5C8F6A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span style={{ fontSize: '13px', color: '#2C3A42' }}>{c.sheetName}</span>
              <span style={{ fontSize: '12px', color: '#738290' }}>→ {c.table}</span>
            </div>
          ))}
          {IGNORED_SHEETS.map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C0C8D0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span style={{ fontSize: '13px', color: '#B0BCC8' }}>{s} (ignorada)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          background: dragging ? '#EBF1FA' : '#FFFFFF',
          border: `2px dashed ${dragging ? '#A1B5D8' : '#E0E5EC'}`,
          borderRadius: '12px',
          padding: '48px 32px',
          textAlign: 'center',
          transition: 'all 0.15s',
          cursor: 'pointer',
          marginBottom: '24px',
        }}
        onClick={() => document.getElementById('file-input').click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".xlsx,.xls"
          style={{ display: 'none' }}
          onChange={handleFileInput}
        />
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#A1B5D8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '12px' }}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <p style={{ fontSize: '14px', fontWeight: '600', color: '#2C3A42', margin: '0 0 4px' }}>
          {loading ? 'A processar...' : 'Arrasta o ficheiro ou clica para selecionar'}
        </p>
        <p style={{ fontSize: '12px', color: '#738290', margin: 0 }}>
          Ficheiros .xlsx suportados
        </p>
        {fileName && !loading && (
          <p style={{ fontSize: '12px', color: '#A1B5D8', margin: '8px 0 0', fontWeight: '500' }}>
            {fileName}
          </p>
        )}
      </div>

      {/* Resultados */}
      {results.length > 0 && (
        <div style={{
          background: '#FFFFFF', borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          padding: '20px 24px',
        }}>
          <p style={{ fontSize: '11px', fontWeight: '600', color: '#738290', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px' }}>
            Resultado da importação
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {results.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '13px', color: '#2C3A42', minWidth: '220px' }}>{r.label}</span>
                {r.status === 'success'
                  ? <StatusBadge type="success" message={`✓ ${r.count} registos importados`} />
                  : <StatusBadge type="error" message={`✗ ${r.error}`} />
                }
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}