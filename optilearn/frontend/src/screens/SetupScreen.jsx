import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ChalkboardTeacher, Eye, EyeSlash, ShieldCheck, Student, Users, WifiHigh } from '@phosphor-icons/react'
import { getSetupRequired, setupAdmin } from '../api/client'
import { useAuth } from '../context/AuthContext'

const inputStyle = {
  minHeight: 46,
  borderRadius: 12,
  border: '1px solid var(--border)',
  padding: '10px 12px',
  background: 'var(--surface)',
  color: 'var(--text)',
}

const secretInputProps = {
  type: 'text',
  autoComplete: 'off',
  spellCheck: false,
  'data-lpignore': 'true',
  'data-1p-ignore': 'true',
  'data-form-type': 'other',
}

export default function SetupScreen() {
  const navigate = useNavigate()
  const { loginTeacher } = useAuth()
  const [checking, setChecking] = useState(true)
  const [required, setRequired] = useState(false)
  const [showHotspotStep, setShowHotspotStep] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ display_name: '', username: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getSetupRequired()
      .then((data) => setRequired(!!data.setup_required))
      .catch(() => setRequired(true))
      .finally(() => setChecking(false))
  }, [])

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!form.display_name.trim() || !form.username.trim() || !form.password) {
      setError('Please add your name, username and a password to continue.')
      return
    }
    if (form.password.length < 6) {
      setError('Please choose a password with 6 or more characters.')
      return
    }
    if (form.password !== form.confirm) {
      setError('Your passwords are different. Please type the same one twice.')
      return
    }
    setSaving(true)
    try {
      const payload = await setupAdmin({
        display_name: form.display_name.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      })
      loginTeacher(payload)
      if (localStorage.getItem('optilearn_hotspot_onboarding_done') === '1') {
        navigate('/teacher', { replace: true })
      } else {
        setShowHotspotStep(true)
      }
    } catch (err) {
      setError(err.message || 'We could not finish setup. Please try again.')
      setSaving(false)
    }
  }

  function finishHotspotStep() {
    localStorage.setItem('optilearn_hotspot_onboarding_done', '1')
    navigate('/teacher', { replace: true })
  }

  if (checking) return <div className="app-shell" style={{ minHeight: '100vh' }} />
  if (!required) return <Navigate to="/" replace />

  if (showHotspotStep) {
    const steps = [
      {
        Icon: WifiHigh,
        title: 'Switch on your classroom Wi-Fi hotspot',
        description: "In Windows, go to Settings, then Network, then Mobile Hotspot, and switch it on. Keep the name 'OptiLearn' so your students can spot the right network easily.",
        action: (
          <a href="ms-settings:network-mobilehotspot" style={{ ...inputStyle, minHeight: 42, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontWeight: 700, color: 'var(--accent)', background: 'rgba(181,84,44,0.12)' }}>
            Open hotspot settings
          </a>
        ),
      },
      {
        Icon: ShieldCheck,
        title: 'Start it as administrator, if you can',
        description: "Right-click the OptiLearn shortcut and choose 'Run as administrator'. This helps students connect on their own when they join your Wi-Fi.",
      },
      {
        Icon: Users,
        title: 'Your students can now join in',
        description: 'When your hotspot is on, students on your Wi-Fi can open LearnLocal from the sign-in prompt, a QR code, or your classroom address.',
      },
    ]

    return (
      <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', display: 'grid', placeItems: 'center', padding: 20 }}>
        <section style={{ width: '100%', maxWidth: 640, display: 'grid', gap: 18 }}>
          <header style={{ display: 'grid', gap: 8 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.55rem' }}>One last step before lessons begin</h1>
              <p style={{ margin: '6px 0 0', color: 'var(--text-muted)' }}>Turn on the classroom connection so everyone can join without fuss.</p>
            </div>
          </header>

          <div style={{ display: 'grid', gap: 0 }}>
            {steps.map(({ Icon, title, description, action }, i) => (
              <section
                key={title}
                style={{
                  display: 'flex',
                  gap: 16,
                  padding: '18px 2px',
                  borderBottom: i < steps.length - 1 ? '1px solid var(--border)' : 'none',
                  alignItems: 'flex-start',
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    color: 'var(--accent-contrast)',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    marginTop: 4,
                  }}
                >
                  {i + 1}
                </span>
                <div style={{ display: 'grid', gap: 6, alignContent: 'start' }}>
                  <h2 style={{ margin: 0, fontSize: '1.02rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon size={20} weight="duotone" style={{ color: 'var(--accent)' }} />
                    {title}
                  </h2>
                  <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.55, fontSize: '0.92rem', maxWidth: 560 }}>{description}</p>
                  {action}
                </div>
              </section>
            ))}
          </div>

          <button type="button" onClick={finishHotspotStep} style={{ minHeight: 48, border: 'none', borderRadius: 12, background: 'var(--accent)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
            Done, take me to my dashboard
          </button>
        </section>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', display: 'grid', placeItems: 'center', padding: 20 }}>
      <section style={{ width: '100%', maxWidth: 430, display: 'grid', gap: 18 }}>
        <header style={{ display: 'grid', gap: 10 }}>
          <span style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
            <Student size={30} weight="duotone" />
          </span>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.6rem' }}>Welcome to LearnLocal</h1>
            <p style={{ margin: '6px 0 0', color: 'var(--text-muted)' }}>First, create your teacher account. It takes about a minute.</p>
          </div>
        </header>

        <form onSubmit={submit} style={{ border: '1px solid var(--border)', borderRadius: 16, padding: 20, display: 'grid', gap: 12, background: 'var(--surface)', boxShadow: 'var(--shadow)' }}>
          <label style={{ display: 'grid', gap: 5 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>Your name</span>
            <input style={inputStyle} value={form.display_name} onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))} placeholder="For example, Ms. Fatima" />
          </label>
          <label style={{ display: 'grid', gap: 5 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>Username</span>
            <input style={inputStyle} value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="Pick a username" autoComplete="username" />
          </label>
          <label style={{ display: 'grid', gap: 5 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>Email <span style={{ opacity: 0.5 }}>(optional)</span></span>
            <input style={inputStyle} type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="you@school.org" autoComplete="email" />
          </label>
          <label style={{ display: 'grid', gap: 5 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>Choose a password</span>
            <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <input
                {...secretInputProps}
                name="optilearn_setup_password"
                style={{ ...inputStyle, border: 'none', borderRadius: 0, flex: 1, WebkitTextSecurity: showPassword ? 'none' : 'disc' }}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label="Show or hide password" style={{ width: 48, border: 'none', background: 'var(--surface-soft)', color: 'var(--text-muted)', cursor: 'pointer' }}>
                {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          <label style={{ display: 'grid', gap: 5 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>Type it again</span>
            <input {...secretInputProps} name="optilearn_setup_password_confirm" style={{ ...inputStyle, WebkitTextSecurity: 'disc' }} value={form.confirm} onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))} />
          </label>
          {error && <div style={{ color: 'var(--warning)', fontSize: '0.84rem' }}>{error}</div>}
          <button type="submit" disabled={saving} style={{ minHeight: 46, border: 'none', borderRadius: 12, background: 'var(--accent)', color: '#fff', fontWeight: 700, cursor: saving ? 'default' : 'pointer', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
            <ChalkboardTeacher size={18} weight="duotone" />
            {saving ? 'Creating your account...' : 'Create my teacher account'}
          </button>
        </form>
      </section>
    </main>
  )
}
