import { Plus, Save, Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { DataCard, FormField, PageHeader } from '../components/ui'
import { api, thisMonth } from '../lib/api'
import { useCategories } from '../context/CategoryContext'

export default function SettingsPage() {
  const { categories } = useCategories()
  const [newCategory, setNewCategory] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const [monthlyLimit, setMonthlyLimit] = useState(0)
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      const { data } = await api.get(`/budget/limit/${thisMonth()}`)
      setMonthlyLimit(data.monthlyLimit || 0)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load settings')
    }
  }

  useEffect(() => { load() }, [])

  async function save() {
    setSaving(true)
    try {
      const { data } = await api.patch(`/budget/limit/${thisMonth()}`, { monthlyLimit })
      setMonthlyLimit(data.monthlyLimit)
      toast.success('Monthly limit updated')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update limit')
    } finally { setSaving(false) }
  }

  async function addCategory(event) {
    event.preventDefault()
    const name = newCategory.trim()
    if (!name) return
    setAddingCategory(true)
    try {
      await api.addCategory(name)
      toast.success('Category added')
      window.dispatchEvent(new Event('categories:changed'))
      setNewCategory('')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not add category')
    } finally {
      setAddingCategory(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader eyebrow={thisMonth()} title="Settings" description="Set this month's total spending limit. It can be changed any day." icon={Settings} />
      <DataCard title="Monthly limit" description="One total limit across all categories. Going over is a visual warning only — it never blocks new entries." actions={<button className="premium-btn" disabled={saving} onClick={save} type="button"><Save className="size-4" />Save limit</button>}>
        <FormField label="Monthly limit (₹)"><input type="number" min="0" value={monthlyLimit} onChange={(event) => setMonthlyLimit(Number(event.target.value))} /></FormField>
      </DataCard>
      <DataCard title="Categories" description="Add new spending categories. Existing ones can't be removed or renamed.">
        <div className="mb-4 flex flex-wrap gap-2">
          {categories.map((c) => <span key={c} className="soft-btn py-1.5 text-sm">{c}</span>)}
        </div>
        <form onSubmit={addCategory} className="flex gap-2">
          <input
            className="flex-1"
            value={newCategory}
            onChange={(event) => setNewCategory(event.target.value)}
            placeholder="New category name"
          />
          <button className="premium-btn" disabled={addingCategory || !newCategory.trim()} type="submit">
            <Plus className="size-4" />Add Category
          </button>
        </form>
      </DataCard>
    </div>
  )
}
