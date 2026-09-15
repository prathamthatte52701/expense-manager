function monthKey(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthRange(monthYear) {
  const [year, month] = monthYear.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

function daysInMonth(monthYear) {
  const [year, month] = monthYear.split('-').map(Number);
  return new Date(year, month, 0).getDate();
}

function isValidMonthYear(value) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function isDateOnly(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidDateOnly(value) {
  return isDateOnly(value) && !Number.isNaN(new Date(`${value}T00:00:00+05:30`).getTime());
}

// A bare "YYYY-MM-DD" must never be parsed as UTC midnight (new Date() default) —
// that lands at 5:30 AM IST and shifts range-filter boundaries by a day near
// midnight-IST entries. Anchor explicitly to IST regardless of host TZ.
function istStartOfDay(value) {
  return isDateOnly(value) ? new Date(`${value}T00:00:00+05:30`) : new Date(value);
}

function istEndOfDay(value) {
  return isDateOnly(value) ? new Date(`${value}T23:59:59.999+05:30`) : new Date(value);
}

function dateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

module.exports = { monthKey, monthRange, daysInMonth, dateKey, isValidMonthYear, isValidDateOnly, istStartOfDay, istEndOfDay };
