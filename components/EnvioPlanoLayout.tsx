'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type EnvioPlanoProps = {
  pacienteId: string
  nomePaciente: string
  sexoPaciente: 'Feminino' | 'Masculino'
  dataNascimento: string
  pesoKg: number
  alturaCm: number
  idade: number
  massaMuscular: number
  massaAdiposa: number
  percGordura: number
}

interface MealFood {
  id: string
  name: string
  qty: number
  unit: string
}

interface EnvioMeal {
  id: string
  name: string
  time: string
  foods: MealFood[]
  subs: Record<string, MealFood[]>
}

interface Protocol {
  id: string
  name: string
  content: string
}

// ==================== PRINTABLE PDF LAYOUT ====================
function PrintableLayout({
  type,
  nomePaciente,
  dataNascimento,
  sexoPaciente,
  pesoKg,
  alturaCm,
  massaMuscular,
  massaAdiposa,
  percGordura,
  meals,
  protocol,
}: {
  type: 'plano' | 'orientacoes'
  nomePaciente: string
  dataNascimento: string
  sexoPaciente: string
  pesoKg: number
  alturaCm: number
  massaMuscular: number
  massaAdiposa: number
  percGordura: number
  meals: EnvioMeal[]
  protocol?: Protocol
}) {
  return (
    <div
      id={`printable-${type}`}
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '15mm 18mm',
        background: '#fff',
        color: '#1a1a1a',
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      {/* Watermark */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: 0.05,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/nutri-coracao.png" alt="" style={{ width: '400px', height: 'auto' }} />
      </div>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '2px solid #0f172a',
          paddingBottom: 12,
          marginBottom: 16,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-nutricare.png" alt="NutriCare" style={{ width: 50, height: 50, objectFit: 'contain' }} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{nomePaciente}</div>
            <div style={{ fontSize: 11, color: '#555' }}>
              {dataNascimento && `Nascimento: ${dataNascimento.split('-').reverse().join('/')}`}
              {' | '}Peso: {pesoKg} kg | Altura: {alturaCm} cm | Sexo: {sexoPaciente}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 11, color: '#555' }}>
          <div>Massa muscular: {massaMuscular.toFixed(1)} kg</div>
          <div>Massa adiposa: {massaAdiposa.toFixed(1)} kg</div>
          <div>% de gordura: {percGordura.toFixed(1)}%</div>
        </div>
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', fontSize: 22, fontWeight: 700, marginBottom: 18, position: 'relative', zIndex: 1 }}>
        {type === 'plano' ? 'Plano Alimentar' : 'Orientações'}
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {type === 'plano' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {meals.map((meal, idx) => (
              <div
                key={meal.id}
                style={{
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  padding: 10,
                  minHeight: 100,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, borderBottom: '1px solid #e5e7eb', paddingBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{meal.name || `Refeição ${idx + 1}`}</span>
                  <span style={{ fontSize: 11, color: '#666' }}>{meal.time}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 10, color: '#16a34a', marginBottom: 4, textTransform: 'uppercase' }}>Principais</div>
                    {meal.foods.length > 0 ? meal.foods.map(f => (
                      <div key={f.id} style={{ marginBottom: 2 }}>
                        {f.name} — {f.qty}{f.unit}
                      </div>
                    )) : <div style={{ color: '#999', fontStyle: 'italic' }}>—</div>}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 10, color: '#2563eb', marginBottom: 4, textTransform: 'uppercase' }}>Substituições</div>
                    {Object.values(meal.subs).flat().length > 0 ? (
                      Object.entries(meal.subs).map(([, subs]) =>
                        subs.map(s => (
                          <div key={s.id} style={{ marginBottom: 2 }}>
                            {s.name} — {s.qty}{s.unit}
                          </div>
                        ))
                      )
                    ) : <div style={{ color: '#999', fontStyle: 'italic' }}>—</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Orientações layout */
          <div style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 10 }}>
              {protocol?.name || 'Protocolo'}
            </div>
            <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {protocol?.content || ''}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          position: 'absolute',
          bottom: '15mm',
          left: '18mm',
          right: '18mm',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          borderTop: '1px solid #e5e7eb',
          paddingTop: 10,
        }}
      >
        <div style={{ fontFamily: "'Georgia', serif", fontStyle: 'italic', color: '#333' }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>____________________</div>
          <div style={{ fontSize: 11 }}>Nutricionista</div>
          <div style={{ fontSize: 10, color: '#666' }}>CRN:</div>
        </div>
        <div style={{ opacity: 0.3 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-nutricare.png" alt="" style={{ width: 60, height: 'auto' }} />
        </div>
      </div>
    </div>
  )
}

// ==================== MAIN COMPONENT ====================
export default function EnvioPlanoLayout({
  pacienteId,
  nomePaciente,
  sexoPaciente,
  dataNascimento,
  pesoKg,
  alturaCm,
  idade,
  massaMuscular,
  massaAdiposa,
  percGordura,
}: EnvioPlanoProps) {
  void idade

  const [meals, setMeals] = useState<EnvioMeal[]>([])
  const [protocols, setProtocols] = useState<Protocol[]>([])
  const [protocolSearch, setProtocolSearch] = useState('')
  const [editingProtocol, setEditingProtocol] = useState<Protocol | null>(null)
  const [newProtocolName, setNewProtocolName] = useState('')
  const [newProtocolContent, setNewProtocolContent] = useState('')
  const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({})
  const [message, setMessage] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [pdfType, setPdfType] = useState<'plano' | 'orientacoes'>('plano')
  const [selectedProtocolId, setSelectedProtocolId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load meals from localStorage (synced from PlanoAlimentarLayout)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(`plano_meals_${pacienteId}`)
      if (raw) {
        setMeals(JSON.parse(raw))
      }
    } catch {
      // ignore
    }
  }, [pacienteId])

  // Load protocols from localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(`protocols_${pacienteId}`)
      if (raw) setProtocols(JSON.parse(raw))
    } catch {
      // ignore
    }
  }, [pacienteId])

  // Save protocols when changed
  const saveProtocols = useCallback((p: Protocol[]) => {
    setProtocols(p)
    window.localStorage.setItem(`protocols_${pacienteId}`, JSON.stringify(p))
  }, [pacienteId])

  const toggleMealExpand = (id: string) => {
    setExpandedMeals(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Shopping list: aggregate all foods + subs for 30 days
  const shoppingList = (() => {
    const map: Record<string, { qty: number; unit: string }> = {}
    for (const meal of meals) {
      for (const f of meal.foods) {
        if (!f.name) continue
        const key = `${f.name}|${f.unit}`
        if (!map[key]) map[key] = { qty: 0, unit: f.unit }
        map[key].qty += f.qty * 30
      }
      for (const subs of Object.values(meal.subs)) {
        for (const s of subs) {
          if (!s.name) continue
          const key = `${s.name}|${s.unit}`
          if (!map[key]) map[key] = { qty: 0, unit: s.unit }
          map[key].qty += s.qty * 30
        }
      }
    }
    return Object.entries(map).map(([key, val]) => ({
      name: key.split('|')[0],
      qty: Math.round(val.qty),
      unit: val.unit,
    }))
  })()

  const filteredProtocols = protocols.filter(p =>
    p.name.toLowerCase().includes(protocolSearch.toLowerCase())
  )

  const addProtocol = () => {
    if (!newProtocolName.trim()) return
    const p: Protocol = {
      id: Date.now().toString(),
      name: newProtocolName.trim(),
      content: newProtocolContent.trim(),
    }
    saveProtocols([...protocols, p])
    setNewProtocolName('')
    setNewProtocolContent('')
  }

  const deleteProtocol = (id: string) => {
    if (!window.confirm('Excluir protocolo?')) return
    saveProtocols(protocols.filter(p => p.id !== id))
  }

  const updateProtocol = () => {
    if (!editingProtocol) return
    saveProtocols(protocols.map(p => p.id === editingProtocol.id ? editingProtocol : p))
    setEditingProtocol(null)
  }

  const handlePrint = (type: 'plano' | 'orientacoes', protocolId?: string) => {
    setPdfType(type)
    if (protocolId) setSelectedProtocolId(protocolId)
    setTimeout(() => {
      const el = document.getElementById(`printable-${type}`)
      if (!el) return
      const w = window.open('', '_blank')
      if (!w) return
      w.document.write(`
        <html><head><title>${type === 'plano' ? 'Plano Alimentar' : 'Orientações'}</title>
        <style>
          @page { size: A4; margin: 0; }
          body { margin: 0; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style></head><body>${el.outerHTML}</body></html>
      `)
      w.document.close()
      w.focus()
      w.print()
    }, 200)
  }

  const handleAddAttachment = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)])
    }
  }

  const handleSendEmail = () => {
    const patientEmail = prompt('Email do paciente:')
    if (!patientEmail) return
    alert(`Plano enviado para ${patientEmail} com sucesso! (simulação)`)
  }

  const selectedProtocol = protocols.find(p => p.id === selectedProtocolId)

  return (
    <div>
      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* LEFT COLUMN */}
        <div>
          {/* Patient header card */}
          <div style={patientHeaderStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{nomePaciente}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                  {dataNascimento && `${dataNascimento.split('-').reverse().join('/')}`}
                  {' | '}{sexoPaciente}
                  {' | '}{pesoKg} kg | {alturaCm} cm
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, color: '#64748b' }}>
                <div>Massa muscular: <b>{massaMuscular.toFixed(1)} kg</b></div>
                <div>Massa adiposa: <b>{massaAdiposa.toFixed(1)} kg</b></div>
                <div>% gordura: <b>{percGordura.toFixed(1)}%</b></div>
              </div>
            </div>
          </div>

          {/* Meals */}
          <div style={sectionCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Plano alimentar diário</h3>
              <button
                onClick={() => handlePrint('plano')}
                style={smallBtnStyle}
              >
                🖨️ Imprimir Plano
              </button>
            </div>

            {meals.length === 0 ? (
              <p style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 13 }}>
                Nenhuma refeição cadastrada. Monte o plano na aba &quot;Plano Alimentar&quot;.
              </p>
            ) : (
              meals.map((meal, idx) => (
                <div key={meal.id} style={mealCardStyle}>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => toggleMealExpand(meal.id)}
                  >
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                        {idx + 1}. {meal.name}
                      </span>
                      <span style={{ marginLeft: 12, fontSize: 12, color: '#64748b' }}>{meal.time}</span>
                    </div>
                    <span style={{ fontSize: 18, color: '#94a3b8' }}>{expandedMeals[meal.id] ? '▲' : '▼'}</span>
                  </div>

                  {expandedMeals[meal.id] && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 11, color: '#16a34a', marginBottom: 6, textTransform: 'uppercase' }}>
                            Alimentos Principais
                          </div>
                          {meal.foods.filter(f => f.name).length > 0 ? (
                            meal.foods.filter(f => f.name).map(f => (
                              <div key={f.id} style={{ fontSize: 12, marginBottom: 3, color: '#334155' }}>
                                • {f.name} — {f.qty} {f.unit}
                              </div>
                            ))
                          ) : (
                            <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Nenhum alimento</div>
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 11, color: '#2563eb', marginBottom: 6, textTransform: 'uppercase' }}>
                            Substituições
                          </div>
                          {Object.values(meal.subs).flat().filter(s => s.name).length > 0 ? (
                            Object.entries(meal.subs).map(([, subs]) =>
                              subs.filter(s => s.name).map(s => (
                                <div key={s.id} style={{ fontSize: 12, marginBottom: 3, color: '#334155' }}>
                                  • {s.name} — {s.qty} {s.unit}
                                </div>
                              ))
                            )
                          ) : (
                            <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Nenhuma substituição</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Shopping List */}
          <div style={sectionCardStyle}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              🛒 Lista de compras (1 mês)
            </h3>
            {shoppingList.length === 0 ? (
              <p style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 13 }}>
                Adicione alimentos no plano alimentar para gerar a lista.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {shoppingList.map((item, i) => (
                  <div key={i} style={{ fontSize: 12, padding: '4px 8px', background: '#f8fafc', borderRadius: 6, color: '#334155' }}>
                    • {item.name} — <b>{item.qty} {item.unit}</b>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Protocols */}
          <div style={sectionCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Protocolos / Orientações</h3>
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder="Buscar protocolo pelo nome..."
              value={protocolSearch}
              onChange={e => setProtocolSearch(e.target.value)}
              style={inputStyle}
            />

            {/* Protocol list */}
            {filteredProtocols.map(p => (
              <div key={p.id} style={{ ...mealCardStyle, marginTop: 8 }}>
                {editingProtocol?.id === p.id ? (
                  <div>
                    <input
                      type="text"
                      value={editingProtocol.name}
                      onChange={e => setEditingProtocol({ ...editingProtocol, name: e.target.value })}
                      style={{ ...inputStyle, marginBottom: 8, fontWeight: 700 }}
                    />
                    <textarea
                      value={editingProtocol.content}
                      onChange={e => setEditingProtocol({ ...editingProtocol, content: e.target.value })}
                      style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button onClick={updateProtocol} style={{ ...smallBtnStyle, background: '#16a34a', color: '#fff' }}>Salvar</button>
                      <button onClick={() => setEditingProtocol(null)} style={smallBtnStyle}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{p.name}</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => handlePrint('orientacoes', p.id)} style={smallBtnStyle} title="Imprimir">🖨️</button>
                        <button onClick={() => setEditingProtocol({ ...p })} style={smallBtnStyle} title="Editar">✏️</button>
                        <button onClick={() => deleteProtocol(p.id)} style={{ ...smallBtnStyle, color: '#dc2626' }} title="Excluir">🗑️</button>
                      </div>
                    </div>
                    <p style={{ fontSize: 12, color: '#64748b', marginTop: 6, whiteSpace: 'pre-wrap' }}>
                      {p.content.length > 150 ? p.content.slice(0, 150) + '...' : p.content}
                    </p>
                  </div>
                )}
              </div>
            ))}

            {/* New protocol */}
            <div style={{ marginTop: 16, padding: 12, background: '#f8fafc', borderRadius: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#475569', marginBottom: 8 }}>Novo protocolo / orientação</div>
              <input
                type="text"
                placeholder="Nome do protocolo"
                value={newProtocolName}
                onChange={e => setNewProtocolName(e.target.value)}
                style={{ ...inputStyle, marginBottom: 8, fontWeight: 600 }}
              />
              <textarea
                placeholder="Conteúdo / orientações..."
                value={newProtocolContent}
                onChange={e => setNewProtocolContent(e.target.value)}
                style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
              />
              <button onClick={addProtocol} style={{ ...smallBtnStyle, marginTop: 8, background: '#0f172a', color: '#fff' }}>
                + Adicionar protocolo
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div>
          {/* PDF Preview */}
          <div style={sectionCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                {pdfType === 'plano' ? 'Plano alimentar em PDF' : 'Orientações em PDF'}
              </h3>
              <button onClick={() => handlePrint(pdfType, selectedProtocolId ?? undefined)} style={smallBtnStyle}>
                👁️ Revisar PDF
              </button>
            </div>

            {/* Mini preview */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, background: '#fafafa', maxHeight: 300, overflow: 'auto', transform: 'scale(0.48)', transformOrigin: 'top left', width: '210%', marginBottom: -120 }}>
              <PrintableLayout
                type={pdfType}
                nomePaciente={nomePaciente}
                dataNascimento={dataNascimento}
                sexoPaciente={sexoPaciente}
                pesoKg={pesoKg}
                alturaCm={alturaCm}
                massaMuscular={massaMuscular}
                massaAdiposa={massaAdiposa}
                percGordura={percGordura}
                meals={meals}
                protocol={selectedProtocol}
              />
            </div>
          </div>

          {/* Message */}
          <div style={sectionCardStyle}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              ✉️ Mensagem para o paciente
            </h3>
            <textarea
              placeholder="Escreva uma mensagem personalizada..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }}
              maxLength={500}
            />
            <div style={{ textAlign: 'right', fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{message.length}/500</div>
          </div>

          {/* Attachments */}
          <div style={sectionCardStyle}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              📎 Anexos (opcional)
            </h3>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              style={{ display: 'none' }}
            />
            <div
              onClick={handleAddAttachment}
              style={{
                border: '2px dashed #cbd5e1',
                borderRadius: 10,
                padding: 20,
                textAlign: 'center',
                cursor: 'pointer',
                color: '#64748b',
                fontSize: 13,
              }}
            >
              📁 Adicionar anexos<br />
              <span style={{ fontSize: 11, color: '#94a3b8' }}>PDF, imagens ou documentos (máx. 10MB)</span>
            </div>
            {attachments.length > 0 && (
              <div style={{ marginTop: 8 }}>
                {attachments.map((f, i) => (
                  <div key={i} style={{ fontSize: 12, padding: '4px 8px', background: '#f1f5f9', borderRadius: 6, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{f.name}</span>
                    <button
                      onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                      style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Send */}
          <div style={sectionCardStyle}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Enviar por</h3>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <button style={{ ...sendMethodBtn, opacity: 0.5, cursor: 'not-allowed' }} disabled title="Requer integração via API">
                📱 WhatsApp
              </button>
              <button onClick={handleSendEmail} style={sendMethodBtn}>
                ✉️ E-mail
              </button>
            </div>
            <button
              onClick={handleSendEmail}
              style={{
                width: '100%',
                padding: '14px',
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ✈️ Enviar plano para o paciente
            </button>
          </div>
        </div>
      </div>

      {/* Hidden printable layouts */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <PrintableLayout
          type="plano"
          nomePaciente={nomePaciente}
          dataNascimento={dataNascimento}
          sexoPaciente={sexoPaciente}
          pesoKg={pesoKg}
          alturaCm={alturaCm}
          massaMuscular={massaMuscular}
          massaAdiposa={massaAdiposa}
          percGordura={percGordura}
          meals={meals}
        />
        <PrintableLayout
          type="orientacoes"
          nomePaciente={nomePaciente}
          dataNascimento={dataNascimento}
          sexoPaciente={sexoPaciente}
          pesoKg={pesoKg}
          alturaCm={alturaCm}
          massaMuscular={massaMuscular}
          massaAdiposa={massaAdiposa}
          percGordura={percGordura}
          meals={meals}
          protocol={selectedProtocol}
        />
      </div>
    </div>
  )
}

// ==================== STYLES ====================
const patientHeaderStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 14,
  padding: 20,
  marginBottom: 16,
}

const sectionCardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 14,
  padding: 20,
  marginBottom: 16,
}

const mealCardStyle: React.CSSProperties = {
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  padding: 12,
  marginBottom: 8,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1.5px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 13,
  background: '#fff',
  boxSizing: 'border-box',
}

const smallBtnStyle: React.CSSProperties = {
  padding: '6px 12px',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  background: '#f1f5f9',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
}

const sendMethodBtn: React.CSSProperties = {
  flex: 1,
  padding: '10px 16px',
  border: '1.5px solid #e2e8f0',
  borderRadius: 10,
  background: '#fff',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 600,
  textAlign: 'center',
}
