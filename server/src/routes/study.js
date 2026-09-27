import { Router } from 'express';
import { db } from '../db.js';
import { SUBJECTS } from '../data/subjects.js';

export const studyRouter = Router();

const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const validSubject = (s) => s == null || s === '' || Object.hasOwn(SUBJECTS, s);

// ---------- Subjects ----------
studyRouter.get('/subjects', (req, res) => {
  const mine = db.prepare('SELECT subject, target_grade, current_grade, exam_date FROM user_subjects WHERE user_id = ? ORDER BY exam_date')
    .all(req.user.id).map((s) => ({ ...s, name: SUBJECTS[s.subject]?.name ?? s.subject, bank: !!SUBJECTS[s.subject]?.bank }));
  const catalogue = Object.entries(SUBJECTS).map(([id, s]) => ({ id, ...s }));
  res.json({ subjects: mine, catalogue });
});

studyRouter.put('/subjects/:subject', (req, res) => {
  const { subject } = req.params;
  if (!Object.hasOwn(SUBJECTS, subject)) return res.status(400).json({ error: 'Unknown subject' });
  const grade = (g) => (g === null || g === '' || g === undefined ? null : Number(g));
  const target = grade(req.body?.target_grade);
  const current = grade(req.body?.current_grade);
  for (const g of [target, current]) {
    if (g !== null && !(Number.isInteger(g) && g >= 1 && g <= 9)) return res.status(400).json({ error: 'Grades must be 1–9' });
  }
  const examDate = req.body?.exam_date || null;
  if (examDate && !isDate(examDate)) return res.status(400).json({ error: 'Invalid exam date' });

  db.prepare(`INSERT INTO user_subjects (user_id, subject, target_grade, current_grade, exam_date) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, subject) DO UPDATE SET target_grade=excluded.target_grade, current_grade=excluded.current_grade, exam_date=excluded.exam_date`)
    .run(req.user.id, subject, target, current, examDate);
  res.json({ ok: true });
});

studyRouter.delete('/subjects/:subject', (req, res) => {
  db.prepare('DELETE FROM user_subjects WHERE user_id = ? AND subject = ?').run(req.user.id, req.params.subject);
  res.json({ ok: true });
});

// ---------- Tasks ----------
studyRouter.get('/tasks', (req, res) => {
  const tasks = db.prepare(`SELECT id, title, subject, due_date, done FROM tasks WHERE user_id = ?
    ORDER BY done, due_date IS NULL, due_date, id`).all(req.user.id);
  res.json({ tasks: tasks.map((t) => ({ ...t, done: !!t.done })) });
});

studyRouter.post('/tasks', (req, res) => {
  const title = String(req.body?.title || '').trim();
  const subject = req.body?.subject || null;
  const due = req.body?.due_date || null;
  if (!title || title.length > 200) return res.status(400).json({ error: 'Task needs a title (max 200 characters).' });
  if (!validSubject(subject)) return res.status(400).json({ error: 'Unknown subject' });
  if (due && !isDate(due)) return res.status(400).json({ error: 'Invalid date' });
  const { lastInsertRowid } = db.prepare('INSERT INTO tasks (user_id, title, subject, due_date) VALUES (?, ?, ?, ?)')
    .run(req.user.id, title, subject, due);
  res.status(201).json({ task: { id: Number(lastInsertRowid), title, subject, due_date: due, done: false } });
});

studyRouter.patch('/tasks/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const done = req.body?.done === undefined ? task.done : req.body.done ? 1 : 0;
  db.prepare('UPDATE tasks SET done = ? WHERE id = ?').run(done, task.id);
  res.json({ ok: true });
});

studyRouter.delete('/tasks/:id', (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

// ---------- Focus sessions ----------
studyRouter.post('/sessions', (req, res) => {
  const minutes = Number(req.body?.minutes);
  const subject = req.body?.subject || null;
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240) return res.status(400).json({ error: 'Minutes must be 1–240' });
  if (!validSubject(subject)) return res.status(400).json({ error: 'Unknown subject' });
  db.prepare('INSERT INTO study_sessions (user_id, subject, minutes) VALUES (?, ?, ?)').run(req.user.id, subject, minutes);
  res.status(201).json({ ok: true });
});

// ---------- Stats ----------
function streak(userId) {
  const days = db.prepare(`
    SELECT DISTINCT date(answered_at) AS d FROM attempts WHERE user_id = ?
    UNION SELECT DISTINCT date(studied_at) FROM study_sessions WHERE user_id = ?
    ORDER BY d DESC`).all(userId, userId).map((r) => r.d);
  const set = new Set(days);
  const day = (offset) => new Date(Date.now() - offset * 864e5).toISOString().slice(0, 10);
  let start = set.has(day(0)) ? 0 : set.has(day(1)) ? 1 : -1;
  if (start < 0) return 0;
  let n = 0;
  while (set.has(day(start + n))) n++;
  return n;
}

function weeklyMinutes(userId) {
  return db.prepare(`SELECT COALESCE(SUM(minutes), 0) AS m FROM study_sessions
    WHERE user_id = ? AND studied_at >= datetime('now', '-7 days')`).get(userId).m;
}

function accuracy(userId) {
  const r = db.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(correct), 0) AS c FROM attempts WHERE user_id = ?').get(userId);
  return { answered: r.n, correct: r.c, percent: r.n ? Math.round((r.c / r.n) * 100) : null };
}

