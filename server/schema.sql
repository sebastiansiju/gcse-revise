-- GCSE Revise schema. Safe to run repeatedly; the server applies it on startup.
CREATE TABLE IF NOT EXISTS users (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  track text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
  token text PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS user_subjects (
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  target_grade int,
  current_grade int,
  exam_date date,
  PRIMARY KEY (user_id, subject)
);
CREATE TABLE IF NOT EXISTS questions (
  id text PRIMARY KEY,
  subject text NOT NULL,
  topic text NOT NULL,
  grade int NOT NULL,
  type text NOT NULL,
  prompt text NOT NULL,
  options jsonb,
  answer jsonb NOT NULL,
  explanation text NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject, topic);
CREATE TABLE IF NOT EXISTS attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id text NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  correct boolean NOT NULL,
  answered_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id, question_id);
CREATE TABLE IF NOT EXISTS tasks (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  subject text,
  due_date date,
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
CREATE TABLE IF NOT EXISTS study_sessions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject text,
  minutes int NOT NULL,
  studied_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user ON study_sessions(user_id);

-- The app talks to Postgres only from its own server. RLS with no policies means
-- Supabase's public REST/GraphQL APIs can't read or write any of this data.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
