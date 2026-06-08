import { prisma } from "@/lib/prisma";
import Link from "next/link";
import AnamneseForm from "./AnamneseForm";

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
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "30px",
          gap: "24px",
          flexWrap: "wrap",
        }}
      >
        <div>
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

        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
            marginTop: "4px",
          }}
        >
          <Link
            href={`/pacientes/${id}`}
            style={{
              backgroundColor: "#e2e8f0",
              color: "#0f172a",
              padding: "10px 18px",
              borderRadius: "10px",
              textDecoration: "none",
              fontWeight: "600",
              fontSize: "14px",
              border: "1px solid #cbd5e1",
            }}
          >
            ← Paciente
          </Link>

          <Link
            href={`/pacientes/${id}/antropometria`}
            style={{
              backgroundColor: "#2563eb",
              color: "#ffffff",
              padding: "10px 18px",
              borderRadius: "10px",
              textDecoration: "none",
              fontWeight: "600",
              fontSize: "14px",
              border: "none",
            }}
          >
            Antropometria →
          </Link>
        </div>
      </div>

      <AnamneseForm
        pacienteId={id}
        dados={anamneseSerializada}
      />
    </div>
  );
}
