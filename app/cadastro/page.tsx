'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

const ESTADOS_CRN = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
const AREAS = ['Nutrição Clínica','Nutrição Esportiva','Nutrição Funcional','Nutrição Oncológica','Nutrição Pediátrica','Nutrição Materno-Infantil','Nutrição Hospitalar','Nutrição Comportamental','Outro']

/* ─── SVG Icons ── */
const IconUser = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>)
const IconPhone = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>)
const IconEmail = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>)
const IconLock = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>)
const IconEye = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>)
const IconEyeOff = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>)
const IconID = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 10h2M16 14h2M6 10h.01M10 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 14h.01"/></svg>)
const IconBuilding = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7H3l2-4h14l2 4M5 21V10.85"/><path d="M19 21V10.85M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/></svg>)
const IconPin = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>)
const IconBriefcase = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2M12 12v4M8 12v4"/></svg>)
const IconShield = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>)
const IconCard = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>)
const IconUserPlus = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>)
const IconArrow = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>)

export default function CadastroPage() {
  const [form, setForm] = useState({ nome:'', telefone:'', email:'', senha:'', confirmar:'', crn:'', cnpj:'', estadoCrn:'', area:'', cpf:'' })
  const [showSenha, setShowSenha] = useState(false)
  const [showConfirmar, setShowConfirmar] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }))

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    if (form.senha !== form.confirmar) { setErro('As senhas não conferem.'); return }
    if (form.senha.length < 6) { setErro('A senha deve ter pelo menos 6 caracteres.'); return }
    if (!form.cpf.trim()) { setErro('CPF é obrigatório para verificar sua assinatura.'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome:form.nome, email:form.email, senha:form.senha, crn:form.crn, cnpj:form.cnpj, estadoCrn:form.estadoCrn, area:form.area, telefone:form.telefone, cpf:form.cpf }),
      })
      const data = await res.json()
      if (res.ok) { setSucesso(true); setTimeout(() => router.push('/'), 3000) }
      else { setErro(data.error || 'Erro ao criar conta. Tente novamente.') }
    } catch { setErro('Erro de conexão. Tente novamente.') }
    setLoading(false)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; }
        input::placeholder, select.ph { color: #aab0b8; }
        input:focus, select:focus { outline: none; border-color: #1a4d1a !important; background: #fff !important; }
        select option { color: #0f172a; }
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
        <svg style={{ position:'absolute', left:0, top:0, height:'100%', width:110, opacity:0.13, pointerEvents:'none' }}
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

        {/* ── Circuit / Hexagons top-right ── */}
        <svg style={{ position:'absolute', right:0, top:0, width:220, height:220, opacity:0.10, pointerEvents:'none' }} viewBox="0 0 220 220">
          {[[55,40],[110,40],[82,86],[137,86],[110,132],[55,132],[28,86]].map(([cx,cy],i)=>(
            <polygon key={i} points={`${cx},${cy-24} ${cx+20},${cy-12} ${cx+20},${cy+12} ${cx},${cy+24} ${cx-20},${cy+12} ${cx-20},${cy-12}`} fill="none" stroke="#b8960c" strokeWidth="1.2"/>
          ))}
        </svg>

        {/* ── Human silhouette top-right ── */}
        <svg style={{ position:'absolute', right:28, top:16, width:70, height:130, opacity:0.09, pointerEvents:'none' }} viewBox="0 0 70 130">
          <circle cx="35" cy="16" r="10" fill="none" stroke="#2d7a2d" strokeWidth="1.5"/>
          <path d="M20 32 Q12 60 14 80 H22 L24 60 H46 L48 80 H56 Q58 60 50 32 Q42 26 35 26 Q28 26 20 32Z" fill="none" stroke="#2d7a2d" strokeWidth="1.5"/>
          <path d="M24 60 Q18 80 16 100" fill="none" stroke="#2d7a2d" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M46 60 Q52 80 54 100" fill="none" stroke="#2d7a2d" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M16 100 L20 128" fill="none" stroke="#2d7a2d" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M54 100 L50 128" fill="none" stroke="#2d7a2d" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="35" cy="35" r="30" fill="none" stroke="#b8960c" strokeWidth="0.6" strokeDasharray="3 4" opacity="0.6"/>
        </svg>

        {/* ── Gold circuit lines bottom ── */}
        <svg style={{ position:'absolute', bottom:0, left:0, width:'100%', height:90, opacity:0.12, pointerEvents:'none' }} viewBox="0 0 800 90" preserveAspectRatio="xMidYMid meet">
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

        {/* ── Botanical bottom-left ── */}
        <svg style={{ position:'absolute', left:0, bottom:0, width:180, height:200, opacity:0.22, pointerEvents:'none' }} viewBox="0 0 180 200">
          <path d="M40 200 Q35 170 30 140 Q20 110 10 90" fill="none" stroke="#3a7a3a" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M40 200 Q55 165 65 135 Q78 105 95 88" fill="none" stroke="#3a7a3a" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M10 90 Q-5 72 5 55 Q22 65 18 82" fill="#4a8c4a" opacity="0.8"/>
          <path d="M20 115 Q2 100 8 82 Q24 88 22 105" fill="#4a8c4a" opacity="0.7"/>
          <path d="M25 140 Q8 128 12 110 Q28 116 26 132" fill="#5a9c5a" opacity="0.6"/>
          <path d="M95 88 Q112 68 125 75 Q118 92 100 94" fill="#4a8c4a" opacity="0.8"/>
          <path d="M78 108 Q98 95 108 105 Q98 120 82 118" fill="#4a8c4a" opacity="0.7"/>
          <circle cx="100" cy="160" r="18" fill="#c04a0a" opacity="0.4"/>
          <circle cx="118" cy="172" r="13" fill="#d45a0a" opacity="0.35"/>
          <circle cx="85" cy="175" r="10" fill="#c04a0a" opacity="0.3"/>
          <path d="M130 155 Q148 138 158 148 Q150 162 135 162" fill="#4a8c4a" opacity="0.5"/>
        </svg>

        {/* ── Wooden spoon bottom-right ── */}
        <svg style={{ position:'absolute', right:0, bottom:0, width:160, height:180, opacity:0.20, pointerEvents:'none' }} viewBox="0 0 160 180">
          <path d="M148 10 Q158 28 138 62 Q115 100 88 132 Q72 150 62 170" fill="none" stroke="#c49a2a" strokeWidth="7" strokeLinecap="round"/>
          <ellipse cx="140" cy="22" rx="18" ry="12" fill="#d4aa3a" opacity="0.7" transform="rotate(-35 140 22)"/>
          {[0,1,2,3,4,5,6,7,8,9,10,11].map(i=>(
            <circle key={i} cx={50+(i%4)*14} cy={158+Math.floor(i/4)*9} r="3.5" fill="#c49a2a" opacity="0.5"/>
          ))}
        </svg>

        {/* ─── LOGO acima do card (como no mockup) ─── */}
        <div style={{ position:'absolute', top:'3%', left:'50%', transform:'translateX(-50%)', textAlign:'center', zIndex:2 }}>
          <Image src="/logo-nutricare.png" alt="NutriCare" width={105} height={105} style={{ objectFit:'contain' }} priority/>
          <h1 style={{ fontFamily:"'Playfair Display', Georgia, serif", fontSize:34, fontWeight:800, color:'#1a4d1a', letterSpacing:'-0.5px', margin:'6px 0 2px' }}>
            Nutri<span style={{ color:'#b8960c' }}>care</span>
          </h1>
          <p style={{ fontSize:10, letterSpacing:3.5, color:'#9ca3af', fontWeight:600 }}>CIÊNCIA • NUTRIÇÃO • BEM-ESTAR</p>
        </div>

        {/* ─── CARD ─── */}
        <div style={{
          background:'#fff', borderRadius:28,
          padding:'28px 36px 28px', width:'100%', maxWidth:460,
          boxShadow:'0 8px 48px rgba(30,70,30,0.12), 0 2px 8px rgba(0,0,0,0.06)',
          position:'relative', zIndex:1, marginTop:120,
        }}>
          {sucesso ? (
            <div style={{ textAlign:'center', padding:'32px 0' }}>
              <div style={{ fontSize:52, marginBottom:14 }}>✅</div>
              <h2 style={{ margin:0, color:'#1a4d1a', fontWeight:700, fontSize:20 }}>Conta criada com sucesso!</h2>
              <p style={{ color:'#64748b', marginTop:8, fontSize:14 }}>Redirecionando para o login...</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:6, paddingBottom:14, borderBottom:'1px solid #f1f5f9' }}>
                <div style={{ width:44, height:44, borderRadius:'50%', background:'#f0f7f0', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a4d1a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
                  </svg>
                </div>
                <div>
                  <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:'#1a4d1a' }}>Criar sua conta</h2>
                  <p style={{ margin:0, fontSize:12, color:'#94a3b8' }}>Preencha seus dados para se cadastrar</p>
                </div>
              </div>

              {/* Gold leaf divider */}
              <div style={{ textAlign:'center', margin:'8px 0 14px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#b8960c" opacity="0.7">
                  <path d="M12 2C6.5 2 4 8 4 8s2 6 8 14c6-8 8-14 8-14S17.5 2 12 2z"/>
                </svg>
              </div>

              <form onSubmit={handleCadastro} style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {/* Nome + Telefone */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div style={{ position:'relative' }}>
                    <span style={ico}><IconUser/></span>
                    <input placeholder="Nome completo" value={form.nome} onChange={set('nome')} required className="nc-input" style={inp}/>
                  </div>
                  <div style={{ position:'relative' }}>
                    <span style={ico}><IconPhone/></span>
                    <input placeholder="Telefone / WhatsApp" value={form.telefone} onChange={set('telefone')} className="nc-input" style={inp}/>
                  </div>
                </div>

                {/* Email */}
                <div style={{ position:'relative' }}>
                  <span style={ico}><IconEmail/></span>
                  <input type="email" placeholder="E-mail" value={form.email} onChange={set('email')} required className="nc-input" style={inp}/>
                </div>

                {/* CPF */}
                <div style={{ position:'relative' }}>
                  <span style={ico}><IconCard/></span>
                  <input placeholder="CPF (verificação de assinatura)" value={form.cpf} onChange={set('cpf')} required maxLength={14} className="nc-input" style={inp}/>
                </div>

                {/* Senha */}
                <div style={{ position:'relative' }}>
                  <span style={ico}><IconLock/></span>
                  <input type={showSenha?'text':'password'} placeholder="Senha" value={form.senha} onChange={set('senha')} required className="nc-input" style={{ ...inp, paddingRight:42 }}/>
                  <button type="button" onClick={()=>setShowSenha(p=>!p)} style={eyeBtn}>{showSenha?<IconEyeOff/>:<IconEye/>}</button>
                </div>

                {/* Confirmar */}
                <div style={{ position:'relative' }}>
                  <span style={ico}><IconLock/></span>
                  <input type={showConfirmar?'text':'password'} placeholder="Confirmar senha" value={form.confirmar} onChange={set('confirmar')} required className="nc-input" style={{ ...inp, paddingRight:42 }}/>
                  <button type="button" onClick={()=>setShowConfirmar(p=>!p)} style={eyeBtn}>{showConfirmar?<IconEyeOff/>:<IconEye/>}</button>
                </div>

                {/* Dados profissionais */}
                <div style={{ display:'flex', alignItems:'center', gap:10, margin:'4px 0 2px' }}>
                  <span style={{ fontSize:13, fontWeight:700, color:'#1e293b', whiteSpace:'nowrap' }}>Dados profissionais</span>
                  <div style={{ flex:1, height:1, background:'linear-gradient(90deg, #e2e8f0, #b8960c55)' }}/>
                </div>

                {/* CRN + CNPJ */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div style={{ position:'relative' }}>
                    <span style={ico}><IconID/></span>
                    <input placeholder="CRN" value={form.crn} onChange={set('crn')} className="nc-input" style={inp}/>
                  </div>
                  <div style={{ position:'relative' }}>
                    <span style={ico}><IconBuilding/></span>
                    <input placeholder="CNPJ (opcional)" value={form.cnpj} onChange={set('cnpj')} className="nc-input" style={inp}/>
                  </div>
                </div>

                {/* Estado CRN */}
                <div style={{ position:'relative' }}>
                  <span style={ico}><IconPin/></span>
                  <select value={form.estadoCrn} onChange={set('estadoCrn')} className="nc-input"
                    style={{ ...inp, appearance:'none', color:form.estadoCrn?'#0f172a':'#aab0b8' }}>
                    <option value="" disabled hidden>Estado do CRN</option>
                    {ESTADOS_CRN.map(e=><option key={e} value={e}>{e}</option>)}
                  </select>
                  <span style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color:'#9ca3af', fontSize:10 }}>▼</span>
                </div>

                {/* Área */}
                <div style={{ position:'relative' }}>
                  <span style={ico}><IconBriefcase/></span>
                  <select value={form.area} onChange={set('area')} className="nc-input"
                    style={{ ...inp, appearance:'none', color:form.area?'#0f172a':'#aab0b8' }}>
                    <option value="" disabled hidden>Área de atuação</option>
                    {AREAS.map(a=><option key={a} value={a}>{a}</option>)}
                  </select>
                  <span style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color:'#9ca3af', fontSize:10 }}>▼</span>
                </div>

                {/* Privacy note */}
                <div style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'2px 0' }}>
                  <span style={{ color:'#9ca3af', marginTop:1, flexShrink:0 }}><IconShield/></span>
                  <p style={{ margin:0, fontSize:11.5, color:'#94a3b8', lineHeight:1.5 }}>
                    Seus dados estão protegidos e serão usados apenas para fins de identificação profissional.
                  </p>
                </div>

                {erro && (
                  <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#dc2626' }}>
                    {erro}
                  </div>
                )}

                <button type="submit" disabled={loading} style={{
                  width:'100%', padding:'15px',
                  background:'linear-gradient(135deg, #1a4d1a 0%, #1e5c1e 100%)',
                  color:'#fff', border:'none', borderRadius:14, fontSize:14,
                  fontWeight:700, cursor:'pointer', letterSpacing:1.5,
                  boxShadow:'0 4px 18px rgba(26,77,26,0.28)',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:10,
                  marginTop:4,
                }}>
                  {loading ? 'CADASTRANDO...' : (<><span>CADASTRAR</span><IconArrow/></>)}
                </button>
              </form>

              <div style={{ textAlign:'center', marginTop:16, fontSize:13, color:'#64748b' }}>
                Já tem uma conta?{' '}
                <Link href="/" style={{ color:'#1a4d1a', fontWeight:700, textDecoration:'none' }}>Entrar</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

const ico: React.CSSProperties = { position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'#9ca3af', pointerEvents:'none', display:'flex', alignItems:'center' }
const inp: React.CSSProperties = { width:'100%', padding:'13px 13px 13px 40px', border:'1.5px solid #e5e7eb', borderRadius:12, fontSize:13, background:'#fafafa', color:'#0f172a', boxSizing:'border-box' }
const eyeBtn: React.CSSProperties = { position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9ca3af', display:'flex', alignItems:'center', padding:4 }
