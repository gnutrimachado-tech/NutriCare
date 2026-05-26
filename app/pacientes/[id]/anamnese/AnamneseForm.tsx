"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { salvarAnamnese } from "./actions";

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

export default function AnamneseForm({
  pacienteId,
  dados,
}: Props) {
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleFormsLink, setGoogleFormsLink] = useState("");
  const [googleData, setGoogleData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const defaultFields: DynamicField[] = [
    { id: "historico_clinico", label: "Histórico Clínico", value: String(dados?.historico_clinico || ""), editing: false },
    { id: "alergias", label: "Alergias", value: String(dados?.alergias || ""), editing: false },
    { id: "medicamentos", label: "Medicamentos", value: String(dados?.medicamentos || ""), editing: false },
    { id: "suplementos", label: "Suplementos", value: String(dados?.suplementos || ""), editing: false },
    { id: "habitos_alimentares", label: "Hábitos Alimentares", value: String(dados?.habitos_alimentares || ""), editing: false },
    { id: "observacoes", label: "Observações", value: String(dados?.observacoes || ""), editing: false },
  ];

  const [fields, setFields] = useState<DynamicField[]>(defaultFields);
  const [lastSavedFields, setLastSavedFields] = useState<string>(JSON.stringify(defaultFields.map(f => ({ id: f.id, value: f.value }))));

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
      alturaInput.focus();
      alturaInput.select();
      return;
    }
    if (!/^\d+$/.test(valor)) {
      event.preventDefault();
      alert("A altura deve ser informada usando apenas números inteiros.\n\nExemplo correto: 173");
      alturaInput.focus();
      alturaInput.select();
      return;
    }
  }

  const addField = useCallback(() => {
    setFields(prev => [...prev, {
      id: genFieldId(),
      label: "",
      value: "",
      editing: true,
    }]);
  }, []);

  const removeField = useCallback((fieldId: string) => {
    setFields(prev => prev.filter(f => f.id !== fieldId));
  }, []);

  const updateFieldLabel = useCallback((fieldId: string, label: string) => {
    setFields(prev => prev.map(f => f.id === fieldId ? { ...f, label } : f));
  }, []);

  const updateFieldValue = useCallback((fieldId: string, value: string) => {
    setFields(prev => prev.map(f => f.id === fieldId ? { ...f, value } : f));
  }, []);

  const toggleEditing = useCallback((fieldId: string) => {
    setFields(prev => prev.map(f => f.id === fieldId ? { ...f, editing: !f.editing } : f));
  }, []);

  const autoSave = useCallback(async () => {
    const currentState = JSON.stringify(fields.map(f => ({ id: f.id, value: f.value })));
    if (currentState === lastSavedFields) return;

    if (!formRef.current) return;
    setSaving(true);
    try {
      const formData = new FormData(formRef.current);
      fields.forEach(f => {
        formData.set(f.id, f.value);
      });
      await salvarAnamnese(pacienteId, formData);
      setLastSavedFields(currentState);
    } catch {
      // silent fail
    } finally {
      setSaving(false);
    }
  }, [fields, lastSavedFields, pacienteId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      autoSave();
    }, 2000);
    return () => clearTimeout(timer);
  }, [autoSave]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      autoSave();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [autoSave]);

  function importarGoogleForms() {
    const fieldsCopy = [...fields];
    Object.entries(googleData).forEach(([key, val]) => {
      if (!val) return;
      const existing = fieldsCopy.find(f => f.id === key || f.label.toLowerCase() === key.toLowerCase());
      if (existing) {
        existing.value = val;
      }
    });
    setFields(fieldsCopy);
    setShowGoogleModal(false);
    setGoogleData({});
    setGoogleFormsLink("");
  }

  return (
    <>
      <form
        ref={formRef}
        action={salvarAnamnese.bind(null, pacienteId)}
        onSubmit={validarFormulario}
        style={{
          background: "white",
          padding: "30px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ margin: 0 }}>Dados da Anamnese</h2>
          {saving && <span style={{ fontSize: "12px", color: "#94a3b8" }}>Salvando...</span>}
        </div>

        <div style={rowStyle}>
          <div style={campoPequenoStyle}>
            <input type="text" name="peso" placeholder="Peso (kg)" style={inputLinhaStyle} defaultValue={valorDecimal(dados?.peso)} />
          </div>
          <div style={campoPequenoStyle}>
            <input type="text" name="altura" placeholder="Altura (M)" style={inputLinhaStyle} defaultValue={valorInteiro(dados?.altura)} />
          </div>
          <div style={campoPequenoStyle}>
            <input type="text" name="imc" placeholder="IMC" style={inputLinhaStyle} defaultValue={valorDecimal(dados?.imc)} />
          </div>
          <div style={campoPequenoStyle}>
            <input type="text" name="percentual_gordura" placeholder="% Gordura" style={inputLinhaStyle} defaultValue={valorDecimal(dados?.percentual_gordura)} />
          </div>
          <div style={campoPequenoStyle}>
            <input type="text" name="massa_muscular" placeholder="Massa Muscular (kg)" style={inputLinhaStyle} defaultValue={valorDecimal(dados?.massa_muscular)} />
          </div>
          <div style={campoPequenoStyle}>
            <input type="text" name="agua_corporal" placeholder="Água Corporal (%)" style={inputLinhaStyle} defaultValue={valorDecimal(dados?.agua_corporal)} />
          </div>
        </div>

        <div style={{ marginBottom: "12px", maxWidth: "240px" }}>
          <input type="text" name="taxa_metabolica" placeholder="Taxa Metabólica" style={inputStyle} defaultValue={valorDecimal(dados?.taxa_metabolica)} />
        </div>

        {/* Dynamic Fields */}
        {fields.map((field) => (
          <div key={field.id} style={{ marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              {field.editing ? (
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) => updateFieldLabel(field.id, e.target.value)}
                  placeholder="Nome do campo..."
                  style={{
                    padding: "4px 8px",
                    border: "1.5px solid #3b82f6",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#1e40af",
                    outline: "none",
                    flex: 1,
                    maxWidth: "250px",
                  }}
                  autoFocus
                  onBlur={() => toggleEditing(field.id)}
                  onKeyDown={(e) => { if (e.key === "Enter") toggleEditing(field.id); }}
                />
              ) : (
                <span
                  style={{ fontSize: "13px", fontWeight: 600, color: "#374151", cursor: "pointer" }}
                  onClick={() => toggleEditing(field.id)}
                  title="Clique para renomear"
                >
                  {field.label || "(sem nome)"}
                </span>
              )}
              <button
                type="button"
                onClick={() => toggleEditing(field.id)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "#3b82f6", padding: "2px" }}
                title="Editar nome"
              >
                ✏️
              </button>
              <button
                type="button"
                onClick={() => removeField(field.id)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "15px", color: "#ef4444", padding: "2px", fontWeight: 700 }}
                title="Excluir campo"
              >
                ×
              </button>
            </div>
            <textarea
              name={field.id}
              rows={2}
              style={textareaStyle}
              value={field.value}
              onChange={(e) => updateFieldValue(field.id, e.target.value)}
            />
          </div>
        ))}

        {/* Add field button */}
        <div
          onClick={addField}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            border: "2px dashed #cbd5e1",
            borderRadius: "10px",
            padding: "10px",
            color: "#94a3b8",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            marginBottom: "12px",
          }}
        >
          + Adicionar Campo
        </div>

        <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
          <button
            type="button"
            onClick={() => setShowGoogleModal(true)}
            style={googleBtnStyle}
          >
            📋 Importar do Google Forms
          </button>
        </div>
      </form>

      {showGoogleModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, fontSize: "20px", color: "#1a365d" }}>
                📋 Importar do Google Forms
              </h2>
              <button
                onClick={() => setShowGoogleModal(false)}
                style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "#94a3b8" }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={modalLabelStyle}>Link do Google Forms</label>
              <input
                type="url"
                value={googleFormsLink}
                onChange={(e) => setGoogleFormsLink(e.target.value)}
                placeholder="https://docs.google.com/forms/..."
                style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e2e8f0", borderRadius: "8px", fontSize: "13px", boxSizing: "border-box" }}
              />
              <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                Cole o link do formulário. As respostas precisam ser preenchidas manualmente abaixo.
              </p>
            </div>

            <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px" }}>
              Preencha os campos abaixo com as respostas do formulário:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {fields.map(field => (
                <div key={field.id}>
                  <label style={modalLabelStyle}>{field.label || "(sem nome)"}</label>
                  <textarea
                    rows={2}
                    style={modalTextareaStyle}
                    value={googleData[field.id] || ""}
                    onChange={(e) => setGoogleData({ ...googleData, [field.id]: e.target.value })}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "20px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowGoogleModal(false)}
                style={{ padding: "10px 20px", background: "#e2e8f0", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", color: "#475569" }}
              >
                Cancelar
              </button>
              <button
                onClick={importarGoogleForms}
                style={{ padding: "10px 20px", background: "#4285f4", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}
              >
                Importar Dados
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const rowStyle = {
  display: "flex",
  gap: "12px",
  marginBottom: "12px",
  flexWrap: "nowrap" as const,
  alignItems: "stretch",
};

const campoPequenoStyle = {
  flex: 1,
  minWidth: 0,
};

const inputLinhaStyle = {
  width: "100%",
  padding: "12px",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  fontSize: "14px",
} as const;

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "12px",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  fontSize: "14px",
} as const;

const textareaStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  fontSize: "14px",
  resize: "vertical" as const,
  boxSizing: "border-box" as const,
} as const;

const googleBtnStyle = {
  padding: "12px 20px",
  backgroundColor: "#4285f4",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "600",
  display: "flex",
  alignItems: "center",
  gap: "6px",
} as const;

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalContentStyle: React.CSSProperties = {
  background: "white",
  borderRadius: "16px",
  padding: "30px",
  width: "90%",
  maxWidth: "600px",
  maxHeight: "85vh",
  overflowY: "auto",
  boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
};

const modalLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 600,
  color: "#374151",
  marginBottom: "4px",
};

const modalTextareaStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1.5px solid #e2e8f0",
  borderRadius: "8px",
  fontSize: "13px",
  resize: "vertical",
  boxSizing: "border-box",
};
