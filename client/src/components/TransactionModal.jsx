import { motion } from 'framer-motion'
import { CalendarDays, IndianRupee, ListChecks, NotebookPen, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { emptyTransactionForm, serializeTransactionForm, transactionToForm } from './transactions/form'

export default function TransactionModal({ open, onClose, onSubmit, categories, editing }) {
  const [form, setForm] = useState(emptyTransactionForm(categories[0]))

  useEffect(() => {
    if (editing) setForm(transactionToForm(editing, categories))
    else setForm(emptyTransactionForm(categories[0] || ''))
  }, [editing, categories, open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 p-3 backdrop-blur-sm sm:place-items-center">
      <motion.form
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        onSubmit={(e) => { e.preventDefault(); onSubmit(serializeTransactionForm(form)) }}
        className="glass max-h-[92vh] w-full max-w-md space-y-4 overflow-auto p-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{editing ? 'Edit Entry' : 'Add Entry'}</h2>
          <button type="button" onClick={onClose} className="icon-btn"><X className="size-4" /></button>
        </div>
        <div className="grid gap-4">
          <label className="field">
            <span className="inline-flex items-center gap-2"><ListChecks className="size-4" /> Category</span>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((c) => <option key={c}>{c}</option>)}</select>
          </label>
          <label className="field">
            <span className="inline-flex items-center gap-2"><IndianRupee className="size-4" /> Amount</span>
            <input type="number" min="1" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          </label>
          <label className="field">
            <span className="inline-flex items-center gap-2"><CalendarDays className="size-4" /> Date</span>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </label>
          <label className="field">
            <span className="inline-flex items-center gap-2"><NotebookPen className="size-4" /> Note</span>
            <textarea rows="3" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </label>
        </div>
        <button className="premium-btn w-full justify-center">{editing ? 'Save Changes' : 'Add Entry'}</button>
      </motion.form>
    </div>
  )
}
