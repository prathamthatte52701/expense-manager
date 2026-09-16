import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'

const CategoryContext = createContext(null)

export function CategoryProvider({ children }) {
  const [categories, setCategories] = useState([])

  const refetch = useCallback(async () => {
    try {
      const data = await api.getCategories()
      setCategories(data)
    } catch {
      // keep previous list on failure
    }
  }, [])

  useEffect(() => {
    refetch()
    window.addEventListener('categories:changed', refetch)
    return () => window.removeEventListener('categories:changed', refetch)
  }, [refetch])

  const value = useMemo(() => ({ categories, refetch }), [categories, refetch])
  return <CategoryContext.Provider value={value}>{children}</CategoryContext.Provider>
}

export const useCategories = () => useContext(CategoryContext)
