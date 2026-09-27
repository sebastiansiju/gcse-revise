import { useEffect, useState } from 'react';
import { Plus, Trash2, Save, Info } from 'lucide-react';
import { api } from '../api.js';

const GRADES = [9, 8, 7, 6, 5, 4, 3, 2, 1];

export default function Settings() {
  const [subjects, setSubjects] = useState([]);
  const [catalogue, setCatalogue] = useState([]);
  const [adding, setAdding] = useState('');
  const [status, setStatus] = useState({});
  const [error, setError] = useState('');

  const load = () => api.get('/subjects').then((d) => { setSubjects(d.subjects); setCatalogue(d.catalogue); }).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const update = (id, key, value) => setSubjects(subjects.map((s) => (s.subject === id ? { ...s, [key]: value } : s)));

  async function save(s) {
    setStatus({ ...status, [s.subject]: 'Saving…' });
    try {
      await api.put(`/subjects/${s.subject}`, s);
      setStatus((st) => ({ ...st, [s.subject]: 'Saved' }));
    } catch (e) { setStatus((st) => ({ ...st, [s.subject]: e.message })); }
  }

  async function remove(s) {
    if (!confirm(`Remove ${s.name} from your subjects? Your practice history is kept.`)) return;
    await api.del(`/subjects/${s.subject}`);
    load();
  }

  async function add() {
    if (!adding) return;
    await api.put(`/subjects/${adding}`, { target_grade: 5, current_grade: null, exam_date: null });
    setAdding('');
    load();
  }

  const available = catalogue.filter((c) => !subjects.some((s) => s.subject === c.id));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>My subjects</h1>
          <p className="muted">Set your target grades and exam dates so your countdowns are accurate.</p>
        </div>
      </div>

      <div className="card row" style={{ background: 'var(--warn-soft)', borderColor: '#f4d9a8', marginBottom: 20, alignItems: 'flex-start', flexWrap: 'nowrap' }}>
        <Info color="var(--warn)" aria-hidden style={{ flexShrink: 0 }} />
        <p style={{ margin: 0 }}>The starting exam dates are <strong>estimates</strong>. Replace them with the dates on your school's exam timetable (for resits, ask your exams officer for the November dates).</p>
      </div>

      {error && <div className="error-msg" role="alert">{error}</div>}

      <div className="grid grid-2">
        {subjects.map((s) => (
          <form key={s.subject} className="card stack" onSubmit={(e) => { e.preventDefault(); save(s); }}>
            <div className="row spread">
              <h2 style={{ margin: 0 }}>{s.name}</h2>
              <button type="button" className="icon-btn" onClick={() => remove(s)} aria-label={`Remove ${s.name}`}><Trash2 size={18} /></button>
            </div>
            {!s.bank && <span className="hint">No practice questions for this subject yet, but you can use it in the Planner and Focus timer.</span>}
            <div className="row">
              <div className="field" style={{ flex: 1, minWidth: 110 }}>
                <label htmlFor={`cur-${s.subject}`}>Current / last grade</label>
                <select id={`cur-${s.subject}`} className="input" value={s.current_grade ?? ''} onChange={(e) => update(s.subject, 'current_grade', e.target.value || null)}>
                  <option value="">Not sure</option>
                  {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="field" style={{ flex: 1, minWidth: 110 }}>
                <label htmlFor={`tgt-${s.subject}`}>Target grade</label>
                <select id={`tgt-${s.subject}`} className="input" value={s.target_grade ?? ''} onChange={(e) => update(s.subject, 'target_grade', e.target.value || null)}>
                  <option value="">None</option>
                  {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor={`date-${s.subject}`}>First exam date</label>
              <input id={`date-${s.subject}`} type="date" className="input" value={s.exam_date ?? ''} onChange={(e) => update(s.subject, 'exam_date', e.target.value || null)} />
            </div>
            <div className="row">
              <button className="btn btn-sm"><Save size={16} aria-hidden /> Save</button>
              <span className="hint" role="status">{status[s.subject]}</span>
            </div>
          </form>
        ))}
      </div>

      {available.length > 0 && (
        <div className="card row section">
          <div className="field" style={{ flex: 1, minWidth: 200 }}>
            <label htmlFor="add">Add a subject</label>
            <select id="add" className="input" value={adding} onChange={(e) => setAdding(e.target.value)}>
              <option value="">Choose…</option>
              {available.map((c) => <option key={c.id} value={c.id}>{c.name}{c.bank ? ' (has practice questions)' : ''}</option>)}
            </select>
          </div>
          <button className="btn" style={{ alignSelf: 'flex-end' }} onClick={add} disabled={!adding}><Plus size={18} aria-hidden /> Add</button>
        </div>
      )}
    </>
  );
}
