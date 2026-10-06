import express from 'express';
import cookieParser from 'cookie-parser';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { initDb } from './db.js';
import { authRouter, requireAuth } from './auth.js';
import { practiceRouter } from './routes/practice.js';
import { studyRouter } from './routes/study.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // behind the host's proxy: real client IPs for the login limiter
app.use(express.json({ limit: '20kb' }));
app.use(cookieParser());
app.use((req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin' });
  next();
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Set up the schema once per process before the first database request (serverless hosts have no startup hook).
let ready;
app.use('/api', (req, res, next) => {
  ready ??= initDb().catch((err) => { ready = undefined; throw err; });
  ready.then(() => next(), next);
});

app.use('/api/auth', authRouter);
app.use('/api/practice', requireAuth, practiceRouter);
app.use('/api', requireAuth, studyRouter);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Serve the built React app when it exists (npm run build).
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

export default app;
