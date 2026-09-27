import { Router } from 'express';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { db } from './db.js';
import { TRACKS } from './data/subjects.js';

const SESSION_DAYS = 30;
const COOKIE = 'gcse_session';

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const candidate = scryptSync(password, salt, 64);
  return timingSafeEqual(candidate, Buffer.from(hash, 'hex'));
}

function startSession(res, userId) {
  const token = randomBytes(32).toString('hex');
  const expires = Date.now() + SESSION_DAYS * 864e5;
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expires);
  res.cookie(COOKIE, token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: SESSION_DAYS * 864e5,
  });
}

const publicUser = (u) => ({ id: u.id, name: u.name, username: u.username, track: u.track });

export function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE];
  const row = token && db.prepare(`
    SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > ?`).get(token, Date.now());
  if (!row) return res.status(401).json({ error: 'Please log in' });
  req.user = row;
  next();
}

// Very small in-memory limiter for login attempts (per IP).
const attempts = new Map();
function tooManyAttempts(ip) {
  const now = Date.now();
  const list = (attempts.get(ip) || []).filter((t) => now - t < 15 * 60e3);
  list.push(now);
  attempts.set(ip, list);
  return list.length > 10;
}

export const authRouter = Router();

authRouter.post('/register', (req, res) => {
  const name = String(req.body?.name || '').trim();
  const username = String(req.body?.username || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const track = req.body?.track;

  if (!name || name.length > 40) return res.status(400).json({ error: 'Enter your first name (max 40 characters).' });
  if (!/^[a-z0-9_]{3,20}$/.test(username)) return res.status(400).json({ error: 'Username must be 3–20 letters, numbers or underscores.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  if (!TRACKS[track]) return res.status(400).json({ error: 'Choose which exams you are preparing for.' });
  if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) {
    return res.status(409).json({ error: 'That username is taken.' });
  }

  const { lastInsertRowid: id } = db.prepare(
    'INSERT INTO users (name, username, password_hash, track) VALUES (?, ?, ?, ?)',
  ).run(name, username, hashPassword(password), track);

  const add = db.prepare('INSERT INTO user_subjects (user_id, subject, target_grade, current_grade, exam_date) VALUES (?, ?, ?, ?, ?)');
  for (const s of TRACKS[track].subjects) add.run(id, s.subject, s.target, s.current, s.exam_date);

  startSession(res, id);
  res.status(201).json({ user: publicUser({ id, name, username, track }) });
});

authRouter.post('/login', (req, res) => {
  if (tooManyAttempts(req.ip)) return res.status(429).json({ error: 'Too many attempts. Wait 15 minutes and try again.' });
  const username = String(req.body?.username || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Wrong username or password.' });
  }
  startSession(res, user.id);
  res.json({ user: publicUser(user) });
});

authRouter.post('/logout', (req, res) => {
  const token = req.cookies?.[COOKIE];
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  res.clearCookie(COOKIE);
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));
