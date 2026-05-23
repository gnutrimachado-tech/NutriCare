import { prisma } from "@/lib/prisma";
import AnamneseForm from "./AnamneseForm";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AnamnesePage({ params }: Props) {
  const { id } = await params;

  // Buscar paciente
  const paciente = await prisma.pacientes.findUnique({
    where: { id },
  });

  if (!paciente) {
    return <div>Paciente não encontrado.</div>;
  }

  // Buscar anamnese
  const anamnese = await prisma.anamneses.findFirst({
    where: {
      paciente_id: id,
    },
  });

  // Converter Decimal do Prisma em objeto simples
  const anamneseSerializada = anamnese
    ? JSON.parse(JSON.stringify(anamnese))
    : null;

  return (
    <div>
      {/* Cabeçalho */}
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
        {/* Lado esquerdo */}
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

        {/* Botões lado direito */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
            marginTop: "4px",
          }}
        >
          <a
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
            ← Voltar ao Paciente
          </a>

          <a
            href={`/pacientes/${id}/antropometria`}
            style={{
              backgroundColor: "#16a34a",
              color: "#ffffff",
              padding: "10px 18px",
              borderRadius: "10px",
              textDecoration: "none",
              fontWeight: "600",
              fontSize: "14px",
              border: "none",
            }}
          >
            📏 Antropometria
          </a>
        </div>
      </div>

      {/* Formulário */}
      <AnamneseForm
        pacienteId={id}
        anamnese={anamneseSerializada}
      />
    </div>
  );
}