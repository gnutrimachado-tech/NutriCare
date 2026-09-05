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

  // "Antes" é a avaliação imediatamente anterior à data informada na Anamnese.
  // Assim, uma avaliação antiga não passa a ser comparada com uma avaliação
  // posterior apenas porque foi digitada agora.
  const dataAvaliacaoAtual = anamnese?.data_avaliacao?.getTime?.() ?? Date.now();
  const avaliacoesAnteriores = rotativas
    .filter((r) => {
      const snapshot = extrairSnapshotDeEvolucao(r);
      const dataRegistro =
        snapshot?.dataAvaliacao ||
        r.data_avaliacao?.toISOString?.() ||
        r.created_at?.toISOString?.() ||
        null;
      const timestamp = dataRegistro ? new Date(dataRegistro).getTime() : 0;
      return timestamp < dataAvaliacaoAtual;
    })
    .sort((a, b) => {
      const dataA = extrairSnapshotDeEvolucao(a)?.dataAvaliacao || a.data_avaliacao?.toISOString?.() || a.created_at?.toISOString?.() || "";
      const dataB = extrairSnapshotDeEvolucao(b)?.dataAvaliacao || b.data_avaliacao?.toISOString?.() || b.created_at?.toISOString?.() || "";
      return new Date(dataB).getTime() - new Date(dataA).getTime();
    });

  const primeira = await primeiraAvaliacao(id);
  const avaliacaoAnterior = avaliacoesAnteriores.length
    ? extrairSnapshotDeEvolucao(avaliacoesAnteriores[0])
    : primeira && new Date(
        extrairSnapshotDeEvolucao(primeira)?.dataAvaliacao ||
        primeira.data_avaliacao?.toISOString?.() ||
        primeira.created_at?.toISOString?.() ||
        0
      ).getTime() < dataAvaliacaoAtual
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
        dataAvaliacao={anamnese?.data_avaliacao?.toISOString?.() || null}
        avaliacaoAnteriorInicial={avaliacaoAnterior}
        historicoAvaliacoes={historico}
      />
    </div>
  );
}
