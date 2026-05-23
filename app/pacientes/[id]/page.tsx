import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import EditarPacienteForm from "./EditarPacienteForm";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PacienteDetalhePage({
  params,
}: Props) {
  const { id } = await params;

  const paciente = await prisma.pacientes.findUnique({
    where: {
      id,
    },
  });

  if (!paciente) {
    notFound();
  }

  const dataNascimentoFormatada = paciente.data_nascimento
    ? (() => {
        const data = new Date(paciente.data_nascimento);
        const ano = data.getUTCFullYear();
        const mes = String(
          data.getUTCMonth() + 1
        ).padStart(2, "0");
        const dia = String(
          data.getUTCDate()
        ).padStart(2, "0");

        return `${dia}/${mes}/${ano}`;
      })()
    : "-";

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h1 style={{ fontSize: "32px" }}>
          {paciente.nome}
        </h1>

        <div
          style={{
            display: "flex",
            gap: "10px",
          }}
        >
          <Link
            href={`/pacientes/${paciente.id}/anamnese`}
            style={{
              textDecoration: "none",
              background: "#2563eb",
              color: "white",
              padding: "10px 16px",
              borderRadius: "8px",
            }}
          >
            Anamnese
          </Link>

          <Link
            href="/pacientes"
            style={{
              textDecoration: "none",
              background: "#e2e8f0",
              padding: "10px 16px",
              borderRadius: "8px",
              color: "#0f172a",
            }}
          >
            ← Voltar
          </Link>
        </div>
      </div>

      <EditarPacienteForm paciente={paciente} />

      <div
        style={{
          background: "white",
          padding: "30px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          marginTop: "30px",
        }}
      >
        <h2 style={{ marginBottom: "20px" }}>
          Informações Atuais
        </h2>

        <p><strong>Nome:</strong> {paciente.nome}</p>
        <p><strong>E-mail:</strong> {paciente.email || "-"}</p>
        <p><strong>Telefone:</strong> {paciente.telefone || "-"}</p>
        <p><strong>Data de Nascimento:</strong> {dataNascimentoFormatada}</p>
        <p><strong>Sexo:</strong> {paciente.sexo || "-"}</p>
        <p><strong>Profissão:</strong> {paciente.profissao || "-"}</p>
        <p><strong>Estado Civil:</strong> {paciente.estado_civil || "-"}</p>
        <p><strong>Objetivo:</strong> {paciente.objetivo || "-"}</p>
        <p><strong>Observações:</strong> {paciente.observacoes || "-"}</p>
      </div>
    </div>
  );
}