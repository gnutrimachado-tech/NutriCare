'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'

const IconEmail   = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>)
const IconLock    = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>)
const IconEye     = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>)
const IconEyeOff  = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>)
const IconUserPlus= () => (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>)

type ErroTipo = '' | 'sem-conta' | 'senha'

export default function LoginPage() {
  const [email, setEmail]         = useState('')
  const [senha, setSenha]         = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [erroTipo, setErroTipo]   = useState<ErroTipo>('')
  const [erroMsg, setErroMsg]     = useState('')
  const [loading, setLoading]     = useState(false)

  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotMsg, setForgotMsg]   = useState('')
  const [forgotOk, setForgotOk]     = useState(false)
  const [forgotLoad, setForgotLoad] = useState(false)

  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErroTipo(''); setErroMsg(''); setLoading(true)
    try {
      const res = await signIn('credentials', { email, password: senha, redirect: false })
      if (res?.ok && !res?.error) {
        router.push('/dashboard')
        return
      }
      setErroTipo('senha')
      setErroMsg('E-mail ou senha incorretos.')
    } catch {
      setErroTipo('senha'); setErroMsg('Erro de conexão. Tente novamente.')
    }
    setLoading(false)
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault(); setForgotMsg(''); setForgotLoad(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      })
      const data = await res.json()
      if (res.ok) { setForgotOk(true); setForgotMsg('E-mail enviado! Verifique sua caixa de entrada.') }
      else { setForgotMsg(data.error || 'Erro ao enviar. Tente novamente.') }
    } catch { setForgotMsg('Erro de conexão.') }
    setForgotLoad(false)
  }

  return (
    <div style={bgStyle}>
      {/* CARD */}
      <div style={cardStyle}>
        {showForgot ? (
          <>
            <button onClick={() => { setShowForgot(false); setForgotMsg(''); setForgotOk(false) }}
              style={backBtn}>← Voltar ao login</button>
            <h2 style={{ fontSize: 19, fontWeight: 700, color: '#1a4d1a', marginBottom: 6 }}>
              Redefinir senha
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20, lineHeight: 1.5 }}>
              Informe seu e-mail e enviaremos um link para criar uma nova senha.
            </p>
            {forgotOk ? (
              <div style={successBox}>
                ✅ <strong>{forgotMsg}</strong><br/>
                <span style={{ fontSize: 12 }}>Clique no link do e-mail para criar uma nova senha. Válido por 1 hora.</span>
              </div>
            ) : (
              <form onSubmit={handleForgot} style={formCol}>
                <div style={{ position: 'relative' }}>
                  <span style={icoSt}><IconEmail /></span>
                  <input type="email" placeholder="Seu e-mail cadastrado" value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)} required style={inpSt} />
                </div>
                {forgotMsg && <div style={errBox}>{forgotMsg}</div>}
                <button type="submit" disabled={forgotLoad} style={btnGreen}>
                  {forgotLoad ? 'ENVIANDO...' : 'ENVIAR LINK'}
                </button>
              </form>
            )}
          </>
        ) : (
          <>
            {/* Logo + título */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Image src="/logo-nutricare.png" alt="NutriCare" width={148} height={148}
                style={{ objectFit: 'contain' }} priority />
              <h1 style={titleStyle}>
                Nutri<span style={{ color: '#b8960c' }}>care</span>
              </h1>
              <p style={subtitleStyle}>CIÊNCIA • NUTRIÇÃO • BEM-ESTAR</p>
            </div>

            <form onSubmit={handleLogin} style={formCol}>
              <div style={{ position: 'relative' }}>
                <span style={icoSt}><IconEmail /></span>
                <input type="email" placeholder="E-mail" value={email}
                  onChange={e => setEmail(e.target.value)} required style={inpSt} />
              </div>
              <div style={{ position: 'relative' }}>
                <span style={icoSt}><IconLock /></span>
                <input type={showSenha ? 'text' : 'password'} placeholder="Senha" value={senha}
                  onChange={e => setSenha(e.target.value)} required style={{ ...inpSt, paddingRight: 44 }} />
                <button type="button" onClick={() => setShowSenha(p => !p)} style={eyeSt}>
                  {showSenha ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>

              {erroTipo === 'sem-conta' && (
                <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 12, padding: '13px 14px' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#dc2626' }}>
                    ❌ Nenhuma conta encontrada com este e-mail.
                  </p>
                  <p style={{ margin: '0 0 10px', fontSize: 12, color: '#7f1d1d' }}>
                    Você ainda não fez seu cadastro ou não assinou o plano NutriCare.
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Link href="/cadastro" style={{ flex: 1, textAlign: 'center', padding: '9px 10px', background: '#1a4d1a', color: '#fff', borderRadius: 9, textDecoration: 'none', fontSize: 12, fontWeight: 700, minWidth: 120 }}>
                      Fazer Cadastro
                    </Link>
                    <a href="https://pay.hotmart.com/SUBSTITUA_PELO_LINK" target="_blank" rel="noopener noreferrer"
                      style={{ flex: 1, textAlign: 'center', padding: '9px 10px', background: '#fff', color: '#1a4d1a', border: '1.5px solid #1a4d1a', borderRadius: 9, textDecoration: 'none', fontSize: 12, fontWeight: 700, minWidth: 120 }}>
                      Assinar o Plano
                    </a>
                  </div>
                </div>
              )}
              {erroTipo === 'senha' && (
                <div style={{ ...errBox, color: '#dc2626', fontWeight: 600 }}>❌ {erroMsg}</div>
              )}

              <button type="submit" disabled={loading} style={{ ...btnGreen, marginTop: 2 }}>
                {loading ? 'ENTRANDO...' : 'ENTRAR'}
              </button>
            </form>

            <div style={divider}>
              <div style={divLine} /><span style={divText}>ou</span><div style={divLine} />
            </div>

            <Link href="/cadastro" style={{ textDecoration: 'none' }}>
              <button style={btnOutline}>
                <IconUserPlus /> CADASTRAR
              </button>
            </Link>

            <div style={{ textAlign: 'center', marginTop: 15 }}>
              <button onClick={() => setShowForgot(true)} style={forgotBtn}>
                <IconLock /> Esqueci minha senha
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ─── Estilos ─── */
const bgStyle: React.CSSProperties = {
  minHeight: '100vh',
  backgroundImage: "url('/bg-login.jpg')",
  backgroundSize: 'cover',
  backgroundPosition: 'center top',
  backgroundRepeat: 'no-repeat',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '24px', position: 'relative',
  fontFamily: "'Segoe UI',system-ui,-apple-system,sans-serif",
}
const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.96)',
  backdropFilter: 'blur(6px)',
  borderRadius: 26,
  padding: '36px 38px 32px',
  width: '100%', maxWidth: 420,
  boxShadow: '0 8px 56px rgba(26,70,26,0.18), 0 2px 12px rgba(0,0,0,0.08)',
  position: 'relative', zIndex: 1,
}
const titleStyle: React.CSSProperties = {
  fontFamily: "Georgia,'Times New Roman',serif",
  fontSize: 36, fontWeight: 900, color: '#1a4d1a',
  letterSpacing: '-0.5px', lineHeight: 1, margin: '8px 0 4px',
}
const subtitleStyle: React.CSSProperties = {
  fontSize: 10.5, letterSpacing: 3.2, color: '#9ca3af', fontWeight: 600,
}
const formCol: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 13 }
const icoSt: React.CSSProperties = { position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none', display: 'flex', alignItems: 'center' }
const inpSt: React.CSSProperties = { width: '100%', padding: '13px 13px 13px 42px', border: '1.5px solid #e5e7eb', borderRadius: 12, fontSize: 14, background: '#fafafa', color: '#0f172a', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }
const btnGreen: React.CSSProperties = { width: '100%', padding: '14px', background: 'linear-gradient(135deg,#1a4d1a 0%,#1e5c1e 100%)', color: '#fff', border: 'none', borderRadius: 13, fontSize: 14, fontWeight: 700, cursor: 'pointer', letterSpacing: 1.4, boxShadow: '0 4px 16px rgba(26,77,26,0.26)' }
const btnOutline: React.CSSProperties = { width: '100%', padding: '13px', background: 'transparent', border: '1.5px solid #1a4d1a', borderRadius: 13, fontSize: 13, fontWeight: 700, color: '#1a4d1a', cursor: 'pointer', letterSpacing: 0.8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }
const eyeSt: React.CSSProperties = { position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center', padding: 4 }
const errBox: React.CSSProperties = { background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#dc2626' }
const successBox: React.CSSProperties = { background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, padding: '14px', fontSize: 13, color: '#166534', lineHeight: 1.5 }
const backBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 13, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 5, padding: 0 }
const divider: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }
const divLine: React.CSSProperties = { flex: 1, height: 1, background: '#e5e7eb' }
const divText: React.CSSProperties = { fontSize: 12, color: '#9ca3af' }
const forgotBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b', textDecoration: 'underline', textUnderlineOffset: 3, padding: 0 }
