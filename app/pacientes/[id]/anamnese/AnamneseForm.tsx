"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { salvarAnamnese, autoSalvarAnamnese } from "./actions";

type Props = {
  pacienteId: string;
  dados?: Record<string, unknown>;
};

interface DynamicField {
  id: string;
  label: string;
  value: string;
  editing: boolean;
}

let fieldIdCounter = 0;
function genFieldId() {
  return `field_${Date.now()}_${fieldIdCounter++}`;
}

const CAMPOS_FIXOS = [
  { id: "peso", label: "Peso (kg)" },
  { id: "altura", label: "Altura (cm)" },
  { id: "percentual_gordura", label: "% Gordura" },
  { id: "massa_muscular", label: "Massa Muscular (kg)" },
  { id: "massa_adiposa", label: "Massa Adiposa (kg)" },
  { id: "agua_corporal", label: "Água Corporal (%)" },
  { id: "historico_clinico", label: "Histórico Clínico" },
  { id: "alergias", label: "Alergias" },
  { id: "medicamentos", label: "Medicamentos" },
  { id: "suplementos", label: "Suplementos" },
  { id: "habitos_alimentares", label: "Hábitos Alimentares" },
  { id: "observacoes", label: "Observações" },
];

// ── Campos personalizados GLOBAIS (compartilhados entre todos os pacientes) ──
const CUSTOM_FIELDS_KEY = "nutricare_campos_personalizados";
const SELECTION_KEY     = "nutricare_formulario_campos_padrao";

function carregarCamposCustom(): Array<{ id: string; label: string }> {
  if (typeof window === "undefined") return [];
  try {
    const salvo = localStorage.getItem(CUSTOM_FIELDS_KEY);
    if (salvo) return JSON.parse(salvo);
  } catch { /* ignore */ }
  return [];
}

function salvarCamposCustom(fields: DynamicField[]) {
  const customFields = fields.filter((f) => f.id.startsWith("field_"));
  try {
    localStorage.setItem(
      CUSTOM_FIELDS_KEY,
      JSON.stringify(customFields.map((f) => ({ id: f.id, label: f.label })))
    );
  } catch { /* ignore */ }
}

function carregarPadrao(): string[] {
  if (typeof window === "undefined") return CAMPOS_FIXOS.map((c) => c.id);
  try {
    const salvo = localStorage.getItem(SELECTION_KEY);
    if (salvo) return JSON.parse(salvo);
  } catch { /* ignore */ }
  return CAMPOS_FIXOS.map((c) => c.id);
}

