'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

const IconLock   = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>)
const IconEye    = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>)
const IconEyeOff = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>)

function ResetForm() {
  const params = useSearchParams()
  const router = useRouter()
  const token  = params.get('token') ?? ''

  const [novaSenha, setNova] = useState('')
  const [confirmar, setConf] = useState('')
  const [showN, setShowN]    = useState(false)
  const [showC, setShowC]    = useState(false)
  const [status, setStatus]  = useState<'idle'|'loading'|'ok'|'token-invalido'|'erro'>('idle')
  const [msg, setMsg]        = useState('')

  const forca = novaSenha.length === 0 ? 0 : novaSenha.length < 6 ? 1
    : novaSenha.length < 10 ? 2 : /[A-Z]/.test(novaSenha) && /[0-9]/.test(novaSenha) ? 4 : 3
  const forcaCor   = ['', '#ef4444', '#f59e0b', '#22c55e', '#16a34a']
  const forcaLabel = ['', 'Fraca', 'Média', 'Boa', 'Forte']

  useEffect(() => { if (!token) setStatus('token-invalido') }, [token])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (novaSenha !== confirmar) { setMsg('As senhas não conferem.'); return }
    if (novaSenha.length < 6)   { setMsg('A senha deve ter pelo menos 6 caracteres.'); return }
    setMsg(''); setStatus('loading')
    try {
      const res  = await fetch('/api/auth/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, novaSenha }),
      })
      const data = await res.json()
      if (res.ok) { setStatus('ok'); setTimeout(() => router.push('/'), 3000) }
      else { setStatus('erro'); setMsg(data.error || 'Erro ao redefinir senha. O link pode ter expirado.') }
    } catch { setStatus('erro'); setMsg('Erro de conexão. Tente novamente.') }
  }

  return (
    <div style={bg}>
      <div style={card}>
        {/* Logo (sem texto duplicado) */}
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <Image
            src="/logo-nutricare.png"
            alt="NutriCare"
            width={190}
            height={190}
            style={{ objectFit: 'contain', width: 'clamp(140px, 30vw, 190px)', height: 'auto' }}
            priority
          />
        </div>

        {status === 'ok' && (
          <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#16a34a', marginBottom: 8 }}>Senha redefinida!</h2>
            <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 20 }}>
              Sua senha foi alterada com sucesso.<br />Redirecionando para o login...
            </p>
            <Link href="/" style={linkBtn}>Ir para o Login</Link>
          </div>
        )}

        {status === 'token-invalido' && (
          <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#dc2626', marginBottom: 8 }}>Link inválido ou expirado</h2>
            <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 20 }}>
              Este link de redefinição não é mais válido.<br />Solicite um novo link na tela de login.
            </p>
            <Link href="/" style={linkBtn}>Voltar ao Login</Link>
          </div>
        )}

        {(status === 'idle' || status === 'loading' || status === 'erro') && !!token && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
              <span style={{ color: '#1a4d1a' }}><IconLock /></span>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1a4d1a', margin: 0 }}>Criar nova senha</h2>
            </div>

            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div>
                <div style={{ position: 'relative' }}>
                  <span style={ico}><IconLock /></span>
                  <input type={showN ? 'text' : 'password'} placeholder="Nova senha" value={novaSenha}
                    onChange={e => setNova(e.target.value)} required minLength={6}
                    style={{ ...inp, paddingRight: 44 }} />
                  <button type="button" onClick={() => setShowN(p => !p)} style={eyeSt}>
                    {showN ? <IconEyeOff /> : <IconEye />}
                  </button>
                </div>
                {novaSenha.length > 0 && (
                  <div style={{ marginTop: 7 }}>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 3 }}>
                      {[1, 2, 3, 4].map(n => (
                        <div key={n} style={{ flex: 1, height: 4, borderRadius: 4, background: forca >= n ? forcaCor[forca] : '#e5e7eb', transition: 'background 0.3s' }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 11, color: forcaCor[forca], fontWeight: 600 }}>Senha {forcaLabel[forca]}</span>
                  </div>
                )}
              </div>

              <div style={{ position: 'relative' }}>
                <span style={ico}><IconLock /></span>
                <input type={showC ? 'text' : 'password'} placeholder="Confirmar nova senha" value={confirmar}
                  onChange={e => setConf(e.target.value)} required minLength={6}
                  style={{ ...inp, paddingRight: 44, borderColor: confirmar && confirmar !== novaSenha ? '#fca5a5' : undefined }} />
                <button type="button" onClick={() => setShowC(p => !p)} style={eyeSt}>
                  {showC ? <IconEyeOff /> : <IconEye />}
                </button>
                {confirmar && confirmar !== novaSenha && (
                  <span style={{ fontSize: 11, color: '#ef4444', marginTop: 4, display: 'block' }}>As senhas não conferem</span>
                )}
              </div>

              <div style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 14px' }}>
                <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 11.5, color: '#64748b', lineHeight: 1.9 }}>
                  <li style={{ color: novaSenha.length >= 6 ? '#16a34a' : '#94a3b8' }}>✓ Mínimo 6 caracteres</li>
                  <li style={{ color: /[A-Z]/.test(novaSenha) ? '#16a34a' : '#94a3b8' }}>✓ Uma letra maiúscula</li>
                  <li style={{ color: /[0-9]/.test(novaSenha) ? '#16a34a' : '#94a3b8' }}>✓ Um número</li>
                </ul>
              </div>

              {msg && <div style={errBox}>{msg}</div>}

              <button type="submit" disabled={status === 'loading'}
                style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg,#1a4d1a 0%,#1e5c1e 100%)', color: '#fff', border: 'none', borderRadius: 13, fontSize: 14, fontWeight: 700, cursor: status === 'loading' ? 'not-allowed' : 'pointer', letterSpacing: 1.2, boxShadow: '0 4px 16px rgba(26,77,26,0.26)', opacity: status === 'loading' ? 0.8 : 1 }}>
                {status === 'loading' ? 'SALVANDO...' : 'REDEFINIR SENHA'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Link href="/" style={{ fontSize: 13, color: '#64748b', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                ← Voltar ao login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundImage: "url('/bg-login.jpg')", backgroundSize: 'cover' }}>
        <p style={{ color: '#64748b', fontFamily: 'sans-serif', background: 'rgba(255,255,255,0.9)', padding: '20px 30px', borderRadius: 12 }}>Carregando...</p>
      </div>
    }>
      <ResetForm />
    </Suspense>
  )
}

