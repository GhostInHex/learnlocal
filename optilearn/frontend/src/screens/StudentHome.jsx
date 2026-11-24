import { Link, useOutletContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  BookOpen,
  CalendarDots,
  ChartBar,
  ChatsCircle,
  ListChecks,
  Sparkle,
} from '@phosphor-icons/react'
import { getStudentProgress, getSubjects, listStudentQuizzes } from '../api/client'

function SummaryCell({ label, value }) {
  return (
    <div style={{ background: 'var(--surface)', padding: '16px 18px' }}>
      <div
        style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '1.55rem',
          lineHeight: 1.15,
          marginTop: 4,
        }}
      >
        {value}
      </div>
    </div>
  )
}

function ExploreRow({ to, Icon, label, hint }) {
  return (
    <Link
      to={to}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 2px',
        borderBottom: '1px solid var(--border)',
        textDecoration: 'none',
      }}
    >
      <span
        className="icon-only"
        style={{ width: 44, height: 44, background: 'var(--accent-soft)', borderColor: 'transparent', color: 'var(--accent-strong)' }}
      >
        <Icon size={20} weight="duotone" />
      </span>
      <span style={{ flex: 1, display: 'grid', gap: 2 }}>
        <span style={{ fontWeight: 700, fontSize: '0.98rem' }}>{label}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.83rem' }}>{hint}</span>
      </span>
      <ArrowRight size={16} weight="bold" style={{ color: 'var(--text-muted)' }} />
    </Link>
  )
}

export default function StudentHome() {
  const { student, studentId } = useOutletContext()
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects'], queryFn: getSubjects })
  const { data: progress } = useQuery({ queryKey: ['student-progress', studentId], queryFn: () => getStudentProgress(studentId) })
  const { data: quizzes = [] } = useQuery({
    queryKey: ['student-quizzes', studentId],
    queryFn: () => listStudentQuizzes(studentId),
    enabled: !!studentId,
  })

  const masteryAvg = progress?.mastery_by_topic?.length
    ? Math.round((progress.mastery_by_topic.reduce((acc, item) => acc + item.mastery, 0) / progress.mastery_by_topic.length) * 100)
    : null

  return (
    <section style={{ display: 'grid', gap: 30 }}>
      <header style={{ display: 'grid', gap: 14 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.09em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Sparkle size={14} weight="fill" />
              Your learning space
            </div>
            <h1 style={{ margin: '8px 0 6px', fontSize: '2rem', lineHeight: 1.1 }}>
              {student?.name || 'Learner'}
            </h1>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: 460 }}>
              Tap a card below to visit each part of your learning.
            </div>
          </div>
          <Link to={`/session/${studentId}`} className="pill-button primary" style={{ fontWeight: 700 }}>
            <ChatsCircle size={18} weight="duotone" />
            <span>Ask the AI Tutor</span>
          </Link>
        </div>
      </header>

      <div
        className="surface-card"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 1,
          background: 'var(--border)',
          overflow: 'hidden',
          padding: 0,
        }}
      >
        <SummaryCell label="My subjects" value={subjects.length} />
        <SummaryCell label="Tasks to do" value={quizzes.length} />
        <SummaryCell label="Understanding" value={masteryAvg === null ? '—' : `${masteryAvg}%`} />
        <SummaryCell label="My level" value={progress?.level || '—'} />
      </div>

      <div>
        <div
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: 4,
          }}
        >
          Explore
        </div>
        <ExploreRow to={`/student/${studentId}/courses`} Icon={BookOpen} label="Courses" hint="Learn one topic at a time" />
        <ExploreRow to={`/student/${studentId}/assignments`} Icon={ListChecks} label="Assignments" hint="Short tasks to help you practise" />
        <ExploreRow to={`/student/${studentId}/grades`} Icon={ChartBar} label="My progress" hint="See how far you have come" />
        <ExploreRow to={`/student/${studentId}/calendar`} Icon={CalendarDots} label="Calendar" hint="See what is coming up" />
      </div>

      <div>
        <div
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: 4,
          }}
        >
          Topics you are learning now
        </div>
        {subjects.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', paddingTop: 8 }}>
            Nothing here yet. Your teacher will add topics for you soon.
          </div>
        ) : (
          <div>
            {subjects.slice(0, 5).map((subject) => (
              <Link
                key={subject}
                to={`/student/${studentId}/course/${encodeURIComponent(subject)}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  padding: '12px 2px',
                  borderBottom: '1px solid var(--border)',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                  <BookOpen size={16} weight="duotone" style={{ color: 'var(--accent)' }} />
                  <span>{subject}</span>
                </span>
                <ArrowRight size={14} weight="bold" style={{ color: 'var(--text-muted)' }} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
