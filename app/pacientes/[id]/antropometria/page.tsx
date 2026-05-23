import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AntropometriaLayout from "./AntropometriaLayout";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

function calcularIdade(dataNascimento: Date | string | null): number {
  if (!dataNascimento) return 0;

  const nascimento = new Date(dataNascimento);
  const hoje = new Date();

  let idade = hoje.getFullYear() - nascimento.getFullYear();

  const mesAtual = hoje.getMonth();
  const diaAtual = hoje.getDate();

  const mesNascimento = nascimento.getMonth();
  const diaNascimento = nascimento.getDate();

  if (
    mesAtual < mesNascimento ||
    (mesAtual === mesNascimento && diaAtual < diaNascimento)
  ) {
    idade--;
  }

  return idade;
}

export default async function AntropometriaPage({
  params,
}: Props) {
  const { id } = await params;

  // ==============================
  // BUSCAR PACIENTE
  // ==============================
  const paciente = await prisma.pacientes.findUnique({
    where: { id },
  });

  if (!paciente) {
    return <div>Paciente não encontrado.</div>;
  }

  // ==============================
  // BUSCAR ANAMNESE
  // ==============================
  const anamnese = await prisma.anamneses.findFirst({
    where: {
      paciente_id: id,
    },
    orderBy: {
      created_at: "desc",
    },
  });

  // ==============================
  // SEXO
  // ==============================
  const sexoPaciente =
    paciente.sexo === "Feminino" ||
    paciente.sexo === "feminino" ||
    paciente.sexo === "F"
      ? "Feminino"
      : "Masculino";

  // ==============================
  // IDADE
  // ==============================
  const idade =
    Number(paciente.idade ?? 0) > 0
      ? Number(paciente.idade)
      : calcularIdade(
          (paciente as any).data_nascimento ??
            (paciente as any).dataNascimento ??
            null
        );

  // ==============================
  // PESO
  // ==============================
  const pesoKg = Number(
    (anamnese as any)?.peso_atual ??
      (anamnese as any)?.pesoAtual ??
      (anamnese as any)?.peso ??
      (anamnese as any)?.peso_kg ??
      0
  );

  // ==============================
  // ALTURA
  // ==============================
  const alturaCm = Number(
    (anamnese as any)?.altura ??
      (anamnese as any)?.altura_cm ??
      (anamnese as any)?.alturaCm ??
      0
  );

  return (
    <div>
      {/* Cabeçalho */}
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
        {/* Título */}
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "48px",
              fontWeight: "bold",
              color: "#0f172a",
            }}
          >
            Antropometria
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

        {/* BOTÕES */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
            marginTop: "8px",
          }}
        >
          {/* VOLTAR */}
          <Link href={`/pacientes/${id}`}>
            <button style={buttonSecondary}>
              ← Voltar ao Paciente
            </button>
          </Link>

          {/* GASTO CALÓRICO */}
          <Link href={`/pacientes/${id}/gasto-calorico`}>
            <button style={buttonPrimary}>
              🔥 Gasto Calórico
            </button>
          </Link>
        </div>
      </div>

      {/* LAYOUT */}
      <AntropometriaLayout
        sexoPaciente={sexoPaciente}
        idade={idade}
        pesoKg={pesoKg}
        alturaCm={alturaCm}
      />
    </div>
  );
}

const buttonPrimary = {
  padding: "10px 16px",
  backgroundColor: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};

const buttonSecondary = {
  padding: "10px 16px",
  backgroundColor: "#e2e8f0",
  color: "#0f172a",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};