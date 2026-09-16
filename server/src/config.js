require('dotenv').config();
process.env.TZ = 'Asia/Kolkata';

// Seed data for a fresh database only — the live category list lives in the
// Category collection (see services/category.js), never here.
const SEED_CATEGORIES = ['Packing Material', 'Bus Travel Booking', 'Fuel Cost', 'Miscellaneous'];
const MAX_CATEGORIES = 12;
const MAX_CATEGORY_NAME_LENGTH = 40;

module.exports = {
  port: process.env.PORT || 4000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/expense-manager',
  accessToken: process.env.ACCESS_TOKEN || '',
  groqApiKeys: (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '')
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean),
  groqModel: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
  groqWhisperModel: process.env.GROQ_WHISPER_MODEL || 'whisper-large-v3',
  seedCategories: SEED_CATEGORIES,
  maxCategories: MAX_CATEGORIES,
  maxCategoryNameLength: MAX_CATEGORY_NAME_LENGTH,
};
