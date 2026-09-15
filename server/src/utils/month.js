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

function dateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

module.exports = { monthKey, monthRange, daysInMonth, dateKey, isValidMonthYear };
