import { Router } from 'express';
import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { User } from './models/User.js';
import { Session } from './models/Session.js';

const derive = promisify(scrypt);
export const credentials = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{3,40}$/),
  password: z.string().min(10).max(128),
}).strict();
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password, salt, 64);
  return `${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  const [salt, encoded] = (stored || '').split(':');
  if (!salt || !encoded) return false;
  const expected = Buffer.from(encoded, 'hex');
  const actual = await derive(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export const digest = token => createHash('sha256').update(token).digest('hex');
function cookieToken(req) {
  const part = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('codearena_session='));
  const value = part?.slice('codearena_session='.length);
  return /^[a-f0-9]{64}$/.test(value || '') ? value : null;
}
export const publicUser = user => ({ id: String(user._id), username: user.username, role: user.role, demo: Boolean(user.demo) });
export async function identify(req, _res, next) {
  const token = cookieToken(req);
  if (token) {
    const session = await Session.findOne({ tokenHash: digest(token), expiresAt: { $gt: new Date() } }).lean();
    if (session) req.user = await User.findById(session.userId).lean();
  }
  next();
}
export function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Sign in to continue.' });
  next();
}
export const allow = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) return res.status(403).json({ error: 'Your account cannot perform this action.' });
  next();
};
// Same-origin custom header prevents cross-site form submissions. No CORS is enabled.
export function protectWrites(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('X-Requested-With') !== 'CodeArena') return res.status(403).json({ error: 'Required request protection header is missing.' });
  if (req.get('Origin')) {
    try { if (new URL(req.get('Origin')).host !== req.get('Host')) return res.status(403).json({ error: 'Cross-origin writes are not allowed.' }); }
    catch { return res.status(403).json({ error: 'Invalid request origin.' }); }
  }
  next();
}
export function authRouter() {
  const router = Router();
  const throttle = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many sign-in attempts. Try again later.' } });
  const options = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' };
  async function issue(req, res, user) {
    const prior = cookieToken(req);
    if (prior) await Session.deleteOne({ tokenHash: digest(prior) });
    const token = randomBytes(32).toString('hex');
    await Session.create({ tokenHash: digest(token), userId: user._id, expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000) });
    res.cookie('codearena_session', token, { ...options, maxAge: 12 * 60 * 60 * 1000 });
    return publicUser(user);
  }
  router.get('/me', identify, (req, res) => res.json({ user: req.user ? publicUser(req.user) : null }));
  router.post('/register', throttle, async (req, res) => {
    const parsed = credentials.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Use a 3–40 character username (letters, numbers, hyphens) and a 10–128 character password. No role field is accepted.' });
    const { username, password } = parsed.data;
    try {
      await User.init();
      const user = await User.create({ username, passwordHash: await hashPassword(password), role: 'citizen' });
      res.status(201).json({ user: await issue(req, res, user) });
    } catch (error) { if (error.code === 11000) return res.status(409).json({ error: 'Username is unavailable.' }); throw error; }
  });
  router.post('/login', throttle, async (req, res) => {
    const parsed = credentials.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Check username and password format.' });
    const user = await User.findOne({ username: parsed.data.username }).select('+passwordHash');
    // Perform the expensive hash even for an unknown username.
    const stored = user?.passwordHash || `${'0'.repeat(32)}:${'0'.repeat(128)}`;
    if (!(await verifyPassword(parsed.data.password, stored)) || !user) return res.status(401).json({ error: 'Invalid username or password.' });
    res.json({ user: await issue(req, res, user) });
  });
  router.post('/logout', async (req, res) => {
    const token = cookieToken(req);
    if (token) await Session.deleteOne({ tokenHash: digest(token) });
    res.clearCookie('codearena_session', options).json({ ok: true });
  });
  return router;
}
