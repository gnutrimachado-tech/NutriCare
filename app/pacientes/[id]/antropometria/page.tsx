import { prisma } from "@/lib/prisma";
import AntropometriaLayout from "./AntropometriaLayout";
import PatientTabsNav from "@/components/PatientTabsNav";

export const dynamic = "force-dynamic";

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
  const idade = calcularIdade(paciente.data_nascimento);

  // ==============================
  // PESO
  // ==============================
  const pesoKg = Number(anamnese?.peso ?? 0);

  // ==============================
  // ALTURA
  // ==============================
  const alturaCm = Number(anamnese?.altura ?? 0);

  return (
    <div>
      {/* Cabeçalho */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "16px",
        }}
      >
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

      <PatientTabsNav patientId={id} activeTab="antropometria" />

      {/* LAYOUT */}
      <AntropometriaLayout
        pacienteId={id}
        sexoPaciente={sexoPaciente}
        idade={idade}
        pesoKg={pesoKg}
        alturaCm={alturaCm}
      />
    </div>
  );
}