export default function AnamneseForm({ pacienteId, dados }: Props) {
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const buildDefaultFields = (): DynamicField[] => [
    { id: "historico_clinico", label: "Histórico Clínico",     value: String(dados?.historico_clinico   || ""), editing: false },
    { id: "alergias",          label: "Alergias",              value: String(dados?.alergias            || ""), editing: false },
    { id: "medicamentos",      label: "Medicamentos",          value: String(dados?.medicamentos        || ""), editing: false },
    { id: "suplementos",       label: "Suplementos",           value: String(dados?.suplementos         || ""), editing: false },
    { id: "habitos_alimentares",label: "Hábitos Alimentares",  value: String(dados?.habitos_alimentares || ""), editing: false },
    { id: "observacoes",       label: "Observações",           value: String(dados?.observacoes         || ""), editing: false },
  ];

  const [fields, setFields]                 = useState<DynamicField[]>(buildDefaultFields());
  const [showModal, setShowModal]           = useState(false);
  const [camposSelecionados, setCamposSelecionados] = useState<string[]>([]);
  const [envioStatus, setEnvioStatus]       = useState<"idle" | "loading" | "ok" | "erro">("idle");
  const [envioMsg, setEnvioMsg]             = useState("");

  // ── Carrega campos globais e seleção salva ao montar / trocar paciente ──
  useEffect(() => {
    const customSalvos = carregarCamposCustom();
    if (customSalvos.length > 0) {
      setFields((prev) => {
        const existingIds = new Set(prev.map((f) => f.id));
        const novos = customSalvos
          .filter((c) => !existingIds.has(c.id))
          .map((c) => ({ id: c.id, label: c.label, value: "", editing: false }));
        return [...prev, ...novos];
      });
    }

    // Seleção padrão: inclui automáticamente todos os campos personalizados globais
    const padraoSalvo = carregarPadrao();
    const idsCustom   = customSalvos.map((c) => c.id);
    const selecaoFinal = Array.from(new Set([...padraoSalvo, ...idsCustom]));
    setCamposSelecionados(selecaoFinal);
  }, [pacienteId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mantém as perguntas globais sincronizadas entre abas/janelas ──
  useEffect(() => {
    function onStorage(ev: StorageEvent) {
      if (ev.key !== CUSTOM_FIELDS_KEY) return;
      const customSalvos = carregarCamposCustom();
      setFields((prev) => {
        const fixosMantidos = prev.filter((f) => !f.id.startsWith("field_"));
        const dinamicos = customSalvos.map((c) => {
          const existente = prev.find((f) => f.id === c.id);
          return {
            id: c.id,
            label: c.label,
            value: existente?.value ?? "",
            editing: existente?.editing ?? false,
          };
        });
        return [...fixosMantidos, ...dinamicos];
      });
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ── Helpers de formatação ──
  function valorDecimal(valor: unknown) {
    if (valor === null || valor === undefined) return "";
    const numero =
      typeof valor === "object" && valor !== null && "toNumber" in valor
        ? (valor as { toNumber: () => number }).toNumber()
        : Number(valor);
    if (isNaN(numero)) return "";
    return numero.toString().replace(".", ",");
  }

  function valorInteiro(valor: unknown) {
    if (valor === null || valor === undefined) return "";
    const numero =
      typeof valor === "object" && valor !== null && "toNumber" in valor
        ? (valor as { toNumber: () => number }).toNumber()
        : Number(valor);
    if (isNaN(numero)) return "";
    return Math.round(numero).toString();
  }

  function validarFormulario(event: React.FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const alturaInput = form.elements.namedItem("altura") as HTMLInputElement | null;
    if (!alturaInput) return;
    const valor = alturaInput.value.trim();
    if (valor === "") return;
    if (valor.includes(".") || valor.includes(",")) {
      event.preventDefault();
      alert("A altura deve ser informada sem ponto ou vírgula.\n\nDigite apenas valor inteiro.\nExemplo correto: 173");
      alturaInput.focus(); alturaInput.select(); return;
    }
    if (!/^\d+$/.test(valor)) {
      event.preventDefault();
      alert("A altura deve ser informada usando apenas números inteiros.\n\nExemplo correto: 173");
      alturaInput.focus(); alturaInput.select(); return;
    }
  }

  // ── Gerenciamento de campos dinâmicos (persiste globalmente) ──
  const addField = useCallback(() => {
    const newField: DynamicField = { id: genFieldId(), label: "", value: "", editing: true };
    setFields((prev) => {
      const next = [...prev, newField];
      salvarCamposCustom(next);
      return next;
    });
  }, []);

  const removeField = useCallback((fieldId: string) => {
    setFields((prev) => {
      const next = prev.filter((f) => f.id !== fieldId);
      salvarCamposCustom(next);
      // Remove também da seleção se estava selecionado
      setCamposSelecionados((sel) => sel.filter((id) => id !== fieldId));
      return next;
    });
  }, []);

  const updateFieldLabel = useCallback((fieldId: string, label: string) => {
    setFields((prev) => {
      const next = prev.map((f) => (f.id === fieldId ? { ...f, label } : f));
      salvarCamposCustom(next);
      return next;
    });
  }, []);

  const updateFieldValue = useCallback((fieldId: string, value: string) => {
    setFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, value } : f)));
  }, []);

  const toggleEditing = useCallback((fieldId: string) => {
    setFields((prev) => {
      const next = prev.map((f) => (f.id === fieldId ? { ...f, editing: !f.editing } : f));
      salvarCamposCustom(next);
      return next;
    });
  }, []);

  // ── Auto-save ──
  const lastSavedRef = useRef<string>("");

  const buildFormData = useCallback(() => {
    if (!formRef.current) return null;
    const formData = new FormData(formRef.current);
    fields.forEach((f) => { formData.set(f.id, f.value); });
    return formData;
  }, [fields]);

  const autoSave = useCallback(async () => {
    const formData = buildFormData();
    if (!formData) return;
    const snapshot = JSON.stringify(Array.from(formData.entries()));
    if (snapshot === lastSavedRef.current) return;
    setSaving(true);
    try {
      await autoSalvarAnamnese(pacienteId, formData);
      lastSavedRef.current = snapshot;
    } catch { /* silent */ } finally { setSaving(false); }
  }, [buildFormData, pacienteId]);

  useEffect(() => {
    const formData = buildFormData();
    if (formData) lastSavedRef.current = JSON.stringify(Array.from(formData.entries()));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const autoSaveRef = useRef(autoSave);
  useEffect(() => { autoSaveRef.current = autoSave; }, [autoSave]);

  const inputTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleFormInput = useCallback(() => {
    if (inputTimer.current) clearTimeout(inputTimer.current);
    inputTimer.current = setTimeout(() => { autoSaveRef.current(); }, 1500);
  }, []);

  useEffect(() => {
    const handler = () => { autoSaveRef.current(); };
    window.addEventListener("pagehide", handler);
    return () => {
      window.removeEventListener("pagehide", handler);
      autoSaveRef.current();
    };
  }, []);

  // ── Modal de seleção de campos ──
  function getAllCampos() {
    const dinamicos = fields
      .filter((f) => f.label.trim() && f.id.startsWith("field_"))
      .map((f) => ({ id: f.id, label: f.label }));
    return [...CAMPOS_FIXOS, ...dinamicos];
  }

  function toggleCampo(id: string) {
    setCamposSelecionados((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  function selecionarTodos() {
    setCamposSelecionados(getAllCampos().map((c) => c.id));
  }

  function limparSelecao() {
    setCamposSelecionados([]);
  }

  async function handleEnviarFormulario() {
    if (camposSelecionados.length === 0) {
      alert("Selecione pelo menos um campo para enviar.");
      return;
    }

    // Salva seleção atual como padrão
    try { localStorage.setItem(SELECTION_KEY, JSON.stringify(camposSelecionados)); } catch { /* ignore */ }

    // ── FIX PRINCIPAL: Para campos personalizados (field_...) envia {key, label}
    //    Para campos fixos, envia só o ID (pois o label é conhecido pelo frontend)
    const camposComLabels = camposSelecionados.map((id) => {
      const fixo = CAMPOS_FIXOS.find((c) => c.id === id);
      if (fixo) return id; // campo fixo: envia só o ID
      const dinamico = fields.find((f) => f.id === id);
      if (dinamico && dinamico.label.trim()) {
        return JSON.stringify({ key: id, label: dinamico.label.trim() });
      }
      return id; // fallback
    });

    setEnvioStatus("loading");
    setEnvioMsg("");

    try {
      const res = await fetch("/api/anamnese/enviar-formulario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pacienteId, campos: camposComLabels }),
      });
      const data = await res.json();
      if (res.ok) {
        setEnvioStatus("ok");
        setEnvioMsg("Formulário enviado com sucesso para o e-mail do paciente!");
        setTimeout(() => { setShowModal(false); setEnvioStatus("idle"); setEnvioMsg(""); }, 2500);
      } else {
        setEnvioStatus("erro");
        setEnvioMsg(data.error || "Erro ao enviar.");
      }
    } catch {
      setEnvioStatus("erro");
      setEnvioMsg("Erro de conexão.");
    }
  }

  return (
    <>
      <form
        ref={formRef}
        action={salvarAnamnese.bind(null, pacienteId)}
        onSubmit={validarFormulario}
        onInput={handleFormInput}
        style={{ background: "white", padding: "30px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
          <h2 style={{ margin: 0 }}>Dados da Anamnese</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {saving && <span style={{ fontSize: "12px", color: "#94a3b8" }}>Salvando...</span>}
            <button
              type="button"
              onClick={() => { setEnvioStatus("idle"); setEnvioMsg(""); setShowModal(true); }}
              style={{ padding: "9px 18px", background: "linear-gradient(135deg, #1a6b3c 0%, #145530 100%)", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 2px 8px rgba(26,107,60,0.25)" }}
            >
              <span>📧</span> Enviar Formulário
            </button>
          </div>
        </div>

        {/* Campos de medição numérica */}
        <div style={rowStyle}>
          <div style={campoPequenoStyle}>
            <label style={campoLabelStyle}>Peso (kg)</label>
            <input type="text" name="peso" style={inputLinhaStyle} defaultValue={valorDecimal(dados?.peso)} />
          </div>
          <div style={campoPequenoStyle}>
            <label style={campoLabelStyle}>Altura (cm)</label>
            <input type="text" name="altura" style={inputLinhaStyle} defaultValue={valorInteiro(dados?.altura)} />
          </div>
          <div style={campoPequenoStyle}>
            <label style={campoLabelStyle}>% Gordura</label>
            <input type="text" name="percentual_gordura" style={inputLinhaStyle} defaultValue={valorDecimal(dados?.percentual_gordura)} />
          </div>
          <div style={campoPequenoStyle}>
            <label style={campoLabelStyle}>Massa Muscular (kg)</label>
            <input type="text" name="massa_muscular" style={inputLinhaStyle} defaultValue={valorDecimal(dados?.massa_muscular)} />
          </div>
          <div style={campoPequenoStyle}>
            <label style={campoLabelStyle}>Massa Adiposa (kg)</label>
            <input type="text" name="massa_adiposa" style={inputLinhaStyle} defaultValue={valorDecimal(dados?.massa_adiposa)} />
          </div>
          <div style={campoPequenoStyle}>
            <label style={campoLabelStyle}>Água Corporal (%)</label>
            <input type="text" name="agua_corporal" style={inputLinhaStyle} defaultValue={valorDecimal(dados?.agua_corporal)} />
          </div>
        </div>

        {/* Campos de texto (fixos + dinâmicos) */}
        {fields.map((field) => (
          <div key={field.id} style={{ marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              {field.editing ? (
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) => updateFieldLabel(field.id, e.target.value)}
                  placeholder="Nome do campo..."
                  style={{ padding: "4px 8px", border: "1.5px solid #3b82f6", borderRadius: "6px", fontSize: "13px", fontWeight: 600, color: "#1e40af", outline: "none", flex: 1, maxWidth: "250px" }}
                  autoFocus
                  onBlur={() => toggleEditing(field.id)}
                  onKeyDown={(e) => { if (e.key === "Enter") toggleEditing(field.id); }}
                />
              ) : (
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#374151", cursor: field.id.startsWith("field_") ? "pointer" : "default" }}
                  onClick={() => { if (field.id.startsWith("field_")) toggleEditing(field.id); }}
                  title={field.id.startsWith("field_") ? "Clique para renomear" : undefined}>
                  {field.label || "(sem nome)"}
                </span>
              )}
              {/* Botões de edição/remoção apenas para campos personalizados */}
              {field.id.startsWith("field_") && (
                <>
                  <button type="button" onClick={() => toggleEditing(field.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "#3b82f6", padding: "2px" }} title="Editar nome">✏️</button>
                  <button type="button" onClick={() => removeField(field.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "15px", color: "#ef4444", padding: "2px", fontWeight: 700 }} title="Excluir campo">×</button>
                </>
              )}
            </div>
            <textarea name={field.id} rows={2} style={textareaStyle} value={field.value} onChange={(e) => updateFieldValue(field.id, e.target.value)} />
          </div>
        ))}

        <div
          onClick={addField}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", border: "2px dashed #cbd5e1", borderRadius: "10px", padding: "10px", color: "#94a3b8", fontSize: "13px", fontWeight: 600, cursor: "pointer", marginBottom: "12px" }}
        >
          + Adicionar Campo
        </div>
      </form>

      {/* ── Modal de envio ── */}
      {showModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div style={{ background: "white", borderRadius: "16px", width: "100%", maxWidth: "480px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}>
            <div style={{ background: "linear-gradient(135deg, #1a6b3c, #145530)", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ margin: 0, color: "white", fontSize: "16px" }}>📧 Enviar Formulário</h3>
                <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.75)", fontSize: "12px" }}>Selecione os campos para enviar ao paciente</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", borderRadius: "50%", width: "30px", height: "30px", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>

            <div style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
                <button onClick={selecionarTodos} style={{ padding: "5px 12px", fontSize: "12px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "6px", cursor: "pointer", color: "#475569" }}>Selecionar todos</button>
                <button onClick={limparSelecao} style={{ padding: "5px 12px", fontSize: "12px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "6px", cursor: "pointer", color: "#475569" }}>Limpar</button>
                <span style={{ marginLeft: "auto", fontSize: "12px", color: "#94a3b8", alignSelf: "center" }}>{camposSelecionados.length} selecionado(s)</span>
              </div>

              <div style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
                {getAllCampos().map((campo) => {
                  const marcado = camposSelecionados.includes(campo.id);
                  return (
                    <label key={campo.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "8px", cursor: "pointer", background: marcado ? "#f0fdf4" : "transparent", border: `1px solid ${marcado ? "#86efac" : "#e2e8f0"}`, transition: "all 0.15s" }}>
                      <input type="checkbox" checked={marcado} onChange={() => toggleCampo(campo.id)} style={{ width: "16px", height: "16px", accentColor: "#1a6b3c", cursor: "pointer" }} />
                      <span style={{ fontSize: "13.5px", color: marcado ? "#1a4d2e" : "#374151", fontWeight: marcado ? 600 : 400 }}>{campo.label}</span>
                    </label>
                  );
                })}
              </div>

              <p style={{ margin: "12px 0 0", fontSize: "11px", color: "#94a3b8" }}>
                💾 Campos personalizados são compartilhados entre todos os pacientes.
              </p>

              {envioMsg && (
                <div style={{ marginTop: "12px", padding: "10px 12px", background: envioStatus === "ok" ? "#f0fdf4" : "#fef2f2", border: `1px solid ${envioStatus === "ok" ? "#86efac" : "#fecaca"}`, borderRadius: "8px", fontSize: "13px", color: envioStatus === "ok" ? "#16a34a" : "#dc2626" }}>
                  {envioStatus === "ok" ? "✅ " : "❌ "}{envioMsg}
                </div>
              )}
            </div>

            <div style={{ padding: "0 24px 24px", display: "flex", gap: "10px" }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: "11px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "10px", cursor: "pointer", fontSize: "13.5px", color: "#475569", fontWeight: 600 }}>Cancelar</button>
              <button
                onClick={handleEnviarFormulario}
                disabled={envioStatus === "loading" || camposSelecionados.length === 0}
                style={{ flex: 2, padding: "11px", background: envioStatus === "loading" || camposSelecionados.length === 0 ? "#94a3b8" : "linear-gradient(135deg, #1a6b3c, #145530)", color: "white", border: "none", borderRadius: "10px", cursor: envioStatus === "loading" || camposSelecionados.length === 0 ? "not-allowed" : "pointer", fontSize: "13.5px", fontWeight: 700, letterSpacing: "1px", boxShadow: "0 2px 8px rgba(26,107,60,0.25)" }}
              >
                {envioStatus === "loading" ? "ENVIANDO..." : "📧 ENVIAR FORMULÁRIO"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const rowStyle = { display: "flex", gap: "12px", marginBottom: "12px", flexWrap: "nowrap" as const, alignItems: "stretch" };
const campoPequenoStyle = { flex: 1, minWidth: 0, display: "flex" as const, flexDirection: "column" as const };
const campoLabelStyle = { fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" } as const;
const inputLinhaStyle  = { width: "100%", padding: "12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px" } as const;
const textareaStyle    = { width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", resize: "vertical" as const, boxSizing: "border-box" as const } as const;
