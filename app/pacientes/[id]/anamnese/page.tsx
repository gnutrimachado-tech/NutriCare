import { prisma } from "@/lib/prisma";
import AnamneseForm from "./AnamneseForm";
import PatientTabsNav from "@/components/PatientTabsNav";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AnamnesePage({ params }: Props) {
  const { id } = await params;

  const paciente = await prisma.pacientes.findUnique({
    where: { id },
  });

  if (!paciente) {
    return <div>Paciente não encontrado.</div>;
  }

  const anamnese = await prisma.anamneses.findFirst({
    where: {
      paciente_id: id,
    },
  });

  const anamneseSerializada = anamnese
    ? JSON.parse(JSON.stringify(anamnese))
    : null;

  return (
    <div>
      <div
        style={{
          textAlign: "center",
          marginBottom: "16px",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "42px",
            fontWeight: "700",
            color: "#0f172a",
            lineHeight: "1",
          }}
        >
          Anamnese
        </h1>

        <p
          style={{
            marginTop: "10px",
            color: "#64748b",
            fontSize: "18px",
          }}
        >
          Paciente: {paciente.nome}
        </p>
      </div>

      <PatientTabsNav patientId={id} activeTab="anamnese" />

      <AnamneseForm
        pacienteId={id}
        dados={anamneseSerializada}
      />
    </div>
  );
}
