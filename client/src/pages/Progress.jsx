import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function Progress() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.get('/progress').then(setData).catch((e) => setError(e.message)); }, []);

  if (error) return <div className="error-msg" role="alert">{error}</div>;
  if (!data) return <div className="empty" role="status">Loading…</div>;

  // Last 14 days, filling gaps with zeros.
  const days = [...Array(14)].map((_, i) => {
    const d = new Date(Date.now() - (13 - i) * 864e5).toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
    const row = data.daily.find((x) => x.d === d);
    return { d, questions: row?.questions ?? 0, minutes: row?.minutes ?? 0 };
  });
  const maxQ = Math.max(1, ...days.map((d) => d.questions));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Your progress</h1>
          <p className="muted">
            {data.accuracy.answered
              ? <>You've answered <strong>{data.accuracy.answered}</strong> question{data.accuracy.answered === 1 ? '' : 's'} with <strong>{data.accuracy.percent}%</strong> accuracy.</>
              : 'Start practising to see your progress build up here.'}
          </p>
        </div>
      </div>

      <section className="card">
        <h2>Questions answered, last 14 days</h2>
        <div className="chart" role="img" aria-label={`Questions per day: ${days.map((d) => d.questions).join(', ')}`}>
          {days.map((d) => (
            <div key={d.d} className="col" title={`${d.d}: ${d.questions} questions, ${d.minutes} focus minutes`}>
              <small>{d.questions || ''}</small>
              <span className="b" style={{ height: `${(d.questions / maxQ) * 100}%` }} />
              <small>{new Date(`${d.d}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'narrow' })}</small>
            </div>
          ))}
        </div>
      </section>

      {data.subjects.map((s) => {
        const total = s.topics.reduce((a, t) => a + t.questions, 0);
        const mastered = s.topics.reduce((a, t) => a + t.mastered, 0);
        return (
          <section key={s.subject} className="card section">
            <div className="row spread">
              <h2>{s.name}</h2>
              <span className="muted small"><strong>{mastered}</strong> of {total} questions answered correctly at least once</span>
            </div>
            <div className="stack">
              {s.topics.map((t) => {
                const pct = t.attempts ? Math.round((t.correct / t.attempts) * 100) : null;
                const cover = Math.round((t.mastered / t.questions) * 100);
                return (
                  <div key={t.topic} className="stack" style={{ gap: 6 }}>
                    <div className="row spread">
                      <Link to={`/practice?subject=${s.subject}&topic=${encodeURIComponent(t.topic)}`} style={{ fontWeight: 700 }}>{t.topic}</Link>
                      <span className="hint">{pct === null ? 'not started' : `${pct}% accuracy · ${t.mastered}/${t.questions} mastered`}</span>
                    </div>
                    <div className={`bar ${pct === null ? '' : pct >= 70 ? 'good' : pct >= 40 ? 'mid' : 'low'}`} role="img" aria-label={`${cover}% of ${t.topic} mastered`}>
                      <span style={{ width: `${cover}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}
