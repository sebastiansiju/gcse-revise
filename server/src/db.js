import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { QUESTIONS } from './data/questions.js';

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data');
mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(process.env.DB_PATH || path.join(dataDir, 'gcse.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  track TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS user_subjects (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  target_grade INTEGER,
  current_grade INTEGER,
  exam_date TEXT,
  PRIMARY KEY (user_id, subject)
);
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  grade INTEGER NOT NULL,
  type TEXT NOT NULL,
  prompt TEXT NOT NULL,
  options TEXT,
  answer TEXT NOT NULL,
  explanation TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  correct INTEGER NOT NULL,
  answered_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id, question_id);
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT,
  due_date TEXT,
  done INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS study_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT,
  minutes INTEGER NOT NULL,
  studied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// Upsert the question bank on every start so edits to questions.js flow into the database.
const upsert = db.prepare(`
  INSERT INTO questions (id, subject, topic, grade, type, prompt, options, answer, explanation)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET subject=excluded.subject, topic=excluded.topic, grade=excluded.grade,
    type=excluded.type, prompt=excluded.prompt, options=excluded.options, answer=excluded.answer,
    explanation=excluded.explanation`);
db.exec('BEGIN');
for (const q of QUESTIONS) {
  upsert.run(q.id, q.subject, q.topic, q.grade, q.type, q.prompt,
    q.options ? JSON.stringify(q.options) : null, JSON.stringify(q.answer), q.explanation);
}
db.exec('COMMIT');

db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
