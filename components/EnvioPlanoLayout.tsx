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

function shortFoodName(fullName: string): string {
  if (!fullName) return fullName
  const parts = fullName.split(',').map(p => p.trim())
  if (parts.length <= 1) return fullName
  const generic = ['carne', 'peixe', 'leite', 'queijo', 'pão', 'óleo', 'farinha']
  if (generic.includes(parts[0].toLowerCase()) && parts.length >= 3) {
    return parts[2].charAt(0).toUpperCase() + parts[2].slice(1)
  }
  return parts[0]
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
  shoppingList,
  shoppingDays,
}: {
  type: 'plano' | 'orientacoes' | 'compras'
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
  shoppingList?: { name: string; displayQty: string }[]
  shoppingDays?: number
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
      {/* Watermark - Coração Centralizado */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: 0.12,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/nutri-coracao.png" alt="" style={{ width: '500px', height: 'auto' }} />
      </div>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '2px solid #0f172a',
          paddingBottom: 12,
          marginBottom: '5mm',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-nutricare.png" alt="NutriCare" style={{ width: 120, height: 120, objectFit: 'contain' }} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{nomePaciente}</div>
            <div style={{ fontSize: 13, color: '#000', fontWeight: 700 }}>
              {dataNascimento && `Nascimento: ${dataNascimento.split('-').reverse().join('/')}`}
              {' | '}Peso: {pesoKg} kg | Altura: {alturaCm} cm | Sexo: {sexoPaciente}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 13, color: '#000', fontWeight: 700 }}>
          <div>Massa muscular: {massaMuscular.toFixed(1)} kg</div>
          <div>Massa adiposa: {massaAdiposa.toFixed(1)} kg</div>
          <div>% de gordura: {percGordura.toFixed(1)}%</div>
        </div>
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', fontSize: 22, fontWeight: 700, marginBottom: 18, position: 'relative', zIndex: 1 }}>
        {type === 'plano' ? 'Plano Alimentar' : type === 'compras' ? 'Lista de Compras' : 'Orientações'}
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {type === 'plano' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, paddingBottom: '1cm' }}>
            {meals.map((meal, idx) => (
              <div
                key={meal.id}
                style={{
                  border: '1px solid #d1d5db',
                  borderRadius: 10,
                  padding: '14px 18px',
                  minHeight: 180,
                  background: 'rgba(255,255,255,0.55)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, borderBottom: '1px solid #e5e7eb', paddingBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{meal.name || `Refeição ${idx + 1}`}</span>
                  <span style={{ fontSize: 11, color: '#666' }}>{meal.time}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 11 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 10, color: '#16a34a', marginBottom: 6, textTransform: 'uppercase' }}>Principais</div>
                    {meal.foods.filter(f => f.name).length > 0 ? meal.foods.filter(f => f.name).map(f => (
                      <div key={f.id} style={{ marginBottom: 4, lineHeight: 1.4 }}>
                        {f.name} — <strong>{f.qty}{f.unit}</strong>
                      </div>
                    )) : <div style={{ color: '#999', fontStyle: 'italic' }}>—</div>}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 10, color: '#2563eb', marginBottom: 6, textTransform: 'uppercase' }}>Substituições</div>
                    {Object.entries(meal.subs).filter(([, subs]) => subs.some(s => s.name)).length > 0 ? (
                      Object.entries(meal.subs).map(([foodId, subs]) => {
                        const mainFood = meal.foods.find(f => f.id === foodId)
                        const validSubs = subs.filter(s => s.name)
                        if (validSubs.length === 0) return null
                        return (
                          <div key={foodId} style={{ marginBottom: 6 }}>
                            {mainFood?.name && (
                              <div style={{ fontSize: 12, fontWeight: 800, color: '#1e3a8a', marginBottom: 3 }}>
                                Substitui p/ {shortFoodName(mainFood.name)}:
                              </div>
                            )}
                            {validSubs.map(s => (
                              <div key={s.id} style={{ marginBottom: 3, lineHeight: 1.4, fontWeight: 700, color: '#000' }}>
                                {s.name} — <strong>{s.qty}{s.unit}</strong>
                              </div>
                            ))}
                          </div>
                        )
                      })
                    ) : <div style={{ color: '#999', fontStyle: 'italic' }}>—</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : type === 'compras' ? (
          /* Lista de Compras layout */
          <div style={{ paddingBottom: '1cm' }}>
            <div style={{ fontSize: 12, color: '#475569', marginBottom: 12 }}>
              Quantidades totais para <strong>{shoppingDays || 30} dias</strong> - quantidades do alimento cru ou em natura
            </div>
            {shoppingList && shoppingList.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {shoppingList.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: '1px solid #d1d5db',
                      borderRadius: 10,
                      padding: '10px 14px',
                      fontSize: 12,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                      background: 'rgba(255,255,255,0.55)',
                    }}
                  >
                    <span>{item.name}</span>
                    <strong style={{ whiteSpace: 'nowrap' }}>{item.displayQty}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#999', fontStyle: 'italic' }}>—</div>
            )}
          </div>
        ) : (
          /* Orientações layout */
          <div style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: 16, paddingBottom: '1cm', background: 'rgba(255,255,255,0.55)' }}>
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
  const [selectedProtocolIds, setSelectedProtocolIds] = useState<Set<string>>(new Set())
  const [shoppingDays, setShoppingDays] = useState(30)
  const [includeShoppingList, setIncludeShoppingList] = useState(true)
  const [includeProtocols, setIncludeProtocols] = useState(true)
  const [sending, setSending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load meals from localStorage
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

  // Shopping list: aggregate all foods + subs for N days
  const shoppingList = (() => {
    const days = shoppingDays > 0 ? shoppingDays : 1
    const map: Record<string, { qty: number; unit: string }> = {}
    for (const meal of meals) {
      for (const f of meal.foods) {
        if (!f.name) continue
        const key = `${f.name}|${f.unit}`
        if (!map[key]) map[key] = { qty: 0, unit: f.unit }
        map[key].qty += f.qty * days
      }
      for (const subs of Object.values(meal.subs)) {
        for (const s of subs) {
          if (!s.name) continue
          const key = `${s.name}|${s.unit}`
          if (!map[key]) map[key] = { qty: 0, unit: s.unit }
          map[key].qty += s.qty * days
        }
      }
    }
    return Object.entries(map).map(([key, val]) => {
      const totalQty = Math.round(val.qty)
      let displayQty: string
      if (val.unit === 'g' && totalQty > 900) {
        const kg = Math.floor(totalQty / 1000)
        const gRest = totalQty % 1000
        displayQty = gRest > 0 ? `${kg}kg e ${gRest}g` : `${kg}kg`
      } else {
        displayQty = `${totalQty} ${val.unit}`
      }
      return {
        name: key.split('|')[0],
        qty: totalQty,
        unit: val.unit,
        displayQty,
      }
    })
  })()

  const toggleProtocolSelection = (id: string) => {
    setSelectedProtocolIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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

  const handleAddAttachment = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)])
    }
  }

  const handleSendEmail = async () => {
    if (meals.length === 0) {
      alert('Adicione alimentos ao plano alimentar primeiro!')
      return
    }

    setSending(true)
    try {
      const formData = new FormData()
      formData.append('pacienteId', pacienteId)
      formData.append('nomePaciente', nomePaciente)
      formData.append('message', message)
      formData.append('includeShoppingList', includeShoppingList.toString())
      formData.append('includeProtocols', includeProtocols.toString())
      formData.append('meals', JSON.stringify(meals.map(m => ({ name: m.name, time: m.time, foods: m.foods, subs: m.subs }))))
      formData.append('protocols', JSON.stringify(includeProtocols ? protocols.filter(p => selectedProtocolIds.has(p.id)) : []))
      formData.append('shoppingList', JSON.stringify(shoppingList))
      formData.append('shoppingDays', shoppingDays.toString())
      formData.append('dataNascimento', dataNascimento)
      formData.append('sexoPaciente', sexoPaciente)
      formData.append('pesoKg', pesoKg.toString())
      formData.append('alturaCm', alturaCm.toString())
      formData.append('massaMuscular', massaMuscular.toString())
      formData.append('massaAdiposa', massaAdiposa.toString())
      formData.append('percGordura', percGordura.toString())

      // Adicionar anexos
      attachments.forEach((file) => {
        formData.append('attachments', file)
      })

      const res = await fetch('/api/send-plano', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (res.ok) {
        alert(data.message || '✅ Plano enviado com sucesso!')
        setMessage('')
        setAttachments([])
      } else {
        alert(data.error || 'Erro ao enviar o plano.')
      }
    } catch {
      alert('Erro de conexão ao enviar o plano.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      {/* Patient Info */}
      <div style={patientHeaderStyle}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{nomePaciente}</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
            {dataNascimento && `${dataNascimento.split('-').reverse().join('/')}`}
            {' | '}{sexoPaciente} | {pesoKg} kg | {alturaCm} cm
          </div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
            Massa muscular: <b>{massaMuscular.toFixed(1)} kg</b> | Massa adiposa: <b>{massaAdiposa.toFixed(1)} kg</b> | % gordura: <b>{percGordura.toFixed(1)}%</b>
          </div>
        </div>
      </div>

      {/* Meals Section */}
      <div style={sectionCardStyle}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 700, color: '#0f172a' }}>📋 Plano Alimentar Diário</h3>

        {meals.length === 0 ? (
          <p style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 13 }}>
            Nenhuma refeição cadastrada. Monte o plano na aba "Plano Alimentar".
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

      {/* Shopping List Section */}
      <div style={sectionCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
            🛒 Lista de Compras
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Dias:</label>
            <input
              type="text"
              inputMode="numeric"
              value={shoppingDays}
              onChange={e => { const v = e.target.value.replace(/[^\d]/g, ''); setShoppingDays(Math.max(1, parseInt(v) || 1)) }}
              style={{ width: 60, padding: '6px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, textAlign: 'center', fontWeight: 700 }}
            />
          </div>
        </div>

        {shoppingList.length === 0 ? (
          <p style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 13 }}>
            Adicione alimentos no plano alimentar para gerar a lista.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {shoppingList.map((item, i) => (
              <div key={i} style={{ fontSize: 12, padding: '8px 12px', background: '#f8fafc', borderRadius: 8, color: '#334155', border: '1px solid #e2e8f0' }}>
                • {item.name} — <b>{item.displayQty}</b>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Protocols Section */}
      <div style={sectionCardStyle}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 700, color: '#0f172a' }}>📝 Protocolos / Orientações</h3>

        {/* Search */}
        <input
          type="text"
          placeholder="Buscar protocolo..."
          value={protocolSearch}
          onChange={e => setProtocolSearch(e.target.value)}
          style={{ ...inputStyle, marginBottom: 12 }}
        />

        {/* Protocol list */}
        {filteredProtocols.map(p => (
          <div key={p.id} style={mealCardStyle}>
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
                  maxLength={500}
                />
                <div style={{ textAlign: 'right', fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{(editingProtocol.content || '').length}/500</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={updateProtocol} style={{ ...smallBtnStyle, background: '#16a34a', color: '#fff' }}>✓ Salvar</button>
                  <button onClick={() => setEditingProtocol(null)} style={smallBtnStyle}>✕ Cancelar</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={selectedProtocolIds.has(p.id)}
                      onChange={() => toggleProtocolSelection(p.id)}
                      style={{ width: 18, height: 18, accentColor: '#16a34a', cursor: 'pointer' }}
                      title="Selecionar para envio"
                    />
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{p.name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setEditingProtocol({ ...p })} style={smallBtnStyle} title="Editar">✏️</button>
                    <button onClick={() => deleteProtocol(p.id)} style={{ ...smallBtnStyle, color: '#dc2626' }} title="Excluir">🗑️</button>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: '#64748b', margin: '0', whiteSpace: 'pre-wrap' }}>
                  {p.content.length > 200 ? p.content.slice(0, 200) + '...' : p.content}
                </p>
              </div>
            )}
          </div>
        ))}

        {/* New protocol */}
        <div style={{ marginTop: 16, padding: 12, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#475569', marginBottom: 8 }}>➕ Novo protocolo</div>
          <input
            type="text"
            placeholder="Nome do protocolo"
            value={newProtocolName}
            onChange={e => setNewProtocolName(e.target.value)}
            style={{ ...inputStyle, marginBottom: 8 }}
          />
          <textarea
            placeholder="Conteúdo / orientações..."
            value={newProtocolContent}
            onChange={e => setNewProtocolContent(e.target.value)}
            style={{ ...inputStyle, minHeight: 80, resize: 'vertical', marginBottom: 4 }}
            maxLength={500}
          />
          <div style={{ textAlign: 'right', fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>{newProtocolContent.length}/500</div>
          <button onClick={addProtocol} style={{ ...smallBtnStyle, background: '#0f172a', color: '#fff', width: '100%' }}>
            + Adicionar protocolo
          </button>
        </div>
      </div>

      {/* Message Section */}
      <div style={sectionCardStyle}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 18, fontWeight: 700, color: '#0f172a' }}>💬 Mensagem para o Paciente</h3>
        <textarea
          placeholder="Escreva uma mensagem personalizada que o paciente receberá no email..."
          value={message}
          onChange={e => setMessage(e.target.value)}
          style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }}
          maxLength={500}
        />
        <div style={{ textAlign: 'right', fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{message.length}/500</div>
      </div>

      {/* Attachments Section */}
      <div style={sectionCardStyle}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 18, fontWeight: 700, color: '#0f172a' }}>📎 Anexos (PDF, Imagens, Documentos)</h3>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.gif,.webp"
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
            fontWeight: 600,
            transition: 'all 0.3s',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = '#f8fafc'
            el.style.borderColor = '#cbd5e1'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'transparent'
          }}
        >
          📁 Clique para adicionar anexos<br />
          <span style={{ fontSize: 11, color: '#94a3b8' }}>PDF, imagens ou documentos (máx. 10MB)</span>
        </div>
        {attachments.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>Arquivos adicionados ({attachments.length}):</div>
            {attachments.map((f, i) => (
              <div key={i} style={{ fontSize: 12, padding: '8px 12px', background: '#f1f5f9', borderRadius: 6, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0' }}>
                <span>📄 {f.name} ({(f.size / 1024).toFixed(1)} KB)</span>
                <button
                  onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                  style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14, padding: 0 }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Send Section */}
      <div style={{ ...sectionCardStyle, background: '#f0fdf4', borderLeft: '4px solid #16a34a' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 18, fontWeight: 700, color: '#0f172a' }}>✈️ Enviar Plano para o Paciente</h3>

        <div style={{ marginBottom: 16, padding: 12, background: '#fff', borderRadius: 8, border: '1px solid #bbf7d0', fontSize: 13, color: '#166534' }}>
          <strong>O paciente receberá via email:</strong>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
            <li>✓ PDF do Plano Alimentar</li>
            {includeShoppingList && <li>✓ PDF da Lista de Compras ({shoppingDays} dias)</li>}
            {includeProtocols && <li>✓ PDFs de Protocolos/Orientações</li>}
          </ul>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155', cursor: 'pointer', marginBottom: 8 }}>
            <input
              type="checkbox"
              checked={includeShoppingList}
              onChange={e => setIncludeShoppingList(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: '#16a34a' }}
            />
            ✓ Incluir PDF da Lista de Compras
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={includeProtocols}
              onChange={e => setIncludeProtocols(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: '#16a34a' }}
            />
            ✓ Incluir PDFs de Protocolos/Orientações
          </label>
        </div>

        <button
          onClick={handleSendEmail}
          disabled={sending}
          style={{
            width: '100%',
            padding: '16px',
            background: sending ? '#86efac' : '#16a34a',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontSize: 16,
            fontWeight: 700,
            cursor: sending ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s',
          }}
        >
          {sending ? '⏳ Enviando...' : '✈️ Enviar Plano para o Paciente'}
        </button>
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
  marginBottom: 20,
}

const sectionCardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 14,
  padding: 20,
  marginBottom: 20,
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
  padding: '10px 12px',
  border: '1.5px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 13,
  background: '#fff',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}

const smallBtnStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  background: '#f1f5f9',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
  transition: 'all 0.2s',
}