studyRouter.get('/dashboard', (req, res) => {
  const uid = req.user.id;
  const subjects = db.prepare('SELECT subject, target_grade, current_grade, exam_date FROM user_subjects WHERE user_id = ? ORDER BY exam_date')
    .all(uid).map((s) => ({ ...s, name: SUBJECTS[s.subject]?.name ?? s.subject }));

  // Weakest topics: based on each question's most recent attempt, needs at least 2 questions tried.
  const weak = db.prepare(`
    WITH latest AS (
      SELECT a.question_id, a.correct FROM attempts a
      WHERE a.user_id = ? AND a.id = (SELECT MAX(id) FROM attempts WHERE user_id = a.user_id AND question_id = a.question_id)
    )
    SELECT q.subject, q.topic, COUNT(*) AS tried, SUM(l.correct) AS correct_count
    FROM latest l JOIN questions q ON q.id = l.question_id
    JOIN user_subjects us ON us.user_id = ? AND us.subject = q.subject
    GROUP BY q.subject, q.topic HAVING tried >= 2
    ORDER BY (1.0 * correct_count / tried), tried DESC LIMIT 4`).all(uid, uid)
    .map((w) => ({ ...w, name: SUBJECTS[w.subject]?.name, percent: Math.round((w.correct_count / w.tried) * 100) }));

  const today = new Date().toISOString().slice(0, 10);
  const tasks = db.prepare(`SELECT id, title, subject, due_date, done FROM tasks WHERE user_id = ? AND done = 0
    AND (due_date IS NULL OR due_date <= ?) ORDER BY due_date IS NULL, due_date LIMIT 6`).all(uid, today)
    .map((t) => ({ ...t, done: !!t.done }));

  res.json({ subjects, weak, tasks, streak: streak(uid), weeklyMinutes: weeklyMinutes(uid), accuracy: accuracy(uid) });
});

studyRouter.get('/progress', (req, res) => {
  const rows = db.prepare(`
    SELECT q.subject, q.topic, COUNT(DISTINCT q.id) AS questions,
      COUNT(DISTINCT CASE WHEN a.correct = 1 THEN q.id END) AS mastered,
      COUNT(a.id) AS attempts, COALESCE(SUM(a.correct), 0) AS correct
    FROM questions q
    JOIN user_subjects us ON us.subject = q.subject AND us.user_id = ?
    LEFT JOIN attempts a ON a.question_id = q.id AND a.user_id = ?
    GROUP BY q.subject, q.topic ORDER BY q.subject, q.topic`).all(req.user.id, req.user.id);

  const bySubject = {};
  for (const r of rows) {
    (bySubject[r.subject] ??= { subject: r.subject, name: SUBJECTS[r.subject]?.name, topics: [] }).topics.push(r);
  }

  const daily = db.prepare(`
    SELECT d, SUM(q) AS questions, SUM(m) AS minutes FROM (
      SELECT date(answered_at) AS d, 1 AS q, 0 AS m FROM attempts WHERE user_id = ? AND answered_at >= date('now', '-13 days')
      UNION ALL
      SELECT date(studied_at), 0, minutes FROM study_sessions WHERE user_id = ? AND studied_at >= date('now', '-13 days')
    ) GROUP BY d ORDER BY d`).all(req.user.id, req.user.id);

  res.json({ subjects: Object.values(bySubject), daily, accuracy: accuracy(req.user.id) });
});

// Family board: every registered student's headline stats (no private details).
studyRouter.get('/family', (req, res) => {
  const users = db.prepare('SELECT id, name, track FROM users ORDER BY name').all();
  res.json({
    members: users.map((u) => {
      const next = db.prepare(`SELECT subject, exam_date FROM user_subjects WHERE user_id = ? AND exam_date >= date('now')
        ORDER BY exam_date LIMIT 1`).get(u.id);
      return {
        id: u.id, name: u.name, track: u.track, me: u.id === req.user.id,
        streak: streak(u.id), weeklyMinutes: weeklyMinutes(u.id), accuracy: accuracy(u.id),
        nextExam: next ? { name: SUBJECTS[next.subject]?.name, date: next.exam_date } : null,
      };
    }),
  });
});
