import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const GlobalVoiceContext = createContext(null)

export function GlobalVoiceProvider({ children }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'm') {
        event.preventDefault()
        setOpen((current) => (current ? current : true))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const value = useMemo(() => ({ open, openVoice: () => setOpen(true), closeVoice: () => setOpen(false) }), [open])
  return <GlobalVoiceContext.Provider value={value}>{children}</GlobalVoiceContext.Provider>
}

export const useGlobalVoice = () => useContext(GlobalVoiceContext)
