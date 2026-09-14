import { prisma } from "@/lib/prisma";
import {
  extrairSnapshotDeEvolucao,
  listarUltimasTresAvaliacoes,
  primeiraAvaliacao,
} from "@/lib/avaliacaoHistorico";
import AntropometriaLayout from "./AntropometriaLayout";
import PatientTabsNav from "@/components/PatientTabsNav";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
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
  if (mesAtual < mesNascimento || (mesAtual === mesNascimento && diaAtual < diaNascimento)) {
    idade--;
  }
  return idade;
}

export default async function AntropometriaPage({ params }: Props) {
  const { id } = await params;

  const paciente = await prisma.pacientes.findUnique({ where: { id } });
  if (!paciente) return <div>Paciente não encontrado.</div>;

  const anamnese = await prisma.anamneses.findFirst({
    where: { paciente_id: id },
    orderBy: { created_at: "desc" },
  });

  const sexoPaciente =
    paciente.sexo === "Feminino" || paciente.sexo === "feminino" || paciente.sexo === "F"
      ? "Feminino"
      : "Masculino";

  const idade = calcularIdade(paciente.data_nascimento);
  const pesoKg = Number(anamnese?.peso ?? 0);
  const alturaCm = Number(anamnese?.altura ?? 0);

  // Traz até 3 avaliações rotativas (1ª fixa + 2ª + 3ª mais recentes)
  const rotativas = await listarUltimasTresAvaliacoes(id);
  const historico = rotativas.map((r) => ({
    id: r.id,
    createdAt: r.created_at?.toISOString?.() || null,
    snapshot: extrairSnapshotDeEvolucao(r),
  }));

  // A referência para "Antes" é sempre a avaliação imediatamente anterior
  // na ordem real de criação. Isso também funciona quando várias avaliações
  // têm a mesma data de calendário.
  const primeira = await primeiraAvaliacao(id);
  const avaliacaoAnterior = rotativas.length
    ? extrairSnapshotDeEvolucao(rotativas[rotativas.length - 1])
    : primeira
      ? extrairSnapshotDeEvolucao(primeira)
      : null;

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: "16px" }}>
        <h1 style={{ margin: 0, fontSize: "48px", fontWeight: "bold", color: "#0f172a" }}>
          Antropometria
        </h1>
        <p style={{ margin: "8px 0 0 0", fontSize: "18px", color: "#64748b" }}>
          Paciente: {paciente.nome}
        </p>
      </div>

      <PatientTabsNav patientId={id} activeTab="antropometria" />

      <AntropometriaLayout
        pacienteId={id}
        sexoPaciente={sexoPaciente}
        idade={idade}
        pesoKg={pesoKg}
        alturaCm={alturaCm}
        avaliacaoAnteriorInicial={avaliacaoAnterior}
        historicoAvaliacoes={historico}
      />
    </div>
  );
}
