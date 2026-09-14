import { prisma } from "@/lib/prisma";
import {
  extrairSnapshotDeEvolucao,
  listarUltimasTresAvaliacoes,
  ordenarAvaliacoes,
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
  // Ordena pela DATA DA AVALIAÇÃO (a informada pelo nutri): a 1ª é a mais
  // antiga, a 3ª a mais recente. createdAt desempata datas iguais.
  const rotativasOrdenadas = ordenarAvaliacoes(rotativas);
  const historico = rotativasOrdenadas.map((r) => {
    const snapshot = extrairSnapshotDeEvolucao(r);
    return {
      id: r.id,
      createdAt: r.created_at?.toISOString?.() || null,
      dataAvaliacao:
        snapshot?.dataAvaliacao || r.data_avaliacao?.toISOString?.() || null,
      snapshot,
    };
  });

  // A referência para "Antes" (Dobras/Circunferências) é SEMPRE a 1ª
  // avaliação — a de data MAIS ANTIGA — nunca a imediatamente anterior.
  const avaliacaoAnterior = rotativasOrdenadas.length
    ? extrairSnapshotDeEvolucao(rotativasOrdenadas[0])
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
