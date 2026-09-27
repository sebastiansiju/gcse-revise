import { Router } from 'express';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { one, run, transaction } from './db.js';
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

async function startSession(res, userId) {
  const token = randomBytes(32).toString('hex');
  const expires = Date.now() + SESSION_DAYS * 864e5;
  await run('INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)', [token, userId, expires]);
  res.cookie(COOKIE, token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: SESSION_DAYS * 864e5,
  });
}

const publicUser = (u) => ({ id: u.id, name: u.name, username: u.username, track: u.track });

export async function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE];
  const row = token && await one(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = $1 AND s.expires_at > $2`, [token, Date.now()]);
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

authRouter.post('/register', async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const username = String(req.body?.username || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const track = req.body?.track;

  if (!name || name.length > 40) return res.status(400).json({ error: 'Enter your first name (max 40 characters).' });
  if (!/^[a-z0-9_]{3,20}$/.test(username)) return res.status(400).json({ error: 'Username must be 3–20 letters, numbers or underscores.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  if (!Object.hasOwn(TRACKS, track)) return res.status(400).json({ error: 'Choose which exams you are preparing for.' });
  if (await one('SELECT 1 FROM users WHERE username = $1', [username])) {
    return res.status(409).json({ error: 'That username is taken.' });
  }

  const id = await transaction(async (c) => {
    const { rows } = await c.query(
      'INSERT INTO users (name, username, password_hash, track) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, username, hashPassword(password), track]);
    for (const s of TRACKS[track].subjects) {
      await c.query(
        'INSERT INTO user_subjects (user_id, subject, target_grade, current_grade, exam_date) VALUES ($1, $2, $3, $4, $5)',
        [rows[0].id, s.subject, s.target, s.current, s.exam_date]);
    }
    return rows[0].id;
  });

  await startSession(res, id);
  res.status(201).json({ user: publicUser({ id, name, username, track }) });
});

authRouter.post('/login', async (req, res) => {
  if (tooManyAttempts(req.ip)) return res.status(429).json({ error: 'Too many attempts. Wait 15 minutes and try again.' });
  const username = String(req.body?.username || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const user = await one('SELECT * FROM users WHERE username = $1', [username]);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Wrong username or password.' });
  }
  await startSession(res, user.id);
  res.json({ user: publicUser(user) });
});

authRouter.post('/logout', async (req, res) => {
  const token = req.cookies?.[COOKIE];
  if (token) await run('DELETE FROM sessions WHERE token = $1', [token]);
  res.clearCookie(COOKIE);
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));
