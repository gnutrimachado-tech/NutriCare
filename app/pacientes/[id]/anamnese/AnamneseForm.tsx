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

export default function AnamneseForm({
  pacienteId,
  dados,
}: Props) {

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

  // Snapshot of the FULL form (numeric inputs + dynamic fields) so we only
  // save to the DB when something actually changed.
  const lastSavedRef = useRef<string>("");

  const buildFormData = useCallback(() => {
    if (!formRef.current) return null;
    const formData = new FormData(formRef.current);
    fields.forEach(f => {
      formData.set(f.id, f.value);
    });
    return formData;
  }, [fields]);

  const autoSave = useCallback(async () => {
    const formData = buildFormData();
    if (!formData) return;
    const snapshot = JSON.stringify(Array.from(formData.entries()));
    if (snapshot === lastSavedRef.current) return; // nada mudou -> nao salva
    setSaving(true);
    try {
      await autoSalvarAnamnese(pacienteId, formData);
      lastSavedRef.current = snapshot;
    } catch {
      // silent fail
    } finally {
      setSaving(false);
    }
  }, [buildFormData, pacienteId]);

  // Define a linha de base assim que o formulario monta (dados ja salvos).
  useEffect(() => {
    const formData = buildFormData();
    if (formData) {
      lastSavedRef.current = JSON.stringify(Array.from(formData.entries()));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mantem a referencia mais recente do autoSave para usar no unmount/pagehide.
  const autoSaveRef = useRef(autoSave);
  useEffect(() => {
    autoSaveRef.current = autoSave;
  }, [autoSave]);

  // Debounce de digitacao em qualquer campo do formulario.
  const inputTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleFormInput = useCallback(() => {
    if (inputTimer.current) clearTimeout(inputTimer.current);
    inputTimer.current = setTimeout(() => {
      autoSaveRef.current();
    }, 1500);
  }, []);

  // Salva ao sair da aba (unmount na navegacao SPA) e ao fechar/atualizar.
  useEffect(() => {
    const handler = () => {
      autoSaveRef.current();
    };
    window.addEventListener("pagehide", handler);
    return () => {
      window.removeEventListener("pagehide", handler);
      autoSaveRef.current();
    };
  }, []);



  return (
    <>
      <form
        ref={formRef}
        action={salvarAnamnese.bind(null, pacienteId)}
        onSubmit={validarFormulario}
        onInput={handleFormInput}
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


      </form>


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
  display: "flex" as const,
  flexDirection: "column" as const,
};

const campoLabelStyle = {
  fontSize: "12px",
  fontWeight: 600,
  color: "#475569",
  marginBottom: "4px",
} as const;

const inputLinhaStyle = {
  width: "100%",
  padding: "12px",
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


