import { useState } from 'react';
import { Brain, CalendarCheck, TrendingUp, Timer, GraduationCap } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../auth.js';

const TRACKS = [
  { id: 'resit', title: 'Resitting English & Maths', desc: 'November resit series — aiming to beat my grade 4.' },
  { id: 'year11', title: 'Year 11', desc: 'Sitting all my GCSEs in summer 2027.' },
];

export default function Auth() {
  const { setUser } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', username: '', password: '', track: 'resit' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const { user } = await api.post(`/auth/${mode === 'login' ? 'login' : 'register'}`, form);
      setUser(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <section className="auth-hero">
        <div className="row"><span className="brand-mark" style={{ background: '#fff', color: 'var(--primary)' }}><GraduationCap size={20} aria-hidden /></span><strong style={{ fontFamily: 'var(--font-head)', fontSize: '1.2rem' }}>GCSE Revise</strong></div>
        <h1>Little and often beats last-minute cramming.</h1>
        <ul>
          <li><Brain aria-hidden /> <span><strong>Smart practice</strong> brings back the questions you got wrong until you nail them.</span></li>
          <li><TrendingUp aria-hidden /> <span><strong>See your weak topics</strong> and fix them first — that's where the marks are.</span></li>
          <li><CalendarCheck aria-hidden /> <span><strong>Plan your revision</strong> with a to-do list and exam countdowns.</span></li>
          <li><Timer aria-hidden /> <span><strong>Focus timer</strong> — 25 minutes on, 5 off. Build a daily streak.</span></li>
        </ul>
      </section>

      <section className="auth-panel">
        <div className="card auth-card">
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={mode === 'login'} onClick={() => { setMode('login'); setError(''); }}>Log in</button>
            <button role="tab" aria-selected={mode === 'register'} onClick={() => { setMode('register'); setError(''); }}>Create account</button>
          </div>
          <form className="stack" onSubmit={submit} noValidate>
            {mode === 'register' && (
              <div className="field">
                <label htmlFor="name">First name</label>
                <input id="name" className="input" value={form.name} onChange={set('name')} autoComplete="given-name" required />
              </div>
            )}
            <div className="field">
              <label htmlFor="username">Username</label>
              <input id="username" className="input" value={form.username} onChange={set('username')} autoComplete="username" autoCapitalize="none" required />
              {mode === 'register' && <span className="hint">3–20 letters, numbers or underscores</span>}
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" className="input" value={form.password} onChange={set('password')}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required />
              {mode === 'register' && <span className="hint">At least 6 characters</span>}
            </div>
            {mode === 'register' && (
              <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
                <legend style={{ fontWeight: 700, fontSize: '.92rem', marginBottom: 6 }}>What are you preparing for?</legend>
                {TRACKS.map((t) => (
                  <label key={t.id} className="track-option">
                    <input type="radio" name="track" value={t.id} checked={form.track === t.id} onChange={set('track')} />
                    <span><strong>{t.title}</strong><br /><span className="hint">{t.desc}</span></span>
                  </label>
                ))}
              </fieldset>
            )}
            {error && <div className="error-msg" role="alert">{error}</div>}
            <button className="btn btn-block" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create my account'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
