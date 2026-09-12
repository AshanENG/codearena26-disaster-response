import express from 'express';
import mongoose from 'mongoose';
import { Report } from './models/Report.js';
import { reportInput, listInput } from './validation.js';
import path from 'node:path';

// Injection supports isolated HTTP contract tests; production always uses Mongoose.
export function createApp({ reports = Report, connection = mongoose.connection, databaseConfigured = false, clientDirectory } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.get('/api/health', (_req, res) => {
    const connected = connection.readyState === 1;
    res.status(connected ? 200 : 503).json({
      server: 'ready', ready: connected,
      database: { configured: databaseConfigured, status: ['disconnected', 'connected', 'connecting', 'disconnecting'][connection.readyState] || 'unknown' },
    });
  });
  function requireDatabase(_req, res, next) {
    if (connection.readyState !== 1) return res.status(503).json({ error: 'Database unavailable. Try again after the database is connected.' });
    next();
  }
  app.post('/api/reports', (req, res, next) => {
    if (!req.is('application/json')) return res.status(415).json({ error: 'Content-Type must be application/json.' });
    const parsed = reportInput.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid report.', fields: parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })) });
    req.report = parsed.data;
    next();
  }, requireDatabase, async (req, res) => {
    const report = await reports.create(req.report);
    res.status(201).json({ report });
  });
  app.get('/api/reports', (req, res, next) => {
    const parsed = listInput.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: 'Use limit 1–100 and offset 0–100000; no other query parameters are supported.' });
    req.pagination = parsed.data;
    next();
  }, requireDatabase, async (req, res) => {
    const { limit, offset } = req.pagination;
    const rows = await reports.find().sort({ createdAt: -1, _id: -1 }).skip(offset).limit(limit + 1).lean();
    res.json({ reports: rows.slice(0, limit), hasMore: rows.length > limit, limit, offset });
  });
  // Optional single-process hosting: API and built React assets share one origin.
  // Unknown API routes must never fall through to the frontend HTML.
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));
  if (clientDirectory) {
    app.use(express.static(clientDirectory));
    app.get('/', (_req, res) => res.sendFile(path.join(clientDirectory, 'index.html')));
  }
  app.use((_req, res) => res.status(404).json({ error: 'Not found.' }));
  app.use((error, _req, res, _next) => {
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Request body too large.' });
    // Never return or log driver errors, request bodies, connection strings, or API keys.
    res.status(503).json({ error: 'Unable to complete the request. Please try again.' });
  });
  return app;
}
