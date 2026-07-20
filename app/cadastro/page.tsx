'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
const AREAS = ['Nutrição Clínica','Nutrição Esportiva','Nutrição Funcional','Nutrição Oncológica','Nutrição Pediátrica','Nutrição Materno-Infantil','Nutrição Hospitalar','Nutrição Comportamental','Outro']

const I = {
  user:    ()=>(<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>),
  phone:   ()=>(<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>),
  email:   ()=>(<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>),
  lock:    ()=>(<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>),
  eye:     ()=>(<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>),
  eyeOff:  ()=>(<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>),
  id:      ()=>(<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 10h2M16 14h2M6 10h.01M10 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 14h.01"/></svg>),
  bld:     ()=>(<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>),
  pin:     ()=>(<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>),
  bag:     ()=>(<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>),
  shield:  ()=>(<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>),
  card:    ()=>(<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>),
  arrow:   ()=>(<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>),
}

export default function CadastroPage() {
  const [f, setF] = useState({ nome:'',telefone:'',email:'',senha:'',confirmar:'',crn:'',cnpj:'',estadoCrn:'',area:'',cpf:'' })
  const [showS, setShowS] = useState(false)
  const [showC, setShowC] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
    setF(p=>({...p,[k]:e.target.value}))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErro('')
    if (f.senha !== f.confirmar) { setErro('As senhas não conferem.'); return }
    if (f.senha.length < 6)      { setErro('Senha deve ter pelo menos 6 caracteres.'); return }
    if (!f.cpf.trim())           { setErro('CPF é obrigatório para verificar sua assinatura.'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ nome:f.nome,email:f.email,senha:f.senha,crn:f.crn,cnpj:f.cnpj,estadoCrn:f.estadoCrn,area:f.area,telefone:f.telefone,cpf:f.cpf }),
      })
      const data = await res.json()
      if (res.ok) { setSucesso(true); setTimeout(()=>router.push('/'),3000) }
      else { setErro(data.error || 'Erro ao criar conta. Tente novamente.') }
    } catch { setErro('Erro de conexão. Tente novamente.') }
    setLoading(false)
  }

  return (
    <div style={bg}>
      {/* ── DNA esquerda ── */}
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
      {/* ── Hexágonos ── */}
      <svg style={{ position:'absolute',right:0,top:0,width:240,height:240,opacity:0.11,pointerEvents:'none' }} viewBox="0 0 240 240">
        {[[60,40],[120,40],[90,90],[150,90],[120,140],[60,140],[30,90],[180,40],[210,90],[180,140]].map(([cx,cy],i)=>(
          <polygon key={i} points={`${cx},${cy-26} ${cx+22},${cy-13} ${cx+22},${cy+13} ${cx},${cy+26} ${cx-22},${cy+13} ${cx-22},${cy-13}`} fill="none" stroke="#b8960c" strokeWidth="1.1"/>
        ))}
        <line x1="30" y1="90" x2="210" y2="90" stroke="#b8960c" strokeWidth="0.7" strokeDasharray="5 4"/>
      </svg>
      {/* ── Silhueta ── */}
      <svg style={{ position:'absolute',right:32,top:20,width:68,height:128,opacity:0.09,pointerEvents:'none' }} viewBox="0 0 68 128">
        <circle cx="34" cy="14" r="10" fill="none" stroke="#2d7a2d" strokeWidth="1.4"/>
        <path d="M19 30 Q11 58 13 78 H21 L23 58 H45 L47 78 H55 Q57 58 49 30 Q41 24 34 24 Q27 24 19 30Z" fill="none" stroke="#2d7a2d" strokeWidth="1.4"/>
        <path d="M23 58 Q17 78 15 98" fill="none" stroke="#2d7a2d" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M45 58 Q51 78 53 98" fill="none" stroke="#2d7a2d" strokeWidth="1.4" strokeLinecap="round"/>
        <circle cx="34" cy="34" r="32" fill="none" stroke="#b8960c" strokeWidth="0.7" strokeDasharray="3 5" opacity="0.7"/>
      </svg>
      {/* ── Plantas ── */}
      <svg style={{ position:'absolute',left:0,bottom:0,width:200,height:220,opacity:0.28,pointerEvents:'none' }} viewBox="0 0 200 220">
        <path d="M50 220 Q44 188 36 155 Q22 118 8 92" fill="none" stroke="#3a7a3a" strokeWidth="2.8" strokeLinecap="round"/>
        <path d="M50 220 Q66 178 78 142 Q92 108 112 85" fill="none" stroke="#3a7a3a" strokeWidth="2.8" strokeLinecap="round"/>
        <path d="M8 92 Q-8 72 4 52 Q24 62 20 80" fill="#5a9c5a" opacity="0.85"/>
        <path d="M18 120 Q0 105 6 84 Q26 90 24 108" fill="#4a8c4a" opacity="0.75"/>
        <path d="M30 155 Q10 140 14 118 Q34 122 32 140" fill="#6aac6a" opacity="0.65"/>
        <path d="M112 85 Q132 62 148 70 Q140 90 116 92" fill="#5a9c5a" opacity="0.85"/>
        <path d="M90 110 Q114 95 124 108 Q112 126 94 122" fill="#4a8c4a" opacity="0.75"/>
        <circle cx="116" cy="172" r="22" fill="#b84010" opacity="0.38"/>
        <circle cx="136" cy="186" r="15" fill="#cc4a14" opacity="0.32"/>
        <path d="M150 165 Q170 145 182 156 Q173 172 156 170" fill="#4a8c4a" opacity="0.55"/>
      </svg>
      {/* ── Colher ── */}
      <svg style={{ position:'absolute',right:0,bottom:0,width:170,height:190,opacity:0.22,pointerEvents:'none' }} viewBox="0 0 170 190">
        <path d="M156 12 Q168 32 146 68 Q120 108 92 142 Q76 160 64 178" fill="none" stroke="#c49a2a" strokeWidth="8" strokeLinecap="round"/>
        <ellipse cx="148" cy="24" rx="20" ry="13" fill="#d4aa3a" opacity="0.75" transform="rotate(-35 148 24)"/>
        {Array.from({length:15},(_,i)=>(
          <circle key={i} cx={52+(i%5)*13} cy={165+Math.floor(i/5)*10} r="3.5" fill="#c49a2a" opacity="0.45"/>
        ))}
      </svg>
      {/* ── Linhas circuito ── */}
      <svg style={{ position:'absolute',bottom:0,left:'10%',width:'80%',height:80,opacity:0.13,pointerEvents:'none' }}
        viewBox="0 0 700 80" preserveAspectRatio="none">
        <line x1="0" y1="65" x2="180" y2="65" stroke="#b8960c" strokeWidth="1.2"/>
        <line x1="180" y1="65" x2="210" y2="40" stroke="#b8960c" strokeWidth="1.2"/>
        <line x1="210" y1="40" x2="350" y2="40" stroke="#b8960c" strokeWidth="1.2"/>
        <circle cx="180" cy="65" r="3.5" fill="#b8960c"/>
        <circle cx="210" cy="40" r="3.5" fill="#b8960c"/>
        <line x1="420" y1="70" x2="560" y2="70" stroke="#b8960c" strokeWidth="1.2"/>
        <line x1="560" y1="70" x2="595" y2="45" stroke="#b8960c" strokeWidth="1.2"/>
        <line x1="595" y1="45" x2="700" y2="45" stroke="#b8960c" strokeWidth="1.2"/>
        <circle cx="560" cy="70" r="3.5" fill="#b8960c"/>
        <circle cx="595" cy="45" r="3.5" fill="#b8960c"/>
      </svg>

      {/* ── LOGO acima do card — apenas imagem, sem texto ── */}
      <div style={{ position:'absolute',top:'2%',left:'50%',transform:'translateX(-50%)',textAlign:'center',zIndex:2 }}>
        <Image src="/logo-nutricare.png" alt="NutriCare" width={130} height={130} style={{ objectFit:'contain' }} priority/>
      </div>

      {/* ═══ CARD ═══ */}
      <div style={{ background:'#fff',borderRadius:26,padding:'22px 34px 26px',width:'100%',maxWidth:450,boxShadow:'0 8px 48px rgba(26,70,26,0.13),0 2px 8px rgba(0,0,0,0.05)',position:'relative',zIndex:1,marginTop:148 }}>
        {sucesso ? (
          <div style={{ textAlign:'center',padding:'28px 0' }}>
            <div style={{ fontSize:52,marginBottom:12 }}>✅</div>
            <h2 style={{ margin:0,color:'#1a4d1a',fontWeight:700,fontSize:20 }}>Conta criada com sucesso!</h2>
            <p style={{ color:'#64748b',marginTop:8,fontSize:14 }}>Redirecionando para o login...</p>
          </div>
        ) : (
          <>
            {/* Cabeçalho — SEM FOLHA, sem repetir "Nutricare" */}
            <div style={{ display:'flex',alignItems:'center',gap:13,marginBottom:16,paddingBottom:14,borderBottom:'1px solid #f1f5f9' }}>
              <div style={{ width:42,height:42,borderRadius:'50%',background:'#f0f7f0',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#1a4d1a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
                </svg>
              </div>
              <div>
                <h2 style={{ margin:0,fontSize:17,fontWeight:700,color:'#1a4d1a' }}>Criar sua conta</h2>
                <p style={{ margin:0,fontSize:12,color:'#94a3b8' }}>Preencha seus dados para se cadastrar</p>
              </div>
            </div>

            <form onSubmit={submit} style={{ display:'flex',flexDirection:'column',gap:9 }}>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:9 }}>
                <div style={{ position:'relative' }}><span style={ico}><I.user/></span><input placeholder="Nome completo" value={f.nome} onChange={set('nome')} required style={inp}/></div>
                <div style={{ position:'relative' }}><span style={ico}><I.phone/></span><input placeholder="Telefone / WhatsApp" value={f.telefone} onChange={set('telefone')} style={inp}/></div>
              </div>
              <div style={{ position:'relative' }}><span style={ico}><I.email/></span><input type="email" placeholder="E-mail" value={f.email} onChange={set('email')} required style={inp}/></div>
              <div style={{ position:'relative' }}><span style={ico}><I.card/></span><input placeholder="CPF (verificação de assinatura)" value={f.cpf} onChange={set('cpf')} required maxLength={14} style={inp}/></div>
              <div style={{ position:'relative' }}>
                <span style={ico}><I.lock/></span>
                <input type={showS?'text':'password'} placeholder="Senha" value={f.senha} onChange={set('senha')} required style={{ ...inp,paddingRight:42 }}/>
                <button type="button" onClick={()=>setShowS(p=>!p)} style={eye}>{showS?<I.eyeOff/>:<I.eye/>}</button>
              </div>
              <div style={{ position:'relative' }}>
                <span style={ico}><I.lock/></span>
                <input type={showC?'text':'password'} placeholder="Confirmar senha" value={f.confirmar} onChange={set('confirmar')} required style={{ ...inp,paddingRight:42 }}/>
                <button type="button" onClick={()=>setShowC(p=>!p)} style={eye}>{showC?<I.eyeOff/>:<I.eye/>}</button>
              </div>

              {/* Dados profissionais */}
              <div style={{ display:'flex',alignItems:'center',gap:10,margin:'4px 0 2px' }}>
                <span style={{ fontSize:12,fontWeight:700,color:'#1e293b',whiteSpace:'nowrap' }}>Dados profissionais</span>
                <div style={{ flex:1,height:1,background:'linear-gradient(90deg,#e2e8f0,#b8960c55)' }}/>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:9 }}>
                <div style={{ position:'relative' }}><span style={ico}><I.id/></span><input placeholder="CRN" value={f.crn} onChange={set('crn')} style={inp}/></div>
                <div style={{ position:'relative' }}><span style={ico}><I.bld/></span><input placeholder="CNPJ (opcional)" value={f.cnpj} onChange={set('cnpj')} style={inp}/></div>
              </div>
              <div style={{ position:'relative' }}>
                <span style={ico}><I.pin/></span>
                <select value={f.estadoCrn} onChange={set('estadoCrn')} style={{ ...inp,appearance:'none',color:f.estadoCrn?'#0f172a':'#9ca3af' }}>
                  <option value="" disabled hidden>Estado do CRN</option>
                  {ESTADOS.map(e=><option key={e} value={e}>{e}</option>)}
                </select>
                <span style={{ position:'absolute',right:13,top:'50%',transform:'translateY(-50%)',pointerEvents:'none',color:'#9ca3af',fontSize:10 }}>▼</span>
              </div>
              <div style={{ position:'relative' }}>
                <span style={ico}><I.bag/></span>
                <select value={f.area} onChange={set('area')} style={{ ...inp,appearance:'none',color:f.area?'#0f172a':'#9ca3af' }}>
                  <option value="" disabled hidden>Área de atuação</option>
                  {AREAS.map(a=><option key={a} value={a}>{a}</option>)}
                </select>
                <span style={{ position:'absolute',right:13,top:'50%',transform:'translateY(-50%)',pointerEvents:'none',color:'#9ca3af',fontSize:10 }}>▼</span>
              </div>

              <div style={{ display:'flex',alignItems:'flex-start',gap:7,padding:'2px 0' }}>
                <span style={{ color:'#9ca3af',marginTop:1,flexShrink:0 }}><I.shield/></span>
                <p style={{ margin:0,fontSize:11,color:'#94a3b8',lineHeight:1.5 }}>Seus dados estão protegidos e serão usados apenas para fins de identificação profissional.</p>
              </div>

              {erro && <div style={{ background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:10,padding:'10px 14px',fontSize:13,color:'#dc2626' }}>{erro}</div>}

              <button type="submit" disabled={loading} style={{ width:'100%',padding:'14px',background:'linear-gradient(135deg,#1a4d1a 0%,#1e5c1e 100%)',color:'#fff',border:'none',borderRadius:13,fontSize:14,fontWeight:700,cursor:'pointer',letterSpacing:1.4,boxShadow:'0 4px 16px rgba(26,77,26,0.26)',display:'flex',alignItems:'center',justifyContent:'center',gap:9,marginTop:4 }}>
                {loading ? 'CADASTRANDO...' : (<><span>CADASTRAR</span><I.arrow/></>)}
              </button>
            </form>

            <div style={{ textAlign:'center',marginTop:14,fontSize:13,color:'#64748b' }}>
              Já tem uma conta?{' '}
              <Link href="/" style={{ color:'#1a4d1a',fontWeight:700,textDecoration:'none' }}>Entrar</Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const bg: React.CSSProperties = { minHeight:'100vh',background:'linear-gradient(150deg,#f6f5ef 0%,#f0ede6 45%,#eae6de 100%)',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px',position:'relative',overflow:'hidden',fontFamily:"'Segoe UI',system-ui,-apple-system,sans-serif" }
const ico: React.CSSProperties = { position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',color:'#9ca3af',pointerEvents:'none',display:'flex',alignItems:'center' }
const inp: React.CSSProperties = { width:'100%',padding:'12px 12px 12px 38px',border:'1.5px solid #e5e7eb',borderRadius:11,fontSize:13,background:'#fafafa',color:'#0f172a',boxSizing:'border-box',outline:'none',fontFamily:'inherit' }
const eye: React.CSSProperties = { position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#9ca3af',display:'flex',alignItems:'center',padding:4 }
