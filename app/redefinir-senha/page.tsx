'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

const IconLock = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>)
const IconEye  = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>)
const IconEyeOff = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>)

function ResetForm() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token') ?? ''

  const [novaSenha, setNova] = useState('')
  const [confirmar, setConf] = useState('')
  const [showN, setShowN] = useState(false)
  const [showC, setShowC] = useState(false)
  const [status, setStatus] = useState<'idle'|'loading'|'ok'|'token-invalido'|'erro'>('idle')
  const [msg, setMsg] = useState('')

  const forca = novaSenha.length === 0 ? 0 : novaSenha.length < 6 ? 1
    : novaSenha.length < 10 ? 2 : /[A-Z]/.test(novaSenha) && /[0-9]/.test(novaSenha) ? 4 : 3
  const forcaCor = ['','#ef4444','#f59e0b','#22c55e','#16a34a']
  const forcaLabel = ['','Fraca','Média','Boa','Forte']

  useEffect(() => { if (!token) setStatus('token-invalido') }, [token])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (novaSenha !== confirmar) { setMsg('As senhas não conferem.'); return }
    if (novaSenha.length < 6)   { setMsg('A senha deve ter pelo menos 6 caracteres.'); return }
    setMsg(''); setStatus('loading')
    try {
      const res = await fetch('/api/auth/reset-password', {
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
      {/* DNA esquerda */}
      <svg style={{ position:'absolute',left:0,top:0,height:'100%',width:100,opacity:0.13,pointerEvents:'none' }}
        viewBox="0 0 100 800" preserveAspectRatio="xMidYMid slice">
        {Array.from({length:20},(_,i)=>{
          const y1=i*42,y2=y1+21,x1=i%2===0?18:82,x2=i%2===0?82:18
          return <g key={i}>
            <path d={`M${x1} ${y1} C${x1} ${y1+13},${x2} ${y2-13},${x2} ${y2}`} fill="none" stroke="#2d7a2d" strokeWidth="2" strokeLinecap="round"/>
            <circle cx={x1} cy={y1} r="3" fill="#2d7a2d" opacity="0.7"/>
            <circle cx={x2} cy={y2} r="3" fill="#2d7a2d" opacity="0.7"/>
          </g>
        })}
      </svg>
      {/* Hexágonos */}
      <svg style={{ position:'absolute',right:0,top:0,width:220,height:220,opacity:0.10,pointerEvents:'none' }} viewBox="0 0 220 220">
        {[[60,40],[120,40],[90,90],[150,90],[120,140]].map(([cx,cy],i)=>(
          <polygon key={i} points={`${cx},${cy-26} ${cx+22},${cy-13} ${cx+22},${cy+13} ${cx},${cy+26} ${cx-22},${cy+13} ${cx-22},${cy-13}`} fill="none" stroke="#b8960c" strokeWidth="1.1"/>
        ))}
      </svg>
      {/* Plantas */}
      <svg style={{ position:'absolute',left:0,bottom:0,width:180,height:200,opacity:0.25,pointerEvents:'none' }} viewBox="0 0 180 200">
        <path d="M44 200 Q38 170 30 140 Q18 112 6 90" fill="none" stroke="#3a7a3a" strokeWidth="2.8" strokeLinecap="round"/>
        <path d="M44 200 Q60 170 72 138 Q86 106 106 84" fill="none" stroke="#3a7a3a" strokeWidth="2.8" strokeLinecap="round"/>
        <path d="M6 90 Q-8 70 2 52 Q22 62 18 78" fill="#5a9c5a" opacity="0.85"/>
        <path d="M16 118 Q-2 103 4 82 Q24 88 22 106" fill="#4a8c4a" opacity="0.75"/>
        <path d="M106 84 Q128 60 144 68 Q136 88 112 90" fill="#5a9c5a" opacity="0.85"/>
        <circle cx="110" cy="168" r="20" fill="#b84010" opacity="0.36"/>
        <circle cx="130" cy="182" r="14" fill="#cc4a14" opacity="0.30"/>
      </svg>
      {/* Colher */}
      <svg style={{ position:'absolute',right:0,bottom:0,width:160,height:180,opacity:0.20,pointerEvents:'none' }} viewBox="0 0 160 180">
        <path d="M148 10 Q160 30 138 66 Q112 106 84 140 Q68 158 58 176" fill="none" stroke="#c49a2a" strokeWidth="8" strokeLinecap="round"/>
        <ellipse cx="140" cy="22" rx="19" ry="12" fill="#d4aa3a" opacity="0.75" transform="rotate(-35 140 22)"/>
        {Array.from({length:12},(_,i)=>(<circle key={i} cx={46+(i%4)*13} cy={162+Math.floor(i/4)*9} r="3.5" fill="#c49a2a" opacity="0.45"/>))}
      </svg>

      {/* CARD */}
      <div style={card}>
        {/* Só o logo — sem texto "Nutricare" */}
        <div style={{ textAlign:'center',marginBottom:22 }}>
          <Image src="/logo-nutricare.png" alt="NutriCare" width={120} height={120} style={{ objectFit:'contain' }} priority/>
        </div>

        {/* ── SUCESSO ── */}
        {status === 'ok' && (
          <div style={{ textAlign:'center',padding:'12px 0 8px' }}>
            <div style={{ fontSize:52,marginBottom:12 }}>✅</div>
            <h2 style={{ fontSize:18,fontWeight:700,color:'#16a34a',marginBottom:8 }}>Senha redefinida!</h2>
            <p style={{ fontSize:14,color:'#64748b',lineHeight:1.6,marginBottom:20 }}>
              Sua senha foi alterada com sucesso.<br/>Redirecionando para o login...
            </p>
            <Link href="/" style={{ display:'inline-block',padding:'12px 28px',background:'#1a4d1a',color:'#fff',borderRadius:12,textDecoration:'none',fontSize:14,fontWeight:700 }}>
              Ir para o Login
            </Link>
          </div>
        )}

        {/* ── TOKEN INVÁLIDO ── */}
        {status === 'token-invalido' && (
          <div style={{ textAlign:'center',padding:'12px 0 8px' }}>
            <div style={{ fontSize:48,marginBottom:12 }}>⚠️</div>
            <h2 style={{ fontSize:18,fontWeight:700,color:'#dc2626',marginBottom:8 }}>Link inválido ou expirado</h2>
            <p style={{ fontSize:14,color:'#64748b',lineHeight:1.6,marginBottom:20 }}>
              Este link de redefinição não é mais válido.<br/>Solicite um novo link na tela de login.
            </p>
            <Link href="/" style={{ display:'inline-block',padding:'12px 28px',background:'#1a4d1a',color:'#fff',borderRadius:12,textDecoration:'none',fontSize:14,fontWeight:700 }}>
              Voltar ao Login
            </Link>
          </div>
        )}

        {/* ── FORMULÁRIO ── */}
        {(status === 'idle' || status === 'loading' || status === 'erro') && !!token && (
          <>
            <div style={{ display:'flex',alignItems:'center',gap:9,marginBottom:14 }}>
              <span style={{ color:'#1a4d1a' }}><IconLock/></span>
              <h2 style={{ fontSize:17,fontWeight:700,color:'#1a4d1a',margin:0 }}>Criar nova senha</h2>
            </div>

            <form onSubmit={submit} style={{ display:'flex',flexDirection:'column',gap:13 }}>
              {/* Nova senha */}
              <div>
                <div style={{ position:'relative' }}>
                  <span style={ico}><IconLock/></span>
                  <input type={showN?'text':'password'} placeholder="Nova senha" value={novaSenha}
                    onChange={e=>setNova(e.target.value)} required minLength={6} style={{ ...inp,paddingRight:44 }}/>
                  <button type="button" onClick={()=>setShowN(p=>!p)} style={eyeSt}>
                    {showN ? <IconEyeOff/> : <IconEye/>}
                  </button>
                </div>
                {novaSenha.length > 0 && (
                  <div style={{ marginTop:7 }}>
                    <div style={{ display:'flex',gap:4,marginBottom:3 }}>
                      {[1,2,3,4].map(n=>(
                        <div key={n} style={{ flex:1,height:4,borderRadius:4,background:forca>=n?forcaCor[forca]:'#e5e7eb',transition:'background 0.3s' }}/>
                      ))}
                    </div>
                    <span style={{ fontSize:11,color:forcaCor[forca],fontWeight:600 }}>Senha {forcaLabel[forca]}</span>
                  </div>
                )}
              </div>

              {/* Confirmar */}
              <div style={{ position:'relative' }}>
                <span style={ico}><IconLock/></span>
                <input type={showC?'text':'password'} placeholder="Confirmar nova senha" value={confirmar}
                  onChange={e=>setConf(e.target.value)} required minLength={6}
                  style={{ ...inp,paddingRight:44,borderColor:confirmar&&confirmar!==novaSenha?'#fca5a5':undefined }}/>
                <button type="button" onClick={()=>setShowC(p=>!p)} style={eyeSt}>
                  {showC ? <IconEyeOff/> : <IconEye/>}
                </button>
                {confirmar && confirmar !== novaSenha && (
                  <span style={{ fontSize:11,color:'#ef4444',marginTop:4,display:'block' }}>As senhas não conferem</span>
                )}
              </div>

              {/* Requisitos */}
              <div style={{ background:'#f8fafc',borderRadius:10,padding:'10px 14px' }}>
                <ul style={{ margin:0,padding:'0 0 0 16px',fontSize:11.5,color:'#64748b',lineHeight:1.9 }}>
                  <li style={{ color:novaSenha.length>=6?'#16a34a':'#94a3b8' }}>✓ Mínimo 6 caracteres</li>
                  <li style={{ color:/[A-Z]/.test(novaSenha)?'#16a34a':'#94a3b8' }}>✓ Uma letra maiúscula</li>
                  <li style={{ color:/[0-9]/.test(novaSenha)?'#16a34a':'#94a3b8' }}>✓ Um número</li>
                </ul>
              </div>

              {msg && <div style={{ background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:10,padding:'10px 14px',fontSize:13,color:'#dc2626' }}>{msg}</div>}

              <button type="submit" disabled={status==='loading'} style={{ width:'100%',padding:'14px',background:'linear-gradient(135deg,#1a4d1a 0%,#1e5c1e 100%)',color:'#fff',border:'none',borderRadius:13,fontSize:14,fontWeight:700,cursor:status==='loading'?'not-allowed':'pointer',letterSpacing:1.2,boxShadow:'0 4px 16px rgba(26,77,26,0.26)',opacity:status==='loading'?0.8:1 }}>
                {status === 'loading' ? 'SALVANDO...' : 'REDEFINIR SENHA'}
              </button>
            </form>

            <div style={{ textAlign:'center',marginTop:16 }}>
              <Link href="/" style={{ fontSize:13,color:'#64748b',textDecoration:'underline',textUnderlineOffset:3 }}>
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
      <div style={{ minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f6f5ef' }}>
        <p style={{ color:'#64748b',fontFamily:'sans-serif' }}>Carregando...</p>
      </div>
    }>
      <ResetForm/>
    </Suspense>
  )
}

const bg: React.CSSProperties = { minHeight:'100vh',background:'linear-gradient(150deg,#f6f5ef 0%,#f0ede6 45%,#eae6de 100%)',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px',position:'relative',overflow:'hidden',fontFamily:"'Segoe UI',system-ui,-apple-system,sans-serif" }
const card: React.CSSProperties = { background:'#fff',borderRadius:26,padding:'32px 38px 28px',width:'100%',maxWidth:415,boxShadow:'0 8px 48px rgba(26,70,26,0.13),0 2px 8px rgba(0,0,0,0.05)',position:'relative',zIndex:1 }
const ico: React.CSSProperties = { position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:'#9ca3af',pointerEvents:'none',display:'flex',alignItems:'center' }
const inp: React.CSSProperties = { width:'100%',padding:'13px 13px 13px 42px',border:'1.5px solid #e5e7eb',borderRadius:12,fontSize:14,background:'#fafafa',color:'#0f172a',boxSizing:'border-box',outline:'none',fontFamily:'inherit' }
const eyeSt: React.CSSProperties = { position:'absolute',right:13,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#9ca3af',display:'flex',alignItems:'center',padding:4 }
