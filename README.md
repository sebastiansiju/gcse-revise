# GCSE Revise

A revision web app for GCSE students: one sibling resitting English Language & Maths in November, and one in Year 11.

- **Smart practice quizzes**: questions for Maths, English Language, English Literature and Combined Science. Answers are checked on the server; wrong answers come back first next time.
- **Dashboard**: exam countdowns, streak, weekly minutes, weakest topics.
- **Planner**: revision to-do list with due dates.
- **Focus timer**: Pomodoro sessions logged per subject.
- **Progress**: accuracy and mastery for every topic.
- **Family board**: both siblings' streaks and minutes side by side.
- **Exam guide**: paper structures, marks, timings and resit tips.

## Tech

- **Backend:** Node.js 22.9+ with Express. Passwords are hashed with scrypt and sessions use httpOnly cookies.
- **Database:** Postgres (hosted on Supabase). The schema is in `server/schema.sql` and is applied automatically on startup.
- **Frontend:** React 19 + Vite + React Router, with Lucide icons.

## Run it locally

1. Copy `server/.env.example` to `server/.env` and set `DATABASE_URL` (see "Database connection string" below).
2. Then:

```bash
npm run install:all   # first time only
npm run dev           # API on :4000, app on http://localhost:5173
```

## Deploy (Render + Supabase, both free)

1. **Database connection string:** in Supabase, open the `gcse-revise` project, click **Connect**, and copy the **Session pooler** connection string. If you don't know the database password, reset it under Project Settings → Database, then put it in place of `[YOUR-PASSWORD]`.
2. **Render:** sign in at render.com with GitHub, click **New → Blueprint**, and pick this repo. Render reads `render.yaml` and asks for `DATABASE_URL`: paste the connection string from step 1.
3. Wait for the first deploy to finish (a few minutes). Your app is live at `https://gcse-revise.onrender.com` (or similar).

Free-tier notes:
- Render's free web service sleeps after 15 minutes without visitors. The next visit takes about a minute to wake it up.
- Supabase pauses free projects after about a week with no activity. Using the app keeps it awake; if it does pause, click **Restore** in the Supabase dashboard.

## Adding questions

Edit `server/src/data/questions.js` and redeploy (or restart locally). Questions are upserted by `id` on startup.
