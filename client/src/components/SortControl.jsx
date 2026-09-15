import { ArrowUpDown } from 'lucide-react'
import { sortOptions } from '../lib/sort'

export default function SortControl({ value, onChange }) {
  return (
    <label className="relative min-w-44">
      <ArrowUpDown className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted" />
      <select className="pl-9" value={value} onChange={(e) => onChange(e.target.value)}>
        {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}
