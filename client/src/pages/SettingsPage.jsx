import { Save, Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { DataCard, FormField, PageHeader } from '../components/ui'
import { api, thisMonth } from '../lib/api'

export default function SettingsPage() {
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

  return (
    <div className="space-y-5">
      <PageHeader eyebrow={thisMonth()} title="Settings" description="Set this month's total spending limit. It can be changed any day." icon={Settings} />
      <DataCard title="Monthly limit" description="One total limit across all categories. Going over is a visual warning only — it never blocks new entries." actions={<button className="premium-btn" disabled={saving} onClick={save} type="button"><Save className="size-4" />Save limit</button>}>
        <FormField label="Monthly limit (₹)"><input type="number" min="0" value={monthlyLimit} onChange={(event) => setMonthlyLimit(Number(event.target.value))} /></FormField>
      </DataCard>
    </div>
  )
}
