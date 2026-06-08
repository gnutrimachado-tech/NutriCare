import Link from "next/link";
import { prisma } from "@/lib/prisma";
import EnvioPlanoLayout from "@/components/EnvioPlanoLayout";

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

export default async function EnvioPlanoPage({ params }: Props) {
  const { id } = await params;

  const paciente = await prisma.pacientes.findUnique({
    where: { id },
  });

  if (!paciente) {
    return <div>Paciente no encontrado.</div>;
  }

  const anamnese = await prisma.anamneses.findFirst({
    where: { paciente_id: id },
    orderBy: { created_at: "desc" },
  });

  const sexoPaciente =
    paciente.sexo === "Feminino" ||
    paciente.sexo === "feminino" ||
    paciente.sexo === "F"
      ? "Feminino"
      : "Masculino";

  const pesoKg = Number(anamnese?.peso ?? 0);
  const alturaCm = Number(anamnese?.altura ?? 0);
  const idade = calcularIdade(paciente.data_nascimento);
  const massaMuscular = Number(anamnese?.massa_muscular ?? 0);
  const massaAdiposa = Number(anamnese?.massa_adiposa ?? 0);
  const percGordura = Number(anamnese?.percentual_gordura ?? 0);

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
            Envio do Plano
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
          <Link href={`/pacientes/${id}/plano-alimentar`}>
            <button style={buttonNav}>← Plano Alimentar</button>
          </Link>
          <Link href={`/pacientes/${id}`}>
            <button style={buttonNav}>← Voltar ao Paciente</button>
          </Link>
        </div>
      </div>

      <EnvioPlanoLayout
        pacienteId={id}
        nomePaciente={paciente.nome}
        sexoPaciente={sexoPaciente}
        dataNascimento={
          paciente.data_nascimento
            ? paciente.data_nascimento.toISOString().split("T")[0]
            : ""
        }
        pesoKg={pesoKg}
        alturaCm={alturaCm}
        idade={idade}
        massaMuscular={massaMuscular}
        massaAdiposa={massaAdiposa}
        percGordura={percGordura}
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
