'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

/* ─── SVG Icons ─────────────────────────────────────────────────────────── */
const IconEmail = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
)
const IconLock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)
const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>
  </svg>
)
const IconEyeOff = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)
const IconUser = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
)
const IconUserPlus = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
  </svg>
)

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotMsg, setForgotMsg] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)

  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      })
      const data = await res.json()
      if (res.ok) {
        router.push('/dashboard')
      } else {
        setErro(data.error || 'E-mail ou senha incorretos.')
      }
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    }
    setLoading(false)
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
      if (res.ok) {
        setForgotMsg('✅ E-mail enviado! Verifique sua caixa de entrada.')
      } else {
        setForgotMsg(data.error || 'Erro ao enviar e-mail. Tente novamente.')
      }
    } catch {
      setForgotMsg('Erro de conexão. Tente novamente.')
    }
    setForgotLoading(false)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; }
        input::placeholder { color: #aab0b8; }
        input:focus, select:focus { outline: none; border-color: #1a4d1a !important; background: #fff !important; }
        button:hover { opacity: 0.92; }
        .nc-input { transition: border-color 0.2s, background 0.2s; }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(150deg, #f7f6f0 0%, #f2f0ea 40%, #eeeae3 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px', position: 'relative', overflow: 'hidden',
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      }}>

        {/* ── DNA Helix left ── */}
        <svg style={{ position:'absolute', left:0, top:0, height:'100%', width:110, opacity:0.13, pointerEvents:'none' }}
          viewBox="0 0 110 800" preserveAspectRatio="xMidYMid meet">
          {Array.from({length:18},(_,i)=>{
            const y1=i*46, y2=y1+23
            const x1=i%2===0?20:88, x2=i%2===0?88:20
            return <g key={i}>
              <path d={`M${x1} ${y1} C ${x1} ${y1+15}, ${x2} ${y2-15}, ${x2} ${y2}`}
                fill="none" stroke="#2d7a2d" strokeWidth="2.2" strokeLinecap="round"/>
              {i<17 && <line x1={x1+(x2-x1)*0.3} y1={y1+(y2-y1)*0.3} x2={x2-(x2-x1)*0.3} y2={y1+(y2-y1)*0.7}
                stroke="#2d7a2d" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7"/>}
              <circle cx={x1} cy={y1} r="3.5" fill="#2d7a2d" opacity="0.6"/>
              <circle cx={x2} cy={y2} r="3.5" fill="#2d7a2d" opacity="0.6"/>
            </g>
          })}
        </svg>

        {/* ── Circuit / Hexagons top-right ── */}
        <svg style={{ position:'absolute', right:0, top:0, width:220, height:220, opacity:0.10, pointerEvents:'none' }}
          viewBox="0 0 220 220">
          {[[55,40],[110,40],[82,86],[137,86],[110,132],[55,132],[28,86]].map(([cx,cy],i)=>(
            <polygon key={i} points={`${cx},${cy-24} ${cx+20},${cy-12} ${cx+20},${cy+12} ${cx},${cy+24} ${cx-20},${cy+12} ${cx-20},${cy-12}`}
              fill="none" stroke="#b8960c" strokeWidth="1.2"/>
          ))}
          {[[55,40],[82,86],[137,86],[110,40],[55,40],[82,86]].map(([x,y],i,a)=> i<a.length-1 &&
            <line key={i} x1={x} y1={y} x2={a[i+1][0]} y2={a[i+1][1]} stroke="#b8960c" strokeWidth="0.8" strokeDasharray="4 3"/>
          )}
        </svg>

        {/* ── Human silhouette top-right ── */}
        <svg style={{ position:'absolute', right:28, top:16, width:70, height:130, opacity:0.09, pointerEvents:'none' }}
          viewBox="0 0 70 130">
          <circle cx="35" cy="16" r="10" fill="none" stroke="#2d7a2d" strokeWidth="1.5"/>
          <path d="M20 32 Q12 60 14 80 H22 L24 60 H46 L48 80 H56 Q58 60 50 32 Q42 26 35 26 Q28 26 20 32Z"
            fill="none" stroke="#2d7a2d" strokeWidth="1.5"/>
          <path d="M24 60 Q18 80 16 100" fill="none" stroke="#2d7a2d" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M46 60 Q52 80 54 100" fill="none" stroke="#2d7a2d" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M16 100 L20 128" fill="none" stroke="#2d7a2d" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M54 100 L50 128" fill="none" stroke="#2d7a2d" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="35" cy="35" r="30" fill="none" stroke="#b8960c" strokeWidth="0.6" strokeDasharray="3 4" opacity="0.6"/>
        </svg>

        {/* ── Gold circuit lines bottom ── */}
        <svg style={{ position:'absolute', bottom:0, left:0, width:'100%', height:90, opacity:0.12, pointerEvents:'none' }}
          viewBox="0 0 800 90" preserveAspectRatio="xMidYMid meet">
          <line x1="0" y1="70" x2="200" y2="70" stroke="#b8960c" strokeWidth="1"/>
          <line x1="200" y1="70" x2="230" y2="45" stroke="#b8960c" strokeWidth="1"/>
          <line x1="230" y1="45" x2="380" y2="45" stroke="#b8960c" strokeWidth="1"/>
          <circle cx="200" cy="70" r="3" fill="#b8960c"/>
          <circle cx="230" cy="45" r="3" fill="#b8960c"/>
          <line x1="500" y1="80" x2="700" y2="80" stroke="#b8960c" strokeWidth="1"/>
          <line x1="700" y1="80" x2="730" y2="55" stroke="#b8960c" strokeWidth="1"/>
          <line x1="730" y1="55" x2="800" y2="55" stroke="#b8960c" strokeWidth="1"/>
          <circle cx="700" cy="80" r="3" fill="#b8960c"/>
          <circle cx="730" cy="55" r="3" fill="#b8960c"/>
        </svg>

        {/* ── Botanical plants bottom-left ── */}
        <svg style={{ position:'absolute', left:0, bottom:0, width:180, height:200, opacity:0.22, pointerEvents:'none' }}
          viewBox="0 0 180 200">
          {/* main stems */}
          <path d="M40 200 Q35 170 30 140 Q20 110 10 90" fill="none" stroke="#3a7a3a" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M40 200 Q55 165 65 135 Q78 105 95 88" fill="none" stroke="#3a7a3a" strokeWidth="2.5" strokeLinecap="round"/>
          {/* leaves left stem */}
          <path d="M10 90 Q-5 72 5 55 Q22 65 18 82" fill="#4a8c4a" opacity="0.8"/>
          <path d="M20 115 Q2 100 8 82 Q24 88 22 105" fill="#4a8c4a" opacity="0.7"/>
          <path d="M25 140 Q8 128 12 110 Q28 116 26 132" fill="#5a9c5a" opacity="0.6"/>
          {/* leaves right stem */}
          <path d="M95 88 Q112 68 125 75 Q118 92 100 94" fill="#4a8c4a" opacity="0.8"/>
          <path d="M78 108 Q98 95 108 105 Q98 120 82 118" fill="#4a8c4a" opacity="0.7"/>
          <path d="M65 135 Q88 125 95 138 Q82 150 68 145" fill="#5a9c5a" opacity="0.6"/>
          {/* small herb cluster */}
          <circle cx="100" cy="160" r="18" fill="#c04a0a" opacity="0.4"/>
          <circle cx="118" cy="172" r="13" fill="#d45a0a" opacity="0.35"/>
          <circle cx="85" cy="175" r="10" fill="#c04a0a" opacity="0.3"/>
          {/* extra leaves */}
          <path d="M130 155 Q148 138 158 148 Q150 162 135 162" fill="#4a8c4a" opacity="0.5"/>
          <path d="M145 175 Q162 158 170 170 Q164 184 148 182" fill="#3a7a3a" opacity="0.4"/>
        </svg>

        {/* ── Wooden spoon bottom-right ── */}
        <svg style={{ position:'absolute', right:0, bottom:0, width:160, height:180, opacity:0.20, pointerEvents:'none' }}
          viewBox="0 0 160 180">
          <path d="M148 10 Q158 28 138 62 Q115 100 88 132 Q72 150 62 170"
            fill="none" stroke="#c49a2a" strokeWidth="7" strokeLinecap="round"/>
          <ellipse cx="140" cy="22" rx="18" ry="12" fill="#d4aa3a" opacity="0.7"
            transform="rotate(-35 140 22)"/>
          {/* powder dots */}
          {[0,1,2,3,4,5,6,7,8,9,10,11].map(i=>(
            <circle key={i} cx={50+(i%4)*14} cy={158+Math.floor(i/4)*9} r="3.5"
              fill="#c49a2a" opacity="0.5"/>
          ))}
        </svg>

        {/* ─────── CARD ─────── */}
        <div style={{
          background: '#fff',
          borderRadius: 28,
          padding: '36px 40px 32px',
          width: '100%', maxWidth: 420,
          boxShadow: '0 8px 48px rgba(30,70,30,0.12), 0 2px 8px rgba(0,0,0,0.06)',
          position: 'relative', zIndex: 1,
        }}>
          {showForgot ? (
            /* ── FORGOT PASSWORD ── */
            <>
              <button onClick={()=>{setShowForgot(false);setForgotMsg('')}}
                style={{ background:'none', border:'none', cursor:'pointer', color:'#64748b', fontSize:13, marginBottom:20, display:'flex', alignItems:'center', gap:6 }}>
                ← Voltar ao login
              </button>
              <h2 style={{ fontSize:20, fontWeight:700, color:'#1a4d1a', marginBottom:6 }}>Redefinir senha</h2>
              <p style={{ fontSize:13, color:'#64748b', marginBottom:22, lineHeight:1.5 }}>
                Informe seu e-mail cadastrado e enviaremos um link para criar uma nova senha.
              </p>
              {forgotMsg ? (
                <div style={{ padding:'14px', borderRadius:12, fontSize:13, lineHeight:1.5,
                  background: forgotMsg.startsWith('✅') ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${forgotMsg.startsWith('✅') ? '#86efac' : '#fca5a5'}`,
                  color: forgotMsg.startsWith('✅') ? '#166534' : '#dc2626' }}>
                  {forgotMsg}
                </div>
              ) : (
                <form onSubmit={handleForgot} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <div style={{ position:'relative' }}>
                    <span style={icoStyle}><IconEmail/></span>
                    <input type="email" placeholder="Seu e-mail cadastrado" value={forgotEmail}
                      onChange={e=>setForgotEmail(e.target.value)} required className="nc-input" style={inputStyle}/>
                  </div>
                  <button type="submit" disabled={forgotLoading} style={btnGreen}>
                    {forgotLoading ? 'ENVIANDO...' : 'ENVIAR LINK DE REDEFINIÇÃO'}
                  </button>
                </form>
              )}
            </>
          ) : (
            /* ── LOGIN ── */
            <>
              {/* Logo */}
              <div style={{ textAlign:'center', marginBottom:12 }}>
                <Image src="/logo-nutricare.png" alt="NutriCare" width={110} height={110}
                  style={{ objectFit:'contain' }} priority/>
              </div>
              <div style={{ textAlign:'center', marginBottom:28 }}>
                <h1 style={{ fontFamily:"'Playfair Display', Georgia, serif", fontSize:36, fontWeight:800,
                  color:'#1a4d1a', letterSpacing:'-0.5px', lineHeight:1, marginBottom:6 }}>
                  Nutri<span style={{ color:'#b8960c' }}>care</span>
                </h1>
                <p style={{ fontSize:10.5, letterSpacing:3, color:'#9ca3af', fontWeight:600 }}>
                  CIÊNCIA • NUTRIÇÃO • BEM-ESTAR
                </p>
              </div>

              <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div style={{ position:'relative' }}>
                  <span style={icoStyle}><IconEmail/></span>
                  <input type="email" placeholder="E-mail" value={email}
                    onChange={e=>setEmail(e.target.value)} required className="nc-input" style={inputStyle}/>
                </div>

                <div style={{ position:'relative' }}>
                  <span style={icoStyle}><IconLock/></span>
                  <input type={showSenha?'text':'password'} placeholder="Senha" value={senha}
                    onChange={e=>setSenha(e.target.value)} required className="nc-input"
                    style={{ ...inputStyle, paddingRight:44 }}/>
                  <button type="button" onClick={()=>setShowSenha(p=>!p)} style={eyeStyle}>
                    {showSenha ? <IconEyeOff/> : <IconEye/>}
                  </button>
                </div>

                {erro && (
                  <div style={{ background:'#fef2f2', border:'1px solid #fca5a5',
                    borderRadius:10, padding:'10px 14px', fontSize:13, color:'#dc2626' }}>
                    {erro}
                  </div>
                )}

                <button type="submit" disabled={loading} style={{ ...btnGreen, marginTop:4 }}>
                  {loading ? 'ENTRANDO...' : 'ENTRAR'}
                </button>
              </form>

              {/* divider */}
              <div style={{ display:'flex', alignItems:'center', gap:12, margin:'20px 0' }}>
                <div style={{ flex:1, height:1, background:'#e5e7eb' }}/>
                <span style={{ fontSize:12, color:'#9ca3af' }}>ou</span>
                <div style={{ flex:1, height:1, background:'#e5e7eb' }}/>
              </div>

              {/* Cadastrar */}
              <Link href="/cadastro" style={{ textDecoration:'none' }}>
                <button type="button" style={{
                  width:'100%', padding:'13px',
                  background:'transparent',
                  border:'1.5px solid #1a4d1a',
                  borderRadius:14, fontSize:14, fontWeight:700,
                  color:'#1a4d1a', cursor:'pointer', letterSpacing:1,
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                }}>
                  <IconUserPlus/> CADASTRAR
                </button>
              </Link>

              {/* Esqueci senha */}
              <div style={{ textAlign:'center', marginTop:16 }}>
                <button onClick={()=>setShowForgot(true)} style={{
                  background:'none', border:'none', cursor:'pointer',
                  display:'inline-flex', alignItems:'center', gap:6,
                  fontSize:13, color:'#64748b', textDecoration:'underline',
                  textUnderlineOffset:3,
                }}>
                  <IconLock/> Esqueci minha senha
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

const icoStyle: React.CSSProperties = {
  position:'absolute', left:14, top:'50%', transform:'translateY(-50%)',
  color:'#9ca3af', pointerEvents:'none', display:'flex', alignItems:'center',
}
const inputStyle: React.CSSProperties = {
  width:'100%', padding:'14px 14px 14px 42px',
  border:'1.5px solid #e5e7eb', borderRadius:14, fontSize:14,
  background:'#fafafa', color:'#0f172a', boxSizing:'border-box',
}
const btnGreen: React.CSSProperties = {
  width:'100%', padding:'15px',
  background:'linear-gradient(135deg, #1a4d1a 0%, #1e5c1e 100%)',
  color:'#fff', border:'none', borderRadius:14, fontSize:14,
  fontWeight:700, cursor:'pointer', letterSpacing:1.5,
  boxShadow:'0 4px 18px rgba(26,77,26,0.28)',
}
const eyeStyle: React.CSSProperties = {
  position:'absolute', right:14, top:'50%', transform:'translateY(-50%)',
  background:'none', border:'none', cursor:'pointer', color:'#9ca3af',
  display:'flex', alignItems:'center', padding:4,
}
