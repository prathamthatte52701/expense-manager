import { motion } from 'framer-motion'
import { AlertTriangle, ArrowRight, Mic, PlusCircle, Radio, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import CountUp from '../components/CountUp'
import { api, rupee, thisMonth } from '../lib/api'
import { monthLabel } from '../lib/finance'

const statusTone = { 'no-limit': 'neutral', ok: 'positive', warning: 'warning', over: 'danger' }
const statusLabel = { 'no-limit': 'No limit set', ok: 'On track', warning: 'Approaching limit', over: 'Over limit' }

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [days, setDays] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data } = await api.get('/budget/dashboard', { params: { monthYear: thisMonth() } })
    setSummary(data.summary)
    setDays(data.days)
    setTransactions(data.transactions)
    setLoading(false)
  }

  useEffect(() => { load() }, [])
  if (loading || !summary) return <div className="glass p-6">Loading dashboard...</div>

  const maxCategoryTotal = Math.max(...summary.categoryTotals.map((c) => c.total), 1)
  const maxDayTotal = Math.max(...days.map((d) => d.total), 1)
  const today = new Date()
  const daysLeft = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate()
  const elapsedDays = days.filter((d) => d.status !== 'upcoming').length || 1
  const avgDaily = summary.totalSpent / elapsedDays
  const percentForBar = Math.min(summary.percentUsed, 100)

  return (
    <div className="space-y-5">
      <section className="overview-command">
        <div>
          <p className="eyebrow">{monthLabel(summary.monthYear)}</p>
          <h2>Expense command center</h2>
          <p>Track spending across four categories, spot the days that ran hot, and stay ahead of your monthly limit.</p>
        </div>
        <div className="overview-command-actions">
          <span><Radio className="size-4" />Live sync</span>
          <a href="#/add" className="premium-btn"><Sparkles className="size-4" />New expense</a>
        </div>
      </section>

      {summary.status === 'over' && (
        <div className="alert-banner alert-danger"><AlertTriangle className="size-5" /><div><strong>Over the monthly limit</strong><p>You've spent {rupee.format(summary.totalSpent)} against a limit of {rupee.format(summary.monthlyLimit)}. New entries still save normally.</p></div></div>
      )}
      {summary.status === 'warning' && (
        <div className="alert-banner alert-warning"><AlertTriangle className="size-5" /><div><strong>Approaching your limit</strong><p>{summary.percentUsed}% of {rupee.format(summary.monthlyLimit)} used.</p></div></div>
      )}

      <section className="grid gap-3 sm:grid-cols-4">
        {[
          { label: 'Spent this month', value: summary.totalSpent, currency: true },
          { label: 'Monthly limit', value: summary.monthlyLimit, currency: true, detail: summary.monthlyLimit ? `${rupee.format(summary.remaining)} remaining` : 'Not set yet' },
          { label: 'Days left', value: daysLeft, currency: false },
          { label: 'Average daily spend', value: Math.round(avgDaily), currency: true },
        ].map((metric) => (
          <motion.div whileHover={{ y: -3 }} className="glass p-5" key={metric.label}>
            <p className="text-sm text-muted">{metric.label}</p>
            <div className="mt-2 text-3xl font-semibold tracking-normal">{metric.currency ? <CountUp value={metric.value} /> : metric.value}</div>
            {metric.detail && <p className="mt-2 text-sm text-muted">{metric.detail}</p>}
          </motion.div>
        ))}
      </section>

      <section className="glass p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted">Monthly limit progress</p>
            <h2 className="text-xl font-semibold">{statusLabel[summary.status]}</h2>
          </div>
          <span className={`rounded-md px-3 py-1 text-sm font-semibold tone-${statusTone[summary.status]}`}>{summary.monthlyLimit ? `${summary.percentUsed}%` : '--'}</span>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-all ${summary.status === 'over' ? 'bg-rose-500' : summary.status === 'warning' ? 'bg-amber-400' : 'bg-teal-400'}`}
            style={{ width: `${summary.monthlyLimit ? percentForBar : 0}%` }}
          />
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <div className="glass p-5">
          <h2 className="mb-4 text-xl font-semibold">Category Breakdown</h2>
          <div className="category-bars">
            {summary.categoryTotals.map((category) => (
              <div className="category-bar-row" key={category.category}>
                <span>{category.category}</span>
                <div className="category-bar-track"><div className="category-bar-fill" style={{ width: `${Math.max((category.total / maxCategoryTotal) * 100, category.total ? 6 : 0)}%` }} /></div>
                <strong>{rupee.format(category.total)}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="glass p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold">Recent Entries</h2>
            <a href="#/history" className="soft-btn"><ArrowRight className="size-4" /> View All</a>
          </div>
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div key={tx._id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
                <div>
                  <p className="font-medium">{tx.category}{tx.source === 'voice' && <Mic className="ml-1 inline size-3 text-teal-300" />}</p>
                  <p className="text-sm text-muted">{tx.note || 'No note'} - {tx.date.slice(0, 10)}</p>
                </div>
                <b>{rupee.format(tx.amount)}</b>
              </div>
            ))}
            {!transactions.length && <p className="text-sm text-muted">No spends this month yet.</p>}
          </div>
        </div>
      </section>

      <section className="glass p-5">
        <h2 className="mb-4 text-xl font-semibold">This Month at a Glance</h2>
        <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-10 lg:grid-cols-15">
          {days.map((day) => {
            const intensity = day.total ? Math.max(0.15, day.total / maxDayTotal) : 0
            return (
              <div
                key={day.date}
                title={`${day.date}: ${rupee.format(day.total)}`}
                className={`aspect-square rounded-md border text-[10px] flex items-center justify-center ${day.status === 'today' ? 'border-teal-300' : 'border-white/10'}`}
                style={{ background: day.total ? `rgba(45, 212, 191, ${intensity})` : 'rgba(255,255,255,0.03)' }}
              >
                {Number(day.date.slice(-2))}
              </div>
            )
          })}
        </div>
      </section>

      <a href="#/add" className="premium-btn fixed bottom-6 right-6 z-30 shadow-lg sm:hidden"><PlusCircle className="size-5" />Add</a>
    </div>
  )
}
