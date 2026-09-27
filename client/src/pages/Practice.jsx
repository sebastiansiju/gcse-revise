import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Shuffle, ArrowRight, CheckCircle2, XCircle, RotateCcw, Sparkles, ChevronLeft } from 'lucide-react';
import { api } from '../api.js';

const STATUS_LABEL = { retry: ['Try again', 'tone-danger'], new: ['New', 'tone-primary'], review: ['Review', 'tone-accent'] };

export default function Practice() {
  const [params, setParams] = useSearchParams();
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [quiz, setQuiz] = useState(null); // { questions, index, results: [] }
  const [error, setError] = useState('');

  const subject = params.get('subject');
  const topic = params.get('topic');

  useEffect(() => {
    api.get('/subjects').then((d) => {
      const withBank = d.subjects.filter((s) => s.bank);
      setSubjects(withBank);
      if (!params.get('subject') && withBank[0]) setParams({ subject: withBank[0].subject }, { replace: true });
    }).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!subject) return;
    api.get(`/practice/topics?subject=${subject}`).then((d) => setTopics(d.topics)).catch((e) => setError(e.message));
  }, [subject, quiz === null]);

  // Deep link from dashboard (?topic=...) starts straight away.
  useEffect(() => { if (subject && topic && !quiz) start(topic); }, [subject, topic]);

  async function start(t) {
    setError('');
    try {
      const q = new URLSearchParams({ subject, count: '10', ...(t ? { topic: t } : {}) });
      const { questions } = await api.get(`/practice/questions?${q}`);
      if (!questions.length) return setError('No questions for this topic yet.');
      setQuiz({ questions, index: 0, results: [], topic: t });
    } catch (e) { setError(e.message); }
  }

  function exit() {
    setQuiz(null);
    setParams({ subject }, { replace: true });
  }

  if (quiz) return <Quiz quiz={quiz} setQuiz={setQuiz} onExit={exit} onRestart={() => start(quiz.topic)} />;

  const subjectName = subjects.find((s) => s.subject === subject)?.name;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Practice</h1>
          <p className="muted">Pick a topic, or let Smart mix choose the questions you most need.</p>
        </div>
      </div>

      {error && <div className="error-msg" role="alert" style={{ marginBottom: 16 }}>{error}</div>}

      {subjects.length === 0 ? (
        <div className="card empty">None of your subjects have practice questions yet. <Link to="/settings">Add Maths, English or Science</Link>.</div>
      ) : (
        <>
          <div className="row" role="tablist" aria-label="Subject" style={{ marginBottom: 20 }}>
            {subjects.map((s) => (
              <button key={s.subject} role="tab" aria-selected={s.subject === subject}
                className={`btn btn-sm ${s.subject === subject ? '' : 'btn-secondary'}`}
                onClick={() => setParams({ subject: s.subject })}>
                {s.name}
              </button>
            ))}
          </div>

          <div className="card" style={{ marginBottom: 20, background: 'var(--primary-soft)' }}>
            <div className="row spread">
              <div>
                <h2 style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Sparkles aria-hidden /> Smart mix: {subjectName}</h2>
                <p className="muted" style={{ margin: 0 }}>10 questions across all topics. Mistakes come back first, then new questions.</p>
              </div>
              <button className="btn" onClick={() => start(null)}><Shuffle size={18} aria-hidden /> Start</button>
            </div>
          </div>

          <h2>By topic</h2>
          <div className="grid grid-2">
            {topics.map((t) => {
              const pct = t.attempts ? Math.round((t.correct / t.attempts) * 100) : null;
              return (
                <button key={t.topic} className="topic-btn" onClick={() => start(t.topic)}>
                  <span className="stack" style={{ gap: 6, flex: 1 }}>
                    <span>{t.topic}</span>
                    <span className="hint">{t.questions} questions · {pct === null ? 'not started' : `${pct}% correct`}</span>
                    {pct !== null && (
                      <span className={`bar ${pct >= 70 ? 'good' : pct >= 40 ? 'mid' : 'low'}`} aria-hidden><span style={{ width: `${Math.max(pct, 3)}%` }} /></span>
                    )}
                  </span>
                  <ArrowRight size={20} aria-hidden />
                </button>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

function Quiz({ quiz, setQuiz, onExit, onRestart }) {
  const { questions, index, results } = quiz;
  const q = questions[index];
  const finished = index >= questions.length;
  const [picked, setPicked] = useState(null);
  const [typed, setTyped] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);
  const nextRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setPicked(null); setTyped(''); setFeedback(null);
    inputRef.current?.focus();
  }, [index]);
  useEffect(() => { if (feedback) nextRef.current?.focus(); }, [feedback]);

  async function submit(answer) {
    if (feedback || busy || answer === '') return;
    setBusy(true);
    try {
      const res = await api.post('/practice/answer', { questionId: q.id, answer });
      setPicked(answer);
      setFeedback(res);
    } finally { setBusy(false); }
  }

  function next() {
    setQuiz({ ...quiz, index: index + 1, results: [...results, { q, correct: feedback.correct }] });
  }

  // Keyboard shortcuts: 1–4 to choose, Enter for next.
  useEffect(() => {
    function onKey(e) {
      if (finished || e.target.tagName === 'INPUT') return;
      if (!feedback && q.type === 'mcq' && /^[1-4]$/.test(e.key) && q.options[e.key - 1]) submit(q.options[e.key - 1]);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (finished) {
    const score = results.filter((r) => r.correct).length;
    const pct = Math.round((score / results.length) * 100);
    return (
      <div className="quiz">
        <div className="card stack" style={{ alignItems: 'center', textAlign: 'center', padding: 32 }}>
          <div className="big-score">{score}/{results.length}</div>
          <h2>{pct >= 80 ? 'Brilliant work!' : pct >= 50 ? 'Good effort — keep going!' : 'Every mistake is a mark you will win back.'}</h2>
          <p className="muted">Questions you got wrong will come back first next time you practise.</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn" onClick={onRestart}><RotateCcw size={18} aria-hidden /> Another round</button>
            <button className="btn btn-secondary" onClick={onExit}>Back to topics</button>
          </div>
        </div>
        <div className="card section">
          <h3>Round summary</h3>
          {results.map(({ q: rq, correct }) => (
            <div key={rq.id} className="task">
              {correct ? <CheckCircle2 color="var(--accent)" aria-label="Correct" /> : <XCircle color="var(--danger)" aria-label="Incorrect" />}
              <span className="task-title" style={{ fontWeight: 500 }}>{rq.prompt}</span>
              <span className="hint">{rq.topic}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const [statusText, statusTone] = STATUS_LABEL[q.status];
  return (
    <div className="quiz">
      <div className="row spread" style={{ marginBottom: 12 }}>
        <button className="btn btn-ghost btn-sm" onClick={onExit}><ChevronLeft size={18} aria-hidden /> Topics</button>
        <span className="muted small" aria-live="polite">Question {index + 1} of {questions.length}</span>
      </div>
      <div className="quiz-progress" aria-hidden>
        {questions.map((_, i) => (
          <span key={i} className={i < results.length ? (results[i].correct ? 'done-right' : 'done-wrong') : i === index ? 'current' : ''} />
        ))}
      </div>

      <div className="card">
        <div className="row">
          <span className="chip tone-primary">{q.topic}</span>
          <span className="chip tone-warn">Grade {q.grade}</span>
          <span className={`chip ${statusTone}`}>{statusText}</span>
        </div>
        <p className="question-prompt">{q.prompt}</p>

        {q.type === 'mcq' ? (
          <div className="options">
            {q.options.map((opt, i) => {
              let cls = 'option';
              if (feedback) {
                if (opt === feedback.correctAnswer) cls += ' correct';
                else if (opt === picked) cls += ' wrong';
              }
              return (
                <button key={opt} className={cls} disabled={!!feedback || busy} onClick={() => submit(opt)}>
                  <span className="key" aria-hidden>{i + 1}</span>{opt}
                </button>
              );
            })}
          </div>
        ) : (
          <form className="row" onSubmit={(e) => { e.preventDefault(); submit(typed.trim()); }}>
            <label htmlFor="answer" className="sr-only">Your answer</label>
            <input id="answer" ref={inputRef} className="input" style={{ flex: 1, minWidth: 160 }} value={typed}
              onChange={(e) => setTyped(e.target.value)} disabled={!!feedback} autoComplete="off" inputMode="text"
              placeholder="Type your answer" />
            {!feedback && <button className="btn" disabled={busy || !typed.trim()}>Check</button>}
          </form>
        )}

        {feedback && (
          <div className={`feedback ${feedback.correct ? 'good' : 'bad'}`} role="status">
            <h3>{feedback.correct ? <><CheckCircle2 aria-hidden /> Correct!</> : <><XCircle aria-hidden /> Not quite. Answer: {feedback.correctAnswer}</>}</h3>
            <p style={{ margin: 0 }}>{feedback.explanation}</p>
          </div>
        )}
      </div>

      {feedback && (
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
          <button ref={nextRef} className="btn" onClick={next}>
            {index + 1 === questions.length ? 'See results' : 'Next question'} <ArrowRight size={18} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
