import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api, formatDate, todayISO } from '../api.js';

const IDEAS = [
  'Do one Maths past paper (Paper 1, non-calculator)',
  'Write a Paper 1 Q5 story in 45 minutes',
  'Learn 10 key quotations',
  'Redo every question I got wrong this week',
];

export default function Planner() {
  const [tasks, setTasks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState({ title: '', subject: '', due_date: todayISO() });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/tasks').then((d) => setTasks(d.tasks)).catch((e) => setError(e.message));
  useEffect(() => {
    load();
    api.get('/subjects').then((d) => setSubjects(d.subjects));
  }, []);

  async function add(e) {
    e.preventDefault();
    if (!form.title.trim()) return setError('Give the task a title.');
    setError(''); setSaving(true);
    try {
      await api.post('/tasks', { ...form, subject: form.subject || null, due_date: form.due_date || null });
      setForm({ ...form, title: '' });
      load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }

  async function toggle(t) {
    setTasks(tasks.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)));
    await api.patch(`/tasks/${t.id}`, { done: !t.done });
  }

  async function remove(t) {
    setTasks(tasks.filter((x) => x.id !== t.id));
    await api.del(`/tasks/${t.id}`);
  }

  const today = todayISO();
  const nameOf = (id) => subjects.find((s) => s.subject === id)?.name;
  const open = tasks.filter((t) => !t.done);
  const groups = [
    ['Overdue', open.filter((t) => t.due_date && t.due_date < today)],
    ['Today', open.filter((t) => t.due_date === today)],
    ['Coming up', open.filter((t) => t.due_date && t.due_date > today)],
    ['Anytime', open.filter((t) => !t.due_date)],
    ['Done', tasks.filter((t) => t.done)],
  ].filter(([, list]) => list.length);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Revision planner</h1>
          <p className="muted">Break revision into small, specific tasks. "Revise maths" is too vague; "10 Pythagoras questions" is perfect.</p>
        </div>
      </div>

      <form className="card stack" onSubmit={add}>
        <div className="field">
          <label htmlFor="title">New task</label>
          <input id="title" className="input" value={form.title} maxLength={200}
            onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. 20 minutes on simultaneous equations" />
        </div>
        <div className="row">
          <div className="field" style={{ flex: 1, minWidth: 160 }}>
            <label htmlFor="subject">Subject</label>
            <select id="subject" className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
              <option value="">General</option>
              {subjects.map((s) => <option key={s.subject} value={s.subject}>{s.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ flex: 1, minWidth: 160 }}>
            <label htmlFor="due">Due</label>
            <input id="due" type="date" className="input" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
          <button className="btn" style={{ alignSelf: 'flex-end' }} disabled={saving}><Plus size={18} aria-hidden /> Add task</button>
        </div>
        {error && <div className="error-msg" role="alert">{error}</div>}
        <div className="row small">
          <span className="muted">Ideas:</span>
          {IDEAS.map((idea) => (
            <button type="button" key={idea} className="chip tone-primary" style={{ border: 0, cursor: 'pointer', minHeight: 32 }}
              onClick={() => setForm({ ...form, title: idea })}>{idea}</button>
          ))}
        </div>
      </form>

      {groups.length === 0 ? (
        <div className="card empty section">No tasks yet. Add your first one above.</div>
      ) : groups.map(([label, list]) => (
        <section key={label} className="card section">
          <h2 className={label === 'Overdue' ? 'overdue' : ''}>{label} <span className="hint">({list.length})</span></h2>
          {list.map((t) => (
            <div key={t.id} className={`task ${t.done ? 'done' : ''}`}>
              <input type="checkbox" checked={t.done} onChange={() => toggle(t)} id={`t${t.id}`} />
              <label htmlFor={`t${t.id}`} className="task-title" style={{ cursor: 'pointer' }}>{t.title}</label>
              {t.subject && <span className="chip tone-primary">{nameOf(t.subject) ?? t.subject}</span>}
              {t.due_date && <span className="hint">{formatDate(t.due_date)}</span>}
              <button className="icon-btn" onClick={() => remove(t)} aria-label={`Delete "${t.title}"`}><Trash2 size={18} /></button>
            </div>
          ))}
        </section>
      ))}
    </>
  );
}
