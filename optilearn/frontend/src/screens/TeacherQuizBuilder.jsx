import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createTeacherQuiz, listTeacherQuizzes, listStudents, createLiveGame } from '../api/client'
import { CheckCircle, ClipboardText, HourglassHigh, RocketLaunch } from '@phosphor-icons/react'
import SubjectComboInput from '../components/SubjectComboInput'

const BLANK_QUESTION = { question: '', options: ['', '', '', ''], correct_answer: '', explanation: '' }

function QuestionForm({ q, idx, onChange, onRemove }) {
  function updateOption(oi, val) {
    const opts = [...q.options]
    opts[oi] = val
    onChange({ ...q, options: opts })
  }

  return (
    <div style={{
      background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: 16,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Question {idx + 1}</span>
        {idx > 0 && (
          <button onClick={onRemove} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: '0.85rem' }}>
            Remove question
          </button>
        )}
      </div>

      <textarea
        value={q.question}
        onChange={e => onChange({ ...q, question: e.target.value })}
        placeholder="Write your question here"
        rows={2}
        style={{
          width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)', background: 'var(--color-surface)',
          color: 'var(--color-text)', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box', marginBottom: 10,
        }}
      />

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 6 }}>Answer choices - select the one that is correct</div>
        {q.options.map((opt, oi) => (
          <div key={oi} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
            <input
              type="radio"
              name={`correct-${idx}`}
              checked={q.correct_answer === opt && opt !== ''}
              onChange={() => onChange({ ...q, correct_answer: opt })}
              style={{ flexShrink: 0, width: 18, height: 18, cursor: 'pointer' }}
              title="Mark this as the correct answer"
            />
            <input
              value={opt}
              onChange={e => updateOption(oi, e.target.value)}
              placeholder={`Option ${oi + 1}`}
              style={{
                flex: 1, padding: '7px 11px', borderRadius: 'var(--radius-md)',
                border: `1px solid ${q.correct_answer === opt && opt !== '' ? 'var(--color-success)' : 'var(--color-border)'}`,
                background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.9rem',
              }}
            />
          </div>
        ))}
        {q.correct_answer && (
          <div style={{ fontSize: '0.78rem', color: 'var(--color-success)', marginTop: 4 }}>
            Correct answer: "{q.correct_answer}"
          </div>
        )}
      </div>

      <div>
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>Feedback to show after students answer</div>
        <input
          value={q.explanation}
          onChange={e => onChange({ ...q, explanation: e.target.value })}
          placeholder="e.g. A fraction is part of a whole. Think about how the whole is shared out."
          style={{
            width: '100%', padding: '7px 11px', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)', background: 'var(--color-surface)',
            color: 'var(--color-text)', fontSize: '0.9rem', boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  )
}

