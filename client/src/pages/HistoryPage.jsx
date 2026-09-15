import { Download, Edit3, FileText, RotateCcw, Search, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import SortControl from '../components/SortControl'
import TransactionModal from '../components/TransactionModal'
import { CATEGORIES, api, rupee, thisMonth } from '../lib/api'
import { sortTransactions } from '../lib/sort'

export default function HistoryPage() {
  const [months, setMonths] = useState([thisMonth()])
  const [monthYear, setMonthYear] = useState(thisMonth())
  const [transactions, setTransactions] = useState([])
  const [filters, setFilters] = useState({ category: 'All', keyword: '' })
  const [modalTransaction, setModalTransaction] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [sortBy, setSortBy] = useState('date_desc')

  async function loadMonths() {
    const { data } = await api.get('/budget/months')
    setMonths(data)
  }
  const load = useCallback(async () => {
    const { data } = await api.get('/budget/transactions', { params: { monthYear } })
    setTransactions(data)
  }, [monthYear])
  useEffect(() => { loadMonths() }, [])
  useEffect(() => { load() }, [load])

  async function save(form) {
    await api.put(`/budget/transactions/${modalTransaction._id}`, form)
    toast.success('Entry updated')
    setModalOpen(false); setModalTransaction(null); load()
  }

  async function remove(id) {
    await api.delete(`/budget/transactions/${id}`)
    toast.success('Entry deleted')
    load()
  }

  async function download(format) {
    const { data } = await api.get(`/export/${monthYear}.${format}`, { responseType: 'blob' })
    const url = URL.createObjectURL(data)
    const link = document.createElement('a')
    link.href = url
    link.download = `expenses-${monthYear}.${format}`
    link.click()
    URL.revokeObjectURL(url)
  }

  const visible = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase()
    return sortTransactions(transactions.filter((tx) => {
      if (filters.category !== 'All' && tx.category !== filters.category) return false
      if (!keyword) return true
      return [tx.category, tx.note].some((v) => String(v || '').toLowerCase().includes(keyword))
    }), sortBy)
  }, [filters, sortBy, transactions])

  function openEdit(tx) {
    setModalTransaction(tx)
    setModalOpen(true)
  }

  function resetFilters() {
    setFilters({ category: 'All', keyword: '' })
  }

  return (
    <div className="space-y-5">
      <section className="glass p-5">
        <p className="text-sm text-muted">Search, edit, and export past entries</p>
        <h2 className="text-2xl font-semibold">History</h2>
      </section>
      <section className="glass p-4 md:p-5">
        <div className="grid gap-3 md:grid-cols-[160px_1fr_140px_auto_auto]">
          <select value={monthYear} onChange={(e) => setMonthYear(e.target.value)}>{months.map((m) => <option key={m}>{m}</option>)}</select>
          <div className="relative"><Search className="absolute left-3 top-3 size-4 text-muted" /><input className="pl-9" value={filters.keyword} onChange={(e) => setFilters({ ...filters, keyword: e.target.value })} placeholder="Search notes..." /></div>
          <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}><option>All</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          <SortControl value={sortBy} onChange={setSortBy} />
          <button className="soft-btn" onClick={resetFilters}><RotateCcw className="size-4" /> Reset</button>
        </div>
        <div className="mt-4 flex gap-2">
          <button className="soft-btn" onClick={() => download('csv')}><Download className="size-4" /> CSV</button>
          <button className="soft-btn" onClick={() => download('pdf')}><FileText className="size-4" /> PDF</button>
        </div>
      </section>
      <section className="glass overflow-hidden">
        <div className="hidden grid-cols-[1fr_120px_150px_130px] gap-3 border-b border-white/10 p-4 text-sm text-muted md:grid"><span>Category / Note</span><span>Amount</span><span>Date</span><span>Actions</span></div>
        {visible.map((tx) => (
          <div key={tx._id} className="m-3 grid gap-3 rounded-lg border border-white/10 bg-white/5 p-4 md:m-0 md:grid-cols-[1fr_120px_150px_130px] md:items-center md:rounded-none md:border-x-0 md:border-t-0 md:bg-transparent">
            <div><b>{tx.category}</b>{tx.source === 'voice' && <span className="ml-2 rounded bg-teal-400/15 px-1.5 py-0.5 text-xs text-teal-200">voice</span>}<p className="mt-1 text-xs text-muted">{tx.note || ''}</p></div>
            <div>{rupee.format(tx.amount)}</div>
            <div className="text-muted">{tx.date?.slice(0, 10)}</div>
            <div className="flex justify-end gap-2 md:justify-start">
              <button className="icon-btn" title="Edit" onClick={() => openEdit(tx)}><Edit3 className="size-4" /></button>
              <button className="icon-btn" title="Delete" onClick={() => remove(tx._id)}><Trash2 className="size-4" /></button>
            </div>
          </div>
        ))}
        {!visible.length && <p className="p-5 text-muted">No entries match this view.</p>}
      </section>
      <TransactionModal open={modalOpen} editing={modalTransaction} onClose={() => { setModalOpen(false); setModalTransaction(null) }} onSubmit={save} categories={CATEGORIES} />
    </div>
  )
}
