const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const { categories } = require('../config');
const { monthKey, isValidMonthYear, isValidDateOnly, istStartOfDay } = require('../utils/month');

const MAX_AMOUNT = 1e7; // ₹1 crore — sane ceiling, prevents formatting/layout overflow
const MAX_NOTE_LENGTH = 500;
const MAX_TRANSCRIPT_LENGTH = 2000;
const { getLimit, setLimit, summary, dayBreakdown, listMonths, compare, transactionQuery } = require('../services/budget');
const { transcribeAudio, extractExpense } = require('../services/groq');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const router = express.Router();

// ponytail: in-memory fixed-window limiter, single-process only — swap for a
// shared store (Redis) if this ever runs behind multiple instances.
const VOICE_RATE_LIMIT = 10; // requests
const VOICE_RATE_WINDOW_MS = 60 * 1000;
const voiceHits = new Map();

function voiceRateLimit(req, res, next) {
  const key = req.ip;
  const now = Date.now();
  const windowStart = now - VOICE_RATE_WINDOW_MS;
  const hits = (voiceHits.get(key) || []).filter((t) => t > windowStart);
  if (hits.length >= VOICE_RATE_LIMIT) {
    return res.status(429).json({ message: 'Too many voice requests. Wait a minute and try again.' });
  }
  hits.push(now);
  voiceHits.set(key, hits);
  return next();
}

router.param('monthYear', (req, res, next, monthYear) => {
  if (!isValidMonthYear(monthYear)) return res.status(400).json({ message: 'monthYear must be in YYYY-MM format.' });
  return next();
});

function checkQueryMonthYear(req, res, next) {
  if (req.query.monthYear && !isValidMonthYear(req.query.monthYear)) {
    return res.status(400).json({ message: 'monthYear must be in YYYY-MM format.' });
  }
  return next();
}

router.get('/summary', checkQueryMonthYear, async (req, res) => {
  res.json(await summary(req.query.monthYear || monthKey()));
});

router.get('/days', checkQueryMonthYear, async (req, res) => {
  res.json(await dayBreakdown(req.query.monthYear || monthKey()));
});

router.get('/dashboard', checkQueryMonthYear, async (req, res) => {
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

router.get('/compare', async (req, res, next) => {
  try {
    const months = req.query.months ? req.query.months.split(',').map((m) => m.trim()).filter(Boolean) : undefined;
    res.json(await compare(months));
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    return next(error);
  }
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

function checkDateRange(req, res, next) {
  const { startDate, endDate } = req.query;
  if ((startDate && !isValidDateOnly(startDate)) || (endDate && !isValidDateOnly(endDate))) {
    return res.status(400).json({ message: 'startDate/endDate must be in YYYY-MM-DD format.' });
  }
  return next();
}

router.get('/transactions', checkQueryMonthYear, checkDateRange, async (req, res) => {
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
  if (numericAmount > MAX_AMOUNT) return res.status(400).json({ message: `amount must not exceed ₹${MAX_AMOUNT.toLocaleString('en-IN')}.` });
  if (note && String(note).length > MAX_NOTE_LENGTH) return res.status(400).json({ message: `note must be ${MAX_NOTE_LENGTH} characters or fewer.` });
  if (rawTranscript && String(rawTranscript).length > MAX_TRANSCRIPT_LENGTH) return res.status(400).json({ message: `rawTranscript must be ${MAX_TRANSCRIPT_LENGTH} characters or fewer.` });

  const transaction = await Transaction.create({
    category,
    amount: numericAmount,
    date: date ? istStartOfDay(date) : new Date(),
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
    if (numericAmount > MAX_AMOUNT) return res.status(400).json({ message: `amount must not exceed ₹${MAX_AMOUNT.toLocaleString('en-IN')}.` });
    transaction.amount = numericAmount;
  }
  if (date !== undefined) transaction.date = istStartOfDay(date);
  if (note !== undefined) {
    if (String(note).length > MAX_NOTE_LENGTH) return res.status(400).json({ message: `note must be ${MAX_NOTE_LENGTH} characters or fewer.` });
    transaction.note = note;
  }

  await transaction.save();
  res.json(transaction);
});

router.delete('/transactions/:id', async (req, res) => {
  const transaction = await Transaction.findByIdAndDelete(req.params.id);
  if (!transaction) return res.status(404).json({ message: 'Transaction not found.' });
  res.json({ deleted: true });
});

router.post('/voice-entry', voiceRateLimit, upload.single('audio'), async (req, res) => {
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

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: 'Audio file exceeds the 15MB limit.' });
    return res.status(400).json({ message: err.message });
  }
  return next(err);
});

module.exports = router;
