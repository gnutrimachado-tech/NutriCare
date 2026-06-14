import Link from "next/link";
import { prisma } from "@/lib/prisma";

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

function formatarData(data: Date | null) {
  if (!data) return "--";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(data));
}

export default async function EvolucaoPage({ params }: Props) {
  const { id } = await params;

  const paciente = await prisma.pacientes.findUnique({
    where: {
      id,
    },
  });

  if (!paciente) {
    return <div>Paciente não encontrado.</div>;
  }

  const avaliacoes = await prisma.evolucao_corporal.findMany({
    where: {
      paciente_id: id,
    },
    orderBy: {
      created_at: "desc",
    },
  });

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <Link href={`/pacientes/${id}`}>
          <button style={buttonSecondary}>← Voltar ao Paciente</button>
        </Link>

        <Link href={`/pacientes/${id}/antropometria`}>
          <button style={buttonPrimary}>+ Nova Antropometria</button>
        </Link>
      </div>

      <h1
        style={{
          fontSize: "32px",
          marginBottom: "10px",
        }}
      >
        Evolução Corporal
      </h1>

      <p
        style={{
          color: "#64748b",
          marginBottom: "30px",
        }}
      >
        {paciente.nome}
      </p>

      <div
        style={{
          background: "white",
          padding: "30px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
        {avaliacoes.length === 0 ? (
          <p>Nenhuma avaliação corporal cadastrada.</p>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr>
                <th style={thStyle}>Data</th>
                <th style={thStyle}>Peso</th>
                <th style={thStyle}>% Gordura</th>
                <th style={thStyle}>Massa Muscular</th>
                <th style={thStyle}>Circ. Abdominal</th>
              </tr>
            </thead>
            <tbody>
              {avaliacoes.map((item) => (
                <tr key={item.id}>
                  <td style={tdStyle}>
                    {formatarData(item.created_at)}
                  </td>
                  <td style={tdStyle}>
                    {formatarNumero(item.peso)}
                  </td>
                  <td style={tdStyle}>
                    {formatarNumero(item.percentual_gordura)}
                  </td>
                  <td style={tdStyle}>
                    {formatarNumero(item.massa_muscular)}
                  </td>
                  <td style={tdStyle}>
                    {formatarNumero(
                      item.circunferencia_abdominal
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const thStyle = {
  textAlign: "left" as const,
  padding: "12px",
  borderBottom: "1px solid #e2e8f0",
};

const tdStyle = {
  padding: "12px",
  borderBottom: "1px solid #f1f5f9",
};

const buttonPrimary = {
  padding: "10px 16px",
  backgroundColor: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};

const buttonSecondary = {
  padding: "10px 16px",
  backgroundColor: "#e2e8f0",
  color: "#0f172a",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};
