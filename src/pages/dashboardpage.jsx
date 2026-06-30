import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ─── Constantes de status ──────────────────────────────────────────────────
const DELIVERED_STATUSES = ['Entregue', 'Entrega parcial']
const BLOCKED_STATUSES   = ['Bloqueado (DSG)', 'Bloqueado (DIT)', 'Bloqueado (BS)']

const PRODUTO_FASES = [
  'A aguardar submissão pela BS', 'Por iniciar (DSG)', 'Levantamento de requisitos (DSG)',
  'Ingestão (DIT)', 'Desenvolvimento (DSG)', 'Validação dos Dados (BO)',
  'Entrega parcial', 'Entregue',
]
const PRODUTO_FASE_COR = {
  'A aguardar submissão pela BS':     '#A1AAB5',
  'Por iniciar (DSG)':                '#9CA8C4',
  'Levantamento de requisitos (DSG)': '#7E94C0',
  'Ingestão (DIT)':                   '#C9974A',
  'Desenvolvimento (DSG)':            '#5A7BA8',
  'Validação dos Dados (BO)':         '#6FA37E',
  'Entrega parcial':                  '#4A8A6A',
  'Entregue':                         '#2A6040',
}

const ATRIBUTO_FASES = [
  'Mapeamento Sistema Fonte UN', 'Mapeamento Sistema Fonte DIT',
  'Pendente Ingestão em Fabric DIT', 'Disponível',
]
const ATRIBUTO_FASE_COR = {
  'Mapeamento Sistema Fonte UN':     '#C0544C',
  'Mapeamento Sistema Fonte DIT':    '#9A6E20',
  'Pendente Ingestão em Fabric DIT': '#5A7BA8',
  'Disponível':                      '#2A6040',
}

// ─── Cálculo de status agregado (mesma regra da página Iniciativas) ─────────
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

const fmtData = (d) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('pt-PT') } catch { return d } }
const diasEntre = (a, b) => { if (!a || !b) return null; const ms = new Date(b) - new Date(a); return Math.round(ms / 86400000) }

