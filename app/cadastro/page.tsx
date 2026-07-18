'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

const ESTADOS_CRN = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
const AREAS = ['Nutrição Clínica','Nutrição Esportiva','Nutrição Funcional','Nutrição Oncológica','Nutrição Pediátrica','Nutrição Materno-Infantil','Nutrição Hospitalar','Nutrição Comportamental','Outro']

export default function CadastroPage() {
  const [form, setForm] = useState({
    nome: '', telefone: '', email: '', senha: '', confirmar: '',
    crn: '', cnpj: '', estadoCrn: '', area: '', cpf: '',
  })
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
    if (!form.cpf.trim()) { setErro('CPF é obrigatório para verificar sua compra.'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome,
          email: form.email,
          senha: form.senha,
          crn: form.crn,
          cnpj: form.cnpj,
          estadoCrn: form.estadoCrn,
          area: form.area,
          telefone: form.telefone,
          cpf: form.cpf,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSucesso(true)
        setTimeout(() => router.push('/'), 3000)
      } else {
        setErro(data.error || 'Erro ao criar conta. Tente novamente.')
      }
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #f0f4f0 0%, #eef2ea 30%, #f5f3ec 65%, #ede9df 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Segoe UI', Arial, sans-serif",
    }}>
      {/* DNA decoration */}
      <svg style={{ position: 'absolute', left: 0, top: '5%', opacity: 0.07, pointerEvents: 'none' }} width="160" height="500" viewBox="0 0 160 500">
        {[0,40,80,120,160,200,240,280,320,360,400,440].map((y, i) => (
          <g key={i}>
            <ellipse cx={i%2===0?40:120} cy={y+20} rx="28" ry="9" fill="none" stroke="#1a5c1a" strokeWidth="2"/>
            <line x1={i%2===0?40:120} y1={y+20} x2={i%2===0?120:40} y2={y+60} stroke="#1a5c1a" strokeWidth="1.5" strokeDasharray="4 3"/>
          </g>
        ))}
      </svg>
      {/* Plants bottom-left */}
      <svg style={{ position: 'absolute', left: 0, bottom: 0, opacity: 0.11, pointerEvents: 'none' }} width="200" height="180" viewBox="0 0 200 180">
        <ellipse cx="60" cy="165" rx="48" ry="18" fill="#2d6a2d" opacity="0.4"/>
        <path d="M60 148 Q32 100 12 60" fill="none" stroke="#2d6a2d" strokeWidth="3"/>
        <path d="M12 60 Q2 40 22 30 Q42 40 32 68" fill="#3a8a3a" opacity="0.7"/>
        <path d="M60 148 Q82 108 102 78" fill="none" stroke="#2d6a2d" strokeWidth="3"/>
        <path d="M102 78 Q117 53 132 63 Q127 88 97 93" fill="#3a8a3a" opacity="0.7"/>
        <circle cx="112" cy="148" r="23" fill="#c8440a" opacity="0.5"/>
        <circle cx="130" cy="158" r="16" fill="#d44a0a" opacity="0.4"/>
      </svg>
      {/* Spoon bottom-right */}
      <svg style={{ position: 'absolute', right: 0, bottom: 0, opacity: 0.09, pointerEvents: 'none' }} width="180" height="160" viewBox="0 0 180 160">
        <path d="M165 15 Q175 35 148 72 Q118 112 88 140" fill="none" stroke="#b8960c" strokeWidth="6" strokeLinecap="round"/>
        <ellipse cx="156" cy="25" rx="17" ry="12" fill="#d4a80c" opacity="0.7" transform="rotate(-30 156 25)"/>
        {[0,1,2,3,4,5,6,7,8].map(i => (
          <circle key={i} cx={74 + (i%4)*13} cy={148 + Math.floor(i/4)*10} r="4" fill="#d4a80c" opacity="0.5"/>
        ))}
      </svg>
      {/* Hexagon top-right */}
      <svg style={{ position: 'absolute', right: '5%', top: '3%', opacity: 0.06, pointerEvents: 'none' }} width="180" height="180" viewBox="0 0 180 180">
        {[[90,36],[54,62],[54,112],[90,138],[126,112],[126,62]].map(([x,y],i,arr) => (
          <line key={i} x1={x} y1={y} x2={arr[(i+1)%6][0]} y2={arr[(i+1)%6][1]} stroke="#b8960c" strokeWidth="1.8"/>
        ))}
        {[[90,36],[54,62],[54,112],[90,138],[126,112],[126,62]].map(([x,y],i) => (
          <circle key={i} cx={x} cy={y} r="5" fill="#b8960c" opacity="0.6"/>
        ))}
      </svg>

      {/* Card */}
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(16px)',
        borderRadius: 28,
        padding: '36px 38px 32px',
        width: '100%',
        maxWidth: 460,
        boxShadow: '0 4px 40px rgba(30,80,30,0.10), 0 1px 3px rgba(0,0,0,0.06)',
        position: 'relative',
        border: '1px solid rgba(255,255,255,0.8)',
      }}>
        {sucesso ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 50, marginBottom: 12 }}>✅</div>
            <h2 style={{ margin: 0, color: '#1a4d1a', fontWeight: 700 }}>Conta criada com sucesso!</h2>
            <p style={{ color: '#64748b', marginTop: 8 }}>Redirecionando para o login...</p>
          </div>
        ) : (
          <>
            {/* Logo + title */}
            <div style={{ textAlign: 'center', marginBottom: 6 }}>
              <Image src="/logo-nutricare.png" alt="NutriCare" width={80} height={80} style={{ objectFit: 'contain' }} priority />
            </div>
            <div style={{ textAlign: 'center', marginBottom: 22 }}>
              <h1 style={{
                margin: 0, fontSize: 30, fontWeight: 800,
                background: 'linear-gradient(135deg, #1a4d1a 0%, #b8960c 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>Nutricare</h1>
              <p style={{ margin: '4px 0 0', fontSize: 10, letterSpacing: 2.5, color: '#bbb', fontWeight: 500 }}>
                CIÊNCIA • NUTRIÇÃO • BEM-ESTAR
              </p>
            </div>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <span style={{ fontSize: 22, opacity: 0.55 }}>👤</span>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1a4d1a' }}>Criar sua conta</h2>
                <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Preencha seus dados para se cadastrar</p>
              </div>
            </div>

            <form onSubmit={handleCadastro} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Nome + Telefone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ position: 'relative' }}>
                  <span style={iconStyle}>👤</span>
                  <input placeholder="Nome completo" value={form.nome} onChange={set('nome')} required style={inputStyle}/>
                </div>
                <div style={{ position: 'relative' }}>
                  <span style={iconStyle}>📱</span>
                  <input placeholder="Telefone / WhatsApp" value={form.telefone} onChange={set('telefone')} style={inputStyle}/>
                </div>
              </div>

              {/* Email */}
              <div style={{ position: 'relative' }}>
                <span style={iconStyle}>✉️</span>
                <input type="email" placeholder="E-mail" value={form.email} onChange={set('email')} required style={inputStyle}/>
              </div>

              {/* CPF */}
              <div style={{ position: 'relative' }}>
                <span style={iconStyle}>🪪</span>
                <input
                  placeholder="CPF (usado para verificar sua assinatura)"
                  value={form.cpf}
                  onChange={set('cpf')}
                  required
                  maxLength={14}
                  style={inputStyle}
                />
              </div>

              {/* Senha */}
              <div style={{ position: 'relative' }}>
                <span style={iconStyle}>🔒</span>
                <input
                  type={showSenha ? 'text' : 'password'}
                  placeholder="Senha"
                  value={form.senha}
                  onChange={set('senha')}
                  required
                  style={{ ...inputStyle, paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowSenha(p => !p)} style={eyeBtn}>{showSenha ? '🙈' : '👁️'}</button>
              </div>

              {/* Confirmar senha */}
              <div style={{ position: 'relative' }}>
                <span style={iconStyle}>🔒</span>
                <input
                  type={showConfirmar ? 'text' : 'password'}
                  placeholder="Confirmar senha"
                  value={form.confirmar}
                  onChange={set('confirmar')}
                  required
                  style={{ ...inputStyle, paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowConfirmar(p => !p)} style={eyeBtn}>{showConfirmar ? '🙈' : '👁️'}</button>
              </div>

              {/* Dados profissionais */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, #e2e8f0, #b8960c44)' }}/>
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, letterSpacing: 0.5 }}>Dados profissionais</span>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, #b8960c44, #e2e8f0)' }}/>
              </div>

              {/* CRN + CNPJ */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ position: 'relative' }}>
                  <span style={iconStyle}>📋</span>
                  <input placeholder="CRN" value={form.crn} onChange={set('crn')} style={inputStyle}/>
                </div>
                <div style={{ position: 'relative' }}>
                  <span style={iconStyle}>🏢</span>
                  <input placeholder="CNPJ (opcional)" value={form.cnpj} onChange={set('cnpj')} style={inputStyle}/>
                </div>
              </div>

              {/* Estado CRN */}
              <div style={{ position: 'relative' }}>
                <span style={iconStyle}>📍</span>
                <select value={form.estadoCrn} onChange={set('estadoCrn')} style={{ ...inputStyle, appearance: 'none', color: form.estadoCrn ? '#0f172a' : '#9ca3af' }}>
                  <option value="">Estado do CRN</option>
                  {ESTADOS_CRN.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.4, fontSize: 12 }}>▼</span>
              </div>

              {/* Área de atuação */}
              <div style={{ position: 'relative' }}>
                <span style={iconStyle}>💼</span>
                <select value={form.area} onChange={set('area')} style={{ ...inputStyle, appearance: 'none', color: form.area ? '#0f172a' : '#9ca3af' }}>
                  <option value="">Área de atuação</option>
                  {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.4, fontSize: 12 }}>▼</span>
              </div>

              {/* Aviso proteção */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0' }}>
                <span style={{ fontSize: 13, opacity: 0.4, marginTop: 1 }}>🛡️</span>
                <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>
                  Seus dados estão protegidos e serão usados apenas para fins de identificação profissional.
                </p>
              </div>

              {erro && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#dc2626' }}>
                  {erro}
                </div>
              )}

              <button type="submit" disabled={loading} style={btnPrimary}>
                {loading ? 'CADASTRANDO...' : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>CADASTRAR <span>→</span></span>}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#64748b' }}>
              Já tem uma conta?{' '}
              <Link href="/" style={{ color: '#1a4d1a', fontWeight: 700, textDecoration: 'none' }}>Entrar</Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const iconStyle: React.CSSProperties = {
  position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
  fontSize: 14, pointerEvents: 'none', opacity: 0.35,
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 12px 12px 40px',
  border: '1.5px solid #e5e7eb', borderRadius: 12, fontSize: 13,
  outline: 'none', background: '#fafafa', boxSizing: 'border-box', color: '#0f172a',
}
const btnPrimary: React.CSSProperties = {
  width: '100%', padding: '14px',
  background: 'linear-gradient(135deg, #1a4d1a 0%, #246324 100%)',
  color: '#fff', border: 'none', borderRadius: 12, fontSize: 14,
  fontWeight: 700, cursor: 'pointer', letterSpacing: 1.2,
  boxShadow: '0 4px 16px rgba(26,77,26,0.25)',
}
const eyeBtn: React.CSSProperties = {
  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
  background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, opacity: 0.45, padding: 4,
}
