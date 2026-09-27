import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Coffee } from 'lucide-react';
import { api } from '../api.js';

const MODES = { focus: { label: 'Focus', minutes: 25 }, short: { label: 'Short break', minutes: 5 }, long: { label: 'Long break', minutes: 15 } };

export default function Focus() {
  const [mode, setMode] = useState('focus');
  const [length, setLength] = useState(25);
  const [left, setLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [completed, setCompleted] = useState(0);
  const endAt = useRef(null);

  useEffect(() => { api.get('/subjects').then((d) => setSubjects(d.subjects)); }, []);

  function choose(m, minutes = MODES[m].minutes) {
    setMode(m); setLength(minutes); setLeft(minutes * 60); setRunning(false); setMessage('');
  }

  useEffect(() => {
    if (!running) return;
    endAt.current = Date.now() + left * 1000;
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0) { clearInterval(id); finish(); }
    }, 250);
    return () => clearInterval(id);
  }, [running]);

  async function finish() {
    setRunning(false);
    if (mode === 'focus') {
      try {
        await api.post('/sessions', { minutes: length, subject: subject || null });
        setCompleted((c) => c + 1);
        setMessage(`Nice! ${length} minutes logged. Take a break.`);
      } catch (e) { setMessage(e.message); }
      choose((completed + 1) % 4 === 0 ? 'long' : 'short');
    } else {
      setMessage('Break over — ready for another round?');
      choose('focus', length > 5 ? length : 25);
    }
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') new Notification('GCSE Revise', { body: 'Timer finished!' });
  }

  function toggle() {
    if (!running && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    setRunning(!running);
  }

  useEffect(() => {
    const mm = String(Math.floor(left / 60)).padStart(2, '0');
    const ss = String(left % 60).padStart(2, '0');
    document.title = running ? `${mm}:${ss} · ${MODES[mode].label}` : 'GCSE Revise';
    return () => { document.title = 'GCSE Revise'; };
  }, [left, running, mode]);

  const total = length * 60;
  const r = 120, c = 2 * Math.PI * r;
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Focus timer</h1>
          <p className="muted">Phone in another room. 25 minutes of focus, then a 5-minute break. Focus sessions count towards your streak.</p>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card stack" style={{ alignItems: 'center' }}>
          <div className="row" role="tablist" aria-label="Timer mode">
            {Object.entries(MODES).map(([k, m]) => (
              <button key={k} role="tab" aria-selected={mode === k} className={`btn btn-sm ${mode === k ? '' : 'btn-secondary'}`}
                onClick={() => choose(k)} disabled={running}>{m.label}</button>
            ))}
          </div>

          <div className="timer-ring">
            <svg viewBox="0 0 260 260" aria-hidden>
              <circle cx="130" cy="130" r={r} fill="none" stroke="var(--primary-soft)" strokeWidth="16" />
              <circle cx="130" cy="130" r={r} fill="none" stroke={mode === 'focus' ? 'var(--primary)' : 'var(--accent)'} strokeWidth="16"
                strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - left / total)} style={{ transition: 'stroke-dashoffset .3s linear' }} />
            </svg>
            <div className="time" role="timer" aria-live="off">{mm}:{ss}</div>
          </div>

          <div className="row">
            <button className="btn" onClick={toggle} style={{ minWidth: 140 }}>
              {running ? <><Pause size={18} aria-hidden /> Pause</> : <><Play size={18} aria-hidden /> {left === total ? 'Start' : 'Resume'}</>}
            </button>
            <button className="btn btn-secondary" onClick={() => choose(mode, length)}><RotateCcw size={18} aria-hidden /> Reset</button>
          </div>
          {message && <p role="status" style={{ fontWeight: 700 }}>{message}</p>}
        </div>

        <div className="card stack">
          <h2>Session settings</h2>
          <div className="field">
            <label htmlFor="fsubject">What are you revising?</label>
            <select id="fsubject" className="input" value={subject} onChange={(e) => setSubject(e.target.value)} disabled={running}>
              <option value="">General revision</option>
              {subjects.map((s) => <option key={s.subject} value={s.subject}>{s.name}</option>)}
            </select>
          </div>
          {mode === 'focus' && (
            <div className="field">
              <label htmlFor="flen">Focus length</label>
              <select id="flen" className="input" value={length} disabled={running} onChange={(e) => choose('focus', Number(e.target.value))}>
                {[15, 25, 45, 50].map((m) => <option key={m} value={m}>{m} minutes</option>)}
              </select>
              <span className="hint">45 minutes = the time you get for an English writing question.</span>
            </div>
          )}
          <div className="row" style={{ marginTop: 'auto' }}>
            <Coffee aria-hidden color="var(--warn)" />
            <span><strong>{completed}</strong> focus session{completed === 1 ? '' : 's'} done today in this tab. After 4, take a longer break.</span>
          </div>
        </div>
      </div>
    </>
  );
}
