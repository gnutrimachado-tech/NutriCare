import Link from "next/link";
import { prisma } from "@/lib/prisma";
import NovoPacienteForm from "./NovoPacienteForm";

export const dynamic = "force-dynamic";

export default async function PacientesPage() {
  const pacientes = await prisma.pacientes.findMany({
    orderBy: {
      created_at: "desc",
    },
    take: 50,
  });

  return (
    <div>
      <h1 style={{ fontSize: "32px", marginBottom: "20px" }}>
        Pacientes
      </h1>

      <NovoPacienteForm />

      <div
        style={{
          background: "white",
          padding: "30px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
        <h2 style={{ marginBottom: "20px" }}>Lista de Pacientes</h2>

        {pacientes.length === 0 ? (
          <p>Nenhum paciente cadastrado.</p>
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
              {pacientes.map((paciente) => (
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