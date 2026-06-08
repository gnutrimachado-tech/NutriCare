"use client";

import { useState } from "react";
import Link from "next/link";

type Paciente = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  created_at: Date | null;
};

type Props = {
  pacientes: Paciente[];
};

export default function BuscaPacientes({ pacientes }: Props) {
  const [busca, setBusca] = useState("");

  const filtrados = pacientes.filter((p) =>
    p.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div>
      <div style={{ marginBottom: "16px" }}>
        <input
          type="text"
          placeholder="🔍 Buscar paciente pelo nome..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{
            width: "100%",
            padding: "14px 16px",
            border: "2px solid #e2e8f0",
            borderRadius: "10px",
            fontSize: "15px",
            outline: "none",
            transition: "border-color 0.2s",
            backgroundColor: "#f8fafc",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
          onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
        />
      </div>

      {filtrados.length === 0 ? (
        <p style={{ color: "#94a3b8", textAlign: "center", padding: "20px" }}>
          {busca ? `Nenhum paciente encontrado para "${busca}"` : "Nenhum paciente cadastrado."}
        </p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Nome</th>
              <th style={thStyle}>E-mail</th>
              <th style={thStyle}>Telefone</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((paciente) => (
              <tr key={paciente.id}>
                <td style={tdStyle}>
                  <Link
                    href={`/pacientes/${paciente.id}`}
                    style={{
                      color: "#2563eb",
                      textDecoration: "none",
                      fontWeight: "bold",
                    }}
                  >
                    {paciente.nome}
                  </Link>
                </td>
                <td style={tdStyle}>{paciente.email || "-"}</td>
                <td style={tdStyle}>{paciente.telefone || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const thStyle = {
  textAlign: "left" as const,
  padding: "12px",
  borderBottom: "1px solid #e2e8f0",
};

const tdStyle = {
  padding: "12px",
  borderBottom: "1px solid #f1f5f9",
};
