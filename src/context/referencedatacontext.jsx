import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const ReferenceDataContext = createContext(null)

export function ReferenceDataProvider({ children }) {
  const [enumeracoes, setEnumeracoes]     = useState({})
  const [dominios, setDominios]           = useState([])   // objectos completos de d_dominios
  const [iniciativas, setIniciativas]     = useState([])   // d_iniciativas + dominio_nome
  const [useCases, setUseCases]           = useState([])   // d_use_cases + iniciativa
  const [produtosDados, setProdutosDados] = useState([])   // d_produtos_dados + dominio_nome
  const [loading, setLoading]             = useState(true)

  const refetchProdutosDados = async () => {
    const { data } = await supabase
      .from('d_produtos_dados')
      .select('*, d_dominios(id, nome)')
      .order('nome_produto_dados')
    if (data) setProdutosDados(data.map(r => ({ ...r, dominio_nome: r.d_dominios?.nome || null })))
  }

  const refetchIniciativas = async () => {
    const { data } = await supabase
      .from('d_iniciativas')
      .select('id, id_iniciativa, nome_iniciativa, dominio_id, d_dominios(id, nome)')
      .order('id_iniciativa')
    if (data) setIniciativas(data.map(r => ({ ...r, dominio_nome: r.d_dominios?.nome || null })))
  }

  const refetchUseCases = async () => {
    const { data } = await supabase
      .from('d_use_cases')
      .select('id, id_use_case, nome_use_case, iniciativa_id, d_iniciativas(id, id_iniciativa, nome_iniciativa, dominio_id, d_dominios(id, nome))')
      .order('id_use_case')
    if (data) setUseCases(data.map(r => ({
      ...r,
      iniciativa_nome:  r.d_iniciativas?.nome_iniciativa || null,
      id_iniciativa:    r.d_iniciativas?.id_iniciativa   || null,
      dominio_nome:     r.d_iniciativas?.d_dominios?.nome || null,
    })))
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [enumRes, domRes] = await Promise.all([
        supabase.from('d_enumeracoes').select('tipo,valor,ordem').order('tipo').order('ordem'),
        supabase.from('d_dominios').select('id, nome, business_owner, data_owner, descricao, area_ownership').order('nome'),
      ])

      // Enumerações agrupadas por tipo
      if (enumRes.data) {
        const grouped = enumRes.data.reduce((acc, r) => {
          if (!acc[r.tipo]) acc[r.tipo] = []
          acc[r.tipo].push(r.valor)
          return acc
        }, {})
        setEnumeracoes(grouped)
      }

      // Domínios — objectos completos
      if (domRes.data) setDominios(domRes.data)

      // Carregar iniciativas, use cases e produtos
      await Promise.all([refetchIniciativas(), refetchUseCases(), refetchProdutosDados()])

      setLoading(false)
    }
    load()
  }, [])

  return (
    <ReferenceDataContext.Provider value={{
      enumeracoes,
      dominios,
      iniciativas,
      useCases,
      produtosDados,
      refetchProdutosDados,
      refetchIniciativas,
      refetchUseCases,
      loading,
    }}>
      {children}
    </ReferenceDataContext.Provider>
  )
}

export function useReferenceData() {
  const ctx = useContext(ReferenceDataContext)
  if (!ctx) throw new Error('useReferenceData deve ser usado dentro de ReferenceDataProvider')
  return ctx
}