const bg: React.CSSProperties = {
  minHeight: '100vh',
  backgroundImage:
    "linear-gradient(rgba(255,255,255,0.55), rgba(255,255,255,0.55)), url('/bg-login.jpg')",
  backgroundSize: 'cover',
  backgroundPosition: 'center top',
  backgroundRepeat: 'no-repeat',
  backgroundColor: '#f5f8f4',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '24px', position: 'relative',
  fontFamily: "'Segoe UI',system-ui,-apple-system,sans-serif",
}
const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.82)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  borderRadius: 26, padding: '30px 34px 26px',
  width: '100%', maxWidth: 415,
  boxShadow: '0 8px 40px rgba(26,70,26,0.14), 0 2px 10px rgba(0,0,0,0.06)',
  border: '1px solid rgba(255,255,255,0.55)',
  position: 'relative', zIndex: 1,
}
const titleSt: React.CSSProperties = { fontFamily: "Georgia,'Times New Roman',serif", fontSize: 30, fontWeight: 900, color: '#1a4d1a', margin: '8px 0 3px' }
const subSt: React.CSSProperties = { fontSize: 9.5, letterSpacing: 3, color: '#9ca3af', fontWeight: 600 }
const ico: React.CSSProperties = { position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none', display: 'flex', alignItems: 'center' }
const inp: React.CSSProperties = { width: '100%', padding: '13px 13px 13px 42px', border: '1.5px solid #e5e7eb', borderRadius: 12, fontSize: 14, background: '#fafafa', color: '#0f172a', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }
const eyeSt: React.CSSProperties = { position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center', padding: 4 }
const errBox: React.CSSProperties = { background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#dc2626' }
const linkBtn: React.CSSProperties = { display: 'inline-block', padding: '12px 28px', background: '#1a4d1a', color: '#fff', borderRadius: 12, textDecoration: 'none', fontSize: 14, fontWeight: 700 }
