import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PlanoAlimentarLayout from "@/components/PlanoAlimentarLayout";

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

function calcularTMB(sexo: string, peso: number, altura: number, idade: number): number {
  if (sexo === "M") {
    return 88.362 + 13.397 * peso + 4.799 * altura - 5.677 * idade;
  }
  return 447.593 + 9.247 * peso + 3.098 * altura - 4.33 * idade;
}

export default async function PlanoAlimentarPage({ params }: Props) {
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

  const sexoPaciente =
    paciente.sexo === "Feminino" ||
    paciente.sexo === "feminino" ||
    paciente.sexo === "F"
      ? "Feminino"
      : "Masculino";

  const pesoKg = Number(anamnese?.peso ?? 0);
  const alturaCm = Number(anamnese?.altura ?? 0);
  const idade = calcularIdade(paciente.data_nascimento);

  const gastoCaloricoTotal = pesoKg > 0
    ? Math.round(calcularTMB(sexoPaciente === "Masculino" ? "M" : "F", pesoKg, alturaCm, idade))
    : null;

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
            <button style={buttonNav}>← Gasto Calórico</button>
          </Link>
          <Link href={`/pacientes/${id}`}>
            <button style={buttonNav}>← Voltar ao Paciente</button>
          </Link>
        </div>
      </div>

      <PlanoAlimentarLayout
        pacienteId={id}
        sexoPaciente={sexoPaciente}
        nomePaciente={paciente.nome}
        gastoCaloricoTotal={gastoCaloricoTotal}
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
