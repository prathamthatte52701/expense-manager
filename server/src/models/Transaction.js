const mongoose = require('mongoose');
const { monthKey } = require('../utils/month');

const transactionSchema = new mongoose.Schema(
  {
    category: { type: String, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    note: { type: String, default: '', trim: true },
    date: { type: Date, default: Date.now },
    time: { type: String, default: '', trim: true },
    source: { type: String, enum: ['manual', 'voice'], default: 'manual' },
    rawTranscript: { type: String, default: '' },
    confidence: { type: Number, default: null },
    monthYear: { type: String, index: true },
  },
  { timestamps: true }
);

transactionSchema.pre('validate', function deriveMonth() {
  this.monthYear = monthKey(this.date || new Date());
});

transactionSchema.index({ monthYear: 1, date: -1 });
transactionSchema.index({ monthYear: 1, category: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
