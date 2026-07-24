'use client'

import { useState } from 'react'
import Link from 'next/link'

interface PacienteHoje {
  id: string
  horario: string
  nome: string
  idade: number
  consulta: string
  status: string
}

interface Aniversariante {
  id: string
  nome: string
  idade: number
  dia: string
}

interface PacienteAcompanhamento {
  id: string
  nome: string
  tempoLabel: string
  statusLabel: string
  statusColor: string
}

interface StatusPaciente {
  id: string
  nome: string
  formularioStatus: 'pendente' | 'respondido' | 'expirado'
  consultaStatus: 'pendente' | 'confirmado' | 'recusado' | 'nenhum'
}

interface Props {
  nomeNutri: string
  totalPacientes: number
  novosPacientesMes: number
  totalPlanos: number
  pacientesHoje: PacienteHoje[]
  totalAgendamentosHoje: number
  realizadasHoje: number
  pendentesHoje: number
  consultasPorTipo: Record<string, number>
  feminino: number
  masculino: number
  aniversariantes: Aniversariante[]
  consultasPorSemana: { label: string; count: number }[]
  pacientesAcompanhamento: PacienteAcompanhamento[]
  statusPacientes?: StatusPaciente[]
}

export default function DashboardLayout({
  nomeNutri,
  totalPacientes,
  novosPacientesMes,
  totalPlanos,
  pacientesHoje,
  totalAgendamentosHoje,
  realizadasHoje,
  pendentesHoje,
  consultasPorTipo,
  feminino,
  masculino,
  aniversariantes,
  consultasPorSemana,
  pacientesAcompanhamento,
  statusPacientes = [],
}: Props) {
  const [acompFilter, setAcompFilter] = useState('Todos')

  const hoje = new Date()
  const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
  const diaSemana = diasSemana[hoje.getDay()]
  const dataFormatada = `${diaSemana}, ${hoje.getDate()} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`

  const primeiroNome = nomeNutri.split(' ')[0]
  const hora = hoje.getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  const progressoHoje = totalAgendamentosHoje > 0
    ? Math.round((realizadasHoje / totalAgendamentosHoje) * 100)
    : 0

  // Consultas por tipo (sem Teleconsulta)
  const tiposLimpos: Record<string, number> = {}
  for (const [tipo, count] of Object.entries(consultasPorTipo)) {
    if (tipo.toLowerCase() !== 'teleconsulta') {
      const label = tipo.toLowerCase() === 'avaliação' ? '1ª Consulta' : tipo
      tiposLimpos[label] = (tiposLimpos[label] || 0) + count
    }
  }
  const totalConsultas = Object.values(tiposLimpos).reduce((a, b) => a + b, 0)
  const tipoColors: Record<string, string> = {
    '1ª Consulta': '#3b82f6',
    'Retorno': '#10b981',
    'Inicial': '#f59e0b',
    'Outro': '#94a3b8',
  }

  const totalGenero = feminino + masculino
  const percFeminino = totalGenero > 0 ? Math.round((feminino / totalGenero) * 100) : 0
  const percMasculino = 100 - percFeminino

  // Max for line chart
  const maxSemana = Math.max(...consultasPorSemana.map(c => c.count), 1)

  const filteredAcomp = pacientesAcompanhamento.filter(p => {
    if (acompFilter === 'Todos') return true
    if (acompFilter === 'Hoje') return p.statusLabel === 'Recente'
    if (acompFilter === 'Sem retorno') return p.statusLabel === 'Sem retorno'
    if (acompFilter === 'Inativos') return p.statusLabel === 'Inativo'
    return true
  })

  // SVG donut chart helper
  function DonutSegments({ data, colors, size }: { data: Record<string, number>; colors: Record<string, string>; size: number }) {
    const total = Object.values(data).reduce((a, b) => a + b, 0)
    if (total === 0) return null
    const r = size / 2 - 10
    const cx = size / 2
    const cy = size / 2
    const circumference = 2 * Math.PI * r
    let offset = 0
    const entries = Object.entries(data)
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {entries.map(([label, value]) => {
          const pct = value / total
          const dashLen = pct * circumference
          const dashOffset = -offset * circumference
          offset += pct
          return (
            <circle
              key={label}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={colors[label] || '#94a3b8'}
              strokeWidth={24}
              strokeDasharray={`${dashLen} ${circumference - dashLen}`}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          )
        })}
        <circle cx={cx} cy={cy} r={r - 18} fill="white" />
      </svg>
    )
  }

  // SVG pie chart helper
  function PieSegments({ fem, masc, size }: { fem: number; masc: number; size: number }) {
    const total = fem + masc
    if (total === 0) return null
    const r = size / 2 - 10
    const cx = size / 2
    const cy = size / 2
    const circumference = 2 * Math.PI * r
    const femLen = (fem / total) * circumference
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="#3b82f6" />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#f472b6"
          strokeWidth={r * 2}
          strokeDasharray={`${femLen} ${circumference - femLen}`}
          strokeDashoffset={0}
          transform={`rotate(-90 ${cx} ${cy})`}
          clipPath={`circle(${r}px at ${cx}px ${cy}px)`}
        />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#3b82f6" strokeWidth={r * 2}
          strokeDasharray={`${(masc / total) * circumference} ${circumference}`}
          strokeDashoffset={`${-femLen}`}
          transform={`rotate(-90 ${cx} ${cy})`}
          clipPath={`circle(${r}px at ${cx}px ${cy}px)`}
        />
      </svg>
    )
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, color: '#0f172a' }}>
            {saudacao}, {primeiroNome}!
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#64748b' }}>
            {dataFormatada}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#475569' }}>
            {primeiroNome.charAt(0)}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{nomeNutri}</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Nutricionista</div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 }}>
        <StatCard
          icon="👥"
          iconBg="#dbeafe"
          label="Atendimentos Hoje"
          value={totalAgendamentosHoje}
          sub={`+${realizadasHoje} realizados`}
          subColor="#16a34a"
        />
        <StatCard
          icon="📋"
          iconBg="#dcfce7"
          label="Novos Pacientes (Mês)"
          value={novosPacientesMes}
          sub={`Total: ${totalPacientes} pacientes`}
          subColor="#16a34a"
        />
        <StatCard
          icon="🍽️"
          iconBg="#fef3c7"
          label="Planos Alimentares"
          value={totalPlanos}
          sub="ativos"
          subColor="#16a34a"
        />
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, marginBottom: 24 }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Today's Patients Table */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                📋 Próximos 10 Pacientes de Hoje
              </h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={thStyle}>Horário</th>
                  <th style={thStyle}>Paciente</th>
                  <th style={thStyle}>Idade</th>
                  <th style={thStyle}>Consulta</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {pacientesHoje.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: '#94a3b8', fontSize: 14 }}>
                      Nenhum agendamento para hoje
                    </td>
                  </tr>
                )}
                {pacientesHoje.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={tdStyle}>{p.horario}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#475569' }}>
                          {p.nome.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        {p.nome}
                      </div>
                    </td>
                    <td style={tdStyle}>{p.idade} anos</td>
                    <td style={tdStyle}>{p.consulta}</td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                        background: p.status === 'Confirmado' || p.status === 'Realizado' || p.status === 'Concluído'
                          ? '#dcfce7' : '#fef3c7',
                        color: p.status === 'Confirmado' || p.status === 'Realizado' || p.status === 'Concluído'
                          ? '#16a34a' : '#f59e0b',
                      }}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Link href="/agenda" style={{ display: 'block', textAlign: 'center', marginTop: 12, fontSize: 13, color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>
              Ver agenda completa →
            </Link>
          </div>

          {/* Agenda de Hoje */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                📅 Agenda de Hoje
              </h3>
              <Link href="/agenda" style={{ fontSize: 13, color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>
                Ver calendário
              </Link>
            </div>
            {/* Progress bar */}
            <div style={{ background: '#e2e8f0', borderRadius: 8, height: 10, marginBottom: 8 }}>
              <div style={{ background: '#3b82f6', borderRadius: 8, height: '100%', width: `${progressoHoje}%`, transition: 'width 0.3s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 20 }}>
              <span>{realizadasHoje} de {totalAgendamentosHoje} consultas realizadas</span>
              <span>{progressoHoje}%</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#3b82f6' }}>{totalAgendamentosHoje}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Total de consultas</div>
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#16a34a' }}>{realizadasHoje}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Realizadas</div>
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#f59e0b' }}>{pendentesHoje}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Pendentes</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Status Formulário / Consulta */}
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              📋 Status — Formulário / Consulta
            </h3>
            {statusPacientes.length === 0 ? (
              <div style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: 16 }}>
                Nenhum formulário ou consulta pendente.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {statusPacientes.map((p) => (
                  <div key={p.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: '#f8fafc',
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                      {p.nome}
                    </span>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {p.formularioStatus !== ('pendente' as never) && p.formularioStatus !== ('expirado' as never) ? null : null}
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 6,
                        color: '#fff',
                        background:
                          p.formularioStatus === 'respondido' ? '#16a34a' :
                          p.formularioStatus === 'expirado' ? '#dc2626' :
                          '#f59e0b',
                      }}>
                        Formulário
                      </span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 6,
                        color: '#fff',
                        background:
                          p.consultaStatus === 'confirmado' ? '#16a34a' :
                          p.consultaStatus === 'recusado' ? '#dc2626' :
                          p.consultaStatus === 'pendente' ? '#f59e0b' :
                          '#cbd5e1',
                      }}>
                        Consulta
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, marginTop: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9', fontSize: 11, color: '#94a3b8' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} /> Pendente
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }} /> Respondido/Confirmado
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626' }} /> Recusado/Expirado
              </span>
            </div>
          </div>

          {/* Pacientes em Acompanhamento */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Pacientes em acompanhamento
              </h3>
              <Link href="/pacientes" style={{ fontSize: 13, color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>
                Ver todos →
              </Link>
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
              {['Todos', 'Hoje', 'Sem retorno', 'Inativos'].map(f => (
                <button
                  key={f}
                  onClick={() => setAcompFilter(f)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 16,
                    border: acompFilter === f ? '2px solid #3b82f6' : '1.5px solid #e2e8f0',
                    background: acompFilter === f ? '#eff6ff' : '#fff',
                    color: acompFilter === f ? '#3b82f6' : '#64748b',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredAcomp.length === 0 && (
                <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: 12 }}>Nenhum paciente</div>
              )}
              {filteredAcomp.slice(0, 5).map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#475569' }}>
                      {p.nome.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{p.nome}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>📅 {p.tempoLabel}</div>
                    </div>
                  </div>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 600,
                    background: p.statusColor + '20',
                    color: p.statusColor,
                  }}>
                    {p.statusLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
        {/* Consultas por Período */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Consultas por Período</h3>
            <span style={{ fontSize: 11, color: '#94a3b8', background: '#f1f5f9', padding: '3px 8px', borderRadius: 8 }}>Este Mês</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
            {consultasPorSemana.map((s, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#334155' }}>{s.count}</span>
                <div style={{
                  width: '100%',
                  height: `${Math.max((s.count / maxSemana) * 90, 4)}px`,
                  background: 'linear-gradient(180deg, #3b82f6, #60a5fa)',
                  borderRadius: '4px 4px 0 0',
                }} />
                <span style={{ fontSize: 8, color: '#94a3b8', textAlign: 'center', lineHeight: 1.1 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Distribuição por Gênero */}
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Distribuição por Gênero</h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <svg width={100} height={100} viewBox="0 0 100 100">
              {totalGenero > 0 && (
                <>
                  <circle cx={50} cy={50} r={40} fill="#3b82f6" />
                  {feminino > 0 && (
                    <path
                      d={(() => {
                        const angle = (feminino / totalGenero) * 360
                        const rad = (angle - 90) * (Math.PI / 180)
                        const x = 50 + 40 * Math.cos(rad)
                        const y = 50 + 40 * Math.sin(rad)
                        const large = angle > 180 ? 1 : 0
                        return `M50,50 L50,10 A40,40 0 ${large},1 ${x},${y} Z`
                      })()}
                      fill="#f472b6"
                    />
                  )}
                </>
              )}
            </svg>
            <div style={{ fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f472b6' }} />
                <span style={{ color: '#334155' }}>Feminino {percFeminino}%({feminino})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3b82f6' }} />
                <span style={{ color: '#334155' }}>Masculino {percMasculino}%({masculino})</span>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
            Total: {totalGenero} pacientes
          </div>
        </div>

        {/* Consultas por Tipo (sem Teleconsulta) */}
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Consultas por Tipo</h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div style={{ position: 'relative', width: 100, height: 100 }}>
              <DonutSegments data={tiposLimpos} colors={tipoColors} size={100} />
            </div>
            <div style={{ fontSize: 12 }}>
              {Object.entries(tiposLimpos).map(([label, count]) => {
                const pct = totalConsultas > 0 ? Math.round((count / totalConsultas) * 100) : 0
                return (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: tipoColors[label] || '#94a3b8' }} />
                    <span style={{ color: '#334155' }}>{label} {pct}%({count})</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
            Total: {totalConsultas} consultas
          </div>
        </div>

        {/* Aniversariantes do Mês */}
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>🎂 Aniversariantes do Mês</h3>
          {aniversariantes.length === 0 && (
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: 16 }}>
              Nenhum aniversariante este mês
            </div>
          )}
          {aniversariantes.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#475569' }}>
                  {a.nome.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{a.nome}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{a.idade} anos</div>
                </div>
              </div>
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{a.dia}</span>
            </div>
          ))}
          {aniversariantes.length > 0 && (
            <Link href="/pacientes" style={{ display: 'block', textAlign: 'center', marginTop: 10, fontSize: 12, color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>
              Ver todos os aniversariantes →
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, iconBg, label, value, sub, subColor }: {
  icon: string; iconBg: string; label: string; value: number; sub: string; subColor: string
}) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 14,
      padding: '20px 24px',
      boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
    }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 12,
        background: iconBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 22,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a' }}>{value}</div>
        <div style={{ fontSize: 12, color: subColor, fontWeight: 600 }}>↑ {sub}</div>
      </div>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 14,
  padding: 20,
  boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 10px',
  color: '#64748b',
  fontWeight: 600,
  fontSize: 12,
}

const tdStyle: React.CSSProperties = {
  padding: '10px',
  color: '#334155',
}
