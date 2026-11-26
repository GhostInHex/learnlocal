import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  BookOpen,
  CalendarDots,
  ChatsCircle,
  ChartBar,
  DoorOpen,
  GameController,
  House,
  Key,
  ListChecks,
  List,
  Megaphone,
  Moon,
  Radio,
  SignOut,
  Sparkle,
  Student,
  TextAa,
  Sun,
  Trophy,
  X,
} from '@phosphor-icons/react'
import { getStudent, changeStudentPin, getHealth } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import NetworkStatusPill from './NetworkStatusPill'
import GetAppBanner from './GetAppBanner'

function ChangePinModal({ studentId, onClose }) {
  const [form, setForm] = useState({ current_pin: '', new_pin: '', confirm_pin: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  function onlyDigits(val) {
    return val.replace(/\D/g, '').slice(0, 4)
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!form.current_pin || !form.new_pin || !form.confirm_pin) {
      setError('A few boxes are still empty - fill them all in to continue.')
      return
    }
    if (!/^\d{4}$/.test(form.new_pin)) {
      setError('Your new PIN needs 4 numbers - no more, no fewer.')
      return
    }
    if (form.new_pin !== form.confirm_pin) {
      setError('Those two new PINs look different - check them and try again.')
      return
    }
    setSaving(true)
    try {
      await changeStudentPin({ student_id: studentId, current_pin: form.current_pin, new_pin: form.new_pin, confirm_pin: form.confirm_pin })
      setDone(true)
      setTimeout(onClose, 1200)
    } catch (err) {
      setError(err.message || 'Your PIN stayed the same - that update did not go through.')
      setSaving(false)
    }
  }

  const inputStyle = {
    minHeight: 44,
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: '9px 14px',
    background: 'var(--surface-soft)',
    color: 'var(--text)',
    fontSize: '1.1rem',
    letterSpacing: '0.25em',
    width: '100%',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', padding: 18 }}>
      <form onSubmit={submit} style={{ width: '100%', maxWidth: 340, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 22, display: 'grid', gap: 14, boxShadow: 'var(--shadow)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', color: 'var(--accent)' }}>
            <Key size={18} weight="duotone" />
          </span>
          <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Set a new PIN</h2>
          <button type="button" onClick={onClose} style={{ marginLeft: 'auto', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--success)', fontWeight: 700 }}>All set - your new PIN is ready to use!</div>
        ) : (
          <>
            {[
              ['current_pin', 'The PIN you use now'],
              ['new_pin', 'Your new PIN'],
              ['confirm_pin', 'Type the new PIN again'],
            ].map(([key, label]) => (
              <label key={key} style={{ display: 'grid', gap: 6, fontSize: '0.83rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                {label}
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  autoComplete="off"
                  value={form[key]}
                  onChange={(e) => setForm(f => ({ ...f, [key]: onlyDigits(e.target.value) }))}
                  style={inputStyle}
                  placeholder="••••"
                />
              </label>
            ))}
            {error && <div style={{ color: 'var(--danger)', fontSize: '0.84rem' }}>{error}</div>}
            <button type="submit" disabled={saving} style={{ minHeight: 44, borderRadius: 12, border: 'none', background: 'var(--accent)', color: 'var(--accent-contrast)', fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.72 : 1, fontSize: '0.95rem' }}>
              {saving ? 'Saving…' : 'Save new PIN'}
            </button>
          </>
        )}
      </form>
    </div>
  )
}

const NAV_ITEMS = [
  { to: '', label: 'Home', Icon: House, end: true, key: 'home' },
  { to: 'courses', label: 'My Courses', Icon: BookOpen, key: 'courses' },
  { to: 'assignments', label: 'My Work', Icon: ListChecks, key: 'assignments' },
  { to: 'grades', label: 'My Progress', Icon: ChartBar, key: 'grades' },
  { to: 'calendar', label: 'My Week', Icon: CalendarDots, key: 'calendar' },
  { to: 'announcements', label: 'News & Notes', Icon: Megaphone, key: 'announcements' },
]

const EXTRA_ITEMS = [
  { suffix: '/session', label: 'Study Help', Icon: ChatsCircle },
  { suffix: '/translate-learn', label: 'Translate to Learn', Icon: BookOpen },
  { suffix: '/live-translator', label: 'Listen Live', Icon: Radio },
]

const LIVE_QUIZ_ITEM = { to: '/join', label: 'Play a Live Quiz', Icon: GameController }

export function avatarColor(name) {
  const palette = ['#b5542c', '#b07e2b', '#5d8148', '#a85b47', '#75813f', '#96503a']
  let h = 0
  for (const c of name || '') h = c.charCodeAt(0) + ((h << 5) - h)
  return palette[Math.abs(h) % palette.length]
}

export function getInitials(name) {
  return (name || '?')
    .split(' ')
    .map((chunk) => chunk[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function NavButton({ to, end, Icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      title={label}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        textDecoration: 'none',
        borderRadius: 12,
        border: 'none',
        borderLeft: `3px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
        background: isActive ? 'var(--accent-soft)' : 'transparent',
        color: isActive ? 'var(--accent-strong)' : 'var(--text)',
        padding: '9px 12px 9px 10px',
      })}
    >
      <Icon size={20} weight="duotone" style={{ flexShrink: 0 }} />
      <span style={{ fontWeight: 600, fontSize: '0.95rem', lineHeight: 1.2 }}>{label}</span>
    </NavLink>
  )
}

function NavGroupLabel({ children }) {
  return (
    <div
      style={{
        fontSize: '0.68rem',
        fontWeight: 700,
        letterSpacing: '0.09em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        padding: '0 12px',
        marginTop: 6,
      }}
    >
      {children}
    </div>
  )
}

function Sidebar({ studentId, student, onNavigate }) {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [pinOpen, setPinOpen] = useState(false)
  const [fontModalOpen, setFontModalOpen] = useState(false)
  const [fontDraft, setFontDraft] = useState(() => localStorage.getItem('optilearn_font') || 'default')
  const [fontChoice, setFontChoice] = useState(() => localStorage.getItem('optilearn_font') || 'default')

  const syncFontAttribute = (choice) => {
    if (choice === 'opendyslexia' || choice === 'geist') {
      document.documentElement.setAttribute('data-font', choice)
    } else {
      document.documentElement.removeAttribute('data-font')
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem('optilearn_font') || 'default'
    setFontChoice(saved)
    setFontDraft(saved)
    syncFontAttribute(saved)
  }, [])

  const applyFontChoice = (choice) => {
    setFontChoice(choice)
    setFontDraft(choice)
    localStorage.setItem('optilearn_font', choice)
    syncFontAttribute(choice)
  }

  const primaryLinks = useMemo(
    () => NAV_ITEMS.map((item) => ({ ...item, route: item.end ? `/student/${studentId}` : `/student/${studentId}/${item.to}` })),
    [studentId]
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 16, padding: '20px 16px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '0 6px' }}>
        <img src="/icons/icon.svg" alt="LearnLocal" style={{ width: 40, height: 40, display: 'block', objectFit: 'contain' }} />
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.18rem', lineHeight: 1.1 }}>LearnLocal</div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Learning for every learner</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '13px 6px', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: avatarColor(student?.name || ''),
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 800,
            fontSize: '1.05rem',
            flexShrink: 0,
          }}
        >
          {getInitials(student?.name)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{student?.name || 'Learner'}</div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Class {student?.grade_level || '-'} - {student?.language?.toUpperCase() || '--'}</div>
        </div>
      </div>

      <div role="status" aria-live="polite">
        <NetworkStatusPill variant="inline" fullWidth dropdownAlign="left" />
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }} aria-label="Main sections">
        <div data-tour="student-learn" style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <NavGroupLabel>Learn</NavGroupLabel>
          {primaryLinks.map(({ route, end, label, Icon, key }) => (
            <NavButton key={key} to={route} end={end} label={label} Icon={Icon} onClick={onNavigate} />
          ))}
        </div>

        <div data-tour="student-tools" style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <NavGroupLabel>Tools</NavGroupLabel>
          {EXTRA_ITEMS.map(({ suffix, label, Icon }) => (
            <NavButton key={suffix} to={`/student/${studentId}${suffix}`} label={label} Icon={Icon} onClick={onNavigate} />
          ))}
          <NavButton to={LIVE_QUIZ_ITEM.to} label={LIVE_QUIZ_ITEM.label} Icon={LIVE_QUIZ_ITEM.Icon} onClick={onNavigate} />
        </div>
      </nav>

      <div style={{ marginTop: 'auto', display: 'grid', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
        <GetAppBanner compact />
        <button type="button" onClick={() => { setFontDraft(fontChoice); setFontModalOpen(true) }} className="pill-button" aria-label="Choose a reading font">
          <TextAa size={18} weight="duotone" />
          <span>Adjust Font</span>
        </button>
        <button type="button" onClick={toggleTheme} className="pill-button" aria-label="Switch light or dark">
          {theme === 'dark' ? <Sun size={18} weight="duotone" /> : <Moon size={18} weight="duotone" />}
          <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
        <button type="button" className="pill-button" onClick={() => setPinOpen(true)}>
          <Key size={18} weight="duotone" />
          <span>New PIN</span>
        </button>
        <button
          type="button"
          className="pill-button"
          onClick={() => {
            logout()
            navigate('/')
          }}
        >
          <SignOut size={18} weight="duotone" />
          <span>Log out</span>
        </button>
      </div>

      {fontModalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 2200, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', padding: 18 }}
          onClick={() => setFontModalOpen(false)}
        >
          <div
            style={{ width: '100%', maxWidth: 420, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 22, display: 'grid', gap: 14, boxShadow: 'var(--shadow)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', color: 'var(--accent)' }}>
                <TextAa size={18} weight="duotone" />
              </span>
              <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Pick your reading font</h2>
              <button type="button" onClick={() => setFontModalOpen(false)} style={{ marginLeft: 'auto', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--surface-soft)', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="font-choice"
                  value="default"
                  checked={fontDraft === 'default'}
                  onChange={() => setFontDraft('default')}
                />
                <span>Standard lettering</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--surface-soft)', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="font-choice"
                  value="geist"
                  checked={fontDraft === 'geist'}
                  onChange={() => setFontDraft('geist')}
                />
                <span>Geist, clean modern lettering</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--surface-soft)', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="font-choice"
                  value="opendyslexia"
                  checked={fontDraft === 'opendyslexia'}
                  onChange={() => setFontDraft('opendyslexia')}
                />
                <span>OpenDyslexia, easier to read</span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setFontModalOpen(false)} style={{ minHeight: 44, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 700, cursor: 'pointer', flex: 1 }}>
                Keep current
              </button>
              <button type="button" onClick={() => { applyFontChoice(fontDraft); setFontModalOpen(false) }} style={{ minHeight: 44, borderRadius: 12, border: 'none', background: 'var(--accent)', color: 'var(--accent-contrast)', fontWeight: 700, cursor: 'pointer', flex: 1 }}>
                Use this font
              </button>
            </div>
          </div>
        </div>
      )}

      {pinOpen && <ChangePinModal studentId={studentId} onClose={() => setPinOpen(false)} />}
    </div>
  )
}

export default function StudentLayout() {
  const { studentId } = useParams()
  const [isMobile, setIsMobile] = useState(window.innerWidth < 980)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine)
  const [showQuickExitModal, setShowQuickExitModal] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  // Platform detection (treat as desktop only when pywebview quit API is available)
  const getPlatform = () => {
    const ua = navigator.userAgent.toLowerCase()
    const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(ua)
    const hasPyWebViewQuit = typeof window !== 'undefined' && window.pywebview && window.pywebview.api && typeof window.pywebview.api.quit === 'function'

    if (hasPyWebViewQuit) return 'desktop'
    if (isMobileDevice) return 'mobile'
    return 'browser'
  }

  const showGoodbyePage = () => {
    document.body.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        background: var(--bg);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        color: var(--text);
        text-align: center;
        padding: 20px;
      ">
        <div style="max-width: 520px;">
          <h1 style="font-size: 1.5rem; margin-bottom: 16px;">It is safe to close this window now</h1>
          <p style="color: var(--text-muted); margin: 0; line-height: 1.6;">
            Still here? Press <strong>Ctrl+W</strong> (Windows/Linux) or <strong>Cmd+W</strong> (Mac),
            or close the app from your device controls.
          </p>
        </div>
      </div>
    `
  }

  // Perform the actual exit with robust fallbacks and timeout
  const confirmExit = async () => {
    const platform = getPlatform()

    const fallbackDelay = 800 // ms

    // Give immediate visible feedback that the Exit click was handled.
    setIsExiting(true)

    try {
      if (platform === 'desktop') {
        // Prefer the pywebview API, but guard with a timeout fallback.
        let finished = false
        setTimeout(() => {
          try {
            const quitApi = window.pywebview && window.pywebview.api && window.pywebview.api.quit
            if (typeof quitApi === 'function') {
              void quitApi.call(window.pywebview.api)
            } else {
              console.warn('pywebview quit API is unavailable')
            }
          } catch (err) {
            console.error('pywebview.api.quit() failed:', err)
          }
        }, 0)
        setTimeout(() => {
          if (!finished) {
            console.warn('Quit did not complete, falling back to window.close() and goodbye page')
            try { window.close() } catch (_) {}
            showGoodbyePage()
          }
        }, fallbackDelay)
        return
      }

      if (platform === 'mobile') {
        // Many mobile browsers/webviews disallow window.close(); replace content
        // and attempt benign navigations that reduce visibility of the app.
        try {
          window.location.href = 'about:blank'
        } catch (_) {}
        setTimeout(() => showGoodbyePage(), 250)
        return
      }

      // Browser/tab path: try window.close(), opener, PWA, then goodbye page.
      try {
        const closed = window.close()
        if (closed) return
      } catch (err) {
        console.error('window.close() error:', err)
      }

      if (window.opener && !window.opener.closed) {
        try { window.opener.focus(); window.close(); return } catch (_) {}
      }

      if (window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches) {
        try { window.close(); return } catch (_) {}
      }

      // Final fallback: show goodbye page so user can close manually.
      showGoodbyePage()
    } catch (err) {
      console.error('confirmExit unexpected error:', err)
      showGoodbyePage()
      setIsExiting(false)
    }
  }

  // Handle quick exit button click - show modal instead of immediate exit
  const handleQuickExit = () => {
    setShowQuickExitModal(true)
  }

  const { data: student } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => getStudent(studentId),
  })

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 980)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!isMobile) setMenuOpen(false)
  }, [isMobile])

  useEffect(() => {
    let active = true
    const markOffline = () => active && setIsOffline(true)
    const checkConnection = async () => {
      if (!navigator.onLine) {
        markOffline()
        return
      }
      try {
        await getHealth()
        if (active) setIsOffline(false)
      } catch (_) {
        markOffline()
      }
    }
    window.addEventListener('offline', markOffline)
    window.addEventListener('online', checkConnection)
    checkConnection()
    const id = setInterval(checkConnection, 15000)
    return () => {
      active = false
      clearInterval(id)
      window.removeEventListener('offline', markOffline)
      window.removeEventListener('online', checkConnection)
    }
  }, [])

  return (
    <div className="app-shell" style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '272px 1fr',
      height: isMobile ? 'auto' : '100vh',
      overflow: isMobile ? 'visible' : 'hidden',
      paddingTop: isOffline ? 32 : 0,
      boxSizing: 'border-box',
    }}>
      {isOffline && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: 32,
            background: 'var(--accent-soft)',
            color: 'var(--accent-strong)',
            display: 'grid',
            placeItems: 'center',
            fontSize: '0.84rem',
            fontWeight: 700,
            zIndex: 2500,
            borderBottom: '1px solid var(--border)',
          }}
        >
          You are offline - everything you did is safely saved
        </div>
      )}
      <button 
        className="quick-exit"
        onClick={handleQuickExit}
        type="button"
        title="Leave quickly to a plain page"
        style={{ border: 'none', cursor: 'pointer' }}
      >
        <DoorOpen size={16} weight="bold" />
        <span>Leave Quickly</span>
      </button>

      {!isMobile && (
        <aside className="student-sidebar-scroll" style={{
          borderRight: '1px solid var(--border)',
          height: isOffline ? 'calc(100vh - 32px)' : '100vh',
          minHeight: 0,
          overflowY: 'auto',
        }}>
          <Sidebar student={student} studentId={studentId} onNavigate={() => {}} />
        </aside>
      )}

      {isMobile && (
        <>
          <header
            style={{
              margin: 0,
              padding: '12px 14px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg)',
              position: 'sticky',
              top: 0,
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <button className="icon-only" onClick={() => setMenuOpen(true)} aria-label="Open the menu">
              <List size={20} weight="bold" />
            </button>
            <div style={{ fontWeight: 700, flex: 1, fontFamily: 'var(--font-display)', fontSize: '1.05rem' }}>My Learning Space</div>
            <span className="icon-only" aria-hidden>
              <Sparkle size={18} weight="duotone" />
            </span>
          </header>

          {menuOpen && (
            <div
              style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.55)', zIndex: 30 }}
              onClick={() => setMenuOpen(false)}
              aria-hidden
            />
          )}

          {menuOpen && (
            <aside
              className="student-sidebar-scroll"
              style={{
                position: 'fixed',
                zIndex: 40,
                inset: '0 auto 0 0',
                width: 274,
                height: isOffline ? 'calc(100vh - 32px)' : '100vh',
                background: 'var(--bg)',
                borderRight: '1px solid var(--border)',
                overflowY: 'auto',
              }}
            >
              <button className="icon-only" style={{ margin: 14 }} onClick={() => setMenuOpen(false)} aria-label="Close the menu">
                <X size={20} weight="bold" />
              </button>
              <Sidebar student={student} studentId={studentId} onNavigate={() => setMenuOpen(false)} />
            </aside>
          )}
        </>
      )}

      <main style={{
        height: isMobile ? 'auto' : isOffline ? 'calc(100vh - 32px)' : '100vh',
        minHeight: isMobile ? '100vh' : 0,
        padding: isMobile ? '18px 16px 30px' : '28px 32px 40px',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        overflowY: isMobile ? 'visible' : 'auto',
      }}>
        <Outlet context={{ student, studentId }} />
      </main>

      {showQuickExitModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
                    display: 'grid',
          placeItems: 'center',
          zIndex: 3000,
          padding: '16px',
        }}>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '18px',
            padding: '28px',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
            display: 'grid',
            gap: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'var(--accent-soft)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--accent)',
                flexShrink: 0,
              }}>
                <DoorOpen size={22} weight="duotone" />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>Leave LearnLocal?</h2>
            </div>

            <p style={{
              margin: 0,
              fontSize: '0.95rem',
              color: 'var(--text-muted)',
              lineHeight: '1.5',
            }}>
              Checking in: are you alright? If something feels off, reach out to your teacher before you head out.
            </p>

            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '12px',
            }}>
              <button
                type="button"
                onClick={() => setShowQuickExitModal(false)}
                disabled={isExiting}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  cursor: isExiting ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                  opacity: isExiting ? 0.65 : 1,
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'var(--surface-soft)' }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
              >
                Stay here
              </button>
              <button
                type="button"
                onClick={confirmExit}
                disabled={isExiting}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: 'none',
                  background: 'var(--accent)',
                  color: 'var(--accent-contrast)',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  cursor: isExiting ? 'not-allowed' : 'pointer',
                  transition: 'opacity 0.2s',
                  opacity: isExiting ? 0.65 : 1,
                }}
                onMouseOver={(e) => { e.currentTarget.style.opacity = '0.85' }}
                onMouseOut={(e) => { e.currentTarget.style.opacity = '1' }}
              >
                {isExiting ? 'Leaving...' : 'Yes, leave'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


