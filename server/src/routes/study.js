import { Router } from 'express';
import { many, one, run, TZ, ukDate } from '../db.js';
import { SUBJECTS } from '../data/subjects.js';

export const studyRouter = Router();

const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const validSubject = (s) => s == null || s === '' || Object.hasOwn(SUBJECTS, s);
const isId = (s) => /^\d{1,15}$/.test(String(s));
// SQL for a timestamp column as a 'YYYY-MM-DD' day in UK time.
const ukDay = (col) => `to_char((${col} AT TIME ZONE '${TZ}')::date, 'YYYY-MM-DD')`;

// ---------- Subjects ----------
studyRouter.get('/subjects', async (req, res) => {
  const mine = (await many(
    'SELECT subject, target_grade, current_grade, exam_date FROM user_subjects WHERE user_id = $1 ORDER BY exam_date NULLS LAST',
    [req.user.id])).map((s) => ({ ...s, name: SUBJECTS[s.subject]?.name ?? s.subject, bank: !!SUBJECTS[s.subject]?.bank }));
  const catalogue = Object.entries(SUBJECTS).map(([id, s]) => ({ id, ...s }));
  res.json({ subjects: mine, catalogue });
});

studyRouter.put('/subjects/:subject', async (req, res) => {
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

  await run(`INSERT INTO user_subjects (user_id, subject, target_grade, current_grade, exam_date) VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (user_id, subject) DO UPDATE SET target_grade = excluded.target_grade,
      current_grade = excluded.current_grade, exam_date = excluded.exam_date`,
  [req.user.id, subject, target, current, examDate]);
  res.json({ ok: true });
});

studyRouter.delete('/subjects/:subject', async (req, res) => {
  await run('DELETE FROM user_subjects WHERE user_id = $1 AND subject = $2', [req.user.id, req.params.subject]);
  res.json({ ok: true });
});

// ---------- Tasks ----------
studyRouter.get('/tasks', async (req, res) => {
  const tasks = await many(`SELECT id, title, subject, due_date, done FROM tasks WHERE user_id = $1
    ORDER BY done, due_date NULLS LAST, id`, [req.user.id]);
  res.json({ tasks });
});

studyRouter.post('/tasks', async (req, res) => {
  const title = String(req.body?.title || '').trim();
  const subject = req.body?.subject || null;
  const due = req.body?.due_date || null;
  if (!title || title.length > 200) return res.status(400).json({ error: 'Task needs a title (max 200 characters).' });
  if (!validSubject(subject)) return res.status(400).json({ error: 'Unknown subject' });
  if (due && !isDate(due)) return res.status(400).json({ error: 'Invalid date' });
  const task = await one(`INSERT INTO tasks (user_id, title, subject, due_date) VALUES ($1, $2, $3, $4)
    RETURNING id, title, subject, due_date, done`, [req.user.id, title, subject, due]);
  res.status(201).json({ task });
});

studyRouter.patch('/tasks/:id', async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ error: 'Task not found' });
  const task = await one('SELECT * FROM tasks WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const done = req.body?.done === undefined ? task.done : !!req.body.done;
  await run('UPDATE tasks SET done = $1 WHERE id = $2', [done, task.id]);
  res.json({ ok: true });
});

