import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle, Eye, EyeSlash, LockKey, Student, UserCircle, UserPlus, WarningCircle, FileZip, ArrowRight, Info } from '@phosphor-icons/react'
import { checkStudentUsername, feature1, getSetupRequired, loginStudent, loginTeacher, signupStudent, importStudentArchive } from '../api/client'
import { useAuth } from '../context/AuthContext'
import GetAppBanner from '../components/GetAppBanner'
import LanguageSelect from '../components/LanguageSelect'

const GRADES = ['Pre-K', 'K', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th']

const FALLBACK_LANGUAGES = [{ code: 'en', name: 'English', flag: 'GB' }]

const inputStyle = {
  minHeight: 46,
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '10px 12px',
  background: 'var(--surface)',
  color: 'var(--text)',
  width: '100%',
}

const secretInputProps = {
  type: 'text',
  autoComplete: 'off',
  spellCheck: false,
  'data-lpignore': 'true',
  'data-1p-ignore': 'true',
  'data-form-type': 'other',
}

function Field({ label, hint, children, status }) {
  return (
    <label style={{ display: 'grid', gap: 5 }}>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.84rem', fontWeight: 600 }}>{label}</span>
      {children}
      {(hint || status) && (
        <span style={{ color: status?.tone || 'var(--text-muted)', fontSize: '0.78rem', minHeight: 18 }}>
          {status?.text || hint}
        </span>
      )}
    </label>
  )
}

export default function HomeScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { loginTeacher: storeTeacher, loginStudent: storeStudent, teacherToken, studentId } = useAuth()
  const [tab, setTab] = useState('signin')
  const [showSecret, setShowSecret] = useState(false)
  const [checkingSetup, setCheckingSetup] = useState(true)

  const [signin, setSignin] = useState({ username: '', password: '' })
  const [signup, setSignup] = useState({ name: '', username: '', grade_level: '7th', language: 'en', pin: '', confirmPin: '' })
  const [languages, setLanguages] = useState([])
  const [usernameState, setUsernameState] = useState({ status: 'idle', message: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [importPin, setImportPin] = useState('')
  const [importModal, setImportModal] = useState(false)
  const [importSuccess, setImportSuccess] = useState(false)

  const sessionMessage = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get('reason') === 'session_expired'
      ? 'Your session has ended. Please sign in again to continue.'
      : ''
  }, [location.search])

  useEffect(() => {
    getSetupRequired()
      .then((data) => {
        if (data.setup_required) navigate('/setup', { replace: true })
        else if (teacherToken) navigate('/teacher', { replace: true })
        else if (studentId) navigate(`/student/${studentId}`, { replace: true })
      })
      .finally(() => setCheckingSetup(false))
  }, [navigate, teacherToken, studentId])

  useEffect(() => {
    feature1.getLanguages()
      .then((items) => setLanguages(Array.isArray(items) ? items : []))
      .catch(() => setLanguages(FALLBACK_LANGUAGES))
  }, [])

  useEffect(() => {
    const username = signup.username.trim()
    if (tab !== 'signup' || username.length < 3) {
      setUsernameState({ status: 'idle', message: '' })
      return
    }
    setUsernameState({ status: 'checking', message: 'Checking if that name is free...' })
    const id = setTimeout(() => {
      checkStudentUsername(username)
        .then((res) => {
          setUsernameState(res.available
            ? { status: 'ok', message: 'Great, that name is free to use.' }
            : { status: 'taken', message: 'That name is taken. Please try another one.' })
        })
        .catch((err) => setUsernameState({ status: 'taken', message: err.message || 'Please try a shorter, simpler name.' }))
    }, 500)
    return () => clearTimeout(id)
  }, [signup.username, tab])

  async function submitSignin(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const username = signin.username.trim()
    const password = signin.password
    try {
      const teacher = await loginTeacher({ username, password })
      storeTeacher(teacher)
      navigate('/teacher', { replace: true })
      return
    } catch (teacherErr) {
      if (teacherErr.status && teacherErr.status !== 401) {
        setError(teacherErr.message)
        setBusy(false)
        return
      }
    }

    try {
      const student = await loginStudent({ username, pin: password })
      storeStudent(student.student_id)
      const params = new URLSearchParams(location.search)
      const redirect = params.get('redirect')
      navigate(redirect || `/student/${student.student_id}`, { replace: true })
    } catch (_) {
      setError('We could not match those details. Please check them and try again.')
      setBusy(false)
    }
  }

  async function submitSignup(e) {
    e.preventDefault()
    setError('')
    if (!signup.name.trim()) {
      setError('Please tell us your name to continue.')
      return
    }
    if (usernameState.status !== 'ok') {
      setError('Please pick a username that is still free.')
      return
    }
    if (!/^\d{4}$/.test(signup.pin)) {
      setError('Your PIN needs to be exactly 4 numbers.')
      return
    }
    if (signup.pin !== signup.confirmPin) {
      setError('Your PINs are different. Please enter the same PIN twice.')
      return
    }
    setBusy(true)
    try {
      const student = await signupStudent({
        name: signup.name.trim(),
        username: signup.username.trim(),
        pin: signup.pin,
        grade_level: signup.grade_level,
        language: signup.language,
      })
      storeStudent(student.student_id)
      const params = new URLSearchParams(location.search)
      const redirect = params.get('redirect')
      navigate(redirect || `/student/${student.student_id}`, { replace: true })
    } catch (err) {
      setError(err.message || 'We could not create your account. Please try again.')
      setBusy(false)
    }
  }

  function handleImportFileSelect(file) {
    if (file) {
      setImportFile(file)
      setImportPin('')
      setImportModal(true)
    }
  }

  async function submitImport() {
    if (!importFile || !importPin) return
    setError('')
    setBusy(true)
    try {
      await importStudentArchive({ file: importFile, pin: importPin })
      setBusy(false)
      setImportModal(false)
      setImportSuccess(true)
      setImportFile(null)
      setImportPin('')
    } catch (err) {
      setBusy(false)
      setError(err.message || 'Please check your PIN and file, then try again.')
    }
  }

  if (checkingSetup) return <div style={{ minHeight: '100vh', background: 'var(--bg)' }} />

  if (importSuccess) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 18, boxSizing: 'border-box' }}>
        <section style={{ width: '100%', maxWidth: 480, display: 'grid', gap: 20, textAlign: 'center' }}>
          <div className="surface-card" style={{ padding: 32, display: 'grid', gap: 16 }}>
            <div style={{ margin: '0 auto' }}>
              <CheckCircle size={56} weight="fill" style={{ color: 'var(--success)' }} />
            </div>
            <div>
              <h2 style={{ margin: '0 0 8px', fontSize: '1.5rem', fontWeight: 800 }}>All done, welcome back</h2>
              <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)' }}>Your learning profile is back. Sign in with the details you used before.</p>
            </div>
            <button
              onClick={() => {
                setImportSuccess(false)
                setImportModal(false)
                setImportFile(null)
                setImportPin('')
                setError('')
                setTab('signin')
              }}
              type="button"
              style={{ minHeight: 48, border: 'none', borderRadius: 12, background: 'var(--accent)', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 8, fontSize: '1rem' }}
            >
              <LockKey size={18} weight="duotone" />
              Continue to sign in
            </button>
          </div>
        </section>
      </main>
    )
  }

  const usernameStatus = usernameState.status === 'ok'
    ? { text: usernameState.message, tone: 'var(--success)' }
    : usernameState.status === 'taken'
      ? { text: usernameState.message, tone: 'var(--warning)' }
      : usernameState.message
        ? { text: usernameState.message, tone: 'var(--text-muted)' }
        : null
  const languageOptions = languages.length ? languages : FALLBACK_LANGUAGES

  return (
    <main className="auth-layout">
      <aside className="auth-brand">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/icons/icon.svg" alt="LearnLocal" style={{ width: 46, height: 46, display: 'block', objectFit: 'contain' }} />
          <span style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '0.01em' }}>LearnLocal</span>
        </div>
        <div className="auth-brand-extras">
          <h1 style={{ margin: '0 0 14px', fontSize: '2.1rem', lineHeight: 1.15, fontWeight: 700 }}>
            Learning that works, even without the internet.
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.98rem', lineHeight: 1.6, maxWidth: 420 }}>
            One teacher device runs the classroom. Every student joins from their own screen, in their own language, at their own pace.
          </p>
        </div>
        <ul className="auth-brand-extras" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          <li>Runs on the classroom network, nothing to install</li>
          <li>Lessons, translation and quizzes in many languages</li>
          <li>Made for shared devices and low-cost hardware</li>
        </ul>
      </aside>
      <div className="auth-main">
      <section style={{ width: '100%', maxWidth: 440, display: 'grid', gap: 18 }}>
        <div style={{ border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', background: 'var(--surface)', boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--border)' }}>
            {[
              ['signin', 'Sign In', UserCircle],
              ['signup', 'New Account', UserPlus],
            ].map(([key, label, Icon]) => (
              <button
                type="button"
                key={key}
                onClick={() => { setTab(key); setError('') }}
                style={{
                  minHeight: 46,
                  border: 'none',
                  background: 'transparent',
                  color: tab === key ? 'var(--text)' : 'var(--text-muted)',
                  borderBottom: tab === key ? '2px solid var(--accent)' : '2px solid transparent',
                  marginBottom: -1,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Icon size={18} weight="duotone" />
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={tab === 'signin' ? submitSignin : submitSignup} style={{ padding: 18, display: 'grid', gap: 13 }}>
            {sessionMessage && (
              <div style={{ border: '1px solid var(--warning)', background: 'var(--surface-soft)', color: 'var(--text)', borderRadius: 10, padding: '9px 11px', fontSize: '0.84rem', display: 'flex', gap: 8, alignItems: 'center' }}>
                <WarningCircle size={17} /> {sessionMessage}
              </div>
            )}

            {tab === 'signin' ? (
              <>
                <Field label="Username">
                  <input style={inputStyle} placeholder="Type your username" value={signin.username} onChange={(e) => setSignin((f) => ({ ...f, username: e.target.value }))} autoComplete="username" />
                </Field>
                <Field label="Teacher password or student PIN">
                  <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                    <input
                      {...secretInputProps}
                      name="optilearn_signin_secret"
                      style={{ ...inputStyle, border: 'none', borderRadius: 0, WebkitTextSecurity: showSecret ? 'none' : 'disc' }}
                      placeholder="Your password or 4 number PIN"
                      value={signin.password}
                      onChange={(e) => setSignin((f) => ({ ...f, password: e.target.value }))}
                    />
                    <button type="button" onClick={() => setShowSecret((v) => !v)} aria-label="Show or hide password" style={{ width: 48, border: 'none', background: 'var(--surface-soft)', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      {showSecret ? <EyeSlash size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </Field>
              </>
            ) : (
              <>
                <Field label="Your full name">
                  <input style={inputStyle} value={signup.name} onChange={(e) => setSignup((f) => ({ ...f, name: e.target.value }))} placeholder="Write your full name" autoComplete="name" />
                </Field>
                <Field label="Username" hint="Pick something easy to remember, like your first name" status={usernameStatus}>
                  <div style={{ position: 'relative' }}>
                    <input style={{ ...inputStyle, paddingRight: 42 }} value={signup.username} onChange={(e) => setSignup((f) => ({ ...f, username: e.target.value }))} placeholder="Choose your username" autoComplete="username" />
                    {usernameState.status === 'ok' && <CheckCircle size={20} weight="fill" color="var(--success)" style={{ position: 'absolute', right: 12, top: 13 }} />}
                  </div>
                </Field>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label="Your class grade">
                    <select style={inputStyle} value={signup.grade_level} onChange={(e) => setSignup((f) => ({ ...f, grade_level: e.target.value }))}>
                      {GRADES.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
                    </select>
                  </Field>
                  <Field label="Your language">
                    <LanguageSelect
                      languages={languageOptions}
                      value={signup.language}
                      onChange={(e) => setSignup((f) => ({ ...f, language: e.target.value }))}
                      style={inputStyle}
                    />
                  </Field>
                </div>
                <Field label="PIN" hint="Pick 4 numbers that are easy for you to remember">
                  <input {...secretInputProps} name="optilearn_signup_pin" style={{ ...inputStyle, WebkitTextSecurity: 'disc' }} value={signup.pin} onChange={(e) => setSignup((f) => ({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))} inputMode="numeric" maxLength={4} />
                </Field>
                <Field label="Type your PIN again">
                  <input {...secretInputProps} name="optilearn_signup_pin_confirm" style={{ ...inputStyle, WebkitTextSecurity: 'disc' }} value={signup.confirmPin} onChange={(e) => setSignup((f) => ({ ...f, confirmPin: e.target.value.replace(/\D/g, '').slice(0, 4) }))} inputMode="numeric" maxLength={4} />
                </Field>
              </>
            )}

            {error && <div style={{ color: 'var(--warning)', fontSize: '0.84rem' }}>{error}</div>}

            <button
              type="submit"
              disabled={busy}
              style={{ minHeight: 48, border: 'none', borderRadius: 12, background: 'var(--accent)', color: '#fff', fontWeight: 800, cursor: busy ? 'default' : 'pointer', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}
            >
              {tab === 'signin' ? <LockKey size={18} weight="duotone" /> : <UserPlus size={18} weight="duotone" />}
              {busy ? 'Just a moment...' : tab === 'signin' ? 'Sign In' : 'Create my account'}
            </button>

            {tab === 'signup' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0' }}>
                  <span style={{ flex: 1, borderTop: '1px solid var(--border)' }} />
                  or
                  <span style={{ flex: 1, borderTop: '1px solid var(--border)' }} />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = '.zip'
                    input.onchange = (e) => handleImportFileSelect(e.target.files?.[0] || null)
                    input.click()
                  }}
                  style={{ minHeight: 48, border: '1px solid var(--accent)', borderRadius: 12, background: 'var(--surface)', color: 'var(--accent)', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}
                >
                  <FileZip size={18} weight="duotone" />
                  Bring in a saved profile
                </button>
              </>
            )}
          </form>
        </div>

        <GetAppBanner />

        {importModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 9999,
            padding: 16,
          }}>
            <div style={{
              background: 'var(--surface)', padding: 24, borderRadius: 16,
              maxWidth: 420, width: '100%', display: 'grid', gap: 16,
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: 'rgba(181,84,44,0.1)', color: 'var(--accent)', padding: 8, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileZip size={20} weight="duotone" />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Enter your student PIN</h3>
              </div>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>Type the 4 number PIN you used at your last school:</p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="0000"
                value={importPin}
                onChange={(e) => setImportPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                style={{
                  minHeight: 44, padding: '10px 12px', border: '2px solid var(--border)',
                  borderRadius: 12, background: 'var(--surface)', color: 'var(--text)', width: '100%', boxSizing: 'border-box',
                  fontSize: '1rem', fontWeight: 600, textAlign: 'center', letterSpacing: '4px',
                }}
              />
              {error && (
                <div style={{ background: 'var(--accent-soft)', color: 'var(--warning)', padding: 12, borderRadius: 8, display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: '0.85rem' }}>
                  <WarningCircle size={16} weight="fill" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{error}</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button 
                  onClick={() => { setImportModal(false); setImportFile(null); setImportPin(''); setError('') }} 
                  disabled={busy}
                  style={{
                    minHeight: 42, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--surface)',
                    color: 'var(--text)', flex: 1, fontWeight: 600, cursor: busy ? 'default' : 'pointer',
                    opacity: busy ? 0.6 : 1, transition: 'all 0.2s'
                  }}
                >
                  Go back
                </button>
                <button 
                  onClick={submitImport} 
                  disabled={busy || !importPin}
                  style={{ 
                    minHeight: 42, border: 'none', borderRadius: 12, background: 'var(--accent)', 
                    color: '#fff', flex: 1, fontWeight: 600, cursor: (busy || !importPin) ? 'default' : 'pointer', 
                    opacity: (busy || !importPin) ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                  }}
                >
                  {busy ? 'Bringing it in...' : <>Restore profile<ArrowRight size={16} weight="bold" /></>}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
      </div>
    </main>
  )
}
