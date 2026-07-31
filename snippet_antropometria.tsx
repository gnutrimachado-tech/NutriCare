// snippet_antropometria.tsx
// NÃO É UM ARQUIVO PARA COLOCAR 1:1 — é um trecho de referência.
// Abra o arquivo real: app/pacientes/[id]/antropometria/page.tsx
// Faça APENAS as 2 alterações abaixo:

// 1) REMOVA o bloco de "confirmação por voz" (input checkbox + <VoiceConfirm/>
//    + texto "registro por voz"). Apague o import { VoiceConfirm } se existir.

// 2) ADICIONE este par de botões onde hoje aparece o botão "Salvar" ou logo
//    abaixo do card "Resultados". Eles batem nas rotas proxy /api/... :

import { useState } from "react";

function BotoesAvaliacaoFisica({ payload }: { payload: any }) {
  const [loadingEnv, setLoadingEnv] = useState(false);
  const [loadingDown, setLoadingDown] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function enviar() {
    setMsg(null);
    setLoadingEnv(true);
    try {
      const r = await fetch("/api/avaliacao-fisica/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.erro ?? "Falha");
      setMsg("Avaliação enviada ao paciente ✓");
    } catch (e: any) {
      setMsg("Erro ao enviar: " + (e?.message ?? e));
    } finally {
      setLoadingEnv(false);
    }
  }

  async function download() {
    setMsg(null);
    setLoadingDown(true);
    try {
      const r = await fetch("/api/avaliacao-fisica/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.erro ?? "Falha");
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `avaliacao-${(payload?.paciente?.nome ?? "paciente")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setMsg("Erro ao baixar: " + (e?.message ?? e));
    } finally {
      setLoadingDown(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
      <button
        type="button"
        onClick={enviar}
        disabled={loadingEnv}
        style={{
          padding: "10px 16px",
          background: "#0F3D2E",
          color: "#fff",
          borderRadius: 8,
          border: "none",
          cursor: "pointer",
        }}
      >
        {loadingEnv ? "Enviando..." : "Enviar Avaliação Física"}
      </button>

      <button
        type="button"
        onClick={download}
        disabled={loadingDown}
        style={{
          padding: "10px 16px",
          background: "#fff",
          color: "#0F3D2E",
          border: "1px solid #0F3D2E",
          borderRadius: 8,
          cursor: "pointer",
        }}
      >
        {loadingDown ? "Baixando..." : "Download do PDF"}
      </button>

      {msg && (
        <span style={{ alignSelf: "center", color: "#0F3D2E", fontSize: 13 }}>
          {msg}
        </span>
      )}
    </div>
  );
}

// Como usar dentro do JSX da sua página Antropometria:
//
//   <BotoesAvaliacaoFisica
//     payload={{
//       paciente: {
//         nome: paciente.nome,
//         email: paciente.email,
//         sexo: paciente.sexo,            // "M" ou "F"
//         idade: paciente.idade,
//         altura_cm: paciente.altura_cm,
//       },
//       avaliacao: {
//         data: new Date().toLocaleDateString("pt-BR"),
//         pesoKg: Number(peso),
//         alturaM: Number(altura_cm) / 100,
//         pctAgua: Number(pctAgua),
//         massaMagraKg: Number(massaMagra),
//         massaGordaKg: Number(massaGorda),
//         bfPct: Number(bfPct),
//         massaMuscularEsqueleticaKg: Number(massaMuscularEsq),
//         massaLivreGorduraKg: Number(peso) - Number(massaGorda),
//         taxaMetabolicaBasal: Number(bmr),
//         circunferencias: linhasCircunferencia,
//         dobras: linhasDobras,
//       },
//       nutricionista: {
//         nome: session?.user?.name ?? "Nutricionista",
//         crn: session?.user?.crn ?? "—",
//         email: session?.user?.email,
//       },
//     }}
//   />
