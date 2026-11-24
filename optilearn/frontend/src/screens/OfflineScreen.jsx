import { useEffect, useState } from 'react'

export default function OfflineScreen({ onRecover }) {
  const [dots, setDots] = useState(0)

  useEffect(() => {
    const tick = setInterval(() => setDots((d) => (d + 1) % 4), 500)
    return () => clearInterval(tick)
  }, [])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        background: 'var(--bg, #faf5ee)',
        color: 'var(--text, #2c241b)',
        padding: 32,
        textAlign: 'center',
      }}
    >
      <style>{`
        @keyframes ol-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.88); }
        }
      `}</style>

      {/* Logo */}
      <div
        style={{
          width: 80, height: 80,
          borderRadius: 22,
          overflow: 'hidden',
          boxShadow: '0 4px 24px rgba(84, 56, 32, 0.2)',
          flexShrink: 0,
        }}
      >
        <img src="/icons/icon.svg" alt="LearnLocal" style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>

      <div>
        <div
          style={{
            fontSize: 24, fontWeight: 700,
            fontFamily: 'var(--font-display)',
            color: 'var(--text, #2c241b)',
            marginBottom: 8,
          }}
        >
          You are not connected to LearnLocal yet
        </div>
        <div style={{ fontSize: 15, color: 'var(--text-muted, #7a6c5b)', lineHeight: 1.6, maxWidth: 360 }}>
          Join your classroom Wi-Fi network, and LearnLocal will pick up right where you left off.
        </div>
      </div>

      {/* Animated retry dot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
        <div
          style={{
            width: 12, height: 12, borderRadius: '50%',
            background: 'var(--accent, #b5542c)',
            animation: 'ol-pulse 1.2s ease-in-out infinite',
          }}
        />
        <span style={{ fontSize: 13, color: 'var(--text-muted, #7a6c5b)' }}>
          {`Trying again${'.'.repeat(dots)}`}
        </span>
      </div>
    </div>
  )
}
