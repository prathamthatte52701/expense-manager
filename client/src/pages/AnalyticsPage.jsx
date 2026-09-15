import { BarChart3, IndianRupee, WalletCards } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CATEGORIES, api, rupee, thisMonth } from '../lib/api'
import { monthLabel } from '../lib/finance'
import { DataCard, EmptyState, MetricCard, PageHeader } from '../components/ui'

const chartColors = ['#2dd4bf', '#60a5fa', '#f59e0b', '#fb7185']

export default function AnalyticsPage() {
  const [monthYear, setMonthYear] = useState(thisMonth())
  const [summary, setSummary] = useState(null)
  const [compare, setCompare] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [{ data: summaryData }, { data: compareData }] = await Promise.all([
        api.get('/budget/summary', { params: { monthYear } }),
        api.get('/budget/compare'),
      ])
      setSummary(summaryData)
      setCompare(compareData)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load analytics.')
    } finally {
      setLoading(false)
    }
  }, [monthYear])

  useEffect(() => { load() }, [load])

  const pieData = useMemo(() => (summary?.categoryTotals || []).filter((c) => c.total > 0), [summary])
  const barData = useMemo(() => compare.map((m) => ({ label: monthLabel(m.monthYear, { month: 'short', year: '2-digit' }), ...m.categoryTotals })), [compare])
  const topCategory = [...(summary?.categoryTotals || [])].sort((a, b) => b.total - a.total)[0]

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Spending intelligence" title="Analytics" description="Category mix for the selected month, and month-over-month trends across every month you've tracked." icon={BarChart3} actions={<input type="month" value={monthYear} onChange={(event) => setMonthYear(event.target.value)} />} />
      {error && <div className="alert-banner alert-danger"><p>{error}</p></div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total spending" value={rupee.format(summary?.totalSpent || 0)} detail={monthLabel(monthYear)} icon={IndianRupee} tone="danger" />
        <MetricCard label="Top category" value={topCategory?.category || 'No spending'} detail={topCategory ? `${rupee.format(topCategory.total)} across ${topCategory.count} entries` : 'Record an expense to start'} icon={WalletCards} />
        <MetricCard label="Months tracked" value={String(compare.length)} detail="Used in month-over-month chart" icon={BarChart3} />
        <MetricCard label="Monthly limit" value={summary?.monthlyLimit ? rupee.format(summary.monthlyLimit) : 'Not set'} detail={summary?.monthlyLimit ? `${summary.percentUsed}% used` : ''} />
      </div>

      {loading ? <DataCard title="Loading analytics"><p className="text-sm text-muted">Calculating monthly patterns...</p></DataCard> : !pieData.length && !compare.length ? <EmptyState icon={BarChart3} title="No activity yet" description="Analytics will populate as soon as you record expenses." /> : <>
        <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
          <DataCard title="Category mix" description={`Share of spending in ${monthLabel(monthYear)}.`}>
            {pieData.length ? <div className="h-80"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} dataKey="total" nameKey="category" innerRadius={58} outerRadius={100} paddingAngle={3} label={(entry) => rupee.format(entry.total)}>{pieData.map((item) => <Cell fill={chartColors[CATEGORIES.indexOf(item.category) % chartColors.length]} key={item.category} />)}</Pie><Tooltip formatter={(value) => rupee.format(value)} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} /><Legend /></PieChart></ResponsiveContainer></div> : <EmptyState icon={BarChart3} title="No spending this month" description="Add an expense to see the category split." />}
          </DataCard>
          <DataCard title="Month-over-month" description="All tracked months, broken down by category.">
            {barData.length ? <div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={barData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}><XAxis dataKey="label" tickLine={false} axisLine={false} /><YAxis tickFormatter={(value) => `₹${Math.round(value / 1000)}k`} tickLine={false} axisLine={false} width={48} /><Tooltip formatter={(value) => rupee.format(value)} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} /><Legend />{CATEGORIES.map((category, index) => <Bar key={category} dataKey={category} stackId="spend" name={category} fill={chartColors[index]} />)}</BarChart></ResponsiveContainer></div> : <EmptyState icon={BarChart3} title="No months tracked yet" description="Once you have expenses across months, they'll compare here." />}
          </DataCard>
        </div>
      </>}
    </div>
  )
}
