"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

type Paciente = { id: string; nome: string; email: string };

type Agendamento = {
  id: string;
  paciente_id: string;
  paciente_nome: string;
  paciente_email: string;
  data_agendamento: string;
  horario: string;
  tipo: string;
  status: string;
  observacoes: string;
  email_enviado: boolean;
};

type Props = {
  pacientes: Paciente[];
  agendamentosIniciais: Agendamento[];
};

const TIPOS = ["Consulta inicial", "Retorno", "Reavaliação física", "Avaliação física"];
const HORARIOS_DEFAULT = [
  "07:00","07:30","08:00","08:30","09:00","09:30",
  "10:00","10:30","11:00","11:30","12:00","12:30",
  "13:00","13:30","14:00","14:30","15:00","15:30",
  "16:00","16:30","17:00","17:30","18:00","18:30",
];

const DIAS_SEMANA = ["DOM","SEG","TER","QUA","QUI","SEX","SÁB"];
const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];
const DIAS_SEMANA_FULL = [
  "Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado",
];

// Anos disponíveis no seletor: 5 anos passados + 5 futuros
const anoAtual = new Date().getFullYear();
const ANOS = Array.from({ length: 11 }, (_, i) => anoAtual - 5 + i);

function statusCor(status: string): { bg: string; color: string; border: string } {
  switch (status) {
    case "Confirmado": return { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" };
    case "Recusado":   return { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" };
    default:           return { bg: "#fffbeb", color: "#d97706", border: "#fde68a" };
  }
}

function horarioStr(iso: string): string {
  const d = new Date(iso);
  const h = String(d.getUTCHours()).padStart(2, "0");
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function isoDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

function sameUTCDay(iso: string, date: Date): boolean {
  const d = new Date(iso);
  return d.getUTCFullYear() === date.getFullYear() &&
         d.getUTCMonth() === date.getMonth() &&
         d.getUTCDate() === date.getDate();
}

export default function AgendaClient({ pacientes, agendamentosIniciais }: Props) {
  const router = useRouter();
  const hoje = new Date();
  hoje.setHours(0,0,0,0);

  const [viewDate, setViewDate] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(new Date(hoje));
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>(agendamentosIniciais);
  const [loading, setLoading] = useState(false);
  const [editando, setEditando] = useState<Agendamento | null>(null);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; tipo: "ok" | "erro" } | null>(null);

  // Form state
  const [formPaciente, setFormPaciente] = useState("");
  const [formTipo, setFormTipo] = useState(TIPOS[0]);
  const [formHorario, setFormHorario] = useState("");
  const [buscaPaciente, setBuscaPaciente] = useState("");
  const [pacienteFiltrado, setPacienteFiltrado] = useState<Paciente | null>(null);

  // Edit state (modal edição de agendamento na lista)
  const [editHorario, setEditHorario] = useState("");
  const [editTipo, setEditTipo] = useState("");
  const [editObs, setEditObs] = useState("");

  // Inline time edit (double-click no horário da lista do dia)
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineEditTime, setInlineEditTime] = useState("");
  const inlineInputRef = useRef<HTMLInputElement>(null);

  // Horários editáveis na grade de seleção do formulário
  const [horariosCustom, setHorariosCustom] = useState<string[]>(HORARIOS_DEFAULT);
  const [editingSlotIdx, setEditingSlotIdx] = useState<number | null>(null);
  const [editingSlotVal, setEditingSlotVal] = useState("");
  const slotInputRef = useRef<HTMLInputElement>(null);

  const toast = (text: string, tipo: "ok" | "erro" = "ok") => {
    setMsg({ text, tipo });
    setTimeout(() => setMsg(null), 4000);
  };

  const carregarMes = useCallback(async (ano: number, mes: number, silencioso = false) => {
    if (!silencioso) setLoading(true);
    try {
      const dataInicio = `${ano}-${String(mes+1).padStart(2,"0")}-01`;
      const ultimoDia = new Date(ano, mes+1, 0).getDate();
      const dataFim = `${ano}-${String(mes+1).padStart(2,"0")}-${ultimoDia}`;
      const res = await fetch(`/api/agendamentos?dataInicio=${dataInicio}&dataFim=${dataFim}`);
      if (res.ok) {
        const data = await res.json();
        setAgendamentos(data);
      }
    } finally {
      if (!silencioso) setLoading(false);
    }
  }, []);

  // Polling automático a cada 60s
  useEffect(() => {
    const interval = setInterval(() => {
      carregarMes(viewDate.getFullYear(), viewDate.getMonth(), true);
    }, 60000);
    return () => clearInterval(interval);
  }, [carregarMes, viewDate]);

  const irParaMes = (ano: number, mes: number) => {
    const nova = new Date(ano, mes, 1);
    setViewDate(nova);
    carregarMes(ano, mes);
  };

  const irParaHoje = () => {
    const h = new Date();
    h.setHours(0,0,0,0);
    setSelectedDate(new Date(h));
    const nova = new Date(h.getFullYear(), h.getMonth(), 1);
    setViewDate(nova);
    carregarMes(h.getFullYear(), h.getMonth());
  };

  const agendamentosDia = agendamentos.filter(a => sameUTCDay(a.data_agendamento, selectedDate));

  // Horários já ocupados no dia selecionado (bloquear na grade)
  const horariosOcupados = new Set(agendamentosDia.map(a => horarioStr(a.horario)));

  const diasNoMes = () => {
    const ano = viewDate.getFullYear();
    const mes = viewDate.getMonth();
    const primeiro = new Date(ano, mes, 1);
    const ultimo = new Date(ano, mes + 1, 0);
    const dias: (Date | null)[] = Array(primeiro.getDay()).fill(null);
    for (let d = 1; d <= ultimo.getDate(); d++) dias.push(new Date(ano, mes, d));
    return dias;
  };

  // Salva edição de slot de horário na grade do formulário
  const salvarSlot = (idx: number, val: string) => {
    const limpo = val.trim();
    if (!limpo) { setEditingSlotIdx(null); return; }
    // Aceita formato HH:MM ou H:MM
    const match = limpo.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) { toast("Formato inválido. Use HH:MM", "erro"); setEditingSlotIdx(null); return; }
    const novo = `${match[1].padStart(2,"0")}:${match[2]}`;
    setHorariosCustom(prev => {
      const next = [...prev];
      next[idx] = novo;
      return next;
    });
    // Se este slot estava selecionado, atualiza o formHorario também
    if (formHorario === horariosCustom[idx]) setFormHorario(novo);
    setEditingSlotIdx(null);
  };

  const handleCriarEEnviar = async () => {
    if (!formPaciente || !formHorario) {
      toast("Selecione o paciente e o horário.", "erro"); return;
    }
    if (!pacienteFiltrado?.email) {
      toast("Paciente sem e-mail cadastrado.", "erro"); return;
    }
    if (horariosOcupados.has(formHorario)) {
      toast("Horário já ocupado nesta data. Escolha outro.", "erro"); return;
    }
    setEnviando("novo");
    try {
      const res = await fetch("/api/agendamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paciente_id: formPaciente,
          data_agendamento: isoDateStr(selectedDate),
          horario: formHorario,
          tipo: formTipo,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const novo = await res.json();
      setAgendamentos(prev => [...prev, novo]);
      setFormPaciente(""); setFormHorario("");
      setBuscaPaciente(""); setPacienteFiltrado(null);
      setFormTipo(TIPOS[0]);

      const envRes = await fetch("/api/agendamentos/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agendamento_id: novo.id }),
      });
      if (envRes.ok) {
        setAgendamentos(prev => prev.map(a => a.id === novo.id ? { ...a, email_enviado: true } : a));
        toast("Agendamento criado e e-mail de confirmação enviado!");
      } else {
        toast("Agendamento criado! (erro ao enviar e-mail)", "erro");
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro ao criar/enviar", "erro");
    } finally {
      setEnviando(null);
    }
  };

  const handleSalvarEdit = async () => {
    if (!editando) return;
    try {
      const res = await fetch(`/api/agendamentos/${editando.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ horario: editHorario, tipo: editTipo, observacoes: editObs }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const updated = await res.json();
      setAgendamentos(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a));
      setEditando(null);
      toast("Agendamento atualizado!");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro ao atualizar", "erro");
    }
  };

  // Salva horário via inline edit (duplo clique no horário da lista)
  const handleSalvarInlineTime = async (id: string) => {
    const val = inlineEditTime.trim();
    if (!val) { setInlineEditId(null); return; }
    const match = val.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) { toast("Formato inválido. Use HH:MM", "erro"); setInlineEditId(null); return; }
    const timeStr = `${match[1].padStart(2,"0")}:${match[2]}`;
    try {
      const res = await fetch(`/api/agendamentos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ horario: timeStr }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const updated = await res.json();
      setAgendamentos(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a));
      toast("Horário atualizado!");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro ao atualizar horário", "erro");
    } finally {
      setInlineEditId(null);
    }
  };

  const handleDeletar = async (id: string) => {
    if (!confirm("Excluir este agendamento?")) return;
    try {
      await fetch(`/api/agendamentos/${id}`, { method: "DELETE" });
      setAgendamentos(prev => prev.filter(a => a.id !== id));
      toast("Agendamento excluído.");
    } catch {
      toast("Erro ao excluir.", "erro");
    }
  };

  const handleEnviarEmail = async (ag: Agendamento) => {
    if (!ag.paciente_email) { toast("Paciente sem e-mail cadastrado.", "erro"); return; }
    setEnviando(ag.id);
    try {
      const res = await fetch("/api/agendamentos/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agendamento_id: ag.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setAgendamentos(prev => prev.map(a => a.id === ag.id ? { ...a, email_enviado: true } : a));
      toast("E-mail enviado com sucesso!");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro ao enviar e-mail", "erro");
    } finally {
      setEnviando(null);
    }
  };

  const pacientesFiltrados = pacientes.filter(p =>
    p.nome.toLowerCase().includes(buscaPaciente.toLowerCase())
  ).slice(0, 6);

  const s = {
    container: { display: "flex", gap: 24, alignItems: "flex-start" } as React.CSSProperties,
    left: { flex: 1, minWidth: 0 } as React.CSSProperties,
    right: { width: 340, flexShrink: 0 } as React.CSSProperties,
    card: { background: "#fff", borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", marginBottom: 20, overflow: "hidden" } as React.CSSProperties,
    cardHeader: { padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" } as React.CSSProperties,
    cardTitle: { fontWeight: 700, fontSize: 16, color: "#1e293b" } as React.CSSProperties,
    btn: { padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 } as React.CSSProperties,
    btnPrimary: { background: "#1e5fa8", color: "#fff" } as React.CSSProperties,
    btnGhost: { background: "#f1f5f9", color: "#475569" } as React.CSSProperties,
    input: { width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" } as React.CSSProperties,
    select: { width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#fff", boxSizing: "border-box" } as React.CSSProperties,
    label: { fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4, display: "block" } as React.CSSProperties,
    field: { marginBottom: 14 } as React.CSSProperties,
  };

  return (
    <div>
      {/* Toast */}
      {msg && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          background: msg.tipo === "ok" ? "#16a34a" : "#dc2626",
          color: "#fff", padding: "12px 20px", borderRadius: 10,
          fontSize: 14, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
        }}>
          {msg.text}
        </div>
      )}

      <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>Agenda</h1>
      <p style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>Gerencie seus agendamentos</p>

      <div style={s.container}>
        {/* LEFT COLUMN */}
        <div style={s.left}>
          {/* CALENDAR */}
          <div style={s.card}>
            {/* Cabeçalho: selects de mês/ano + botão Hoje */}
            <div style={{ ...s.cardHeader, gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={irParaHoje}
                style={{ ...s.btn, background: "#1e5fa8", color: "#fff", padding: "6px 14px", fontSize: 12 }}
              >
                Hoje
              </button>

              <div style={{ display: "flex", gap: 6, flex: 1, justifyContent: "center", alignItems: "center" }}>
                {/* Seletor de Mês */}
                <select
                  value={viewDate.getMonth()}
                  onChange={e => irParaMes(viewDate.getFullYear(), parseInt(e.target.value))}
                  style={{ padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#fff", fontWeight: 600, cursor: "pointer" }}
                >
                  {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>

                {/* Seletor de Ano */}
                <select
                  value={viewDate.getFullYear()}
                  onChange={e => irParaMes(parseInt(e.target.value), viewDate.getMonth())}
                  style={{ padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#fff", fontWeight: 600, cursor: "pointer" }}
                >
                  {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              {/* Setas mês anterior/próximo */}
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => irParaMes(viewDate.getFullYear(), viewDate.getMonth() - 1)} style={{ ...s.btn, ...s.btnGhost, padding: "6px 10px" }}>‹</button>
                <button onClick={() => irParaMes(viewDate.getFullYear(), viewDate.getMonth() + 1)} style={{ ...s.btn, ...s.btnGhost, padding: "6px 10px" }}>›</button>
              </div>
            </div>

            <div style={{ padding: "16px 20px" }}>
              {/* Weekday headers */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 8 }}>
                {DIAS_SEMANA.map(d => (
                  <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#94a3b8", padding: "4px 0" }}>{d}</div>
                ))}
              </div>

              {/* Days grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
                {diasNoMes().map((dia, i) => {
                  if (!dia) return <div key={`e${i}`} />;
                  const temAg = agendamentos.some(a => sameUTCDay(a.data_agendamento, dia));
                  const isHoje = isoDateStr(dia) === isoDateStr(hoje);
                  const isSel = isoDateStr(dia) === isoDateStr(selectedDate);
                  return (
                    <button key={i} onClick={() => setSelectedDate(new Date(dia))} style={{
                      border: "none", borderRadius: 8, padding: "8px 4px", cursor: "pointer", position: "relative",
                      background: isSel ? "#1e5fa8" : isHoje ? "#dbeafe" : "transparent",
                      color: isSel ? "#fff" : isHoje ? "#1e5fa8" : "#334155",
                      fontWeight: isSel || isHoje ? 700 : 400, fontSize: 14,
                    }}>
                      {dia.getDate()}
                      {temAg && (
                        <span style={{
                          position: "absolute", bottom: 3, left: "50%", transform: "translateX(-50%)",
                          width: 5, height: 5, borderRadius: "50%",
                          background: isSel ? "#fff" : "#1e5fa8", display: "block",
                        }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* DAY AGENDA */}
          <div style={s.card}>
            <div style={s.cardHeader}>
              <div>
                <div style={s.cardTitle}>Agenda do dia</div>
                <div style={{ fontSize: 13, color: "#64748b" }}>
                  {DIAS_SEMANA_FULL[selectedDate.getDay()]}, {selectedDate.getDate()} de {MESES[selectedDate.getMonth()].toLowerCase()} de {selectedDate.getFullYear()}
                </div>
              </div>
              <div style={{ ...s.btn, background: "#f0f9ff", color: "#1e5fa8", borderRadius: 20, fontSize: 12, padding: "6px 14px" }}>
                {agendamentosDia.length} agendamento{agendamentosDia.length !== 1 ? "s" : ""}
              </div>
            </div>

            <div style={{ padding: "12px 20px" }}>
              {loading && <p style={{ color: "#94a3b8", fontSize: 14, padding: "12px 0" }}>Carregando...</p>}
              {!loading && agendamentosDia.length === 0 && (
                <p style={{ color: "#94a3b8", fontSize: 14, padding: "16px 0", textAlign: "center" }}>
                  Nenhum agendamento para este dia.
                </p>
              )}

              {agendamentosDia.map(ag => {
                const cor = statusCor(ag.status);
                const isEditing = editando?.id === ag.id;
                const isInlineEdit = inlineEditId === ag.id;
                return (
                  <div key={ag.id} style={{
                    display: "flex", gap: 16, alignItems: "flex-start",
                    padding: "14px 0", borderBottom: "1px solid #f1f5f9",
                  }}>
                    {/* HORÁRIO — duplo clique para editar inline */}
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b", minWidth: 50, paddingTop: 2 }}>
                      {isInlineEdit ? (
                        <input
                          ref={inlineInputRef}
                          type="text"
                          value={inlineEditTime}
                          onChange={e => setInlineEditTime(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") handleSalvarInlineTime(ag.id);
                            if (e.key === "Escape") setInlineEditId(null);
                          }}
                          onBlur={() => handleSalvarInlineTime(ag.id)}
                          style={{
                            width: 58, padding: "3px 5px", border: "2px solid #1e5fa8",
                            borderRadius: 6, fontSize: 13, fontWeight: 700, textAlign: "center",
                          }}
                          autoFocus
                        />
                      ) : (
                        <span
                          title="Duplo clique para editar o horário"
                          onDoubleClick={() => {
                            setInlineEditId(ag.id);
                            setInlineEditTime(horarioStr(ag.horario));
                            setTimeout(() => inlineInputRef.current?.select(), 50);
                          }}
                          style={{ cursor: "pointer", borderBottom: "1px dashed #94a3b8", paddingBottom: 1 }}
                        >
                          {horarioStr(ag.horario)}
                        </span>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {isEditing ? (
                        <div style={{ background: "#f8fafc", borderRadius: 10, padding: 14 }}>
                          <div style={s.field}>
                            <label style={s.label}>Horário</label>
                            <select style={s.select} value={editHorario} onChange={e => setEditHorario(e.target.value)}>
                              {HORARIOS_DEFAULT.map(h => <option key={h}>{h}</option>)}
                            </select>
                          </div>
                          <div style={s.field}>
                            <label style={s.label}>Tipo de consulta</label>
                            <select style={s.select} value={editTipo} onChange={e => setEditTipo(e.target.value)}>
                              {TIPOS.map(t => <option key={t}>{t}</option>)}
                            </select>
                          </div>
                          <div style={s.field}>
                            <label style={s.label}>Observações</label>
                            <textarea style={{ ...s.input, resize: "vertical", minHeight: 60 }}
                              value={editObs} onChange={e => setEditObs(e.target.value)} />
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={handleSalvarEdit} style={{ ...s.btn, ...s.btnPrimary }}>Salvar</button>
                            <button onClick={() => setEditando(null)} style={{ ...s.btn, ...s.btnGhost }}>Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                            <button
                              onClick={() => router.push(`/pacientes/${ag.paciente_id}`)}
                              style={{ fontWeight: 700, fontSize: 14, color: "#1e5fa8", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
                            >
                              {ag.paciente_nome}
                            </button>
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: "2px 10px",
                              borderRadius: 20, border: `1px solid ${cor.border}`,
                              background: cor.bg, color: cor.color,
                            }}>
                              {ag.status}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>{ag.tipo}</div>
                          {ag.observacoes && (
                            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{ag.observacoes}</div>
                          )}
                          {ag.paciente_email && (
                            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>📧 {ag.paciente_email}</div>
                          )}
                        </>
                      )}
                    </div>

                    {!isEditing && !isInlineEdit && (
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={() => { setEditando(ag); setEditHorario(horarioStr(ag.horario)); setEditTipo(ag.tipo); setEditObs(ag.observacoes ?? ""); }}
                          title="Editar" style={{ ...s.btn, ...s.btnGhost, padding: "6px 10px" }}>✏️</button>
                        <button
                          onClick={() => handleEnviarEmail(ag)}
                          disabled={enviando === ag.id}
                          title={ag.email_enviado ? "Reenviar e-mail" : "Enviar e-mail de confirmação"}
                          style={{ ...s.btn, padding: "6px 10px", background: ag.email_enviado ? "#f0fdf4" : "#eff6ff", color: ag.email_enviado ? "#16a34a" : "#1e5fa8", border: "none", cursor: "pointer" }}>
                          {enviando === ag.id ? "..." : ag.email_enviado ? "✅" : "📧"}
                        </button>
                        <button
                          onClick={() => handleDeletar(ag.id)}
                          title="Excluir agendamento" style={{ ...s.btn, ...s.btnGhost, padding: "6px 10px", color: "#dc2626" }}>🗑️</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — New appointment form */}
        <div style={s.right}>
          <div style={s.card}>
            <div style={s.cardHeader}>
              <div>
                <div style={s.cardTitle}>Novo Agendamento</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  {selectedDate.getDate()}/{selectedDate.getMonth()+1}/{selectedDate.getFullYear()}
                </div>
              </div>
            </div>

            <div style={{ padding: "16px 20px" }}>
              {/* Patient search */}
              <div style={s.field}>
                <label style={s.label}>Paciente</label>
                <div style={{ position: "relative" }}>
                  <input
                    style={s.input}
                    placeholder="Buscar paciente..."
                    value={pacienteFiltrado ? pacienteFiltrado.nome : buscaPaciente}
                    onChange={e => { setBuscaPaciente(e.target.value); setFormPaciente(""); setPacienteFiltrado(null); }}
                  />
                  {buscaPaciente && !pacienteFiltrado && pacientesFiltrados.length > 0 && (
                    <div style={{
                      position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
                      background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.10)", marginTop: 2,
                    }}>
                      {pacientesFiltrados.map(p => (
                        <button key={p.id} onClick={() => {
                          setFormPaciente(p.id);
                          setPacienteFiltrado(p);
                          setBuscaPaciente("");
                        }} style={{
                          display: "block", width: "100%", textAlign: "left",
                          padding: "10px 14px", border: "none", background: "none",
                          cursor: "pointer", fontSize: 13, color: "#1e293b",
                          borderBottom: "1px solid #f1f5f9",
                        }}>
                          <div style={{ fontWeight: 600 }}>{p.nome}</div>
                          {p.email && <div style={{ fontSize: 11, color: "#94a3b8" }}>{p.email}</div>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {pacienteFiltrado && (
                  <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}>
                    ✅ {pacienteFiltrado.nome}
                    {pacienteFiltrado.email && <span style={{ color: "#94a3b8" }}>— {pacienteFiltrado.email}</span>}
                    <button onClick={() => { setPacienteFiltrado(null); setFormPaciente(""); }} style={{ border: "none", background: "none", cursor: "pointer", color: "#dc2626", fontSize: 12 }}>✕</button>
                  </div>
                )}
              </div>

              {/* Tipo */}
              <div style={s.field}>
                <label style={s.label}>Tipo de consulta</label>
                <select style={s.select} value={formTipo} onChange={e => setFormTipo(e.target.value)}>
                  {TIPOS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>

              {/* Horário — slots editáveis */}
              <div style={s.field}>
                <label style={s.label}>
                  Horário
                </label>
                {horariosOcupados.size > 0 && (
                  <div style={{ fontSize: 11, color: "#dc2626", marginBottom: 6 }}>
                    🔴 Horários em vermelho já estão ocupados nesta data
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
                  {horariosCustom.map((h, idx) => {
                    const ocupado = horariosOcupados.has(h);
                    const selecionado = formHorario === h;
                    const editandoEsteSlot = editingSlotIdx === idx;

                    if (editandoEsteSlot) {
                      return (
                        <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                          <input
                            ref={slotInputRef}
                            type="text"
                            value={editingSlotVal}
                            onChange={e => setEditingSlotVal(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter") salvarSlot(idx, editingSlotVal);
                              if (e.key === "Escape") setEditingSlotIdx(null);
                            }}
                            onBlur={() => salvarSlot(idx, editingSlotVal)}
                            style={{
                              width: "100%", padding: "5px 4px", border: "2px solid #1e5fa8",
                              borderRadius: 7, fontSize: 12, fontWeight: 700, textAlign: "center",
                              boxSizing: "border-box",
                            }}
                            autoFocus
                          />
                          <button
                            onMouseDown={e => { e.preventDefault(); salvarSlot(idx, editingSlotVal); }}
                            style={{ fontSize: 14, background: "#16a34a", color: "#fff", border: "none", borderRadius: 5, padding: "2px 6px", cursor: "pointer" }}
                            title="Salvar horário"
                          >
                            ✓
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div key={idx} style={{ position: "relative" }}>
                        <button
                          onClick={() => { if (!ocupado) setFormHorario(h); }}
                          disabled={ocupado}
                          title={ocupado ? "Horário já ocupado" : h}
                          style={{
                            width: "100%", padding: "7px 4px", border: "1px solid",
                            borderRadius: 7, fontSize: 12,
                            cursor: ocupado ? "not-allowed" : "pointer",
                            borderColor: ocupado ? "#fca5a5" : selecionado ? "#1e5fa8" : "#e2e8f0",
                            background: ocupado ? "#fee2e2" : selecionado ? "#1e5fa8" : "#fff",
                            color: ocupado ? "#dc2626" : selecionado ? "#fff" : "#475569",
                            fontWeight: selecionado ? 700 : ocupado ? 600 : 400,
                            textDecoration: ocupado ? "line-through" : "none",
                            paddingRight: 20,
                          }}
                        >
                          {h}
                        </button>
                        {/* Botão lápis para editar o horário do slot */}
                        <button
                          onClick={() => {
                            setEditingSlotIdx(idx);
                            setEditingSlotVal(h);
                            setTimeout(() => slotInputRef.current?.select(), 50);
                          }}
                          title="Editar este horário"
                          style={{
                            position: "absolute", top: "50%", right: 3, transform: "translateY(-50%)",
                            fontSize: 9, background: "none", border: "none", cursor: "pointer",
                            color: selecionado ? "rgba(255,255,255,0.8)" : "#94a3b8",
                            padding: 0, lineHeight: 1,
                          }}
                        >
                          ✏
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Único botão */}
              <button onClick={handleCriarEEnviar} disabled={enviando === "novo"} style={{
                ...s.btn, width: "100%", padding: "13px 0", fontSize: 14,
                background: enviando === "novo" ? "#86efac" : "#16a34a",
                color: "#fff", border: "none", cursor: enviando === "novo" ? "not-allowed" : "pointer",
                marginTop: 4,
              }}>
                {enviando === "novo" ? "⏳ Enviando..." : "📧 Cadastrar e enviar confirmação"}
              </button>

              <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 8 }}>
                Cadastra o agendamento e envia e-mail ao paciente
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
