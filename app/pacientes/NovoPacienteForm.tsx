"use client";

import { criarPaciente } from "./actions";

export default function NovoPacienteForm() {
  return (
    <form
      action={criarPaciente}
      style={{
        background: "#ffffff",
        padding: "24px",
        borderRadius: "12px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
        marginBottom: "30px",
      }}
    >
      <h2 style={{ marginBottom: "20px" }}>Novo Paciente</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "15px",
        }}
      >
        <input
          type="text"
          name="nome"
          placeholder="Nome completo"
          required
          style={inputStyle}
        />

        <input
          type="email"
          name="email"
          placeholder="E-mail"
          style={inputStyle}
        />

        <input
          type="text"
          name="telefone"
          placeholder="Telefone"
          style={inputStyle}
        />

        <input
          type="date"
          name="data_nascimento"
          style={inputStyle}
        />

        <select
          name="sexo"
          style={inputStyle}
          defaultValue=""
        >
          <option value="">Sexo</option>
          <option value="Masculino">Masculino</option>
          <option value="Feminino">Feminino</option>
          <option value="Outro">Outro</option>
        </select>

        <input
          type="text"
          name="profissao"
          placeholder="Profissão"
          style={inputStyle}
        />

        <input
          type="text"
          name="estado_civil"
          placeholder="Estado civil"
          style={inputStyle}
        />
      </div>

      <textarea
        name="objetivo"
        placeholder="Objetivo do paciente"
        rows={3}
        style={{
          ...inputStyle,
          width: "100%",
          marginTop: "15px",
          resize: "vertical",
        }}
      />

      <textarea
        name="observacoes"
        placeholder="Observações"
        rows={4}
        style={{
          ...inputStyle,
          width: "100%",
          marginTop: "15px",
          resize: "vertical",
        }}
      />

      <button
        type="submit"
        style={{
          marginTop: "20px",
          background: "#16a34a",
          color: "#ffffff",
          border: "none",
          padding: "12px 20px",
          borderRadius: "8px",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        Salvar Paciente
      </button>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "14px",
  boxSizing: "border-box",
};
