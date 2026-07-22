import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EditarPacienteForm from "./EditarPacienteForm";
import PatientTabsNav from "@/components/PatientTabsNav";

export const dynamic = "force-dynamic";

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
          textAlign: "center",
          marginBottom: "16px",
        }}
      >
        <h1 style={{ fontSize: "32px", margin: 0 }}>
          Paciente
        </h1>
        <p style={{ margin: "10px 0 0", fontSize: "18px", color: "#64748b" }}>
          Paciente: {paciente.nome}
        </p>
      </div>

      <PatientTabsNav patientId={paciente.id} activeTab="paciente" />

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