function QuizPreview({ title, subject, questions }) {
  const valid = questions.filter(q => q.question && q.correct_answer && q.options.some(o => o))
  return (
    <div style={{
      background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)', padding: '20px 16px',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{title || '(No title yet)'}</div>
      {subject && <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: 12 }}>{subject}</div>}
      {valid.length === 0 ? (
        <p style={{ color: 'var(--color-text-hint)', fontSize: '0.85rem' }}>Finish at least one question and it will appear here.</p>
      ) : valid.map((q, i) => (
        <div key={i} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 6 }}>{i + 1}. {q.question}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {q.options.filter(o => o).map((opt, oi) => (
              <div key={oi} style={{
                padding: '6px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem',
                background: opt === q.correct_answer ? '#14532d' : 'var(--color-surface)',
                color: opt === q.correct_answer ? '#4ade80' : 'var(--color-text)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span>{opt}</span>
                {opt === q.correct_answer ? <CheckCircle size={14} weight="fill" /> : null}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function TeacherQuizBuilder({ embedded = false }) {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [assignedTo, setAssignedTo] = useState('all')
  const [questions, setQuestions] = useState([{ ...BLANK_QUESTION }])
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [quizSearch, setQuizSearch] = useState('')
  const [launchingId, setLaunchingId] = useState(null)

  const { data: students } = useQuery({ queryKey: ['students'], queryFn: listStudents })
  const { data: quizzes, isLoading } = useQuery({
    queryKey: ['teacher-quizzes'],
    queryFn: listTeacherQuizzes,
    refetchInterval: 15000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  const filteredQuizzes = useMemo(() => {
    const q = quizSearch.trim().toLowerCase()
    const rows = quizzes || []
    if (!q) return rows
    return rows.filter((quiz) => [
      quiz.title,
      quiz.subject,
      quiz.created_by_username,
      quiz.created_by_display_name,
      quiz.created_by,
    ].some((value) => String(value || '').toLowerCase().includes(q)))
  }, [quizzes, quizSearch])

  const mutation = useMutation({
    mutationFn: createTeacherQuiz,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-quizzes'] })
      setTitle('')
      setSubject('')
      setAssignedTo('all')
      setQuestions([{ ...BLANK_QUESTION }])
      setError('')
    },
    onError: err => setError(err.message),
  })

  function updateQuestion(idx, updated) {
    setQuestions(qs => qs.map((q, i) => i === idx ? updated : q))
  }

  function addQuestion() {
    setQuestions(qs => [...qs, { ...BLANK_QUESTION }])
  }

  function removeQuestion(idx) {
    setQuestions(qs => qs.filter((_, i) => i !== idx))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) { setError('Your quiz needs a title.'); return }
    if (!subject.trim()) { setError('Please add a subject. Pick one from the list, or press Add to confirm a new subject.'); return }

    const valid = questions.filter(q => q.question.trim() && q.correct_answer && q.options.filter(o => o.trim()).length >= 2)
    if (valid.length === 0) {
      setError('Add at least one finished question. Each one needs the question itself, two or more choices, and a correct answer selected.')
      return
    }

    setError('')
    const cleanQuestions = valid.map(q => ({
      question: q.question.trim(),
      options: q.options.filter(o => o.trim()),
      correct_answer: q.correct_answer,
      explanation: q.explanation.trim(),
    }))

    mutation.mutate({ title: title.trim(), subject: subject.trim() || undefined, questions: cleanQuestions, assigned_to: assignedTo })
  }

  async function launchGame(quizId) {
    setLaunchingId(quizId)
    try {
      const result = await createLiveGame(quizId)
      navigate(`/teacher/live-quiz/${result.game_id}`)
    } catch (err) {
      alert(err.message || 'We could not start the live quiz.')
    } finally {
      setLaunchingId(null)
    }
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)', background: 'var(--color-surface-2)',
    color: 'var(--color-text)', fontSize: '1rem', boxSizing: 'border-box',
  }
  const card = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '20px 16px', marginBottom: 24 }
  const sectionHead = { fontSize: '1rem', fontWeight: 700, marginBottom: 16, marginTop: 0 }

  const content = (
    <>
      {!embedded && (
        <header style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>Build a Quiz</span>
        </header>
      )}

      <main style={{ maxWidth: embedded ? 1040 : 900, margin: '0 auto', padding: embedded ? 0 : '24px 16px', display: 'grid', gridTemplateColumns: showPreview ? '1fr 1fr' : '1fr', gap: 24, width: '100%', boxSizing: 'border-box' }}>
        {embedded && (
          <section style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 10 }}>
            <ClipboardText size={24} weight="duotone" color="var(--color-text)" />
            <h1 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--color-text)' }}>Build a Quiz</h1>
          </section>
        )}

        <div>
          {/* Builder form */}
          <section style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ ...sectionHead, marginBottom: 0 }}>Create a New Quiz</h2>
              <button
                onClick={() => setShowPreview(p => !p)}
                style={{ padding: '6px 16px', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                {showPreview ? 'Hide preview' : 'Show preview'}
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 6 }}>Give your quiz a title *</label>
                <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Quick Check on Fractions" required />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 6 }}>Subject *</label>
                <SubjectComboInput value={subject} onChange={setSubject} required error={error.startsWith('Subject') ? error : ''} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 6 }}>Who should take this quiz?</label>
                <select
                  value={assignedTo}
                  onChange={e => setAssignedTo(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="all">All students</option>
                  {(students || []).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 12 }}>Questions in this quiz</div>
                {questions.map((q, idx) => (
                  <QuestionForm
                    key={idx}
                    q={q}
                    idx={idx}
                    onChange={updated => updateQuestion(idx, updated)}
                    onRemove={() => removeQuestion(idx)}
                  />
                ))}
                <button
                  type="button"
                  onClick={addQuestion}
                  style={{
                    padding: '8px 16px', background: 'transparent',
                    border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)',
                    color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.9rem', width: '100%',
                  }}
                >
                  + Add another question
                </button>
              </div>

              {error && <p style={{ color: 'var(--color-danger)', margin: 0, fontSize: '0.9rem' }}>{error}</p>}
              {mutation.isSuccess && <p style={{ color: '#4ade80', margin: 0, fontSize: '0.9rem' }}>Saved. Your students can take this quiz now.</p>}

              <button
                type="submit"
                disabled={mutation.isPending}
                style={{
                  padding: '12px', minHeight: 44,
                  background: mutation.isPending ? 'var(--color-primary-dim)' : 'var(--color-primary)',
                  color: '#fff', border: 'none', borderRadius: 'var(--radius-md)',
                  fontSize: '1rem', fontWeight: 600, cursor: mutation.isPending ? 'default' : 'pointer',
                }}
              >
                {mutation.isPending ? 'Saving…' : 'Save and Assign Quiz'}
              </button>
            </form>
          </section>

          {/* Existing quizzes list */}
          <section style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              <h2 style={{ ...sectionHead, marginBottom: 0 }}>Quizzes You Have Made</h2>
              <input
                value={quizSearch}
                onChange={(e) => setQuizSearch(e.target.value)}
                placeholder="Search by title or teacher name..."
                style={{ ...inputStyle, maxWidth: 320, minHeight: 42, fontSize: '0.9rem' }}
              />
            </div>
            {isLoading ? (
              <p style={{ color: 'var(--color-text-muted)' }}>Loading…</p>
            ) : !quizzes?.length ? (
              <p style={{ color: 'var(--color-text-hint)' }}>You have not made any quizzes yet.</p>
            ) : filteredQuizzes.length === 0 ? (
              <p style={{ color: 'var(--color-text-hint)' }}>Nothing matches that search.</p>
            ) : filteredQuizzes.map((q, i) => (
              <div key={q.id} style={{
                display: 'flex', gap: 12, alignItems: 'center',
                padding: '12px 0', borderBottom: i < filteredQuizzes.length - 1 ? '1px solid var(--color-border)' : 'none',
                flexWrap: 'wrap',
              }}>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ fontWeight: 600 }}>{q.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    {q.subject || '—'} · {q.question_count} question{q.question_count !== 1 ? 's' : ''} · Made by {q.created_by_username || q.created_by_display_name || '-'}
                  </div>
                </div>
              <span style={{
                  padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem',
                  background: 'var(--color-surface-2)', color: 'var(--color-text-muted)',
                }}>
                  {q.assigned_to === 'all' ? 'All students' : `One student: ${q.assigned_to.slice(0, 8)}…`}
                </span>
                <button
                  id={`launch-live-quiz-${q.id}`}
                  onClick={() => launchGame(q.id)}
                  disabled={launchingId === q.id}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: launchingId === q.id
                      ? 'var(--color-surface-2)'
                      : 'var(--accent)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: launchingId === q.id ? 'default' : 'pointer',
                    minHeight: 36,
                    whiteSpace: 'nowrap',
                    boxShadow: launchingId === q.id ? 'none' : '0 2px 12px rgba(181,84,44,0.28)',
                    transition: 'all 0.2s',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {launchingId === q.id ? <><HourglassHigh size={16} weight="bold" /><span>Starting…</span></> : <><RocketLaunch size={16} weight="bold" /><span>Start as Live Quiz</span></>}
                </button>
              </div>
            ))}
          </section>
        </div>

        {/* Preview pane */}
        {showPreview && (
          <div>
            <div style={{ ...card, position: 'sticky', top: 20 }}>
              <h2 style={sectionHead}>Student View</h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: 12 }}>
                This is what your students will see. The correct answer for each question is shown in green.
              </p>
              <QuizPreview title={title} subject={subject} questions={questions} />
            </div>
          </div>
        )}

      </main>
    </>
  )

  if (embedded) return content
  return <div className="page-shell">{content}</div>
}
