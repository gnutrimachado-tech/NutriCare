'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotMsg, setForgotMsg] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setLoading(true)
    const res = await signIn('credentials', { email, password: senha, redirect: false })
    setLoading(false)
    if (res?.ok) {
      router.push('/dashboard')
    } else {
      setErro('E-mail ou senha incorretos.')
    }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotMsg('')
    setForgotLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      })
      const data = await res.json()
      setForgotMsg(data.message || 'Se o e-mail existir, você receberá as instruções em instantes.')
    } catch {
      setForgotMsg('Erro ao enviar. Tente novamente.')
    }
    setForgotLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #f0f4f0 0%, #eef2ea 30%, #f5f3ec 65%, #ede9df 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Segoe UI', Arial, sans-serif",
    }}>
      {/* DNA / circuit decorations */}
      <svg style={{ position: 'absolute', left: 0, top: '10%', opacity: 0.07, pointerEvents: 'none' }} width="180" height="500" viewBox="0 0 180 500">
        {[0,40,80,120,160,200,240,280,320,360,400,440].map((y, i) => (
          <g key={i}>
            <ellipse cx={i%2===0?40:140} cy={y+20} rx="30" ry="10" fill="none" stroke="#1a5c1a" strokeWidth="2"/>
            <line x1={i%2===0?40:140} y1={y+20} x2={i%2===0?140:40} y2={y+60} stroke="#1a5c1a" strokeWidth="1.5" strokeDasharray="4 3"/>
          </g>
        ))}
      </svg>
      {/* Hexagon molecular pattern top-right */}
      <svg style={{ position: 'absolute', right: '5%', top: '5%', opacity: 0.06, pointerEvents: 'none' }} width="200" height="200" viewBox="0 0 200 200">
        {[[100,40],[60,68],[60,124],[100,152],[140,124],[140,68]].map(([x,y],i,arr) => (
          <line key={i} x1={x} y1={y} x2={arr[(i+1)%6][0]} y2={arr[(i+1)%6][1]} stroke="#b8960c" strokeWidth="2"/>
        ))}
        <polygon points="100,40 60,68 60,124 100,152 140,124 140,68" fill="none" stroke="#b8960c" strokeWidth="1.5"/>
        {[[100,40],[60,68],[60,124],[100,152],[140,124],[140,68]].map(([x,y],i) => (
          <circle key={i} cx={x} cy={y} r="5" fill="#b8960c" opacity="0.6"/>
        ))}
        <circle cx="100" cy="96" r="12" fill="none" stroke="#1a5c1a" strokeWidth="1.5"/>
      </svg>
      {/* Human silhouette top-right */}
      <svg style={{ position: 'absolute', right: '2%', top: '8%', opacity: 0.05, pointerEvents: 'none' }} width="80" height="160" viewBox="0 0 80 160">
        <circle cx="40" cy="18" r="16" fill="#1a5c1a"/>
        <path d="M20 40 Q10 70 14 110 L24 108 Q26 80 40 75 Q54 80 56 108 L66 110 Q70 70 60 40 Z" fill="#1a5c1a"/>
        <path d="M20 42 L6 85 L18 88 L26 62 Z" fill="#1a5c1a"/>
        <path d="M60 42 L74 85 L62 88 L54 62 Z" fill="#1a5c1a"/>
        <path d="M24 108 L18 155 L32 155 L40 120 L48 155 L62 155 L56 108 Z" fill="#1a5c1a"/>
      </svg>
      {/* Plants bottom-left */}
      <svg style={{ position: 'absolute', left: 0, bottom: 0, opacity: 0.12, pointerEvents: 'none' }} width="220" height="200" viewBox="0 0 220 200">
        <ellipse cx="60" cy="180" rx="50" ry="20" fill="#2d6a2d" opacity="0.4"/>
        <path d="M60 160 Q30 100 10 60" fill="none" stroke="#2d6a2d" strokeWidth="3"/>
        <path d="M10 60 Q0 40 20 30 Q40 40 30 70" fill="#3a8a3a" opacity="0.7"/>
        <path d="M60 160 Q80 110 100 80" fill="none" stroke="#2d6a2d" strokeWidth="3"/>
        <path d="M100 80 Q115 55 130 65 Q125 90 95 95" fill="#3a8a3a" opacity="0.7"/>
        <path d="M60 160 Q50 130 30 110" fill="none" stroke="#2d6a2d" strokeWidth="2"/>
        <path d="M30 110 Q15 90 25 78 Q42 82 38 108" fill="#4aaa4a" opacity="0.6"/>
        <circle cx="110" cy="155" r="25" fill="#c8440a" opacity="0.5"/>
        <circle cx="130" cy="165" r="18" fill="#d44a0a" opacity="0.4"/>
        <circle cx="95" cy="162" r="14" fill="#c03008" opacity="0.4"/>
      </svg>
      {/* Spoon + powder bottom-right */}
      <svg style={{ position: 'absolute', right: 0, bottom: 0, opacity: 0.10, pointerEvents: 'none' }} width="200" height="180" viewBox="0 0 200 180">
        <path d="M180 20 Q190 40 160 80 Q130 120 100 150" fill="none" stroke="#b8960c" strokeWidth="6" strokeLinecap="round"/>
        <ellipse cx="170" cy="30" rx="18" ry="14" fill="#d4a80c" opacity="0.7" transform="rotate(-30 170 30)"/>
        {[0,1,2,3,4,5,6,7,8,9].map(i => (
          <circle key={i} cx={85 + (i%5)*12} cy={158 + Math.floor(i/5)*10} r="4" fill="#d4a80c" opacity="0.5"/>
        ))}
      </svg>
      {/* Circuit lines */}
      <svg style={{ position: 'absolute', left: '20%', bottom: '10%', opacity: 0.04, pointerEvents: 'none' }} width="300" height="100">
        <line x1="0" y1="50" x2="300" y2="50" stroke="#b8960c" strokeWidth="1.5"/>
        {[50,100,150,200,250].map(x => (
          <g key={x}>
            <line x1={x} y1="50" x2={x} y2={30 + Math.sin(x/30)*15} stroke="#b8960c" strokeWidth="1.5"/>
            <circle cx={x} cy={30 + Math.sin(x/30)*15} r="3" fill="#b8960c"/>
          </g>
        ))}
      </svg>

      {/* Card */}
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(16px)',
        borderRadius: 28,
        padding: '44px 40px 36px',
        width: '100%',
        maxWidth: 400,
        boxShadow: '0 4px 40px rgba(30,80,30,0.10), 0 1px 3px rgba(0,0,0,0.06)',
        position: 'relative',
        border: '1px solid rgba(255,255,255,0.8)',
      }}>

        {showForgot ? (
          // ── Tela: Esqueci minha senha ──
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🔐</div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a4d1a' }}>Recuperar acesso</h2>
              <p style={{ margin: '8px 0 0', fontSize: 13, color: '#64748b' }}>
                Digite seu e-mail cadastrado e enviaremos as instruções para redefinir sua senha.
              </p>
            </div>

            {forgotMsg ? (
              <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 14, padding: '20px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                <p style={{ margin: 0, fontSize: 14, color: '#166534', fontWeight: 500 }}>{forgotMsg}</p>
                <button onClick={() => { setShowForgot(false); setForgotMsg(''); setForgotEmail('') }}
                  style={{ marginTop: 16, background: 'none', border: 'none', color: '#1a4d1a', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
                  Voltar ao login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, pointerEvents: 'none', opacity: 0.4 }}>✉️</span>
                  <input
                    type="email"
                    placeholder="Seu e-mail cadastrado"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>
                <button type="submit" disabled={forgotLoading} style={btnPrimary}>
                  {forgotLoading ? 'ENVIANDO...' : 'ENVIAR INSTRUÇÕES'}
                </button>
                <button type="button" onClick={() => setShowForgot(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 13, marginTop: 4 }}>
                  ← Voltar ao login
                </button>
              </form>
            )}
          </>
        ) : (
          // ── Tela: Login ──
          <>
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <Image src="/logo-nutricare.png" alt="NutriCare" width={100} height={100} style={{ objectFit: 'contain' }} priority />
            </div>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <h1 style={{
                margin: 0, fontSize: 40, fontWeight: 800,
                background: 'linear-gradient(135deg, #1a4d1a 0%, #b8960c 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                letterSpacing: '-0.5px',
              }}>
                Nutricare
              </h1>
              <p style={{ margin: '5px 0 0', fontSize: 11, letterSpacing: 2.5, color: '#aaa', fontWeight: 500 }}>
                CIÊNCIA • NUTRIÇÃO • BEM-ESTAR
              </p>
            </div>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, pointerEvents: 'none', opacity: 0.35 }}>✉️</span>
                <input
                  type="email"
                  placeholder="E-mail"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, pointerEvents: 'none', opacity: 0.35 }}>🔒</span>
                <input
                  type={showSenha ? 'text' : 'password'}
                  placeholder="Senha"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  required
                  style={{ ...inputStyle, paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowSenha(p => !p)} style={eyeBtn}>
                  {showSenha ? '🙈' : '👁️'}
                </button>
              </div>

              {erro && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#dc2626' }}>
                  {erro}
                </div>
              )}

              <button type="submit" disabled={loading} style={{ ...btnPrimary, marginTop: 4 }}>
                {loading ? 'ENTRANDO...' : 'ENTRAR'}
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0 14px' }}>
              <div style={{ flex: 1, height: 1, background: '#e8edf0' }} />
              <span style={{ fontSize: 12, color: '#bbb', fontWeight: 500 }}>ou</span>
              <div style={{ flex: 1, height: 1, background: '#e8edf0' }} />
            </div>

            <Link href="/cadastro" style={{ textDecoration: 'none', display: 'block' }}>
              <button style={btnOutline}>
                <span style={{ marginRight: 6, opacity: 0.6 }}>👤</span> CADASTRAR
              </button>
            </Link>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button
                type="button"
                onClick={() => { setShowForgot(true); setForgotEmail(email) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 5 }}
              >
                <span style={{ opacity: 0.5 }}>🔒</span>
                <span style={{ textDecoration: 'underline' }}>Esqueci minha senha</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '13px 14px 13px 44px',
  border: '1.5px solid #e5e7eb',
  borderRadius: 12,
  fontSize: 14,
  outline: 'none',
  background: '#fafafa',
  boxSizing: 'border-box',
  color: '#0f172a',
  transition: 'border-color 0.2s',
}

const btnPrimary: React.CSSProperties = {
  width: '100%',
  padding: '14px',
  background: 'linear-gradient(135deg, #1a4d1a 0%, #246324 100%)',
  color: '#fff',
  border: 'none',
  borderRadius: 12,
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  letterSpacing: 1.2,
  boxShadow: '0 4px 16px rgba(26,77,26,0.25)',
}

const btnOutline: React.CSSProperties = {
  width: '100%',
  padding: '13px',
  background: 'transparent',
  color: '#1a4d1a',
  border: '1.5px solid #b8960c',
  borderRadius: 12,
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  letterSpacing: 0.5,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const eyeBtn: React.CSSProperties = {
  position: 'absolute',
  right: 12,
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 15,
  opacity: 0.45,
  padding: 4,
  lineHeight: '1',
}
