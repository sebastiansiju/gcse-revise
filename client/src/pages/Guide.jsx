import { useState } from 'react';

const TABS = ['Resit tips', 'English Language', 'Maths', 'Exam day'];

export default function Guide() {
  const [tab, setTab] = useState(TABS[0]);
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Exam guide</h1>
          <p className="muted">How the papers work and where the marks are. Check your exam board with your teacher (AQA, Edexcel, OCR or Eduqas): the English details below are for AQA.</p>
        </div>
      </div>
      <div className="row" role="tablist" style={{ marginBottom: 20 }}>
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={`btn btn-sm ${tab === t ? '' : 'btn-secondary'}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      <div className="card guide" role="tabpanel">
        {tab === 'Resit tips' && <ResitTips />}
        {tab === 'English Language' && <English />}
        {tab === 'Maths' && <Maths />}
        {tab === 'Exam day' && <ExamDay />}
      </div>
    </>
  );
}

function ResitTips() {
  return (
    <>
      <h2>Going from a 4 to a 5 (or higher)</h2>
      <p>A grade 4 is a "standard pass" and a grade 5 is a "strong pass". The gap is often only a handful of marks, so small, targeted improvements make the difference.</p>
      <h3>Maths</h3>
      <ul>
        <li><strong>Bank the easy marks first.</strong> Most lost marks at grade 4 come from careless slips on early questions. Always show working, since method marks count even if the final answer is wrong.</li>
        <li><strong>Master the grade 5 "crossover" topics:</strong> reverse percentages, compound interest, simultaneous equations, Pythagoras and basic trigonometry (SOHCAHTOA), factorising quadratics, and standard form.</li>
        <li><strong>Past papers under timed conditions</strong>, then redo every question you dropped marks on.</li>
      </ul>
      <h3>English Language</h3>
      <ul>
        <li><strong>The writing question (Q5) is half the paper</strong> (40 marks on each paper). Planning, paragraphs and accurate punctuation are the fastest way to gain marks.</li>
        <li><strong>Analyse, don't retell.</strong> Pick a word, say what it suggests, and explain its effect on the reader.</li>
        <li><strong>Fix your three most common SPaG errors</strong> (e.g. comma splices, its/it's, their/there/they're). 16 marks on each paper are for technical accuracy.</li>
      </ul>
      <h3>How to use this app</h3>
      <ul>
        <li>Do <strong>one Smart mix a day</strong> for each subject. It keeps bringing back what you got wrong.</li>
        <li>Use the <strong>Focus timer</strong> for 2–3 sessions a day rather than one long cram.</li>
        <li>Check <strong>Progress</strong> weekly and put your weakest topic into the Planner.</li>
      </ul>
    </>
  );
}

function English() {
  return (
    <>
      <h2>AQA GCSE English Language</h2>
      <p>Two papers, each <strong>1 hour 45 minutes</strong> and <strong>80 marks</strong> (50% each).</p>
      <h3>Paper 1: Explorations in Creative Reading and Writing</h3>
      <div className="table-wrap"><table>
        <thead><tr><th>Question</th><th>What it asks</th><th>Marks</th><th>Suggested time</th></tr></thead>
        <tbody>
          <tr><td>Reading</td><td>Read the source (a fiction extract)</td><td>–</td><td>15 min</td></tr>
          <tr><td>Q1</td><td>List four things from a set part of the text</td><td>4</td><td>5 min</td></tr>
          <tr><td>Q2</td><td>How does the writer use language…?</td><td>8</td><td>10 min</td></tr>
          <tr><td>Q3</td><td>How has the writer structured the text…?</td><td>8</td><td>10 min</td></tr>
          <tr><td>Q4</td><td>"To what extent do you agree…" (evaluate)</td><td>20</td><td>20 min</td></tr>
          <tr><td>Q5</td><td>Descriptive or narrative writing</td><td>40</td><td>45 min</td></tr>
        </tbody>
      </table></div>
      <h3>Paper 2: Writers' Viewpoints and Perspectives</h3>
      <div className="table-wrap"><table>
        <thead><tr><th>Question</th><th>What it asks</th><th>Marks</th><th>Suggested time</th></tr></thead>
        <tbody>
          <tr><td>Reading</td><td>Two non-fiction sources (one from the 19th century)</td><td>–</td><td>15 min</td></tr>
          <tr><td>Q1</td><td>Choose four true statements</td><td>4</td><td>5 min</td></tr>
          <tr><td>Q2</td><td>Summarise the differences between the sources</td><td>8</td><td>10 min</td></tr>
          <tr><td>Q3</td><td>How does the writer use language…?</td><td>12</td><td>12 min</td></tr>
          <tr><td>Q4</td><td>Compare the writers' perspectives and methods</td><td>16</td><td>20 min</td></tr>
          <tr><td>Q5</td><td>Write to present a viewpoint (article, letter, speech…)</td><td>40</td><td>45 min</td></tr>
        </tbody>
      </table></div>
      <h3>Analysis paragraph formula</h3>
      <p><strong>Point → short quote → zoom in on a word → technique → effect on the reader.</strong> For example: <em>The writer uses the verb "clawed" to show… This suggests… making the reader feel…</em></p>
    </>
  );
}

function Maths() {
  return (
    <>
      <h2>GCSE Maths</h2>
      <p>All the main boards (AQA, Edexcel, OCR) set <strong>three papers of 1 hour 30 minutes, 80 marks each</strong>. <strong>Paper 1 is non-calculator</strong>; Papers 2 and 3 allow a calculator. Foundation tier goes up to grade 5; Higher tier covers grades 4–9.</p>
      <h3>Must-know formulas (you won't be given these)</h3>
      <div className="table-wrap"><table>
        <tbody>
          <tr><th>Area of a circle</th><td>πr²</td></tr>
          <tr><th>Circumference</th><td>πd or 2πr</td></tr>
          <tr><th>Area of a trapezium</th><td>½(a + b)h</td></tr>
          <tr><th>Pythagoras</th><td>a² + b² = c²</td></tr>
          <tr><th>Trigonometry</th><td>SOH CAH TOA: sin = O/H, cos = A/H, tan = O/A</td></tr>
          <tr><th>Compound interest</th><td>amount × (1 + r/100)ⁿ</td></tr>
          <tr><th>Speed</th><td>distance ÷ time</td></tr>
          <tr><th>Straight line</th><td>y = mx + c (m = gradient, c = y-intercept)</td></tr>
        </tbody>
      </table></div>
      <h3>Top tips</h3>
      <ul>
        <li>Read the question twice and underline what it asks for (units, rounding, "in terms of π").</li>
        <li>Write down every step. Method marks add up.</li>
        <li>If you're stuck, move on and come back. Never leave a blank: a sensible attempt can earn a mark.</li>
        <li>Use spare time to check answers with estimation or by working backwards.</li>
      </ul>
    </>
  );
}

function ExamDay() {
  return (
    <>
      <h2>Exam day checklist</h2>
      <ul>
        <li>Two black pens, pencil, ruler, rubber, protractor, compasses and a <strong>scientific calculator</strong> (check the battery!).</li>
        <li>Clear pencil case and a clear water bottle, with no labels.</li>
        <li>Phone and smartwatch switched off and handed in. Having one on you can mean disqualification.</li>
        <li>Arrive at least 15 minutes early. Know your candidate number.</li>
        <li>Sleep matters more than one more hour of cramming the night before.</li>
      </ul>
      <h3>In the exam</h3>
      <ul>
        <li>Check the marks for each question. Roughly <strong>1 mark ≈ 1 minute</strong>.</li>
        <li>For English, keep an eye on the clock and start Q5 with 45 minutes left, whatever happens.</li>
        <li>Leave 5 minutes at the end to check spelling, punctuation and units.</li>
      </ul>
    </>
  );
}
