import { salvarAntropometria } from "./actions";

type Props = {
  pacienteId: string;
};

export default function AntropometriaForm({
  pacienteId,
}: Props) {
  async function action(formData: FormData) {
    "use server";
    await salvarAntropometria(pacienteId, formData);
  }

  return (
    <form
      action={action}
      style={{
        background: "white",
        padding: "30px",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      }}
    >
      <h2 style={{ marginBottom: "20px" }}>
        Avaliação Antropométrica
      </h2>

      <input
        type="text"
        name="peso"
        placeholder="Peso (kg)"
        style={inputStyle}
      />

      <input
        type="text"
        name="percentual_gordura"
        placeholder="% Gordura"
        style={inputStyle}
      />

      <input
        type="text"
        name="massa_muscular"
        placeholder="Massa muscular (kg)"
        style={inputStyle}
      />

      <input
        type="text"
        name="circunferencia_abdominal"
        placeholder="Circunferência abdominal (cm)"
        style={inputStyle}
      />

      <textarea
        name="observacoes"
        placeholder="Observações"
        rows={4}
        style={textareaStyle}
      />

      <button type="submit" style={buttonStyle}>
        Salvar Antropometria
      </button>
    </form>
  );
}

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