import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  FileBarChart,
  Gauge,
  Mic,
  Moon,
  PlusCircle,
  ReceiptText,
  Settings,
  Sun,
  Wallet,
} from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Toaster } from 'sonner'
import Dashboard from './pages/Dashboard'
import VoiceEntryModal from './components/VoiceEntryModal'
import { ThemeProvider, useTheme } from './hooks/useTheme'
import { GlobalVoiceProvider, useGlobalVoice } from './hooks/useGlobalVoice'

const AddSpendPage = lazy(() => import('./pages/AddSpendPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const CalendarPage = lazy(() => import('./pages/CalendarPage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

const primaryNav = [
  { to: '/', label: 'Overview', icon: Gauge, description: 'Monthly command center' },
  { to: '/add', label: 'Add Expense', icon: PlusCircle, description: 'Manual or voice entry' },
  { to: '/history', label: 'History', icon: ReceiptText, description: 'Search and export' },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays, description: 'Daily timeline' },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, description: 'Trends and comparisons' },
  { to: '/reports', label: 'Reports', icon: FileBarChart, description: 'Weekly & monthly packets' },
  { to: '/settings', label: 'Settings', icon: Settings, description: 'Monthly limit' },
]

const liveRoutes = {
  '/': Dashboard,
  '/add': AddSpendPage,
  '/history': HistoryPage,
  '/calendar': CalendarPage,
  '/analytics': AnalyticsPage,
  '/reports': ReportsPage,
  '/settings': SettingsPage,
}

function Shell() {
  const { theme, toggleTheme } = useTheme()
  const { open, openVoice, closeVoice } = useGlobalVoice()
  const [route, setRoute] = useState(window.location.hash.replace('#', '') || '/')

  useEffect(() => {
    const sync = () => setRoute(window.location.hash.replace('#', '') || '/')
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  const activeRoute = useMemo(() => (primaryNav.some((item) => item.to === route) ? route : '/'), [route])
  const activeItem = primaryNav.find((item) => item.to === activeRoute) || primaryNav[0]
  const PageComponent = liveRoutes[route] || Dashboard

  return (
    <div className="app-shell min-h-screen bg-app text-foreground">
      <aside className="sidebar-shell">
        <div className="brand-lockup">
          <div className="brand-mark">
            <Wallet className="size-5" />
          </div>
          <div>
            <p className="brand-eyebrow">Expense Manager</p>
            <h1>Monthly Tracker</h1>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Primary navigation">
          {primaryNav.map(({ to, label, icon: Icon }) => {
            const active = activeRoute === to
            return (
              <a key={to} href={`#${to}`} className={`sidebar-link ${active ? 'is-active' : ''}`}>
                <Icon className="size-4" />
                <span>{label}</span>
                {active && <ChevronRight className="ml-auto size-4" />}
              </a>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="theme-switch" onClick={toggleTheme} type="button">
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>
        </div>
      </aside>

      <div className="workspace-shell">
        <header className="mobile-appbar">
          <div className="brand-lockup compact">
            <div className="brand-mark">
              <Wallet className="size-4" />
            </div>
            <div>
              <p className="brand-eyebrow">Expense Manager</p>
              <h1>{activeItem.label}</h1>
            </div>
          </div>
          <button className="icon-btn" onClick={toggleTheme} title="Toggle theme" type="button">
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </header>

        <nav className="mobile-scrollnav" aria-label="Primary navigation">
          {primaryNav.map(({ to, label, icon: Icon }) => (
            <a key={to} href={`#${to}`} className={`mobile-nav-pill ${activeRoute === to ? 'is-active' : ''}`}>
              <Icon className="size-4" />
              {label}
            </a>
          ))}
        </nav>

        <main className="workspace-main">
          <AnimatePresence mode="wait">
            <motion.div
              key={route}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              <Suspense fallback={<div className="glass p-6">Loading module...</div>}>
                <PageComponent />
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <button
        type="button"
        className="premium-btn fixed bottom-24 right-6 z-40 size-14 justify-center rounded-full p-0 shadow-lg sm:bottom-6"
        title="Voice (Ctrl+M) — log an expense or ask about your spending"
        onClick={openVoice}
      >
        <Mic className="size-5" />
      </button>

      <VoiceEntryModal open={open} onClose={closeVoice} onSaved={closeVoice} />

      <Toaster richColors position="top-right" />
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <GlobalVoiceProvider>
        <Shell />
      </GlobalVoiceProvider>
    </ThemeProvider>
  )
}
