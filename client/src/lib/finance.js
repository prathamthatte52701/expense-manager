export function monthLabel(monthYear, options = { month: 'long', year: 'numeric' }) {
  return new Intl.DateTimeFormat('en-IN', options).format(new Date(`${monthYear}-01T12:00:00`))
}

export function shiftMonth(monthYear, amount) {
  const date = new Date(`${monthYear}-01T12:00:00`)
  date.setMonth(date.getMonth() + amount)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function monthDays(monthYear) {
  const start = new Date(`${monthYear}-01T12:00:00`)
  const startOffset = start.getDay()
  const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
  const daysInPreviousMonth = new Date(start.getFullYear(), start.getMonth(), 0).getDate()
  const cells = []

  for (let index = 0; index < 42; index += 1) {
    const dayOffset = index - startOffset + 1
    const date = new Date(start.getFullYear(), start.getMonth(), dayOffset, 12)
    const inMonth = dayOffset > 0 && dayOffset <= daysInMonth
    const displayDay = dayOffset <= 0 ? daysInPreviousMonth + dayOffset : dayOffset > daysInMonth ? dayOffset - daysInMonth : dayOffset
    cells.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
      day: displayDay,
      inMonth,
    })
  }

  return cells
}

export function compactDate(dateValue) {
  if (!dateValue) return ''
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(`${String(dateValue).slice(0, 10)}T12:00:00`))
}
