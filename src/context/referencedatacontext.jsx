import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const ReferenceDataContext = createContext(null)

export function ReferenceDataProvider({ children }) {
  const [enumeracoes, setEnumeracoes] = useState({})
  const [dominios, setDominios] = useState([])
  const [iniciativas, setIniciativas] = useState([])
  const [produtosDados, setProdutosDados] = useState([])
  const [loading, setLoading] = useState(true)

  const refetchProdutosDados = async () => {
    const { data } = await supabase.from('d_produtos_dados').select('*').order('nome_produto_dados')
    if (data) setProdutosDados(data)
  }

  useEffect(() => {
    Promise.all([
      supabase.from('d_enumeracoes').select('tipo,valor,ordem').order('tipo').order('ordem'),
      supabase.from('d_dominio_do').select('dominio').order('dominio'),
      supabase.from('d_iniciativas').select('id_iniciativa,nome_iniciativa,id_use_case,nome_use_case,dominio_owner').order('id_iniciativa'),
      supabase.from('d_produtos_dados').select('*').order('nome_produto_dados'),
    ]).then(([enumRes, domRes, inicRes, prodRes]) => {
      if (enumRes.data) {
        const grouped = enumRes.data.reduce((acc, row) => {
          if (!acc[row.tipo]) acc[row.tipo] = []
          acc[row.tipo].push(row.valor)
          return acc
        }, {})
        setEnumeracoes(grouped)
      }
      if (domRes.data) {
        setDominios([...new Set(domRes.data.map(r => r.dominio).filter(Boolean))])
      }
      if (inicRes.data) setIniciativas(inicRes.data)
      if (prodRes.data) setProdutosDados(prodRes.data)
      setLoading(false)
    })
  }, [])

  return (
    <ReferenceDataContext.Provider value={{ enumeracoes, dominios, iniciativas, produtosDados, refetchProdutosDados, loading }}>
      {children}
    </ReferenceDataContext.Provider>
  )
}

export function useReferenceData() {
  const ctx = useContext(ReferenceDataContext)
  if (!ctx) throw new Error('useReferenceData must be used within ReferenceDataProvider')
  return ctx
}