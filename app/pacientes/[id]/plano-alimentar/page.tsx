import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PlanoAlimentarLayout from "@/components/PlanoAlimentarLayout";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PlanoAlimentarPage({ params }: Props) {
  const { id } = await params;

  const paciente = await prisma.pacientes.findUnique({
    where: { id },
  });

  if (!paciente) {
    return <div>Paciente não encontrado.</div>;
  }

  const sexoPaciente =
    paciente.sexo === "Feminino" ||
    paciente.sexo === "feminino" ||
    paciente.sexo === "F"
      ? "Feminino"
      : "Masculino";

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "24px",
          marginBottom: "24px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "48px",
              fontWeight: "bold",
              color: "#0f172a",
            }}
          >
            Plano Alimentar
          </h1>
          <p
            style={{
              margin: "8px 0 0 0",
              fontSize: "18px",
              color: "#64748b",
            }}
          >
            Paciente: {paciente.nome}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
            marginTop: "8px",
          }}
        >
          <Link href={`/pacientes/${id}/gasto-calorico`}>
            <button style={buttonSecondary}>← Voltar ao Gasto Calórico</button>
          </Link>
          <Link href={`/pacientes/${id}`}>
            <button style={buttonSecondary}>← Voltar ao Paciente</button>
          </Link>
        </div>
      </div>

      <PlanoAlimentarLayout
        sexoPaciente={sexoPaciente}
        nomePaciente={paciente.nome}
      />
    </div>
  );
}

const buttonSecondary: React.CSSProperties = {
  padding: "10px 16px",
  backgroundColor: "#e2e8f0",
  color: "#0f172a",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};
