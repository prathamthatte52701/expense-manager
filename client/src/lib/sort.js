export const sortOptions = [
  { value: 'date_desc', label: 'Date: Newest' },
  { value: 'date_asc', label: 'Date: Oldest' },
  { value: 'amount_desc', label: 'Amount: High' },
  { value: 'amount_asc', label: 'Amount: Low' },
  { value: 'category_asc', label: 'Category: A-Z' },
]

export function sortTransactions(transactions, sortBy) {
  const text = (value) => String(value || '').toLowerCase()
  const dateValue = (transaction) => new Date(transaction.date || 0).getTime()

  return [...transactions].sort((a, b) => {
    if (sortBy === 'date_asc') return dateValue(a) - dateValue(b)
    if (sortBy === 'amount_desc') return Number(b.amount || 0) - Number(a.amount || 0)
    if (sortBy === 'amount_asc') return Number(a.amount || 0) - Number(b.amount || 0)
    if (sortBy === 'category_asc') return text(a.category).localeCompare(text(b.category))
    return dateValue(b) - dateValue(a)
  })
}
