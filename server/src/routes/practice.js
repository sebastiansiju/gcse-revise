import { Router } from 'express';
import { db } from '../db.js';

export const practiceRouter = Router();

// Topics for a subject, with the user's accuracy on each.
practiceRouter.get('/topics', (req, res) => {
  const rows = db.prepare(`
    SELECT q.topic, COUNT(DISTINCT q.id) AS questions,
      COUNT(a.id) AS attempts, COALESCE(SUM(a.correct), 0) AS correct
    FROM questions q LEFT JOIN attempts a ON a.question_id = q.id AND a.user_id = ?
    WHERE q.subject = ? GROUP BY q.topic ORDER BY q.topic`).all(req.user.id, String(req.query.subject || ''));
  res.json({ topics: rows });
});

// Smart selection: questions answered wrong last time come first, then unseen ones,
// then ones answered correctly (least recently practised first). A little randomness keeps it fresh.
practiceRouter.get('/questions', (req, res) => {
  const subject = String(req.query.subject || '');
  const topic = req.query.topic ? String(req.query.topic) : null;
  const count = Math.min(Math.max(parseInt(req.query.count, 10) || 10, 1), 30);

  const rows = db.prepare(`
    SELECT q.id, q.subject, q.topic, q.grade, q.type, q.prompt, q.options,
      (SELECT correct FROM attempts WHERE user_id = ? AND question_id = q.id ORDER BY id DESC LIMIT 1) AS last_correct,
      (SELECT COUNT(*) FROM attempts WHERE user_id = ? AND question_id = q.id AND correct = 1) AS times_correct
    FROM questions q WHERE q.subject = ? AND (? IS NULL OR q.topic = ?)`)
    .all(req.user.id, req.user.id, subject, topic, topic);

  const scored = rows.map((q) => {
    let priority;
    if (q.last_correct === 0) priority = 3;
    else if (q.last_correct === null) priority = 2;
    else priority = 1 / (1 + q.times_correct);
    return { ...q, priority: priority + Math.random() };
  });
  scored.sort((a, b) => b.priority - a.priority);

  const questions = scored.slice(0, count).map((q) => ({
    id: q.id, subject: q.subject, topic: q.topic, grade: q.grade, type: q.type, prompt: q.prompt,
    options: q.options ? shuffle(JSON.parse(q.options)) : null,
    status: q.last_correct === 0 ? 'retry' : q.last_correct === null ? 'new' : 'review',
  }));
  res.json({ questions });
});

practiceRouter.post('/answer', (req, res) => {
  const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(String(req.body?.questionId || ''));
  if (!q) return res.status(404).json({ error: 'Question not found' });
  const given = String(req.body?.answer ?? '').slice(0, 200);
  const expected = JSON.parse(q.answer);
  const correct = q.type === 'mcq' ? given === expected : expected.some((a) => answersMatch(given, a));

  db.prepare('INSERT INTO attempts (user_id, question_id, correct) VALUES (?, ?, ?)').run(req.user.id, q.id, correct ? 1 : 0);
  res.json({ correct, correctAnswer: Array.isArray(expected) ? expected[0] : expected, explanation: q.explanation });
});

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Lenient comparison for typed answers: ignores spaces, £, units and trailing zeros; understands fractions.
function normalise(s) {
  return s.toLowerCase().replace(/[£$,°\s]/g, '').replace(/^[a-z]=/, '').replace(/(cm³|cm²|cm|mph|m\/s|kg|g\/cm³|j|v|degrees)$/g, '');
}
function toNumber(s) {
  if (/^-?\d+\/\d+$/.test(s)) { const [a, b] = s.split('/').map(Number); return b ? a / b : null; }
  const n = Number(s);
  return s !== '' && Number.isFinite(n) ? n : null;
}
export function answersMatch(given, expected) {
  // Mixed numbers like "1 1/2": compare before stripping spaces.
  const mix = (v) => { const m = v.trim().match(/^(\d+)\s+(\d+)\/(\d+)$/); return m ? +m[1] + m[2] / m[3] : null; };
  const gm = mix(given), em = mix(expected);
  const g = gm ?? toNumber(normalise(given));
  const e = em ?? toNumber(normalise(expected));
  if (g !== null && e !== null) return Math.abs(g - e) < 1e-9;
  return normalise(given) === normalise(expected);
}
