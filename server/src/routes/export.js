const express = require('express');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
const Transaction = require('../models/Transaction');
const { summary } = require('../services/budget');
const { monthKey, isValidMonthYear, isValidDateOnly, istStartOfDay, istEndOfDay } = require('../utils/month');

const router = express.Router();
const FIELDS = ['date', 'category', 'amount', 'note', 'source', 'monthYear'];
// Excel/Sheets treats a leading =, +, -, or @ as a formula. Prefix with a tab
// so free-text notes (including voice transcripts) can never execute as one.
const FORMULA_PREFIX = /^[=+\-@]/;

function csvSafe(value) {
  const str = String(value ?? '');
  return FORMULA_PREFIX.test(str) ? `\t${str}` : str;
}

function sanitizeForCsv(rows) {
  return rows.map((row) => ({ ...row, note: csvSafe(row.note) }));
}

router.param('monthYear', (req, res, next, monthYear) => {
  if (!isValidMonthYear(monthYear)) return res.status(400).json({ message: 'monthYear must be in YYYY-MM format.' });
  return next();
});

function checkRangeParams(req, res, next) {
  const { start, end } = req.query;
  if (!start || !end) return res.status(400).json({ message: 'start and end query params are required.' });
  if (!isValidDateOnly(start) || !isValidDateOnly(end)) return res.status(400).json({ message: 'start/end must be in YYYY-MM-DD format.' });
  return next();
}

async function loadRange(startDate, endDate) {
  const query = { date: { $gte: istStartOfDay(startDate), $lte: istEndOfDay(endDate) } };
  return Transaction.find(query).sort({ date: 1 }).lean();
}

function buildPdf(res, filename, title, totals, transactions) {
  const doc = new PDFDocument({ margin: 42 });
  res.header('Content-Type', 'application/pdf');
  res.attachment(filename);
  doc.pipe(res);
  doc.fontSize(18).text(title);
  doc.moveDown().fontSize(11);
  doc.text(`Monthly limit: Rs. ${totals.monthlyLimit}`);
  doc.text(`Total spent: Rs. ${totals.totalSpent}`);
  doc.text(`Remaining: Rs. ${totals.remaining}`);
  doc.moveDown().fontSize(13).text('Category subtotals');
  doc.fontSize(10);
  totals.categoryTotals.forEach((category) => {
    doc.text(`${category.category}: Rs. ${category.total} (${category.count} entries)`);
  });
  doc.moveDown().fontSize(13).text('Transactions');
  doc.fontSize(9);
  transactions.forEach((tx) => {
    doc.text(`${new Date(tx.date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })} | ${tx.category} | Rs. ${tx.amount} | ${tx.note || '-'} | ${tx.source}`);
  });
  doc.end();
}

router.get('/range.json', checkRangeParams, async (req, res) => {
  const { start, end } = req.query;
  const transactions = await loadRange(start, end);
  res.header('Content-Type', 'application/json');
  res.attachment(`expenses-${start}_to_${end}.json`);
  res.send(JSON.stringify({ start, end, transactions }, null, 2));
});

router.get('/range.csv', checkRangeParams, async (req, res) => {
  const { start, end } = req.query;
  const transactions = await loadRange(start, end);
  const parser = new Parser({ fields: FIELDS });
  res.header('Content-Type', 'text/csv');
  res.attachment(`expenses-${start}_to_${end}.csv`);
  res.send(parser.parse(sanitizeForCsv(transactions)));
});

router.get('/range.pdf', checkRangeParams, async (req, res) => {
  const { start, end } = req.query;
  const transactions = await loadRange(start, end);
  const totalSpent = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const { categories } = require('../config');
  const categoryTotals = categories.map((category) => {
    const matching = transactions.filter((tx) => tx.category === category);
    return { category, total: matching.reduce((sum, tx) => sum + tx.amount, 0), count: matching.length };
  });
  const totals = { monthlyLimit: 0, totalSpent, remaining: -totalSpent, categoryTotals };
  buildPdf(res, `expenses-${start}_to_${end}.pdf`, `Expense Report ${start} to ${end}`, totals, transactions);
});

router.get('/:monthYear.json', async (req, res) => {
  const monthYear = req.params.monthYear || monthKey();
  const [transactions, totals] = await Promise.all([
    Transaction.find({ monthYear }).sort({ date: 1 }).lean(),
    summary(monthYear),
  ]);
  res.header('Content-Type', 'application/json');
  res.attachment(`expenses-${monthYear}.json`);
  res.send(JSON.stringify({ monthYear, summary: totals, transactions }, null, 2));
});

router.get('/:monthYear.csv', async (req, res) => {
  const monthYear = req.params.monthYear || monthKey();
  const transactions = await Transaction.find({ monthYear }).sort({ date: 1 }).lean();
  const parser = new Parser({ fields: FIELDS });
  res.header('Content-Type', 'text/csv');
  res.attachment(`expenses-${monthYear}.csv`);
  res.send(parser.parse(sanitizeForCsv(transactions)));
});

router.get('/:monthYear.pdf', async (req, res) => {
  const monthYear = req.params.monthYear || monthKey();
  const [transactions, totals] = await Promise.all([
    Transaction.find({ monthYear }).sort({ date: 1 }).lean(),
    summary(monthYear),
  ]);
  buildPdf(res, `expenses-${monthYear}.pdf`, `Monthly Expense Report - ${monthYear}`, totals, transactions);
});

module.exports = router;
