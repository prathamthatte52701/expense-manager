import { CalendarDays, ChevronLeft, ChevronRight, ReceiptText } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CATEGORIES, api, rupee, thisMonth } from '../lib/api'
import { compactDate, monthDays, monthLabel, shiftMonth } from '../lib/finance'
import { DataCard, EmptyState, MetricCard, PageHeader } from '../components/ui'

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarPage() {
  const [monthYear, setMonthYear] = useState(thisMonth())
  const [days, setDays] = useState([])
  const [summary, setSummary] = useState(null)
  const [selectedDay, setSelectedDay] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [{ data: dayData }, { data: summaryData }] = await Promise.all([
        api.get('/budget/days', { params: { monthYear } }),
        api.get('/budget/summary', { params: { monthYear } }),
      ])
      setDays(dayData)
      setSummary(summaryData)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load this month.')
    } finally {
      setLoading(false)
    }
  }, [monthYear])

  useEffect(() => { load() }, [load])

  const byDay = useMemo(() => new Map(days.map((d) => [d.date, d])), [days])
  const selected = selectedDay ? byDay.get(selectedDay) : null
  const busiestDay = useMemo(() => [...days].sort((a, b) => b.total - a.total)[0], [days])

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Activity timeline"
        title="Calendar"
        description="Review daily spending and inspect the categories behind each date."
        icon={CalendarDays}
        actions={<div className="flex items-center gap-2"><button className="icon-btn" onClick={() => setMonthYear((value) => shiftMonth(value, -1))} title="Previous month" type="button"><ChevronLeft className="size-4" /></button><span className="min-w-36 text-center text-sm font-semibold">{monthLabel(monthYear)}</span><button className="icon-btn" onClick={() => setMonthYear((value) => shiftMonth(value, 1))} title="Next month" type="button"><ChevronRight className="size-4" /></button></div>}
      />

      {error && <div className="alert-banner alert-danger"><p>{error}</p></div>}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Spent this month" value={rupee.format(summary?.totalSpent || 0)} detail={`${summary?.categoryTotals?.filter((c) => c.total > 0).length || 0} active categories`} icon={ReceiptText} tone="danger" />
        <MetricCard label="Monthly limit" value={summary?.monthlyLimit ? rupee.format(summary.monthlyLimit) : 'Not set'} detail={summary?.monthlyLimit ? `${summary.percentUsed}% used` : 'Set it in Settings'} />
        <MetricCard label="Highest spend day" value={busiestDay ? rupee.format(busiestDay.total) : rupee.format(0)} detail={busiestDay ? compactDate(busiestDay.date) : 'No spending recorded'} icon={CalendarDays} />
      </div>

      <DataCard title={monthLabel(monthYear)} description="Select a date to see its category breakdown.">
        {loading ? <p className="text-sm text-muted">Loading calendar...</p> : <div className="overflow-x-auto"><div className="min-w-[680px]"><div className="grid grid-cols-7 gap-2">{weekdays.map((day) => <p className="px-2 text-xs font-bold uppercase text-muted" key={day}>{day}</p>)}</div><div className="mt-2 grid grid-cols-7 gap-2">{monthDays(monthYear).map((cell) => {
          const day = byDay.get(cell.key)
          const active = selectedDay === cell.key
          return <button key={cell.key} type="button" disabled={!cell.inMonth} onClick={() => setSelectedDay(cell.key)} className={`min-h-24 rounded-lg border p-3 text-left transition ${cell.inMonth ? 'border-white/10 bg-white/5 hover:border-teal-400/60' : 'border-transparent opacity-30'} ${active ? 'ring-2 ring-teal-400' : ''}`}>
            <span className="text-sm font-semibold">{cell.day}</span>
            {day && day.total > 0 && <div className="mt-4"><span className="text-sm font-bold text-rose-300">{rupee.format(day.total)}</span></div>}
          </button>
        })}</div></div></div>}
      </DataCard>

      <DataCard title={selected ? `Activity on ${compactDate(selected.date)}` : 'Daily activity'} description={selected ? `Total: ${rupee.format(selected.total)}` : 'Choose a day from the calendar.'}>
        {selected ? <div className="divide-y divide-white/10">{CATEGORIES.map((category) => (
          <div key={category} className="flex items-center justify-between py-3">
            <span>{category}</span>
            <strong className={selected.categories[category] ? 'text-rose-300' : 'text-muted'}>{rupee.format(selected.categories[category] || 0)}</strong>
          </div>
        ))}</div> : <EmptyState icon={CalendarDays} title="Pick a day" description="Its category totals will appear here." />}
      </DataCard>
    </div>
  )
}
