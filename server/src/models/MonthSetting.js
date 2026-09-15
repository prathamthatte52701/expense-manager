const mongoose = require('mongoose');

const monthSettingSchema = new mongoose.Schema(
  {
    monthYear: { type: String, required: true, unique: true },
    monthlyLimit: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MonthSetting', monthSettingSchema);
