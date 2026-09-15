const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const auth = require('./middleware/auth');
const budgetRoutes = require('./routes/budget');
const exportRoutes = require('./routes/export');
const { mongoUri, port } = require('./config');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/budget', auth, budgetRoutes);
app.use('/api/export', auth, exportRoutes);

app.use((req, res) => res.status(404).json({ message: 'Not found.' }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Something went wrong.' });
});

async function bootstrap() {
  await mongoose.connect(mongoUri, { family: 4 });
  app.listen(port, () => console.log(`Expense Manager API running on http://localhost:${port}`));
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
