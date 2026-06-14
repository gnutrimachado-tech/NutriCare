"use client";

import { atualizarPaciente, excluirPaciente } from "./actions";

type PacienteData = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  data_nascimento: Date | string | null;
  sexo: string | null;
  profissao: string | null;
  estado_civil: string | null;
  objetivo: string | null;
  observacoes: string | null;
};

type Props = {
  paciente: PacienteData;
};

export default function EditarPacienteForm({
  paciente,
}: Props) {
  const actionAtualizar = atualizarPaciente.bind(
    null,
    paciente.id
  );

  const actionExcluir = excluirPaciente.bind(
    null,
    paciente.id
  );

  return (
    <>
      <form
        action={actionAtualizar}
        style={{
          background: "white",
          padding: "30px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          marginBottom: "30px",
        }}
      >
        <h2 style={{ marginBottom: "20px" }}>
          Editar Paciente
        </h2>

        <div style={gridStyle}>
          <Input
            name="nome"
            label="Nome"
            defaultValue={paciente.nome || ""}
            required
          />

          <Input
            name="email"
            label="E-mail"
            defaultValue={paciente.email || ""}
          />

          <Input
            name="telefone"
            label="Telefone"
            defaultValue={paciente.telefone || ""}
          />

          <Input
            name="data_nascimento"
            label="Data de Nascimento"
            type="date"
            defaultValue={
              paciente.data_nascimento
                ? new Date(paciente.data_nascimento)
                    .toISOString()
                    .split("T")[0]
                : ""
            }
          />

          <Input
            name="sexo"
            label="Sexo"
            defaultValue={paciente.sexo || ""}
          />

          <Input
            name="profissao"
            label="Profissão"
            defaultValue={paciente.profissao || ""}
          />

          <Input
            name="estado_civil"
            label="Estado Civil"
            defaultValue={paciente.estado_civil || ""}
          />
        </div>

        <div style={{ marginTop: "20px" }}>
          <label>Objetivo</label>
          <textarea
            name="objetivo"
            defaultValue={paciente.objetivo || ""}
            style={textareaStyle}
          />
        </div>

        <div style={{ marginTop: "20px" }}>
          <label>Observações</label>
          <textarea
            name="observacoes"
            defaultValue={paciente.observacoes || ""}
            style={textareaStyle}
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "20px",
          }}
        >
          <button type="submit" style={buttonStyle}>
            Salvar Alterações
          </button>
        </div>
      </form>

      <form action={actionExcluir}>
        <button
          type="submit"
          style={deleteButtonStyle}
          onClick={(e) => {
            const confirmar = window.confirm(
              "Deseja realmente excluir este paciente?"
            );

            if (!confirmar) {
              e.preventDefault();
            }
          }}
        >
          Excluir Paciente
        </button>
      </form>
    </>
  );
}

function Input({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
}) {
  return (
    <div>
      <label>{label}</label>
      <input {...props} style={inputStyle} />
    </div>
  );
}

const gridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(250px, 1fr))",
  gap: "20px",
};

const inputStyle = {
  width: "100%",
  padding: "10px",
  marginTop: "5px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
};

const textareaStyle = {
  width: "100%",
  minHeight: "100px",
  padding: "10px",
  marginTop: "5px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
};

const buttonStyle = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "12px 24px",
  borderRadius: "8px",
  cursor: "pointer",
};

const deleteButtonStyle = {
  background: "#dc2626",
  color: "white",
  border: "none",
  padding: "12px 24px",
  borderRadius: "8px",
  cursor: "pointer",
};
