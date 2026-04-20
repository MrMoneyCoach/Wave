import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import generateRouter from './routes/generate.js';
import stripeRouter, { stripeWebhookHandler } from './routes/stripe.js';
import lettersRouter from './routes/letters.js';
import profileRouter from './routes/profile.js';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));

// Stripe webhook MUST be mounted before express.json() so the raw body is preserved
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhookHandler,
);

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'compliancedesk-api' });
});

app.use('/api/generate', generateRouter);
app.use('/api/stripe', stripeRouter);
app.use('/api/letters', lettersRouter);
app.use('/api/profile', profileRouter);

app.use((err, req, res, next) => {
  console.error('[server error]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(port, () => {
  console.log(`ComplianceDesk API listening on http://localhost:${port}`);
});
