import { useEffect, useRef } from 'react'
import { ArrowSquareOut, PhoneDisconnect, X } from '@phosphor-icons/react'
import { PersonaAvatarIcon } from '../utils/personaIcons'

export default function PersonaVoiceChat({ callData, onClose }) {
  const { call_url, persona } = callData
  const windowRef = useRef(null)

  // Open the call in a new tab immediately on mount
  useEffect(() => {
    windowRef.current = window.open(call_url, '_blank', 'noopener,noreferrer')
    return () => {
      // Try to close the tab when the widget is dismissed
      try { windowRef.current?.close() } catch (_) {}
    }
  }, [call_url])

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      zIndex: 1001,
      width: 300,
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 20,
      boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 14px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface-soft)',
        flexShrink: 0,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: persona.color || 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <PersonaAvatarIcon iconKey={persona.icon} size={18} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{persona.name}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Study buddy · here with you now</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Hang up"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', display: 'flex', padding: 4,
          }}
        >
          <X size={18} weight="bold" />
        </button>
      </div>

      {/* Call launched notice */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '28px 20px',
        gap: 14,
        background: `${persona.color || '#b5542c'}1f`,
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: persona.color || 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <PersonaAvatarIcon iconKey={persona.icon} size={30} color="#fff" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>
            {persona.name} is here and ready when you are
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.4 }}>
            Your chat is open in another tab. Pop back here once you wrap up.
          </div>
        </div>
        <a
          href={call_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 18px', borderRadius: 999,
            background: 'var(--accent)', color: '#fff',
            fontWeight: 600, fontSize: '0.84rem',
            textDecoration: 'none',
          }}
        >
          <ArrowSquareOut size={14} weight="bold" />
          Jump back to the tab
        </a>
      </div>

      {/* End call button */}
      <div style={{
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderTop: '1px solid var(--border)',
        background: 'var(--surface-soft)',
        flexShrink: 0,
      }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 20px', borderRadius: 999,
            border: 'none', background: '#ef4444', color: '#fff',
            fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer',
          }}
        >
          <PhoneDisconnect size={16} weight="fill" />
          Hang up
        </button>
      </div>
    </div>
  )
}
