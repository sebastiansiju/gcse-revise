import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Clock, Target, CheckCircle2, AlertTriangle, Brain, ArrowRight } from 'lucide-react';
import { api, daysUntil, formatDate, todayISO } from '../api.js';
import { useAuth } from '../auth.js';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/dashboard').then(setData).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  async function completeTask(id) {
    await api.patch(`/tasks/${id}`, { done: true });
    load();
  }

  if (error) return <div className="error-msg" role="alert">{error}</div>;
  if (!data) return <div className="empty" role="status">Loading your dashboard…</div>;

  const upcoming = data.subjects.filter((s) => s.exam_date && daysUntil(s.exam_date) >= 0);
  const nextExam = upcoming[0];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{greeting()}, {user.name}</h1>
          <p className="muted">
            {nextExam
              ? <>Your next exam is <strong>{nextExam.name}</strong> in <strong>{daysUntil(nextExam.exam_date)} days</strong>. Let's make today count.</>
              : 'Add your exam dates in My subjects to see countdowns.'}
          </p>
        </div>
        <Link to="/practice" className="btn"><Brain size={18} aria-hidden /> Start practising</Link>
      </div>

      <div className="grid grid-4">
        <div className="card stat">
          <div className="stat-icon tone-warn"><Flame aria-hidden /></div>
          <div><div className="stat-value">{data.streak}</div><div className="stat-label">day streak</div></div>
        </div>
        <div className="card stat">
          <div className="stat-icon tone-primary"><Clock aria-hidden /></div>
          <div><div className="stat-value">{data.weeklyMinutes}</div><div className="stat-label">minutes this week</div></div>
        </div>
        <div className="card stat">
          <div className="stat-icon tone-accent"><Target aria-hidden /></div>
          <div><div className="stat-value">{data.accuracy.percent ?? '–'}{data.accuracy.percent !== null && '%'}</div><div className="stat-label">accuracy</div></div>
        </div>
        <div className="card stat">
          <div className="stat-icon tone-primary"><CheckCircle2 aria-hidden /></div>
          <div><div className="stat-value">{data.accuracy.answered}</div><div className="stat-label">questions answered</div></div>
        </div>
      </div>

      <section className="section">
        <h2>Exam countdown</h2>
        {data.subjects.length === 0 ? (
          <div className="card empty">No subjects yet. <Link to="/settings">Add your subjects</Link>.</div>
        ) : (
          <div className="grid grid-3">
            {data.subjects.map((s) => {
              const d = daysUntil(s.exam_date);
              return (
                <div key={s.subject} className="card countdown">
                  <div className="row spread">
                    <h3 style={{ margin: 0 }}>{s.name}</h3>
                    {s.target_grade && <span className="grade-pill tone-accent" title="Target grade">Target {s.target_grade}</span>}
                  </div>
                  {d === null ? <span className="muted">No exam date set</span> : d < 0 ? <span className="muted">Exam done — well done!</span> : (
                    <>
                      <div><span className="countdown-days">{d}</span> <span className="muted">days to go</span></div>
                      <span className="hint">{formatDate(s.exam_date)}{s.current_grade ? ` · last grade ${s.current_grade}` : ''}</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid grid-2 section">
        <section className="card">
          <div className="row spread"><h2>Focus on these topics</h2></div>
          {data.weak.length === 0 ? (
            <p className="muted">Answer a few practice questions and your weakest topics will show up here, so you know exactly what to revise.</p>
          ) : (
            <div className="stack">
              {data.weak.map((w) => (
                <div key={w.subject + w.topic} className="stack" style={{ gap: 6 }}>
                  <div className="row spread">
                    <span><strong>{w.topic}</strong> <span className="hint">· {w.name}</span></span>
                    <Link className="btn btn-secondary btn-sm" to={`/practice?subject=${w.subject}&topic=${encodeURIComponent(w.topic)}`}>
                      Practise <ArrowRight size={16} aria-hidden />
                    </Link>
                  </div>
                  <div className={`bar ${w.percent >= 70 ? 'good' : w.percent >= 40 ? 'mid' : 'low'}`} role="img" aria-label={`${w.percent}% correct`}>
                    <span style={{ width: `${Math.max(w.percent, 3)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div className="row spread"><h2>Today's tasks</h2><Link to="/planner" className="small">Open planner</Link></div>
          {data.tasks.length === 0 ? (
            <p className="muted">Nothing due today. <Link to="/planner">Plan a revision task</Link>.</p>
          ) : (
            <div>
              {data.tasks.map((t) => (
                <label key={t.id} className="task">
                  <input type="checkbox" onChange={() => completeTask(t.id)} aria-label={`Mark "${t.title}" done`} />
                  <span className="task-title">{t.title}</span>
                  {t.due_date && t.due_date < todayISO() && <span className="small overdue"><AlertTriangle size={14} aria-hidden /> overdue</span>}
                </label>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