// ─── Componentes visuais ────────────────────────────────────────────────────
function BigNumber({ valor, label, sub, subPct, accent }) {
  return (
    <div style={{ background: '#FFFFFF', borderRadius: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '20px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '128px' }}>
      <span style={{ fontSize: '10px', fontWeight: '700', color: '#A1AAB5', textTransform: 'uppercase', letterSpacing: '0.09em' }}>{label}</span>
      <div style={{ fontSize: '32px', fontWeight: '700', color: '#2C3A42', lineHeight: 1, margin: '10px 0 12px' }}>{valor}</div>
      {sub !== undefined ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={{ fontSize: '11px', color: '#738290' }}>{sub}</span>
            <span style={{ fontSize: '11px', fontWeight: '700', color: accent }}>{subPct}%</span>
          </div>
          <div style={{ height: '5px', background: '#F0F2F5', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${subPct}%`, height: '100%', background: accent, borderRadius: '3px', transition: 'width 0.5s ease' }} />
          </div>
        </div>
      ) : <div style={{ height: '5px' }} />}
    </div>
  )
}

function Card({ title, subtitle, children, span = 1 }) {
  return (
    <div style={{ gridColumn: `span ${span}`, background: '#FFFFFF', borderRadius: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '22px 24px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '18px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#2C3A42', margin: 0 }}>{title}</h3>
        {subtitle && <p style={{ fontSize: '11px', color: '#A1AAB5', margin: '3px 0 0' }}>{subtitle}</p>}
      </div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}

// Barras horizontais individuais (label por cima, valor à direita, cor por item)
function Barras({ dados, vazio = 'Sem dados', esconderZeros = false }) {
  const visiveis = esconderZeros ? dados.filter(d => d.valor > 0) : dados
  const max = Math.max(1, ...visiveis.map(d => d.valor))
  if (visiveis.length === 0 || visiveis.every(d => d.valor === 0)) return <Empty msg={vazio} />
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
      {visiveis.map(d => (
        <div key={d.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
            <span style={{ fontSize: '11.5px', color: '#4A5568', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '82%' }}>{d.label}</span>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#2C3A42', flexShrink: 0 }}>{d.valor}</span>
          </div>
          <div style={{ height: '8px', background: '#F4F6F9', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${(d.valor / max) * 100}%`, height: '100%', background: d.cor || '#5A7BA8', borderRadius: '4px', transition: 'width 0.5s ease' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function Empty({ msg }) {
  return <div style={{ padding: '28px 0', textAlign: 'center', color: '#C8D0DA', fontSize: '12px' }}>{msg}</div>
}

// ─── Página ──────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [loading, setLoading]   = useState(true)
  const [dominios, setDominios] = useState([])
  const [iniciativas, setIniciativas] = useState([])
  const [useCases, setUseCases] = useState([])
  const [produtos, setProdutos] = useState([])
  const [puc, setPuc]           = useState([])
  const [catalogo, setCatalogo] = useState([])
  const [registos, setRegistos] = useState([])

  useEffect(() => { fetchTudo() }, [])

  const fetchTudo = async () => {
    setLoading(true)
    const [d, i, u, p, pu, c, r] = await Promise.all([
      supabase.from('d_dominios').select('id, nome'),
      supabase.from('d_iniciativas').select('id, id_iniciativa, nome_iniciativa, dominio_id'),
      supabase.from('d_use_cases').select('id, id_use_case, nome_use_case, iniciativa_id'),
      supabase.from('d_produtos_dados').select('id, id_produto_dados, nome_produto_dados, status, dominio_id'),
      supabase.from('produto_use_case').select('produto_dados_id, use_case_id'),
      supabase.from('d_catalogo_atributos').select('id, status'),
      supabase.from('registo_alteracoes').select('produto_id, status, data_inicio, data_conclusao'),
    ])
    setDominios(d.data || [])
    setIniciativas(i.data || [])
    setUseCases(u.data || [])
    setProdutos(p.data || [])
    setPuc(pu.data || [])
    setCatalogo(c.data || [])
    setRegistos(r.data || [])
    setLoading(false)
  }

  // ── Mapas auxiliares ──
  const produtoById = Object.fromEntries(produtos.map(p => [p.id, p]))
  const statusPorUseCase = {} // use_case_id → [statuses dos produtos]
  puc.forEach(link => {
    const prod = produtoById[link.produto_dados_id]
    if (!prod) return
    ;(statusPorUseCase[link.use_case_id] ||= []).push(prod.status)
  })

  // ── Use cases com status agregado ──
  const ucComStatus = useCases.map(uc => ({
    ...uc,
    uc_status: computeUseCaseStatus(statusPorUseCase[uc.id] || []),
  }))
  const ucStatusById = Object.fromEntries(ucComStatus.map(uc => [uc.id, uc.uc_status]))

  // ── Iniciativas com status agregado ──
  const iniComStatus = iniciativas.map(ini => {
    const ucs = ucComStatus.filter(uc => uc.iniciativa_id === ini.id)
    return { ...ini, ini_status: computeIniciativaStatus(ucs.map(uc => uc.uc_status)), n_ucs: ucs.length }
  })

  // ── Big numbers ──
  const totalIniciativas = iniciativas.length
  const iniEntregues    = iniComStatus.filter(i => i.ini_status === 'Entregue').length
  const totalUseCases   = useCases.length
  const ucEntregues     = ucComStatus.filter(uc => uc.uc_status === 'Entregue').length
  const totalProdutos   = produtos.length
  const prodDisponiveis = produtos.filter(p => DELIVERED_STATUSES.includes(p.status)).length
  const totalAtributos  = catalogo.length
  const atrDisponiveis  = catalogo.filter(a => a.status === 'Disponível').length

  const pct = (n, t) => t > 0 ? Math.round((n / t) * 100) : 0

  // ── Visual 1: Iniciativas por domínio ──
  const iniPorDominio = dominios.map(d => ({
    label: d.nome,
    cor: '#5A7BA8',
    valor: iniciativas.filter(i => i.dominio_id === d.id).length,
  })).filter(x => x.valor > 0).sort((a, b) => b.valor - a.valor)

  // ── Visual: Status das iniciativas ──
  const INI_STATUS_ORDER = ['Sem produto de dados', 'Aguarda submissão pela BS', 'Por iniciar', 'Em curso', 'Com bloqueios', 'Entregue']
  const INI_STATUS_COR = { 'Sem produto de dados': '#C8D0DA', 'Aguarda submissão pela BS': '#A1AAB5', 'Por iniciar': '#9CA8C4', 'Em curso': '#5A7BA8', 'Com bloqueios': '#C0544C', 'Entregue': '#2A6040' }
  const iniPorStatus = INI_STATUS_ORDER.map(s => ({ label: s, cor: INI_STATUS_COR[s], valor: iniComStatus.filter(i => i.ini_status === s).length }))

  // ── Visual 2: Status dos use cases ──
  const UC_STATUS_ORDER = ['Sem produto de dados', 'Aguarda submissão pela BS', 'Por iniciar', 'Em curso', 'Com bloqueios', 'Entregue']
  const ucPorStatus = UC_STATUS_ORDER.map(s => ({ label: s, cor: INI_STATUS_COR[s], valor: ucComStatus.filter(uc => uc.uc_status === s).length }))

  // ── Visual 3: Produtos por fase ──
  const prodPorFase = PRODUTO_FASES.map(f => ({ label: f, cor: PRODUTO_FASE_COR[f], valor: produtos.filter(p => p.status === f).length }))
  const prodBloqueados = produtos.filter(p => BLOCKED_STATUSES.includes(p.status))

  // ── Lead times (média de dias por fase, a partir do registo_alteracoes) ──
  const leadPorFase = PRODUTO_FASES.map(fase => {
    const durs = registos
      .filter(r => r.status === fase && r.data_inicio && r.data_conclusao)
      .map(r => diasEntre(r.data_inicio, r.data_conclusao))
      .filter(n => n !== null && n >= 0)
    const media = durs.length ? Math.round(durs.reduce((s, n) => s + n, 0) / durs.length) : null
    return { label: fase, cor: PRODUTO_FASE_COR[fase], dias: media, n: durs.length }
  }).filter(x => x.dias !== null)

  // ── Visual 4: Atributos por fase ──
  const atrPorFase = ATRIBUTO_FASES.map(f => ({ label: f, cor: ATRIBUTO_FASE_COR[f], valor: catalogo.filter(a => a.status === f).length }))

  if (loading) {
    return (
      <div style={{ padding: '32px 36px', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ background: '#FFFFFF', borderRadius: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '64px', textAlign: 'center', color: '#738290', fontSize: '13px' }}>A carregar o dashboard…</div>
      </div>
    )
  }

  const maxLead = Math.max(1, ...leadPorFase.map(l => l.dias))

  return (
    <div style={{ padding: '32px 36px', fontFamily: 'Inter, sans-serif', maxWidth: '1400px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#2C3A42', margin: 0 }}>Dashboard</h1>
        <p style={{ fontSize: '13px', color: '#738290', margin: '4px 0 0' }}>Visão global do progresso de iniciativas, use cases, produtos de dados e atributos.</p>
      </div>

      {/* ─── Big numbers (5 simétricos) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '14px' }}>
        <BigNumber valor={totalIniciativas} label="Iniciativas" sub={`${iniEntregues}/${totalIniciativas} entregues`} subPct={pct(iniEntregues, totalIniciativas)} accent="#2A6040" />
        <BigNumber valor={totalUseCases} label="Use Cases" sub={`${ucEntregues}/${totalUseCases} entregues`} subPct={pct(ucEntregues, totalUseCases)} accent="#2A6040" />
        <BigNumber valor={totalProdutos} label="Produtos de Dados" sub={`${prodDisponiveis}/${totalProdutos} disponíveis`} subPct={pct(prodDisponiveis, totalProdutos)} accent="#5C8F6A" />
        <BigNumber valor={totalAtributos} label="Atributos" sub={`${atrDisponiveis}/${totalAtributos} disponíveis`} subPct={pct(atrDisponiveis, totalAtributos)} accent="#5C8F6A" />
      </div>

      {/* ─── Secção: Domínio e Iniciativa ─── */}
      <SectionTitle>Domínio e Iniciativa</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
        <Card title="Iniciativas por domínio" subtitle="Distribuição das iniciativas pelos domínios de negócio">
          <Barras dados={iniPorDominio} corFn={() => '#5A7BA8'} vazio="Sem iniciativas" />
        </Card>
        <Card title="Estado das iniciativas" subtitle="Status agregado a partir dos use cases">
          <Barras dados={iniPorStatus} vazio="Sem iniciativas" />
        </Card>
      </div>

      {/* ─── Secção: Use Case ─── */}
      <SectionTitle>Use Case</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px', marginBottom: '14px' }}>
        <Card title="Estado dos use cases" subtitle="Status agregado a partir dos produtos de dados associados">
          <Barras dados={ucPorStatus} vazio="Sem use cases" />
        </Card>
      </div>

      {/* ─── Secção: Produto de Dados ─── */}
      <SectionTitle>Produto de Dados</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
        <Card title="Distribuição por fase" subtitle="Produtos de dados em cada estado do provisionamento">
          <Barras dados={prodPorFase} vazio="Sem produtos" />
        </Card>
        <Card title="Lead time médio por fase" subtitle="Dias médios que um produto permanece em cada fase">
          {leadPorFase.length === 0 ? <Empty msg="Ainda sem fases concluídas para calcular" /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
              {leadPorFase.map(l => (
                <div key={l.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11.5px', color: '#4A5568', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{l.label}</span>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#2C3A42', flexShrink: 0 }}>{l.dias} <span style={{ fontSize: '10px', color: '#A1AAB5', fontWeight: '500' }}>dias</span></span>
                  </div>
                  <div style={{ height: '8px', background: '#F4F6F9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${(l.dias / maxLead) * 100}%`, height: '100%', background: l.cor, borderRadius: '4px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px', marginBottom: '14px' }}>
        <Card title="Produtos bloqueados" subtitle={`${prodBloqueados.length} produto${prodBloqueados.length !== 1 ? 's' : ''} atualmente em estado de bloqueio`}>
          {prodBloqueados.length === 0 ? <Empty msg="Nenhum produto bloqueado neste momento" /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {prodBloqueados.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(192,84,76,0.05)', border: '1px solid rgba(192,84,76,0.18)', borderRadius: '9px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0 }}>
                    <span style={{ background: 'rgba(161,181,216,0.18)', color: '#5A7BA8', borderRadius: '6px', padding: '2px 9px', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>{p.id_produto_dados}</span>
                    <span style={{ fontSize: '12.5px', color: '#2C3A42', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome_produto_dados}</span>
                  </div>
                  <span style={{ background: 'rgba(192,84,76,0.12)', color: '#C0544C', borderRadius: '20px', padding: '3px 11px', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap', flexShrink: 0 }}>{p.status}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ─── Secção: Atributos ─── */}
      <SectionTitle>Atributos</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px', marginBottom: '8px' }}>
        <Card title="Distribuição por fase" subtitle="Atributos do catálogo em cada estado de catalogação">
          <Barras dados={atrPorFase} vazio="Sem atributos no catálogo" />
        </Card>
      </div>
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '26px 0 14px' }}>
      <h2 style={{ fontSize: '11px', fontWeight: '700', color: '#738290', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0, whiteSpace: 'nowrap' }}>{children}</h2>
      <div style={{ flex: 1, height: '1px', background: '#ECEEF2' }} />
    </div>
  )
}