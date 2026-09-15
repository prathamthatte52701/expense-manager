const MonthSetting = require('../models/MonthSetting');
const Transaction = require('../models/Transaction');
const { categories } = require('../config');
const { monthKey, monthRange, daysInMonth, dateKey, isValidMonthYear, istStartOfDay, istEndOfDay } = require('../utils/month');

async function getLimit(monthYear) {
  const setting = await MonthSetting.findOne({ monthYear }).lean();
  return setting?.monthlyLimit || 0;
}

async function setLimit(monthYear, monthlyLimit) {
  const setting = await MonthSetting.findOneAndUpdate(
    { monthYear },
    { $set: { monthlyLimit }, $setOnInsert: { monthYear } },
    { upsert: true, new: true }
  );
  return setting.monthlyLimit;
}

function statusFor(totalSpent, monthlyLimit) {
  if (!monthlyLimit) return 'no-limit';
  const percent = (totalSpent / monthlyLimit) * 100;
  if (percent > 100) return 'over';
  if (percent >= 85) return 'warning';
  return 'ok';
}

async function summary(monthYear = monthKey()) {
  const [monthlyLimit, totals] = await Promise.all([
    getLimit(monthYear),
    Transaction.aggregate([
      { $match: { monthYear } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
  ]);

  const categoryTotals = categories.map((category) => {
    const hit = totals.find((item) => item._id === category);
    return { category, total: hit?.total || 0, count: hit?.count || 0 };
  });
  const totalSpent = categoryTotals.reduce((sum, item) => sum + item.total, 0);
  const percentUsed = monthlyLimit > 0 ? Math.round((totalSpent / monthlyLimit) * 100) : 0;

  return {
    monthYear,
    monthlyLimit,
    totalSpent,
    remaining: monthlyLimit - totalSpent,
    percentUsed,
    status: statusFor(totalSpent, monthlyLimit),
    categoryTotals,
  };
}

async function dayBreakdown(monthYear = monthKey()) {
  const { start, end } = monthRange(monthYear);
  const totalDays = daysInMonth(monthYear);
  const todayKey = dateKey(new Date());

  const grouped = await Transaction.aggregate([
    { $match: { monthYear } },
    {
      $group: {
        _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'Asia/Kolkata' } }, category: '$category' },
        total: { $sum: '$amount' },
      },
    },
  ]);

  const byDay = new Map();
  grouped.forEach((item) => {
    const day = item._id.day;
    if (!byDay.has(day)) byDay.set(day, {});
    byDay.get(day)[item._id.category] = item.total;
  });

  const days = [];
  for (let d = 1; d <= totalDays; d += 1) {
    const date = new Date(start.getFullYear(), start.getMonth(), d);
    const key = dateKey(date);
    const categoryValues = byDay.get(key) || {};
    const categoriesObj = {};
    let total = 0;
    categories.forEach((category) => {
      const value = categoryValues[category] || 0;
      categoriesObj[category] = value;
      total += value;
    });
    days.push({
      date: key,
      status: key === todayKey ? 'today' : key < todayKey ? 'past' : 'upcoming',
      total,
      categories: categoriesObj,
    });
  }
  return days;
}

async function listMonths() {
  const [txMonths, settingMonths] = await Promise.all([
    Transaction.distinct('monthYear'),
    MonthSetting.distinct('monthYear'),
  ]);
  const months = [...new Set([...txMonths, ...settingMonths, monthKey()])];
  return months.sort().reverse();
}

async function compare(months) {
  if (months && months.some((m) => !isValidMonthYear(m))) {
    const error = new Error('Every month in "months" must be in YYYY-MM format.');
    error.status = 400;
    throw error;
  }
  const targetMonths = months && months.length ? months : await listMonths();
  const rows = await Transaction.aggregate([
    { $match: { monthYear: { $in: targetMonths } } },
    { $group: { _id: { monthYear: '$monthYear', category: '$category' }, total: { $sum: '$amount' } } },
  ]);
  return targetMonths
    .slice()
    .sort()
    .map((monthYear) => {
      const categoryTotals = {};
      categories.forEach((category) => {
        const hit = rows.find((row) => row._id.monthYear === monthYear && row._id.category === category);
        categoryTotals[category] = hit?.total || 0;
      });
      return { monthYear, categoryTotals };
    });
}

function transactionQuery({ monthYear, category, startDate, endDate }) {
  const query = {};
  if (category && categories.includes(category)) query.category = category;
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = istStartOfDay(startDate);
    if (endDate) query.date.$lte = istEndOfDay(endDate);
  } else if (monthYear) {
    const { start, end } = monthRange(monthYear);
    query.date = { $gte: start, $lt: end };
  }
  return query;
}

module.exports = { getLimit, setLimit, summary, dayBreakdown, listMonths, compare, transactionQuery, statusFor };
