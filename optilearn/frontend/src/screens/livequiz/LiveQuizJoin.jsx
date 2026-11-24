/**
 * LiveQuizJoin.jsx — Public student entry screen.
 *
 * Accessible via QR code at /live-quiz/join/:gameId
 * Students enter a nickname and join the lobby.
 */
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, GameController, HourglassHigh, RocketLaunch, WarningCircle } from '@phosphor-icons/react'
import { joinLiveGame } from '../../api/client'
import { useAuth } from '../../context/AuthContext'

const COLORS = ['#b5542c', '#c08a1e', '#5d8148', '#a85b47']

export default function LiveQuizJoin() {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const auth = useAuth() || {}
  const { studentId } = auth
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // If not logged in, redirect to student login
  if (!studentId) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundSize: 'auto, auto, var(--dot-gap) var(--dot-gap)',
        backgroundColor: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}>
        <div style={{
          width: '100%',
          maxWidth: 440,
          textAlign: 'center',
          background: 'var(--surface)',
          borderRadius: 24,
          padding: '32px 28px',
          boxShadow: 'var(--shadow)',
        }}>
          <h2 style={{ margin: '0 0 16px', fontSize: '1.5rem', fontWeight: 700 }}>Please Sign In First</h2>
          <p style={{ margin: '0 0 24px', color: 'var(--text-muted)' }}>
            Sign in with your student account, then you can join this quiz right away.
          </p>
          <button
            onClick={() => navigate(`/join?redirect=/live-quiz/join/${gameId}`)}
            style={{
              padding: '12px 24px',
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Go to Sign In
          </button>
        </div>
      </div>
    )
  }

  async function handleJoin(e) {
    e.preventDefault()
    const name = nickname.trim()
    if (!name) return setError('Please choose a name to show in the game.')
    if (name.length > 32) return setError('That name is a bit long. Please keep it to 32 letters or less.')
    setError('')
    setLoading(true)
    try {
      const result = await joinLiveGame(gameId, name, studentId)
      // Store participant info for the play screen
      sessionStorage.setItem(`lq_participant_${gameId}`, JSON.stringify(result))
      navigate(`/live-quiz/play/${gameId}`)
    } catch (err) {
      setError(err.message || 'We could not join just now. Please check with your teacher and try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundSize: 'auto, auto, var(--dot-gap) var(--dot-gap)',
      backgroundColor: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      position: 'relative',
    }}>
      {/* Back button */}
      <button
        onClick={() => navigate('/join')}
        style={{
          position: 'absolute', top: 20, left: 20,
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '8px 14px',
          color: 'var(--text-muted)', cursor: 'pointer',
          fontSize: '0.85rem', fontWeight: 600,
        }}
      >
        <ArrowLeft size={15} weight="bold" />
        Back
      </button>

      <div style={{
        width: '100%',
        maxWidth: 440,
        textAlign: 'center',
      }}>
        {/* Logo / Title */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 72,
            height: 72,
            borderRadius: 20,
            background: 'var(--accent)',
            marginBottom: 18,
            boxShadow: 'var(--shadow)',
          }}>
            <GameController size={36} weight="fill" color="#fff" />
          </div>
          <h1 style={{
            margin: '0 0 8px',
            fontSize: '2rem',
            fontWeight: 800,
            color: 'var(--text)',
            letterSpacing: '-0.03em',
          }}>
            Let's Play Together
          </h1>
          <p style={{
            margin: 0,
            color: 'var(--text-muted)',
            fontSize: '0.95rem',
          }}>
            Pick a fun name - that is how friends will see you
          </p>
        </div>

        <form
          onSubmit={handleJoin}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 24,
            padding: '32px 28px',
            display: 'grid',
            gap: 18,
            boxShadow: 'var(--shadow)',
          }}
        >
          <div style={{ display: 'grid', gap: 8, textAlign: 'left' }}>
            <label style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.88rem' }}>
              What should we call you?
            </label>
            <input
              autoFocus
              id="nickname-input"
              type="text"
              maxLength={32}
              placeholder="e.g. BrightStar42"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
                style={{
                height: 52,
                borderRadius: 14,
                border: error ? '2px solid var(--accent)' : '1px solid rgba(181,84,44,0.25)',
                background: 'var(--surface-soft)',
                color: 'var(--text)',
                fontSize: '1.1rem',
                padding: '0 18px',
                outline: 'none',
                transition: 'border 0.2s',
              }}
            />
            {error && (
              <div style={{ color: 'var(--accent)', fontSize: '0.84rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <WarningCircle size={16} weight="fill" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Color dots decoration */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {COLORS.map((c, i) => (
              <div key={i} style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: c,
                opacity: 0.95,
                boxShadow: `0 0 0 4px ${c}22`,
              }} />
            ))}
          </div>

          <button
            type="submit"
            id="join-game-btn"
            disabled={loading || !nickname.trim()}
            style={{
              height: 52,
              borderRadius: 14,
              border: 'none',
              background: loading
                ? 'var(--surface-soft)'
                : 'var(--accent)',
              color: loading ? 'var(--text-muted)' : '#fff',
              fontWeight: 800,
              fontSize: '1.05rem',
              cursor: loading || !nickname.trim() ? 'default' : 'pointer',
              opacity: !nickname.trim() ? 0.55 : 1,
              transition: 'all 0.2s',
              boxShadow: loading ? 'none' : 'var(--shadow)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {loading ? <><HourglassHigh size={18} weight="bold" /><span>Joining you in…</span></> : <><RocketLaunch size={18} weight="bold" /><span>I'm Ready - Join</span></>}
          </button>
        </form>

        <p style={{
          marginTop: 20,
          color: 'var(--text-muted)',
          fontSize: '0.8rem',
        }}>
          Brought to you by LearnLocal
        </p>
      </div>
    </div>
  )
}
