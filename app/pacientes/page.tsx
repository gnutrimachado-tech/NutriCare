import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import NovoPacienteForm from "./NovoPacienteForm";
import BuscaPacientes from "./BuscaPacientes";

export const dynamic = "force-dynamic";

export default async function PacientesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  const nutricionistaId = (session.user as { id?: string }).id;
  if (!nutricionistaId) redirect("/");

  const pacientes = await prisma.pacientes.findMany({
    where: { nutricionista_id: nutricionistaId },
    orderBy: { created_at: "desc" },
    take: 200,
  });

  const pacientesSerializados = pacientes.map((p) => ({
    id: p.id,
    nome: p.nome,
    email: p.email,
    telefone: p.telefone,
    created_at: p.created_at,
  }));

  return (
    <div>
      <h1 style={{ fontSize: "32px", marginBottom: "20px" }}>Pacientes</h1>

      <NovoPacienteForm />

      <div
        style={{
          background: "white",
          padding: "30px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
        <h2 style={{ marginBottom: "20px" }}>Lista de Pacientes</h2>
        <BuscaPacientes pacientes={pacientesSerializados} />
      </div>
    </div>
  );
}
