const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const { categories } = require('../config');
const { monthKey } = require('../utils/month');
const { getLimit, setLimit, summary, dayBreakdown, listMonths, compare, transactionQuery } = require('../services/budget');
const { transcribeAudio, extractExpense } = require('../services/groq');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const router = express.Router();

router.get('/summary', async (req, res) => {
  res.json(await summary(req.query.monthYear || monthKey()));
});

router.get('/days', async (req, res) => {
  res.json(await dayBreakdown(req.query.monthYear || monthKey()));
});

router.get('/dashboard', async (req, res) => {
  const monthYear = req.query.monthYear || monthKey();
  const [summaryData, days, transactions] = await Promise.all([
    summary(monthYear),
    dayBreakdown(monthYear),
    Transaction.find(transactionQuery({ monthYear })).sort({ date: -1, createdAt: -1 }).limit(8).lean(),
  ]);
  res.json({ summary: summaryData, days, transactions });
});

router.get('/months', async (req, res) => {
  res.json(await listMonths());
});

router.get('/compare', async (req, res) => {
  const months = req.query.months ? req.query.months.split(',').map((m) => m.trim()).filter(Boolean) : undefined;
  res.json(await compare(months));
});

router.get('/limit/:monthYear', async (req, res) => {
  res.json({ monthYear: req.params.monthYear, monthlyLimit: await getLimit(req.params.monthYear) });
});

router.patch('/limit/:monthYear', async (req, res) => {
  const monthlyLimit = Number(req.body.monthlyLimit);
  if (!Number.isFinite(monthlyLimit) || monthlyLimit < 0) return res.status(400).json({ message: 'monthlyLimit must be zero or more.' });
  const saved = await setLimit(req.params.monthYear, monthlyLimit);
  res.json({ monthYear: req.params.monthYear, monthlyLimit: saved });
});

router.get('/transactions', async (req, res) => {
  const { monthYear, category, startDate, endDate } = req.query;
  const query = transactionQuery({ monthYear, category, startDate, endDate });
  const transactions = await Transaction.find(query).sort({ date: -1, createdAt: -1 }).lean();
  res.json(transactions);
});

router.post('/transactions', async (req, res) => {
  const { category, amount, date, note, source, rawTranscript } = req.body;
  if (!categories.includes(category)) return res.status(400).json({ message: `category must be one of ${categories.join(', ')}` });
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) return res.status(400).json({ message: 'amount must be greater than 0.' });

  const transaction = await Transaction.create({
    category,
    amount: numericAmount,
    date: date ? new Date(date) : new Date(),
    note: note || '',
    source: source === 'voice' ? 'voice' : 'manual',
    rawTranscript: rawTranscript || '',
  });
  res.status(201).json(transaction);
});

router.param('id', (req, res, next, id) => {
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid transaction id.' });
  return next();
});

router.put('/transactions/:id', async (req, res) => {
  const transaction = await Transaction.findById(req.params.id);
  if (!transaction) return res.status(404).json({ message: 'Transaction not found.' });

  const { category, amount, date, note } = req.body;
  if (category !== undefined) {
    if (!categories.includes(category)) return res.status(400).json({ message: `category must be one of ${categories.join(', ')}` });
    transaction.category = category;
  }
  if (amount !== undefined) {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return res.status(400).json({ message: 'amount must be greater than 0.' });
    transaction.amount = numericAmount;
  }
  if (date !== undefined) transaction.date = new Date(date);
  if (note !== undefined) transaction.note = note;

  await transaction.save();
  res.json(transaction);
});

router.delete('/transactions/:id', async (req, res) => {
  const transaction = await Transaction.findByIdAndDelete(req.params.id);
  if (!transaction) return res.status(404).json({ message: 'Transaction not found.' });
  res.json({ deleted: true });
});

router.post('/voice-entry', upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No audio file received.' });

  let transcript = '';
  try {
    transcript = await transcribeAudio(req.file.buffer, req.file.originalname, req.file.mimetype);
  } catch (error) {
    console.error(error);
    return res.status(502).json({ message: 'Transcription failed. Try again.' });
  }

  if (!transcript.trim()) {
    return res.json({ transcript: '', category: null, amount: null });
  }

  try {
    const { category, amount } = await extractExpense(transcript);
    return res.json({ transcript, category, amount });
  } catch (error) {
    console.error(error);
    return res.json({ transcript, category: null, amount: null });
  }
});

module.exports = router;
