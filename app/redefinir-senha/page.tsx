'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

const IconLock = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>)
const IconEye = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>)
const IconEyeOff = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>)
const IconCheck = () => (<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>)
const IconAlert = () => (<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>)

function ResetForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') ?? ''

  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [showNova, setShowNova] = useState(false)
  const [showConf, setShowConf] = useState(false)
  const [status, setStatus] = useState<'idle'|'loading'|'ok'|'erro'>('idle')
  const [mensagem, setMensagem] = useState('')

  // Força passada validada por barras de cor
  const forca = novaSenha.length === 0 ? 0
    : novaSenha.length < 6 ? 1
    : novaSenha.length < 10 ? 2
    : /[A-Z]/.test(novaSenha) && /[0-9]/.test(novaSenha) ? 4 : 3

  const forcaLabel = ['','Fraca','Média','Boa','Forte']
  const forcaCor = ['','#ef4444','#f59e0b','#22c55e','#16a34a']

  useEffect(() => {
    if (!token) {
      setStatus('erro')
      setMensagem('Link inválido. Solicite um novo link de redefinição de senha.')
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (novaSenha !== confirmar) { setMensagem('As senhas não conferem.'); return }
    if (novaSenha.length < 6) { setMensagem('A senha deve ter pelo menos 6 caracteres.'); return }
    setMensagem('')
    setStatus('loading')
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, novaSenha }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus('ok')
        setMensagem('Senha redefinida com sucesso!')
        setTimeout(() => router.push('/'), 3000)
      } else {
        setStatus('erro')
        setMensagem(data.error || 'Erro ao redefinir senha. O link pode ter expirado.')
      }
    } catch {
      setStatus('erro')
      setMensagem('Erro de conexão. Tente novamente.')
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; }
        input::placeholder { color: #aab0b8; }
        input:focus { outline: none; border-color: #1a4d1a !important; background: #fff !important; }
        .nc-input { transition: border-color 0.2s, background 0.2s; }
      `}</style>

      <div style={{
        minHeight:'100vh',
        background:'linear-gradient(150deg, #f7f6f0 0%, #f2f0ea 40%, #eeeae3 100%)',
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:'24px', position:'relative', overflow:'hidden',
        fontFamily:"'Segoe UI', system-ui, -apple-system, sans-serif",
      }}>

        {/* ── DNA Helix left ── */}
        <svg style={{ position:'absolute', left:0, top:0, height:'100%', width:110, opacity:0.12, pointerEvents:'none' }}
          viewBox="0 0 110 800" preserveAspectRatio="xMidYMid meet">
          {Array.from({length:18},(_,i)=>{
            const y1=i*46, y2=y1+23
            const x1=i%2===0?20:88, x2=i%2===0?88:20
            return <g key={i}>
              <path d={`M${x1} ${y1} C ${x1} ${y1+15}, ${x2} ${y2-15}, ${x2} ${y2}`} fill="none" stroke="#2d7a2d" strokeWidth="2.2" strokeLinecap="round"/>
              {i<17 && <line x1={x1+(x2-x1)*0.3} y1={y1+(y2-y1)*0.3} x2={x2-(x2-x1)*0.3} y2={y1+(y2-y1)*0.7} stroke="#2d7a2d" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7"/>}
              <circle cx={x1} cy={y1} r="3.5" fill="#2d7a2d" opacity="0.6"/>
              <circle cx={x2} cy={y2} r="3.5" fill="#2d7a2d" opacity="0.6"/>
            </g>
          })}
        </svg>

        {/* ── Circuit top-right ── */}
        <svg style={{ position:'absolute', right:0, top:0, width:220, height:220, opacity:0.09, pointerEvents:'none' }} viewBox="0 0 220 220">
          {[[55,40],[110,40],[82,86],[137,86],[110,132],[55,132],[28,86]].map(([cx,cy],i)=>(
            <polygon key={i} points={`${cx},${cy-24} ${cx+20},${cy-12} ${cx+20},${cy+12} ${cx},${cy+24} ${cx-20},${cy+12} ${cx-20},${cy-12}`} fill="none" stroke="#b8960c" strokeWidth="1.2"/>
          ))}
        </svg>

        {/* ── Human silhouette top-right ── */}
        <svg style={{ position:'absolute', right:28, top:16, width:70, height:130, opacity:0.08, pointerEvents:'none' }} viewBox="0 0 70 130">
          <circle cx="35" cy="16" r="10" fill="none" stroke="#2d7a2d" strokeWidth="1.5"/>
          <path d="M20 32 Q12 60 14 80 H22 L24 60 H46 L48 80 H56 Q58 60 50 32 Q42 26 35 26 Q28 26 20 32Z" fill="none" stroke="#2d7a2d" strokeWidth="1.5"/>
          <path d="M24 60 Q18 80 16 100" fill="none" stroke="#2d7a2d" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M46 60 Q52 80 54 100" fill="none" stroke="#2d7a2d" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M16 100 L20 128" fill="none" stroke="#2d7a2d" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M54 100 L50 128" fill="none" stroke="#2d7a2d" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="35" cy="35" r="30" fill="none" stroke="#b8960c" strokeWidth="0.6" strokeDasharray="3 4" opacity="0.6"/>
        </svg>

        {/* ── Botanical bottom-left ── */}
        <svg style={{ position:'absolute', left:0, bottom:0, width:180, height:200, opacity:0.20, pointerEvents:'none' }} viewBox="0 0 180 200">
          <path d="M40 200 Q35 170 30 140 Q20 110 10 90" fill="none" stroke="#3a7a3a" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M40 200 Q55 165 65 135 Q78 105 95 88" fill="none" stroke="#3a7a3a" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M10 90 Q-5 72 5 55 Q22 65 18 82" fill="#4a8c4a" opacity="0.8"/>
          <path d="M20 115 Q2 100 8 82 Q24 88 22 105" fill="#4a8c4a" opacity="0.7"/>
          <path d="M95 88 Q112 68 125 75 Q118 92 100 94" fill="#4a8c4a" opacity="0.8"/>
          <circle cx="100" cy="160" r="18" fill="#c04a0a" opacity="0.4"/>
          <circle cx="118" cy="172" r="13" fill="#d45a0a" opacity="0.35"/>
        </svg>

        {/* ── Spoon bottom-right ── */}
        <svg style={{ position:'absolute', right:0, bottom:0, width:160, height:180, opacity:0.18, pointerEvents:'none' }} viewBox="0 0 160 180">
          <path d="M148 10 Q158 28 138 62 Q115 100 88 132 Q72 150 62 170" fill="none" stroke="#c49a2a" strokeWidth="7" strokeLinecap="round"/>
          <ellipse cx="140" cy="22" rx="18" ry="12" fill="#d4aa3a" opacity="0.7" transform="rotate(-35 140 22)"/>
          {[0,1,2,3,4,5,6,7,8,9].map(i=>(
            <circle key={i} cx={50+(i%4)*14} cy={158+Math.floor(i/4)*9} r="3.5" fill="#c49a2a" opacity="0.5"/>
          ))}
        </svg>

        {/* ─── CARD ─── */}
        <div style={{
          background:'#fff', borderRadius:28,
          padding:'36px 40px 32px', width:'100%', maxWidth:420,
          boxShadow:'0 8px 48px rgba(30,70,30,0.12), 0 2px 8px rgba(0,0,0,0.06)',
          position:'relative', zIndex:1,
        }}>
          {/* Logo */}
          <div style={{ textAlign:'center', marginBottom:10 }}>
            <Image src="/logo-nutricare.png" alt="NutriCare" width={90} height={90} style={{ objectFit:'contain' }} priority/>
          </div>
          <div style={{ textAlign:'center', marginBottom:26 }}>
            <h1 style={{ fontFamily:"'Playfair Display', Georgia, serif", fontSize:30, fontWeight:800, color:'#1a4d1a', letterSpacing:'-0.5px', marginBottom:5 }}>
              Nutri<span style={{ color:'#b8960c' }}>care</span>
            </h1>
            <p style={{ fontSize:10, letterSpacing:3, color:'#9ca3af', fontWeight:600 }}>CIÊNCIA • NUTRIÇÃO • BEM-ESTAR</p>
          </div>

          {/* Estado: sucesso */}
          {status === 'ok' && (
            <div style={{ textAlign:'center', padding:'16px 0 8px' }}>
              <div style={{ display:'flex', justifyContent:'center', marginBottom:14 }}><IconCheck/></div>
              <h2 style={{ fontSize:18, fontWeight:700, color:'#16a34a', marginBottom:8 }}>Senha redefinida!</h2>
              <p style={{ fontSize:14, color:'#64748b', lineHeight:1.6, marginBottom:20 }}>
                Sua senha foi alterada com sucesso.<br/>Redirecionando para o login...
              </p>
              <Link href="/" style={{ display:'inline-block', padding:'12px 28px', background:'#1a4d1a', color:'#fff', borderRadius:12, textDecoration:'none', fontSize:14, fontWeight:700 }}>
                Ir para o Login
              </Link>
            </div>
          )}

          {/* Estado: token inválido / erro sem formulário */}
          {status === 'erro' && !token && (
            <div style={{ textAlign:'center', padding:'16px 0 8px' }}>
              <div style={{ display:'flex', justifyContent:'center', marginBottom:14 }}><IconAlert/></div>
              <h2 style={{ fontSize:18, fontWeight:700, color:'#dc2626', marginBottom:8 }}>Link inválido</h2>
              <p style={{ fontSize:14, color:'#64748b', lineHeight:1.6, marginBottom:20 }}>
                Este link de redefinição de senha é inválido ou já foi utilizado.<br/>Solicite um novo link.
              </p>
              <Link href="/" style={{ display:'inline-block', padding:'12px 28px', background:'#1a4d1a', color:'#fff', borderRadius:12, textDecoration:'none', fontSize:14, fontWeight:700 }}>
                Voltar ao Login
              </Link>
            </div>
          )}

          {/* Formulário (idle ou loading ou erro com token) */}
          {(status === 'idle' || status === 'loading' || (status === 'erro' && !!token)) && (
            <>
              <div style={{ marginBottom:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                  <span style={{ color:'#1a4d1a' }}><IconLock/></span>
                  <h2 style={{ fontSize:18, fontWeight:700, color:'#1a4d1a', margin:0 }}>Criar nova senha</h2>
                </div>
                <p style={{ fontSize:13, color:'#64748b', lineHeight:1.5 }}>
                  Escolha uma senha forte para proteger sua conta.
                </p>
              </div>

              <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {/* Nova senha */}
                <div>
                  <div style={{ position:'relative' }}>
                    <span style={icoS}><IconLock/></span>
                    <input type={showNova?'text':'password'} placeholder="Nova senha" value={novaSenha}
                      onChange={e=>setNovaSenha(e.target.value)} required minLength={6}
                      className="nc-input" style={{ ...inpS, paddingRight:44 }}/>
                    <button type="button" onClick={()=>setShowNova(p=>!p)} style={eyeS}>
                      {showNova ? <IconEyeOff/> : <IconEye/>}
                    </button>
                  </div>
                  {/* Barra de força */}
                  {novaSenha.length > 0 && (
                    <div style={{ marginTop:8 }}>
                      <div style={{ display:'flex', gap:4, marginBottom:4 }}>
                        {[1,2,3,4].map(n => (
                          <div key={n} style={{ flex:1, height:4, borderRadius:4, background: forca >= n ? forcaCor[forca] : '#e5e7eb', transition:'background 0.3s' }}/>
                        ))}
                      </div>
                      <span style={{ fontSize:11, color:forcaCor[forca], fontWeight:600 }}>
                        Senha {forcaLabel[forca]}
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirmar senha */}
                <div style={{ position:'relative' }}>
                  <span style={icoS}><IconLock/></span>
                  <input type={showConf?'text':'password'} placeholder="Confirmar nova senha" value={confirmar}
                    onChange={e=>setConfirmar(e.target.value)} required minLength={6}
                    className="nc-input" style={{ ...inpS, paddingRight:44,
                      borderColor: confirmar && confirmar !== novaSenha ? '#fca5a5' : undefined }}/>
                  <button type="button" onClick={()=>setShowConf(p=>!p)} style={eyeS}>
                    {showConf ? <IconEyeOff/> : <IconEye/>}
                  </button>
                  {confirmar && confirmar !== novaSenha && (
                    <span style={{ fontSize:11, color:'#ef4444', marginTop:4, display:'block' }}>As senhas não conferem</span>
                  )}
                </div>

                {/* Requisitos */}
                <div style={{ background:'#f8fafc', borderRadius:10, padding:'10px 14px' }}>
                  <p style={{ fontSize:11.5, color:'#64748b', margin:0, lineHeight:1.8 }}>
                    A senha deve ter:
                  </p>
                  <ul style={{ margin:'4px 0 0 16px', padding:0, fontSize:11.5, color:'#64748b', lineHeight:1.8 }}>
                    <li style={{ color: novaSenha.length >= 6 ? '#16a34a' : '#94a3b8' }}>✓ Mínimo 6 caracteres</li>
                    <li style={{ color: /[A-Z]/.test(novaSenha) ? '#16a34a' : '#94a3b8' }}>✓ Uma letra maiúscula</li>
                    <li style={{ color: /[0-9]/.test(novaSenha) ? '#16a34a' : '#94a3b8' }}>✓ Um número</li>
                  </ul>
                </div>

                {/* Mensagem de erro */}
                {mensagem && status !== 'ok' && (
                  <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#dc2626' }}>
                    {mensagem}
                  </div>
                )}

                <button type="submit" disabled={status === 'loading'} style={{
                  width:'100%', padding:'15px',
                  background:'linear-gradient(135deg, #1a4d1a 0%, #1e5c1e 100%)',
                  color:'#fff', border:'none', borderRadius:14, fontSize:14,
                  fontWeight:700, cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                  letterSpacing:1.2, boxShadow:'0 4px 18px rgba(26,77,26,0.28)',
                  opacity: status === 'loading' ? 0.8 : 1,
                }}>
                  {status === 'loading' ? 'SALVANDO...' : 'REDEFINIR SENHA'}
                </button>
              </form>

              <div style={{ textAlign:'center', marginTop:18 }}>
                <Link href="/" style={{ fontSize:13, color:'#64748b', textDecoration:'underline', textUnderlineOffset:3 }}>
                  ← Voltar ao login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f7f6f0' }}>
        <p style={{ color:'#64748b', fontFamily:'sans-serif' }}>Carregando...</p>
      </div>
    }>
      <ResetForm/>
    </Suspense>
  )
}

const icoS: React.CSSProperties = { position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#9ca3af', pointerEvents:'none', display:'flex', alignItems:'center' }
const inpS: React.CSSProperties = { width:'100%', padding:'14px 14px 14px 42px', border:'1.5px solid #e5e7eb', borderRadius:14, fontSize:14, background:'#fafafa', color:'#0f172a', boxSizing:'border-box' }
const eyeS: React.CSSProperties = { position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9ca3af', display:'flex', alignItems:'center', padding:4 }
