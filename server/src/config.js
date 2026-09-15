require('dotenv').config();

const CATEGORIES = ['Packing Material', 'Bus Travel Booking', 'Fuel Cost', 'Miscellaneous'];

module.exports = {
  port: process.env.PORT || 4000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/expense-manager',
  accessToken: process.env.ACCESS_TOKEN || '',
  groqApiKeys: (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '')
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean),
  groqModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  groqWhisperModel: process.env.GROQ_WHISPER_MODEL || 'whisper-large-v3',
  categories: CATEGORIES,
};
