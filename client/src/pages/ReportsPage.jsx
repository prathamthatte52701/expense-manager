import { Download, FileBarChart, FileSpreadsheet, FileText, ReceiptText, Wallet } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api, rupee, thisMonth, todayInput } from '../lib/api'
import { monthLabel } from '../lib/finance'
import { DataCard, DataTable, EmptyState, MetricCard, PageHeader } from '../components/ui'

function startOfWeek() {
  const d = new Date()
  d.setDate(d.getDate() - 6)
  return d.toISOString().slice(0, 10)
}

export default function ReportsPage() {
  const [monthYear, setMonthYear] = useState(thisMonth())
  const [weekStart, setWeekStart] = useState(startOfWeek())
  const [weekEnd, setWeekEnd] = useState(todayInput())
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState('')
  const [error, setError] = useState('')
  const [aiSummary, setAiSummary] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/budget/summary', { params: { monthYear } })
      setSummary(data)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load this report.')
    } finally {
      setLoading(false)
    }
  }, [monthYear])

  useEffect(() => { load() }, [load])

  function withAiSummary(url) {
    if (!aiSummary) return url
    return `${url}${url.includes('?') ? '&' : '?'}aiSummary=true`
  }

  async function downloadFile(url, filename) {
    setDownloading(filename)
    try {
      const { data } = await api.get(url, { responseType: 'blob' })
      const objectUrl = URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
      toast.success(`${filename} downloaded`)
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || 'Could not download report')
    } finally {
      setDownloading('')
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Statements" title="Reports" description="Download monthly or weekly expense reports." icon={FileBarChart} />
      {error && <div className="alert-banner alert-danger"><p>{error}</p></div>}

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Total spent" value={rupee.format(summary?.totalSpent || 0)} detail={monthLabel(monthYear)} icon={ReceiptText} tone="danger" />
        <MetricCard label="Monthly limit" value={summary?.monthlyLimit ? rupee.format(summary.monthlyLimit) : 'Not set'} icon={Wallet} />
        <MetricCard label="Remaining" value={rupee.format(summary?.remaining || 0)} detail={`${summary?.percentUsed || 0}% used`} icon={Download} tone={summary?.status === 'over' ? 'danger' : 'positive'} />
      </div>

      <label className="flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={aiSummary} onChange={(e) => setAiSummary(e.target.checked)} />
        Include AI Summary
      </label>

      <DataCard title="Monthly report" description="Full month totals, category subtotals, and every transaction." actions={<input className="w-40" type="month" value={monthYear} onChange={(event) => setMonthYear(event.target.value)} />}>
        <div className="flex flex-wrap gap-2">
          <button className="soft-btn" disabled={Boolean(downloading)} onClick={() => downloadFile(withAiSummary(`/export/${monthYear}.csv`), `expenses-${monthYear}.csv`)} type="button"><FileSpreadsheet className="size-4" />CSV</button>
          <button className="soft-btn" disabled={Boolean(downloading)} onClick={() => downloadFile(withAiSummary(`/export/${monthYear}.json`), `expenses-${monthYear}.json`)} type="button"><FileText className="size-4" />JSON</button>
          <button className="premium-btn" disabled={Boolean(downloading)} onClick={() => downloadFile(withAiSummary(`/export/${monthYear}.pdf`), `expenses-${monthYear}.pdf`)} type="button"><FileText className="size-4" />PDF</button>
        </div>
      </DataCard>

      <DataCard title="Weekly report" description="Pick any date range for a custom weekly export." actions={<div className="flex flex-wrap gap-2"><input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} /><input type="date" value={weekEnd} onChange={(e) => setWeekEnd(e.target.value)} /></div>}>
        <div className="flex flex-wrap gap-2">
          <button className="soft-btn" disabled={Boolean(downloading)} onClick={() => downloadFile(withAiSummary(`/export/range.csv?start=${weekStart}&end=${weekEnd}`), `expenses-${weekStart}_to_${weekEnd}.csv`)} type="button"><FileSpreadsheet className="size-4" />CSV</button>
          <button className="soft-btn" disabled={Boolean(downloading)} onClick={() => downloadFile(withAiSummary(`/export/range.json?start=${weekStart}&end=${weekEnd}`), `expenses-${weekStart}_to_${weekEnd}.json`)} type="button"><FileText className="size-4" />JSON</button>
          <button className="premium-btn" disabled={Boolean(downloading)} onClick={() => downloadFile(withAiSummary(`/export/range.pdf?start=${weekStart}&end=${weekEnd}`), `expenses-${weekStart}_to_${weekEnd}.pdf`)} type="button"><FileText className="size-4" />PDF</button>
        </div>
      </DataCard>

      {loading ? <DataCard title="Loading"><p className="text-sm text-muted">Preparing statement...</p></DataCard> : !summary?.totalSpent ? <EmptyState icon={FileBarChart} title="No spending yet" description="Reports will include data as soon as this period has activity." /> : <DataCard title="Category totals" description={monthLabel(monthYear)}>
        <DataTable columns={[{ key: 'category', label: 'Category' }, { key: 'count', label: 'Entries' }, { key: 'total', label: 'Spent', render: (row) => rupee.format(row.total) }]} rows={summary.categoryTotals} emptyText="No spending recorded." />
      </DataCard>}
    </div>
  )
}
