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

- **Backend:** Node.js (22.5+, built-in `node:sqlite`) + Express. Passwords are hashed with scrypt and sessions use httpOnly cookies.
- **Frontend:** React 19 + Vite + React Router, with Lucide icons.
- **Database:** SQLite file at `server/data/gcse.db` (created automatically).

## Run it

```bash
npm run install:all   # first time only
npm run dev           # API on :4000, app on http://localhost:5173
```

## Production (one server)

```bash
npm run build         # builds the React app into client/dist
npm start             # Express serves the API and the app on PORT (default 4000)
```

## Adding questions

Edit `server/src/data/questions.js` and restart the server. Questions are upserted by `id` on startup.
