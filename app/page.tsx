'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

const IconEmail = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>)
const IconLock = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>)
const IconEye = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>)
const IconEyeOff = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>)
const IconUserPlus = () => (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>)

type ErroTipo = '' | 'sem-conta' | 'sem-plano' | 'senha'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [erroTipo, setErroTipo] = useState<ErroTipo>('')
  const [erroMsg, setErroMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotMsg, setForgotMsg] = useState('')
  const [forgotOk, setForgotOk] = useState(false)
  const [forgotLoad, setForgotLoad] = useState(false)

  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErroTipo(''); setErroMsg(''); setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      })
      const data = await res.json()
      if (res.ok) {
        router.push('/dashboard')
        return
      }
      const msg: string = data.error ?? ''
      // Detecta usuário não cadastrado
      if (res.status === 404 ||
          msg.toLowerCase().includes('não encontrado') ||
          msg.toLowerCase().includes('not found') ||
          msg.toLowerCase().includes('no user') ||
          msg.toLowerCase().includes('não existe') ||
          msg.toLowerCase().includes('invalid credentials')) {
        setErroTipo('sem-conta')
      } else {
        setErroTipo('senha')
        setErroMsg(msg || 'E-mail ou senha incorretos.')
      }
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
      {/* ── DNA helix – esquerda ── */}
      <svg style={{ position:'absolute',left:0,top:0,height:'100%',width:100,opacity:0.14,pointerEvents:'none' }}
        viewBox="0 0 100 800" preserveAspectRatio="xMidYMid slice">
        {Array.from({length:20},(_,i)=>{
          const y1=i*42,y2=y1+21,x1=i%2===0?18:82,x2=i%2===0?82:18
          return <g key={i}>
            <path d={`M${x1} ${y1} C${x1} ${y1+13},${x2} ${y2-13},${x2} ${y2}`} fill="none" stroke="#2d7a2d" strokeWidth="2" strokeLinecap="round"/>
            <circle cx={x1} cy={y1} r="3" fill="#2d7a2d" opacity="0.7"/>
            <circle cx={x2} cy={y2} r="3" fill="#2d7a2d" opacity="0.7"/>
            {i<19&&<line x1={x1+(x2-x1)*.28} y1={y1+(y2-y1)*.28} x2={x2-(x2-x1)*.28} y2={y1+(y2-y1)*.72} stroke="#2d7a2d" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.6"/>}
          </g>
        })}
      </svg>

      {/* ── Hexágonos + linhas circuito – canto superior direito ── */}
      <svg style={{ position:'absolute',right:0,top:0,width:240,height:240,opacity:0.11,pointerEvents:'none' }} viewBox="0 0 240 240">
        {[[60,40],[120,40],[90,90],[150,90],[120,140],[60,140],[30,90],[180,40],[210,90],[180,140]].map(([cx,cy],i)=>(
          <polygon key={i} points={`${cx},${cy-26} ${cx+22},${cy-13} ${cx+22},${cy+13} ${cx},${cy+26} ${cx-22},${cy+13} ${cx-22},${cy-13}`}
            fill="none" stroke="#b8960c" strokeWidth="1.1"/>
        ))}
        <line x1="30" y1="90" x2="210" y2="90" stroke="#b8960c" strokeWidth="0.7" strokeDasharray="5 4"/>
        <line x1="60" y1="40" x2="180" y2="140" stroke="#b8960c" strokeWidth="0.6" strokeDasharray="4 5"/>
      </svg>

      {/* ── Silhueta humana – topo direito ── */}
      <svg style={{ position:'absolute',right:32,top:20,width:68,height:128,opacity:0.09,pointerEvents:'none' }} viewBox="0 0 68 128">
        <circle cx="34" cy="14" r="10" fill="none" stroke="#2d7a2d" strokeWidth="1.4"/>
        <path d="M19 30 Q11 58 13 78 H21 L23 58 H45 L47 78 H55 Q57 58 49 30 Q41 24 34 24 Q27 24 19 30Z" fill="none" stroke="#2d7a2d" strokeWidth="1.4"/>
        <path d="M23 58 Q17 78 15 98" fill="none" stroke="#2d7a2d" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M45 58 Q51 78 53 98" fill="none" stroke="#2d7a2d" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M15 98 L19 126" fill="none" stroke="#2d7a2d" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M53 98 L49 126" fill="none" stroke="#2d7a2d" strokeWidth="1.4" strokeLinecap="round"/>
        <circle cx="34" cy="34" r="32" fill="none" stroke="#b8960c" strokeWidth="0.7" strokeDasharray="3 5" opacity="0.7"/>
      </svg>

      {/* ── Plantas / botanicals – canto inferior esquerdo ── */}
      <svg style={{ position:'absolute',left:0,bottom:0,width:200,height:220,opacity:0.28,pointerEvents:'none' }} viewBox="0 0 200 220">
        <path d="M50 220 Q44 188 36 155 Q22 118 8 92" fill="none" stroke="#3a7a3a" strokeWidth="2.8" strokeLinecap="round"/>
        <path d="M50 220 Q66 178 78 142 Q92 108 112 85" fill="none" stroke="#3a7a3a" strokeWidth="2.8" strokeLinecap="round"/>
        <path d="M8 92 Q-8 72 4 52 Q24 62 20 80" fill="#5a9c5a" opacity="0.85"/>
        <path d="M18 120 Q0 105 6 84 Q26 90 24 108" fill="#4a8c4a" opacity="0.75"/>
        <path d="M30 155 Q10 140 14 118 Q34 122 32 140" fill="#6aac6a" opacity="0.65"/>
        <path d="M112 85 Q132 62 148 70 Q140 90 116 92" fill="#5a9c5a" opacity="0.85"/>
        <path d="M90 110 Q114 95 124 108 Q112 126 94 122" fill="#4a8c4a" opacity="0.75"/>
        <path d="M78 142 Q100 128 110 142 Q96 158 80 152" fill="#6aac6a" opacity="0.65"/>
        <circle cx="116" cy="172" r="22" fill="#b84010" opacity="0.38"/>
        <circle cx="136" cy="186" r="15" fill="#cc4a14" opacity="0.32"/>
        <circle cx="98" cy="188" r="12" fill="#b84010" opacity="0.28"/>
        <path d="M150 165 Q170 145 182 156 Q173 172 156 170" fill="#4a8c4a" opacity="0.55"/>
        <path d="M162 188 Q180 168 192 180 Q185 196 168 193" fill="#3a7a3a" opacity="0.45"/>
      </svg>

      {/* ── Colher de madeira – canto inferior direito ── */}
      <svg style={{ position:'absolute',right:0,bottom:0,width:170,height:190,opacity:0.22,pointerEvents:'none' }} viewBox="0 0 170 190">
        <path d="M156 12 Q168 32 146 68 Q120 108 92 142 Q76 160 64 178" fill="none" stroke="#c49a2a" strokeWidth="8" strokeLinecap="round"/>
        <ellipse cx="148" cy="24" rx="20" ry="13" fill="#d4aa3a" opacity="0.75" transform="rotate(-35 148 24)"/>
        <ellipse cx="148" cy="24" rx="12" ry="7" fill="#e8c84a" opacity="0.4" transform="rotate(-35 148 24)"/>
        {Array.from({length:15},(_,i)=>(
          <circle key={i} cx={52+(i%5)*13} cy={165+Math.floor(i/5)*10} r="3.5" fill="#c49a2a" opacity="0.45"/>
        ))}
      </svg>

      {/* ── Linhas circuito dourado – rodapé ── */}
      <svg style={{ position:'absolute',bottom:0,left:'10%',width:'80%',height:80,opacity:0.13,pointerEvents:'none' }}
        viewBox="0 0 700 80" preserveAspectRatio="none">
        <line x1="0" y1="65" x2="180" y2="65" stroke="#b8960c" strokeWidth="1.2"/>
        <line x1="180" y1="65" x2="210" y2="40" stroke="#b8960c" strokeWidth="1.2"/>
        <line x1="210" y1="40" x2="350" y2="40" stroke="#b8960c" strokeWidth="1.2"/>
        <circle cx="180" cy="65" r="3.5" fill="#b8960c"/>
        <circle cx="210" cy="40" r="3.5" fill="#b8960c"/>
        <circle cx="350" cy="40" r="2.5" fill="#b8960c"/>
        <line x1="420" y1="70" x2="560" y2="70" stroke="#b8960c" strokeWidth="1.2"/>
        <line x1="560" y1="70" x2="595" y2="45" stroke="#b8960c" strokeWidth="1.2"/>
        <line x1="595" y1="45" x2="700" y2="45" stroke="#b8960c" strokeWidth="1.2"/>
        <circle cx="560" cy="70" r="3.5" fill="#b8960c"/>
        <circle cx="595" cy="45" r="3.5" fill="#b8960c"/>
      </svg>

      {/* ═══════════ CARD ═══════════ */}
      <div style={cardStyle}>
        {showForgot ? (
          /* ── ESQUECI SENHA ── */
          <>
            <button onClick={()=>{setShowForgot(false);setForgotMsg('');setForgotOk(false)}}
              style={{ background:'none',border:'none',cursor:'pointer',color:'#64748b',fontSize:13,marginBottom:18,display:'flex',alignItems:'center',gap:5,padding:0 }}>
              ← Voltar ao login
            </button>
            <h2 style={{ fontSize:19,fontWeight:700,color:'#1a4d1a',marginBottom:6 }}>Redefinir senha</h2>
            <p style={{ fontSize:13,color:'#64748b',marginBottom:20,lineHeight:1.5 }}>
              Informe seu e-mail e enviaremos um link para criar uma nova senha.
            </p>
            {forgotOk ? (
              <div style={{ background:'#f0fdf4',border:'1px solid #86efac',borderRadius:12,padding:'14px',fontSize:13,color:'#166534',lineHeight:1.5 }}>
                ✅ <strong>{forgotMsg}</strong><br/>
                <span style={{ fontSize:12 }}>Clique no link do e-mail para criar uma nova senha. Válido por 1 hora.</span>
              </div>
            ) : (
              <form onSubmit={handleForgot} style={{ display:'flex',flexDirection:'column',gap:14 }}>
                <div style={{ position:'relative' }}>
                  <span style={icoSt}><IconEmail/></span>
                  <input type="email" placeholder="Seu e-mail cadastrado" value={forgotEmail}
                    onChange={e=>setForgotEmail(e.target.value)} required style={inpSt}/>
                </div>
                {forgotMsg && <div style={errBox}>{forgotMsg}</div>}
                <button type="submit" disabled={forgotLoad} style={btnGreen}>
                  {forgotLoad ? 'ENVIANDO...' : 'ENVIAR LINK'}
                </button>
              </form>
            )}
          </>
        ) : (
          /* ── LOGIN ── */
          <>
            <div style={{ textAlign:'center',marginBottom:10 }}>
              <Image src="/logo-nutricare.png" alt="NutriCare" width={108} height={108} style={{ objectFit:'contain' }} priority/>
            </div>
            <div style={{ textAlign:'center',marginBottom:26 }}>
              <h1 style={{ fontFamily:"Georgia,'Times New Roman',serif",fontSize:36,fontWeight:900,color:'#1a4d1a',letterSpacing:'-0.5px',lineHeight:1,marginBottom:5 }}>
                Nutri<span style={{ color:'#b8960c' }}>care</span>
              </h1>
              <p style={{ fontSize:10.5,letterSpacing:3.2,color:'#9ca3af',fontWeight:600 }}>CIÊNCIA • NUTRIÇÃO • BEM-ESTAR</p>
            </div>

            <form onSubmit={handleLogin} style={{ display:'flex',flexDirection:'column',gap:13 }}>
              <div style={{ position:'relative' }}>
                <span style={icoSt}><IconEmail/></span>
                <input type="email" placeholder="E-mail" value={email}
                  onChange={e=>setEmail(e.target.value)} required style={inpSt}/>
              </div>
              <div style={{ position:'relative' }}>
                <span style={icoSt}><IconLock/></span>
                <input type={showSenha?'text':'password'} placeholder="Senha" value={senha}
                  onChange={e=>setSenha(e.target.value)} required style={{ ...inpSt,paddingRight:44 }}/>
                <button type="button" onClick={()=>setShowSenha(p=>!p)} style={eyeSt}>
                  {showSenha ? <IconEyeOff/> : <IconEye/>}
                </button>
              </div>

              {/* ── Erros de login ── */}
              {erroTipo === 'sem-conta' && (
                <div style={{ background:'#fef2f2',border:'1.5px solid #fca5a5',borderRadius:12,padding:'13px 14px' }}>
                  <p style={{ margin:'0 0 4px',fontSize:13,fontWeight:700,color:'#dc2626' }}>
                    ❌ Nenhuma conta encontrada com este e-mail.
                  </p>
                  <p style={{ margin:'0 0 10px',fontSize:12,color:'#7f1d1d' }}>
                    Você ainda não fez seu cadastro ou não assinou o plano NutriCare.
                  </p>
                  <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
                    <Link href="/cadastro" style={{ flex:1,textAlign:'center',padding:'9px 10px',background:'#1a4d1a',color:'#fff',borderRadius:9,textDecoration:'none',fontSize:12,fontWeight:700,minWidth:120 }}>
                      Fazer Cadastro
                    </Link>
                    <a href="https://pay.hotmart.com/SUBSTITUA_PELO_LINK" target="_blank" rel="noopener noreferrer"
                      style={{ flex:1,textAlign:'center',padding:'9px 10px',background:'#fff',color:'#1a4d1a',border:'1.5px solid #1a4d1a',borderRadius:9,textDecoration:'none',fontSize:12,fontWeight:700,minWidth:120 }}>
                      Assinar o Plano
                    </a>
                  </div>
                </div>
              )}
              {erroTipo === 'senha' && (
                <div style={{ ...errBox,color:'#dc2626',fontWeight:600 }}>❌ {erroMsg}</div>
              )}

              <button type="submit" disabled={loading} style={{ ...btnGreen,marginTop:2 }}>
                {loading ? 'ENTRANDO...' : 'ENTRAR'}
              </button>
            </form>

            <div style={{ display:'flex',alignItems:'center',gap:12,margin:'18px 0' }}>
              <div style={{ flex:1,height:1,background:'#e5e7eb' }}/>
              <span style={{ fontSize:12,color:'#9ca3af' }}>ou</span>
              <div style={{ flex:1,height:1,background:'#e5e7eb' }}/>
            </div>

            <Link href="/cadastro" style={{ textDecoration:'none' }}>
              <button style={{ width:'100%',padding:'13px',background:'transparent',border:'1.5px solid #1a4d1a',borderRadius:13,fontSize:13,fontWeight:700,color:'#1a4d1a',cursor:'pointer',letterSpacing:0.8,display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}>
                <IconUserPlus/> CADASTRAR
              </button>
            </Link>

            <div style={{ textAlign:'center',marginTop:15 }}>
              <button onClick={()=>setShowForgot(true)} style={{ background:'none',border:'none',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:6,fontSize:13,color:'#64748b',textDecoration:'underline',textUnderlineOffset:3,padding:0 }}>
                <IconLock/> Esqueci minha senha
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const bgStyle: React.CSSProperties = {
  minHeight:'100vh',
  background:'linear-gradient(150deg,#f6f5ef 0%,#f0ede6 45%,#eae6de 100%)',
  display:'flex',alignItems:'center',justifyContent:'center',
  padding:'24px',position:'relative',overflow:'hidden',
  fontFamily:"'Segoe UI',system-ui,-apple-system,sans-serif",
}
const cardStyle: React.CSSProperties = {
  background:'#fff',borderRadius:26,
  padding:'34px 38px 30px',width:'100%',maxWidth:415,
  boxShadow:'0 8px 48px rgba(26,70,26,0.13),0 2px 8px rgba(0,0,0,0.05)',
  position:'relative',zIndex:1,
}
const icoSt: React.CSSProperties = { position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:'#9ca3af',pointerEvents:'none',display:'flex',alignItems:'center' }
const inpSt: React.CSSProperties = { width:'100%',padding:'13px 13px 13px 42px',border:'1.5px solid #e5e7eb',borderRadius:12,fontSize:14,background:'#fafafa',color:'#0f172a',boxSizing:'border-box',outline:'none',fontFamily:'inherit' }
const btnGreen: React.CSSProperties = { width:'100%',padding:'14px',background:'linear-gradient(135deg,#1a4d1a 0%,#1e5c1e 100%)',color:'#fff',border:'none',borderRadius:13,fontSize:14,fontWeight:700,cursor:'pointer',letterSpacing:1.4,boxShadow:'0 4px 16px rgba(26,77,26,0.26)' }
const eyeSt: React.CSSProperties = { position:'absolute',right:13,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#9ca3af',display:'flex',alignItems:'center',padding:4 }
const errBox: React.CSSProperties = { background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:10,padding:'10px 14px',fontSize:13,color:'#dc2626' }
