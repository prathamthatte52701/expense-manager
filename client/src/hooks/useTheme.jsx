import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(localStorage.getItem('budget_theme') || 'dark')
  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
    localStorage.setItem('budget_theme', theme)
  }, [theme])
  const value = useMemo(() => ({ theme, toggleTheme: () => setTheme((next) => (next === 'dark' ? 'light' : 'dark')) }), [theme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
