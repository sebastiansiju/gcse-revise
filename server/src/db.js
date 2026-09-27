import pg from 'pg';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { QUESTIONS } from './data/questions.js';

// Days (streaks, "today", charts) are counted in UK time.
export const TZ = 'Europe/London';

// Return DATE columns as 'YYYY-MM-DD' strings and BIGINT/COUNT results as numbers.
pg.types.setTypeParser(1082, (v) => v);
pg.types.setTypeParser(20, (v) => Number(v));

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Copy server/.env.example to server/.env and fill it in.');
  process.exit(1);
}

const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL);
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: Number(process.env.PG_POOL_MAX) || 5,
});

export const many = async (text, params) => (await pool.query(text, params)).rows;
export const one = async (text, params) => (await pool.query(text, params)).rows[0];
export const run = (text, params) => pool.query(text, params);

export async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// 'YYYY-MM-DD' for a date in UK time.
export const ukDate = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);

export async function initDb() {
  const schema = readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../schema.sql'), 'utf8');
  await pool.query(schema);

  // Upsert the question bank so edits to questions.js flow into the database.
  await transaction(async (c) => {
    for (const q of QUESTIONS) {
      await c.query(
        `INSERT INTO questions (id, subject, topic, grade, type, prompt, options, answer, explanation)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET subject = excluded.subject, topic = excluded.topic, grade = excluded.grade,
           type = excluded.type, prompt = excluded.prompt, options = excluded.options, answer = excluded.answer,
           explanation = excluded.explanation`,
        [q.id, q.subject, q.topic, q.grade, q.type, q.prompt,
          q.options ? JSON.stringify(q.options) : null, JSON.stringify(q.answer), q.explanation],
      );
    }
  });
  await run('DELETE FROM sessions WHERE expires_at < $1', [Date.now()]);
}
