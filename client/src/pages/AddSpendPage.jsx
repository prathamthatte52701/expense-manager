import { CalendarDays, IndianRupee, Mic, NotebookPen, PlusCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CATEGORIES, api, rupee, thisMonth, todayInput } from '../lib/api'
import { useGlobalVoice } from '../hooks/useGlobalVoice'

export default function AddSpendPage() {
  const { openVoice } = useGlobalVoice()
  const [summary, setSummary] = useState(null)
  const [category, setCategory] = useState(CATEGORIES[0])
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayInput())
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await api.get('/budget/summary', { params: { monthYear: thisMonth() } })
    setSummary(data)
  }

  useEffect(() => {
    load()
    window.addEventListener('expense:changed', load)
    return () => window.removeEventListener('expense:changed', load)
  }, [])

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    try {
      await api.post('/budget/transactions', { category, amount, date, note, source: 'manual' })
      toast.success('Expense recorded')
      setAmount(''); setNote(''); setDate(todayInput())
      await load()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to add expense')
    } finally {
      setSaving(false)
    }
  }

  const categorySpent = summary?.categoryTotals.find((c) => c.category === category)?.total || 0

  return (
    <div className="space-y-5">
      <section className="glass p-5">
        <p className="eyebrow">{summary?.monthYear || thisMonth()}</p>
        <h2 className="text-2xl font-semibold">Add Expense</h2>
        <p className="text-sm text-muted">Already spent {rupee.format(categorySpent)} in {category} this month.</p>
      </section>

      <form onSubmit={submit} className="glass space-y-5 p-5">
        <div>
          <span className="mb-2 block text-sm text-muted">Category</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`soft-btn justify-center py-4 text-sm font-semibold ${category === c ? 'border-teal-300/60 bg-teal-300/15 text-white' : ''}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span className="inline-flex items-center gap-2"><IndianRupee className="size-4" /> Amount</span>
          <input type="number" min="1" step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" required autoFocus />
        </label>

        <label className="field">
          <span className="inline-flex items-center gap-2"><CalendarDays className="size-4" /> Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        <label className="field">
          <span className="inline-flex items-center gap-2"><NotebookPen className="size-4" /> Note (optional)</span>
          <textarea rows="2" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>

        <div className="flex gap-3">
          <button className="premium-btn flex-1 justify-center" disabled={saving} type="submit"><PlusCircle className="size-5" />{saving ? 'Saving...' : 'Add Expense'}</button>
          <button type="button" className="soft-btn" title="Voice (Ctrl+M) — log an expense or ask about your spending" onClick={openVoice}><Mic className="size-5" /></button>
        </div>
      </form>
    </div>
  )
}
