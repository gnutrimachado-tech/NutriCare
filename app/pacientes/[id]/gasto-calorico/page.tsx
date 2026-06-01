import Link from "next/link";
import { prisma } from "@/lib/prisma";
import GastoCaloricoLayout from "@/components/GastoCaloricoLayout";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

function calcularIdade(dataNascimento: Date | null): number {
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

export default async function GastoCaloricoPage({ params }: Props) {
  const { id } = await params;

  const paciente = await prisma.pacientes.findUnique({
    where: { id },
  });

  if (!paciente) {
    return <div>Paciente não encontrado.</div>;
  }

  const anamnese = await prisma.anamneses.findFirst({
    where: { paciente_id: id },
    orderBy: { created_at: "desc" },
  });

  const evolucao = await prisma.evolucao_corporal.findFirst({
    where: { paciente_id: id },
    orderBy: { created_at: "desc" },
  });

  const sexoPaciente =
    paciente.sexo === "Feminino" ||
    paciente.sexo === "feminino" ||
    paciente.sexo === "F"
      ? "Feminino"
      : "Masculino";

  const idade = calcularIdade(paciente.data_nascimento);

  const pesoKg = Number(anamnese?.peso ?? 0);
  const alturaCm = Number(anamnese?.altura ?? 0);
  const percentualGordura = Number(anamnese?.percentual_gordura ?? 0);

  const massaMuscularAnamnese = anamnese?.massa_muscular ? Number(anamnese.massa_muscular) : null;
  const massaMuscularAntropometria = evolucao?.massa_muscular ? Number(evolucao.massa_muscular) : null;

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
            Gasto Calórico
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
          <Link href={`/pacientes/${id}/antropometria`}>
            <button style={buttonNav}>← Anterior</button>
          </Link>
          <Link href={`/pacientes/${id}/plano-alimentar`}>
            <button style={buttonNavNext}>Próxima →</button>
          </Link>
        </div>
      </div>

      <GastoCaloricoLayout
        pacienteId={id}
        sexoPaciente={sexoPaciente}
        idade={idade}
        pesoKg={pesoKg}
        alturaCm={alturaCm}
        percentualGordura={percentualGordura}
        nomePaciente={paciente.nome}
        massaMuscularAnamnese={massaMuscularAnamnese}
        massaMuscularAntropometria={massaMuscularAntropometria}
      />
    </div>
  );
}

const buttonNav: React.CSSProperties = {
  padding: "10px 16px",
  backgroundColor: "#e2e8f0",
  color: "#0f172a",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "600",
};

const buttonNavNext: React.CSSProperties = {
  padding: "10px 16px",
  backgroundColor: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "600",
};
