"use client";

import { salvarAnamnese } from "./actions";

type Props = {
  pacienteId: string;
  dados?: Record<string, unknown>;
};

export default function AnamneseForm({
  pacienteId,
  dados,
}: Props) {
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

  return (
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
        name="historico_saude"
        placeholder="Histórico Clínico"
        rows={4}
        style={textareaStyle}
        defaultValue={String(dados?.historico_saude || "")}
      />

      <textarea
        name="alergias"
        placeholder="Alergias"
        rows={4}
        style={textareaStyle}
        defaultValue={String(dados?.alergias || "")}
      />

      <textarea
        name="medicamentos"
        placeholder="Medicamentos"
        rows={4}
        style={textareaStyle}
        defaultValue={String(dados?.medicamentos || "")}
      />

      <textarea
        name="suplementos"
        placeholder="Suplementos"
        rows={4}
        style={textareaStyle}
        defaultValue={String(dados?.suplementos || "")}
      />

      <textarea
        name="observacoes"
        placeholder="Observações"
        rows={4}
        style={textareaStyle}
        defaultValue={String(dados?.observacoes || "")}
      />

      <button type="submit" style={buttonStyle}>
        Salvar Anamnese
      </button>
    </form>
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
} as const;
