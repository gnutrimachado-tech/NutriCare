"use client";

import { useState } from "react";
import { salvarAnamnese } from "./actions";

type Props = {
  pacienteId: string;
  dados?: Record<string, unknown>;
};

export default function AnamneseForm({
  pacienteId,
  dados,
}: Props) {
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleData, setGoogleData] = useState({
    historico_clinico: "",
    alergias: "",
    medicamentos: "",
    suplementos: "",
    habitos_alimentares: "",
    observacoes: "",
  });
  const [formValues, setFormValues] = useState({
    historico_clinico: String(dados?.historico_clinico || ""),
    alergias: String(dados?.alergias || ""),
    medicamentos: String(dados?.medicamentos || ""),
    suplementos: String(dados?.suplementos || ""),
    habitos_alimentares: String(dados?.habitos_alimentares || ""),
    observacoes: String(dados?.observacoes || ""),
  });

  function valorDecimal(valor: unknown) {
    if (valor === null || valor === undefined) {
      return "";
    }

    const numero =
      typeof valor === "object" && valor !== null && "toNumber" in valor
        ? (valor as { toNumber: () => number }).toNumber()
        : Number(valor);

    if (isNaN(numero)) {
      return "";
    }

    return numero.toString().replace(".", ",");
  }

  function valorInteiro(valor: unknown) {
    if (valor === null || valor === undefined) {
      return "";
    }

    const numero =
      typeof valor === "object" && valor !== null && "toNumber" in valor
        ? (valor as { toNumber: () => number }).toNumber()
        : Number(valor);

    if (isNaN(numero)) {
      return "";
    }

    return Math.round(numero).toString();
  }

  function validarFormulario(
    event: React.FormEvent<HTMLFormElement>
  ) {
    const form = event.currentTarget;
    const alturaInput = form.elements.namedItem(
      "altura"
    ) as HTMLInputElement | null;

    if (!alturaInput) return;

    const valor = alturaInput.value.trim();

    if (valor === "") {
      return;
    }

    if (valor.includes(".") || valor.includes(",")) {
      event.preventDefault();
      alert(
        "A altura deve ser informada sem ponto ou vírgula.\n\nDigite apenas valor inteiro.\nExemplo correto: 173"
      );
      alturaInput.focus();
      alturaInput.select();
      return;
    }

    if (!/^\d+$/.test(valor)) {
      event.preventDefault();
      alert(
        "A altura deve ser informada usando apenas números inteiros.\n\nExemplo correto: 173"
      );
      alturaInput.focus();
      alturaInput.select();
      return;
    }
  }

  function importarGoogleForms() {
    setFormValues({
      historico_clinico: googleData.historico_clinico || formValues.historico_clinico,
      alergias: googleData.alergias || formValues.alergias,
      medicamentos: googleData.medicamentos || formValues.medicamentos,
      suplementos: googleData.suplementos || formValues.suplementos,
      habitos_alimentares: googleData.habitos_alimentares || formValues.habitos_alimentares,
      observacoes: googleData.observacoes || formValues.observacoes,
    });
    setShowGoogleModal(false);
    setGoogleData({
      historico_clinico: "",
      alergias: "",
      medicamentos: "",
      suplementos: "",
      habitos_alimentares: "",
      observacoes: "",
    });
  }

  return (
    <>
      <form
        action={salvarAnamnese.bind(null, pacienteId)}
        onSubmit={validarFormulario}
        style={{
          background: "white",
          padding: "30px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
        <h2 style={{ marginBottom: "20px" }}>
          Dados da Anamnese
        </h2>

        <div style={rowStyle}>
          <div style={campoPequenoStyle}>
            <input
              type="text"
              name="peso"
              placeholder="Peso (kg)"
              style={inputLinhaStyle}
              defaultValue={valorDecimal(dados?.peso)}
            />
          </div>

          <div style={campoPequenoStyle}>
            <input
              type="text"
              name="altura"
              placeholder="Altura (M)"
              style={inputLinhaStyle}
              defaultValue={valorInteiro(dados?.altura)}
            />
          </div>

          <div style={campoPequenoStyle}>
            <input
              type="text"
              name="imc"
              placeholder="IMC"
              style={inputLinhaStyle}
              defaultValue={valorDecimal(dados?.imc)}
            />
          </div>

          <div style={campoPequenoStyle}>
            <input
              type="text"
              name="percentual_gordura"
              placeholder="% Gordura"
              style={inputLinhaStyle}
              defaultValue={valorDecimal(
                dados?.percentual_gordura
              )}
            />
          </div>

          <div style={campoPequenoStyle}>
            <input
              type="text"
              name="massa_muscular"
              placeholder="Massa Muscular (kg)"
              style={inputLinhaStyle}
              defaultValue={valorDecimal(
                dados?.massa_muscular
              )}
            />
          </div>

          <div style={campoPequenoStyle}>
            <input
              type="text"
              name="agua_corporal"
              placeholder="Água Corporal (%)"
              style={inputLinhaStyle}
              defaultValue={valorDecimal(
                dados?.agua_corporal
              )}
            />
          </div>
        </div>

        <div style={{ marginBottom: "12px", maxWidth: "240px" }}>
          <input
            type="text"
            name="taxa_metabolica"
            placeholder="Taxa Metabólica"
            style={inputStyle}
            defaultValue={valorDecimal(
              dados?.taxa_metabolica
            )}
          />
        </div>

        <textarea
          name="historico_clinico"
          placeholder="Histórico Clínico"
          rows={4}
          style={textareaStyle}
          value={formValues.historico_clinico}
          onChange={(e) => setFormValues({ ...formValues, historico_clinico: e.target.value })}
        />

        <textarea
          name="alergias"
          placeholder="Alergias"
          rows={4}
          style={textareaStyle}
          value={formValues.alergias}
          onChange={(e) => setFormValues({ ...formValues, alergias: e.target.value })}
        />

        <textarea
          name="medicamentos"
          placeholder="Medicamentos"
          rows={4}
          style={textareaStyle}
          value={formValues.medicamentos}
          onChange={(e) => setFormValues({ ...formValues, medicamentos: e.target.value })}
        />

        <textarea
          name="suplementos"
          placeholder="Suplementos"
          rows={4}
          style={textareaStyle}
          value={formValues.suplementos}
          onChange={(e) => setFormValues({ ...formValues, suplementos: e.target.value })}
        />

        <textarea
          name="habitos_alimentares"
          placeholder="Hábitos Alimentares"
          rows={4}
          style={textareaStyle}
          value={formValues.habitos_alimentares}
          onChange={(e) => setFormValues({ ...formValues, habitos_alimentares: e.target.value })}
        />

        <textarea
          name="observacoes"
          placeholder="Observações"
          rows={4}
          style={textareaStyle}
          value={formValues.observacoes}
          onChange={(e) => setFormValues({ ...formValues, observacoes: e.target.value })}
        />

        <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
          <button
            type="button"
            onClick={() => setShowGoogleModal(true)}
            style={googleBtnStyle}
          >
            📋 Importar do Google Forms
          </button>

          <button type="submit" style={buttonStyle}>
            Salvar Anamnese
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

            <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "20px" }}>
              Cole abaixo os dados recebidos do Google Forms para preencher automaticamente os campos da anamnese.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={modalLabelStyle}>Histórico Clínico</label>
                <textarea
                  rows={3}
                  style={modalTextareaStyle}
                  placeholder="Cole aqui o histórico clínico..."
                  value={googleData.historico_clinico}
                  onChange={(e) => setGoogleData({ ...googleData, historico_clinico: e.target.value })}
                />
              </div>
              <div>
                <label style={modalLabelStyle}>Alergias</label>
                <textarea
                  rows={2}
                  style={modalTextareaStyle}
                  placeholder="Cole aqui as alergias..."
                  value={googleData.alergias}
                  onChange={(e) => setGoogleData({ ...googleData, alergias: e.target.value })}
                />
              </div>
              <div>
                <label style={modalLabelStyle}>Medicamentos</label>
                <textarea
                  rows={2}
                  style={modalTextareaStyle}
                  placeholder="Cole aqui os medicamentos..."
                  value={googleData.medicamentos}
                  onChange={(e) => setGoogleData({ ...googleData, medicamentos: e.target.value })}
                />
              </div>
              <div>
                <label style={modalLabelStyle}>Suplementos</label>
                <textarea
                  rows={2}
                  style={modalTextareaStyle}
                  placeholder="Cole aqui os suplementos..."
                  value={googleData.suplementos}
                  onChange={(e) => setGoogleData({ ...googleData, suplementos: e.target.value })}
                />
              </div>
              <div>
                <label style={modalLabelStyle}>Hábitos Alimentares</label>
                <textarea
                  rows={2}
                  style={modalTextareaStyle}
                  placeholder="Cole aqui os hábitos alimentares..."
                  value={googleData.habitos_alimentares}
                  onChange={(e) => setGoogleData({ ...googleData, habitos_alimentares: e.target.value })}
                />
              </div>
              <div>
                <label style={modalLabelStyle}>Observações</label>
                <textarea
                  rows={2}
                  style={modalTextareaStyle}
                  placeholder="Cole aqui as observações..."
                  value={googleData.observacoes}
                  onChange={(e) => setGoogleData({ ...googleData, observacoes: e.target.value })}
                />
              </div>
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
  padding: "12px",
  marginBottom: "12px",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  fontSize: "14px",
  resize: "vertical" as const,
} as const;

const buttonStyle = {
  padding: "12px 20px",
  backgroundColor: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "600",
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
