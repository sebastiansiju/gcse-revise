import { useEffect, useState } from 'react';
import { Flame, Clock, Target, CalendarClock } from 'lucide-react';
import { api, daysUntil } from '../api.js';

export default function Family() {
  const [members, setMembers] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.get('/family').then((d) => setMembers(d.members)).catch((e) => setError(e.message)); }, []);

  if (error) return <div className="error-msg" role="alert">{error}</div>;
  if (!members) return <div className="empty" role="status">Loading…</div>;

  const top = Math.max(...members.map((m) => m.weeklyMinutes));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Family board</h1>
          <p className="muted">Keep each other going. Everyone revising in this house, side by side.</p>
        </div>
      </div>
      <div className="grid grid-2">
        {members.map((m) => (
          <div key={m.id} className="card stack" style={m.me ? { borderColor: 'var(--primary)' } : undefined}>
            <div className="row spread">
              <div className="row">
                <span className="stat-icon tone-primary" style={{ fontFamily: 'var(--font-head)', fontSize: '1.3rem' }} aria-hidden>{m.name[0].toUpperCase()}</span>
                <div>
                  <h2 style={{ margin: 0 }}>{m.name}{m.me && <span className="hint"> (you)</span>}</h2>
                  <span className="hint">{m.track === 'resit' ? 'English & Maths resit' : 'Year 11'}</span>
                </div>
              </div>
              {top > 0 && m.weeklyMinutes === top && <span className="chip tone-warn">Top revisor this week</span>}
            </div>
            <div className="grid grid-3" style={{ gap: 10 }}>
              <div className="row" style={{ gap: 8 }}><Flame color="var(--warn)" aria-hidden /><span><strong>{m.streak}</strong> day streak</span></div>
              <div className="row" style={{ gap: 8 }}><Clock color="var(--primary)" aria-hidden /><span><strong>{m.weeklyMinutes}</strong> min this week</span></div>
              <div className="row" style={{ gap: 8 }}><Target color="var(--accent)" aria-hidden /><span><strong>{m.accuracy.percent ?? '–'}{m.accuracy.percent !== null && '%'}</strong> accuracy</span></div>
            </div>
            {m.nextExam && (
              <div className="row hint"><CalendarClock size={16} aria-hidden /> Next exam: {m.nextExam.name} in {daysUntil(m.nextExam.date)} days</div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