studyRouter.delete('/tasks/:id', async (req, res) => {
  if (isId(req.params.id)) await run('DELETE FROM tasks WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

// ---------- Focus sessions ----------
studyRouter.post('/sessions', async (req, res) => {
  const minutes = Number(req.body?.minutes);
  const subject = req.body?.subject || null;
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240) return res.status(400).json({ error: 'Minutes must be 1–240' });
  if (!validSubject(subject)) return res.status(400).json({ error: 'Unknown subject' });
  await run('INSERT INTO study_sessions (user_id, subject, minutes) VALUES ($1, $2, $3)', [req.user.id, subject, minutes]);
  res.status(201).json({ ok: true });
});

// ---------- Stats ----------
async function streak(userId) {
  const rows = await many(`
    SELECT ${ukDay('answered_at')} AS d FROM attempts WHERE user_id = $1
    UNION SELECT ${ukDay('studied_at')} FROM study_sessions WHERE user_id = $1`, [userId]);
  const set = new Set(rows.map((r) => r.d));
  const day = (offset) => ukDate(new Date(Date.now() - offset * 864e5));
  const start = set.has(day(0)) ? 0 : set.has(day(1)) ? 1 : -1;
  if (start < 0) return 0;
  let n = 0;
  while (set.has(day(start + n))) n++;
  return n;
}

async function weeklyMinutes(userId) {
  const r = await one(`SELECT COALESCE(SUM(minutes), 0) AS m FROM study_sessions
    WHERE user_id = $1 AND studied_at >= now() - interval '7 days'`, [userId]);
  return r.m;
}

async function accuracy(userId) {
  const r = await one('SELECT COUNT(*) AS n, COUNT(*) FILTER (WHERE correct) AS c FROM attempts WHERE user_id = $1', [userId]);
  return { answered: r.n, correct: r.c, percent: r.n ? Math.round((r.c / r.n) * 100) : null };
}

studyRouter.get('/dashboard', async (req, res) => {
  const uid = req.user.id;
  const today = ukDate();
  const [subjects, weak, tasks, streakDays, minutes, acc] = await Promise.all([
    many('SELECT subject, target_grade, current_grade, exam_date FROM user_subjects WHERE user_id = $1 ORDER BY exam_date NULLS LAST', [uid]),
    // Weakest topics: based on each question's most recent attempt, needs at least 2 questions tried.
    many(`
      WITH latest AS (
        SELECT DISTINCT ON (question_id) question_id, correct FROM attempts
        WHERE user_id = $1 ORDER BY question_id, id DESC
      )
      SELECT q.subject, q.topic, COUNT(*) AS tried, COUNT(*) FILTER (WHERE l.correct) AS correct_count
      FROM latest l JOIN questions q ON q.id = l.question_id
      JOIN user_subjects us ON us.user_id = $1 AND us.subject = q.subject
      GROUP BY q.subject, q.topic HAVING COUNT(*) >= 2
      ORDER BY (1.0 * COUNT(*) FILTER (WHERE l.correct) / COUNT(*)), COUNT(*) DESC LIMIT 4`, [uid]),
    many(`SELECT id, title, subject, due_date, done FROM tasks WHERE user_id = $1 AND NOT done
      AND (due_date IS NULL OR due_date <= $2) ORDER BY due_date NULLS LAST LIMIT 6`, [uid, today]),
    streak(uid), weeklyMinutes(uid), accuracy(uid),
  ]);

  res.json({
    subjects: subjects.map((s) => ({ ...s, name: SUBJECTS[s.subject]?.name ?? s.subject })),
    weak: weak.map((w) => ({ ...w, name: SUBJECTS[w.subject]?.name, percent: Math.round((w.correct_count / w.tried) * 100) })),
    tasks, streak: streakDays, weeklyMinutes: minutes, accuracy: acc,
  });
});

studyRouter.get('/progress', async (req, res) => {
  const uid = req.user.id;
  const [rows, daily, acc] = await Promise.all([
    many(`
      SELECT q.subject, q.topic, COUNT(DISTINCT q.id) AS questions,
        COUNT(DISTINCT q.id) FILTER (WHERE a.correct) AS mastered,
        COUNT(a.id) AS attempts, COUNT(a.id) FILTER (WHERE a.correct) AS correct
      FROM questions q
      JOIN user_subjects us ON us.subject = q.subject AND us.user_id = $1
      LEFT JOIN attempts a ON a.question_id = q.id AND a.user_id = $1
      GROUP BY q.subject, q.topic ORDER BY q.subject, q.topic`, [uid]),
    many(`
      SELECT d, SUM(q) AS questions, SUM(m) AS minutes FROM (
        SELECT ${ukDay('answered_at')} AS d, 1 AS q, 0 AS m FROM attempts
          WHERE user_id = $1 AND answered_at >= now() - interval '14 days'
        UNION ALL
        SELECT ${ukDay('studied_at')}, 0, minutes FROM study_sessions
          WHERE user_id = $1 AND studied_at >= now() - interval '14 days'
      ) x GROUP BY d ORDER BY d`, [uid]),
    accuracy(uid),
  ]);

  const bySubject = {};
  for (const r of rows) {
    (bySubject[r.subject] ??= { subject: r.subject, name: SUBJECTS[r.subject]?.name, topics: [] }).topics.push(r);
  }
  res.json({ subjects: Object.values(bySubject), daily, accuracy: acc });
});

// Family board: every registered student's headline stats (no private details).
studyRouter.get('/family', async (req, res) => {
  const users = await many('SELECT id, name, track FROM users ORDER BY name');
  const today = ukDate();
  const members = await Promise.all(users.map(async (u) => {
    const [next, s, m, a] = await Promise.all([
      one(`SELECT subject, exam_date FROM user_subjects WHERE user_id = $1 AND exam_date >= $2
        ORDER BY exam_date LIMIT 1`, [u.id, today]),
      streak(u.id), weeklyMinutes(u.id), accuracy(u.id),
    ]);
    return {
      id: u.id, name: u.name, track: u.track, me: u.id === req.user.id,
      streak: s, weeklyMinutes: m, accuracy: a,
      nextExam: next ? { name: SUBJECTS[next.subject]?.name, date: next.exam_date } : null,
    };
  }));
  res.json({ members });
});
