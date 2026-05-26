import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import EditarPacienteForm from "./EditarPacienteForm";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

function formatarNumero(valor: unknown) {
  if (valor === null || valor === undefined) return "-";
  const numero =
    typeof valor === "object" && valor !== null && "toNumber" in valor
      ? (valor as { toNumber: () => number }).toNumber()
      : Number(valor);
  if (isNaN(numero)) return "-";
  return numero.toFixed(2).replace(".", ",");
}

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

  const anamnese = await prisma.anamneses.findFirst({
    where: { paciente_id: id },
    orderBy: { created_at: "desc" },
  });

  const evolucao = await prisma.evolucao_corporal.findFirst({
    where: { paciente_id: id },
    orderBy: { created_at: "desc" },
  });

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

  const massaMuscular = anamnese?.massa_muscular ?? evolucao?.massa_muscular;
  const percentualGordura = anamnese?.percentual_gordura ?? evolucao?.percentual_gordura;
  const pesoKg = anamnese?.peso ? Number(anamnese.peso) : 0;
  const gorduraPct = percentualGordura ? Number(percentualGordura) : 0;
  const massaAdiposa = pesoKg > 0 && gorduraPct > 0 ? (pesoKg * gorduraPct / 100).toFixed(2).replace(".", ",") : "-";

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
              fontWeight: "600",
            }}
          >
            Próxima → Anamnese
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

        {/* Dados do histórico do paciente */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div style={historicoCard}>
            <div style={historicoLabel}>Massa Muscular</div>
            <div style={historicoValue}>
              {formatarNumero(massaMuscular)} <span style={historicoUnit}>kg</span>
            </div>
          </div>
          <div style={historicoCard}>
            <div style={historicoLabel}>Massa Adiposa</div>
            <div style={historicoValue}>
              {massaAdiposa} <span style={historicoUnit}>kg</span>
            </div>
          </div>
          <div style={historicoCard}>
            <div style={historicoLabel}>% Gordura</div>
            <div style={historicoValue}>
              {formatarNumero(percentualGordura)} <span style={historicoUnit}>%</span>
            </div>
          </div>
        </div>

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

const historicoCard: React.CSSProperties = {
  background: "white",
  borderRadius: "14px",
  padding: "20px",
  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  border: "1px solid #edf2f7",
  textAlign: "center",
};

const historicoLabel: React.CSSProperties = {
  fontSize: "12px",
  color: "#64748b",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  marginBottom: "4px",
};

const historicoValue: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 800,
  color: "#1a202c",
};

const historicoUnit: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 500,
  color: "#94a3b8",
};
